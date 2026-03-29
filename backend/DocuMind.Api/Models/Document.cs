using System.ComponentModel.DataAnnotations;

namespace DocuMind.Api.Models;

public class Document
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(500)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string FileType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    [MaxLength(1000)]
    public string FilePath { get; set; } = string.Empty;

    public int ChunkCount { get; set; }

    public DocumentStatus Status { get; set; } = DocumentStatus.Pending;

    [MaxLength(2000)]
    public string? StatusMessage { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessedAt { get; set; }

    public ICollection<ChatMessage> ReferencedInMessages { get; set; } = new List<ChatMessage>();
}

public enum DocumentStatus
{
    Pending = 0,
    Processing = 1,
    Ready = 2,
    Failed = 3,
}

public class DocumentUploadResponse
{
    public string Id { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int ChunkCount { get; set; }
}

public class DocumentListItem
{
    public string Id { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int ChunkCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}
