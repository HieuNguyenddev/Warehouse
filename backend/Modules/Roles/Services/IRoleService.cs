using RoleManagement.Api.Modules.Roles.DTOs;

namespace RoleManagement.Api.Modules.Roles.Services;

public interface IRoleService
{
    Task<IReadOnlyList<RoleResponse>> ListAsync(CancellationToken cancellationToken = default);

    Task<RoleResult> GetAsync(int id, CancellationToken cancellationToken = default);

    Task<RoleResult> CreateAsync(RoleRequest request, CancellationToken cancellationToken = default);

    Task<RoleResult> UpdateAsync(int id, RoleRequest request, CancellationToken cancellationToken = default);

    Task<RoleResult> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
