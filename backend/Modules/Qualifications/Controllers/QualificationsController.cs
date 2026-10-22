using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Files;
using RoleManagement.Api.Modules.Qualifications.DTOs;
using RoleManagement.Api.Modules.Qualifications.Services;

namespace RoleManagement.Api.Modules.Qualifications.Controllers;

[Authorize(Roles = AuthConstants.AdminRole)]
[ApiController]
[Route("api/[controller]")]
public class QualificationsController : ControllerBase
{
    private readonly IQualificationService _qualifications;
    private readonly FileStore _files;

    public QualificationsController(IQualificationService qualifications, FileStore files)
    {
        _qualifications = qualifications;
        _files = files;
    }

    [HttpPost("document")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<QualificationDocumentResponse>> UploadDocument(
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new ApiMessage("Chọn một ảnh hoặc tệp PDF."));
        }

        try
        {
            var saved = await _files.SaveDocumentAsync(file, cancellationToken);
            return Ok(new QualificationDocumentResponse(saved.Url, saved.FileName));
        }
        catch (InvalidOperationException exception)
        {
            var message = new ApiMessage(exception.Message);
            if (exception.Message.Contains("Garage", StringComparison.Ordinal))
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, message);
            }

            return BadRequest(message);
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<QualificationResponse>>> GetQualifications(
        [FromQuery] int? profileId,
        CancellationToken cancellationToken)
    {
        return Ok(await _qualifications.ListAsync(profileId, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<QualificationResponse>> GetQualification(int id, CancellationToken cancellationToken)
    {
        var result = await _qualifications.GetAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Qualification);
    }

    [HttpPost]
    public async Task<ActionResult<QualificationResponse>> CreateQualification(
        [FromBody] QualificationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _qualifications.CreateAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return CreatedAtAction(nameof(GetQualification), new { id = result.Qualification!.Id }, result.Qualification);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<QualificationResponse>> UpdateQualification(
        int id,
        [FromBody] QualificationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _qualifications.UpdateAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return Ok(result.Qualification);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteQualification(int id, CancellationToken cancellationToken)
    {
        var result = await _qualifications.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded)
        {
            return ToError(result);
        }

        return NoContent();
    }

    private ActionResult ToError(QualificationResult result)
    {
        var message = new ApiMessage(result.Message ?? "Không xử lý được yêu cầu.");
        return result.Error switch
        {
            QualificationError.NotFound => NotFound(message),
            QualificationError.Invalid => BadRequest(message),
            QualificationError.DuplicateNumber => Conflict(message),
            _ => StatusCode(StatusCodes.Status500InternalServerError, message),
        };
    }
}
