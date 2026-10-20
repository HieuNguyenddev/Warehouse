using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Roles.DTOs;
using RoleManagement.Api.Modules.Roles.Services;

namespace RoleManagement.Api.Modules.Roles.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roles;

    public RolesController(IRoleService roles)
    {
        _roles = roles;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleResponse>>> GetRoles(CancellationToken cancellationToken)
    {
        return Ok(await _roles.ListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RoleResponse>> GetRole(int id, CancellationToken cancellationToken)
    {
        var result = await _roles.GetAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Role);
    }

    [HttpPost]
    public async Task<ActionResult<RoleResponse>> CreateRole(
        [FromBody] RoleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _roles.CreateAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return CreatedAtAction(nameof(GetRole), new { id = result.Role!.Id }, result.Role);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RoleResponse>> UpdateRole(
        int id,
        [FromBody] RoleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _roles.UpdateAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Role);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRole(int id, CancellationToken cancellationToken)
    {
        var result = await _roles.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return NoContent();
    }

    private ActionResult ToError(RoleResult result)
    {
        var message = new ApiMessage(result.Message ?? "Không xử lý được yêu cầu.");
        return result.Error switch
        {
            RoleError.NotFound => NotFound(message),
            RoleError.DuplicateName => Conflict(message),
            _ => StatusCode(StatusCodes.Status500InternalServerError, message),
        };
    }
}
