using System.ComponentModel.DataAnnotations;

namespace DocuMind.Api.Models;

public class ChatSession
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [MaxLength(200)]
    public string Title { get; set; } = "New Chat";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}

public class CreateSessionRequest
{
    public string? Title { get; set; }
}

public class SessionListItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int MessageCount { get; set; }
}
