using RoleManagement.Api.Modules.Warehouses.DTOs;
using RoleManagement.Api.Modules.Warehouses.Entities;
using RoleManagement.Api.Modules.Warehouses.Repositories;

namespace RoleManagement.Api.Modules.Warehouses.Services;

public class WarehouseService : IWarehouseService
{
    private readonly IWarehouseRepository _warehouses;

    public WarehouseService(IWarehouseRepository warehouses)
    {
        _warehouses = warehouses;
    }

    public async Task<IReadOnlyList<WarehouseResponse>> ListAsync(CancellationToken cancellationToken = default)
    {
        var warehouses = await _warehouses.ListAsync(cancellationToken);
        return warehouses.Select(WarehouseResponse.From).ToList();
    }

    public async Task<WarehouseResult> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var warehouse = await _warehouses.FindAsync(id, cancellationToken);
        if (warehouse == null)
        {
            return WarehouseResult.NotFound($"Không tìm thấy kho có ID = {id}.");
        }

        return WarehouseResult.Ok(WarehouseResponse.From(warehouse));
    }

    public async Task<WarehouseResult> CreateAsync(WarehouseRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        var code = NormalizeCode(request.Code);
        if (await _warehouses.NameExistsAsync(name, cancellationToken: cancellationToken))
        {
            return WarehouseResult.DuplicateName("Tên kho đã tồn tại.");
        }

        if (code != null && await _warehouses.CodeExistsAsync(code, cancellationToken: cancellationToken))
        {
            return WarehouseResult.DuplicateCode("Mã kho đã tồn tại.");
        }

        var warehouse = new Warehouse
        {
            Name = name,
            Code = code,
            Phone = Text(request.Phone),
            Address = Text(request.Address),
            Note = Text(request.Note),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
        };
        ApplyPlace(warehouse, request.ProvinceCode, request.WardCode);

        await _warehouses.AddAsync(warehouse, cancellationToken);
        return WarehouseResult.Ok(WarehouseResponse.From(warehouse));
    }

    public async Task<WarehouseResult> UpdateAsync(
        int id,
        WarehouseRequest request,
        CancellationToken cancellationToken = default)
    {
        var warehouse = await _warehouses.FindTrackedAsync(id, cancellationToken);
        if (warehouse == null)
        {
            return WarehouseResult.NotFound($"Không tìm thấy kho có ID = {id}.");
        }

        var name = request.Name.Trim();
        var code = NormalizeCode(request.Code);
        if (await _warehouses.NameExistsAsync(name, id, cancellationToken))
        {
            return WarehouseResult.DuplicateName("Tên kho đã được sử dụng.");
        }

        if (code != null && await _warehouses.CodeExistsAsync(code, id, cancellationToken))
        {
            return WarehouseResult.DuplicateCode("Mã kho đã được sử dụng.");
        }

        warehouse.Name = name;
        warehouse.Code = code;
        warehouse.Phone = Text(request.Phone);
        warehouse.Address = Text(request.Address);
        warehouse.Note = Text(request.Note);
        warehouse.IsActive = request.IsActive;
        warehouse.UpdatedAt = DateTime.UtcNow;
        ApplyPlace(warehouse, request.ProvinceCode, request.WardCode);
        await _warehouses.SaveAsync(cancellationToken);
        return WarehouseResult.Ok(WarehouseResponse.From(warehouse));
    }

    public async Task<WarehouseResult> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var warehouse = await _warehouses.FindTrackedAsync(id, cancellationToken);
        if (warehouse == null)
        {
            return WarehouseResult.NotFound($"Không tìm thấy kho có ID = {id}.");
        }

        await _warehouses.DeleteAsync(warehouse, cancellationToken);
        return WarehouseResult.Ok();
    }

    private static void ApplyPlace(Warehouse warehouse, string? provinceCode, string? wardCode)
    {
        warehouse.ProvinceCode = Text(provinceCode);
        warehouse.WardCode = warehouse.ProvinceCode == null ? null : Text(wardCode);
    }

    private static string? NormalizeCode(string? code)
    {
        var trimmed = code?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed.ToUpperInvariant();
    }

    private static string? Text(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}
