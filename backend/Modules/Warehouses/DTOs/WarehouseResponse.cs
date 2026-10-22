using RoleManagement.Api.Modules.Warehouses.Entities;

namespace RoleManagement.Api.Modules.Warehouses.DTOs;

public class WarehouseResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Code { get; set; }

    public string? Phone { get; set; }

    public string? Address { get; set; }

    public string? ProvinceCode { get; set; }

    public string? WardCode { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public static WarehouseResponse From(Warehouse warehouse)
    {
        return new WarehouseResponse
        {
            Id = warehouse.Id,
            Name = warehouse.Name,
            Code = warehouse.Code,
            Phone = warehouse.Phone,
            Address = warehouse.Address,
            ProvinceCode = warehouse.ProvinceCode,
            WardCode = warehouse.WardCode,
            Note = warehouse.Note,
            IsActive = warehouse.IsActive,
            CreatedAt = warehouse.CreatedAt,
            UpdatedAt = warehouse.UpdatedAt,
        };
    }
}
