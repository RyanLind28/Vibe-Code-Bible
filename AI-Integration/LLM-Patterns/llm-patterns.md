# LLM Patterns

> API integration with OpenAI, Anthropic, and Google, streaming responses, structured outputs, tool calling, multi-modal inputs, token management, rate limiting, fallback providers, and cost tracking — everything you need to ship AI features in production.

---

## Principles

### 1. Vercel AI SDK as the Unified Interface

Do not call LLM provider APIs directly. The Vercel AI SDK (`ai` package) provides a single, provider-agnostic interface for every major LLM. Swap models by changing one string. No rewriting fetch calls, no handling different response formats, no provider-specific streaming logic.

The SDK has three layers:

- **AI SDK Core** (`ai`) — server-side functions: `generateText`, `streamText`, `generateObject`, `streamObject`, `embed`, `embedMany`
- **AI SDK UI** (`ai/react`) — client hooks: `useChat`, `useCompletion`, `useObject`, `useAssistant`
- **AI SDK Providers** (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) — model adapters

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

```typescript
// lib/ai/models.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Switch models by changing one line
export const defaultModel = anthropic('claude-sonnet-4-20250514');
export const fastModel = openai('gpt-4o-mini');
export const longContextModel = google('gemini-2.0-flash');
```

Provider API keys go in environment variables. The SDK reads them automatically:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AI...
```

Never import a provider SDK (`openai`, `@anthropic-ai/sdk`) directly when building Next.js features. The AI SDK wraps them with streaming, structured output, tool calling, and abort handling that you would otherwise have to build yourself.

### 2. Streaming Text Responses

Streaming is the default for any user-facing AI response. Users see tokens arrive in real-time instead of waiting 5-30 seconds for a complete response. Time to first token is the metric that matters.

Server side — `streamText` returns a streamable response:

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: 'You are a helpful assistant.',
    messages,
  });

  return result.toDataStreamResponse();
}
```

Client side — `useChat` handles the stream, message state, and input:

```typescript
// components/chat.tsx
'use client';

import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

`toDataStreamResponse()` returns a `Response` object that Next.js Route Handlers accept directly. The data stream protocol encodes text chunks, tool calls, and metadata in a single stream. Do not use `toTextStreamResponse()` unless you only need raw text and no metadata.

For non-chat streaming (e.g., article generation), use `useCompletion` on the client:

```typescript
const { completion, input, handleInputChange, handleSubmit } = useCompletion({
  api: '/api/generate',
});
```

### 3. Structured Outputs with Zod

When you need data, not prose, use `generateObject` or `streamObject`. These force the LLM to return JSON that matches a Zod schema. The SDK validates the response and retries automatically on schema violations.

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
    topics: z.array(z.string()).max(5),
    summary: z.string().max(200),
  }),
  prompt: `Analyze this review: "${reviewText}"`,
});

// object is fully typed: { sentiment: 'positive', confidence: 0.92, topics: [...], summary: '...' }
```

For streaming structured outputs (large objects built incrementally):

```typescript
import { streamObject } from 'ai';

const result = streamObject({
  model: openai('gpt-4o'),
  schema: recipeSchema,
  prompt: 'Create a pasta recipe',
});

for await (const partialObject of result.partialObjectStream) {
  // partialObject grows as tokens arrive — render progressively
  console.log(partialObject);
}
```

Use `generateObject` when you need the complete object before acting (database writes, API calls). Use `streamObject` when you want to show partial results in the UI as they build up. Use `output: 'array'` for generating lists. Use `output: 'enum'` for classification tasks.

### 4. Tool Calling and Function Execution

Tool calling lets the LLM invoke your code mid-conversation. The model decides when to call a tool, you execute it, and the result goes back to the model for the next response. This is how you give LLMs access to databases, APIs, and real-time data.

```typescript
import { streamText, tool } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  messages,
  tools: {
    getWeather: tool({
      description: 'Get current weather for a location',
      parameters: z.object({
        city: z.string().describe('City name'),
        units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
      }),
      execute: async ({ city, units }) => {
        const data = await fetchWeather(city, units);
        return { temperature: data.temp, condition: data.condition };
      },
    }),
    searchProducts: tool({
      description: 'Search the product catalog',
      parameters: z.object({
        query: z.string(),
        maxResults: z.number().default(5),
      }),
      execute: async ({ query, maxResults }) => {
        return await db.product.findMany({
          where: { name: { contains: query, mode: 'insensitive' } },
          take: maxResults,
        });
      },
    }),
  },
  maxSteps: 5, // Allow up to 5 tool call rounds
});
```

**Key settings:**

- `maxSteps` controls how many tool-call-then-respond rounds the model can do. Set it to 1 for single-tool use, 3-5 for multi-step reasoning.
- Tool `description` is critical — this is what the model reads to decide whether to call the tool. Be specific: "Search products by name in the catalog and return price, stock, and description" beats "Search products."
- Tool `parameters` are validated with Zod before `execute` runs. Invalid tool calls fail with a clear error.

The model can call multiple tools in a single step (parallel tool calling). The SDK handles this automatically.

### 5. Multi-Modal Inputs

Modern LLMs accept images, audio, PDFs, and files alongside text. The AI SDK handles encoding and formatting for each provider.

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Image from URL
const { text } = await generateText({
  model: openai('gpt-4o'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this image in detail.' },
        { type: 'image', image: new URL('https://example.com/photo.jpg') },
      ],
    },
  ],
});

// Image from file upload (Buffer)
const imageBuffer = await file.arrayBuffer();
const { text: description } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What product is shown? Extract the price.' },
        { type: 'image', image: Buffer.from(imageBuffer), mimeType: 'image/jpeg' },
      ],
    },
  ],
});
```

Use multi-modal for: receipt scanning, product image analysis, diagram-to-code, screenshot-to-description, document OCR. Check provider documentation for supported file types and size limits — they vary.

### 6. Token Management and Context Windows

Every LLM has a context window (input + output tokens). Exceeding it causes errors or silent truncation. Track token usage to avoid surprises and control costs.

**Context window sizes (as of early 2026):**

| Model | Context Window | Max Output |
|-------|---------------|------------|
| Claude Sonnet 4 | 200K tokens | 16K tokens |
| GPT-4o | 128K tokens | 16K tokens |
| Gemini 2.0 Flash | 1M tokens | 8K tokens |

**Token counting and management:**

```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Summarize this article...',
  maxTokens: 1000, // Limit output length
});

// Access token usage from the result
console.log(result.usage);
// { promptTokens: 2450, completionTokens: 487, totalTokens: 2937 }
```

**Strategies for staying within limits:**

1. **Truncate history** — keep the system prompt + last N messages + current user message. Summarize old messages instead of sending the full history.
2. **Summarize on overflow** — when conversation history approaches the limit, use a fast model to summarize older messages into a single "Previously discussed:" block.
3. **Chunk large inputs** — for documents over 50K tokens, process in chunks with map-reduce. Summarize each chunk, then synthesize.
4. **Set `maxTokens`** — always set a maximum output length to prevent runaway generation.

```typescript
// Conversation history management
function trimMessages(
  messages: Message[],
  systemPrompt: string,
  maxTokens: number = 100000
): Message[] {
  const systemTokens = estimateTokens(systemPrompt);
  let totalTokens = systemTokens;
  const trimmed: Message[] = [];

  // Always keep the latest message
  // Work backwards through history
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (totalTokens + msgTokens > maxTokens) break;
    totalTokens += msgTokens;
    trimmed.unshift(messages[i]);
  }

  return trimmed;
}

// Rough estimate: 1 token ≈ 4 characters for English
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

### 7. Rate Limiting and Error Handling

LLM APIs fail. Rate limits hit. Models go down. Tokens run out. Build for it.

**Common errors:**

| Error | Cause | Action |
|-------|-------|--------|
| 429 Too Many Requests | Rate limit exceeded | Retry with exponential backoff |
| 500/503 Server Error | Provider outage | Retry or fall back to another provider |
| 400 Bad Request | Token limit exceeded, invalid input | Reduce input, fix request |
| 401 Unauthorized | Bad API key | Check environment variables |

**Rate limit your AI endpoints:**

```typescript
// middleware.ts — or use a dedicated rate limiting library
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
});

export async function rateLimit(userId: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(userId);

  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  }

  return null;
}
```

**Retry with backoff:**

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable =
        error?.statusCode === 429 ||
        error?.statusCode === 500 ||
        error?.statusCode === 503;

      if (!isRetryable || attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unreachable');
}
```

### 8. Fallback Providers and Model Routing

Never depend on a single LLM provider. Build a routing layer that falls back to alternative providers when the primary fails.

```typescript
// lib/ai/router.ts
import { LanguageModelV1 } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

interface ModelConfig {
  model: LanguageModelV1;
  costPer1kInput: number;
  costPer1kOutput: number;
}

const models: Record<string, ModelConfig[]> = {
  // Primary → Fallback 1 → Fallback 2
  default: [
    { model: anthropic('claude-sonnet-4-20250514'), costPer1kInput: 0.003, costPer1kOutput: 0.015 },
    { model: openai('gpt-4o'), costPer1kInput: 0.0025, costPer1kOutput: 0.01 },
    { model: google('gemini-2.0-flash'), costPer1kInput: 0.0001, costPer1kOutput: 0.0004 },
  ],
  fast: [
    { model: openai('gpt-4o-mini'), costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
    { model: google('gemini-2.0-flash'), costPer1kInput: 0.0001, costPer1kOutput: 0.0004 },
  ],
};

export async function getModel(
  tier: string = 'default'
): Promise<{ model: LanguageModelV1; config: ModelConfig }> {
  const candidates = models[tier] || models.default;

  for (const config of candidates) {
    try {
      // Health check — try a minimal request
      return { model: config.model, config };
    } catch {
      continue; // Try next provider
    }
  }

  throw new Error('All model providers unavailable');
}
```

Route different tasks to different models based on complexity and cost:

- **Classification, extraction, simple Q&A** → `gpt-4o-mini` or `gemini-2.0-flash` (cheap, fast)
- **Complex reasoning, creative writing** → `claude-sonnet-4` or `gpt-4o` (capable, moderate cost)
- **Long context processing** → `gemini-2.0-flash` (1M tokens)
- **Code generation** → `claude-sonnet-4` (strong at code)

---

## LLM Instructions

```
AI SDK SETUP AND INTEGRATION INSTRUCTIONS

1. INSTALL AND CONFIGURE:
   - Install `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`
   - Set API keys in .env.local: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY
   - Create lib/ai/models.ts that exports model instances for each provider
   - Never import raw provider SDKs — use AI SDK wrappers exclusively

2. IMPLEMENT STREAMING CHAT:
   - Create POST route handler at app/api/chat/route.ts
   - Use streamText() with the model, system prompt, and messages
   - Return result.toDataStreamResponse()
   - On the client, use useChat() hook from ai/react
   - Always show loading state via isLoading
   - Implement stop functionality with the stop() method from useChat

3. EXTRACT STRUCTURED DATA:
   - Define a Zod schema for the exact output shape you need
   - Use generateObject() for complete objects, streamObject() for progressive rendering
   - Set output: 'array' for lists, output: 'enum' for classification
   - Always handle schema validation errors — the SDK retries automatically
   - Use .describe() on Zod fields to guide the model

4. ADD TOOL CALLING:
   - Define tools using the tool() helper with description, parameters (Zod), and execute function
   - Set maxSteps (3-5 for most use cases) to allow multi-step tool use
   - Write detailed tool descriptions — the model reads them to decide when to call
   - Validate and sanitize all tool inputs even though Zod validates the schema
   - Handle tool execution errors gracefully — return error objects instead of throwing

5. IMPLEMENT PROVIDER FALLBACK:
   - Create a model router in lib/ai/router.ts with primary and fallback providers
   - Wrap every LLM call in retry logic with exponential backoff
   - Log provider failures and track which fallbacks are being used
   - Rate limit AI endpoints with per-user limits (Upstash Ratelimit recommended)
   - Track token usage and cost per request for monitoring
```

---

## Examples

### Example 1: Streaming Chat with `useChat`

A complete streaming chat implementation with system prompt, message history, and error handling.

```typescript
// app/api/chat/route.ts
import { streamText, type Message } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { rateLimit } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const rateLimitResponse = await rateLimit(session.user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const { messages }: { messages: Message[] } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a helpful customer support agent for Acme Inc.
You answer questions about our products and policies.
If you don't know something, say so — never make up information.
Keep responses concise and actionable.`,
    messages,
    maxTokens: 2000,
    onFinish: async ({ usage }) => {
      // Log usage for cost tracking
      await db.aiLog.create({
        data: {
          userId: session.user.id,
          model: 'claude-sonnet-4',
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          endpoint: '/api/chat',
        },
      });
    },
  });

  return result.toDataStreamResponse();
}
```

```typescript
// components/chat.tsx
'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';

export function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error,
    reload,
  } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">
          Something went wrong.{' '}
          <button onClick={() => reload()} className="underline">
            Try again
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-4 py-2"
          disabled={isLoading}
        />
        {isLoading ? (
          <button type="button" onClick={stop} className="px-4 py-2 rounded-lg bg-red-600 text-white">
            Stop
          </button>
        ) : (
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">
            Send
          </button>
        )}
      </form>
    </div>
  );
}
```

### Example 2: Structured Data Extraction

Extract structured data from unstructured text — product reviews, support tickets, invoices.

```typescript
// app/api/analyze/route.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const ReviewAnalysis = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).describe(
    'Overall sentiment of the review'
  ),
  confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
  topics: z
    .array(
      z.object({
        name: z.string().describe('Topic discussed'),
        sentiment: z.enum(['positive', 'negative', 'neutral']),
      })
    )
    .max(5)
    .describe('Main topics with individual sentiment'),
  summary: z.string().max(200).describe('One-sentence summary'),
  actionItems: z
    .array(z.string())
    .max(3)
    .describe('Actionable feedback for the product team'),
  isSpam: z.boolean().describe('Whether this appears to be a spam review'),
});

export type ReviewAnalysisType = z.infer<typeof ReviewAnalysis>;

export async function POST(req: Request) {
  const { reviewText } = await req.json();

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'), // Cheap model is fine for extraction
    schema: ReviewAnalysis,
    prompt: `Analyze this product review:\n\n"${reviewText}"`,
  });

  return Response.json(object);
}
```

```typescript
// Using streamObject for progressive UI rendering
// app/api/analyze-stream/route.ts
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { reviewText } = await req.json();

  const result = streamObject({
    model: openai('gpt-4o-mini'),
    schema: ReviewAnalysis,
    prompt: `Analyze this product review:\n\n"${reviewText}"`,
  });

  return result.toTextStreamResponse();
}
```

```typescript
// Client-side progressive rendering
'use client';

import { useObject } from 'ai/react';
import { ReviewAnalysis } from '@/lib/schemas';

export function ReviewAnalyzer() {
  const { object, submit, isLoading } = useObject({
    api: '/api/analyze-stream',
    schema: ReviewAnalysis,
  });

  return (
    <div>
      <button onClick={() => submit({ reviewText: '...' })}>Analyze</button>

      {/* Fields appear as they're generated */}
      {object?.sentiment && <p>Sentiment: {object.sentiment}</p>}
      {object?.confidence && <p>Confidence: {(object.confidence * 100).toFixed(0)}%</p>}
      {object?.topics?.map((topic, i) => (
        <span key={i}>{topic?.name} ({topic?.sentiment})</span>
      ))}
      {object?.summary && <p>{object.summary}</p>}
    </div>
  );
}
```

### Example 3: Multi-Tool AI Assistant

An AI assistant with access to database queries, web search, and calculations.

```typescript
// app/api/assistant/route.ts
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { db } from '@/lib/db';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are an internal business assistant for Acme Inc.
You have access to tools for querying orders, looking up customers, and performing calculations.
Always verify data before making claims. Show your reasoning.`,
    messages,
    tools: {
      lookupCustomer: tool({
        description:
          'Look up a customer by email or name. Returns customer profile with order history summary.',
        parameters: z.object({
          email: z.string().email().optional(),
          name: z.string().optional(),
        }),
        execute: async ({ email, name }) => {
          const customer = await db.customer.findFirst({
            where: email ? { email } : { name: { contains: name, mode: 'insensitive' } },
            include: {
              orders: { orderBy: { createdAt: 'desc' }, take: 5 },
              _count: { select: { orders: true } },
            },
          });
          if (!customer) return { error: 'Customer not found' };
          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            totalOrders: customer._count.orders,
            recentOrders: customer.orders.map((o) => ({
              id: o.id,
              total: o.total,
              status: o.status,
              date: o.createdAt.toISOString(),
            })),
          };
        },
      }),

      queryOrders: tool({
        description:
          'Query orders with filters. Use for aggregate questions like "how many orders this month" or "orders over $100".',
        parameters: z.object({
          status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']).optional(),
          minTotal: z.number().optional(),
          maxTotal: z.number().optional(),
          startDate: z.string().optional().describe('ISO date string'),
          endDate: z.string().optional().describe('ISO date string'),
          limit: z.number().default(10).describe('Max results to return'),
        }),
        execute: async ({ status, minTotal, maxTotal, startDate, endDate, limit }) => {
          const orders = await db.order.findMany({
            where: {
              ...(status && { status }),
              ...(minTotal && { total: { gte: minTotal } }),
              ...(maxTotal && { total: { lte: maxTotal } }),
              ...(startDate && { createdAt: { gte: new Date(startDate) } }),
              ...(endDate && { createdAt: { lte: new Date(endDate) } }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { customer: { select: { name: true, email: true } } },
          });

          return {
            count: orders.length,
            orders: orders.map((o) => ({
              id: o.id,
              customer: o.customer.name,
              total: o.total,
              status: o.status,
              date: o.createdAt.toISOString(),
            })),
          };
        },
      }),

      calculate: tool({
        description: 'Perform mathematical calculations. Use for revenue totals, averages, percentages.',
        parameters: z.object({
          expression: z.string().describe('Math expression to evaluate, e.g., "150 * 12 + 200"'),
        }),
        execute: async ({ expression }) => {
          // Safe math evaluation — no eval()
          const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
          try {
            const result = Function(`"use strict"; return (${sanitized})`)();
            return { expression: sanitized, result: Number(result) };
          } catch {
            return { error: 'Invalid expression' };
          }
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

### Example 4: Provider Fallback with Cost Tracking

A production-ready model router that tracks costs and falls back between providers.

```typescript
// lib/ai/provider.ts
import { generateText, streamText, LanguageModelV1 } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

interface ProviderConfig {
  id: string;
  model: LanguageModelV1;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

const providers: Record<string, ProviderConfig[]> = {
  default: [
    {
      id: 'anthropic/claude-sonnet-4',
      model: anthropic('claude-sonnet-4-20250514'),
      inputCostPer1M: 3,
      outputCostPer1M: 15,
    },
    {
      id: 'openai/gpt-4o',
      model: openai('gpt-4o'),
      inputCostPer1M: 2.5,
      outputCostPer1M: 10,
    },
    {
      id: 'google/gemini-2.0-flash',
      model: google('gemini-2.0-flash'),
      inputCostPer1M: 0.1,
      outputCostPer1M: 0.4,
    },
  ],
  fast: [
    {
      id: 'openai/gpt-4o-mini',
      model: openai('gpt-4o-mini'),
      inputCostPer1M: 0.15,
      outputCostPer1M: 0.6,
    },
    {
      id: 'google/gemini-2.0-flash',
      model: google('gemini-2.0-flash'),
      inputCostPer1M: 0.1,
      outputCostPer1M: 0.4,
    },
  ],
};

interface CostRecord {
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

export async function generateWithFallback(
  options: Omit<Parameters<typeof generateText>[0], 'model'> & {
    tier?: string;
    onCost?: (record: CostRecord) => void;
  }
) {
  const { tier = 'default', onCost, ...generateOptions } = options;
  const candidates = providers[tier] || providers.default;

  for (let i = 0; i < candidates.length; i++) {
    const provider = candidates[i];
    try {
      const result = await generateText({
        ...generateOptions,
        model: provider.model,
      });

      // Calculate and report cost
      const cost =
        (result.usage.promptTokens / 1_000_000) * provider.inputCostPer1M +
        (result.usage.completionTokens / 1_000_000) * provider.outputCostPer1M;

      onCost?.({
        providerId: provider.id,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        cost,
        timestamp: new Date(),
      });

      return { ...result, providerId: provider.id, cost };
    } catch (error) {
      console.error(`Provider ${provider.id} failed:`, error);
      if (i === candidates.length - 1) throw error;
      // Continue to next provider
    }
  }

  throw new Error('All providers failed');
}

// Usage
const result = await generateWithFallback({
  tier: 'default',
  system: 'You are a helpful assistant.',
  prompt: 'Explain quantum computing in simple terms.',
  onCost: async (record) => {
    await db.aiCost.create({ data: record });
  },
});
```

### Example 5: Image Analysis Endpoint

Process uploaded images with vision models — extract text, describe content, analyze products.

```typescript
// app/api/analyze-image/route.ts
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const ImageAnalysis = z.object({
  description: z.string().describe('Detailed description of the image'),
  objects: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  text: z.array(z.string()).describe('Any text visible in the image'),
  colors: z.array(z.string()).max(5).describe('Dominant colors'),
  category: z.enum([
    'product',
    'document',
    'screenshot',
    'photo',
    'diagram',
    'other',
  ]),
  nsfw: z.boolean().describe('Whether image contains inappropriate content'),
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('image') as File;

  if (!file) {
    return Response.json({ error: 'No image provided' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: ImageAnalysis,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this image. Extract all visible text, identify objects, and categorize it.',
          },
          {
            type: 'image',
            image: Buffer.from(bytes),
            mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
          },
        ],
      },
    ],
  });

  if (object.nsfw) {
    return Response.json(
      { error: 'Image flagged as inappropriate' },
      { status: 422 }
    );
  }

  return Response.json(object);
}
```

---

## Common Mistakes

### 1. Not Streaming Responses

**Wrong:**

```typescript
const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: userMessage,
});

return Response.json({ response: text });
```

**Fix:** Use `streamText` + `toDataStreamResponse()` for any user-facing response. The user sees tokens arrive immediately instead of staring at a spinner for 10 seconds. Reserve `generateText` for background processing where no one is waiting.

### 2. Ignoring Token Limits

**Wrong:**

```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  messages: allMessagesFromDatabase, // Could be thousands of messages
});
```

**Fix:** Trim conversation history to fit within the context window. Keep the system prompt, the most recent N messages, and optionally a summary of older messages. Always set `maxTokens` on the output.

### 3. No Error Handling on AI Calls

**Wrong:**

```typescript
export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({ model: openai('gpt-4o'), messages });
  return result.toDataStreamResponse(); // If OpenAI is down, this crashes
}
```

**Fix:** Wrap AI calls in try/catch. Return user-friendly error messages. Implement retry logic for transient failures (429, 500, 503). Fall back to alternative providers when the primary is down.

### 4. Hardcoding a Single Provider

**Wrong:**

```typescript
import OpenAI from 'openai';
const openai = new OpenAI();
// Entire app breaks when OpenAI has an outage
```

**Fix:** Use the AI SDK's provider abstraction. Define fallback chains. If you are calling a provider SDK directly, you are doing it wrong — the AI SDK wraps every major provider with a unified interface.

### 5. Not Validating LLM Output

**Wrong:**

```typescript
const { text } = await generateText({ model, prompt: 'Return a JSON object...' });
const data = JSON.parse(text); // Crashes on malformed JSON
```

**Fix:** Use `generateObject` with a Zod schema. The SDK validates and retries automatically. If you must parse free text, wrap it in try/catch and handle failures. Never trust raw LLM text output as structured data.

### 6. Exposing API Keys to the Client

**Wrong:**

```typescript
// components/chat.tsx — CLIENT COMPONENT
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}` },
});
```

**Fix:** All LLM calls go through your server (Route Handlers or Server Actions). The client talks to your API, which talks to the LLM. API keys never appear in client bundles. The `useChat` hook handles this correctly by calling your `/api/chat` endpoint.

### 7. No Rate Limiting on AI Endpoints

**Wrong:** Any authenticated user can hit `/api/chat` unlimited times, running up your API bill.

**Fix:** Rate limit per user with Upstash Ratelimit or similar. Set reasonable limits (20-50 requests/minute for chat). Implement usage quotas for free-tier users. Alert on spending thresholds.

### 8. Blocking Tool Execution

**Wrong:**

```typescript
tools: {
  fetchData: tool({
    execute: async ({ url }) => {
      const res = await fetch(url); // No timeout — hangs forever
      return await res.json();
    },
  }),
}
```

**Fix:** Set timeouts on all tool executions. Use `AbortController` for fetch calls. Return error objects on timeout instead of throwing. Set reasonable `maxSteps` to prevent infinite tool loops.

### 9. No Cost Tracking

**Wrong:** Deploying AI features without knowing what they cost per user, per request, or per day.

**Fix:** Log `usage.promptTokens` and `usage.completionTokens` from every AI call. Calculate cost using provider pricing. Set alerts for daily/monthly spend thresholds. Display cost data in your admin dashboard.

### 10. Sending Unnecessary Context

**Wrong:**

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  system: entireApplicationCodebase, // 500K tokens of irrelevant context
  prompt: 'What is 2 + 2?',
});
```

**Fix:** Send only relevant context. For chat, trim old messages. For RAG, retrieve only the most relevant chunks. For tool results, summarize large responses before feeding them back to the model. More context is not better — it is slower, more expensive, and often degrades output quality.

---

> **See also:** [Prompt-Engineering](../Prompt-Engineering/prompt-engineering.md) | [RAG](../RAG/rag.md) | [AI-Agents](../AI-Agents/ai-agents.md) | [Backend/Real-Time](../../Backend/Real-Time/real-time.md) | [Backend/Error-Handling-Logging](../../Backend/Error-Handling-Logging/error-handling-logging.md) | [Security/API-Security](../../Security/API-Security/api-security.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
