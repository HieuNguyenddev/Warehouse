using System.Text.Json.Serialization;

namespace RoleManagement.Api.Modules.Auth.Services;

public class TurnstileVerifier
{
    private readonly IHttpClientFactory _http;
    private readonly IHostEnvironment _environment;
    private readonly string? _secret;

    public TurnstileVerifier(IHttpClientFactory http, IHostEnvironment environment, IConfiguration configuration)
    {
        _http = http;
        _environment = environment;
        _secret = configuration["Turnstile:SecretKey"];
    }

    public bool IsEnabled => !string.IsNullOrWhiteSpace(_secret) && !IsLocalDevelopment;

    private bool IsLocalDevelopment =>
        _environment.IsDevelopment()
        && !string.Equals(
            Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"),
            "true",
            StringComparison.OrdinalIgnoreCase);

    public async Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken)
    {
        if (!IsEnabled)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var fields = new Dictionary<string, string>
        {
            ["secret"] = _secret!,
            ["response"] = token,
        };
        if (!string.IsNullOrWhiteSpace(remoteIp))
        {
            fields["remoteip"] = remoteIp;
        }

        var client = _http.CreateClient("turnstile");
        using var response = await client.PostAsync(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            new FormUrlEncodedContent(fields),
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return false;
        }

        var payload = await response.Content.ReadFromJsonAsync<TurnstileResult>(cancellationToken);
        return payload?.Success == true;
    }

    private sealed class TurnstileResult
    {
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }
    }
}
