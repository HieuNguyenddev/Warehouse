using RoleManagement.Api.Modules.UserProfiles.Entities;

namespace RoleManagement.Api.Modules.WorkExperiences.Entities;

public class WorkExperience
{
    public int Id { get; set; }

    public int UserProfileId { get; set; }

    public UserProfile Profile { get; set; } = null!;

    public string Company { get; set; } = string.Empty;

    public string JobTitle { get; set; } = string.Empty;

    public DateOnly StartedOn { get; set; }

    public DateOnly? EndedOn { get; set; }

    public bool IsCurrent { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
