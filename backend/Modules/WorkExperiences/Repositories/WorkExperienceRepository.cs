using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Data;
using RoleManagement.Api.Modules.WorkExperiences.Entities;

namespace RoleManagement.Api.Modules.WorkExperiences.Repositories;

public class WorkExperienceRepository : IWorkExperienceRepository
{
    private readonly AppDbContext _context;

    public WorkExperienceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<WorkExperience>> ListAsync(int? profileId, CancellationToken cancellationToken = default)
    {
        return await _context.WorkExperiences
            .AsNoTracking()
            .Include(item => item.Profile)
            .ThenInclude(profile => profile.User)
            .Where(item => profileId == null || item.UserProfileId == profileId)
            .OrderByDescending(item => item.IsCurrent)
            .ThenByDescending(item => item.StartedOn)
            .ThenBy(item => item.Company)
            .ToListAsync(cancellationToken);
    }

    public Task<WorkExperience?> FindAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.WorkExperiences
            .AsNoTracking()
            .Include(item => item.Profile)
            .ThenInclude(profile => profile.User)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public Task<WorkExperience?> FindTrackedAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.WorkExperiences
            .Include(item => item.Profile)
            .ThenInclude(profile => profile.User)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public async Task AddAsync(WorkExperience experience, CancellationToken cancellationToken = default)
    {
        await _context.WorkExperiences.AddAsync(experience, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public Task SaveAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(WorkExperience experience, CancellationToken cancellationToken = default)
    {
        _context.WorkExperiences.Remove(experience);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
