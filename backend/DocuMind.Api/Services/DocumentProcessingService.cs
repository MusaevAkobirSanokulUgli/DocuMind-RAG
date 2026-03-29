using DocuMind.Api.Data;
using DocuMind.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DocuMind.Api.Services;

public class DocumentProcessingService
{
    private readonly AppDbContext _db;
    private readonly RagEngineClient _ragClient;
    private readonly ILogger<DocumentProcessingService> _logger;
    private readonly IConfiguration _config;

    public DocumentProcessingService(
        AppDbContext db,
        RagEngineClient ragClient,
        ILogger<DocumentProcessingService> logger,
        IConfiguration config)
    {
        _db = db;
        _ragClient = ragClient;
        _logger = logger;
        _config = config;
    }

    public async Task<Document> UploadAndProcessAsync(
        Stream fileStream,
        string fileName,
        long fileSize,
        int chunkSize = 512,
        int chunkOverlap = 50,
        CancellationToken ct = default)
    {
        var uploadDir = _config["Storage:UploadDir"] ?? "./uploads";
        Directory.CreateDirectory(uploadDir);

        var document = new Document
        {
            FileName = fileName,
            FileType = Path.GetExtension(fileName).ToLowerInvariant(),
            FileSizeBytes = fileSize,
            Status = DocumentStatus.Processing,
        };

        var filePath = Path.Combine(uploadDir, $"{document.Id}{document.FileType}");
        document.FilePath = filePath;

        await using (var fs = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(fs, ct);
        }

        _db.Documents.Add(document);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Document {Id} saved to {Path}, sending to RAG engine", document.Id, filePath);

        try
        {
            var processResult = await _ragClient.ProcessDocumentAsync(new RagProcessRequest
            {
                DocumentId = document.Id,
                FilePath = filePath,
                FileName = fileName,
                ChunkSize = chunkSize,
                ChunkOverlap = chunkOverlap,
            }, ct);

            document.ChunkCount = processResult.NumChunks;
            document.Status = processResult.Status == "success" ? DocumentStatus.Ready : DocumentStatus.Failed;
            document.StatusMessage = processResult.Message;
            document.ProcessedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process document {Id} in RAG engine", document.Id);
            document.Status = DocumentStatus.Failed;
            document.StatusMessage = $"RAG processing failed: {ex.Message}";
        }

        await _db.SaveChangesAsync(ct);
        return document;
    }

    public async Task<List<DocumentListItem>> ListDocumentsAsync(CancellationToken ct = default)
    {
        return await _db.Documents
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new DocumentListItem
            {
                Id = d.Id,
                FileName = d.FileName,
                FileType = d.FileType,
                FileSizeBytes = d.FileSizeBytes,
                ChunkCount = d.ChunkCount,
                Status = d.Status.ToString(),
                UploadedAt = d.UploadedAt,
                ProcessedAt = d.ProcessedAt,
            })
            .ToListAsync(ct);
    }

    public async Task<Document?> GetDocumentAsync(string id, CancellationToken ct = default)
    {
        return await _db.Documents.FindAsync(new object[] { id }, ct);
    }

    public async Task<bool> DeleteDocumentAsync(string id, CancellationToken ct = default)
    {
        var document = await _db.Documents.FindAsync(new object[] { id }, ct);
        if (document is null) return false;

        try
        {
            await _ragClient.DeleteDocumentChunksAsync(id, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete chunks from RAG engine for document {Id}", id);
        }

        if (File.Exists(document.FilePath))
        {
            File.Delete(document.FilePath);
        }

        _db.Documents.Remove(document);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Document {Id} deleted", id);
        return true;
    }
}
