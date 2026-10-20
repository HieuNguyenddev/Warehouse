using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Data;
using RoleManagement.Api.Modules.Roles.Entities;

namespace RoleManagement.Api.Modules.Roles.Repositories;

public class RoleRepository : IRoleRepository
{
    private readonly AppDbContext _context;

    public RoleRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Role>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Roles
            .AsNoTracking()
            .OrderBy(role => role.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<Role?> FindAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(role => role.Id == id, cancellationToken);
    }

    public Task<Role?> FindTrackedAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Roles
            .FirstOrDefaultAsync(role => role.Id == id, cancellationToken);
    }

    public Task<bool> NameExistsAsync(
        string name,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.Roles.AnyAsync(
            role => role.Name == name && (exceptId == null || role.Id != exceptId),
            cancellationToken);
    }

    public async Task AddAsync(Role role, CancellationToken cancellationToken = default)
    {
        await _context.Roles.AddAsync(role, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public Task SaveAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Role role, CancellationToken cancellationToken = default)
    {
        _context.Roles.Remove(role);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
