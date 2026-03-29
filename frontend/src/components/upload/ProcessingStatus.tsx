import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Layers,
} from "lucide-react";

export interface UploadItem {
  id: string;
  fileName: string;
  status: "uploading" | "processing" | "success" | "error";
  message?: string;
  chunkCount?: number;
  progress?: number;
}

interface ProcessingStatusProps {
  items: UploadItem[];
  onDismiss: (id: string) => void;
}

export default function ProcessingStatus({
  items,
  onDismiss,
}: ProcessingStatusProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Upload Progress</h3>
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
            item.status === "success"
              ? "border-green-200 bg-green-50"
              : item.status === "error"
                ? "border-red-200 bg-red-50"
                : "border-gray-200 bg-white"
          }`}
        >
          {/* Status Icon */}
          {item.status === "uploading" || item.status === "processing" ? (
            <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-brand-600" />
          ) : item.status === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          )}

          {/* File Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="truncate text-sm font-medium text-gray-700">
                {item.fileName}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {item.status === "uploading" && "Uploading..."}
              {item.status === "processing" && "Processing document, generating embeddings..."}
              {item.status === "success" && (item.message || "Successfully processed")}
              {item.status === "error" && (item.message || "Processing failed")}
            </p>
          </div>

          {/* Chunk Count */}
          {item.status === "success" && item.chunkCount !== undefined && (
            <div className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
              <Layers className="h-3 w-3" />
              {item.chunkCount} chunks
            </div>
          )}

          {/* Dismiss Button */}
          {(item.status === "success" || item.status === "error") && (
            <button
              onClick={() => onDismiss(item.id)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Dismiss
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
