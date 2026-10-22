using RoleManagement.Api.Modules.Qualifications.DTOs;

namespace RoleManagement.Api.Modules.Qualifications.Services;

public interface IQualificationService
{
    Task<IReadOnlyList<QualificationResponse>> ListAsync(int? profileId, CancellationToken cancellationToken = default);

    Task<QualificationResult> GetAsync(int id, CancellationToken cancellationToken = default);

    Task<QualificationResult> CreateAsync(QualificationRequest request, CancellationToken cancellationToken = default);

    Task<QualificationResult> UpdateAsync(int id, QualificationRequest request, CancellationToken cancellationToken = default);

    Task<QualificationResult> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
