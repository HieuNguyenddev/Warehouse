using RoleManagement.Api.Modules.UserProfiles.DTOs;

namespace RoleManagement.Api.Modules.UserProfiles.Services;

public enum UserProfileError
{
    None,
    NotFound,
    UserNotFound,
    DuplicateUser,
    DuplicateIdentity,
    DuplicateEmail,
    Invalid,
}

public class UserProfileResult
{
    public UserProfileResponse? Profile { get; init; }

    public UserProfileError Error { get; init; }

    public string? Message { get; init; }

    public bool Succeeded => Error == UserProfileError.None;

    public static UserProfileResult Ok(UserProfileResponse? profile = null)
    {
        return new UserProfileResult { Profile = profile };
    }

    public static UserProfileResult NotFound(string message)
    {
        return new UserProfileResult { Error = UserProfileError.NotFound, Message = message };
    }

    public static UserProfileResult UserNotFound(string message)
    {
        return new UserProfileResult { Error = UserProfileError.UserNotFound, Message = message };
    }

    public static UserProfileResult DuplicateUser(string message)
    {
        return new UserProfileResult { Error = UserProfileError.DuplicateUser, Message = message };
    }

    public static UserProfileResult DuplicateIdentity(string message)
    {
        return new UserProfileResult { Error = UserProfileError.DuplicateIdentity, Message = message };
    }

    public static UserProfileResult DuplicateEmail(string message)
    {
        return new UserProfileResult { Error = UserProfileError.DuplicateEmail, Message = message };
    }

    public static UserProfileResult Invalid(string message)
    {
        return new UserProfileResult { Error = UserProfileError.Invalid, Message = message };
    }
}
