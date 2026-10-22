using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.Qualifications.DTOs;

public class QualificationRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Hồ sơ nhân sự không hợp lệ.")]
    public int UserProfileId { get; set; }

    [Range(1, 2, ErrorMessage = "Chọn bằng cấp hoặc chứng chỉ.")]
    public short Kind { get; set; }

    [Required(ErrorMessage = "Tên bằng cấp hoặc chứng chỉ không được để trống.")]
    [StringLength(150, ErrorMessage = "Tên tối đa 150 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(120, ErrorMessage = "Chuyên ngành tối đa 120 ký tự.")]
    public string? Major { get; set; }

    [StringLength(40, ErrorMessage = "Xếp loại tối đa 40 ký tự.")]
    public string? Grade { get; set; }

    [StringLength(150, ErrorMessage = "Nơi cấp tối đa 150 ký tự.")]
    public string? Issuer { get; set; }

    [StringLength(50, ErrorMessage = "Số hiệu tối đa 50 ký tự.")]
    public string? CredentialNumber { get; set; }

    public DateOnly? IssuedOn { get; set; }

    public DateOnly? ExpiresOn { get; set; }

    [StringLength(250, ErrorMessage = "Ghi chú tối đa 250 ký tự.")]
    public string? Note { get; set; }

    [StringLength(255, ErrorMessage = "Đường dẫn tệp tối đa 255 ký tự.")]
    public string? DocumentUrl { get; set; }

    [StringLength(255, ErrorMessage = "Tên tệp tối đa 255 ký tự.")]
    public string? DocumentName { get; set; }
}
