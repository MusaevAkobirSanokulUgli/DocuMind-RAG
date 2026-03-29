using DocuMind.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DocuMind.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class KnowledgeBaseController : ControllerBase
{
    private readonly RagEngineClient _ragClient;
    private readonly DocumentProcessingService _docService;
    private readonly ILogger<KnowledgeBaseController> _logger;

    public KnowledgeBaseController(
        RagEngineClient ragClient,
        DocumentProcessingService docService,
        ILogger<KnowledgeBaseController> logger)
    {
        _ragClient = ragClient;
        _docService = docService;
        _logger = logger;
    }

    [HttpGet("collections")]
    public async Task<ActionResult> GetCollections(CancellationToken ct = default)
    {
        try
        {
            var collections = await _ragClient.ListCollectionsAsync(ct);
            return Ok(collections);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list collections");
            return StatusCode(500, new { error = "Failed to connect to RAG engine" });
        }
    }

    [HttpGet("chunks/{documentId}")]
    public async Task<ActionResult> GetChunks(string documentId, CancellationToken ct = default)
    {
        try
        {
            var chunks = await _ragClient.GetChunksAsync(documentId, ct);
            return Ok(chunks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get chunks for document {DocumentId}", documentId);
            return StatusCode(500, new { error = "Failed to retrieve chunks" });
        }
    }

    [HttpGet("stats")]
    public async Task<ActionResult> GetStats(CancellationToken ct = default)
    {
        try
        {
            var documents = await _docService.ListDocumentsAsync(ct);
            var ragHealth = await _ragClient.HealthCheckAsync(ct);

            return Ok(new
            {
                totalDocuments = documents.Count,
                readyDocuments = documents.Count(d => d.Status == "Ready"),
                processingDocuments = documents.Count(d => d.Status == "Processing"),
                failedDocuments = documents.Count(d => d.Status == "Failed"),
                totalChunks = ragHealth.TotalChunks,
                embeddingModel = ragHealth.EmbeddingModel,
                ragEngineStatus = ragHealth.Status,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get knowledge base stats");
            return StatusCode(500, new { error = "Failed to retrieve stats" });
        }
    }

    [HttpPost("search")]
    public async Task<ActionResult> Search(
        [FromBody] SearchRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest(new { error = "Query is required" });

        try
        {
            var results = await _ragClient.QueryAsync(new RagQueryRequest
            {
                Question = request.Query,
                TopK = request.TopK,
                DocumentIds = request.DocumentIds,
            }, ct);

            return Ok(new
            {
                query = request.Query,
                results = results.Sources.Select(s => new
                {
                    s.ChunkId,
                    s.DocumentId,
                    s.Content,
                    s.Score,
                    s.ChunkIndex,
                    s.FileName,
                }),
                totalResults = results.NumResults,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Search failed");
            return StatusCode(500, new { error = "Search failed" });
        }
    }
}

public class SearchRequest
{
    public string Query { get; set; } = string.Empty;
    public int TopK { get; set; } = 10;
    public List<string>? DocumentIds { get; set; }
}
