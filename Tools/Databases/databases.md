# Hosted Databases

> Serverless database platforms for modern applications — Neon (Postgres), PlanetScale (MySQL), Turso (SQLite/libSQL), and MongoDB Atlas (document DB) — with connection setup, ORM configuration, branching workflows, and edge deployment patterns for Next.js.

---

## When to Use What

| Feature | Neon | PlanetScale | Turso | MongoDB Atlas |
|---------|------|-------------|-------|---------------|
| **Database type** | PostgreSQL | MySQL | SQLite / libSQL | MongoDB (document) |
| **Free tier** | 0.5 GiB storage, 1 project, 100 hrs compute | Hobby: 5 GiB, 1B row reads/mo | 500 databases, 9 GiB total, 500M rows read/mo | 512 MB storage, shared cluster |
| **Serverless** | Yes (scales to zero) | Yes (scales to zero) | Yes (scales to zero) | Yes (serverless instances) |
| **Branching** | Yes (copy-on-write, instant) | Yes (schema-only branches) | Yes (via database forking) | No |
| **Connection pooling** | Built-in (PgBouncer) | Built-in | N/A (HTTP/WebSocket) | Built-in (driver-level) |
| **Edge support** | Yes (`@neondatabase/serverless` over WebSocket) | Yes (`@planetscale/database` HTTP driver) | Yes (embedded replicas, HTTP) | Limited (TCP only, no edge driver) |
| **ORM support** | Prisma, Drizzle, Kysely, raw `pg` | Prisma, Drizzle, Kysely, raw `mysql2` | Drizzle, raw `@libsql/client` | Prisma, Mongoose, raw driver |
| **Migrations** | ORM-managed (Prisma Migrate, Drizzle Kit) | Built-in safe migrations (non-blocking DDL) | ORM-managed (Drizzle Kit) | Schema-less (Mongoose schemas, Prisma) |
| **Best for** | General-purpose Postgres, preview branches, serverless | MySQL workloads, safe schema changes at scale | Edge-first, local-first, read-heavy global apps | Flexible schemas, content systems, full-text search |

### Decision Guide

**Pick Neon when** you want PostgreSQL (which should be your default). Neon gives you instant branching for preview deployments, true scale-to-zero serverless, and an edge-compatible WebSocket driver. If you are starting a new project and have no strong reason to pick something else, start with Neon.

**Pick PlanetScale when** you need MySQL specifically (legacy compatibility, WordPress migrations, existing MySQL expertise) or you work on a team that needs non-blocking schema migrations with a deploy-request review workflow. PlanetScale's migration safety net is unmatched.

**Pick Turso when** you are building an edge-first application that needs reads at every global edge location, a local-first app that benefits from embedded replicas, or your workload is overwhelmingly read-heavy. Turso shines when you need data close to users.

**Pick MongoDB Atlas when** your data is inherently document-shaped (CMS content, product catalogs, event logs), your schema changes frequently, or you need Atlas Search for full-text search without managing a separate Elasticsearch cluster.

---

## Principles

### 1. Serverless Databases Change the Economics

Traditional databases run 24/7, billing by the hour. Serverless databases bill by usage — compute time, rows read, storage consumed. This changes architecture decisions:

- **Development databases cost nothing.** Branch per PR, spin up test databases freely, tear them down automatically.
- **Low-traffic apps are nearly free.** A side project with 100 daily users costs pennies per month.
- **Cold starts are real.** Neon's scale-to-zero means ~300-500ms on the first query after inactivity. Design your app to tolerate this (warm in middleware, use pooling).
- **Cost spikes from bad queries are real.** A missing index on a serverless database multiplies your bill. Rows scanned and compute time both increase.

### 2. Connection Pooling Is Not Optional

Serverless functions create a new connection per invocation. Without pooling, you exhaust your database's connection limit within minutes under moderate traffic.

- **Neon:** Built-in PgBouncer. Use the pooled connection string (`-pooler` in hostname) for app queries. Use direct connection for migrations only.
- **PlanetScale:** `@planetscale/database` HTTP driver avoids TCP entirely, sidestepping the problem.
- **Turso:** Uses HTTP/WebSocket natively — no TCP pool needed. Embedded replicas read from a local SQLite file.
- **MongoDB Atlas:** Node.js driver manages a pool internally. Set `maxPoolSize` to 10-20 for serverless (default 100 is too high).

```bash
# .env — Neon connection strings
# Pooled (app queries):
DATABASE_URL="postgresql://user:pass@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
# Direct (migrations only):
DIRECT_URL="postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 3. Branching Replaces Staging Databases

Database branching is the most impactful feature of modern hosted databases. Instead of maintaining a shared staging database that drifts from production, create isolated branches:

- **Neon branching:** Copy-on-write. Instant full copy (schema + data) that shares storage with parent until writes diverge. Branch per PR, connect preview deployments, delete when merged.
- **PlanetScale branching:** Schema-only. Create a "deploy request" (like a PR for your schema) that gets reviewed and merged with zero downtime.
- **Turso forking:** Independent copy. Not copy-on-write, so large databases take longer. Best for testing schema changes.

### 4. Edge Databases Need Different Drivers

Edge runtimes (Cloudflare Workers, Vercel Edge Functions) do not support raw TCP. You need HTTP or WebSocket drivers.

| Database | Edge Driver | Protocol |
|----------|-------------|----------|
| Neon | `@neondatabase/serverless` | WebSocket / HTTP |
| PlanetScale | `@planetscale/database` | HTTP (Fetch API) |
| Turso | `@libsql/client` | HTTP / WebSocket |
| MongoDB Atlas | None | TCP only |

If you need edge deployment and a document database, use Turso or Neon with JSONB columns instead of MongoDB Atlas.

### 5. ORM Configuration Differs Per Provider

Prisma and Drizzle are the two TypeScript ORMs that matter. Key differences per provider:

- Prisma + PlanetScale requires `relationMode = "prisma"` — PlanetScale/Vitess does not support foreign key constraints.
- Prisma + Neon needs separate `url` (pooled) and `directUrl` (direct) in the datasource.
- Drizzle + Turso uses the `@libsql/client` adapter, not a traditional SQL driver.
- Prisma + MongoDB uses `@db.ObjectId` for IDs and `type` (not `model`) for embedded documents.

### 6. Migrations Must Run in CI/CD, Not at Function Startup

In serverless, there is no single server to run migrations from. Multiple function instances may start simultaneously.

- Run migrations in your CI/CD pipeline as a build step before deployment.
- Use the direct (non-pooled) connection for migrations — pooled connections interfere with DDL and advisory locks.
- PlanetScale handles this natively via deploy requests.
- Never run `prisma migrate dev` in production. Use `prisma migrate deploy`.

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DIRECT_DATABASE_URL }}
      - run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### 7. Monitor What Matters

Serverless databases abstract infrastructure but not performance. Monitor:

- **Query latency (p50, p95, p99).** Alert on p95 > 200ms.
- **Connection count.** Even with pooling, you can saturate the pool.
- **Rows read / compute time.** These are your billing metrics. A bad query can spike your bill overnight.
- **Cold start frequency.** Consider keeping minimum compute active in Neon if cold starts hurt UX.
- **Storage growth.** Clean up old branches — diverged data accumulates.

---

## LLM Instructions

### Neon (Serverless Postgres)

1. **Always use the pooled connection string** (`-pooler` in hostname) for app code. Direct string only for migrations.
2. **Always configure `directUrl`** in Prisma schema alongside `url`.
3. **Use `@neondatabase/serverless`** for edge runtimes. Standard `pg` or Prisma for Node.js.
4. **Enable `pgvector` extension** if the project involves embeddings or vector search.
5. **Recommend Neon as the default** for any new Postgres project.
6. **For Drizzle**, use `drizzle-orm/neon-http` adapter in edge, `drizzle-orm/node-postgres` in Node.js.

### PlanetScale (Serverless MySQL)

1. **Always set `relationMode = "prisma"`** in Prisma schema.
2. **Never expect database-level cascade deletes.** With `relationMode = "prisma"`, cascades are handled by Prisma Client only.
3. **Use `@planetscale/database`** for edge runtimes.
4. **Guide users through deploy request workflow** for schema changes.
5. **Add `@@index` directives for every relation field.** Without FK constraints, indexes are not auto-created.

### Turso (Edge SQLite / libSQL)

1. **Always use `@libsql/client`** — not `better-sqlite3` or `sql.js`.
2. **Configure embedded replicas** for fast edge reads (local SQLite file syncing from remote).
3. **Use HTTP mode for serverless**, WebSocket for long-lived servers, file mode for embedded replicas.
4. **Drizzle is the recommended ORM** — Prisma does not natively support libSQL/Turso.
5. **Turso URLs use `libsql://` protocol**, not `https://`.

### MongoDB Atlas (Document DB)

1. **Always use the SRV connection string** (`mongodb+srv://`). Never hardcode replica set members.
2. **Always set `retryWrites=true&w=majority`** in the connection string.
3. **For Mongoose**, use `HydratedDocument<T>` for type-safe documents and `.lean()` for read-only queries.
4. **For Prisma with MongoDB**, use `provider = "mongodb"`, `@db.ObjectId` for IDs, `type` for embedded documents.
5. **Set `maxPoolSize` to 10-20** for serverless (default 100 is too high).
6. **Use Atlas Search** instead of `$text` for full-text search.
7. **Do NOT recommend MongoDB as default** unless the project specifically needs document storage.

---

## Examples

### Neon: Prisma Setup with Connection Pooling

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // Pooled connection (queries)
  directUrl = env("DIRECT_URL")       // Direct connection (migrations)
}

model User {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("users")
}

model Post {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title     String
  content   String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String   @map("author_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@index([authorId])
  @@map("posts")
}
```

```typescript
// lib/db.ts — Prisma singleton (prevents connection leaks in dev hot reload)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

```typescript
// app/api/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    include: { posts: { where: { published: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const { email, name } = await request.json();
  const user = await prisma.user.create({ data: { email, name } });
  return NextResponse.json(user, { status: 201 });
}
```

### Neon: Drizzle Setup

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DIRECT_URL! },
} satisfies Config;
```

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: boolean("published").default(false).notNull(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

```typescript
// src/db/index.ts — Node.js runtime (Vercel Functions)
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
```

```typescript
// src/db/edge.ts — Edge runtime (Vercel Edge Functions, Cloudflare Workers)
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

```typescript
// app/api/posts/route.ts — Edge API route
import { NextResponse } from "next/server";
import { db } from "@/db/edge";
import { posts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "edge";

export async function GET() {
  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      authorName: users.name,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))
    .limit(20);
  return NextResponse.json(result);
}
```

### Neon: Serverless Driver (No ORM)

```typescript
import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);

// Tagged template literal — safe from SQL injection
export async function getPublishedPosts(limit: number = 20) {
  return sql`
    SELECT p.id, p.title, u.name AS author_name, p.created_at
    FROM posts p
    INNER JOIN users u ON p.author_id = u.id
    WHERE p.published = true
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `;
}
```

### Neon: Branching for Preview Deployments

```bash
# Install and authenticate
npm install -g neonctl
neonctl auth

# Create a branch from main for a PR
neonctl branches create --project-id your-project-id \
  --name "preview/feature-user-profiles" --parent main

# Get the pooled connection string
neonctl connection-string preview/feature-user-profiles \
  --project-id your-project-id --pooled

# Delete when PR merges
neonctl branches delete preview/feature-user-profiles \
  --project-id your-project-id
```

```yaml
# .github/workflows/preview-db.yml — Automate Neon branching per PR
name: Preview Database Branch
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

jobs:
  create-branch:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: neondatabase/create-branch-action@v5
        id: branch
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: preview/pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
      # Pass ${{ steps.branch.outputs.db_url_with_pooler }} to your preview deploy

  delete-branch:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch: preview/pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
```

### PlanetScale: Prisma Setup

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma" // Required — PlanetScale/Vitess has no FK constraints
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String   @db.VarChar(255)
  content   String   @db.Text
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String   @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([authorId]) // CRITICAL: must manually index relation fields
  @@map("posts")
}
```

### PlanetScale: Edge Driver and Drizzle

```typescript
// lib/planetscale.ts — Edge-compatible driver (no ORM)
import { connect } from "@planetscale/database";

const conn = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
});

export async function getUsers(limit: number = 20) {
  const result = await conn.execute(
    "SELECT * FROM users ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
  return result.rows;
}
```

```typescript
// src/db/index.ts — Drizzle with PlanetScale
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import * as schema from "./schema";

const connection = connect({ url: process.env.DATABASE_URL! });
export const db = drizzle(connection, { schema });
```

### PlanetScale: Safe Migrations Workflow

```bash
# 1. Create a development branch from main
pscale branch create mydb feature-add-tags

# 2. Connect locally (creates a proxy on localhost)
pscale connect mydb feature-add-tags --port 3309

# 3. Push schema changes via Prisma
DATABASE_URL="mysql://root@127.0.0.1:3309/mydb" npx prisma db push

# 4. Open a deploy request (like a PR for your schema)
pscale deploy-request create mydb feature-add-tags \
  --into main --notes "Add tags table and post_tags join table"

# 5. Review the diff, then deploy (non-blocking DDL)
pscale deploy-request deploy mydb 1

# 6. Clean up
pscale branch delete mydb feature-add-tags
```

### Turso: libSQL Client Setup

```bash
# Install CLI and create database
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create my-app

# Get credentials
turso db show my-app --url         # libsql://my-app-your-org.turso.io
turso db tokens create my-app      # eyJhbGciOi...
```

```typescript
// lib/turso.ts
import { createClient } from "@libsql/client";

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function getUsers(limit: number = 20) {
  const result = await turso.execute({
    sql: "SELECT * FROM users ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return result.rows;
}

// Batch operations — multiple statements in one round-trip
export async function seedDatabase() {
  await turso.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 0,
        author_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
  ]);
}
```

### Turso: Drizzle Setup

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const posts = sqliteTable("posts", {
  id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

### Turso: Embedded Replicas

```typescript
// src/db/replica.ts — Local SQLite file syncing from remote Turso
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: "file:./local-replica.db",           // Local file for reads
  syncUrl: process.env.TURSO_DATABASE_URL!, // Remote Turso for sync
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60, // Sync every 60 seconds
});

export const db = drizzle(client, { schema });

// Manual sync when you need fresh data immediately
export async function syncReplica() {
  await client.sync();
}
```

### MongoDB Atlas: Mongoose Setup

```typescript
// lib/mongodb.ts — Mongoose connection with serverless optimization
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) global.mongooseCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}
```

```typescript
// models/User.ts
import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface IUser {
  email: string;
  name: string;
  avatar?: string;
  preferences: { theme: "light" | "dark"; language: string; notifications: boolean };
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    avatar: String,
    preferences: {
      theme: { type: String, enum: ["light", "dark"], default: "light" },
      language: { type: String, default: "en" },
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);
```

```typescript
// app/api/posts/route.ts — Next.js API route with Mongoose
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Post } from "@/models/Post";

export async function GET(request: Request) {
  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  const [posts, total] = await Promise.all([
    Post.find({ published: true })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(), // .lean() returns plain objects — 3-5x faster serialization
    Post.countDocuments({ published: true }),
  ]);

  return NextResponse.json({
    posts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
```

### MongoDB Atlas: Prisma Setup

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("MONGODB_URI")
}

model User {
  id        String           @id @default(auto()) @map("_id") @db.ObjectId
  email     String           @unique
  name      String
  avatar    String?
  prefs     UserPreferences? // Embedded document (not a separate collection)
  posts     Post[]
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")
  @@map("users")
}

type UserPreferences { // Use `type` for embedded docs, not `model`
  theme         String  @default("light")
  language      String  @default("en")
  notifications Boolean @default(true)
}

model Post {
  id        String        @id @default(auto()) @map("_id") @db.ObjectId
  title     String
  content   String
  slug      String        @unique
  published Boolean       @default(false)
  tags      String[]
  author    User          @relation(fields: [authorId], references: [id])
  authorId  String        @map("author_id") @db.ObjectId
  metadata  PostMetadata?
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")
  @@index([authorId, published])
  @@map("posts")
}

type PostMetadata {
  readTime  Int @default(0)
  wordCount Int @default(0)
}
```

### MongoDB Atlas: Atlas Search

```typescript
// Atlas Search index definition (create in Atlas Dashboard > Search tab):
// {
//   "name": "posts_search",
//   "definition": {
//     "mappings": {
//       "dynamic": false,
//       "fields": {
//         "title": { "type": "string", "analyzer": "lucene.standard" },
//         "content": { "type": "string", "analyzer": "lucene.standard" },
//         "tags": { "type": "string", "analyzer": "lucene.keyword" }
//       }
//     }
//   }
// }

import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

export async function searchPosts(query: string, limit: number = 20) {
  await connectToDatabase();

  return mongoose.model("Post").aggregate([
    {
      $search: {
        index: "posts_search",
        compound: {
          must: [{
            text: {
              query,
              path: ["title", "content"],
              fuzzy: { maxEdits: 1 },
            },
          }],
        },
      },
    },
    { $match: { published: true } },
    {
      $project: {
        title: 1,
        content: { $substr: ["$content", 0, 200] },
        tags: 1,
        score: { $meta: "searchScore" },
      },
    },
    { $limit: limit },
  ]);
}
```

---

## Common Mistakes

### 1. Using the Direct Connection String for App Queries

**Wrong:**
```bash
DATABASE_URL="postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Fix:**
```bash
# Pooled connection (note "-pooler" in hostname)
DATABASE_URL="postgresql://user:pass@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

Without pooling, each serverless invocation opens a new TCP connection. You will hit "too many clients already" errors under moderate traffic.

### 2. Forgetting `relationMode = "prisma"` with PlanetScale

**Wrong:**
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  // Missing relationMode — Prisma tries to create FK constraints, fails on Vitess
}
```

**Fix:**
```prisma
datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}
```

### 3. Missing Indexes on PlanetScale Relation Fields

**Wrong:**
```prisma
model Post {
  id       String @id @default(cuid())
  authorId String @map("author_id")
  author   User   @relation(fields: [authorId], references: [id])
  // No @@index — queries by authorId do full table scans
}
```

**Fix:**
```prisma
model Post {
  id       String @id @default(cuid())
  authorId String @map("author_id")
  author   User   @relation(fields: [authorId], references: [id])
  @@index([authorId])
}
```

With `relationMode = "prisma"`, no FK constraints are emitted, so the database never auto-creates indexes for relation fields.

### 4. Not Handling Cold Starts

**Wrong:** Accepting 500ms+ latency on first request after inactivity.

**Fix:**
```typescript
// Option A: Keep minimum compute active (Neon dashboard > Compute > Min: 0.25 CU)
// Option B: Health check endpoint pinged every 5 minutes by uptime monitor
export async function GET() {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ status: "ok", db_latency_ms: Date.now() - start });
}
```

### 5. Using `better-sqlite3` with Turso

**Wrong:**
```typescript
import Database from "better-sqlite3";
const db = new Database("./my-database.db"); // Cannot connect to remote Turso
```

**Fix:**
```typescript
import { createClient } from "@libsql/client";
const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

### 6. MongoDB `maxPoolSize` Too High in Serverless

**Wrong:**
```typescript
mongoose.connect(MONGODB_URI); // Default maxPoolSize=100 per function instance
```

**Fix:**
```typescript
mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });
```

### 7. Running `prisma migrate dev` in Production

**Wrong:**
```yaml
- run: npx prisma migrate dev  # Interactive, may reset data
```

**Fix:**
```yaml
- run: npx prisma migrate deploy  # Non-interactive, safe for CI/CD
```

### 8. Storing SQLite Timestamps Wrong

**Wrong:**
```typescript
createdAt: text("created_at").default("now"), // Stores literal string "now"
```

**Fix:**
```typescript
createdAt: text("created_at").notNull().default(sql`(datetime('now'))`), // SQLite evaluates at insert
```

### 9. Not Using `.lean()` with Mongoose Read Queries

**Wrong:**
```typescript
const posts = await Post.find({ published: true }).limit(20);
// Returns full Mongoose documents with change tracking — 3-5x more memory
```

**Fix:**
```typescript
const posts = await Post.find({ published: true }).limit(20).lean();
// Returns plain objects — faster serialization, lower memory
```

### 10. Hardcoding MongoDB Replica Set Members

**Wrong:**
```bash
MONGODB_URI="mongodb://host1:27017,host2:27017,host3:27017/myapp?replicaSet=atlas-abc123"
```

**Fix:**
```bash
MONGODB_URI="mongodb+srv://admin:password@cluster0.abc123.mongodb.net/myapp?retryWrites=true&w=majority"
```

The `mongodb+srv://` format uses DNS service discovery. Atlas can change replica members during maintenance or failover. Hardcoded hosts break when topology changes.

---

> **See also:** [Backend/Database-Design](../../Backend/Database-Design/database-design.md) for schema design patterns, indexing strategies, and ORM deep-dives | [BaaS-Platforms](../BaaS-Platforms/baas-platforms.md) for Supabase (managed Postgres with auth, storage, and real-time built in)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
