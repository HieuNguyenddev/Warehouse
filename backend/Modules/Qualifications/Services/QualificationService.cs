using RoleManagement.Api.Modules.Files;
using RoleManagement.Api.Modules.Qualifications.DTOs;
using RoleManagement.Api.Modules.Qualifications.Entities;
using RoleManagement.Api.Modules.Qualifications.Repositories;
using RoleManagement.Api.Modules.Storage;
using RoleManagement.Api.Modules.UserProfiles.Repositories;

namespace RoleManagement.Api.Modules.Qualifications.Services;

public class QualificationService : IQualificationService
{
    private readonly IQualificationRepository _qualifications;
    private readonly IUserProfileRepository _profiles;
    private readonly FileStore _files;

    public QualificationService(
        IQualificationRepository qualifications,
        IUserProfileRepository profiles,
        FileStore files)
    {
        _qualifications = qualifications;
        _profiles = profiles;
        _files = files;
    }

    public async Task<IReadOnlyList<QualificationResponse>> ListAsync(
        int? profileId,
        CancellationToken cancellationToken = default)
    {
        var items = await _qualifications.ListAsync(profileId, cancellationToken);
        return items.Select(QualificationResponse.From).ToList();
    }

    public async Task<QualificationResult> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _qualifications.FindAsync(id, cancellationToken);
        if (item == null)
        {
            return QualificationResult.NotFound($"Không tìm thấy bằng cấp hoặc chứng chỉ có ID = {id}.");
        }

        return QualificationResult.Ok(QualificationResponse.From(item));
    }

    public async Task<QualificationResult> CreateAsync(
        QualificationRequest request,
        CancellationToken cancellationToken = default)
    {
        var prepared = await PrepareAsync(request, null, cancellationToken);
        if (prepared.Error != null)
        {
            return prepared.Error;
        }

        var item = new Qualification
        {
            UserProfileId = request.UserProfileId,
            Kind = request.Kind,
            Name = prepared.Name,
            Major = prepared.Major,
            Grade = prepared.Grade,
            Issuer = prepared.Issuer,
            CredentialNumber = prepared.CredentialNumber,
            IssuedOn = request.IssuedOn,
            ExpiresOn = request.ExpiresOn,
            Note = prepared.Note,
            DocumentUrl = prepared.DocumentUrl,
            DocumentName = prepared.DocumentName,
            CreatedAt = DateTime.UtcNow,
        };

        await _qualifications.AddAsync(item, cancellationToken);
        var saved = await _qualifications.FindAsync(item.Id, cancellationToken);
        return QualificationResult.Ok(QualificationResponse.From(saved!));
    }

    public async Task<QualificationResult> UpdateAsync(
        int id,
        QualificationRequest request,
        CancellationToken cancellationToken = default)
    {
        var item = await _qualifications.FindTrackedAsync(id, cancellationToken);
        if (item == null)
        {
            return QualificationResult.NotFound($"Không tìm thấy bằng cấp hoặc chứng chỉ có ID = {id}.");
        }

        var prepared = await PrepareAsync(request, id, cancellationToken);
        if (prepared.Error != null)
        {
            return prepared.Error;
        }

        item.UserProfileId = request.UserProfileId;
        item.Kind = request.Kind;
        item.Name = prepared.Name;
        item.Major = prepared.Major;
        item.Grade = prepared.Grade;
        item.Issuer = prepared.Issuer;
        item.CredentialNumber = prepared.CredentialNumber;
        var previousDocument = item.DocumentUrl;
        item.IssuedOn = request.IssuedOn;
        item.ExpiresOn = request.ExpiresOn;
        item.Note = prepared.Note;
        item.DocumentUrl = prepared.DocumentUrl;
        item.DocumentName = prepared.DocumentName;
        item.UpdatedAt = DateTime.UtcNow;
        await _qualifications.SaveAsync(cancellationToken);
        if (!string.Equals(previousDocument, prepared.DocumentUrl, StringComparison.Ordinal))
        {
            await DeleteStoredAsync(previousDocument, cancellationToken);
        }
        var saved = await _qualifications.FindAsync(item.Id, cancellationToken);
        return QualificationResult.Ok(QualificationResponse.From(saved!));
    }

    public async Task<QualificationResult> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _qualifications.FindTrackedAsync(id, cancellationToken);
        if (item == null)
        {
            return QualificationResult.NotFound($"Không tìm thấy bằng cấp hoặc chứng chỉ có ID = {id}.");
        }

        var documentUrl = item.DocumentUrl;
        await _qualifications.DeleteAsync(item, cancellationToken);
        await DeleteStoredAsync(documentUrl, cancellationToken);
        return QualificationResult.Ok();
    }

    private async Task<PreparedQualification> PrepareAsync(
        QualificationRequest request,
        int? exceptId,
        CancellationToken cancellationToken)
    {
        if (request.Kind is not (1 or 2))
        {
            return PreparedQualification.Fail(QualificationResult.Invalid("Chọn bằng cấp hoặc chứng chỉ."));
        }

        if (request.IssuedOn != null && request.ExpiresOn != null && request.ExpiresOn < request.IssuedOn)
        {
            return PreparedQualification.Fail(QualificationResult.Invalid("Ngày hết hạn phải từ ngày cấp trở đi."));
        }

        var profile = await _profiles.FindAsync(request.UserProfileId, cancellationToken);
        if (profile == null)
        {
            return PreparedQualification.Fail(QualificationResult.Invalid("Không tìm thấy hồ sơ nhân sự."));
        }

        var number = BlankToNull(request.CredentialNumber);
        if (number != null && await _qualifications.NumberExistsAsync(number, exceptId, cancellationToken))
        {
            return PreparedQualification.Fail(QualificationResult.DuplicateNumber("Số hiệu này đã được ghi cho hồ sơ khác."));
        }

        var document = NormalizeDocument(request.DocumentUrl, request.DocumentName);
        if (document.Error != null)
        {
            return PreparedQualification.Fail(document.Error);
        }

        return new PreparedQualification
        {
            Name = request.Name.Trim(),
            Major = BlankToNull(request.Major),
            Grade = BlankToNull(request.Grade),
            Issuer = BlankToNull(request.Issuer),
            CredentialNumber = number,
            Note = BlankToNull(request.Note),
            DocumentUrl = document.Url,
            DocumentName = document.Name,
        };
    }

    private static bool TryStoredName(string? url, out string name)
    {
        name = string.Empty;
        const string prefix = "/api/files/";
        if (string.IsNullOrWhiteSpace(url) || !url.StartsWith(prefix, StringComparison.Ordinal))
        {
            return false;
        }

        name = url[prefix.Length..];
        return GarageStorage.IsSafeKey("files/" + name);
    }

    private async Task DeleteStoredAsync(string? url, CancellationToken cancellationToken)
    {
        if (!TryStoredName(url, out var name))
        {
            return;
        }

        try
        {
            await _files.DeleteAsync(name, "files", cancellationToken);
        }
        catch (InvalidOperationException)
        {
        }
    }

    private static (string? Url, string? Name, QualificationResult? Error) NormalizeDocument(string? url, string? name)
    {
        var trimmed = BlankToNull(url);
        if (trimmed == null)
        {
            return (null, null, null);
        }

        const string prefix = "/api/files/";
        if (!trimmed.StartsWith(prefix, StringComparison.Ordinal) || !GarageStorage.IsSafeKey("files/" + trimmed[prefix.Length..]))
        {
            return (null, null, QualificationResult.Invalid("Tệp đính kèm không hợp lệ."));
        }

        var extension = Path.GetExtension(trimmed[prefix.Length..]);
        if (!FileSignatures.ImageExtensions.Contains(extension) && !extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            return (null, null, QualificationResult.Invalid("Chỉ nhận ảnh JPG, PNG, WEBP, GIF hoặc tệp PDF."));
        }

        var documentName = BlankToNull(name) ?? Path.GetFileName(trimmed);
        if (documentName.Length > 255)
        {
            documentName = documentName[..255];
        }

        return (trimmed, documentName, null);
    }

    private static string? BlankToNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private sealed class PreparedQualification
    {
        public string Name { get; init; } = string.Empty;

        public string? Major { get; init; }

        public string? Grade { get; init; }

        public string? Issuer { get; init; }

        public string? CredentialNumber { get; init; }

        public string? Note { get; init; }

        public string? DocumentUrl { get; init; }

        public string? DocumentName { get; init; }

        public QualificationResult? Error { get; init; }

        public static PreparedQualification Fail(QualificationResult error)
        {
            return new PreparedQualification { Error = error };
        }
    }
}
