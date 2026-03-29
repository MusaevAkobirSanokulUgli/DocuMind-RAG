import { useState, useEffect } from "react";
import {
  Database,
  Search,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";
import DocumentCard from "../components/knowledge/DocumentCard";
import ChunkViewer from "../components/knowledge/ChunkViewer";
import {
  listDocuments,
  deleteDocument,
  getKnowledgeBaseStats,
  searchKnowledgeBase,
} from "../lib/api";
import type {
  DocumentItem,
  KnowledgeBaseStats,
  SearchResult,
} from "../lib/types";

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null
  );
  const [searching, setSearching] = useState(false);
  const [viewingChunks, setViewingChunks] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docs, kbStats] = await Promise.all([
        listDocuments(),
        getKnowledgeBaseStats().catch(() => null),
      ]);
      setDocuments(docs);
      setStats(kbStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      setSearching(true);
      const result = await searchKnowledgeBase(searchQuery);
      setSearchResults(result.results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and search your document repository
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {stats.totalChunks} chunks
              </p>
              <p className="text-xs text-gray-400">{stats.embeddingModel}</p>
            </div>
            <div
              className={`h-3 w-3 rounded-full ${
                stats.ragEngineStatus === "healthy"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
              title={`RAG Engine: ${stats.ragEngineStatus}`}
            />
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Semantic search across all documents..."
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="btn-primary"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Search Results ({searchResults.length})
            </h2>
            <button
              onClick={() => {
                setSearchResults(null);
                setSearchQuery("");
              }}
              className="text-xs text-brand-600 hover:text-brand-700"
            >
              Clear results
            </button>
          </div>
          {searchResults.length === 0 ? (
            <div className="card flex items-center justify-center p-8 text-sm text-gray-400">
              No results found for your query
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((result, idx) => (
                <div
                  key={result.chunkId}
                  className="card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {idx + 1}
                    </span>
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {result.fileName}
                    </span>
                    <span className="text-xs text-gray-400">
                      Chunk {result.chunkIndex}
                    </span>
                    <span className="ml-auto rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {result.content.length > 500
                      ? result.content.slice(0, 500) + "..."
                      : result.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center gap-2 p-12 text-red-500">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12">
          <Database className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            No documents yet
          </p>
          <p className="text-sm text-gray-400">
            Upload documents to build your knowledge base
          </p>
        </div>
      ) : (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            All Documents ({documents.length})
          </h2>
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
                onViewChunks={(id) =>
                  setViewingChunks({ id, name: doc.fileName })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Chunk Viewer Modal */}
      {viewingChunks && (
        <ChunkViewer
          documentId={viewingChunks.id}
          documentName={viewingChunks.name}
          onClose={() => setViewingChunks(null)}
        />
      )}
    </div>
  );
}
