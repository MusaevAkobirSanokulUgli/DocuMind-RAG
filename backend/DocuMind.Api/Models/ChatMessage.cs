using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DocuMind.Api.Models;

public class ChatMessage
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string SessionId { get; set; } = string.Empty;

    [ForeignKey(nameof(SessionId))]
    public ChatSession? Session { get; set; }

    [Required]
    public string Role { get; set; } = "user"; // "user" or "assistant"

    [Required]
    public string Content { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public ICollection<SourceCitation> Citations { get; set; } = new List<SourceCitation>();
}

public class SendMessageRequest
{
    [Required]
    public string Question { get; set; } = string.Empty;

    public int TopK { get; set; } = 5;

    public List<string>? DocumentIds { get; set; }
}

public class ChatMessageResponse
{
    public string Id { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public List<SourceCitationResponse> Citations { get; set; } = new();
}

public class ChatResponse
{
    public string SessionId { get; set; } = string.Empty;
    public ChatMessageResponse UserMessage { get; set; } = new();
    public ChatMessageResponse AssistantMessage { get; set; } = new();
}
