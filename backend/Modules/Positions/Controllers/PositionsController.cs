using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Positions.DTOs;
using RoleManagement.Api.Modules.Positions.Services;

namespace RoleManagement.Api.Modules.Positions.Controllers;

[Authorize(Roles = AuthConstants.AdminRole)]
[ApiController]
[Route("api/[controller]")]
public class PositionsController : ControllerBase
{
    private readonly IPositionService _positions;

    public PositionsController(IPositionService positions)
    {
        _positions = positions;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PositionResponse>>> GetPositions(CancellationToken cancellationToken)
    {
        return Ok(await _positions.ListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PositionResponse>> GetPosition(int id, CancellationToken cancellationToken)
    {
        var result = await _positions.GetAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Position);
    }

    [HttpPost]
    public async Task<ActionResult<PositionResponse>> CreatePosition(
        [FromBody] PositionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _positions.CreateAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return CreatedAtAction(nameof(GetPosition), new { id = result.Position!.Id }, result.Position);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PositionResponse>> UpdatePosition(
        int id,
        [FromBody] PositionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _positions.UpdateAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Position);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePosition(int id, CancellationToken cancellationToken)
    {
        var result = await _positions.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return NoContent();
    }

    private ActionResult ToError(PositionResult result)
    {
        var message = new ApiMessage(result.Message ?? "Không xử lý được yêu cầu.");
        return result.Error switch
        {
            PositionError.NotFound => NotFound(message),
            PositionError.DuplicateName => Conflict(message),
            PositionError.DuplicateCode => Conflict(message),
            PositionError.InUse => Conflict(message),
            _ => StatusCode(StatusCodes.Status500InternalServerError, message),
        };
    }
}
