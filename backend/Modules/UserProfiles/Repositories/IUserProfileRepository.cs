using RoleManagement.Api.Modules.UserProfiles.Entities;

namespace RoleManagement.Api.Modules.UserProfiles.Repositories;

public interface IUserProfileRepository
{
    Task<IReadOnlyList<UserProfile>> ListAsync(CancellationToken cancellationToken = default);

    Task<UserProfile?> FindAsync(int id, CancellationToken cancellationToken = default);

    Task<UserProfile?> FindTrackedAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> UserHasProfileAsync(int userId, int? exceptId = null, CancellationToken cancellationToken = default);

    Task<bool> IdentityExistsAsync(string identityNumber, int? exceptId = null, CancellationToken cancellationToken = default);

    Task<bool> EmailExistsAsync(string email, int? exceptId = null, CancellationToken cancellationToken = default);

    Task AddAsync(UserProfile profile, CancellationToken cancellationToken = default);

    Task SaveAsync(CancellationToken cancellationToken = default);

    Task DeleteAsync(UserProfile profile, CancellationToken cancellationToken = default);
}
