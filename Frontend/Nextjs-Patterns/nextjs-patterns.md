# Next.js Patterns
> Next.js 15 App Router — Server Components, Server Actions, caching, middleware, and deployment patterns for AI-assisted development.

---

## Principles

### 1. The App Router Mental Model

Next.js App Router uses file-system conventions inside the `app/` directory. Every folder is a route segment. Special files define behavior:

- `page.tsx` — the UI for a route (makes the segment publicly accessible)
- `layout.tsx` — shared UI that wraps child segments (persists across navigation)
- `loading.tsx` — instant loading UI (Suspense boundary)
- `error.tsx` — error UI (error boundary)
- `not-found.tsx` — 404 UI
- `route.ts` — API endpoint (Route Handler)

Layouts are the killer feature. They don't re-render when you navigate between child routes. Put your nav, sidebar, and providers in layouts.

### 2. Server Components vs Client Components

**Server Components (default)** run only on the server:
- Zero JavaScript sent to the client
- Direct access to databases, file systems, environment variables
- Can `await` directly in the component body
- Cannot use hooks, browser APIs, or event handlers

**Client Components** (`"use client"` directive) run on both server (for SSR) and client:
- Full React interactivity — hooks, state, effects, event handlers
- Hydrated on the client with JavaScript
- Cannot directly access server-only resources

**The mental model:** Server Components are the default. Add `"use client"` only when you need interactivity. Push `"use client"` as deep as possible in the tree.

### 3. The "use client" Boundary

`"use client"` marks the entry point into client-side React. Everything imported into a client component becomes part of the client bundle — including child components.

**Push it down:** Don't make your entire page a client component because one button needs `onClick`. Extract the interactive part:

```tsx
// page.tsx — Server Component (default)
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={id} />  {/* Only this is "use client" */}
    </article>
  );
}
```

**Children pattern:** A client component can render Server Component children via the `children` prop, because `children` is already serialized:

```tsx
// ClientLayout.tsx — "use client"
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main>{children}</main>  {/* children can be Server Components */}
    </div>
  );
}
```

### 4. File-Based Routing Conventions

**Dynamic segments:** `app/products/[id]/page.tsx` → `/products/123`

**Catch-all:** `app/docs/[...slug]/page.tsx` → `/docs/a/b/c`

**Optional catch-all:** `app/docs/[[...slug]]/page.tsx` → matches `/docs` too

**Route groups:** `app/(marketing)/about/page.tsx` — group routes without affecting the URL path. Use for:
- Applying different layouts to different route groups
- Organizing routes logically
- Splitting the root layout

**Parallel routes:** `app/@modal/login/page.tsx` — render multiple pages simultaneously in the same layout. Used for modals, split views, conditional content.

**Intercepting routes:** `app/feed/(..)photo/[id]/page.tsx` — show a route in a different context (e.g., photo modal over feed, full page on direct navigation).

### 5. Server Actions for Mutations

Server Actions are async functions that run on the server, called directly from client or server components. Defined with `"use server"` directive:

```tsx
// actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  // Validate input — Server Actions are public HTTP endpoints
  if (!title || title.length > 200) {
    return { error: "Invalid title" };
  }

  await db.post.create({ data: { title, content } });
  revalidatePath("/posts");
  redirect("/posts");
}
```

**Key rules:**
- Server Actions are POST endpoints — always validate and authorize input
- They work without JavaScript (progressive enhancement) when used with `<form action>`
- Use `revalidatePath` or `revalidateTag` after mutations to update cached data
- Return serializable data only (no functions, classes, or Dates)

### 6. Middleware

Middleware runs before every request at the edge. Use it for:
- Authentication checks and redirects
- Geolocation-based routing
- A/B testing (cookie-based)
- Request/response header manipulation

```tsx
// middleware.ts (root of project)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;

  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
```

**Keep middleware thin.** It runs on every matched request at the edge. Don't do database queries or heavy computation. Validate JWTs, check cookies, redirect — that's it.

### 7. Caching: The Four Layers

Next.js has four caching layers. Understanding them prevents the most common bugs:

**Request Memoization** — duplicate `fetch` calls in the same render are automatically deduplicated. If three components call `fetch("/api/user")`, only one request is made.

**Data Cache** — `fetch` responses are cached on the server across requests. Persists until revalidated. Opt out with `{ cache: "no-store" }`.

**Full Route Cache** — statically rendered routes are cached as HTML + RSC payload at build time. Dynamic routes are rendered on every request.

**Router Cache** — client-side cache of visited routes. Layouts persist, pages refresh on navigation. Use `router.refresh()` to clear.

### 8. Revalidation Strategies

**Time-based (ISR):**
```tsx
// Revalidate every 60 seconds
fetch(url, { next: { revalidate: 60 } });

// Or at the segment level
export const revalidate = 60;
```

**On-demand:**
```tsx
// In a Server Action or Route Handler
import { revalidatePath, revalidateTag } from "next/cache";

revalidatePath("/products");           // Revalidate a specific path
revalidateTag("products");             // Revalidate all fetches with this tag

// Tag a fetch for targeted revalidation
fetch(url, { next: { tags: ["products"] } });
```

**Static vs dynamic rendering:**
- If all data is cached or static → route is statically rendered at build time
- If any data is dynamic (`cookies()`, `headers()`, `searchParams`, `no-store`) → route is dynamically rendered per request

### 9. Streaming with Suspense

Streaming sends HTML progressively as Server Components resolve. The user sees content as it becomes ready rather than waiting for everything.

**Automatic:** `loading.tsx` creates a Suspense boundary for the entire segment.

**Explicit:** Use `<Suspense>` boundaries for granular control:

```tsx
export default async function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Fast — renders immediately */}
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
      {/* Slow — streams in when ready */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </div>
  );
}
```

Each Suspense boundary streams independently. The page shell and fast content arrive first, slow sections fill in progressively.

### 10. Route Handlers (API Routes)

Route Handlers define server-side API endpoints:

```tsx
// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");

  const products = await db.product.findMany({
    where: category ? { category } : undefined,
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Validate with Zod...
  const product = await db.product.create({ data: body });
  return NextResponse.json(product, { status: 201 });
}
```

**When to use Route Handlers vs Server Actions:**
- Server Actions → mutations triggered from UI (forms, buttons)
- Route Handlers → webhooks, third-party API integrations, endpoints consumed by external clients

### 11. Image and Font Optimization

**next/image** handles responsive images, lazy loading, format conversion (WebP/AVIF), and CLS prevention:

```tsx
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={630}
  priority          // Set for LCP image — disables lazy loading
  className="rounded-lg"
/>

// Fill mode for unknown dimensions
<div className="relative h-64 w-full">
  <Image src={url} alt={alt} fill className="object-cover" />
</div>
```

**next/font** loads fonts with zero layout shift:

```tsx
// app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### 12. Metadata API and SEO

Generate metadata statically or dynamically:

```tsx
// Static metadata
export const metadata: Metadata = {
  title: "My App",
  description: "App description",
};

// Dynamic metadata
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}
```

Use `generateMetadata` for any page with dynamic content (product pages, blog posts, user profiles).

### 13. Edge vs Node.js Runtime and Deployment

**Node.js runtime (default):** Full Node.js APIs, no size limits, all npm packages. Use for most routes.

**Edge runtime:** V8 isolates, limited APIs (no fs, no native modules), cold starts in milliseconds. Use for middleware and latency-critical Route Handlers.

```tsx
// Opt into edge runtime for a route
export const runtime = "edge";
```

**Deployment options:**
- **Vercel** — zero-config, optimized caching, edge functions, image optimization CDN
- **Standalone build** — `output: "standalone"` in `next.config.ts`, produces a minimal Node.js server
- **Docker** — multi-stage build with standalone output, ideal for self-hosted environments

---

## LLM Instructions

### Scaffolding a Next.js App

When generating a Next.js project structure:
- Use the `app/` directory exclusively (not `pages/`)
- Create `layout.tsx` at each level that needs shared UI
- Use route groups `(groupName)` for organizing without URL impact
- Include `loading.tsx` and `error.tsx` for every data-dependent route
- Put metadata exports in every `page.tsx` and `layout.tsx`

### Server vs Client Component Decisions

Follow this rule: default to Server Component. Add `"use client"` only when the component needs:
- `useState`, `useEffect`, `useRef`, or any React hook
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `document`, `localStorage`)
- Third-party libraries that use hooks or browser APIs

If only a small part of a page needs interactivity, extract just that part into a client component. Keep the page itself as a Server Component.

### Data Fetching Patterns

For data fetching in Server Components:
- `await` directly in the component body — no `useEffect`, no `useState`
- Use `fetch` with `next.revalidate` or `next.tags` for cache control
- Use `Promise.all` for parallel fetches that don't depend on each other
- Wrap slow sections in `<Suspense>` with skeleton fallbacks
- For Prisma/Drizzle, call the ORM directly (no fetch needed)

For mutations:
- Use Server Actions with `"use server"` directive
- Call `revalidatePath` or `revalidateTag` after the mutation
- Use `useActionState` for form state feedback
- Use `useOptimistic` for instant UI updates

### Caching Configuration

When setting up caching:
- Static pages with no dynamic data → let Next.js cache fully (default)
- Data that changes occasionally → ISR with `revalidate: 60` (or appropriate interval)
- Data that must be fresh → `cache: "no-store"` or `dynamic = "force-dynamic"`
- After mutations → always call `revalidatePath` or `revalidateTag`
- User-specific data (cookies, auth) → route becomes dynamic automatically

### API Routes and Middleware

For Route Handlers:
- Use typed `NextRequest` and `NextResponse`
- Validate request bodies with Zod before processing
- Return appropriate status codes (201 for creation, 204 for deletion)
- Handle errors with try/catch and structured error responses

For middleware:
- Keep it lean — only auth checks, redirects, header manipulation
- Always use the `matcher` config to avoid running on static assets
- Never do database queries in middleware

### Image, Font, and Metadata

- Always use `next/image` instead of `<img>` — set `priority` on the LCP image
- Always use `next/font` — import and apply in root layout
- Add `generateMetadata` for every dynamic page
- Include `openGraph` metadata for pages shared on social media

---

## Examples

### 1. App Router File Structure

A complete production layout showing route groups, parallel routes, and conventions:

```
app/
├── layout.tsx                    # Root layout (font, providers)
├── page.tsx                      # Home page
├── not-found.tsx                 # Global 404
├── error.tsx                     # Global error boundary
├── (marketing)/
│   ├── layout.tsx                # Marketing layout (nav + footer)
│   ├── page.tsx                  # Landing page
│   ├── about/page.tsx
│   ├── pricing/page.tsx
│   └── blog/
│       ├── page.tsx              # Blog index
│       └── [slug]/page.tsx       # Blog post
├── (app)/
│   ├── layout.tsx                # App layout (sidebar + topbar)
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── loading.tsx           # Dashboard skeleton
│   │   └── error.tsx             # Dashboard error UI
│   ├── settings/
│   │   ├── page.tsx
│   │   └── layout.tsx            # Settings sub-nav
│   └── @modal/
│       ├── default.tsx           # Parallel route default
│       └── (.)invite/page.tsx    # Intercepted modal
├── api/
│   ├── webhooks/stripe/route.ts  # Webhook handler
│   └── og/route.tsx              # OG image generation
└── middleware.ts                  # Auth + redirects
```

### 2. Server Component with Parallel Data Fetching

Fetching multiple data sources in parallel without client-side waterfalls:

```tsx
// app/(app)/dashboard/page.tsx
import { Suspense } from "react";
import { StatsSkeleton, ChartSkeleton, ActivitySkeleton } from "./skeletons";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Suspense fallback={<ChartSkeleton />}>
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
        </Suspense>

        <Suspense fallback={<ActivitySkeleton />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  );
}

// Each component fetches its own data independently
async function StatsSection() {
  const stats = await getStats(); // Cached, revalidates every 60s
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(stat => (
        <div key={stat.label} className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">{stat.label}</p>
          <p className="text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

async function RevenueChart() {
  const data = await getRevenueData(); // Heavier query, separate Suspense
  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Revenue</h2>
      {/* Chart component here */}
    </div>
  );
}

async function RecentActivity() {
  const activities = await getRecentActivity();
  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
      <ul className="space-y-3">
        {activities.map(activity => (
          <li key={activity.id} className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{activity.time}</span>
            <span>{activity.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Server Action Form with Validation

A complete form using Server Actions with Zod validation and error handling:

```tsx
// lib/validations/post.ts
import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  category: z.enum(["tech", "design", "business"]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
```

```tsx
// actions/posts.ts
"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createPostSchema } from "@/lib/validations/post";
import { auth } from "@/lib/auth";

export type PostActionState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createPost(
  prevState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  // Authenticate
  const session = await auth();
  if (!session?.user) {
    return { message: "Unauthorized" };
  }

  // Validate
  const result = createPostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  // Create
  await db.post.create({
    data: { ...result.data, authorId: session.user.id },
  });

  revalidateTag("posts");
  redirect("/posts");
}
```

```tsx
// app/(app)/posts/new/page.tsx
"use client";

import { useActionState } from "react";
import { createPost, type PostActionState } from "@/actions/posts";

const initialState: PostActionState = {};

export default function NewPostPage() {
  const [state, formAction, isPending] = useActionState(createPost, initialState);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          className="mt-1 w-full rounded border px-3 py-2"
          aria-describedby={state.errors?.title ? "title-error" : undefined}
        />
        {state.errors?.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600">
            {state.errors.title[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium">
          Category
        </label>
        <select id="category" name="category" className="mt-1 w-full rounded border px-3 py-2">
          <option value="tech">Tech</option>
          <option value="design">Design</option>
          <option value="business">Business</option>
        </select>
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          rows={8}
          className="mt-1 w-full rounded border px-3 py-2"
          aria-describedby={state.errors?.content ? "content-error" : undefined}
        />
        {state.errors?.content && (
          <p id="content-error" className="mt-1 text-sm text-red-600">
            {state.errors.content[0]}
          </p>
        )}
      </div>

      {state.message && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Publishing..." : "Publish Post"}
      </button>
    </form>
  );
}
```

### 4. Authentication Middleware

Middleware that checks session tokens and protects routes:

```tsx
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/verify";

const publicPaths = ["/", "/login", "/signup", "/about", "/pricing"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith("/api/public"))) {
    return NextResponse.next();
  }

  // Check session
  const token = request.cookies.get("session")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = await verifyToken(token);

    // Add user info to headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId);
    response.headers.set("x-user-role", payload.role);
    return response;
  } catch {
    // Invalid token — clear cookie and redirect
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 5. Dynamic Metadata for SEO

Generating metadata for a product page with Open Graph and structured data:

```tsx
// app/(marketing)/products/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.name} | MyStore`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: [
        {
          url: product.image,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description.slice(0, 160),
      images: [product.image],
    },
  };
}

// Generate static paths at build time
export async function generateStaticParams() {
  const products = await getAllProductSlugs();
  return products.map(slug => ({ slug }));
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-4xl">
        <Image
          src={product.image}
          alt={product.name}
          width={800}
          height={600}
          priority
          className="rounded-lg"
        />
        <h1 className="mt-6 text-3xl font-bold">{product.name}</h1>
        <p className="mt-2 text-2xl text-gray-700">${product.price}</p>
        <p className="mt-4 text-gray-600">{product.description}</p>
      </div>
    </>
  );
}
```

### 6. next/image and next/font Setup

Configuring images and fonts in the root layout:

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Google font with variable weight
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Monospace for code blocks
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

// Local font example
const brand = localFont({
  src: [
    { path: "../public/fonts/brand-regular.woff2", weight: "400" },
    { path: "../public/fonts/brand-bold.woff2", weight: "700" },
  ],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MyApp", template: "%s | MyApp" },
  description: "My application description",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${brand.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

```css
/* globals.css — Reference font variables */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-sans: var(--font-sans);
    --font-mono: var(--font-mono);
  }
}
```

```tsx
// next.config.ts — Image configuration
import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.example.com",
      },
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/uploads/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default config;
```

---

## Common Mistakes

### 1. Making the Root Layout a Client Component

**Wrong:**
```tsx
"use client"; // Now EVERYTHING in the app is a client component
export default function RootLayout({ children }) { ... }
```

**Fix:** Keep the root layout as a Server Component. Extract interactive parts (theme toggle, mobile nav) into small client components.

### 2. Using useEffect for Data Fetching in Server Components

**Wrong:**
```tsx
"use client";
export default function Products() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(setProducts);
  }, []);
  return <ProductList products={products} />;
}
```

**Fix:** Fetch directly in a Server Component:
```tsx
export default async function Products() {
  const products = await db.product.findMany();
  return <ProductList products={products} />;
}
```

### 3. Misunderstanding "use client" Scope

**Wrong thinking:** "use client" means the component ONLY runs on the client.

**Reality:** "use client" components are SSR'd on the server AND hydrated on the client. The directive marks the boundary between the Server Component and Client Component module graphs.

### 4. Not Validating Server Action Input

**Wrong:**
```tsx
"use server";
export async function deleteUser(formData: FormData) {
  const id = formData.get("id") as string;
  await db.user.delete({ where: { id } }); // No auth check, no validation
}
```

**Fix:** Always authenticate and validate:
```tsx
"use server";
export async function deleteUser(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");

  const { id } = z.object({ id: z.string().uuid() }).parse({
    id: formData.get("id"),
  });

  await db.user.delete({ where: { id } });
  revalidatePath("/users");
}
```

### 5. Fighting the Cache Instead of Understanding It

**Wrong:**
```tsx
// "Nothing updates!" — using no-store everywhere
export const dynamic = "force-dynamic"; // Nuclear option
export const fetchCache = "force-no-store";
```

**Fix:** Understand the caching layers and use targeted revalidation:
```tsx
// Tag your fetches
const products = await fetch(url, { next: { tags: ["products"] } });

// Revalidate after mutations
"use server";
export async function createProduct(data: FormData) {
  await db.product.create({ data: validated });
  revalidateTag("products"); // Only this data refreshes
}
```

### 6. Importing Server-Only Code in Client Components

**Wrong:**
```tsx
"use client";
import { db } from "@/lib/db"; // Prisma client bundled into client JavaScript!
```

**Fix:** Use the `server-only` package to catch this at build time:
```tsx
// lib/db.ts
import "server-only";
import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient();
```

### 7. Oversized Middleware

**Wrong:**
```tsx
export async function middleware(request: NextRequest) {
  const user = await db.user.findUnique({ where: { id: token.sub } }); // DB call in middleware
  const permissions = await getPermissions(user.role); // Another DB call
  // ...complex logic
}
```

**Fix:** Middleware should only check tokens and redirect. Move complex logic to Server Components or Route Handlers:
```tsx
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
```

### 8. Using `<img>` Instead of next/image

**Wrong:**
```tsx
<img src="/hero.png" alt="Hero" /> // No optimization, no lazy loading, causes CLS
```

**Fix:**
```tsx
import Image from "next/image";
<Image src="/hero.png" alt="Hero" width={1200} height={630} priority />
```

### 9. Hardcoded Metadata Instead of generateMetadata

**Wrong:**
```tsx
// app/products/[id]/page.tsx
export const metadata = {
  title: "Product Page", // Same title for every product
};
```

**Fix:**
```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product.name, description: product.description };
}
```

### 10. Not Using Route Groups

**Wrong:**
```
app/
├── layout.tsx        # One layout for marketing AND app — messy
├── page.tsx
├── about/page.tsx
├── dashboard/page.tsx
├── settings/page.tsx
```

**Fix:**
```
app/
├── layout.tsx              # Root: just fonts + providers
├── (marketing)/
│   ├── layout.tsx          # Marketing nav + footer
│   ├── page.tsx
│   └── about/page.tsx
├── (app)/
│   ├── layout.tsx          # App sidebar + topbar
│   ├── dashboard/page.tsx
│   └── settings/page.tsx
```

### 11. One Giant Client Component Per Page

**Wrong:**
```tsx
"use client"; // Entire page is a client component
export default function SettingsPage() {
  // 500 lines of mixed data display and interactivity
}
```

**Fix:** Keep the page as a Server Component, extract only interactive parts:
```tsx
// page.tsx — Server Component
export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div>
      <h1>Settings</h1>
      <ProfileDisplay profile={settings.profile} />        {/* Server */}
      <NotificationToggle initial={settings.notifications} /> {/* Client */}
      <ThemeSelector current={settings.theme} />              {/* Client */}
    </div>
  );
}
```

### 12. Missing loading.tsx and error.tsx

**Wrong:** No loading or error files — users see a blank screen during data fetching and an unhandled error crashes the page.

**Fix:** Add these files to every data-dependent route:
```tsx
// loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-64 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

// error.tsx
"use client";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <button onClick={reset} className="mt-4 rounded bg-red-600 px-4 py-2 text-white">
        Try again
      </button>
    </div>
  );
}
```

---

See also: [React Fundamentals](../React-Fundamentals/react-fundamentals.md) | [Data Fetching](../Data-Fetching/data-fetching.md) | [CSS Architecture](../CSS-Architecture/css-architecture.md) | [Performance](../Performance/performance.md) | [TypeScript-React](../TypeScript-React/typescript-react.md) | [Forms & Validation](../Forms-Validation/forms-validation.md) | [Frontend Security](../../Security/Frontend-Security/frontend-security.md) | [SEO](../../SEO/)

Last reviewed: 2026-02
