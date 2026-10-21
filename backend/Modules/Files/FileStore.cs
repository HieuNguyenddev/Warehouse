using RoleManagement.Api.Modules.Storage;

namespace RoleManagement.Api.Modules.Files;

public class FileStore
{
    private const int MaxBytes = 8 * 1024 * 1024;

    private readonly GarageStorage _storage;

    public FileStore(GarageStorage storage)
    {
        _storage = storage;
    }

    public string ProviderName => _storage.ProviderName;

    public Task<WarehouseFile> SaveAsync(IFormFile file, CancellationToken cancellationToken)
    {
        return SaveCoreAsync(file, imagesOnly: false, MaxBytes, cancellationToken);
    }

    public Task<WarehouseFile> SaveImageAsync(IFormFile file, int maxBytes, CancellationToken cancellationToken)
    {
        return SaveCoreAsync(file, imagesOnly: true, maxBytes, cancellationToken);
    }

    public async Task<IReadOnlyList<WarehouseFile>> ListAsync(CancellationToken cancellationToken)
    {
        var files = await _storage.ListAsync("files/", cancellationToken);
        var avatars = await _storage.ListAsync("avatars/", cancellationToken);
        return files.Select(item => WarehouseFile.From(item, "files"))
            .Concat(avatars.Select(item => WarehouseFile.From(item, "avatars")))
            .OrderByDescending(item => item.LastModified)
            .ToList();
    }

    public Task<StoredObject?> OpenAsync(string name, CancellationToken cancellationToken)
    {
        var key = "files/" + name;
        if (!GarageStorage.IsSafeKey(key))
        {
            return Task.FromResult<StoredObject?>(null);
        }

        return _storage.OpenAsync(key, cancellationToken);
    }

    public Task DeleteAsync(string name, string? folder, CancellationToken cancellationToken)
    {
        var key = (folder == "avatars" ? "avatars/" : "files/") + name;
        if (!GarageStorage.IsSafeKey(key))
        {
            return Task.CompletedTask;
        }

        return _storage.DeleteAsync(key, cancellationToken);
    }

    private async Task<WarehouseFile> SaveCoreAsync(
        IFormFile file,
        bool imagesOnly,
        int maxBytes,
        CancellationToken cancellationToken)
    {
        if (file.Length <= 0 || file.Length > maxBytes)
        {
            throw new InvalidOperationException(imagesOnly ? "Ảnh đại diện tối đa 2 MB." : "Tệp tối đa 8 MB.");
        }

        await using var input = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await input.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var extension = FileSignatures.DetectExtension(bytes, Path.GetExtension(file.FileName), imagesOnly);
        if (extension == null || !FileSignatures.ContentTypes.TryGetValue(extension, out var contentType))
        {
            throw new InvalidOperationException(imagesOnly
                ? "Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF."
                : "Chỉ nhận ảnh JPG, PNG, WEBP, GIF hoặc tệp PDF, TXT, DOCX, XLSX.");
        }

        var name = $"{Guid.NewGuid():N}{extension}";
        var fileName = FileSignatures.SafeFileName(file.FileName, extension);
        await _storage.PutAsync("files/" + name, bytes, contentType, fileName, cancellationToken);
        return WarehouseFile.From(new StoredFileInfo(name, fileName, contentType, bytes.LongLength, DateTime.UtcNow), "files");
    }
}

public record WarehouseFile(
    string Name,
    string FileName,
    string ContentType,
    long Size,
    DateTime? LastModified,
    string Folder)
{
    public string Url => Folder == "avatars"
        ? "/api/user-profiles/avatars/" + Name
        : "/api/files/" + Name;

    public static WarehouseFile From(StoredFileInfo item, string folder)
    {
        return new WarehouseFile(item.Name, item.FileName, item.ContentType, item.Size, item.LastModified, folder);
    }
}
