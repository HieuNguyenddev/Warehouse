using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Locations.DTOs;
using RoleManagement.Api.Modules.Locations.Services;

namespace RoleManagement.Api.Modules.Locations.Controllers;

[Authorize(Roles = AuthConstants.AdminRole)]
[ApiController]
[Route("api/locations")]
public class LocationsController : ControllerBase
{
    private readonly LocationCatalog _catalog;

    public LocationsController(LocationCatalog catalog)
    {
        _catalog = catalog;
    }

    [HttpGet("provinces")]
    public async Task<ActionResult<IEnumerable<AdminUnitResponse>>> GetProvinces(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _catalog.GetProvincesAsync(cancellationToken));
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new LocationMessage("Không lấy được danh mục tỉnh, thành phố."));
        }
    }

    [HttpGet("provinces/{code:int}/wards")]
    public async Task<ActionResult<IEnumerable<AdminUnitResponse>>> GetWards(int code, CancellationToken cancellationToken)
    {
        if (code <= 0)
        {
            return BadRequest(new LocationMessage("Mã tỉnh không hợp lệ."));
        }

        try
        {
            var wards = await _catalog.GetWardsAsync(code, cancellationToken);
            if (wards == null)
            {
                return NotFound(new LocationMessage("Không có tỉnh, thành phố với mã này."));
            }

            return Ok(wards);
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new LocationMessage("Không lấy được danh mục xã, phường."));
        }
    }
}
