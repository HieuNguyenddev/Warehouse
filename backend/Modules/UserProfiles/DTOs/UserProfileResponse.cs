using RoleManagement.Api.Modules.UserProfiles.Entities;

namespace RoleManagement.Api.Modules.UserProfiles.DTOs;

public class UserProfileResponse
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string? AccountFullName { get; set; }

    public DateTime? UserDeletedAt { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string EmployeeCode { get; set; } = string.Empty;

    public int? PositionId { get; set; }

    public string? PositionName { get; set; }

    public string? PositionCode { get; set; }

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

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public static UserProfileResponse From(UserProfile profile)
    {
        return new UserProfileResponse
        {
            Id = profile.Id,
            UserId = profile.UserId,
            Username = profile.User?.Username ?? string.Empty,
            AccountFullName = profile.User?.FullName,
            UserDeletedAt = profile.User?.DeletedAt,
            FullName = profile.FullName,
            EmployeeCode = profile.EmployeeCode,
            PositionId = profile.User?.PositionId,
            PositionName = profile.User?.Position?.Name,
            PositionCode = profile.User?.Position?.Code,
            DateOfBirth = profile.DateOfBirth,
            Gender = profile.Gender,
            IdentityNumber = profile.IdentityNumber,
            IdentityIssuedDate = profile.IdentityIssuedDate,
            IdentityIssuedPlace = profile.IdentityIssuedPlace,
            PhoneNumber = profile.PhoneNumber,
            Email = profile.Email,
            Address = profile.Address,
            PermanentAddress = profile.PermanentAddress,
            ProvinceCode = profile.ProvinceCode,
            DistrictCode = profile.DistrictCode,
            WardCode = profile.WardCode,
            PermanentProvinceCode = profile.PermanentProvinceCode,
            PermanentWardCode = profile.PermanentWardCode,
            PlaceOfBirth = profile.PlaceOfBirth,
            Nationality = profile.Nationality,
            Ethnicity = profile.Ethnicity,
            Religion = profile.Religion,
            MaritalStatus = profile.MaritalStatus,
            AvatarUrl = profile.AvatarUrl,
            EmergencyContactName = profile.EmergencyContactName,
            EmergencyContactPhone = profile.EmergencyContactPhone,
            EducationLevel = profile.EducationLevel,
            Note = profile.Note,
            CreatedAt = profile.CreatedAt,
            UpdatedAt = profile.UpdatedAt,
        };
    }
}
