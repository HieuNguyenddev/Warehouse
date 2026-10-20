using RoleManagement.Api.Modules.Auth.DTOs;

namespace RoleManagement.Api.Modules.Auth.Services;

public interface IAuthService
{
    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
}
