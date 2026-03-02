---
title: "AI Workflows & Pipelines"
description: Multi-step AI processing chains, batch operations, map-reduce patterns, conditional routing, content moderation pipelines, document processing, scheduled AI jobs, webhook-triggered AI, error handling in AI pipelines, and cost management at scale — the deterministic orchestration layer for production AI.
---
# AI Workflows & Pipelines

> Multi-step AI processing chains, batch operations, map-reduce patterns, conditional routing, content moderation pipelines, document processing, scheduled AI jobs, webhook-triggered AI, error handling in AI pipelines, and cost management at scale — the deterministic orchestration layer for production AI.

---

## Principles

### 1. Workflows vs Agents

An agent decides what to do. A workflow follows a defined path. Most production AI features are workflows, not agents.

| | Workflow | Agent |
|--|---------|-------|
| Path | Predetermined | Dynamic |
| Steps | Fixed sequence | Model decides |
| Reliability | High — same input = same path | Variable — may take different paths |
| Debugging | Easy — trace the pipeline | Hard — reasoning is non-deterministic |
| Cost | Predictable | Unpredictable |
| Use case | Data processing, content pipelines, moderation | Research, complex support, open-ended tasks |

**Use workflows when:**

- The steps are known in advance
- Reliability and consistency matter
- You need predictable cost and latency
- The pipeline processes many items (batch)
- Errors need structured handling and retry

**Examples of workflows, not agents:**

- Support ticket: classify → route → draft response → quality check → send
- Content pipeline: research → write → edit → SEO optimize → publish
- Data enrichment: new lead → extract company info → score → update CRM
- Moderation: user upload → content safety check → approve/reject
- Document processing: extract text → chunk → embed → store

### 2. Pipeline Architecture

A pipeline is a sequence of steps where each step's output feeds the next step's input. Build pipelines as composable, typed functions.

```typescript
// lib/ai/pipeline.ts

interface PipelineStep<TInput, TOutput> {
  name: string;
  execute: (input: TInput) => Promise<TOutput>;
  onError?: (error: Error, input: TInput) => Promise<TOutput | null>;
}

interface PipelineResult<T> {
  success: boolean;
  output?: T;
  error?: string;
  steps: Array<{
    name: string;
    durationMs: number;
    status: 'completed' | 'failed' | 'skipped';
    error?: string;
  }>;
  totalDurationMs: number;
}

export class Pipeline<TInput, TOutput> {
  private steps: Array<PipelineStep<any, any>> = [];

  addStep<TStepOutput>(
    step: PipelineStep<TOutput extends never ? TInput : TOutput, TStepOutput>
  ): Pipeline<TInput, TStepOutput> {
    this.steps.push(step);
    return this as any;
  }

  async execute(input: TInput): Promise<PipelineResult<TOutput>> {
    const stepResults: PipelineResult<TOutput>['steps'] = [];
    const pipelineStart = performance.now();
    let currentData: any = input;

    for (const step of this.steps) {
      const stepStart = performance.now();

      try {
        currentData = await step.execute(currentData);
        stepResults.push({
          name: step.name,
          durationMs: Math.round(performance.now() - stepStart),
          status: 'completed',
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Try error handler if available
        if (step.onError) {
          const recovered = await step.onError(err, currentData);
          if (recovered !== null) {
            currentData = recovered;
            stepResults.push({
              name: step.name,
              durationMs: Math.round(performance.now() - stepStart),
              status: 'completed',
              error: `Recovered: ${err.message}`,
            });
            continue;
          }
        }

        stepResults.push({
          name: step.name,
          durationMs: Math.round(performance.now() - stepStart),
          status: 'failed',
          error: err.message,
        });

        return {
          success: false,
          error: `Step "${step.name}" failed: ${err.message}`,
          steps: stepResults,
          totalDurationMs: Math.round(performance.now() - pipelineStart),
        };
      }
    }

    return {
      success: true,
      output: currentData,
      steps: stepResults,
      totalDurationMs: Math.round(performance.now() - pipelineStart),
    };
  }
}
```

### 3. Conditional Routing

Many workflows need branching: if the content is in Spanish, use a different prompt. If the ticket is critical, skip the queue. If the image is NSFW, reject it.

```typescript
// lib/ai/router.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Route based on AI classification
const RoutingDecision = z.object({
  route: z.enum(['support', 'billing', 'technical', 'sales', 'spam']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export async function classifyAndRoute(input: string): Promise<z.infer<typeof RoutingDecision>> {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'), // Fast, cheap model for routing
    temperature: 0,
    schema: RoutingDecision,
    prompt: `Classify this customer message into a routing category.

MESSAGE: "${input}"

ROUTING RULES:
- support: product questions, how-to, troubleshooting
- billing: payments, invoices, refunds, subscription changes
- technical: API issues, integration problems, bug reports
- sales: pricing questions, feature comparisons, enterprise inquiries
- spam: irrelevant, promotional, or abusive content`,
  });

  return object;
}

// Conditional pipeline execution
interface ConditionalStep<TInput, TOutput> {
  condition: (input: TInput) => boolean | Promise<boolean>;
  ifTrue: (input: TInput) => Promise<TOutput>;
  ifFalse: (input: TInput) => Promise<TOutput>;
}

async function conditionalExecute<TInput, TOutput>(
  input: TInput,
  step: ConditionalStep<TInput, TOutput>
): Promise<TOutput> {
  const result = await step.condition(input);
  return result ? step.ifTrue(input) : step.ifFalse(input);
}
```

### 4. Map-Reduce for Large Documents

When content is too large for a single LLM call, split it into chunks, process each chunk (map), then combine results (reduce).

```typescript
// lib/ai/map-reduce.ts
import { generateText, generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

interface MapReduceOptions<TMapResult> {
  chunks: string[];
  mapPrompt: (chunk: string, index: number) => string;
  mapSchema?: z.ZodType<TMapResult>;
  reducePrompt: (results: TMapResult[]) => string;
  concurrency?: number;
}

export async function mapReduce<TMapResult = string>(
  options: MapReduceOptions<TMapResult>
): Promise<string> {
  const { chunks, mapPrompt, mapSchema, reducePrompt, concurrency = 3 } = options;

  // Map phase: process each chunk
  const mapResults: TMapResult[] = [];

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (chunk, batchIndex) => {
        const index = i + batchIndex;

        if (mapSchema) {
          const { object } = await generateObject({
            model: anthropic('claude-sonnet-4-20250514'),
            schema: mapSchema,
            prompt: mapPrompt(chunk, index),
          });
          return object;
        } else {
          const { text } = await generateText({
            model: anthropic('claude-sonnet-4-20250514'),
            prompt: mapPrompt(chunk, index),
            maxTokens: 1000,
          });
          return text as TMapResult;
        }
      })
    );

    mapResults.push(...batchResults);
  }

  // Reduce phase: combine results
  const { text: finalResult } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt: reducePrompt(mapResults),
    maxTokens: 2000,
  });

  return finalResult;
}

// Example: Summarize a long document
export async function summarizeLongDocument(
  document: string,
  chunkSize: number = 3000
): Promise<string> {
  // Split into chunks
  const words = document.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }

  if (chunks.length === 1) {
    // Short enough for a single call
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: `Summarize this document in 3-5 key points:\n\n${document}`,
    });
    return text;
  }

  return mapReduce({
    chunks,
    mapPrompt: (chunk, i) =>
      `Summarize this section (part ${i + 1} of ${chunks.length}) in 2-3 bullet points:\n\n${chunk}`,
    reducePrompt: (summaries) =>
      `These are summaries of different sections of a document. Create a unified, coherent summary with 5-7 key points:\n\n${(summaries as string[]).join('\n\n---\n\n')}`,
    concurrency: 3,
  });
}
```

### 5. Batch Processing at Scale

Process thousands of items through an AI pipeline efficiently. The key challenges: rate limits, error handling, progress tracking, and cost control.

```typescript
// lib/ai/batch.ts
interface BatchOptions<TInput, TOutput> {
  items: TInput[];
  process: (item: TInput) => Promise<TOutput>;
  concurrency?: number;
  onProgress?: (completed: number, total: number, failed: number) => void;
  onItemComplete?: (item: TInput, result: TOutput) => void;
  onItemError?: (item: TInput, error: Error) => void;
  retries?: number;
  delayBetweenBatches?: number; // ms — for rate limiting
}

interface BatchResult<TInput, TOutput> {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    input: TInput;
    output?: TOutput;
    error?: string;
    attempts: number;
  }>;
  durationMs: number;
}

export async function processBatch<TInput, TOutput>(
  options: BatchOptions<TInput, TOutput>
): Promise<BatchResult<TInput, TOutput>> {
  const {
    items,
    process,
    concurrency = 5,
    onProgress,
    onItemComplete,
    onItemError,
    retries = 2,
    delayBetweenBatches = 200,
  } = options;

  const start = Date.now();
  const results: BatchResult<TInput, TOutput>['results'] = [];
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const output = await process(item);
            onItemComplete?.(item, output);
            return { input: item, output, attempts: attempt + 1 };
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Only retry on rate limits or server errors
            const isRetryable =
              lastError.message.includes('429') ||
              lastError.message.includes('500') ||
              lastError.message.includes('503');

            if (!isRetryable || attempt === retries) break;

            // Exponential backoff
            await new Promise((r) =>
              setTimeout(r, Math.pow(2, attempt) * 1000)
            );
          }
        }

        onItemError?.(item, lastError!);
        return {
          input: item,
          error: lastError!.message,
          attempts: retries + 1,
        };
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        if (result.value.output !== undefined) {
          completed++;
          results.push(result.value as any);
        } else {
          failed++;
          results.push(result.value as any);
        }
      }
    }

    onProgress?.(completed + failed, items.length, failed);

    // Rate limiting delay between batches
    if (i + concurrency < items.length && delayBetweenBatches > 0) {
      await new Promise((r) => setTimeout(r, delayBetweenBatches));
    }
  }

  return {
    total: items.length,
    succeeded: completed,
    failed,
    results,
    durationMs: Date.now() - start,
  };
}
```

### 6. Scheduled AI Jobs

Run AI processing on a schedule: daily report generation, weekly content analysis, nightly data enrichment.

```typescript
// app/api/cron/daily-summary/route.ts
import { generateText, generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

const DailySummary = z.object({
  highlights: z.array(z.string()).max(5),
  metrics: z.object({
    newUsers: z.number(),
    activeConversations: z.number(),
    resolvedTickets: z.number(),
    avgSatisfaction: z.number(),
  }),
  concerns: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export async function GET(req: Request) {
  // Verify cron authentication
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Gather data
  const [tickets, feedback, costs] = await Promise.all([
    db.ticket.findMany({
      where: { createdAt: { gte: yesterday } },
      include: { messages: true },
    }),
    db.aiFeedback.findMany({
      where: { createdAt: { gte: yesterday } },
    }),
    db.aiCostLog.aggregate({
      where: { createdAt: { gte: yesterday } },
      _sum: { cost: true },
      _count: true,
    }),
  ]);

  // Generate summary
  const { object: summary } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: DailySummary,
    prompt: `Generate a daily operations summary from this data.

SUPPORT TICKETS (${tickets.length} total):
${tickets.slice(0, 20).map((t) => `- [${t.status}] ${t.subject}`).join('\n')}

FEEDBACK: ${feedback.filter((f) => f.rating === 'positive').length} positive, ${feedback.filter((f) => f.rating === 'negative').length} negative

AI COSTS: $${(costs._sum.cost || 0).toFixed(2)} across ${costs._count} requests

Identify trends, concerns, and actionable recommendations.`,
  });

  // Send to Slack
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `Daily AI Operations Summary`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: 'Daily AI Operations Summary' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Highlights:*\n${summary.highlights.map((h) => `- ${h}`).join('\n')}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: summary.concerns.length > 0
              ? `*Concerns:*\n${summary.concerns.map((c) => `- ${c}`).join('\n')}`
              : '*No concerns flagged.*',
          },
        },
      ],
    }),
  });

  return Response.json({ summary });
}
```

### 7. Webhook-Triggered AI Processing

Process events from external services (form submissions, new orders, support tickets) with AI automatically.

```typescript
// app/api/webhooks/new-ticket/route.ts
import { generateObject, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const TicketAnalysis = z.object({
  category: z.enum(['bug', 'feature', 'billing', 'support', 'spam']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  sentiment: z.enum(['positive', 'neutral', 'frustrated', 'angry']),
  suggestedResponse: z.string(),
  assignTo: z.enum(['engineering', 'support', 'billing', 'product']),
  autoResolvable: z.boolean().describe('Can this be resolved with a knowledge base article?'),
});

export async function POST(req: Request) {
  // Verify webhook signature
  const signature = req.headers.get('x-webhook-signature');
  if (!verifySignature(signature, await req.text())) {
    return new Response('Invalid signature', { status: 401 });
  }

  const ticket = await req.json();

  // Step 1: Classify and analyze (fast, cheap model)
  const { object: analysis } = await generateObject({
    model: openai('gpt-4o-mini'),
    temperature: 0,
    schema: TicketAnalysis,
    prompt: `Analyze this support ticket:

Subject: ${ticket.subject}
Body: ${ticket.body}
Customer tier: ${ticket.customerTier}

Classify, prioritize, suggest a response, and determine routing.`,
  });

  // Step 2: If auto-resolvable, search knowledge base and draft response
  if (analysis.autoResolvable) {
    const articles = await searchKnowledgeBase(ticket.body, { limit: 3 });

    if (articles.length > 0) {
      const { text: draftResponse } = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        system: `You are a support agent. Draft a helpful response using the knowledge base articles provided. Be concise and include relevant links.`,
        prompt: `Customer question: ${ticket.body}\n\nKnowledge base articles:\n${articles.map((a) => `- ${a.title}: ${a.content.slice(0, 500)}`).join('\n')}`,
        maxTokens: 500,
      });

      // Save draft for human review
      await db.ticketDraft.create({
        data: {
          ticketId: ticket.id,
          content: draftResponse,
          confidence: analysis.sentiment === 'angry' ? 'low' : 'high',
          sources: articles.map((a) => a.id),
        },
      });
    }
  }

  // Step 3: Update ticket with analysis
  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      assignedTeam: analysis.assignTo,
      aiAnalyzed: true,
    },
  });

  // Step 4: Alert on critical tickets
  if (analysis.priority === 'critical' || analysis.sentiment === 'angry') {
    await sendUrgentAlert(ticket, analysis);
  }

  return Response.json({ analyzed: true, analysis });
}
```

### 8. Error Handling in AI Pipelines

AI calls fail differently than database calls. You need to handle: rate limits, content policy violations, token limit exceeded, provider outages, and malformed outputs.

```typescript
// lib/ai/pipeline-errors.ts

// Categorize AI errors for appropriate handling
export function categorizeAIError(error: unknown): {
  type: 'rate_limit' | 'content_policy' | 'token_limit' | 'provider_error' | 'validation' | 'unknown';
  retryable: boolean;
  message: string;
} {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message.toLowerCase();

  if (message.includes('429') || message.includes('rate limit')) {
    return { type: 'rate_limit', retryable: true, message: 'Rate limit exceeded. Will retry.' };
  }

  if (message.includes('content_policy') || message.includes('content_filter')) {
    return { type: 'content_policy', retryable: false, message: 'Content flagged by safety filters.' };
  }

  if (message.includes('context_length') || message.includes('token')) {
    return { type: 'token_limit', retryable: false, message: 'Input too long for model context window.' };
  }

  if (message.includes('500') || message.includes('503') || message.includes('timeout')) {
    return { type: 'provider_error', retryable: true, message: 'Provider temporarily unavailable.' };
  }

  if (message.includes('validation') || message.includes('schema')) {
    return { type: 'validation', retryable: true, message: 'Output failed schema validation.' };
  }

  return { type: 'unknown', retryable: false, message: err.message };
}

// Resilient step execution with retry and fallback
export async function resilientStep<T>(
  name: string,
  execute: () => Promise<T>,
  options: {
    retries?: number;
    fallback?: () => Promise<T>;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { retries = 2, fallback, onRetry } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await execute();
    } catch (error) {
      const categorized = categorizeAIError(error);

      if (!categorized.retryable || attempt === retries) {
        if (fallback) {
          console.warn(`Step "${name}" failed, using fallback: ${categorized.message}`);
          return fallback();
        }
        throw error;
      }

      onRetry?.(attempt + 1, error as Error);
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  throw new Error(`Step "${name}" exhausted all retries`);
}
```

---

## LLM Instructions

```
AI WORKFLOW AND PIPELINE INSTRUCTIONS

1. BUILD MULTI-STEP PIPELINES:
   - Define each step as a typed function with clear input/output types
   - Chain steps where each output feeds the next input
   - Use cheap/fast models (gpt-4o-mini) for classification and routing steps
   - Use capable models (claude-sonnet-4, gpt-4o) for generation steps
   - Log each step's duration, status, and output for debugging
   - Handle errors per-step with retry logic and fallbacks

2. IMPLEMENT CONDITIONAL ROUTING:
   - Use generateObject with a routing schema to classify inputs
   - Route to different processing paths based on classification
   - Use temperature 0 for deterministic routing decisions
   - Log routing decisions for monitoring and debugging
   - Include confidence scores to handle ambiguous cases

3. USE MAP-REDUCE FOR LARGE CONTENT:
   - Split large documents into chunks (2000-4000 tokens each)
   - Map: process each chunk independently (summarize, extract, classify)
   - Reduce: combine chunk results into a single output
   - Process chunks with concurrency limits (3-5 parallel)
   - Handle partial failures — one chunk failing should not kill the whole job

4. IMPLEMENT BATCH PROCESSING:
   - Process items with configurable concurrency (5-10 for most APIs)
   - Add rate limiting delays between batches (200-500ms)
   - Retry failed items with exponential backoff (only for retryable errors)
   - Track progress and report completion percentage
   - Store results incrementally — don't lose work on late failures
   - Set a total budget limit that aborts the batch if exceeded

5. SET UP SCHEDULED AND TRIGGERED WORKFLOWS:
   - Use Vercel Cron for scheduled jobs (daily summaries, weekly reports)
   - Use webhook endpoints for event-triggered processing
   - Authenticate cron jobs with a CRON_SECRET environment variable
   - Set maxDuration for long-running cron handlers (up to 300s on Vercel Pro)
   - Log job runs with start time, duration, items processed, cost, and errors
   - Send results to Slack, email, or a dashboard
```

---

## Examples

### Example 1: Content Moderation Pipeline

A complete moderation pipeline for user-generated content: text check, image check, decision, and action.

```typescript
// lib/pipelines/moderation.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const TextModeration = z.object({
  safe: z.boolean(),
  categories: z.object({
    spam: z.boolean(),
    hate: z.boolean(),
    harassment: z.boolean(),
    violence: z.boolean(),
    sexual: z.boolean(),
    misinformation: z.boolean(),
  }),
  severity: z.enum(['none', 'low', 'medium', 'high']),
  explanation: z.string().max(200),
});

const ImageModeration = z.object({
  safe: z.boolean(),
  categories: z.object({
    nsfw: z.boolean(),
    violence: z.boolean(),
    hate: z.boolean(),
  }),
  confidence: z.number().min(0).max(1),
});

type ModerationDecision = 'approve' | 'reject' | 'review';

interface ModerationResult {
  decision: ModerationDecision;
  textResult?: z.infer<typeof TextModeration>;
  imageResult?: z.infer<typeof ImageModeration>;
  reasons: string[];
}

export async function moderateContent(content: {
  text?: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  userId: string;
}): Promise<ModerationResult> {
  const reasons: string[] = [];
  let textResult: z.infer<typeof TextModeration> | undefined;
  let imageResult: z.infer<typeof ImageModeration> | undefined;

  // Step 1: Text moderation (if text provided)
  if (content.text) {
    // Use OpenAI moderation API first (free, fast)
    const quickCheck = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: content.text }),
    });
    const quickResult = await quickCheck.json();

    if (quickResult.results[0].flagged) {
      // Deep analysis with LLM
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        temperature: 0,
        schema: TextModeration,
        prompt: `Moderate this user-generated content for a family-friendly platform:

"${content.text}"

Flag ANY content that is spam, hateful, harassing, violent, sexual, or misleading.`,
      });

      textResult = object;
      if (!object.safe) {
        reasons.push(`Text flagged: ${object.explanation}`);
      }
    } else {
      textResult = {
        safe: true,
        categories: {
          spam: false, hate: false, harassment: false,
          violence: false, sexual: false, misinformation: false,
        },
        severity: 'none',
        explanation: 'Content passed automated checks',
      };
    }
  }

  // Step 2: Image moderation (if image provided)
  if (content.imageBuffer && content.imageMimeType) {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      temperature: 0,
      schema: ImageModeration,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Evaluate this image for content safety. Check for NSFW, violence, and hate symbols. Be conservative.',
            },
            {
              type: 'image',
              image: content.imageBuffer,
              mimeType: content.imageMimeType as any,
            },
          ],
        },
      ],
    });

    imageResult = object;
    if (!object.safe) {
      const flagged = Object.entries(object.categories)
        .filter(([_, v]) => v)
        .map(([k]) => k);
      reasons.push(`Image flagged: ${flagged.join(', ')}`);
    }
  }

  // Step 3: Make decision
  const hasTextIssue = textResult && !textResult.safe;
  const hasImageIssue = imageResult && !imageResult.safe;
  const severity = textResult?.severity || 'none';

  let decision: ModerationDecision;
  if (severity === 'high' || (hasImageIssue && imageResult!.confidence > 0.9)) {
    decision = 'reject';
  } else if (hasTextIssue || hasImageIssue) {
    decision = 'review'; // Queue for human review
  } else {
    decision = 'approve';
  }

  // Step 4: Log and act
  await db.moderationLog.create({
    data: {
      userId: content.userId,
      decision,
      textResult: textResult ? JSON.stringify(textResult) : null,
      imageResult: imageResult ? JSON.stringify(imageResult) : null,
      reasons,
    },
  });

  return { decision, textResult, imageResult, reasons };
}
```

### Example 2: Document Processing Pipeline

Ingest, extract, classify, and store data from uploaded documents.

```typescript
// lib/pipelines/document-processing.ts
import { generateObject, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import sharp from 'sharp';

const DocumentClassification = z.object({
  type: z.enum(['invoice', 'receipt', 'contract', 'letter', 'form', 'other']),
  confidence: z.number().min(0).max(1),
  language: z.string(),
});

const InvoiceExtraction = z.object({
  invoiceNumber: z.string(),
  date: z.string(),
  dueDate: z.string().optional(),
  vendor: z.object({
    name: z.string(),
    address: z.string().optional(),
  }),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number(),
  })),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
});

export async function processDocument(
  file: File
): Promise<{
  classification: z.infer<typeof DocumentClassification>;
  extractedData: any;
  summary: string;
}> {
  // Step 1: Convert to image (if PDF)
  let imageBuffers: Buffer[] = [];

  if (file.type === 'application/pdf') {
    // Use pdf-to-img or similar to render each page
    imageBuffers = await renderPDFToImages(file);
  } else if (file.type.startsWith('image/')) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(buffer)
      .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    imageBuffers = [resized];
  }

  if (imageBuffers.length === 0) {
    throw new Error('Unsupported file type');
  }

  // Step 2: Classify document type (first page only, cheap model)
  const { object: classification } = await generateObject({
    model: openai('gpt-4o-mini'),
    temperature: 0,
    schema: DocumentClassification,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What type of document is this? Classify it.' },
          { type: 'image', image: imageBuffers[0], mimeType: 'image/jpeg' },
        ],
      },
    ],
  });

  // Step 3: Extract data based on document type
  let extractedData: any = null;

  if (classification.type === 'invoice' && classification.confidence > 0.7) {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: InvoiceExtraction,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all invoice data from this document. Be precise with numbers and dates.',
            },
            ...imageBuffers.map((buf) => ({
              type: 'image' as const,
              image: buf,
              mimeType: 'image/jpeg' as const,
            })),
          ],
        },
      ],
    });

    extractedData = object;

    // Validate: line item totals should sum to subtotal
    const lineItemSum = object.lineItems.reduce((sum, item) => sum + item.total, 0);
    if (Math.abs(lineItemSum - object.subtotal) > 0.01) {
      console.warn('Invoice validation: line items do not sum to subtotal');
    }
  }

  // Step 4: Generate summary
  const { text: summary } = await generateText({
    model: openai('gpt-4o-mini'),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Write a one-paragraph summary of this document.' },
          { type: 'image', image: imageBuffers[0], mimeType: 'image/jpeg' },
        ],
      },
    ],
    maxTokens: 200,
  });

  return { classification, extractedData, summary };
}
```

### Example 3: Customer Feedback Analysis Pipeline

Batch-process customer feedback: classify, extract themes, generate insights.

```typescript
// lib/pipelines/feedback-analysis.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { processBatch } from '@/lib/ai/batch';

const FeedbackClassification = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  category: z.enum([
    'product-quality', 'customer-service', 'pricing',
    'usability', 'performance', 'feature-request', 'bug-report', 'other',
  ]),
  urgency: z.enum(['immediate', 'soon', 'normal', 'low']),
  topics: z.array(z.string()).max(5),
  actionable: z.boolean(),
  suggestedAction: z.string().optional(),
});

const InsightsReport = z.object({
  totalProcessed: z.number(),
  sentimentBreakdown: z.object({
    positive: z.number(),
    negative: z.number(),
    neutral: z.number(),
    mixed: z.number(),
  }),
  topThemes: z.array(z.object({
    theme: z.string(),
    count: z.number(),
    sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
    examples: z.array(z.string()).max(3),
  })),
  criticalIssues: z.array(z.object({
    issue: z.string(),
    frequency: z.number(),
    impact: z.enum(['high', 'medium', 'low']),
    suggestedAction: z.string(),
  })),
  recommendations: z.array(z.string()).max(5),
  executiveSummary: z.string().max(500),
});

export async function analyzeFeedbackBatch(
  feedbackItems: Array<{ id: string; text: string; source: string; date: string }>
) {
  // Phase 1: Classify each feedback item
  const classifications = await processBatch({
    items: feedbackItems,
    concurrency: 10,
    retries: 2,
    delayBetweenBatches: 100,
    process: async (item) => {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        temperature: 0,
        schema: FeedbackClassification,
        prompt: `Classify this customer feedback:\n\n"${item.text}"\n\nSource: ${item.source}, Date: ${item.date}`,
      });
      return { ...item, classification: object };
    },
    onProgress: (completed, total, failed) => {
      console.log(`Classification progress: ${completed}/${total} (${failed} failed)`);
    },
  });

  const classified = classifications.results
    .filter((r) => r.output)
    .map((r) => r.output!);

  // Phase 2: Generate insights report
  const { object: report } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: InsightsReport,
    prompt: `Analyze these classified customer feedback items and generate an insights report.

CLASSIFIED FEEDBACK:
${JSON.stringify(
  classified.map((c) => ({
    text: c.text.slice(0, 200),
    sentiment: c.classification.sentiment,
    category: c.classification.category,
    topics: c.classification.topics,
    urgency: c.classification.urgency,
  })),
  null,
  2
)}

Generate:
- Sentiment breakdown (percentages)
- Top recurring themes with examples
- Critical issues requiring immediate attention
- Actionable recommendations
- Executive summary`,
  });

  return {
    batchResult: {
      total: classifications.total,
      succeeded: classifications.succeeded,
      failed: classifications.failed,
    },
    report,
  };
}
```

### Example 4: Data Enrichment Workflow

Enrich CRM leads with AI-extracted company information.

```typescript
// lib/pipelines/lead-enrichment.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { processBatch } from '@/lib/ai/batch';

const CompanyProfile = z.object({
  companyName: z.string(),
  industry: z.string(),
  companySize: z.enum(['startup', 'small', 'medium', 'enterprise', 'unknown']),
  technologies: z.array(z.string()).max(10).describe('Technologies they likely use'),
  painPoints: z.array(z.string()).max(5).describe('Likely business challenges'),
  icp: z.boolean().describe('Does this match our ideal customer profile?'),
  score: z.number().min(0).max(100).describe('Lead quality score'),
  personalizedPitch: z.string().max(300).describe('One-paragraph pitch tailored to this lead'),
});

interface Lead {
  id: string;
  email: string;
  name: string;
  company?: string;
  website?: string;
  signupSource?: string;
}

export async function enrichLeads(leads: Lead[]) {
  return processBatch({
    items: leads,
    concurrency: 5,
    retries: 1,
    delayBetweenBatches: 300,
    process: async (lead) => {
      // Gather context
      let websiteContent = '';
      if (lead.website) {
        try {
          const res = await fetch(lead.website, { signal: AbortSignal.timeout(5000) });
          websiteContent = (await res.text()).slice(0, 3000);
        } catch {
          // Website fetch failed — proceed with available data
        }
      }

      const { object: profile } = await generateObject({
        model: openai('gpt-4o-mini'),
        temperature: 0,
        schema: CompanyProfile,
        prompt: `Analyze this lead and generate a company profile for our sales team.

LEAD INFO:
- Name: ${lead.name}
- Email: ${lead.email}
- Company: ${lead.company || 'Unknown'}
- Website: ${lead.website || 'N/A'}
- Signup source: ${lead.signupSource || 'Unknown'}

${websiteContent ? `WEBSITE CONTENT:\n${websiteContent}` : ''}

OUR PRODUCT: A developer tools SaaS for building AI-powered applications.
ICP: B2B SaaS companies with 10-500 employees, using modern tech stacks (React, Node.js, TypeScript).

Score from 0-100 based on ICP match.`,
      });

      // Update lead in database
      await db.lead.update({
        where: { id: lead.id },
        data: {
          enrichedAt: new Date(),
          industry: profile.industry,
          companySize: profile.companySize,
          leadScore: profile.score,
          icpMatch: profile.icp,
          enrichmentData: JSON.stringify(profile),
        },
      });

      return profile;
    },
    onProgress: (completed, total, failed) => {
      console.log(`Enrichment: ${completed}/${total} (${failed} failed)`);
    },
  });
}
```

### Example 5: Multi-Step Content Generation Pipeline

Generate, edit, and optimize content through a series of AI steps.

```typescript
// lib/pipelines/content-generation.ts
import { generateText, generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const ContentBrief = z.object({
  title: z.string(),
  outline: z.array(z.object({
    heading: z.string(),
    keyPoints: z.array(z.string()),
    wordCount: z.number(),
  })),
  targetKeywords: z.array(z.string()),
  tone: z.string(),
  targetWordCount: z.number(),
});

const QualityCheck = z.object({
  overallScore: z.number().min(1).max(10),
  issues: z.array(z.object({
    type: z.enum(['grammar', 'clarity', 'accuracy', 'seo', 'tone', 'structure']),
    description: z.string(),
    location: z.string(),
    suggestion: z.string(),
  })),
  passesThreshold: z.boolean(),
});

export async function generateArticle(
  topic: string,
  style: string = 'informative',
  targetWords: number = 1500
) {
  console.log('Step 1: Creating content brief...');

  // Step 1: Create brief (cheap model)
  const { object: brief } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: ContentBrief,
    prompt: `Create a content brief for a blog article.
Topic: "${topic}"
Style: ${style}
Target word count: ${targetWords}
Include SEO-friendly target keywords.`,
  });

  console.log('Step 2: Writing first draft...');

  // Step 2: Write first draft (capable model)
  const { text: firstDraft } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt: `Write a blog article based on this brief:

TITLE: ${brief.title}
TONE: ${brief.tone}
TARGET KEYWORDS: ${brief.targetKeywords.join(', ')}

OUTLINE:
${brief.outline.map((s) => `## ${s.heading}\n${s.keyPoints.map((p) => `- ${p}`).join('\n')}\n(~${s.wordCount} words)`).join('\n\n')}

Write engaging, well-researched content. Include practical examples.
Target: ${brief.targetWordCount} words.`,
    maxTokens: 4000,
  });

  console.log('Step 3: Quality check...');

  // Step 3: Quality check (judge model)
  const { object: quality } = await generateObject({
    model: openai('gpt-4o'),
    temperature: 0,
    schema: QualityCheck,
    prompt: `Review this article draft for quality.

ARTICLE:
${firstDraft}

REQUIREMENTS:
- Target keywords: ${brief.targetKeywords.join(', ')}
- Tone: ${brief.tone}
- Target word count: ${brief.targetWordCount}

Rate from 1-10. Flag specific issues. Pass threshold = score >= 7.`,
  });

  // Step 4: Revise if below threshold
  let finalContent = firstDraft;

  if (!quality.passesThreshold && quality.issues.length > 0) {
    console.log('Step 4: Revising based on feedback...');

    const { text: revised } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: `Revise this article based on the editor's feedback.

ORIGINAL ARTICLE:
${firstDraft}

EDITOR FEEDBACK:
${quality.issues.map((i) => `- [${i.type}] ${i.description} → ${i.suggestion}`).join('\n')}

Incorporate all feedback while maintaining the article's voice and flow.`,
      maxTokens: 4000,
    });

    finalContent = revised;
  }

  console.log('Step 5: SEO optimization...');

  // Step 5: SEO metadata (cheap model)
  const SEOMetadata = z.object({
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(160),
    slug: z.string(),
    excerpt: z.string().max(300),
    tags: z.array(z.string()).max(8),
  });

  const { object: seo } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: SEOMetadata,
    prompt: `Generate SEO metadata for this article:

TITLE: ${brief.title}
KEYWORDS: ${brief.targetKeywords.join(', ')}
FIRST PARAGRAPH: ${finalContent.slice(0, 500)}`,
  });

  return {
    title: brief.title,
    content: finalContent,
    brief,
    qualityScore: quality.overallScore,
    qualityIssues: quality.issues,
    seo,
    wordCount: finalContent.split(/\s+/).length,
  };
}
```

---

## Common Mistakes

### 1. Using Agents When Workflows Suffice

**Wrong:** Building an autonomous agent to process support tickets when the pipeline is always: classify → route → draft → send.

**Fix:** If the steps are known in advance, use a deterministic workflow. Agents are for tasks where the path is unknown. Workflows are cheaper, more predictable, and easier to debug.

### 2. No Error Handling Per Step

**Wrong:** A five-step pipeline where a failure in step 3 crashes the entire job with no recovery.

**Fix:** Handle errors at each step. Categorize errors (retryable vs fatal). Retry rate limits and provider errors. Skip or use fallbacks for content policy violations. Log failures with context for debugging. Return partial results instead of nothing.

### 3. Sequential Processing When Parallel Is Possible

**Wrong:** Processing 1000 items one at a time when they have no dependencies.

**Fix:** Use batch processing with concurrency (5-10 parallel). Independent items should be processed in parallel. Only serialize when steps depend on each other. Add rate limiting delays to stay within API limits.

### 4. No Progress Tracking

**Wrong:** Starting a 2-hour batch job with no way to see how far it has progressed or if it is stuck.

**Fix:** Report progress (completed/total/failed) at regular intervals. Store intermediate results so work is not lost on failure. Provide a way to cancel long-running jobs. Send notifications on completion or failure.

### 5. Same Model for Every Step

**Wrong:** Using Claude Sonnet 4 ($3/1M input) for a classification step that GPT-4o-mini ($0.15/1M input) handles equally well.

**Fix:** Use cheap, fast models for: classification, routing, metadata extraction, simple formatting. Use capable models for: generation, complex reasoning, nuanced analysis. A five-step pipeline can easily be 10x cheaper with appropriate model routing.

### 6. No Cost Limits on Batch Jobs

**Wrong:** Starting a batch job that processes 50,000 items with no spending cap. A misconfigured prompt causes each item to use 10x expected tokens.

**Fix:** Set a total budget for the batch. Track cumulative cost as items are processed. Abort when the budget threshold is reached (e.g., 150% of expected cost). Alert operators on cost anomalies. Always calculate expected cost before starting a batch.

### 7. Ignoring Idempotency

**Wrong:** A pipeline that processes the same document twice when retried, creating duplicate records.

**Fix:** Make pipeline steps idempotent. Use upsert instead of insert. Check if an item has already been processed before running it again. Store processing state (pending, processing, completed, failed) for each item.

### 8. No Validation Between Steps

**Wrong:** Passing unvalidated output from step 1 directly into step 2. Step 1 returns garbage, step 2 amplifies it.

**Fix:** Validate outputs between steps. Use Zod schemas at every boundary. Check for empty results, null values, and unexpected formats. Fail fast on invalid intermediate data rather than propagating errors through the pipeline.

### 9. Monolithic Pipeline Functions

**Wrong:** A single 500-line function that does ingestion, classification, extraction, generation, and storage.

**Fix:** Break pipelines into composable, testable steps. Each step should be a separate function with clear types. This makes it easy to: test steps independently, swap implementations, add or remove steps, and reuse steps across pipelines.

### 10. No Logging or Audit Trail

**Wrong:** AI pipeline processes thousands of items with no record of what happened to each one.

**Fix:** Log every pipeline run: input, steps executed, per-step timing, outputs, errors, cost. Store logs queryable by job ID, item ID, and timestamp. This is essential for debugging, compliance, and cost analysis.

---

> **See also:** [LLM-Patterns](../LLM-Patterns/llm-patterns.md) | [AI-Agents](../AI-Agents/ai-agents.md) | [AI-Observability](../AI-Observability/ai-observability.md) | [Multimodal-AI](../Multimodal-AI/multimodal-ai.md) | [Backend/Background-Jobs](../../Backend/Background-Jobs/background-jobs.md) | [Backend/Error-Handling-Logging](../../Backend/Error-Handling-Logging/error-handling-logging.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
