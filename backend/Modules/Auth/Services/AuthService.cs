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

    public async Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var username = request.Username.Trim();
        var password = request.Password.Trim();
        var user = await _users.FindByUsernameAsync(username, cancellationToken);
        if (user == null)
        {
            return LoginResult.Invalid("Tên đăng nhập hoặc mật khẩu không đúng.");
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return LoginResult.Invalid("Tên đăng nhập hoặc mật khẩu không đúng.");
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, password);
            user.UpdatedAt = DateTime.UtcNow;
            await _users.SaveAsync(cancellationToken);
        }

        var (token, expiresAt) = _tokens.Create(user);
        return LoginResult.Ok(new LoginResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = UserResponse.From(user),
        });
    }
}
