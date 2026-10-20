using RoleManagement.Api.Modules.Users.Entities;

namespace RoleManagement.Api.Modules.Auth.Services;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAt) Create(User user);
}
