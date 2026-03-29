using DocuMind.Api.Data;
using DocuMind.Api.Models;
using DocuMind.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DocuMind.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RagEngineClient _ragClient;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(
        AppDbContext db,
        RagEngineClient ragClient,
        ILogger<AnalyticsController> logger)
    {
        _db = db;
        _ragClient = ragClient;
        _logger = logger;
    }

    [HttpGet("overview")]
    public async Task<ActionResult> GetOverview(CancellationToken ct = default)
    {
        var totalDocuments = await _db.Documents.CountAsync(ct);
        var readyDocuments = await _db.Documents.CountAsync(d => d.Status == DocumentStatus.Ready, ct);
        var totalSessions = await _db.ChatSessions.CountAsync(ct);
        var totalMessages = await _db.ChatMessages.CountAsync(m => m.Role == "user", ct);
        var totalCitations = await _db.SourceCitations.CountAsync(ct);

        int totalChunks = 0;
        try
        {
            var health = await _ragClient.HealthCheckAsync(ct);
            totalChunks = health.TotalChunks;
        }
        catch { /* RAG engine may be down */ }

        return Ok(new
        {
            totalDocuments,
            readyDocuments,
            totalSessions,
            totalQueries = totalMessages,
            totalCitations,
            totalChunks,
        });
    }

    [HttpGet("query-volume")]
    public async Task<ActionResult> GetQueryVolume(
        [FromQuery] int days = 30,
        CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.AddDays(-days);

        var dailyCounts = await _db.ChatMessages
            .Where(m => m.Role == "user" && m.Timestamp >= since)
            .GroupBy(m => m.Timestamp.Date)
            .Select(g => new
            {
                Date = g.Key,
                Count = g.Count(),
            })
            .OrderBy(x => x.Date)
            .ToListAsync(ct);

        return Ok(dailyCounts.Select(d => new
        {
            date = d.Date.ToString("yyyy-MM-dd"),
            queries = d.Count,
        }));
    }

    [HttpGet("popular-documents")]
    public async Task<ActionResult> GetPopularDocuments(
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        var popular = await _db.SourceCitations
            .GroupBy(c => new { c.DocumentId, c.FileName })
            .Select(g => new
            {
                g.Key.DocumentId,
                g.Key.FileName,
                CitationCount = g.Count(),
                AvgScore = g.Average(c => c.Score),
            })
            .OrderByDescending(x => x.CitationCount)
            .Take(limit)
            .ToListAsync(ct);

        return Ok(popular);
    }

    [HttpGet("response-quality")]
    public async Task<ActionResult> GetResponseQuality(CancellationToken ct = default)
    {
        var totalQueries = await _db.ChatMessages.CountAsync(m => m.Role == "user", ct);
        var answeredWithSources = await _db.ChatMessages
            .Where(m => m.Role == "assistant")
            .CountAsync(m => m.Citations.Any(), ct);

        var avgCitationsPerAnswer = totalQueries > 0
            ? await _db.SourceCitations.CountAsync(ct) / (double)totalQueries
            : 0;

        var avgScore = await _db.SourceCitations
            .Select(c => (double?)c.Score)
            .AverageAsync(ct) ?? 0;

        return Ok(new
        {
            totalQueries,
            answeredWithSources,
            answerRate = totalQueries > 0 ? (double)answeredWithSources / totalQueries : 0,
            avgCitationsPerAnswer = Math.Round(avgCitationsPerAnswer, 2),
            avgRelevanceScore = Math.Round(avgScore, 4),
        });
    }

    [HttpGet("document-types")]
    public async Task<ActionResult> GetDocumentTypes(CancellationToken ct = default)
    {
        var types = await _db.Documents
            .GroupBy(d => d.FileType)
            .Select(g => new
            {
                FileType = g.Key,
                Count = g.Count(),
                TotalSize = g.Sum(d => d.FileSizeBytes),
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync(ct);

        return Ok(types);
    }

    [HttpGet("recent-activity")]
    public async Task<ActionResult> GetRecentActivity(
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        var recentUploads = await _db.Documents
            .OrderByDescending(d => d.UploadedAt)
            .Take(limit)
            .Select(d => new
            {
                type = "upload",
                timestamp = d.UploadedAt,
                description = $"Uploaded {d.FileName}",
                status = d.Status.ToString(),
            })
            .ToListAsync(ct);

        var recentQueries = await _db.ChatMessages
            .Where(m => m.Role == "user")
            .OrderByDescending(m => m.Timestamp)
            .Take(limit)
            .Select(m => new
            {
                type = "query",
                timestamp = m.Timestamp,
                description = m.Content.Length > 100 ? m.Content.Substring(0, 100) + "..." : m.Content,
                status = "completed",
            })
            .ToListAsync(ct);

        var combined = recentUploads
            .Cast<object>()
            .Concat(recentQueries.Cast<object>())
            .ToList();

        return Ok(combined);
    }
}
