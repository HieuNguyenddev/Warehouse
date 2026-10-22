using RoleManagement.Api.Modules.WorkExperiences.Entities;

namespace RoleManagement.Api.Modules.WorkExperiences.DTOs;

public class WorkExperienceResponse
{
    public int Id { get; set; }

    public int UserProfileId { get; set; }

    public string ProfileName { get; set; } = string.Empty;

    public string EmployeeCode { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string Company { get; set; } = string.Empty;

    public string JobTitle { get; set; } = string.Empty;

    public DateOnly StartedOn { get; set; }

    public DateOnly? EndedOn { get; set; }

    public bool IsCurrent { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public static WorkExperienceResponse From(WorkExperience item)
    {
        return new WorkExperienceResponse
        {
            Id = item.Id,
            UserProfileId = item.UserProfileId,
            ProfileName = item.Profile?.FullName ?? string.Empty,
            EmployeeCode = item.Profile?.EmployeeCode ?? string.Empty,
            Username = item.Profile?.User?.Username ?? string.Empty,
            Company = item.Company,
            JobTitle = item.JobTitle,
            StartedOn = item.StartedOn,
            EndedOn = item.EndedOn,
            IsCurrent = item.IsCurrent,
            Description = item.Description,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt,
        };
    }
}
