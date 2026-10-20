using RoleManagement.Api.Modules.Users.Entities;

namespace RoleManagement.Api.Modules.Users.Repositories;

public interface IUserRepository
{
    Task<IReadOnlyList<User>> ListAsync(CancellationToken cancellationToken = default);

    Task<User?> FindAsync(int id, CancellationToken cancellationToken = default);

    Task<User?> FindTrackedAsync(int id, CancellationToken cancellationToken = default);

    Task<User?> FindByUsernameAsync(string username, CancellationToken cancellationToken = default);

    Task<bool> UsernameExistsAsync(string username, int? exceptId = null, CancellationToken cancellationToken = default);

    Task<bool> AnyInRoleAsync(int roleId, CancellationToken cancellationToken = default);

    Task AddAsync(User user, CancellationToken cancellationToken = default);

    Task SaveAsync(CancellationToken cancellationToken = default);

    Task DeleteAsync(User user, CancellationToken cancellationToken = default);
}
