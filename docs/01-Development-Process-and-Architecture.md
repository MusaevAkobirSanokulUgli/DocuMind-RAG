# DocuMind RAG System - Development Process & Architecture

> **Version**: 1.0.0
> **Architecture**: Retrieval-Augmented Generation (RAG)
> **Date**: March 2026
> **Classification**: Production System Documentation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [Technology Stack](#4-technology-stack)
5. [System Design & Architecture](#5-system-design--architecture)
6. [AI/ML Pipeline Development](#6-aiml-pipeline-development)
7. [Backend Development](#7-backend-development)
8. [Frontend Development](#8-frontend-development)
9. [Data Flow & Processing](#9-data-flow--processing)
10. [Database Schema Design](#10-database-schema-design)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Security Considerations](#12-security-considerations)
13. [Performance Characteristics](#13-performance-characteristics)

---

## 1. Executive Summary

**DocuMind** is a production-grade Retrieval-Augmented Generation (RAG) system designed to solve the problem of inefficient knowledge retrieval across large document repositories. The system enables users to upload documents (PDF, DOCX, TXT, Markdown), automatically processes them into searchable embeddings, and provides an intelligent chat interface that answers questions with source-cited responses.

The system was developed as a three-tier architecture comprising a React frontend, a .NET 8 API backend, and a Python FastAPI RAG engine. It uses sentence-transformers for local embedding generation and ChromaDB for persistent vector storage, making it fully self-contained with zero external API dependencies.

**Key Metrics**:
- **Total codebase**: ~4,954 lines across 52 files
- **Frontend**: 23 files, ~2,662 lines (React/TypeScript)
- **Backend**: 15 files, ~1,156 lines (C#/.NET 8)
- **RAG Engine**: 8 files, ~882 lines (Python/FastAPI)

---

## 2. Problem Statement

### The Challenge

Organizations across every industry accumulate vast repositories of documents — legal contracts, medical records, technical documentation, HR policies, research papers, compliance guidelines. Employees routinely waste **2-4 hours daily** searching through these documents for specific information.

### Why Traditional Search Fails

| Approach | Limitation |
|----------|-----------|
| Keyword Search | Misses semantic meaning; "employee termination policy" won't match "offboarding procedure" |
| Full-Text Search | Returns entire documents, not precise answers; no contextual understanding |
| Manual Review | Doesn't scale; subject matter experts become bottlenecks |
| Generic AI Chatbots | Hallucinate without grounding; can't reference internal documents |

### How RAG Solves This

RAG (Retrieval-Augmented Generation) bridges the gap by:

1. **Converting documents into vector embeddings** that capture semantic meaning
2. **Retrieving the most relevant passages** based on semantic similarity to the user's question
3. **Generating grounded answers** with citations pointing to exact source chunks
4. **Eliminating hallucination** by constraining responses to retrieved context only

### Target Use Cases

- **Enterprise Knowledge Base**: Company policies, procedures, internal wikis
- **Legal Document Analysis**: Contract review, clause search, compliance checking
- **Medical/Research**: Paper summarization, protocol search, clinical guideline Q&A
- **Technical Documentation**: API docs, runbooks, architecture decision records
- **Education**: Course material Q&A, study assistant, research paper analysis

---

## 3. Solution Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                         │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Chat Page   │  │ Upload Page  │  │ Knowledge │  │ Analytics │  │
│  │  (Q&A)       │  │ (Drag&Drop) │  │ Base View │  │ Dashboard │  │
│  └──────┬───────┘  └──────┬──────┘  └─────┬─────┘  └─────┬─────┘  │
│         │                  │                │              │         │
│  React 18 + TypeScript + Vite + Tailwind CSS (Port 3001)           │
└─────────┼──────────────────┼────────────────┼──────────────┼────────┘
          │ REST API         │                │              │
┌─────────▼──────────────────▼────────────────▼──────────────▼────────┐
│                     API GATEWAY LAYER                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌────────┐│
│  │ ChatController│  │DocumentsCtrl │  │KnowledgeBaseCtrl│ │Analytics││
│  └──────┬───────┘  └──────┬──────┘  └───────┬───────┘  └────┬───┘│
│         │                  │                  │               │     │
│  ┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐             │
│  │ ChatService │  │DocProcessSvc  │  │RagEngineClient│            │
│  └──────┬──────┘  └───────┬───────┘  └──────┬──────┘             │
│         │                  │                  │                     │
│  .NET 8 Web API + Entity Framework Core + SQLite (Port 5001)      │
└─────────┼──────────────────┼──────────────────┼─────────────────────┘
          │ HTTP             │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────────┐
│                    RAG ENGINE LAYER                                  │
│                                                                     │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │Document Loaders│  │Text Splitter │  │ Embedding Generator  │    │
│  │(PDF,DOCX,TXT)  │→│(Recursive)   │→│(sentence-transformers)│    │
│  └────────────────┘  └──────────────┘  └──────────┬───────────┘    │
│                                                    │                │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────▼───────────┐    │
│  │ Retriever +    │←│ Query        │←│ ChromaDB Vector Store │    │
│  │ Reranker       │  │ Embedder    │  │ (Persistent)          │    │
│  └────────────────┘  └──────────────┘  └──────────────────────┘    │
│                                                                     │
│  Python FastAPI + sentence-transformers + ChromaDB (Port 8000)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: ML/vector operations isolated in Python; relational data in .NET; presentation in React
2. **Zero External API Dependencies**: Embedding model runs locally; no OpenAI/Claude API keys required
3. **Stateless Communication**: Services communicate via well-defined REST APIs with DTO mapping
4. **Persistent Storage**: Both SQLite (metadata) and ChromaDB (vectors) persist to disk
5. **Progressive Enhancement**: System works without LLM; can be enhanced with LLM integration

---

## 4. Technology Stack

### Frontend Layer

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI component framework |
| TypeScript | 5.7 | Type-safe development |
| Vite | 6.0 | Build tool and dev server |
| Tailwind CSS | 3.4 | Utility-first styling |
| React Router | 6.28 | Client-side routing |
| Recharts | 2.15 | Data visualization (analytics charts) |
| Radix UI | Latest | Accessible UI primitives (dialog, dropdown, tabs, scroll-area) |
| Lucide React | Latest | Icon library |

### Backend Layer

| Technology | Version | Purpose |
|-----------|---------|---------|
| .NET | 8.0 | Application framework |
| ASP.NET Core | 8.0 | Web API framework |
| Entity Framework Core | 8.0.11 | ORM for SQLite |
| SQLite | 3.x | Relational database |
| Swashbuckle | 6.9.0 | Swagger/OpenAPI documentation |

### RAG Engine Layer

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11 | Runtime |
| FastAPI | 0.115.6 | Async web framework |
| Uvicorn | 0.34.0 | ASGI server |
| sentence-transformers | 3.3.1 | Embedding model framework |
| ChromaDB | 0.5.23 | Vector database |
| PyPDF2 | 3.0.1 | PDF text extraction |
| python-docx | 1.1.2 | DOCX text extraction |
| NumPy | 1.26.4 | Numerical operations |
| PyTorch | 2.5.1 | ML framework (sentence-transformers backend) |
| Transformers | 4.47.1 | HuggingFace model loading |
| Pydantic | 2.10.4 | Data validation and serialization |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| Nginx | Frontend static serving + API proxy |

---

## 5. System Design & Architecture

### 5.1 Service Communication

```
Frontend (React) ──HTTP/REST──> Backend (.NET) ──HTTP/REST──> RAG Engine (Python)
     │                               │                              │
     │                               ▼                              ▼
     │                          SQLite DB                     ChromaDB
     │                      (metadata, chats)           (embeddings, vectors)
     │                               │                              │
     └───────── Shared Volume: uploaded-docs ──────────────────────┘
```

- **Frontend → Backend**: All API calls go through `/api/*` prefix, proxied by Vite (dev) or Nginx (production)
- **Backend → RAG Engine**: Typed HTTP client (`RagEngineClient`) with snake_case JSON serialization to match Python conventions
- **Shared Storage**: The `uploaded-docs` Docker volume is mounted in both backend and RAG engine containers, allowing the .NET backend to save files and the Python engine to read them

### 5.2 Request Routing

| Frontend Route | Backend Endpoint | RAG Engine Endpoint |
|---------------|------------------|-------------------|
| `/chat` | `POST /api/chat/sessions/{id}/messages` | `POST /query` |
| `/upload` | `POST /api/documents/upload` | `POST /process` |
| `/knowledge-base` | `GET /api/knowledgebase/*` | `GET /chunks/*`, `GET /collections` |
| `/analytics` | `GET /api/analytics/*` | `GET /health` |
| `/settings` | Client-side only (localStorage) | — |

### 5.3 Error Handling Strategy

- **RAG Engine**: FastAPI exception handlers with structured error responses; graceful degradation on model loading failure
- **Backend**: Try-catch with `ILogger` logging; returns appropriate HTTP status codes; 5-minute HTTP timeout for large document processing
- **Frontend**: Per-request error handling with `.catch()` fallbacks; `Promise.all` with individual catch clauses for dashboard resilience

---

## 6. AI/ML Pipeline Development

### 6.1 Embedding Model

**Model**: `all-MiniLM-L6-v2` from sentence-transformers

| Property | Value |
|----------|-------|
| Architecture | MiniLM (distilled BERT) |
| Parameters | 22.7 million |
| Embedding Dimension | 384 |
| Max Sequence Length | 256 tokens |
| Training Data | 1B+ sentence pairs from diverse sources |
| Similarity Metric | Cosine similarity |
| Inference Speed | ~14,000 sentences/sec on GPU; ~3,000/sec on CPU |
| Model Size | ~80 MB |

**Why this model was chosen**:
- **Runs locally on CPU** — no GPU required, no API keys, no cost
- **Small footprint** — 80 MB vs. 1.5 GB for larger models
- **Fast inference** — suitable for real-time document processing
- **Strong performance** — ranked in top models for semantic textual similarity on MTEB benchmark
- **Normalized embeddings** — directly compatible with cosine similarity search

**How it's loaded**:
```python
# Singleton pattern with lazy loading
_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(config.EMBEDDING_MODEL)
    return _model
```

The model is pre-loaded at FastAPI startup to avoid cold-start latency on the first query.

### 6.2 Document Processing Pipeline

#### Step 1: Text Extraction (`document_loaders.py`)

| Format | Library | Method |
|--------|---------|--------|
| PDF | PyPDF2 | Page-by-page text extraction with `page.extract_text()` |
| DOCX | python-docx | Paragraph-by-paragraph with `para.text` |
| TXT/MD | Built-in | Multi-encoding fallback: UTF-8 → Latin-1 → CP1252 |

#### Step 2: Text Chunking (`text_splitter.py`)

**Algorithm**: Recursive Character Text Splitting

The splitter uses a 9-level separator hierarchy, attempting to split on the most semantically meaningful boundary first:

```
Level 1: "\n\n"   (paragraph boundaries)
Level 2: "\n"     (line boundaries)
Level 3: ". "     (sentence boundaries)
Level 4: "! "     (exclamation sentences)
Level 5: "? "     (question sentences)
Level 6: "; "     (clause boundaries)
Level 7: ", "     (phrase boundaries)
Level 8: " "      (word boundaries)
Level 9: ""       (character-level fallback)
```

**Parameters**:
- `chunk_size`: 512 characters (default)
- `chunk_overlap`: 50 characters (default)

**Process**:
1. Try to split text using the highest-level separator that produces sub-strings fitting within `chunk_size`
2. For sub-strings that are still too large, recursively apply the next separator level
3. Merge small chunks together until they reach `chunk_size`
4. Add overlap from the tail of the previous chunk to maintain context continuity

**Output**: List of `TextChunk` objects, each containing:
- `content`: The chunk text
- `chunk_index`: Sequential index (0, 1, 2, ...)
- `start_char` / `end_char`: Character positions in the original document
- `length`: Character count

#### Step 3: Embedding Generation (`embeddings.py`)

```python
def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    model = get_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        normalize_embeddings=True  # Critical for cosine similarity
    )
    return embeddings.tolist()
```

- Batch processing with configurable batch size (default: 64)
- Embeddings are **L2-normalized** at generation time, ensuring cosine similarity = dot product
- Returns 384-dimensional float vectors

#### Step 4: Vector Storage (`vectorstore.py`)

```python
def add_chunks(chunks, embeddings, document_id, file_name):
    collection = get_or_create_collection()
    # Batch insert in groups of 500
    for i in range(0, len(chunks), 500):
        batch = chunks[i:i+500]
        collection.add(
            ids=[f"{document_id}_chunk_{c.chunk_index}" for c in batch],
            embeddings=embeddings[i:i+500],
            documents=[c.content for c in batch],
            metadatas=[{
                "document_id": document_id,
                "file_name": file_name,
                "chunk_index": c.chunk_index,
                "start_char": c.start_char,
                "end_char": c.end_char,
            } for c in batch]
        )
```

- **ChromaDB PersistentClient**: Data persists to disk at `./chroma_data/`
- **Collection**: Single collection named "documind" with `hnsw:space: cosine`
- **HNSW Index**: Hierarchical Navigable Small World graph for approximate nearest neighbor search
- **Batched inserts**: Groups of 500 to avoid memory issues with large documents

### 6.3 Retrieval Pipeline

#### Step 1: Query Embedding
Same `all-MiniLM-L6-v2` model embeds the user's question into a 384-dim vector.

#### Step 2: Vector Search
```python
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=top_k * 2,  # Over-retrieve for reranking
    include=["documents", "metadatas", "distances"]
)
```
- **Over-retrieval**: Fetches `top_k * 2` candidates (default: 10 candidates for top 5)
- **Distance metric**: Cosine distance (lower = more similar)

#### Step 3: Reranking (`retriever.py`)

The reranker applies three transformations:

1. **Score conversion**: `score = 1 - cosine_distance` (converts distance to similarity)
2. **Length penalty**: Short chunks receive score penalties:
   - Chunks < 50 characters: score × 0.7
   - Chunks 50-100 characters: score × 0.85
3. **Deduplication**: Chunks with identical first 200 characters are deduplicated
4. **Score threshold**: Chunks below `score_threshold` (default: 0.0) are filtered out
5. **Final selection**: Top `top_k` chunks after reranking

#### Step 4: Context Assembly
```python
def _assemble_context(sources: list[SourceDocument]) -> str:
    parts = []
    for i, src in enumerate(sources):
        header = f"[Source {i+1}] {src.file_name} (Chunk {src.chunk_index})"
        parts.append(f"{header}\n{src.content}")
    return "\n\n---\n\n".join(parts)
```

#### Step 5: Prompt Construction
```python
RAG_PROMPT_TEMPLATE = """You are a helpful assistant that answers questions
based on provided context. Use ONLY the information from the context below
to answer. If the context doesn't contain enough information, say so.
Always cite your sources using [Source N] notation.

Context:
{context}

Question: {question}

Answer:"""
```

### 6.4 Answer Generation

The current implementation generates answers **without an external LLM**. The .NET backend's `ChatService.BuildAnswer()` method:

1. Parses the context string returned by the RAG engine
2. Splits on `---` delimiters to extract individual source blocks
3. Extracts content after the `[Source N]` headers
4. Truncates each source to 300 characters
5. Appends `[Source N]` references at the end

This produces factual, source-cited answers from the retrieved chunks. The system is designed to be enhanced with an LLM integration — the `prompt` field in the query response contains a ready-to-use prompt that can be sent to any LLM API.

---

## 7. Backend Development

### 7.1 .NET 8 Web API Architecture

The backend follows a standard layered architecture:

```
Controllers (HTTP layer)
    ↓
Services (Business logic)
    ↓
Data (EF Core DbContext)
    ↓
SQLite Database
```

### 7.2 Controllers

| Controller | Endpoints | Purpose |
|-----------|-----------|---------|
| `DocumentsController` | 4 endpoints | Upload (50MB limit, validates .pdf/.docx/.txt/.md), list, get, delete |
| `ChatController` | 6 endpoints | Session CRUD, send message (triggers RAG pipeline), get message history |
| `KnowledgeBaseController` | 4 endpoints | Browse collections, view chunks by document, stats, semantic search proxy |
| `AnalyticsController` | 6 endpoints | Overview metrics, query volume (daily), popular documents, response quality, document types, recent activity |

### 7.3 Services

**DocumentProcessingService**: Orchestrates the full upload-to-ready pipeline:
1. Generates unique ID → saves file to disk → creates DB record (Status: Processing)
2. Calls RAG engine `/process` → updates record (Status: Ready, ChunkCount: N)
3. On failure: updates record (Status: Failed, StatusMessage: error)

**ChatService**: Orchestrates the RAG query pipeline:
1. Creates user message in DB → calls RAG engine `/query`
2. Builds answer from context → creates assistant message + source citations in DB
3. Auto-titles session from first question (first 50 characters)

**RagEngineClient**: Typed HTTP client with:
- 5-minute timeout (for large document processing)
- Snake_case JSON serialization (matches Python conventions)
- Complete DTO definitions for all RAG engine endpoints

### 7.4 Configuration

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=documind.db"
  },
  "RagEngine": {
    "BaseUrl": "http://localhost:8000"
  },
  "Storage": {
    "UploadDirectory": "./uploads"
  }
}
```

---

## 8. Frontend Development

### 8.1 Application Structure

```
src/
├── App.tsx              # Router configuration
├── main.tsx             # Entry point
├── lib/
│   ├── types.ts         # 18 TypeScript interfaces
│   └── api.ts           # 19 typed API functions
├── pages/
│   ├── Chat.tsx          # Chat interface (195 lines)
│   ├── Upload.tsx        # Document upload (184 lines)
│   ├── KnowledgeBase.tsx # Document browser (249 lines)
│   ├── Analytics.tsx     # Charts dashboard (189 lines)
│   └── Settings.tsx      # RAG configuration (233 lines)
├── components/
│   ├── layout/           # AppLayout, Sidebar
│   ├── chat/             # ChatHistory, ChatMessage, ChatInput, SourceCitation
│   ├── upload/           # DropZone, ProcessingStatus
│   ├── knowledge/        # DocumentCard, ChunkViewer
│   └── analytics/        # Charts (QueryVolume, PopularDocs, DocTypes)
└── styles/
    └── index.css         # Tailwind + custom components
```

### 8.2 Key UI Components

**Chat Interface**:
- ChatGPT-style conversation with user/assistant message bubbles
- Source citation cards that expand to show full chunk content
- Color-coded relevance scores (green >= 70%, yellow >= 40%, red < 40%)
- Typing indicator animation during processing
- Session sidebar with create/delete/switch functionality

**Document Upload**:
- Drag-and-drop zone with file type and size validation (50MB)
- Real-time processing status with spinner/checkmark/error indicators
- Upload statistics (total documents, ready count, total chunks)

**Knowledge Base**:
- Semantic search across all chunks
- Document cards with file type badges, status indicators
- Full-screen chunk viewer modal with navigation

**Analytics Dashboard**:
- Overview stat cards (documents, sessions, messages, chunks)
- Query volume bar chart (daily)
- Popular documents horizontal bar chart
- Document types pie chart
- Response quality metrics (answer rate, avg citations, avg relevance)

---

## 9. Data Flow & Processing

### 9.1 Document Upload Flow (Complete)

```
User drops file in DropZone
  ↓
Frontend validates file type (.pdf/.docx/.txt/.md) and size (<50MB)
  ↓
POST /api/documents/upload (multipart/form-data)
  ↓
.NET DocumentsController receives IFormFile
  ↓
DocumentProcessingService.UploadAndProcessAsync():
  1. Generate GUID for document ID
  2. Save file to ./uploads/{docId}{extension}
  3. Insert Document record (Status: Processing) in SQLite
  4. HTTP POST to RAG Engine /process {file_path, document_id}
  ↓
Python RAG Engine main.py process_document():
  1. document_loaders.load_document() → extract raw text
  2. RecursiveTextSplitter.split() → create overlapping chunks
  3. embeddings.embed_texts() → generate 384-dim vectors (batch of 64)
  4. vectorstore.add_chunks() → store in ChromaDB (batch of 500)
  5. Return {num_chunks, collection, status}
  ↓
.NET updates Document record (Status: Ready, ChunkCount: N)
  ↓
Frontend receives DocumentUploadResponse, shows success
```

### 9.2 Chat Query Flow (Complete)

```
User types question in ChatInput
  ↓
Frontend: POST /api/chat/sessions/{sessionId}/messages {content}
  ↓
.NET ChatController.SendMessage():
  ↓
ChatService.SendMessageAsync():
  1. Save user ChatMessage to SQLite
  2. HTTP POST to RAG Engine /query {query, top_k, score_threshold}
  ↓
Python retriever.retrieve_and_build_context():
  1. embed_query() → 384-dim vector of the question
  2. vectorstore.query_collection() → top_k*2 nearest chunks (cosine)
  3. _parse_results() → convert to SourceDocument objects
  4. _rerank() → length penalty, dedup, score filter, trim to top_k
  5. _assemble_context() → format "[Source N] filename\ncontent"
  6. Build RAG_PROMPT_TEMPLATE with context + question
  7. Return {context, sources[], prompt, num_sources}
  ↓
.NET ChatService.BuildAnswer():
  1. Parse context into individual source blocks
  2. Extract and truncate content (300 chars each)
  3. Format answer with [Source N] references
  4. Save assistant ChatMessage to SQLite
  5. Save SourceCitation records for each source
  ↓
Frontend receives ChatResponse {userMessage, assistantMessage}
  Shows assistant message with expandable source citations
```

---

## 10. Database Schema Design

### Entity Relationship Diagram

```
┌─────────────────────┐
│     Documents        │
├─────────────────────┤
│ PK  Id (string/GUID)│
│     FileName         │
│     FileType         │
│     FileSizeBytes    │
│     FilePath         │
│     ChunkCount       │
│     Status (enum)    │
│     StatusMessage    │
│     UploadedAt       │
│     ProcessedAt      │
└─────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│    ChatSessions      │       │    ChatMessages      │
├─────────────────────┤  1:N  ├─────────────────────┤
│ PK  Id (string/GUID)│◄──────│ PK  Id (string/GUID)│
│     Title            │       │ FK  SessionId        │
│     CreatedAt        │       │     Role             │
│     UpdatedAt        │       │     Content          │
└─────────────────────┘       │     Timestamp        │
                               └──────────┬──────────┘
                                          │ 1:N
                               ┌──────────▼──────────┐
                               │  SourceCitations     │
                               ├─────────────────────┤
                               │ PK  Id (string/GUID)│
                               │ FK  MessageId        │
                               │ FK  DocumentId       │
                               │     ChunkId          │
                               │     Content          │
                               │     FileName         │
                               │     ChunkIndex       │
                               │     Score            │
                               └─────────────────────┘
```

### Indexes

| Table | Column(s) | Rationale |
|-------|-----------|-----------|
| Documents | FileName | Fast lookup by name |
| Documents | Status | Filter by processing state |
| Documents | UploadedAt | Sort by upload time |
| ChatSessions | UpdatedAt | Sort sessions by recency |
| ChatMessages | SessionId | Efficient message retrieval per session |
| ChatMessages | Timestamp | Chronological ordering |
| SourceCitations | MessageId | Fast citation lookup per message |
| SourceCitations | DocumentId | Find all citations referencing a document |

---

## 11. Infrastructure & Deployment

### Docker Compose Architecture

```yaml
Services:
  frontend:    # Port 3001 - Nginx serving React SPA + API proxy
  backend:     # Port 5001 - .NET 8 Web API
  rag-engine:  # Port 8000 - Python FastAPI

Volumes:
  backend-data:   # SQLite database persistence
  chroma-data:    # ChromaDB vector store persistence
  uploaded-docs:  # Shared between backend and rag-engine
```

### Service Dependencies

```
frontend → backend → rag-engine
```

The frontend depends on the backend; the backend depends on the RAG engine. Docker Compose `depends_on` ensures correct startup order.

### Shared Volume Strategy

The `uploaded-docs` volume is mounted in both the backend and RAG engine containers:
- **Backend** saves uploaded files to this volume
- **RAG engine** reads files from this volume during processing

This eliminates the need to transfer file contents over HTTP.

---

## 12. Security Considerations

### Current Implementation

| Area | Status | Details |
|------|--------|---------|
| File Upload Validation | Implemented | Extension whitelist (.pdf/.docx/.txt/.md), 50MB size limit |
| CORS | Permissive | Allows any origin (development mode) |
| SQL Injection | Protected | Entity Framework Core parameterized queries |
| Path Traversal | Partial | File saved with generated GUID name, but upload directory not sandboxed |
| Authentication | Not Implemented | All endpoints are public |
| Rate Limiting | Not Implemented | No request throttling |
| Input Sanitization | Partial | File content is treated as data, not executable |

### Production Recommendations

See the Developer Use Case document for detailed production security hardening steps.

---

## 13. Performance Characteristics

### Embedding Generation

| Document Size | Chunks (512 char) | Embedding Time (CPU) | Embedding Time (GPU) |
|--------------|-------------------|---------------------|---------------------|
| 10 KB | ~20 | ~2 seconds | ~0.5 seconds |
| 100 KB | ~200 | ~15 seconds | ~3 seconds |
| 1 MB | ~2,000 | ~2 minutes | ~20 seconds |
| 10 MB | ~20,000 | ~15 minutes | ~3 minutes |

### Query Latency

| Component | Typical Latency |
|-----------|----------------|
| Query embedding | 10-50 ms |
| ChromaDB HNSW search | 5-20 ms |
| Reranking | 1-5 ms |
| Context assembly | 1-2 ms |
| Answer building (.NET) | 5-10 ms |
| **Total (without LLM)** | **~30-100 ms** |
| **Total (with LLM)** | **~1-5 seconds** (depends on provider) |

### Storage Requirements

| Component | Storage Per 1000 Chunks |
|-----------|------------------------|
| ChromaDB (vectors + metadata) | ~10-15 MB |
| SQLite (metadata) | ~1 MB |
| Uploaded files | Varies (original file sizes) |

---

*This document describes the complete development process and architecture of the DocuMind RAG system. For deployment, optimization, and production guidance, refer to the Developer Use Case document.*
