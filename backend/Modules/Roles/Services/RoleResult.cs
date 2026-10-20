using RoleManagement.Api.Modules.Roles.DTOs;

namespace RoleManagement.Api.Modules.Roles.Services;

public enum RoleError
{
    None,
    NotFound,
    DuplicateName,
}

public class RoleResult
{
    public RoleResponse? Role { get; init; }

    public RoleError Error { get; init; }

    public string? Message { get; init; }

    public bool Succeeded => Error == RoleError.None;

    public static RoleResult Ok(RoleResponse? role = null)
    {
        return new RoleResult { Role = role };
    }

    public static RoleResult NotFound(string message)
    {
        return new RoleResult { Error = RoleError.NotFound, Message = message };
    }

    public static RoleResult Duplicate(string message)
    {
        return new RoleResult { Error = RoleError.DuplicateName, Message = message };
    }
}
