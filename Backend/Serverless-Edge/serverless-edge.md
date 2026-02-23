# Serverless & Edge

> Edge functions, Lambda, cold starts, Vercel/Cloudflare Workers, event-driven architecture, streaming responses, runtime constraints, database connections, and file storage — running code without managing servers.

---

## Principles

### 1. Serverless Mental Model

Serverless is a deployment model, not a technology. Your code runs in ephemeral containers that spin up on demand and shut down after inactivity. You pay per invocation, not per hour.

**Key characteristics:**
- **Stateless** — each invocation starts fresh. No in-memory state between requests.
- **Ephemeral** — the runtime environment may be destroyed at any time.
- **Auto-scaling** — scales from zero to thousands of instances automatically.
- **Pay-per-use** — billed by invocation count and execution time, not by uptime.
- **Cold starts** — the first invocation after idle period takes longer (container initialization).

**What this means for your code:**
- No persistent connections (database, WebSocket, Redis) unless you use connection pooling
- No local file system storage that persists between invocations
- No background threads or long-running processes
- Environment variables and secrets are loaded per invocation
- Global variables persist within a warm instance but not across cold starts

### 2. Edge vs Serverless vs Traditional Server

These are three points on a spectrum of control vs. convenience.

| Factor | Edge | Serverless | Traditional Server |
|--------|------|------------|-------------------|
| **Location** | Runs in 300+ PoPs worldwide | Runs in 1–3 regions | Runs in 1 region |
| **Latency** | 10–50ms (closest PoP) | 50–200ms (region) | 50–300ms (single region) |
| **Cold start** | <5ms (V8 isolates) | 100–500ms (containers) | None |
| **Runtime** | Limited (no Node.js APIs) | Full Node.js | Full Node.js + system access |
| **Execution time** | 30s max (varies) | 5–15 min | Unlimited |
| **Use case** | Auth, A/B testing, geolocation, redirects | API routes, webhooks, cron | WebSockets, long tasks, background jobs |
| **Cost** | Very low per request | Low per request | Fixed per hour |
| **Examples** | Cloudflare Workers, Vercel Edge | Vercel Functions, AWS Lambda | EC2, Railway, Fly.io |

**Decision guide:**
- **Edge** — middleware, redirects, A/B testing, auth checks, geolocation, simple API responses
- **Serverless** — CRUD APIs, webhooks, scheduled tasks, form processing
- **Traditional** — WebSockets, long-running jobs, persistent connections, CPU-intensive work

### 3. Vercel Serverless Functions

Next.js Route Handlers and Server Actions are Vercel Serverless Functions by default. They run in AWS Lambda under the hood.

```typescript
// app/api/posts/route.ts — Serverless Function (default)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const posts = await db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return Response.json({ data: posts });
}

// Force edge runtime
export const runtime = "edge";

// Configure timeout and region
export const maxDuration = 30; // seconds (Pro plan: up to 300s)
```

**Vercel-specific configuration:**

```typescript
// vercel.json (or next.config.ts)
{
  "functions": {
    "app/api/heavy-processing/route.ts": {
      "maxDuration": 60,        // seconds
      "memory": 1024            // MB
    }
  }
}
```

**Server Actions as serverless:**

```typescript
// app/actions/posts.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  const post = await db.post.create({
    data: { title, content, authorId: session.user.id },
  });

  revalidatePath("/posts");
  return post;
}
```

### 4. Cloudflare Workers

Cloudflare Workers run on V8 isolates (not Node.js containers). They start in under 5ms, run at 300+ edge locations, and have a different API surface than Node.js.

**Key differences from Node.js:**
- No `fs`, `path`, `crypto` (use Web Crypto API), `net`, `child_process`
- Limited to Web APIs: `fetch`, `Request`, `Response`, `Headers`, `URL`, `TextEncoder`, `crypto.subtle`
- 128MB memory limit (free), 10ms CPU time (free) / 30s (paid)
- Access to Cloudflare primitives: KV, D1, R2, Durable Objects, Workers AI

```typescript
// worker.ts (Cloudflare Worker)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/posts") {
      // D1 is Cloudflare's SQLite-at-the-edge database
      const posts = await env.DB.prepare(
        "SELECT id, title, created_at FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT 20"
      )
        .bind("published")
        .all();

      return Response.json({ data: posts.results });
    }

    if (url.pathname.startsWith("/api/cache/")) {
      // KV is global key-value storage
      const key = url.pathname.replace("/api/cache/", "");
      const value = await env.KV.get(key);

      if (value) return Response.json({ data: JSON.parse(value) });
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return new Response("Not found", { status: 404 });
  },
};

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
}
```

### 5. AWS Lambda

AWS Lambda is the original serverless platform. It runs containers, supports multiple runtimes, and integrates with the entire AWS ecosystem.

**Handler pattern:**

```typescript
// handler.ts (AWS Lambda)
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const { httpMethod, pathParameters, body, queryStringParameters } = event;

  if (httpMethod === "GET" && pathParameters?.id) {
    const post = await getPost(pathParameters.id);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: post }),
    };
  }

  if (httpMethod === "POST") {
    const data = JSON.parse(body ?? "{}");
    const post = await createPost(data);
    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: post }),
    };
  }

  return { statusCode: 404, body: "Not found" };
};
```

**Event sources:**

Lambda can be triggered by many AWS services:

| Source | Use Case |
|--------|----------|
| API Gateway | HTTP API |
| SQS | Queue processing |
| S3 | File upload processing |
| EventBridge | Scheduled tasks (cron) |
| DynamoDB Streams | Change data capture |
| SNS | Pub/Sub |

### 6. Cold Start Optimization

Cold starts occur when a new serverless instance must initialize. The duration depends on runtime, bundle size, and initialization code.

**Cold start by runtime:**

| Runtime | Typical Cold Start |
|---------|-------------------|
| Cloudflare Workers (V8 isolates) | <5ms |
| Vercel Edge Runtime | <5ms |
| AWS Lambda (Node.js) | 100–500ms |
| AWS Lambda (Java) | 1–10 seconds |
| Vercel Serverless (Node.js) | 100–300ms |

**Optimization techniques:**

```typescript
// 1. Lazy imports — only load heavy modules when needed
export async function handler(event: Event) {
  // Don't import at top level if not always needed
  if (event.type === "image-processing") {
    const sharp = await import("sharp");
    return sharp.default(event.body).resize(800).toBuffer();
  }
  // Light path — no heavy imports
  return { statusCode: 200, body: "OK" };
}

// 2. Initialize outside the handler (reused across warm invocations)
// This runs once per container, not per invocation
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

export async function handler(event: Event) {
  // prisma and redis are already initialized on warm starts
  const user = await prisma.user.findUnique({ where: { id: event.userId } });
  return user;
}
```

**Bundle size reduction:**
- Use `tree-shaking` — import specific functions, not entire libraries
- Avoid large dependencies in serverless functions (no `moment.js`, use `date-fns`)
- Use `esbuild` or `tsup` to bundle and minify
- Move heavy processing to background jobs

**Provisioned concurrency (AWS Lambda):**

```yaml
# serverless.yml / SAM template
functions:
  api:
    handler: handler.main
    provisionedConcurrency: 5  # 5 warm instances always ready
```

### 7. Streaming Responses

Streaming lets you send data incrementally instead of waiting for the entire response to be ready. Critical for AI responses, large datasets, and real-time feeds.

```typescript
// app/api/stream/route.ts (Next.js streaming)
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Stream data chunks
      for (let i = 0; i < 10; i++) {
        const data = JSON.stringify({ chunk: i, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// AI response streaming (e.g., with OpenAI / Anthropic)
export async function POST(request: Request) {
  const { messages } = await request.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      stream: true,
      messages,
    }),
  });

  // Forward the stream directly to the client
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

### 8. Database Connections in Serverless

The biggest pain point in serverless: database connections. Each serverless instance opens its own connection. With 100 concurrent instances, you have 100 connections — quickly exhausting PostgreSQL's limit.

**Solutions:**

| Solution | How | When |
|----------|-----|------|
| **Connection pooler** | PgBouncer/Supavisor sits between app and DB | Self-managed PostgreSQL |
| **Neon serverless driver** | HTTP/WebSocket-based, no persistent connections | Neon PostgreSQL |
| **PlanetScale serverless** | HTTP-based driver | PlanetScale MySQL |
| **Prisma Accelerate** | Managed connection pool + global cache | Any Prisma project |
| **Drizzle + HTTP driver** | Uses Neon/PlanetScale HTTP drivers natively | Drizzle projects |

```typescript
// Neon serverless driver (no persistent connections)
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const posts = await sql`
    SELECT id, title, created_at
    FROM posts
    WHERE status = 'published'
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return Response.json({ data: posts });
}

// Prisma with connection string for serverless
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL") // For migrations (bypasses pooler)
}

// Connection string with pooler
// DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1"
// DIRECT_DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### 9. File Storage

Serverless functions have no persistent file system. Use object storage for file uploads and processing.

**Options:**

| Service | Provider | Best For |
|---------|----------|----------|
| S3 | AWS | Full control, lifecycle policies |
| R2 | Cloudflare | Zero egress fees |
| Vercel Blob | Vercel | Simple file storage for Next.js |
| Supabase Storage | Supabase | Integrated with Supabase auth |

**Presigned URL upload pattern:**

Upload files directly from the client to storage, bypassing your server:

```typescript
// app/api/upload/route.ts — Generate presigned upload URL
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  const session = await requireAuth();
  const { filename, contentType } = await request.json();

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(contentType)) {
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  }

  const key = `uploads/${session.user.id}/${randomUUID()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: contentType,
    ContentLength: undefined,
    Metadata: { userId: session.user.id },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes

  return Response.json({
    uploadUrl,
    key,
    publicUrl: `${process.env.CDN_URL}/${key}`,
  });
}

// Client-side upload
async function uploadFile(file: File) {
  // 1. Get presigned URL
  const { uploadUrl, publicUrl } = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  }).then((r) => r.json());

  // 2. Upload directly to S3
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  return publicUrl;
}
```

### 10. Deployment and Configuration

Serverless deployment is code + configuration. Get the configuration wrong and you waste money, hit limits, or create security holes.

**Environment variables and secrets:**

```bash
# Vercel
vercel env add DATABASE_URL production
vercel env add REDIS_URL production

# AWS Lambda (via SSM Parameter Store)
aws ssm put-parameter --name "/app/prod/DATABASE_URL" --value "..." --type SecureString

# Cloudflare Workers
wrangler secret put DATABASE_URL
```

**Configuration checklist:**
- Set timeouts appropriate for your workload (5s for API, 30s for processing)
- Configure memory based on workload (128MB for simple, 1024MB for CPU-intensive)
- Set concurrency limits to prevent runaway scaling costs
- Use environment-specific secrets (never share between staging and production)
- Configure regions close to your database
- Set up monitoring and alerting on error rates and duration

**Region strategy:**

```
Database: us-east-1
Serverless functions: us-east-1 (same region as DB)
Edge functions: All regions (for middleware, auth checks)
CDN: Global (for static assets and cached API responses)
```

---

## LLM Instructions

### Choosing a Runtime

When selecting serverless vs edge vs traditional:

- **Edge runtime** for: middleware, redirects, authentication checks, geolocation, A/B testing, simple API responses with no heavy dependencies
- **Serverless (Node.js)** for: API routes with database access, form processing, webhook handlers, file processing, anything needing full Node.js APIs
- **Traditional server** for: WebSockets, long-running background jobs (>15 min), persistent connections, high-CPU workloads, tasks requiring local file system
- Default to serverless for most API routes in a Next.js application
- Use edge only when latency is critical and the work is lightweight

### Setting Up Vercel Functions

When creating Vercel Serverless Functions:

- Each file in `app/api/` is automatically a serverless function
- Set `maxDuration` in the route file for long-running operations
- Use `runtime = "edge"` only when you need edge execution
- Put database initialization outside the handler (reused on warm starts)
- Use Prisma singleton pattern to avoid connection leaks
- Configure regions in `vercel.json` to match your database location
- Use streaming (`ReadableStream`) for large or incremental responses

### Edge Function Patterns

When writing edge functions:

- Stick to Web APIs only — no `fs`, `path`, `crypto` (use `crypto.subtle`)
- Keep dependencies minimal — every byte affects cold start
- Use `fetch` for external calls (including to your own API)
- Use Cloudflare KV or Vercel Edge Config for configuration data at the edge
- Use edge for auth checks, then proxy to serverless for database work
- Return early for cached/simple responses — don't touch the database if unnecessary

### Database in Serverless

When connecting to a database from serverless functions:

- Never use a raw PostgreSQL connection without pooling
- Use a connection pooler: PgBouncer, Neon serverless driver, Prisma Accelerate
- Set `connection_limit=1` per serverless instance (the pooler handles multiplexing)
- Use `directUrl` for migrations (bypasses the pooler for DDL operations)
- Initialize the database client outside the handler function
- Use the Prisma singleton pattern in development to avoid connection leaks
- Consider HTTP-based database drivers (Neon, PlanetScale) for zero-connection-overhead

### Handling File Uploads

When implementing file uploads in serverless:

- Never process large files in the serverless function — use presigned URLs for direct upload
- Generate a presigned URL server-side, upload client-side directly to S3/R2/Blob
- Validate file type and size before generating the presigned URL
- Use a unique key for each upload (UUID + filename)
- Set up a CDN in front of the storage bucket for serving files
- For processing (resize, transcode), trigger a background job after upload completes
- Set content-type correctly on upload — it affects how browsers handle the file

---

## Examples

### 1. Next.js Route Handler with Streaming

An API endpoint that streams data incrementally:

```typescript
// app/api/export/route.ts
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const session = await requireAuth();
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const batchSize = 100;
      let cursor: string | undefined;

      // Stream header
      if (format === "csv") {
        controller.enqueue(encoder.encode("id,title,status,created_at\n"));
      } else {
        controller.enqueue(encoder.encode('{"data":[\n'));
      }

      let isFirst = true;

      while (true) {
        const posts = await db.post.findMany({
          where: { authorId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: batchSize,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
          select: { id: true, title: true, status: true, createdAt: true },
        });

        if (posts.length === 0) break;

        for (const post of posts) {
          if (format === "csv") {
            controller.enqueue(
              encoder.encode(`${post.id},"${post.title}",${post.status},${post.createdAt.toISOString()}\n`)
            );
          } else {
            const prefix = isFirst ? "" : ",\n";
            controller.enqueue(encoder.encode(prefix + JSON.stringify(post)));
            isFirst = false;
          }
        }

        cursor = posts[posts.length - 1].id;
        if (posts.length < batchSize) break;
      }

      // Stream footer
      if (format !== "csv") {
        controller.enqueue(encoder.encode("\n]}"));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv" : "application/json",
      "Content-Disposition": `attachment; filename="posts-export.${format}"`,
      "Transfer-Encoding": "chunked",
    },
  });
}

export const maxDuration = 60; // Allow up to 60s for large exports
```

### 2. Cloudflare Worker with D1 and KV

A complete Cloudflare Worker using D1 (database) and KV (cache):

```typescript
// src/worker.ts
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS: R2Bucket;
  API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /api/posts — cached list
      if (url.pathname === "/api/posts" && request.method === "GET") {
        // Check KV cache
        const cached = await env.CACHE.get("posts:list", "json");
        if (cached) {
          return Response.json({ data: cached, cached: true }, { headers: corsHeaders });
        }

        // Query D1
        const { results } = await env.DB.prepare(
          "SELECT id, title, status, created_at FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT 50"
        ).bind("published").all();

        // Cache for 5 minutes
        await env.CACHE.put("posts:list", JSON.stringify(results), { expirationTtl: 300 });

        return Response.json({ data: results, cached: false }, { headers: corsHeaders });
      }

      // POST /api/posts — create
      if (url.pathname === "/api/posts" && request.method === "POST") {
        const auth = request.headers.get("Authorization");
        if (auth !== `Bearer ${env.API_KEY}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
        }

        const body = await request.json() as { title: string; content: string };
        const id = crypto.randomUUID();

        await env.DB.prepare(
          "INSERT INTO posts (id, title, content, status, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
        ).bind(id, body.title, body.content, "published").run();

        // Invalidate cache
        await env.CACHE.delete("posts:list");

        return Response.json({ data: { id } }, { status: 201, headers: corsHeaders });
      }

      // GET /files/:key — serve from R2
      if (url.pathname.startsWith("/files/")) {
        const key = url.pathname.replace("/files/", "");
        const object = await env.ASSETS.get(key);

        if (!object) {
          return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
        }

        return new Response(object.body, {
          headers: {
            "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            ...corsHeaders,
          },
        });
      }

      return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error("Worker error:", error);
      return Response.json(
        { error: "Internal server error" },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
```

### 3. AWS Lambda with SQS Trigger

A Lambda function that processes messages from an SQS queue:

```typescript
// handler.ts
import type { SQSHandler, SQSRecord } from "aws-lambda";
import { db } from "./lib/db";
import { sendEmail } from "./lib/email";

interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export const handler: SQSHandler = async (event) => {
  const results = await Promise.allSettled(
    event.Records.map((record) => processRecord(record))
  );

  // Report failures for SQS to retry
  const failures = results
    .map((result, index) => ({
      result,
      record: event.Records[index],
    }))
    .filter(({ result }) => result.status === "rejected");

  if (failures.length > 0) {
    // Return failed message IDs for SQS partial batch failure
    return {
      batchItemFailures: failures.map(({ record }) => ({
        itemIdentifier: record.messageId,
      })),
    };
  }
};

async function processRecord(record: SQSRecord) {
  const job: EmailJob = JSON.parse(record.body);

  console.log(JSON.stringify({
    level: "info",
    messageId: record.messageId,
    to: job.to,
    template: job.template,
    msg: "Processing email job",
  }));

  await sendEmail(job);

  // Record delivery
  await db.emailLog.create({
    data: {
      to: job.to,
      subject: job.subject,
      template: job.template,
      sentAt: new Date(),
      messageId: record.messageId,
    },
  });
}
```

### 4. Serverless Database Connection with Neon

Connecting to Neon PostgreSQL from serverless with zero persistent connections:

```typescript
// lib/db.ts (Neon serverless driver + Drizzle)
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

// HTTP-based connection — no persistent TCP connection
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Usage in API route
// app/api/posts/route.ts
import { db } from "@/lib/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const results = await db
    .select({
      id: posts.id,
      title: posts.title,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.createdAt))
    .limit(20);

  return Response.json({ data: results });
}

// For connection pooling with WebSockets (more performant for high-throughput)
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const dbPooled = drizzle(pool, { schema });
```

### 5. Presigned URL Upload Flow

Complete file upload system with presigned URLs, validation, and CDN serving:

```typescript
// app/api/uploads/presign/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum([
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
    "text/csv",
  ]),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
});

export async function POST(request: Request) {
  const session = await requireAuth();
  const body = PresignSchema.parse(await request.json());

  const extension = body.filename.split(".").pop() ?? "bin";
  const key = `uploads/${session.user.organizationId}/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: body.contentType,
    ContentLength: body.size,
    Metadata: {
      userId: session.user.id,
      originalFilename: body.filename,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

  return Response.json({
    uploadUrl,
    fileUrl: `${process.env.CDN_URL}/${key}`,
    key,
  });
}

// app/api/uploads/confirm/route.ts
// Called after client uploads to confirm and create DB record
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(request: Request) {
  const session = await requireAuth();
  const { key, filename, contentType, size } = await request.json();

  const upload = await db.upload.create({
    data: {
      key,
      filename,
      contentType,
      size,
      userId: session.user.id,
      organizationId: session.user.organizationId!,
      url: `${process.env.CDN_URL}/${key}`,
    },
  });

  return Response.json({ data: upload }, { status: 201 });
}
```

---

## Common Mistakes

### 1. Long-Running Tasks in Serverless

**Wrong:** Processing a 10-minute video transcoding job inside a serverless function that times out at 30 seconds.

**Fix:** Use serverless for receiving the request, then queue the work for a background job (BullMQ, SQS, Inngest). Return a 202 Accepted with a job ID. Let the client poll for status.

### 2. Persistent Connections in Lambda

**Wrong:** Opening a new database connection per invocation without pooling, exhausting the database's connection limit.

**Fix:** Use a connection pooler (PgBouncer, Neon serverless, Prisma Accelerate). Set `connection_limit=1` per instance. Initialize the client outside the handler function so warm instances reuse connections.

### 3. Large Bundle Sizes

**Wrong:** Bundling `sharp`, `puppeteer`, or the entire `aws-sdk` into a serverless function, causing 2-second cold starts.

**Fix:** Import only what you need (`@aws-sdk/client-s3` not `aws-sdk`). Use tree-shaking. Move heavy processing to dedicated functions or containers. Consider Lambda layers for large shared dependencies.

### 4. No Timeout Handling

**Wrong:** A serverless function calls an external API that hangs, consuming the entire execution budget until the platform kills it.

**Fix:** Set explicit timeouts on all external calls. Use `AbortController` with `fetch`. Set the function timeout lower than the platform maximum to allow for cleanup.

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

### 5. Ignoring Cold Start Impact

**Wrong:** Not measuring cold start impact and providing a poor experience for the first user after an idle period.

**Fix:** Measure cold start frequency and duration. Use provisioned concurrency for critical paths. Keep bundle sizes small. Initialize heavy resources lazily. Consider edge functions for latency-critical routes.

### 6. Cloudflare Workers with Node.js APIs

**Wrong:** Trying to use `fs`, `path`, `Buffer.from()`, or `crypto.createHash()` in a Cloudflare Worker and getting runtime errors.

**Fix:** Use Web APIs only in Workers. Replace `Buffer` with `TextEncoder`/`TextDecoder`. Replace `crypto` with `crypto.subtle`. Replace `path.join` with string concatenation. Check the Workers runtime API compatibility before choosing libraries.

### 7. No Concurrency Limits

**Wrong:** A traffic spike causes 10,000 concurrent Lambda invocations, overwhelming the database and tripling the AWS bill.

**Fix:** Set reserved concurrency limits on Lambda functions. Use queue-based processing for traffic spikes. Configure auto-scaling limits on Vercel. Add rate limiting at the API gateway level.

### 8. Secrets in Code

**Wrong:** Hardcoding API keys, database URLs, or tokens in serverless function code.

**Fix:** Use environment variables for all secrets. Use your platform's secrets management (Vercel Environment Variables, AWS SSM Parameter Store, Cloudflare Secrets). Never commit `.env` files.

### 9. Synchronous File Processing

**Wrong:** Receiving a file upload in the serverless function, processing it synchronously, and returning the result — timeout on large files.

**Fix:** Use presigned URLs for client-to-storage direct upload. After upload completes, trigger an async processing pipeline (S3 event → Lambda, or webhook → background job).

### 10. No Monitoring or Alerting

**Wrong:** Deploying serverless functions with no visibility into errors, cold starts, or costs until the bill arrives.

**Fix:** Set up monitoring from day one. Track: invocation count, error rate, duration (p50/p95/p99), cold start frequency, concurrent executions. Alert on: error rate > 1%, p99 duration > timeout/2, cost anomalies.

---

> **See also:** [API-Design](../API-Design/api-design.md) | [Database-Design](../Database-Design/database-design.md) | [Background-Jobs](../Background-Jobs/background-jobs.md) | [Caching-Strategies](../Caching-Strategies/caching-strategies.md) | [Real-Time](../Real-Time/real-time.md)
>
> **Last reviewed:** 2026-02
