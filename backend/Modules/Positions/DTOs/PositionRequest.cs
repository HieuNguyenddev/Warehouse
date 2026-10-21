using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.Positions.DTOs;

public class PositionRequest
{
    [Required(ErrorMessage = "Tên chức vụ không được để trống.")]
    [StringLength(80, ErrorMessage = "Tên chức vụ tối đa 80 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(20, ErrorMessage = "Mã chức vụ tối đa 20 ký tự.")]
    public string? Code { get; set; }

    [Range(0, 999, ErrorMessage = "Cấp từ 0 đến 999. 0 nghĩa là chưa xếp cấp.")]
    public int Rank { get; set; }

    [StringLength(250, ErrorMessage = "Mô tả tối đa 250 ký tự.")]
    public string? Description { get; set; }
}
