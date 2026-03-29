import { useState, useCallback, useRef } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxSizeMb?: number;
}

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md", ".docx"];

export default function DropZone({
  onFilesSelected,
  disabled = false,
  maxSizeMb = 50,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const validFiles: File[] = [];
      const maxSize = maxSizeMb * 1024 * 1024;

      Array.from(files).forEach((file) => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
          setError(
            `Unsupported file type: ${ext}. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`
          );
          return;
        }
        if (file.size > maxSize) {
          setError(`File too large: ${file.name}. Maximum size: ${maxSizeMb}MB`);
          return;
        }
        validFiles.push(file);
      });

      return validFiles;
    },
    [maxSizeMb]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setError(null);

      if (disabled) return;
      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) onFilesSelected(files);
    },
    [disabled, validateFiles, onFilesSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files) {
      const files = validateFiles(e.target.files);
      if (files.length > 0) onFilesSelected(files);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all ${
          isDragOver
            ? "border-brand-500 bg-brand-50"
            : disabled
              ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
              : "border-gray-300 bg-white hover:border-brand-400 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div
          className={`mb-4 rounded-xl p-4 ${
            isDragOver ? "bg-brand-100" : "bg-gray-100"
          }`}
        >
          <Upload
            className={`h-8 w-8 ${
              isDragOver ? "text-brand-600" : "text-gray-400"
            }`}
          />
        </div>

        <p className="mb-1 text-base font-semibold text-gray-700">
          {isDragOver ? "Drop files here" : "Drop files or click to upload"}
        </p>
        <p className="text-sm text-gray-400">
          PDF, DOCX, TXT, or Markdown (max {maxSizeMb}MB)
        </p>

        <div className="mt-4 flex items-center gap-4">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500"
            >
              {ext.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
