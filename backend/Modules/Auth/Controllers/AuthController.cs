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
        var result = await _auth.LoginAsync(request, ClientIp(), cancellationToken);
        if (!result.Succeeded)
        {
            return Unauthorized(new ApiMessage(result.Message ?? "Tên đăng nhập hoặc mật khẩu không đúng."));
        }

        return Ok(result.Response);
    }

    private string? ClientIp()
    {
        var forwarded = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',')[0].Trim();
            if (first.Length > 0)
            {
                return first;
            }
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
