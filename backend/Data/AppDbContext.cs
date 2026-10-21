using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Modules.Roles.Entities;
using RoleManagement.Api.Modules.Users.Entities;

namespace RoleManagement.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("Roles");

            entity.HasKey(role => role.Id);

            entity.Property(role => role.Name)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(role => role.Name)
                .IsUnique();

            entity.Property(role => role.Description)
                .HasMaxLength(250);

            entity.Property(role => role.CreatedAt)
                .IsRequired();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");

            entity.HasKey(user => user.Id);

            entity.Property(user => user.Username)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(user => user.Username)
                .IsUnique();

            entity.Property(user => user.FullName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user => user.PasswordHash)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(user => user.IsLocked)
                .HasDefaultValue(false);

            entity.Property(user => user.FailedLoginCount)
                .HasDefaultValue(0);

            entity.Property(user => user.LastLoginIp)
                .HasMaxLength(45);

            entity.Property(user => user.CreatedAt)
                .IsRequired();

            entity.HasOne(user => user.Role)
                .WithMany()
                .HasForeignKey(user => user.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}