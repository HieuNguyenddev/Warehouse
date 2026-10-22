using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.WorkExperiences.DTOs;
using RoleManagement.Api.Modules.WorkExperiences.Services;

namespace RoleManagement.Api.Modules.WorkExperiences.Controllers;

[Authorize(Roles = AuthConstants.AdminRole)]
[ApiController]
[Route("api/work-experiences")]
public class WorkExperiencesController : ControllerBase
{
    private readonly IWorkExperienceService _experiences;

    public WorkExperiencesController(IWorkExperienceService experiences)
    {
        _experiences = experiences;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WorkExperienceResponse>>> GetWorkExperiences(
        [FromQuery] int? profileId,
        CancellationToken cancellationToken)
    {
        return Ok(await _experiences.ListAsync(profileId, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WorkExperienceResponse>> GetWorkExperience(int id, CancellationToken cancellationToken)
    {
        var result = await _experiences.GetAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Experience);
    }

    [HttpPost]
    public async Task<ActionResult<WorkExperienceResponse>> CreateWorkExperience(
        [FromBody] WorkExperienceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _experiences.CreateAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return CreatedAtAction(nameof(GetWorkExperience), new { id = result.Experience!.Id }, result.Experience);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WorkExperienceResponse>> UpdateWorkExperience(
        int id,
        [FromBody] WorkExperienceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _experiences.UpdateAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Experience);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteWorkExperience(int id, CancellationToken cancellationToken)
    {
        var result = await _experiences.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return NoContent();
    }

    private ActionResult ToError(WorkExperienceResult result)
    {
        var message = new ApiMessage(result.Message ?? "Không xử lý được yêu cầu.");
        return result.Error switch
        {
            WorkExperienceError.NotFound => NotFound(message),
            WorkExperienceError.Invalid => BadRequest(message),
            _ => StatusCode(StatusCodes.Status500InternalServerError, message),
        };
    }
}
