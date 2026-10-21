using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Modules.Positions.Entities;
using RoleManagement.Api.Modules.Roles.Entities;
using RoleManagement.Api.Modules.UserProfiles.Entities;
using RoleManagement.Api.Modules.Users.Entities;

namespace RoleManagement.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<Position> Positions => Set<Position>();

    public DbSet<User> Users => Set<User>();

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();

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

        modelBuilder.Entity<Position>(entity =>
        {
            entity.ToTable("Positions");

            entity.HasKey(position => position.Id);

            entity.Property(position => position.Name)
                .HasMaxLength(80)
                .IsRequired();

            entity.HasIndex(position => position.Name)
                .IsUnique();

            entity.Property(position => position.Code)
                .HasMaxLength(20);

            entity.HasIndex(position => position.Code)
                .IsUnique();

            entity.Property(position => position.Rank)
                .HasDefaultValue(0);

            entity.Property(position => position.Description)
                .HasMaxLength(250);

            entity.Property(position => position.CreatedAt)
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

            entity.HasOne(user => user.Position)
                .WithMany()
                .HasForeignKey(user => user.PositionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("UserProfiles");

            entity.HasKey(profile => profile.Id);

            entity.Property(profile => profile.FullName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(profile => profile.EmployeeCode)
                .HasMaxLength(16)
                .IsRequired();

            entity.HasIndex(profile => profile.EmployeeCode)
                .IsUnique();

            entity.Property(profile => profile.Gender)
                .HasDefaultValue((short)0);

            entity.Property(profile => profile.IdentityNumber)
                .HasMaxLength(20);

            entity.HasIndex(profile => profile.IdentityNumber)
                .IsUnique();

            entity.Property(profile => profile.IdentityIssuedPlace)
                .HasMaxLength(150);

            entity.Property(profile => profile.PhoneNumber)
                .HasMaxLength(20);

            entity.Property(profile => profile.Email)
                .HasMaxLength(100);

            entity.HasIndex(profile => profile.Email)
                .IsUnique();

            entity.Property(profile => profile.Address)
                .HasMaxLength(255);

            entity.Property(profile => profile.PermanentAddress)
                .HasMaxLength(255);

            entity.Property(profile => profile.ProvinceCode)
                .HasMaxLength(20);

            entity.Property(profile => profile.DistrictCode)
                .HasMaxLength(20);

            entity.Property(profile => profile.WardCode)
                .HasMaxLength(20);

            entity.Property(profile => profile.PlaceOfBirth)
                .HasMaxLength(150);

            entity.Property(profile => profile.Nationality)
                .HasMaxLength(50);

            entity.Property(profile => profile.Ethnicity)
                .HasMaxLength(50);

            entity.Property(profile => profile.Religion)
                .HasMaxLength(50);

            entity.Property(profile => profile.MaritalStatus)
                .HasDefaultValue((short)0);

            entity.Property(profile => profile.AvatarUrl)
                .HasMaxLength(255);

            entity.Property(profile => profile.EmergencyContactName)
                .HasMaxLength(150);

            entity.Property(profile => profile.EmergencyContactPhone)
                .HasMaxLength(20);

            entity.Property(profile => profile.EducationLevel)
                .HasMaxLength(50);

            entity.Property(profile => profile.Note)
                .HasMaxLength(500);

            entity.Property(profile => profile.CreatedAt)
                .IsRequired();

            entity.HasIndex(profile => profile.UserId)
                .IsUnique();

            entity.HasOne(profile => profile.User)
                .WithMany()
                .HasForeignKey(profile => profile.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}