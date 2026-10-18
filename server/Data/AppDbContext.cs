using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Server.Data;

// IdentityDbContext gives us the Users/Roles/Claims/Tokens tables that back
// ASP.NET Core Identity (password hashes, lockout state, refresh tokens for
// MapIdentityApi, etc.) — none of that is hand-rolled here, it's the
// framework's own vetted schema and hashing (PBKDF2 by default).
public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<GoalEntity> Goals => Set<GoalEntity>();
    public DbSet<MilestoneEntity> Milestones => Set<MilestoneEntity>();
    public DbSet<TaskEntity> Tasks => Set<TaskEntity>();
    public DbSet<HabitEntity> Habits => Set<HabitEntity>();
    public DbSet<HabitLogEntity> HabitLogs => Set<HabitLogEntity>();
    public DbSet<JournalEntryEntity> JournalEntries => Set<JournalEntryEntity>();
    public DbSet<ScheduleBlockEntity> ScheduleBlocks => Set<ScheduleBlockEntity>();
    public DbSet<NoteEntity> Notes => Set<NoteEntity>();
    public DbSet<XpEventEntity> XpEvents => Set<XpEventEntity>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Every user-owned table gets an index on UserId — every query
        // filters by it, so this keeps per-user reads fast as data grows.
        foreach (var type in new[]
        {
            typeof(GoalEntity), typeof(MilestoneEntity), typeof(TaskEntity), typeof(HabitEntity),
            typeof(HabitLogEntity), typeof(JournalEntryEntity), typeof(ScheduleBlockEntity),
            typeof(NoteEntity), typeof(XpEventEntity),
        })
        {
            builder.Entity(type).HasIndex("UserId");
        }

        // Mirrors the client's Dexie unique index — one XP award per
        // (user, source, refId), so a duplicate award request is a no-op
        // rather than double-counting.
        builder.Entity<XpEventEntity>().HasIndex(e => new { e.UserId, e.Source, e.RefId }).IsUnique();
    }
}
