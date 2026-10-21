using RoleManagement.Api.Modules.Storage;

namespace RoleManagement.Api.Modules.UserProfiles.Services;

public class AvatarStore
{
    public const string UrlPrefix = "/api/user-profiles/avatars/";
    private const int MaxBytes = 2 * 1024 * 1024;

    private readonly GarageStorage _storage;

    public AvatarStore(GarageStorage storage)
    {
        _storage = storage;
    }

    public async Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0 || file.Length > MaxBytes)
        {
            throw new InvalidOperationException("Ảnh đại diện tối đa 2 MB.");
        }

        var bytes = await ReadAllAsync(file, cancellationToken);
        var extension = FileSignatures.DetectExtension(bytes, null, imagesOnly: true);
        if (extension == null)
        {
            throw new InvalidOperationException("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF.");
        }

        var name = $"{Guid.NewGuid():N}{extension}";
        await _storage.PutAsync(
            "avatars/" + name,
            bytes,
            FileSignatures.ContentTypes[extension],
            name,
            cancellationToken);
        return UrlPrefix + name;
    }

    public Task<StoredObject?> OpenAsync(string fileName, CancellationToken cancellationToken = default)
    {
        if (!GarageStorage.IsSafeKey("avatars/" + fileName))
        {
            return Task.FromResult<StoredObject?>(null);
        }

        return _storage.OpenAsync("avatars/" + fileName, cancellationToken);
    }

    public Task DeleteStoredAsync(string? url, CancellationToken cancellationToken = default)
    {
        if (!TryGetFileName(url, out var fileName))
        {
            return Task.CompletedTask;
        }

        return _storage.DeleteAsync("avatars/" + fileName, cancellationToken);
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
        return GarageStorage.IsSafeKey("avatars/" + fileName);
    }

    private static async Task<byte[]> ReadAllAsync(IFormFile file, CancellationToken cancellationToken)
    {
        await using var input = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await input.CopyToAsync(buffer, cancellationToken);
        return buffer.ToArray();
    }
}
