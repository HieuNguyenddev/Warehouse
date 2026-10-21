using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Data;
using RoleManagement.Api.Modules.Users.Entities;

namespace RoleManagement.Api.Modules.Users.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<User>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Include(user => user.Role)
            .OrderBy(user => user.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<User?> FindAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Users
            .AsNoTracking()
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
    }

    public Task<User?> FindTrackedAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Users
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
    }

    public Task<User?> FindByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return _context.Users
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.Username == username, cancellationToken);
    }

    public Task<bool> UsernameExistsAsync(
        string username,
        int? exceptId = null,
        CancellationToken cancellationToken = default)
    {
        return _context.Users.AnyAsync(
            user => user.Username == username && (exceptId == null || user.Id != exceptId),
            cancellationToken);
    }

    public Task<bool> AnyInRoleAsync(int roleId, CancellationToken cancellationToken = default)
    {
        return _context.Users.AnyAsync(
            user => user.RoleId == roleId && user.DeletedAt == null,
            cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await _context.Users.AddAsync(user, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public Task SaveAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(User user, CancellationToken cancellationToken = default)
    {
        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
