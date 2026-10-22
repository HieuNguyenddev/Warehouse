using RoleManagement.Api.Modules.Users.Entities;

namespace RoleManagement.Api.Modules.UserProfiles.Entities;

public class UserProfile
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User User { get; set; } = null!;

    public string FullName { get; set; } = string.Empty;

    public string EmployeeCode { get; set; } = string.Empty;

    public DateOnly? DateOfBirth { get; set; }

    public short Gender { get; set; }

    public string? IdentityNumber { get; set; }

    public DateOnly? IdentityIssuedDate { get; set; }

    public string? IdentityIssuedPlace { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public string? Address { get; set; }

    public string? PermanentAddress { get; set; }

    public string? ProvinceCode { get; set; }

    public string? DistrictCode { get; set; }

    public string? WardCode { get; set; }

    public string? PermanentProvinceCode { get; set; }

    public string? PermanentWardCode { get; set; }

    public string? PlaceOfBirth { get; set; }

    public string? Nationality { get; set; }

    public string? Ethnicity { get; set; }

    public string? Religion { get; set; }

    public short MaritalStatus { get; set; }

    public string? AvatarUrl { get; set; }

    public string? EmergencyContactName { get; set; }

    public string? EmergencyContactPhone { get; set; }

    public string? EducationLevel { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
