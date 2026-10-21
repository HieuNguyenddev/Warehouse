using RoleManagement.Api.Modules.Files;
using RoleManagement.Api.Modules.Storage;

namespace RoleManagement.Api.Modules.UserProfiles.Services;

public class AvatarStore
{
    public const string UrlPrefix = "/api/user-profiles/avatars/";
    public const string FileUrlPrefix = "/api/files/";
    private const int MaxBytes = 2 * 1024 * 1024;

    private readonly GarageStorage _storage;
    private readonly FileStore _files;

    public AvatarStore(GarageStorage storage, FileStore files)
    {
        _storage = storage;
        _files = files;
    }

    public async Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        var saved = await _files.SaveImageAsync(file, MaxBytes, cancellationToken);
        return saved.Url;
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
        if (!TryGetKey(url, out var key))
        {
            return Task.CompletedTask;
        }

        return _storage.DeleteAsync(key, cancellationToken);
    }

    public static bool IsStoredPath(string? url)
    {
        return TryGetKey(url, out _);
    }

    private static bool TryGetKey(string? url, out string key)
    {
        key = string.Empty;
        if (string.IsNullOrWhiteSpace(url))
        {
            return false;
        }

        if (url.StartsWith(UrlPrefix, StringComparison.Ordinal))
        {
            key = "avatars/" + url[UrlPrefix.Length..];
            return GarageStorage.IsSafeKey(key);
        }

        if (url.StartsWith(FileUrlPrefix, StringComparison.Ordinal))
        {
            key = "files/" + url[FileUrlPrefix.Length..];
            var extension = Path.GetExtension(key);
            return GarageStorage.IsSafeKey(key) && FileSignatures.ImageExtensions.Contains(extension);
        }

        return false;
    }
}
