using DocuMind.Api.Data;
using DocuMind.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DocuMind.Api.Services;

public class ChatService
{
    private readonly AppDbContext _db;
    private readonly RagEngineClient _ragClient;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        AppDbContext db,
        RagEngineClient ragClient,
        ILogger<ChatService> logger)
    {
        _db = db;
        _ragClient = ragClient;
        _logger = logger;
    }

    public async Task<ChatSession> CreateSessionAsync(string? title = null, CancellationToken ct = default)
    {
        var session = new ChatSession
        {
            Title = title ?? "New Chat",
        };

        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Created chat session {Id}", session.Id);
        return session;
    }

    public async Task<List<SessionListItem>> ListSessionsAsync(CancellationToken ct = default)
    {
        return await _db.ChatSessions
            .OrderByDescending(s => s.UpdatedAt)
            .Select(s => new SessionListItem
            {
                Id = s.Id,
                Title = s.Title,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                MessageCount = s.Messages.Count,
            })
            .ToListAsync(ct);
    }

    public async Task<ChatSession?> GetSessionAsync(string sessionId, CancellationToken ct = default)
    {
        return await _db.ChatSessions
            .Include(s => s.Messages.OrderBy(m => m.Timestamp))
                .ThenInclude(m => m.Citations)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);
    }

    public async Task<bool> DeleteSessionAsync(string sessionId, CancellationToken ct = default)
    {
        var session = await _db.ChatSessions.FindAsync(new object[] { sessionId }, ct);
        if (session is null) return false;

        _db.ChatSessions.Remove(session);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ChatResponse> SendMessageAsync(
        string sessionId,
        SendMessageRequest request,
        CancellationToken ct = default)
    {
        var session = await _db.ChatSessions.FindAsync(new object[] { sessionId }, ct);
        if (session is null)
            throw new InvalidOperationException($"Session {sessionId} not found");

        var userMessage = new ChatMessage
        {
            SessionId = sessionId,
            Role = "user",
            Content = request.Question,
        };
        _db.ChatMessages.Add(userMessage);

        _logger.LogInformation("Processing question in session {SessionId}: {Question}",
            sessionId, request.Question[..Math.Min(80, request.Question.Length)]);

        RagQueryResponse ragResult;
        try
        {
            ragResult = await _ragClient.QueryAsync(new RagQueryRequest
            {
                Question = request.Question,
                TopK = request.TopK,
                DocumentIds = request.DocumentIds,
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RAG query failed for session {SessionId}", sessionId);
            ragResult = new RagQueryResponse
            {
                Question = request.Question,
                Context = "Unable to retrieve context from knowledge base.",
                Sources = new List<RagSourceDocument>(),
                NumResults = 0,
                Prompt = "",
            };
        }

        var answerContent = BuildAnswer(ragResult);

        var assistantMessage = new ChatMessage
        {
            SessionId = sessionId,
            Role = "assistant",
            Content = answerContent,
        };
        _db.ChatMessages.Add(assistantMessage);

        var citations = new List<SourceCitation>();
        foreach (var source in ragResult.Sources)
        {
            var citation = new SourceCitation
            {
                MessageId = assistantMessage.Id,
                DocumentId = source.DocumentId,
                ChunkId = source.ChunkId,
                Content = source.Content,
                FileName = source.FileName,
                ChunkIndex = source.ChunkIndex,
                Score = source.Score,
            };
            citations.Add(citation);
            _db.SourceCitations.Add(citation);
        }

        if (session.Title == "New Chat" && request.Question.Length > 0)
        {
            session.Title = request.Question.Length > 60
                ? request.Question[..60] + "..."
                : request.Question;
        }
        session.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return new ChatResponse
        {
            SessionId = sessionId,
            UserMessage = MapMessage(userMessage),
            AssistantMessage = MapMessage(assistantMessage, citations),
        };
    }

    public async Task<List<ChatMessageResponse>> GetMessagesAsync(string sessionId, CancellationToken ct = default)
    {
        var messages = await _db.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .Include(m => m.Citations)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(ct);

        return messages.Select(m => MapMessage(m, m.Citations.ToList())).ToList();
    }

    private static string BuildAnswer(RagQueryResponse ragResult)
    {
        if (ragResult.NumResults == 0 || string.IsNullOrWhiteSpace(ragResult.Context) ||
            ragResult.Context == "No relevant context found.")
        {
            return "I couldn't find any relevant information in the uploaded documents to answer your question. " +
                   "Please try rephrasing your question or make sure relevant documents have been uploaded and processed.";
        }

        // Use LLM-generated answer from DeepSeek if available
        if (!string.IsNullOrWhiteSpace(ragResult.Answer))
        {
            return ragResult.Answer;
        }

        // Fallback: assemble answer from raw context chunks
        var answer = "Based on the documents in the knowledge base:\n\n";

        var contextParts = ragResult.Context.Split("\n\n---\n\n");
        var keyPoints = new List<string>();

        foreach (var part in contextParts)
        {
            var lines = part.Split('\n', 2);
            if (lines.Length >= 2)
            {
                var content = lines[1].Trim();
                if (content.Length > 300)
                {
                    content = content[..300] + "...";
                }
                keyPoints.Add(content);
            }
        }

        if (keyPoints.Count > 0)
        {
            answer += string.Join("\n\n", keyPoints.Select((p, i) => $"{p} [Source {i + 1}]"));
        }
        else
        {
            answer += ragResult.Context;
        }

        return answer;
    }

    private static ChatMessageResponse MapMessage(ChatMessage message, List<SourceCitation>? citations = null)
    {
        return new ChatMessageResponse
        {
            Id = message.Id,
            Role = message.Role,
            Content = message.Content,
            Timestamp = message.Timestamp,
            Citations = (citations ?? message.Citations.ToList()).Select(c => new SourceCitationResponse
            {
                Id = c.Id,
                DocumentId = c.DocumentId,
                ChunkId = c.ChunkId,
                Content = c.Content,
                FileName = c.FileName,
                ChunkIndex = c.ChunkIndex,
                Score = c.Score,
            }).ToList(),
        };
    }
}
