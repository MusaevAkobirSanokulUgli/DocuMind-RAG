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

const API_BASE = "/api";

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

// === Documents API ===

export async function uploadDocument(
  file: File,
  chunkSize = 512,
  chunkOverlap = 50
): Promise<DocumentUploadResponse> {
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
  return request<DocumentItem[]>("/documents");
}

export async function getDocument(id: string): Promise<DocumentItem> {
  return request<DocumentItem>(`/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<void> {
  await request(`/documents/${id}`, { method: "DELETE" });
}

// === Chat API ===

export async function createChatSession(
  title?: string
): Promise<ChatSession> {
  return request<ChatSession>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function listChatSessions(): Promise<ChatSession[]> {
  return request<ChatSession[]>("/chat/sessions");
}

export async function getChatSession(
  sessionId: string
): Promise<ChatSession> {
  return request<ChatSession>(`/chat/sessions/${sessionId}`);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await request(`/chat/sessions/${sessionId}`, { method: "DELETE" });
}

export async function sendMessage(
  sessionId: string,
  payload: SendMessagePayload
): Promise<ChatResponse> {
  return request<ChatResponse>(`/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMessages(
  sessionId: string
): Promise<ChatMessageItem[]> {
  return request<ChatMessageItem[]>(`/chat/sessions/${sessionId}/messages`);
}

// === Knowledge Base API ===

export async function getCollections(): Promise<CollectionInfo[]> {
  return request<CollectionInfo[]>("/knowledgebase/collections");
}

export async function getChunks(documentId: string): Promise<ChunkInfo[]> {
  return request<ChunkInfo[]>(`/knowledgebase/chunks/${documentId}`);
}

export async function getKnowledgeBaseStats(): Promise<KnowledgeBaseStats> {
  return request<KnowledgeBaseStats>("/knowledgebase/stats");
}

export async function searchKnowledgeBase(
  query: string,
  topK = 10,
  documentIds?: string[]
): Promise<SearchResponse> {
  return request<SearchResponse>("/knowledgebase/search", {
    method: "POST",
    body: JSON.stringify({ query, topK, documentIds }),
  });
}

// === Analytics API ===

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return request<AnalyticsOverview>("/analytics/overview");
}

export async function getQueryVolume(
  days = 30
): Promise<QueryVolumeItem[]> {
  return request<QueryVolumeItem[]>(`/analytics/query-volume?days=${days}`);
}

export async function getPopularDocuments(
  limit = 10
): Promise<PopularDocument[]> {
  return request<PopularDocument[]>(
    `/analytics/popular-documents?limit=${limit}`
  );
}

export async function getResponseQuality(): Promise<ResponseQuality> {
  return request<ResponseQuality>("/analytics/response-quality");
}

export async function getDocumentTypes(): Promise<DocumentTypeInfo[]> {
  return request<DocumentTypeInfo[]>("/analytics/document-types");
}
