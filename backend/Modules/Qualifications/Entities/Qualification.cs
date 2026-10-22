using RoleManagement.Api.Modules.UserProfiles.Entities;

namespace RoleManagement.Api.Modules.Qualifications.Entities;

public class Qualification
{
    public int Id { get; set; }

    public int UserProfileId { get; set; }

    public UserProfile Profile { get; set; } = null!;

    public short Kind { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Major { get; set; }

    public string? Grade { get; set; }

    public string? Issuer { get; set; }

    public string? CredentialNumber { get; set; }

    public DateOnly? IssuedOn { get; set; }

    public DateOnly? ExpiresOn { get; set; }

    public string? Note { get; set; }

    public string? DocumentUrl { get; set; }

    public string? DocumentName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
