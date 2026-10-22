using RoleManagement.Api.Modules.Qualifications.Entities;

namespace RoleManagement.Api.Modules.Qualifications.Repositories;

public interface IQualificationRepository
{
    Task<IReadOnlyList<Qualification>> ListAsync(int? profileId, CancellationToken cancellationToken = default);

    Task<Qualification?> FindAsync(int id, CancellationToken cancellationToken = default);

    Task<Qualification?> FindTrackedAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> NumberExistsAsync(string credentialNumber, int? exceptId = null, CancellationToken cancellationToken = default);

    Task AddAsync(Qualification qualification, CancellationToken cancellationToken = default);

    Task SaveAsync(CancellationToken cancellationToken = default);

    Task DeleteAsync(Qualification qualification, CancellationToken cancellationToken = default);
}
