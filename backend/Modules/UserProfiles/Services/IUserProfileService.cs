using RoleManagement.Api.Modules.UserProfiles.DTOs;

namespace RoleManagement.Api.Modules.UserProfiles.Services;

public interface IUserProfileService
{
    Task<IReadOnlyList<UserProfileResponse>> ListAsync(CancellationToken cancellationToken = default);

    Task<UserProfileResult> GetAsync(int id, CancellationToken cancellationToken = default);

    Task<UserProfileResult> CreateAsync(UserProfileRequest request, CancellationToken cancellationToken = default);

    Task<UserProfileResult> UpdateAsync(int id, UserProfileRequest request, CancellationToken cancellationToken = default);

    Task<UserProfileResult> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
