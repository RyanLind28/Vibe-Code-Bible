# Hosting & Deployment

> Platform selection, deployment configuration, serverless and edge functions, CDN caching, preview deployments, custom domains, database provisioning, and container orchestration — shipping code from local to production across Vercel, Cloudflare, Netlify, and Fly.io.

---

## When to Use What

| Feature | Vercel | Cloudflare | Netlify | Fly.io |
|---------|--------|------------|---------|--------|
| **Free tier** | 100 GB bandwidth, 100 GB-hrs serverless | Unlimited requests (Workers free), 500 builds/mo (Pages) | 100 GB bandwidth, 125K serverless invocations | 3 shared VMs, 160 GB outbound |
| **Next.js support** | First-class (built by Vercel) | Via `@cloudflare/next-on-pages` (partial) | Via `@netlify/next` adapter (good) | Via Docker (manual) |
| **Edge functions** | Yes (V8 isolates, global) | Yes (Workers, 300+ PoPs) | Yes (Deno-based, limited regions) | No (containers, not isolates) |
| **Serverless functions** | Yes (AWS Lambda, up to 300s Pro) | Yes (Workers, 30s free / 15min paid) | Yes (AWS Lambda, 10s default / 26s max) | No (long-running containers) |
| **Static hosting** | Yes | Yes (Pages) | Yes | Yes (via Docker) |
| **Docker support** | No | No | No | Yes (native) |
| **CDN** | Vercel Edge Network (global) | Cloudflare CDN (largest network) | Netlify CDN (global) | Anycast (not traditional CDN) |
| **Custom domains** | Yes (free SSL) | Yes (free SSL, DNS required for proxy) | Yes (free SSL) | Yes (free SSL via Let's Encrypt) |
| **Preview deploys** | Yes (per-PR, with comments) | Yes (Pages branch deploys) | Yes (per-PR, with comments) | No (manual staging) |
| **Managed database** | Vercel Postgres (Neon), KV, Blob | D1 (SQLite), KV, R2 (object storage) | No (use external) | Fly Postgres, volumes |
| **Best for** | Next.js apps, JAMstack, rapid iteration | Edge-first architectures, global APIs, DNS/CDN | Static sites, marketing sites, simple fullstack | Docker apps, persistent processes, WebSockets |

**Opinionated recommendations:**

- **Next.js app** -- use Vercel. Built by the same team. Zero-config deployment, automatic ISR, perfect integration.
- **Edge-first architecture** -- use Cloudflare. Workers + KV + D1 + R2 is the most complete edge platform.
- **Static marketing site** -- use Netlify or Cloudflare Pages. Netlify has better form handling. Cloudflare Pages has unlimited bandwidth on free tier.
- **Docker / containers / persistent processes** -- use Fly.io. The only option here that supports Docker natively.
- **Monorepo with multiple services** -- Vercel for the frontend, Fly.io for backend services that need containers.

---

## Principles

### 1. Choose the Simplest Platform That Meets Your Requirements

Start with the managed option. Only move to more control when you hit a real limitation, not a theoretical one.

**Decision waterfall:**

1. Can it run as static files? --> Cloudflare Pages or Netlify
2. Is it a Next.js app? --> Vercel
3. Does it need edge-first with KV/D1/R2? --> Cloudflare Workers + Pages
4. Does it need Docker, persistent connections, or long-running processes? --> Fly.io
5. Is it a simple fullstack app with forms? --> Netlify

### 2. Environment Variables and Secrets Are Configuration, Not Code

Every platform handles environment variables differently. The principle is universal: secrets never go in code, never go in version control, always injected at runtime.

**Naming conventions:**

```typescript
// Public (exposed to browser) — NEXT_PUBLIC_ prefix:
NEXT_PUBLIC_API_URL=https://api.example.com

// Server-only (never sent to browser):
DATABASE_URL=postgres://...
STRIPE_SECRET_KEY=sk_live_...
```

**Critical rule:** if a variable starts with `NEXT_PUBLIC_`, it is bundled into client JavaScript. Never put secrets in public variables.

> Cross-reference: [Security/Secrets-Environment](../../Security/Secrets-Environment/secrets-environment.md) covers secret management, rotation, and vault integration.

### 3. Preview Deployments Are Non-Negotiable

Preview deployments give every PR its own live URL. Reviewers click a link instead of pulling code locally.

- **Vercel** -- automatic per push, PR comments with preview link, environment variables scoped to "Preview"
- **Cloudflare Pages** -- automatic branch deploys at `<branch>.<project>.pages.dev`
- **Netlify** -- automatic deploy previews for PRs with PR comments
- **Fly.io** -- no built-in preview deploys; script it yourself in CI

### 4. Caching Strategy Determines Performance

```typescript
// Static assets with content hash — cache forever
"Cache-Control": "public, max-age=31536000, immutable"

// HTML pages — serve from cache, revalidate in background
"Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600"

// API responses — short cache
"Cache-Control": "public, s-maxage=10, stale-while-revalidate=30"

// Private/authenticated — never cache at CDN
"Cache-Control": "private, no-store"
```

- **Vercel** -- ISR with `revalidate` in `fetch()` or page exports is the recommended caching approach
- **Cloudflare** -- respects `Cache-Control` headers; use Cache Rules or Workers Cache API for control
- **Netlify** -- `Netlify-CDN-Cache-Control` header for CDN-specific caching
- **Fly.io** -- no built-in CDN; put Cloudflare or another CDN in front

### 5. Custom Domains and DNS

Set up your custom domain immediately. DNS propagation can take hours, SSL provisioning can take minutes.

```
# Root domain (example.com)
Vercel:     A record → 76.76.21.21, or CNAME flattening
Cloudflare: CNAME → project.pages.dev (proxied)
Netlify:    ALIAS/ANAME → site.netlify.app
Fly.io:     A record → allocated IP, AAAA for IPv6

# Subdomain (app.example.com) — always CNAME
Vercel:     CNAME → cname.vercel-dns.com
Cloudflare: managed automatically if DNS on Cloudflare
Netlify:    CNAME → site.netlify.app
Fly.io:     CNAME → app-name.fly.dev
```

All four platforms provision free SSL certificates automatically with auto-renewal.

### 6. Monorepo Deployment Requires Explicit Configuration

```
my-monorepo/
  apps/
    web/          # Next.js → Vercel
    api/          # Express → Fly.io
    marketing/    # Static → Netlify
  packages/
    ui/           # Shared components
    db/           # Shared database schema
```

- **Vercel** -- set "Root Directory" to `apps/web`; use `npx turbo-ignore` as "Ignored Build Step"
- **Cloudflare Pages** -- set "Root Directory" in build settings
- **Netlify** -- set `[build] base` in `netlify.toml`
- **Fly.io** -- Dockerfile multi-stage builds to copy only the relevant app

### 7. Automate Everything After the First Manual Deploy

1. Push to branch --> preview deployment (automatic on Vercel/Cloudflare/Netlify)
2. PR opened --> preview URL posted as comment
3. CI runs tests, linting, type checking in parallel
4. PR merged to `main` --> production deployment (automatic)
5. Smoke tests run against live URL
6. If smoke tests fail --> rollback (Vercel instant rollback, `fly releases rollback`)

> Cross-reference: [DevOps/CICD](../../DevOps/CICD/cicd.md) covers CI/CD pipeline design and GitHub Actions workflows.

---

## LLM Instructions

### Vercel

- **Use `vercel.json`** for platform-level settings (headers, rewrites, crons, function config). Use `next.config.ts` for Next.js-specific settings (images, webpack).
- **Default to serverless**, not edge. Use edge runtime only when you need global low latency and can work without Node.js APIs.
- **Set `maxDuration`** explicitly for API routes exceeding the 10-second default. Pro plan: up to 300s.
- **Scope environment variables** to Production, Preview, or Development. Never share a database between production and preview.
- **Configure ISR** via `revalidate` in page exports or `fetch()` options, not manual cache headers.
- **For monorepos**, set Root Directory and configure the "Ignored Build Step" to avoid unnecessary builds.
- **Use `vercel env pull`** to sync environment variables locally.

### Cloudflare

- **Use `wrangler.toml`** as the single source of truth. All bindings (KV, D1, R2, env vars) declared here.
- **Prefer Pages with Functions** for new projects (file-based routing in `/functions`) over standalone Workers, unless you need a pure API.
- **Use D1 for relational data** at the edge (SQLite, globally replicated, 5 GB free). Use raw SQL -- D1 does not support Prisma/Drizzle natively.
- **Use KV for read-heavy key-value data.** KV is eventually consistent (~60s propagation). Not for strong consistency.
- **Use R2 for file storage** -- S3-compatible, zero egress fees. Bind in `wrangler.toml`.
- **Configure DNS through Cloudflare** when using Cloudflare services. Proxied records (orange cloud) enable CDN + DDoS protection.
- **Use `[env.production]` and `[env.staging]`** sections for environment-specific config.

> Cross-reference: [File-Storage](../File-Storage/file-storage.md) covers Cloudflare R2 patterns and file upload workflows.

### Netlify

- **Use `netlify.toml`** for build settings, redirects, headers, edge functions, and deploy contexts.
- **Deploy contexts** control per-environment config: `[context.production]`, `[context.deploy-preview]`, `[context.branch-deploy]`.
- **Serverless functions** go in `netlify/functions/`. Edge functions go in `netlify/edge-functions/` (Deno runtime).
- **Netlify Forms** require no backend -- add `data-netlify="true"` to any `<form>` tag.
- **Redirects** belong in `netlify.toml` `[[redirects]]`, not a `_redirects` file. TOML format supports conditions.
- **For Next.js**, use `@netlify/plugin-nextjs` in `[[plugins]]`.

### Fly.io

- **`fly.toml`** defines app name, region, services, health checks, mounts, and scaling.
- **Always include a Dockerfile.** Use multi-stage builds to keep images small.
- **Use `fly secrets set`** for secrets. Never put secrets in `fly.toml`.
- **Persistent storage requires volumes.** Containers are ephemeral. Create volumes with `fly volumes create`, mount in `fly.toml`.
- **Fly Postgres** is a managed cluster (not serverless). Provision with `fly postgres create`, attach with `fly postgres attach`.
- **Multi-region** is Fly's strength. Set `primary_region` for writes, add replicas with `fly scale count`.
- **Health checks are critical.** Configure in `fly.toml`. Fly uses them to route traffic and restart unhealthy machines.
- **Scale-to-zero** with `auto_stop_machines = "stop"` and `auto_start_machines = true`.

---

## Examples

### Vercel: Complete Next.js Deployment

**`vercel.json`:**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "pnpm turbo build --filter=web",
  "installCommand": "pnpm install",
  "ignoreCommand": "npx turbo-ignore",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ],
  "redirects": [
    { "source": "/blog/:slug", "destination": "/posts/:slug", "permanent": true }
  ],
  "rewrites": [
    { "source": "/api/v1/:path*", "destination": "https://api.example.com/:path*" }
  ],
  "crons": [
    { "path": "/api/cron/sync-data", "schedule": "0 */6 * * *" }
  ]
}
```

**Serverless function with configuration:**

```typescript
// app/api/heavy-task/route.ts
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // seconds (Pro plan for >10s)
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const result = await processHeavyTask(body);

  return NextResponse.json({ data: result }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
```

**Edge function:**

```typescript
// app/api/geo/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // V8 isolate, not Lambda

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    country: request.headers.get("x-vercel-ip-country") ?? "US",
    city: request.headers.get("x-vercel-ip-city") ?? "Unknown",
  });
}
```

**ISR page:**

```typescript
// app/posts/[slug]/page.tsx
import { notFound } from "next/navigation";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await fetch("https://api.example.com/posts").then((r) => r.json());
  return posts.map((post: { slug: string }) => ({ slug: post.slug }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetch(`https://api.example.com/posts/${slug}`, {
    next: { revalidate: 3600 }, // Revalidate every hour
  }).then((r) => r.json());

  if (!post) notFound();
  return <article><h1>{post.title}</h1></article>;
}
```

**Vercel CLI essentials:**

```bash
vercel link                   # Link project
vercel env pull .env.local    # Pull env vars locally
vercel                        # Deploy to preview
vercel --prod                 # Deploy to production
vercel rollback               # Rollback to previous
```

---

### Cloudflare: Workers + D1 + KV + R2

**`wrangler.toml`:**

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2025-12-01"
compatibility_flags = ["nodejs_compat"]

routes = [
  { pattern = "api.example.com/*", zone_name = "example.com" }
]

[[kv_namespaces]]
binding = "CACHE"
id = "abc123def456"
preview_id = "789ghi012jkl"

[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-app-uploads"

[vars]
ENVIRONMENT = "production"

[env.staging]
routes = [{ pattern = "staging-api.example.com/*", zone_name = "example.com" }]
[env.staging.vars]
ENVIRONMENT = "staging"
```

**Worker with D1, KV, and R2:**

```typescript
// src/index.ts
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  STORAGE: R2Bucket;
  ENVIRONMENT: string;
  API_KEY: string; // via `wrangler secret put API_KEY`
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/posts" && request.method === "GET") {
      return handleGetPosts(env, ctx);
    }
    if (url.pathname === "/api/upload" && request.method === "POST") {
      return handleUpload(request, env);
    }
    return new Response("Not Found", { status: 404 });
  },
};

async function handleGetPosts(env: Env, ctx: ExecutionContext): Promise<Response> {
  // Check KV cache first
  const cached = await env.CACHE.get("posts:all", "json");
  if (cached) return Response.json(cached, { headers: { "X-Cache": "HIT" } });

  // Query D1
  const { results } = await env.DB.prepare(
    "SELECT id, title, slug, created_at FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT 20"
  ).bind("published").all();

  // Cache in KV for 5 minutes
  ctx.waitUntil(env.CACHE.put("posts:all", JSON.stringify(results), { expirationTtl: 300 }));

  return Response.json(results, { headers: { "X-Cache": "MISS" } });
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const key = `uploads/${Date.now()}-${file.name}`;
  await env.STORAGE.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: file.name },
  });

  return Response.json({ key, url: `https://cdn.example.com/${key}` });
}
```

**D1 migration:**

```sql
-- migrations/0001_init.sql
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_posts_status ON posts(status);
```

```bash
wrangler d1 migrations apply my-app-db --local   # Local
wrangler d1 migrations apply my-app-db --remote  # Production
```

**Pages with Functions (file-based routing):**

```typescript
// functions/api/posts.ts
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM posts WHERE status = ? LIMIT 20"
  ).bind("published").all();
  return Response.json(results);
};
```

**Wrangler CLI essentials:**

```bash
wrangler login                          # Authenticate
wrangler dev                            # Local development
wrangler deploy                         # Deploy
wrangler deploy --env staging           # Deploy to staging
wrangler secret put API_KEY             # Set secret (prompts for value)
wrangler tail                           # Tail logs in real time
```

---

### Netlify: Static + Serverless + Forms

**`netlify.toml`:**

```toml
[build]
  base = "apps/marketing"
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"
  edge_functions = "netlify/edge-functions"

[build.environment]
  NODE_VERSION = "20"

[context.production]
  command = "npm run build"
  [context.production.environment]
    API_URL = "https://api.example.com"

[context.deploy-preview]
  command = "npm run build:preview"
  [context.deploy-preview.environment]
    API_URL = "https://staging-api.example.com"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[redirects]]
  from = "/old-path"
  to = "/new-path"
  status = 301
  force = true

# SPA fallback
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# API proxy
[[redirects]]
  from = "/api/*"
  to = "https://api.example.com/:splat"
  status = 200
  force = true

# Country-based redirect
[[redirects]]
  from = "/*"
  to = "/uk/:splat"
  status = 302
  conditions = { Country = ["GB"] }

[[edge_functions]]
  path = "/api/geo"
  function = "geolocation"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Serverless function:**

```typescript
// netlify/functions/create-checkout.ts
import type { Handler, HandlerEvent } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const body = JSON.parse(event.body ?? "{}") as { priceId: string; successUrl: string; cancelUrl: string };
  const stripe = await import("stripe").then((m) => new m.default(process.env.STRIPE_SECRET_KEY!));

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: body.priceId, quantity: 1 }],
    success_url: body.successUrl,
    cancel_url: body.cancelUrl,
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: session.id, url: session.url }),
  };
};

export { handler };
```

**Edge function (Deno runtime):**

```typescript
// netlify/edge-functions/geolocation.ts
import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  return Response.json({
    country: context.geo.country?.code ?? "Unknown",
    city: context.geo.city ?? "Unknown",
    timezone: context.geo.timezone,
  });
};

export const config = { path: "/api/geo" };
```

**Netlify Forms (zero-backend):**

```html
<form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
  <p class="hidden"><label>Don't fill this out: <input name="bot-field" /></label></p>
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>
```

**Netlify CLI essentials:**

```bash
netlify login                   # Authenticate
netlify link                    # Link project
netlify dev                     # Local dev with functions
netlify deploy                  # Deploy to preview
netlify deploy --prod           # Deploy to production
netlify env:set API_KEY "val"   # Set env var
```

---

### Fly.io: Containers at the Edge

**`fly.toml`:**

```toml
app = "my-app"
primary_region = "lhr"

[build]
  # Uses Dockerfile in project root

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200

  [[http_service.checks]]
    interval = "15s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/api/health"

[mounts]
  source = "app_data"
  destination = "/data"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

**Dockerfile (Next.js standalone):**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Requires `output: "standalone"` in `next.config.ts`:

```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "standalone" };
export default nextConfig;
```

**Postgres setup:**

```bash
fly postgres create --name my-app-db --region lhr --initial-cluster-size 1
fly postgres attach my-app-db --app my-app  # Sets DATABASE_URL automatically
fly proxy 15432:5432 --app my-app-db         # Local proxy for dev
fly ssh console --app my-app -C "npx prisma migrate deploy"  # Run migrations
```

**Multi-region scaling:**

```bash
fly scale count 1 --region lhr   # London (primary)
fly scale count 1 --region iad   # Virginia
fly scale count 1 --region nrt   # Tokyo
```

**SQLite with persistent volumes:**

```typescript
import Database from "better-sqlite3";

const db = new Database(process.env.DATABASE_PATH ?? "/data/app.db");
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

export { db };
```

**Health check endpoint:**

```typescript
// app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, "ok" | "error"> = { server: "ok" };

  try {
    await db.prepare("SELECT 1").get();
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
```

**Fly CLI essentials:**

```bash
fly auth login                    # Authenticate
fly launch                        # Init app (generates fly.toml + Dockerfile)
fly deploy                        # Deploy
fly secrets set DB_URL="pg://..."  # Set secrets
fly logs                          # View logs
fly ssh console                   # SSH into machine
fly scale count 3                 # Horizontal scale
fly scale vm shared-cpu-2x        # Vertical scale
fly volumes create data --region lhr --size 10  # Create volume
```

**GitHub Actions for Fly.io:**

```yaml
# .github/workflows/deploy-fly.yml
name: Deploy to Fly.io
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## Common Mistakes

### 1. Using the same database for production and preview

**Wrong:** Single `DATABASE_URL` across all Vercel environments.

**Fix:** Scope env vars per environment. Use database branches (Neon, PlanetScale) or separate databases for preview. Preview deployments should never touch production data.

### 2. Not setting `output: "standalone"` for Docker deployments

**Wrong:** Copying entire `.next/` and `node_modules/` into Docker image (500MB+).

**Fix:** Set `output: "standalone"` in `next.config.ts`. Copy only `.next/standalone`, `.next/static`, and `public`. Image drops to 50-100MB.

### 3. Hardcoding URLs instead of environment variables

**Wrong:** `const API_URL = "https://api.example.com"` -- breaks in preview, staging, and local dev.

**Fix:** `const API_URL = process.env.NEXT_PUBLIC_API_URL` -- works in every environment.

### 4. Missing health checks on Fly.io

**Wrong:** No `[[http_service.checks]]` in `fly.toml`.

**Fix:** Always configure health checks. Without them, Fly routes traffic to broken instances. Expose `/api/health` that verifies database connectivity.

### 5. Using KV for data requiring strong consistency

**Wrong:** Using Cloudflare KV for a page-view counter (eventually consistent, ~60s propagation).

**Fix:** Use D1 (SQLite) or Durable Objects for consistent counters. KV is for read-heavy, write-light, eventually-consistent data only.

### 6. Not configuring Ignored Build Step in Vercel monorepos

**Wrong:** Every push triggers builds for all Vercel projects, even if only the backend changed.

**Fix:** Set `npx turbo-ignore web` as the Ignored Build Step in Vercel project settings.

### 7. Forgetting `force_https = true` on Fly.io

**Wrong:** App accessible over plain HTTP. Search engines may index the insecure version.

**Fix:** Always set `force_https = true` in `fly.toml` `[http_service]`.

### 8. Putting secrets in config files

**Wrong:** `DATABASE_URL = "postgres://user:pass@host/db"` in `wrangler.toml` or `fly.toml`.

**Fix:** Use `wrangler secret put` (Cloudflare) or `fly secrets set` (Fly.io). Config files are committed to git. Secrets in config files are secrets in your git history forever.

### 9. Writing to container filesystem on Fly.io

**Wrong:** `fs.writeFileSync("/app/data/file.txt", content)` -- data lost on redeploy.

**Fix:** Create a volume (`fly volumes create`), mount it in `fly.toml`, write to the mount path (`/data/file.txt`).

### 10. Serving static assets without immutable cache headers

**Wrong:** `Cache-Control: public, max-age=3600` for hashed assets (`app-a1b2c3.js`).

**Fix:** `Cache-Control: public, max-age=31536000, immutable` for content-hashed files. The filename changes when the content changes, so cache forever.

---

> **See also:** [DevOps/CICD](../../DevOps/CICD/cicd.md) for CI/CD pipeline design and GitHub Actions | [DevOps/Cloud-Architecture](../../DevOps/Cloud-Architecture/cloud-architecture.md) for infrastructure patterns and multi-region strategy | [File-Storage](../File-Storage/file-storage.md) for Cloudflare R2 and file upload patterns | [Backend/Serverless-Edge](../../Backend/Serverless-Edge/serverless-edge.md) for serverless function patterns and cold start optimization
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
