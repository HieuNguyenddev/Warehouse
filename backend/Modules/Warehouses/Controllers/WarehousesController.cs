using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Warehouses.DTOs;
using RoleManagement.Api.Modules.Warehouses.Services;

namespace RoleManagement.Api.Modules.Warehouses.Controllers;

[Authorize(Roles = AuthConstants.AdminRole)]
[ApiController]
[Route("api/[controller]")]
public class WarehousesController : ControllerBase
{
    private readonly IWarehouseService _warehouses;

    public WarehousesController(IWarehouseService warehouses)
    {
        _warehouses = warehouses;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WarehouseResponse>>> GetWarehouses(CancellationToken cancellationToken)
    {
        return Ok(await _warehouses.ListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WarehouseResponse>> GetWarehouse(int id, CancellationToken cancellationToken)
    {
        var result = await _warehouses.GetAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Warehouse);
    }

    [HttpPost]
    public async Task<ActionResult<WarehouseResponse>> CreateWarehouse(
        [FromBody] WarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _warehouses.CreateAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return CreatedAtAction(nameof(GetWarehouse), new { id = result.Warehouse!.Id }, result.Warehouse);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WarehouseResponse>> UpdateWarehouse(
        int id,
        [FromBody] WarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _warehouses.UpdateAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Warehouse);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteWarehouse(int id, CancellationToken cancellationToken)
    {
        var result = await _warehouses.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return NoContent();
    }

    private ActionResult ToError(WarehouseResult result)
    {
        var message = new ApiMessage(result.Message ?? "Không xử lý được yêu cầu.");
        return result.Error switch
        {
            WarehouseError.NotFound => NotFound(message),
            WarehouseError.DuplicateName => Conflict(message),
            WarehouseError.DuplicateCode => Conflict(message),
            _ => StatusCode(StatusCodes.Status500InternalServerError, message),
        };
    }
}
