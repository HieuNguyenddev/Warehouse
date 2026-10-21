using Microsoft.AspNetCore.Identity;
using RoleManagement.Api.Modules.Auth.DTOs;
using RoleManagement.Api.Modules.Users.DTOs;
using RoleManagement.Api.Modules.Users.Entities;
using RoleManagement.Api.Modules.Users.Repositories;

namespace RoleManagement.Api.Modules.Auth.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenService _tokens;

    public AuthService(
        IUserRepository users,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenService tokens)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _tokens = tokens;
    }

    public async Task<LoginResult> LoginAsync(
        LoginRequest request,
        string? clientIp,
        CancellationToken cancellationToken = default)
    {
        var username = request.Username.Trim();
        var password = request.Password.Trim();
        var user = await _users.FindByUsernameAsync(username, cancellationToken);
        if (user == null || user.DeletedAt != null)
        {
            return LoginResult.Invalid("Tên đăng nhập hoặc mật khẩu không đúng.");
        }

        if (user.IsLocked)
        {
            return LoginResult.Invalid("Tài khoản đã bị khóa.");
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            user.FailedLoginCount += 1;
            user.UpdatedAt = DateTime.UtcNow;
            await _users.SaveAsync(cancellationToken);
            return LoginResult.Invalid("Tên đăng nhập hoặc mật khẩu không đúng.");
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, password);
        }

        user.FailedLoginCount = 0;
        user.LastLoginAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(clientIp))
        {
            user.LastLoginIp = clientIp;
        }

        user.UpdatedAt = user.LastLoginAt;
        await _users.SaveAsync(cancellationToken);

        var (token, expiresAt) = _tokens.Create(user);
        return LoginResult.Ok(new LoginResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = UserResponse.From(user),
        });
    }
}
