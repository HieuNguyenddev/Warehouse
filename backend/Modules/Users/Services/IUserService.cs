using RoleManagement.Api.Modules.Users.DTOs;

namespace RoleManagement.Api.Modules.Users.Services;

public interface IUserService
{
    Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken cancellationToken = default);

    Task<UserResult> GetAsync(int id, CancellationToken cancellationToken = default);

    Task<UserResult> CreateAsync(UserRequest request, CancellationToken cancellationToken = default);

    Task<UserResult> UpdateAsync(int id, UserUpdateRequest request, CancellationToken cancellationToken = default);

    Task<UserResult> ChangePasswordAsync(
        int id,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default);

    Task<UserResult> SetLockAsync(int id, bool isLocked, CancellationToken cancellationToken = default);

    Task<UserResult> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
