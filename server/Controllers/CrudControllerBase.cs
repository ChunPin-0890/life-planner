using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Data;

namespace Server.Controllers;

// Generic "sync" style CRUD used by every planner resource: the client is
// local-first (writes to IndexedDB immediately, id generated client-side),
// so the server accepts upserts by id rather than server-assigned ids —
// PUT-by-id creates-or-replaces. Every method is scoped to the caller's own
// rows: GetAll only returns this user's data, and Upsert/Delete only ever
// touch a row already stamped with this user's id (or a brand new one,
// stamped here) — that's what stops user A from reading or overwriting user
// B's data even though both are authenticated.
[ApiController]
[Authorize]
public abstract class CrudControllerBase<T> : ControllerBase where T : class, IUserOwned
{
    protected readonly AppDbContext Db;

    protected CrudControllerBase(AppDbContext db)
    {
        Db = db;
    }

    protected string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Authenticated request missing user id claim.");

    protected abstract DbSet<T> Table { get; }

    [HttpGet]
    public async Task<ActionResult<List<T>>> GetAll()
    {
        var rows = await Table.Where(e => e.UserId == UserId).ToListAsync();
        return Ok(rows);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Upsert(string id, [FromBody] T entity)
    {
        if (entity.Id != id) return BadRequest("Route id and body id must match.");

        var existing = await Table.FirstOrDefaultAsync(e => e.Id == id && e.UserId == UserId);
        entity.UserId = UserId; // never trust a UserId from the request body

        if (existing is null)
        {
            Db.Add(entity);
        }
        else
        {
            Db.Entry(existing).CurrentValues.SetValues(entity);
        }

        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var existing = await Table.FirstOrDefaultAsync(e => e.Id == id && e.UserId == UserId);
        if (existing is null) return NoContent(); // already gone — deletes are idempotent
        Db.Remove(existing);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}
