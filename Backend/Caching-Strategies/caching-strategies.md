# Caching Strategies

> Redis, HTTP caching, application-layer caching, cache invalidation, CDN, stale-while-revalidate, cache-aside, write-through — making your application fast by not doing the same work twice.

---

## Principles

### 1. Why Cache

Caching exists because physics is slow. A round trip to your database takes 1–10ms. A round trip to a user's browser cache takes 0ms. A round trip to a CDN edge node takes 10–50ms instead of 200ms to your origin server.

**Cache benefits:**
- **Latency** — serve responses in microseconds instead of milliseconds
- **Throughput** — handle 100x more requests without scaling the database
- **Cost** — fewer database queries, fewer compute cycles, lower infrastructure bills
- **Resilience** — stale cache can serve requests when the database is down

**The cost of caching:**
- Stale data — cached data is always potentially out of date
- Complexity — invalidation logic, cache warming, monitoring
- Memory — cache storage has limits and costs
- Debugging — "works in production but not staging" is often a cache issue

The rule: **cache only when you can tolerate staleness or have a reliable invalidation strategy.** Don't cache data that must always be fresh (e.g., account balance during a transfer).

### 2. Cache-Aside (Lazy Loading)

The most common caching pattern. The application checks the cache first. On a miss, it reads from the database and writes the result to the cache.

```
Request → Check Cache → HIT → Return cached data
                      → MISS → Query DB → Write to cache → Return data
```

**Characteristics:**
- Data is cached only when requested (lazy)
- Cache misses are expensive (DB query + cache write)
- Works well for read-heavy workloads
- TTL determines staleness tolerance

```typescript
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";

async function getUser(userId: string) {
  const cacheKey = `user:${userId}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss — query database
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  if (!user) return null;

  // 3. Write to cache with TTL
  await redis.set(cacheKey, JSON.stringify(user), "EX", 3600); // 1 hour

  return user;
}
```

### 3. Write-Through and Write-Behind

**Write-through:** Every write goes to the cache AND the database synchronously. The cache is always up to date.

```
Write → Update Cache → Update DB → Return
```

- Pro: Cache is always consistent
- Con: Writes are slower (two writes per operation)
- Use when: Read-heavy data that must always be fresh (user profiles, settings)

**Write-behind (write-back):** Writes go to the cache immediately, and the cache asynchronously flushes to the database.

```
Write → Update Cache → Return → (async) Update DB
```

- Pro: Very fast writes
- Con: Data loss risk if cache fails before flushing
- Use when: High-write throughput, tolerance for brief data loss (analytics, counters)

```typescript
// Write-through example
async function updateUserProfile(userId: string, data: Partial<UserProfile>) {
  // Update database first (source of truth)
  const user = await db.user.update({
    where: { id: userId },
    data,
  });

  // Update cache (keep it fresh)
  const cacheKey = `user:${userId}`;
  await redis.set(cacheKey, JSON.stringify(user), "EX", 3600);

  return user;
}

// Write-behind example (using Redis + background job)
async function incrementViewCount(postId: string) {
  // Write to Redis immediately (fast)
  await redis.hincrby(`post:views`, postId, 1);

  // Flush to database periodically via background job
  // See Background-Jobs guide for BullMQ patterns
}
```

### 4. Redis as Application Cache

Redis is an in-memory data store that supports strings, hashes, lists, sets, sorted sets, and more. It is the standard choice for application-level caching in Node.js applications.

**Key data types for caching:**

| Type | Use Case | Example |
|------|----------|---------|
| String | Simple key-value cache | `SET user:42 '{"name":"Alice"}'` |
| Hash | Object with fields | `HSET user:42 name "Alice" email "a@b.com"` |
| List | Recent items, queues | `LPUSH recent:posts post_id` |
| Set | Unique collections | `SADD post:42:likes user_id` |
| Sorted Set | Leaderboards, ranked data | `ZADD trending 42.5 post_id` |

**Redis client setup:**

```typescript
// lib/redis.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Connection pool for high throughput
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export { redis };
```

**TTL (Time to Live) guidelines:**

| Data Type | TTL | Reason |
|-----------|-----|--------|
| User profile | 1 hour | Changes infrequently |
| API response | 5–60 minutes | Depends on freshness needs |
| Session data | 24 hours | Matches session lifetime |
| Rate limit counters | 1–60 minutes | Matches rate limit window |
| Computed aggregations | 5–15 minutes | Expensive to recompute |

**Eviction policies:**

When Redis runs out of memory, it evicts keys based on the configured policy:

- `allkeys-lru` — evict least recently used keys (recommended for caches)
- `volatile-lru` — evict LRU keys that have a TTL set
- `allkeys-lfu` — evict least frequently used keys
- `noeviction` — reject writes when memory is full (use for critical data)

### 5. HTTP Caching

HTTP caching is free performance. The browser, CDN, and proxy layers cache responses based on headers. Properly configured, most GET requests never reach your server.

**Cache-Control header:**

```
Cache-Control: public, max-age=3600, stale-while-revalidate=60
```

| Directive | Meaning |
|-----------|---------|
| `public` | Any cache (CDN, browser) can store this |
| `private` | Only the browser can cache (user-specific data) |
| `max-age=3600` | Fresh for 1 hour |
| `s-maxage=3600` | Fresh for 1 hour in shared caches (CDN) — overrides `max-age` for CDNs |
| `stale-while-revalidate=60` | Serve stale data for 60 seconds while revalidating in background |
| `no-cache` | Cache can store but must revalidate before serving |
| `no-store` | Never cache (sensitive data, real-time prices) |
| `immutable` | Content will never change (fingerprinted assets) |

**ETag for conditional requests:**

```typescript
// Middleware to add ETag support
import { createHash } from "crypto";

function withETag(response: Response): Response {
  const body = response.body;
  const etag = `"${createHash("md5").update(JSON.stringify(body)).digest("hex")}"`;

  // Check if client's cached version matches
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 }); // Not Modified
  }

  response.headers.set("ETag", etag);
  return response;
}
```

**Recommended cache policies:**

| Resource | Cache-Control |
|----------|---------------|
| Static assets (JS, CSS, images) | `public, max-age=31536000, immutable` (fingerprinted) |
| API: public, rarely changes | `public, max-age=300, stale-while-revalidate=60` |
| API: user-specific | `private, max-age=0, must-revalidate` with ETag |
| API: real-time data | `no-store` |
| HTML pages | `public, max-age=0, stale-while-revalidate=30` |

### 6. Next.js Caching Layers

Next.js has multiple caching layers that interact in complex ways. Understanding them prevents both stale data bugs and unnecessary cache misses.

| Layer | What | Where | Default |
|-------|------|-------|---------|
| Request Memoization | Deduplicates identical `fetch` calls in a single render | Server (per-request) | Automatic |
| Data Cache | Caches `fetch` responses across requests | Server (persistent) | Opted-out in Next.js 15 |
| Full Route Cache | Caches rendered HTML/RSC for static routes | Server (build + runtime) | Static routes only |
| Router Cache | Caches RSC payload in browser for navigation | Client (session) | 30 seconds (dynamic), 5 minutes (static) |

**Revalidation strategies:**

```typescript
// Time-based revalidation
const posts = await fetch("https://api.example.com/posts", {
  next: { revalidate: 60 }, // Revalidate every 60 seconds
});

// On-demand revalidation with cache tags
import { revalidateTag } from "next/cache";

// In your data fetching
const posts = await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] },
});

// When data changes (e.g., in a Server Action or webhook handler)
revalidateTag("posts");

// Path-based revalidation
import { revalidatePath } from "next/cache";
revalidatePath("/blog");
```

> Cross-reference: [Frontend/Data-Fetching](../../Frontend/Data-Fetching/data-fetching.md) covers client-side caching and React Query patterns.

### 7. Cache Invalidation

Cache invalidation is the hardest problem in computer science (along with naming and off-by-one errors). The goal: remove or update cached data when the source changes.

**Strategies:**

| Strategy | How | When |
|----------|-----|------|
| **TTL-based** | Data expires after a fixed time | Acceptable staleness (5 min, 1 hour) |
| **Event-driven** | Invalidate on write/update events | Data must be fresh after changes |
| **Tag-based** | Tag cache entries, invalidate by tag | Next.js `revalidateTag`, Cloudflare cache tags |
| **Version-based** | Include version in cache key | Schema changes, config updates |
| **Purge all** | Clear the entire cache | Deployments, emergency fixes |

**Event-driven invalidation:**

```typescript
// When a post is updated, invalidate all related caches
async function updatePost(postId: string, data: Partial<Post>) {
  const post = await db.post.update({ where: { id: postId }, data });

  // Invalidate specific cache entries
  await Promise.all([
    redis.del(`post:${postId}`),
    redis.del(`user:${post.authorId}:posts`),
    redis.del(`feed:latest`),
  ]);

  // If using Next.js cache tags
  revalidateTag(`post-${postId}`);
  revalidateTag("posts");

  return post;
}
```

**The invalidation checklist:**
1. Identify every place the data is cached (Redis, CDN, browser, Next.js)
2. Identify every event that changes the data (create, update, delete, import)
3. Wire each event to invalidate the correct cache keys
4. Test by updating data and verifying the cache reflects the change
5. Set a TTL as a safety net — even if invalidation fails, data eventually refreshes

### 8. CDN and Edge Caching

A CDN (Content Delivery Network) caches responses at edge nodes close to users worldwide. A request from Tokyo hits a Tokyo edge node instead of your Virginia origin server — saving 200ms of network latency.

**How CDN caching works:**

```
User → CDN Edge (cache HIT) → Return cached response (10ms)
User → CDN Edge (cache MISS) → Origin server → Cache at edge → Return (200ms)
```

**CDN cache configuration (Vercel):**

```typescript
// Next.js Route Handler with CDN caching
export async function GET() {
  const posts = await getPublishedPosts();

  return Response.json({ data: posts }, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      // s-maxage: CDN caches for 5 minutes
      // stale-while-revalidate: serve stale for 60s while refreshing
    },
  });
}
```

**Vary header:**

The `Vary` header tells the CDN which request headers affect the response. Without it, the CDN might serve a desktop response to a mobile user.

```
Vary: Accept-Encoding, Accept-Language
```

- `Vary: Accept-Encoding` — different cache entries for gzip vs brotli
- `Vary: Cookie` — **never do this** — it creates a cache entry per user, defeating the CDN

**Cache keys:**

CDNs cache by URL + Vary headers. To cache different versions:
- Use query parameters: `/api/posts?lang=en` vs `/api/posts?lang=ja`
- Use different paths: `/en/blog` vs `/ja/blog`
- Use Cloudflare Cache Rules or Vercel's `Cache-Control` header for fine-grained control

### 9. Cache Stampede Prevention

A cache stampede occurs when a popular cache key expires, and hundreds of concurrent requests all miss the cache and hit the database simultaneously. This can overwhelm the database and cascade into a full outage.

**Prevention strategies:**

**1. Mutex (lock-based):**

```typescript
async function getWithLock<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check cache first
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Try to acquire a lock
  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, "1", "EX", 10, "NX");

  if (acquired) {
    try {
      // We got the lock — fetch and cache
      const data = await fetchFn();
      await redis.set(key, JSON.stringify(data), "EX", ttl);
      return data;
    } finally {
      await redis.del(lockKey);
    }
  }

  // Another process holds the lock — wait and retry
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getWithLock(key, ttl, fetchFn);
}
```

**2. Probabilistic early expiration:**

Refresh the cache before it expires. Each request has a small probability of refreshing early, spreading the load.

```typescript
async function getWithEarlyExpiry<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const result = await redis.get(key);
  if (!result) {
    const data = await fetchFn();
    await redis.set(key, JSON.stringify({ data, fetchedAt: Date.now() }), "EX", ttl);
    return data;
  }

  const { data, fetchedAt } = JSON.parse(result);
  const age = Date.now() - fetchedAt;
  const expiryMs = ttl * 1000;

  // Probability of refresh increases as TTL approaches
  // At 80% of TTL, ~20% chance of refresh
  if (Math.random() < (age / expiryMs - 0.8) * 5) {
    // Refresh in background (don't block the response)
    fetchFn().then((newData) => {
      redis.set(key, JSON.stringify({ data: newData, fetchedAt: Date.now() }), "EX", ttl);
    });
  }

  return data;
}
```

**3. Stale-while-revalidate in application code:**

```typescript
async function getWithStale<T>(
  key: string,
  ttl: number,
  staleTtl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);

  if (cached) {
    const { data, fetchedAt } = JSON.parse(cached);
    const age = (Date.now() - fetchedAt) / 1000;

    if (age < ttl) {
      return data; // Fresh — return immediately
    }

    if (age < ttl + staleTtl) {
      // Stale but acceptable — return stale, refresh in background
      fetchFn().then((newData) => {
        redis.set(key, JSON.stringify({ data: newData, fetchedAt: Date.now() }), "EX", ttl + staleTtl);
      });
      return data;
    }
  }

  // Expired or not cached — fetch fresh
  const data = await fetchFn();
  await redis.set(key, JSON.stringify({ data, fetchedAt: Date.now() }), "EX", ttl + staleTtl);
  return data;
}
```

### 10. Distributed Caching

When your application runs on multiple servers, each server's local cache diverges. Distributed caching with Redis ensures all servers see the same cached data.

**Multi-layer cache (local + Redis + DB):**

```typescript
// In-memory cache (per-server, fastest)
const localCache = new Map<string, { data: unknown; expiresAt: number }>();

async function getWithMultiLayer<T>(
  key: string,
  localTtl: number,   // seconds for local cache
  redisTtl: number,    // seconds for Redis cache
  fetchFn: () => Promise<T>
): Promise<T> {
  // Layer 1: Local in-memory cache (0ms)
  const local = localCache.get(key);
  if (local && local.expiresAt > Date.now()) {
    return local.data as T;
  }

  // Layer 2: Redis (1-5ms)
  const cached = await redis.get(key);
  if (cached) {
    const data = JSON.parse(cached) as T;
    localCache.set(key, { data, expiresAt: Date.now() + localTtl * 1000 });
    return data;
  }

  // Layer 3: Database (5-100ms)
  const data = await fetchFn();

  // Write to both cache layers
  await redis.set(key, JSON.stringify(data), "EX", redisTtl);
  localCache.set(key, { data, expiresAt: Date.now() + localTtl * 1000 });

  return data;
}
```

**Redis Cluster:**

For applications that outgrow a single Redis instance:

- **Redis Cluster** — automatic sharding across multiple nodes, built-in failover
- **Redis Sentinel** — monitoring and automatic failover for single-master setups
- Key naming: use hash tags `{user}:42:profile` to ensure related keys land on the same shard

**Consistency considerations:**

- Local caches on different servers may disagree briefly — acceptable for most read-heavy data
- Use Redis Pub/Sub to broadcast invalidation events to all servers
- Keep local cache TTL short (5–30 seconds) to limit inconsistency windows
- Never cache data that requires strong consistency across servers (financial data, inventory counts)

---

## LLM Instructions

### Setting Up Redis

When configuring Redis for an application:

- Use `ioredis` for the Node.js client — it supports clustering, pipelines, and Lua scripting
- Create a singleton Redis connection (like the Prisma singleton pattern)
- Set `maxRetriesPerRequest: 3` and configure a retry strategy with backoff
- Use key prefixes to namespace your cache: `cache:user:42`, `session:abc`, `rate:ip:1.2.3.4`
- Set `allkeys-lru` eviction policy for cache workloads
- Configure `maxmemory` to a fixed size (e.g., 256MB for development, based on needs for production)
- Always set a TTL on cache keys — no TTL means the key lives forever

### Configuring HTTP Caching Headers

When setting Cache-Control headers:

- Static assets with content hashes: `public, max-age=31536000, immutable`
- Public API responses: `public, s-maxage=300, stale-while-revalidate=60`
- User-specific API responses: `private, no-cache` with ETag for conditional requests
- Sensitive data (banking, health): `no-store`
- HTML pages: `public, max-age=0, stale-while-revalidate=30` or use Next.js ISR
- Add `Vary: Accept-Encoding` for compressed responses
- Never use `Vary: Cookie` on CDN-cached responses

### Configuring Next.js Caching

When setting up caching in Next.js:

- Use `revalidate` in `fetch` options for time-based revalidation
- Use `revalidateTag()` and `revalidatePath()` for on-demand invalidation
- Tag related cache entries: `next: { tags: ["posts", `post-${id}`] }`
- Export `revalidate` from layout/page for route-level caching
- Use `unstable_cache` for caching non-fetch data (database queries)
- Be explicit about caching — Next.js 15 defaults to no caching for `fetch`

### Designing an Invalidation Strategy

When planning cache invalidation:

- Map every write operation to the cache keys it affects
- Use event-driven invalidation for data that must be fresh after writes
- Use TTL-based expiration as a safety net (even with event-driven invalidation)
- Tag cache entries for group invalidation (all posts by an author, all data for an org)
- Log cache invalidation events for debugging stale data issues
- Test invalidation by updating data and verifying the cache reflects changes

### Choosing the Right Cache Layer

When deciding where to cache:

- **Browser cache (HTTP headers)** — static assets, public API responses that change slowly
- **CDN edge (s-maxage)** — public content, marketing pages, images, global API responses
- **Application cache (Redis)** — user-specific data, computed results, rate limits, sessions
- **Database query cache** — PostgreSQL has a built-in query plan cache; rarely need to configure
- **In-memory (Map/LRU)** — hot data on a single server, very short TTL (5–30s)

Use the closest cache to the user: browser > CDN > regional Redis > origin server > database.

---

## Examples

### 1. Redis Cache-Aside with TTL for API Responses

A complete caching layer for API responses with TTL and invalidation:

```typescript
// lib/cache.ts
import { redis } from "@/lib/redis";

interface CacheOptions {
  ttl: number;          // seconds
  tags?: string[];       // for group invalidation
}

export async function cached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const { ttl, tags } = options;

  // Check cache
  const existing = await redis.get(`cache:${key}`);
  if (existing) {
    return JSON.parse(existing) as T;
  }

  // Fetch from source
  const data = await fetchFn();

  // Write to cache
  const pipeline = redis.pipeline();
  pipeline.set(`cache:${key}`, JSON.stringify(data), "EX", ttl);

  // Track tags for group invalidation
  if (tags) {
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, `cache:${key}`);
      pipeline.expire(`tag:${tag}`, ttl + 60); // Tag lives slightly longer than cache
    }
  }

  await pipeline.exec();
  return data;
}

export async function invalidateTag(tag: string): Promise<void> {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys, `tag:${tag}`);
  }
}

export async function invalidateKey(key: string): Promise<void> {
  await redis.del(`cache:${key}`);
}

// Usage
async function getPublishedPosts(page: number) {
  return cached(
    `posts:published:page:${page}`,
    () => db.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      skip: (page - 1) * 20,
    }),
    { ttl: 300, tags: ["posts"] }
  );
}

// On write
async function publishPost(postId: string) {
  await db.post.update({ where: { id: postId }, data: { status: "PUBLISHED" } });
  await invalidateTag("posts");
}
```

### 2. HTTP Caching Middleware

Middleware for setting Cache-Control and ETag headers on API responses:

```typescript
// middleware/cache-headers.ts
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

type CachePolicy = "public" | "private" | "no-store";

interface CacheConfig {
  policy: CachePolicy;
  maxAge?: number;          // seconds
  sMaxAge?: number;         // CDN cache seconds
  staleWhileRevalidate?: number;
  etag?: boolean;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  "/api/v1/posts": {
    policy: "public",
    sMaxAge: 300,
    staleWhileRevalidate: 60,
    etag: true,
  },
  "/api/v1/users/me": {
    policy: "private",
    maxAge: 0,
    etag: true,
  },
  "/api/v1/health": {
    policy: "no-store",
  },
};

export function withCacheHeaders(
  handler: (req: NextRequest) => Promise<Response>,
  config: CacheConfig
) {
  return async (req: NextRequest): Promise<Response> => {
    const response = await handler(req);

    if (config.policy === "no-store") {
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    // Build Cache-Control header
    const directives: string[] = [config.policy];
    if (config.maxAge !== undefined) directives.push(`max-age=${config.maxAge}`);
    if (config.sMaxAge !== undefined) directives.push(`s-maxage=${config.sMaxAge}`);
    if (config.staleWhileRevalidate !== undefined) {
      directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }
    response.headers.set("Cache-Control", directives.join(", "));

    // Add ETag
    if (config.etag) {
      const body = await response.clone().text();
      const etag = `"${createHash("sha256").update(body).digest("hex").slice(0, 16)}"`;

      const ifNoneMatch = req.headers.get("if-none-match");
      if (ifNoneMatch === etag) {
        return new Response(null, { status: 304, headers: response.headers });
      }

      response.headers.set("ETag", etag);
    }

    return response;
  };
}
```

### 3. Next.js Revalidation with Cache Tags

On-demand cache invalidation using Next.js cache tags:

```typescript
// lib/data.ts
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const getPost = unstable_cache(
  async (postId: string) => {
    return db.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        tags: { select: { name: true } },
      },
    });
  },
  ["post"],
  { tags: ["posts"], revalidate: 3600 }
);

export const getPostsByAuthor = unstable_cache(
  async (authorId: string) => {
    return db.post.findMany({
      where: { authorId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },
  ["posts-by-author"],
  { tags: ["posts"], revalidate: 600 }
);

// app/actions/posts.ts
"use server";

import { revalidateTag, revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function updatePost(postId: string, data: { title: string; content: string }) {
  await db.post.update({ where: { id: postId }, data });

  // Invalidate all post-related caches
  revalidateTag("posts");

  // Invalidate the specific post page
  revalidatePath(`/posts/${postId}`);
}

export async function deletePost(postId: string) {
  await db.post.delete({ where: { id: postId } });

  revalidateTag("posts");
  revalidatePath("/posts");
}
```

### 4. Cache Stampede Prevention with Mutex

A production-ready cache-aside implementation with mutex lock to prevent stampedes:

```typescript
// lib/cached-query.ts
import { redis } from "@/lib/redis";

interface CachedQueryOptions {
  ttl: number;           // cache duration in seconds
  lockTimeout?: number;  // lock duration in seconds (default: 10)
  retryDelay?: number;   // ms to wait before retrying (default: 100)
  maxRetries?: number;   // max lock wait retries (default: 50)
}

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: CachedQueryOptions
): Promise<T> {
  const {
    ttl,
    lockTimeout = 10,
    retryDelay = 100,
    maxRetries = 50,
  } = options;

  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Try to acquire lock
  const lockKey = `lock:${key}`;
  const lockAcquired = await redis.set(lockKey, "1", "EX", lockTimeout, "NX");

  if (lockAcquired) {
    try {
      // Double-check cache (another process may have just populated it)
      const doubleCheck = await redis.get(key);
      if (doubleCheck) {
        return JSON.parse(doubleCheck) as T;
      }

      // Execute query and populate cache
      const result = await queryFn();
      await redis.set(key, JSON.stringify(result), "EX", ttl);
      return result;
    } finally {
      await redis.del(lockKey);
    }
  }

  // Lock not acquired — wait and retry
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    const result = await redis.get(key);
    if (result) {
      return JSON.parse(result) as T;
    }
  }

  // Fallback: all retries exhausted, query directly
  return queryFn();
}

// Usage
const trendingPosts = await cachedQuery(
  "trending:posts",
  () => db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { viewCount: "desc" },
    take: 10,
    include: { author: { select: { name: true } } },
  }),
  { ttl: 300 } // 5 minutes
);
```

### 5. Multi-Layer Cache

A three-tier caching system: local memory, Redis, database:

```typescript
// lib/multi-cache.ts
import { redis } from "@/lib/redis";
import { LRUCache } from "lru-cache";

// Layer 1: In-memory LRU cache (per server instance)
const memoryCache = new LRUCache<string, string>({
  max: 1000,           // max items
  ttl: 30_000,         // 30 seconds
  maxSize: 50_000_000, // 50MB
  sizeCalculation: (value) => Buffer.byteLength(value),
});

interface MultiCacheOptions {
  memoryTtl?: number;   // seconds (default: 30)
  redisTtl: number;     // seconds
}

export async function multiCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: MultiCacheOptions
): Promise<T> {
  const { memoryTtl = 30, redisTtl } = options;

  // Layer 1: Memory (0ms)
  const memResult = memoryCache.get(key);
  if (memResult) {
    return JSON.parse(memResult) as T;
  }

  // Layer 2: Redis (1-5ms)
  const redisResult = await redis.get(key);
  if (redisResult) {
    // Promote to memory cache
    memoryCache.set(key, redisResult, { ttl: memoryTtl * 1000 });
    return JSON.parse(redisResult) as T;
  }

  // Layer 3: Database (10-100ms)
  const data = await fetchFn();
  const serialized = JSON.stringify(data);

  // Populate both cache layers
  memoryCache.set(key, serialized, { ttl: memoryTtl * 1000 });
  await redis.set(key, serialized, "EX", redisTtl);

  return data;
}

// Invalidation must clear all layers
export async function multiInvalidate(key: string): Promise<void> {
  memoryCache.delete(key);
  await redis.del(key);
}

// For multi-server invalidation, use Redis Pub/Sub
export function setupCacheInvalidationListener() {
  const subscriber = redis.duplicate();
  subscriber.subscribe("cache:invalidate");

  subscriber.on("message", (_channel, key) => {
    memoryCache.delete(key);
  });
}

export async function broadcastInvalidation(key: string): Promise<void> {
  memoryCache.delete(key);
  await redis.del(key);
  await redis.publish("cache:invalidate", key);
}
```

---

## Common Mistakes

### 1. Caching Without an Invalidation Strategy

**Wrong:** Adding Redis caching with a 1-hour TTL and no plan for how stale data gets refreshed when the source changes.

**Fix:** Every cached value needs a defined invalidation path. Map each write operation to the cache keys it affects. Use TTL as a safety net, not the primary invalidation mechanism. Document the invalidation rules alongside the caching code.

### 2. TTL Too Long

**Wrong:** Setting a 24-hour TTL on user profile data, then users complain their name change doesn't appear for a day.

**Fix:** Match TTL to acceptable staleness. Use short TTLs (1–5 minutes) for data that changes often. Combine short TTL with event-driven invalidation for data that must be fresh after writes.

### 3. Caching User-Specific Data in Shared Cache

**Wrong:** Setting `Cache-Control: public, s-maxage=3600` on an endpoint that returns the current user's profile. The CDN serves Alice's profile to Bob.

**Fix:** Use `private` for user-specific data. Never set `public` or `s-maxage` on responses that vary by authentication. Use `Vary: Authorization` or `Vary: Cookie` only if you understand that it effectively disables CDN caching.

### 4. No Cache Warming

**Wrong:** Deploying a new version with an empty cache, causing a burst of cache misses that overwhelm the database.

**Fix:** Pre-populate critical caches before or during deployment. Warm hot keys (trending content, popular users, configuration) by running a script that fetches and caches the most-accessed data.

### 5. Redis as Primary Data Store

**Wrong:** Storing critical data only in Redis without database persistence, then losing data during a Redis restart.

**Fix:** Redis is a cache, not a database (unless you explicitly use Redis persistence with AOF). Store primary data in PostgreSQL. Use Redis for caching, sessions, rate limits, and queues where temporary data loss is acceptable.

### 6. Cache Key Collisions

**Wrong:** Using `cache:user` as a key for all users instead of `cache:user:${userId}`.

**Fix:** Make cache keys specific and predictable. Include all differentiating parameters: `cache:posts:published:page:3:limit:20`. Use a consistent key-building function to prevent typos and collisions.

### 7. Ignoring Cache-Control in API Responses

**Wrong:** Returning API responses with no Cache-Control header, relying on browser defaults (which vary by browser and are usually wrong).

**Fix:** Set explicit Cache-Control headers on every API response. Even `no-store` is better than no header — it tells the browser exactly what to do.

### 8. No Monitoring for Cache Hit Ratio

**Wrong:** Running a cache with no visibility into whether it is actually helping. Cache hit ratio might be 5% — meaning 95% of requests hit the database anyway.

**Fix:** Track cache hit/miss ratio per key pattern. A healthy cache has a hit ratio above 80%. Low hit ratio means the TTL is too short, the keys are too specific, or the data is rarely re-requested. Use Redis `INFO stats` to monitor `keyspace_hits` and `keyspace_misses`.

### 9. Serialization Cost Exceeding Database Query Cost

**Wrong:** Caching a response that takes 2ms to query but 5ms to serialize/deserialize from JSON in Redis.

**Fix:** Profile before caching. Only cache data that is expensive to compute or fetch. For fast queries on small datasets, the overhead of cache serialization, network round-trip to Redis, and deserialization may exceed the original query time.

### 10. Caching Errors

**Wrong:** Caching a `null` result or error response, so subsequent requests get the error from cache instead of retrying.

**Fix:** Only cache successful results. Check that the data is valid before writing to cache. If you must cache negative results (e.g., "this user does not exist"), use a very short TTL (30 seconds) so the cache corrects quickly.

---

> **See also:** [Database-Design](../Database-Design/database-design.md) | [API-Design](../API-Design/api-design.md) | [Serverless-Edge](../Serverless-Edge/serverless-edge.md) | [Error-Handling-Logging](../Error-Handling-Logging/error-handling-logging.md) | [Frontend/Data-Fetching](../../Frontend/Data-Fetching/data-fetching.md)
>
> **Last reviewed:** 2026-02
