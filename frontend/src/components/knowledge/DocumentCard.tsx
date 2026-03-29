import {
  FileText,
  Trash2,
  Eye,
  Clock,
  Layers,
  HardDrive,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import type { DocumentItem } from "../../lib/types";

interface DocumentCardProps {
  document: DocumentItem;
  onDelete: (id: string) => void;
  onViewChunks: (id: string) => void;
}

const fileTypeColors: Record<string, string> = {
  ".pdf": "bg-red-100 text-red-700",
  ".txt": "bg-blue-100 text-blue-700",
  ".md": "bg-purple-100 text-purple-700",
  ".docx": "bg-indigo-100 text-indigo-700",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentCard({
  document,
  onDelete,
  onViewChunks,
}: DocumentCardProps) {
  const typeColor = fileTypeColors[document.fileType] || "bg-gray-100 text-gray-700";

  const statusIcon =
    document.status === "Ready" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : document.status === "Failed" ? (
      <XCircle className="h-4 w-4 text-red-500" />
    ) : document.status === "Processing" ? (
      <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
    ) : (
      <Clock className="h-4 w-4 text-gray-400" />
    );

  return (
    <div className="card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div className={`rounded-lg p-2.5 ${typeColor}`}>
          <FileText className="h-5 w-5" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {document.fileName}
            </h3>
            {statusIcon}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>
              {document.fileType.toUpperCase()}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {formatFileSize(document.fileSizeBytes)}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {document.chunkCount} chunks
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(document.uploadedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {document.status === "Ready" && (
            <button
              onClick={() => onViewChunks(document.id)}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-600"
              title="View chunks"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(document.id)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Delete document"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
