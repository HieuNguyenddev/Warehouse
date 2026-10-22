using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Npgsql;
using RoleManagement.Api.Data;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Chat;
using RoleManagement.Api.Modules.Auth.Services;
using RoleManagement.Api.Modules.Files;
using RoleManagement.Api.Modules.Locations.Services;
using RoleManagement.Api.Modules.Storage;
using RoleManagement.Api.Modules.Positions.Repositories;
using RoleManagement.Api.Modules.Positions.Services;
using RoleManagement.Api.Modules.Qualifications.Repositories;
using RoleManagement.Api.Modules.Qualifications.Services;
using RoleManagement.Api.Modules.WorkExperiences.Repositories;
using RoleManagement.Api.Modules.WorkExperiences.Services;
using RoleManagement.Api.Modules.Roles.Repositories;
using RoleManagement.Api.Modules.Roles.Services;
using RoleManagement.Api.Modules.UserProfiles.Repositories;
using RoleManagement.Api.Modules.UserProfiles.Services;
using RoleManagement.Api.Modules.Users.Entities;
using RoleManagement.Api.Modules.Users.Repositories;
using RoleManagement.Api.Modules.Users.Services;

LoadDotEnv(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrWhiteSpace(connectionString))
{
    var database = new NpgsqlConnectionStringBuilder(connectionString)
    {
        MaxPoolSize = 8,
        MinPoolSize = 0,
    };
    connectionString = database.ConnectionString;
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection(SeedOptions.SectionName));

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < 32
    || string.IsNullOrWhiteSpace(jwt.Issuer)
    || string.IsNullOrWhiteSpace(jwt.Audience))
{
    throw new InvalidOperationException("Jwt:Issuer, Jwt:Audience và Jwt:Key (ít nhất 32 ký tự) là bắt buộc.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
        };
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    message = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
                }));
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    message = "Bạn không có quyền thực hiện thao tác này.",
                }));
            },
        };
    });

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("provinces", client =>
{
    client.BaseAddress = new Uri("https://provinces.open-api.vn/");
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient("turnstile", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.Configure<OllamaOptions>(builder.Configuration.GetSection(OllamaOptions.SectionName));
builder.Services.AddHttpClient("ollama", client =>
{
    client.Timeout = TimeSpan.FromSeconds(180);
});
builder.Services.AddSingleton<OllamaClient>();
builder.Services.AddSingleton<TurnstileVerifier>();
builder.Services.AddSingleton<LocationCatalog>();
builder.Services.AddSingleton<GarageStorage>();
builder.Services.AddSingleton<FileStore>();
builder.Services.AddAuthorization();

builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IPositionRepository, PositionRepository>();
builder.Services.AddScoped<IPositionService, PositionService>();
builder.Services.AddScoped<IQualificationRepository, QualificationRepository>();
builder.Services.AddScoped<IQualificationService, QualificationService>();
builder.Services.AddScoped<IWorkExperienceRepository, WorkExperienceRepository>();
builder.Services.AddScoped<IWorkExperienceService, WorkExperienceService>();
builder.Services.AddSingleton<AvatarStore>();
builder.Services.AddScoped<IUserProfileRepository, UserProfileRepository>();
builder.Services.AddScoped<IUserProfileService, UserProfileService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<AdminSeeder>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://admin.minhhieudev.id.vn",
                "https://admin.minhhieudev.id.vn",
                "http://minhhieudev.id.vn",
                "http://www.minhhieudev.id.vn",
                "http://api.minhhieudev.id.vn",
                "https://api.minhhieudev.id.vn",
                "http://103.183.120.48")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Dán JWT. Không cần gõ chữ Bearer.",
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = [],
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            db.Database.Migrate();
            break;
        }
        catch (NpgsqlException ex) when (attempt < 10 && ex is not PostgresException)
        {
            Thread.Sleep(TimeSpan.FromSeconds(2));
        }
    }

    var seeder = scope.ServiceProvider.GetRequiredService<AdminSeeder>();
    await seeder.SeedAsync();
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static void LoadDotEnv(string path)
{
    if (!File.Exists(path))
    {
        return;
    }

    var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    foreach (var rawLine in File.ReadLines(path))
    {
        var line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith('#'))
        {
            continue;
        }

        var separator = line.IndexOf('=');
        if (separator <= 0)
        {
            continue;
        }

        var name = line[..separator].Trim();
        var value = line[(separator + 1)..].Trim().Trim('"');
        if (string.IsNullOrEmpty(name))
        {
            continue;
        }

        values[name] = value;
    }

    SetFromEnvFile(values, "JWT_KEY", "Jwt__Key");
    SetFromEnvFile(values, "SEED_PASSWORD", "Seed__Password");
    SetFromEnvFile(values, "SEED_USERNAME", "Seed__Username");
    SetFromEnvFile(values, "GARAGE_ENDPOINT", "Garage__Endpoint");
    SetFromEnvFile(values, "GARAGE_ACCESS_KEY", "Garage__AccessKey");
    SetFromEnvFile(values, "GARAGE_SECRET_KEY", "Garage__SecretKey");
    SetFromEnvFile(values, "GARAGE_BUCKET", "Garage__Bucket");
    SetFromEnvFile(values, "GARAGE_REGION", "Garage__Region");
    SetFromEnvFile(values, "TURNSTILE_SECRET_KEY", "Turnstile__SecretKey");
    SetFromEnvFile(values, "OLLAMA_URL", "Ollama__BaseUrl");
    SetFromEnvFile(values, "OLLAMA_MODEL", "Ollama__Model");

    if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")))
    {
        return;
    }

    var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
    var connectionKey = string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase)
        ? "CONNECTION_STRING_DEVELOPMENT"
        : "CONNECTION_STRING";
    if (!values.TryGetValue(connectionKey, out var connection) || string.IsNullOrWhiteSpace(connection))
    {
        values.TryGetValue("CONNECTION_STRING", out connection);
    }

    if (!string.IsNullOrWhiteSpace(connection))
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", connection);
    }
}

static void SetFromEnvFile(Dictionary<string, string> values, string name, string variable)
{
    if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable(variable)))
    {
        return;
    }

    if (values.TryGetValue(name, out var value) && !string.IsNullOrWhiteSpace(value))
    {
        Environment.SetEnvironmentVariable(variable, value);
    }
}
