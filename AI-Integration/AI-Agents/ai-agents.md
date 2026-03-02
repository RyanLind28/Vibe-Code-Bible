# AI Agents

> ReAct agent loops, tool calling architecture, multi-step reasoning, planning patterns, multi-agent systems, human-in-the-loop, memory management, and cost control — building autonomous AI systems that act, not just answer.

---

## Principles

### 1. What Makes an Agent an Agent

An agent is an LLM that can take actions, observe results, and decide what to do next. A chatbot answers questions. An agent completes tasks.

The difference:

- **Chat** — User asks → LLM responds → done
- **Agent** — User defines goal → LLM reasons → calls tool → observes result → reasons again → calls another tool → ... → delivers result

Agents use **tool calling** to interact with the world (databases, APIs, file systems) and **loops** to chain multiple steps together. The LLM decides when to use tools, which tools to use, and when the task is complete.

**When to use an agent:**

- Tasks requiring multiple steps that depend on each other
- Tasks where the path is not known in advance (research, investigation)
- Workflows that combine information from multiple sources
- Tasks requiring judgment calls between steps

**When NOT to use an agent:**

- Single-step operations (extraction, classification, translation)
- Tasks with a fixed, known pipeline (use regular code)
- Simple Q&A (use RAG or direct generation)
- Tasks where determinism is required (agents are inherently non-deterministic)

### 2. The ReAct Loop

ReAct (Reason + Act) is the foundational agent pattern. The LLM alternates between reasoning about what to do and taking action via tools.

```
Loop:
  1. THINK  — "I need to find the customer's order status"
  2. ACT    — Call lookupOrder(orderId: "ORD-123")
  3. OBSERVE — Order is "shipped", tracking: "1Z999..."
  4. THINK  — "Now I need to get the delivery estimate"
  5. ACT    — Call getTracking(trackingNumber: "1Z999...")
  6. OBSERVE — Estimated delivery: March 5
  7. THINK  — "I have all the info. I can answer now."
  8. RESPOND — "Your order ORD-123 has shipped and is estimated to arrive March 5."
```

With the Vercel AI SDK, the ReAct loop is built into `streamText` and `generateText` via `maxSteps`:

```typescript
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: `You are a customer support agent.
Gather all necessary information before responding to the customer.
Think step by step about what you need to look up.`,
  messages,
  tools: {
    lookupOrder: tool({
      description: 'Look up order details by order ID',
      parameters: z.object({ orderId: z.string() }),
      execute: async ({ orderId }) => await getOrder(orderId),
    }),
    getTracking: tool({
      description: 'Get shipping tracking details',
      parameters: z.object({ trackingNumber: z.string() }),
      execute: async ({ trackingNumber }) => await getTracking(trackingNumber),
    }),
  },
  maxSteps: 5, // Allow up to 5 reason-act cycles
});
```

Each "step" is one round of: model generates tool calls → you execute them → results go back to the model. Set `maxSteps` to control the maximum depth. 3-5 is typical for most use cases. 10+ is for complex research tasks.

### 3. Tool Calling Architecture

Tools are the agent's hands. Well-designed tools make agents reliable. Poorly designed tools make agents unpredictable.

**Design principles for agent tools:**

1. **One responsibility** — each tool does one thing. "searchAndUpdate" should be two tools.
2. **Descriptive names** — `lookupCustomerByEmail` beats `findUser`. The model reads tool names.
3. **Detailed descriptions** — the description is the model's documentation. Include what the tool does, when to use it, and what it returns.
4. **Narrow parameters** — accept the minimum input needed. Don't pass entire objects when an ID suffices.
5. **Structured returns** — return consistent shapes. Include error information in the return, don't throw.
6. **Safe by default** — read-only tools should be the majority. Write tools should require explicit confirmation.

```typescript
// GOOD tool design
const tools = {
  searchKnowledgeBase: tool({
    description: `Search the help center knowledge base by semantic similarity.
Returns the top 5 most relevant articles with titles, URLs, and content previews.
Use this when the customer asks about product features, troubleshooting, or how-to questions.`,
    parameters: z.object({
      query: z.string().describe('The search query — use the customer\'s exact words or a refined version'),
      category: z.enum(['getting-started', 'billing', 'api', 'integrations', 'troubleshooting'])
        .optional()
        .describe('Filter by article category if the topic is clear'),
    }),
    execute: async ({ query, category }) => {
      const results = await searchDocs(query, { category, limit: 5 });
      return {
        found: results.length,
        articles: results.map((r) => ({
          title: r.title,
          url: r.url,
          preview: r.content.slice(0, 200),
          relevance: r.score,
        })),
      };
    },
  }),

  // BAD tool design
  doStuff: tool({
    description: 'Does various things', // Too vague
    parameters: z.object({
      data: z.any(), // Too broad
    }),
    execute: async ({ data }) => {
      // Multiple responsibilities
      const user = await findUser(data.email);
      await updateUser(user.id, data.updates);
      await sendEmail(user.email, data.message);
      return 'done';
    },
  }),
};
```

**Tool categories:**

| Category | Examples | Safety Level |
|----------|----------|-------------|
| Read-only | Search, lookup, calculate, format | Safe — always allow |
| Write (reversible) | Create draft, add to cart, bookmark | Medium — log actions |
| Write (irreversible) | Send email, place order, delete | High — require confirmation |
| External | Call third-party API, post to social | High — require confirmation |

### 4. Planning Patterns

For complex tasks, have the agent plan before executing. Plan-then-execute produces more reliable results than diving straight into tools.

**Simple planning with a structured output step:**

```typescript
import { generateObject, streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const PlanSchema = z.object({
  goal: z.string().describe('The overall goal to accomplish'),
  steps: z.array(
    z.object({
      step: z.number(),
      action: z.string().describe('What to do in this step'),
      tool: z.string().describe('Which tool to use'),
      reasoning: z.string().describe('Why this step is needed'),
    })
  ),
  estimatedSteps: z.number().describe('Expected total number of tool calls'),
});

async function planAndExecute(
  task: string,
  tools: Record<string, any>,
  messages: any[]
) {
  // Phase 1: Plan
  const { object: plan } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: PlanSchema,
    prompt: `Create a step-by-step plan for this task:

TASK: ${task}

AVAILABLE TOOLS:
${Object.entries(tools)
  .map(([name, t]) => `- ${name}: ${t.description}`)
  .join('\n')}

Create a concrete plan. Each step should use one specific tool.`,
  });

  console.log('Plan:', plan);

  // Phase 2: Execute with the plan as context
  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are executing a plan step by step.

PLAN:
${plan.steps.map((s) => `${s.step}. ${s.action} (using ${s.tool})`).join('\n')}

Execute each step in order. After each tool result, check if the plan needs adjustment.
If a step fails, explain why and suggest an alternative.`,
    messages,
    tools,
    maxSteps: plan.estimatedSteps + 2, // Buffer for retries
  });

  return result;
}
```

### 5. Multi-Agent Systems

For complex workflows, decompose into multiple specialized agents coordinated by a supervisor. Each agent has its own tools, system prompt, and expertise.

**Supervisor pattern:**

```typescript
// lib/agents/supervisor.ts
import { generateObject, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

interface Agent {
  name: string;
  description: string;
  execute: (task: string) => Promise<string>;
}

const RoutingDecision = z.object({
  reasoning: z.string(),
  agent: z.string().describe('Name of the agent to handle this task'),
  task: z.string().describe('Specific task description for the selected agent'),
});

export async function supervisorRoute(
  userMessage: string,
  agents: Agent[]
): Promise<{ agent: string; result: string }> {
  // Step 1: Route to the right agent
  const { object: routing } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    temperature: 0,
    schema: RoutingDecision,
    prompt: `Route this user request to the most appropriate agent.

USER REQUEST: "${userMessage}"

AVAILABLE AGENTS:
${agents.map((a) => `- ${a.name}: ${a.description}`).join('\n')}

Choose the best agent and formulate a specific task for them.`,
  });

  // Step 2: Execute with the selected agent
  const agent = agents.find((a) => a.name === routing.agent);
  if (!agent) throw new Error(`Agent not found: ${routing.agent}`);

  const result = await agent.execute(routing.task);

  return { agent: routing.agent, result };
}
```

```typescript
// Example: Multi-agent content pipeline
const researchAgent: Agent = {
  name: 'researcher',
  description: 'Searches the web and knowledge base for information on a topic',
  execute: async (task) => {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: 'You are a research assistant. Find comprehensive information on the given topic.',
      prompt: task,
      tools: { webSearch, knowledgeBaseSearch },
      maxSteps: 5,
    });
    return result.text;
  },
};

const writerAgent: Agent = {
  name: 'writer',
  description: 'Writes polished content based on research and guidelines',
  execute: async (task) => {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: 'You are a professional content writer. Write clear, engaging content following the brand style guide.',
      prompt: task,
    });
    return result.text;
  },
};

const editorAgent: Agent = {
  name: 'editor',
  description: 'Reviews and improves content for clarity, accuracy, and style',
  execute: async (task) => {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: 'You are a senior editor. Review content for accuracy, clarity, grammar, and style. Return the improved version.',
      prompt: task,
    });
    return result.text;
  },
};
```

Use multi-agent when: agents need different tools, expertise, or system prompts. Do not use multi-agent when a single agent with multiple tools would work — the overhead of routing adds latency and cost.

### 6. Memory and State

Agents need memory to handle multi-turn interactions and learn from past actions.

**Short-term memory** — the conversation history. Managed by `useChat` on the client and passed as `messages` to each call:

```typescript
// This is handled automatically by useChat + streamText
const result = streamText({
  model,
  messages, // Full conversation history including previous tool calls and results
  tools,
  maxSteps: 5,
});
```

**Working memory** — intermediate state within a task. Stored in tool results that flow back to the model:

```typescript
// Each tool result becomes part of the conversation context
// The model "remembers" previous tool results within a task
tools: {
  addToCart: tool({
    description: 'Add a product to the shopping cart',
    parameters: z.object({ productId: z.string(), quantity: z.number() }),
    execute: async ({ productId, quantity }) => {
      const cart = await addToCart(userId, productId, quantity);
      // Return full cart state so the model knows what's in the cart
      return {
        added: { productId, quantity },
        cartTotal: cart.total,
        itemCount: cart.items.length,
        items: cart.items,
      };
    },
  }),
}
```

**Long-term memory** — facts that persist across conversations. Stored in a database and retrieved at the start of each conversation:

```typescript
// lib/agents/memory.ts
import { db } from '@/lib/db';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

// Store a memory
export async function saveMemory(
  userId: string,
  content: string,
  category: 'preference' | 'fact' | 'instruction'
) {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: content,
  });

  await db.agentMemory.create({
    data: {
      userId,
      content,
      category,
      embedding: JSON.stringify(embedding),
    },
  });
}

// Retrieve relevant memories for a conversation
export async function recallMemories(
  userId: string,
  currentMessage: string,
  limit: number = 5
): Promise<string[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: currentMessage,
  });

  const memories = await db.$queryRaw<Array<{ content: string }>>`
    SELECT content
    FROM "AgentMemory"
    WHERE "userId" = ${userId}
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${limit}
  `;

  return memories.map((m) => m.content);
}

// Use in the agent's system prompt
export async function buildAgentSystemPrompt(
  userId: string,
  currentMessage: string
): Promise<string> {
  const memories = await recallMemories(userId, currentMessage);

  const memoryBlock = memories.length > 0
    ? `\nUSER CONTEXT (from previous conversations):\n${memories.map((m) => `- ${m}`).join('\n')}\n`
    : '';

  return `You are a personal assistant.
${memoryBlock}
Use the above context to personalize your responses.
If the user shares a preference or important fact, note it for future reference.`;
}
```

### 7. Human-in-the-Loop

Not every action should be autonomous. High-stakes actions need human approval before execution.

**Pattern: confirmation before write actions:**

```typescript
import { streamText, tool } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: `You are a customer support agent.

CONFIRMATION REQUIRED for these actions:
- Issuing refunds
- Cancelling subscriptions
- Deleting accounts
- Sending emails to customers

For these actions, describe what you plan to do and ask the user to confirm.
Only proceed when the user explicitly says "yes" or "confirm".`,
  messages,
  tools: {
    // Read tools — no confirmation needed
    lookupCustomer: tool({
      description: 'Look up customer details',
      parameters: z.object({ email: z.string() }),
      execute: async ({ email }) => await findCustomer(email),
    }),

    // Write tool — the model should ask for confirmation
    issueRefund: tool({
      description: 'Issue a refund to a customer. REQUIRES user confirmation before executing.',
      parameters: z.object({
        orderId: z.string(),
        amount: z.number(),
        reason: z.string(),
      }),
      execute: async ({ orderId, amount, reason }) => {
        // Double-check: the frontend should also validate confirmation
        const result = await processRefund(orderId, amount, reason);
        return { success: true, refundId: result.id, amount };
      },
    }),
  },
  maxSteps: 5,
});
```

**Server-side confirmation gate** — for critical actions, add a server-side check that requires an explicit confirmation token:

```typescript
// lib/agents/confirmation.ts
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function createConfirmation(action: {
  type: string;
  params: Record<string, any>;
  userId: string;
}): Promise<string> {
  const token = randomUUID();

  await db.pendingAction.create({
    data: {
      token,
      actionType: action.type,
      params: action.params,
      userId: action.userId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
    },
  });

  return token;
}

export async function executeConfirmed(token: string) {
  const action = await db.pendingAction.findUnique({ where: { token } });

  if (!action) throw new Error('Confirmation not found');
  if (action.expiresAt < new Date()) throw new Error('Confirmation expired');

  // Execute the action
  switch (action.actionType) {
    case 'refund':
      return await processRefund(action.params.orderId, action.params.amount, action.params.reason);
    case 'cancel':
      return await cancelSubscription(action.params.subscriptionId);
    default:
      throw new Error(`Unknown action type: ${action.actionType}`);
  }
}
```

### 8. Error Recovery and Cost Control

Agents can loop, fail, and burn through API credits. Build guardrails from day one.

**Cost control:**

```typescript
// lib/agents/cost.ts

interface AgentBudget {
  maxSteps: number;
  maxTokens: number;
  maxCostUsd: number;
  maxDurationMs: number;
}

const DEFAULT_BUDGET: AgentBudget = {
  maxSteps: 10,
  maxTokens: 50000,
  maxCostUsd: 0.50,
  maxDurationMs: 60000, // 1 minute
};

export function createCostTracker(budget: Partial<AgentBudget> = {}) {
  const limits = { ...DEFAULT_BUDGET, ...budget };
  let totalTokens = 0;
  let totalCost = 0;
  let steps = 0;
  const startTime = Date.now();

  return {
    recordStep(usage: { promptTokens: number; completionTokens: number }) {
      steps++;
      totalTokens += usage.promptTokens + usage.completionTokens;
      // Approximate cost (adjust for your model pricing)
      totalCost +=
        (usage.promptTokens / 1_000_000) * 3 +
        (usage.completionTokens / 1_000_000) * 15;
    },

    checkBudget(): { withinBudget: boolean; reason?: string } {
      if (steps >= limits.maxSteps) {
        return { withinBudget: false, reason: `Step limit reached (${steps}/${limits.maxSteps})` };
      }
      if (totalTokens >= limits.maxTokens) {
        return { withinBudget: false, reason: `Token limit reached (${totalTokens}/${limits.maxTokens})` };
      }
      if (totalCost >= limits.maxCostUsd) {
        return { withinBudget: false, reason: `Cost limit reached ($${totalCost.toFixed(4)}/$${limits.maxCostUsd})` };
      }
      if (Date.now() - startTime >= limits.maxDurationMs) {
        return { withinBudget: false, reason: `Duration limit reached` };
      }
      return { withinBudget: true };
    },

    getSummary() {
      return {
        steps,
        totalTokens,
        totalCost: Math.round(totalCost * 10000) / 10000,
        durationMs: Date.now() - startTime,
      };
    },
  };
}
```

**Error handling in tools:**

```typescript
// Tools should never throw — return error objects
const safeTool = tool({
  description: 'Fetch data from external API',
  parameters: z.object({ endpoint: z.string() }),
  execute: async ({ endpoint }) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          error: `API returned ${response.status}: ${response.statusText}`,
          suggestion: 'Try a different endpoint or check if the service is available',
        };
      }

      return { data: await response.json() };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'The request failed. You may want to try an alternative approach.',
      };
    }
  },
});
```

---

## LLM Instructions

```
AI AGENT DEVELOPMENT INSTRUCTIONS

1. BUILD A REACT AGENT:
   - Use streamText with maxSteps (3-5 for simple agents, 5-10 for complex ones)
   - Define tools with clear descriptions, Zod parameters, and execute functions
   - Set a system prompt that instructs the model to think step-by-step
   - Return result.toDataStreamResponse() for streaming to the client
   - Use onFinish callback to log usage, tool calls, and cost

2. DESIGN AGENT TOOLS:
   - One tool = one responsibility (no multi-action tools)
   - Write detailed descriptions: what it does, when to use it, what it returns
   - Use specific Zod schemas with .describe() on every field
   - Return structured objects (never raw strings)
   - Return error objects instead of throwing exceptions
   - Add timeouts to all external calls (10 seconds default)
   - Categorize tools as read-only, write-reversible, or write-irreversible

3. ADD HUMAN-IN-THE-LOOP:
   - Identify which actions require human approval (writes, deletes, external sends)
   - Add confirmation instructions to the system prompt
   - For critical actions, implement server-side confirmation tokens
   - Set expiry on pending confirmations (5 minutes default)
   - Log all confirmed and rejected actions for audit

4. IMPLEMENT AGENT MEMORY:
   - Short-term: pass full messages array (handled by useChat)
   - Working: return rich context from tool results
   - Long-term: store key facts in pgvector, retrieve relevant ones per conversation
   - Use embed() to store and retrieve memories by semantic similarity
   - Clean up outdated memories periodically

5. CONTROL AGENT COST:
   - Set maxSteps on every agent (never unlimited)
   - Track tokens per step and total cost per agent run
   - Set budget limits: max steps, max tokens, max cost, max duration
   - Abort the agent if any limit is reached
   - Log cost per agent run for monitoring and billing
   - Use cheaper models (gpt-4o-mini) for planning and routing, expensive models for execution
```

---

## Examples

### Example 1: ReAct Agent with Vercel AI SDK

A customer support agent that looks up orders, checks policies, and resolves issues.

```typescript
// app/api/agent/support/route.ts
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a customer support agent for Acme SaaS.

PROCESS:
1. Understand the customer's issue
2. Look up relevant information (orders, account, knowledge base)
3. Determine the resolution
4. If the resolution involves a refund or account change, explain what you'll do and ask for confirmation
5. Execute the resolution

RULES:
- Always look up the customer's account before making assumptions
- Search the knowledge base for how-to questions before answering from memory
- Never promise features or timelines not in the documentation
- For refunds over $50, recommend the customer contact billing directly
- Be empathetic but solution-oriented`,
    messages,
    tools: {
      lookupAccount: tool({
        description:
          'Look up the current user\'s account details including subscription tier, usage, and billing status',
        parameters: z.object({}),
        execute: async () => {
          const account = await db.user.findUnique({
            where: { id: session.user.id },
            include: {
              subscription: true,
              _count: { select: { orders: true } },
            },
          });
          return {
            name: account?.name,
            email: account?.email,
            tier: account?.subscription?.tier,
            status: account?.subscription?.status,
            totalOrders: account?._count.orders,
          };
        },
      }),

      searchOrders: tool({
        description:
          'Search the customer\'s orders by status, date range, or order ID',
        parameters: z.object({
          orderId: z.string().optional().describe('Specific order ID to look up'),
          status: z.enum(['all', 'pending', 'shipped', 'delivered', 'cancelled', 'refunded']).default('all'),
          limit: z.number().default(5),
        }),
        execute: async ({ orderId, status, limit }) => {
          const orders = await db.order.findMany({
            where: {
              userId: session.user.id,
              ...(orderId && { id: orderId }),
              ...(status !== 'all' && { status }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
          });
          return {
            count: orders.length,
            orders: orders.map((o) => ({
              id: o.id,
              total: o.total,
              status: o.status,
              date: o.createdAt.toISOString().split('T')[0],
              items: o.items,
            })),
          };
        },
      }),

      searchKnowledgeBase: tool({
        description:
          'Search help center articles for product documentation, troubleshooting guides, and how-to instructions',
        parameters: z.object({
          query: z.string().describe('Search query'),
        }),
        execute: async ({ query }) => {
          const articles = await semanticSearch(query, { limit: 3 });
          return {
            articles: articles.map((a) => ({
              title: a.title,
              content: a.content.slice(0, 500),
              url: a.sourceUrl,
            })),
          };
        },
      }),

      requestRefund: tool({
        description:
          'Initiate a refund for an order. ONLY call this after the customer has confirmed they want a refund.',
        parameters: z.object({
          orderId: z.string(),
          amount: z.number().describe('Refund amount in dollars'),
          reason: z.string().describe('Reason for the refund'),
        }),
        execute: async ({ orderId, amount, reason }) => {
          if (amount > 50) {
            return {
              error: 'Refunds over $50 must be processed by the billing team',
              suggestion: 'Please direct the customer to billing@acme.com',
            };
          }

          const refund = await processRefund(orderId, amount, reason);
          return {
            success: true,
            refundId: refund.id,
            amount,
            estimatedDays: 5,
          };
        },
      }),
    },
    maxSteps: 6,
    onFinish: async ({ usage, steps }) => {
      await db.agentLog.create({
        data: {
          userId: session.user.id,
          agentType: 'support',
          steps: steps.length,
          toolCalls: steps.flatMap((s) => s.toolCalls.map((tc) => tc.toolName)),
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        },
      });
    },
  });

  return result.toDataStreamResponse();
}
```

### Example 2: Research Agent with Plan-and-Execute

An agent that plans its research, executes the plan, and synthesizes findings.

```typescript
// lib/agents/research.ts
import { generateObject, generateText, streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const ResearchPlan = z.object({
  topic: z.string(),
  questions: z.array(z.string()).min(2).max(5).describe('Key questions to answer'),
  searchQueries: z.array(z.string()).min(2).max(8).describe('Search queries to run'),
  estimatedSteps: z.number(),
});

export async function researchTopic(topic: string): Promise<string> {
  // Phase 1: Plan
  const { object: plan } = await generateObject({
    model: openai('gpt-4o-mini'), // Cheap model for planning
    schema: ResearchPlan,
    prompt: `Create a research plan for: "${topic}"

Generate specific questions to answer and search queries to find the information.
Focus on factual, verifiable information.`,
  });

  console.log('Research plan:', plan);

  // Phase 2: Execute research
  const { text: researchNotes } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a research agent. Execute the research plan by searching for information.

PLAN:
Questions to answer:
${plan.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Search queries to run:
${plan.searchQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

For each search, note the key findings. Cite sources.
After completing research, summarize your findings organized by question.`,
    prompt: `Research topic: ${topic}`,
    tools: {
      searchWeb: tool({
        description: 'Search the web for current information',
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          // Implement with your preferred search API
          const results = await webSearch(query);
          return results.slice(0, 5).map((r) => ({
            title: r.title,
            snippet: r.snippet,
            url: r.url,
          }));
        },
      }),
      readPage: tool({
        description: 'Read the content of a web page',
        parameters: z.object({
          url: z.string().url(),
        }),
        execute: async ({ url }) => {
          const content = await fetchAndExtract(url);
          return { content: content.slice(0, 3000), url };
        },
      }),
    },
    maxSteps: plan.estimatedSteps + 2,
  });

  // Phase 3: Synthesize
  const { text: synthesis } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: 'You are a research synthesizer. Create a clear, well-organized summary from research notes.',
    prompt: `Synthesize the following research notes into a comprehensive summary.
Organize by key themes. Include citations.

RESEARCH NOTES:
${researchNotes}`,
  });

  return synthesis;
}
```

### Example 3: Customer Support Agent with Escalation

An agent that handles common support tasks and escalates when needed.

```typescript
// lib/agents/support.ts
import { streamText, tool, generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const EscalationDecision = z.object({
  shouldEscalate: z.boolean(),
  reason: z.string(),
  department: z.enum(['billing', 'engineering', 'management', 'legal']).optional(),
  priority: z.enum(['normal', 'urgent', 'critical']).optional(),
});

export function createSupportAgent(
  userId: string,
  conversationId: string
) {
  return streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a Level 1 support agent for Acme SaaS.

YOUR CAPABILITIES:
- Answer product questions using the knowledge base
- Look up order status and account details
- Process simple refunds (under $50)
- Update account preferences

ESCALATION TRIGGERS (hand off to a human):
- Customer is angry and asks to speak to a manager
- Technical issues you cannot diagnose
- Billing disputes over $50
- Account security concerns
- Legal threats or compliance questions
- Customer has contacted support 3+ times about the same issue

When escalating, summarize the conversation and hand off gracefully.`,
    messages: [], // Will be populated
    tools: {
      lookupAccount: tool({
        description: 'Look up customer account details',
        parameters: z.object({}),
        execute: async () => {
          return await getAccountDetails(userId);
        },
      }),

      searchKnowledge: tool({
        description: 'Search help center for answers',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          return await searchHelpCenter(query);
        },
      }),

      checkEscalation: tool({
        description: 'Evaluate whether this conversation should be escalated to a human agent. Call this when the customer seems frustrated, has a complex issue, or triggers an escalation rule.',
        parameters: z.object({
          conversationSummary: z.string(),
          customerSentiment: z.enum(['positive', 'neutral', 'frustrated', 'angry']),
          issueType: z.string(),
        }),
        execute: async ({ conversationSummary, customerSentiment, issueType }) => {
          // Log escalation check
          await db.escalationLog.create({
            data: {
              conversationId,
              userId,
              summary: conversationSummary,
              sentiment: customerSentiment,
              issueType,
            },
          });

          // Auto-escalate for angry customers or repeated issues
          const recentTickets = await db.ticket.count({
            where: {
              userId,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          });

          if (customerSentiment === 'angry' || recentTickets >= 3) {
            return {
              shouldEscalate: true,
              reason: customerSentiment === 'angry'
                ? 'Customer is frustrated — needs human empathy'
                : `Customer has ${recentTickets} tickets in the past week`,
              department: 'management',
              priority: 'urgent',
            };
          }

          return { shouldEscalate: false, reason: 'Issue can be handled by AI agent' };
        },
      }),

      escalateToHuman: tool({
        description: 'Transfer the conversation to a human support agent. Only call after checkEscalation returns shouldEscalate: true.',
        parameters: z.object({
          department: z.enum(['billing', 'engineering', 'management', 'legal']),
          priority: z.enum(['normal', 'urgent', 'critical']),
          summary: z.string().describe('Summary of the issue and what has been tried'),
        }),
        execute: async ({ department, priority, summary }) => {
          await createEscalation({
            conversationId,
            userId,
            department,
            priority,
            summary,
          });

          return {
            escalated: true,
            message: `Transferred to ${department} team with ${priority} priority`,
            estimatedWait: priority === 'critical' ? '5 minutes' : '15 minutes',
          };
        },
      }),
    },
    maxSteps: 6,
  });
}
```

### Example 4: Multi-Agent Content Pipeline

Three specialized agents that collaborate to produce a blog post: research, write, edit.

```typescript
// lib/agents/content-pipeline.ts
import { generateText, generateObject, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const ContentBrief = z.object({
  title: z.string(),
  outline: z.array(z.object({
    heading: z.string(),
    keyPoints: z.array(z.string()),
  })),
  targetLength: z.number(),
  tone: z.string(),
  keywords: z.array(z.string()),
});

const EditFeedback = z.object({
  overallQuality: z.number().min(1).max(10),
  issues: z.array(z.object({
    type: z.enum(['grammar', 'clarity', 'accuracy', 'flow', 'tone']),
    location: z.string(),
    issue: z.string(),
    suggestion: z.string(),
  })),
  improvedContent: z.string(),
});

export async function generateBlogPost(
  topic: string,
  style: string = 'informative'
) {
  // Agent 1: Researcher — gathers information
  console.log('Phase 1: Research');
  const { text: research } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: 'You are a thorough researcher. Gather key facts, statistics, and expert opinions on the given topic.',
    prompt: `Research this topic thoroughly for a blog post: "${topic}"

Include:
- Key facts and statistics (with sources)
- Common questions people have about this topic
- Expert perspectives
- Recent developments
- Practical tips and actionable advice`,
    tools: {
      webSearch: tool({
        description: 'Search the web for information',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => await webSearch(query),
      }),
    },
    maxSteps: 5,
  });

  // Agent 2: Writer — creates the first draft
  console.log('Phase 2: Writing');
  const { object: brief } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: ContentBrief,
    prompt: `Create a content brief for a blog post about "${topic}".
Style: ${style}
Research notes: ${research.slice(0, 3000)}`,
  });

  const { text: draft } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a professional blog writer. Write engaging, well-structured content.
Follow the outline provided. Target ${brief.targetLength} words.
Tone: ${brief.tone}
Include the keywords naturally: ${brief.keywords.join(', ')}`,
    prompt: `Write a blog post based on this brief:

TITLE: ${brief.title}

OUTLINE:
${brief.outline.map((s) => `## ${s.heading}\n${s.keyPoints.map((p) => `- ${p}`).join('\n')}`).join('\n\n')}

RESEARCH:
${research}`,
  });

  // Agent 3: Editor — reviews and improves
  console.log('Phase 3: Editing');
  const { object: editResult } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: EditFeedback,
    prompt: `Review and improve this blog post draft.

Check for:
- Grammar and spelling errors
- Clarity and readability
- Logical flow between sections
- Factual accuracy
- Engaging tone and voice
- SEO keyword usage (keywords: ${brief.keywords.join(', ')})

DRAFT:
${draft}

Provide specific feedback and return an improved version.`,
  });

  return {
    title: brief.title,
    content: editResult.improvedContent,
    qualityScore: editResult.overallQuality,
    issues: editResult.issues,
    brief,
    research: research.slice(0, 500),
  };
}
```

### Example 5: Agent with Long-Term Memory

An assistant that remembers user preferences and past interactions across conversations.

```typescript
// app/api/agent/personal/route.ts
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { recallMemories, saveMemory } from '@/lib/agents/memory';
import { auth } from '@/lib/auth';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const { messages } = await req.json();
  const latestMessage = messages[messages.length - 1].content;

  // Recall relevant memories
  const memories = await recallMemories(session.user.id, latestMessage, 5);

  const memoryContext = memories.length > 0
    ? `\nTHINGS I REMEMBER ABOUT YOU:\n${memories.map((m) => `- ${m}`).join('\n')}\n`
    : '';

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a personal AI assistant with memory.
${memoryContext}
MEMORY INSTRUCTIONS:
- Use remembered facts to personalize responses
- When the user shares preferences, habits, or important facts, use the rememberFact tool
- When information you remember seems outdated, ask the user to confirm
- Be natural about using memories — don't list everything you remember`,
    messages,
    tools: {
      rememberFact: tool({
        description:
          'Save an important fact about the user for future conversations. Use for preferences, goals, frequently referenced info.',
        parameters: z.object({
          fact: z.string().describe('The fact to remember, written in third person'),
          category: z.enum(['preference', 'fact', 'instruction']),
        }),
        execute: async ({ fact, category }) => {
          await saveMemory(session.user.id, fact, category);
          return { saved: true, fact };
        },
      }),

      recallContext: tool({
        description:
          'Search memories for information about the user that might be relevant to the current topic',
        parameters: z.object({
          topic: z.string().describe('What topic to search memories for'),
        }),
        execute: async ({ topic }) => {
          const relevant = await recallMemories(session.user.id, topic, 3);
          return { memories: relevant };
        },
      }),
    },
    maxSteps: 4,
  });

  return result.toDataStreamResponse();
}
```

---

## Common Mistakes

### 1. No Step Limit

**Wrong:**

```typescript
const result = streamText({
  model,
  messages,
  tools,
  maxSteps: 100, // Or no limit at all
});
```

**Fix:** Set `maxSteps` to the minimum needed for the task. 3-5 for simple agents, 5-10 for complex ones. Without a limit, an agent can loop indefinitely — calling tools, getting results it doesn't understand, calling more tools. This burns tokens and money.

### 2. Vague Tool Descriptions

**Wrong:**

```typescript
tool({
  description: 'Gets data',
  parameters: z.object({ id: z.string() }),
  execute: async ({ id }) => await getData(id),
});
```

**Fix:** Tool descriptions are the agent's documentation. Write them like API docs: what the tool does, when to use it, what it returns, what inputs it needs. The model literally reads these to decide which tool to call.

### 3. Tools That Do Too Much

**Wrong:** A single tool that searches, filters, sorts, creates a draft, sends an email, and logs the result.

**Fix:** One tool, one responsibility. A tool that does too much is unpredictable — the model might call it when it only needs one of its six functions. Split into focused tools: `search`, `createDraft`, `sendEmail`, `logAction`.

### 4. No Error Handling in Tools

**Wrong:**

```typescript
execute: async ({ url }) => {
  const res = await fetch(url); // No timeout, no error handling
  return await res.json(); // Crashes on non-JSON response
}
```

**Fix:** Every tool should handle errors gracefully. Use try/catch, set timeouts (10 seconds), and return error objects instead of throwing. The agent can reason about errors if you return `{ error: "API unavailable", suggestion: "Try another approach" }`.

### 5. Using an Agent for Simple Tasks

**Wrong:** Building an agent with a ReAct loop to answer "What are your business hours?" — a question that needs zero tool calls.

**Fix:** Only use agents when the task requires multiple steps, dynamic decision-making, or tool interaction. For simple Q&A, use `generateText` or RAG. For extraction, use `generateObject`. Agents add latency (each step = another LLM call) and cost.

### 6. No Human Oversight

**Wrong:** An agent that can send emails, process refunds, and delete accounts with zero approval gates.

**Fix:** Categorize tools by risk level. Read-only tools can run freely. Write actions that affect users (emails, charges, deletions) should require confirmation — either from the user in chat or from a human reviewer. Log every action for audit.

### 7. Unbounded Memory

**Wrong:** Storing every fact from every conversation without cleanup, growing the memory database indefinitely.

**Fix:** Limit memory size per user (50-100 facts). Add a relevance decay — memories not accessed in 30 days get archived. Deduplicate — if the user says "I prefer dark mode" twice, store it once. Periodically consolidate related memories.

### 8. No Cost Tracking

**Wrong:** Deploying an agent with no visibility into how many tokens it uses, how many steps it takes, or how much it costs per run.

**Fix:** Log every agent run: total tokens, step count, tool calls, duration, and estimated cost. Set budget alerts. Show cost data in your admin dashboard. Agents are significantly more expensive than single LLM calls — a 5-step agent costs 5x a single call at minimum.

### 9. Over-Engineering with Multi-Agent

**Wrong:** Building a supervisor, router, three specialist agents, and a synthesis agent for a task that one agent with three tools could handle.

**Fix:** Start with a single agent. Only split into multiple agents when you have concrete evidence that: (1) a single agent's tools are too many (10+), (2) different steps need fundamentally different system prompts, or (3) you need parallel execution. Multi-agent adds latency and complexity.

### 10. No Logging or Observability

**Wrong:** Agents running in production with no visibility into what tools they call, what reasoning they follow, or why they produce certain outputs.

**Fix:** Log every step: the model's reasoning, tool calls with parameters, tool results, and the final response. Store logs by conversation ID for replay and debugging. Alert on anomalies: high step counts, repeated tool calls, error-heavy sessions. Use structured logging (JSON) for queryability.

---

> **See also:** [LLM-Patterns](../LLM-Patterns/llm-patterns.md) | [Prompt-Engineering](../Prompt-Engineering/prompt-engineering.md) | [RAG](../RAG/rag.md) | [Backend/Background-Jobs](../../Backend/Background-Jobs/background-jobs.md) | [Backend/Error-Handling-Logging](../../Backend/Error-Handling-Logging/error-handling-logging.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
