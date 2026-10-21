using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Modules.Positions.DTOs;
using RoleManagement.Api.Modules.Positions.Entities;
using RoleManagement.Api.Modules.Positions.Repositories;
using RoleManagement.Api.Modules.Users.Repositories;

namespace RoleManagement.Api.Modules.Positions.Services;

public class PositionService : IPositionService
{
    private readonly IPositionRepository _positions;
    private readonly IUserRepository _users;

    public PositionService(IPositionRepository positions, IUserRepository users)
    {
        _positions = positions;
        _users = users;
    }

    public async Task<IReadOnlyList<PositionResponse>> ListAsync(CancellationToken cancellationToken = default)
    {
        var positions = await _positions.ListAsync(cancellationToken);
        return positions.Select(PositionResponse.From).ToList();
    }

    public async Task<PositionResult> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var position = await _positions.FindAsync(id, cancellationToken);
        if (position == null)
        {
            return PositionResult.NotFound($"Không tìm thấy chức vụ có ID = {id}.");
        }

        return PositionResult.Ok(PositionResponse.From(position));
    }

    public async Task<PositionResult> CreateAsync(PositionRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        var code = NormalizeCode(request.Code);
        if (await _positions.NameExistsAsync(name, cancellationToken: cancellationToken))
        {
            return PositionResult.DuplicateName("Tên chức vụ đã tồn tại.");
        }

        if (code != null && await _positions.CodeExistsAsync(code, cancellationToken: cancellationToken))
        {
            return PositionResult.DuplicateCode("Mã chức vụ đã tồn tại.");
        }

        var position = new Position
        {
            Name = name,
            Code = code,
            Rank = request.Rank,
            Description = NormalizeDescription(request.Description),
            CreatedAt = DateTime.UtcNow,
        };

        await _positions.AddAsync(position, cancellationToken);
        return PositionResult.Ok(PositionResponse.From(position));
    }

    public async Task<PositionResult> UpdateAsync(
        int id,
        PositionRequest request,
        CancellationToken cancellationToken = default)
    {
        var position = await _positions.FindTrackedAsync(id, cancellationToken);
        if (position == null)
        {
            return PositionResult.NotFound($"Không tìm thấy chức vụ có ID = {id}.");
        }

        var name = request.Name.Trim();
        var code = NormalizeCode(request.Code);
        if (await _positions.NameExistsAsync(name, id, cancellationToken))
        {
            return PositionResult.DuplicateName("Tên chức vụ đã được sử dụng.");
        }

        if (code != null && await _positions.CodeExistsAsync(code, id, cancellationToken))
        {
            return PositionResult.DuplicateCode("Mã chức vụ đã được sử dụng.");
        }

        position.Name = name;
        position.Code = code;
        position.Rank = request.Rank;
        position.Description = NormalizeDescription(request.Description);
        position.UpdatedAt = DateTime.UtcNow;
        await _positions.SaveAsync(cancellationToken);
        return PositionResult.Ok(PositionResponse.From(position));
    }

    public async Task<PositionResult> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var position = await _positions.FindTrackedAsync(id, cancellationToken);
        if (position == null)
        {
            return PositionResult.NotFound($"Không tìm thấy chức vụ có ID = {id}.");
        }

        if (await _users.AnyInPositionAsync(id, cancellationToken))
        {
            return PositionResult.InUse("Không xóa được chức vụ vì vẫn còn người dùng đang giữ chức vụ này.");
        }

        try
        {
            await _positions.DeleteAsync(position, cancellationToken);
        }
        catch (DbUpdateException)
        {
            return PositionResult.InUse("Không xóa được chức vụ vì vẫn còn người dùng đang giữ chức vụ này.");
        }

        return PositionResult.Ok();
    }

    private static string? NormalizeCode(string? code)
    {
        var trimmed = code?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed.ToUpperInvariant();
    }

    private static string? NormalizeDescription(string? description)
    {
        var trimmed = description?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}
