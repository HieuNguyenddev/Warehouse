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
    private readonly AvatarStore _avatars;

    public UserProfilesController(IUserProfileService profiles, AvatarStore avatars)
    {
        _profiles = profiles;
        _avatars = avatars;
    }

    [HttpPost("avatar")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<ActionResult<AvatarUploadResponse>> UploadAvatar(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new ApiMessage("Chọn một ảnh từ máy tính."));
        }

        try
        {
            var url = await _avatars.SaveAsync(file, cancellationToken);
            return Ok(new AvatarUploadResponse(url));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ApiMessage(exception.Message));
        }
    }

    [HttpGet("avatars/{fileName}")]
    public IActionResult DownloadAvatar(string fileName)
    {
        var opened = _avatars.Open(fileName);
        if (opened == null)
        {
            return NotFound(new ApiMessage("Không tìm thấy ảnh đại diện."));
        }

        return PhysicalFile(opened.Value.Path, opened.Value.ContentType);
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
