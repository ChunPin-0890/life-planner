using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Server.Data;

namespace Server.Controllers;

public record UpdateMeRequest(string? DisplayName);

[ApiController]
[Route("api/[controller]")]
[Authorize] // requires a valid bearer access token from /api/auth/login
public class MeController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;

    public MeController(UserManager<ApplicationUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Authenticated request missing user id claim.");

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();
        return Ok(new { id = user.Id, email = user.Email, displayName = user.DisplayName });
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateMeRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        var name = request.DisplayName?.Trim();
        user.DisplayName = string.IsNullOrEmpty(name) ? null : name[..Math.Min(name.Length, 60)];
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { id = user.Id, email = user.Email, displayName = user.DisplayName });
    }

    // Deletes the account and every row it owns. Irreversible — the client
    // requires a typed confirmation before calling this.
    [HttpDelete]
    public async Task<IActionResult> Delete()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        var userId = UserId;
        _db.Goals.RemoveRange(_db.Goals.Where(x => x.UserId == userId));
        _db.Milestones.RemoveRange(_db.Milestones.Where(x => x.UserId == userId));
        _db.Tasks.RemoveRange(_db.Tasks.Where(x => x.UserId == userId));
        _db.Habits.RemoveRange(_db.Habits.Where(x => x.UserId == userId));
        _db.HabitLogs.RemoveRange(_db.HabitLogs.Where(x => x.UserId == userId));
        _db.JournalEntries.RemoveRange(_db.JournalEntries.Where(x => x.UserId == userId));
        _db.ScheduleBlocks.RemoveRange(_db.ScheduleBlocks.Where(x => x.UserId == userId));
        _db.Notes.RemoveRange(_db.Notes.Where(x => x.UserId == userId));
        _db.XpEvents.RemoveRange(_db.XpEvents.Where(x => x.UserId == userId));
        await _db.SaveChangesAsync();

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return NoContent();
    }
}
