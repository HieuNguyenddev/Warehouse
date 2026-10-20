using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Roles.Entities;
using RoleManagement.Api.Modules.Users.Entities;

namespace RoleManagement.Api.Data;

public class AdminSeeder
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly SeedOptions _seed;

    public AdminSeeder(AppDbContext db, IPasswordHasher<User> passwordHasher, IOptions<SeedOptions> seed)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _seed = seed.Value;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles
            .FirstOrDefaultAsync(item => item.Name == AuthConstants.AdminRole, cancellationToken);
        if (role == null)
        {
            role = new Role
            {
                Name = AuthConstants.AdminRole,
                Description = "Toàn quyền quản trị hệ thống",
                CreatedAt = DateTime.UtcNow,
            };
            _db.Roles.Add(role);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var username = _seed.Username.Trim();
        var password = _seed.Password.Trim();
        var exists = await _db.Users.AnyAsync(user => user.Username == username, cancellationToken);
        if (exists)
        {
            return;
        }

        if (password.Length < 8)
        {
            throw new InvalidOperationException("Seed:Password phải có ít nhất 8 ký tự để tạo tài khoản mặc định.");
        }

        var user = new User
        {
            Username = username,
            FullName = string.IsNullOrWhiteSpace(_seed.FullName) ? "Quản trị viên" : _seed.FullName.Trim(),
            RoleId = role.Id,
            CreatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
