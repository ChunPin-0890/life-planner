using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Data;

namespace Server.Controllers;

// XP events are idempotent by (UserId, Source, RefId), not by row id — the
// client generates a fresh id every time awardXp() runs, so a plain
// upsert-by-id would insert a duplicate row for a repeat award. This
// mirrors the unique index on the client's Dexie table.
[ApiController]
[Authorize]
[Route("api/xpevents")]
public class XpEventsController : ControllerBase
{
    private readonly AppDbContext _db;

    public XpEventsController(AppDbContext db)
    {
        _db = db;
    }

    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Authenticated request missing user id claim.");

    [HttpGet]
    public async Task<ActionResult<List<XpEventEntity>>> GetAll()
    {
        var rows = await _db.XpEvents.Where(e => e.UserId == UserId).ToListAsync();
        return Ok(rows);
    }

    [HttpPost("award")]
    public async Task<IActionResult> Award([FromBody] XpEventEntity entity)
    {
        var exists = await _db.XpEvents.AnyAsync(e =>
            e.UserId == UserId && e.Source == entity.Source && e.RefId == entity.RefId);
        if (exists) return NoContent(); // already awarded — no-op, matches client behavior

        entity.UserId = UserId;
        if (string.IsNullOrEmpty(entity.Id)) entity.Id = Guid.NewGuid().ToString();
        _db.XpEvents.Add(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("revoke")]
    public async Task<IActionResult> Revoke([FromQuery] string source, [FromQuery] string refId)
    {
        var rows = await _db.XpEvents
            .Where(e => e.UserId == UserId && e.Source == source && e.RefId == refId)
            .ToListAsync();
        _db.XpEvents.RemoveRange(rows);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
