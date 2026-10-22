using RoleManagement.Api.Modules.WorkExperiences.Entities;

namespace RoleManagement.Api.Modules.WorkExperiences.Repositories;

public interface IWorkExperienceRepository
{
    Task<IReadOnlyList<WorkExperience>> ListAsync(int? profileId, CancellationToken cancellationToken = default);

    Task<WorkExperience?> FindAsync(int id, CancellationToken cancellationToken = default);

    Task<WorkExperience?> FindTrackedAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(WorkExperience experience, CancellationToken cancellationToken = default);

    Task SaveAsync(CancellationToken cancellationToken = default);

    Task DeleteAsync(WorkExperience experience, CancellationToken cancellationToken = default);
}
