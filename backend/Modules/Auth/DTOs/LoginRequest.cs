using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.Auth.DTOs;

public class LoginRequest
{
    [Required(ErrorMessage = "Tên đăng nhập không được để trống.")]
    [StringLength(50, ErrorMessage = "Tên đăng nhập tối đa 50 ký tự.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu không được để trống.")]
    [StringLength(100, ErrorMessage = "Mật khẩu tối đa 100 ký tự.")]
    public string Password { get; set; } = string.Empty;
}
