using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DocuMind.Api.Models;

public class SourceCitation
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string MessageId { get; set; } = string.Empty;

    [ForeignKey(nameof(MessageId))]
    public ChatMessage? Message { get; set; }

    public string DocumentId { get; set; } = string.Empty;

    [ForeignKey(nameof(DocumentId))]
    public Document? Document { get; set; }

    public string ChunkId { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public int ChunkIndex { get; set; }

    public double Score { get; set; }
}

public class SourceCitationResponse
{
    public string Id { get; set; } = string.Empty;
    public string DocumentId { get; set; } = string.Empty;
    public string ChunkId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public double Score { get; set; }
}
