# DocuMind RAG System - Developer Use Case Guide

> **Version**: 1.0.0
> **Architecture**: Retrieval-Augmented Generation (RAG)
> **Date**: March 2026
> **Audience**: Developers, DevOps Engineers, System Administrators

---

## Table of Contents

1. [Quick Start Guide](#1-quick-start-guide)
2. [Local Development Setup](#2-local-development-setup)
3. [Running the Project](#3-running-the-project)
4. [Project Structure Deep Dive](#4-project-structure-deep-dive)
5. [API Reference](#5-api-reference)
6. [Optimization Opportunities](#6-optimization-opportunities)
7. [Adding an LLM Provider](#7-adding-an-llm-provider)
8. [Production Deployment](#8-production-deployment)
9. [Required Production Services](#9-required-production-services)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Scaling Strategy](#11-scaling-strategy)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Quick Start Guide

### Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.20+ | Multi-service orchestration |
| Node.js | 20.x LTS | Frontend development |
| .NET SDK | 8.0 | Backend development |
| Python | 3.11+ | RAG engine development |

### One-Command Launch (Docker)

```bash
cd project-2-rag-documind
docker compose up --build
```

This starts all three services:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001 (Swagger: http://localhost:5001/swagger)
- **RAG Engine**: http://localhost:8000 (Docs: http://localhost:8000/docs)

### First Run Notes

- The first startup will download the `all-MiniLM-L6-v2` model (~80 MB). This happens once and is cached in the container volume.
- PyTorch installation during Docker build may take 5-10 minutes depending on network speed.
- The SQLite database is auto-created on first backend startup.

---

## 2. Local Development Setup

### 2.1 RAG Engine (Python)

```bash
cd rag-engine

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
# .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Environment Variables**:
```bash
export CHROMA_PERSIST_DIR=./chroma_data     # Vector database storage
export UPLOAD_DIR=./uploads                  # Document storage
export EMBEDDING_MODEL=all-MiniLM-L6-v2     # Sentence transformer model
export CHUNK_SIZE=512                        # Default chunk size
export CHUNK_OVERLAP=50                      # Default chunk overlap
export TOP_K=5                               # Default retrieval count
export HOST=0.0.0.0
export PORT=8000
```

### 2.2 Backend (.NET)

```bash
cd backend/DocuMind.Api

# Restore packages
dotnet restore

# Run the server
dotnet run
# Server starts at http://localhost:5001
```

**appsettings.Development.json** overrides:
```json
{
  "RagEngine": {
    "BaseUrl": "http://localhost:8000"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=documind.db"
  }
}
```

### 2.3 Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
# Server starts at http://localhost:3001
```

The Vite dev server proxies `/api` requests to `http://localhost:5001` automatically.

### 2.4 Running All Services Locally

Open three terminal windows:

```bash
# Terminal 1: RAG Engine
cd rag-engine && source venv/bin/activate && uvicorn main:app --port 8000 --reload

# Terminal 2: Backend
cd backend/DocuMind.Api && dotnet run

# Terminal 3: Frontend
cd frontend && npm run dev
```

---

## 3. Running the Project

### 3.1 Basic Workflow

1. **Upload Documents**: Navigate to `/upload`, drag and drop PDF/DOCX/TXT/MD files
2. **Wait for Processing**: The system extracts text, chunks it, generates embeddings, and stores vectors
3. **Ask Questions**: Navigate to `/chat`, type a question about your documents
4. **Review Sources**: Click on source citations to see the exact document chunks used
5. **Browse Knowledge Base**: Navigate to `/knowledge-base` to explore chunks and search semantically
6. **View Analytics**: Navigate to `/analytics` to see usage patterns and metrics

### 3.2 Testing the RAG Pipeline Directly

You can test the RAG engine independently:

```bash
# Health check
curl http://localhost:8000/health

# Process a document
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"file_path": "./uploads/test.txt", "document_id": "doc-001", "file_name": "test.txt"}'

# Query the knowledge base
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the main topic?", "top_k": 5, "score_threshold": 0.3}'

# List collections
curl http://localhost:8000/collections

# View chunks for a document
curl http://localhost:8000/chunks/doc-001
```

### 3.3 Testing the Backend API

```bash
# Upload a document
curl -X POST http://localhost:5001/api/documents/upload \
  -F "file=@/path/to/document.pdf"

# Create a chat session
curl -X POST http://localhost:5001/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Session"}'

# Send a message (replace {sessionId} with actual ID)
curl -X POST http://localhost:5001/api/chat/sessions/{sessionId}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "What are the key findings?"}'

# View analytics
curl http://localhost:5001/api/analytics/overview
```

---

## 4. Project Structure Deep Dive

```
project-2-rag-documind/
│
├── docker-compose.yml           # Multi-service orchestration
├── README.md                    # Project overview
│
├── rag-engine/                  # Python RAG Pipeline
│   ├── main.py                  # FastAPI endpoints (268 lines)
│   ├── config.py                # Environment configuration
│   ├── models.py                # Pydantic request/response schemas
│   ├── document_loaders.py      # PDF, DOCX, TXT, MD extractors
│   ├── text_splitter.py         # Recursive character splitter (160 lines)
│   ├── embeddings.py            # sentence-transformers wrapper
│   ├── vectorstore.py           # ChromaDB operations (223 lines)
│   ├── retriever.py             # Search + rerank pipeline (152 lines)
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile
│
├── backend/                     # .NET 8 API
│   ├── DocuMind.sln
│   └── DocuMind.Api/
│       ├── Program.cs           # DI composition root
│       ├── appsettings.json     # Configuration
│       ├── Controllers/         # 4 API controllers
│       ├── Models/              # 4 entity models + DTOs
│       ├── Data/                # EF Core DbContext
│       ├── Services/            # 3 business services
│       └── Dockerfile
│
├── frontend/                    # React SPA
│   ├── index.html
│   ├── vite.config.ts           # Vite + API proxy config
│   ├── tailwind.config.ts       # Custom theme
│   └── src/
│       ├── App.tsx              # Router
│       ├── lib/                 # API client + types
│       ├── pages/               # 5 page components
│       └── components/          # 12 UI components
│
└── docs/                        # Documentation
    ├── 01-Development-Process-and-Architecture.md
    └── 02-Developer-Use-Case-Guide.md
```

---

## 5. API Reference

### RAG Engine (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + model/collection status |
| `POST` | `/process` | Process a document (chunk + embed + store) |
| `POST` | `/upload-and-process` | Upload file + process in one call |
| `POST` | `/query` | RAG query (embed + search + rerank + build context) |
| `GET` | `/collections` | List all ChromaDB collections |
| `GET` | `/chunks/{document_id}` | Get all chunks for a document |
| `DELETE` | `/chunks/{document_id}` | Delete all chunks for a document |
| `DELETE` | `/collection/{name}` | Delete an entire collection |

### Backend API (Port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents/upload` | Upload and process a document |
| `GET` | `/api/documents` | List all documents |
| `GET` | `/api/documents/{id}` | Get document details |
| `DELETE` | `/api/documents/{id}` | Delete document + chunks + file |
| `POST` | `/api/chat/sessions` | Create a new chat session |
| `GET` | `/api/chat/sessions` | List all sessions |
| `GET` | `/api/chat/sessions/{id}` | Get session with messages |
| `DELETE` | `/api/chat/sessions/{id}` | Delete a session |
| `POST` | `/api/chat/sessions/{id}/messages` | Send message (triggers RAG) |
| `GET` | `/api/chat/sessions/{id}/messages` | Get message history |
| `GET` | `/api/knowledgebase/collections` | Browse collections |
| `GET` | `/api/knowledgebase/chunks/{docId}` | View document chunks |
| `GET` | `/api/knowledgebase/stats` | Knowledge base statistics |
| `POST` | `/api/knowledgebase/search` | Semantic search |
| `GET` | `/api/analytics/overview` | Dashboard metrics |
| `GET` | `/api/analytics/query-volume` | Daily query counts |
| `GET` | `/api/analytics/popular-documents` | Most cited documents |
| `GET` | `/api/analytics/response-quality` | Quality metrics |
| `GET` | `/api/analytics/document-types` | Document type distribution |
| `GET` | `/api/analytics/recent-activity` | Recent activity feed |

---

## 6. Optimization Opportunities

### 6.1 RAG Pipeline Optimizations

#### A. Add Cross-Encoder Reranking (High Impact)

**Where**: `rag-engine/retriever.py` — `_rerank()` function

**Current**: Score-based reranking using cosine distance with length penalties.
**Improvement**: Add a cross-encoder model for semantic reranking.

```python
# Add to requirements.txt:
# sentence-transformers (already included - cross-encoder models are part of it)

# In retriever.py, add:
from sentence_transformers import CrossEncoder

_reranker = None

def get_reranker():
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    return _reranker

def _rerank(sources, query, top_k):
    reranker = get_reranker()
    pairs = [(query, src.content) for src in sources]
    scores = reranker.predict(pairs)
    for src, score in zip(sources, scores):
        src.score = float(score)
    sources.sort(key=lambda x: x.score, reverse=True)
    return sources[:top_k]
```

**Impact**: 20-40% improvement in retrieval relevance for complex queries.

#### B. Implement Hybrid Search (High Impact)

**Where**: `rag-engine/vectorstore.py` and `rag-engine/retriever.py`

**Current**: Pure vector (semantic) search only.
**Improvement**: Combine BM25 keyword search with vector search.

```python
# Add to requirements.txt:
# rank-bm25==0.2.2

# In retriever.py, add hybrid search:
from rank_bm25 import BM25Okapi

def hybrid_search(query, top_k=5, alpha=0.5):
    # Semantic search
    semantic_results = vector_search(query, top_k * 2)

    # BM25 keyword search
    corpus = [doc.content for doc in all_chunks]
    tokenized_corpus = [doc.split() for doc in corpus]
    bm25 = BM25Okapi(tokenized_corpus)
    bm25_scores = bm25.get_scores(query.split())

    # Reciprocal Rank Fusion
    combined = reciprocal_rank_fusion(semantic_results, bm25_results, alpha)
    return combined[:top_k]
```

**Impact**: Handles both semantic queries ("explain the architecture") and keyword queries ("error code 404") effectively.

#### C. Upgrade Embedding Model (Medium Impact)

**Where**: `rag-engine/config.py` — `EMBEDDING_MODEL` setting

**Current**: `all-MiniLM-L6-v2` (384 dimensions, 22.7M parameters)
**Options**:

| Model | Dimensions | Parameters | Performance | Speed |
|-------|-----------|------------|-------------|-------|
| `all-MiniLM-L6-v2` (current) | 384 | 22.7M | Good | Fast |
| `all-mpnet-base-v2` | 768 | 110M | Better | Medium |
| `BAAI/bge-large-en-v1.5` | 1024 | 335M | Best | Slower |
| `nomic-ai/nomic-embed-text-v1.5` | 768 | 137M | Best (2024) | Medium |

To switch, update `config.py`:
```python
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")
```

**Note**: Changing the model requires re-processing all existing documents.

#### D. Async Document Processing (Medium Impact)

**Where**: `backend/DocuMind.Api/Services/DocumentProcessingService.cs`

**Current**: Synchronous — the upload request blocks until processing completes.
**Improvement**: Background processing with status polling.

```csharp
// Add to Program.cs:
builder.Services.AddHostedService<DocumentProcessingBackgroundService>();
builder.Services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();

// In DocumentProcessingService:
public async Task<DocumentUploadResponse> UploadAsync(IFormFile file)
{
    // Save file and create record immediately
    var doc = CreateDocumentRecord(file);

    // Queue processing for background execution
    _taskQueue.QueueBackgroundWorkItem(async token =>
    {
        await ProcessDocumentAsync(doc.Id, token);
    });

    return new DocumentUploadResponse { Id = doc.Id, Status = "Processing" };
}
```

**Impact**: Upload API returns immediately; frontend polls for status.

#### E. Chunk Strategy Optimization (Medium Impact)

**Where**: `rag-engine/text_splitter.py`

**Improvements**:
1. **Semantic chunking**: Use sentence boundaries from NLP (spaCy) instead of character counts
2. **Document-aware chunking**: Respect headers/sections in structured documents
3. **Adaptive chunk sizing**: Larger chunks for narrative text, smaller for lists/tables

```python
# Add to requirements.txt:
# spacy==3.7.2

import spacy
nlp = spacy.load("en_core_web_sm")

def semantic_split(text, max_tokens=256):
    doc = nlp(text)
    chunks = []
    current_chunk = []
    current_length = 0

    for sent in doc.sents:
        if current_length + len(sent.text) > max_tokens * 4:  # ~4 chars per token
            chunks.append(" ".join(current_chunk))
            current_chunk = [sent.text]
            current_length = len(sent.text)
        else:
            current_chunk.append(sent.text)
            current_length += len(sent.text)

    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks
```

### 6.2 Frontend Optimizations

#### A. Wire Settings to API Calls

**Where**: `frontend/src/pages/Upload.tsx` (line ~130) and `frontend/src/pages/Chat.tsx` (line ~80)

**Current**: Settings page saves to `localStorage` but upload and chat use hardcoded defaults.

```typescript
// In Upload.tsx, replace hardcoded values:
const settings = JSON.parse(localStorage.getItem('documind-settings') || '{}');
const response = await api.uploadDocument(file, {
  chunkSize: settings.chunkSize || 512,
  chunkOverlap: settings.chunkOverlap || 50,
});

// In Chat.tsx, when sending message:
const settings = JSON.parse(localStorage.getItem('documind-settings') || '{}');
const response = await api.sendMessage(sessionId, content, {
  topK: settings.topK || 5,
  scoreThreshold: (settings.scoreThreshold || 0) / 100,
});
```

#### B. Add Streaming Responses

**Where**: `frontend/src/pages/Chat.tsx` and `backend/DocuMind.Api/Controllers/ChatController.cs`

Implement Server-Sent Events (SSE) for streaming answer generation:

```typescript
// Frontend: Use EventSource for streaming
const eventSource = new EventSource(`/api/chat/sessions/${sessionId}/stream`);
eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  setMessages(prev => appendToLastMessage(prev, chunk.content));
};
```

#### C. Virtual Scrolling for Large Chat History

**Where**: `frontend/src/components/chat/ChatHistory.tsx`

Use `react-virtualized` or `@tanstack/react-virtual` for sessions with 1000+ messages.

### 6.3 Backend Optimizations

#### A. Add Response Caching

**Where**: `backend/DocuMind.Api/Controllers/ChatController.cs`

Cache frequently asked questions:

```csharp
// Add to Program.cs:
builder.Services.AddMemoryCache();

// In ChatService:
public async Task<ChatResponse> SendMessageAsync(string sessionId, string content)
{
    var cacheKey = $"rag_query_{ComputeHash(content)}";
    if (_cache.TryGetValue(cacheKey, out RagQueryResponse cached))
        return BuildResponse(cached);

    var result = await _ragClient.QueryAsync(content);
    _cache.Set(cacheKey, result, TimeSpan.FromMinutes(30));
    return BuildResponse(result);
}
```

#### B. Add Database Indexing

**Where**: `backend/DocuMind.Api/Data/AppDbContext.cs`

Add composite indexes for common query patterns:

```csharp
// In OnModelCreating:
modelBuilder.Entity<ChatMessage>()
    .HasIndex(m => new { m.SessionId, m.Timestamp })
    .HasDatabaseName("IX_ChatMessage_Session_Time");

modelBuilder.Entity<SourceCitation>()
    .HasIndex(c => new { c.MessageId, c.Score })
    .HasDatabaseName("IX_SourceCitation_Message_Score");
```

---

## 7. Adding an LLM Provider

The system is pre-architected for LLM integration. The RAG engine returns a ready-to-use `prompt` field.

### 7.1 Option A: OpenAI Integration

**Where**: `rag-engine/retriever.py` or new file `rag-engine/llm_provider.py`

```python
# llm_provider.py
import openai
import os

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_answer(prompt: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1000,
    )
    return response.choices[0].message.content
```

**Update `main.py`**:
```python
@app.post("/query")
async def query(request: QueryRequest):
    result = retrieve_and_build_context(request.query, request.top_k, request.score_threshold)

    if os.getenv("OPENAI_API_KEY"):
        from llm_provider import generate_answer
        result["answer"] = await generate_answer(result["prompt"])

    return result
```

### 7.2 Option B: Claude API Integration

```python
# llm_provider.py
import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def generate_answer(prompt: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

### 7.3 Option C: Local LLM (Ollama)

```python
# llm_provider.py
import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

async def generate_answer(prompt: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": "llama3.2", "prompt": prompt, "stream": False},
            timeout=60,
        )
        return response.json()["response"]
```

### 7.4 Update .NET Backend

**Where**: `backend/DocuMind.Api/Services/ChatService.cs` — `BuildAnswer()` method

```csharp
private string BuildAnswer(RagQueryResponse ragResponse)
{
    // If RAG engine returned an LLM-generated answer, use it
    if (!string.IsNullOrEmpty(ragResponse.Answer))
        return ragResponse.Answer;

    // Otherwise, fall back to context extraction (current behavior)
    return BuildAnswerFromContext(ragResponse.Context, ragResponse.Sources);
}
```

---

## 8. Production Deployment

### 8.1 Deployment Architecture

```
                    ┌──────────────┐
                    │   Cloudflare  │
                    │   CDN / WAF   │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐
                    │   Nginx /    │
                    │   Traefik    │
                    │  (Reverse    │
                    │   Proxy)     │
                    └──┬────┬──┬──┘
                       │    │  │
          ┌────────────┘    │  └────────────┐
          │                 │               │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
   │  Frontend   │  │  Backend    │  │  RAG Engine │
   │  (Static)   │  │  (.NET 8)  │  │  (Python)   │
   │  Nginx/S3   │  │  Container  │  │  Container  │
   └─────────────┘  └──────┬──────┘  └──────┬──────┘
                           │                 │
                    ┌──────▼──────┐  ┌───────▼──────┐
                    │ PostgreSQL  │  │   ChromaDB   │
                    │ (metadata)  │  │  (vectors)   │
                    └─────────────┘  └──────────────┘
```

### 8.2 Production Docker Compose

```yaml
version: '3.9'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3001:80"
    depends_on:
      - backend
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5001:5001"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Data Source=/data/documind.db
      - RagEngine__BaseUrl=http://rag-engine:8000
      - Storage__UploadDirectory=/uploads
    volumes:
      - backend-data:/data
      - uploaded-docs:/uploads
    depends_on:
      - rag-engine
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M

  rag-engine:
    build:
      context: ./rag-engine
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - CHROMA_PERSIST_DIR=/data/chroma
      - UPLOAD_DIR=/uploads
      - EMBEDDING_MODEL=all-MiniLM-L6-v2
    volumes:
      - chroma-data:/data/chroma
      - uploaded-docs:/uploads
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G   # sentence-transformers + PyTorch needs ~1.5 GB
        reservations:
          memory: 1G

volumes:
  backend-data:
  chroma-data:
  uploaded-docs:
```

### 8.3 Cloud Deployment Options

#### Option A: AWS (Recommended for Scale)

| Component | AWS Service | Rationale |
|-----------|------------|-----------|
| Frontend | S3 + CloudFront | Static hosting with global CDN |
| Backend API | ECS Fargate or App Runner | Serverless containers |
| RAG Engine | ECS Fargate (GPU optional) | ML workload with memory requirements |
| Database | RDS PostgreSQL | Managed relational DB |
| Vector Store | OpenSearch or Pinecone | Managed vector search |
| File Storage | S3 | Scalable document storage |
| Load Balancer | ALB | Application-level routing |
| Secrets | AWS Secrets Manager | API keys, connection strings |

**Setup Steps**:
1. Create ECR repositories for backend and rag-engine images
2. Push images: `docker build -t documind-backend . && docker tag documind-backend:latest {account}.dkr.ecr.{region}.amazonaws.com/documind-backend:latest && docker push ...`
3. Create ECS cluster with Fargate launch type
4. Create task definitions for each service
5. Create ALB with target groups for backend (5001) and rag-engine (8000)
6. Deploy frontend to S3 + CloudFront
7. Configure environment variables in task definitions

#### Option B: Azure

| Component | Azure Service |
|-----------|--------------|
| Frontend | Azure Static Web Apps |
| Backend API | Azure Container Apps |
| RAG Engine | Azure Container Apps (with GPU) |
| Database | Azure SQL or Cosmos DB |
| Vector Store | Azure AI Search |
| File Storage | Azure Blob Storage |

#### Option C: Google Cloud

| Component | GCP Service |
|-----------|-------------|
| Frontend | Firebase Hosting or Cloud CDN |
| Backend API | Cloud Run |
| RAG Engine | Cloud Run (with GPU) |
| Database | Cloud SQL (PostgreSQL) |
| Vector Store | Vertex AI Vector Search |
| File Storage | Cloud Storage |

#### Option D: Self-Hosted (Kubernetes)

```yaml
# k8s/deployment-rag-engine.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rag-engine
spec:
  replicas: 2
  selector:
    matchLabels:
      app: rag-engine
  template:
    spec:
      containers:
      - name: rag-engine
        image: documind/rag-engine:latest
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: chroma-data
          mountPath: /data/chroma
      volumes:
      - name: chroma-data
        persistentVolumeClaim:
          claimName: chroma-pvc
```

### 8.4 Production Environment Variables

```bash
# Backend (.NET)
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection="Host=db.example.com;Database=documind;Username=app;Password=..."
RagEngine__BaseUrl=http://rag-engine:8000
Storage__UploadDirectory=/uploads
Jwt__SecretKey=your-256-bit-secret
Jwt__Issuer=documind-api
AllowedOrigins=https://documind.example.com

# RAG Engine (Python)
CHROMA_PERSIST_DIR=/data/chroma
UPLOAD_DIR=/uploads
EMBEDDING_MODEL=all-MiniLM-L6-v2
OPENAI_API_KEY=sk-...           # Optional: for LLM-generated answers
ANTHROPIC_API_KEY=sk-ant-...     # Optional: for Claude integration
```

---

## 9. Required Production Services

### 9.1 Database Upgrade: SQLite → PostgreSQL

**Why**: SQLite doesn't support concurrent writes, which is critical for production multi-user scenarios.

**Where to change**:

1. **NuGet Package**: Replace `Microsoft.EntityFrameworkCore.Sqlite` with `Npgsql.EntityFrameworkCore.PostgreSQL`

```xml
<!-- backend/DocuMind.Api/DocuMind.Api.csproj -->
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.11" />
```

2. **Program.cs**: Update DbContext registration

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```

3. **Connection String**: Update `appsettings.Production.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=documind;Username=documind_app;Password=secure_password"
  }
}
```

### 9.2 Vector Database Upgrade: ChromaDB → Managed Service

**For small-medium scale (< 1M vectors)**: Keep ChromaDB with persistent storage on a dedicated volume.

**For large scale (> 1M vectors)**: Migrate to a managed vector database.

| Service | Pricing | Max Vectors | Features |
|---------|---------|-------------|----------|
| Pinecone | Free tier: 100K vectors | Billions | Managed, serverless, metadata filtering |
| Weaviate Cloud | Free tier: 50K | Millions | Open-source, hybrid search |
| Qdrant Cloud | Free tier: 1M | Billions | High performance, filtering |
| Azure AI Search | Pay-per-use | Millions | Integrated with Azure ecosystem |
| AWS OpenSearch | Pay-per-use | Billions | k-NN plugin, managed service |

**Migration Example (Pinecone)**:

```python
# vectorstore.py - Replace ChromaDB with Pinecone
import pinecone

pinecone.init(api_key=os.getenv("PINECONE_API_KEY"), environment="us-east-1")
index = pinecone.Index("documind")

def add_chunks(chunks, embeddings, document_id, file_name):
    vectors = [
        (f"{document_id}_chunk_{c.chunk_index}", emb, {
            "document_id": document_id,
            "file_name": file_name,
            "chunk_index": c.chunk_index,
            "content": c.content,
        })
        for c, emb in zip(chunks, embeddings)
    ]
    index.upsert(vectors=vectors, batch_size=100)

def query_collection(query_embedding, top_k=5):
    results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
    return results
```

### 9.3 Authentication & Authorization

**Where to add**: `backend/DocuMind.Api/`

**Option A: JWT Authentication**

1. Install package: `dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer`

2. Add to `Program.cs`:
```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]))
        };
    });

app.UseAuthentication();
app.UseAuthorization();
```

3. Add `[Authorize]` attribute to controllers.

**Option B: OAuth2 / Auth0 / Clerk**

Use a managed authentication provider for enterprise deployment. Add the provider's SDK and middleware to Program.cs.

### 9.4 File Storage Upgrade: Local → Cloud

**Where to change**: `backend/DocuMind.Api/Services/DocumentProcessingService.cs`

```csharp
// Replace local file operations with cloud storage
public interface IFileStorageService
{
    Task<string> UploadAsync(IFormFile file, string fileName);
    Task<Stream> DownloadAsync(string filePath);
    Task DeleteAsync(string filePath);
}

// AWS S3 implementation
public class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public async Task<string> UploadAsync(IFormFile file, string fileName)
    {
        using var stream = file.OpenReadStream();
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = $"documents/{fileName}",
            InputStream = stream,
        };
        await _s3Client.PutObjectAsync(request);
        return $"s3://{_bucketName}/documents/{fileName}";
    }
}
```

### 9.5 CORS Hardening

**Where**: `backend/DocuMind.Api/Program.cs`

```csharp
// Replace AllowAnyOrigin with specific origins
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});
```

### 9.6 Rate Limiting

**Where**: `backend/DocuMind.Api/Program.cs`

```csharp
// .NET 8 built-in rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", config =>
    {
        config.PermitLimit = 100;
        config.Window = TimeSpan.FromMinutes(1);
        config.QueueLimit = 10;
    });
    options.AddFixedWindowLimiter("upload", config =>
    {
        config.PermitLimit = 10;
        config.Window = TimeSpan.FromMinutes(1);
    });
});

app.UseRateLimiter();
```

---

## 10. Monitoring & Observability

### 10.1 Logging

**Backend (.NET)**: Add Serilog for structured logging:

```csharp
// Install: dotnet add package Serilog.AspNetCore
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration)
          .WriteTo.Console()
          .WriteTo.File("logs/documind-.log", rollingInterval: RollingInterval.Day)
          .WriteTo.Seq("http://seq-server:5341"));  // Optional: Seq log aggregator
```

**RAG Engine (Python)**: Already uses Python logging; upgrade to structured:

```python
# Add to requirements.txt: structlog
import structlog
logger = structlog.get_logger()

logger.info("document_processed", document_id=doc_id, chunks=num_chunks, duration_ms=elapsed)
```

### 10.2 Health Checks

**Backend**: Add ASP.NET Core health checks:

```csharp
builder.Services.AddHealthChecks()
    .AddSqlite(connectionString)
    .AddUrlGroup(new Uri("http://rag-engine:8000/health"), "rag-engine");

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

### 10.3 Metrics (Prometheus + Grafana)

**Where to add**: Both backend and RAG engine.

**Backend**: `dotnet add package prometheus-net.AspNetCore`
```csharp
app.UseHttpMetrics();
app.MapMetrics();  // Exposes /metrics endpoint
```

**RAG Engine**: `pip install prometheus-fastapi-instrumentator`
```python
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)
```

### 10.4 Application Performance Monitoring (APM)

| APM Tool | Backend Integration | RAG Engine Integration |
|----------|-------------------|----------------------|
| Datadog | `dd-trace-dotnet` NuGet | `ddtrace` pip package |
| New Relic | `NewRelic.Agent` NuGet | `newrelic` pip package |
| Elastic APM | `Elastic.Apm` NuGet | `elastic-apm-python` pip |
| OpenTelemetry | `OpenTelemetry.*` NuGet | `opentelemetry-*` pip |

---

## 11. Scaling Strategy

### 11.1 Horizontal Scaling

```
                 Load Balancer
                 /     |     \
        Backend-1  Backend-2  Backend-3
                 \     |     /
              Shared PostgreSQL
                      +
        RAG Engine-1  RAG Engine-2
                 \     /
            Shared ChromaDB / Pinecone
```

**Key considerations**:
- **Backend**: Stateless — scale horizontally behind a load balancer
- **RAG Engine**: Stateless for queries — scale horizontally. For document processing, use a job queue to prevent duplicate work
- **ChromaDB**: Single-instance (upgrade to Pinecone/Qdrant for distributed vector search)
- **File Storage**: Move to S3/Blob Storage for shared access

### 11.2 Performance Targets

| Metric | Development | Production Target |
|--------|-------------|-------------------|
| Query latency (p50) | ~100 ms | < 200 ms (without LLM) |
| Query latency (p99) | ~500 ms | < 2 seconds |
| Document processing | ~2 min/MB | < 1 min/MB |
| Concurrent users | 1 | 100+ |
| Vector search (1M docs) | N/A | < 50 ms |
| Upload throughput | 1 file/time | 10 concurrent uploads |

### 11.3 Caching Layers

```
User Query
    ↓
[Redis Cache] ← Check for exact query match (TTL: 30 min)
    ↓ (miss)
[Embedding Cache] ← Check for query embedding (TTL: 1 hour)
    ↓ (miss)
[RAG Pipeline] → Store result in cache
    ↓
Response
```

---

## 12. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Model not found" on startup | First run downloading model | Wait for download; ensure internet access |
| Out of memory (RAG engine) | Large document or many concurrent embeddings | Increase container memory to 2-4 GB; reduce batch_size in embeddings.py |
| "PackageNotFoundError" for .docx | File corruption or wrong format | Verify file is a real .docx (ZIP-based), not renamed .doc |
| Slow document processing | CPU-only embedding generation | Consider GPU instance or pre-process during off-hours |
| Empty search results | Documents not fully processed | Check document status in `/api/documents`; verify chunks in `/api/knowledgebase/chunks/{id}` |
| CORS errors | Frontend origin not allowed | Update CORS policy in Program.cs |
| "Connection refused" to RAG engine | Service not started or wrong URL | Verify `RagEngine__BaseUrl` env var; check container networking |
| ChromaDB lock error | Multiple processes accessing same directory | Ensure only one RAG engine instance uses the same `CHROMA_PERSIST_DIR` |

### Diagnostic Commands

```bash
# Check all service health
curl http://localhost:8000/health    # RAG Engine
curl http://localhost:5001/health    # Backend (if health checks added)

# Check ChromaDB state
curl http://localhost:8000/collections

# Check document processing status
curl http://localhost:5001/api/documents

# View Docker logs
docker compose logs rag-engine --tail 100
docker compose logs backend --tail 100

# Check resource usage
docker stats
```

---

*This document provides comprehensive guidance for running, optimizing, and deploying the DocuMind RAG system to production. For architecture and development details, refer to the Development Process & Architecture document.*
