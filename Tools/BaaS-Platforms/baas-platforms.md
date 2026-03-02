# BaaS Platforms
> Supabase, Firebase, Convex, and Appwrite — Backend-as-a-Service platforms that give you a database, auth, storage, real-time, and serverless functions without managing infrastructure.

---

## When to Use What

### Comparison Table

| Feature | Supabase | Firebase | Convex | Appwrite |
|---------|----------|----------|--------|----------|
| **Database** | PostgreSQL (full SQL) | Firestore (NoSQL document) | Custom reactive DB (document-relational hybrid) | MariaDB (document collections via REST) |
| **Auth included** | Yes (email, OAuth, magic link, phone) | Yes (email, OAuth, phone, anonymous) | Yes (via integration with Auth0, Clerk) | Yes (email, OAuth, magic link, phone) |
| **Storage** | S3-compatible object storage | Cloud Storage (GCS-backed) | Built-in file storage | S3-compatible object storage |
| **Real-time** | PostgreSQL LISTEN/NOTIFY via WebSockets | Firestore onSnapshot, Realtime Database | Native — every query is real-time by default | Realtime via WebSockets |
| **Edge/Server functions** | Deno Edge Functions | Cloud Functions (Node.js, Python) | Server functions (queries, mutations, actions) | Cloud Functions (Node.js, Python, PHP, Dart, Ruby) |
| **Self-hostable** | Yes (Docker Compose) | No | No | Yes (Docker Compose) |
| **Free tier** | 500 MB DB, 1 GB storage, 2 GB bandwidth | Spark plan: 1 GiB Firestore, 5 GB storage | 1M function calls, 1 GB storage | Unlimited (self-hosted), cloud free tier available |
| **Pricing model** | Usage-based, starts at $25/mo Pro | Pay-as-you-go (Blaze) or free (Spark) | Usage-based, starts at $25/mo Pro | Free self-hosted; Cloud starts at $15/mo |
| **Best for** | SQL-first apps, RLS-heavy multi-tenant, full-stack Next.js | Mobile apps, rapid prototypes, Google ecosystem | Real-time collaborative apps, reactive UIs | Self-hosted control, GDPR compliance, open-source purists |

### Decision Guide

**Pick Supabase when:**
- You want PostgreSQL with full SQL power (joins, views, triggers, CTEs, window functions)
- Row-Level Security is central to your authorization model
- You need a single platform for auth, database, storage, and real-time
- You are building a multi-tenant SaaS where data isolation matters
- You want the option to self-host later
- You are already using or planning to use Next.js

**Pick Firebase when:**
- You are building a mobile-first application (Flutter, React Native, Swift, Kotlin)
- You need offline-first sync (Firestore handles this natively)
- Your data model is hierarchical/document-oriented and does not require complex joins
- You are already in the Google Cloud ecosystem
- You need anonymous auth for progressive onboarding
- Time-to-market is the top priority and your data model is simple

**Pick Convex when:**
- Every piece of state in your app should update in real-time without extra wiring
- You want end-to-end type safety from database to UI with zero boilerplate
- You are building collaborative tools, dashboards, or chat-like experiences
- You want server functions that feel like calling local functions (no REST, no GraphQL)
- You prefer a strongly opinionated framework over à la carte services

**Pick Appwrite when:**
- Self-hosting is a hard requirement (GDPR, data sovereignty, air-gapped environments)
- You want a Firebase-like experience but open-source
- You need full control over the infrastructure and data
- Your team prefers REST APIs over client SDKs
- Budget is constrained and you can manage your own Docker deployment

---

## Principles

### 1. Supabase Architecture and Client Setup

Supabase is a thin layer on top of PostgreSQL, PostgREST, GoTrue (auth), Storage API, and Realtime. The database is always accessible via standard PostgreSQL connections — Supabase does not lock you in. Every table you create is a real PostgreSQL table. Every policy is a real PostgreSQL RLS policy. Every function is a real PostgreSQL function.

**Install the SDK:**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Environment variables (`.env.local`):**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key  # Server-only, never expose
```

The anon key is safe to expose — it is a public API key that respects RLS policies. The service role key bypasses all RLS and must never be sent to the client or committed to version control.

**Browser client (`lib/supabase/client.ts`):**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Server client (`lib/supabase/server.ts`):**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
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
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookie setting is ignored.
            // This is fine; the middleware will handle refresh.
          }
        },
      },
    }
  );
}
```

**Admin client for server-only operations (`lib/supabase/admin.ts`):**

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

**Middleware for session refresh (`middleware.ts`):**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not remove this line — it refreshes the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

This middleware pattern is critical. Supabase uses httpOnly cookies for auth tokens. The middleware intercepts every request, refreshes expired tokens, and passes the updated cookies through. Without it, server-side auth checks return stale or null sessions.

### 2. Supabase Row-Level Security (RLS)

RLS is the authorization layer. It runs at the database level — every query through the client SDK passes through RLS policies. This means even if your application code has a bug, the database itself enforces access rules. RLS is not optional. Enable it on every table that contains user data.

**Enable RLS on a table:**

```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

A table with RLS enabled and no policies denies all access. You must explicitly grant access through policies.

**Core policy patterns:**

```sql
-- Users can read their own posts
CREATE POLICY "Users can read own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read all published posts
CREATE POLICY "Anyone can read published posts"
  ON posts FOR SELECT
  USING (status = 'published');

-- Users can insert posts for themselves
CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);
```

`auth.uid()` returns the authenticated user's UUID from the JWT. `USING` filters which existing rows the user can see or modify. `WITH CHECK` validates new or updated row values.

**Multi-tenant RLS with organization membership:**

```sql
-- Create a helper function for organization membership
CREATE OR REPLACE FUNCTION auth.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = $1
    AND org_members.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Projects belong to organizations — members can read
CREATE POLICY "Org members can read projects"
  ON projects FOR SELECT
  USING (auth.is_org_member(org_id));

-- Only org admins can create projects
CREATE POLICY "Org admins can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = projects.org_id
      AND org_members.user_id = auth.uid()
      AND org_members.role = 'admin'
    )
  );
```

Mark the helper function as `SECURITY DEFINER` so it runs with the privileges of the function owner (bypassing RLS on the `org_members` table itself). Without this, the RLS check would fail because the policy on `projects` would trigger a query on `org_members`, which might have its own RLS policies creating a circular dependency.

**Performance note:** RLS policies run on every query. Avoid complex subqueries in policies. Use indexed columns (`user_id`, `org_id`) and create helper functions with `SECURITY DEFINER` for multi-table checks. Always test policy performance with `EXPLAIN ANALYZE`.

### 3. Supabase Real-Time and Edge Functions

**Real-time subscriptions** use PostgreSQL's replication mechanism. Enable real-time on a table through the Supabase dashboard or SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

**Subscribe to changes in a client component:**

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

export function ChatMessages({ channelId }: { channelId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (data) setMessages(data);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on<Message>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          if (payload.new && "id" in payload.new) {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase]);

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

**Supabase Edge Functions** run on Deno Deploy at the edge. Create one:

```bash
supabase functions new send-notification
```

This creates `supabase/functions/send-notification/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { userId, message } = await req.json();

  // Create a Supabase client with the service role key
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch user email
  const { data: user } = await supabase.auth.admin.getUserById(userId);

  if (!user.user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Send notification via external service
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@yourapp.com",
      to: user.user.email,
      subject: "New Notification",
      html: `<p>${message}</p>`,
    }),
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Deploy with `supabase functions deploy send-notification`. Call from your app:

```typescript
const { data, error } = await supabase.functions.invoke("send-notification", {
  body: { userId: "abc-123", message: "Your order shipped!" },
});
```

### 4. Firebase Setup and Firestore Data Modeling

Firebase uses a NoSQL document model. Data lives in collections and documents. Documents contain fields and can have subcollections. There are no joins — you denormalize data or perform multiple reads.

**Install Firebase:**

```bash
npm install firebase firebase-admin
```

**Environment variables (`.env.local`):**

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

**Client initialization (`lib/firebase/client.ts`):**

```typescript
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

**Admin initialization (`lib/firebase/admin.ts`):**

```typescript
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n"
          ),
        }),
      })
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

**Firestore data modeling rules:**

1. **Denormalize aggressively.** If a post needs to display the author's name and avatar, store them on the post document. Reads are cheap; joins do not exist.
2. **Use subcollections for one-to-many.** `users/{userId}/orders/{orderId}` — each user's orders are a subcollection. This naturally scopes queries and security rules.
3. **Duplicate data, but keep it manageable.** When a user changes their name, you need to update it everywhere it was copied. Use Cloud Functions to fan out updates.
4. **Avoid deeply nested subcollections.** More than 2 levels deep becomes hard to query and secure. Flatten when possible.
5. **Use document references for many-to-many.** Store an array of IDs and fetch the related documents separately.

**Firestore security rules (`firestore.rules`):**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read and update their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Posts — anyone can read published, owners can CRUD
    match /posts/{postId} {
      allow read: if resource.data.status == 'published'
                  || request.auth.uid == resource.data.authorId;
      allow create: if request.auth != null
                    && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if request.auth.uid == resource.data.authorId;
    }

    // Orders — subcollection under users
    match /users/{userId}/orders/{orderId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

**Firebase Auth setup in Next.js (client component):**

```typescript
"use client";

import { auth } from "@/lib/firebase/client";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  const signUp = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password);

  const signInWithGoogle = () =>
    signInWithPopup(auth, new GoogleAuthProvider());

  const signOut = () => auth.signOut();

  return { user, loading, signIn, signUp, signInWithGoogle, signOut };
}
```

**Cloud Functions for server-side logic:**

```typescript
// functions/src/index.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

initializeApp();
const db = getFirestore();

// Fan out author name to all their posts when profile updates
export const onUserUpdated = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const userData = snapshot.data();
    const userId = event.params.userId;

    // Update all posts by this user with the new display name
    const postsSnap = await db
      .collection("posts")
      .where("authorId", "==", userId)
      .get();

    const batch = db.batch();
    postsSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        authorName: userData.displayName,
        authorAvatar: userData.avatarUrl,
      });
    });

    await batch.commit();
  }
);
```

### 5. Convex Setup and Reactive Data

Convex treats the database as a reactive system. Every query is a live subscription — when the underlying data changes, the query re-runs and the UI updates automatically. There is no manual subscription management, no polling, no WebSocket wiring. You define queries, mutations, and actions as server functions, and Convex handles the rest.

**Install Convex:**

```bash
npm install convex
npx convex dev  # Starts the Convex dev server, creates convex/ directory
```

**Schema definition (`convex/schema.ts`):**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_email", ["email"]),

  posts: defineTable({
    title: v.string(),
    content: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    authorId: v.id("users"),
    tags: v.array(v.string()),
    publishedAt: v.optional(v.number()),
  })
    .index("by_author", ["authorId"])
    .index("by_status", ["status"]),

  messages: defineTable({
    channelId: v.string(),
    userId: v.id("users"),
    content: v.string(),
  })
    .index("by_channel", ["channelId"]),
});
```

The schema is the source of truth. Convex generates TypeScript types from it, giving you end-to-end type safety from database to React component.

**Queries (`convex/posts.ts`):**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// This query is reactive — UI auto-updates when data changes
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
  },
});

export const getByAuthor = query({
  args: { authorId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();
  },
});
```

**Mutations (`convex/posts.ts` continued):**

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    authorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      ...args,
      status: "draft",
    });
    return postId;
  },
});

export const publish = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: "published",
      publishedAt: Date.now(),
    });
  },
});
```

**Actions for external API calls (`convex/actions.ts`):**

```typescript
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const sendNotification = action({
  args: { userId: v.id("users"), message: v.string() },
  handler: async (ctx, args) => {
    // Actions can call external APIs
    const user = await ctx.runQuery(api.users.getById, {
      userId: args.userId,
    });

    if (!user) throw new Error("User not found");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@yourapp.com",
        to: user.email,
        subject: "Notification",
        html: `<p>${args.message}</p>`,
      }),
    });
  },
});
```

**Using Convex in React (`app/posts/page.tsx`):**

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function PostsPage() {
  // This query is live — updates automatically when any post changes
  const posts = useQuery(api.posts.listPublished);
  const createPost = useMutation(api.posts.create);

  if (posts === undefined) return <div>Loading...</div>;

  return (
    <div>
      {posts.map((post) => (
        <article key={post._id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}
```

**Convex provider setup (`app/providers.tsx`):**

```typescript
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

### 6. Appwrite Setup and Core Services

Appwrite is a self-hosted BaaS that provides databases, auth, storage, and functions through a REST API and client SDKs. It runs as a set of Docker containers and stores data in MariaDB. The primary advantage over Supabase and Firebase is full infrastructure control — your data never leaves your servers.

**Install the SDK:**

```bash
npm install appwrite node-appwrite
```

**Environment variables (`.env.local`):**

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1  # Or your self-hosted URL
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key  # Server-only
```

**Client initialization (`lib/appwrite/client.ts`):**

```typescript
import { Client, Account, Databases, Storage } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { client };
```

**Server client (`lib/appwrite/server.ts`):**

```typescript
import { Client, Databases, Users, Storage } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const adminDatabases = new Databases(client);
export const adminUsers = new Users(client);
export const adminStorage = new Storage(client);
```

**Appwrite Auth:**

```typescript
"use client";

import { account } from "@/lib/appwrite/client";
import { ID } from "appwrite";

// Sign up
async function signUp(email: string, password: string, name: string) {
  await account.create(ID.unique(), email, password, name);
  await account.createEmailPasswordSession(email, password);
}

// Sign in
async function signIn(email: string, password: string) {
  await account.createEmailPasswordSession(email, password);
}

// OAuth login
async function signInWithGoogle() {
  account.createOAuth2Session(
    "google",
    "http://localhost:3000/auth/callback", // Success URL
    "http://localhost:3000/login"           // Failure URL
  );
}

// Get current user
async function getUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

// Sign out
async function signOut() {
  await account.deleteSession("current");
}
```

**Appwrite database operations:**

```typescript
import { databases } from "@/lib/appwrite/client";
import { ID, Query } from "appwrite";

const DATABASE_ID = "main";
const POSTS_COLLECTION_ID = "posts";

// Create a document
async function createPost(data: {
  title: string;
  content: string;
  authorId: string;
}) {
  return databases.createDocument(
    DATABASE_ID,
    POSTS_COLLECTION_ID,
    ID.unique(),
    {
      ...data,
      status: "draft",
      createdAt: new Date().toISOString(),
    }
  );
}

// List documents with queries
async function listPublishedPosts(limit = 20, offset = 0) {
  return databases.listDocuments(DATABASE_ID, POSTS_COLLECTION_ID, [
    Query.equal("status", "published"),
    Query.orderDesc("createdAt"),
    Query.limit(limit),
    Query.offset(offset),
  ]);
}

// Get a single document
async function getPost(postId: string) {
  return databases.getDocument(DATABASE_ID, POSTS_COLLECTION_ID, postId);
}

// Update a document
async function updatePost(postId: string, data: Partial<{ title: string; content: string; status: string }>) {
  return databases.updateDocument(
    DATABASE_ID,
    POSTS_COLLECTION_ID,
    postId,
    data
  );
}

// Delete a document
async function deletePost(postId: string) {
  return databases.deleteDocument(DATABASE_ID, POSTS_COLLECTION_ID, postId);
}
```

**Appwrite storage:**

```typescript
import { storage } from "@/lib/appwrite/client";
import { ID } from "appwrite";

const BUCKET_ID = "uploads";

async function uploadFile(file: File) {
  return storage.createFile(BUCKET_ID, ID.unique(), file);
}

function getFilePreview(fileId: string, width = 400) {
  return storage.getFilePreview(BUCKET_ID, fileId, width);
}

function getFileDownload(fileId: string) {
  return storage.getFileDownload(BUCKET_ID, fileId);
}
```

**Appwrite real-time subscriptions:**

```typescript
"use client";

import { useEffect, useState } from "react";
import { client, databases } from "@/lib/appwrite/client";
import { Query } from "appwrite";

const DATABASE_ID = "main";
const MESSAGES_COLLECTION_ID = "messages";

export function useRealtimeMessages(channelId: string) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch
    databases
      .listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, [
        Query.equal("channelId", channelId),
        Query.orderAsc("$createdAt"),
      ])
      .then((res) => setMessages(res.documents));

    // Subscribe to changes
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
      (response) => {
        const event = response.events[0];
        if (
          event.includes(".create") &&
          response.payload.channelId === channelId
        ) {
          setMessages((prev) => [...prev, response.payload]);
        }
      }
    );

    return () => unsubscribe();
  }, [channelId]);

  return messages;
}
```

### 7. Type Safety Across All Platforms

Type safety is not optional. Every BaaS platform has a different approach to types, and you need to set it up correctly from day one.

**Supabase — generated types from your schema:**

```bash
npx supabase gen types typescript --project-id your-project > lib/supabase/database.types.ts
```

Then use them:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fully typed — autocomplete on column names, return types inferred
const { data: posts } = await supabase
  .from("posts")
  .select("id, title, content, created_at")
  .eq("status", "published");
// posts is typed as Pick<Post, "id" | "title" | "content" | "created_at">[] | null
```

Add type generation to your CI pipeline and `package.json`:

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > lib/supabase/database.types.ts"
  }
}
```

**Firebase — manual type definitions (Firestore has no schema):**

```typescript
// lib/firebase/types.ts
import {
  collection,
  doc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import { db } from "./client";

// Define your data types
interface Post {
  title: string;
  content: string;
  status: "draft" | "published" | "archived";
  authorId: string;
  authorName: string;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Create a typed converter
const postConverter = {
  toFirestore(post: Post): DocumentData {
    return { ...post };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Post {
    const data = snapshot.data(options);
    return data as Post;
  },
};

// Use typed collection references everywhere
export const postsRef = collection(db, "posts").withConverter(postConverter);
export const postRef = (id: string) =>
  doc(db, "posts", id).withConverter(postConverter);
```

**Convex — types are automatic.** The schema in `convex/schema.ts` generates all types. Queries, mutations, and React hooks are fully typed with zero additional configuration. This is Convex's strongest feature.

**Appwrite — manual types with a helper pattern:**

```typescript
// lib/appwrite/types.ts
import type { Models } from "appwrite";

export interface Post extends Models.Document {
  title: string;
  content: string;
  status: "draft" | "published" | "archived";
  authorId: string;
  tags: string[];
}

// Typed wrapper for database operations
import { databases } from "./client";
import { Query } from "appwrite";

const DATABASE_ID = "main";
const POSTS_COLLECTION_ID = "posts";

export async function listPosts(status?: string) {
  const queries = status ? [Query.equal("status", status)] : [];
  const response = await databases.listDocuments<Post>(
    DATABASE_ID,
    POSTS_COLLECTION_ID,
    queries
  );
  return response.documents; // Typed as Post[]
}
```

---

## LLM Instructions

### Setting Up Supabase in Next.js

When generating a Supabase + Next.js project:

1. Install `@supabase/supabase-js` and `@supabase/ssr`. Do not use the deprecated `@supabase/auth-helpers-nextjs`.
2. Create three client files: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (Server Components and Server Actions), `lib/supabase/admin.ts` (service role, server-only).
3. Create `middleware.ts` at the project root that refreshes the auth session on every request.
4. Generate types with `supabase gen types typescript` and type the client with `createClient<Database>()`.
5. Enable RLS on every table. Write policies using `auth.uid()`. Never rely on application-level checks alone.
6. Use the server client in Server Components and Server Actions. Use the browser client only in Client Components.
7. For real-time, add the table to the `supabase_realtime` publication before subscribing.
8. Store the anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the service role key in `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix).

### Setting Up Firebase in Next.js

When generating a Firebase + Next.js project:

1. Install `firebase` (client) and `firebase-admin` (server). These are separate packages with different APIs.
2. Create `lib/firebase/client.ts` with `initializeApp` guarded by `getApps().length === 0`.
3. Create `lib/firebase/admin.ts` using `cert()` with the service account credentials from environment variables.
4. Firebase Auth does not use httpOnly cookies by default. For SSR auth, use the admin SDK to verify ID tokens in Server Components.
5. Define TypeScript interfaces for every Firestore collection and use `withConverter` for type safety.
6. Write Firestore security rules in `firestore.rules` and deploy them with `firebase deploy --only firestore:rules`.
7. Structure data for the queries you need — Firestore does not support joins. Denormalize.
8. Use Cloud Functions v2 (not v1) for triggers and background tasks.

### Setting Up Convex in Next.js

When generating a Convex + Next.js project:

1. Install `convex` and run `npx convex dev` to initialize the project.
2. Define the schema in `convex/schema.ts`. All tables, indexes, and field types go here.
3. Write queries and mutations in files inside the `convex/` directory. Use `query()` for reads and `mutation()` for writes.
4. Use `"use node"` at the top of action files that need Node.js APIs or external HTTP calls.
5. Wrap the app in `ConvexProvider` in a client component (e.g., `app/providers.tsx`).
6. Use `useQuery()` and `useMutation()` from `convex/react` in client components. Queries are automatically reactive.
7. For server-side data fetching (Server Components), use `fetchQuery` from `convex/nextjs`.
8. Do not create REST API routes — Convex functions replace them entirely.

### Setting Up Appwrite in Next.js

When generating an Appwrite + Next.js project:

1. Install `appwrite` (client) and `node-appwrite` (server).
2. Create `lib/appwrite/client.ts` with `new Client().setEndpoint().setProject()`.
3. Create `lib/appwrite/server.ts` with the additional `.setKey()` for the API key.
4. Create databases and collections through the Appwrite console or CLI. Define attributes and indexes there.
5. Set collection-level permissions (document-level permissions are opt-in).
6. Define TypeScript interfaces extending `Models.Document` for every collection.
7. Use `databases.listDocuments<YourType>()` for typed queries.
8. For real-time, subscribe to `databases.{dbId}.collections.{collectionId}.documents`.

---

## Examples

### 1. Supabase Auth with Next.js App Router

Complete authentication flow with email/password and OAuth:

```typescript
// app/login/page.tsx — Server Component
import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Sign In</h1>
      <LoginForm />
    </div>
  );
}
```

```typescript
// app/login/login-form.tsx — Client Component
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleEmailLogin} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border p-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border p-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">Or</span>
        </div>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full rounded border py-2 text-gray-700 hover:bg-gray-50"
      >
        Continue with Google
      </button>
    </div>
  );
}
```

```typescript
// app/auth/callback/route.ts — OAuth callback handler
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

### 2. Supabase CRUD with Server Actions

```typescript
// app/posts/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const PostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = PostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    tags: formData.getAll("tags"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("posts").insert({
    ...parsed.data,
    user_id: user.id,
    status: "draft",
  });

  if (error) {
    return { error: { _form: [error.message] } };
  }

  revalidatePath("/posts");
  redirect("/posts");
}

export async function updatePost(postId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = PostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    tags: formData.getAll("tags"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("posts")
    .update(parsed.data)
    .eq("id", postId);

  if (error) {
    return { error: { _form: [error.message] } };
  }

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/posts");
  redirect("/posts");
}
```

```typescript
// app/posts/page.tsx — Server Component listing posts
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PostsPage() {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600">Failed to load posts: {error.message}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          href="/posts/new"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          New Post
        </Link>
      </div>
      <ul className="mt-4 space-y-2">
        {posts?.map((post) => (
          <li key={post.id} className="rounded border p-4">
            <Link href={`/posts/${post.id}`} className="font-medium hover:underline">
              {post.title}
            </Link>
            <span className="ml-2 text-sm text-gray-500">{post.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Supabase File Upload with Storage

```typescript
// app/upload/upload-form.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function UploadForm({ userId }: { userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const supabase = createClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    // Validate file size and type
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB");
      setUploading(false);
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      alert(error.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    setUrl(publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {url && <img src={url} alt="Uploaded" className="mt-4 h-32 w-32 rounded-full object-cover" />}
    </div>
  );
}
```

Storage bucket RLS policy (set in Supabase dashboard or SQL):

```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read all avatars (public bucket)
CREATE POLICY "Anyone can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can delete their own avatars
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 4. Firebase Firestore CRUD with Next.js

```typescript
// app/posts/page.tsx — Client Component with Firestore
"use client";

import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/useAuth";

interface Post {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published";
  authorId: string;
  createdAt: Timestamp;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "posts"),
      where("authorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    // Real-time listener — Firestore pushes updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(newPosts);
    });

    return unsubscribe;
  }, [user]);

  async function handleCreate() {
    if (!user) return;

    await addDoc(collection(db, "posts"), {
      title: "New Post",
      content: "",
      status: "draft",
      authorId: user.uid,
      authorName: user.displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function handleDelete(postId: string) {
    await deleteDoc(doc(db, "posts", postId));
  }

  async function handlePublish(postId: string) {
    await updateDoc(doc(db, "posts", postId), {
      status: "published",
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return (
    <div>
      <button onClick={handleCreate} className="rounded bg-blue-600 px-4 py-2 text-white">
        New Post
      </button>
      <ul className="mt-4 space-y-2">
        {posts.map((post) => (
          <li key={post.id} className="flex items-center justify-between rounded border p-4">
            <span>{post.title}</span>
            <div className="space-x-2">
              <button onClick={() => handlePublish(post.id)} className="text-green-600">
                Publish
              </button>
              <button onClick={() => handleDelete(post.id)} className="text-red-600">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 5. Convex Full-Stack Chat

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    name: v.string(),
    createdBy: v.string(),
  }),

  messages: defineTable({
    channelId: v.id("channels"),
    author: v.string(),
    content: v.string(),
  }).index("by_channel", ["channelId"]),
});
```

```typescript
// convex/messages.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("asc")
      .collect();
  },
});

export const send = mutation({
  args: {
    channelId: v.id("channels"),
    author: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", args);
  },
});
```

```typescript
// app/chat/[channelId]/page.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

export default function ChatPage() {
  const params = useParams();
  const channelId = params.channelId as Id<"channels">;
  const [input, setInput] = useState("");

  // Reactive — automatically updates when any message is added
  const messages = useQuery(api.messages.list, { channelId });
  const sendMessage = useMutation(api.messages.send);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    await sendMessage({
      channelId,
      author: "current-user", // Replace with actual auth
      content: input,
    });
    setInput("");
  }

  if (messages === undefined) return <div>Loading...</div>;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg._id} className="mb-2">
            <span className="font-bold">{msg.author}: </span>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2 border-t p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded border p-2"
        />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
          Send
        </button>
      </form>
    </div>
  );
}
```

### 6. Supabase Multi-Tenant SaaS Schema

Complete SQL setup for a multi-tenant application with organizations, members, and role-based access:

```sql
-- Organizations
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members (junction table)
CREATE TABLE org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);

-- Projects belong to organizations
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_org ON projects(org_id);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION auth.org_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM org_members
  WHERE org_members.org_id = $1
  AND org_members.user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = $1
    AND org_members.user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read
CREATE POLICY "Members can read their organizations"
  ON organizations FOR SELECT
  USING (auth.is_org_member(id));

-- Org members: members can read their org's members
CREATE POLICY "Members can read org members"
  ON org_members FOR SELECT
  USING (auth.is_org_member(org_id));

-- Org members: admins and owners can manage members
CREATE POLICY "Admins can manage org members"
  ON org_members FOR ALL
  USING (auth.org_role(org_id) IN ('owner', 'admin'));

-- Projects: members can read, admins can write
CREATE POLICY "Members can read org projects"
  ON projects FOR SELECT
  USING (auth.is_org_member(org_id));

CREATE POLICY "Admins can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  USING (auth.org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Owners can delete projects"
  ON projects FOR DELETE
  USING (auth.org_role(org_id) = 'owner');
```

---

## Common Mistakes

### 1. Exposing the Service Role Key to the Client

**Wrong:** Using `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` or importing the admin client in a client component. The service role key bypasses all RLS — anyone with it has unrestricted access to your entire database.

```typescript
// CATASTROPHIC — service role key in the browser
const supabase = createClient(url, process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY!);
```

**Fix:** The service role key must only exist in server-side code. Use `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix). Create the admin client in a server-only file. The browser client uses the anon key, which is safe to expose because RLS enforces access control.

```typescript
// lib/supabase/admin.ts — server-only
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // No NEXT_PUBLIC_ — server-only
);
```

### 2. Forgetting to Enable RLS

**Wrong:** Creating a Supabase table and leaving RLS disabled. Without RLS, any authenticated user (or anyone with the anon key) can read, insert, update, and delete all rows in the table through the PostgREST API.

**Fix:** Enable RLS on every table that stores user data. A table with RLS enabled and no policies denies all access by default — this is the safe starting position. Add policies explicitly.

```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
-- Now write policies — without them, the table is locked down
```

### 3. Missing Middleware for Supabase Auth

**Wrong:** Using Supabase auth in Next.js without the middleware. Server Components get stale or null auth sessions because the JWT in the cookie has expired and nothing is refreshing it.

```typescript
// Server Component — auth.getUser() returns null even though user is logged in
const { data: { user } } = await supabase.auth.getUser();
// user is null because the token expired and no middleware refreshed it
```

**Fix:** Create `middleware.ts` at the project root that calls `supabase.auth.getUser()` on every request. This triggers the token refresh flow and passes the updated cookies through the response. See the middleware code in Principle 1.

### 4. Using getSession() Instead of getUser() on the Server

**Wrong:** Using `supabase.auth.getSession()` in Server Components or API routes. `getSession()` reads the JWT from the cookie without verifying it with Supabase's auth server. A tampered or expired JWT will return a user object without throwing an error.

**Fix:** Always use `supabase.auth.getUser()` on the server. It makes a network call to Supabase to verify the token. Use `getSession()` only on the client for non-security-critical UI (like showing a user's name).

```typescript
// Server Component or Server Action
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) redirect("/login");
```

### 5. Firestore Data Model Without Thinking About Queries

**Wrong:** Structuring Firestore data like a relational database — separate `users`, `posts`, and `comments` collections with ID references — then discovering you cannot join them and need 3 separate reads to display a post with author and comments.

**Fix:** Design Firestore data for your read patterns. Embed the author's name and avatar directly on the post document. Use subcollections for one-to-many (`posts/{postId}/comments/{commentId}`). Duplicate data deliberately and use Cloud Functions to keep copies in sync when the source changes.

### 6. Not Handling Supabase Errors

**Wrong:** Destructuring `data` without checking `error`. Supabase client methods do not throw — they return `{ data, error }`. Ignoring `error` leads to silent failures and undefined data.

```typescript
// Silent failure — data could be null
const { data: posts } = await supabase.from("posts").select("*");
posts.map(...); // TypeError: Cannot read properties of null
```

**Fix:** Always check the error before using data.

```typescript
const { data: posts, error } = await supabase.from("posts").select("*");

if (error) {
  console.error("Failed to fetch posts:", error.message);
  return <p>Failed to load posts.</p>;
}

// Now posts is guaranteed to be non-null
```

### 7. Overusing Real-Time Subscriptions

**Wrong:** Subscribing to real-time changes on every page, including pages that display static content. Each real-time subscription maintains a WebSocket connection and receives every change to the subscribed table.

**Fix:** Use real-time only for features that genuinely need live updates — chat, collaborative editing, live dashboards, notification feeds. For everything else, use standard queries with `revalidatePath()` or SWR/React Query for periodic refreshing. Supabase real-time connections count toward your plan limits.

### 8. Firebase: Not Using Batched Writes

**Wrong:** Running multiple Firestore writes in sequence, each as a separate network call. If the third write fails, the first two have already committed, leaving your data inconsistent.

```typescript
// Three separate network calls — partial failure possible
await setDoc(doc(db, "posts", postId), postData);
await updateDoc(doc(db, "users", userId), { postCount: increment(1) });
await addDoc(collection(db, "activity"), activityData);
```

**Fix:** Use batched writes for atomic multi-document operations. All writes succeed or all fail.

```typescript
const batch = writeBatch(db);
batch.set(doc(db, "posts", postId), postData);
batch.update(doc(db, "users", userId), { postCount: increment(1) });
batch.set(doc(db, "activity", activityId), activityData);
await batch.commit(); // Atomic — all or nothing
```

### 9. Convex: Calling External APIs in Queries or Mutations

**Wrong:** Making HTTP requests to external services inside a Convex `query()` or `mutation()`. Queries and mutations run in Convex's deterministic runtime, which does not allow side effects like network calls.

**Fix:** Use `action()` for external API calls. Actions run in a Node.js environment (add `"use node"` at the top of the file) and can call queries and mutations internally.

```typescript
// convex/external.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const fetchWeather = action({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    const res = await fetch(`https://api.weather.com/v1/${args.city}`);
    return await res.json();
  },
});
```

### 10. Using the Same Supabase Client Instance Across Requests

**Wrong:** Creating a single Supabase client at module scope and reusing it across all requests. In a serverless environment, this client retains the auth context of the first request, causing subsequent requests to see the wrong user.

```typescript
// lib/supabase/server.ts — WRONG
import { createServerClient } from "@supabase/ssr";

// Module-level client — shared across requests, auth context leaks
export const supabase = createServerClient(url, key, { cookies: ... });
```

**Fix:** Create a new client instance per request. The `createClient()` function should be called inside Server Components, Server Actions, and Route Handlers — not at module scope.

```typescript
// lib/supabase/server.ts — CORRECT
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) { /* ... */ },
    },
  });
}

// Usage — new client per request
export default async function Page() {
  const supabase = await createClient(); // Fresh client
  const { data } = await supabase.from("posts").select("*");
}
```

---

> **See also:** [Authentication](../Authentication/authentication.md) | [Databases](../Databases/databases.md) | [File-Storage](../File-Storage/file-storage.md) | [Backend/Database-Design](../../Backend/Database-Design/database-design.md) | [Security/Authentication-Identity](../../Security/Authentication-Identity/authentication-identity.md) | [Backend/Real-Time](../../Backend/Real-Time/real-time.md) | [Backend/Serverless-Edge](../../Backend/Serverless-Edge/serverless-edge.md) | [Frontend/Nextjs-Patterns](../../Frontend/Nextjs-Patterns/nextjs-patterns.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
