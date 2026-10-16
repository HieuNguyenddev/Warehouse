using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Models;

public class Role
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Tên vai trò không được để trống.")]
    [StringLength(50, ErrorMessage = "Tên vai trò tối đa 50 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(250, ErrorMessage = "Mô tả tối đa 250 ký tự.")]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}