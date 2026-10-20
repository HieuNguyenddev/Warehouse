using Microsoft.EntityFrameworkCore;
using Npgsql;
using RoleManagement.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

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
builder.Services.AddSwaggerGen();

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
}

app.UseCors();

app.UseAuthorization();

app.MapControllers();

app.Run();