# DocuMind RAG

**Intelligent Document Q&A with Retrieval-Augmented Generation**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6F61)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[Live Demo](https://documind-rag-wheat.vercel.app)** | **[Deploy Backend to Render](https://render.com/deploy?repo=https://github.com/MusaevAkobirSanokulUgli/DocuMind-RAG)**

Upload documents (PDF, DOCX, TXT, Markdown), ask questions in natural language, and get accurate answers with source citations — powered by local embeddings and a RAG pipeline.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  React Frontend (Vite + Tailwind)           │
│  • Chat interface with citations            │
│  • Document upload & management             │
│  • Knowledge base browser                   │
│  • Analytics dashboard (Recharts)           │
└────────────────────┬────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────┐
│  .NET 9 Web API                             │
│  • Document metadata (SQLite / EF Core)     │
│  • Chat session management                  │
│  • Swagger documentation                    │
└────────────────────┬────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────┐
│  Python RAG Engine (FastAPI)                │
│  • sentence-transformers (all-MiniLM-L6-v2) │
│  • ChromaDB vector store                    │
│  • DeepSeek LLM for answer generation       │
└─────────────────────────────────────────────┘
```

## How RAG Works

```
Document ─→ Chunk ─→ Embed ─→ Store (ChromaDB)
                                    │
Question ─→ Embed ─→ Search ────────┘
                        │
                  Top-K Chunks ─→ LLM ─→ Answer + Citations
```

1. **Ingest**: Upload PDF/DOCX/TXT/MD → extract text → recursive chunking → embed with sentence-transformers → store vectors in ChromaDB
2. **Query**: Embed question → vector similarity search → retrieve top-K chunks with scores
3. **Generate**: Assemble context + question → DeepSeek LLM → answer with `[Source N]` citations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| **Backend** | .NET 9 Web API, Entity Framework Core, SQLite |
| **RAG Engine** | Python, FastAPI, sentence-transformers, ChromaDB |
| **Embeddings** | all-MiniLM-L6-v2 (384-dim, runs locally — no API calls) |
| **LLM** | DeepSeek API (OpenAI-compatible) |
| **Containerization** | Docker, Docker Compose |

## Features

- **Multi-format upload**: PDF, DOCX, TXT, Markdown with drag-and-drop
- **Local embeddings**: sentence-transformers runs on CPU — no external API calls for embedding
- **Chat with citations**: ChatGPT-style conversation with `[Source N]` references
- **Knowledge base browser**: View all documents, inspect individual chunks, semantic search
- **Analytics dashboard**: Query volume, popular documents, response quality metrics
- **Configurable RAG**: Chunk size, overlap, top-K, score thresholds via settings

## Quick Start

### Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with your DeepSeek API key

docker compose up --build

# Frontend:    http://localhost:3100
# Backend:     http://localhost:5100/swagger
# RAG Engine:  http://localhost:8000/docs
```

### Manual Setup

```bash
# 1. RAG Engine
cd rag-engine
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
DEEPSEEK_API_KEY=sk-... python main.py

# 2. Backend
cd backend/DocuMind.Api && dotnet run

# 3. Frontend
cd frontend && npm install && npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPSEEK_API_KEY` | DeepSeek LLM API key | — |
| `DEEPSEEK_BASE_URL` | LLM API base URL | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | LLM model name | `deepseek-chat` |
| `EMBEDDING_MODEL` | Sentence-transformers model | `all-MiniLM-L6-v2` |
| `CHUNK_SIZE` | Text chunk size (chars) | `512` |
| `CHUNK_OVERLAP` | Chunk overlap (chars) | `50` |
| `TOP_K` | Number of retrieved chunks | `5` |
| `CHROMA_PERSIST_DIR` | ChromaDB storage path | `./data/chromadb` |

## API Endpoints

### .NET Backend

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/documents/upload` | Upload and process a document |
| GET | `/api/documents` | List all documents |
| DELETE | `/api/documents/{id}` | Delete a document |
| POST | `/api/chat/sessions` | Create chat session |
| POST | `/api/chat/sessions/{id}/messages` | Send message (RAG query) |
| GET | `/api/knowledgebase/stats` | Knowledge base statistics |
| POST | `/api/knowledgebase/search` | Semantic search |
| GET | `/api/analytics/overview` | Analytics overview |

### RAG Engine (FastAPI)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/process` | Process document (chunk + embed + store) |
| POST | `/upload-and-process` | Upload file directly to RAG engine |
| POST | `/query` | RAG query (embed + search + context) |
| GET | `/collections` | List vector store collections |
| GET | `/chunks/{doc_id}` | Get document chunks |
| DELETE | `/chunks/{doc_id}` | Delete document chunks |
| GET | `/health` | Health check |

## Project Structure

```
DocuMind-RAG/
├── frontend/               # React + Vite + Tailwind
│   ├── src/pages/          # Chat, Upload, KnowledgeBase, Analytics, Settings
│   ├── src/components/     # UI components
│   └── src/lib/            # API client & types
├── backend/                # .NET 9 Web API
│   └── DocuMind.Api/
│       ├── Controllers/    # Documents, Chat, KnowledgeBase, Analytics
│       ├── Models/         # Document, ChatSession, ChatMessage, SourceCitation
│       ├── Services/       # DocumentProcessing, RagEngineClient, Chat
│       └── Data/           # EF Core DbContext
├── rag-engine/             # Python FastAPI
│   ├── main.py             # API endpoints
│   ├── document_loaders.py # PDF/DOCX/TXT/MD support
│   ├── text_splitter.py    # Recursive text chunking
│   ├── embeddings.py       # sentence-transformers
│   ├── vectorstore.py      # ChromaDB operations
│   ├── retriever.py        # RAG retrieval pipeline
│   └── llm.py              # DeepSeek LLM client
├── nginx/                  # Reverse proxy config
├── docs/                   # Architecture documentation
└── docker-compose.yml
```

## License

MIT
