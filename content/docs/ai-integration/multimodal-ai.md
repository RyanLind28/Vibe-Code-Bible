---
title: Multimodal AI
description: Image generation, vision analysis, speech-to-text, text-to-speech, document OCR, video frame analysis, audio transcription pipelines, image-to-structured-data, and file processing — building AI features beyond text.
---
# Multimodal AI

> Image generation, vision analysis, speech-to-text, text-to-speech, document OCR, video frame analysis, audio transcription pipelines, image-to-structured-data, and file processing — building AI features beyond text.

---

## Principles

### 1. The Multimodal Landscape

Modern LLMs process and generate multiple media types. "Multimodal AI" means working with images, audio, video, and documents — not just text. These capabilities unlock features that were impossible or prohibitively expensive a year ago.

**What is available today:**

| Capability | Input/Output | Best Models | Use Cases |
|-----------|-------------|-------------|-----------|
| Vision (image understanding) | Image → Text | Claude Sonnet 4, GPT-4o, Gemini 2.0 | Image analysis, OCR, diagram reading |
| Image generation | Text → Image | DALL-E 3, Stability AI, Flux | Product mockups, thumbnails, illustrations |
| Speech-to-text | Audio → Text | OpenAI Whisper, Deepgram | Transcription, voice commands, meeting notes |
| Text-to-speech | Text → Audio | OpenAI TTS, ElevenLabs | Narration, accessibility, voice assistants |
| Document understanding | PDF/Doc → Text | Claude Sonnet 4, Gemini 2.0 | Invoice processing, contract analysis |
| Video understanding | Video → Text | Gemini 2.0, frame extraction + vision | Content moderation, video summarization |

**Framework choice:** Use the Vercel AI SDK for vision (it handles multi-modal messages natively). Use provider SDKs directly for image generation, speech, and TTS — the AI SDK does not abstract these yet.

### 2. Vision and Image Understanding

Vision models analyze images: describe content, extract text, identify objects, read diagrams, and answer questions about what they see. The Vercel AI SDK handles vision through multi-part messages.

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Analyze an image from a URL
const { text } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this image in detail. What objects are visible? What is the setting?' },
        { type: 'image', image: new URL('https://example.com/photo.jpg') },
      ],
    },
  ],
});

// Analyze an uploaded image (Buffer)
const { text: analysis } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract all visible text from this receipt. Return the merchant name, items, prices, and total.' },
        {
          type: 'image',
          image: Buffer.from(await file.arrayBuffer()),
          mimeType: 'image/jpeg',
        },
      ],
    },
  ],
});
```

**Vision capabilities by model:**

| Model | Max Images | Max Image Size | OCR Quality | Diagram Understanding |
|-------|-----------|---------------|-------------|----------------------|
| Claude Sonnet 4 | 20 per message | 5MB | Excellent | Excellent |
| GPT-4o | 10 per message | 20MB | Excellent | Good |
| Gemini 2.0 Flash | 16 per message | 20MB | Good | Good |

**Best practices:**

- Resize images before sending — full-resolution 4K photos waste tokens. Resize to 1024px on the longest edge for most use cases.
- Specify what you want in the text prompt — "extract text" produces different output than "describe the scene."
- For multi-page documents, send each page as a separate image in one message.
- Use structured output (`generateObject`) for extraction tasks — get JSON, not prose.

### 3. Image Generation

Image generation creates images from text descriptions. DALL-E 3 is the most accessible option; Stability AI and Flux offer more control.

```typescript
// lib/ai/image-generation.ts
import OpenAI from 'openai';

const openai = new OpenAI();

interface GenerateImageOptions {
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export async function generateImage(options: GenerateImageOptions) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: options.prompt,
    n: 1,
    size: options.size || '1024x1024',
    quality: options.quality || 'standard',
    style: options.style || 'natural',
    response_format: 'url', // or 'b64_json' for base64
  });

  return {
    url: response.data[0].url!,
    revisedPrompt: response.data[0].revised_prompt, // DALL-E 3 rewrites your prompt
  };
}
```

```typescript
// app/api/generate-image/route.ts
import { generateImage } from '@/lib/ai/image-generation';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const ImageRequest = z.object({
  prompt: z.string().min(1).max(1000),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).default('natural'),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const data = ImageRequest.parse(body);

  // Content safety — basic prompt filtering
  const blockedTerms = ['nude', 'violence', 'gore', 'weapon'];
  const promptLower = data.prompt.toLowerCase();
  if (blockedTerms.some((term) => promptLower.includes(term))) {
    return Response.json(
      { error: 'Prompt contains prohibited content' },
      { status: 422 }
    );
  }

  const result = await generateImage(data);

  // Log usage for cost tracking ($0.04 per standard, $0.08 per HD)
  const cost = data.quality === 'hd' ? 0.08 : 0.04;
  await db.aiCostLog.create({
    data: {
      userId: session.user.id,
      model: 'dall-e-3',
      promptTokens: 0,
      completionTokens: 0,
      cost,
      endpoint: '/api/generate-image',
    },
  });

  return Response.json(result);
}
```

**Image generation pricing:**

| Model | Size | Quality | Cost |
|-------|------|---------|------|
| DALL-E 3 | 1024x1024 | Standard | $0.04 |
| DALL-E 3 | 1024x1024 | HD | $0.08 |
| DALL-E 3 | 1024x1792 / 1792x1024 | Standard | $0.08 |
| DALL-E 3 | 1024x1792 / 1792x1024 | HD | $0.12 |

### 4. Speech-to-Text (Transcription)

Convert audio to text using OpenAI Whisper. Use cases: meeting transcription, voice notes, podcast processing, voice commands, accessibility.

```typescript
// lib/ai/speech-to-text.ts
import OpenAI from 'openai';
import { readFile } from 'fs/promises';

const openai = new OpenAI();

interface TranscriptionOptions {
  language?: string; // ISO 639-1 code, e.g., 'en', 'es', 'fr'
  prompt?: string; // Hint for domain-specific terms
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  timestampGranularity?: 'word' | 'segment';
}

export async function transcribeAudio(
  audioFile: File | Buffer,
  options: TranscriptionOptions = {}
) {
  const file =
    audioFile instanceof Buffer
      ? new File([audioFile], 'audio.wav', { type: 'audio/wav' })
      : audioFile;

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: options.language,
    prompt: options.prompt, // Helps with domain terms, e.g., "Vercel, Next.js, Prisma"
    response_format: options.responseFormat || 'verbose_json',
    timestamp_granularities: options.timestampGranularity
      ? [options.timestampGranularity]
      : undefined,
  });

  return transcription;
}

// Transcribe with word-level timestamps
export async function transcribeWithTimestamps(
  audioFile: File | Buffer
): Promise<Array<{ word: string; start: number; end: number }>> {
  const result = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file:
      audioFile instanceof Buffer
        ? new File([audioFile], 'audio.wav', { type: 'audio/wav' })
        : audioFile,
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
  });

  return (result as any).words || [];
}
```

```typescript
// app/api/transcribe/route.ts
import { transcribeAudio } from '@/lib/ai/speech-to-text';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;
  const language = formData.get('language') as string | null;

  if (!audioFile) {
    return Response.json({ error: 'No audio file provided' }, { status: 400 });
  }

  // Validate file size (Whisper limit: 25MB)
  if (audioFile.size > 25 * 1024 * 1024) {
    return Response.json(
      { error: 'File too large. Maximum 25MB.' },
      { status: 400 }
    );
  }

  const result = await transcribeAudio(audioFile, {
    language: language || undefined,
    responseFormat: 'verbose_json',
  });

  return Response.json({
    text: result.text,
    duration: (result as any).duration,
    language: (result as any).language,
    segments: (result as any).segments,
  });
}
```

**Supported audio formats:** mp3, mp4, mpeg, mpga, m4a, wav, webm
**Max file size:** 25MB
**Cost:** $0.006 per minute of audio

For files over 25MB, split them into chunks:

```typescript
// Split audio with ffmpeg (server-side)
import { execSync } from 'child_process';

function splitAudio(inputPath: string, chunkDurationSec: number = 600): string[] {
  const outputPattern = `/tmp/chunk-%03d.mp3`;
  execSync(
    `ffmpeg -i "${inputPath}" -f segment -segment_time ${chunkDurationSec} -c copy "${outputPattern}"`
  );

  // Return list of chunk file paths
  const chunks: string[] = [];
  for (let i = 0; ; i++) {
    const chunkPath = `/tmp/chunk-${String(i).padStart(3, '0')}.mp3`;
    try {
      readFileSync(chunkPath);
      chunks.push(chunkPath);
    } catch {
      break;
    }
  }

  return chunks;
}
```

### 5. Text-to-Speech

Convert text to natural-sounding speech. Use cases: article narration, accessibility, voice assistants, notification audio.

```typescript
// lib/ai/text-to-speech.ts
import OpenAI from 'openai';

const openai = new OpenAI();

type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface TTSOptions {
  voice?: Voice;
  speed?: number; // 0.25 to 4.0
  model?: 'tts-1' | 'tts-1-hd';
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<ArrayBuffer> {
  const response = await openai.audio.speech.create({
    model: options.model || 'tts-1',
    voice: options.voice || 'nova',
    input: text,
    speed: options.speed || 1.0,
    response_format: options.responseFormat || 'mp3',
  });

  return response.arrayBuffer();
}
```

```typescript
// app/api/tts/route.ts
import { textToSpeech } from '@/lib/ai/text-to-speech';
import { z } from 'zod';

const TTSRequest = z.object({
  text: z.string().min(1).max(4096), // Max 4096 chars per request
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('nova'),
  speed: z.number().min(0.25).max(4.0).default(1.0),
});

export async function POST(req: Request) {
  const body = await req.json();
  const data = TTSRequest.parse(body);

  const audioBuffer = await textToSpeech(data.text, {
    voice: data.voice,
    speed: data.speed,
  });

  return new Response(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength.toString(),
    },
  });
}
```

**Voice characteristics:**

| Voice | Character | Best For |
|-------|-----------|----------|
| alloy | Neutral, balanced | Default, general purpose |
| echo | Warm, conversational | Podcasts, narration |
| fable | British, authoritative | Education, documentation |
| onyx | Deep, confident | Announcements, professional |
| nova | Friendly, clear | Assistants, customer support |
| shimmer | Gentle, expressive | Stories, emotional content |

**Pricing:** tts-1: $15/1M characters, tts-1-hd: $30/1M characters

### 6. Document Processing and OCR

Extract structured data from PDFs, invoices, receipts, and scanned documents using vision models.

```typescript
// lib/ai/document-processing.ts
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Invoice extraction schema
const InvoiceData = z.object({
  invoiceNumber: z.string(),
  date: z.string().describe('ISO date format'),
  vendor: z.object({
    name: z.string(),
    address: z.string().optional(),
  }),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    })
  ),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string().default('USD'),
});

export async function extractInvoice(
  imageBuffer: Buffer,
  mimeType: string
): Promise<z.infer<typeof InvoiceData>> {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: InvoiceData,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all invoice data from this document. Be precise with numbers.',
          },
          {
            type: 'image',
            image: imageBuffer,
            mimeType: mimeType as any,
          },
        ],
      },
    ],
  });

  return object;
}

// Business card extraction
const BusinessCard = z.object({
  name: z.string(),
  title: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
});

export async function extractBusinessCard(
  imageBuffer: Buffer,
  mimeType: string
): Promise<z.infer<typeof BusinessCard>> {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: BusinessCard,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract contact information from this business card.',
          },
          { type: 'image', image: imageBuffer, mimeType: mimeType as any },
        ],
      },
    ],
  });

  return object;
}

// Multi-page PDF processing
export async function processPDF(
  pages: Buffer[], // Each page rendered as an image
  prompt: string
): Promise<string> {
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: Buffer; mimeType: string }> = [
    { type: 'text', text: prompt },
  ];

  for (const page of pages) {
    content.push({
      type: 'image',
      image: page,
      mimeType: 'image/png',
    });
  }

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages: [{ role: 'user', content }],
    maxTokens: 4000,
  });

  return text;
}
```

### 7. Audio Transcription Pipelines

For production transcription (meetings, podcasts, customer calls), you need more than raw Whisper — you need speaker diarization, chunking, and post-processing.

```typescript
// lib/ai/transcription-pipeline.ts
import { transcribeAudio } from './speech-to-text';
import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const MeetingNotes = z.object({
  title: z.string(),
  participants: z.array(z.string()),
  summary: z.string().max(500),
  keyDecisions: z.array(z.string()),
  actionItems: z.array(
    z.object({
      assignee: z.string(),
      task: z.string(),
      deadline: z.string().optional(),
    })
  ),
  topics: z.array(
    z.object({
      topic: z.string(),
      summary: z.string(),
      startTime: z.string().optional(),
    })
  ),
});

export async function processMeetingRecording(
  audioFile: File
): Promise<z.infer<typeof MeetingNotes>> {
  // Step 1: Transcribe
  const transcription = await transcribeAudio(audioFile, {
    responseFormat: 'verbose_json',
    prompt: 'Meeting recording. Speakers may include team members discussing project updates, technical decisions, and action items.',
  });

  const fullText = transcription.text;

  // Step 2: Generate structured meeting notes
  const { object: notes } = await generateObject({
    model: openai('gpt-4o'),
    schema: MeetingNotes,
    prompt: `Analyze this meeting transcript and create structured notes.

TRANSCRIPT:
${fullText}

Extract:
- A concise title for the meeting
- Participant names (infer from context if not explicit)
- A brief summary
- Key decisions made
- Action items with assignees
- Main topics discussed`,
  });

  return notes;
}

// Podcast episode processing
const PodcastSummary = z.object({
  title: z.string(),
  hosts: z.array(z.string()),
  guests: z.array(z.string()),
  summary: z.string(),
  chapters: z.array(
    z.object({
      title: z.string(),
      startTime: z.string().describe('MM:SS format'),
      summary: z.string(),
    })
  ),
  keyQuotes: z.array(
    z.object({
      speaker: z.string(),
      quote: z.string(),
      timestamp: z.string().optional(),
    })
  ),
  tags: z.array(z.string()).max(10),
});

export async function processPodcast(
  audioFile: File
): Promise<z.infer<typeof PodcastSummary>> {
  const transcription = await transcribeAudio(audioFile, {
    responseFormat: 'verbose_json',
  });

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: PodcastSummary,
    prompt: `Analyze this podcast transcript and create a structured summary with chapters.

TRANSCRIPT:
${transcription.text}`,
  });

  return object;
}
```

### 8. Batch Image Processing

Process multiple images at scale — product catalogs, content moderation, document digitization.

```typescript
// lib/ai/batch-image.ts
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const ProductData = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  colors: z.array(z.string()),
  estimatedPrice: z.string().optional(),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor']).optional(),
  tags: z.array(z.string()).max(10),
});

interface BatchResult<T> {
  total: number;
  processed: number;
  failed: number;
  results: Array<{
    id: string;
    data?: T;
    error?: string;
  }>;
}

export async function batchProcessImages(
  images: Array<{
    id: string;
    buffer: Buffer;
    mimeType: string;
  }>,
  options: {
    concurrency?: number;
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<BatchResult<z.infer<typeof ProductData>>> {
  const { concurrency = 3 } = options;
  const results: BatchResult<z.infer<typeof ProductData>>['results'] = [];

  // Process in batches with concurrency limit
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (image) => {
        const { object } = await generateObject({
          model: anthropic('claude-sonnet-4-20250514'),
          schema: ProductData,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this product image. Extract product details for an e-commerce listing.',
                },
                {
                  type: 'image',
                  image: image.buffer,
                  mimeType: image.mimeType as any,
                },
              ],
            },
          ],
        });

        return { id: image.id, data: object };
      })
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          id: batch[j].id,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        });
      }
    }

    options.onProgress?.(Math.min(i + concurrency, images.length), images.length);
  }

  return {
    total: images.length,
    processed: results.filter((r) => r.data).length,
    failed: results.filter((r) => r.error).length,
    results,
  };
}
```

---

## LLM Instructions

```
MULTIMODAL AI INSTRUCTIONS

1. IMPLEMENT IMAGE ANALYSIS:
   - Use the AI SDK with vision-capable models (Claude Sonnet 4, GPT-4o, Gemini 2.0)
   - Send images as multi-part messages with { type: 'image', image: buffer, mimeType }
   - Resize images to 1024px max before sending (saves tokens and cost)
   - Use generateObject with Zod schema for structured extraction (OCR, product data)
   - Use generateText for open-ended description and analysis
   - Always validate file type and size before processing

2. ADD IMAGE GENERATION:
   - Use OpenAI SDK directly for DALL-E 3 (not through AI SDK)
   - Accept prompt, size, quality, and style parameters
   - Filter prompts for prohibited content before sending
   - Store generated image URLs or download and store in your file storage
   - Track generation cost ($0.04-$0.12 per image depending on size and quality)
   - DALL-E 3 rewrites prompts — return the revised_prompt to the user

3. IMPLEMENT SPEECH-TO-TEXT:
   - Use OpenAI Whisper API via the OpenAI SDK
   - Accept audio files up to 25MB (mp3, wav, m4a, webm, etc.)
   - For larger files, split with ffmpeg before processing
   - Use the prompt parameter to hint domain-specific terminology
   - Request verbose_json format for timestamps and segments
   - Post-process transcripts with an LLM for meeting notes, summaries, or action items

4. ADD TEXT-TO-SPEECH:
   - Use OpenAI TTS API for natural-sounding speech
   - Choose appropriate voice for the use case (nova for assistants, echo for narration)
   - Return audio as a streaming Response with correct Content-Type headers
   - Respect the 4096 character input limit — chunk longer texts
   - Cache generated audio for repeated content (same text + same voice = same audio)

5. BUILD DOCUMENT PROCESSING:
   - Convert PDFs to images (one per page) using pdf-to-img or similar
   - Send pages as multi-part messages to vision models
   - Define Zod schemas for the specific document type (invoice, receipt, contract)
   - For multi-page documents, process pages in parallel with concurrency limits
   - Validate extracted data against known patterns (totals should sum, dates should parse)
```

---

## Examples

### Example 1: Image Upload and Analysis Component

A complete upload-to-analysis flow with drag-and-drop, preview, and structured results.

```typescript
// app/api/analyze-product/route.ts
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import sharp from 'sharp';

const ProductAnalysis = z.object({
  name: z.string(),
  description: z.string().max(300),
  category: z.string(),
  brand: z.string().optional(),
  colors: z.array(z.string()).max(5),
  material: z.string().optional(),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor']),
  suggestedTags: z.array(z.string()).max(10),
  estimatedRetailPrice: z.string().optional(),
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('image') as File;

  if (!file) {
    return Response.json({ error: 'No image provided' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' },
      { status: 400 }
    );
  }

  // Resize image to save tokens (max 1024px on longest edge)
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const resizedBuffer = await sharp(rawBuffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: ProductAnalysis,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this product image for an e-commerce listing. Extract all visible details.',
          },
          {
            type: 'image',
            image: resizedBuffer,
            mimeType: 'image/jpeg',
          },
        ],
      },
    ],
  });

  return Response.json(object);
}
```

```typescript
// components/image-analyzer.tsx
'use client';

import { useState, useCallback } from 'react';

export function ImageAnalyzer() {
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Analyze
    setIsAnalyzing(true);
    setAnalysis(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/analyze-product', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setAnalysis(data);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6">
      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
        ) : (
          <div>
            <p className="text-gray-500">Drop an image here or click to upload</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer">
              Choose file
            </label>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {isAnalyzing && <p className="text-gray-500 animate-pulse">Analyzing image...</p>}

        {analysis && (
          <>
            <h3 className="text-lg font-semibold">{analysis.name}</h3>
            <p className="text-gray-600">{analysis.description}</p>
            <div className="flex flex-wrap gap-2">
              {analysis.suggestedTags.map((tag: string) => (
                <span key={tag} className="px-2 py-1 bg-gray-100 rounded text-sm">{tag}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Category:</span> {analysis.category}</div>
              <div><span className="text-gray-500">Condition:</span> {analysis.condition}</div>
              <div><span className="text-gray-500">Colors:</span> {analysis.colors.join(', ')}</div>
              {analysis.brand && <div><span className="text-gray-500">Brand:</span> {analysis.brand}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

### Example 2: Voice Note Recorder and Transcriber

Record audio in the browser, send to Whisper, and display the transcript.

```typescript
// components/voice-recorder.tsx
'use client';

import { useState, useRef } from 'react';

export function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
    });

    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());

      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      await transcribe(audioBlob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function transcribe(audioBlob: Blob) {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setTranscript(data.text);
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-6 py-3 rounded-full font-medium ${
          isRecording
            ? 'bg-red-600 text-white animate-pulse'
            : 'bg-blue-600 text-white'
        }`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {isTranscribing && (
        <p className="text-gray-500 animate-pulse">Transcribing...</p>
      )}

      {transcript && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Transcript:</p>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Content Moderation Pipeline

Moderate user-uploaded images for safety before publishing.

```typescript
// lib/ai/moderation.ts
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const ModerationResult = z.object({
  safe: z.boolean(),
  categories: z.object({
    nsfw: z.boolean(),
    violence: z.boolean(),
    hate: z.boolean(),
    selfHarm: z.boolean(),
    illegal: z.boolean(),
  }),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(200),
});

export async function moderateImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<z.infer<typeof ModerationResult>> {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    temperature: 0,
    schema: ModerationResult,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Evaluate this image for content safety.
Check for: NSFW content, violence/gore, hate symbols, self-harm imagery, illegal activity.
Be conservative — flag anything borderline.`,
          },
          { type: 'image', image: imageBuffer, mimeType: mimeType as any },
        ],
      },
    ],
  });

  return object;
}

// Moderate text with OpenAI moderation endpoint (free)
export async function moderateText(
  text: string
): Promise<{ flagged: boolean; categories: Record<string, boolean> }> {
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: text }),
  });

  const data = await response.json();
  const result = data.results[0];

  return {
    flagged: result.flagged,
    categories: result.categories,
  };
}
```

---

## Common Mistakes

### 1. Sending Full-Resolution Images

**Wrong:** Sending a 4000x3000 pixel, 8MB image to a vision model. Wastes tokens and money.

**Fix:** Resize images to 1024px on the longest edge before sending. Use `sharp` for server-side resizing. Compress to JPEG at 85% quality. This cuts token usage by 60-80% with negligible quality loss for most tasks.

### 2. No File Validation

**Wrong:** Accepting any uploaded file and passing it to the AI API. Could be an executable, a 500MB video, or a corrupt file.

**Fix:** Validate file type (whitelist allowed MIME types), file size (enforce limits), and image dimensions. Check the magic bytes, not just the extension. Reject files that exceed provider limits before making the API call.

### 3. Blocking on Large File Processing

**Wrong:** Processing a 1-hour podcast or 50-page PDF in a synchronous request handler. The request times out.

**Fix:** For files that take more than 30 seconds to process, use a background job queue. Accept the upload, return a job ID, and process asynchronously. Notify the user when processing is complete via WebSocket, polling, or email.

### 4. No Content Moderation

**Wrong:** Allowing users to upload images and generate content without any safety checks.

**Fix:** Moderate user-uploaded images before processing or publishing. Use the OpenAI moderation endpoint (free) for text. Use vision models for image moderation. Block or flag content that violates your policies. Log moderation decisions for audit.

### 5. Ignoring Provider Limits

**Wrong:** Trying to transcribe a 2-hour audio file with Whisper (25MB limit), or sending 50 images in a single vision request.

**Fix:** Know the limits: Whisper max 25MB, DALL-E 3 max 4096 chars prompt, vision models vary on image count. Split large files into chunks. Batch images across multiple requests. Build retry logic for rate limit errors.

### 6. No Cost Tracking for Generation

**Wrong:** Users generating unlimited DALL-E images at $0.04-$0.12 each with no usage tracking.

**Fix:** Track every generation with its cost. Set per-user daily/monthly limits. Show remaining quota in the UI. Image generation costs add up fast — 100 images/day = $4-$12/day per user.

### 7. Synchronous TTS for Long Text

**Wrong:** Generating speech for a 10,000-word article in a single synchronous request.

**Fix:** OpenAI TTS has a 4096 character limit per request. Split long texts into chunks at sentence boundaries. Generate audio for each chunk. Concatenate the audio files server-side. Stream the first chunk to the user while processing the rest.

### 8. Using Vision When OCR Is Enough

**Wrong:** Sending every document to a vision model when the text is machine-readable.

**Fix:** Try text extraction first (`pdf-parse` for PDFs, `readability` for HTML). Only fall back to vision when the text is embedded in images (scanned documents, screenshots, handwritten notes). Text extraction is free, fast, and more accurate for machine-readable content.

### 9. No Caching for Repeated Content

**Wrong:** Re-generating the same TTS audio every time a user visits a page. Re-analyzing the same product image on every request.

**Fix:** Cache results by content hash. For TTS: hash the text + voice + speed to create a cache key. Store in your file storage (S3, R2). For image analysis: hash the image and cache the structured output. Multimodal operations are slow and expensive — caching saves both.

### 10. Exposing Raw API Errors to Users

**Wrong:** Showing "Error: content_policy_violation" or "File too large" error codes from the provider API directly in the UI.

**Fix:** Map provider errors to user-friendly messages. "The image was flagged by our safety system" beats "content_policy_violation." "Please upload a smaller file (max 10MB)" beats "413 Payload Too Large." Handle each error type with a specific, helpful message.

---

> **See also:** [LLM-Patterns](../LLM-Patterns/llm-patterns.md) | [AI-UX-Patterns](../AI-UX-Patterns/ai-ux-patterns.md) | [AI-Workflows](../AI-Workflows/ai-workflows.md) | [Backend/Background-Jobs](../../Backend/Background-Jobs/background-jobs.md) | [Security/Backend-Security](../../Security/Backend-Security/backend-security.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
