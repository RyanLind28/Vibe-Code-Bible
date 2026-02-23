# Error Handling & Logging

> Structured logging, error classification, retry patterns, observability, Pino, graceful degradation, correlation IDs, and production error handling — because broken things should tell you why they broke.

---

## Principles

### 1. Error Classification

Not all errors are the same. Your handling strategy depends on what kind of error you are dealing with.

**Operational errors** — expected failures in the normal course of operation:
- Database connection timeout
- External API returning 503
- User submitting invalid input
- File not found
- Rate limit exceeded

These are handled with retries, fallbacks, user messages, and logging at `warn` level.

**Programmer errors** — bugs in the code:
- Calling a function with wrong argument types
- Reading a property of `undefined`
- Off-by-one in array access
- Unhandled promise rejection

These should crash the process (in a managed way) and be fixed immediately. Retrying a programmer error does nothing.

**Classification matrix:**

| | Recoverable | Fatal |
|--|-------------|-------|
| **Expected** | Validation error, 404, rate limit | Corrupted database, lost encryption key |
| **Unexpected** | Network timeout, 503 from dependency | Null reference, type error, OOM |

### 2. Error Handling Strategy

**Throw early, catch late.** Detect errors as close to the source as possible (validate input at the boundary), but handle them at the highest appropriate level (centralized error handler).

**Rules:**
- Validate input at the API boundary — never let bad data propagate
- Use typed error classes — don't throw raw strings or generic `Error`
- Let errors bubble up — don't catch-and-swallow in low-level functions
- Handle errors in one place — centralized error handler for API routes
- Map errors to appropriate responses — 400 for validation, 404 for missing, 500 for unexpected
- Log the full context — request ID, user ID, endpoint, stack trace (server-side only)

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public isOperational: boolean = true,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: Array<{ field: string; message: string }>) {
    return new AppError("BAD_REQUEST", message, 400, true, details);
  }

  static notFound(resource: string) {
    return new AppError("NOT_FOUND", `${resource} not found`, 404, true);
  }

  static conflict(message: string) {
    return new AppError("CONFLICT", message, 409, true);
  }

  static internal(message: string) {
    return new AppError("INTERNAL_ERROR", message, 500, false);
  }

  static serviceUnavailable(service: string) {
    return new AppError("SERVICE_UNAVAILABLE", `${service} is currently unavailable`, 503, true);
  }
}
```

### 3. Structured Logging

Structured logging means emitting logs as JSON objects with consistent fields, not unstructured strings. JSON logs are searchable, filterable, and parseable by log aggregation tools.

**Pino** is the recommended logger for Node.js — it is the fastest JSON logger available and is the default in Fastify.

```typescript
// lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
  formatters: {
    level(label) {
      return { level: label }; // "info" instead of numeric 30
    },
  },
  base: {
    service: "my-app",
    env: process.env.NODE_ENV,
  },
  redact: {
    paths: ["password", "token", "authorization", "cookie", "*.password", "*.token"],
    casing: "any",
  },
});
```

**Log levels:**

| Level | When |
|-------|------|
| `fatal` | Application cannot continue — database gone, critical config missing |
| `error` | Operation failed — unhandled exception, unexpected failure |
| `warn` | Something concerning — rate limit hit, deprecated API used, slow query |
| `info` | Normal operations — request completed, user action, job processed |
| `debug` | Diagnostic detail — query parameters, cache hit/miss, internal state |
| `trace` | Extremely verbose — full request/response bodies, step-by-step flow |

**Production rules:**
- Default to `info` in production, `debug` in development
- Never use `console.log` in production code — it is unstructured, blocks the event loop, and has no levels
- Log at the request boundary (start and end), not inside every function
- Include context: `userId`, `requestId`, `endpoint`, `duration`
- Redact sensitive fields: passwords, tokens, PII

### 4. Correlation IDs

A correlation ID (request ID) is a unique identifier attached to every log line for a single request. It ties together all logs from one request across services, making debugging possible.

```typescript
// middleware/request-id.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { AsyncLocalStorage } from "async_hooks";

// Store request context across async operations
export const requestContext = new AsyncLocalStorage<{ requestId: string; userId?: string }>();

export function withRequestId(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    const startTime = Date.now();

    return requestContext.run({ requestId }, async () => {
      logger.info({
        requestId,
        method: req.method,
        url: req.nextUrl.pathname,
        msg: "Request started",
      });

      try {
        const response = await handler(req);

        logger.info({
          requestId,
          method: req.method,
          url: req.nextUrl.pathname,
          status: response.status,
          duration: Date.now() - startTime,
          msg: "Request completed",
        });

        response.headers.set("x-request-id", requestId);
        return response;
      } catch (error) {
        logger.error({
          requestId,
          method: req.method,
          url: req.nextUrl.pathname,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          duration: Date.now() - startTime,
          msg: "Request failed",
        });
        throw error;
      }
    });
  };
}

// Access request context anywhere in the call chain
export function getRequestId(): string {
  return requestContext.getStore()?.requestId ?? "no-request-id";
}
```

**Propagation across services:**

When calling other services, pass the correlation ID in the `X-Request-ID` header:

```typescript
const response = await fetch("https://api.payments.example.com/charge", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Request-ID": getRequestId(),
  },
  body: JSON.stringify(chargeData),
});
```

### 5. Retry Patterns

Retries handle transient failures — network blips, temporary overloads, brief service outages. The key is knowing when to retry, how often, and when to stop.

**Exponential backoff with jitter:**

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;    // ms
    maxDelay?: number;     // ms
    retryOn?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 200,
    maxDelay = 10_000,
    retryOn = isRetryable,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !retryOn(error)) {
        throw error;
      }

      // Exponential backoff with full jitter
      const delay = Math.min(
        maxDelay,
        baseDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5)
      );

      logger.warn({
        attempt,
        maxAttempts,
        delay: Math.round(delay),
        error: error instanceof Error ? error.message : "Unknown",
        msg: "Retrying after failure",
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function isRetryable(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) return true;

  // HTTP 5xx or 429 (rate limited)
  if (error instanceof Response) {
    return error.status >= 500 || error.status === 429;
  }

  // Database connection errors
  if (error instanceof Error && error.message.includes("connection")) return true;

  return false;
}
```

**Circuit breaker:**

A circuit breaker prevents cascading failures by stopping requests to a failing service. After a threshold of failures, it "opens" the circuit and returns errors immediately instead of waiting for timeouts.

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30_000, // ms
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new AppError("SERVICE_UNAVAILABLE", "Circuit breaker is open", 503);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
      logger.error({
        msg: "Circuit breaker opened",
        failures: this.failures,
        threshold: this.threshold,
      });
    }
  }
}
```

### 6. Graceful Degradation

When a dependency fails, the application should degrade gracefully rather than fail completely. A missing recommendation engine should not prevent a user from viewing a product page.

**Strategies:**
- **Fallback data** — return cached data when the live source is unavailable
- **Feature flags** — disable non-critical features when their dependencies fail
- **Partial responses** — return what you can, indicate what is missing
- **Default values** — use sensible defaults when a service doesn't respond
- **Health checks** — expose `/health` and `/ready` endpoints for load balancers

```typescript
async function getProductPage(productId: string) {
  // Core data — must succeed
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw AppError.notFound("Product");

  // Non-critical data — degrade gracefully
  const [recommendations, reviews, inventory] = await Promise.allSettled([
    recommendationService.getFor(productId),
    reviewService.getFor(productId),
    inventoryService.checkStock(productId),
  ]);

  return {
    product,
    recommendations: recommendations.status === "fulfilled"
      ? recommendations.value
      : [],  // Empty array fallback
    reviews: reviews.status === "fulfilled"
      ? reviews.value
      : { items: [], total: 0 },  // Empty state fallback
    inStock: inventory.status === "fulfilled"
      ? inventory.value.inStock
      : null,  // Unknown — show "Check availability"
  };
}
```

### 7. Observability Stack

Observability is the ability to understand what your application is doing by looking at its outputs. The three pillars: logs, metrics, and traces.

| Pillar | What | Tool |
|--------|------|------|
| **Logs** | Discrete events with context | Pino → Datadog/Elasticsearch |
| **Metrics** | Numeric measurements over time | OpenTelemetry → Prometheus/Grafana |
| **Traces** | Request flow across services | OpenTelemetry → Jaeger/Tempo |
| **Errors** | Exceptions with context + stack traces | Sentry |

**OpenTelemetry setup:**

```typescript
// instrumentation.ts (Next.js)
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "my-app",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false }, // Noisy
    }),
  ],
});

sdk.start();
```

**Key metrics to track:**

- **Request duration** (p50, p95, p99) — is the API getting slower?
- **Error rate** — what percentage of requests fail?
- **Saturation** — CPU, memory, connection pool utilization
- **Queue depth** — are background jobs backing up?
- **Cache hit ratio** — is the cache actually helping?

### 8. Error Responses to Clients

Error responses should help the client fix the problem. They should never expose internal details.

**What to include:**
- Machine-readable error code (`VALIDATION_ERROR`, `NOT_FOUND`)
- Human-readable message
- Field-level details for validation errors
- Request ID for support reference

**What to never include:**
- Stack traces
- Database error messages
- Internal file paths
- SQL queries
- Environment variables

```typescript
// GOOD: Helpful, safe error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "requestId": "req_abc123",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}

// BAD: Leaks internal details
{
  "error": "PrismaClientKnownRequestError: Unique constraint failed on the fields: (`email`)",
  "stack": "at Object.next (/app/node_modules/.prisma/client/runtime/library.js:1234:56)"
}
```

> Cross-reference: [API-Design](../API-Design/api-design.md) covers RFC 7807 error format in detail. [Security/Backend-Security](../../Security/Backend-Security/backend-security.md) covers information disclosure prevention.

### 9. Process-Level Error Handling

Node.js applications must handle process-level events to prevent silent crashes and data corruption.

```typescript
// lib/process-handlers.ts
import { logger } from "@/lib/logger";

// Unhandled promise rejections (programmer error)
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason, msg: "Unhandled promise rejection" });
  // In production: report to Sentry, then exit
  process.exit(1);
});

// Uncaught exceptions (programmer error)
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error, msg: "Uncaught exception" });
  // Must exit — process is in an undefined state
  process.exit(1);
});

// Graceful shutdown on SIGTERM (deployment, scaling)
process.on("SIGTERM", async () => {
  logger.info({ msg: "SIGTERM received, starting graceful shutdown" });

  // 1. Stop accepting new requests
  server.close();

  // 2. Finish processing in-flight requests (timeout: 30s)
  const shutdownTimeout = setTimeout(() => {
    logger.error({ msg: "Shutdown timeout reached, forcing exit" });
    process.exit(1);
  }, 30_000);

  try {
    // 3. Close database connections
    await prisma.$disconnect();

    // 4. Close Redis connections
    await redis.quit();

    // 5. Wait for background jobs to finish
    await jobQueue.close();

    clearTimeout(shutdownTimeout);
    logger.info({ msg: "Graceful shutdown complete" });
    process.exit(0);
  } catch (error) {
    logger.error({ err: error, msg: "Error during shutdown" });
    process.exit(1);
  }
});

// SIGINT for local development (Ctrl+C)
process.on("SIGINT", () => {
  logger.info({ msg: "SIGINT received" });
  process.exit(0);
});
```

### 10. Dead Letter Queues and Poison Messages

When a background job fails repeatedly, it should not block the queue forever. Dead letter queues (DLQs) capture failed jobs for later analysis and manual retry.

**Poison message:** A message that crashes the consumer every time it is processed. Without a DLQ, it blocks the queue indefinitely.

**Handling strategy:**

1. Set a maximum retry count (e.g., 3 attempts)
2. After max retries, move the job to a DLQ
3. Alert on DLQ growth
4. Provide a UI or CLI to inspect and retry DLQ jobs
5. Log the failure reason and all attempts

```typescript
// See Background-Jobs guide for full BullMQ DLQ implementation
import { Queue, Worker } from "bullmq";

const emailQueue = new Queue("email", {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: false, // Keep failed jobs for inspection
  },
});

const emailWorker = new Worker("email", async (job) => {
  await sendEmail(job.data);
}, {
  connection: redis,
});

// Listen for permanently failed jobs
emailWorker.on("failed", (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    logger.error({
      jobId: job.id,
      queue: "email",
      data: job.data,
      error: error.message,
      attempts: job.attemptsMade,
      msg: "Job moved to DLQ — all retries exhausted",
    });
    // Alert: PagerDuty, Slack, etc.
  }
});
```

> Cross-reference: [Background-Jobs](../Background-Jobs/background-jobs.md) covers DLQ patterns and BullMQ configuration in depth.

---

## LLM Instructions

### Setting Up a Centralized Error Handler

When creating error handling for an API:

- Create an `AppError` class with `code`, `statusCode`, `isOperational`, and optional `details`
- Build a centralized `handleApiError` function that maps errors to responses
- Handle known error types: `AppError`, `ZodError`, Prisma errors
- Return sanitized responses — no stack traces, no database errors
- Log the full error server-side with request context
- Wrap every route handler with error catching

### Configuring Structured Logging

When setting up logging:

- Use Pino (`pino` package) — fastest Node.js JSON logger
- Use `pino-pretty` in development for readable output
- Set log level via `LOG_LEVEL` environment variable (default: `info` in prod, `debug` in dev)
- Redact sensitive fields: password, token, authorization, cookie
- Include service name and environment in base context
- Use child loggers for per-request context: `logger.child({ requestId, userId })`
- Never use `console.log` in production — replace all instances with Pino calls

### Implementing Retry Logic

When adding retry logic:

- Use exponential backoff with jitter to prevent thundering herd
- Set a reasonable max attempts (3 for API calls, 5 for background jobs)
- Only retry on transient errors: 5xx, 429, network errors, connection timeouts
- Never retry on 4xx errors (except 429) — the request is wrong, retrying won't help
- Only retry idempotent operations — retrying a non-idempotent `POST` can create duplicates
- Log each retry attempt with the attempt number and delay
- Consider a circuit breaker for services that fail persistently

### Setting Up Observability

When configuring observability:

- Start with Sentry for error tracking — lowest effort, highest immediate value
- Add structured logging with Pino — searchable, filterable logs
- Add OpenTelemetry for traces when you have multiple services
- Track key metrics: request duration (p95, p99), error rate, queue depth
- Set up alerts: error rate > 1%, p99 latency > 2s, queue depth > 100
- Use correlation IDs to tie logs and traces together

### Production Error Handling Checklist

When preparing an application for production:

- All routes wrapped in error handler (no unhandled exceptions in routes)
- `unhandledRejection` and `uncaughtException` handlers installed
- Graceful shutdown on SIGTERM (close connections, finish in-flight requests)
- Structured JSON logging (no console.log)
- Sensitive data redacted from logs
- Error responses sanitized (no stack traces, no internal details)
- Sentry (or equivalent) configured with source maps
- Health check endpoint at `/health`
- Correlation IDs on every request

---

## Examples

### 1. Centralized Error Handler for Next.js

A complete error handling setup for Next.js Route Handlers:

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public isOperational: boolean = true,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "AppError";
  }
}

// lib/error-handler.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "./errors";
import { logger } from "./logger";
import { getRequestId } from "./request-context";

export function handleApiError(error: unknown): NextResponse {
  const requestId = getRequestId();

  // Application errors (expected)
  if (error instanceof AppError) {
    if (!error.isOperational) {
      logger.error({ err: error, requestId, msg: "Non-operational error" });
    }
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details && { details: error.details }),
        },
      },
      { status: error.statusCode }
    );
  }

  // Validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          requestId,
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  // Prisma: unique constraint
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const fields = (error.meta?.target as string[])?.join(", ") ?? "field";
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: `A record with this ${fields} already exists`,
            requestId,
          },
        },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Resource not found", requestId } },
        { status: 404 }
      );
    }
  }

  // Unknown error — log full details, return generic response
  logger.error({
    err: error,
    requestId,
    msg: "Unhandled error in API route",
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    },
    { status: 500 }
  );
}

// lib/api-handler.ts — wrapper for all route handlers
import { NextRequest } from "next/server";
import { handleApiError } from "./error-handler";

type Handler = (req: NextRequest, context: unknown) => Promise<Response>;

export function apiHandler(handler: Handler): Handler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Usage in route
// app/api/posts/route.ts
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (req) => {
  const posts = await getPublishedPosts();
  return NextResponse.json({ data: posts });
});

export const POST = apiHandler(async (req) => {
  const body = CreatePostSchema.parse(await req.json());
  const post = await createPost(body);
  return NextResponse.json({ data: post }, { status: 201 });
  // Errors auto-caught and formatted
});
```

### 2. Pino Logger with Correlation IDs

Production-ready logger configuration with per-request context:

```typescript
// lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  formatters: {
    level(label) {
      return { level: label };
    },
    bindings(bindings) {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        service: "my-app",
        version: process.env.APP_VERSION ?? "unknown",
      };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "*.password",
      "*.token",
      "*.secret",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    remove: true,
  },
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss" },
    },
  }),
});

// lib/request-logger.ts
import { AsyncLocalStorage } from "async_hooks";
import { logger } from "./logger";

interface RequestContext {
  requestId: string;
  userId?: string;
  tenantId?: string;
}

export const requestStore = new AsyncLocalStorage<RequestContext>();

export function getRequestLogger() {
  const ctx = requestStore.getStore();
  if (!ctx) return logger;
  return logger.child({
    requestId: ctx.requestId,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
  });
}

// Usage anywhere in the codebase
import { getRequestLogger } from "@/lib/request-logger";

async function processOrder(orderId: string) {
  const log = getRequestLogger();
  log.info({ orderId, msg: "Processing order" });

  try {
    const result = await chargePayment(orderId);
    log.info({ orderId, paymentId: result.id, msg: "Payment charged" });
  } catch (error) {
    log.error({ orderId, err: error, msg: "Payment failed" });
    throw error;
  }
}
```

### 3. Retry with Exponential Backoff and Circuit Breaker

A composable retry utility with circuit breaker for external service calls:

```typescript
// lib/resilience.ts
import { logger } from "@/lib/logger";

// Circuit breaker
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private name: string,
    private threshold = 5,
    private resetTimeoutMs = 30_000
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "half-open";
        logger.info({ breaker: this.name, msg: "Circuit half-open, testing" });
      } else {
        throw new AppError(
          "SERVICE_UNAVAILABLE",
          `${this.name} circuit breaker is open`,
          503
        );
      }
    }

    try {
      const result = await fn();
      if (this.state === "half-open") {
        logger.info({ breaker: this.name, msg: "Circuit closed (recovered)" });
      }
      this.failures = 0;
      this.state = "closed";
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = "open";
        logger.error({
          breaker: this.name,
          failures: this.failures,
          msg: "Circuit opened",
        });
      }
      throw error;
    }
  }
}

// Retry with backoff
interface RetryOptions {
  attempts: number;
  baseDelay: number;
  maxDelay: number;
  retryOn?: (error: unknown) => boolean;
}

async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { attempts, baseDelay, maxDelay, retryOn = () => true } = options;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === attempts || !retryOn(error)) throw error;

      const delay = Math.min(maxDelay, baseDelay * 2 ** (attempt - 1) * (0.5 + Math.random() * 0.5));
      logger.warn({ attempt, delay: Math.round(delay), msg: "Retrying" });
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Retry exhausted"); // Unreachable, but TypeScript needs it
}

// Composing retry + circuit breaker
const paymentBreaker = new CircuitBreaker("payment-api", 5, 30_000);

export async function chargePayment(amount: number, customerId: string) {
  return paymentBreaker.call(() =>
    withRetry(
      () =>
        fetch("https://api.stripe.com/v1/charges", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
          body: new URLSearchParams({
            amount: amount.toString(),
            customer: customerId,
            currency: "usd",
          }),
        }).then(async (res) => {
          if (!res.ok) throw new Error(`Stripe API error: ${res.status}`);
          return res.json();
        }),
      {
        attempts: 3,
        baseDelay: 500,
        maxDelay: 5_000,
        retryOn: (err) => {
          if (err instanceof Error && err.message.includes("5")) return true; // 5xx
          return false;
        },
      }
    )
  );
}
```

### 4. Graceful Shutdown Handler

Complete graceful shutdown for a Node.js application with Express/Fastify:

```typescript
// lib/shutdown.ts
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

interface ShutdownResource {
  name: string;
  close: () => Promise<void>;
}

const resources: ShutdownResource[] = [];

export function registerShutdownResource(name: string, close: () => Promise<void>) {
  resources.push({ name, close });
}

export function setupGracefulShutdown(server: { close: (cb: () => void) => void }) {
  let isShuttingDown = false;

  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal, msg: "Graceful shutdown initiated" });

    // Force exit after 30 seconds
    const forceExit = setTimeout(() => {
      logger.error({ msg: "Forced shutdown after timeout" });
      process.exit(1);
    }, 30_000);
    forceExit.unref();

    // 1. Stop accepting new connections
    await new Promise<void>((resolve) => server.close(resolve));
    logger.info({ msg: "Server stopped accepting connections" });

    // 2. Close resources in reverse registration order
    for (const resource of resources.reverse()) {
      try {
        await resource.close();
        logger.info({ resource: resource.name, msg: "Resource closed" });
      } catch (error) {
        logger.error({ resource: resource.name, err: error, msg: "Failed to close resource" });
      }
    }

    // 3. Close database and cache
    await prisma.$disconnect();
    logger.info({ msg: "Database disconnected" });

    await redis.quit();
    logger.info({ msg: "Redis disconnected" });

    clearTimeout(forceExit);
    logger.info({ msg: "Shutdown complete" });
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error, msg: "Uncaught exception — exiting" });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason, msg: "Unhandled rejection — exiting" });
    process.exit(1);
  });
}

// Usage in server startup
// server.ts
import { setupGracefulShutdown, registerShutdownResource } from "@/lib/shutdown";

const server = app.listen(3000, () => {
  logger.info({ port: 3000, msg: "Server started" });
});

// Register job queue for cleanup
registerShutdownResource("job-queue", () => jobQueue.close());
registerShutdownResource("websocket", () => wss.close());

setupGracefulShutdown(server);
```

### 5. Sentry Integration with Context

Setting up Sentry for production error tracking with user and request context:

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,

  // Capture 100% of errors, 10% of transactions
  tracesSampleRate: 0.1,

  // Filter out noisy errors
  beforeSend(event) {
    // Don't report 4xx client errors
    if (event.contexts?.response?.status_code < 500) {
      return null;
    }

    // Strip sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }

    return event;
  },

  integrations: [
    Sentry.prismaIntegration(), // Track Prisma queries
  ],
});

// Add user and request context in middleware
export function setSentryContext(requestId: string, userId?: string, orgId?: string) {
  Sentry.setTag("request_id", requestId);

  if (userId) {
    Sentry.setUser({ id: userId });
    Sentry.setTag("org_id", orgId);
  }
}

// Capture error with context
export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

// Usage in error handler
import { captureError } from "@/lib/sentry";

export function handleApiError(error: unknown): NextResponse {
  // ... existing handling ...

  // Report unexpected errors to Sentry
  if (!(error instanceof AppError) || !error.isOperational) {
    captureError(error, {
      requestId: getRequestId(),
      url: request.nextUrl.pathname,
    });
  }

  // ... return response ...
}
```

---

## Common Mistakes

### 1. Catching and Swallowing Errors

**Wrong:**

```typescript
try {
  await processPayment(orderId);
} catch (error) {
  // Silently ignore — the payment may have failed
}
```

**Fix:** Always handle or rethrow. If you catch an error, log it, return an error response, or throw a more specific error. An empty catch block hides bugs.

### 2. console.log in Production

**Wrong:**

```typescript
console.log("Processing order:", orderId);
console.log("User data:", JSON.stringify(user));
```

**Fix:** Use a structured logger (Pino). `console.log` is synchronous (blocks event loop), unstructured (unsearchable), has no levels (can't filter), and cannot redact sensitive data.

### 3. No Correlation IDs

**Wrong:** Multiple services logging independently with no way to trace a request across them.

**Fix:** Generate a UUID at the edge (or accept `X-Request-ID` from the client), pass it through every service call, and include it in every log line. This makes debugging distributed systems possible.

### 4. Logging Sensitive Data

**Wrong:**

```typescript
logger.info({ user: { email, password, ssn }, msg: "User login" });
```

**Fix:** Configure redaction in your logger to strip sensitive fields automatically. Never log passwords, tokens, API keys, PII (SSN, credit cards), or session cookies. If in doubt, don't log it.

### 5. No Structured Logging

**Wrong:**

```typescript
console.log(`[${new Date().toISOString()}] ERROR: User ${userId} failed to login - ${error.message}`);
```

**Fix:** Use JSON structured logs. `logger.error({ userId, action: "login", err: error })` is machine-parseable, searchable by field, and automatically includes timestamp and level.

### 6. Retrying Non-Idempotent Operations

**Wrong:**

```typescript
await withRetry(() => createOrder(orderData), { attempts: 3 });
// If the first attempt succeeded but the response was lost,
// the retry creates a duplicate order
```

**Fix:** Only retry idempotent operations. For non-idempotent operations, use an idempotency key: the server checks if the request was already processed and returns the cached result.

### 7. No Graceful Shutdown

**Wrong:** The process receives SIGTERM and exits immediately, dropping in-flight requests and leaving database connections open.

**Fix:** Handle SIGTERM: stop accepting new connections, wait for in-flight requests to complete (with a timeout), close database and Redis connections, then exit.

### 8. Stack Traces in API Responses

**Wrong:**

```typescript
catch (error) {
  return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
}
```

**Fix:** Return a generic error message to the client. Log the full stack trace server-side. Stack traces reveal internal architecture, file paths, and dependencies that attackers can exploit.

> Cross-reference: [Security/Backend-Security](../../Security/Backend-Security/backend-security.md) covers information disclosure prevention.

### 9. No Error Monitoring

**Wrong:** Errors happen in production, nobody notices until a user complains.

**Fix:** Set up Sentry (or equivalent) on day one. Configure alerts for error rate spikes. Review the error dashboard weekly. Error monitoring is not optional — it is how you learn about bugs before users file tickets.

### 10. Logging Too Much

**Wrong:** Logging every function call, every variable, every SQL query at `info` level, generating GB of logs per hour that cost hundreds of dollars per month.

**Fix:** Log at appropriate levels. Use `info` for request boundaries and important events. Use `debug` for diagnostic detail (disabled in production). Use `warn` for concerning-but-handled situations. Track log volume and cost as a metric.

---

> **See also:** [API-Design](../API-Design/api-design.md) | [Background-Jobs](../Background-Jobs/background-jobs.md) | [Webhooks-Integrations](../Webhooks-Integrations/webhooks-integrations.md) | [Serverless-Edge](../Serverless-Edge/serverless-edge.md) | [Security/Backend-Security](../../Security/Backend-Security/backend-security.md)
>
> **Last reviewed:** 2026-02
