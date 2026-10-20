namespace RoleManagement.Api.Modules.Auth;

public class SeedOptions
{
    public const string SectionName = "Seed";

    public string Username { get; set; } = "admin";

    public string FullName { get; set; } = "Quản trị viên";

    public string Password { get; set; } = string.Empty;
}
