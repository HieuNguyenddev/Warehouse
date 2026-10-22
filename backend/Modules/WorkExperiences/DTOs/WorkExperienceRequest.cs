using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.WorkExperiences.DTOs;

public class WorkExperienceRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Hồ sơ nhân sự không hợp lệ.")]
    public int UserProfileId { get; set; }

    [Required(ErrorMessage = "Nơi làm việc không được để trống.")]
    [StringLength(150, ErrorMessage = "Nơi làm việc tối đa 150 ký tự.")]
    public string Company { get; set; } = string.Empty;

    [Required(ErrorMessage = "Chức danh không được để trống.")]
    [StringLength(120, ErrorMessage = "Chức danh tối đa 120 ký tự.")]
    public string JobTitle { get; set; } = string.Empty;

    public DateOnly StartedOn { get; set; }

    public DateOnly? EndedOn { get; set; }

    public bool IsCurrent { get; set; }

    [StringLength(500, ErrorMessage = "Mô tả tối đa 500 ký tự.")]
    public string? Description { get; set; }
}
