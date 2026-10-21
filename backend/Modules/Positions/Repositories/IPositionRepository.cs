using RoleManagement.Api.Modules.Positions.Entities;

namespace RoleManagement.Api.Modules.Positions.Repositories;

public interface IPositionRepository
{
    Task<IReadOnlyList<Position>> ListAsync(CancellationToken cancellationToken = default);

    Task<Position?> FindAsync(int id, CancellationToken cancellationToken = default);

    Task<Position?> FindTrackedAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> NameExistsAsync(string name, int? exceptId = null, CancellationToken cancellationToken = default);

    Task<bool> CodeExistsAsync(string code, int? exceptId = null, CancellationToken cancellationToken = default);

    Task AddAsync(Position position, CancellationToken cancellationToken = default);

    Task SaveAsync(CancellationToken cancellationToken = default);

    Task DeleteAsync(Position position, CancellationToken cancellationToken = default);
}
