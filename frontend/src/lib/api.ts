import type {
  DocumentItem,
  DocumentUploadResponse,
  ChatSession,
  ChatMessageItem,
  ChatResponse,
  SendMessagePayload,
  ChunkInfo,
  CollectionInfo,
  KnowledgeBaseStats,
  SearchResponse,
  AnalyticsOverview,
  QueryVolumeItem,
  PopularDocument,
  ResponseQuality,
  DocumentTypeInfo,
} from "./types";

// Use env var for backend URL; fall back to relative /api only when proxied (Docker)
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "/api"
    : "");

/** True when no backend URL is configured (e.g. Vercel-only deployment) */
const IS_DEMO_MODE = !API_BASE;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `Request failed: ${response.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      message = parsed.error || parsed.detail || message;
    } catch {
      // use default message
    }
    throw new Error(message);
  }

  return response.json();
}

// ---- Demo Data ----
const DEMO_DOCUMENTS: DocumentItem[] = [
  {
    id: "demo-doc-1",
    fileName: "project-requirements.pdf",
    fileType: "pdf",
    fileSizeBytes: 245000,
    chunkCount: 12,
    status: "Ready",
    uploadedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  },
  {
    id: "demo-doc-2",
    fileName: "api-documentation.md",
    fileType: "markdown",
    fileSizeBytes: 18500,
    chunkCount: 8,
    status: "Ready",
    uploadedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  },
];

let demoSessionId = "demo-session-1";
const demoMessages: ChatMessageItem[] = [];

// === Documents API ===

export async function uploadDocument(
  file: File,
  chunkSize = 512,
  chunkOverlap = 50
): Promise<DocumentUploadResponse> {
  if (IS_DEMO_MODE) {
    return {
      id: `demo-doc-${Date.now()}`,
      fileName: file.name,
      status: "Ready",
      chunkCount: Math.ceil(file.size / chunkSize),
      message: "[Demo Mode] File processed locally. Deploy the backend to enable real RAG processing.",
    };
  }
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE}/documents/upload?chunkSize=${chunkSize}&chunkOverlap=${chunkOverlap}`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Upload failed");
  }

  return response.json();
}

export async function listDocuments(): Promise<DocumentItem[]> {
  if (IS_DEMO_MODE) return DEMO_DOCUMENTS;
  return request<DocumentItem[]>("/documents");
}

export async function getDocument(id: string): Promise<DocumentItem> {
  if (IS_DEMO_MODE) return DEMO_DOCUMENTS.find(d => d.id === id) || DEMO_DOCUMENTS[0];
  return request<DocumentItem>(`/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<void> {
  if (IS_DEMO_MODE) return;
  await request(`/documents/${id}`, { method: "DELETE" });
}

// === Chat API ===

export async function createChatSession(
  title?: string
): Promise<ChatSession> {
  if (IS_DEMO_MODE) {
    demoSessionId = `demo-session-${Date.now()}`;
    return { id: demoSessionId, title: title || "Demo Chat", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 0 };
  }
  return request<ChatSession>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function listChatSessions(): Promise<ChatSession[]> {
  if (IS_DEMO_MODE) return [{ id: demoSessionId, title: "Demo Chat", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: demoMessages.length }];
  return request<ChatSession[]>("/chat/sessions");
}

export async function getChatSession(
  sessionId: string
): Promise<ChatSession> {
  if (IS_DEMO_MODE) return { id: sessionId, title: "Demo Chat", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: demoMessages.length };
  return request<ChatSession>(`/chat/sessions/${sessionId}`);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  if (IS_DEMO_MODE) return;
  await request(`/chat/sessions/${sessionId}`, { method: "DELETE" });
}

export async function sendMessage(
  sessionId: string,
  payload: SendMessagePayload
): Promise<ChatResponse> {
  if (IS_DEMO_MODE) {
    const now = new Date().toISOString();
    const userMsg: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: payload.question,
      timestamp: now,
      citations: [],
    };
    const assistantMsg: ChatMessageItem = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: `[Demo Mode] Your question: "${payload.question}"\n\nThis is a demo response. Deploy the backend with the Python RAG Engine to enable:\n- Document chunking & embedding with sentence-transformers\n- Vector similarity search via ChromaDB\n- AI-generated answers with source citations via DeepSeek LLM`,
      timestamp: now,
      citations: [],
    };
    demoMessages.push(userMsg, assistantMsg);
    return { sessionId, userMessage: userMsg, assistantMessage: assistantMsg };
  }
  return request<ChatResponse>(`/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMessages(
  sessionId: string
): Promise<ChatMessageItem[]> {
  if (IS_DEMO_MODE) return demoMessages;
  return request<ChatMessageItem[]>(`/chat/sessions/${sessionId}/messages`);
}

// === Knowledge Base API ===

export async function getCollections(): Promise<CollectionInfo[]> {
  if (IS_DEMO_MODE) return [{ name: "demo_collection", count: 20, metadata: {} }];
  return request<CollectionInfo[]>("/knowledgebase/collections");
}

export async function getChunks(documentId: string): Promise<ChunkInfo[]> {
  if (IS_DEMO_MODE) return [{
    chunkId: "chunk-1", documentId, content: "Demo chunk content — deploy the RAG engine to see real document chunks.",
    chunkIndex: 0, startChar: 0, endChar: 70, metadata: {},
  }];
  return request<ChunkInfo[]>(`/knowledgebase/chunks/${documentId}`);
}

export async function getKnowledgeBaseStats(): Promise<KnowledgeBaseStats> {
  if (IS_DEMO_MODE) return {
    totalDocuments: 2, readyDocuments: 2, processingDocuments: 0, failedDocuments: 0,
    totalChunks: 20, embeddingModel: "all-MiniLM-L6-v2", ragEngineStatus: "demo",
  };
  return request<KnowledgeBaseStats>("/knowledgebase/stats");
}

export async function searchKnowledgeBase(
  query: string,
  topK = 10,
  documentIds?: string[]
): Promise<SearchResponse> {
  if (IS_DEMO_MODE) return { results: [], query, totalResults: 0 };
  return request<SearchResponse>("/knowledgebase/search", {
    method: "POST",
    body: JSON.stringify({ query, topK, documentIds }),
  });
}

// === Analytics API ===

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  if (IS_DEMO_MODE) return {
    totalDocuments: 2, readyDocuments: 2, totalSessions: 1, totalQueries: 42, totalCitations: 15, totalChunks: 20,
  };
  return request<AnalyticsOverview>("/analytics/overview");
}

export async function getQueryVolume(
  days = 30
): Promise<QueryVolumeItem[]> {
  if (IS_DEMO_MODE) {
    return Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
      queries: Math.floor(Math.random() * 10) + 1,
    }));
  }
  return request<QueryVolumeItem[]>(`/analytics/query-volume?days=${days}`);
}

export async function getPopularDocuments(
  limit = 10
): Promise<PopularDocument[]> {
  if (IS_DEMO_MODE) return [{ documentId: "demo-doc-1", fileName: "project-requirements.pdf", citationCount: 15, avgScore: 0.85 }];
  return request<PopularDocument[]>(
    `/analytics/popular-documents?limit=${limit}`
  );
}

export async function getResponseQuality(): Promise<ResponseQuality> {
  if (IS_DEMO_MODE) return { totalQueries: 42, answeredWithSources: 38, answerRate: 0.9, avgCitationsPerAnswer: 2.5, avgRelevanceScore: 0.85 };
  return request<ResponseQuality>("/analytics/response-quality");
}

export async function getDocumentTypes(): Promise<DocumentTypeInfo[]> {
  if (IS_DEMO_MODE) return [{ fileType: "pdf", count: 1, totalSize: 245000 }, { fileType: "markdown", count: 1, totalSize: 18500 }];
  return request<DocumentTypeInfo[]>("/analytics/document-types");
}

/** Returns true if running in demo mode (no backend configured) */
export function isDemoMode(): boolean {
  return IS_DEMO_MODE;
}
