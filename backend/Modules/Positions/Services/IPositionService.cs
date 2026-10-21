using RoleManagement.Api.Modules.Positions.DTOs;

namespace RoleManagement.Api.Modules.Positions.Services;

public interface IPositionService
{
    Task<IReadOnlyList<PositionResponse>> ListAsync(CancellationToken cancellationToken = default);

    Task<PositionResult> GetAsync(int id, CancellationToken cancellationToken = default);

    Task<PositionResult> CreateAsync(PositionRequest request, CancellationToken cancellationToken = default);

    Task<PositionResult> UpdateAsync(int id, PositionRequest request, CancellationToken cancellationToken = default);

    Task<PositionResult> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
