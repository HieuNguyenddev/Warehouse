using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Data;
using RoleManagement.Api.Modules.UserProfiles.Entities;

namespace RoleManagement.Api.Modules.UserProfiles.Repositories;

public class UserProfileRepository : IUserProfileRepository
{
    private readonly AppDbContext _context;

    public UserProfileRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<UserProfile>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _context.UserProfiles
            .AsNoTracking()
            .Include(profile => profile.User)
            .ThenInclude(user => user.Position)
            .OrderBy(profile => profile.FullName)
            .ThenBy(profile => profile.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task AlignEmployeeCodesAsync(CancellationToken cancellationToken = default)
    {
        var profiles = await _context.UserProfiles
            .Include(profile => profile.User)
            .ThenInclude(user => user.Position)
            .OrderBy(profile => profile.Id)
            .ToListAsync(cancellationToken);

        var codes = profiles.Select(profile => profile.EmployeeCode).ToList();
        var changed = false;
        foreach (var profile in profiles)
        {
            var prefix = EmployeeCodes.Prefix(profile.User?.Position?.Code);
            if (prefix == null || EmployeeCodes.TryRead(prefix, profile.EmployeeCode, out _))
            {
                continue;
            }

            var next = 1;
            foreach (var code in codes)
            {
                if (EmployeeCodes.TryRead(prefix, code, out var number))
                {
                    next = Math.Max(next, number + 1);
                }
            }

            if (next > 999)
            {
                continue;
            }

            codes.Remove(profile.EmployeeCode);
            profile.EmployeeCode = EmployeeCodes.Format(prefix, next);
            codes.Add(profile.EmployeeCode);
            changed = true;
        }

        if (changed)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public Task<UserProfile?> FindAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.UserProfiles
            .AsNoTracking()
            .Include(profile => profile.User)
            .ThenInclude(user => user.Position)
            .FirstOrDefaultAsync(profile => profile.Id == id, cancellationToken);
    }

    public Task<UserProfile?> FindTrackedAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.UserProfiles
            .Include(profile => profile.User)
            .ThenInclude(user => user.Position)
            .FirstOrDefaultAsync(profile => profile.Id == id, cancellationToken);
    }

    public Task<bool> UserHasProfileAsync(
        int userId,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.UserProfiles.AnyAsync(
            profile => profile.UserId == userId && (exceptId == null || profile.Id != exceptId),
            cancellationToken);
    }

    public Task<bool> IdentityExistsAsync(
        string identityNumber,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.UserProfiles.AnyAsync(
            profile => profile.IdentityNumber == identityNumber && (exceptId == null || profile.Id != exceptId),
            cancellationToken);
    }

    public Task<bool> EmailExistsAsync(
        string email,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.UserProfiles.AnyAsync(
            profile => profile.Email == email && (exceptId == null || profile.Id != exceptId),
            cancellationToken);
    }

    public async Task<string> NextEmployeeCodeAsync(string prefix, CancellationToken cancellationToken = default)
    {
        var codes = await _context.UserProfiles
            .Where(profile => profile.EmployeeCode.StartsWith(prefix))
            .Select(profile => profile.EmployeeCode)
            .ToListAsync(cancellationToken);

        var next = 1;
        foreach (var code in codes)
        {
            if (EmployeeCodes.TryRead(prefix, code, out var number))
            {
                next = Math.Max(next, number + 1);
            }
        }

        if (next > 999)
        {
            return string.Empty;
        }

        return EmployeeCodes.Format(prefix, next);
    }

    public async Task AddAsync(UserProfile profile, CancellationToken cancellationToken = default)
    {
        await _context.UserProfiles.AddAsync(profile, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public Task SaveAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(UserProfile profile, CancellationToken cancellationToken = default)
    {
        _context.UserProfiles.Remove(profile);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
