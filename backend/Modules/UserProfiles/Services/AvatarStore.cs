namespace RoleManagement.Api.Modules.UserProfiles.Services;

public class AvatarStore
{
    public const string UrlPrefix = "/api/user-profiles/avatars/";
    private const int MaxBytes = 2 * 1024 * 1024;

    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".png"] = "image/png",
        [".webp"] = "image/webp",
        [".gif"] = "image/gif",
    };

    private readonly string _directory;

    public AvatarStore(IWebHostEnvironment environment)
    {
        _directory = Path.Combine(environment.ContentRootPath, "data", "avatars");
    }

    public async Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0 || file.Length > MaxBytes)
        {
            throw new InvalidOperationException("Ảnh đại diện tối đa 2 MB.");
        }

        await using var input = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await input.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var extension = DetectExtension(bytes);
        if (extension == null)
        {
            throw new InvalidOperationException("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF.");
        }

        Directory.CreateDirectory(_directory);
        var name = $"{Guid.NewGuid():N}{extension}";
        var path = Path.Combine(_directory, name);
        await File.WriteAllBytesAsync(path, bytes, cancellationToken);
        return UrlPrefix + name;
    }

    public (string Path, string ContentType)? Open(string fileName)
    {
        if (!IsSafeFileName(fileName))
        {
            return null;
        }

        var path = Path.Combine(_directory, fileName);
        if (!File.Exists(path))
        {
            return null;
        }

        var extension = Path.GetExtension(fileName);
        return (path, ContentTypes[extension]);
    }

    public void DeleteStored(string? url)
    {
        if (!TryGetFileName(url, out var fileName))
        {
            return;
        }

        var path = Path.Combine(_directory, fileName);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    public static bool IsStoredPath(string? url)
    {
        return TryGetFileName(url, out _);
    }

    private static bool TryGetFileName(string? url, out string fileName)
    {
        fileName = string.Empty;
        if (string.IsNullOrWhiteSpace(url) || !url.StartsWith(UrlPrefix, StringComparison.Ordinal))
        {
            return false;
        }

        fileName = url[UrlPrefix.Length..];
        return IsSafeFileName(fileName);
    }

    private static bool IsSafeFileName(string fileName)
    {
        if (fileName.Length != 36)
        {
            return false;
        }

        var extension = Path.GetExtension(fileName);
        var stem = Path.GetFileNameWithoutExtension(fileName);
        return ContentTypes.ContainsKey(extension)
            && stem.Length == 32
            && stem.All(char.IsAsciiHexDigit);
    }

    private static string? DetectExtension(byte[] bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return ".jpg";
        }

        if (bytes.Length >= 8
            && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
        {
            return ".png";
        }

        if (bytes.Length >= 6
            && bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38)
        {
            return ".gif";
        }

        if (bytes.Length >= 12
            && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
            && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
        {
            return ".webp";
        }

        return null;
    }
}
