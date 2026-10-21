using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Storage;

namespace RoleManagement.Api.Modules.Files;

[Authorize(Roles = AuthConstants.AdminRole)]
[ApiController]
[Route("api/files")]
public class FilesController : ControllerBase
{
    private readonly FileStore _files;

    public FilesController(FileStore files)
    {
        _files = files;
    }

    [HttpGet]
    public async Task<ActionResult<FileListResponse>> List(CancellationToken cancellationToken)
    {
        try
        {
            var files = await _files.ListAsync(cancellationToken);
            return Ok(new FileListResponse(_files.ProviderName, files.OrderByDescending(file => file.LastModified)));
        }
        catch (InvalidOperationException exception)
        {
            return StorageError(exception);
        }
    }

    [HttpPost]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<WarehouseFile>> Upload(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new FileMessage("Chọn một tệp từ máy tính."));
        }

        try
        {
            return Ok(await _files.SaveAsync(file, cancellationToken));
        }
        catch (InvalidOperationException exception)
        {
            return StorageError(exception);
        }
    }

    [HttpGet("{name}")]
    public async Task<IActionResult> Download(string name, CancellationToken cancellationToken)
    {
        try
        {
            var opened = await _files.OpenAsync(name, cancellationToken);
            if (opened == null)
            {
                return NotFound(new FileMessage("Không tìm thấy tệp."));
            }

            return File(opened.Stream, opened.ContentType, opened.FileName);
        }
        catch (InvalidOperationException exception)
        {
            return StorageError(exception);
        }
    }

    [HttpDelete("{name}")]
    public async Task<IActionResult> Delete(string name, [FromQuery] string? folder, CancellationToken cancellationToken)
    {
        var key = (folder == "avatars" ? "avatars/" : "files/") + name;
        if (!GarageStorage.IsSafeKey(key))
        {
            return NotFound(new FileMessage("Không tìm thấy tệp."));
        }

        try
        {
            await _files.DeleteAsync(name, folder, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return StorageError(exception);
        }
    }

    private ActionResult StorageError(InvalidOperationException exception)
    {
        var message = new FileMessage(exception.Message);
        if (exception.Message.Contains("Garage", StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, message);
        }

        return BadRequest(message);
    }
}

public record FileListResponse(string Provider, IEnumerable<WarehouseFile> Files);

public record FileMessage(string Message);
