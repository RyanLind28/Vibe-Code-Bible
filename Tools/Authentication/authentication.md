# Authentication Tools
> Clerk, Auth.js, Kinde, and Supabase Auth — practical setup, configuration, and integration patterns for Next.js App Router. Pick the right tool, wire it up correctly, and stop wasting days on auth plumbing.

---

## When to Use What

| Feature | Clerk | Auth.js (NextAuth v5) | Kinde | Supabase Auth |
|---|---|---|---|---|
| **Pricing** | Free up to 10k MAU, then $0.02/MAU | Free (open-source) | Free up to 10.5k MAU, then $0.035/MAU | Free up to 50k MAU (within Supabase free tier) |
| **Pre-built UI** | Full component library (SignIn, SignUp, UserButton, UserProfile, OrganizationSwitcher) | None — you build all UI | Pre-built login/register pages (hosted or embedded) | Pre-built `@supabase/auth-ui-react` components |
| **Social providers** | 20+ (Google, GitHub, Apple, Microsoft, Discord, etc.) | 80+ via built-in providers | 10+ (Google, GitHub, Apple, Microsoft, etc.) | Google, GitHub, Apple, Azure, Discord, Twitter, and more |
| **Organizations / multi-tenant** | First-class: roles, permissions, invitations, domains | None built-in — build yourself | Organizations with roles and permissions | None built-in — use RLS + custom tables |
| **Webhooks** | Yes — user.created, user.updated, session.created, org events | None built-in — use database events or callbacks | Yes — user events, organization events | Database webhooks via Supabase platform |
| **Self-hostable** | No (managed SaaS) | Yes (fully self-hosted) | No (managed SaaS) | Yes (self-host entire Supabase stack) |
| **Database required** | No (Clerk manages user data) | Yes (you need a database + adapter) | No (Kinde manages user data) | Yes (Supabase PostgreSQL) |
| **Best for** | SaaS apps needing fast auth with organizations, teams, and polished UI | Budget-conscious projects wanting full control, or when you already have a database | SaaS apps needing auth + feature flags + permissions in one tool | Apps already using Supabase for database and storage |

### Decision Guide

**Pick Clerk when** you are building a SaaS product, want auth done in an afternoon, need organizations and team management, care about polished UI out of the box, and do not mind a managed service. Clerk is the default recommendation for most Next.js SaaS apps. The DX is unmatched.

**Pick Auth.js when** you need full control over your auth flow, want zero vendor lock-in, are on a tight budget (it is completely free), already have a database and want auth data living alongside your application data, or need to support an unusual provider that only Auth.js has built-in.

**Pick Kinde when** you want managed auth like Clerk but also need built-in feature flags and fine-grained permissions. Kinde is a strong alternative if your product has complex permission models. The feature flag integration is unique.

**Pick Supabase Auth when** you are already using Supabase for your database, storage, and realtime needs. It makes no sense to add a separate auth provider when Supabase Auth integrates directly with Row-Level Security. Do not choose Supabase Auth if you are not using the rest of the Supabase stack.

---

## Principles

### 1. Start Managed, Migrate Open-Source Later If Needed

Building your own auth from scratch in 2026 is almost never the right move. Auth is a liability, not a feature. Every custom auth implementation is a surface area for security vulnerabilities, session bugs, and CSRF holes. The cost of getting auth wrong is not a bug — it is a data breach.

Start with a managed provider like Clerk or Kinde. They handle password hashing, session management, token rotation, MFA, bot detection, and compliance. If you outgrow the managed service (cost, customization limits, data residency), migrate to Auth.js with a Prisma adapter. But most apps never reach that threshold.

```typescript
// The fastest path to production auth: Clerk
// 1. npm install @clerk/nextjs
// 2. Add keys to .env.local
// 3. Wrap your app in ClerkProvider
// 4. Add middleware
// 5. You have auth. Ship the product.

// .env.local
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
// CLERK_SECRET_KEY=sk_test_...
```

The counterargument is vendor lock-in. This is real but manageable. Clerk stores user data in their system, so migrating means exporting users and resetting passwords. Auth.js stores everything in your database, so there is no lock-in. Weigh time-to-market against long-term flexibility. For most startups, shipping faster matters more.

### 2. Middleware Is the First Line of Defense

In Next.js App Router, middleware runs before every request. It is the single best place to enforce authentication because it catches unauthenticated access before any page, API route, or Server Component renders. Never rely solely on component-level auth checks — a missed check in one component means an open door.

Every auth tool covered here provides middleware integration. Use it.

```typescript
// Clerk middleware — protects everything except public routes
// middleware.ts (project root)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/pricing",
  "/about",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

```typescript
// Auth.js middleware — redirect unauthenticated users
// middleware.ts
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnAuth = req.nextUrl.pathname.startsWith("/auth");

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/auth/signin", req.nextUrl));
  }

  if (isOnAuth && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

```typescript
// Supabase Auth middleware — refresh session on every request
// middleware.ts
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

  // IMPORTANT: Do not remove this line. It refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname.startsWith("/dashboard")
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

### 3. Server-Side Auth Is the Source of Truth

Client-side auth hooks (`useUser`, `useSession`) are for UI rendering — showing the user's name, conditionally displaying buttons, toggling navigation. They are never the source of truth for access control. A determined user can manipulate client-side state, fake hook return values, or bypass client-side checks entirely.

All authorization decisions — can this user access this resource? can this user perform this action? — must happen server-side. In Server Components, API routes, and Server Actions.

```typescript
// Clerk — server-side auth in a Server Component
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check organization role for authorization
  if (user.publicMetadata.role !== "admin") {
    redirect("/unauthorized");
  }

  return <AdminDashboard userId={user.id} />;
}
```

```typescript
// Auth.js — server-side auth in a Server Component
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <Dashboard user={session.user} />;
}
```

```typescript
// Supabase — server-side auth in a Server Component
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ensures the user only sees their own data
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  return <NotesList notes={notes} />;
}
```

### 4. Webhooks Sync Auth Events to Your Database

Managed auth providers store user data externally. But your application needs user records in your own database — to associate users with orders, posts, subscriptions, and other domain objects. Webhooks bridge this gap. When a user signs up, updates their profile, or deletes their account, the auth provider sends a webhook to your API, and you create, update, or delete the corresponding record in your database.

This is not optional. Without webhook sync, you end up querying the auth provider's API on every request to check if a user exists in your system, which is slow, fragile, and creates a hard dependency on their uptime.

```typescript
// Clerk webhook handler — sync users to your database
// app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
  }

  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle the event
  switch (evt.type) {
    case "user.created":
      await db.user.create({
        data: {
          clerkId: evt.data.id,
          email: evt.data.email_addresses[0]?.email_address ?? "",
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          imageUrl: evt.data.image_url,
        },
      });
      break;

    case "user.updated":
      await db.user.update({
        where: { clerkId: evt.data.id },
        data: {
          email: evt.data.email_addresses[0]?.email_address ?? "",
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          imageUrl: evt.data.image_url,
        },
      });
      break;

    case "user.deleted":
      await db.user.delete({
        where: { clerkId: evt.data.id },
      });
      break;
  }

  return new Response("OK", { status: 200 });
}
```

```typescript
// Kinde webhook handler
// app/api/webhooks/kinde/route.ts
import { NextResponse } from "next/server";
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const client = jwksClient({
  jwksUri: `${process.env.KINDE_ISSUER_URL}/.well-known/jwks.json`,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(err, signingKey);
  });
}

export async function POST(req: Request) {
  const token = await req.text();

  try {
    const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded as jwt.JwtPayload);
      });
    });

    const eventType = decoded.type;

    switch (eventType) {
      case "user.created": {
        const user = decoded.data?.user;
        await db.user.create({
          data: {
            kindeId: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
          },
        });
        break;
      }
      case "user.updated": {
        const user = decoded.data?.user;
        await db.user.update({
          where: { kindeId: user.id },
          data: {
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
          },
        });
        break;
      }
    }

    return NextResponse.json({ status: 200 });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
```

### 5. Token Storage and Session Security

How and where you store authentication tokens determines your vulnerability surface. This applies to all four tools, though managed providers (Clerk, Kinde) handle most of it for you.

**httpOnly cookies** are the correct default. They cannot be read by JavaScript, which means XSS attacks cannot steal them. Clerk and Kinde handle cookie management automatically. Auth.js uses httpOnly cookies by default. Supabase Auth uses cookies via the `@supabase/ssr` package.

**localStorage is dangerous for tokens.** Any XSS vulnerability gives the attacker full access to tokens stored in localStorage. There are edge cases where localStorage is acceptable (fully client-side SPAs with no server), but in Next.js you always have a server — use cookies.

**Session duration** should balance security with user experience. Short-lived access tokens (15 minutes) plus long-lived refresh tokens (7-30 days) is the standard pattern. Clerk handles this automatically. Auth.js lets you configure `maxAge` on the session. Supabase uses a 1-hour access token with automatic refresh.

```typescript
// Auth.js session configuration
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt", // or "database" if using an adapter
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // refresh session every 24 hours
  },
  cookies: {
    sessionToken: {
      name: "__Secure-authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true, // HTTPS only in production
      },
    },
  },
});
```

### 6. Protect API Routes, Not Just Pages

A common mistake is protecting pages with middleware but leaving API routes wide open. Every API route that serves or mutates user data must independently verify authentication. An attacker does not use your UI — they call your API directly with `curl` or Postman.

```typescript
// Clerk — protecting an API route
// app/api/projects/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const project = await db.project.create({
    data: {
      name: body.name,
      userId,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
```

```typescript
// Auth.js — protecting an API route
// app/api/projects/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(projects);
}
```

```typescript
// Supabase — protecting an API route (RLS handles row-level filtering)
// app/api/notes/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS automatically filters to only this user's notes
  const { data, error } = await supabase.from("notes").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### 7. Environment Variables and Key Management

Auth tools require API keys, secrets, and webhook signing keys. Mismanaging these is one of the fastest paths to a security incident. Every auth provider has a publishable key (safe for the browser) and a secret key (server-only). Mixing them up exposes your secret key in client bundles.

In Next.js, the naming convention is enforced: variables prefixed with `NEXT_PUBLIC_` are bundled into client-side JavaScript. Everything else stays server-only. Never prefix a secret key with `NEXT_PUBLIC_`.

```bash
# .env.local — Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...    # Client-safe
CLERK_SECRET_KEY=sk_test_...                      # Server-only
CLERK_WEBHOOK_SECRET=whsec_...                    # Server-only

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# .env.local — Auth.js
AUTH_SECRET=your-random-secret-at-least-32-chars  # Server-only (generate with: npx auth secret)
AUTH_GOOGLE_ID=...                                 # Server-only
AUTH_GOOGLE_SECRET=...                             # Server-only
AUTH_TRUST_HOST=true                               # Required for non-Vercel deployments

# .env.local — Kinde
KINDE_CLIENT_ID=...                                # Server-only
KINDE_CLIENT_SECRET=...                            # Server-only
KINDE_ISSUER_URL=https://your-app.kinde.com        # Server-only
KINDE_SITE_URL=http://localhost:3000               # Server-only
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000/dashboard

# .env.local — Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co   # Client-safe
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...               # Client-safe (RLS protects data)
SUPABASE_SERVICE_ROLE_KEY=eyJ...                   # Server-only (BYPASSES RLS — never expose)
```

The Supabase anon key being `NEXT_PUBLIC_` surprises people. It is safe because Row-Level Security (RLS) enforces access control at the database level. The anon key only grants access that your RLS policies allow. The service role key bypasses RLS entirely — it is the god key. Treat it like a nuclear launch code.

---

## LLM Instructions

### Clerk

Clerk is a managed authentication and user management platform. It provides pre-built UI components, session management, organizations, and webhooks. It is the fastest path to production-grade auth in Next.js.

**Installation and setup:**

```bash
npm install @clerk/nextjs
```

```typescript
// app/layout.tsx — wrap your app in ClerkProvider
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**Pre-built components:**

```typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}

// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
```

**Hooks for client components:**

```typescript
"use client";

import { useUser, useAuth, useClerk } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";

export function Header() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { userId, sessionId, getToken } = useAuth();

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <header className="flex items-center justify-between p-4">
      <h1>My App</h1>
      {isSignedIn ? (
        <div className="flex items-center gap-4">
          <span>Welcome, {user.firstName}</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      ) : (
        <a href="/sign-in">Sign in</a>
      )}
    </header>
  );
}
```

**Server-side auth:**

```typescript
// In Server Components
import { currentUser, auth } from "@clerk/nextjs/server";

// Get full user object
const user = await currentUser();

// Get just the auth state (lighter)
const { userId, orgId, orgRole } = await auth();

// Protect a Server Action
"use server";
import { auth } from "@clerk/nextjs/server";

export async function createProject(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // ... create project
}
```

**Organizations and multi-tenancy:**

```typescript
// Switch between organizations in the UI
import { OrganizationSwitcher } from "@clerk/nextjs";

export function Sidebar() {
  return (
    <aside>
      <OrganizationSwitcher
        afterCreateOrganizationUrl="/dashboard"
        afterLeaveOrganizationUrl="/dashboard"
        afterSelectOrganizationUrl="/dashboard"
      />
    </aside>
  );
}

// Check organization membership server-side
import { auth } from "@clerk/nextjs/server";

export default async function OrgDashboard() {
  const { userId, orgId, orgRole } = await auth();

  if (!orgId) {
    return <p>Select an organization to continue.</p>;
  }

  if (orgRole !== "org:admin") {
    return <p>You need admin access for this page.</p>;
  }

  return <AdminPanel orgId={orgId} />;
}
```

**Custom claims and metadata:**

```typescript
// Set public metadata (visible to the client) via Clerk Dashboard or Backend API
// Useful for roles: user.publicMetadata = { role: "admin" }

// Read metadata server-side
import { currentUser } from "@clerk/nextjs/server";

const user = await currentUser();
const role = user?.publicMetadata?.role as string | undefined;

// Set private metadata (server-only) via Backend API
import { clerkClient } from "@clerk/nextjs/server";

const client = await clerkClient();
await client.users.updateUserMetadata(userId, {
  privateMetadata: {
    stripeCustomerId: "cus_...",
  },
});
```

### Auth.js (NextAuth v5)

Auth.js is the open-source authentication library for Next.js. Version 5 (the current major version) is a significant rewrite with first-class App Router support. It is free, self-hosted, and stores auth data in your own database.

**Installation and setup:**

```bash
npm install next-auth@beta @auth/prisma-adapter
npx auth secret  # generates AUTH_SECRET
```

```typescript
// auth.ts (project root)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.role) {
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        token.role = dbUser?.role ?? "user";
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
});
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

**Prisma schema for Auth.js:**

```prisma
// prisma/schema.prisma
model User {
  id             String    @id @default(cuid())
  name           String?
  email          String?   @unique
  emailVerified  DateTime?
  image          String?
  hashedPassword String?
  role           String    @default("user")
  accounts       Account[]
  sessions       Session[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

**Custom sign-in page:**

```typescript
// app/auth/signin/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCredentialSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-2xl font-bold">Sign In</h1>

        {/* Social providers */}
        <div className="space-y-2">
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full rounded-lg border p-3"
          >
            Continue with Google
          </button>
          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="w-full rounded-lg border p-3"
          >
            Continue with GitHub
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Credentials form */}
        <form onSubmit={handleCredentialSignIn} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border p-3"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border p-3"
            required
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-black p-3 text-white"
          >
            Sign in with email
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Session provider for client components:**

```typescript
// app/layout.tsx
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

```typescript
// Client component using session
"use client";

import { useSession, signOut } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return <a href="/auth/signin">Sign in</a>;

  return (
    <div className="flex items-center gap-4">
      <span>{session.user.name}</span>
      <button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
    </div>
  );
}
```

**Extending session types:**

```typescript
// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}
```

### Kinde

Kinde is a managed authentication platform that combines auth with feature flags and fine-grained permissions. It is positioned between Clerk (full-featured auth) and LaunchDarkly (feature flags) — giving you both in one tool.

**Installation and setup:**

```bash
npm install @kinde-oss/kinde-auth-nextjs
```

```typescript
// app/api/auth/[kindeAuth]/route.ts
import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
export const GET = handleAuth();
```

```typescript
// app/layout.tsx — wrap in AuthProvider
import { AuthProvider } from "@kinde-oss/kinde-auth-nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </AuthProvider>
  );
}
```

**Login and registration buttons:**

```typescript
"use client";

import {
  LoginLink,
  RegisterLink,
  LogoutLink,
} from "@kinde-oss/kinde-auth-nextjs/components";

export function AuthButtons() {
  return (
    <div className="flex gap-4">
      <LoginLink className="rounded-lg bg-black px-4 py-2 text-white">
        Sign in
      </LoginLink>
      <RegisterLink className="rounded-lg border px-4 py-2">
        Sign up
      </RegisterLink>
    </div>
  );
}

export function LogoutButton() {
  return (
    <LogoutLink className="rounded-lg border px-4 py-2">
      Log out
    </LogoutLink>
  );
}
```

**Server-side auth:**

```typescript
// In Server Components and Server Actions
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const isLoggedIn = await isAuthenticated();

  if (!isLoggedIn) {
    redirect("/api/auth/login");
  }

  const user = await getUser();

  return (
    <div>
      <h1>Welcome, {user?.given_name}</h1>
      <p>Email: {user?.email}</p>
    </div>
  );
}
```

**Permissions and roles:**

```typescript
// Check permissions server-side
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export default async function AdminPage() {
  const { getPermission, getPermissions } = getKindeServerSession();

  // Check a single permission
  const canCreatePosts = await getPermission("create:posts");

  if (!canCreatePosts?.isGranted) {
    return <p>You do not have permission to create posts.</p>;
  }

  // Get all permissions
  const permissions = await getPermissions();
  // permissions.permissions = ["create:posts", "edit:posts", "delete:posts"]

  return <PostEditor permissions={permissions.permissions} />;
}
```

**Feature flags:**

```typescript
// Kinde feature flags — server-side
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export default async function PricingPage() {
  const { getFlag } = getKindeServerSession();

  // Boolean flag
  const showNewPricing = await getFlag("new-pricing-page", false, "b");

  // String flag
  const theme = await getFlag("pricing-theme", "default", "s");

  // Integer flag
  const maxTeamSize = await getFlag("max-team-size", 5, "i");

  if (showNewPricing?.value) {
    return <NewPricingPage theme={theme?.value} maxTeamSize={maxTeamSize?.value} />;
  }

  return <LegacyPricingPage />;
}
```

**Kinde middleware:**

```typescript
// middleware.ts
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    // This runs after Kinde auth check
    // req is now authenticated
  },
  {
    isReturnToCurrentPage: true,
    loginPage: "/api/auth/login",
    publicPaths: ["/", "/pricing", "/about", "/api/webhooks(.*)"],
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Supabase Auth

Supabase Auth is the authentication module within the Supabase platform. Its killer feature is direct integration with PostgreSQL Row-Level Security (RLS) — the database itself enforces who can read and write what data. If you are using Supabase for your database, using Supabase Auth is a natural fit.

**Installation and setup:**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Create Supabase clients for different contexts:**

```typescript
// utils/supabase/server.ts — Server Components, Server Actions, Route Handlers
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

```typescript
// utils/supabase/client.ts — Client Components
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Sign up and sign in:**

```typescript
// app/auth/signup/actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        full_name: formData.get("name") as string,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/auth/verify-email");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

**Social login (OAuth):**

```typescript
// app/auth/social/actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(data.url);
}
```

```typescript
// app/auth/callback/route.ts — OAuth callback handler
import { createClient } from "@/utils/supabase/server";
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

  // Auth code exchange failed
  return NextResponse.redirect(`${origin}/auth/error`);
}
```

**Row-Level Security integration:**

```sql
-- This is the killer feature. RLS policies use the auth user to filter data.
-- No application code needed for basic access control.

-- Enable RLS on a table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notes
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own notes
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own notes
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own notes
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Team access: users can see notes from their team
CREATE POLICY "Team members can view team notes"
  ON notes FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );
```

```typescript
// With RLS, your queries need zero auth filtering — the database does it
import { createClient } from "@/utils/supabase/server";

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // This query returns ONLY the authenticated user's notes
  // RLS handles the filtering automatically
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  return <NotesList notes={notes ?? []} />;
}
```

**Listen for auth state changes (client-side):**

```typescript
"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthListener({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        router.refresh();
      }
      if (event === "SIGNED_OUT") {
        router.push("/login");
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return <>{children}</>;
}
```

---

## Examples

### Full Clerk Setup (Complete Next.js App)

```bash
# 1. Install
npm install @clerk/nextjs

# 2. Environment variables
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

```typescript
// 3. app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}

// 4. middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

// 5. app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}

// 6. app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}

// 7. app/dashboard/page.tsx — protected page
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Hello, {user.firstName}!</p>
      <p>Email: {user.emailAddresses[0].emailAddress}</p>
    </div>
  );
}
```

### Full Auth.js Setup (Google + GitHub + Credentials)

```bash
# 1. Install
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs

# 2. Generate secret
npx auth secret

# 3. Set up Prisma schema (see Prisma schema above in LLM Instructions)
npx prisma generate
npx prisma db push
```

```typescript
// 4. auth.ts — see full config in LLM Instructions section above

// 5. app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;

// 6. app/layout.tsx — with SessionProvider
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}

// 7. middleware.ts — see middleware in Principles section above

// 8. Register new users (credentials)
// app/auth/register/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";

export async function register(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
    },
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
}
```

### Full Kinde Setup

```bash
# 1. Install
npm install @kinde-oss/kinde-auth-nextjs

# 2. Environment variables (get from Kinde dashboard)
# .env.local
KINDE_CLIENT_ID=your_client_id
KINDE_CLIENT_SECRET=your_client_secret
KINDE_ISSUER_URL=https://your-app.kinde.com
KINDE_SITE_URL=http://localhost:3000
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000/dashboard
```

```typescript
// 3. app/api/auth/[kindeAuth]/route.ts
import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
export const GET = handleAuth();

// 4. app/layout.tsx
import { AuthProvider } from "@kinde-oss/kinde-auth-nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </AuthProvider>
  );
}

// 5. app/page.tsx — landing page with auth buttons
import {
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { isAuthenticated } = getKindeServerSession();
  if (await isAuthenticated()) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Welcome</h1>
      <div className="flex gap-4">
        <LoginLink className="rounded-lg bg-black px-6 py-3 text-white">
          Sign in
        </LoginLink>
        <RegisterLink className="rounded-lg border px-6 py-3">
          Sign up
        </RegisterLink>
      </div>
    </div>
  );
}

// 6. app/dashboard/page.tsx — protected page
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";

export default async function DashboardPage() {
  const { getUser, isAuthenticated, getPermission, getFlag } =
    getKindeServerSession();

  if (!(await isAuthenticated())) {
    redirect("/api/auth/login");
  }

  const user = await getUser();
  const canManageTeam = await getPermission("manage:team");
  const betaFeature = await getFlag("beta-dashboard", false, "b");

  return (
    <div className="p-8">
      <h1>Dashboard</h1>
      <p>Welcome, {user?.given_name}</p>
      {canManageTeam?.isGranted && <TeamManagement />}
      {betaFeature?.value && <BetaDashboard />}
      <LogoutLink>Log out</LogoutLink>
    </div>
  );
}
```

### Full Supabase Auth Setup

```bash
# 1. Install
npm install @supabase/supabase-js @supabase/ssr

# 2. Environment variables
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

```typescript
// 3. Create utility files (see LLM Instructions for server.ts and client.ts)

// 4. middleware.ts (see Principles section for full middleware)

// 5. app/login/page.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setError(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-2xl font-bold">Sign In</h1>

        <button
          onClick={handleGoogleLogin}
          className="w-full rounded-lg border p-3"
        >
          Continue with Google
        </button>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border p-3"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border p-3"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black p-3 text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// 6. app/auth/callback/route.ts (see LLM Instructions)

// 7. Database setup — run in Supabase SQL Editor:
```

```sql
-- Create a profiles table that mirrors auth.users
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Common Mistakes

### 1. Checking Auth Only in the UI

**Wrong:**
```typescript
// Only checking auth in a client component — no server-side protection
"use client";
export function AdminPanel() {
  const { user } = useUser();
  if (user?.role !== "admin") return <p>Access denied</p>;
  return <AdminDashboard />; // The data is already in the bundle
}
```

**Fix:**
```typescript
// Check auth server-side — the component never renders if unauthorized
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.publicMetadata.role !== "admin") {
    redirect("/unauthorized");
  }
  return <AdminDashboard />;
}
```

### 2. Forgetting to Verify Webhook Signatures

**Wrong:**
```typescript
// Trusting webhook payloads without verifying the signature
export async function POST(req: Request) {
  const payload = await req.json();
  // Anyone can POST fake events to this endpoint
  await db.user.create({ data: { email: payload.data.email } });
}
```

**Fix:**
```typescript
// Always verify the webhook signature with the provider's SDK
import { Webhook } from "svix";

export async function POST(req: Request) {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const evt = wh.verify(body, headers);
    // Now safe to process
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
}
```

### 3. Using getSession() Instead of getUser() with Supabase

**Wrong:**
```typescript
// getSession() reads from the cookie — the client can tamper with it
const { data: { session } } = await supabase.auth.getSession();
const userId = session?.user.id; // CANNOT be trusted for authorization
```

**Fix:**
```typescript
// getUser() validates the token with Supabase servers
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id; // Verified server-side — safe for authorization
```

### 4. Exposing the Supabase Service Role Key to the Client

**Wrong:**
```bash
# .env.local — NEVER do this
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
# This key bypasses ALL Row-Level Security policies
```

**Fix:**
```bash
# .env.local — no NEXT_PUBLIC_ prefix
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# Only accessible in server-side code (Server Components, API Routes, Server Actions)
```

### 5. Not Handling the Loading State in Auth Hooks

**Wrong:**
```typescript
"use client";
export function ProtectedContent() {
  const { data: session } = useSession();
  // On first render, session is undefined (still loading)
  // This flashes "Access denied" before auth loads
  if (!session) return <p>Access denied</p>;
  return <Dashboard />;
}
```

**Fix:**
```typescript
"use client";
export function ProtectedContent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <LoadingSkeleton />;
  }

  if (status === "unauthenticated") {
    redirect("/auth/signin");
  }

  return <Dashboard />;
}
```

### 6. Hardcoding Redirect URLs Instead of Using Environment Variables

**Wrong:**
```typescript
// Breaks when you deploy to staging or production
const { data } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: "http://localhost:3000/auth/callback",
  },
});
```

**Fix:**
```typescript
// Use environment variables or derive from the request
const origin = headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;
const { data } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${origin}/auth/callback`,
  },
});
```

### 7. Not Adding the Webhook Endpoint to Public Routes in Middleware

**Wrong:**
```typescript
// middleware.ts — webhook endpoint is behind auth
export default clerkMiddleware(async (auth, request) => {
  await auth.protect(); // This blocks ALL unauthenticated requests
});
// Clerk cannot send webhooks to your API because the middleware rejects them
```

**Fix:**
```typescript
// middleware.ts — explicitly allow webhook endpoints
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)", // Webhook endpoints must be public
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});
```

### 8. Using the Credentials Provider in Auth.js Without Understanding the Tradeoffs

**Wrong:**
```typescript
// Using Credentials provider as the primary auth method
// without implementing: email verification, password reset,
// rate limiting, account lockout, or brute-force protection
Credentials({
  authorize(credentials) {
    const user = await db.user.findUnique({ where: { email: credentials.email } });
    if (bcrypt.compareSync(credentials.password, user.hashedPassword)) {
      return user;
    }
    return null;
  },
})
```

**Fix:**
Either implement the full security stack (email verification, password reset flow, rate limiting via middleware or a service like Upstash, account lockout after N failed attempts), or use OAuth providers instead. The Credentials provider in Auth.js deliberately does not support session-based auth with database adapters — this is by design to discourage password auth without proper security infrastructure.

```typescript
// Prefer OAuth providers unless you specifically need password auth
providers: [
  Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }),
  GitHub({ clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET }),
  // Add Credentials only if you have the full security stack
],
```

### 9. Not Refreshing the Supabase Session in Middleware

**Wrong:**
```typescript
// middleware.ts — no Supabase client creation
// Session tokens expire and are never refreshed
// Users get randomly logged out after the access token expires (1 hour)
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}
```

**Fix:**
```typescript
// middleware.ts — always create a Supabase client in middleware
// This refreshes the session cookie on every request
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... cookies config ... */);
  // This call refreshes the session if the access token has expired
  await supabase.auth.getUser();
  return supabaseResponse;
}
```

### 10. Mixing Auth Providers Unnecessarily

**Wrong:**
```typescript
// Using Clerk for auth AND Supabase Auth for database access
// Two separate user identity systems that need manual syncing
// Every request checks two different auth systems
```

**Fix:** Pick one auth provider and commit to it. If you want Clerk's UI and Supabase's database, use Clerk for auth and connect to Supabase using the service role key in server-side code (bypassing Supabase Auth entirely). If you want Supabase Auth's RLS integration, use Supabase Auth for everything and build your own UI.

```typescript
// Clerk + Supabase (without Supabase Auth): use service role key server-side
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypasses RLS — use Clerk for auth
);

export async function getProjects() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Filter manually since RLS is bypassed
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("clerk_user_id", userId);

  return data;
}
```

---

> **See also:** [Security/Authentication-Identity](../../Security/Authentication-Identity/authentication-identity.md) for auth theory (JWTs, sessions, OAuth, password hashing, RBAC) | [Tools/BaaS-Platforms](../BaaS-Platforms/baas-platforms.md) for full Supabase stack setup
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
