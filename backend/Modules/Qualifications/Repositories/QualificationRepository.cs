using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Data;
using RoleManagement.Api.Modules.Qualifications.Entities;

namespace RoleManagement.Api.Modules.Qualifications.Repositories;

public class QualificationRepository : IQualificationRepository
{
    private readonly AppDbContext _context;

    public QualificationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Qualification>> ListAsync(int? profileId, CancellationToken cancellationToken = default)
    {
        return await _context.Qualifications
            .AsNoTracking()
            .Include(item => item.Profile)
            .ThenInclude(profile => profile.User)
            .Where(item => profileId == null || item.UserProfileId == profileId)
            .OrderByDescending(item => item.IssuedOn)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Qualification?> FindAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Qualifications
            .AsNoTracking()
            .Include(item => item.Profile)
            .ThenInclude(profile => profile.User)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public Task<Qualification?> FindTrackedAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Qualifications
            .Include(item => item.Profile)
            .ThenInclude(profile => profile.User)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public Task<bool> NumberExistsAsync(
        string credentialNumber,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.Qualifications.AnyAsync(
            item => item.CredentialNumber == credentialNumber && (exceptId == null || item.Id != exceptId),
            cancellationToken);
    }

    public async Task AddAsync(Qualification qualification, CancellationToken cancellationToken = default)
    {
        await _context.Qualifications.AddAsync(qualification, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public Task SaveAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Qualification qualification, CancellationToken cancellationToken = default)
    {
        _context.Qualifications.Remove(qualification);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
