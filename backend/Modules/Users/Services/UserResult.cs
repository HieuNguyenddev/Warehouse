using RoleManagement.Api.Modules.Users.DTOs;

namespace RoleManagement.Api.Modules.Users.Services;

public enum UserError
{
    None,
    NotFound,
    DuplicateUsername,
    RoleNotFound,
    InvalidPassword,
    Protected,
}

public class UserResult
{
    public UserResponse? User { get; init; }

    public UserError Error { get; init; }

    public string? Message { get; init; }

    public bool Succeeded => Error == UserError.None;

    public static UserResult Ok(UserResponse? user = null)
    {
        return new UserResult { User = user };
    }

    public static UserResult NotFound(string message)
    {
        return new UserResult { Error = UserError.NotFound, Message = message };
    }

    public static UserResult Duplicate(string message)
    {
        return new UserResult { Error = UserError.DuplicateUsername, Message = message };
    }

    public static UserResult RoleNotFound(string message)
    {
        return new UserResult { Error = UserError.RoleNotFound, Message = message };
    }

    public static UserResult InvalidPassword(string message)
    {
        return new UserResult { Error = UserError.InvalidPassword, Message = message };
    }

    public static UserResult Protected(string message)
    {
        return new UserResult { Error = UserError.Protected, Message = message };
    }
}
