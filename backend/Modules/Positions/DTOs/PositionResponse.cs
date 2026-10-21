using RoleManagement.Api.Modules.Positions.Entities;

namespace RoleManagement.Api.Modules.Positions.DTOs;

public class PositionResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Code { get; set; }

    public int Rank { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public static PositionResponse From(Position position)
    {
        return new PositionResponse
        {
            Id = position.Id,
            Name = position.Name,
            Code = position.Code,
            Rank = position.Rank,
            Description = position.Description,
            CreatedAt = position.CreatedAt,
            UpdatedAt = position.UpdatedAt,
        };
    }
}
