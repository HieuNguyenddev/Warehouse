using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.Warehouses.DTOs;

public class WarehouseRequest
{
    [Required(ErrorMessage = "Tên kho không được để trống.")]
    [StringLength(80, ErrorMessage = "Tên kho tối đa 80 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(20, ErrorMessage = "Mã kho tối đa 20 ký tự.")]
    public string? Code { get; set; }

    [StringLength(20, ErrorMessage = "Số điện thoại tối đa 20 ký tự.")]
    public string? Phone { get; set; }

    [StringLength(200, ErrorMessage = "Địa chỉ tối đa 200 ký tự.")]
    public string? Address { get; set; }

    [StringLength(20, ErrorMessage = "Mã tỉnh, thành phố tối đa 20 ký tự.")]
    public string? ProvinceCode { get; set; }

    [StringLength(20, ErrorMessage = "Mã xã, phường tối đa 20 ký tự.")]
    public string? WardCode { get; set; }

    [StringLength(250, ErrorMessage = "Ghi chú tối đa 250 ký tự.")]
    public string? Note { get; set; }

    public bool IsActive { get; set; } = true;
}
