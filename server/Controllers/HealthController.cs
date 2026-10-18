using Microsoft.AspNetCore.Mvc;

namespace Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    // Smoke-test endpoint: confirms the client's /api proxy reaches the API.
    // Real endpoints (Goals, Tasks, Habits, Journal) go here as the sync layer
    // is built out — see the architecture notes in README.md.
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", service = "life-planner-api" });
}
