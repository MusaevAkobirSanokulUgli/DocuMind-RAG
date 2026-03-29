using DocuMind.Api.Models;
using DocuMind.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DocuMind.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ChatService _chatService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(ChatService chatService, ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    [HttpPost("sessions")]
    public async Task<ActionResult<SessionListItem>> CreateSession(
        [FromBody] CreateSessionRequest? request = null,
        CancellationToken ct = default)
    {
        var session = await _chatService.CreateSessionAsync(request?.Title, ct);
        return Ok(new SessionListItem
        {
            Id = session.Id,
            Title = session.Title,
            CreatedAt = session.CreatedAt,
            UpdatedAt = session.UpdatedAt,
            MessageCount = 0,
        });
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<List<SessionListItem>>> ListSessions(CancellationToken ct = default)
    {
        var sessions = await _chatService.ListSessionsAsync(ct);
        return Ok(sessions);
    }

    [HttpGet("sessions/{sessionId}")]
    public async Task<ActionResult<SessionListItem>> GetSession(string sessionId, CancellationToken ct = default)
    {
        var session = await _chatService.GetSessionAsync(sessionId, ct);
        if (session is null)
            return NotFound(new { error = "Session not found" });

        return Ok(new SessionListItem
        {
            Id = session.Id,
            Title = session.Title,
            CreatedAt = session.CreatedAt,
            UpdatedAt = session.UpdatedAt,
            MessageCount = session.Messages.Count,
        });
    }

    [HttpDelete("sessions/{sessionId}")]
    public async Task<ActionResult> DeleteSession(string sessionId, CancellationToken ct = default)
    {
        var deleted = await _chatService.DeleteSessionAsync(sessionId, ct);
        if (!deleted)
            return NotFound(new { error = "Session not found" });

        return Ok(new { message = "Session deleted" });
    }

    [HttpPost("sessions/{sessionId}/messages")]
    public async Task<ActionResult<ChatResponse>> SendMessage(
        string sessionId,
        [FromBody] SendMessageRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest(new { error = "Question is required" });

        try
        {
            var response = await _chatService.SendMessageAsync(sessionId, request, ct);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("sessions/{sessionId}/messages")]
    public async Task<ActionResult<List<ChatMessageResponse>>> GetMessages(
        string sessionId,
        CancellationToken ct = default)
    {
        var messages = await _chatService.GetMessagesAsync(sessionId, ct);
        return Ok(messages);
    }
}
