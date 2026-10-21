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
            .OrderBy(profile => profile.FullName)
            .ThenBy(profile => profile.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<UserProfile?> FindAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.UserProfiles
            .AsNoTracking()
            .Include(profile => profile.User)
            .FirstOrDefaultAsync(profile => profile.Id == id, cancellationToken);
    }

    public Task<UserProfile?> FindTrackedAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.UserProfiles
            .Include(profile => profile.User)
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
