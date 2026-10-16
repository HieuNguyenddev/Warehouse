using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoleManagement.Api.Data;
using RoleManagement.Api.Models;

namespace RoleManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _context;

    public RolesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/roles
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Role>>> GetRoles()
    {
        var roles = await _context.Roles
            .AsNoTracking()
            .OrderBy(role => role.Id)
            .ToListAsync();

        return Ok(roles);
    }

    // GET: api/roles/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Role>> GetRole(int id)
    {
        var role = await _context.Roles.FindAsync(id);

        if (role == null)
        {
            return NotFound(new
            {
                message = $"Không tìm thấy vai trò có ID = {id}."
            });
        }

        return Ok(role);
    }

    // POST: api/roles
    [HttpPost]
    public async Task<ActionResult<Role>> CreateRole(
        [FromBody] Role role)
    {
        var name = role.Name.Trim();

        var exists = await _context.Roles
            .AnyAsync(r => r.Name == name);

        if (exists)
        {
            return Conflict(new
            {
                message = "Tên vai trò đã tồn tại."
            });
        }

        role.Name = name;
        role.Description = role.Description?.Trim();
        role.CreatedAt = DateTime.UtcNow;
        role.UpdatedAt = null;

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetRole),
            new { id = role.Id },
            role);
    }

    // PUT: api/roles/1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateRole(
        int id,
        [FromBody] Role request)
    {
        var role = await _context.Roles.FindAsync(id);

        if (role == null)
        {
            return NotFound(new
            {
                message = $"Không tìm thấy vai trò có ID = {id}."
            });
        }

        var name = request.Name.Trim();

        var exists = await _context.Roles.AnyAsync(
            r => r.Name == name && r.Id != id);

        if (exists)
        {
            return Conflict(new
            {
                message = "Tên vai trò đã được sử dụng."
            });
        }

        role.Name = name;
        role.Description = request.Description?.Trim();
        role.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(role);
    }

    // DELETE: api/roles/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRole(int id)
    {
        var role = await _context.Roles.FindAsync(id);

        if (role == null)
        {
            return NotFound(new
            {
                message = $"Không tìm thấy vai trò có ID = {id}."
            });
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}