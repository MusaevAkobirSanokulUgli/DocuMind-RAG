using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DocuMind.Api.Services;

public class RagEngineClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RagEngineClient> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public RagEngineClient(HttpClient httpClient, ILogger<RagEngineClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<RagProcessResponse> ProcessDocumentAsync(RagProcessRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation("Sending process request to RAG engine for document {DocumentId}", request.DocumentId);

        var response = await _httpClient.PostAsJsonAsync("/process", request, JsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<RagProcessResponse>(JsonOptions, ct);
        return result ?? throw new InvalidOperationException("Empty response from RAG engine");
    }

    public async Task<RagQueryResponse> QueryAsync(RagQueryRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation("Sending query to RAG engine: {Question}", request.Question[..Math.Min(80, request.Question.Length)]);

        var response = await _httpClient.PostAsJsonAsync("/query", request, JsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<RagQueryResponse>(JsonOptions, ct);
        return result ?? throw new InvalidOperationException("Empty response from RAG engine");
    }

    public async Task<List<RagChunkInfo>> GetChunksAsync(string documentId, CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync($"/chunks/{documentId}", ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<List<RagChunkInfo>>(JsonOptions, ct);
        return result ?? new List<RagChunkInfo>();
    }

    public async Task DeleteDocumentChunksAsync(string documentId, CancellationToken ct = default)
    {
        var response = await _httpClient.DeleteAsync($"/chunks/{documentId}", ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<List<RagCollectionInfo>> ListCollectionsAsync(CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync("/collections", ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<List<RagCollectionInfo>>(JsonOptions, ct);
        return result ?? new List<RagCollectionInfo>();
    }

    public async Task<RagHealthResponse> HealthCheckAsync(CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync("/health", ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<RagHealthResponse>(JsonOptions, ct);
        return result ?? new RagHealthResponse();
    }
}

// --- RAG Engine DTOs ---

public class RagProcessRequest
{
    public string DocumentId { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int ChunkSize { get; set; } = 512;
    public int ChunkOverlap { get; set; } = 50;
}

public class RagProcessResponse
{
    public string DocumentId { get; set; } = string.Empty;
    public int NumChunks { get; set; }
    public string CollectionName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class RagQueryRequest
{
    public string Question { get; set; } = string.Empty;
    public int TopK { get; set; } = 5;
    public List<string>? DocumentIds { get; set; }
    public double ScoreThreshold { get; set; } = 0.0;
}

public class RagQueryResponse
{
    public string Question { get; set; } = string.Empty;
    public string Context { get; set; } = string.Empty;
    public List<RagSourceDocument> Sources { get; set; } = new();
    public int NumResults { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
}

public class RagSourceDocument
{
    public string ChunkId { get; set; } = string.Empty;
    public string DocumentId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public double Score { get; set; }
    public int ChunkIndex { get; set; }
    public string FileName { get; set; } = string.Empty;
    public Dictionary<string, object>? Metadata { get; set; }
}

public class RagChunkInfo
{
    public string ChunkId { get; set; } = string.Empty;
    public string DocumentId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public int StartChar { get; set; }
    public int EndChar { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class RagCollectionInfo
{
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class RagHealthResponse
{
    public string Status { get; set; } = string.Empty;
    public string EmbeddingModel { get; set; } = string.Empty;
    public string ChromaDir { get; set; } = string.Empty;
    public int TotalChunks { get; set; }
}
