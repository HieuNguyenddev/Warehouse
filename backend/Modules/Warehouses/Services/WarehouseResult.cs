using RoleManagement.Api.Modules.Warehouses.DTOs;

namespace RoleManagement.Api.Modules.Warehouses.Services;

public enum WarehouseError
{
    None,
    NotFound,
    DuplicateName,
    DuplicateCode,
}

public class WarehouseResult
{
    public WarehouseResponse? Warehouse { get; init; }

    public WarehouseError Error { get; init; }

    public string? Message { get; init; }

    public bool Succeeded => Error == WarehouseError.None;

    public static WarehouseResult Ok(WarehouseResponse? warehouse = null)
    {
        return new WarehouseResult { Warehouse = warehouse };
    }

    public static WarehouseResult NotFound(string message)
    {
        return new WarehouseResult { Error = WarehouseError.NotFound, Message = message };
    }

    public static WarehouseResult DuplicateName(string message)
    {
        return new WarehouseResult { Error = WarehouseError.DuplicateName, Message = message };
    }

    public static WarehouseResult DuplicateCode(string message)
    {
        return new WarehouseResult { Error = WarehouseError.DuplicateCode, Message = message };
    }
}
