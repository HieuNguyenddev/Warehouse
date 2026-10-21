using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.UserProfiles.DTOs;
using RoleManagement.Api.Modules.UserProfiles.Services;

namespace RoleManagement.Api.Modules.UserProfiles.Controllers;

[Authorize(Roles = AuthConstants.AdminRole)]
[ApiController]
[Route("api/user-profiles")]
public class UserProfilesController : ControllerBase
{
    private readonly IUserProfileService _profiles;

    public UserProfilesController(IUserProfileService profiles)
    {
        _profiles = profiles;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserProfileResponse>>> GetProfiles(CancellationToken cancellationToken)
    {
        return Ok(await _profiles.ListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserProfileResponse>> GetProfile(int id, CancellationToken cancellationToken)
    {
        var result = await _profiles.GetAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Profile);
    }

    [HttpPost]
    public async Task<ActionResult<UserProfileResponse>> CreateProfile(
        [FromBody] UserProfileRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _profiles.CreateAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return CreatedAtAction(nameof(GetProfile), new { id = result.Profile!.Id }, result.Profile);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserProfileResponse>> UpdateProfile(
        int id,
        [FromBody] UserProfileRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _profiles.UpdateAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Profile);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProfile(int id, CancellationToken cancellationToken)
    {
        var result = await _profiles.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return NoContent();
    }

    private ActionResult ToError(UserProfileResult result)
    {
        var message = new ApiMessage(result.Message ?? "Không xử lý được yêu cầu.");
        return result.Error switch
        {
            UserProfileError.NotFound => NotFound(message),
            UserProfileError.UserNotFound => BadRequest(message),
            UserProfileError.Invalid => BadRequest(message),
            UserProfileError.DuplicateUser => Conflict(message),
            UserProfileError.DuplicateIdentity => Conflict(message),
            UserProfileError.DuplicateEmail => Conflict(message),
            _ => StatusCode(StatusCodes.Status500InternalServerError, message),
        };
    }
}
