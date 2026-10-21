using RoleManagement.Api.Modules.Positions.DTOs;

namespace RoleManagement.Api.Modules.Positions.Services;

public enum PositionError
{
    None,
    NotFound,
    DuplicateName,
    DuplicateCode,
    InUse,
}

public class PositionResult
{
    public PositionResponse? Position { get; init; }

    public PositionError Error { get; init; }

    public string? Message { get; init; }

    public bool Succeeded => Error == PositionError.None;

    public static PositionResult Ok(PositionResponse? position = null)
    {
        return new PositionResult { Position = position };
    }

    public static PositionResult NotFound(string message)
    {
        return new PositionResult { Error = PositionError.NotFound, Message = message };
    }

    public static PositionResult DuplicateName(string message)
    {
        return new PositionResult { Error = PositionError.DuplicateName, Message = message };
    }

    public static PositionResult DuplicateCode(string message)
    {
        return new PositionResult { Error = PositionError.DuplicateCode, Message = message };
    }

    public static PositionResult InUse(string message)
    {
        return new PositionResult { Error = PositionError.InUse, Message = message };
    }
}
