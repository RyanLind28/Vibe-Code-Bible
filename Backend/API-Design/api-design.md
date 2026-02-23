# API Design

> REST conventions, response shapes, pagination, filtering, versioning, error formats, GraphQL patterns, and API documentation — every endpoint your users will ever touch.

---

## Principles

### 1. REST as a Design Philosophy

REST is not "JSON over HTTP." It is a set of architectural constraints that make APIs predictable, cacheable, and evolvable. Every endpoint should represent a resource (noun), not an action (verb). HTTP methods supply the verbs.

The six constraints that matter in practice:

- **Client-server separation** — the API knows nothing about UI rendering
- **Statelessness** — every request contains all information needed to process it; no server-side session state between requests
- **Cacheability** — responses declare whether they can be cached (via `Cache-Control`, `ETag`)
- **Uniform interface** — resources are identified by URIs, manipulated through representations (JSON), and self-descriptive
- **Layered system** — clients cannot tell whether they connect directly to the server or through a CDN/proxy
- **Code on demand (optional)** — servers can send executable code (rarely used in APIs)

A well-designed REST API feels like navigating a file system. `GET /users/42/posts` reads as "get posts belonging to user 42." If your URL requires a manual to understand, it is wrong.

### 2. Resource Naming and URL Design

URLs are your API's public contract. They should be readable, consistent, and guessable.

**Rules:**

- Use **plural nouns** for collections: `/users`, `/posts`, `/organizations`
- Use **IDs** for specific resources: `/users/42`, `/posts/abc-123`
- **Nest only when ownership is unambiguous** and limit to two levels: `/users/42/posts` is fine; `/users/42/posts/99/comments/12/likes` is not
- Use **kebab-case** for multi-word resources: `/blog-posts`, `/order-items`
- Never put verbs in URLs: `/users/42/activate` is wrong — use `PATCH /users/42 { status: "active" }` or `POST /users/42/activation`
- Query parameters for filtering, sorting, and pagination: `/posts?status=published&sort=-created_at`
- **No trailing slashes** — pick one convention and enforce it

```
GOOD:
GET    /api/v1/users
GET    /api/v1/users/42
GET    /api/v1/users/42/posts
POST   /api/v1/posts
PATCH  /api/v1/posts/abc-123

BAD:
GET    /api/v1/getUsers
POST   /api/v1/createPost
GET    /api/v1/users/42/posts/99/comments/12/reactions
DELETE /api/v1/removeUser/42
```

### 3. HTTP Methods and Status Codes

Each HTTP method has specific semantics. Using the wrong method causes confusion, breaks caching, and violates client expectations.

| Method | Purpose | Idempotent | Request Body | Success Code |
|--------|---------|------------|--------------|--------------|
| `GET` | Read resource(s) | Yes | No | `200 OK` |
| `POST` | Create resource | No | Yes | `201 Created` |
| `PUT` | Replace resource entirely | Yes | Yes | `200 OK` |
| `PATCH` | Partial update | No* | Yes | `200 OK` |
| `DELETE` | Remove resource | Yes | No | `204 No Content` |

*PATCH is not inherently idempotent but can be made so with careful design.

**Critical status codes to use correctly:**

| Code | When |
|------|------|
| `200 OK` | Successful GET, PUT, PATCH |
| `201 Created` | Successful POST that created a resource — include `Location` header |
| `204 No Content` | Successful DELETE or update with no response body |
| `400 Bad Request` | Validation failure, malformed input |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Authenticated but not authorized for this action |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Resource state conflict (duplicate email, version mismatch) |
| `422 Unprocessable Entity` | Syntactically valid but semantically wrong |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unhandled server failure |

**Never return `200` for errors.** If the operation failed, the status code must reflect it. A `200` with `{ success: false }` defeats the purpose of HTTP semantics and breaks every HTTP client's error handling.

### 4. Response Shape Consistency

Every endpoint should return the same shape. Clients should never guess whether the response is an array, an object, or something wrapped in an envelope.

**Recommended envelope pattern:**

```typescript
// Single resource
{
  "data": {
    "id": "abc-123",
    "title": "API Design",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}

// Collection
{
  "data": [
    { "id": "abc-123", "title": "API Design" },
    { "id": "def-456", "title": "Database Design" }
  ],
  "meta": {
    "total": 47,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "name", "message": "Name is required" }
    ]
  }
}
```

**Rules for response shapes:**

- Use consistent casing: `camelCase` for JSON keys (matches JavaScript convention)
- Always include `id` in resource responses
- Use ISO 8601 for dates: `2026-01-15T10:30:00Z`
- Null fields should be present with `null` value, not omitted (predictable parsing)
- Include `createdAt` and `updatedAt` timestamps on every mutable resource

### 5. Pagination

Every collection endpoint must be paginated. Returning unbounded lists is a denial-of-service vector and a terrible user experience.

**Cursor-based pagination (recommended for most cases):**

```typescript
// Request
GET /api/v1/posts?cursor=eyJpZCI6NDJ9&limit=20

// Response
{
  "data": [...],
  "meta": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6NjJ9",
    "limit": 20
  }
}
```

Cursor-based pagination is stable under inserts/deletes and performs well at any depth. The cursor is an opaque, base64-encoded token that the server decodes internally.

**Offset-based pagination (acceptable for admin UIs, small datasets):**

```typescript
// Request
GET /api/v1/posts?page=3&pageSize=20

// Response
{
  "data": [...],
  "meta": {
    "total": 147,
    "page": 3,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

Offset pagination allows jumping to any page but becomes inaccurate and slow for large datasets (the database must skip rows).

**Rules:**
- Enforce a maximum page size (e.g., 100). Never let clients request unlimited results.
- Default page size should be sensible (20–50).
- Always include `hasMore` or `totalPages` so clients know when to stop.
- Document the default and maximum limits.

### 6. Filtering, Sorting, and Field Selection

Collection endpoints should support filtering and sorting via query parameters.

**Filtering:**

```
GET /api/v1/posts?status=published&authorId=42&createdAfter=2026-01-01
GET /api/v1/users?role=admin&search=jane
```

- Use flat query parameters for simple filters
- For complex filters, consider a structured format: `filter[status]=published&filter[role]=admin`
- Validate and allowlist filter fields — never pass raw query params to database queries

**Sorting:**

```
GET /api/v1/posts?sort=-createdAt          // descending by createdAt
GET /api/v1/posts?sort=title,-createdAt     // ascending title, then descending date
```

- Prefix with `-` for descending order
- Support multiple sort fields separated by commas
- Document which fields are sortable

**Sparse fieldsets (field selection):**

```
GET /api/v1/posts?fields=id,title,createdAt
```

- Reduces payload size and improves performance
- Server returns only requested fields (plus always-included fields like `id`)
- Useful for list views where full resource details are unnecessary

### 7. API Versioning

APIs evolve. Breaking changes are inevitable. Versioning gives you a path to evolve without breaking existing clients.

**URL path versioning (recommended):**

```
GET /api/v1/users
GET /api/v2/users
```

This is the simplest, most visible approach. It is easy to route, easy to document, and easy for clients to understand.

**Header-based versioning (alternative):**

```
GET /api/users
Accept: application/vnd.myapp.v2+json
```

Cleaner URLs but harder to test in a browser and less discoverable.

**Versioning strategy:**

- Start with `v1`. You will need `v2` eventually.
- Version the entire API, not individual endpoints.
- Support at least two versions simultaneously.
- Set **sunset dates** — announce deprecation at least 6 months before removal.
- Return a `Sunset` header on deprecated versions: `Sunset: Sat, 01 Jan 2027 00:00:00 GMT`
- Include a `Deprecation` header: `Deprecation: true`
- Log usage of deprecated versions to track migration progress.

**What counts as a breaking change:**
- Removing a field from responses
- Changing a field's type
- Removing an endpoint
- Changing required fields in requests
- Changing error response format

**What is NOT a breaking change:**
- Adding new fields to responses
- Adding new optional query parameters
- Adding new endpoints
- Adding new enum values (if clients handle unknowns)

### 8. Error Response Format

Errors should be as helpful as success responses. The client should know what went wrong, which field caused it, and how to fix it.

**RFC 7807 Problem Details (recommended standard):**

```typescript
// 400 Bad Request
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "One or more fields failed validation.",
  "instance": "/api/v1/users",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address"
    },
    {
      "field": "password",
      "code": "TOO_SHORT",
      "message": "Must be at least 12 characters"
    }
  ]
}

// 409 Conflict
{
  "type": "https://api.example.com/errors/duplicate",
  "title": "Conflict",
  "status": 409,
  "detail": "A user with this email already exists.",
  "instance": "/api/v1/users"
}
```

**Error response rules:**
- Always include a machine-readable `code` (e.g., `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`)
- Always include a human-readable `message` or `detail`
- Include field-level errors for validation failures
- Never expose stack traces, internal paths, or database errors in production
- Use consistent error shapes across all endpoints
- Document all possible error codes

### 9. GraphQL API Design

GraphQL is not a replacement for REST. It solves a different problem: when clients need flexible queries across many related resources with varying field requirements.

**When to use GraphQL:**
- Client-driven data requirements (mobile vs web need different fields)
- Deeply nested, interconnected data (social graphs, content management)
- Multiple client platforms with different data needs
- Rapid frontend iteration without backend changes

**When REST is better:**
- Simple CRUD operations
- File uploads and downloads
- Webhooks and server-to-server communication
- Public APIs where simplicity matters
- Caching is critical (HTTP caching is trivial with REST, complex with GraphQL)

**Schema-first design:**

```graphql
type Query {
  user(id: ID!): User
  posts(first: Int, after: String, filter: PostFilter): PostConnection!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts(first: Int, after: String): PostConnection!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  createdAt: DateTime!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

input PostFilter {
  status: PostStatus
  authorId: ID
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

**N+1 prevention with DataLoader:**

DataLoader batches and caches database queries within a single request. Without it, resolving `posts { author { name } }` for 20 posts makes 20 separate author queries.

```typescript
import DataLoader from "dataloader";

// Create per-request DataLoader
function createLoaders() {
  return {
    userLoader: new DataLoader<string, User>(async (ids) => {
      const users = await db.user.findMany({
        where: { id: { in: [...ids] } },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) ?? new Error(`User ${id} not found`));
    }),
  };
}

// In resolver
const resolvers = {
  Post: {
    author: (post, _args, { loaders }) => loaders.userLoader.load(post.authorId),
  },
};
```

### 10. API Documentation

An undocumented API is an unusable API. Documentation should be generated from your code, not maintained separately.

**OpenAPI 3.1 (recommended):**

Generate your OpenAPI spec from Zod schemas so documentation always matches validation:

```typescript
import { z } from "zod";
import { extendZodWithOpenApi, createDocument } from "zod-openapi";

extendZodWithOpenApi(z);

const PostSchema = z.object({
  id: z.string().uuid().openapi({ description: "Unique post identifier" }),
  title: z.string().min(1).max(200).openapi({ description: "Post title" }),
  content: z.string().openapi({ description: "Post body in markdown" }),
  status: z.enum(["draft", "published", "archived"]).openapi({
    description: "Publication status",
  }),
  createdAt: z.string().datetime().openapi({ description: "ISO 8601 timestamp" }),
  updatedAt: z.string().datetime().openapi({ description: "ISO 8601 timestamp" }),
});

const CreatePostSchema = PostSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
```

**Documentation essentials:**
- Every endpoint: method, URL, description, request body, response shape, error cases
- Authentication requirements per endpoint
- Rate limit information
- Example requests and responses (with `curl` or fetch)
- A runnable API playground (Swagger UI, Scalar, or Stoplight)
- Changelog for version differences

### 11. Rate Limiting and Throttling (Design Perspective)

Rate limiting protects your API from abuse and ensures fair usage. From a design perspective, the focus is on communicating limits clearly to clients.

**Standard response headers:**

```
X-RateLimit-Limit: 100          # requests allowed per window
X-RateLimit-Remaining: 67       # requests remaining in current window
X-RateLimit-Reset: 1706234400   # Unix timestamp when the window resets
Retry-After: 30                 # seconds to wait (on 429 responses)
```

**429 response:**

```json
{
  "type": "https://api.example.com/errors/rate-limited",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit exceeded. Try again in 30 seconds.",
  "retryAfter": 30
}
```

**Design considerations:**
- Different limits for different tiers (free: 100/min, pro: 1000/min)
- Per-endpoint limits for expensive operations (search, export)
- Include rate limit headers on every response, not just 429s
- Document limits clearly in API documentation
- Provide a dedicated endpoint to check current usage: `GET /api/v1/rate-limit`

> Cross-reference: [Security/API-Security](../../Security/API-Security/api-security.md) covers rate limiting implementation, token bucket algorithms, and abuse prevention.

---

## LLM Instructions

### Scaffolding a REST API

When generating a REST API:

- Create a route file per resource (`routes/users.ts`, `routes/posts.ts`) or use Next.js Route Handlers (`app/api/posts/route.ts`, `app/api/posts/[id]/route.ts`)
- Use Zod for request validation on every endpoint — validate params, query, and body
- Return consistent response shapes using a shared `apiResponse` helper
- Include proper status codes: `201` for creation, `204` for deletion, `409` for conflicts
- Add TypeScript types derived from Zod schemas — never duplicate type definitions
- Handle errors with a centralized error handler, not try/catch in every route

```typescript
// lib/api-response.ts
import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiCreated<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: Array<{ field: string; message: string }>
) {
  return NextResponse.json(
    {
      error: { code, message, ...(details && { details }) },
    },
    { status }
  );
}
```

### Designing Response Shapes

When structuring API responses:

- Wrap single resources in `{ data: resource }` and collections in `{ data: [], meta: {} }`
- Include `meta` with pagination info for all collection endpoints
- Error responses use `{ error: { code, message, details? } }`
- Never mix success and error fields in the same response
- Use `null` for absent optional fields, not `undefined` (JSON has no `undefined`)
- Include `id`, `createdAt`, and `updatedAt` on every mutable resource

### Implementing Pagination

When adding pagination to a collection endpoint:

- Default to cursor-based pagination for public APIs and feeds
- Use offset-based for admin dashboards where page jumping is needed
- Enforce maximum page size (100) and provide a sensible default (20)
- Always return `hasMore` (cursor) or `totalPages` (offset)
- Encode cursor as base64 to keep it opaque — decode server-side to extract the real value (usually a composite of sort field + ID)

```typescript
import { z } from "zod";

const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function paginateWithCursor<T extends { id: string }>(
  query: (args: { take: number; cursor?: { id: string }; skip?: number }) => Promise<T[]>,
  params: z.infer<typeof PaginationSchema>
) {
  const { cursor, limit } = params;
  const items = await query({
    take: limit + 1,
    ...(cursor && {
      cursor: { id: Buffer.from(cursor, "base64").toString() },
      skip: 1,
    }),
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore
    ? Buffer.from(data[data.length - 1].id).toString("base64")
    : undefined;

  return {
    data,
    meta: { hasMore, nextCursor, limit },
  };
}
```

### Designing Error Formats

When implementing error responses:

- Create an `AppError` class that extends `Error` with `code`, `statusCode`, and optional `details`
- Map all errors through a centralized handler that converts them to RFC 7807 format
- Never expose raw database errors, file paths, or stack traces in production
- Include field-level errors for validation failures so clients can display them inline
- Use stable error codes (`VALIDATION_ERROR`, `NOT_FOUND`) that clients can switch on
- Log the full error server-side, return a sanitized version to the client

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, details?: Array<{ field: string; message: string }>) {
    return new AppError("BAD_REQUEST", message, 400, details);
  }

  static notFound(resource: string) {
    return new AppError("NOT_FOUND", `${resource} not found`, 404);
  }

  static conflict(message: string) {
    return new AppError("CONFLICT", message, 409);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message = "Insufficient permissions") {
    return new AppError("FORBIDDEN", message, 403);
  }
}
```

### Setting Up GraphQL

When creating a GraphQL API:

- Use schema-first design: define the schema in `.graphql` files, then implement resolvers
- Use a code-first tool like Pothos if you prefer TypeScript-first: schema definition in code with full type safety
- Create DataLoaders per request to batch and cache database queries — prevents N+1
- Implement relay-style pagination (`Connection`, `Edge`, `PageInfo`) for all list fields
- Add query complexity analysis to prevent expensive queries from overwhelming the server
- Use persisted queries in production to prevent arbitrary query injection

### Writing API Documentation

When documenting an API:

- Generate OpenAPI specs from Zod schemas — single source of truth for validation and docs
- Include at least one example request and response per endpoint
- Document error cases explicitly — list every possible error code per endpoint
- Add authentication details: which endpoints need auth, what tokens to pass, where
- Include rate limit information per endpoint or tier
- Provide `curl` examples for common operations
- Set up Scalar or Swagger UI for interactive exploration

---

## Examples

### 1. Complete REST Resource (CRUD for /api/posts)

A full CRUD implementation for a posts resource with pagination, filtering, and proper error handling using Next.js Route Handlers:

```typescript
// app/api/posts/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiSuccess, apiCreated, apiError } from "@/lib/api-response";
import { paginateWithCursor } from "@/lib/pagination";
import { requireAuth } from "@/lib/auth";

const CreatePostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["draft", "published"]).default("draft"),
});

const ListPostsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["draft", "published", "archived"]).optional(),
  authorId: z.string().uuid().optional(),
  sort: z.enum(["createdAt", "-createdAt", "title", "-title"]).default("-createdAt"),
  search: z.string().max(200).optional(),
});

// GET /api/posts — list with pagination and filtering
export async function GET(request: NextRequest) {
  const params = ListPostsSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!params.success) {
    return apiError("VALIDATION_ERROR", "Invalid query parameters", 400,
      params.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    );
  }

  const { cursor, limit, status, authorId, sort, search } = params.data;
  const [sortField, sortDir] = sort.startsWith("-")
    ? [sort.slice(1), "desc" as const]
    : [sort, "asc" as const];

  const where = {
    ...(status && { status }),
    ...(authorId && { authorId }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { content: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const result = await paginateWithCursor(
    (args) =>
      db.post.findMany({
        ...args,
        where,
        orderBy: { [sortField]: sortDir },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, name: true } },
        },
      }),
    { cursor, limit }
  );

  return apiSuccess(result.data, 200);
}

// POST /api/posts — create
export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return apiError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Validation failed", 400,
      parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    );
  }

  const post = await db.post.create({
    data: {
      ...parsed.data,
      authorId: session.userId,
    },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiCreated(post);
}
```

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

// GET /api/posts/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await db.post.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });

  if (!post) {
    return apiError("NOT_FOUND", "Post not found", 404);
  }

  return apiSuccess(post);
}

// PATCH /api/posts/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (!session) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });

  if (!post) {
    return apiError("NOT_FOUND", "Post not found", 404);
  }

  if (post.authorId !== session.userId) {
    return apiError("FORBIDDEN", "You can only edit your own posts", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdatePostSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Validation failed", 400,
      parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    );
  }

  const updated = await db.post.update({
    where: { id },
    data: parsed.data,
  });

  return apiSuccess(updated);
}

// DELETE /api/posts/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (!session) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });

  if (!post) {
    return apiError("NOT_FOUND", "Post not found", 404);
  }

  if (post.authorId !== session.userId) {
    return apiError("FORBIDDEN", "You can only delete your own posts", 403);
  }

  await db.post.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
```

### 2. Error Response Format Implementation

A centralized error handler that converts all errors to a consistent RFC 7807 format:

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
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

export function handleApiError(error: unknown): NextResponse {
  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      },
      { status: error.statusCode }
    );
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  // Prisma unique constraint violation
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = (error.meta?.target as string[])?.join(", ") ?? "field";
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `A record with this ${target} already exists`,
        },
      },
      { status: 409 }
    );
  }

  // Prisma record not found
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      },
      { status: 404 }
    );
  }

  // Unknown errors — log full error, return generic message
  console.error("Unhandled API error:", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}

// Usage in route handler
// app/api/posts/route.ts
export async function POST(request: NextRequest) {
  try {
    // ... handler logic
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 3. Cursor-Based Pagination

A reusable cursor pagination utility for Prisma:

```typescript
// lib/pagination.ts
import { z } from "zod";

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CursorPaginationParams = z.infer<typeof CursorPaginationSchema>;

interface CursorPaginationResult<T> {
  data: T[];
  meta: {
    hasMore: boolean;
    nextCursor: string | undefined;
    limit: number;
  };
}

export async function cursorPaginate<T extends { id: string }>(
  findMany: (args: {
    take: number;
    cursor?: { id: string };
    skip?: number;
  }) => Promise<T[]>,
  params: CursorPaginationParams
): Promise<CursorPaginationResult<T>> {
  const { cursor, limit } = params;

  // Fetch one extra to determine if there are more results
  const items = await findMany({
    take: limit + 1,
    ...(cursor && {
      cursor: { id: decodeCursor(cursor) },
      skip: 1, // Skip the cursor item itself
    }),
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor =
    hasMore && data.length > 0
      ? encodeCursor(data[data.length - 1].id)
      : undefined;

  return {
    data,
    meta: { hasMore, nextCursor, limit },
  };
}

function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id })).toString("base64url");
}

function decodeCursor(cursor: string): string {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString()
    );
    return decoded.id;
  } catch {
    throw new Error("Invalid cursor");
  }
}
```

### 4. GraphQL Schema with DataLoader

A complete GraphQL setup with Pothos, DataLoader, and relay-style pagination:

```typescript
// graphql/schema.ts
import SchemaBuilder from "@pothos/core";
import RelayPlugin from "@pothos/plugin-relay";
import { db } from "@/lib/db";
import DataLoader from "dataloader";
import type { User, Post } from "@prisma/client";

// Context with DataLoaders
export interface GraphQLContext {
  userId: string | null;
  loaders: ReturnType<typeof createLoaders>;
}

function createLoaders() {
  return {
    user: new DataLoader<string, User>(async (ids) => {
      const users = await db.user.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(users.map((u) => [u.id, u]));
      return ids.map(
        (id) => map.get(id) ?? new Error(`User ${id} not found`)
      );
    }),
    postsByAuthor: new DataLoader<string, Post[]>(async (authorIds) => {
      const posts = await db.post.findMany({
        where: { authorId: { in: [...authorIds] } },
      });
      const grouped = new Map<string, Post[]>();
      for (const post of posts) {
        const list = grouped.get(post.authorId) ?? [];
        list.push(post);
        grouped.set(post.authorId, list);
      }
      return authorIds.map((id) => grouped.get(id) ?? []);
    }),
  };
}

const builder = new SchemaBuilder<{ Context: GraphQLContext }>({
  plugins: [RelayPlugin],
  relay: {},
});

// Types
const UserType = builder.node("User", {
  id: { resolve: (user) => user.id },
  fields: (t) => ({
    name: t.exposeString("name"),
    email: t.exposeString("email"),
    posts: t.connection({
      type: PostType,
      resolve: async (user, args, ctx) => {
        const posts = await ctx.loaders.postsByAuthor.load(user.id);
        // Apply relay connection pagination
        return resolveConnection(posts, args);
      },
    }),
  }),
});

const PostType = builder.node("Post", {
  id: { resolve: (post) => post.id },
  fields: (t) => ({
    title: t.exposeString("title"),
    content: t.exposeString("content"),
    status: t.exposeString("status"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    author: t.field({
      type: UserType,
      resolve: (post, _args, ctx) => ctx.loaders.user.load(post.authorId),
    }),
  }),
});

// Queries
builder.queryType({
  fields: (t) => ({
    post: t.field({
      type: PostType,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: (_root, args) => db.post.findUnique({ where: { id: String(args.id) } }),
    }),
    posts: t.connection({
      type: PostType,
      args: {
        status: t.arg.string(),
        search: t.arg.string(),
      },
      resolve: async (_root, args) => {
        const posts = await db.post.findMany({
          where: {
            ...(args.status && { status: args.status }),
            ...(args.search && {
              title: { contains: args.search, mode: "insensitive" },
            }),
          },
          orderBy: { createdAt: "desc" },
        });
        return resolveConnection(posts, args);
      },
    }),
  }),
});

export const schema = builder.toSchema();
```

### 5. OpenAPI Spec Auto-Generated from Zod

Using `zod-openapi` to generate an OpenAPI 3.1 specification from your Zod validation schemas:

```typescript
// lib/openapi.ts
import { z } from "zod";
import { extendZodWithOpenApi, createDocument } from "zod-openapi";

extendZodWithOpenApi(z);

// Shared schemas
const PostSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    content: z.string(),
    status: z.enum(["draft", "published", "archived"]),
    authorId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Post");

const CreatePostSchema = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    status: z.enum(["draft", "published"]).default("draft"),
  })
  .openapi("CreatePost");

const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z
        .array(z.object({ field: z.string(), message: z.string() }))
        .optional(),
    }),
  })
  .openapi("Error");

const PaginationMeta = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
  limit: z.number(),
});

// Generate the OpenAPI document
export const apiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    title: "My API",
    version: "1.0.0",
    description: "API documentation auto-generated from Zod schemas",
  },
  servers: [
    { url: "https://api.example.com", description: "Production" },
    { url: "http://localhost:3000", description: "Local development" },
  ],
  paths: {
    "/api/v1/posts": {
      get: {
        operationId: "listPosts",
        summary: "List posts",
        tags: ["Posts"],
        parameters: [
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
            description: "Pagination cursor",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            description: "Number of items per page",
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["draft", "published", "archived"] },
          },
        ],
        responses: {
          "200": {
            description: "List of posts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Post" } },
                    meta: PaginationMeta,
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      post: {
        operationId: "createPost",
        summary: "Create a post",
        tags: ["Posts"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePost" },
            },
          },
        },
        responses: {
          "201": {
            description: "Post created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Post" } },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
  },
});

// Serve the spec
// app/api/docs/route.ts
import { apiDocument } from "@/lib/openapi";

export function GET() {
  return Response.json(apiDocument);
}
```

---

## Common Mistakes

### 1. Verbs in URLs

**Wrong:**

```
POST /api/createUser
GET  /api/getUsers
POST /api/deleteUser/42
PUT  /api/updateUserEmail
```

**Fix:** Use nouns for resources and HTTP methods for actions. `POST /api/users` to create, `GET /api/users` to list, `DELETE /api/users/42` to delete, `PATCH /api/users/42` to update.

### 2. Inconsistent Response Shapes

**Wrong:**

```typescript
// GET /api/users returns an array
[{ id: 1, name: "Alice" }]

// GET /api/posts returns an envelope
{ data: [{ id: 1, title: "Hello" }], total: 10 }

// GET /api/users/1 returns flat object
{ id: 1, name: "Alice" }
```

**Fix:** Every endpoint uses the same envelope. Single resources: `{ data: resource }`. Collections: `{ data: [], meta: {} }`. Errors: `{ error: { code, message } }`. No exceptions.

### 3. Offset Pagination at Scale

**Wrong:**

```sql
SELECT * FROM posts ORDER BY created_at DESC OFFSET 100000 LIMIT 20;
-- Database must scan and discard 100,000 rows
```

**Fix:** Use cursor-based pagination for any dataset that could grow large. `WHERE created_at < $cursor ORDER BY created_at DESC LIMIT 20` uses an index and performs consistently regardless of depth.

### 4. No API Versioning

**Wrong:** Shipping v1 without versioning, then needing to make breaking changes with no migration path.

**Fix:** Start with `/api/v1/` from day one. When breaking changes are needed, create `/api/v2/`, support both simultaneously, and set sunset dates on v1.

### 5. Returning 200 for Errors

**Wrong:**

```typescript
// Always returns 200
return NextResponse.json({
  success: false,
  error: "User not found",
});
```

**Fix:** Use appropriate HTTP status codes. `404` for not found, `400` for validation errors, `401` for auth failures. Every HTTP client and middleware relies on status codes for error handling.

### 6. Nesting Resources Too Deep

**Wrong:**

```
GET /api/organizations/1/teams/5/members/42/posts/99/comments
```

**Fix:** Limit nesting to two levels. Use flat endpoints with query parameter filters: `GET /api/comments?postId=99` or `GET /api/posts/99/comments`. Deep nesting creates brittle URLs and complex routing.

### 7. No Pagination Limits

**Wrong:**

```
GET /api/posts?limit=999999
// Returns entire database, crashes server
```

**Fix:** Enforce a maximum limit (e.g., 100) in validation. Reject or clamp requests that exceed it. Default to a reasonable size (20). Document the limits.

### 8. Exposing Internal Database IDs

**Wrong:**

```json
{ "id": 42, "internalUserId": 7891, "databaseRowVersion": 3 }
```

**Fix:** Use UUIDs or public-facing IDs. Never expose auto-increment IDs (they reveal record counts and are guessable), internal foreign keys, or database metadata. Map internal IDs to public IDs at the API boundary.

### 9. No HATEOAS-Style Links for Discoverability

**Wrong:** Returning bare data with no indication of what actions are available or how to navigate related resources.

**Fix:** Include relevant links in responses so clients can discover actions without hardcoding URLs:

```json
{
  "data": {
    "id": "abc-123",
    "title": "API Design",
    "links": {
      "self": "/api/v1/posts/abc-123",
      "author": "/api/v1/users/42",
      "comments": "/api/v1/posts/abc-123/comments"
    }
  }
}
```

You do not need full HATEOAS compliance — just enough links for navigation and discoverability.

### 10. Undocumented API

**Wrong:** Shipping an API with no documentation, expecting clients to read source code or guess endpoints.

**Fix:** Generate OpenAPI specs from your validation schemas (Zod, Joi). Set up Swagger UI or Scalar for interactive exploration. Include at least one example request and response per endpoint. Document error codes, rate limits, and authentication requirements. Treat documentation as a feature, not an afterthought.

---

> **See also:** [Database-Design](../Database-Design/database-design.md) | [Error-Handling-Logging](../Error-Handling-Logging/error-handling-logging.md) | [Auth-Sessions](../Auth-Sessions/auth-sessions.md) | [Webhooks-Integrations](../Webhooks-Integrations/webhooks-integrations.md) | [Security/API-Security](../../Security/API-Security/api-security.md)
>
> **Last reviewed:** 2026-02
