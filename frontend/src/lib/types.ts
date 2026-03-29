// === Document Types ===

export interface DocumentItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  chunkCount: number;
  status: "Pending" | "Processing" | "Ready" | "Failed";
  uploadedAt: string;
  processedAt: string | null;
}

export interface DocumentUploadResponse {
  id: string;
  fileName: string;
  status: string;
  message: string;
  chunkCount: number;
}

// === Chat Types ===

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface SourceCitation {
  id: string;
  documentId: string;
  chunkId: string;
  content: string;
  fileName: string;
  chunkIndex: number;
  score: number;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations: SourceCitation[];
}

export interface ChatResponse {
  sessionId: string;
  userMessage: ChatMessageItem;
  assistantMessage: ChatMessageItem;
}

export interface SendMessagePayload {
  question: string;
  topK?: number;
  documentIds?: string[];
}

// === Knowledge Base Types ===

export interface ChunkInfo {
  chunkId: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  metadata: Record<string, unknown>;
}

export interface CollectionInfo {
  name: string;
  count: number;
  metadata: Record<string, unknown>;
}

export interface KnowledgeBaseStats {
  totalDocuments: number;
  readyDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  totalChunks: number;
  embeddingModel: string;
  ragEngineStatus: string;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  chunkIndex: number;
  fileName: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
}

// === Analytics Types ===

export interface AnalyticsOverview {
  totalDocuments: number;
  readyDocuments: number;
  totalSessions: number;
  totalQueries: number;
  totalCitations: number;
  totalChunks: number;
}

export interface QueryVolumeItem {
  date: string;
  queries: number;
}

export interface PopularDocument {
  documentId: string;
  fileName: string;
  citationCount: number;
  avgScore: number;
}

export interface ResponseQuality {
  totalQueries: number;
  answeredWithSources: number;
  answerRate: number;
  avgCitationsPerAnswer: number;
  avgRelevanceScore: number;
}

export interface DocumentTypeInfo {
  fileType: string;
  count: number;
  totalSize: number;
}

// === Settings Types ===

export interface AppSettings {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  scoreThreshold: number;
}
