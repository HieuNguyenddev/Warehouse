using System.ComponentModel.DataAnnotations;

namespace RoleManagement.Api.Modules.Chat.DTOs;

public class ChatRequest
{
    [MinLength(1, ErrorMessage = "Chưa có câu hỏi.")]
    [MaxLength(20, ErrorMessage = "Hội thoại gửi kèm tối đa 20 lượt.")]
    public List<ChatTurn> Messages { get; set; } = [];

    [StringLength(120, ErrorMessage = "Mã mô hình tối đa 120 ký tự.")]
    public string? Model { get; set; }
}

public class ChatTurn
{
    [Required(ErrorMessage = "Thiếu vai trò của lượt chat.")]
    [RegularExpression("^(user|assistant)$", ErrorMessage = "Vai trò chỉ nhận user hoặc assistant.")]
    public string Role { get; set; } = string.Empty;

    [Required(ErrorMessage = "Nội dung không được để trống.")]
    [StringLength(4000, MinimumLength = 1, ErrorMessage = "Mỗi lượt chat từ 1 đến 4000 ký tự.")]
    public string Content { get; set; } = string.Empty;
}

public record ChatCatalogResponse(
    bool Configured,
    string DefaultModel,
    IReadOnlyList<ChatModelItem> Models,
    string Notice);

public record ChatModelItem(string Id);

public record ChatReplyResponse(string Reply, string Model);

public record ChatMessage(string Message);
