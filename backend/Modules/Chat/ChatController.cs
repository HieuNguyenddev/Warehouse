using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoleManagement.Api.Modules.Auth;
using RoleManagement.Api.Modules.Chat.DTOs;

namespace RoleManagement.Api.Modules.Chat;

[Authorize(Roles = AuthConstants.AdminRole)]
[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly OllamaClient _ollama;

    public ChatController(OllamaClient ollama)
    {
        _ollama = ollama;
    }

    [HttpGet("models")]
    public async Task<ActionResult<ChatCatalogResponse>> Models(CancellationToken cancellationToken)
    {
        if (!_ollama.IsConfigured)
        {
            return Ok(new ChatCatalogResponse(false, "", [], ""));
        }

        try
        {
            var catalog = await _ollama.ListCatalogAsync(cancellationToken);
            return Ok(new ChatCatalogResponse(true, catalog.DefaultModel, catalog.Models, catalog.Notice));
        }
        catch (OllamaException exception)
        {
            return StatusCode(exception.Status, new ChatMessage(exception.Message));
        }
    }

    [HttpPost("messages")]
    public async Task<ActionResult<ChatReplyResponse>> Send(ChatRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _ollama.CompleteAsync(request, cancellationToken));
        }
        catch (OllamaException exception)
        {
            return StatusCode(exception.Status, new ChatMessage(exception.Message));
        }
    }
}
