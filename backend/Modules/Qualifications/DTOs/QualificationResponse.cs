using RoleManagement.Api.Modules.Qualifications.Entities;

namespace RoleManagement.Api.Modules.Qualifications.DTOs;

public class QualificationResponse
{
    public int Id { get; set; }

    public int UserProfileId { get; set; }

    public string ProfileName { get; set; } = string.Empty;

    public string EmployeeCode { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

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

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public static QualificationResponse From(Qualification item)
    {
        return new QualificationResponse
        {
            Id = item.Id,
            UserProfileId = item.UserProfileId,
            ProfileName = item.Profile?.FullName ?? string.Empty,
            EmployeeCode = item.Profile?.EmployeeCode ?? string.Empty,
            Username = item.Profile?.User?.Username ?? string.Empty,
            Kind = item.Kind,
            Name = item.Name,
            Major = item.Major,
            Grade = item.Grade,
            Issuer = item.Issuer,
            CredentialNumber = item.CredentialNumber,
            IssuedOn = item.IssuedOn,
            ExpiresOn = item.ExpiresOn,
            Note = item.Note,
            DocumentUrl = item.DocumentUrl,
            DocumentName = item.DocumentName,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt,
        };
    }
}
