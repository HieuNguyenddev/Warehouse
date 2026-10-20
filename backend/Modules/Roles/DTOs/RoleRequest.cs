using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.Roles.DTOs;

public class RoleRequest
{
    [Required(ErrorMessage = "Tên vai trò không được để trống.")]
    [StringLength(50, ErrorMessage = "Tên vai trò tối đa 50 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(250, ErrorMessage = "Mô tả tối đa 250 ký tự.")]
    public string? Description { get; set; }
}
