using RoleManagement.Api.Modules.UserProfiles.Repositories;
using RoleManagement.Api.Modules.WorkExperiences.DTOs;
using RoleManagement.Api.Modules.WorkExperiences.Entities;
using RoleManagement.Api.Modules.WorkExperiences.Repositories;

namespace RoleManagement.Api.Modules.WorkExperiences.Services;

public class WorkExperienceService : IWorkExperienceService
{
    private readonly IWorkExperienceRepository _experiences;
    private readonly IUserProfileRepository _profiles;

    public WorkExperienceService(IWorkExperienceRepository experiences, IUserProfileRepository profiles)
    {
        _experiences = experiences;
        _profiles = profiles;
    }

    public async Task<IReadOnlyList<WorkExperienceResponse>> ListAsync(
        int? profileId,
        CancellationToken cancellationToken = default)
    {
        var items = await _experiences.ListAsync(profileId, cancellationToken);
        return items.Select(WorkExperienceResponse.From).ToList();
    }

    public async Task<WorkExperienceResult> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _experiences.FindAsync(id, cancellationToken);
        if (item == null)
        {
            return WorkExperienceResult.NotFound($"Không tìm thấy kinh nghiệm làm việc có ID = {id}.");
        }

        return WorkExperienceResult.Ok(WorkExperienceResponse.From(item));
    }

    public async Task<WorkExperienceResult> CreateAsync(
        WorkExperienceRequest request,
        CancellationToken cancellationToken = default)
    {
        var prepared = await PrepareAsync(request, cancellationToken);
        if (prepared.Error != null)
        {
            return prepared.Error;
        }

        var item = new WorkExperience
        {
            UserProfileId = request.UserProfileId,
            Company = prepared.Company,
            JobTitle = prepared.JobTitle,
            StartedOn = request.StartedOn,
            EndedOn = prepared.EndedOn,
            IsCurrent = request.IsCurrent,
            Description = prepared.Description,
            CreatedAt = DateTime.UtcNow,
        };

        await _experiences.AddAsync(item, cancellationToken);
        var saved = await _experiences.FindAsync(item.Id, cancellationToken);
        return WorkExperienceResult.Ok(WorkExperienceResponse.From(saved!));
    }

    public async Task<WorkExperienceResult> UpdateAsync(
        int id,
        WorkExperienceRequest request,
        CancellationToken cancellationToken = default)
    {
        var item = await _experiences.FindTrackedAsync(id, cancellationToken);
        if (item == null)
        {
            return WorkExperienceResult.NotFound($"Không tìm thấy kinh nghiệm làm việc có ID = {id}.");
        }

        var prepared = await PrepareAsync(request, cancellationToken);
        if (prepared.Error != null)
        {
            return prepared.Error;
        }

        item.UserProfileId = request.UserProfileId;
        item.Company = prepared.Company;
        item.JobTitle = prepared.JobTitle;
        item.StartedOn = request.StartedOn;
        item.EndedOn = prepared.EndedOn;
        item.IsCurrent = request.IsCurrent;
        item.Description = prepared.Description;
        item.UpdatedAt = DateTime.UtcNow;
        await _experiences.SaveAsync(cancellationToken);
        var saved = await _experiences.FindAsync(item.Id, cancellationToken);
        return WorkExperienceResult.Ok(WorkExperienceResponse.From(saved!));
    }

    public async Task<WorkExperienceResult> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _experiences.FindTrackedAsync(id, cancellationToken);
        if (item == null)
        {
            return WorkExperienceResult.NotFound($"Không tìm thấy kinh nghiệm làm việc có ID = {id}.");
        }

        await _experiences.DeleteAsync(item, cancellationToken);
        return WorkExperienceResult.Ok();
    }

    private async Task<PreparedExperience> PrepareAsync(WorkExperienceRequest request, CancellationToken cancellationToken)
    {
        if (request.StartedOn == default)
        {
            return PreparedExperience.Fail(WorkExperienceResult.Invalid("Chọn ngày bắt đầu."));
        }

        if (!request.IsCurrent && request.EndedOn != null && request.EndedOn < request.StartedOn)
        {
            return PreparedExperience.Fail(WorkExperienceResult.Invalid("Ngày kết thúc phải từ ngày bắt đầu trở đi."));
        }

        if (request.StartedOn > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return PreparedExperience.Fail(WorkExperienceResult.Invalid("Ngày bắt đầu không được ở tương lai."));
        }

        var profile = await _profiles.FindAsync(request.UserProfileId, cancellationToken);
        if (profile == null)
        {
            return PreparedExperience.Fail(WorkExperienceResult.Invalid("Không tìm thấy hồ sơ nhân sự."));
        }

        return new PreparedExperience
        {
            Company = request.Company.Trim(),
            JobTitle = request.JobTitle.Trim(),
            EndedOn = request.IsCurrent ? null : request.EndedOn,
            Description = BlankToNull(request.Description),
        };
    }

    private static string? BlankToNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private sealed class PreparedExperience
    {
        public string Company { get; init; } = string.Empty;

        public string JobTitle { get; init; } = string.Empty;

        public DateOnly? EndedOn { get; init; }

        public string? Description { get; init; }

        public WorkExperienceResult? Error { get; init; }

        public static PreparedExperience Fail(WorkExperienceResult error)
        {
            return new PreparedExperience { Error = error };
        }
    }
}
