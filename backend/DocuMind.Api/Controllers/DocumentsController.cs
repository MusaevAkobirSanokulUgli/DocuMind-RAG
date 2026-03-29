using DocuMind.Api.Models;
using DocuMind.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DocuMind.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly DocumentProcessingService _docService;
    private readonly ILogger<DocumentsController> _logger;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".txt", ".docx", ".md"
    };

    public DocumentsController(DocumentProcessingService docService, ILogger<DocumentsController> logger)
    {
        _docService = docService;
        _logger = logger;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB
    public async Task<ActionResult<DocumentUploadResponse>> Upload(
        IFormFile file,
        [FromQuery] int chunkSize = 512,
        [FromQuery] int chunkOverlap = 50,
        CancellationToken ct = default)
    {
        if (file.Length == 0)
            return BadRequest(new { error = "File is empty" });

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { error = $"Unsupported file type: {ext}. Allowed: {string.Join(", ", AllowedExtensions)}" });

        _logger.LogInformation("Uploading document: {FileName} ({Size} bytes)", file.FileName, file.Length);

        var document = await _docService.UploadAndProcessAsync(
            file.OpenReadStream(),
            file.FileName,
            file.Length,
            chunkSize,
            chunkOverlap,
            ct);

        return Ok(new DocumentUploadResponse
        {
            Id = document.Id,
            FileName = document.FileName,
            Status = document.Status.ToString(),
            Message = document.StatusMessage ?? "",
            ChunkCount = document.ChunkCount,
        });
    }

    [HttpGet]
    public async Task<ActionResult<List<DocumentListItem>>> List(CancellationToken ct = default)
    {
        var documents = await _docService.ListDocumentsAsync(ct);
        return Ok(documents);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DocumentListItem>> Get(string id, CancellationToken ct = default)
    {
        var document = await _docService.GetDocumentAsync(id, ct);
        if (document is null)
            return NotFound(new { error = "Document not found" });

        return Ok(new DocumentListItem
        {
            Id = document.Id,
            FileName = document.FileName,
            FileType = document.FileType,
            FileSizeBytes = document.FileSizeBytes,
            ChunkCount = document.ChunkCount,
            Status = document.Status.ToString(),
            UploadedAt = document.UploadedAt,
            ProcessedAt = document.ProcessedAt,
        });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id, CancellationToken ct = default)
    {
        var deleted = await _docService.DeleteDocumentAsync(id, ct);
        if (!deleted)
            return NotFound(new { error = "Document not found" });

        return Ok(new { message = "Document deleted successfully" });
    }
}
