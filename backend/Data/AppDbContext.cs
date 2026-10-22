using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Modules.Positions.Entities;
using RoleManagement.Api.Modules.Qualifications.Entities;
using RoleManagement.Api.Modules.Roles.Entities;
using RoleManagement.Api.Modules.WorkExperiences.Entities;
using RoleManagement.Api.Modules.UserProfiles.Entities;
using RoleManagement.Api.Modules.Users.Entities;
using RoleManagement.Api.Modules.Warehouses.Entities;

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

    public DbSet<Qualification> Qualifications => Set<Qualification>();

    public DbSet<WorkExperience> WorkExperiences => Set<WorkExperience>();

    public DbSet<Warehouse> Warehouses => Set<Warehouse>();

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

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.ToTable("Warehouses");

            entity.HasKey(warehouse => warehouse.Id);

            entity.Property(warehouse => warehouse.Name)
                .HasMaxLength(80)
                .IsRequired();

            entity.HasIndex(warehouse => warehouse.Name)
                .IsUnique();

            entity.Property(warehouse => warehouse.Code)
                .HasMaxLength(20);

            entity.HasIndex(warehouse => warehouse.Code)
                .IsUnique();

            entity.Property(warehouse => warehouse.Phone)
                .HasMaxLength(20);

            entity.Property(warehouse => warehouse.Address)
                .HasMaxLength(200);

            entity.Property(warehouse => warehouse.ProvinceCode)
                .HasMaxLength(20);

            entity.Property(warehouse => warehouse.WardCode)
                .HasMaxLength(20);

            entity.Property(warehouse => warehouse.Note)
                .HasMaxLength(250);

            entity.Property(warehouse => warehouse.IsActive)
                .HasDefaultValue(true);

            entity.Property(warehouse => warehouse.CreatedAt)
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

            entity.Property(profile => profile.PermanentProvinceCode)
                .HasMaxLength(20);

            entity.Property(profile => profile.PermanentWardCode)
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

        modelBuilder.Entity<Qualification>(entity =>
        {
            entity.ToTable("Qualifications");

            entity.HasKey(item => item.Id);

            entity.Property(item => item.Kind)
                .IsRequired();

            entity.Property(item => item.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(item => item.Major)
                .HasMaxLength(120);

            entity.Property(item => item.Grade)
                .HasMaxLength(40);

            entity.Property(item => item.Issuer)
                .HasMaxLength(150);

            entity.Property(item => item.CredentialNumber)
                .HasMaxLength(50);

            entity.HasIndex(item => item.CredentialNumber)
                .IsUnique();

            entity.Property(item => item.Note)
                .HasMaxLength(250);

            entity.Property(item => item.DocumentUrl)
                .HasMaxLength(255);

            entity.Property(item => item.DocumentName)
                .HasMaxLength(255);

            entity.Property(item => item.CreatedAt)
                .IsRequired();

            entity.HasIndex(item => item.UserProfileId);

            entity.HasOne(item => item.Profile)
                .WithMany()
                .HasForeignKey(item => item.UserProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkExperience>(entity =>
        {
            entity.ToTable("WorkExperiences");

            entity.HasKey(item => item.Id);

            entity.Property(item => item.Company)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(item => item.JobTitle)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(item => item.StartedOn)
                .IsRequired();

            entity.Property(item => item.IsCurrent)
                .HasDefaultValue(false);

            entity.Property(item => item.Description)
                .HasMaxLength(500);

            entity.Property(item => item.CreatedAt)
                .IsRequired();

            entity.HasIndex(item => item.UserProfileId);

            entity.HasOne(item => item.Profile)
                .WithMany()
                .HasForeignKey(item => item.UserProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}