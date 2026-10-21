using RoleManagement.Api.Modules.Users.Entities;

namespace RoleManagement.Api.Modules.Users.DTOs;

public class UserResponse
{
    public int Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public int RoleId { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public int? PositionId { get; set; }

    public string? PositionName { get; set; }

    public bool IsLocked { get; set; }

    public int FailedLoginCount { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public string? LastLoginIp { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public static UserResponse From(User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            RoleId = user.RoleId,
            RoleName = user.Role?.Name ?? string.Empty,
            PositionId = user.PositionId,
            PositionName = user.Position?.Name,
            IsLocked = user.IsLocked,
            FailedLoginCount = user.FailedLoginCount,
            LastLoginAt = user.LastLoginAt,
            LastLoginIp = user.LastLoginIp,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            DeletedAt = user.DeletedAt,
        };
    }
}
