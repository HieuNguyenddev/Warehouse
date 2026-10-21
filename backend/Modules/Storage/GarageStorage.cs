using System.Text.Json;
using Amazon.S3;
using Amazon.S3.Model;

namespace RoleManagement.Api.Modules.Storage;

public sealed class GarageStorage
{
    private readonly string? _bucket;
    private readonly IAmazonS3? _client;
    private readonly string _localRoot;

    public GarageStorage(IWebHostEnvironment environment, IConfiguration configuration)
    {
        Environment.SetEnvironmentVariable("AWS_REQUEST_CHECKSUM_CALCULATION", "WHEN_REQUIRED");
        Environment.SetEnvironmentVariable("AWS_RESPONSE_CHECKSUM_VALIDATION", "WHEN_REQUIRED");

        var endpoint = configuration["Garage:Endpoint"];
        var accessKey = configuration["Garage:AccessKey"];
        var secretKey = configuration["Garage:SecretKey"];
        _bucket = configuration["Garage:Bucket"];
        var region = configuration["Garage:Region"];
        if (string.IsNullOrWhiteSpace(region))
        {
            region = "garage";
        }

        UsesGarage = !string.IsNullOrWhiteSpace(endpoint)
            && !string.IsNullOrWhiteSpace(accessKey)
            && !string.IsNullOrWhiteSpace(secretKey)
            && !string.IsNullOrWhiteSpace(_bucket);

        if (UsesGarage)
        {
            var config = new AmazonS3Config
            {
                ServiceURL = endpoint,
                ForcePathStyle = true,
                AuthenticationRegion = region,
            };
            _client = new AmazonS3Client(accessKey, secretKey, config);
        }

        _localRoot = Path.Combine(environment.ContentRootPath, "data", "objects");
    }

    public bool UsesGarage { get; }

    public string ProviderName => UsesGarage ? "Garage" : "Ổ đĩa máy";

    public async Task PutAsync(string key, byte[] bytes, string contentType, string fileName, CancellationToken cancellationToken)
    {
        RequireKey(key);
        if (UsesGarage)
        {
            using var stream = new MemoryStream(bytes);
            var request = new PutObjectRequest
            {
                BucketName = _bucket,
                Key = key,
                InputStream = stream,
                ContentType = contentType,
            };
            request.Metadata["filename"] = Uri.EscapeDataString(fileName);
            await SendAsync(() => _client!.PutObjectAsync(request, cancellationToken));
            return;
        }

        var path = LocalPath(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, bytes, cancellationToken);
        var meta = JsonSerializer.Serialize(new LocalMeta(contentType, fileName));
        await File.WriteAllTextAsync(path + ".meta.json", meta, cancellationToken);
    }

    public async Task<StoredObject?> OpenAsync(string key, CancellationToken cancellationToken)
    {
        if (!IsSafeKey(key))
        {
            return null;
        }

        if (UsesGarage)
        {
            try
            {
                var response = await _client!.GetObjectAsync(_bucket, key, cancellationToken);
                var fileName = response.Metadata["filename"];
                return new StoredObject(
                    response.ResponseStream,
                    response.Headers.ContentType ?? "application/octet-stream",
                    DecodeFileName(fileName, key));
            }
            catch (AmazonS3Exception exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
            catch (AmazonS3Exception exception)
            {
                throw new InvalidOperationException("Không ghi hoặc đọc được dữ liệu trên Garage.", exception);
            }
            catch (HttpRequestException exception)
            {
                throw new InvalidOperationException("Không kết nối được tới Garage.", exception);
            }
        }

        var path = LocalPath(key);
        if (!File.Exists(path))
        {
            return null;
        }

        var meta = ReadMeta(path);
        return new StoredObject(File.OpenRead(path), meta.ContentType, meta.FileName);
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        if (!IsSafeKey(key))
        {
            return;
        }

        if (UsesGarage)
        {
            await SendAsync(() => _client!.DeleteObjectAsync(_bucket, key, cancellationToken));
            return;
        }

        var path = LocalPath(key);
        if (File.Exists(path))
        {
            File.Delete(path);
        }

        var metaPath = path + ".meta.json";
        if (File.Exists(metaPath))
        {
            File.Delete(metaPath);
        }
    }

    public async Task<IReadOnlyList<StoredFileInfo>> ListAsync(string prefix, CancellationToken cancellationToken)
    {
        if (prefix is not ("avatars/" or "files/"))
        {
            return [];
        }

        if (UsesGarage)
        {
            var response = await SendAsync(() => _client!.ListObjectsV2Async(new ListObjectsV2Request
            {
                BucketName = _bucket,
                Prefix = prefix,
            }, cancellationToken));

            var files = new List<StoredFileInfo>();
            foreach (var item in response.S3Objects)
            {
                if (!IsSafeKey(item.Key))
                {
                    continue;
                }

                var head = await SendAsync(() => _client!.GetObjectMetadataAsync(_bucket, item.Key, cancellationToken));
                files.Add(new StoredFileInfo(
                    Path.GetFileName(item.Key),
                    DecodeFileName(head.Metadata["filename"], item.Key),
                    head.Headers.ContentType ?? "application/octet-stream",
                    item.Size,
                    item.LastModified));
            }

            return files;
        }

        var directory = Path.Combine(_localRoot, prefix.TrimEnd('/'));
        if (!Directory.Exists(directory))
        {
            return [];
        }

        var local = new List<StoredFileInfo>();
        foreach (var path in Directory.GetFiles(directory))
        {
            if (path.EndsWith(".meta.json", StringComparison.Ordinal))
            {
                continue;
            }

            var key = prefix + Path.GetFileName(path);
            if (!IsSafeKey(key))
            {
                continue;
            }

            var meta = ReadMeta(path);
            var info = new FileInfo(path);
            local.Add(new StoredFileInfo(
                info.Name,
                meta.FileName,
                meta.ContentType,
                info.Length,
                info.LastWriteTimeUtc));
        }

        return local;
    }

    public static bool IsSafeKey(string key)
    {
        var slash = key.IndexOf('/');
        if (slash <= 0 || slash != key.LastIndexOf('/'))
        {
            return false;
        }

        var folder = key[..slash];
        var name = key[(slash + 1)..];
        if (folder is not ("avatars" or "files") || name != Path.GetFileName(name))
        {
            return false;
        }

        var extension = Path.GetExtension(name);
        var stem = Path.GetFileNameWithoutExtension(name);
        var allowed = folder == "avatars" ? FileSignatures.ImageExtensions : FileSignatures.FileExtensions;
        return stem.Length == 32
            && stem.All(char.IsAsciiHexDigit)
            && allowed.Contains(extension);
    }

    private async Task<T> SendAsync<T>(Func<Task<T>> action)
    {
        try
        {
            return await action();
        }
        catch (AmazonS3Exception exception)
        {
            throw new InvalidOperationException("Không ghi hoặc đọc được dữ liệu trên Garage.", exception);
        }
        catch (HttpRequestException exception)
        {
            throw new InvalidOperationException("Không kết nối được tới Garage.", exception);
        }
    }

    private void RequireKey(string key)
    {
        if (!IsSafeKey(key))
        {
            throw new InvalidOperationException("Tên tệp lưu trữ không hợp lệ.");
        }
    }

    private string LocalPath(string key)
    {
        return Path.Combine(_localRoot, key.Replace('/', Path.DirectorySeparatorChar));
    }

    private static LocalMeta ReadMeta(string path)
    {
        var metaPath = path + ".meta.json";
        if (!File.Exists(metaPath))
        {
            return new LocalMeta("application/octet-stream", Path.GetFileName(path));
        }

        try
        {
            return JsonSerializer.Deserialize<LocalMeta>(File.ReadAllText(metaPath))
                ?? new LocalMeta("application/octet-stream", Path.GetFileName(path));
        }
        catch (JsonException)
        {
            return new LocalMeta("application/octet-stream", Path.GetFileName(path));
        }
    }

    private static string DecodeFileName(string? stored, string key)
    {
        if (string.IsNullOrWhiteSpace(stored))
        {
            return Path.GetFileName(key);
        }

        try
        {
            return Uri.UnescapeDataString(stored);
        }
        catch (UriFormatException)
        {
            return Path.GetFileName(key);
        }
    }

    private sealed record LocalMeta(string ContentType, string FileName);
}

public sealed record StoredObject(Stream Stream, string ContentType, string FileName) : IDisposable
{
    public void Dispose()
    {
        Stream.Dispose();
    }
}

public sealed record StoredFileInfo(string Name, string FileName, string ContentType, long Size, DateTime? LastModified);
