# RAG (Retrieval-Augmented Generation)

> Document ingestion, chunking strategies, embedding pipelines, vector retrieval, hybrid search, re-ranking, context window management, citation attribution, and evaluation — the complete architecture for building AI features grounded in your data.

---

## Principles

### 1. RAG Architecture Overview

RAG gives LLMs access to your private data without fine-tuning. Instead of hoping the model knows the answer, you retrieve relevant documents and include them in the prompt. The model generates a response grounded in your actual data.

**The three phases:**

1. **Ingest** — split documents into chunks, embed them, store in a vector database
2. **Retrieve** — when a user asks a question, find the most relevant chunks
3. **Generate** — pass the retrieved chunks + the question to an LLM, get a grounded answer

```
User Question → Embed Query → Vector Search → Retrieved Chunks → LLM → Grounded Answer
```

**Why RAG beats alternatives:**

| Approach | Pros | Cons |
|----------|------|------|
| Fine-tuning | Model "knows" the data | Expensive, slow to update, hallucination risk |
| RAG | Fresh data, citations, lower cost | Retrieval quality matters, latency |
| Long context | Simple, no pipeline | Expensive per query, limited by window |
| RAG + Long context | Best of both | Most complex pipeline |

Use RAG when: your data changes frequently, you need citations, data is larger than the context window, or you need to control which data each user can access.

Use long context (no RAG) when: data fits in the context window (<100K tokens), data rarely changes, and you do not need citations.

### 2. Document Ingestion Pipeline

Ingestion turns raw documents (PDFs, HTML, Markdown, database records) into embedded chunks ready for retrieval.

**Pipeline steps:**

1. **Extract** — convert source format to plain text
2. **Clean** — remove boilerplate, headers/footers, navigation, ads
3. **Chunk** — split into segments of appropriate size
4. **Enrich** — add metadata (source, date, section title, page number)
5. **Embed** — generate vector embeddings
6. **Store** — save chunks with embeddings and metadata to the vector database

```typescript
// lib/rag/ingest.ts
interface RawDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  mimeType: string;
  updatedAt: Date;
}

interface Chunk {
  id: string;
  documentId: string;
  content: string;
  metadata: {
    title: string;
    source: string;
    sourceUrl?: string;
    chunkIndex: number;
    totalChunks: number;
    section?: string;
  };
}

export async function ingestDocument(doc: RawDocument): Promise<Chunk[]> {
  // 1. Clean the content
  const cleaned = cleanContent(doc.content, doc.mimeType);

  // 2. Chunk the content
  const textChunks = chunkText(cleaned, {
    chunkSize: 500,
    chunkOverlap: 50,
    strategy: 'recursive',
  });

  // 3. Create chunk records with metadata
  const chunks: Chunk[] = textChunks.map((text, index) => ({
    id: `${doc.id}-chunk-${index}`,
    documentId: doc.id,
    content: text,
    metadata: {
      title: doc.title,
      source: doc.source,
      sourceUrl: doc.sourceUrl,
      chunkIndex: index,
      totalChunks: textChunks.length,
    },
  }));

  // 4. Embed all chunks
  const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

  // 5. Store in database
  await storeChunks(chunks, embeddings);

  return chunks;
}

function cleanContent(content: string, mimeType: string): string {
  let cleaned = content;

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Remove common boilerplate
  cleaned = cleaned.replace(/^(Copyright|All rights reserved|Terms of).*/gim, '');

  return cleaned.trim();
}
```

**Source format handling:**

- **Markdown/HTML** — strip tags, preserve headings as metadata
- **PDF** — use `pdf-parse` or `@mozilla/readability` for extraction
- **Database records** — concatenate relevant fields with field labels
- **Web pages** — use Mozilla Readability to extract article content
- **Code files** — preserve structure, use language-aware chunking

### 3. Chunking Strategies

Chunking is the most impactful decision in a RAG pipeline. Too large and retrieval is imprecise. Too small and chunks lack context. The right strategy depends on your content type.

**Fixed-size chunking** — split every N tokens with overlap:

```typescript
function fixedSizeChunk(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) chunks.push(chunk);
  }

  return chunks;
}
```

**Recursive character splitting** — split on natural boundaries (paragraphs → sentences → words), trying the largest delimiter first:

```typescript
function recursiveChunk(
  text: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
    separators?: string[];
  } = {}
): string[] {
  const {
    chunkSize = 500,
    chunkOverlap = 50,
    separators = ['\n\n', '\n', '. ', ', ', ' '],
  } = options;

  const chunks: string[] = [];

  function split(text: string, separatorIndex: number): string[] {
    if (text.length <= chunkSize) return [text];
    if (separatorIndex >= separators.length) {
      // Last resort: split by character count
      return fixedSizeChunk(text, chunkSize, chunkOverlap);
    }

    const separator = separators[separatorIndex];
    const parts = text.split(separator);
    const result: string[] = [];
    let current = '';

    for (const part of parts) {
      const candidate = current ? current + separator + part : part;

      if (candidate.split(/\s+/).length > chunkSize) {
        if (current) result.push(current);
        // Recursively split the oversized part with the next separator
        result.push(...split(part, separatorIndex + 1));
        current = '';
      } else {
        current = candidate;
      }
    }

    if (current) result.push(current);
    return result;
  }

  return split(text, 0);
}
```

**Semantic chunking** — split where the topic changes (using embedding similarity between sentences):

Best for heterogeneous documents where a single page covers multiple topics. More expensive (requires embedding each sentence) but produces the most coherent chunks.

**Section-aware chunking** — split on document structure (headings, chapters, sections):

Best for structured content like documentation, technical manuals, and help centers. Preserves the document's natural organization.

**Guidelines:**

| Content Type | Strategy | Chunk Size | Overlap |
|-------------|----------|------------|---------|
| Documentation / help center | Section-aware | 300-500 tokens | 50 tokens |
| Blog posts / articles | Recursive | 400-600 tokens | 50-100 tokens |
| Legal / contracts | Paragraph-based | 200-400 tokens | 100 tokens |
| Code | Function/class boundaries | Varies | 0 (use full functions) |
| Chat transcripts | Message boundaries | 5-10 messages | 2-3 messages |

### 4. Retrieval Strategies

Retrieval is the bottleneck of RAG quality. If you retrieve the wrong chunks, the LLM cannot produce a good answer — no matter how capable the model is.

**Top-K similarity** — the simplest approach. Embed the query, find the K most similar chunks.

```typescript
const results = await semanticSearch(query, { limit: 5 });
```

**Hybrid retrieval** — combine vector + full-text search with RRF (see Embeddings guide for implementation).

**Multi-query retrieval** — generate multiple reformulations of the user's question, search with each, and merge results:

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

async function multiQueryRetrieve(
  originalQuery: string,
  limit: number = 10
): Promise<SearchResult[]> {
  // Generate query variations
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    temperature: 0.7,
    schema: z.object({
      queries: z
        .array(z.string())
        .length(3)
        .describe('Three different ways to ask the same question'),
    }),
    prompt: `Generate 3 different search queries that capture different aspects of this question:
"${originalQuery}"

Make each query focus on different keywords or phrasings while preserving the intent.`,
  });

  // Search with all queries (including original)
  const allQueries = [originalQuery, ...object.queries];
  const allResults = await Promise.all(
    allQueries.map((q) => semanticSearch(q, { limit: limit * 2 }))
  );

  // Deduplicate and rank by appearance count
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();

  for (const results of allResults) {
    results.forEach((result, rank) => {
      const existing = scoreMap.get(result.id);
      const rrfScore = 1 / (60 + rank);

      if (existing) {
        existing.score += rrfScore;
      } else {
        scoreMap.set(result.id, { result, score: rrfScore });
      }
    });
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.result);
}
```

**Maximal Marginal Relevance (MMR)** — balance relevance with diversity. Avoids retrieving 5 chunks that all say the same thing:

```typescript
function mmrRerank(
  results: Array<{ id: string; embedding: number[]; similarity: number }>,
  queryEmbedding: number[],
  k: number = 5,
  lambda: number = 0.5 // 0 = max diversity, 1 = max relevance
): typeof results {
  const selected: typeof results = [];
  const candidates = [...results];

  // Select first by pure relevance
  candidates.sort((a, b) => b.similarity - a.similarity);
  selected.push(candidates.shift()!);

  while (selected.length < k && candidates.length > 0) {
    let bestScore = -Infinity;
    let bestIdx = 0;

    for (let i = 0; i < candidates.length; i++) {
      const relevance = candidates[i].similarity;

      // Max similarity to any already-selected document
      const maxSimilarity = Math.max(
        ...selected.map((s) => cosineSimilarity(candidates[i].embedding, s.embedding))
      );

      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(candidates.splice(bestIdx, 1)[0]);
  }

  return selected;
}
```

### 5. Re-Ranking

Initial retrieval (vector search) is fast but approximate. Re-ranking uses a more powerful model to re-order the candidates for higher precision.

**Cohere Rerank** — the standard re-ranking API:

```typescript
// lib/rag/rerank.ts
interface RerankResult {
  index: number;
  relevanceScore: number;
}

export async function rerankResults(
  query: string,
  documents: string[],
  topN: number = 5
): Promise<RerankResult[]> {
  const response = await fetch('https://api.cohere.ai/v2/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'rerank-v3.5',
      query,
      documents,
      top_n: topN,
      return_documents: false,
    }),
  });

  const data = await response.json();
  return data.results;
}
```

**When to re-rank:**

- After initial retrieval (vector or hybrid), before passing to the LLM
- When retrieval returns 20+ candidates and you need the best 5
- When precision matters more than latency (e.g., customer support, legal)

**When to skip re-ranking:**

- Low-latency requirements (adds 100-300ms)
- Simple retrieval tasks where top-K is good enough
- Budget constraints (Cohere Rerank costs per search)

### 6. Context Window Management

Retrieved chunks must fit in the LLM's context window alongside the system prompt, conversation history, and output space. Stuffing too many chunks degrades quality — the model struggles to find the relevant information in a sea of text.

**The context budget:**

```
Total context window:          128,000 tokens (GPT-4o)
- System prompt:                 ~500 tokens
- Conversation history:        ~2,000 tokens
- Retrieved context:           ~4,000 tokens (target)
- Reserved for output:         ~2,000 tokens
= Available for retrieval:     ~4,000 tokens ≈ 5-8 chunks
```

**Strategies:**

1. **Limit chunk count** — retrieve 5-8 chunks max. More is rarely better.
2. **Summarize long chunks** — if a chunk is over 500 tokens, summarize it before including.
3. **Progressive disclosure** — start with 3 chunks. If the model says it needs more information, retrieve additional chunks.
4. **Chunk compression** — use a fast model to extract only the relevant sentences from each chunk.

```typescript
function buildRAGContext(
  chunks: Array<{ content: string; metadata: { source: string; title: string } }>,
  maxTokens: number = 4000
): string {
  let context = '';
  let tokenCount = 0;

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk.content);
    if (tokenCount + chunkTokens > maxTokens) break;

    context += `[Source: ${chunk.metadata.title}]\n${chunk.content}\n\n---\n\n`;
    tokenCount += chunkTokens;
  }

  return context;
}
```

### 7. Citation and Source Attribution

Users need to know where answers come from. Citations build trust and allow verification. Every RAG response should include source references.

**Approaches:**

1. **Inline citations** — `[1]` markers in the response text, with a reference list at the end
2. **Per-statement citations** — each claim tagged with its source
3. **Source cards** — UI components showing the source documents alongside the answer

```typescript
// Prompt template for citation-aware generation
const citationPrompt = `Answer the user's question using ONLY the provided sources.

RULES:
- Cite sources using [1], [2], etc. after each claim
- If a claim cannot be attributed to a source, do not make it
- If the sources don't contain the answer, say "I don't have information about that in my knowledge base"
- Never invent information not present in the sources

SOURCES:
${chunks
  .map(
    (chunk, i) =>
      `[${i + 1}] ${chunk.metadata.title}\n${chunk.content}`
  )
  .join('\n\n')}

QUESTION: ${userQuestion}`;
```

### 8. RAG Evaluation

You cannot improve what you do not measure. RAG evaluation is non-negotiable for production systems.

**Key metrics:**

| Metric | What It Measures | How to Measure |
|--------|-----------------|----------------|
| **Retrieval precision** | Are retrieved chunks relevant? | LLM-as-judge or human labels |
| **Retrieval recall** | Are all relevant chunks retrieved? | Requires labeled dataset |
| **Faithfulness** | Does the answer match the sources? | LLM-as-judge: "Is claim X supported by source Y?" |
| **Answer relevance** | Does the answer address the question? | LLM-as-judge or user feedback |
| **Citation accuracy** | Do citations point to correct sources? | Automated check: does source [N] contain the cited claim? |

**RAGAS framework** — the standard evaluation framework for RAG:

- **Faithfulness** — fraction of claims in the answer that are supported by the context
- **Answer relevancy** — how relevant the answer is to the question
- **Context precision** — fraction of retrieved documents that are relevant
- **Context recall** — fraction of relevant documents that were retrieved

---

## LLM Instructions

```
RAG PIPELINE INSTRUCTIONS

1. BUILD A DOCUMENT INGESTION PIPELINE:
   - Accept documents in multiple formats (Markdown, HTML, PDF, plain text)
   - Clean content: remove boilerplate, normalize whitespace, strip irrelevant sections
   - Chunk using recursive splitting with ~500 tokens per chunk and ~50 token overlap
   - Enrich chunks with metadata: source URL, title, section heading, chunk index, date
   - Embed chunks using AI SDK embedMany() in batches of 100
   - Store chunks in pgvector with the embedding, content, and metadata
   - Track which documents have been ingested and when they were last updated
   - Implement incremental ingestion: only re-process documents that have changed

2. IMPLEMENT RETRIEVAL:
   - Default: hybrid search (vector + full-text) with Reciprocal Rank Fusion
   - Retrieve 15-20 candidates, then re-rank to top 5-8
   - Use Cohere Rerank API for re-ranking (model: rerank-v3.5)
   - Apply metadata filters BEFORE vector search (category, date, permissions)
   - For complex questions, use multi-query retrieval (generate 3 query variations)
   - Return similarity scores with results for debugging and threshold filtering

3. CREATE A RAG CHAT ENDPOINT:
   - Build context from retrieved chunks (max ~4000 tokens of context)
   - Include source metadata in the context for citation
   - Use a system prompt that requires citations [1], [2], etc.
   - Instruct the model to say "I don't know" if sources don't contain the answer
   - Stream the response using streamText + toDataStreamResponse
   - Include source documents in the response metadata (not just the text)

4. ADD CITATION SUPPORT:
   - Number sources sequentially in the context: [1], [2], [3]...
   - Prompt the model to cite sources inline using these numbers
   - Parse citations from the response to create clickable source links
   - Validate that cited source numbers actually exist
   - Return source metadata (title, URL, relevance score) alongside the response

5. EVALUATE RAG QUALITY:
   - Create a test set: 50-100 questions with expected answers and relevant documents
   - Measure retrieval precision and recall
   - Use LLM-as-judge for faithfulness (are claims supported by context?)
   - Use LLM-as-judge for answer relevance (does answer address the question?)
   - Track metrics over time — run evaluation after every pipeline change
   - Set minimum thresholds: faithfulness > 0.8, answer relevance > 0.7
```

---

## Examples

### Example 1: Complete RAG Pipeline

End-to-end RAG implementation: ingestion, retrieval, generation, and citations.

```typescript
// lib/rag/pipeline.ts
import { streamText, embed, embedMany } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';

const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');

// --- INGESTION ---

export async function ingestDocuments(
  documents: Array<{
    id: string;
    title: string;
    content: string;
    source: string;
    sourceUrl?: string;
  }>
) {
  const allChunks: Array<{
    documentId: string;
    content: string;
    metadata: Record<string, string>;
  }> = [];

  for (const doc of documents) {
    const chunks = recursiveChunk(doc.content, {
      chunkSize: 500,
      chunkOverlap: 50,
    });

    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        documentId: doc.id,
        content: chunks[i],
        metadata: {
          title: doc.title,
          source: doc.source,
          sourceUrl: doc.sourceUrl || '',
          chunkIndex: String(i),
          totalChunks: String(chunks.length),
        },
      });
    }
  }

  // Batch embed
  const batchSize = 100;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: batch.map((c) => c.content),
    });

    // Store in database
    await db.$transaction(
      batch.map((chunk, idx) =>
        db.$executeRaw`
          INSERT INTO "Chunk" (id, "documentId", content, metadata, embedding)
          VALUES (
            ${`${chunk.documentId}-${chunk.metadata.chunkIndex}`},
            ${chunk.documentId},
            ${chunk.content},
            ${JSON.stringify(chunk.metadata)}::jsonb,
            ${JSON.stringify(embeddings[idx])}::vector
          )
          ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            metadata = EXCLUDED.metadata,
            embedding = EXCLUDED.embedding
        `
      )
    );
  }

  return { chunksCreated: allChunks.length };
}

// --- RETRIEVAL ---

export async function retrieve(
  query: string,
  options: { limit?: number; category?: string } = {}
): Promise<
  Array<{
    id: string;
    content: string;
    metadata: Record<string, string>;
    similarity: number;
  }>
> {
  const { limit = 10, category } = options;

  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: query,
  });

  const results = await db.$queryRaw<
    Array<{
      id: string;
      content: string;
      metadata: Record<string, string>;
      similarity: number;
    }>
  >`
    SELECT
      id, content, metadata,
      1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
    FROM "Chunk"
    WHERE embedding IS NOT NULL
    ${category ? db.$queryRaw`AND metadata->>'source' = ${category}` : db.$queryRaw``}
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${limit}
  `;

  return results;
}

// --- RETRIEVAL WITH RE-RANKING ---

export async function retrieveAndRerank(
  query: string,
  options: { limit?: number; category?: string } = {}
): Promise<
  Array<{
    id: string;
    content: string;
    metadata: Record<string, string>;
    relevanceScore: number;
  }>
> {
  const { limit = 5 } = options;

  // Over-fetch for re-ranking
  const candidates = await retrieve(query, { ...options, limit: 20 });

  if (candidates.length === 0) return [];

  // Re-rank with Cohere
  const rerankResponse = await fetch('https://api.cohere.ai/v2/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'rerank-v3.5',
      query,
      documents: candidates.map((c) => c.content),
      top_n: limit,
      return_documents: false,
    }),
  });

  const rerankData = await rerankResponse.json();

  return rerankData.results.map(
    (r: { index: number; relevance_score: number }) => ({
      ...candidates[r.index],
      relevanceScore: r.relevance_score,
    })
  );
}

// --- GENERATION ---

export function buildRAGPrompt(
  chunks: Array<{ content: string; metadata: Record<string, string> }>,
  question: string
): { system: string; prompt: string } {
  const context = chunks
    .map(
      (chunk, i) =>
        `[${i + 1}] (Source: ${chunk.metadata.title})\n${chunk.content}`
    )
    .join('\n\n---\n\n');

  const system = `You are a knowledgeable assistant that answers questions based on provided sources.

RULES:
- Use ONLY the information from the provided sources to answer
- Cite sources using [1], [2], etc. after each claim or piece of information
- If the sources don't contain enough information to answer, say: "I don't have enough information in my knowledge base to answer that question."
- Never invent or assume information not in the sources
- Be concise and direct
- If sources conflict, mention the discrepancy`;

  const prompt = `SOURCES:
${context}

QUESTION: ${question}`;

  return { system, prompt };
}
```

```typescript
// app/api/rag/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { retrieveAndRerank, buildRAGPrompt } from '@/lib/rag/pipeline';
import { auth } from '@/lib/auth';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const { messages } = await req.json();
  const latestMessage = messages[messages.length - 1].content;

  // Retrieve relevant chunks
  const chunks = await retrieveAndRerank(latestMessage, { limit: 5 });

  // Build the RAG prompt
  const { system, prompt: ragContext } = buildRAGPrompt(chunks, latestMessage);

  // Generate response with sources
  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system,
    messages: [
      ...messages.slice(0, -1),
      { role: 'user', content: ragContext },
    ],
    maxTokens: 2000,
    onFinish: async ({ text, usage }) => {
      await db.ragLog.create({
        data: {
          userId: session.user.id,
          query: latestMessage,
          chunksRetrieved: chunks.length,
          chunkIds: chunks.map((c) => c.id),
          response: text,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        },
      });
    },
  });

  return result.toDataStreamResponse({
    // Include source metadata in the stream
    getErrorMessage: () => 'An error occurred while generating the response.',
  });
}
```

### Example 2: Recursive Chunking with Overlap

A production-ready chunking implementation that respects document structure.

```typescript
// lib/rag/chunking.ts

interface ChunkOptions {
  chunkSize: number;        // Target tokens per chunk
  chunkOverlap: number;     // Overlap tokens between chunks
  minChunkSize: number;     // Minimum chunk size (skip tiny chunks)
  separators: string[];     // Split hierarchy
}

const DEFAULT_OPTIONS: ChunkOptions = {
  chunkSize: 500,
  chunkOverlap: 50,
  minChunkSize: 50,
  separators: [
    '\n## ',     // Markdown H2
    '\n### ',    // Markdown H3
    '\n\n',      // Paragraph break
    '\n',        // Line break
    '. ',        // Sentence
    ' ',         // Word
  ],
};

export function recursiveChunk(
  text: string,
  options: Partial<ChunkOptions> = {}
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks = splitRecursive(text, opts, 0);

  // Add overlap between consecutive chunks
  return addOverlap(chunks, opts.chunkOverlap);
}

function splitRecursive(
  text: string,
  options: ChunkOptions,
  separatorIndex: number
): string[] {
  const wordCount = text.split(/\s+/).length;

  // Base case: text fits in one chunk
  if (wordCount <= options.chunkSize) {
    return wordCount >= options.minChunkSize ? [text.trim()] : [];
  }

  // Try each separator in order
  for (let i = separatorIndex; i < options.separators.length; i++) {
    const separator = options.separators[i];

    if (!text.includes(separator)) continue;

    const parts = text.split(separator);
    if (parts.length <= 1) continue;

    const chunks: string[] = [];
    let currentChunk = '';

    for (const part of parts) {
      const candidate = currentChunk
        ? currentChunk + separator + part
        : part;

      if (candidate.split(/\s+/).length > options.chunkSize) {
        // Current chunk is full — save it
        if (currentChunk.trim()) chunks.push(currentChunk.trim());

        // If the part itself is too large, recurse with next separator
        if (part.split(/\s+/).length > options.chunkSize) {
          chunks.push(...splitRecursive(part, options, i + 1));
          currentChunk = '';
        } else {
          currentChunk = part;
        }
      } else {
        currentChunk = candidate;
      }
    }

    if (currentChunk.trim() && currentChunk.split(/\s+/).length >= options.minChunkSize) {
      chunks.push(currentChunk.trim());
    }

    if (chunks.length > 0) return chunks;
  }

  // Fallback: split by word count
  return fixedSizeChunk(text, options.chunkSize);
}

function addOverlap(chunks: string[], overlapSize: number): string[] {
  if (overlapSize === 0 || chunks.length <= 1) return chunks;

  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;

    // Get last N words from previous chunk
    const prevWords = chunks[i - 1].split(/\s+/);
    const overlapWords = prevWords.slice(-overlapSize);

    return overlapWords.join(' ') + ' ' + chunk;
  });
}

function fixedSizeChunk(text: string, chunkSize: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) chunks.push(chunk.trim());
  }

  return chunks;
}
```

### Example 3: Hybrid Retrieval with Re-Ranking

Combine vector search, full-text search, and Cohere re-ranking for optimal retrieval.

```typescript
// lib/rag/retrieval.ts
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';

const RRF_K = 60;

interface RetrievalResult {
  id: string;
  content: string;
  metadata: Record<string, string>;
  score: number;
  retrievalMethod: 'vector' | 'fulltext' | 'hybrid';
}

export async function hybridRetrieveAndRerank(
  query: string,
  options: {
    limit?: number;
    category?: string;
    rerankEnabled?: boolean;
  } = {}
): Promise<RetrievalResult[]> {
  const { limit = 5, category, rerankEnabled = true } = options;
  const candidateLimit = rerankEnabled ? 20 : limit;

  // Run vector and full-text search in parallel
  const [vectorResults, fulltextResults] = await Promise.all([
    vectorSearch(query, candidateLimit, category),
    fulltextSearch(query, candidateLimit, category),
  ]);

  // Fuse with RRF
  const fusedMap = new Map<
    string,
    RetrievalResult & { rrfScore: number }
  >();

  vectorResults.forEach((result, rank) => {
    fusedMap.set(result.id, {
      ...result,
      score: 0,
      rrfScore: 1 / (RRF_K + rank + 1),
      retrievalMethod: 'vector',
    });
  });

  fulltextResults.forEach((result, rank) => {
    const existing = fusedMap.get(result.id);
    const rrfScore = 1 / (RRF_K + rank + 1);

    if (existing) {
      existing.rrfScore += rrfScore;
      existing.retrievalMethod = 'hybrid';
    } else {
      fusedMap.set(result.id, {
        ...result,
        score: 0,
        rrfScore,
        retrievalMethod: 'fulltext',
      });
    }
  });

  let candidates = Array.from(fusedMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, candidateLimit);

  // Re-rank with Cohere
  if (rerankEnabled && candidates.length > 0) {
    const rerankResponse = await fetch('https://api.cohere.ai/v2/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'rerank-v3.5',
        query,
        documents: candidates.map((c) => c.content),
        top_n: limit,
        return_documents: false,
      }),
    });

    const rerankData = await rerankResponse.json();

    candidates = rerankData.results.map(
      (r: { index: number; relevance_score: number }) => ({
        ...candidates[r.index],
        score: r.relevance_score,
      })
    );
  } else {
    candidates = candidates.slice(0, limit).map((c) => ({
      ...c,
      score: c.rrfScore,
    }));
  }

  return candidates;
}

async function vectorSearch(
  query: string,
  limit: number,
  category?: string
) {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: query,
  });

  return db.$queryRaw<
    Array<{ id: string; content: string; metadata: Record<string, string> }>
  >`
    SELECT id, content, metadata
    FROM "Chunk"
    WHERE embedding IS NOT NULL
    ${category ? db.$queryRaw`AND metadata->>'source' = ${category}` : db.$queryRaw``}
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${limit}
  `;
}

async function fulltextSearch(
  query: string,
  limit: number,
  category?: string
) {
  return db.$queryRaw<
    Array<{ id: string; content: string; metadata: Record<string, string> }>
  >`
    SELECT id, content, metadata
    FROM "Chunk"
    WHERE search_vector @@ plainto_tsquery('english', ${query})
    ${category ? db.$queryRaw`AND metadata->>'source' = ${category}` : db.$queryRaw``}
    ORDER BY ts_rank_cd(search_vector, plainto_tsquery('english', ${query})) DESC
    LIMIT ${limit}
  `;
}
```

### Example 4: Chat-With-Your-Docs Endpoint

A complete "chat with your documents" feature with streaming, citations, and conversation history.

```typescript
// app/api/docs/chat/route.ts
import { streamText, type Message } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { hybridRetrieveAndRerank } from '@/lib/rag/retrieval';
import { auth } from '@/lib/auth';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const { messages }: { messages: Message[] } = await req.json();
  const latestQuestion = messages[messages.length - 1].content;

  // Retrieve relevant chunks
  const chunks = await hybridRetrieveAndRerank(latestQuestion, {
    limit: 6,
    rerankEnabled: true,
  });

  // Build context with numbered sources
  const sourcesContext = chunks
    .map(
      (chunk, i) =>
        `[${i + 1}] "${chunk.metadata.title}" (${chunk.metadata.source})\n${chunk.content}`
    )
    .join('\n\n---\n\n');

  const systemPrompt = `You are a documentation assistant. Answer questions using the provided sources.

RULES:
- Use ONLY information from the numbered sources below
- Cite every claim with [1], [2], etc. matching the source numbers
- If sources don't contain the answer, say: "I couldn't find information about that in the documentation. Could you rephrase your question?"
- Be concise — prefer short, direct answers
- For how-to questions, provide step-by-step instructions
- For conceptual questions, explain clearly and cite the relevant source
- You may combine information from multiple sources

SOURCES:
${sourcesContext}`;

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages,
    maxTokens: 1500,
  });

  // Return stream with source metadata as headers
  const response = result.toDataStreamResponse();

  // Attach sources as a custom header for the client to parse
  response.headers.set(
    'X-Sources',
    JSON.stringify(
      chunks.map((c, i) => ({
        index: i + 1,
        title: c.metadata.title,
        source: c.metadata.source,
        sourceUrl: c.metadata.sourceUrl,
        score: c.score,
      }))
    )
  );

  return response;
}
```

### Example 5: RAG Evaluation Script

Automated evaluation of retrieval quality and answer faithfulness.

```typescript
// scripts/evaluate-rag.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { retrieve, retrieveAndRerank, buildRAGPrompt } from '@/lib/rag/pipeline';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Test dataset: questions with expected relevant document IDs
const testSet = [
  {
    question: 'How do I reset my password?',
    expectedDocIds: ['doc-password-reset', 'doc-account-security'],
    expectedAnswer: 'Go to Settings > Security > Change Password',
  },
  {
    question: 'What are the API rate limits?',
    expectedDocIds: ['doc-api-limits', 'doc-api-reference'],
    expectedAnswer: '1000 requests per minute for Pro tier',
  },
  // ... more test cases
];

// Evaluation schemas
const FaithfulnessEval = z.object({
  claims: z.array(
    z.object({
      claim: z.string(),
      supportedByContext: z.boolean(),
      sourceIndex: z.number().optional(),
    })
  ),
  faithfulnessScore: z.number().min(0).max(1).describe(
    'Fraction of claims supported by the context'
  ),
});

const RelevanceEval = z.object({
  isRelevant: z.boolean(),
  relevanceScore: z.number().min(0).max(1),
  reasoning: z.string(),
});

async function evaluateRetrieval(
  question: string,
  retrievedIds: string[],
  expectedIds: string[]
): { precision: number; recall: number } {
  const relevantRetrieved = retrievedIds.filter((id) =>
    expectedIds.some((eid) => id.startsWith(eid))
  );

  const precision =
    retrievedIds.length > 0
      ? relevantRetrieved.length / retrievedIds.length
      : 0;

  const recall =
    expectedIds.length > 0
      ? relevantRetrieved.length / expectedIds.length
      : 0;

  return { precision, recall };
}

async function evaluateFaithfulness(
  answer: string,
  context: string
): Promise<z.infer<typeof FaithfulnessEval>> {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    temperature: 0,
    schema: FaithfulnessEval,
    prompt: `Evaluate the faithfulness of this answer to the provided context.

CONTEXT:
${context}

ANSWER:
${answer}

Extract each factual claim from the answer. For each claim, determine if it is supported by the context.`,
  });

  return object;
}

async function evaluateRelevance(
  question: string,
  answer: string
): Promise<z.infer<typeof RelevanceEval>> {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    temperature: 0,
    schema: RelevanceEval,
    prompt: `Does this answer adequately address the question?

QUESTION: ${question}
ANSWER: ${answer}

Rate relevance from 0 (completely irrelevant) to 1 (perfectly relevant).`,
  });

  return object;
}

// Run full evaluation
async function runEvaluation() {
  const results = [];

  for (const testCase of testSet) {
    console.log(`Evaluating: ${testCase.question}`);

    // 1. Retrieve
    const chunks = await retrieveAndRerank(testCase.question, { limit: 5 });

    // 2. Measure retrieval quality
    const retrievalMetrics = await evaluateRetrieval(
      testCase.question,
      chunks.map((c) => c.id),
      testCase.expectedDocIds
    );

    // 3. Generate answer
    const { system, prompt } = buildRAGPrompt(chunks, testCase.question);
    const { text: answer } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system,
      prompt,
      maxTokens: 1000,
    });

    // 4. Evaluate faithfulness
    const faithfulness = await evaluateFaithfulness(
      answer,
      chunks.map((c) => c.content).join('\n\n')
    );

    // 5. Evaluate relevance
    const relevance = await evaluateRelevance(testCase.question, answer);

    results.push({
      question: testCase.question,
      retrievalPrecision: retrievalMetrics.precision,
      retrievalRecall: retrievalMetrics.recall,
      faithfulness: faithfulness.faithfulnessScore,
      relevance: relevance.relevanceScore,
      answer: answer.slice(0, 200),
    });
  }

  // Summary
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  console.log('\n=== RAG Evaluation Summary ===');
  console.log(`Retrieval Precision: ${(avg(results.map((r) => r.retrievalPrecision)) * 100).toFixed(1)}%`);
  console.log(`Retrieval Recall:    ${(avg(results.map((r) => r.retrievalRecall)) * 100).toFixed(1)}%`);
  console.log(`Faithfulness:        ${(avg(results.map((r) => r.faithfulness)) * 100).toFixed(1)}%`);
  console.log(`Answer Relevance:    ${(avg(results.map((r) => r.relevance)) * 100).toFixed(1)}%`);

  return results;
}

runEvaluation().then(console.log).catch(console.error);
```

---

## Common Mistakes

### 1. Wrong Chunk Size

**Wrong:** Using 2000-token chunks because "more context is better."

**Fix:** Aim for 300-500 tokens per chunk. Large chunks dilute the embedding — a 2000-token chunk about three different topics matches everything weakly. Small chunks are more precise. Start with 500 tokens, measure retrieval quality, and adjust.

### 2. No Chunk Overlap

**Wrong:** Splitting cleanly at every 500 tokens with no overlap, cutting sentences and ideas in half.

**Fix:** Use 10-20% overlap between consecutive chunks (50-100 tokens for 500-token chunks). This ensures that information at chunk boundaries is not lost. The overlap costs minimal extra storage and embedding cost.

### 3. Too Many or Too Few Chunks Retrieved

**Wrong:** Retrieving 20 chunks and stuffing them all into the prompt, or retrieving only 1 chunk.

**Fix:** Retrieve 5-8 chunks for most questions. Over-retrieve (15-20) and re-rank down to the top 5-8. More chunks increase noise and reduce answer quality. Fewer chunks risk missing relevant information. Use re-ranking to get the best of both worlds.

### 4. No Source Attribution

**Wrong:** The RAG system generates answers with no indication of where the information came from. Users cannot verify claims.

**Fix:** Number sources in the context (`[1]`, `[2]`) and instruct the model to cite them inline. Return source metadata (title, URL, relevance score) alongside the answer. Build UI components that let users click citations to see the original document.

### 5. Ignoring Metadata Filtering

**Wrong:** Searching all documents when the user only has access to a specific subset (their team's docs, their plan's features, a specific product version).

**Fix:** Apply metadata filters before vector search. Filter by tenant, category, date range, and access permissions using SQL `WHERE` clauses. This is a security requirement, not just an optimization — users must not see documents they lack permission to access.

### 6. No Evaluation System

**Wrong:** Deploying RAG and assuming it works because the demo looked good.

**Fix:** Build an evaluation pipeline from day one. Create a test set of 50-100 questions. Measure retrieval precision, recall, faithfulness, and answer relevance. Run evaluation after every change to the pipeline (new chunking strategy, different model, updated prompts). Set quality thresholds and alert when they drop.

### 7. Stuffing the Entire Context Window

**Wrong:** Retrieving as many chunks as will fit in the context window (100+ chunks for a 128K model).

**Fix:** More context is not better. Research shows that retrieval quality degrades significantly when the LLM must find relevant information in a large, noisy context. Retrieve 5-8 high-quality chunks. Use re-ranking to ensure the best chunks are selected. Reserve context space for conversation history and output.

### 8. Not Handling Stale Content

**Wrong:** Documents are updated on the website, but the RAG pipeline still serves old embeddings.

**Fix:** Track document update timestamps. Re-ingest documents when they change. Use incremental ingestion: compare the document hash or `updatedAt` timestamp, and only re-embed changed documents. Set up a cron job or webhook to trigger re-ingestion when source data changes.

### 9. Using RAG When You Do Not Need It

**Wrong:** Building a full RAG pipeline for a FAQ with 20 questions that fits in a single prompt.

**Fix:** If your content fits in the context window (<50K tokens), just include it directly. RAG adds complexity — ingestion pipeline, vector database, chunking, retrieval tuning, evaluation. Only use RAG when: content exceeds context limits, content changes frequently, you need citations, or you need per-user access control.

### 10. No Fallback for Empty Retrieval

**Wrong:** When retrieval returns zero relevant chunks, the LLM generates an answer from its training data — potentially hallucinating.

**Fix:** Check retrieval results before generation. If no chunks pass the similarity threshold (e.g., all below 0.5), return a specific message: "I don't have information about that in my knowledge base." Never let the model fill gaps with its own knowledge in a RAG system — that defeats the purpose.

---

> **See also:** [Embeddings](../Embeddings/embeddings.md) | [LLM-Patterns](../LLM-Patterns/llm-patterns.md) | [Prompt-Engineering](../Prompt-Engineering/prompt-engineering.md) | [Backend/Background-Jobs](../../Backend/Background-Jobs/background-jobs.md) | [Backend/Database-Design](../../Backend/Database-Design/database-design.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
