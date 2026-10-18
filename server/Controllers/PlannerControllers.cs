using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Data;

namespace Server.Controllers;

[Route("api/goals")]
public class GoalsController : CrudControllerBase<GoalEntity>
{
    public GoalsController(AppDbContext db) : base(db) { }
    protected override DbSet<GoalEntity> Table => Db.Goals;
}

[Route("api/milestones")]
public class MilestonesController : CrudControllerBase<MilestoneEntity>
{
    public MilestonesController(AppDbContext db) : base(db) { }
    protected override DbSet<MilestoneEntity> Table => Db.Milestones;
}

[Route("api/tasks")]
public class TasksController : CrudControllerBase<TaskEntity>
{
    public TasksController(AppDbContext db) : base(db) { }
    protected override DbSet<TaskEntity> Table => Db.Tasks;
}

[Route("api/habits")]
public class HabitsController : CrudControllerBase<HabitEntity>
{
    public HabitsController(AppDbContext db) : base(db) { }
    protected override DbSet<HabitEntity> Table => Db.Habits;
}

[Route("api/habitlogs")]
public class HabitLogsController : CrudControllerBase<HabitLogEntity>
{
    public HabitLogsController(AppDbContext db) : base(db) { }
    protected override DbSet<HabitLogEntity> Table => Db.HabitLogs;
}

[Route("api/journalentries")]
public class JournalEntriesController : CrudControllerBase<JournalEntryEntity>
{
    public JournalEntriesController(AppDbContext db) : base(db) { }
    protected override DbSet<JournalEntryEntity> Table => Db.JournalEntries;
}

[Route("api/scheduleblocks")]
public class ScheduleBlocksController : CrudControllerBase<ScheduleBlockEntity>
{
    public ScheduleBlocksController(AppDbContext db) : base(db) { }
    protected override DbSet<ScheduleBlockEntity> Table => Db.ScheduleBlocks;
}

[Route("api/notes")]
public class NotesController : CrudControllerBase<NoteEntity>
{
    public NotesController(AppDbContext db) : base(db) { }
    protected override DbSet<NoteEntity> Table => Db.Notes;
}
