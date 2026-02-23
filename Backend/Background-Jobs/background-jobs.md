# Background Jobs

> BullMQ, queue patterns, cron jobs, dead letter queues, idempotency, long-running tasks, job scheduling, and serverless alternatives — offloading work so your API stays fast.

---

## Principles

### 1. Why Background Jobs

Any work that does not need to complete before sending the API response should be a background job. This keeps response times fast and makes your system more resilient.

**Common background job use cases:**
- Sending emails and notifications
- Processing file uploads (resize, transcode, parse)
- Generating reports and exports
- Syncing data with third-party services
- Running scheduled maintenance (cleanup, aggregation)
- Processing webhook payloads
- Updating search indexes
- Billing and invoice generation

**The rule:** If the user does not need the result in the same HTTP response, queue it. Return `202 Accepted` with a job ID and let the client poll or subscribe for updates.

```typescript
// Instead of this (blocking):
export async function POST(request: Request) {
  const data = await request.json();
  const report = await generateReport(data); // Takes 30 seconds
  await sendEmail(data.email, report);        // Takes 2 seconds
  return Response.json({ report });           // User waited 32 seconds
}

// Do this (non-blocking):
export async function POST(request: Request) {
  const data = await request.json();
  const job = await reportQueue.add("generate", data);
  return Response.json({ jobId: job.id, status: "processing" }, { status: 202 });
}
```

### 2. Queue Architecture

A job queue has three components: **producers** (create jobs), a **broker** (stores and routes jobs), and **consumers/workers** (process jobs).

```
Producer → Queue (Redis) → Worker
  ↓            ↓              ↓
API route   BullMQ         Process job
           stores job      (email, report, etc.)
           in Redis
```

**Key concepts:**
- **FIFO (First In, First Out)** — default ordering. Jobs processed in order of creation.
- **Priority queues** — urgent jobs jump ahead. Use sparingly.
- **At-least-once delivery** — jobs are guaranteed to be delivered at least once. Workers must be idempotent.
- **Acknowledgment** — a job is removed from the queue only after the worker confirms completion.
- **Visibility timeout** — if a worker crashes mid-processing, the job becomes visible again for retry.

### 3. BullMQ

BullMQ is the standard job queue for Node.js. It uses Redis as the message broker and provides queues, workers, schedulers, and flow control.

```typescript
// lib/queue.ts
import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";

// Shared Redis connection for all queues
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Create a queue
export const emailQueue = new Queue("email", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // 1s, 2s, 4s
    },
    removeOnComplete: { count: 1000 },  // Keep last 1000 completed jobs
    removeOnFail: { count: 5000 },       // Keep last 5000 failed jobs
  },
});

// Create a worker
export const emailWorker = new Worker(
  "email",
  async (job) => {
    const { to, subject, template, data } = job.data;

    await sendEmail({ to, subject, template, data });

    return { sentAt: new Date().toISOString() };
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs simultaneously
    limiter: {
      max: 50,       // Max 50 jobs
      duration: 60_000, // Per 60 seconds (rate limit)
    },
  }
);

// Listen for events
emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

emailWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});
```

**Adding jobs:**

```typescript
// Add a single job
await emailQueue.add("welcome", {
  to: "user@example.com",
  subject: "Welcome!",
  template: "welcome",
  data: { name: "Alice" },
});

// Add with options
await emailQueue.add(
  "invoice",
  { invoiceId: "inv_123", email: "billing@example.com" },
  {
    priority: 1,          // Higher priority (lower number = higher priority)
    delay: 60_000,        // Delay 60 seconds
    jobId: "inv_123",     // Deduplicate by ID
    attempts: 5,          // Override default attempts
  }
);

// Add multiple jobs (bulk)
await emailQueue.addBulk([
  { name: "digest", data: { userId: "1" } },
  { name: "digest", data: { userId: "2" } },
  { name: "digest", data: { userId: "3" } },
]);
```

### 4. Job Idempotency

Jobs will be processed at least once. Network failures, crashes, and retries mean a job may be processed multiple times. Every job must produce the same result whether it runs once or ten times.

**Idempotency strategies:**

```typescript
// Strategy 1: Idempotency key (database check)
async function processPayment(job: Job<PaymentData>) {
  const { paymentId, amount, customerId } = job.data;

  // Check if already processed
  const existing = await db.payment.findUnique({
    where: { externalId: paymentId },
  });

  if (existing) {
    return { status: "already_processed", paymentId: existing.id };
  }

  // Process and record atomically
  const payment = await db.$transaction(async (tx) => {
    const record = await tx.payment.create({
      data: { externalId: paymentId, amount, customerId, status: "completed" },
    });
    await chargeCustomer(customerId, amount);
    return record;
  });

  return { status: "processed", paymentId: payment.id };
}

// Strategy 2: Unique job ID (BullMQ deduplication)
await paymentQueue.add("charge", paymentData, {
  jobId: `payment:${paymentData.paymentId}`, // Same ID = same job, won't be added twice
});

// Strategy 3: Upsert instead of insert
async function syncUser(job: Job<SyncData>) {
  await db.user.upsert({
    where: { externalId: job.data.externalId },
    update: { name: job.data.name, email: job.data.email },
    create: { externalId: job.data.externalId, name: job.data.name, email: job.data.email },
  });
}
```

### 5. Retry Strategies

Not all failures are permanent. Transient errors (network timeout, temporary overload) succeed on retry. Permanent errors (invalid data, missing resource) never will.

**BullMQ retry configuration:**

```typescript
const queue = new Queue("processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s → 4s → 8s
    },
  },
});

// Custom backoff strategy
const queue = new Queue("processing", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "custom",
    },
  },
});

// In the worker, control retry behavior
const worker = new Worker("processing", async (job) => {
  try {
    await processJob(job.data);
  } catch (error) {
    // Don't retry permanent errors
    if (isPermanentError(error)) {
      // Move to DLQ manually
      await dlqQueue.add("failed", {
        originalJob: job.data,
        error: error.message,
        queue: "processing",
        attempts: job.attemptsMade,
      });
      return; // Don't throw — marks job as complete
    }
    throw error; // Transient error — BullMQ will retry
  }
}, { connection });

function isPermanentError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.statusCode >= 400 && error.statusCode < 500;
  }
  return false;
}
```

**Dead letter queue (DLQ):**

Jobs that exhaust all retries go to a dead letter queue for manual inspection:

```typescript
const dlqQueue = new Queue("dead-letter", { connection });

// Monitor for permanently failed jobs
emailWorker.on("failed", async (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await dlqQueue.add("failed-email", {
      originalQueue: "email",
      originalJobId: job.id,
      jobData: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      attempts: job.attemptsMade,
    });

    logger.error({
      jobId: job.id,
      queue: "email",
      error: error.message,
      attempts: job.attemptsMade,
      msg: "Job exhausted all retries, moved to DLQ",
    });
  }
});
```

### 6. Scheduled Jobs (Cron)

Scheduled jobs run at fixed intervals. BullMQ supports repeatable jobs with cron expressions.

```typescript
// BullMQ repeatable jobs
await cleanupQueue.add(
  "expired-sessions",
  {}, // No job-specific data needed
  {
    repeat: {
      pattern: "0 3 * * *", // Every day at 3:00 AM
    },
    jobId: "cleanup-sessions", // Prevent duplicates on restart
  }
);

await reportQueue.add(
  "daily-digest",
  {},
  {
    repeat: {
      pattern: "0 8 * * 1-5", // Weekdays at 8:00 AM
    },
    jobId: "daily-digest",
  }
);

await billingQueue.add(
  "usage-aggregation",
  {},
  {
    repeat: {
      pattern: "*/15 * * * *", // Every 15 minutes
    },
    jobId: "usage-aggregation",
  }
);
```

**Vercel Cron (serverless alternative):**

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 8 * * 1-5"
    }
  ]
}

// app/api/cron/cleanup/route.ts
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return Response.json({ deleted: deleted.count });
}
```

### 7. Long-Running Tasks

Some tasks take minutes or hours: CSV exports, batch processing, ML training, video transcoding. These need progress tracking, cancellation, and chunked processing.

```typescript
// Worker with progress tracking
const exportWorker = new Worker(
  "export",
  async (job) => {
    const { userId, filters } = job.data;

    // Count total items
    const total = await db.post.count({ where: filters });
    let processed = 0;
    const batchSize = 100;
    const results: string[] = [];

    // Process in batches
    let cursor: string | undefined;

    while (true) {
      // Check for cancellation
      if (await job.isActive() === false) {
        logger.info({ jobId: job.id, msg: "Job cancelled" });
        return { status: "cancelled", processed };
      }

      const batch = await db.post.findMany({
        where: filters,
        take: batchSize,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
      });

      if (batch.length === 0) break;

      // Process batch
      for (const post of batch) {
        results.push(formatCsvRow(post));
      }

      processed += batch.length;
      cursor = batch[batch.length - 1].id;

      // Update progress
      await job.updateProgress({
        processed,
        total,
        percentage: Math.round((processed / total) * 100),
      });
    }

    // Upload result file
    const csvContent = results.join("\n");
    const fileUrl = await uploadToS3(`exports/${userId}/${job.id}.csv`, csvContent);

    return { status: "complete", processed, fileUrl };
  },
  {
    connection,
    concurrency: 2, // Limit concurrent exports
  }
);

// API: Check job progress
// app/api/jobs/[id]/route.ts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await exportQueue.getJob(id);

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const state = await job.getState();
  const progress = job.progress;

  return Response.json({
    data: {
      id: job.id,
      state,
      progress,
      result: state === "completed" ? job.returnvalue : null,
      failedReason: state === "failed" ? job.failedReason : null,
    },
  });
}
```

### 8. Job Monitoring

Unmonitored queues silently fail. You need visibility into queue health, job success/failure rates, and processing times.

**Bull Board (dashboard):**

```typescript
// lib/bull-board.ts
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(exportQueue),
    new BullMQAdapter(reportQueue),
    new BullMQAdapter(dlqQueue),
  ],
  serverAdapter,
});

// Mount in Express
app.use("/admin/queues", requireAdmin, serverAdapter.getRouter());
```

**Metrics to track:**

```typescript
// lib/queue-metrics.ts
import { Queue } from "bullmq";

async function getQueueMetrics(queue: Queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

// Health check endpoint
// app/api/health/queues/route.ts
export async function GET() {
  const queues = [
    { name: "email", queue: emailQueue },
    { name: "export", queue: exportQueue },
    { name: "report", queue: reportQueue },
  ];

  const metrics = await Promise.all(
    queues.map(async ({ name, queue }) => ({
      name,
      ...(await getQueueMetrics(queue)),
    }))
  );

  // Alert if any queue has high wait count
  const unhealthy = metrics.filter((m) => m.waiting > 100 || m.failed > 50);

  return Response.json(
    { data: metrics, healthy: unhealthy.length === 0 },
    { status: unhealthy.length > 0 ? 503 : 200 }
  );
}
```

### 9. Serverless Background Processing

For applications running entirely on serverless (no persistent worker process), use managed job platforms.

**Inngest:**

```typescript
// lib/inngest.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "my-app" });

// Define a function triggered by an event
export const sendWelcomeEmail = inngest.createFunction(
  {
    id: "send-welcome-email",
    retries: 3,
  },
  { event: "user/created" },
  async ({ event, step }) => {
    // Each step is retried independently
    const user = await step.run("get-user", async () => {
      return db.user.findUnique({ where: { id: event.data.userId } });
    });

    if (!user) return { status: "user-not-found" };

    await step.run("send-email", async () => {
      await sendEmail({
        to: user.email,
        template: "welcome",
        data: { name: user.name },
      });
    });

    // Wait 24 hours, then send onboarding email
    await step.sleep("wait-for-onboarding", "24h");

    await step.run("send-onboarding", async () => {
      await sendEmail({
        to: user.email,
        template: "onboarding",
        data: { name: user.name },
      });
    });

    return { status: "complete" };
  }
);

// Trigger the function
await inngest.send({
  name: "user/created",
  data: { userId: "user_123" },
});
```

**Trigger.dev:**

```typescript
// Similar to Inngest — event-driven background jobs for serverless
import { TriggerClient } from "@trigger.dev/sdk";

export const client = new TriggerClient({ id: "my-app" });

client.defineJob({
  id: "process-csv-upload",
  name: "Process CSV Upload",
  version: "1.0.0",
  trigger: eventTrigger({ name: "csv.uploaded" }),
  run: async (payload, io) => {
    const rows = await io.runTask("parse-csv", async () => {
      return parseCsv(payload.fileUrl);
    });

    for (const [index, batch] of chunk(rows, 100).entries()) {
      await io.runTask(`import-batch-${index}`, async () => {
        await db.record.createMany({ data: batch });
      });
    }

    return { imported: rows.length };
  },
});
```

---

## LLM Instructions

### Setting Up BullMQ

When configuring BullMQ:

- Install: `npm install bullmq ioredis`
- Create a shared Redis connection with `maxRetriesPerRequest: null` (required by BullMQ)
- Define queues with sensible defaults: `attempts: 3`, `backoff: exponential`, `removeOnComplete: { count: 1000 }`
- Create workers with appropriate concurrency (5 for I/O-bound, 1–2 for CPU-bound)
- Set up event listeners for `completed` and `failed` events
- Add rate limiting if the worker calls external APIs with rate limits

### Designing Job Payloads

When creating background jobs:

- Keep payloads small — store IDs and references, not full objects
- Include all data needed to process the job — the worker should not need to guess
- Use a consistent schema (Zod) to validate job payloads
- Include metadata: `createdAt`, `userId`, `source`
- Use descriptive job names: `"send-welcome-email"`, not `"process"`
- Set a unique `jobId` for idempotent jobs to prevent duplicates

### Configuring Retries

When setting up retry logic:

- Default: 3 attempts with exponential backoff starting at 1 second
- Increase attempts for critical jobs (email: 5, payment: 3 with longer delays)
- Distinguish transient from permanent errors — don't retry permanent failures
- Set up a DLQ for jobs that exhaust all retries
- Log every retry with attempt number and error message
- Alert when DLQ depth exceeds a threshold

### Setting Up Scheduled Jobs

When creating cron jobs:

- Use BullMQ `repeat` with cron patterns for persistent worker setups
- Use Vercel Cron for serverless (protect with `CRON_SECRET`)
- Always set a unique `jobId` on repeatable jobs to prevent duplicates on restart
- Monitor for missed runs — if a cron job didn't fire, something is wrong
- Use human-readable cron patterns and comment what they mean
- Keep cron handlers idempotent — they may run twice if the scheduler restarts

### Monitoring Queues

When setting up queue monitoring:

- Install Bull Board for a dashboard: `@bull-board/api @bull-board/express`
- Track: waiting count, active count, failed count, processing duration
- Alert on: queue depth > 100, failure rate > 5%, DLQ growth
- Add a health check endpoint that reports queue metrics
- Log job completion with duration for performance tracking
- Protect the dashboard with admin authentication

---

## Examples

### 1. BullMQ Email Queue with Retry and DLQ

A production email queue with retries, dead letter queue, and monitoring:

```typescript
// queues/email.ts
import { Queue, Worker, QueueEvents } from "bullmq";
import { connection } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { sendEmail, EmailOptions } from "@/lib/email";

// Queue definition
export const emailQueue = new Queue<EmailOptions>("email", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 86400, count: 1000 }, // Keep 24h or 1000
    removeOnFail: { age: 604800, count: 5000 },     // Keep 7d or 5000
  },
});

// Dead letter queue
export const emailDLQ = new Queue("email-dlq", { connection });

// Worker
export const emailWorker = new Worker<EmailOptions>(
  "email",
  async (job) => {
    const startTime = Date.now();

    logger.info({
      jobId: job.id,
      to: job.data.to,
      template: job.data.template,
      attempt: job.attemptsMade + 1,
      msg: "Processing email job",
    });

    await sendEmail(job.data);

    const duration = Date.now() - startTime;
    logger.info({
      jobId: job.id,
      to: job.data.to,
      duration,
      msg: "Email sent successfully",
    });

    return { sentAt: new Date().toISOString(), duration };
  },
  {
    connection,
    concurrency: 10,
    limiter: { max: 100, duration: 60_000 }, // 100/min rate limit
  }
);

// Move exhausted jobs to DLQ
emailWorker.on("failed", async (job, error) => {
  if (!job) return;

  logger.warn({
    jobId: job.id,
    attempt: job.attemptsMade,
    error: error.message,
    msg: "Email job failed",
  });

  if (job.attemptsMade >= (job.opts.attempts ?? 5)) {
    await emailDLQ.add("failed-email", {
      originalJobId: job.id,
      jobData: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      totalAttempts: job.attemptsMade,
    });

    logger.error({
      jobId: job.id,
      to: job.data.to,
      msg: "Email job moved to DLQ after exhausting retries",
    });
  }
});

// Helper to add email jobs
export async function queueEmail(options: EmailOptions & { priority?: number; delay?: number }) {
  const { priority, delay, ...emailData } = options;
  return emailQueue.add("send", emailData, {
    priority,
    delay,
    jobId: `email:${emailData.to}:${emailData.template}:${Date.now()}`,
  });
}
```

### 2. Scheduled Report Generation

A daily report job that runs on a cron schedule:

```typescript
// queues/reports.ts
import { Queue, Worker } from "bullmq";
import { connection } from "@/lib/redis";
import { db } from "@/lib/db";
import { uploadToS3 } from "@/lib/storage";
import { queueEmail } from "./email";

export const reportQueue = new Queue("reports", { connection });

// Schedule daily report
await reportQueue.add(
  "daily-metrics",
  {},
  {
    repeat: { pattern: "0 7 * * *" }, // 7 AM daily
    jobId: "daily-metrics",
  }
);

// Worker
export const reportWorker = new Worker(
  "reports",
  async (job) => {
    if (job.name === "daily-metrics") {
      return generateDailyReport();
    }
    if (job.name === "weekly-summary") {
      return generateWeeklySummary(job.data);
    }
  },
  { connection, concurrency: 2 }
);

async function generateDailyReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [newUsers, newPosts, activeUsers] = await Promise.all([
    db.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    db.post.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    db.session.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: yesterday, lt: today } },
      _count: true,
    }),
  ]);

  const report = {
    date: yesterday.toISOString().split("T")[0],
    metrics: { newUsers, newPosts, activeUsers: activeUsers.length },
    generatedAt: new Date().toISOString(),
  };

  // Upload report
  const url = await uploadToS3(
    `reports/daily/${report.date}.json`,
    JSON.stringify(report, null, 2)
  );

  // Notify admins
  const admins = await db.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await queueEmail({
      to: admin.email,
      template: "daily-report",
      subject: `Daily Report — ${report.date}`,
      data: report.metrics,
    });
  }

  return { url, metrics: report.metrics };
}
```

### 3. Long-Running CSV Export with Progress

A chunked export job with real-time progress tracking:

```typescript
// queues/export.ts
import { Queue, Worker } from "bullmq";
import { connection } from "@/lib/redis";
import { db } from "@/lib/db";
import { uploadToS3 } from "@/lib/storage";

interface ExportJobData {
  userId: string;
  organizationId: string;
  type: "posts" | "users" | "analytics";
  filters: Record<string, unknown>;
}

export const exportQueue = new Queue<ExportJobData>("export", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 86400 },
  },
});

export const exportWorker = new Worker<ExportJobData>(
  "export",
  async (job) => {
    const { userId, organizationId, type, filters } = job.data;
    const batchSize = 500;

    // Count total
    const total = await db.post.count({ where: { organizationId, ...filters } });
    if (total === 0) return { status: "empty", processed: 0 };

    let processed = 0;
    let cursor: string | undefined;
    const chunks: string[] = [];

    // CSV header
    const headers = getHeadersForType(type);
    chunks.push(headers.join(","));

    while (true) {
      const batch = await db.post.findMany({
        where: { organizationId, ...filters },
        take: batchSize,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
      });

      if (batch.length === 0) break;

      for (const item of batch) {
        chunks.push(toCsvRow(item, type));
      }

      processed += batch.length;
      cursor = batch[batch.length - 1].id;

      // Report progress
      await job.updateProgress({
        processed,
        total,
        percentage: Math.round((processed / total) * 100),
      });

      if (batch.length < batchSize) break;
    }

    // Upload to S3
    const filename = `${type}-export-${new Date().toISOString().split("T")[0]}.csv`;
    const key = `exports/${organizationId}/${job.id}/${filename}`;
    const fileUrl = await uploadToS3(key, chunks.join("\n"));

    // Store export record
    await db.export.create({
      data: {
        jobId: job.id!,
        userId,
        organizationId,
        type,
        fileUrl,
        rowCount: processed,
      },
    });

    return { status: "complete", processed, fileUrl, filename };
  },
  {
    connection,
    concurrency: 3,
  }
);
```

### 4. Inngest Event-Driven Flow

A multi-step workflow using Inngest for serverless environments:

```typescript
// lib/inngest/client.ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "my-app" });

// lib/inngest/functions/onboarding.ts
import { inngest } from "../client";

export const onboardingFlow = inngest.createFunction(
  { id: "user-onboarding", retries: 3 },
  { event: "user/signed-up" },
  async ({ event, step }) => {
    const { userId, email, name } = event.data;

    // Step 1: Create default workspace
    const workspace = await step.run("create-workspace", async () => {
      return db.organization.create({
        data: {
          name: `${name}'s Workspace`,
          slug: `workspace-${userId.slice(0, 8)}`,
          members: { create: { userId, role: "OWNER" } },
        },
      });
    });

    // Step 2: Send welcome email
    await step.run("send-welcome-email", async () => {
      await sendEmail({
        to: email,
        template: "welcome",
        data: { name, workspaceName: workspace.name },
      });
    });

    // Step 3: Wait 1 day
    await step.sleep("wait-1-day", "1d");

    // Step 4: Check if user has created content
    const hasContent = await step.run("check-engagement", async () => {
      const postCount = await db.post.count({ where: { authorId: userId } });
      return postCount > 0;
    });

    // Step 5: Send appropriate follow-up
    if (!hasContent) {
      await step.run("send-nudge", async () => {
        await sendEmail({
          to: email,
          template: "getting-started",
          data: { name },
        });
      });
    }

    // Step 6: Wait 6 more days
    await step.sleep("wait-6-days", "6d");

    // Step 7: Send weekly digest
    await step.run("send-first-digest", async () => {
      await sendEmail({
        to: email,
        template: "weekly-digest",
        data: { name },
      });
    });

    return { completed: true, workspaceId: workspace.id };
  }
);

// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { onboardingFlow } from "@/lib/inngest/functions/onboarding";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [onboardingFlow],
});
```

### 5. Job Monitoring Dashboard Setup

Setting up Bull Board for queue monitoring:

```typescript
// lib/bull-board.ts
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue, emailDLQ } from "@/queues/email";
import { exportQueue } from "@/queues/export";
import { reportQueue } from "@/queues/reports";

export function setupBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(emailDLQ),
      new BullMQAdapter(exportQueue),
      new BullMQAdapter(reportQueue),
    ],
    serverAdapter,
  });

  return serverAdapter;
}

// Metrics endpoint
// app/api/admin/queue-metrics/route.ts
export async function GET(request: Request) {
  const session = await requireRole("ADMIN");

  const queues = [
    { name: "email", queue: emailQueue },
    { name: "email-dlq", queue: emailDLQ },
    { name: "export", queue: exportQueue },
    { name: "reports", queue: reportQueue },
  ];

  const metrics = await Promise.all(
    queues.map(async ({ name, queue }) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return { name, waiting, active, completed, failed, delayed };
    })
  );

  return Response.json({ data: metrics });
}
```

---

## Common Mistakes

### 1. Non-Idempotent Jobs

**Wrong:** A job that sends an email without checking if it was already sent. On retry, the user receives the email twice.

**Fix:** Make every job idempotent. Use a unique idempotency key (database check), unique `jobId` (BullMQ deduplication), or upserts instead of inserts. A job should produce the same result whether it runs once or ten times.

### 2. No Dead Letter Queue

**Wrong:** Failed jobs silently disappear after exhausting retries, with no record of what failed or why.

**Fix:** Move permanently failed jobs to a DLQ. Include the original job data, error message, and retry count. Set up alerts on DLQ growth. Provide a mechanism to inspect and retry DLQ jobs.

### 3. Unbounded Retry

**Wrong:** Setting `attempts: 100` with no backoff delay, hammering a failing service 100 times in seconds.

**Fix:** Set reasonable retry limits (3–5). Use exponential backoff. Add jitter to prevent thundering herd. Distinguish transient from permanent errors — don't retry permanent failures.

### 4. No Job Timeout

**Wrong:** A worker hangs on a network call indefinitely, blocking the concurrency slot and preventing other jobs from processing.

**Fix:** Set timeouts on all external calls within workers. BullMQ has no built-in job timeout, so use `AbortController` on fetch calls and `Promise.race` with a timeout for other operations.

### 5. Shared Queue for Different Priorities

**Wrong:** Mixing critical (password reset email) and non-critical (weekly digest) jobs in the same queue. A spike of digest emails delays password resets.

**Fix:** Use separate queues or priority levels. Critical jobs get their own queue with dedicated workers. Or use BullMQ priority: password reset at `priority: 1`, digest at `priority: 10`.

### 6. Losing Jobs on Deploy

**Wrong:** Deploying a new version kills the worker process, losing in-progress jobs.

**Fix:** Handle graceful shutdown. BullMQ workers support `worker.close()` which waits for active jobs to complete. Register SIGTERM handler to close workers gracefully before the process exits.

```typescript
process.on("SIGTERM", async () => {
  await emailWorker.close();
  await exportWorker.close();
  process.exit(0);
});
```

### 7. No Queue Monitoring

**Wrong:** Queues run with no visibility. Jobs fail silently, queues back up, and nobody notices until users complain.

**Fix:** Set up Bull Board for a visual dashboard. Add a health check endpoint that reports queue metrics. Alert on: queue depth > threshold, failure rate > 5%, DLQ growth. Log every job completion and failure.

### 8. Synchronous Processing in API Handler

**Wrong:** Processing a time-consuming task synchronously in the API route, making the user wait.

**Fix:** Queue the work, return `202 Accepted` immediately. Provide a way for the client to check progress (polling endpoint or WebSocket/SSE notification).

### 9. Giant Job Payloads

**Wrong:** Putting a 50MB CSV file content in the job payload, overwhelming Redis memory.

**Fix:** Store large data in object storage (S3, R2) and pass a reference (URL or key) in the job payload. Keep payloads small — IDs, references, and metadata only.

---

> **See also:** [Error-Handling-Logging](../Error-Handling-Logging/error-handling-logging.md) | [Webhooks-Integrations](../Webhooks-Integrations/webhooks-integrations.md) | [Serverless-Edge](../Serverless-Edge/serverless-edge.md) | [Caching-Strategies](../Caching-Strategies/caching-strategies.md) | [Real-Time](../Real-Time/real-time.md)
>
> **Last reviewed:** 2026-02
