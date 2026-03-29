import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { SourceCitation as SourceCitationType } from "../../lib/types";

interface SourceCitationProps {
  citation: SourceCitationType;
  index: number;
}

export default function SourceCitationCard({
  citation,
  index,
}: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);

  const scorePercent = Math.round(citation.score * 100);
  const scoreColor =
    scorePercent >= 70
      ? "text-green-600 bg-green-50"
      : scorePercent >= 40
        ? "text-yellow-600 bg-yellow-50"
        : "text-red-600 bg-red-50";

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 transition-all hover:border-gray-300">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {index + 1}
        </span>
        <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <span className="flex-1 truncate text-sm font-medium text-gray-700">
          {citation.fileName || "Unknown"}
        </span>
        <span className="text-xs text-gray-400">
          Chunk {citation.chunkIndex}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreColor}`}
        >
          {scorePercent}%
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-gray-200 px-3 py-2">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600">
            {citation.content}
          </p>
        </div>
      )}
    </div>
  );
}
