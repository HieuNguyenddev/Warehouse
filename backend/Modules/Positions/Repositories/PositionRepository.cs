using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Data;
using RoleManagement.Api.Modules.Positions.Entities;

namespace RoleManagement.Api.Modules.Positions.Repositories;

public class PositionRepository : IPositionRepository
{
    private readonly AppDbContext _context;

    public PositionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Position>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Positions
            .AsNoTracking()
            .OrderBy(position => position.Rank == 0)
            .ThenBy(position => position.Rank)
            .ThenBy(position => position.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Position?> FindAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Positions
            .AsNoTracking()
            .FirstOrDefaultAsync(position => position.Id == id, cancellationToken);
    }

    public Task<Position?> FindTrackedAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Positions
            .FirstOrDefaultAsync(position => position.Id == id, cancellationToken);
    }

    public Task<bool> NameExistsAsync(
        string name,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.Positions.AnyAsync(
            position => position.Name == name && (exceptId == null || position.Id != exceptId),
            cancellationToken);
    }

    public Task<bool> CodeExistsAsync(
        string code,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.Positions.AnyAsync(
            position => position.Code == code && (exceptId == null || position.Id != exceptId),
            cancellationToken);
    }

    public async Task AddAsync(Position position, CancellationToken cancellationToken = default)
    {
        await _context.Positions.AddAsync(position, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public Task SaveAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Position position, CancellationToken cancellationToken = default)
    {
        _context.Positions.Remove(position);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
