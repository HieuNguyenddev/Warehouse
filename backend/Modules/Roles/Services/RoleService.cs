using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Roles.DTOs;
using RoleManagement.Api.Modules.Roles.Entities;
using RoleManagement.Api.Modules.Roles.Repositories;
using RoleManagement.Api.Modules.Users.Repositories;

namespace RoleManagement.Api.Modules.Roles.Services;

public class RoleService : IRoleService
{
    private readonly IRoleRepository _roles;
    private readonly IUserRepository _users;

    public RoleService(IRoleRepository roles, IUserRepository users)
    {
        _roles = roles;
        _users = users;
    }

    public async Task<IReadOnlyList<RoleResponse>> ListAsync(CancellationToken cancellationToken = default)
    {
        var roles = await _roles.ListAsync(cancellationToken);
        return roles.Select(RoleResponse.From).ToList();
    }

    public async Task<RoleResult> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var role = await _roles.FindAsync(id, cancellationToken);
        if (role == null)
        {
            return RoleResult.NotFound($"Không tìm thấy vai trò có ID = {id}.");
        }

        return RoleResult.Ok(RoleResponse.From(role));
    }

    public async Task<RoleResult> CreateAsync(RoleRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        if (await _roles.NameExistsAsync(name, cancellationToken: cancellationToken))
        {
            return RoleResult.Duplicate("Tên vai trò đã tồn tại.");
        }

        var role = new Role
        {
            Name = name,
            Description = NormalizeDescription(request.Description),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null,
        };

        await _roles.AddAsync(role, cancellationToken);
        return RoleResult.Ok(RoleResponse.From(role));
    }

    public async Task<RoleResult> UpdateAsync(
        int id,
        RoleRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = await _roles.FindTrackedAsync(id, cancellationToken);
        if (role == null)
        {
            return RoleResult.NotFound($"Không tìm thấy vai trò có ID = {id}.");
        }

        var name = request.Name.Trim();
        if (role.Name == AuthConstants.AdminRole && name != AuthConstants.AdminRole)
        {
            return RoleResult.Protected("Không đổi tên được vai trò Admin vì vai trò này dùng để phân quyền.");
        }

        if (await _roles.NameExistsAsync(name, id, cancellationToken))
        {
            return RoleResult.Duplicate("Tên vai trò đã được sử dụng.");
        }

        role.Name = name;
        role.Description = NormalizeDescription(request.Description);
        role.UpdatedAt = DateTime.UtcNow;
        await _roles.SaveAsync(cancellationToken);

        return RoleResult.Ok(RoleResponse.From(role));
    }

    public async Task<RoleResult> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var role = await _roles.FindTrackedAsync(id, cancellationToken);
        if (role == null)
        {
            return RoleResult.NotFound($"Không tìm thấy vai trò có ID = {id}.");
        }

        if (role.Name == AuthConstants.AdminRole)
        {
            return RoleResult.Protected("Không xóa được vai trò Admin.");
        }

        if (await _users.AnyInRoleAsync(id, cancellationToken))
        {
            return RoleResult.InUse("Không xóa được vai trò vì vẫn còn người dùng thuộc vai trò này.");
        }

        try
        {
            await _roles.DeleteAsync(role, cancellationToken);
        }
        catch (DbUpdateException)
        {
            return RoleResult.InUse("Không xóa được vai trò vì vẫn còn người dùng thuộc vai trò này.");
        }

        return RoleResult.Ok();
    }

    private static string? NormalizeDescription(string? description)
    {
        var trimmed = description?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}
