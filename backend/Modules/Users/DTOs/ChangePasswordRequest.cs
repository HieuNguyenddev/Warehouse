using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.Users.DTOs;

public class ChangePasswordRequest
{
    [Required(ErrorMessage = "Mật khẩu hiện tại không được để trống.")]
    [StringLength(100, ErrorMessage = "Mật khẩu hiện tại tối đa 100 ký tự.")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu mới không được để trống.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu mới từ 8 đến 100 ký tự.")]
    public string NewPassword { get; set; } = string.Empty;
}
