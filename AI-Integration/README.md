# AI Integration Vibe Coding Knowledge Base

> LLM integration, prompt engineering, embeddings, RAG, AI agents, multimodal AI, observability, UX patterns, and workflow orchestration — structured for AI-assisted development. Feed these files to your AI coding assistant to build AI-powered features by default.

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack multiple files** for complex tasks — the guides cross-reference each other.
4. **Describe what you're building** and the AI now has expert-level AI integration context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| Adding a chatbot to your app | `LLM-Patterns` + `Prompt-Engineering` + `AI-UX-Patterns` |
| Building semantic search | `Embeddings` + `Backend/Database-Design` |
| Chat-with-your-docs feature | `RAG` + `Embeddings` + `LLM-Patterns` + `AI-UX-Patterns` |
| Building an AI agent | `AI-Agents` + `LLM-Patterns` + `Prompt-Engineering` |
| Full RAG pipeline from scratch | `RAG` + `Embeddings` + `Prompt-Engineering` + `Backend/Background-Jobs` |
| Image/audio AI features | `Multimodal-AI` + `LLM-Patterns` + `AI-Workflows` |
| Securing AI endpoints | `LLM-Patterns` + `Prompt-Engineering` + `Security/API-Security` |
| Monitoring AI in production | `AI-Observability` + `LLM-Patterns` + `Backend/Error-Handling-Logging` |
| Batch AI processing pipeline | `AI-Workflows` + `LLM-Patterns` + `Backend/Background-Jobs` |

**Pro tip:** Start every AI feature by pasting `LLM-Patterns` into your AI session. It establishes the Vercel AI SDK patterns that every other guide builds on.

---

## Guides

```
AI-Integration/
├── LLM-Patterns/         → Vercel AI SDK, streaming, structured outputs, tool calling, multi-modal, fallback
├── Prompt-Engineering/    → System prompts, few-shot, chain-of-thought, guardrails, injection defense
├── Embeddings/            → Vector databases, pgvector, similarity search, HNSW indexing, hybrid search
├── RAG/                   → Document ingestion, chunking, retrieval, re-ranking, citations, evaluation
├── AI-Agents/             → ReAct loops, tool architecture, planning, multi-agent, memory, cost control
├── AI-UX-Patterns/        → Streaming chat UI, loading states, markdown rendering, feedback, accessibility
├── AI-Observability/      → Tracing, cost dashboards, quality scoring, drift detection, eval pipelines
├── Multimodal-AI/         → Image generation, vision, speech-to-text, TTS, document OCR, batch processing
└── AI-Workflows/          → Multi-step pipelines, batch operations, map-reduce, moderation, scheduling
```

### [LLM Patterns](./LLM-Patterns/llm-patterns.md)
Vercel AI SDK as the unified interface for OpenAI, Anthropic, and Google. Streaming text responses with `streamText` and `useChat`, structured outputs with `generateObject` and Zod schemas, tool calling with `tool()` and `maxSteps`, multi-modal inputs (images, audio), token management and context window strategies, rate limiting AI endpoints, provider fallback chains, and cost tracking per request. Includes complete streaming chat, structured extraction, and multi-tool assistant implementations.

### [Prompt Engineering](./Prompt-Engineering/prompt-engineering.md)
System prompt architecture (role, context, task, constraints, output format), few-shot example design and dynamic selection, chain-of-thought reasoning for complex tasks, output formatting with specific constraints, role assignment and persona patterns, guardrails and safety layers, prompt injection defense (sanitization, delimiters, output validation), temperature and model parameter tuning, and prompt versioning with A/B testing. Includes production system prompt templates, injection defense middleware, and LLM-as-judge evaluation.

### [Embeddings](./Embeddings/embeddings.md)
What embeddings are and how they enable semantic search, embedding model selection (`text-embedding-3-small` as default), vector database architecture with pgvector (Neon/Supabase), similarity search algorithms (cosine, dot product, Euclidean), HNSW and IVFFlat indexing strategies, hybrid search combining vector similarity with full-text BM25 via Reciprocal Rank Fusion, and batch embedding pipelines with progress tracking. Includes complete pgvector setup with Prisma, semantic search API, and hybrid search implementation.

### [RAG (Retrieval-Augmented Generation)](./RAG/rag.md)
RAG architecture overview (ingest, retrieve, generate), document ingestion pipelines for multiple formats, chunking strategies (fixed-size, recursive, semantic, section-aware), retrieval strategies (top-K, hybrid, multi-query, MMR), re-ranking with Cohere Rerank, context window management and token budgeting, citation and source attribution patterns, and RAG evaluation with RAGAS metrics (faithfulness, relevance, precision, recall). Includes end-to-end RAG pipeline, chat-with-your-docs endpoint, and automated evaluation scripts.

### [AI Agents](./AI-Agents/ai-agents.md)
What makes an agent an agent, the ReAct (Reason + Act) loop, tool calling architecture and design principles (one responsibility, detailed descriptions, structured returns), planning patterns (plan-then-execute), multi-agent systems with supervisor routing, memory management (short-term, working, long-term with pgvector), human-in-the-loop confirmation gates, error recovery, and cost control with budget limits. Includes customer support agent, research agent with planning, multi-agent content pipeline, and agent with persistent memory.

### [AI UX Patterns](./AI-UX-Patterns/ai-ux-patterns.md)
Streaming-first interface design, chat message layout and rendering (full-width rows, not bubbles), loading states and thinking indicators (three-phase: sending → thinking → streaming), stop/regenerate/retry controls, markdown and code rendering with syntax highlighting and copy buttons, progressive object rendering with `useObject`, conversation management and persistence, user feedback collection (thumbs up/down with details), accessibility (ARIA roles, keyboard shortcuts, screen reader support), and empty states with suggested prompts. Includes complete chat page, auto-scrolling container, citation UI, and responsive input with file upload.

### [AI Observability & Evaluation](./AI-Observability/ai-observability.md)
Why AI observability differs from traditional monitoring, request tracing with Langfuse and Helicone, cost tracking and budget alerting per user/endpoint/model, latency monitoring (TTFT, tokens/second, P95), automated quality scoring (quick checks + deep LLM-as-judge evaluation), evaluation datasets and regression testing, drift detection with rolling baseline comparison, user feedback pipelines (collection → analysis → eval cases → improvement), and Slack/PagerDuty alerting. Includes complete observability middleware, cost dashboard API, automated eval runner, and feedback-to-eval conversion.

### [Multimodal AI](./Multimodal-AI/multimodal-ai.md)
Image understanding with vision models (Claude, GPT-4o, Gemini), image generation with DALL-E 3, speech-to-text with OpenAI Whisper (transcription, timestamps, chunking for large files), text-to-speech with OpenAI TTS (voice selection, streaming), document processing and OCR (invoices, receipts, business cards, multi-page PDFs), audio transcription pipelines (meeting notes, podcast summaries), batch image processing with concurrency, and content moderation for uploaded media. Includes product image analyzer with drag-and-drop UI, voice recorder and transcriber, and moderation pipeline.

### [AI Workflows & Pipelines](./AI-Workflows/ai-workflows.md)
Workflows vs agents (when to use each), typed pipeline architecture with composable steps, conditional routing based on AI classification, map-reduce for large documents, batch processing at scale with concurrency and rate limiting, scheduled AI jobs with Vercel Cron, webhook-triggered AI processing, error handling and retry strategies for AI pipelines (rate limits, content policy, token limits), and cost management across batch operations. Includes content moderation pipeline, document processing pipeline, customer feedback analysis, lead enrichment workflow, and multi-step content generation.

---

## Status

Complete — all 9 guides are written and reviewed. Last updated: 2026-03.

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
