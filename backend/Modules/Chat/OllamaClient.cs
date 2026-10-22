using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using RoleManagement.Api.Modules.Chat.DTOs;

namespace RoleManagement.Api.Modules.Chat;

public class OllamaClient
{
    private const string SystemPrompt =
        "Bạn là trợ lý của trang quản trị nhân sự Kho Admin. Trả lời tiếng Việt, rõ và ngắn. "
        + "Các mục trên trang là Vai trò, Chức vụ, Người dùng, Hồ sơ, Bằng cấp, Kinh nghiệm, Tệp và Trợ lý. "
        + "Không bịa số liệu nhân sự. Không xin và không nhắc lại mật khẩu, khóa API, mã JWT hay chuỗi kết nối database.";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string[] PreferredModels = ["qwen2.5:0.5b", "qwen3:0.6b", "qwen3:1.7b", "qwen3:4b", "qwen3:8b"];

    private readonly IHttpClientFactory _http;
    private readonly OllamaOptions _options;

    public OllamaClient(IHttpClientFactory http, IOptions<OllamaOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public bool IsConfigured => TryBaseUri(out _);

    public string DefaultModel => _options.Model.Trim();

    public async Task<ChatCatalog> ListCatalogAsync(CancellationToken cancellationToken)
    {
        var models = (await FetchModelsAsync(cancellationToken))
            .Where(IsChatModel)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(Score)
            .ThenBy(id => id, StringComparer.Ordinal)
            .ToList();

        var notice = "";
        if (IsSafeModel(DefaultModel))
        {
            if (models.Remove(DefaultModel))
            {
                models.Insert(0, DefaultModel);
            }
            else
            {
                notice = $"Không thấy {DefaultModel} trong Ollama. Chạy ollama pull {DefaultModel}, hoặc để trống OLLAMA_MODEL.";
            }
        }

        if (models.Count == 0)
        {
            return new ChatCatalog("", [], string.IsNullOrEmpty(notice)
                ? "Ollama chưa có mô hình chat. Chạy ollama pull qwen2.5:0.5b, rồi tải lại trang Trợ lý."
                : notice);
        }

        return new ChatCatalog(models[0], models.Select(id => new ChatModelItem(id)).ToArray(), notice);
    }

    public async Task<ChatReplyResponse> CompleteAsync(ChatRequest request, CancellationToken cancellationToken)
    {
        if (request.Messages.Count == 0 || request.Messages[^1].Role != "user")
        {
            throw new OllamaException(StatusCodes.Status400BadRequest, "Lượt cuối phải là câu hỏi của bạn.");
        }

        var catalog = await ListCatalogAsync(cancellationToken);
        if (catalog.Models.Count == 0)
        {
            throw new OllamaException(StatusCodes.Status503ServiceUnavailable, catalog.Notice);
        }

        var requested = request.Model?.Trim() ?? "";
        var model = catalog.Models.Any(item => item.Id == requested) ? requested : catalog.DefaultModel;
        var messages = new List<OllamaMessage>
        {
            new("system", SystemPrompt),
        };
        messages.AddRange(request.Messages.TakeLast(4).Select(turn => new OllamaMessage(turn.Role, Clip(turn.Content))));

        var payload = new OllamaChat(model, messages, false, false, new OllamaSampling(0.3, 384, 2048));
        using var document = await SendAsync(HttpMethod.Post, "/api/chat", payload, cancellationToken);
        var reply = VisibleReply(ReadReply(document.RootElement));
        if (string.IsNullOrWhiteSpace(reply))
        {
            throw new OllamaException(StatusCodes.Status502BadGateway, "Ollama không có nội dung trả lời.");
        }

        return new ChatReplyResponse(reply.Trim(), model);
    }

    private async Task<IReadOnlyList<string>> FetchModelsAsync(CancellationToken cancellationToken)
    {
        using var document = await SendAsync(HttpMethod.Get, "/api/tags", null, cancellationToken);
        if (!document.RootElement.TryGetProperty("models", out var models) || models.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var names = new List<string>();
        foreach (var item in models.EnumerateArray())
        {
            if (item.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String)
            {
                var value = name.GetString()?.Trim();
                if (IsSafeModel(value ?? ""))
                {
                    names.Add(value!);
                }
            }
        }

        return names;
    }

    private async Task<JsonDocument> SendAsync(HttpMethod method, string path, object? body, CancellationToken cancellationToken)
    {
        if (!TryBaseUri(out var baseUri))
        {
            throw new OllamaException(StatusCodes.Status503ServiceUnavailable, "OLLAMA_URL không phải địa chỉ http hợp lệ.");
        }

        using var request = new HttpRequestMessage(method, new Uri(baseUri, path));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (body != null)
        {
            request.Content = JsonContent.Create(body, options: Json);
        }

        var client = _http.CreateClient("ollama");
        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, cancellationToken);
        }
        catch (Exception exception) when (
            (exception is HttpRequestException || exception is TaskCanceledException)
            && !cancellationToken.IsCancellationRequested)
        {
            throw new OllamaException(StatusCodes.Status502BadGateway, "Không kết nối được Ollama. Kiểm tra ollama serve ở cổng 11434.");
        }

        using (response)
        {
            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                throw new OllamaException(StatusCodes.Status502BadGateway, UpstreamMessage(text));
            }

            try
            {
                return JsonDocument.Parse(string.IsNullOrWhiteSpace(text) ? "{}" : text);
            }
            catch (JsonException)
            {
                throw new OllamaException(StatusCodes.Status502BadGateway, "Ollama trả dữ liệu không đọc được.");
            }
        }
    }

    private bool TryBaseUri(out Uri baseUri)
    {
        var baseUrl = _options.BaseUrl.Trim().TrimEnd('/');
        if (Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            baseUri = uri;
            return true;
        }

        baseUri = null!;
        return false;
    }

    private static string ReadReply(JsonElement root)
    {
        if (!root.TryGetProperty("message", out var message) || message.ValueKind != JsonValueKind.Object)
        {
            return string.Empty;
        }

        if (message.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.String)
        {
            return content.GetString() ?? string.Empty;
        }

        return string.Empty;
    }

    private static string VisibleReply(string content)
    {
        var text = content.Trim();
        if (!text.StartsWith("<think>", StringComparison.OrdinalIgnoreCase))
        {
            return text;
        }

        var end = text.IndexOf("</think>", StringComparison.OrdinalIgnoreCase);
        return end < 0 ? text : text[(end + "</think>".Length)..].Trim();
    }

    private static string UpstreamMessage(string body)
    {
        var detail = "";
        try
        {
            using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(body) ? "{}" : body);
            if (document.RootElement.TryGetProperty("error", out var error) && error.ValueKind == JsonValueKind.String)
            {
                detail = error.GetString() ?? "";
            }
        }
        catch (JsonException)
        {
            detail = "";
        }

        detail = detail.ReplaceLineEndings(" ").Trim();
        if (detail.Length > 240)
        {
            detail = detail[..240];
        }

        return string.IsNullOrEmpty(detail) ? "Ollama từ chối câu trả lời." : $"Ollama từ chối câu trả lời. {detail}";
    }

    private static string Clip(string content)
    {
        var text = content.Trim();
        return text.Length <= 800 ? text : text[..800];
    }

    private static bool IsChatModel(string id)
    {
        var lower = id.ToLowerInvariant();
        return !lower.Contains("embed", StringComparison.Ordinal)
            && !lower.StartsWith("bge-", StringComparison.Ordinal);
    }

    private static int Score(string id)
    {
        var rank = Array.FindIndex(PreferredModels, name => name.Equals(id, StringComparison.OrdinalIgnoreCase));
        return rank < 0 ? PreferredModels.Length : rank;
    }

    private static bool IsSafeModel(string model)
    {
        if (model.Length is 0 or > 120)
        {
            return false;
        }

        foreach (var character in model)
        {
            if (!char.IsLetterOrDigit(character) && character is not ('/' or '.' or '_' or '-' or ':'))
            {
                return false;
            }
        }

        return true;
    }

    private sealed record OllamaMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed record OllamaSampling(
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("num_predict")] int NumPredict,
        [property: JsonPropertyName("num_ctx")] int NumCtx);

    private sealed record OllamaChat(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("messages")] IReadOnlyList<OllamaMessage> Messages,
        [property: JsonPropertyName("stream")] bool Stream,
        [property: JsonPropertyName("think")] bool Think,
        [property: JsonPropertyName("options")] OllamaSampling Options);
}

public sealed record ChatCatalog(string DefaultModel, IReadOnlyList<ChatModelItem> Models, string Notice);

public sealed class OllamaException : Exception
{
    public OllamaException(int status, string message)
        : base(message)
    {
        Status = status;
    }

    public int Status { get; }
}
