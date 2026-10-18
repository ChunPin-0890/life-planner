using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Server.Data;

var builder = WebApplication.CreateBuilder(args);

// Railway (and most PaaS hosts) terminate TLS at their edge and forward
// plain HTTP to the container with X-Forwarded-* headers — without this,
// the app thinks every request is insecure HTTP and UseHttpsRedirection()
// loops forever redirecting an already-HTTPS request back to itself.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Railway assigns the port to listen on via $PORT at runtime.
var railwayPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(railwayPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{railwayPort}");
}

// --- Services -------------------------------------------------------------

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Railway's Postgres plugin injects DATABASE_URL as a postgres://user:pass@host:port/db
// URI, not an Npgsql-style keyword connection string — convert it when present.
// Falls back to the local SQLite file for zero-setup local dev. NOTE: once this
// is pointed at a real Postgres instance, the existing migrations (generated
// against the SQLite provider) should be regenerated against Postgres directly
// — a couple of Identity's auto-increment columns are provider-specific and
// don't automatically carry over correctly between providers.
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);
        var npgsqlConnectionString =
            $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};" +
            $"Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
        options.UseNpgsql(npgsqlConnectionString);
    }
    else
    {
        var connectionString = builder.Configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing ConnectionStrings:Default and no DATABASE_URL set.");
        options.UseSqlite(connectionString);
    }
});

// ASP.NET Core Identity: PBKDF2 password hashing, account lockout on repeated
// failed logins, and (via MapIdentityApi below) bearer access + refresh
// tokens — none of this is hand-rolled, it's the framework's vetted auth
// stack. Tightened beyond the defaults: longer lockout, required email
// confirmation before a token-issuing login succeeds once mail sending is
// wired up (left permissive for local dev — see comment below).
builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
        options.User.RequireUniqueEmail = true;
        // Login now fails for an unconfirmed account — backed by
        // ResendEmailSender below, registered as IEmailSender<ApplicationUser>
        // so MapIdentityApi's /register automatically sends the confirmation
        // link and /confirmEmail (also from MapIdentityApi) verifies it.
        options.SignIn.RequireConfirmedEmail = builder.Environment.IsProduction();
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddApiEndpoints();

// Resend's SDK registration — the API key comes from config/env
// (Resend:ApiKey), never hardcoded.
//
// Registered as a singleton factory rather than via the SDK's usual
// AddHttpClient<ResendClient>() + Configure<ResendClientOptions>() pattern:
// ResendClient's constructor takes IOptionsSnapshot<ResendClientOptions>,
// which is inherently a SCOPED service. MapIdentityApi resolves
// IEmailSender<TUser> once from the app's ROOT provider at startup (not
// inside a request scope) to validate it's registered — pulling a scoped
// dependency from the root provider throws (caught by ASP.NET Core's
// scope-validation, which only runs in Development, so this silently
// "worked" in Production but would break the moment anything tightened
// validation). The fixed-value IOptionsSnapshot below sidesteps the
// scoping mismatch entirely since the API key never changes at runtime.
var resendApiKey = builder.Configuration["Resend:ApiKey"]
    ?? throw new InvalidOperationException("Missing Resend:ApiKey.");
builder.Services.AddHttpClient();
builder.Services.AddSingleton<Resend.IResend>(sp =>
{
    var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient();
    var options = new FixedOptionsSnapshot<Resend.ResendClientOptions>(
        new Resend.ResendClientOptions { ApiToken = resendApiKey });
    return new Resend.ResendClient(options, httpClient);
});
builder.Services.AddTransient<IEmailSender<ApplicationUser>, ResendEmailSender>();

builder.Services
    .AddAuthentication(IdentityConstants.BearerScheme)
    .AddBearerToken(IdentityConstants.BearerScheme);
builder.Services.AddAuthorizationBuilder();

// Rate limit auth endpoints specifically (register/login/refresh) — the
// highest-value target for brute-force/credential-stuffing on a public app.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    // General CRUD (goals/tasks/habits/notes/etc.) — much more generous
    // than auth since normal use legitimately fires many requests (the
    // client syncs every local write), but still bounded so a bug or bad
    // actor can't hammer the database unchecked.
    options.AddPolicy("api", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

var clientOrigin = builder.Configuration["Client:Origin"]
    ?? throw new InvalidOperationException("Missing Client:Origin.");
builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
    {
        // Named origin only — never AllowAnyOrigin on an app that carries
        // auth tokens/credentials.
        policy.WithOrigins(clientOrigin).AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

// Auto-apply EF Core migrations on startup so `dotnet run` always has an
// up-to-date schema in dev. Swap for a proper migration step in CI/CD once
// this deploys somewhere real.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

// --- Middleware pipeline ----------------------------------------------------

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // HSTS only in prod (browsers cache it — painful to accidentally send on localhost).
    app.UseHsts();
}

app.UseHttpsRedirection();

// Baseline security headers. A full CSP is left to the hosting layer (it
// depends on where the SPA is actually served from) but these are safe,
// zero-downside defaults for an API.
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseCors("Client");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>().RequireRateLimiting("auth");

app.MapControllers().RequireRateLimiting("api");

app.Run();

// Minimal IOptionsSnapshot<T> that always returns the same pre-built value —
// see the comment above its registration for why this is needed instead of
// the framework's usual Configure<T>()-backed snapshot.
file sealed class FixedOptionsSnapshot<T>(T value) : Microsoft.Extensions.Options.IOptionsSnapshot<T>
    where T : class
{
    public T Value { get; } = value;
    public T Get(string? name) => Value;
}
