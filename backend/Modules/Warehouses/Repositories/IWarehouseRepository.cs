using RoleManagement.Api.Modules.Warehouses.Entities;

namespace RoleManagement.Api.Modules.Warehouses.Repositories;

public interface IWarehouseRepository
{
    Task<IReadOnlyList<Warehouse>> ListAsync(CancellationToken cancellationToken = default);

    Task<Warehouse?> FindAsync(int id, CancellationToken cancellationToken = default);

    Task<Warehouse?> FindTrackedAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> NameExistsAsync(string name, int? exceptId = null, CancellationToken cancellationToken = default);

    Task<bool> CodeExistsAsync(string code, int? exceptId = null, CancellationToken cancellationToken = default);

    Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default);

    Task SaveAsync(CancellationToken cancellationToken = default);

    Task DeleteAsync(Warehouse warehouse, CancellationToken cancellationToken = default);
}
