import { User, Bot } from "lucide-react";
import type { ChatMessageItem } from "../../lib/types";
import SourceCitationCard from "./SourceCitation";

interface ChatMessageProps {
  message: ChatMessageItem;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const hasCitations = message.citations && message.citations.length > 0;

  return (
    <div
      className={`animate-slide-up flex gap-4 px-6 py-5 ${
        isUser ? "bg-white" : "bg-gray-50"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-brand-600 text-white" : "bg-emerald-600 text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {isUser ? "You" : "DocuMind"}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700">
          {message.content.split("\n").map((line, i) => (
            <p key={i} className={line ? "mb-2" : "mb-1"}>
              {line}
            </p>
          ))}
        </div>

        {/* Source Citations */}
        {hasCitations && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Sources ({message.citations.length})
            </p>
            <div className="space-y-1.5">
              {message.citations.map((citation, idx) => (
                <SourceCitationCard
                  key={citation.id}
                  citation={citation}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-4 bg-gray-50 px-6 py-5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center">
        <div className="typing-indicator flex gap-1">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
