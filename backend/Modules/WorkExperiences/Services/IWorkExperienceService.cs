using RoleManagement.Api.Modules.WorkExperiences.DTOs;

namespace RoleManagement.Api.Modules.WorkExperiences.Services;

public interface IWorkExperienceService
{
    Task<IReadOnlyList<WorkExperienceResponse>> ListAsync(int? profileId, CancellationToken cancellationToken = default);

    Task<WorkExperienceResult> GetAsync(int id, CancellationToken cancellationToken = default);

    Task<WorkExperienceResult> CreateAsync(WorkExperienceRequest request, CancellationToken cancellationToken = default);

    Task<WorkExperienceResult> UpdateAsync(int id, WorkExperienceRequest request, CancellationToken cancellationToken = default);

    Task<WorkExperienceResult> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
