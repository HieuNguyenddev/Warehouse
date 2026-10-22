using RoleManagement.Api.Modules.Warehouses.DTOs;

namespace RoleManagement.Api.Modules.Warehouses.Services;

public interface IWarehouseService
{
    Task<IReadOnlyList<WarehouseResponse>> ListAsync(CancellationToken cancellationToken = default);

    Task<WarehouseResult> GetAsync(int id, CancellationToken cancellationToken = default);

    Task<WarehouseResult> CreateAsync(WarehouseRequest request, CancellationToken cancellationToken = default);

    Task<WarehouseResult> UpdateAsync(int id, WarehouseRequest request, CancellationToken cancellationToken = default);

    Task<WarehouseResult> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
