using RoleManagement.Api.Modules.Users.DTOs;

namespace RoleManagement.Api.Modules.Auth.DTOs;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public UserResponse User { get; set; } = new();
}
