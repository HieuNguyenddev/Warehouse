namespace RoleManagement.Api.Modules.Chat;

public class OllamaOptions
{
    public const string SectionName = "Ollama";

    public string BaseUrl { get; set; } = "http://127.0.0.1:11434";

    public string Model { get; set; } = string.Empty;
}
