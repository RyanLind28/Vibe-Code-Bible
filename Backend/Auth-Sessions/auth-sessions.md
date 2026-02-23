# Auth & Sessions

> Session architecture, Auth.js/Lucia, middleware patterns, token refresh, session storage, multi-tenant auth, OAuth integration, API key management, and auth testing — the implementation side of keeping users authenticated.

---

## Principles

### 1. Auth Architecture Decisions

There are two fundamental approaches to authentication. Every auth system is a variation of one of these.

**Session-based (stateful):**

```
Login → Server creates session in DB/Redis → Returns session ID in cookie
Request → Cookie sent automatically → Server looks up session → Authenticated
```

- Server stores session state (database or Redis)
- Session ID is an opaque token — reveals nothing
- Easy to revoke (delete the session record)
- Requires server-side storage and lookup on every request

**Token-based (stateless):**

```
Login → Server creates signed JWT → Returns token to client
Request → Client sends token in Authorization header → Server verifies signature → Authenticated
```

- No server-side session storage
- Token contains claims (user ID, role, expiry)
- Harder to revoke (must maintain a blocklist or wait for expiry)
- Works well for APIs and microservices

**When to use which:**

| Use Case | Approach |
|----------|----------|
| Web application (SSR) | Session-based with cookies |
| SPA with same-origin API | Session-based with cookies |
| Mobile app consuming API | Token-based (JWT) |
| Third-party API | API keys or OAuth tokens |
| Microservice-to-microservice | JWT or mutual TLS |

For most web applications built with Next.js, **session-based with cookies is the default choice**. It is simpler, more secure (no token storage in JavaScript), and integrates naturally with HTTP.

> Cross-reference: [Security/Authentication-Identity](../../Security/Authentication-Identity/authentication-identity.md) covers password hashing, JWT theory, RBAC, MFA, CSRF protection, and OAuth 2.0 specifications.

### 2. Auth.js (NextAuth.js) v5

Auth.js v5 is the most popular authentication library for Next.js. It handles OAuth providers, credentials, session management, and database adapters out of the box.

**Core concepts:**

- **Providers** — how users authenticate (Google, GitHub, credentials, email magic link)
- **Adapters** — where user and session data is stored (Prisma, Drizzle, database)
- **Callbacks** — customize session content, control sign-in, modify tokens
- **Session strategies** — JWT (default) or database sessions

```typescript
// auth.ts (Auth.js v5 configuration)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // Database sessions (not JWT)
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
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        }).safeParse(credentials);

        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;
        if (!await verifyPassword(parsed.data.password, user.passwordHash)) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add custom fields to the session
      session.user.id = user.id;

      // Load organization membership
      const membership = await prisma.member.findFirst({
        where: { userId: user.id },
        include: { organization: true },
      });

      if (membership) {
        session.user.organizationId = membership.organizationId;
        session.user.role = membership.role;
      }

      return session;
    },
    async signIn({ user, account }) {
      // Block sign-in for deactivated users
      if (user.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser?.deactivatedAt) return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
});
```

### 3. Lucia Auth

Lucia is a lightweight, session-based auth library that gives you full control over the session lifecycle. Unlike Auth.js, Lucia does not abstract away session management — you own the session storage and logic.

**When to choose Lucia over Auth.js:**
- You need full control over session storage and lifecycle
- You want to implement custom auth flows not supported by Auth.js
- You need fine-grained session management (per-device sessions, session listing)
- You prefer explicit code over configuration-based magic

```typescript
// lib/auth.ts (Lucia setup)
import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "@/lib/db";

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    role: attributes.role,
  }),
});

// Login
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) throw new AppError("UNAUTHORIZED", "Invalid credentials", 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError("UNAUTHORIZED", "Invalid credentials", 401);

  const session = await lucia.createSession(user.id, {});
  const cookie = lucia.createSessionCookie(session.id);

  return { session, cookie };
}

// Validate session from request
export async function validateRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = lucia.readSessionCookie(cookieHeader ?? "");

  if (!sessionId) return { user: null, session: null };

  const result = await lucia.validateSession(sessionId);

  // Refresh session if it is close to expiry
  if (result.session?.fresh) {
    const cookie = lucia.createSessionCookie(result.session.id);
    // Set the refreshed cookie in the response
  }

  return result;
}

// Logout
export async function logout(sessionId: string) {
  await lucia.invalidateSession(sessionId);
}

// Logout from all devices
export async function logoutAll(userId: string) {
  await lucia.invalidateUserSessions(userId);
}
```

### 4. Session Storage

Where you store sessions affects performance, scalability, and reliability.

| Storage | Latency | Scalability | Persistence | Best For |
|---------|---------|-------------|-------------|----------|
| **Database (PostgreSQL)** | 1–5ms | High (pooled) | Durable | Default for most apps |
| **Redis** | <1ms | Very high | Configurable | High-traffic apps, need fast reads |
| **JWT (cookie)** | 0ms (no lookup) | Infinite | N/A (stateless) | APIs, microservices |
| **Encrypted cookie** | 0ms (no lookup) | Infinite | N/A | Small session data (<4KB) |

**Database sessions (recommended default):**

```prisma
model Session {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")

  @@index([userId])
  @@index([expiresAt]) // For cleanup job
  @@map("sessions")
}
```

**Redis sessions (for high traffic):**

```typescript
import { redis } from "@/lib/redis";
import { randomBytes } from "crypto";

interface SessionData {
  userId: string;
  organizationId?: string;
  role: string;
  createdAt: number;
}

const SESSION_TTL = 60 * 60 * 24; // 24 hours

export async function createSession(userId: string, data: Omit<SessionData, "userId" | "createdAt">) {
  const sessionId = randomBytes(32).toString("hex");
  const session: SessionData = { userId, ...data, createdAt: Date.now() };

  await redis.set(
    `session:${sessionId}`,
    JSON.stringify(session),
    "EX",
    SESSION_TTL
  );

  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const data = await redis.get(`session:${sessionId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function deleteSession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}

export async function refreshSession(sessionId: string) {
  await redis.expire(`session:${sessionId}`, SESSION_TTL);
}
```

**Cookie configuration:**

```typescript
const cookieOptions = {
  httpOnly: true,       // Not accessible via JavaScript
  secure: true,         // HTTPS only
  sameSite: "lax",      // CSRF protection
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours
  domain: process.env.COOKIE_DOMAIN, // ".example.com" for subdomains
};
```

### 5. Middleware Auth Patterns

Middleware runs before route handlers and is the right place to check authentication and authorization.

**Next.js middleware:**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/settings", "/api/v1"];
const adminRoutes = ["/admin", "/api/v1/admin"];
const publicRoutes = ["/login", "/signup", "/api/auth"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check authentication
  const session = await auth();

  if (!session && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin access
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
```

**Server-side auth guard (double-check):**

Middleware provides a first line of defense, but always verify auth server-side too. Middleware can be bypassed in some edge cases.

```typescript
// lib/auth-guard.ts
import { auth } from "@/auth";
import { AppError } from "@/lib/errors";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  return session;
}

export async function requireRole(role: string | string[]) {
  const session = await requireAuth();
  const roles = Array.isArray(role) ? role : [role];

  if (!roles.includes(session.user.role)) {
    throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
  }

  return session;
}

// Usage in Server Action
"use server";

export async function deleteUser(userId: string) {
  const session = await requireRole("ADMIN");
  // Only admins reach this point
  await prisma.user.delete({ where: { id: userId } });
}
```

### 6. Token Refresh Flow

Long-lived tokens are a security risk. Short-lived access tokens with a longer-lived refresh token provide a balance between security and usability.

**Flow:**

```
1. Login → returns access token (15 min) + refresh token (7 days)
2. Request → sends access token → succeeds
3. Access token expires → 401 response
4. Client sends refresh token → server issues new access + refresh tokens
5. Old refresh token is invalidated (rotation)
```

```typescript
// lib/tokens.ts
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { randomBytes, createHash } from "crypto";

const ACCESS_TOKEN_TTL = 15 * 60;      // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function createTokenPair(userId: string) {
  // Access token (short-lived JWT)
  const accessToken = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(secret);

  // Refresh token (random, stored in DB)
  const refreshToken = randomBytes(48).toString("hex");
  const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");

  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshTokenHash,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export async function refreshTokens(refreshToken: string) {
  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired refresh token", 401);
  }

  // Token rotation: delete old, create new
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  return createTokenPair(stored.userId);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.sub as string };
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid or expired token", 401);
  }
}
```

### 7. Multi-Tenant Authentication

In multi-tenant applications, authentication must include tenant context. A user belongs to one or more organizations, and every request must be scoped to the active organization.

**Pattern: Shared auth with tenant context:**

```typescript
// After authentication, resolve the tenant
export async function resolveAuthContext(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  // Resolve organization from subdomain, header, or session
  const orgSlug =
    request.headers.get("x-organization") ??
    getSubdomain(request.nextUrl.host) ??
    session.user.defaultOrganizationSlug;

  if (!orgSlug) {
    throw new AppError("BAD_REQUEST", "Organization context required", 400);
  }

  // Verify user is a member of this organization
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organization: { slug: orgSlug },
    },
    include: { organization: true },
  });

  if (!membership) {
    throw new AppError("FORBIDDEN", "Not a member of this organization", 403);
  }

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    organizationSlug: orgSlug,
    role: membership.role,
  };
}

function getSubdomain(host: string): string | null {
  const parts = host.split(".");
  if (parts.length >= 3 && parts[0] !== "www") {
    return parts[0];
  }
  return null;
}
```

### 8. OAuth Integration Patterns

OAuth social login is expected by users. The tricky part is handling edge cases: existing accounts, account linking, and missing data.

**Account linking strategy:**

When a user signs in with Google and an account with that email already exists:

```typescript
// In Auth.js callbacks
callbacks: {
  async signIn({ user, account, profile }) {
    if (!account || !user.email) return false;

    // Check if an account with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { accounts: true },
    });

    if (existingUser) {
      // Check if this OAuth provider is already linked
      const linked = existingUser.accounts.find(
        (a) => a.provider === account.provider
      );

      if (!linked) {
        // Auto-link if email is verified by the provider
        if (profile?.email_verified) {
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              type: account.type,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
            },
          });
        } else {
          // Email not verified — require manual linking
          return `/auth/link-account?email=${encodeURIComponent(user.email)}`;
        }
      }
    }

    return true;
  },
}
```

### 9. API Key Management

For developer-facing APIs, API keys are simpler than OAuth. The key is stored hashed (like a password) and validated on each request.

```typescript
// lib/api-keys.ts
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";

const API_KEY_PREFIX = "vb_live_"; // visible prefix for identification

export async function generateApiKey(
  organizationId: string,
  name: string,
  scopes: string[]
) {
  const rawKey = API_KEY_PREFIX + randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  // Store only the hash — the raw key is shown once to the user
  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash,
      keyPrefix: rawKey.slice(0, 12), // For identification in UI
      name,
      scopes,
      organizationId,
    },
  });

  return {
    id: apiKey.id,
    key: rawKey,        // Show this once, never again
    name: apiKey.name,
    scopes: apiKey.scopes,
  };
}

export async function validateApiKey(key: string) {
  if (!key.startsWith(API_KEY_PREFIX)) {
    throw new AppError("UNAUTHORIZED", "Invalid API key format", 401);
  }

  const keyHash = createHash("sha256").update(key).digest("hex");
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { organization: true },
  });

  if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired API key", 401);
  }

  // Update last used timestamp (non-blocking)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {}); // Fire and forget

  return {
    organizationId: apiKey.organizationId,
    scopes: apiKey.scopes as string[],
    keyId: apiKey.id,
  };
}

// Middleware for API key auth
export async function requireApiKey(request: NextRequest, requiredScope?: string) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("UNAUTHORIZED", "API key required", 401);
  }

  const key = authHeader.slice(7);
  const apiKey = await validateApiKey(key);

  if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
    throw new AppError("FORBIDDEN", `API key missing required scope: ${requiredScope}`, 403);
  }

  return apiKey;
}
```

### 10. Auth Testing

Authentication is critical code that must be tested thoroughly. Mocking auth in tests should be easy and reliable.

```typescript
// test/helpers/auth.ts
import { prisma } from "@/test/setup";
import { lucia } from "@/lib/auth";

export async function createTestUser(overrides = {}) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      role: "MEMBER",
      passwordHash: await hashPassword("test-password-123"),
      ...overrides,
    },
  });
}

export async function createTestSession(userId: string) {
  const session = await lucia.createSession(userId, {});
  const cookie = lucia.createSessionCookie(session.id);
  return { session, cookie: cookie.serialize() };
}

export async function authenticatedRequest(
  url: string,
  userId: string,
  options: RequestInit = {}
) {
  const { cookie } = await createTestSession(userId);

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      cookie,
    },
  });
}

// Test examples
describe("POST /api/posts", () => {
  it("requires authentication", async () => {
    const response = await fetch("/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
    });
    expect(response.status).toBe(401);
  });

  it("creates a post for authenticated user", async () => {
    const user = await createTestUser();
    const response = await authenticatedRequest("/api/posts", user.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Post", content: "Hello" }),
    });

    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.title).toBe("Test Post");
  });

  it("prevents non-admins from deleting other users", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const member = await createTestUser({ role: "MEMBER" });
    const targetUser = await createTestUser();

    // Member cannot delete
    const memberRes = await authenticatedRequest(
      `/api/users/${targetUser.id}`,
      member.id,
      { method: "DELETE" }
    );
    expect(memberRes.status).toBe(403);

    // Admin can delete
    const adminRes = await authenticatedRequest(
      `/api/users/${targetUser.id}`,
      admin.id,
      { method: "DELETE" }
    );
    expect(adminRes.status).toBe(204);
  });
});
```

---

## LLM Instructions

### Setting Up Auth.js v5

When configuring Auth.js for a Next.js application:

- Install: `npm install next-auth@beta @auth/prisma-adapter`
- Create `auth.ts` at project root with providers, adapter, and callbacks
- Create `app/api/auth/[...nextauth]/route.ts` that exports `GET` and `POST` from `handlers`
- Use database sessions (`strategy: "database"`) for web apps — easier to revoke than JWT
- Customize the session callback to add user ID, role, and organization
- Set custom pages: `signIn`, `error`, `verifyRequest`
- Add the `AUTH_SECRET` environment variable (generate with `npx auth secret`)

### Configuring Session Storage

When setting up sessions:

- **Default:** Use database sessions (Prisma adapter). Simple, reliable, queryable.
- **High traffic:** Add Redis session store. Sub-millisecond lookups, automatic expiry.
- **Stateless API:** Use JWT with short expiry (15 min) + refresh token rotation.
- Always set `httpOnly`, `secure`, `sameSite: "lax"` on session cookies.
- Set session expiry: 24 hours for web apps, 7–30 days with sliding window.
- Clean up expired sessions with a scheduled job (not on every request).

### Implementing Auth Middleware

When adding auth middleware:

- Define route patterns: public routes (no auth), protected routes (auth required), admin routes (role required)
- Check authentication in middleware for page-level redirects
- Always double-check auth in Server Actions and API routes — middleware is a first line, not the only line
- For API routes, return 401/403 JSON responses (not redirects)
- For page routes, redirect to `/login?callbackUrl=<original-url>`
- Add organization context resolution for multi-tenant apps

### Setting Up OAuth Providers

When integrating OAuth social login:

- Start with Google and GitHub — highest coverage for developer tools
- Handle the "existing account" case: same email, different provider
- Auto-link accounts when the OAuth provider verifies the email
- Require manual linking when email is not verified
- Store provider tokens if you need to call provider APIs (e.g., GitHub repos)
- Display connected providers in account settings with disconnect option

### Testing Auth Flows

When writing auth tests:

- Create helper functions: `createTestUser()`, `createTestSession()`, `authenticatedRequest()`
- Test unauthenticated access returns 401
- Test unauthorized access returns 403
- Test session expiry behavior
- Test role-based access for each role
- Use unique emails per test to avoid conflicts in parallel test runs
- Never hardcode real credentials in tests

---

## Examples

### 1. Auth.js v5 Complete Setup

Full Auth.js v5 configuration with Google, GitHub, credentials, and database adapter:

```typescript
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: [
    Google,
    GitHub,
    Credentials({
      async authorize(credentials) {
        const { email, password } = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        }).parse(credentials);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      const membership = await prisma.member.findFirst({
        where: { userId: user.id },
        select: { organizationId: true, role: true },
      });
      if (membership) {
        session.user.organizationId = membership.organizationId;
        session.user.role = membership.role;
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/auth/error" },
});

// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;

// types/next-auth.d.ts — extend session types
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}
```

### 2. Middleware Role Guard

Route protection with role-based access control:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const routeConfig = [
  { pattern: /^\/api\/auth/, auth: false },
  { pattern: /^\/login|\/signup|\/forgot-password/, auth: false },
  { pattern: /^\/admin/, auth: true, roles: ["ADMIN", "OWNER"] },
  { pattern: /^\/api\/v1\/admin/, auth: true, roles: ["ADMIN", "OWNER"] },
  { pattern: /^\/api\/v1/, auth: true },
  { pattern: /^\/dashboard/, auth: true },
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const matched = routeConfig.find((r) => r.pattern.test(pathname));
  if (!matched || !matched.auth) return NextResponse.next();

  const session = await auth();

  // Not authenticated
  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  // Check roles
  if (matched.roles && !matched.roles.includes(session.user.role ?? "")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
```

### 3. Redis Session Store

High-performance session storage with Redis:

```typescript
// lib/session-store.ts
import { redis } from "@/lib/redis";
import { randomBytes } from "crypto";

interface Session {
  userId: string;
  organizationId: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActiveAt: number;
}

const SESSION_TTL = 24 * 60 * 60; // 24 hours
const SESSION_PREFIX = "sess:";

export async function createSession(data: Omit<Session, "createdAt" | "lastActiveAt">) {
  const sessionId = randomBytes(32).toString("hex");
  const session: Session = {
    ...data,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };

  await redis.set(
    SESSION_PREFIX + sessionId,
    JSON.stringify(session),
    "EX",
    SESSION_TTL
  );

  // Track user's active sessions
  await redis.sadd(`user-sessions:${data.userId}`, sessionId);

  return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const data = await redis.get(SESSION_PREFIX + sessionId);
  if (!data) return null;

  const session = JSON.parse(data) as Session;

  // Sliding window: refresh TTL on access
  await redis.set(
    SESSION_PREFIX + sessionId,
    JSON.stringify({ ...session, lastActiveAt: Date.now() }),
    "EX",
    SESSION_TTL
  );

  return session;
}

export async function destroySession(sessionId: string) {
  const data = await redis.get(SESSION_PREFIX + sessionId);
  if (data) {
    const session = JSON.parse(data) as Session;
    await redis.srem(`user-sessions:${session.userId}`, sessionId);
  }
  await redis.del(SESSION_PREFIX + sessionId);
}

export async function destroyAllSessions(userId: string) {
  const sessionIds = await redis.smembers(`user-sessions:${userId}`);
  if (sessionIds.length > 0) {
    await redis.del(...sessionIds.map((id) => SESSION_PREFIX + id));
  }
  await redis.del(`user-sessions:${userId}`);
}

export async function listUserSessions(userId: string): Promise<Array<Session & { id: string }>> {
  const sessionIds = await redis.smembers(`user-sessions:${userId}`);
  const sessions: Array<Session & { id: string }> = [];

  for (const id of sessionIds) {
    const data = await redis.get(SESSION_PREFIX + id);
    if (data) {
      sessions.push({ id, ...JSON.parse(data) });
    } else {
      // Clean up stale reference
      await redis.srem(`user-sessions:${userId}`, id);
    }
  }

  return sessions.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}
```

### 4. API Key System

Complete API key generation, hashing, verification, and management:

```typescript
// lib/api-keys.ts
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

const KEY_PREFIX = "vb_live_";
const KEY_LENGTH = 32;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(input: {
  name: string;
  organizationId: string;
  scopes: string[];
  expiresIn?: number; // days
}) {
  const rawKey = KEY_PREFIX + randomBytes(KEY_LENGTH).toString("hex");

  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash: hashKey(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      name: input.name,
      scopes: input.scopes,
      organizationId: input.organizationId,
      expiresAt: input.expiresIn
        ? new Date(Date.now() + input.expiresIn * 24 * 60 * 60 * 1000)
        : null,
    },
  });

  // Return raw key ONCE — it cannot be retrieved after this
  return { ...apiKey, key: rawKey };
}

export async function rotateApiKey(keyId: string) {
  const existing = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!existing) throw new AppError("NOT_FOUND", "API key not found", 404);

  const rawKey = KEY_PREFIX + randomBytes(KEY_LENGTH).toString("hex");

  const updated = await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      keyHash: hashKey(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      rotatedAt: new Date(),
    },
  });

  return { ...updated, key: rawKey };
}

export async function revokeApiKey(keyId: string) {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });
}

// app/api/v1/api-keys/route.ts
export const POST = apiHandler(async (req) => {
  const session = await requireRole(["ADMIN", "OWNER"]);
  const body = CreateApiKeySchema.parse(await req.json());

  const apiKey = await createApiKey({
    ...body,
    organizationId: session.user.organizationId!,
  });

  return apiCreated({
    id: apiKey.id,
    key: apiKey.key, // Show once
    name: apiKey.name,
    scopes: apiKey.scopes,
    prefix: apiKey.keyPrefix,
  });
});
```

### 5. Auth Test Helpers

Reusable test utilities for authentication testing:

```typescript
// test/helpers/auth.ts
import { prisma } from "@/test/setup";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session-store";

interface TestUserOptions {
  email?: string;
  name?: string;
  role?: "ADMIN" | "MEMBER" | "OWNER";
  organizationId?: string;
}

export async function createTestUser(options: TestUserOptions = {}) {
  const email = options.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const user = await prisma.user.create({
    data: {
      email,
      name: options.name ?? "Test User",
      passwordHash: await hashPassword("test-password"),
    },
  });

  if (options.organizationId) {
    await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: options.organizationId,
        role: options.role ?? "MEMBER",
      },
    });
  }

  return user;
}

export async function createTestOrg(name = "Test Org") {
  return prisma.organization.create({
    data: { name, slug: `test-${Date.now()}` },
  });
}

export async function withAuth(userId: string, orgId: string) {
  const sessionId = await createSession({
    userId,
    organizationId: orgId,
    role: "MEMBER",
    ipAddress: "127.0.0.1",
    userAgent: "test",
  });

  return {
    headers: {
      cookie: `session=${sessionId}`,
      "Content-Type": "application/json",
    },
  };
}

// Usage in tests
describe("Auth flows", () => {
  let org: Organization;
  let admin: User;
  let member: User;

  beforeEach(async () => {
    org = await createTestOrg();
    admin = await createTestUser({ role: "ADMIN", organizationId: org.id });
    member = await createTestUser({ role: "MEMBER", organizationId: org.id });
  });

  it("admin can access admin routes", async () => {
    const auth = await withAuth(admin.id, org.id);
    const res = await fetch("/api/v1/admin/users", auth);
    expect(res.status).toBe(200);
  });

  it("member cannot access admin routes", async () => {
    const auth = await withAuth(member.id, org.id);
    const res = await fetch("/api/v1/admin/users", auth);
    expect(res.status).toBe(403);
  });
});
```

---

## Common Mistakes

### 1. Auth Logic in Client Components

**Wrong:** Checking auth state in a React client component and conditionally rendering protected content. The server still sends the HTML, and the API still processes requests.

**Fix:** Enforce auth server-side. Use middleware for route protection, Server Components for conditional rendering, and server-side guards in API routes and Server Actions. Client-side checks are for UX, not security.

### 2. No Session Expiry

**Wrong:** Creating sessions that never expire, accumulating thousands of stale sessions in the database.

**Fix:** Set a maximum session lifetime (24 hours to 30 days). Run a scheduled job to clean up expired sessions. Use sliding window expiry (extend on activity) to keep active users logged in.

### 3. Storing Sessions Without Cleanup

**Wrong:** Database sessions table grows to millions of rows because expired sessions are never deleted.

**Fix:** Add an index on `expires_at` and run a daily cleanup job: `DELETE FROM sessions WHERE expires_at < NOW()`. With Redis sessions, TTL handles this automatically.

### 4. No CSRF Protection for Cookie Auth

**Wrong:** Using cookie-based sessions without CSRF protection, allowing cross-site request forgery attacks.

**Fix:** Use `SameSite: Lax` cookies (default in modern browsers). For state-changing operations, verify the `Origin` header or use CSRF tokens. Auth.js handles this automatically.

> Cross-reference: [Security/Authentication-Identity](../../Security/Authentication-Identity/authentication-identity.md) covers CSRF prevention in depth.

### 5. Middleware-Only Auth (No Server-Side Check)

**Wrong:** Relying solely on Next.js middleware for authentication without verifying auth in Server Actions and API routes.

**Fix:** Middleware is a first line of defense, not the only one. Always call `requireAuth()` or `auth()` in Server Actions and API route handlers. Middleware can be bypassed in certain edge cases or misconfigured matchers.

### 6. JWT Without Refresh Tokens

**Wrong:** Issuing long-lived JWTs (24 hours or more) to avoid implementing refresh logic. A stolen token grants access for the entire lifetime.

**Fix:** Use short-lived access tokens (15 minutes) with refresh token rotation. The refresh token is stored securely (httpOnly cookie or database) and exchanged for new token pairs. If compromised, revoke the refresh token to cut off access.

### 7. No Account Linking for OAuth

**Wrong:** A user signs up with email/password, then tries to sign in with Google (same email) and gets "account already exists" with no way to resolve it.

**Fix:** Implement account linking. When an OAuth provider returns an email that matches an existing account, auto-link if the provider verified the email. Otherwise, prompt the user to sign in with their existing method and link the accounts in settings.

### 8. Hardcoded Test Credentials

**Wrong:** Using `admin@example.com` / `password123` as test credentials, committed to the repository, and accidentally deployed to production.

**Fix:** Generate test users dynamically in test setup with random emails. Never commit credentials. Use environment-specific seed data that is excluded from production.

### 9. No Rate Limiting on Login

**Wrong:** No limit on login attempts, allowing brute-force attacks against user passwords.

**Fix:** Rate limit login attempts by IP and by email. After 5 failed attempts, require a CAPTCHA or temporary lockout. Log failed login attempts for security monitoring.

> Cross-reference: [Security/Authentication-Identity](../../Security/Authentication-Identity/authentication-identity.md) covers brute-force protection and account lockout strategies.

### 10. Auth State in Client Store

**Wrong:** Storing auth tokens or session data in Redux/Zustand and syncing it manually with the server, creating stale auth state and security gaps.

**Fix:** Let the auth library manage session state. In Next.js, use `auth()` server-side and `useSession()` client-side (Auth.js). The server is the source of truth for authentication — the client reacts to it.

---

> **See also:** [API-Design](../API-Design/api-design.md) | [Database-Design](../Database-Design/database-design.md) | [Error-Handling-Logging](../Error-Handling-Logging/error-handling-logging.md) | [Security/Authentication-Identity](../../Security/Authentication-Identity/authentication-identity.md) | [Security/API-Security](../../Security/API-Security/api-security.md)
>
> **Last reviewed:** 2026-02
