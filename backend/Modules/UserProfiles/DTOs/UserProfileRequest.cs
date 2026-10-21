using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.UserProfiles.DTOs;

public class UserProfileRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Người dùng không hợp lệ.")]
    public int UserId { get; set; }

    public int? PositionId { get; set; }

    [Required(ErrorMessage = "Họ tên không được để trống.")]
    [StringLength(150, ErrorMessage = "Họ tên tối đa 150 ký tự.")]
    public string FullName { get; set; } = string.Empty;

    public DateOnly? DateOfBirth { get; set; }

    [Range(0, 3, ErrorMessage = "Giới tính không hợp lệ.")]
    public short Gender { get; set; }

    [StringLength(20, ErrorMessage = "Số CCCD tối đa 20 ký tự.")]
    public string? IdentityNumber { get; set; }

    public DateOnly? IdentityIssuedDate { get; set; }

    [StringLength(150, ErrorMessage = "Nơi cấp tối đa 150 ký tự.")]
    public string? IdentityIssuedPlace { get; set; }

    [StringLength(20, ErrorMessage = "Số điện thoại tối đa 20 ký tự.")]
    public string? PhoneNumber { get; set; }

    [StringLength(100, ErrorMessage = "Email tối đa 100 ký tự.")]
    public string? Email { get; set; }

    [StringLength(255, ErrorMessage = "Địa chỉ tối đa 255 ký tự.")]
    public string? Address { get; set; }

    [StringLength(255, ErrorMessage = "Địa chỉ thường trú tối đa 255 ký tự.")]
    public string? PermanentAddress { get; set; }

    [StringLength(20, ErrorMessage = "Mã tỉnh tối đa 20 ký tự.")]
    public string? ProvinceCode { get; set; }

    [StringLength(20, ErrorMessage = "Mã huyện tối đa 20 ký tự.")]
    public string? DistrictCode { get; set; }

    [StringLength(20, ErrorMessage = "Mã xã tối đa 20 ký tự.")]
    public string? WardCode { get; set; }

    [StringLength(150, ErrorMessage = "Nơi sinh tối đa 150 ký tự.")]
    public string? PlaceOfBirth { get; set; }

    [StringLength(50, ErrorMessage = "Quốc tịch tối đa 50 ký tự.")]
    public string? Nationality { get; set; }

    [StringLength(50, ErrorMessage = "Dân tộc tối đa 50 ký tự.")]
    public string? Ethnicity { get; set; }

    [StringLength(50, ErrorMessage = "Tôn giáo tối đa 50 ký tự.")]
    public string? Religion { get; set; }

    [Range(0, 4, ErrorMessage = "Tình trạng hôn nhân không hợp lệ.")]
    public short MaritalStatus { get; set; }

    [StringLength(255, ErrorMessage = "Ảnh đại diện tối đa 255 ký tự.")]
    public string? AvatarUrl { get; set; }

    [StringLength(150, ErrorMessage = "Tên người liên hệ tối đa 150 ký tự.")]
    public string? EmergencyContactName { get; set; }

    [StringLength(20, ErrorMessage = "Số điện thoại liên hệ tối đa 20 ký tự.")]
    public string? EmergencyContactPhone { get; set; }

    [StringLength(50, ErrorMessage = "Trình độ tối đa 50 ký tự.")]
    public string? EducationLevel { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự.")]
    public string? Note { get; set; }
}
