using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Data;
using RoleManagement.Api.Modules.Warehouses.Entities;

namespace RoleManagement.Api.Modules.Warehouses.Repositories;

public class WarehouseRepository : IWarehouseRepository
{
    private readonly AppDbContext _context;

    public WarehouseRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Warehouse>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Warehouses
            .AsNoTracking()
            .OrderByDescending(warehouse => warehouse.IsActive)
            .ThenBy(warehouse => warehouse.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Warehouse?> FindAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(warehouse => warehouse.Id == id, cancellationToken);
    }

    public Task<Warehouse?> FindTrackedAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Warehouses
            .FirstOrDefaultAsync(warehouse => warehouse.Id == id, cancellationToken);
    }

    public Task<bool> NameExistsAsync(
        string name,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.Warehouses.AnyAsync(
            warehouse => warehouse.Name == name && (exceptId == null || warehouse.Id != exceptId),
            cancellationToken);
    }

    public Task<bool> CodeExistsAsync(
        string code,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.Warehouses.AnyAsync(
            warehouse => warehouse.Code == code && (exceptId == null || warehouse.Id != exceptId),
            cancellationToken);
    }

    public async Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
    {
        await _context.Warehouses.AddAsync(warehouse, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public Task SaveAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
    {
        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
