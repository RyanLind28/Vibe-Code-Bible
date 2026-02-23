# Webhooks & Integrations

> Sending and receiving webhooks, idempotency, retry logic, third-party API patterns, circuit breakers, API client design, event systems, and webhook security — connecting your app to the outside world.

---

## Principles

### 1. Webhook Architecture

Webhooks are HTTP callbacks. When an event occurs in one system, it sends an HTTP POST to a URL registered by another system. They replace polling with push-based notifications.

```
System A (event occurs) → HTTP POST → Your webhook endpoint → Process event
```

**Two roles your application plays:**
- **Receiving webhooks** — Stripe sends you payment events, GitHub sends you push events
- **Sending webhooks** — your app notifies subscribers when data changes

**Key properties:**
- **Asynchronous** — the sender fires and moves on (or retries on failure)
- **At-least-once delivery** — webhooks may be delivered more than once
- **Unordered** — events may arrive out of order
- **Lossy** — if your endpoint is down, events may be lost (unless the sender retries)

### 2. Receiving Webhooks

Receiving webhooks correctly requires: verifying the sender, processing idempotently, and acknowledging quickly.

**The correct flow:**

```
1. Receive POST → 2. Verify signature → 3. Return 200 immediately → 4. Queue for async processing
```

Never do heavy processing inside the webhook handler. Return `200` fast, queue the work.

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { webhookQueue } from "@/lib/queues";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text(); // Raw body for signature verification
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Queue for async processing — return 200 immediately
  await webhookQueue.add("stripe", {
    eventId: event.id,
    type: event.type,
    data: event.data,
    receivedAt: new Date().toISOString(),
  }, {
    jobId: event.id, // Deduplication — same event won't be queued twice
  });

  return Response.json({ received: true });
}
```

**Important: raw body parsing.** Signature verification requires the raw request body, not parsed JSON. In Next.js, use `request.text()`. In Express, use `express.raw()` middleware on the webhook route.

### 3. Sending Webhooks

When your application sends webhooks to subscribers, you need: an event system, delivery with retries, and a delivery log.

**Architecture:**

```
Event occurs → Create webhook delivery record → Send HTTP POST → Log result → Retry on failure
```

```typescript
// lib/webhook-sender.ts
import { db } from "@/lib/db";
import { createHmac } from "crypto";
import { webhookDeliveryQueue } from "@/lib/queues";

interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

export async function emitWebhook(event: WebhookEvent) {
  // Find all active webhook subscriptions for this event type
  const subscriptions = await db.webhookSubscription.findMany({
    where: {
      events: { has: event.type },
      active: true,
    },
  });

  // Create delivery record and queue for each subscriber
  for (const sub of subscriptions) {
    const delivery = await db.webhookDelivery.create({
      data: {
        subscriptionId: sub.id,
        eventType: event.type,
        payload: event.data,
        status: "pending",
      },
    });

    await webhookDeliveryQueue.add("deliver", {
      deliveryId: delivery.id,
      url: sub.url,
      secret: sub.secret,
      payload: {
        id: delivery.id,
        type: event.type,
        data: event.data,
        timestamp: new Date().toISOString(),
      },
    }, {
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 }, // 5s, 10s, 20s, 40s, 80s
    });
  }
}

// Worker that delivers webhooks
import { Worker } from "bullmq";

const deliveryWorker = new Worker("webhook-delivery", async (job) => {
  const { deliveryId, url, secret, payload } = job.data;
  const body = JSON.stringify(payload);

  // Generate HMAC signature
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": `sha256=${signature}`,
      "X-Webhook-ID": deliveryId,
      "X-Webhook-Timestamp": payload.timestamp,
    },
    body,
    signal: AbortSignal.timeout(10_000), // 10s timeout
  });

  // Update delivery record
  await db.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: response.ok ? "delivered" : "failed",
      statusCode: response.status,
      responseBody: await response.text().catch(() => null),
      deliveredAt: response.ok ? new Date() : null,
      attempts: job.attemptsMade + 1,
    },
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status}`);
  }
}, { connection });
```

### 4. Idempotency for API Consumers

When consuming third-party APIs, idempotency keys ensure that retried requests don't create duplicate side effects.

**The Stripe idempotency pattern:**

```typescript
// Using Stripe's idempotency key
const charge = await stripe.charges.create(
  {
    amount: 2000,
    currency: "usd",
    customer: "cus_123",
  },
  {
    idempotencyKey: `charge:${orderId}`, // Same key = same result
  }
);
```

**Implementing idempotency in your own API:**

```typescript
// Middleware to handle idempotency keys
async function withIdempotency(
  request: NextRequest,
  handler: () => Promise<Response>
): Promise<Response> {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) return handler();

  // Check if this key was already processed
  const existing = await redis.get(`idempotency:${idempotencyKey}`);
  if (existing) {
    const cached = JSON.parse(existing);
    return new Response(cached.body, {
      status: cached.status,
      headers: { ...cached.headers, "X-Idempotent-Replayed": "true" },
    });
  }

  // Process the request
  const response = await handler();

  // Cache the response for 24 hours
  const body = await response.clone().text();
  await redis.set(
    `idempotency:${idempotencyKey}`,
    JSON.stringify({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body,
    }),
    "EX",
    86400
  );

  return response;
}
```

### 5. Third-Party API Client Patterns

Interacting with external APIs requires thoughtful wrapper classes that handle auth, retries, rate limits, and errors consistently.

```typescript
// lib/api-clients/base.ts
import { logger } from "@/lib/logger";

interface ApiClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  rateLimitPerMinute?: number;
}

export class ApiClient {
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(private options: ApiClientOptions) {}

  async request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    const { baseUrl, apiKey, timeout = 10_000, retries = 3 } = this.options;

    // Rate limit check
    await this.checkRateLimit();

    const url = `${baseUrl}${path}`;
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          headers,
          signal: AbortSignal.timeout(timeout),
        });

        // Handle rate limiting from the API
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("retry-after") ?? "5", 10);
          logger.warn({ url, retryAfter, msg: "Rate limited by API" });
          await this.sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new ApiClientError(response.status, body, url);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries && this.isRetryable(error)) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
          logger.warn({ url, attempt, delay, msg: "Retrying API request" });
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof ApiClientError) {
      return error.status >= 500 || error.status === 429;
    }
    if (error instanceof TypeError) return true; // Network error
    return false;
  }

  private async checkRateLimit(): Promise<void> {
    if (!this.options.rateLimitPerMinute) return;

    const now = Date.now();
    if (now - this.windowStart > 60_000) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.options.rateLimitPerMinute) {
      const waitMs = 60_000 - (now - this.windowStart);
      await this.sleep(waitMs);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class ApiClientError extends Error {
  constructor(
    public status: number,
    public body: string,
    public url: string
  ) {
    super(`API request failed: ${status} ${url}`);
    this.name = "ApiClientError";
  }
}
```

### 6. Circuit Breaker Pattern

A circuit breaker stops calling a failing service, preventing cascading failures and giving the service time to recover.

**States:**
- **Closed** — normal operation, requests pass through
- **Open** — service is down, requests fail immediately (no network call)
- **Half-open** — after a cooldown, one test request is allowed; if it succeeds, circuit closes

```typescript
// lib/circuit-breaker.ts
import { logger } from "@/lib/logger";

interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;   // failures before opening
  resetTimeout: number;        // ms before half-open
  halfOpenRequests: number;    // requests to allow in half-open
}

class CircuitBreaker {
  private state: "closed" | "open" | "half-open" = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.transitionTo("half-open");
      } else {
        throw new CircuitOpenError(this.options.name);
      }
    }

    if (this.state === "half-open" && this.halfOpenAttempts >= this.options.halfOpenRequests) {
      throw new CircuitOpenError(this.options.name);
    }

    try {
      if (this.state === "half-open") this.halfOpenAttempts++;
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === "half-open") {
      this.successes++;
      if (this.successes >= this.options.halfOpenRequests) {
        this.transitionTo("closed");
      }
    }
    this.failures = 0;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold || this.state === "half-open") {
      this.transitionTo("open");
    }
  }

  private transitionTo(newState: "closed" | "open" | "half-open") {
    const oldState = this.state;
    this.state = newState;

    if (newState === "closed") {
      this.failures = 0;
      this.successes = 0;
      this.halfOpenAttempts = 0;
    }
    if (newState === "half-open") {
      this.halfOpenAttempts = 0;
      this.successes = 0;
    }

    logger.info({
      breaker: this.options.name,
      from: oldState,
      to: newState,
      msg: "Circuit breaker state change",
    });
  }

  getState() {
    return this.state;
  }
}

class CircuitOpenError extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker open for ${serviceName}`);
    this.name = "CircuitOpenError";
  }
}

// Usage
const stripeBreaker = new CircuitBreaker({
  name: "stripe",
  failureThreshold: 5,
  resetTimeout: 30_000,
  halfOpenRequests: 2,
});

async function chargeCustomer(amount: number, customerId: string) {
  return stripeBreaker.execute(() =>
    stripe.charges.create({ amount, currency: "usd", customer: customerId })
  );
}
```

### 7. API Client Testing

External API calls must be tested without hitting live services. Mock Service Worker (MSW) intercepts network requests at the transport level.

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  // Mock Stripe API
  http.post("https://api.stripe.com/v1/charges", async ({ request }) => {
    const body = await request.formData();
    const amount = body.get("amount");

    return HttpResponse.json({
      id: "ch_test_123",
      amount: Number(amount),
      status: "succeeded",
      currency: "usd",
    });
  }),

  // Mock failing endpoint for circuit breaker testing
  http.get("https://api.example.com/unstable", () => {
    return HttpResponse.json({ error: "Service unavailable" }, { status: 503 });
  }),

  // Mock webhook verification
  http.post("https://hooks.example.com/webhook", async ({ request }) => {
    const body = await request.json();
    const signature = request.headers.get("x-webhook-signature");

    if (!signature) {
      return HttpResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    return HttpResponse.json({ received: true });
  }),
];

// test/setup.ts
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// test/api-client.test.ts
import { server } from "./setup";
import { http, HttpResponse } from "msw";
import { ApiClient } from "@/lib/api-clients/base";

describe("ApiClient", () => {
  const client = new ApiClient({
    baseUrl: "https://api.example.com",
    apiKey: "test-key",
    retries: 3,
  });

  it("retries on 500 errors", async () => {
    let attempts = 0;
    server.use(
      http.get("https://api.example.com/data", () => {
        attempts++;
        if (attempts < 3) {
          return HttpResponse.json({}, { status: 500 });
        }
        return HttpResponse.json({ data: "success" });
      })
    );

    const result = await client.request("/data");
    expect(result).toEqual({ data: "success" });
    expect(attempts).toBe(3);
  });

  it("handles rate limiting with retry-after", async () => {
    let rateLimited = true;
    server.use(
      http.get("https://api.example.com/data", () => {
        if (rateLimited) {
          rateLimited = false;
          return HttpResponse.json({}, {
            status: 429,
            headers: { "Retry-After": "1" },
          });
        }
        return HttpResponse.json({ data: "success" });
      })
    );

    const result = await client.request("/data");
    expect(result).toEqual({ data: "success" });
  });
});
```

### 8. Event System Design

An internal event system decouples services. When a post is published, the event bus notifies email, analytics, search, and webhook services — without the publish function knowing about any of them.

```typescript
// lib/events.ts
import { z } from "zod";
import { logger } from "@/lib/logger";

// Define event schemas
const EventSchemas = {
  "post.created": z.object({
    postId: z.string(),
    authorId: z.string(),
    title: z.string(),
  }),
  "post.published": z.object({
    postId: z.string(),
    authorId: z.string(),
    title: z.string(),
    publishedAt: z.string(),
  }),
  "user.signed_up": z.object({
    userId: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  "user.deleted": z.object({
    userId: z.string(),
    email: z.string(),
  }),
} as const;

type EventMap = typeof EventSchemas;
type EventName = keyof EventMap;
type EventPayload<E extends EventName> = z.infer<EventMap[E]>;

type EventHandler<E extends EventName> = (payload: EventPayload<E>) => Promise<void>;

class EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();

  on<E extends EventName>(event: E, handler: EventHandler<E>) {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler);
    this.handlers.set(event, existing);
  }

  async emit<E extends EventName>(event: E, payload: EventPayload<E>) {
    // Validate payload
    const schema = EventSchemas[event];
    const validated = schema.parse(payload);

    logger.info({ event, payload: validated, msg: "Event emitted" });

    const handlers = this.handlers.get(event) ?? [];

    // Execute all handlers (parallel, don't fail on individual handler errors)
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(validated))
    );

    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        logger.error({
          event,
          handlerIndex: index,
          error: result.reason,
          msg: "Event handler failed",
        });
      }
    }
  }
}

export const eventBus = new EventBus();

// Register handlers
// events/handlers.ts
import { eventBus } from "@/lib/events";
import { queueEmail } from "@/queues/email";
import { emitWebhook } from "@/lib/webhook-sender";

eventBus.on("user.signed_up", async (payload) => {
  await queueEmail({
    to: payload.email,
    template: "welcome",
    subject: "Welcome!",
    data: { name: payload.name },
  });
});

eventBus.on("post.published", async (payload) => {
  // Notify webhook subscribers
  await emitWebhook({ type: "post.published", data: payload });
});

eventBus.on("post.published", async (payload) => {
  // Update search index
  await searchIndex.upsert(payload.postId);
});

// Usage
await eventBus.emit("post.published", {
  postId: post.id,
  authorId: post.authorId,
  title: post.title,
  publishedAt: new Date().toISOString(),
});
```

### 9. Webhook Security

Webhook endpoints are public URLs. Without verification, anyone can send fake events to your endpoint.

**HMAC signature verification:**

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const sig = signature.replace("sha256=", "");

  // Timing-safe comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(sig, "hex"),
    Buffer.from(expected, "hex")
  );
}
```

**Replay protection:**

```typescript
function verifyWebhookTimestamp(timestamp: string, toleranceSeconds = 300): boolean {
  const eventTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = Math.abs(now - eventTime);

  // Reject events older than 5 minutes
  return diff <= toleranceSeconds * 1000;
}
```

> Cross-reference: [Security/API-Security](../../Security/API-Security/api-security.md) covers webhook signature verification, HMAC algorithms, and replay attack prevention in depth.

---

## LLM Instructions

### Receiving Webhooks

When implementing a webhook receiver:

- Parse the raw body (`request.text()`) for signature verification — never parse as JSON first
- Verify the signature using HMAC-SHA256 with the provider's secret
- Return `200` immediately — do all processing asynchronously via a job queue
- Use the event ID as a job deduplication key to handle retries
- Log every received webhook with event type and ID
- Create a separate route for each webhook provider (Stripe, GitHub, etc.)

### Sending Webhooks

When building a webhook sending system:

- Store subscriptions in the database with URL, events, and shared secret
- Generate an HMAC-SHA256 signature using the subscriber's secret
- Include timestamp and event ID in headers for replay protection
- Queue deliveries with exponential backoff retry (5 attempts minimum)
- Log delivery status (success, failure, status code) for each attempt
- Provide a webhook delivery log in the dashboard so subscribers can debug
- Allow subscribers to test their endpoint from the UI

### Building API Client Wrappers

When creating wrappers for third-party APIs:

- Create a base `ApiClient` class with retry, timeout, and error handling
- Extend it per provider with specific methods and response types
- Set timeouts on every request (10s default, configurable)
- Respect the API's rate limits — track `X-RateLimit-*` headers
- Add a circuit breaker for services that fail frequently
- Use environment variables for all API keys and URLs
- Write tests with MSW — never test against live APIs

### Implementing Circuit Breakers

When adding circuit breakers:

- Create one circuit breaker per external service (not per endpoint)
- Set failure threshold based on normal error rate (5 failures is a good default)
- Set reset timeout to 30 seconds (allows the service time to recover)
- In half-open state, allow 1–2 requests to test recovery
- Return a fallback response when the circuit is open (cached data, default values)
- Log state transitions for debugging
- Expose circuit breaker state in health checks

### Testing External Integrations

When testing code that calls external APIs:

- Use MSW (Mock Service Worker) for HTTP mocking — intercepts at the network level
- Define mock handlers for every external endpoint your app calls
- Test error scenarios: 500 errors, timeouts, rate limiting, malformed responses
- Test retry behavior by counting request attempts
- Test circuit breaker transitions with sequential failures
- Use `onUnhandledRequest: "error"` to catch unmocked requests
- Never call live APIs in tests

---

## Examples

### 1. Stripe Webhook Handler

Complete Stripe webhook processing with signature verification, idempotency, and async processing:

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { logger } from "@/lib/logger";
import { webhookQueue } from "@/queues/webhooks";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    logger.warn({ msg: "Stripe webhook missing signature" });
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    logger.error({ err, msg: "Stripe webhook signature verification failed" });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  logger.info({ eventId: event.id, type: event.type, msg: "Stripe webhook received" });

  // Queue for async processing with deduplication
  await webhookQueue.add("stripe", {
    eventId: event.id,
    type: event.type,
    data: event.data.object,
    created: event.created,
  }, {
    jobId: `stripe:${event.id}`,
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
  });

  return Response.json({ received: true });
}

// queues/webhooks/stripe-worker.ts
import { Worker } from "bullmq";
import { connection } from "@/lib/redis";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const stripeWorker = new Worker("webhooks", async (job) => {
  if (job.name !== "stripe") return;

  const { eventId, type, data } = job.data;

  // Idempotency check
  const existing = await db.webhookEvent.findUnique({ where: { eventId } });
  if (existing) {
    logger.info({ eventId, msg: "Stripe event already processed" });
    return { status: "duplicate" };
  }

  // Record the event
  await db.webhookEvent.create({
    data: { eventId, type, processedAt: new Date() },
  });

  // Handle event types
  switch (type) {
    case "checkout.session.completed":
      await handleCheckoutComplete(data);
      break;
    case "invoice.payment_succeeded":
      await handlePaymentSuccess(data);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(data);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionCanceled(data);
      break;
    default:
      logger.info({ eventId, type, msg: "Unhandled Stripe event type" });
  }

  return { status: "processed" };
}, { connection });

async function handleCheckoutComplete(session: any) {
  const org = await db.organization.findFirst({
    where: { stripeCustomerId: session.customer },
  });
  if (!org) return;

  await db.organization.update({
    where: { id: org.id },
    data: {
      plan: session.metadata.plan,
      stripeSubscriptionId: session.subscription,
    },
  });
}

async function handlePaymentFailed(invoice: any) {
  const org = await db.organization.findFirst({
    where: { stripeCustomerId: invoice.customer },
  });
  if (!org) return;

  await queueEmail({
    to: org.billingEmail,
    template: "payment-failed",
    subject: "Payment Failed — Action Required",
    data: { amount: invoice.amount_due / 100, orgName: org.name },
  });
}
```

### 2. Webhook Sender with Retry

A complete webhook delivery system for sending events to subscribers:

```typescript
// lib/webhook-system.ts
import { Queue, Worker } from "bullmq";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { connection } from "@/lib/redis";
import { logger } from "@/lib/logger";

const deliveryQueue = new Queue("webhook-delivery", {
  connection,
  defaultJobOptions: {
    attempts: 8,
    backoff: {
      type: "custom",
    },
  },
});

// Custom backoff: 5s, 30s, 2m, 10m, 30m, 1h, 4h, 12h
function getBackoffDelay(attempt: number): number {
  const delays = [5, 30, 120, 600, 1800, 3600, 14400, 43200];
  return (delays[attempt - 1] ?? delays[delays.length - 1]) * 1000;
}

export async function sendWebhook(
  subscriptionId: string,
  event: { type: string; data: Record<string, unknown> }
) {
  const subscription = await db.webhookSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription?.active) return;

  const delivery = await db.webhookDelivery.create({
    data: {
      subscriptionId,
      eventType: event.type,
      payload: event,
      status: "pending",
    },
  });

  await deliveryQueue.add("deliver", {
    deliveryId: delivery.id,
    url: subscription.url,
    secret: subscription.secret,
    payload: {
      id: delivery.id,
      type: event.type,
      data: event.data,
      created_at: new Date().toISOString(),
    },
  });

  return delivery;
}

// Delivery worker
const deliveryWorker = new Worker("webhook-delivery", async (job) => {
  const { deliveryId, url, secret, payload } = job.data;
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Signature: HMAC of timestamp.body
  const signaturePayload = `${timestamp}.${body}`;
  const signature = createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");

  const startTime = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-ID": deliveryId,
      "X-Webhook-Timestamp": timestamp,
      "X-Webhook-Signature": `v1=${signature}`,
      "User-Agent": "MyApp-Webhooks/1.0",
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  const duration = Date.now() - startTime;
  const responseText = await response.text().catch(() => null);

  await db.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: response.ok ? "delivered" : "failed",
      statusCode: response.status,
      responseBody: responseText?.slice(0, 1000),
      duration,
      attempts: job.attemptsMade + 1,
      ...(response.ok && { deliveredAt: new Date() }),
    },
  });

  if (!response.ok) {
    logger.warn({
      deliveryId,
      url,
      statusCode: response.status,
      attempt: job.attemptsMade + 1,
      msg: "Webhook delivery failed",
    });
    throw new Error(`Delivery failed: HTTP ${response.status}`);
  }

  logger.info({ deliveryId, url, duration, msg: "Webhook delivered" });
}, {
  connection,
  concurrency: 10,
  settings: {
    backoffStrategy: (attempt: number) => getBackoffDelay(attempt),
  },
});
```

### 3. Third-Party API Client with Circuit Breaker

A robust API client for a third-party service with retry, circuit breaker, and rate limiting:

```typescript
// lib/api-clients/github.ts
import { ApiClient } from "./base";
import { CircuitBreaker } from "@/lib/circuit-breaker";

const breaker = new CircuitBreaker({
  name: "github-api",
  failureThreshold: 5,
  resetTimeout: 30_000,
  halfOpenRequests: 2,
});

class GitHubClient extends ApiClient {
  constructor() {
    super({
      baseUrl: "https://api.github.com",
      apiKey: process.env.GITHUB_TOKEN,
      timeout: 10_000,
      retries: 3,
      rateLimitPerMinute: 30, // GitHub's secondary rate limit
    });
  }

  async getRepository(owner: string, repo: string) {
    return breaker.execute(() =>
      this.request<GitHubRepo>(`/repos/${owner}/${repo}`)
    );
  }

  async listPullRequests(owner: string, repo: string, state: "open" | "closed" | "all" = "open") {
    return breaker.execute(() =>
      this.request<GitHubPR[]>(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`)
    );
  }

  async createWebhook(owner: string, repo: string, url: string, events: string[]) {
    return breaker.execute(() =>
      this.request<GitHubWebhook>(`/repos/${owner}/${repo}/hooks`, {
        method: "POST",
        body: JSON.stringify({
          config: { url, content_type: "json", secret: process.env.GITHUB_WEBHOOK_SECRET },
          events,
          active: true,
        }),
      })
    );
  }
}

export const github = new GitHubClient();

// Usage
const repo = await github.getRepository("owner", "repo");
const prs = await github.listPullRequests("owner", "repo", "open");
```

### 4. MSW Test Setup

Complete test setup with Mock Service Worker for testing external API integrations:

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  // Stripe
  http.post("https://api.stripe.com/v1/customers", () => {
    return HttpResponse.json({
      id: "cus_test_123",
      email: "test@example.com",
      name: "Test User",
    });
  }),

  http.post("https://api.stripe.com/v1/subscriptions", async ({ request }) => {
    const body = await request.formData();
    return HttpResponse.json({
      id: "sub_test_123",
      status: "active",
      customer: body.get("customer"),
    });
  }),

  // GitHub
  http.get("https://api.github.com/repos/:owner/:repo", ({ params }) => {
    return HttpResponse.json({
      id: 12345,
      full_name: `${params.owner}/${params.repo}`,
      default_branch: "main",
      stargazers_count: 42,
    });
  }),
];

// test/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

// test/setup.ts
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// test/github-client.test.ts
import { github } from "@/lib/api-clients/github";
import { server } from "./mocks/server";
import { http, HttpResponse } from "msw";

describe("GitHub client", () => {
  it("fetches repository info", async () => {
    const repo = await github.getRepository("owner", "my-repo");
    expect(repo.full_name).toBe("owner/my-repo");
  });

  it("handles 404 gracefully", async () => {
    server.use(
      http.get("https://api.github.com/repos/:owner/:repo", () => {
        return HttpResponse.json({ message: "Not Found" }, { status: 404 });
      })
    );

    await expect(github.getRepository("owner", "nonexistent"))
      .rejects.toThrow("404");
  });

  it("retries on server errors", async () => {
    let callCount = 0;
    server.use(
      http.get("https://api.github.com/repos/:owner/:repo", () => {
        callCount++;
        if (callCount < 3) {
          return HttpResponse.json({}, { status: 503 });
        }
        return HttpResponse.json({ full_name: "owner/repo" });
      })
    );

    const repo = await github.getRepository("owner", "repo");
    expect(repo.full_name).toBe("owner/repo");
    expect(callCount).toBe(3);
  });
});
```

### 5. Event System with Typed Events

A type-safe event bus for internal application events:

```typescript
// lib/events/schemas.ts
import { z } from "zod";

export const eventSchemas = {
  "user.created": z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    signupMethod: z.enum(["credentials", "google", "github"]),
  }),
  "post.published": z.object({
    postId: z.string().uuid(),
    authorId: z.string().uuid(),
    title: z.string(),
    slug: z.string(),
    organizationId: z.string().uuid(),
  }),
  "subscription.changed": z.object({
    organizationId: z.string().uuid(),
    previousPlan: z.string(),
    newPlan: z.string(),
    changedBy: z.string().uuid(),
  }),
  "export.completed": z.object({
    exportId: z.string().uuid(),
    userId: z.string().uuid(),
    fileUrl: z.string().url(),
    rowCount: z.number(),
  }),
} as const;

// lib/events/bus.ts
import { eventSchemas } from "./schemas";
import { logger } from "@/lib/logger";

type Schemas = typeof eventSchemas;
type EventName = keyof Schemas;
type Payload<E extends EventName> = z.infer<Schemas[E]>;
type Handler<E extends EventName> = (payload: Payload<E>) => Promise<void>;

class TypedEventBus {
  private handlers = new Map<string, Handler<any>[]>();

  on<E extends EventName>(event: E, handler: Handler<E>): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  async emit<E extends EventName>(event: E, payload: Payload<E>): Promise<void> {
    const schema = eventSchemas[event];
    const validated = schema.parse(payload);

    logger.info({ event, msg: "Domain event emitted" });

    const handlers = this.handlers.get(event) ?? [];
    const results = await Promise.allSettled(
      handlers.map((h) => h(validated))
    );

    for (const [i, result] of results.entries()) {
      if (result.status === "rejected") {
        logger.error({
          event,
          handlerIndex: i,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          msg: "Event handler failed",
        });
      }
    }
  }
}

export const events = new TypedEventBus();

// Register handlers in a single file for visibility
// lib/events/register.ts
import { events } from "./bus";
import { queueEmail } from "@/queues/email";
import { sendWebhookToSubscribers } from "@/lib/webhook-system";
import { searchIndex } from "@/lib/search";

// User events
events.on("user.created", async (data) => {
  await queueEmail({ to: data.email, template: "welcome", subject: "Welcome!", data: { name: data.name } });
});

// Post events
events.on("post.published", async (data) => {
  await sendWebhookToSubscribers("post.published", data);
});

events.on("post.published", async (data) => {
  await searchIndex.upsert("posts", data.postId);
});

// Subscription events
events.on("subscription.changed", async (data) => {
  await queueEmail({
    to: await getOrgBillingEmail(data.organizationId),
    template: "plan-changed",
    subject: "Plan Updated",
    data: { from: data.previousPlan, to: data.newPlan },
  });
});
```

---

## Common Mistakes

### 1. No Signature Verification

**Wrong:** Accepting webhook payloads without verifying the sender's signature. Any attacker can send fake events to your endpoint.

**Fix:** Always verify the HMAC signature using the provider's shared secret. Use `timingSafeEqual` for comparison to prevent timing attacks. Reject requests with missing or invalid signatures.

### 2. Synchronous Webhook Processing

**Wrong:** Doing heavy processing (database writes, emails, API calls) inside the webhook handler, causing timeouts and missed events.

**Fix:** Return `200` immediately after signature verification. Queue the event for async processing. Most webhook providers retry on timeout — if your handler is slow, you receive duplicate events.

### 3. No Idempotency on Receive

**Wrong:** Processing the same webhook event twice because the sender retried, creating duplicate records or double-charging customers.

**Fix:** Store processed event IDs. Before processing, check if the event ID exists. Use the event ID as a BullMQ `jobId` for deduplication. Use database upserts instead of inserts where appropriate.

### 4. No Retry on Send

**Wrong:** Sending webhooks with fire-and-forget. If the subscriber's endpoint is temporarily down, the event is lost forever.

**Fix:** Queue webhook deliveries with exponential backoff retry (at least 5 attempts over several hours). Log delivery status. After all retries are exhausted, mark the delivery as failed and optionally disable the subscription.

### 5. Hardcoded API URLs

**Wrong:** Hardcoding third-party API URLs in code: `fetch("https://api.stripe.com/v1/charges")`.

**Fix:** Use environment variables for all external URLs and API keys. This allows different URLs in development (mock server), staging, and production. It also makes it easy to switch providers or API versions.

### 6. No Circuit Breaker for External Calls

**Wrong:** Continuously calling a failing external service, accumulating timeout errors, blocking threads, and cascading failures to your users.

**Fix:** Wrap external service calls in a circuit breaker. After a threshold of failures, fail fast (no network call) and return a fallback. Test recovery periodically with half-open state.

### 7. Testing Against Live APIs

**Wrong:** Running integration tests against live Stripe/GitHub/Twilio APIs, which is slow, flaky, costs money, and creates real side effects.

**Fix:** Use MSW to mock all external HTTP calls in tests. Define handlers that return realistic responses. Test error scenarios by overriding handlers per test. Use `onUnhandledRequest: "error"` to catch unmocked calls.

### 8. Webhook Endpoint Without Authentication

**Wrong:** A webhook endpoint with no verification that accepts any POST request, allowing attackers to inject fake events.

**Fix:** Verify the webhook signature. Check the `X-Webhook-Timestamp` for replay protection (reject events older than 5 minutes). Consider IP allowlisting for providers that publish their IP ranges.

### 9. No Event Logging

**Wrong:** Processing webhook events with no record of what was received, when, or whether it succeeded. When something goes wrong, there is no audit trail.

**Fix:** Log every received webhook: event ID, type, timestamp, processing result. Store a delivery log for sent webhooks. Include enough context to debug failures without logging sensitive payloads.

---

> **See also:** [API-Design](../API-Design/api-design.md) | [Background-Jobs](../Background-Jobs/background-jobs.md) | [Error-Handling-Logging](../Error-Handling-Logging/error-handling-logging.md) | [Auth-Sessions](../Auth-Sessions/auth-sessions.md) | [Security/API-Security](../../Security/API-Security/api-security.md)
>
> **Last reviewed:** 2026-02
