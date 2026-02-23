# Backend Vibe Coding Knowledge Base

> API design, database architecture, caching, error handling, authentication, serverless, background jobs, webhooks, and real-time — structured for AI-assisted development. Feed these files to your AI coding assistant to build robust backends by default.

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack multiple files** for complex tasks — the guides cross-reference each other.
4. **Describe what you're building** and the AI now has expert-level backend context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| Building a REST API from scratch | `API-Design` + `Database-Design` + `Error-Handling-Logging` |
| Adding auth to a Next.js app | `Auth-Sessions` + `Database-Design` + `Security/Authentication-Identity` |
| Optimizing a slow application | `Caching-Strategies` + `Database-Design` + `Serverless-Edge` |
| Processing background work | `Background-Jobs` + `Error-Handling-Logging` + `Webhooks-Integrations` |
| Building real-time features | `Real-Time` + `Caching-Strategies` + `Auth-Sessions` |
| Integrating third-party services | `Webhooks-Integrations` + `Error-Handling-Logging` + `Background-Jobs` |

**Pro tip:** Start every backend project by pasting `API-Design` + `Database-Design` into your AI session. These two files establish the conventions that every other backend decision builds on.

---

## Guides

```
Backend/
├── API-Design/              → REST conventions, response shapes, pagination, versioning, GraphQL, OpenAPI
├── Database-Design/         → Schema design, PostgreSQL, Prisma & Drizzle, indexing, migrations, multi-tenancy
├── Caching-Strategies/      → Redis, HTTP caching, CDN, cache invalidation, stale-while-revalidate
├── Error-Handling-Logging/  → Structured logging, Pino, retry patterns, circuit breakers, observability
├── Auth-Sessions/           → Session architecture, Auth.js, Lucia, middleware patterns, API keys, OAuth
├── Serverless-Edge/         → Edge functions, Lambda, cold starts, Vercel/Cloudflare Workers, streaming
├── Background-Jobs/         → BullMQ, queue patterns, cron jobs, dead letter queues, Inngest
├── Webhooks-Integrations/   → Sending/receiving webhooks, idempotency, circuit breakers, event systems
└── Real-Time/               → WebSockets, SSE, Pub/Sub, presence, Socket.io, managed services
```

### [API Design](./API-Design/api-design.md)
REST conventions, resource naming, HTTP methods and status codes, response shape consistency, cursor-based pagination, filtering and sorting, API versioning with sunset policies, RFC 7807 error format, GraphQL patterns with DataLoader, OpenAPI documentation from Zod schemas, and rate limiting design. Includes complete CRUD implementation for Next.js Route Handlers with validation and error handling.

### [Database Design](./Database-Design/database-design.md)
Schema design fundamentals, PostgreSQL as default, Prisma and Drizzle ORM comparison, indexing strategy (B-tree, GIN, composite, partial, covering), relationships and foreign keys, zero-downtime migrations, connection pooling for serverless, query optimization with EXPLAIN ANALYZE, multi-tenancy with Row-Level Security, transactions and optimistic locking, and database testing with factories. Includes complete SaaS schema in both Prisma and Drizzle.

### [Caching Strategies](./Caching-Strategies/caching-strategies.md)
Cache-aside (lazy loading), write-through and write-behind patterns, Redis as application cache (data types, TTL, eviction), HTTP caching (Cache-Control, ETag, stale-while-revalidate), Next.js caching layers and revalidation, cache invalidation strategies (TTL, event-driven, tag-based), CDN and edge caching, cache stampede prevention with mutex, and multi-layer distributed caching (local + Redis + DB).

### [Error Handling & Logging](./Error-Handling-Logging/error-handling-logging.md)
Error classification (operational vs programmer), centralized error handling, structured JSON logging with Pino, correlation IDs with AsyncLocalStorage, retry with exponential backoff and jitter, circuit breaker pattern, graceful degradation with fallbacks, observability stack (OpenTelemetry, Sentry), process-level error handling (SIGTERM, graceful shutdown), and dead letter queues for failed jobs.

### [Auth & Sessions](./Auth-Sessions/auth-sessions.md)
Session-based vs token-based architecture, Auth.js v5 setup with providers and database adapter, Lucia for custom session management, session storage (database, Redis, JWT), Next.js middleware auth patterns, token refresh with rotation, multi-tenant authentication, OAuth account linking, API key management (generate, hash, verify, rotate), and auth testing helpers. Cross-references Security chapter for password hashing, JWT theory, RBAC, and CSRF.

### [Serverless & Edge](./Serverless-Edge/serverless-edge.md)
Serverless mental model, edge vs serverless vs traditional server comparison, Vercel Serverless Functions and Server Actions, Cloudflare Workers with D1/KV/R2, AWS Lambda with event sources, cold start optimization (lazy imports, bundle size, provisioned concurrency), streaming responses, database connections in serverless (Neon, Prisma Accelerate), presigned URL file uploads, and deployment configuration.

### [Background Jobs](./Background-Jobs/background-jobs.md)
Queue architecture (producers, brokers, workers), BullMQ setup with Redis, job idempotency patterns, retry strategies with exponential backoff and dead letter queues, scheduled jobs with cron (BullMQ repeat, Vercel Cron), long-running tasks with progress tracking, job monitoring with Bull Board, and serverless alternatives (Inngest, Trigger.dev).

### [Webhooks & Integrations](./Webhooks-Integrations/webhooks-integrations.md)
Webhook architecture, receiving webhooks with signature verification and async processing, sending webhooks with retry and delivery logging, idempotency keys (Stripe pattern), third-party API client patterns with retry and rate limiting, circuit breaker (closed/open/half-open), API client testing with MSW, typed event system with Zod validation, and webhook security (HMAC, replay protection).

### [Real-Time](./Real-Time/real-time.md)
SSE vs WebSockets vs long polling comparison, Server-Sent Events implementation (auto-reconnect, heartbeat), WebSockets with Socket.io (rooms, namespaces, typing indicators), Redis Pub/Sub for multi-server broadcasting, scaling with Redis adapter and sticky sessions, presence and online status tracking, managed services (Ably, Pusher, Supabase Realtime), optimistic UI with real-time sync, and real-time security (auth on connect, per-channel authorization, rate limiting).

---

## Status

Complete — all 9 guides are written and reviewed. Last updated: 2026-02.
