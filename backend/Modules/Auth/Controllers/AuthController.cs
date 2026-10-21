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
    private readonly TurnstileVerifier _turnstile;

    public AuthController(IAuthService auth, TurnstileVerifier turnstile)
    {
        _auth = auth;
        _turnstile = turnstile;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        if (_turnstile.IsEnabled)
        {
            bool passed;
            try
            {
                passed = await _turnstile.VerifyAsync(
                    request.TurnstileToken,
                    ClientIpResolver.Resolve(HttpContext),
                    cancellationToken);
            }
            catch (Exception ex) when ((ex is HttpRequestException or TaskCanceledException) && !cancellationToken.IsCancellationRequested)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiMessage("Không kiểm tra được Cloudflare. Thử lại."));
            }

            if (!passed)
            {
                return BadRequest(new ApiMessage("Hãy hoàn tất xác thực Cloudflare trước khi đăng nhập."));
            }
        }

        var result = await _auth.LoginAsync(request, ClientIpResolver.Resolve(HttpContext), cancellationToken);
        if (!result.Succeeded)
        {
            return Unauthorized(new ApiMessage(result.Message ?? "Tên đăng nhập hoặc mật khẩu không đúng."));
        }

        return Ok(result.Response);
    }
}
