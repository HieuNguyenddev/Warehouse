using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Modules.UserProfiles.DTOs;
using RoleManagement.Api.Modules.UserProfiles.Entities;
using RoleManagement.Api.Modules.Positions.Repositories;
using RoleManagement.Api.Modules.UserProfiles.Repositories;
using RoleManagement.Api.Modules.UserProfiles;
using RoleManagement.Api.Modules.Users.Repositories;

namespace RoleManagement.Api.Modules.UserProfiles.Services;

public class UserProfileService : IUserProfileService
{
    private static readonly DateOnly EarliestDate = new(1900, 1, 1);

    private readonly IUserProfileRepository _profiles;
    private readonly IUserRepository _users;
    private readonly IPositionRepository _positions;
    private readonly AvatarStore _avatars;

    public UserProfileService(
        IUserProfileRepository profiles,
        IUserRepository users,
        IPositionRepository positions,
        AvatarStore avatars)
    {
        _profiles = profiles;
        _users = users;
        _positions = positions;
        _avatars = avatars;
    }

    public async Task<IReadOnlyList<UserProfileResponse>> ListAsync(CancellationToken cancellationToken = default)
    {
        await _profiles.EnsureMissingProfilesAsync(cancellationToken);
        await _profiles.AlignEmployeeCodesAsync(cancellationToken);
        var profiles = await _profiles.ListAsync(cancellationToken);
        return profiles.Select(UserProfileResponse.From).ToList();
    }

    public async Task<UserProfileResult> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        await _profiles.AlignEmployeeCodesAsync(cancellationToken);
        var profile = await _profiles.FindAsync(id, cancellationToken);
        if (profile == null)
        {
            return UserProfileResult.NotFound($"Không tìm thấy hồ sơ có ID = {id}.");
        }

        return UserProfileResult.Ok(UserProfileResponse.From(profile));
    }

    public async Task<UserProfileResult> CreateAsync(UserProfileRequest request, CancellationToken cancellationToken = default)
    {
        var normalized = Normalize(request);
        if (normalized.Error != null)
        {
            return normalized.Error;
        }

        var user = await _users.FindTrackedAsync(request.UserId, cancellationToken);
        if (user == null || user.DeletedAt != null)
        {
            return UserProfileResult.UserNotFound($"Không tìm thấy người dùng có ID = {request.UserId}.");
        }

        var position = await ResolvePositionAsync(request.PositionId, required: true, cancellationToken);
        if (position.Error != null)
        {
            return position.Error;
        }

        if (await _profiles.UserHasProfileAsync(user.Id, cancellationToken: cancellationToken))
        {
            return UserProfileResult.DuplicateUser("Người dùng này đã có hồ sơ.");
        }

        if (normalized.IdentityNumber != null
            && await _profiles.IdentityExistsAsync(normalized.IdentityNumber, cancellationToken: cancellationToken))
        {
            return UserProfileResult.DuplicateIdentity("Số CCCD đã được dùng ở hồ sơ khác.");
        }

        if (normalized.Email != null
            && await _profiles.EmailExistsAsync(normalized.Email, cancellationToken: cancellationToken))
        {
            return UserProfileResult.DuplicateEmail("Email đã được dùng ở hồ sơ khác.");
        }

        user.PositionId = position.PositionId;
        var profile = new UserProfile
        {
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
        };
        var codeError = await EnsureEmployeeCodeAsync(profile, position.Prefix!, cancellationToken);
        if (codeError != null)
        {
            return codeError;
        }

        Apply(profile, normalized);
        try
        {
            await _profiles.AddAsync(profile, cancellationToken);
        }
        catch (DbUpdateException)
        {
            return UserProfileResult.Invalid("Mã nhân viên vừa được cấp cho hồ sơ khác. Hãy lưu lại.");
        }

        var created = await _profiles.FindAsync(profile.Id, cancellationToken);
        return UserProfileResult.Ok(UserProfileResponse.From(created!));
    }

    public async Task<UserProfileResult> UpdateAsync(
        int id,
        UserProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var profile = await _profiles.FindTrackedAsync(id, cancellationToken);
        if (profile == null)
        {
            return UserProfileResult.NotFound($"Không tìm thấy hồ sơ có ID = {id}.");
        }

        var normalized = Normalize(request);
        if (normalized.Error != null)
        {
            return normalized.Error;
        }

        if (request.UserId != profile.UserId)
        {
            return UserProfileResult.Invalid("Không đổi được người dùng của hồ sơ đã tạo.");
        }

        if (normalized.IdentityNumber != null
            && await _profiles.IdentityExistsAsync(normalized.IdentityNumber, id, cancellationToken))
        {
            return UserProfileResult.DuplicateIdentity("Số CCCD đã được dùng ở hồ sơ khác.");
        }

        if (normalized.Email != null
            && await _profiles.EmailExistsAsync(normalized.Email, id, cancellationToken))
        {
            return UserProfileResult.DuplicateEmail("Email đã được dùng ở hồ sơ khác.");
        }

        var position = await ResolvePositionAsync(request.PositionId, required: true, cancellationToken);
        if (position.Error != null)
        {
            return position.Error;
        }

        if (profile.User != null)
        {
            profile.User.PositionId = position.PositionId;
        }

        var codeError = await EnsureEmployeeCodeAsync(profile, position.Prefix!, cancellationToken);
        if (codeError != null)
        {
            return codeError;
        }

        var previousAvatar = profile.AvatarUrl;
        Apply(profile, normalized);
        profile.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _profiles.SaveAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return UserProfileResult.DuplicateIdentity("Số CCCD hoặc email đã được dùng ở hồ sơ khác.");
        }

        if (!string.Equals(previousAvatar, profile.AvatarUrl, StringComparison.Ordinal))
        {
            await _avatars.DeleteStoredAsync(previousAvatar, cancellationToken);
        }

        var updated = await _profiles.FindAsync(profile.Id, cancellationToken);
        return UserProfileResult.Ok(UserProfileResponse.From(updated!));
    }

    public async Task<UserProfileResult> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var profile = await _profiles.FindTrackedAsync(id, cancellationToken);
        if (profile == null)
        {
            return UserProfileResult.NotFound($"Không tìm thấy hồ sơ có ID = {id}.");
        }

        var avatar = profile.AvatarUrl;
        await _profiles.DeleteAsync(profile, cancellationToken);
        await _avatars.DeleteStoredAsync(avatar, cancellationToken);
        return UserProfileResult.Ok();
    }

    private async Task<UserProfileResult?> EnsureEmployeeCodeAsync(
        UserProfile profile,
        string prefix,
        CancellationToken cancellationToken)
    {
        if (EmployeeCodes.TryRead(prefix, profile.EmployeeCode, out _))
        {
            return null;
        }

        var employeeCode = await _profiles.NextEmployeeCodeAsync(prefix, cancellationToken);
        if (string.IsNullOrEmpty(employeeCode))
        {
            return UserProfileResult.Invalid($"Mã {prefix} đã đủ 999 nhân viên.");
        }

        profile.EmployeeCode = employeeCode;
        return null;
    }

    private async Task<(int? PositionId, string? Prefix, UserProfileResult? Error)> ResolvePositionAsync(
        int? positionId,
        bool required,
        CancellationToken cancellationToken)
    {
        if (positionId is null or <= 0)
        {
            if (required)
            {
                return (null, null, UserProfileResult.Invalid("Chọn chức vụ để cấp mã nhân viên."));
            }

            return (null, null, null);
        }

        var position = await _positions.FindAsync(positionId.Value, cancellationToken);
        if (position == null)
        {
            return (null, null, UserProfileResult.Invalid($"Không tìm thấy chức vụ có ID = {positionId}."));
        }

        var prefix = EmployeeCodes.Prefix(position.Code);
        if (required && prefix == null)
        {
            return (null, null, UserProfileResult.Invalid("Chức vụ cần mã chữ từ 2 đến 10 ký tự, ví dụ NVK, để cấp mã nhân viên."));
        }

        return (position.Id, prefix, null);
    }

    private static void Apply(UserProfile profile, NormalizedProfile normalized)
    {
        profile.FullName = normalized.FullName;
        profile.DateOfBirth = normalized.DateOfBirth;
        profile.Gender = normalized.Gender;
        profile.IdentityNumber = normalized.IdentityNumber;
        profile.IdentityIssuedDate = normalized.IdentityIssuedDate;
        profile.IdentityIssuedPlace = normalized.IdentityIssuedPlace;
        profile.PhoneNumber = normalized.PhoneNumber;
        profile.Email = normalized.Email;
        profile.Address = normalized.Address;
        profile.PermanentAddress = normalized.PermanentAddress;
        profile.ProvinceCode = normalized.ProvinceCode;
        profile.DistrictCode = null;
        profile.WardCode = normalized.WardCode;
        profile.PlaceOfBirth = normalized.PlaceOfBirth;
        profile.Nationality = normalized.Nationality;
        profile.Ethnicity = normalized.Ethnicity;
        profile.Religion = normalized.Religion;
        profile.MaritalStatus = normalized.MaritalStatus;
        profile.AvatarUrl = normalized.AvatarUrl;
        profile.EmergencyContactName = normalized.EmergencyContactName;
        profile.EmergencyContactPhone = normalized.EmergencyContactPhone;
        profile.EducationLevel = normalized.EducationLevel;
        profile.Note = normalized.Note;
    }

    private static NormalizedProfile Normalize(UserProfileRequest request)
    {
        var today = TodayInVietnam();
        var fullName = request.FullName.Trim();
        if (fullName.Length == 0)
        {
            return NormalizedProfile.Fail(UserProfileResult.Invalid("Họ tên không được để trống."));
        }

        if (request.DateOfBirth is DateOnly birth && (birth > today || birth < EarliestDate))
        {
            return NormalizedProfile.Fail(UserProfileResult.Invalid("Ngày sinh không hợp lệ."));
        }

        if (request.IdentityIssuedDate is DateOnly issued && (issued > today || issued < EarliestDate))
        {
            return NormalizedProfile.Fail(UserProfileResult.Invalid("Ngày cấp CCCD không hợp lệ."));
        }

        if (request.DateOfBirth is DateOnly born
            && request.IdentityIssuedDate is DateOnly issuedOn
            && issuedOn < born)
        {
            return NormalizedProfile.Fail(UserProfileResult.Invalid("Ngày cấp CCCD không được trước ngày sinh."));
        }

        var identity = Digits(request.IdentityNumber);
        if (identity != null && identity.Length is not 9 and not 12)
        {
            return NormalizedProfile.Fail(UserProfileResult.Invalid("Số CCCD gồm 12 số, hoặc CMND cũ gồm 9 số."));
        }

        var phone = NormalizePhone(request.PhoneNumber);
        if (phone.Error != null)
        {
            return NormalizedProfile.Fail(phone.Error);
        }

        var emergencyPhone = NormalizePhone(request.EmergencyContactPhone);
        if (emergencyPhone.Error != null)
        {
            return NormalizedProfile.Fail(emergencyPhone.Error);
        }

        var email = NormalizeEmail(request.Email);
        if (email.Error != null)
        {
            return NormalizedProfile.Fail(email.Error);
        }

        var avatar = NormalizeUrl(request.AvatarUrl);
        if (avatar.Error != null)
        {
            return NormalizedProfile.Fail(avatar.Error);
        }

        return new NormalizedProfile
        {
            FullName = fullName,
            DateOfBirth = request.DateOfBirth,
            Gender = request.Gender,
            IdentityNumber = identity,
            IdentityIssuedDate = request.IdentityIssuedDate,
            IdentityIssuedPlace = Text(request.IdentityIssuedPlace),
            PhoneNumber = phone.Value,
            Email = email.Value,
            Address = Text(request.Address),
            PermanentAddress = Text(request.PermanentAddress),
            ProvinceCode = Text(request.ProvinceCode),
            DistrictCode = Text(request.DistrictCode),
            WardCode = Text(request.WardCode),
            PlaceOfBirth = Text(request.PlaceOfBirth),
            Nationality = Text(request.Nationality),
            Ethnicity = Text(request.Ethnicity),
            Religion = Text(request.Religion),
            MaritalStatus = request.MaritalStatus,
            AvatarUrl = avatar.Value,
            EmergencyContactName = Text(request.EmergencyContactName),
            EmergencyContactPhone = emergencyPhone.Value,
            EducationLevel = Text(request.EducationLevel),
            Note = Text(request.Note),
        };
    }

    private static (string? Value, UserProfileResult? Error) NormalizePhone(string? phone)
    {
        var trimmed = phone?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return (null, null);
        }

        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.Length is < 9 or > 15)
        {
            return (null, UserProfileResult.Invalid("Số điện thoại gồm 9 đến 15 chữ số."));
        }

        return (digits, null);
    }

    private static (string? Value, UserProfileResult? Error) NormalizeEmail(string? email)
    {
        var trimmed = email?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return (null, null);
        }

        var normalized = trimmed.ToLowerInvariant();
        try
        {
            var parsed = new MailAddress(normalized);
            if (parsed.Address != normalized)
            {
                return (null, UserProfileResult.Invalid("Email không hợp lệ."));
            }
        }
        catch (FormatException)
        {
            return (null, UserProfileResult.Invalid("Email không hợp lệ."));
        }

        return (normalized, null);
    }

    private static (string? Value, UserProfileResult? Error) NormalizeUrl(string? url)
    {
        var trimmed = url?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return (null, null);
        }

        if (AvatarStore.IsStoredPath(trimmed))
        {
            return (trimmed, null);
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return (null, UserProfileResult.Invalid("Ảnh đại diện phải là file đã tải lên hoặc đường dẫn http, https."));
        }

        return (trimmed, null);
    }

    private static string? Digits(string? value)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return new string(trimmed.Where(char.IsDigit).ToArray());
    }

    private static string? Text(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static DateOnly TodayInVietnam()
    {
        try
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone));
        }
        catch (TimeZoneNotFoundException)
        {
            return DateOnly.FromDateTime(DateTime.UtcNow);
        }
    }

    private sealed class NormalizedProfile
    {
        public string FullName { get; init; } = string.Empty;

        public DateOnly? DateOfBirth { get; init; }

        public short Gender { get; init; }

        public string? IdentityNumber { get; init; }

        public DateOnly? IdentityIssuedDate { get; init; }

        public string? IdentityIssuedPlace { get; init; }

        public string? PhoneNumber { get; init; }

        public string? Email { get; init; }

        public string? Address { get; init; }

        public string? PermanentAddress { get; init; }

        public string? ProvinceCode { get; init; }

        public string? DistrictCode { get; init; }

        public string? WardCode { get; init; }

        public string? PlaceOfBirth { get; init; }

        public string? Nationality { get; init; }

        public string? Ethnicity { get; init; }

        public string? Religion { get; init; }

        public short MaritalStatus { get; init; }

        public string? AvatarUrl { get; init; }

        public string? EmergencyContactName { get; init; }

        public string? EmergencyContactPhone { get; init; }

        public string? EducationLevel { get; init; }

        public string? Note { get; init; }

        public UserProfileResult? Error { get; init; }

        public static NormalizedProfile Fail(UserProfileResult error)
        {
            return new NormalizedProfile { Error = error };
        }
    }
}
