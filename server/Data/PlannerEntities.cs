namespace Server.Data;

// Every resource is owned by exactly one user (UserId, an ApplicationUser.Id).
// Every query/write in the controllers filters or stamps by the current
// user's id — that's what actually makes this multi-user-safe; the
// [Authorize] attribute alone only proves *who* is asking, not that they're
// only allowed to touch their own rows.
public interface IUserOwned
{
    string Id { get; set; }
    string UserId { get; set; }
}

public class GoalEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string? TargetDate { get; set; }
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
    public int? TargetCount { get; set; }
    public int? CurrentCount { get; set; }
}

public class MilestoneEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string GoalId { get; set; } = "";
    public string Title { get; set; } = "";
    public bool Done { get; set; }
    public int Order { get; set; }
    public string UpdatedAt { get; set; } = "";
}

public class TaskEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Title { get; set; } = "";
    public bool Done { get; set; }
    public string? DueDate { get; set; }
    public string? GoalId { get; set; }
    public string? MilestoneId { get; set; }
    public string UpdatedAt { get; set; } = "";
    public string? Recurring { get; set; } // "daily" | "weekly" | null
    public int? RecurrenceWeekday { get; set; }
    public string? TemplateId { get; set; }
}

public class HabitEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Frequency { get; set; } = "daily";
    public string UpdatedAt { get; set; } = "";
    public string? GoalId { get; set; }
}

public class HabitLogEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string HabitId { get; set; } = "";
    public string Date { get; set; } = "";
    public bool Completed { get; set; }
}

public class JournalEntryEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Date { get; set; } = "";
    public int Mood { get; set; }
    public string Wins { get; set; } = "";
    public string Challenges { get; set; } = "";
    public string TomorrowFocus { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
}

public class ScheduleBlockEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Date { get; set; } = "";
    public string StartTime { get; set; } = "";
    public string EndTime { get; set; } = "";
    public string Title { get; set; } = "";
    public string? TaskId { get; set; }
    public string UpdatedAt { get; set; } = "";
}

public class NoteEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Folder { get; set; } = "";
    public bool Pinned { get; set; }
    public string? GoalId { get; set; }
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
}

public class XpEventEntity : IUserOwned
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Source { get; set; } = "";
    public string RefId { get; set; } = "";
    public int Amount { get; set; }
    public string CreatedAt { get; set; } = "";
}
