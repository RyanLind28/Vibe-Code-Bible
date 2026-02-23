# Database Design

> Schema design, PostgreSQL, indexing, migrations, Prisma & Drizzle ORMs, relationships, query optimization, connection pooling, and multi-tenancy — the data layer that makes or breaks your application.

---

## Principles

### 1. Schema Design Fundamentals

Good schema design starts with normalization and ends with pragmatism. Third normal form (3NF) eliminates data duplication and update anomalies. But strict normalization creates excessive JOINs that hurt read performance.

**Practical rules:**

- Start with 3NF — one fact in one place
- Denormalize deliberately for read-heavy queries (materialized views, JSON columns, computed fields)
- Every table gets: `id` (primary key), `created_at`, `updated_at`
- Use `UUID v7` for primary keys — time-sortable, globally unique, no sequence contention (not UUID v4 which fragments B-tree indexes)
- Use `text` over `varchar(n)` in PostgreSQL — there is no performance difference, and arbitrary length limits cause bugs
- Use `timestamptz` (timestamp with time zone), never `timestamp` — timezone-naive timestamps cause data corruption across regions
- Soft delete with `deleted_at` timestamp when you need audit trails; hard delete when you don't

```sql
-- Standard table structure
CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id   UUID NOT NULL REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Partial index: only query non-deleted rows
CREATE INDEX idx_posts_active ON posts (created_at DESC) WHERE deleted_at IS NULL;
```

### 2. Choosing a Database

PostgreSQL is the default. It handles relational data, JSON, full-text search, geospatial queries, and time series. You do not need another database until PostgreSQL proves insufficient for a specific workload.

| Need | Database | When |
|------|----------|------|
| Primary data store | PostgreSQL | Always start here |
| Caching, sessions, queues | Redis | When you need sub-millisecond reads or a message broker |
| Document storage | PostgreSQL JSONB | When documents need relational queries too |
| Pure document store | MongoDB | When schema flexibility is paramount and you don't need JOINs |
| Key-value at massive scale | DynamoDB | When you need single-digit ms reads at any scale |
| Full-text search | PostgreSQL `tsvector` or Elasticsearch | PostgreSQL first; Elasticsearch when search is a core feature |
| Analytics | ClickHouse, BigQuery | When OLAP workloads degrade your OLTP database |

**Polyglot persistence** — using multiple databases — is justified only when a single database cannot serve all access patterns. Every additional database adds operational complexity: backups, monitoring, failover, consistency concerns.

### 3. Prisma ORM

Prisma is a TypeScript-first ORM with a declarative schema, automatic migrations, and generated type-safe client. It is the most popular ORM in the Node.js ecosystem for good reason.

**Schema file (`prisma/schema.prisma`):**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String
  role      Role     @default(MEMBER)
  posts     Post[]
  sessions  Session[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Post {
  id          String    @id @default(uuid()) @db.Uuid
  title       String
  content     String
  status      PostStatus @default(DRAFT)
  author      User      @relation(fields: [authorId], references: [id])
  authorId    String    @map("author_id") @db.Uuid
  tags        Tag[]
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  @@index([authorId])
  @@index([status, createdAt(sort: Desc)])
  @@map("posts")
}

model Tag {
  id    String @id @default(uuid()) @db.Uuid
  name  String @unique
  posts Post[]

  @@map("tags")
}

enum Role {
  ADMIN
  MEMBER
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

**Query API highlights:**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Type-safe query with relation loading
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    posts: {
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
    },
  },
});

// Create with nested relation
const post = await prisma.post.create({
  data: {
    title: "Database Design",
    content: "...",
    author: { connect: { id: userId } },
    tags: {
      connectOrCreate: [
        { where: { name: "backend" }, create: { name: "backend" } },
        { where: { name: "database" }, create: { name: "database" } },
      ],
    },
  },
});

// Transaction
const [post, notification] = await prisma.$transaction([
  prisma.post.update({
    where: { id: postId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  }),
  prisma.notification.create({
    data: { userId: post.authorId, type: "POST_PUBLISHED" },
  }),
]);
```

### 4. Drizzle ORM

Drizzle is a lightweight, SQL-like TypeScript ORM. The schema is defined in TypeScript files, and queries read like SQL. Choose Drizzle when you want closer-to-SQL control without sacrificing type safety.

```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "member"]);
export const postStatusEnum = pgEnum("post_status", ["draft", "published", "archived"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: postStatusEnum("status").notNull().default("draft"),
  authorId: uuid("author_id").notNull().references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

```typescript
// Query API — SQL-like
import { db } from "@/lib/db";
import { posts, users } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

// Select with join
const publishedPosts = await db
  .select({
    id: posts.id,
    title: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(and(eq(posts.status, "published"), isNull(posts.deletedAt)))
  .orderBy(desc(posts.createdAt))
  .limit(20);

// Insert
const [newPost] = await db
  .insert(posts)
  .values({ title: "Hello", content: "World", authorId: userId })
  .returning();
```

**When to choose Prisma vs Drizzle:**

| Factor | Prisma | Drizzle |
|--------|--------|---------|
| Learning curve | Lower — declarative schema | Higher — need SQL knowledge |
| Query style | Object-oriented, chained | SQL-like, explicit JOINs |
| Type safety | Generated types from schema | Inferred types from schema-as-code |
| Raw SQL | `$queryRaw` escape hatch | First-class SQL support |
| Bundle size | Larger (generated client + engine) | Smaller (no engine binary) |
| Serverless | Works with Data Proxy or Accelerate | Works natively (no binary) |
| Migrations | `prisma migrate` (declarative) | `drizzle-kit` (SQL-based) |

### 5. Indexing Strategy

Indexes are the single most important performance lever. A missing index turns a 5ms query into a 5-second table scan.

**Index types in PostgreSQL:**

| Type | Use Case |
|------|----------|
| **B-tree** (default) | Equality and range queries (`=`, `<`, `>`, `BETWEEN`, `ORDER BY`) |
| **Hash** | Equality only (`=`), smaller than B-tree for this case |
| **GIN** | Full-text search (`tsvector`), JSONB containment (`@>`) , arrays |
| **GiST** | Geospatial, range types, nearest-neighbor |
| **BRIN** | Very large tables with naturally ordered data (time series) |

**Indexing rules:**

- **Index every foreign key** — JOINs and cascading deletes use these
- **Index columns in WHERE clauses** that filter large tables
- **Composite indexes** — column order matters. Place equality columns first, range columns last
- **Partial indexes** — index only the rows you query: `CREATE INDEX ... WHERE deleted_at IS NULL`
- **Covering indexes** — include all selected columns to avoid table lookups: `CREATE INDEX ... INCLUDE (title, status)`
- **Don't over-index** — each index slows writes and consumes storage. Remove unused indexes.

```sql
-- Composite index: equality first, then range
CREATE INDEX idx_posts_author_created
  ON posts (author_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- GIN index for JSONB queries
CREATE INDEX idx_posts_metadata ON posts USING GIN (metadata);

-- Covering index (index-only scan)
CREATE INDEX idx_posts_list ON posts (status, created_at DESC)
  INCLUDE (id, title, author_id)
  WHERE deleted_at IS NULL;
```

**Use `EXPLAIN ANALYZE` to verify:**

```sql
EXPLAIN ANALYZE
SELECT id, title, created_at
FROM posts
WHERE author_id = '550e8400-e29b-41d4-a716-446655440000'
  AND status = 'published'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

Look for `Index Scan` or `Index Only Scan`. If you see `Seq Scan` on a large table, you need an index.

### 6. Relationships and Foreign Keys

Foreign keys enforce referential integrity at the database level. They are not optional.

**Relationship patterns:**

```sql
-- One-to-many: User has many Posts
ALTER TABLE posts
  ADD CONSTRAINT fk_posts_author
  FOREIGN KEY (author_id) REFERENCES users(id)
  ON DELETE CASCADE;

-- Many-to-many: Posts have many Tags (junction table)
CREATE TABLE post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Self-referential: Comments can have parent comments
CREATE TABLE comments (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content   TEXT NOT NULL,
  post_id   UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id)
);
```

**Cascade rules:**

| Rule | Meaning | Use When |
|------|---------|----------|
| `CASCADE` | Delete child rows when parent is deleted | Owned data (user's posts, post's comments) |
| `SET NULL` | Set FK to NULL when parent is deleted | Optional relationships (post's category) |
| `RESTRICT` | Prevent parent deletion if children exist | Critical references (order items → orders) |
| `SET DEFAULT` | Set FK to default value | Rarely used |

**Soft deletes:**

```typescript
// Prisma middleware for soft deletes
prisma.$use(async (params, next) => {
  if (params.model === "Post") {
    if (params.action === "delete") {
      params.action = "update";
      params.args.data = { deletedAt: new Date() };
    }
    if (params.action === "findMany" || params.action === "findFirst") {
      params.args.where = { ...params.args.where, deletedAt: null };
    }
  }
  return next(params);
});
```

### 7. Migrations

Migrations are version-controlled database changes. Every schema change goes through a migration — never modify production databases by hand.

**Prisma Migrate:**

```bash
# Create migration from schema changes
npx prisma migrate dev --name add_published_at

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

**Drizzle Kit:**

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (development only)
npx drizzle-kit push
```

**Zero-downtime migration strategy:**

Adding a column with a NOT NULL constraint requires a multi-step approach:

```sql
-- Step 1: Add nullable column (no lock)
ALTER TABLE posts ADD COLUMN slug TEXT;

-- Step 2: Backfill data (in batches, during low traffic)
UPDATE posts SET slug = lower(replace(title, ' ', '-'))
WHERE slug IS NULL
LIMIT 1000;

-- Step 3: Add NOT NULL constraint (after all rows have values)
ALTER TABLE posts ALTER COLUMN slug SET NOT NULL;

-- Step 4: Add unique index concurrently (no lock)
CREATE UNIQUE INDEX CONCURRENTLY idx_posts_slug ON posts (slug);
```

**Rules:**
- Never drop a column that is still read by running code — deploy code changes first, then migrate
- Always write rollback migrations for production changes
- Use `CREATE INDEX CONCURRENTLY` to avoid locking tables
- Batch data migrations to avoid long-running transactions
- Test migrations against a copy of production data before deploying

### 8. Connection Pooling

Every database connection consumes ~10MB of memory. PostgreSQL's default limit is 100 connections. Without pooling, a serverless function with 50 concurrent invocations can exhaust the pool instantly.

**PgBouncer (external pooler):**

The standard solution. Sits between your app and PostgreSQL, multiplexing hundreds of application connections over a small number of database connections.

```
Application (100+ connections) → PgBouncer (20 connections) → PostgreSQL
```

**Prisma connection management:**

```typescript
// Singleton pattern for Prisma (prevents connection leaks in dev)
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

**Serverless connection pooling:**

| Provider | Solution |
|----------|----------|
| Neon | Built-in serverless driver with WebSocket pooling |
| Supabase | Built-in Supavisor pooler |
| PlanetScale | HTTP-based driver (no TCP connections) |
| Prisma | Prisma Accelerate (managed connection pool + cache) |

```typescript
// Neon serverless driver
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const posts = await sql`
  SELECT id, title, created_at
  FROM posts
  WHERE status = 'published'
  ORDER BY created_at DESC
  LIMIT 20
`;
```

### 9. Query Optimization

Slow queries are the most common backend performance issue. Most can be fixed with proper indexing and query design.

**N+1 query problem:**

The most common ORM performance bug. Loading a list of posts and then loading each author separately produces N+1 queries:

```typescript
// BAD: N+1 — 1 query for posts + N queries for authors
const posts = await prisma.post.findMany({ take: 20 });
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
  // 21 total queries for 20 posts
}

// GOOD: Eager loading — 2 queries total
const posts = await prisma.post.findMany({
  take: 20,
  include: { author: { select: { id: true, name: true } } },
});

// GOOD with Drizzle: explicit join — 1 query
const posts = await db
  .select()
  .from(postsTable)
  .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
  .limit(20);
```

**Query analysis workflow:**

1. Enable query logging in development
2. Watch for repeated queries (N+1) or slow queries (>100ms)
3. Run `EXPLAIN ANALYZE` on slow queries
4. Add indexes based on the execution plan
5. Verify with `EXPLAIN ANALYZE` again

**Optimization techniques:**

- **Select only needed columns** — `select: { id: true, title: true }` instead of `select *`
- **Batch operations** — `createMany`, `updateMany` instead of loops
- **Use database-level aggregation** — `COUNT`, `SUM`, `AVG` instead of fetching all rows and computing in JavaScript
- **Avoid `OFFSET` for deep pagination** — use cursor-based pagination
- **Use `EXISTS` instead of `COUNT` for existence checks** — `WHERE EXISTS (SELECT 1 ...)` stops at the first match

### 10. Multi-Tenancy Patterns

Multi-tenant applications serve multiple customers (tenants) from a single deployment. The data isolation strategy affects security, performance, and complexity.

**Shared database with tenant_id (most common):**

```sql
-- Every table has a tenant_id column
CREATE TABLE posts (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title     TEXT NOT NULL,
  -- ... other columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every query filters by tenant_id
CREATE INDEX idx_posts_tenant ON posts (tenant_id, created_at DESC);
```

**Row-Level Security (RLS) for PostgreSQL:**

```sql
-- Enable RLS on the table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their tenant's data
CREATE POLICY tenant_isolation ON posts
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set tenant context per request
SET app.tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Now all queries automatically filter by tenant
SELECT * FROM posts; -- Only returns posts for the set tenant_id
```

```typescript
// Middleware to set tenant context
async function withTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn();
  });
}
```

**Pattern comparison:**

| Pattern | Isolation | Complexity | Cost |
|---------|-----------|------------|------|
| Shared DB + tenant_id | Row-level | Low | Low |
| Shared DB + RLS | Row-level (enforced by DB) | Medium | Low |
| Schema-per-tenant | Schema-level | Medium | Medium |
| Database-per-tenant | Full isolation | High | High |

### 11. Transactions and Concurrency

Transactions ensure that a group of operations either all succeed or all fail. Without transactions, a failure midway through a multi-step operation leaves your data in an inconsistent state.

**ACID properties:**
- **Atomicity** — all operations in a transaction succeed or none do
- **Consistency** — the database moves from one valid state to another
- **Isolation** — concurrent transactions don't interfere with each other
- **Durability** — committed data survives crashes

**Prisma transactions:**

```typescript
// Interactive transaction (multiple operations with logic)
const transfer = await prisma.$transaction(async (tx) => {
  const sender = await tx.account.update({
    where: { id: senderId },
    data: { balance: { decrement: amount } },
  });

  if (sender.balance < 0) {
    throw new Error("Insufficient funds"); // Rolls back everything
  }

  const receiver = await tx.account.update({
    where: { id: receiverId },
    data: { balance: { increment: amount } },
  });

  return { sender, receiver };
});
```

**Optimistic locking (prevent lost updates):**

```typescript
// Add a version column
// UPDATE posts SET title = $1, version = version + 1
// WHERE id = $2 AND version = $3;

const updated = await prisma.post.updateMany({
  where: { id: postId, version: currentVersion },
  data: { title: newTitle, version: { increment: 1 } },
});

if (updated.count === 0) {
  throw new AppError("CONFLICT", "Post was modified by another user", 409);
}
```

**Isolation levels:**

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Use Case |
|-------|-----------|-------------------|-------------|----------|
| Read Uncommitted | Yes | Yes | Yes | Never use in production |
| Read Committed | No | Yes | Yes | PostgreSQL default — fine for most apps |
| Repeatable Read | No | No | Yes | Financial calculations |
| Serializable | No | No | No | Critical consistency (rare) |

### 12. Database Testing

Untested database code is broken code you haven't discovered yet. Tests should run against a real database, not mocks.

**Test database setup:**

```typescript
// test/setup.ts
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
});

afterEach(async () => {
  // Clean tables between tests (order matters for FK constraints)
  await prisma.$transaction([
    prisma.postTag.deleteMany(),
    prisma.post.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

**Factory functions:**

```typescript
// test/factories.ts
import { prisma } from "./setup";
import { faker } from "@faker-js/faker";

export async function createUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]["data"]> = {}) {
  return prisma.user.create({
    data: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      ...overrides,
    },
  });
}

export async function createPost(
  authorId: string,
  overrides: Partial<Parameters<typeof prisma.post.create>[0]["data"]> = {}
) {
  return prisma.post.create({
    data: {
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      authorId,
      ...overrides,
    },
  });
}
```

---

## LLM Instructions

### Designing a Schema

When designing a database schema:

- Start with entities (nouns) and relationships: users, posts, comments, tags
- Every table gets `id` (UUID v7), `created_at`, `updated_at` columns
- Use `text` not `varchar(n)` in PostgreSQL
- Use `timestamptz` not `timestamp`
- Define foreign keys with explicit cascade rules
- Add indexes on foreign keys and commonly filtered columns
- Use enums for fixed sets of values (status, role, type)
- Add `deleted_at` for tables that need soft deletes
- Add a `version` column for tables that need optimistic locking
- Use junction tables for many-to-many (not arrays)

### Choosing Prisma vs Drizzle

When selecting an ORM:

- **Choose Prisma** when: the team is newer to SQL, you want declarative schema management, you prefer object-oriented query style, you need extensive documentation and community support
- **Choose Drizzle** when: you want SQL-like queries, bundle size matters (serverless), you prefer schema-as-code, you need raw SQL frequently
- Both are production-ready — the choice is about team preference and deployment target
- Avoid mixing ORMs in the same project

### Writing Migrations

When creating database migrations:

- One migration per schema change — small, reversible steps
- Never modify existing migrations that have been applied to production
- For adding NOT NULL columns: add as nullable → backfill → set NOT NULL
- For renaming columns: add new column → copy data → update code → drop old column
- Use `CREATE INDEX CONCURRENTLY` to avoid locking
- Always test migrations against a production-like dataset
- Keep migration files in version control

### Optimizing with Indexes

When adding indexes:

- Run `EXPLAIN ANALYZE` on the slow query first
- Look for `Seq Scan` on large tables — that is the problem
- Create a composite index with equality columns first, range columns last
- Use partial indexes to exclude soft-deleted rows
- Use covering indexes (`INCLUDE`) for frequently-selected columns
- Drop unused indexes — they slow writes for no benefit
- After adding an index, run `EXPLAIN ANALYZE` again to confirm improvement

### Testing Database Code

When writing database tests:

- Use a separate test database (not production, not development)
- Run real migrations against the test database
- Clean data between tests (`deleteMany` in reverse FK order)
- Use factory functions for test data — never hardcode IDs or values
- Test edge cases: unique constraint violations, cascade deletes, concurrent updates
- Run tests in parallel with isolated data (use unique identifiers per test)

### Setting Up Query Monitoring

When configuring query monitoring:

- Enable Prisma query logging in development: `log: ["query"]`
- Set a slow query threshold (100ms) and log queries that exceed it
- Monitor connection pool utilization — high wait times mean you need more connections or a pooler
- Track N+1 queries by counting queries per request
- Use `pg_stat_statements` in PostgreSQL to find the slowest queries in production

---

## Examples

### 1. Prisma Schema for SaaS App

A complete schema for a multi-tenant SaaS application with users, organizations, posts, and role-based access:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  slug      String   @unique
  plan      Plan     @default(FREE)
  members   Member[]
  posts     Post[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("organizations")
}

model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  name         String
  avatarUrl    String?   @map("avatar_url")
  memberships  Member[]
  sessions     Session[]
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

model Member {
  id             String       @id @default(uuid()) @db.Uuid
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId         String       @map("user_id") @db.Uuid
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  organizationId String       @map("organization_id") @db.Uuid
  role           MemberRole   @default(MEMBER)
  createdAt      DateTime     @default(now()) @map("created_at")

  @@unique([userId, organizationId])
  @@index([organizationId])
  @@map("members")
}

model Post {
  id             String       @id @default(uuid()) @db.Uuid
  title          String
  content        String
  slug           String
  status         PostStatus   @default(DRAFT)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  organizationId String       @map("organization_id") @db.Uuid
  authorId       String       @map("author_id") @db.Uuid
  tags           Tag[]
  publishedAt    DateTime?    @map("published_at")
  version        Int          @default(1)
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")
  deletedAt      DateTime?    @map("deleted_at")

  @@unique([organizationId, slug])
  @@index([organizationId, status, createdAt(sort: Desc)])
  @@map("posts")
}

model Tag {
  id    String @id @default(uuid()) @db.Uuid
  name  String @unique
  posts Post[]

  @@map("tags")
}

model Session {
  id        String   @id @default(uuid()) @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([token])
  @@index([expiresAt])
  @@map("sessions")
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

enum MemberRole {
  OWNER
  ADMIN
  MEMBER
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### 2. Drizzle Schema Equivalent

The same SaaS schema in Drizzle:

```typescript
// db/schema.ts
import {
  pgTable, uuid, text, timestamp, integer, uniqueIndex, index, pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const planEnum = pgEnum("plan", ["free", "pro", "enterprise"]);
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);
export const postStatusEnum = pgEnum("post_status", ["draft", "published", "archived"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("members_user_org_idx").on(table.userId, table.organizationId),
  index("members_org_idx").on(table.organizationId),
]);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  slug: text("slug").notNull(),
  status: postStatusEnum("status").notNull().default("draft"),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("posts_org_slug_idx").on(table.organizationId, table.slug),
  index("posts_org_status_idx").on(table.organizationId, table.status, table.createdAt),
]);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(members),
  posts: many(posts),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(members),
}));

export const membersRelations = relations(members, ({ one }) => ({
  user: one(users, { fields: [members.userId], references: [users.id] }),
  organization: one(organizations, { fields: [members.organizationId], references: [organizations.id] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  organization: one(organizations, { fields: [posts.organizationId], references: [organizations.id] }),
}));
```

### 3. Zero-Downtime Column Addition Migration

A migration that adds a `slug` column to posts without downtime:

```sql
-- migrations/001_add_post_slug.sql

-- Step 1: Add nullable column (instant, no lock)
ALTER TABLE posts ADD COLUMN slug TEXT;

-- Step 2: Create function for generating slugs
CREATE OR REPLACE FUNCTION generate_slug(title TEXT, id UUID)
RETURNS TEXT AS $$
  SELECT lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 8);
$$ LANGUAGE SQL IMMUTABLE;
```

```typescript
// scripts/backfill-slugs.ts
// Run this as a separate script, not inside the migration
import { prisma } from "@/lib/db";

async function backfillSlugs() {
  const batchSize = 1000;
  let processed = 0;

  while (true) {
    const posts = await prisma.post.findMany({
      where: { slug: null },
      select: { id: true, title: true },
      take: batchSize,
    });

    if (posts.length === 0) break;

    await prisma.$transaction(
      posts.map((post) =>
        prisma.post.update({
          where: { id: post.id },
          data: {
            slug: generateSlug(post.title, post.id),
          },
        })
      )
    );

    processed += posts.length;
    console.log(`Backfilled ${processed} posts`);
  }

  console.log("Backfill complete");
}

function generateSlug(title: string, id: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    id.slice(0, 8)
  );
}

backfillSlugs();
```

```sql
-- migrations/002_enforce_post_slug.sql
-- Run AFTER backfill is complete and code is updated

-- Step 3: Set NOT NULL
ALTER TABLE posts ALTER COLUMN slug SET NOT NULL;

-- Step 4: Add unique index concurrently (no lock)
CREATE UNIQUE INDEX CONCURRENTLY idx_posts_org_slug
  ON posts (organization_id, slug)
  WHERE deleted_at IS NULL;
```

### 4. Index Optimization with EXPLAIN ANALYZE

Diagnosing and fixing a slow query:

```sql
-- Slow query: "List published posts by an author, newest first"
EXPLAIN ANALYZE
SELECT id, title, created_at
FROM posts
WHERE author_id = '550e8400-e29b-41d4-a716-446655440000'
  AND status = 'published'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- BEFORE (no index):
-- Seq Scan on posts (cost=0.00..15234.00 rows=20 width=52) (actual time=45.2..312.8 rows=20)
--   Filter: ((author_id = '...') AND (status = 'published') AND (deleted_at IS NULL))
--   Rows Removed by Filter: 89340
-- Planning Time: 0.2 ms
-- Execution Time: 312.9 ms

-- Add targeted composite index
CREATE INDEX idx_posts_author_published
  ON posts (author_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- AFTER:
-- Index Scan using idx_posts_author_published on posts
--   (cost=0.42..8.50 rows=20 width=52) (actual time=0.03..0.12 rows=20)
--   Index Cond: ((author_id = '...') AND (status = 'published'))
-- Planning Time: 0.3 ms
-- Execution Time: 0.15 ms
```

Performance went from 312ms to 0.15ms — a 2000x improvement from one index.

### 5. N+1 Fix with Prisma Includes

Before and after fixing an N+1 query:

```typescript
// BEFORE: N+1 — 21 queries for 20 posts
async function getPostFeed() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Each iteration makes a separate query
  return Promise.all(
    posts.map(async (post) => ({
      ...post,
      author: await prisma.user.findUnique({
        where: { id: post.authorId },
      }),
      tags: await prisma.tag.findMany({
        where: { posts: { some: { id: post.id } } },
      }),
      _count: await prisma.comment.count({
        where: { postId: post.id },
      }),
    }))
  );
  // Total: 1 + 20 + 20 + 20 = 61 queries
}

// AFTER: 2 queries total (posts + relations)
async function getPostFeed() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true },
      },
      tags: {
        select: { id: true, name: true },
      },
      _count: {
        select: { comments: true },
      },
    },
  });
}
```

### 6. Multi-Tenant Row-Level Security Setup

Complete RLS setup for a multi-tenant application:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (important for security)
ALTER TABLE posts FORCE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;
ALTER TABLE members FORCE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_posts ON posts
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY tenant_comments ON comments
  FOR ALL
  USING (post_id IN (
    SELECT id FROM posts WHERE organization_id = current_setting('app.org_id', true)::uuid
  ));

CREATE POLICY tenant_members ON members
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid);

-- Create a limited application role
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

```typescript
// lib/tenant.ts
import { prisma } from "@/lib/db";

export async function withTenant<T>(
  orgId: string,
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set the tenant context for RLS
    await tx.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true)`;
    return fn(tx as typeof prisma);
  });
}

// Usage in API route
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  const orgId = session.organizationId;

  const posts = await withTenant(orgId, (tx) =>
    tx.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
  );

  return apiSuccess(posts);
}
```

---

## Common Mistakes

### 1. No Indexes on Foreign Keys

**Wrong:** Creating foreign key columns without corresponding indexes.

```prisma
model Post {
  authorId String @map("author_id") @db.Uuid
  // No @@index([authorId]) — JOINs and cascading deletes do full table scans
}
```

**Fix:** Add an index on every foreign key column. Prisma does not create them automatically.

```prisma
model Post {
  authorId String @map("author_id") @db.Uuid

  @@index([authorId])
}
```

### 2. N+1 Queries

**Wrong:** Loading related data in a loop instead of using eager loading or joins.

**Fix:** Use `include` (Prisma) or `innerJoin` (Drizzle) to load related data in a single query. Enable query logging in development to catch N+1 patterns before they reach production.

### 3. Shared Database Connection in Serverless

**Wrong:** Creating a new `PrismaClient` per request in serverless functions, exhausting the connection pool.

**Fix:** Use the singleton pattern (global variable in development) and a connection pooler (PgBouncer, Neon serverless driver, Prisma Accelerate) in production. Set `connection_limit` in the connection string for serverless environments.

### 4. No Migration Rollback Plan

**Wrong:** Running a migration that drops a column in production with no way to undo it.

**Fix:** Write every migration as a reversible pair: up and down. For irreversible operations (dropping data), keep backups and deploy code changes before schema changes. Test rollback procedures regularly.

### 5. UUID v4 as Primary Key

**Wrong:** Using UUID v4 (random) as a primary key, which fragments B-tree indexes and hurts insertion performance.

**Fix:** Use UUID v7 (time-sortable) which maintains insertion order in B-tree indexes. In PostgreSQL, `gen_random_uuid()` generates v4 — use a UUID v7 library or database extension instead.

```typescript
// Use uuid v7
import { uuidv7 } from "uuidv7";

const id = uuidv7(); // Time-sortable UUID
```

### 6. Over-Normalization

**Wrong:** Splitting every attribute into its own table for "purity," resulting in 6-way JOINs for a simple page load.

**Fix:** Normalize to 3NF, then denormalize strategically for read-heavy access patterns. Store computed fields, use JSON columns for flexible metadata, and create materialized views for complex aggregations.

### 7. No Soft Delete Strategy

**Wrong:** Hard-deleting records that might need to be recovered, audited, or are referenced by other data.

**Fix:** Add a `deleted_at` column and filter it out in queries. Use partial indexes (`WHERE deleted_at IS NULL`) so deleted records don't slow down active queries. Implement periodic hard-delete of old soft-deleted records to manage table size.

### 8. Missing created_at and updated_at

**Wrong:** Tables without timestamps, making it impossible to debug when data was created or last modified.

**Fix:** Every mutable table gets `created_at` (default `now()`) and `updated_at` (auto-updated on change). These are free to add and invaluable for debugging, auditing, and cache invalidation.

### 9. Raw Queries Without Parameterization

**Wrong:**

```typescript
// SQL INJECTION VULNERABILITY
const posts = await prisma.$queryRawUnsafe(
  `SELECT * FROM posts WHERE author_id = '${userId}'`
);
```

**Fix:** Always use parameterized queries. Every ORM provides this.

```typescript
const posts = await prisma.$queryRaw`
  SELECT * FROM posts WHERE author_id = ${userId}
`;
```

> Cross-reference: [Security/Backend-Security](../../Security/Backend-Security/backend-security.md) covers SQL injection prevention in depth.

### 10. No Connection Pooling in Production

**Wrong:** Connecting directly to PostgreSQL from a serverless function with `connection_limit=1` per instance, saturating the database's max connections.

**Fix:** Use a connection pooler (PgBouncer, Supavisor, Prisma Accelerate) between your application and database. Configure connection limits based on your deployment: serverless needs aggressive pooling (2–5 connections per instance), traditional servers can use more (10–20).

---

> **See also:** [API-Design](../API-Design/api-design.md) | [Caching-Strategies](../Caching-Strategies/caching-strategies.md) | [Auth-Sessions](../Auth-Sessions/auth-sessions.md) | [Error-Handling-Logging](../Error-Handling-Logging/error-handling-logging.md) | [Security/Backend-Security](../../Security/Backend-Security/backend-security.md) | [Security/Data-Protection](../../Security/Data-Protection/data-protection.md)
>
> **Last reviewed:** 2026-02
