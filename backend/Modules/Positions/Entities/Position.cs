namespace RoleManagement.Api.Modules.Positions.Entities;

public class Position
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Code { get; set; }

    public int Rank { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
