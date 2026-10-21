using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth.DTOs;
using RoleManagement.Api.Modules.Auth.Services;

namespace RoleManagement.Api.Modules.Auth.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _auth.LoginAsync(request, ClientIpResolver.Resolve(HttpContext), cancellationToken);
        if (!result.Succeeded)
        {
            return Unauthorized(new ApiMessage(result.Message ?? "Tên đăng nhập hoặc mật khẩu không đúng."));
        }

        return Ok(result.Response);
    }
}
