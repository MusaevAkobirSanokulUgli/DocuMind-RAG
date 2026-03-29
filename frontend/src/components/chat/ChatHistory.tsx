import { useState, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Clock,
} from "lucide-react";
import type { ChatSession } from "../../lib/types";
import {
  listChatSessions,
  createChatSession,
  deleteChatSession,
} from "../../lib/api";

interface ChatHistoryProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: (session: ChatSession) => void;
}

export default function ChatHistory({
  activeSessionId,
  onSelectSession,
  onNewSession,
}: ChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const data = await listChatSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [activeSessionId]);

  const handleNewChat = async () => {
    try {
      const session = await createChatSession();
      setSessions((prev) => [session, ...prev]);
      onNewSession(session);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          onSelectSession(remaining[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Chat History</h2>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No chat history yet</p>
            <p className="text-xs text-gray-400">
              Start a new conversation above
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activeSessionId === session.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {session.title}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {formatDate(session.updatedAt)}
                    {session.messageCount > 0 && (
                      <span className="ml-1">
                        ({session.messageCount} msgs)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  className="mt-0.5 hidden rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
                  title="Delete session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
