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

    public async Task<StoredFileInfo> SaveAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length <= 0 || file.Length > MaxBytes)
        {
            throw new InvalidOperationException("Tệp tối đa 8 MB.");
        }

        await using var input = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await input.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var extension = FileSignatures.DetectExtension(bytes, Path.GetExtension(file.FileName), imagesOnly: false);
        if (extension == null || !FileSignatures.ContentTypes.TryGetValue(extension, out var contentType))
        {
            throw new InvalidOperationException("Chỉ nhận ảnh JPG, PNG, WEBP, GIF hoặc tệp PDF, TXT, DOCX, XLSX.");
        }

        var name = $"{Guid.NewGuid():N}{extension}";
        var fileName = FileSignatures.SafeFileName(file.FileName, extension);
        await _storage.PutAsync("files/" + name, bytes, contentType, fileName, cancellationToken);
        return new StoredFileInfo(name, fileName, contentType, bytes.LongLength, DateTime.UtcNow);
    }

    public Task<IReadOnlyList<StoredFileInfo>> ListAsync(CancellationToken cancellationToken)
    {
        return _storage.ListAsync("files/", cancellationToken);
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

    public Task DeleteAsync(string name, CancellationToken cancellationToken)
    {
        var key = "files/" + name;
        if (!GarageStorage.IsSafeKey(key))
        {
            return Task.CompletedTask;
        }

        return _storage.DeleteAsync(key, cancellationToken);
    }
}
