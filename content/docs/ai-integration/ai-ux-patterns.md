---
title: AI UX Patterns
description: Streaming chat interfaces, loading states, progressive rendering, regenerate and stop controls, feedback collection, conversation management, markdown and code rendering, confidence indicators, error recovery, and accessibility — the frontend craft of making AI features feel fast and trustworthy.
---
# AI UX Patterns

> Streaming chat interfaces, loading states, progressive rendering, regenerate and stop controls, feedback collection, conversation management, markdown and code rendering, confidence indicators, error recovery, and accessibility — the frontend craft of making AI features feel fast and trustworthy.

---

## Principles

### 1. Streaming-First Interface Design

Every AI response must stream. Users waiting 5-15 seconds staring at a spinner will leave. Streaming shows tokens arriving in real-time, dropping perceived latency from "broken" to "thinking." Time to first token is the UX metric that matters most.

The Vercel AI SDK handles the protocol. Your job is rendering the stream well.

```typescript
'use client';

import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} isStreaming={isLoading && m.id === messages[messages.length - 1]?.id} />
        ))}
      </div>
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
```

**Key streaming UX rules:**

- Show a typing indicator or cursor at the insertion point while streaming
- Auto-scroll to bottom as new tokens arrive, but stop if the user scrolls up
- Disable the input while streaming (prevent double-sends)
- Show a "Stop generating" button during streaming
- Render markdown progressively — do not wait for the full response to parse
- If the stream errors mid-response, show what was received plus an error state with a retry button

### 2. Chat Message Layout and Rendering

Chat is the primary AI interface. Get the layout right.

**Message anatomy:**

```typescript
// components/chat/chat-message.tsx
'use client';

import { type Message } from 'ai';
import { memo } from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import { CopyButton } from './copy-button';
import { MessageActions } from './message-actions';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (rating: 'positive' | 'negative') => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming,
  onRegenerate,
  onFeedback,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 px-4 py-6 ${
        isUser ? 'bg-transparent' : 'bg-gray-50 dark:bg-gray-900'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-green-600 text-white'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-sm font-medium text-gray-500">
          {isUser ? 'You' : 'Assistant'}
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MarkdownRenderer content={message.content} />
          {isStreaming && <StreamingCursor />}
        </div>

        {/* Tool call indicators */}
        {message.toolInvocations?.map((tool) => (
          <ToolCallIndicator key={tool.toolCallId} tool={tool} />
        ))}

        {/* Actions — only show on completed assistant messages */}
        {!isUser && !isStreaming && (
          <MessageActions
            content={message.content}
            onRegenerate={onRegenerate}
            onFeedback={onFeedback}
          />
        )}
      </div>
    </div>
  );
});

function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 bg-gray-800 dark:bg-gray-200 animate-pulse ml-0.5" />
  );
}
```

**Layout rules:**

- Use full-width rows, not chat bubbles — bubbles waste horizontal space and make code blocks unreadable
- Distinguish user and assistant messages with background color, not just alignment
- Show avatars for visual scanning
- Use `memo` on message components — chat lists re-render frequently
- Give the content area `min-w-0` to prevent code blocks from overflowing
- Apply `prose` classes from Tailwind Typography for consistent markdown styling

### 3. Loading States and Thinking Indicators

Users need to know what is happening between sending a message and seeing tokens. The gap (typically 500ms-3s) needs clear feedback.

**Three-phase loading:**

1. **Sending** (0-200ms) — optimistic UI, show the user's message immediately
2. **Thinking** (200ms-3s) — show a thinking indicator in the assistant's message area
3. **Streaming** (3s+) — tokens arriving, streaming cursor visible

```typescript
// components/chat/thinking-indicator.tsx
export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
        AI
      </div>
      <div className="flex items-center gap-1 pt-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
        </div>
        <span className="text-sm text-gray-500 ml-2">Thinking...</span>
      </div>
    </div>
  );
}
```

**For tool calls, show what the agent is doing:**

```typescript
// components/chat/tool-call-indicator.tsx
import { type ToolInvocation } from 'ai';

interface ToolCallIndicatorProps {
  tool: ToolInvocation;
}

export function ToolCallIndicator({ tool }: ToolCallIndicatorProps) {
  const toolLabels: Record<string, string> = {
    searchKnowledgeBase: 'Searching knowledge base',
    lookupOrder: 'Looking up order',
    queryDatabase: 'Querying database',
    calculateMetrics: 'Calculating metrics',
  };

  const label = toolLabels[tool.toolName] || `Using ${tool.toolName}`;
  const isComplete = tool.state === 'result';

  return (
    <div
      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
        isComplete
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}
    >
      {isComplete ? (
        <CheckIcon className="w-4 h-4" />
      ) : (
        <SpinnerIcon className="w-4 h-4 animate-spin" />
      )}
      <span>{label}</span>
      {isComplete && tool.result && (
        <button className="ml-auto text-xs underline opacity-60 hover:opacity-100">
          Show details
        </button>
      )}
    </div>
  );
}
```

### 4. Stop, Regenerate, and Retry Controls

Users need control over AI generation. Three essential controls:

**Stop** — cancel in-progress generation:

```typescript
const { messages, isLoading, stop } = useChat();

// Show stop button only while streaming
{isLoading && (
  <button
    onClick={stop}
    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
  >
    <StopIcon className="w-4 h-4" />
    Stop generating
  </button>
)}
```

**Regenerate** — re-run the last assistant response with the same input:

```typescript
const { messages, reload } = useChat();

function handleRegenerate() {
  reload(); // Resends the last user message
}

// Show on the last assistant message
<button
  onClick={handleRegenerate}
  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
>
  <RefreshIcon className="w-3.5 h-3.5" />
  Regenerate
</button>
```

**Retry on error** — when a response fails mid-stream:

```typescript
const { messages, error, reload } = useChat({
  onError: (error) => {
    // Error is automatically captured
    console.error('Chat error:', error);
  },
});

{error && (
  <div className="flex items-center gap-3 px-4 py-3 bg-red-50 text-red-700 rounded-lg mx-4">
    <AlertIcon className="w-5 h-5 shrink-0" />
    <div className="flex-1">
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="text-xs text-red-600">
        {error.message || 'The AI response failed. Please try again.'}
      </p>
    </div>
    <button
      onClick={() => reload()}
      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded text-sm font-medium"
    >
      Retry
    </button>
  </div>
)}
```

**Additional controls to consider:**

- **Copy** — copy the assistant's response to clipboard (essential for code)
- **Edit and resend** — let users edit a previous message and resend (fork the conversation)
- **Rate** — thumbs up/down for feedback collection

### 5. Markdown and Code Rendering

AI responses contain markdown: headings, lists, bold, code blocks, tables, links. Render them properly.

```typescript
// components/chat/markdown-renderer.tsx
'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Code blocks with syntax highlighting and copy button
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;

          if (isInline) {
            return (
              <code
                className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 text-sm"
                {...props}
              >
                {children}
              </code>
            );
          }

          const codeString = String(children).replace(/\n$/, '');

          return (
            <div className="relative group not-prose my-4">
              <div className="flex items-center justify-between bg-gray-800 text-gray-300 text-xs px-4 py-2 rounded-t-lg">
                <span>{match[1]}</span>
                <CopyCodeButton code={codeString} />
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        },

        // Tables with horizontal scroll
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          );
        },

        // Links open in new tab
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded hover:bg-gray-700"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
```

**Rendering rules:**

- Use `react-markdown` with `remark-gfm` for GitHub-flavored markdown (tables, strikethrough, task lists)
- Syntax highlight code blocks with `react-syntax-highlighter` or `shiki`
- Add a copy button to every code block — users are copying code, not reading it
- Show the language label on code blocks
- Wrap tables in `overflow-x-auto` to prevent horizontal page overflow
- Open external links in new tabs
- Memoize the markdown renderer — it is expensive and re-renders on every token during streaming

### 6. Progressive Object Rendering

When using `streamObject` / `useObject`, fields appear as they generate. Render them progressively instead of waiting for the complete object.

```typescript
// components/analysis/progressive-analysis.tsx
'use client';

import { useObject } from 'ai/react';
import { z } from 'zod';

const AnalysisSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  confidence: z.number().min(0).max(1),
  topics: z.array(
    z.object({
      name: z.string(),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
    })
  ),
  summary: z.string(),
  actionItems: z.array(z.string()),
});

export function ReviewAnalyzer() {
  const { object, submit, isLoading, error } = useObject({
    api: '/api/analyze',
    schema: AnalysisSchema,
  });

  return (
    <div className="space-y-4">
      <button
        onClick={() => submit({ text: reviewText })}
        disabled={isLoading}
      >
        {isLoading ? 'Analyzing...' : 'Analyze Review'}
      </button>

      {/* Fields render as they appear in the stream */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sentiment — appears first */}
        <div className={`p-4 rounded-lg border ${object?.sentiment ? 'opacity-100' : 'opacity-30'}`}>
          <p className="text-sm text-gray-500">Sentiment</p>
          {object?.sentiment ? (
            <p className="text-lg font-semibold capitalize">
              <SentimentBadge sentiment={object.sentiment} />
            </p>
          ) : (
            <Skeleton className="h-6 w-24" />
          )}
        </div>

        {/* Confidence — appears second */}
        <div className={`p-4 rounded-lg border ${object?.confidence != null ? 'opacity-100' : 'opacity-30'}`}>
          <p className="text-sm text-gray-500">Confidence</p>
          {object?.confidence != null ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${object.confidence * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {(object.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ) : (
            <Skeleton className="h-6 w-full" />
          )}
        </div>
      </div>

      {/* Topics — appear as array grows */}
      {object?.topics && object.topics.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Topics</p>
          <div className="flex flex-wrap gap-2">
            {object.topics.map((topic, i) => (
              <span
                key={i}
                className={`px-3 py-1 rounded-full text-sm ${
                  topic?.sentiment === 'positive'
                    ? 'bg-green-100 text-green-700'
                    : topic?.sentiment === 'negative'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                {topic?.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary — appears last */}
      {object?.summary && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Summary</p>
          <p>{object.summary}</p>
        </div>
      )}
    </div>
  );
}
```

**Progressive rendering rules:**

- Check for `undefined`/`null` on each field before rendering — fields arrive in order
- Use skeleton placeholders for fields that haven't arrived yet
- Animate transitions as fields appear (opacity, slide)
- Show a reduced-opacity state for pending fields so users see the full layout
- For arrays, items appear one by one — render each as it arrives

### 7. Conversation Management

Real chat applications need more than a single thread. Handle conversation history, branching, and persistence.

```typescript
// lib/conversations.ts
import { db } from '@/lib/db';
import { type Message } from 'ai';

export async function createConversation(userId: string, title?: string) {
  return db.conversation.create({
    data: {
      userId,
      title: title || 'New conversation',
    },
  });
}

export async function saveMessages(
  conversationId: string,
  messages: Message[]
) {
  // Upsert messages — handles both new messages and updates
  await db.$transaction(
    messages.map((message) =>
      db.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          conversationId,
          role: message.role,
          content: message.content,
          toolInvocations: message.toolInvocations
            ? JSON.stringify(message.toolInvocations)
            : null,
          createdAt: message.createdAt || new Date(),
        },
        update: {
          content: message.content,
          toolInvocations: message.toolInvocations
            ? JSON.stringify(message.toolInvocations)
            : null,
        },
      })
    )
  );
}

export async function loadConversation(conversationId: string) {
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });

  return messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    toolInvocations: m.toolInvocations
      ? JSON.parse(m.toolInvocations)
      : undefined,
    createdAt: m.createdAt,
  }));
}

// Auto-generate conversation title from first message
export async function generateTitle(
  firstMessage: string
): Promise<string> {
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    temperature: 0,
    maxTokens: 20,
    prompt: `Generate a short (3-6 word) title for a conversation that starts with: "${firstMessage.slice(0, 200)}"

Return ONLY the title, no quotes or punctuation.`,
  });

  return text.trim();
}
```

```typescript
// components/chat/conversation-sidebar.tsx
'use client';

import { useState, useEffect } from 'react';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export function ConversationSidebar({
  activeId,
  onSelect,
  onNew,
}: {
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then(setConversations);
  }, []);

  return (
    <div className="w-64 border-r h-full flex flex-col">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-4 py-3 text-sm border-b hover:bg-gray-50 ${
              conv.id === activeId ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
            }`}
          >
            <p className="font-medium truncate">{conv.title}</p>
            <p className="text-xs text-gray-500">
              {new Date(conv.updatedAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 8. Feedback Collection

User feedback is the most valuable signal for improving AI quality. Build it into every AI response.

```typescript
// components/chat/message-feedback.tsx
'use client';

import { useState } from 'react';

interface MessageFeedbackProps {
  messageId: string;
  conversationId: string;
}

export function MessageFeedback({
  messageId,
  conversationId,
}: MessageFeedbackProps) {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submitFeedback(
    newRating: 'positive' | 'negative',
    details?: string
  ) {
    setRating(newRating);
    setSubmitted(true);

    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        conversationId,
        rating: newRating,
        feedback: details,
      }),
    });
  }

  if (submitted && !showDetails) {
    return (
      <span className="text-xs text-gray-400">
        Thanks for your feedback
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => {
          if (rating === 'negative') setShowDetails(true);
          else submitFeedback('positive');
        }}
        className={`p-1 rounded hover:bg-gray-100 ${
          rating === 'positive' ? 'text-green-600' : 'text-gray-400'
        }`}
        title="Good response"
      >
        <ThumbsUpIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setShowDetails(true)}
        className={`p-1 rounded hover:bg-gray-100 ${
          rating === 'negative' ? 'text-red-600' : 'text-gray-400'
        }`}
        title="Bad response"
      >
        <ThumbsDownIcon className="w-4 h-4" />
      </button>

      {showDetails && (
        <div className="ml-2 flex items-center gap-2">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What went wrong?"
            className="text-sm border rounded px-2 py-1 w-48"
            autoFocus
          />
          <button
            onClick={() => submitFeedback('negative', feedback)}
            className="text-sm px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
```

```typescript
// app/api/feedback/route.ts
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const FeedbackSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  rating: z.enum(['positive', 'negative']),
  feedback: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const data = FeedbackSchema.parse(body);

  await db.aiFeedback.create({
    data: {
      userId: session.user.id,
      messageId: data.messageId,
      conversationId: data.conversationId,
      rating: data.rating,
      feedback: data.feedback,
    },
  });

  return Response.json({ success: true });
}
```

**Feedback data is gold for:**

- Building evaluation datasets (positive = good examples, negative = improvement targets)
- Measuring prompt quality over time
- Identifying topics where the AI struggles
- Prioritizing prompt and retrieval improvements

### 9. Accessibility in AI Interfaces

AI features must be accessible. Screen readers, keyboard navigation, and reduced motion all matter.

**Chat accessibility checklist:**

```typescript
// Accessible chat input
<form onSubmit={handleSubmit} role="form" aria-label="Chat input">
  <label htmlFor="chat-input" className="sr-only">
    Type your message
  </label>
  <textarea
    id="chat-input"
    value={input}
    onChange={handleInputChange}
    placeholder="Type a message..."
    aria-describedby="chat-hint"
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }}
    rows={1}
  />
  <span id="chat-hint" className="sr-only">
    Press Enter to send, Shift+Enter for new line
  </span>
  <button type="submit" aria-label={isLoading ? 'Stop generating' : 'Send message'}>
    {isLoading ? 'Stop' : 'Send'}
  </button>
</form>

// Accessible message list
<div
  role="log"
  aria-label="Chat messages"
  aria-live="polite"
  aria-relevant="additions"
>
  {messages.map((m) => (
    <div
      key={m.id}
      role="article"
      aria-label={`${m.role === 'user' ? 'You' : 'Assistant'} said`}
    >
      {m.content}
    </div>
  ))}
</div>

// Announce streaming state to screen readers
{isLoading && (
  <div aria-live="assertive" className="sr-only">
    Assistant is responding...
  </div>
)}
```

**Key accessibility rules:**

- Use `role="log"` on the message container with `aria-live="polite"` so screen readers announce new messages
- Label the input with a visually hidden `<label>` or `aria-label`
- Support keyboard shortcuts: Enter to send, Shift+Enter for newlines, Escape to stop generation
- Announce loading/streaming state to screen readers with `aria-live`
- Ensure all interactive elements (copy, regenerate, feedback buttons) are keyboard-focusable
- Respect `prefers-reduced-motion` — disable typing animations and bouncing indicators
- Provide text alternatives for any visual indicators (loading dots, confidence bars)

### 10. Empty States, Onboarding, and Suggested Prompts

The blank chat screen is a conversion killer. Help users get started.

```typescript
// components/chat/empty-state.tsx
interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

const suggestions: SuggestedPrompt[] = [
  {
    label: 'Explain a concept',
    prompt: 'Explain how webhooks work in simple terms',
    icon: <BookIcon />,
  },
  {
    label: 'Write code',
    prompt: 'Write a React hook for debouncing input',
    icon: <CodeIcon />,
  },
  {
    label: 'Analyze data',
    prompt: 'What are the key metrics I should track for a SaaS app?',
    icon: <ChartIcon />,
  },
  {
    label: 'Troubleshoot',
    prompt: "My Next.js build is failing with a hydration error. Here's the error:",
    icon: <WrenchIcon />,
  },
];

export function ChatEmptyState({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <SparklesIcon className="w-6 h-6 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2">How can I help?</h2>
      <p className="text-gray-500 text-sm mb-8 text-center max-w-md">
        Ask me anything about your project. I can write code, explain concepts,
        debug issues, and more.
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelectPrompt(s.prompt)}
            className="flex items-center gap-3 p-4 border rounded-xl text-left hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <div className="text-gray-400">{s.icon}</div>
            <div>
              <p className="font-medium text-sm">{s.label}</p>
              <p className="text-xs text-gray-500 line-clamp-1">{s.prompt}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## LLM Instructions

```
AI UX PATTERN INSTRUCTIONS

1. BUILD A STREAMING CHAT INTERFACE:
   - Use useChat from ai/react for message state, input handling, and streaming
   - Show messages in full-width rows with background color differentiation (not bubbles)
   - Add a streaming cursor (blinking caret) at the end of in-progress responses
   - Auto-scroll to bottom during streaming, but stop if the user scrolls up
   - Show a thinking indicator (animated dots) in the gap between send and first token
   - Display tool call indicators showing what the agent is doing (with tool-specific labels)
   - Disable input and show "Stop generating" button during streaming

2. ADD MESSAGE CONTROLS:
   - Copy button on every assistant message (especially important for code responses)
   - Regenerate button (calls reload() from useChat) on the last assistant message
   - Retry button with error message when streaming fails
   - Thumbs up/down feedback on every completed assistant message
   - Optional: edit and resend for user messages (fork the conversation)

3. RENDER MARKDOWN AND CODE:
   - Use react-markdown with remark-gfm for GitHub-flavored markdown
   - Syntax highlight code blocks with react-syntax-highlighter or shiki
   - Add a copy button and language label to every code block
   - Wrap tables in overflow-x-auto containers
   - Open external links in new tabs
   - Memoize the markdown component — it re-renders on every streaming token

4. IMPLEMENT CONVERSATION MANAGEMENT:
   - Persist conversations to a database (conversation + messages tables)
   - Auto-generate conversation titles from the first user message
   - Show a sidebar with conversation history sorted by recency
   - Support creating new conversations and switching between them
   - Load conversation history when switching (pass initialMessages to useChat)

5. MAKE IT ACCESSIBLE:
   - Use role="log" with aria-live="polite" on the message container
   - Label the input with a visually hidden label
   - Support Enter to send, Shift+Enter for newline, Escape to stop
   - Announce streaming state to screen readers
   - Ensure all buttons are keyboard-focusable with clear labels
   - Respect prefers-reduced-motion for animations
```

---

## Examples

### Example 1: Complete Chat Page

Full-featured chat page with sidebar, streaming, tools, and feedback.

```typescript
// app/chat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatEmptyState } from '@/components/chat/empty-state';
import { ConversationSidebar } from '@/components/chat/conversation-sidebar';
import { ThinkingIndicator } from '@/components/chat/thinking-indicator';

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string>();
  const [initialMessages, setInitialMessages] = useState<any[]>([]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    reload,
    error,
    setMessages,
  } = useChat({
    api: '/api/chat',
    body: { conversationId },
    initialMessages,
    onFinish: async () => {
      // Save conversation after each exchange
      if (conversationId) {
        await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
        });
      }
    },
  });

  async function handleNewConversation() {
    const res = await fetch('/api/conversations', { method: 'POST' });
    const conv = await res.json();
    setConversationId(conv.id);
    setMessages([]);
    setInitialMessages([]);
  }

  async function handleSelectConversation(id: string) {
    setConversationId(id);
    const res = await fetch(`/api/conversations/${id}/messages`);
    const msgs = await res.json();
    setMessages(msgs);
    setInitialMessages(msgs);
  }

  function handleSelectPrompt(prompt: string) {
    handleInputChange({ target: { value: prompt } } as any);
  }

  return (
    <div className="flex h-screen">
      <ConversationSidebar
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />

      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          <ChatEmptyState onSelectPrompt={handleSelectPrompt} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {messages.map((m, i) => (
              <ChatMessage
                key={m.id}
                message={m}
                isStreaming={
                  isLoading && i === messages.length - 1 && m.role === 'assistant'
                }
                onRegenerate={
                  i === messages.length - 1 && m.role === 'assistant'
                    ? () => reload()
                    : undefined
                }
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <ThinkingIndicator />
            )}
          </div>
        )}

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 flex items-center gap-3">
            <span className="text-sm">Response failed</span>
            <button onClick={() => reload()} className="text-sm underline">
              Retry
            </button>
          </div>
        )}

        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onStop={stop}
        />
      </div>
    </div>
  );
}
```

### Example 2: Auto-Scrolling Chat Container

Smart auto-scroll that follows new content but respects manual scroll-up.

```typescript
// components/chat/auto-scroll.tsx
'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface AutoScrollContainerProps {
  children: React.ReactNode;
  dependencies: any[]; // Re-check scroll when these change (e.g., messages)
}

export function AutoScrollContainer({
  children,
  dependencies,
}: AutoScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const checkIsAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const threshold = 100; // px from bottom
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  }, []);

  // Track manual scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      const atBottom = checkIsAtBottom();
      setIsAtBottom(atBottom);

      if (!atBottom) {
        setUserScrolledUp(true);
      } else {
        setUserScrolledUp(false);
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIsAtBottom]);

  // Auto-scroll when content changes (only if user hasn't scrolled up)
  useEffect(() => {
    if (!userScrolledUp) {
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, dependencies);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto relative">
      {children}

      {/* "Scroll to bottom" button when user has scrolled up */}
      {userScrolledUp && (
        <button
          onClick={() => {
            containerRef.current?.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: 'smooth',
            });
            setUserScrolledUp(false);
          }}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white shadow-lg rounded-full border text-sm flex items-center gap-2 hover:bg-gray-50"
        >
          <ArrowDownIcon className="w-4 h-4" />
          Scroll to bottom
        </button>
      )}
    </div>
  );
}
```

### Example 3: Source Citations UI

Render RAG citations as clickable references alongside the AI response.

```typescript
// components/chat/citation-renderer.tsx
'use client';

import { useState } from 'react';

interface Source {
  index: number;
  title: string;
  source: string;
  sourceUrl?: string;
  score: number;
}

interface CitationRendererProps {
  content: string;
  sources: Source[];
}

export function CitationRenderer({ content, sources }: CitationRendererProps) {
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  // Replace [1], [2] etc. with clickable citation badges
  const renderedContent = content.replace(
    /\[(\d+)\]/g,
    (match, num) => {
      const sourceIndex = parseInt(num);
      const source = sources.find((s) => s.index === sourceIndex);
      if (!source) return match;
      return `<cite-ref data-index="${sourceIndex}"></cite-ref>`;
    }
  );

  return (
    <div className="space-y-4">
      {/* Response with inline citations */}
      <div
        className="prose prose-sm dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />

      {/* Source cards */}
      {sources.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-500 mb-2">
            Sources ({sources.length})
          </p>
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.index}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() =>
                  setExpandedSource(
                    expandedSource === source.index ? null : source.index
                  )
                }
              >
                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">
                  {source.index}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{source.title}</p>
                  <p className="text-xs text-gray-500">{source.source}</p>
                  {source.sourceUrl && (
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View source
                    </a>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {(source.score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Example 4: Responsive Chat Input with File Upload

A polished input component with auto-resize, file upload, and keyboard shortcuts.

```typescript
// components/chat/chat-input.tsx
'use client';

import { useRef, useCallback, useState } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStop: () => void;
  onFileUpload?: (files: FileList) => void;
  maxFiles?: number;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  onStop,
  onFileUpload,
  maxFiles = 5,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSubmit(e as any);
        // Reset height after send
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
    if (e.key === 'Escape' && isLoading) {
      onStop();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, maxFiles - files.length);
      setFiles((prev) => [...prev, ...newFiles]);
      onFileUpload?.(e.target.files);
    }
  }

  return (
    <div className="border-t bg-white dark:bg-gray-950 p-4">
      {/* File preview */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-sm"
            >
              <PaperclipIcon className="w-3.5 h-3.5 text-gray-500" />
              <span className="truncate max-w-32">{file.name}</span>
              <button
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        {/* File upload button */}
        {onFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label="Attach file"
            >
              <PaperclipIcon className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="w-full resize-none border rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[200px]"
            disabled={isLoading}
            aria-label="Type your message"
          />
          <span className="absolute bottom-1 right-2 text-xs text-gray-400">
            {isLoading ? 'Esc to stop' : 'Enter to send'}
          </span>
        </div>

        {/* Send / Stop button */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700"
            aria-label="Stop generating"
          >
            <StopIcon className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        )}
      </form>
    </div>
  );
}
```

### Example 5: Confidence and Uncertainty Display

Show users when the AI is confident vs uncertain, building trust and setting expectations.

```typescript
// components/ai/confidence-display.tsx
'use client';

interface ConfidenceDisplayProps {
  confidence: number; // 0-1
  sources?: number; // Number of sources used
  label?: string;
}

export function ConfidenceDisplay({
  confidence,
  sources,
  label,
}: ConfidenceDisplayProps) {
  const level = getConfidenceLevel(confidence);

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${level.color}`}
          title={`${(confidence * 100).toFixed(0)}% confidence`}
        />
        <span className={`font-medium ${level.textColor}`}>
          {label || level.label}
        </span>
      </div>

      {sources != null && (
        <span className="text-gray-400">
          Based on {sources} source{sources !== 1 ? 's' : ''}
        </span>
      )}

      {confidence < 0.5 && (
        <span className="text-amber-600 text-xs">
          This answer may be incomplete — consider verifying
        </span>
      )}
    </div>
  );
}

function getConfidenceLevel(confidence: number) {
  if (confidence >= 0.8)
    return { label: 'High confidence', color: 'bg-green-500', textColor: 'text-green-700' };
  if (confidence >= 0.5)
    return { label: 'Moderate confidence', color: 'bg-amber-500', textColor: 'text-amber-700' };
  return { label: 'Low confidence', color: 'bg-red-500', textColor: 'text-red-700' };
}
```

---

## Common Mistakes

### 1. Not Streaming Responses in the UI

**Wrong:** Showing a spinner for 10 seconds, then dumping the full response. Users think the app is broken.

**Fix:** Always use `useChat` or `useCompletion` with a streaming endpoint. Show tokens as they arrive. The perceived latency drops from "did it crash?" to "it's thinking."

### 2. Chat Bubbles for AI Responses

**Wrong:** Using WhatsApp-style chat bubbles that limit content width to 60% of the screen.

**Fix:** Use full-width message rows. AI responses contain code blocks, tables, and long paragraphs that need horizontal space. Bubbles make code unreadable and waste screen real estate. Distinguish messages with background color, not alignment.

### 3. No Loading State Between Send and First Token

**Wrong:** User sends a message and nothing happens for 2 seconds. No indicator, no feedback.

**Fix:** Show the user's message immediately (optimistic). Show a thinking indicator (animated dots or "Thinking...") in the assistant's message area. Replace the thinking indicator with streaming content when tokens start arriving.

### 4. No Copy Button on Code Blocks

**Wrong:** Users manually select and copy code from AI responses — fighting with line numbers, selection quirks, and markdown formatting.

**Fix:** Add a copy button to every code block. This is the most-used feature in any AI coding interface. Make it visible on hover with a "Copied!" confirmation state.

### 5. Broken Auto-Scroll

**Wrong:** Either: (a) never auto-scrolling, so users manually scroll for every response, or (b) always auto-scrolling, yanking users back to the bottom when they are reading earlier messages.

**Fix:** Auto-scroll when the user is at the bottom (within a threshold). Stop auto-scrolling when the user manually scrolls up. Show a "Scroll to bottom" button when they are not at the bottom. Resume auto-scrolling when they click it or scroll back down.

### 6. No Error Recovery UI

**Wrong:** Stream fails mid-response and the UI shows a partial message with no way to retry or recover.

**Fix:** Detect stream errors via `useChat`'s `error` state. Show an error banner with a clear retry button (`reload()`). If the response was partially received, keep the partial text visible (do not delete it) and mark it as incomplete.

### 7. No Feedback Mechanism

**Wrong:** Deploying an AI feature with no way for users to signal when responses are good or bad.

**Fix:** Add thumbs up/down on every assistant message. On thumbs down, show an optional text input for details. Store feedback in the database. Use it to build evaluation datasets, track quality over time, and prioritize improvements.

### 8. Inaccessible Chat Interface

**Wrong:** Chat that only works with a mouse. No keyboard shortcuts, no screen reader support, no focus management.

**Fix:** Use semantic HTML (`role="log"`, `aria-live`, `<label>`). Support keyboard navigation (Enter to send, Escape to stop). Announce new messages and loading states to screen readers. Test with VoiceOver/NVDA.

### 9. No Empty State or Onboarding

**Wrong:** New users land on a blank chat screen with no guidance. They don't know what the AI can do or how to start.

**Fix:** Show a welcoming empty state with 4-6 suggested prompts as clickable cards. Group them by task type (explain, write code, analyze, troubleshoot). Make prompts specific to your product's use case. Clicking a prompt should populate the input.

### 10. Ignoring Mobile

**Wrong:** Chat interface works on desktop but breaks on mobile — keyboard covers the input, messages don't scroll properly, code blocks overflow.

**Fix:** Use `dvh` units for full-height layouts. Keep the input fixed at the bottom with proper `safe-area-inset-bottom` for iOS. Ensure code blocks scroll horizontally on narrow screens. Test on actual devices, not just responsive mode.

---

> **See also:** [LLM-Patterns](../LLM-Patterns/llm-patterns.md) | [RAG](../RAG/rag.md) | [AI-Agents](../AI-Agents/ai-agents.md) | [Frontend/Component-Patterns](../../Frontend/Component-Patterns/component-patterns.md) | [Frontend/React-Fundamentals](../../Frontend/React-Fundamentals/react-fundamentals.md) | [UIUX/Accessibility](../../UIUX/Accessibility/accessibility.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
