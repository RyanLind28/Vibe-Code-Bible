---
title: "File Storage & Uploads"
description: Presigned URLs, type-safe uploads, S3-compatible object storage, CDN delivery, access control, and image optimization -- storing and serving user-generated content in Next.js applications.
---
# File Storage & Uploads

> Presigned URLs, type-safe uploads, S3-compatible object storage, CDN delivery, access control, and image optimization -- storing and serving user-generated content in Next.js applications.

---

## When to Use What

| Factor | **Uploadthing** | **Cloudflare R2** | **AWS S3** | **Supabase Storage** |
|--------|-----------------|-------------------|------------|---------------------|
| **Free tier** | 2 GB storage, 2 GB transfer/mo | 10 GB storage, 10M class B ops/mo | 5 GB (12 months) | 1 GB storage, 2 GB transfer/mo |
| **Storage pricing** | $10/mo for 100 GB | $0.015/GB/mo | $0.023/GB/mo | $0.021/GB/mo |
| **Egress fees** | Included in plan | **$0 (free forever)** | $0.09/GB (expensive) | $0.09/GB |
| **S3-compatible** | No (proprietary API) | Yes | Yes (the original) | No (proprietary API) |
| **CDN included** | Yes (via UT CDN) | Yes (via R2 custom domains) | No (add CloudFront) | No (add CDN separately) |
| **Auth integration** | Middleware-based | BYO (any auth) | IAM + Cognito | Supabase Auth + RLS |
| **Upload component** | Yes (React components) | No (build your own) | No (build your own) | No (build your own) |
| **Presigned URLs** | Handled internally | Yes (S3-compatible) | Yes | Yes (createSignedUrl) |
| **Image transforms** | No | Yes (via Cloudflare Images) | No (add Lambda@Edge) | Yes (built-in) |
| **Best for** | Simple Next.js uploads | Cost-effective storage at scale | Enterprise, AWS ecosystem | Supabase-native projects |
| **Complexity** | Very low | Medium | High | Low (within Supabase) |

**Opinionated recommendations:**

- **Starting a new Next.js project with simple uploads?** Use **Uploadthing**. You will have file uploads working in under 15 minutes with zero infrastructure to manage.
- **Need cost-effective storage at scale?** Use **Cloudflare R2**. Zero egress fees will save you thousands compared to S3 as your traffic grows.
- **Already in the AWS ecosystem?** Use **AWS S3**. It is the most battle-tested object storage on the planet with the widest tooling support.
- **Already using Supabase?** Use **Supabase Storage**. It integrates seamlessly with Supabase Auth and Row Level Security.
- **Handling 100+ GB of downloads per month?** Avoid AWS S3 unless you put CloudFront in front of it. R2's zero egress fees make it the clear winner for high-bandwidth use cases.

---

## Principles

### 1. The Presigned URL Pattern (Never Proxy Through Your Server)

The single most important principle in file storage: **never stream file data through your application server**. Use presigned URLs to let clients upload and download directly to/from the storage provider.

**Why this matters:**
- Serverless functions have a 4.5 MB request body limit on Vercel (and similar limits elsewhere).
- Proxying a 50 MB video through your server means your function runs for the entire upload duration, consuming compute and memory.
- Presigned URLs let your server do what it is good at (authorization, validation, generating tokens) and let the storage provider do what it is good at (handling large binary transfers).

**The pattern:**

```
Client                  Your Server              Storage Provider
  |                         |                         |
  |-- 1. "I want to upload" -->|                      |
  |                         |-- 2. Check auth ------->|
  |                         |-- 3. Generate presigned URL
  |<-- 4. Return URL -------|                         |
  |-- 5. Upload directly --------------------------->|
  |                         |                         |
  |-- 6. "Upload complete" -->|                      |
  |                         |-- 7. Save metadata ---->|
  |<-- 8. Confirm ----------|                         |
```

**Step 1-4:** Your server validates the user, checks permissions, validates file type/size, and generates a presigned URL. This takes milliseconds and minimal compute.

**Step 5:** The client uploads directly to S3/R2/Supabase using the presigned URL. Your server is not involved. The presigned URL expires after a short window (typically 5-15 minutes).

**Step 6-8:** After upload, the client notifies your server, which stores metadata (file URL, size, owner, etc.) in your database.

```typescript
// lib/storage/presigned-url.ts -- Generic presigned URL pattern
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

export async function generateUploadUrl(
  key: string,
  contentType: string,
  maxSizeBytes: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: contentType,
    ContentLength: maxSizeBytes,
  });

  // URL expires in 10 minutes -- enough time to upload, short enough to limit abuse
  return getSignedUrl(s3, command, { expiresIn: 600 });
}
```

### 2. File Validation: Client AND Server (Trust Nothing)

File validation must happen in two places. The client-side check is for UX (instant feedback). The server-side check is for security (the client-side check can be bypassed trivially).

**Client-side validation (UX only):**

```typescript
// lib/validation/file-validation.ts
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function validateFile(
  file: File,
  allowedTypes: readonly string[],
  maxSize: number,
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Accepted: ${allowedTypes.join(", ")}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the ${(maxSize / 1024 / 1024).toFixed(0)} MB limit.`,
    };
  }

  return { valid: true };
}
```

**Server-side validation (security):**

```typescript
// lib/validation/server-file-validation.ts
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "./file-validation";

export function validateUploadRequest(
  contentType: string,
  contentLength: number,
  allowedTypes: readonly string[],
  maxSize: number,
): { valid: boolean; error?: string } {
  // Check MIME type
  if (!allowedTypes.includes(contentType)) {
    return { valid: false, error: "File type not allowed" };
  }

  // Check declared size
  if (contentLength > maxSize) {
    return { valid: false, error: "File too large" };
  }

  // Additional: check file extension matches MIME type
  // Prevents someone declaring image/jpeg but uploading .exe
  return { valid: true };
}

// After upload: validate the actual file content (magic bytes)
export async function validateFileContent(
  buffer: ArrayBuffer,
): Promise<{ valid: boolean; detectedType: string }> {
  const bytes = new Uint8Array(buffer.slice(0, 8));

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { valid: true, detectedType: "image/png" };
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return { valid: true, detectedType: "image/webp" };
  }

  // PDF: 25 50 44 46
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { valid: true, detectedType: "application/pdf" };
  }

  return { valid: false, detectedType: "unknown" };
}
```

### 3. Image Optimization Pipeline

User-uploaded images should never be served as-is. Build an optimization pipeline that converts, resizes, and caches images.

**The pipeline:**
1. **Accept upload** -- validate type and size.
2. **Process** -- convert to WebP/AVIF, generate multiple sizes (thumbnail, medium, large, original).
3. **Store** -- upload processed variants to object storage.
4. **Serve** -- deliver via CDN with appropriate cache headers.

```typescript
// lib/images/optimize.ts
import sharp from "sharp";

export interface ImageVariant {
  suffix: string;
  width: number;
  quality: number;
}

export const IMAGE_VARIANTS: ImageVariant[] = [
  { suffix: "thumb", width: 150, quality: 70 },
  { suffix: "sm", width: 400, quality: 75 },
  { suffix: "md", width: 800, quality: 80 },
  { suffix: "lg", width: 1200, quality: 80 },
  { suffix: "xl", width: 1920, quality: 85 },
];

export async function processImage(
  buffer: Buffer,
  key: string,
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>();

  for (const variant of IMAGE_VARIANTS) {
    const processed = await sharp(buffer)
      .resize(variant.width, undefined, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: variant.quality })
      .toBuffer();

    const variantKey = key.replace(
      /\.[^.]+$/,
      `-${variant.suffix}.webp`,
    );
    results.set(variantKey, processed);
  }

  // Also store the original (still convert to webp for consistency)
  const original = await sharp(buffer)
    .webp({ quality: 90 })
    .toBuffer();
  const originalKey = key.replace(/\.[^.]+$/, "-original.webp");
  results.set(originalKey, original);

  return results;
}
```

**Note:** Image processing is CPU-intensive. Run this in a background job (not in an API route handler). See the [Background-Jobs](../../Backend/Background-Jobs/background-jobs.md) guide. For serverless environments, consider using Cloudflare Images or Supabase's built-in image transformations instead of processing server-side.

### 4. Access Control Patterns

Files need the same access control as your API endpoints. There are three common patterns:

**Pattern A: Public files (no auth needed)**
- Profile pictures, product images, blog post covers.
- Serve via CDN with long cache TTLs.
- No presigned URLs needed -- use a public bucket or public URL prefix.

**Pattern B: Authenticated files (user must be logged in)**
- User documents, private uploads, internal files.
- Generate short-lived presigned download URLs (5-15 minutes).
- Never expose the raw storage URL to the client.

**Pattern C: Role-based files (specific users only)**
- Team documents, tenant-specific files.
- Check ownership/membership before generating presigned URLs.
- Use storage-level policies (Supabase RLS, S3 bucket policies) as a second layer of defense.

```typescript
// app/api/files/[fileId]/url/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateDownloadUrl } from "@/lib/storage/presigned-url";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { team: { include: { members: true } } },
  });

  if (!file) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Check: user owns the file OR is a member of the file's team
  const isOwner = file.uploadedById === session.user.id;
  const isTeamMember = file.team?.members.some(
    (m) => m.userId === session.user.id,
  );

  if (!isOwner && !isTeamMember) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = await generateDownloadUrl(file.storageKey, 900); // 15 min expiry
  return Response.json({ url });
}
```

### 5. CDN and Caching Strategy

Object storage without a CDN is a mistake. Every file should be served through a CDN edge network to minimize latency and reduce egress costs.

**Cache headers for different file types:**

```typescript
// lib/storage/cache-headers.ts
export const CACHE_PROFILES = {
  // Immutable assets (hashed filenames): cache forever
  immutable: "public, max-age=31536000, immutable",

  // User avatars: cache for 1 hour, revalidate in background
  avatar: "public, max-age=3600, stale-while-revalidate=86400",

  // Private documents: no CDN caching, browser cache only
  private: "private, no-cache, no-store, must-revalidate",

  // Public images: cache for 1 day
  publicImage: "public, max-age=86400, stale-while-revalidate=604800",
} as const;
```

**Key CDN decisions:**
- **Cloudflare R2** -- CDN is built in via custom domains. Files are served from 300+ edge locations automatically.
- **AWS S3** -- You need CloudFront in front of S3. Without it, every request hits the S3 origin region directly.
- **Uploadthing** -- CDN is included. Files are served from their global CDN automatically.
- **Supabase Storage** -- No built-in CDN. Use Cloudflare or Vercel's image optimization as a proxy.

**Use content-addressable storage keys for cache busting:**

```typescript
// lib/storage/keys.ts
import { createHash } from "crypto";

/**
 * Generate a storage key based on file content hash.
 * This makes URLs immutable -- same content always produces the same key.
 * Cache-busting is automatic: new content = new key = new URL.
 */
export function generateStorageKey(
  buffer: Buffer,
  extension: string,
  prefix: string = "uploads",
): string {
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const timestamp = Date.now().toString(36);
  return `${prefix}/${hash}-${timestamp}.${extension}`;
}
```

### 6. Multi-Part Uploads for Large Files

For files larger than 5-10 MB, use multi-part uploads. This splits the file into chunks, uploads each chunk independently (with retry on failure), and then assembles them on the storage side.

**Why multi-part matters:**
- Network interruptions only require re-uploading the failed chunk, not the entire file.
- Chunks can be uploaded in parallel for faster throughput.
- You can show accurate upload progress per chunk.
- S3, R2, and Supabase all support multi-part uploads natively.

```typescript
// lib/storage/multipart.ts
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunks

export async function initiateMultipartUpload(
  s3: S3Client,
  bucket: string,
  key: string,
  contentType: string,
) {
  const command = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const response = await s3.send(command);
  return response.UploadId!;
}

export async function generatePartUploadUrls(
  s3: S3Client,
  bucket: string,
  key: string,
  uploadId: string,
  totalParts: number,
): Promise<string[]> {
  const urls: string[] = [];

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    urls.push(url);
  }

  return urls;
}

export async function completeMultipartUpload(
  s3: S3Client,
  bucket: string,
  key: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[],
) {
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  return s3.send(command);
}
```

### 7. Storage Metadata and Database Integration

Every uploaded file needs a metadata record in your database. The storage provider holds the bytes; your database holds the context.

```typescript
// prisma/schema.prisma (relevant model)
// model File {
//   id            String   @id @default(cuid())
//   name          String                        // Original filename
//   storageKey    String   @unique              // Key in object storage
//   url           String                        // Public or CDN URL
//   size          Int                           // Size in bytes
//   mimeType      String                        // e.g., "image/webp"
//   uploadedById  String
//   uploadedBy    User     @relation(fields: [uploadedById], references: [id])
//   teamId        String?
//   team          Team?    @relation(fields: [teamId], references: [id])
//   status        FileStatus @default(PROCESSING)
//   variants      Json?                         // { thumb: "url", md: "url", lg: "url" }
//   createdAt     DateTime @default(now())
//   updatedAt     DateTime @updatedAt
//
//   @@index([uploadedById])
//   @@index([teamId])
//   @@index([storageKey])
// }
//
// enum FileStatus {
//   PROCESSING
//   READY
//   FAILED
//   DELETED
// }
```

```typescript
// lib/storage/metadata.ts
import { db } from "@/lib/db";

export async function createFileRecord(input: {
  name: string;
  storageKey: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedById: string;
  teamId?: string;
}) {
  return db.file.create({
    data: {
      ...input,
      status: "PROCESSING",
    },
  });
}

export async function markFileReady(
  fileId: string,
  variants?: Record<string, string>,
) {
  return db.file.update({
    where: { id: fileId },
    data: {
      status: "READY",
      variants: variants ?? undefined,
    },
  });
}

export async function softDeleteFile(fileId: string, userId: string) {
  // Soft delete: mark as DELETED, clean up storage in a background job
  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file || file.uploadedById !== userId) {
    throw new Error("Not found or not authorized");
  }

  return db.file.update({
    where: { id: fileId },
    data: { status: "DELETED" },
  });
}
```

---

## LLM Instructions

### Uploadthing

Uploadthing is a type-safe file upload library built specifically for Next.js. It abstracts away presigned URLs, upload handling, and progress tracking behind a simple API. Use it when you want file uploads working in under 15 minutes without thinking about infrastructure.

**Key concepts:**
- **File Router** -- a server-side configuration that defines upload endpoints, file type restrictions, size limits, and middleware (auth, validation).
- **Upload Components** -- pre-built React components (`UploadButton`, `UploadDropzone`) that handle the upload UI, progress, and error states.
- **Middleware** -- runs on your server before the upload begins. Use it to check auth, validate metadata, and reject unauthorized uploads.
- **onUploadComplete** -- a server-side callback that fires after a successful upload. Use it to store metadata in your database.

**Install:**

```bash
npm install uploadthing @uploadthing/react
```

**Environment variables:**

```bash
UPLOADTHING_TOKEN=your-token-here
```

**File router (the core configuration):**

```typescript
// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  // Profile picture upload: images only, max 4 MB
  profilePicture: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth();
      if (!session?.user) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.user.update({
        where: { id: metadata.userId },
        data: { image: file.ufsUrl },
      });

      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),

  // Document upload: PDFs and Word docs, max 16 MB, up to 5 files
  documentUpload: f({
    "application/pdf": { maxFileSize: "16MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "16MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth();
      if (!session?.user) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.file.create({
        data: {
          name: file.name,
          storageKey: file.key,
          url: file.ufsUrl,
          size: file.size,
          mimeType: file.type,
          uploadedById: metadata.userId,
          status: "READY",
        },
      });

      return { url: file.ufsUrl };
    }),

  // General attachment: images + videos + PDFs, max 32 MB
  messageAttachment: f({
    image: { maxFileSize: "8MB", maxFileCount: 4 },
    video: { maxFileSize: "32MB", maxFileCount: 1 },
    "application/pdf": { maxFileSize: "16MB", maxFileCount: 2 },
  })
    .middleware(async ({ req }) => {
      const session = await auth();
      if (!session?.user) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

**API route handler:**

```typescript
// app/api/uploadthing/route.ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
```

**Client-side usage with built-in components:**

```typescript
// lib/uploadthing.ts
import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
```

```tsx
// components/profile/avatar-upload.tsx
"use client";

import { UploadButton } from "@/lib/uploadthing";
import { useState } from "react";
import Image from "next/image";

export function AvatarUpload({ currentImage }: { currentImage?: string }) {
  const [imageUrl, setImageUrl] = useState(currentImage);

  return (
    <div>
      {imageUrl && (
        <Image
          src={imageUrl}
          alt="Profile"
          width={96}
          height={96}
          className="rounded-full"
        />
      )}

      <UploadButton
        endpoint="profilePicture"
        onClientUploadComplete={(res) => {
          if (res?.[0]) {
            setImageUrl(res[0].ufsUrl);
          }
        }}
        onUploadError={(error: Error) => {
          console.error("Upload failed:", error.message);
        }}
      />
    </div>
  );
}
```

**Custom upload with useUploadThing hook (for full control):**

```tsx
// components/files/custom-upload.tsx
"use client";

import { useUploadThing } from "@/lib/uploadthing";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export function CustomFileUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);

  const { startUpload, isUploading } = useUploadThing("documentUpload", {
    onUploadProgress: (p) => setProgress(p),
    onClientUploadComplete: (res) => {
      setFiles([]);
      setProgress(0);
      // Handle success -- redirect, show toast, update state, etc.
    },
    onUploadError: (error) => {
      console.error("Upload error:", error.message);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxSize: 16 * 1024 * 1024,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <p>Drag and drop files, or click to select</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <ul>
            {files.map((file) => (
              <li key={file.name}>
                {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </li>
            ))}
          </ul>

          <button
            onClick={() => startUpload(files)}
            disabled={isUploading}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {isUploading ? `Uploading... ${progress}%` : "Upload"}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Uploadthing CSS (required for default styled components):**

```typescript
// app/layout.tsx
import "@uploadthing/react/styles.css";
// ... rest of your layout
```

---

### Cloudflare R2

Cloudflare R2 is an S3-compatible object storage service with zero egress fees. It uses the standard S3 API, so you can use `@aws-sdk/client-s3` to interact with it. This makes migration from S3 trivial (just change the endpoint and credentials).

**Key concepts:**
- **Zero egress** -- you never pay for bandwidth. This is R2's killer feature. For read-heavy workloads, this saves thousands of dollars per month compared to S3.
- **S3-compatible** -- works with any S3 SDK, CLI, or tool. You only change the endpoint URL.
- **Workers integration** -- R2 binds natively to Cloudflare Workers for edge compute + storage.
- **Custom domains** -- point your own domain at R2 for free CDN delivery through Cloudflare's network.
- **No per-request fees for Class A** -- puts (writes) are free. Class B (reads) have a generous free tier.

**Setup: Create a bucket and get credentials:**

```bash
# Install wrangler (Cloudflare CLI)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create an R2 bucket
wrangler r2 bucket create my-app-uploads

# Create API tokens for S3-compatible access
# Go to Cloudflare Dashboard > R2 > Manage R2 API Tokens
# Create a token with "Object Read & Write" permissions
# Save the Access Key ID and Secret Access Key
```

**Environment variables:**

```bash
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=my-app-uploads
R2_PUBLIC_URL=https://files.yourdomain.com
```

**S3 client configuration for R2:**

```typescript
// lib/storage/r2.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// Upload a file directly (for server-side uploads, e.g., in a background job)
export async function uploadToR2(
  key: string,
  body: Buffer | ReadableStream,
  contentType: string,
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `${PUBLIC_URL}/${key}`;
}

// Generate a presigned upload URL (for client-side uploads)
export async function getR2UploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

// Generate a presigned download URL (for private files)
export async function getR2DownloadUrl(
  key: string,
  expiresIn: number = 900,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

// Delete a file
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}

// List files with a prefix (for browsing folders)
export async function listR2Files(prefix: string, maxKeys: number = 100) {
  const response = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: maxKeys,
    }),
  );

  return (
    response.Contents?.map((item) => ({
      key: item.Key!,
      size: item.Size!,
      lastModified: item.LastModified!,
      url: `${PUBLIC_URL}/${item.Key}`,
    })) ?? []
  );
}
```

**API route for presigned uploads:**

```typescript
// app/api/upload/r2/route.ts
import { auth } from "@/auth";
import { getR2UploadUrl } from "@/lib/storage/r2";
import { generateStorageKey } from "@/lib/storage/keys";
import { validateUploadRequest } from "@/lib/validation/server-file-validation";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/validation/file-validation";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType, contentLength } = await request.json();

  // Server-side validation
  const validation = validateUploadRequest(
    contentType,
    contentLength,
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE,
  );

  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const extension = filename.split(".").pop() ?? "bin";
  const key = `users/${session.user.id}/${generateStorageKey(
    Buffer.from(filename),
    extension,
  )}`;

  const uploadUrl = await getR2UploadUrl(key, contentType);

  return Response.json({
    uploadUrl,
    key,
    publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
  });
}
```

**CORS configuration for R2:**

Configure CORS through the Cloudflare dashboard or using the S3 API. This is required for browser-based presigned URL uploads.

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply via wrangler or the S3 PutBucketCors API:

```typescript
// scripts/configure-r2-cors.ts
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

await r2.send(
  new PutBucketCorsCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["https://yourdomain.com", "http://localhost:3000"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag", "Content-Length"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

console.log("CORS configuration applied successfully");
```

**Custom domain setup (for public CDN access):**

1. Go to Cloudflare Dashboard > R2 > your bucket > Settings > Public access.
2. Enable "Custom Domain" and enter your subdomain (e.g., `files.yourdomain.com`).
3. Cloudflare will automatically provision a TLS certificate and route traffic through their CDN.
4. Files are now accessible at `https://files.yourdomain.com/your-key`.

---

### AWS S3

AWS S3 is the industry standard for object storage. It is the most feature-complete and battle-tested option, but it comes with complexity (IAM policies, bucket policies, CORS, lifecycle rules) and egress fees.

**Key concepts:**
- **Buckets** -- top-level containers for objects. Globally unique names.
- **IAM policies** -- define what AWS users/roles can do with S3.
- **Bucket policies** -- define access rules at the bucket level.
- **Presigned URLs** -- time-limited URLs that grant temporary access to private objects.
- **Lifecycle rules** -- automatically transition objects to cheaper storage classes or delete them after a period.
- **Versioning** -- keep multiple versions of an object.

**Install:**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Environment variables:**

```bash
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=my-app-uploads
S3_PUBLIC_URL=https://d123456.cloudfront.net
```

**S3 client and operations:**

```typescript
// lib/storage/s3.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;

// Generate presigned upload URL
export async function getS3UploadUrl(
  key: string,
  contentType: string,
  maxSize: number,
  expiresIn: number = 600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: maxSize,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// Generate presigned download URL
export async function getS3DownloadUrl(
  key: string,
  expiresIn: number = 900,
  filename?: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(filename && {
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// Check if a file exists and get metadata
export async function getS3FileInfo(key: string) {
  try {
    const response = await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );

    return {
      exists: true,
      size: response.ContentLength!,
      contentType: response.ContentType!,
      lastModified: response.LastModified!,
      etag: response.ETag!,
    };
  } catch {
    return { exists: false };
  }
}

// Delete a file (with optional version ID for versioned buckets)
export async function deleteFromS3(
  key: string,
  versionId?: string,
): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
      VersionId: versionId,
    }),
  );
}

// Upload server-side (for background jobs, not for client uploads)
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${process.env.S3_PUBLIC_URL}/${key}`;
}
```

**Presigned upload API route:**

```typescript
// app/api/upload/s3/route.ts
import { auth } from "@/auth";
import { getS3UploadUrl } from "@/lib/storage/s3";
import { createFileRecord } from "@/lib/storage/metadata";
import { validateUploadRequest } from "@/lib/validation/server-file-validation";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_IMAGE_SIZE,
  MAX_DOCUMENT_SIZE,
} from "@/lib/validation/file-validation";
import { generateStorageKey } from "@/lib/storage/keys";

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
const MAX_SIZE = Math.max(MAX_IMAGE_SIZE, MAX_DOCUMENT_SIZE);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType, contentLength } = await request.json();

  const validation = validateUploadRequest(
    contentType,
    contentLength,
    ALLOWED_TYPES,
    MAX_SIZE,
  );

  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const extension = filename.split(".").pop() ?? "bin";
  const key = `uploads/${session.user.id}/${Date.now()}-${generateStorageKey(
    Buffer.from(filename),
    extension,
  )}`;

  const uploadUrl = await getS3UploadUrl(key, contentType, contentLength);

  // Create a pending file record in the database
  const file = await createFileRecord({
    name: filename,
    storageKey: key,
    url: `${process.env.S3_PUBLIC_URL}/${key}`,
    size: contentLength,
    mimeType: contentType,
    uploadedById: session.user.id,
  });

  return Response.json({
    uploadUrl,
    fileId: file.id,
    key,
  });
}
```

**IAM policy (least privilege):**

Create a dedicated IAM user for your application with only the permissions it needs.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowUploadAndRead",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:HeadObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-app-uploads/*"
    },
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-app-uploads"
    }
  ]
}
```

**Never** grant `s3:*` or `s3:PutBucketPolicy`. Your application code should not be able to change bucket-level permissions.

**S3 CORS configuration:**

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedOrigins": [
        "https://yourdomain.com",
        "http://localhost:3000"
      ],
      "ExposeHeaders": [
        "ETag",
        "Content-Length",
        "x-amz-request-id"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

**Lifecycle rules (auto-cleanup):**

```json
{
  "Rules": [
    {
      "ID": "DeleteTempUploads",
      "Filter": { "Prefix": "temp/" },
      "Status": "Enabled",
      "Expiration": { "Days": 1 }
    },
    {
      "ID": "TransitionToIA",
      "Filter": { "Prefix": "archives/" },
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "ID": "CleanupIncompleteMultipart",
      "Filter": {},
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

The `CleanupIncompleteMultipart` rule is important. Incomplete multipart uploads silently accumulate and cost you storage. Always set this rule.

---

### Supabase Storage

Supabase Storage is built on top of S3-compatible storage but provides a simplified API that integrates tightly with Supabase Auth and Row Level Security (RLS). If you are already using Supabase for your database and auth, Storage is the natural choice.

**Key concepts:**
- **Buckets** -- containers for files. Can be public (anyone can read) or private (auth required).
- **RLS policies** -- define access rules using SQL. Same pattern as your database tables. Policies apply to the `storage.objects` table.
- **Image transformations** -- resize and optimize images on the fly via URL parameters (no need for a separate image CDN).
- **Resumable uploads** -- built-in support for large file uploads using the TUS protocol.

**Install:**

```bash
npm install @supabase/supabase-js
```

**Environment variables:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Supabase client setup:**

```typescript
// lib/supabase/client.ts (browser client)
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```typescript
// lib/supabase/server.ts (server client)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component -- ignore
          }
        },
      },
    },
  );
}
```

```typescript
// lib/supabase/admin.ts (service role client -- server only, bypasses RLS)
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

**Create buckets:**

```sql
-- Run in Supabase SQL Editor or in a migration

-- Public bucket for profile avatars (anyone can view, auth users can upload their own)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Private bucket for user documents (only the owner can access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Private bucket for team files (team members can access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-files',
  'team-files',
  false,
  52428800,  -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);
```

**RLS policies for storage:**

```sql
-- Avatars bucket: anyone can view, authenticated users can upload/update/delete their own
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Documents bucket: only the owner can CRUD
CREATE POLICY "Users can manage their own documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Team files bucket: team members can read, uploaders can delete
CREATE POLICY "Team members can view team files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'team-files'
    AND (storage.foldername(name))[1] IN (
      SELECT team_id::text FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can upload to team"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'team-files'
    AND (storage.foldername(name))[1] IN (
      SELECT team_id::text FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "File owners can delete team files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'team-files'
    AND owner_id = auth.uid()
  );
```

**Upload, download, and manage files:**

```typescript
// lib/storage/supabase-storage.ts
import { createClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Client-side upload (respects RLS policies via the user's session)
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
) {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;
  return data;
}

// Client-side: get public URL (for public buckets only)
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

// Server-side: create a signed URL for private files
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600,
): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// Server-side: create a signed upload URL (presigned URL pattern)
export async function createSignedUploadUrl(
  bucket: string,
  path: string,
): Promise<{ signedUrl: string; token: string; path: string }> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) throw error;
  return data;
}

// Server-side: list files in a folder
export async function listFiles(
  bucket: string,
  folder: string,
  limit: number = 100,
  offset: number = 0,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) throw error;
  return data;
}

// Server-side: delete files
export async function deleteFiles(bucket: string, paths: string[]) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) throw error;
}
```

**Image transformations (built-in, no extra service):**

```typescript
// lib/storage/supabase-images.ts
import { createClient } from "@/lib/supabase/client";

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "origin" | "avif" | "webp";
  resize?: "cover" | "contain" | "fill";
}

export function getTransformedImageUrl(
  bucket: string,
  path: string,
  transform: TransformOptions,
): string {
  const supabase = createClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform,
  });

  return data.publicUrl;
}

// Usage examples:
// Thumbnail: getTransformedImageUrl("avatars", path, { width: 100, height: 100, resize: "cover" })
// Medium:    getTransformedImageUrl("avatars", path, { width: 400, quality: 80, format: "webp" })
// Large:     getTransformedImageUrl("avatars", path, { width: 1200, quality: 85, format: "webp" })
```

**Upload component for Supabase:**

```tsx
// components/files/supabase-upload.tsx
"use client";

import { uploadFile, getPublicUrl } from "@/lib/storage/supabase-storage";
import { validateFile, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/validation/file-validation";
import { useState, useRef } from "react";

interface SupabaseUploadProps {
  bucket: string;
  folder: string;
  onUploadComplete: (url: string, path: string) => void;
  onError?: (error: string) => void;
}

export function SupabaseUpload({
  bucket,
  folder,
  onUploadComplete,
  onError,
}: SupabaseUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(
      file,
      ALLOWED_IMAGE_TYPES,
      MAX_IMAGE_SIZE,
    );
    if (!validation.valid) {
      onError?.(validation.error!);
      return;
    }

    setUploading(true);

    try {
      const extension = file.name.split(".").pop();
      const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      await uploadFile(bucket, path, file);

      const publicUrl = getPublicUrl(bucket, path);
      onUploadComplete(publicUrl, path);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

---

## Examples

### Example 1: Uploadthing -- Complete Profile Picture Flow

```typescript
// 1. File router (app/api/uploadthing/core.ts)
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  avatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.user.update({
        where: { id: metadata.userId },
        data: { image: file.ufsUrl },
      });
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

// 2. Route handler (app/api/uploadthing/route.ts)
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";
export const { GET, POST } = createRouteHandler({ router: ourFileRouter });

// 3. Generate components (lib/uploadthing.ts)
import { generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
export const UploadButton = generateUploadButton<OurFileRouter>();

// 4. Use in page (app/settings/page.tsx)
// "use client";
// import { UploadButton } from "@/lib/uploadthing";
// <UploadButton endpoint="avatar" onClientUploadComplete={(res) => { ... }} />
```

### Example 2: Cloudflare R2 -- Presigned URL Upload with Progress

```typescript
// Client-side upload with progress tracking
// components/files/r2-upload-with-progress.tsx
"use client";

import { useState, useCallback } from "react";

export function R2Upload() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  const upload = useCallback(async (file: File) => {
    setStatus("uploading");

    // Step 1: Get presigned URL from your API
    const response = await fetch("/api/upload/r2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        contentLength: file.size,
      }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    const { uploadUrl, publicUrl } = await response.json();

    // Step 2: Upload directly to R2 using XMLHttpRequest (for progress)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Upload failed")));

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    setStatus("done");

    // Step 3: Notify your API that upload is complete
    await fetch("/api/upload/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicUrl }),
    });
  }, []);

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
        disabled={status === "uploading"}
      />
      {status === "uploading" && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">{progress}%</p>
        </div>
      )}
      {status === "done" && <p className="text-green-600 mt-2">Upload complete</p>}
      {status === "error" && <p className="text-red-600 mt-2">Upload failed</p>}
    </div>
  );
}
```

### Example 3: AWS S3 -- Presigned Upload + CloudFront Download

```typescript
// app/api/upload/s3/route.ts -- Complete presigned upload flow
import { auth } from "@/auth";
import { s3Client } from "@/lib/storage/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType, size } = await request.json();

  // Validate
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(contentType)) {
    return Response.json({ error: "File type not allowed" }, { status: 400 });
  }
  if (size > 20 * 1024 * 1024) {
    return Response.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  // Generate unique key
  const ext = filename.split(".").pop();
  const key = `uploads/${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  // Generate presigned URL
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

  // Create pending file record
  const file = await db.file.create({
    data: {
      name: filename,
      storageKey: key,
      url: `${process.env.S3_PUBLIC_URL}/${key}`,
      size,
      mimeType: contentType,
      uploadedById: session.user.id,
      status: "PROCESSING",
    },
  });

  return Response.json({ uploadUrl, fileId: file.id, key });
}
```

```typescript
// app/api/upload/s3/confirm/route.ts -- Confirm upload and mark as ready
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getS3FileInfo } from "@/lib/storage/s3";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await request.json();

  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file || file.uploadedById !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Verify the file actually exists in S3
  const info = await getS3FileInfo(file.storageKey);
  if (!info.exists) {
    return Response.json({ error: "File not found in storage" }, { status: 400 });
  }

  // Mark as ready
  await db.file.update({
    where: { id: fileId },
    data: { status: "READY", size: info.size },
  });

  return Response.json({ success: true, url: file.url });
}
```

### Example 4: Supabase Storage -- Complete File Manager

```tsx
// app/files/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FileList } from "@/components/files/file-list";
import { SupabaseUpload } from "@/components/files/supabase-upload";

export default async function FilesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <p>Please sign in to view your files.</p>;
  }

  // List files in user's folder
  const { data: files } = await supabase.storage
    .from("documents")
    .list(user.id, {
      sortBy: { column: "created_at", order: "desc" },
      limit: 50,
    });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Files</h1>

      <SupabaseUpload
        bucket="documents"
        folder={user.id}
        onUploadComplete={(url, path) => {
          // Revalidate or update local state
        }}
      />

      <FileList
        files={files ?? []}
        bucket="documents"
        userId={user.id}
      />
    </div>
  );
}
```

```tsx
// components/files/file-list.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface FileItem {
  name: string;
  id: string;
  created_at: string;
  metadata: { size: number; mimetype: string };
}

export function FileList({
  files,
  bucket,
  userId,
}: {
  files: FileItem[];
  bucket: string;
  userId: string;
}) {
  const supabase = createClient();
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(file: FileItem) {
    setDownloading(file.id);

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(`${userId}/${file.name}`, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }

    setDownloading(null);
  }

  async function handleDelete(file: FileItem) {
    if (!confirm(`Delete ${file.name}?`)) return;

    const { error } = await supabase.storage
      .from(bucket)
      .remove([`${userId}/${file.name}`]);

    if (!error) {
      // Trigger revalidation or update state
      window.location.reload();
    }
  }

  return (
    <ul className="mt-6 space-y-2">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex items-center justify-between p-3 border rounded"
        >
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-gray-500">
              {(file.metadata?.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDownload(file)}
              disabled={downloading === file.id}
              className="text-sm text-blue-600 hover:underline"
            >
              {downloading === file.id ? "Loading..." : "Download"}
            </button>
            <button
              onClick={() => handleDelete(file)}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

---

## Common Mistakes

### 1. Proxying file uploads through your server

**Wrong:**
```typescript
// app/api/upload/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Your server reads the entire file into memory and re-uploads it
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `uploads/${file.name}`,
    Body: buffer,
  }));
}
```

**Fix:** Use presigned URLs. Your server generates a URL; the client uploads directly to storage. This avoids Vercel's 4.5 MB body limit, reduces server compute, and lets the storage provider handle the heavy lifting.

### 2. Not validating files on the server

**Wrong:**
```typescript
// Only checking on the client
const isValid = file.type.startsWith("image/") && file.size < 5_000_000;
```

**Fix:** Client-side validation is for UX. Server-side validation is for security. Always validate the `Content-Type` and `Content-Length` in your presigned URL generation endpoint. After upload, validate magic bytes to confirm the file is actually what it claims to be.

### 3. Using predictable storage keys

**Wrong:**
```typescript
const key = `uploads/${userId}/${filename}`;
// Attackers can guess URLs: /uploads/user123/profile.jpg
```

**Fix:** Use content-addressable hashes or UUIDs in your storage keys. Predictable keys allow enumeration attacks and URL guessing.

```typescript
const key = `uploads/${userId}/${crypto.randomUUID()}-${Date.now()}.${ext}`;
```

### 4. Presigned URLs that never expire (or expire too late)

**Wrong:**
```typescript
const url = await getSignedUrl(s3, command, { expiresIn: 86400 }); // 24 hours
```

**Fix:** Upload URLs should expire in 5-15 minutes. Download URLs should expire in 15-60 minutes. Longer expiry windows increase the risk of URL sharing and unauthorized access. For public files, use a CDN URL instead of presigned URLs.

### 5. Not setting CORS on your storage bucket

**Wrong:** Deploying to production and wondering why presigned URL uploads fail silently in the browser. The console shows `No 'Access-Control-Allow-Origin' header is present`.

**Fix:** Configure CORS on your bucket before writing any client-side upload code. Include both your production domain and `localhost:3000` for development. See the CORS examples in each tool's section above.

### 6. Storing file metadata only in the storage provider

**Wrong:**
```typescript
// Relying on S3 ListObjects to find user files
const files = await s3.send(new ListObjectsV2Command({
  Bucket: BUCKET,
  Prefix: `uploads/${userId}/`,
}));
```

**Fix:** Store file metadata (URL, size, type, owner, status) in your database. Use object storage as a dumb byte store and your database as the source of truth. This gives you indexing, querying, access control, and audit trails.

### 7. Not cleaning up orphaned files

**Wrong:** Files pile up in storage after users delete them from the app, or uploads fail halfway through and leave incomplete multipart uploads.

**Fix:** Implement a cleanup pipeline:
- Soft-delete in your database (set status to `DELETED`).
- Run a background job that deletes `DELETED` files from storage after a grace period (7 days).
- Set S3/R2 lifecycle rules to auto-delete incomplete multipart uploads after 7 days.
- Periodically reconcile your database records against actual storage contents.

### 8. Serving user uploads from your main domain

**Wrong:**
```
https://myapp.com/uploads/user-file.html
```

An attacker uploads an HTML file that executes JavaScript in the context of your domain, stealing cookies and session tokens.

**Fix:** Serve user-uploaded content from a separate domain (e.g., `files.myapp-cdn.com`). This isolates uploaded content from your application's cookies and prevents XSS via uploaded files. Most storage providers (R2 custom domains, CloudFront, Uploadthing CDN) handle this automatically.

### 9. Not using content-addressable keys for cache busting

**Wrong:**
```typescript
// Same key for updated profile picture
const key = `avatars/${userId}/profile.webp`;
// CDN caches the old version and users see stale images
```

**Fix:** Include a hash or timestamp in the key so every upload generates a new URL. The old URL stays cached (harmless), and the new URL fetches fresh content.

```typescript
const key = `avatars/${userId}/${contentHash}-${Date.now()}.webp`;
```

### 10. Ignoring image optimization

**Wrong:** Accepting a 4000x3000 JPEG (8 MB) from a user and serving it as-is for a 96x96 avatar. Every page load downloads 8 MB for a thumbnail.

**Fix:** Process images after upload: convert to WebP/AVIF, generate multiple size variants (thumb, sm, md, lg), and serve the smallest variant that fits the display size. Use Supabase's built-in transforms, Cloudflare Images, or a background job with `sharp`.

---

> **See also:** [Backend/Serverless-Edge](../../Backend/Serverless-Edge/serverless-edge.md) for presigned URL patterns and edge runtime considerations | [BaaS-Platforms](../BaaS-Platforms/baas-platforms.md) for Supabase full-stack integration | [Hosting-Deployment](../Hosting-Deployment/hosting-deployment.md) for Cloudflare R2 with Workers deployment
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
