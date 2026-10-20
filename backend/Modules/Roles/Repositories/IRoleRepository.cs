using RoleManagement.Api.Modules.Roles.Entities;

namespace RoleManagement.Api.Modules.Roles.Repositories;

public interface IRoleRepository
{
    Task<IReadOnlyList<Role>> ListAsync(CancellationToken cancellationToken = default);

    Task<Role?> FindAsync(int id, CancellationToken cancellationToken = default);

    Task<Role?> FindTrackedAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> NameExistsAsync(string name, int? exceptId = null, CancellationToken cancellationToken = default);

    Task AddAsync(Role role, CancellationToken cancellationToken = default);

    Task SaveAsync(CancellationToken cancellationToken = default);

    Task DeleteAsync(Role role, CancellationToken cancellationToken = default);
}
