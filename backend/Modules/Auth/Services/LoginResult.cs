using RoleManagement.Api.Modules.Auth.DTOs;

namespace RoleManagement.Api.Modules.Auth.Services;

public class LoginResult
{
    public LoginResponse? Response { get; init; }

    public string? Message { get; init; }

    public bool Succeeded => Response != null;

    public static LoginResult Ok(LoginResponse response)
    {
        return new LoginResult { Response = response };
    }

    public static LoginResult Invalid(string message)
    {
        return new LoginResult { Message = message };
    }
}
