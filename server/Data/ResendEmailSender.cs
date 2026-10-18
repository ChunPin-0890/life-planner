using Microsoft.AspNetCore.Identity;
using Resend;

namespace Server.Data;

// Backs ASP.NET Core Identity's confirmation/reset emails (wired in via
// MapIdentityApi's IEmailSender<TUser> in Program.cs) using Resend's
// official SDK.
public class ResendEmailSender : IEmailSender<ApplicationUser>
{
    private readonly IResend _resend;
    private readonly IConfiguration _config;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(IResend resend, IConfiguration config, ILogger<ResendEmailSender> logger)
    {
        _resend = resend;
        _config = config;
        _logger = logger;
    }

    public Task SendConfirmationLinkAsync(ApplicationUser user, string email, string confirmationLink) =>
        SendAsync(email, "Confirm your Life Planner account",
            $"<p>Welcome to Life Planner — confirm your email to get started:</p>" +
            $"<p><a href=\"{confirmationLink}\">Confirm your email</a></p>");

    public Task SendPasswordResetLinkAsync(ApplicationUser user, string email, string resetLink) =>
        SendAsync(email, "Reset your Life Planner password",
            $"<p>Reset your password:</p><p><a href=\"{resetLink}\">Reset password</a></p>");

    public Task SendPasswordResetCodeAsync(ApplicationUser user, string email, string resetCode) =>
        SendAsync(email, "Your Life Planner password reset code",
            $"<p>Your password reset code: <strong>{resetCode}</strong></p>");

    private async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var fromAddress = _config["Resend:From"] ?? "onboarding@resend.dev";

        try
        {
            var result = await _resend.EmailSendAsync(new EmailMessage
            {
                From = fromAddress,
                To = toEmail,
                Subject = subject,
                HtmlBody = htmlBody,
            });
            _logger.LogInformation("Resend accepted send to {Email}, id={ResendId}", toEmail, result.Content);
        }
        catch (Exception ex)
        {
            // Deliberately not rethrowing: on Resend's free/unverified tier,
            // sending to anyone other than the account owner's own email
            // fails — surfacing that as a 500 would break registration for
            // every tester. Logged loudly instead; verify a sending domain
            // with Resend before real launch to lift that restriction.
            _logger.LogError(ex, "Resend send failed for {Email}", toEmail);
        }
    }
}
