using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Positions.Repositories;
using RoleManagement.Api.Modules.Roles.Repositories;
using RoleManagement.Api.Modules.Users.DTOs;
using RoleManagement.Api.Modules.Users.Entities;
using RoleManagement.Api.Modules.Users.Repositories;

namespace RoleManagement.Api.Modules.Users.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _users;
    private readonly IRoleRepository _roles;
    private readonly IPositionRepository _positions;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly SeedOptions _seed;

    public UserService(
        IUserRepository users,
        IRoleRepository roles,
        IPositionRepository positions,
        IPasswordHasher<User> passwordHasher,
        IOptions<SeedOptions> seed)
    {
        _users = users;
        _roles = roles;
        _positions = positions;
        _passwordHasher = passwordHasher;
        _seed = seed.Value;
    }

    public async Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken cancellationToken = default)
    {
        var users = await _users.ListAsync(cancellationToken);
        return users.Select(UserResponse.From).ToList();
    }

    public async Task<UserResult> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _users.FindAsync(id, cancellationToken);
        if (user == null)
        {
            return UserResult.NotFound($"Không tìm thấy người dùng có ID = {id}.");
        }

        return UserResult.Ok(UserResponse.From(user));
    }

    public async Task<UserResult> CreateAsync(UserRequest request, CancellationToken cancellationToken = default)
    {
        var username = request.Username.Trim();
        var fullName = request.FullName.Trim();
        var password = request.Password.Trim();
        if (password.Length < 8)
        {
            return UserResult.InvalidPassword("Mật khẩu từ 8 đến 100 ký tự.");
        }

        if (await _users.UsernameExistsAsync(username, cancellationToken: cancellationToken))
        {
            return UserResult.Duplicate("Tên đăng nhập đã tồn tại.");
        }

        var role = await _roles.FindAsync(request.RoleId, cancellationToken);
        if (role == null)
        {
            return UserResult.RoleNotFound($"Không tìm thấy vai trò có ID = {request.RoleId}.");
        }

        var position = await ResolvePositionAsync(request.PositionId, cancellationToken);
        if (position.Error != null)
        {
            return position.Error;
        }

        var user = new User
        {
            Username = username,
            FullName = fullName,
            RoleId = role.Id,
            PositionId = position.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        await _users.AddAsync(user, cancellationToken);

        var created = await _users.FindAsync(user.Id, cancellationToken);
        return UserResult.Ok(UserResponse.From(created!));
    }

    public async Task<UserResult> UpdateAsync(
        int id,
        UserUpdateRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _users.FindTrackedAsync(id, cancellationToken);
        if (user == null || user.DeletedAt != null)
        {
            return UserResult.NotFound($"Không tìm thấy người dùng có ID = {id}.");
        }

        var username = request.Username.Trim();
        if (await _users.UsernameExistsAsync(username, id, cancellationToken))
        {
            return UserResult.Duplicate("Tên đăng nhập đã được sử dụng.");
        }

        var role = await _roles.FindAsync(request.RoleId, cancellationToken);
        if (role == null)
        {
            return UserResult.RoleNotFound($"Không tìm thấy vai trò có ID = {request.RoleId}.");
        }

        var position = await ResolvePositionAsync(request.PositionId, cancellationToken);
        if (position.Error != null)
        {
            return position.Error;
        }

        if (IsSeedAdmin(user))
        {
            if (username != user.Username)
            {
                return UserResult.Protected("Không đổi tên đăng nhập của tài khoản quản trị mặc định.");
            }

            if (role.Name != AuthConstants.AdminRole)
            {
                return UserResult.Protected("Không gỡ vai trò Admin khỏi tài khoản quản trị mặc định.");
            }
        }

        user.Username = username;
        user.FullName = request.FullName.Trim();
        user.RoleId = role.Id;
        user.PositionId = position.Id;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.SaveAsync(cancellationToken);

        var updated = await _users.FindAsync(user.Id, cancellationToken);
        return UserResult.Ok(UserResponse.From(updated!));
    }

    public async Task<UserResult> ChangePasswordAsync(
        int id,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _users.FindTrackedAsync(id, cancellationToken);
        if (user == null || user.DeletedAt != null)
        {
            return UserResult.NotFound($"Không tìm thấy người dùng có ID = {id}.");
        }

        var currentPassword = request.CurrentPassword.Trim();
        var newPassword = request.NewPassword.Trim();
        if (newPassword.Length < 8)
        {
            return UserResult.InvalidPassword("Mật khẩu mới từ 8 đến 100 ký tự.");
        }

        var current = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, currentPassword);
        if (current == PasswordVerificationResult.Failed)
        {
            return UserResult.InvalidPassword("Mật khẩu hiện tại không đúng.");
        }

        var sameAsCurrent = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, newPassword);
        if (sameAsCurrent != PasswordVerificationResult.Failed)
        {
            return UserResult.InvalidPassword("Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        user.FailedLoginCount = 0;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.SaveAsync(cancellationToken);
        return UserResult.Ok();
    }

    public async Task<UserResult> SetLockAsync(int id, bool isLocked, CancellationToken cancellationToken = default)
    {
        var user = await _users.FindTrackedAsync(id, cancellationToken);
        if (user == null || user.DeletedAt != null)
        {
            return UserResult.NotFound($"Không tìm thấy người dùng có ID = {id}.");
        }

        if (IsSeedAdmin(user) && isLocked)
        {
            return UserResult.Protected("Không khóa tài khoản quản trị mặc định.");
        }

        user.IsLocked = isLocked;
        if (!isLocked)
        {
            user.FailedLoginCount = 0;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _users.SaveAsync(cancellationToken);

        var updated = await _users.FindAsync(user.Id, cancellationToken);
        return UserResult.Ok(UserResponse.From(updated!));
    }

    public async Task<UserResult> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _users.FindTrackedAsync(id, cancellationToken);
        if (user == null)
        {
            return UserResult.NotFound($"Không tìm thấy người dùng có ID = {id}.");
        }

        if (user.DeletedAt != null)
        {
            return UserResult.NotFound($"Không tìm thấy người dùng có ID = {id}.");
        }

        if (IsSeedAdmin(user))
        {
            return UserResult.Protected("Không xóa được tài khoản quản trị mặc định.");
        }

        user.DeletedAt = DateTime.UtcNow;
        user.UpdatedAt = user.DeletedAt;
        await _users.SaveAsync(cancellationToken);
        return UserResult.Ok();
    }

    private async Task<(int? Id, UserResult? Error)> ResolvePositionAsync(
        int? positionId,
        CancellationToken cancellationToken)
    {
        if (positionId == null)
        {
            return (null, null);
        }

        var position = await _positions.FindAsync(positionId.Value, cancellationToken);
        if (position == null)
        {
            return (null, UserResult.PositionNotFound($"Không tìm thấy chức vụ có ID = {positionId}."));
        }

        return (position.Id, null);
    }

    private bool IsSeedAdmin(User user)
    {
        return user.Username == _seed.Username.Trim();
    }
}
