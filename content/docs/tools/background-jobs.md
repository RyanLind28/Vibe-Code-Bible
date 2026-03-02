---
title: Background Job Tools
description: Inngest, Trigger.dev, BullMQ, and Upstash QStash — how to install, configure, and run background jobs in Next.js App Router with TypeScript.
---
# Background Job Tools

> Inngest, Trigger.dev, BullMQ, and Upstash QStash — how to install, configure, and run background jobs in Next.js App Router with TypeScript.

---

## When to Use What

| Feature | **Inngest** | **Trigger.dev** | **BullMQ** | **Upstash QStash** |
|---|---|---|---|---|
| **Pricing (free tier)** | 25K events/mo | 50K runs/mo | Free (self-hosted) | 500 messages/day |
| **Serverless-compatible** | Yes (native) | Yes (native) | No (needs persistent worker) | Yes (native) |
| **Step functions** | Yes (first-class) | Yes (tasks) | No (manual) | No |
| **Cron / scheduling** | Yes (built-in) | Yes (built-in) | Yes (repeatable jobs) | Yes (schedules) |
| **Dashboard** | Yes (cloud + local dev) | Yes (cloud) | Bull Board (self-hosted) | Yes (console.upstash.com) |
| **Self-hostable** | Yes (open-source) | Yes (open-source) | Yes (requires Redis) | No (managed only) |
| **Redis required** | No | No | Yes | No (uses Upstash internally) |
| **Best for** | Serverless workflows, multi-step flows, fan-out | Long-running tasks, third-party integrations | High-throughput self-hosted queues | Fire-and-forget HTTP delivery, delayed webhooks |

**Opinionated recommendation:**

- **Default choice for serverless Next.js:** Inngest. Best DX, first-class step functions, excellent local dev server, works natively on Vercel/Netlify/Cloudflare with zero infrastructure.
- **Long-running tasks with heavy integrations:** Trigger.dev. Better than Inngest when tasks run for minutes (not seconds) and you need deep third-party SDK integrations.
- **Self-hosted with Redis already in the stack:** BullMQ. The right choice when you run your own servers, need sub-millisecond latency, or process millions of jobs per hour. Do not use BullMQ on serverless — it requires persistent workers.
- **Simple HTTP delivery, no SDK needed:** Upstash QStash. Best when you just need "call this URL in 30 seconds" or "call this URL every hour." No function definitions, no SDK in the worker — just HTTP endpoints.

---

## Principles

### 1. Choose Based on Your Infrastructure

Your deployment target dictates your tool. If you deploy to Vercel, Netlify, or any serverless platform, you cannot run persistent BullMQ workers. You need Inngest, Trigger.dev, or QStash. If you deploy to a VPS, Docker, or Kubernetes where you control the process lifecycle, BullMQ gives you the most control and lowest cost at scale.

Do not fight your infrastructure. A BullMQ worker on Vercel will fail on every cold start. An Inngest function on a VPS works but adds unnecessary network hops.

### 2. Step Functions Prevent Partial Failures

Step functions (Inngest's `step.run`, Trigger.dev's task model) break a workflow into individually retryable units. If step 3 of 5 fails, only step 3 retries — steps 1 and 2 are not re-executed. Their results are memoized.

Without step functions, a failure midway through a multi-stage workflow means you re-run everything from scratch, causing duplicate side effects unless every operation is idempotent.

Prefer step functions for any workflow with more than one external call.

### 3. Local Development Must Mirror Production

Every tool in this chapter has a local development story. Use it.

- Inngest: `npx inngest-cli@latest dev` — local dev server with event viewer, function timeline, and replay.
- Trigger.dev: `npx @trigger.dev/cli@latest dev` — connects local code to the Trigger.dev dashboard.
- BullMQ: Runs against local Redis. Add Bull Board for visibility.
- QStash: Use `verifySignatureAppRouter` with test signing keys locally.

Never skip local testing and deploy directly to production. Background job failures are harder to debug than API failures because there is no request/response cycle to inspect.

### 4. Type Your Events and Payloads

Every event name and payload shape should be defined in a single TypeScript type map. This prevents the most common background job bug: publishing an event with one shape and consuming it with a different one.

```typescript
// lib/events.ts
type Events = {
  "user/created": { data: { userId: string; email: string; name: string } };
  "user/deleted": { data: { userId: string; reason: string } };
  "invoice/generated": { data: { invoiceId: string; amount: number } };
};
```

Inngest accepts this type map in the client constructor. For BullMQ and QStash, use Zod schemas to validate payloads at the boundary.

### 5. Idempotency Is Non-Negotiable

Every background job tool delivers at-least-once. Your function will be called more than once for the same event. Design accordingly. Use database checks, unique constraints, or upserts. Never assume exactly-once delivery.

See [Backend/Background-Jobs](../../Backend/Background-Jobs/background-jobs.md) for detailed idempotency strategies.

### 6. Monitor and Alert on Every Queue

A silent failure in a background job is worse than a visible API error. The user does not see a 500 — they see nothing happen. Set up dashboards, log every job start/complete/fail, and alert when failure rates exceed thresholds.

- Inngest: Built-in dashboard with function run history, step timeline, and error traces.
- Trigger.dev: Built-in dashboard with run history and logs.
- BullMQ: Bull Board (self-hosted) or custom metrics endpoint.
- QStash: Upstash console with delivery logs.

### 7. Keep Payloads Small, Reference Large Data

Job payloads should contain IDs and references, not full objects. If a job needs a 10MB CSV, upload it to S3/R2 first and pass the URL. Redis (BullMQ) and HTTP bodies (QStash) both have size limits, and large payloads slow serialization.

Rule of thumb: if the payload is larger than 1KB, you are probably including too much data.

---

## LLM Instructions

### Inngest

When setting up Inngest in a Next.js App Router project:

**Install and create client:**

```bash
npm install inngest
```

```typescript
// lib/inngest/client.ts
import { Inngest, EventSchemas } from "inngest";

type Events = {
  "user/created": { data: { userId: string; email: string; name: string } };
  "user/upgraded": { data: { userId: string; plan: string } };
  "invoice/generated": { data: { invoiceId: string; customerId: string; amount: number } };
};

export const inngest = new Inngest({
  id: "my-app",
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

**Create the serve route handler (App Router):**

```typescript
// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { onboardingFlow } from "@/lib/inngest/functions/onboarding";
import { dailyCleanup } from "@/lib/inngest/functions/cron";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [onboardingFlow, dailyCleanup],
});
```

Every Inngest function must be registered in the `serve()` call. If you define a function but forget to add it here, it will never execute. The `GET` handler is used by the Inngest dev server to discover functions. The `POST` handler receives events and invokes functions.

**Define functions with step.run, step.sleep, step.sendEvent:**

```typescript
// lib/inngest/functions/onboarding.ts
import { inngest } from "../client";

export const onboardingFlow = inngest.createFunction(
  {
    id: "user-onboarding",
    retries: 3,
    cancelOn: [{ event: "user/deleted", match: "data.userId" }],
  },
  { event: "user/created" },
  async ({ event, step }) => {
    const { userId, email, name } = event.data;

    // step.run — each step is independently retried and memoized
    const workspace = await step.run("create-workspace", async () => {
      return db.workspace.create({
        data: { name: `${name}'s Workspace`, ownerId: userId },
      });
    });

    await step.run("send-welcome-email", async () => {
      await sendEmail({ to: email, template: "welcome", data: { name } });
    });

    // step.sleep — pauses the function for a duration (no compute used)
    await step.sleep("wait-1-day", "1d");

    const hasContent = await step.run("check-engagement", async () => {
      return (await db.post.count({ where: { authorId: userId } })) > 0;
    });

    if (!hasContent) {
      await step.run("send-nudge-email", async () => {
        await sendEmail({ to: email, template: "getting-started", data: { name } });
      });
    }

    // step.sendEvent — trigger another function (fan-out)
    await step.sendEvent("trigger-sync", {
      name: "user/upgraded",
      data: { userId, plan: "free" },
    });

    return { workspaceId: workspace.id, nudgeSent: !hasContent };
  }
);
```

**Cron triggers:**

```typescript
// lib/inngest/functions/cron.ts
export const dailyCleanup = inngest.createFunction(
  { id: "daily-cleanup" },
  { cron: "0 3 * * *" }, // Every day at 3:00 AM UTC
  async ({ step }) => {
    const expired = await step.run("delete-expired-sessions", async () => {
      const result = await db.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      return result.count;
    });

    return { expiredSessions: expired };
  }
);
```

**Fan-out (send multiple events from one function):**

```typescript
await step.sendEvent(
  "notify-all-admins",
  admins.map((admin) => ({
    name: "invoice/generated" as const,
    data: { invoiceId, customerId, notifyUserId: admin.userId },
  }))
);
```

**Concurrency and throttle controls:**

```typescript
export const syncToApi = inngest.createFunction(
  {
    id: "sync-to-api",
    concurrency: { limit: 10 },            // Max 10 concurrent executions
    throttle: { limit: 50, period: "1m" }, // Max 50 invocations per minute
    retries: 3,
  },
  { event: "data/sync-requested" },
  async ({ event, step }) => { /* ... */ }
);
```

**Sending events from your application:**

```typescript
// In any server component, API route, or server action
await inngest.send({
  name: "user/created",
  data: { userId: "user_abc", email: "alice@example.com", name: "Alice" },
});

// Batch send
await inngest.send([
  { name: "user/created", data: { userId: "user_1", email: "a@example.com", name: "A" } },
  { name: "user/created", data: { userId: "user_2", email: "b@example.com", name: "B" } },
]);
```

**Local development:**

```bash
npx inngest-cli@latest dev   # Runs at http://localhost:8288
npm run dev                   # Your Next.js app (separate terminal)
```

**Environment variables:**

```bash
# .env.local — no keys needed for local dev
# .env.production
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

### Trigger.dev

When setting up Trigger.dev in a Next.js App Router project:

**Install and configure:**

```bash
npx @trigger.dev/cli@latest init
```

This creates `trigger.config.ts` and a `trigger/` directory.

```typescript
// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_your_project_id",
  runtime: "node",
  logLevel: "log",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ["./trigger"],
});
```

**Define tasks:**

```typescript
// trigger/process-csv.ts
import { task, logger } from "@trigger.dev/sdk/v3";

export const processCsvUpload = task({
  id: "process-csv-upload",
  maxDuration: 300, // 5 minutes (serverless default is 60s)
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 1000 },
  run: async (payload: { fileUrl: string; userId: string; orgId: string }) => {
    logger.info("Starting CSV processing", { fileUrl: payload.fileUrl });

    const response = await fetch(payload.fileUrl);
    const text = await response.text();
    const rows = parseCsv(text);

    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await db.record.createMany({
        data: batch.map((row) => ({ ...row, organizationId: payload.orgId })),
      });
      imported += batch.length;
      logger.info(`Imported ${imported}/${rows.length} rows`);
    }

    return { imported, total: rows.length };
  },
});
```

**Scheduled tasks (cron):**

```typescript
// trigger/scheduled-cleanup.ts
import { schedules, logger } from "@trigger.dev/sdk/v3";

export const dailyCleanup = schedules.task({
  id: "daily-cleanup",
  cron: "0 3 * * *",
  run: async () => {
    const deleted = await db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    logger.info(`Deleted ${deleted.count} expired sessions`);
    return { deletedSessions: deleted.count };
  },
});
```

**Trigger tasks from your application:**

```typescript
import { tasks } from "@trigger.dev/sdk/v3";
import type { processCsvUpload } from "@/trigger/process-csv";

// Fire and forget
const handle = await tasks.trigger<typeof processCsvUpload>("process-csv-upload", {
  fileUrl: "https://storage.example.com/data.csv",
  userId: "user_abc",
  orgId: "org_123",
});

// Or trigger and wait for result
const result = await tasks.triggerAndWait<typeof processCsvUpload>("process-csv-upload", payload);

// Batch trigger (fan-out)
const handles = await tasks.batchTrigger<typeof processCsvUpload>(
  "process-csv-upload",
  files.map((f) => ({ payload: { fileUrl: f.url, userId: f.uploadedBy, orgId: f.orgId } }))
);
```

**Local development:**

```bash
npx @trigger.dev/cli@latest dev   # Connects to Trigger.dev cloud
npm run dev                        # Your Next.js app
```

**Environment variables:**

```bash
TRIGGER_SECRET_KEY=tr_dev_your_key  # From Trigger.dev dashboard
```

### BullMQ

When setting up BullMQ for a self-hosted Node.js / Next.js project:

**Install:**

```bash
npm install bullmq ioredis
```

**Create shared Redis connection:**

```typescript
// lib/redis.ts
import Redis from "ioredis";

export const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // REQUIRED by BullMQ — do not remove
});
```

The `maxRetriesPerRequest: null` is mandatory. BullMQ uses blocking Redis commands. Without this setting, you get connection errors.

**Define a typed queue:**

```typescript
// queues/email.ts
import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export const emailQueue = new Queue<EmailJobData>("email", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 86_400, count: 1000 },
    removeOnFail: { age: 604_800, count: 5000 },
  },
});
```

**Define a worker (separate process, NOT an API route):**

```typescript
// workers/email.worker.ts
import { Worker, Job } from "bullmq";
import { connection } from "@/lib/redis";

export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job: Job<EmailJobData>) => {
    await sendEmail(job.data);
    return { sentAt: new Date().toISOString() };
  },
  {
    connection,
    concurrency: 10,
    limiter: { max: 100, duration: 60_000 }, // 100 jobs/min rate limit
  }
);

emailWorker.on("completed", (job) => logger.info({ jobId: job.id, msg: "done" }));
emailWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err: err.message }));
```

**Job options (priority, delay, deduplication, cron):**

```typescript
await emailQueue.add("password-reset", data, { priority: 1 });   // High priority
await emailQueue.add("digest", data, { priority: 10 });           // Low priority
await emailQueue.add("reminder", data, { delay: 3_600_000 });     // 1 hour delay
await emailQueue.add("welcome", data, { jobId: `welcome:${userId}` }); // Deduplicate

// Repeatable job (cron) — always set a stable jobId
await emailQueue.add("daily-digest", {}, {
  repeat: { pattern: "0 8 * * *" },
  jobId: "daily-digest",
});
```

**Bull Board monitoring:**

```bash
npm install @bull-board/api @bull-board/express express
```

```typescript
// lib/bull-board.ts
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue), new BullMQAdapter(exportQueue)],
  serverAdapter,
});

// Run on a separate port behind auth
const app = express();
app.use("/admin/queues", serverAdapter.getRouter());
app.listen(3001);
```

**Graceful shutdown (critical for deploys):**

```typescript
// workers/index.ts
import { emailWorker } from "./email.worker";
import { exportWorker } from "./export.worker";

const workers = [emailWorker, exportWorker];

async function shutdown(signal: string) {
  logger.info({ signal, msg: "Shutting down workers..." });
  const timeout = setTimeout(() => process.exit(1), 30_000);
  await Promise.all(workers.map((w) => w.close()));
  clearTimeout(timeout);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

**Running workers (separate process from Next.js):**

```json
{
  "scripts": {
    "dev": "next dev",
    "workers": "tsx watch workers/index.ts",
    "workers:prod": "tsx workers/index.ts"
  }
}
```

### Upstash QStash

When setting up Upstash QStash in a Next.js App Router project:

**Install and create client:**

```bash
npm install @upstash/qstash
```

```typescript
// lib/qstash.ts
import { Client } from "@upstash/qstash";

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});
```

**Publish a message (fire-and-forget to a URL):**

```typescript
await qstash.publishJSON({
  url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/send-email`,
  body: { to: "alice@example.com", template: "welcome", data: { name: "Alice" } },
  retries: 3,
  delay: 60, // Optional: delay 60 seconds
});
```

**Receive and process (with signature verification):**

```typescript
// app/api/jobs/send-email/route.ts
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(request: Request) {
  const body = await request.json();
  await sendEmail(body);
  return Response.json({ success: true });
}

// ALWAYS wrap with signature verification
export const POST = verifySignatureAppRouter(handler);
```

The `verifySignatureAppRouter` wrapper is critical. Without it, anyone can call your endpoint and trigger jobs.

**Scheduled delivery (cron):**

```typescript
const schedule = await qstash.schedules.create({
  destination: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/daily-cleanup`,
  cron: "0 3 * * *",
  retries: 3,
  body: JSON.stringify({ type: "cleanup" }),
  headers: { "Content-Type": "application/json" },
});

// List / delete schedules
const all = await qstash.schedules.list();
await qstash.schedules.delete(schedule.scheduleId);
```

**Callbacks (get notified after processing):**

```typescript
await qstash.publishJSON({
  url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/generate-report`,
  body: { reportType: "weekly", userId: "user_abc" },
  retries: 3,
  callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/report-callback`,
  failureCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/report-failed`,
});
```

**Delayed and absolute-time messages:**

```typescript
// Relative delay (seconds)
await qstash.publishJSON({
  url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/send-reminder`,
  body: { userId: "user_abc", type: "trial-ending" },
  delay: 3 * 24 * 60 * 60, // 3 days
});

// Absolute time
await qstash.publishJSON({
  url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/send-reminder`,
  body: { userId: "user_abc" },
  notBefore: Math.floor(new Date("2026-03-15T09:00:00Z").getTime() / 1000),
});
```

**Topic-based fan-out:**

```typescript
// Delivers to ALL endpoints subscribed to "user-created" topic
await qstash.publishJSON({
  topic: "user-created",
  body: { userId: "user_abc", email: "alice@example.com" },
});
```

**Environment variables:**

```bash
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=sig_your_current_key
QSTASH_NEXT_SIGNING_KEY=sig_your_next_key
```

---

## Examples

### 1. Inngest: Multi-Step Onboarding with Cancel-on-Delete

A production onboarding flow with timed emails, engagement checks, and automatic cancellation if the user is deleted mid-flow:

```typescript
// lib/inngest/functions/onboarding.ts
export const onboardingFlow = inngest.createFunction(
  {
    id: "user-onboarding-flow",
    retries: 3,
    cancelOn: [{ event: "user/deleted", match: "data.userId" }],
    throttle: { limit: 50, period: "1m" },
  },
  { event: "user/created" },
  async ({ event, step }) => {
    const { userId, email, name } = event.data;

    const workspace = await step.run("create-workspace", async () => {
      return db.workspace.create({ data: { name: `${name}'s Workspace`, ownerId: userId } });
    });

    await step.run("send-welcome", async () => {
      await sendEmail({ to: email, template: "welcome", data: { name, workspaceId: workspace.id } });
    });

    await step.sleep("wait-24h", "24h");

    const engaged = await step.run("check-engagement", async () => {
      const [posts, projects] = await Promise.all([
        db.post.count({ where: { authorId: userId } }),
        db.project.count({ where: { ownerId: userId } }),
      ]);
      return posts > 0 || projects > 0;
    });

    if (!engaged) {
      await step.run("send-nudge", async () => {
        await sendEmail({ to: email, template: "getting-started", data: { name } });
      });
    }

    await step.sleep("wait-6d", "6d");

    await step.run("send-weekly-digest", async () => {
      await sendEmail({ to: email, template: "weekly-digest", data: { name } });
    });

    return { workspaceId: workspace.id, engagedDay1: engaged };
  }
);
```

```typescript
// Trigger from a server action
"use server";
import { inngest } from "@/lib/inngest/client";

export async function signUp(formData: FormData) {
  const user = await db.user.create({
    data: { email: formData.get("email") as string, name: formData.get("name") as string },
  });

  await inngest.send({
    name: "user/created",
    data: { userId: user.id, email: user.email, name: user.name },
  });

  redirect("/dashboard");
}
```

### 2. BullMQ: Email Queue with Dead Letter Queue

A production email queue with retry classification and DLQ for exhausted jobs:

```typescript
// queues/email.ts
export const emailQueue = new Queue<EmailJobData>("email", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 86_400, count: 1000 },
    removeOnFail: { age: 604_800, count: 5000 },
  },
});

export const emailDLQ = new Queue("email-dlq", { connection });
```

```typescript
// workers/email.worker.ts
export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job) => {
    try {
      await sendEmail(job.data);
      return { sentAt: new Date().toISOString() };
    } catch (error) {
      // Permanent failures skip retries, go straight to DLQ
      if (isPermanentError(error)) {
        await emailDLQ.add("permanent-failure", {
          originalJobId: job.id,
          jobData: job.data,
          error: (error as Error).message,
        });
        return { status: "permanent-failure" };
      }
      throw error; // Transient — BullMQ retries
    }
  },
  { connection, concurrency: 10, limiter: { max: 100, duration: 60_000 } }
);

// Move exhausted-retry jobs to DLQ
emailWorker.on("failed", async (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 5)) {
    await emailDLQ.add("exhausted-retries", {
      originalJobId: job.id,
      jobData: job.data,
      error: error.message,
      attempts: job.attemptsMade,
    });
  }
});

function isPermanentError(error: unknown): boolean {
  const permanent = ["Invalid email", "Template not found", "Unsubscribed"];
  return error instanceof Error && permanent.some((msg) => error.message.includes(msg));
}
```

### 3. QStash: Post-Purchase Processing from Stripe Webhook

Queue follow-up work from a webhook handler so the webhook responds fast:

```typescript
// app/api/webhooks/stripe/route.ts
import { qstash } from "@/lib/qstash";

export async function POST(request: Request) {
  const event = verifyStripeWebhook(request);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Queue post-purchase processing (guaranteed delivery)
    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/post-purchase`,
      body: { sessionId: session.id, customerId: session.customer, amount: session.amount_total },
      retries: 5,
    });

    // Queue receipt email in 30 minutes
    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/send-receipt`,
      body: { sessionId: session.id, email: session.customer_details?.email },
      retries: 3,
      delay: 30 * 60,
    });
  }

  return Response.json({ received: true });
}
```

```typescript
// app/api/jobs/post-purchase/route.ts
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(request: Request) {
  const { sessionId, customerId, amount } = await request.json();

  // Idempotency check
  const existing = await db.purchase.findUnique({ where: { stripeSessionId: sessionId } });
  if (existing) return Response.json({ status: "already-processed" });

  await db.$transaction(async (tx) => {
    await tx.purchase.create({ data: { stripeSessionId: sessionId, customerId, amount, status: "completed" } });
    await tx.user.update({ where: { stripeCustomerId: customerId }, data: { plan: "pro" } });
  });

  return Response.json({ status: "processed" });
}

export const POST = verifySignatureAppRouter(handler);
```

### 4. Trigger.dev: Long-Running Import with Progress Logging

```typescript
// trigger/import-csv.ts
import { task, logger } from "@trigger.dev/sdk/v3";

export const importCsv = task({
  id: "import-csv",
  maxDuration: 600, // 10 minutes
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 5000 },
  run: async (payload: { fileUrl: string; userId: string; orgId: string }) => {
    const response = await fetch(payload.fileUrl);
    const rows = parseCsv(await response.text());
    logger.info(`Parsed ${rows.length} rows`);

    const importRecord = await db.import.create({
      data: { userId: payload.userId, organizationId: payload.orgId, status: "processing", totalRows: rows.length },
    });

    let processed = 0;
    for (let i = 0; i < rows.length; i += 250) {
      await db.contact.createMany({
        data: rows.slice(i, i + 250).map((r) => ({ ...r, organizationId: payload.orgId, importId: importRecord.id })),
        skipDuplicates: true,
      });
      processed += Math.min(250, rows.length - i);
      logger.info(`Progress: ${processed}/${rows.length}`);
    }

    await db.import.update({ where: { id: importRecord.id }, data: { status: "completed", processedRows: processed, completedAt: new Date() } });
    return { importId: importRecord.id, processed };
  },
});
```

```typescript
// app/api/imports/route.ts
import { tasks } from "@trigger.dev/sdk/v3";
import type { importCsv } from "@/trigger/import-csv";

export async function POST(request: Request) {
  const { fileUrl, mapping } = await request.json();
  const session = await getSession();

  const handle = await tasks.trigger<typeof importCsv>("import-csv", {
    fileUrl, userId: session.userId, orgId: session.organizationId,
  });

  return Response.json({ runId: handle.id, status: "processing" }, { status: 202 });
}
```

---

## Common Mistakes

### 1. Forgetting to Register Functions in Inngest's serve()

**Wrong:** You define a new Inngest function but forget to add it to the `serve()` call. It exists in code but never executes — no errors, no warnings.

**Fix:** Use a barrel export so missing functions are obvious:

```typescript
// lib/inngest/functions/index.ts
export { onboardingFlow } from "./onboarding";
export { dailyCleanup } from "./cron";

// app/api/inngest/route.ts
import * as functions from "@/lib/inngest/functions";
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: Object.values(functions),
});
```

### 2. Running BullMQ Workers Inside Next.js API Routes

**Wrong:** Creating a `Worker` instance inside an API route. On serverless, the worker starts on each request, processes nothing, and is garbage collected. On long-running servers, you create duplicate workers on every request.

**Fix:** BullMQ workers are separate processes. Run them with `tsx workers/index.ts`. Only the `Queue` (producer) belongs in API routes.

### 3. Missing maxRetriesPerRequest: null on Redis

**Wrong:** Using a default ioredis connection. BullMQ uses blocking Redis commands that fail with default retry limits.

**Fix:** Always set `maxRetriesPerRequest: null`:

```typescript
// Wrong
const connection = new Redis(process.env.REDIS_URL!);
// Fix
const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
```

### 4. Not Verifying QStash Signatures

**Wrong:** Your QStash endpoint is unprotected. Anyone who discovers the URL can trigger your jobs.

**Fix:** Always wrap with `verifySignatureAppRouter`. Set `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY`.

```typescript
// Wrong
export async function POST(req: Request) { /* ... */ }
// Fix
export const POST = verifySignatureAppRouter(handler);
```

### 5. Non-Deterministic Logic Outside step.run in Inngest

**Wrong:** `Date.now()` or conditional logic outside `step.run`. Code outside steps runs on every replay, producing different results each time.

**Fix:** All side effects and non-deterministic values must be inside `step.run`:

```typescript
// Wrong
const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
// Fix
const isWeekend = await step.run("check-weekend", () => {
  const day = new Date().getDay();
  return day === 0 || day === 6;
});
```

### 6. Hardcoding URLs in QStash

**Wrong:** Publishing to `https://myapp.vercel.app/api/jobs/send-email`. Breaks in dev, staging, and preview deploys.

**Fix:** Always use `process.env.NEXT_PUBLIC_APP_URL` as the base URL. Set per environment.

### 7. No Graceful Shutdown for BullMQ Workers

**Wrong:** SIGTERM kills the process immediately. Active jobs are abandoned mid-execution.

**Fix:** Handle SIGTERM, call `worker.close()`, add a timeout:

```typescript
async function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 30_000);
  await Promise.all(workers.map((w) => w.close()));
  clearTimeout(timeout);
  process.exit(0);
}
process.on("SIGTERM", shutdown);
```

### 8. Duplicate Repeatable Jobs in BullMQ

**Wrong:** Calling `queue.add()` with `repeat` on every server start without a stable `jobId`. Each restart adds another cron job.

**Fix:** Always set a stable `jobId` for repeatable jobs:

```typescript
// Wrong — duplicates on restart
await queue.add("cleanup", {}, { repeat: { pattern: "0 3 * * *" } });
// Fix
await queue.add("cleanup", {}, { repeat: { pattern: "0 3 * * *" }, jobId: "daily-cleanup" });
```

### 9. Mixing Tools Without Clear Boundaries

**Wrong:** Some jobs use Inngest, others use BullMQ, with no rule for which to use when. The same job ends up implemented in both.

**Fix:** Pick one primary tool. If you must use two, document the boundary:
- Inngest: event-driven workflows, multi-step functions, cron, anything from serverless.
- BullMQ: high-throughput batch processing, rate-limited API calls on dedicated workers.

### 10. Ignoring Concurrency Limits on External APIs

**Wrong:** Triggering 5000 Inngest events at once against an API with a 100/min rate limit. All 5000 run concurrently, all fail.

**Fix:** Use Inngest's `concurrency` and `throttle`, or BullMQ's `limiter`:

```typescript
// Inngest
{ concurrency: { limit: 10 }, throttle: { limit: 50, period: "1m" } }

// BullMQ
{ concurrency: 10, limiter: { max: 50, duration: 60_000 } }
```

---

> **See also:** [Backend/Background-Jobs](../../Backend/Background-Jobs/background-jobs.md) for queue patterns, architecture, idempotency strategies, retry design, and dead letter queues | [Backend/Serverless-Edge](../../Backend/Serverless-Edge/serverless-edge.md) | [Backend/Webhooks-Integrations](../../Backend/Webhooks-Integrations/webhooks-integrations.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
