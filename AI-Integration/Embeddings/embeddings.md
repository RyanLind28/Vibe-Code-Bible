# Embeddings

> Embedding models, vector databases, similarity search, indexing strategies, hybrid search, semantic caching, batch processing, and metadata filtering — the foundation for semantic search and RAG.

---

## Principles

### 1. What Embeddings Are

An embedding is a fixed-length array of numbers (a vector) that represents the semantic meaning of text. Similar texts produce similar vectors. "How do I reset my password?" and "I forgot my login credentials" are different strings but nearly identical embeddings.

This matters because traditional search (keyword matching, full-text search) fails when users use different words than your content. Embeddings enable semantic search — finding content by meaning, not exact words.

**How it works:**

1. Send text to an embedding model → get back a vector (e.g., 1536 numbers)
2. Store the vector alongside the original text in a vector database
3. When a user searches, embed their query → find the closest vectors → return the associated text

```typescript
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

// Generate an embedding
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'How do I reset my password?',
});

// embedding is a number[] of length 1536
console.log(embedding.length); // 1536
```

Embeddings capture relationships. The vector for "king" minus "man" plus "woman" approximates "queen." The vector for "JavaScript" is closer to "TypeScript" than to "PostgreSQL." This geometric property is what makes semantic search work.

### 2. Embedding Model Selection

Choose an embedding model based on quality, cost, dimensions, and language support. For most applications, start with `text-embedding-3-small` from OpenAI — it is cheap, fast, and good enough.

| Model | Dimensions | Cost/1M tokens | Quality | Best For |
|-------|-----------|----------------|---------|----------|
| `text-embedding-3-small` | 1536 | $0.02 | Good | Default choice, most applications |
| `text-embedding-3-large` | 3072 | $0.13 | Better | High-accuracy retrieval, multi-lingual |
| Cohere `embed-v4.0` | 1024 | $0.10 | Excellent | Multi-lingual, search-focused |
| Google `text-embedding-004` | 768 | $0.00625 | Good | Budget-conscious, Google ecosystem |

**Key decisions:**

- **Dimensions** — higher dimensions capture more nuance but cost more storage and compute. 1536 is the sweet spot. Both `text-embedding-3-small` and `text-embedding-3-large` support dimension reduction via the `dimensions` parameter.
- **Consistency** — never mix embedding models in the same collection. Vectors from different models are incompatible. If you switch models, you must re-embed everything.
- **Dimension reduction** — `text-embedding-3-small` supports reducing from 1536 to 512 or 256 dimensions with minimal quality loss, cutting storage by 3-6x.

```typescript
// Dimension reduction — trade quality for storage
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small', {
    dimensions: 512, // Reduced from 1536
  }),
  value: 'Your text here',
});
```

### 3. Vector Database Architecture

You need somewhere to store and query vectors. For most Next.js applications, **pgvector** (PostgreSQL extension) is the right choice — use the same database you already have.

**Options:**

| Database | Type | Best For | Pricing Model |
|----------|------|----------|--------------|
| pgvector (Neon/Supabase) | Extension on PostgreSQL | Apps already using PostgreSQL | Per-DB pricing |
| Pinecone | Managed vector DB | Large-scale (10M+ vectors), dedicated infra | Per-vector pricing |
| Qdrant | Self-hosted/Cloud | Fine-grained control, filtering | Self-hosted free, cloud paid |
| Weaviate | Self-hosted/Cloud | Multi-modal, GraphQL API | Self-hosted free, cloud paid |
| Chroma | Embedded | Prototyping, small datasets | Free |

**Why pgvector wins for most apps:**

- No new infrastructure — runs in your existing PostgreSQL database
- Transactional consistency — vectors and metadata in the same transaction
- Full SQL — join vectors with your application tables (users, documents, permissions)
- Neon and Supabase both support pgvector out of the box
- For most apps under 5M vectors, performance is excellent

**When to use a dedicated vector DB:**

- 10M+ vectors with sub-100ms latency requirements
- Multi-tenant with strict isolation at the vector level
- Real-time index updates at high write throughput (1000+ writes/second)
- Need distributed vector search across regions

### 4. Similarity Search Algorithms

Measuring similarity between vectors determines what "closest" means. The three common metrics:

**Cosine similarity** — measures the angle between vectors. Ignores magnitude, focuses on direction. Best for text embeddings where you care about semantic similarity regardless of text length.

```
similarity = (A · B) / (||A|| × ||B||)
Range: -1 to 1 (1 = identical, 0 = unrelated, -1 = opposite)
```

**Dot product (inner product)** — measures both direction and magnitude. Faster to compute. Use when embeddings are normalized (unit vectors), where it equals cosine similarity.

```
similarity = A · B
Range: depends on magnitudes
```

**Euclidean distance (L2)** — measures straight-line distance between vectors. Lower = more similar. Sensitive to magnitude differences.

```
distance = sqrt(sum((A[i] - B[i])^2))
Range: 0 to infinity (0 = identical)
```

**Default choice: cosine similarity** (or cosine distance, which is `1 - cosine_similarity`). It works well with all common embedding models and is the default in pgvector's `<=>` operator.

```sql
-- pgvector operators
-- <=> cosine distance (use this by default)
-- <#> negative inner product
-- <-> L2 (Euclidean) distance

SELECT id, content, 1 - (embedding <=> $1) AS similarity
FROM documents
ORDER BY embedding <=> $1
LIMIT 10;
```

### 5. Indexing Strategies

Without an index, every similarity search scans every vector in the table (brute force). This is fine for 10K vectors but unusable at 100K+.

**HNSW (Hierarchical Navigable Small World)** — the default choice for most applications:

- Builds a multi-layer graph for fast approximate nearest neighbor search
- Excellent query performance (sub-millisecond at 1M vectors)
- Higher memory usage and slower index build time
- Tunable accuracy vs speed tradeoff

```sql
-- Create HNSW index in pgvector
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- m: connections per node (higher = better recall, more memory). Default 16.
-- ef_construction: build-time beam width (higher = better recall, slower build). Default 64.
```

**IVFFlat (Inverted File with Flat compression)** — alternative for very large datasets:

- Clusters vectors into lists, searches only nearby clusters
- Faster index build, lower memory
- Slightly worse recall than HNSW
- Must specify the number of lists upfront

```sql
-- IVFFlat index (use for 1M+ vectors where HNSW memory is a concern)
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Set probes at query time (higher = better recall, slower)
SET ivfflat.probes = 10;
```

**Guidelines:**

- Under 100K vectors → HNSW, default parameters
- 100K-5M vectors → HNSW with tuned `m` and `ef_construction`
- 5M+ vectors → consider IVFFlat or a dedicated vector database
- Always benchmark with your actual data and query patterns

### 6. Hybrid Search (Vector + Full-Text)

Pure vector search sometimes misses exact keyword matches. Pure keyword search misses semantic matches. Hybrid search combines both for the best results.

**How it works:**

1. Run a vector similarity search → get top N results with similarity scores
2. Run a full-text search (BM25 or PostgreSQL `tsvector`) → get top N results with text scores
3. Combine results using Reciprocal Rank Fusion (RRF) or a weighted sum

```
RRF(doc) = Σ 1 / (k + rank_i(doc))
```

Where `k` is a constant (typically 60) and `rank_i` is the document's rank in each search result.

**Why hybrid works better:**

- Vector search excels at: paraphrasing, synonyms, conceptual similarity, multi-lingual
- Full-text search excels at: exact terms, proper nouns, acronyms, product codes, technical terms
- Combined: handles both "how to authenticate users" and "Auth.js NextAuth configuration"

```sql
-- PostgreSQL full-text search setup (used alongside pgvector)
ALTER TABLE documents ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX ON documents USING gin(search_vector);
```

### 7. Batch Processing and Performance

Embedding operations have latency (50-200ms per call) and cost money. Optimize for production.

**Batch embedding** — embed many texts in one API call:

```typescript
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: ['First document', 'Second document', 'Third document'],
});

// embeddings is number[][] — one vector per input
```

**Performance tips:**

- **Batch inserts** — embed in batches of 100-500, insert with a single `INSERT INTO ... VALUES` statement
- **Pre-compute** — embed documents at write time (on create/update), not at query time
- **Cache embeddings** — store embeddings in the database, never re-embed the same text
- **Async processing** — for large document imports, use a background job queue
- **Rate limits** — OpenAI embedding API allows ~3000 RPM. Implement backoff and queuing for bulk operations.

---

## LLM Instructions

```
VECTOR DATABASE AND EMBEDDINGS INSTRUCTIONS

1. SET UP A VECTOR DATABASE:
   - Use pgvector with Neon or Supabase (same database as app data)
   - Enable the extension: CREATE EXTENSION IF NOT EXISTS vector
   - Add a vector column to your documents table: embedding vector(1536)
   - Create an HNSW index for cosine distance: USING hnsw (embedding vector_cosine_ops)
   - If using Prisma, add the pgvector extension to schema.prisma and use raw queries for vector operations
   - If using Drizzle, use the pgvector column type from drizzle-orm/pg-core

2. GENERATE AND STORE EMBEDDINGS:
   - Use AI SDK embed() for single texts, embedMany() for batches
   - Default model: openai.embedding('text-embedding-3-small')
   - Embed at write time: when a document is created or updated, generate and store its embedding
   - Never re-embed unchanged text — check for existing embeddings before regenerating
   - Store the embedding model name alongside the vector for future migration safety

3. IMPLEMENT SIMILARITY SEARCH:
   - Embed the user's query with the same model used for documents
   - Query with pgvector: ORDER BY embedding <=> $queryEmbedding LIMIT 10
   - Convert cosine distance to similarity: 1 - distance
   - Filter by similarity threshold (0.7+ is usually relevant)
   - Combine with metadata filters (category, date, permissions) using WHERE clauses

4. ADD HYBRID SEARCH:
   - Add a tsvector column with GIN index for full-text search
   - Run both vector and full-text queries
   - Combine results with Reciprocal Rank Fusion (RRF)
   - Use k=60 for the RRF constant
   - Return the top N results from the fused ranking
   - Hybrid search is especially valuable when content contains technical terms, proper nouns, or codes
```

---

## Examples

### Example 1: pgvector Setup with Neon/Supabase

Complete database schema, migration, and utility functions for vector storage.

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

model Document {
  id        String   @id @default(cuid())
  title     String
  content   String
  category  String?
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Vector column handled via raw SQL (Prisma doesn't natively support vector types)
  // See migration below

  @@index([category])
}
```

```sql
-- prisma/migrations/add_vector/migration.sql
-- Run after initial Prisma migration

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE "Document" ADD COLUMN embedding vector(1536);

-- Create HNSW index for fast cosine similarity search
CREATE INDEX document_embedding_idx ON "Document"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Add full-text search column and index (for hybrid search)
ALTER TABLE "Document" ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED;

CREATE INDEX document_search_idx ON "Document" USING gin(search_vector);
```

```typescript
// lib/embeddings.ts
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';

const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');
const EMBEDDING_DIMENSIONS = 1536;

// Generate embedding for a single text
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

// Generate embeddings for multiple texts (batched)
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: batch,
    });
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

// Store a document with its embedding
export async function storeDocument(doc: {
  title: string;
  content: string;
  category?: string;
  metadata?: Record<string, unknown>;
}) {
  // Create the document first
  const document = await db.document.create({
    data: {
      title: doc.title,
      content: doc.content,
      category: doc.category,
      metadata: doc.metadata,
    },
  });

  // Generate and store embedding
  const embedding = await generateEmbedding(
    `${doc.title}\n\n${doc.content}`
  );

  await db.$executeRaw`
    UPDATE "Document"
    SET embedding = ${JSON.stringify(embedding)}::vector
    WHERE id = ${document.id}
  `;

  return document;
}

// Search by semantic similarity
export async function semanticSearch(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    category?: string;
  } = {}
) {
  const { limit = 10, threshold = 0.7, category } = options;

  const queryEmbedding = await generateEmbedding(query);

  const results = await db.$queryRaw<
    Array<{
      id: string;
      title: string;
      content: string;
      category: string | null;
      similarity: number;
    }>
  >`
    SELECT
      id, title, content, category,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM "Document"
    WHERE embedding IS NOT NULL
    ${category ? db.$queryRaw`AND category = ${category}` : db.$queryRaw``}
    AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${threshold}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `;

  return results;
}
```

### Example 2: Semantic Search API

A complete search endpoint with query embedding, similarity filtering, and response formatting.

```typescript
// app/api/search/route.ts
import { NextRequest } from 'next/server';
import { semanticSearch } from '@/lib/embeddings';
import { z } from 'zod';

const SearchQuery = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  category: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SearchQuery.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { query, limit, threshold, category } = parsed.data;

  const results = await semanticSearch(query, {
    limit,
    threshold,
    category,
  });

  return Response.json({
    query,
    count: results.length,
    results: results.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content.slice(0, 300) + (r.content.length > 300 ? '...' : ''),
      category: r.category,
      similarity: Math.round(r.similarity * 1000) / 1000,
    })),
  });
}
```

```typescript
// components/search.tsx
'use client';

import { useState } from 'react';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string | null;
  similarity: number;
}

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10, threshold: 0.7 }),
      });
      const data = await res.json();
      setResults(data.results);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by meaning, not just keywords..."
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="space-y-4">
        {results.map((r) => (
          <div key={r.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{r.title}</h3>
              <span className="text-sm text-gray-500">
                {(r.similarity * 100).toFixed(1)}% match
              </span>
            </div>
            {r.category && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {r.category}
              </span>
            )}
            <p className="text-gray-600 mt-2 text-sm">{r.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 3: Batch Embedding Pipeline

Process large document imports efficiently with batching, progress tracking, and error handling.

```typescript
// lib/embeddings/pipeline.ts
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';

const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');
const EMBED_BATCH_SIZE = 100;
const DB_BATCH_SIZE = 500;

interface PipelineResult {
  total: number;
  embedded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  durationMs: number;
}

export async function batchEmbedDocuments(
  documentIds?: string[],
  onProgress?: (progress: { current: number; total: number }) => void
): Promise<PipelineResult> {
  const start = Date.now();
  const errors: PipelineResult['errors'] = [];

  // Get documents that need embedding
  const documents = await db.$queryRaw<
    Array<{ id: string; title: string; content: string }>
  >`
    SELECT id, title, content
    FROM "Document"
    WHERE embedding IS NULL
    ${documentIds ? db.$queryRaw`AND id = ANY(${documentIds})` : db.$queryRaw``}
    ORDER BY "createdAt" ASC
  `;

  const total = documents.length;
  let embedded = 0;

  // Process in batches
  for (let i = 0; i < documents.length; i += EMBED_BATCH_SIZE) {
    const batch = documents.slice(i, i + EMBED_BATCH_SIZE);

    try {
      // Generate embeddings for the batch
      const texts = batch.map((d) => `${d.title}\n\n${d.content}`);
      const { embeddings } = await embedMany({
        model: EMBEDDING_MODEL,
        values: texts,
      });

      // Store embeddings in database
      const values = batch.map((doc, idx) => ({
        id: doc.id,
        embedding: embeddings[idx],
      }));

      // Batch update using a transaction
      await db.$transaction(
        values.map(({ id, embedding }) =>
          db.$executeRaw`
            UPDATE "Document"
            SET embedding = ${JSON.stringify(embedding)}::vector
            WHERE id = ${id}
          `
        )
      );

      embedded += batch.length;
    } catch (error) {
      // Log failures but continue with next batch
      for (const doc of batch) {
        errors.push({
          id: doc.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    onProgress?.({ current: i + batch.length, total });

    // Rate limit: OpenAI allows ~3000 RPM for embeddings
    if (i + EMBED_BATCH_SIZE < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return {
    total,
    embedded,
    failed: errors.length,
    errors,
    durationMs: Date.now() - start,
  };
}
```

```typescript
// app/api/admin/embed/route.ts
import { batchEmbedDocuments } from '@/lib/embeddings/pipeline';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const { documentIds } = await req.json();

  const result = await batchEmbedDocuments(documentIds);

  return Response.json({
    message: `Embedded ${result.embedded}/${result.total} documents`,
    ...result,
  });
}
```

### Example 4: Hybrid Search with RRF

Combine vector similarity and full-text search with Reciprocal Rank Fusion for better results.

```typescript
// lib/search/hybrid.ts
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';

const RRF_K = 60; // RRF constant — standard value

interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string | null;
  score: number;
  sources: ('vector' | 'fulltext')[];
}

export async function hybridSearch(
  query: string,
  options: {
    limit?: number;
    category?: string;
    vectorWeight?: number;
    fulltextWeight?: number;
  } = {}
): Promise<SearchResult[]> {
  const {
    limit = 10,
    category,
    vectorWeight = 1.0,
    fulltextWeight = 1.0,
  } = options;

  // Fetch more candidates than needed for RRF fusion
  const candidateLimit = limit * 3;

  // 1. Vector search
  const queryEmbedding = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: query,
  });

  const vectorResults = await db.$queryRaw<
    Array<{ id: string; title: string; content: string; category: string | null; rank: number }>
  >`
    SELECT id, title, content, category,
           ROW_NUMBER() OVER (ORDER BY embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector) AS rank
    FROM "Document"
    WHERE embedding IS NOT NULL
    ${category ? db.$queryRaw`AND category = ${category}` : db.$queryRaw``}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector
    LIMIT ${candidateLimit}
  `;

  // 2. Full-text search
  const fulltextResults = await db.$queryRaw<
    Array<{ id: string; title: string; content: string; category: string | null; rank: number }>
  >`
    SELECT id, title, content, category,
           ROW_NUMBER() OVER (ORDER BY ts_rank_cd(search_vector, plainto_tsquery('english', ${query})) DESC) AS rank
    FROM "Document"
    WHERE search_vector @@ plainto_tsquery('english', ${query})
    ${category ? db.$queryRaw`AND category = ${category}` : db.$queryRaw``}
    ORDER BY ts_rank_cd(search_vector, plainto_tsquery('english', ${query})) DESC
    LIMIT ${candidateLimit}
  `;

  // 3. Reciprocal Rank Fusion
  const scoreMap = new Map<
    string,
    { doc: (typeof vectorResults)[0]; score: number; sources: ('vector' | 'fulltext')[] }
  >();

  for (const doc of vectorResults) {
    const rrfScore = vectorWeight * (1 / (RRF_K + doc.rank));
    scoreMap.set(doc.id, {
      doc,
      score: rrfScore,
      sources: ['vector'],
    });
  }

  for (const doc of fulltextResults) {
    const rrfScore = fulltextWeight * (1 / (RRF_K + doc.rank));
    const existing = scoreMap.get(doc.id);

    if (existing) {
      existing.score += rrfScore;
      existing.sources.push('fulltext');
    } else {
      scoreMap.set(doc.id, {
        doc,
        score: rrfScore,
        sources: ['fulltext'],
      });
    }
  }

  // 4. Sort by fused score and return top results
  const fused = Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return fused.map(({ doc, score, sources }) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    category: doc.category,
    score: Math.round(score * 10000) / 10000,
    sources,
  }));
}
```

```typescript
// app/api/search/hybrid/route.ts
import { hybridSearch } from '@/lib/search/hybrid';
import { z } from 'zod';

const HybridSearchQuery = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().min(1).max(50).default(10),
  category: z.string().optional(),
  vectorWeight: z.number().min(0).max(2).default(1.0),
  fulltextWeight: z.number().min(0).max(2).default(1.0),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = HybridSearchQuery.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const results = await hybridSearch(parsed.data.query, parsed.data);

  return Response.json({
    query: parsed.data.query,
    count: results.length,
    results,
  });
}
```

---

## Common Mistakes

### 1. Wrong Distance Metric

**Wrong:** Using Euclidean distance (L2) for text embeddings from OpenAI or Cohere models.

**Fix:** Use cosine distance (`<=>` in pgvector) as the default. Text embedding models produce vectors where direction matters more than magnitude. Cosine distance normalizes for length, making it the correct metric for semantic similarity. Only use L2 or inner product if the embedding model documentation specifically recommends it.

### 2. No Index on the Vector Column

**Wrong:**

```sql
SELECT * FROM documents ORDER BY embedding <=> $1 LIMIT 10;
-- Full table scan on every query — O(n) per search
```

**Fix:** Create an HNSW or IVFFlat index. Without it, every search scans every row. At 100K documents, queries go from 5ms to 500ms+. Create the index after initial data load for faster build time.

### 3. Mixing Embedding Models

**Wrong:** Embedding some documents with `text-embedding-3-small` and others with `text-embedding-ada-002`, then querying across all of them.

**Fix:** All vectors in a collection must come from the same model. Different models produce vectors in different spaces — comparing them is meaningless. If you upgrade models, re-embed the entire collection. Store the model name with each vector so you can detect mismatches.

### 4. Embedding Entire Documents

**Wrong:** Embedding a 50-page PDF as a single vector.

**Fix:** Chunk documents before embedding. A single embedding captures the "average meaning" of its input — long texts get a blurry, averaged vector that matches everything weakly. Chunk into 200-500 token segments with overlap. See the RAG guide for chunking strategies.

### 5. No Metadata Filtering

**Wrong:** Running a vector search across all documents when the user only needs results from a specific category, date range, or permission level.

**Fix:** Combine vector search with SQL `WHERE` clauses. Filter by category, tenant, date, or access permissions before (or during) the vector search. pgvector handles this naturally since vectors live in regular SQL tables.

```sql
-- Filter BEFORE vector search (efficient — reduces candidate set)
SELECT id, content, 1 - (embedding <=> $1) AS similarity
FROM documents
WHERE category = 'help-center'
  AND tenant_id = $2
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY embedding <=> $1
LIMIT 10;
```

### 6. Ignoring Embedding Costs

**Wrong:** Re-embedding the same document on every page load, or embedding user queries without caching.

**Fix:** Embed at write time, not read time. Cache query embeddings for repeated searches (e.g., semantic cache with a short TTL). Track embedding API costs in your billing dashboard. At $0.02/1M tokens, costs are low but can add up with high-volume batch operations.

### 7. Choosing a Vector Database Too Early

**Wrong:** Starting a new project with Pinecone or Weaviate because "we'll need to scale."

**Fix:** Start with pgvector in your existing PostgreSQL database. It handles millions of vectors efficiently. Only move to a dedicated vector DB when you have concrete evidence that pgvector is the bottleneck (not the embedding model, not the LLM, not your application code).

### 8. No Dimension Reduction

**Wrong:** Using 3072-dimensional vectors from `text-embedding-3-large` when 512 dimensions would give 95% of the quality at 1/6 the storage.

**Fix:** Test dimension reduction. `text-embedding-3-small` can reduce from 1536 to 512 or 256 dimensions via the `dimensions` parameter with minimal quality loss. Measure recall on your specific data before and after reduction. Lower dimensions mean faster searches, less storage, and lower costs.

### 9. Pure Vector Search for Everything

**Wrong:** Using only vector similarity for a product catalog search where users type exact product names and SKUs.

**Fix:** Implement hybrid search. Vector search is poor at exact matches — "MacBook Pro M3" as a query might rank a review about laptop performance higher than the actual product page. Full-text search handles exact terms perfectly. Combine both with RRF for the best of both worlds.

---

> **See also:** [RAG](../RAG/rag.md) | [LLM-Patterns](../LLM-Patterns/llm-patterns.md) | [Backend/Database-Design](../../Backend/Database-Design/database-design.md) | [Backend/Caching-Strategies](../../Backend/Caching-Strategies/caching-strategies.md) | [Tools/Databases](../../Tools/Databases/databases.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
