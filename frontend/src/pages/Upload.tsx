import { useState, useEffect } from "react";
import { Upload as UploadIcon, FileText, Layers, CheckCircle2 } from "lucide-react";
import DropZone from "../components/upload/DropZone";
import ProcessingStatus, {
  type UploadItem,
} from "../components/upload/ProcessingStatus";
import { uploadDocument, listDocuments } from "../lib/api";
import type { DocumentItem } from "../lib/types";

export default function Upload() {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    setIsUploading(true);

    for (const file of files) {
      const itemId = crypto.randomUUID();

      setUploadItems((prev) => [
        ...prev,
        {
          id: itemId,
          fileName: file.name,
          status: "uploading",
        },
      ]);

      try {
        setUploadItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, status: "processing" } : item
          )
        );

        const result = await uploadDocument(file);

        setUploadItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: result.status === "Ready" ? "success" : "error",
                  message: result.message,
                  chunkCount: result.chunkCount,
                }
              : item
          )
        );
      } catch (err) {
        setUploadItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "error",
                  message:
                    err instanceof Error ? err.message : "Upload failed",
                }
              : item
          )
        );
      }
    }

    setIsUploading(false);
    await loadDocuments();
  };

  const handleDismiss = (id: string) => {
    setUploadItems((prev) => prev.filter((item) => item.id !== id));
  };

  const readyDocs = documents.filter((d) => d.status === "Ready");
  const totalChunks = documents.reduce((sum, d) => sum + d.chunkCount, 0);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload documents to build your knowledge base. Supported formats: PDF,
          DOCX, TXT, Markdown.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-3 p-4">
          <div className="rounded-lg bg-blue-100 p-2.5">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {documents.length}
            </p>
            <p className="text-xs text-gray-500">Total Documents</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="rounded-lg bg-green-100 p-2.5">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {readyDocs.length}
            </p>
            <p className="text-xs text-gray-500">Ready for Q&A</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="rounded-lg bg-purple-100 p-2.5">
            <Layers className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalChunks}</p>
            <p className="text-xs text-gray-500">Total Chunks</p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div className="mb-6">
        <DropZone onFilesSelected={handleFilesSelected} disabled={isUploading} />
      </div>

      {/* Processing Status */}
      <ProcessingStatus items={uploadItems} onDismiss={handleDismiss} />

      {/* Recent Uploads */}
      {documents.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Recent Uploads
          </h2>
          <div className="space-y-2">
            {documents.slice(0, 10).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
              >
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="flex-1 truncate text-sm text-gray-700">
                  {doc.fileName}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    doc.status === "Ready"
                      ? "bg-green-100 text-green-700"
                      : doc.status === "Processing"
                        ? "bg-yellow-100 text-yellow-700"
                        : doc.status === "Failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {doc.status}
                </span>
                <span className="text-xs text-gray-400">
                  {doc.chunkCount} chunks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
