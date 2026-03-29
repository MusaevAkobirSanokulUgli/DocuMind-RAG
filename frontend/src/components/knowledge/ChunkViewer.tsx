import { useState, useEffect } from "react";
import { X, Layers, Hash, FileText, Loader2 } from "lucide-react";
import type { ChunkInfo } from "../../lib/types";
import { getChunks } from "../../lib/api";

interface ChunkViewerProps {
  documentId: string;
  documentName: string;
  onClose: () => void;
}

export default function ChunkViewer({
  documentId,
  documentName,
  onClose,
}: ChunkViewerProps) {
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<number>(0);

  useEffect(() => {
    const fetchChunks = async () => {
      try {
        setLoading(true);
        const data = await getChunks(documentId);
        setChunks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chunks");
      } finally {
        setLoading(false);
      }
    };
    fetchChunks();
  }, [documentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-100 p-2">
              <Layers className="h-5 w-5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Document Chunks
              </h2>
              <p className="text-sm text-gray-500">{documentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center text-red-500">
            {error}
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Chunk List */}
            <div className="w-48 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50">
              <div className="p-2">
                <p className="mb-2 px-2 text-xs font-semibold uppercase text-gray-400">
                  {chunks.length} Chunks
                </p>
                {chunks.map((chunk, idx) => (
                  <button
                    key={chunk.chunkId}
                    onClick={() => setSelectedChunk(idx)}
                    className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedChunk === idx
                        ? "bg-brand-100 font-medium text-brand-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                    Chunk {chunk.chunkIndex}
                  </button>
                ))}
              </div>
            </div>

            {/* Chunk Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {chunks.length > 0 && chunks[selectedChunk] && (
                <div>
                  <div className="mb-4 flex items-center gap-4">
                    <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
                      Chunk {chunks[selectedChunk].chunkIndex}
                    </span>
                    <span className="text-xs text-gray-400">
                      Chars {chunks[selectedChunk].startChar} -{" "}
                      {chunks[selectedChunk].endChar}
                    </span>
                    <span className="text-xs text-gray-400">
                      {chunks[selectedChunk].content.length} characters
                    </span>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {chunks[selectedChunk].content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
