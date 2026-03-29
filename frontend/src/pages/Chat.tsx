import { useState, useEffect, useRef } from "react";
import { MessageSquare, Bot } from "lucide-react";
import ChatHistory from "../components/chat/ChatHistory";
import ChatMessage, { TypingIndicator } from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import {
  createChatSession,
  sendMessage,
  getMessages,
} from "../lib/api";
import type { ChatSession, ChatMessageItem } from "../lib/types";

export default function Chat() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const loadMessages = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const msgs = await getMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    loadMessages(sessionId);
  };

  const handleNewSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages([]);
  };

  const handleSendMessage = async (question: string) => {
    if (!activeSessionId) {
      try {
        const session = await createChatSession();
        setActiveSessionId(session.id);
        await doSend(session.id, question);
      } catch (err) {
        console.error("Failed to create session:", err);
      }
      return;
    }

    await doSend(activeSessionId, question);
  };

  const doSend = async (sessionId: string, question: string) => {
    const tempUserMessage: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
      citations: [],
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsThinking(true);

    try {
      const response = await sendMessage(sessionId, { question, topK: 5 });

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMessage.id);
        return [...withoutTemp, response.userMessage, response.assistantMessage];
      });
    } catch (err) {
      const errorMessage: ChatMessageItem = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "Sorry, I encountered an error processing your question. Please make sure the RAG engine is running and try again.",
        timestamp: new Date().toISOString(),
        citations: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Chat History Sidebar */}
      <div className="w-72 flex-shrink-0">
        <ChatHistory
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
        />
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {activeSessionId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8">
                  <div className="mb-4 rounded-2xl bg-gradient-to-br from-brand-100 to-emerald-100 p-6">
                    <Bot className="h-12 w-12 text-brand-600" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-gray-900">
                    DocuMind Assistant
                  </h2>
                  <p className="mb-6 max-w-md text-center text-sm text-gray-500">
                    Ask questions about your uploaded documents. I will retrieve
                    relevant information and provide answers with source
                    citations.
                  </p>
                  <div className="grid max-w-lg grid-cols-2 gap-3">
                    {[
                      "What are the key findings?",
                      "Summarize the main topics",
                      "What policies are mentioned?",
                      "Compare the documents",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSendMessage(suggestion)}
                        className="rounded-lg border border-gray-200 bg-white p-3 text-left text-sm text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isThinking && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleSendMessage}
              disabled={isThinking}
            />
          </>
        ) : (
          /* No Session Selected */
          <div className="flex h-full flex-col items-center justify-center p-8">
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-brand-100 to-emerald-100 p-6">
              <MessageSquare className="h-12 w-12 text-brand-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Welcome to DocuMind
            </h2>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Your intelligent document Q&A system powered by RAG. Create a new
              chat or select an existing conversation to get started.
            </p>
            <button
              onClick={async () => {
                const session = await createChatSession();
                handleNewSession(session);
              }}
              className="btn-primary"
            >
              Start New Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
