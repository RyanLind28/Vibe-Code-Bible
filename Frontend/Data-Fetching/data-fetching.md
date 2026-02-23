# Data Fetching
> Server Component fetching, Next.js caching layers, TanStack Query, streaming, and Server Action mutations — structured for AI-assisted development.

---

## Principles

### 1. The Server-First Data Model

In Next.js App Router, the default is to fetch data on the server in Server Components. This eliminates the client-server waterfall that plagued SPAs:

**Old model (SPA):** Browser loads JS → JS executes → fetch starts → data arrives → render
**New model (RSC):** Server fetches data → renders HTML → streams to browser → instant display

Server Components can access databases, file systems, and APIs directly with zero client-side JavaScript overhead.

### 2. Async Server Components

Server Components can be `async` — just `await` your data:

```tsx
export default async function ProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

No `useEffect`. No `useState`. No loading state management. The page renders with data already available.

### 3. The Next.js Caching Layers

Next.js has four caching layers. They work together but serve different purposes:

**Request Memoization** — during a single render, duplicate `fetch()` calls to the same URL are automatically deduplicated. Three components calling `fetch("/api/user")` results in one request.

**Data Cache** — `fetch()` responses are cached on the server, persisting across requests. Default behavior caches indefinitely until revalidated:
```tsx
// Cached indefinitely (default)
const data = await fetch(url);

// Cached for 60 seconds
const data = await fetch(url, { next: { revalidate: 60 } });

// Never cached
const data = await fetch(url, { cache: "no-store" });
```

**Full Route Cache** — static routes are rendered at build time and cached as HTML + RSC payload. Dynamic routes (using `cookies()`, `headers()`, uncached data) render per request.

**Router Cache** — client-side cache of visited routes. When navigating back to a page, the cached version shows instantly.

### 4. Revalidation Strategies

**Time-based (ISR):** Data refreshes on a schedule:
```tsx
fetch(url, { next: { revalidate: 3600 } }); // Every hour
// Or at route level:
export const revalidate = 3600;
```

**On-demand:** Data refreshes after a mutation:
```tsx
import { revalidatePath, revalidateTag } from "next/cache";

// Tag fetches for targeted revalidation
const products = await fetch(url, { next: { tags: ["products"] } });

// After a mutation
revalidateTag("products");      // Revalidate all fetches tagged "products"
revalidatePath("/products");    // Revalidate the products page
```

**Tag-based is preferred** — it's more precise than path-based and scales better with complex data relationships.

### 5. TanStack Query for Client Components

When you need data in a client component (real-time updates, user-triggered fetches, polling), use TanStack Query:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";

export function NotificationBell() {
  const { data: count = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => fetch("/api/notifications/count").then(r => r.json()),
    refetchInterval: 30_000, // Poll every 30 seconds
  });

  return (
    <button className="relative">
      <BellIcon />
      {count > 0 && <Badge count={count} />}
    </button>
  );
}
```

**When to use TanStack Query vs Server Components:**
- Server Components → initial page data, SEO-critical content, anything that can render on the server
- TanStack Query → real-time updates, polling, user-triggered fetches, optimistic mutations, infinite scroll

### 6. SWR for Simpler Client Data

SWR is simpler than TanStack Query for basic data fetching:

```tsx
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function UserAvatar() {
  const { data: user } = useSWR("/api/user", fetcher);
  return user ? <Avatar src={user.avatar} /> : <AvatarSkeleton />;
}
```

Choose SWR when you don't need mutations, optimistic updates, or complex query patterns.

### 7. Streaming with Suspense

Streaming sends HTML progressively. Wrap slow data sources in `<Suspense>` so the rest of the page renders immediately:

```tsx
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Fast — renders immediately */}
      <Suspense fallback={<StatsSkeleton />}>
        <QuickStats />
      </Suspense>

      {/* Slower — streams in when ready */}
      <div className="grid grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<TableSkeleton />}>
          <RecentOrders />
        </Suspense>
      </div>
    </div>
  );
}
```

Each Suspense boundary resolves independently. The page shell and fast sections arrive first; slow sections fill in as data becomes available.

### 8. Error Handling

Handle errors at multiple levels:

**Route-level:** `error.tsx` catches unhandled errors for the entire segment:
```tsx
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
      <p className="mt-2 text-sm text-red-600">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded bg-red-600 px-4 py-2 text-white">
        Try again
      </button>
    </div>
  );
}
```

**Component-level:** `try/catch` in Server Components for graceful degradation:
```tsx
async function RecentActivity() {
  try {
    const activities = await getActivities();
    return <ActivityList activities={activities} />;
  } catch {
    return <p className="text-gray-500">Unable to load recent activity.</p>;
  }
}
```

### 9. Loading States and Skeleton UI

Skeletons should match the shape of the loaded content to prevent layout shift:

```tsx
// loading.tsx — automatic Suspense boundary for the route
export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Match the layout of the loaded page */}
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" /> {/* Title */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" /> /* Stats */
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-gray-200" /> {/* Chart */}
    </div>
  );
}
```

**Rules:**
- Match the loaded content's dimensions and layout
- Use `animate-pulse` for the shimmer effect
- Keep skeletons simple — don't over-detail them

### 10. Waterfall Prevention

Sequential `await` calls create waterfalls. Fetch independent data in parallel:

**Wrong — waterfall (6 seconds total if each takes 2s):**
```tsx
const user = await getUser(id);
const posts = await getUserPosts(id);
const analytics = await getAnalytics(id);
```

**Right — parallel (2 seconds total):**
```tsx
const [user, posts, analytics] = await Promise.all([
  getUser(id),
  getUserPosts(id),
  getAnalytics(id),
]);
```

**For dependent data**, fetch independently where possible and use Suspense for the dependent part:
```tsx
// User loads fast, recommendations depend on user but stream separately
export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const user = await getUser(id); // Need this first

  return (
    <div>
      <UserProfile user={user} />
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations userId={user.id} /> {/* Fetches its own data */}
      </Suspense>
    </div>
  );
}
```

### 11. Server Actions for Mutations

Server Actions handle data mutations with automatic revalidation:

```tsx
// actions/posts.ts
"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const data = createPostSchema.parse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  await db.post.create({
    data: { ...data, authorId: session.user.id },
  });

  revalidateTag("posts");
}
```

Use `useOptimistic` for instant UI feedback:
```tsx
"use client";

import { useOptimistic } from "react";

export function LikeButton({ postId, likes, hasLiked }: LikeButtonProps) {
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    { count: likes, hasLiked },
    (state, _action: void) => ({
      count: state.hasLiked ? state.count - 1 : state.count + 1,
      hasLiked: !state.hasLiked,
    }),
  );

  async function handleLike() {
    setOptimisticLikes();
    await toggleLike(postId);
  }

  return (
    <form action={handleLike}>
      <button className={optimisticLikes.hasLiked ? "text-red-500" : "text-gray-400"}>
        {optimisticLikes.hasLiked ? <HeartFilledIcon /> : <HeartIcon />}
        <span>{optimisticLikes.count}</span>
      </button>
    </form>
  );
}
```

---

## LLM Instructions

### Server Component Fetching

When generating data-fetching code for Server Components:
- Fetch directly in the component body with `await` — no hooks
- Use `Promise.all` for independent parallel fetches
- Wrap slow sections in `<Suspense>` with skeleton fallbacks
- Use `fetch` with `next.tags` for cache control
- For ORM calls (Prisma, Drizzle), call directly — no fetch wrapper needed
- Add `error.tsx` and `loading.tsx` to every data-dependent route

### TanStack Query Setup

When setting up TanStack Query for client-side data:
- Create a `QueryClientProvider` in a client component
- Set `staleTime` globally (5 minutes is a good default)
- Create custom hooks per data type: `useProducts()`, `useUser(id)`
- Include all filter/pagination params in `queryKey` arrays
- Use `useMutation` with `onSuccess: () => queryClient.invalidateQueries()`
- Use `keepPreviousData` for pagination transitions

### Streaming and Suspense

When building streaming pages:
- Identify which data is fast (user session, counts) vs slow (analytics, reports)
- Wrap each independent data source in its own `<Suspense>` boundary
- Create skeleton components that match the loaded layout
- Use `loading.tsx` for route-level loading states
- Use explicit `<Suspense>` for finer-grained control within a route

### Error Handling

When handling data errors:
- Add `error.tsx` to every route with data dependencies
- Use `try/catch` in Server Components for graceful degradation (show a message instead of crashing the page)
- Include a "retry" button in error UIs (use the `reset` function from `error.tsx`)
- Never expose internal error details to the user — log them server-side

### Waterfall Prevention

When fetching multiple data sources:
- Identify dependencies: which fetches depend on previous results?
- Independent fetches → `Promise.all`
- Dependent fetches → await the parent, then use Suspense for children
- Never `await` sequentially when data is independent

### Server Action Mutations

When creating mutations:
- Define Server Actions in a separate `actions/` file with `"use server"`
- Always validate input with Zod — Server Actions are public HTTP endpoints
- Always check authentication and authorization
- Call `revalidateTag` or `revalidatePath` after the mutation
- Use `useOptimistic` for instant UI feedback
- Use `useActionState` for form error display

---

## Examples

### 1. Parallel Fetching Dashboard

A dashboard page that fetches all data in parallel:

```tsx
// app/(app)/dashboard/page.tsx
import { Suspense } from "react";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats are fast — separate boundary */}
      <Suspense fallback={<div className="grid grid-cols-4 gap-4">{skeletons(4, "h-24")}</div>}>
        <StatsRow />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Suspense fallback={<div className="lg:col-span-2 h-96 animate-pulse rounded-lg bg-gray-200" />}>
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
        </Suspense>

        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-gray-200" />}>
          <RecentOrders />
        </Suspense>
      </div>
    </div>
  );
}

async function StatsRow() {
  // These can be fetched in parallel
  const [revenue, users, orders, conversion] = await Promise.all([
    getRevenueStat(),
    getUsersStat(),
    getOrdersStat(),
    getConversionStat(),
  ]);

  const stats = [
    { label: "Revenue", value: `$${revenue.toLocaleString()}` },
    { label: "Users", value: users.toLocaleString() },
    { label: "Orders", value: orders.toLocaleString() },
    { label: "Conversion", value: `${conversion}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(stat => (
        <div key={stat.label} className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

async function RevenueChart() {
  const data = await getRevenueTimeline();
  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="text-lg font-semibold">Revenue</h2>
      <Chart data={data} />
    </div>
  );
}

async function RecentOrders() {
  const orders = await getRecentOrders(10);
  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="text-lg font-semibold">Recent Orders</h2>
      <ul className="mt-4 space-y-3">
        {orders.map(order => (
          <li key={order.id} className="flex items-center justify-between text-sm">
            <span>{order.customer}</span>
            <span className="font-medium">${order.total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function skeletons(count: number, className: string) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
  ));
}
```

### 2. TanStack Query CRUD with Prefetching

Client-side data management with server-side prefetching:

```tsx
// lib/queries/products.ts
import { queryOptions } from "@tanstack/react-query";

export const productQueries = {
  all: () =>
    queryOptions({
      queryKey: ["products"],
      queryFn: () => fetch("/api/products").then(r => r.json()),
      staleTime: 5 * 60 * 1000,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: ["products", id],
      queryFn: () => fetch(`/api/products/${id}`).then(r => r.json()),
      staleTime: 5 * 60 * 1000,
    }),

  search: (query: string) =>
    queryOptions({
      queryKey: ["products", "search", query],
      queryFn: () => fetch(`/api/products?q=${encodeURIComponent(query)}`).then(r => r.json()),
      enabled: query.length > 0,
    }),
};
```

```tsx
// app/products/page.tsx — Server Component with prefetching
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { productQueries } from "@/lib/queries/products";
import { ProductList } from "./product-list";

export default async function ProductsPage() {
  const queryClient = new QueryClient();

  // Prefetch on the server — data is available immediately on the client
  await queryClient.prefetchQuery(productQueries.all());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <h1 className="mb-6 text-2xl font-bold">Products</h1>
      <ProductList />
    </HydrationBoundary>
  );
}
```

```tsx
// app/products/product-list.tsx — Client Component
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productQueries } from "@/lib/queries/products";

export function ProductList() {
  const { data: products = [] } = useQuery(productQueries.all());
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return (
    <div className="space-y-4">
      {products.map((product: any) => (
        <div key={product.id} className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h3 className="font-medium">{product.name}</h3>
            <p className="text-sm text-gray-500">${product.price}</p>
          </div>
          <button
            onClick={() => deleteMutation.mutate(product.id)}
            disabled={deleteMutation.isPending}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 3. Streaming Product Page

A product page with progressive streaming:

```tsx
// app/products/[id]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Product info — available immediately */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Image
          src={product.image}
          alt={product.name}
          width={600}
          height={600}
          priority
          className="rounded-xl"
        />
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 text-2xl text-gray-700">${product.price}</p>
          <p className="mt-4 text-gray-600">{product.description}</p>
          <AddToCartButton productId={id} />
        </div>
      </div>

      {/* Reviews — stream in when ready */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={id} />
      </Suspense>

      {/* Recommendations — stream in independently */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={id} />
      </Suspense>
    </div>
  );
}

async function Reviews({ productId }: { productId: string }) {
  const reviews = await getProductReviews(productId);
  return (
    <section>
      <h2 className="text-xl font-semibold">Reviews ({reviews.length})</h2>
      <div className="mt-4 space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Stars count={review.rating} />
              <span className="font-medium">{review.author}</span>
            </div>
            <p className="mt-2 text-gray-600">{review.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

async function Recommendations({ productId }: { productId: string }) {
  const products = await getRecommendations(productId);
  return (
    <section>
      <h2 className="text-xl font-semibold">You might also like</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
```

### 4. Error Handling at Every Layer

Comprehensive error handling from route to component:

```tsx
// app/(app)/dashboard/error.tsx — Route-level error boundary
"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    reportError(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-xl font-semibold text-red-800">Dashboard Error</h2>
      <p className="mt-2 text-gray-600">
        We couldn&apos;t load the dashboard. Please try again.
      </p>
      {error.digest && (
        <p className="mt-1 text-sm text-gray-400">Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-4 rounded bg-blue-600 px-6 py-2 text-white"
      >
        Try again
      </button>
    </div>
  );
}
```

```tsx
// Component-level graceful degradation
async function ActivityFeed() {
  try {
    const activities = await getActivities();

    if (activities.length === 0) {
      return <EmptyState message="No recent activity" />;
    }

    return (
      <ul className="space-y-3">
        {activities.map(activity => (
          <li key={activity.id}>{activity.description}</li>
        ))}
      </ul>
    );
  } catch {
    // Don't crash the whole page — show a fallback
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
        Unable to load activity feed.
      </div>
    );
  }
}
```

### 5. Server Action with useOptimistic

A like button with instant feedback:

```tsx
// actions/likes.ts
"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";

export async function toggleLike(postId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const existing = await db.like.findUnique({
    where: {
      userId_postId: {
        userId: session.user.id,
        postId,
      },
    },
  });

  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
  } else {
    await db.like.create({
      data: { userId: session.user.id, postId },
    });
  }

  revalidateTag(`post-${postId}`);
}
```

```tsx
// components/like-button.tsx
"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/actions/likes";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  initialLikes: number;
  initialHasLiked: boolean;
}

export function LikeButton({ postId, initialLikes, initialHasLiked }: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();

  const [optimistic, setOptimistic] = useOptimistic(
    { count: initialLikes, hasLiked: initialHasLiked },
    (state) => ({
      count: state.hasLiked ? state.count - 1 : state.count + 1,
      hasLiked: !state.hasLiked,
    }),
  );

  function handleClick() {
    startTransition(async () => {
      setOptimistic(null);
      await toggleLike(postId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
        optimistic.hasLiked
          ? "bg-red-50 text-red-600"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
      )}
    >
      <HeartIcon filled={optimistic.hasLiked} className="h-4 w-4" />
      <span>{optimistic.count}</span>
    </button>
  );
}
```

### 6. Infinite Scroll with TanStack Query

Loading more items as the user scrolls:

```tsx
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface ProductsResponse {
  products: Product[];
  nextCursor: string | null;
}

export function InfiniteProductGrid() {
  const { ref, inView } = useInView({ threshold: 0 });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["products", "infinite"],
    queryFn: async ({ pageParam }) => {
      const params = pageParam ? `?cursor=${pageParam}` : "";
      const res = await fetch(`/api/products${params}`);
      return res.json() as Promise<ProductsResponse>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Fetch next page when sentinel is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <ProductGridSkeleton />;

  const products = data?.pages.flatMap(page => page.products) ?? [];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Sentinel element for intersection observer */}
      <div ref={ref} className="mt-8 flex justify-center">
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && products.length > 0 && (
          <p className="text-sm text-gray-500">No more products</p>
        )}
      </div>
    </div>
  );
}
```

---

## Common Mistakes

### 1. useEffect + useState for Initial Data

**Wrong:**
```tsx
"use client";
export default function Products() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(setProducts);
  }, []);
  return <ProductGrid products={products} />;
}
```

**Fix:** Use a Server Component:
```tsx
export default async function Products() {
  const products = await db.product.findMany();
  return <ProductGrid products={products} />;
}
```

### 2. Sequential Awaits for Independent Data

**Wrong:**
```tsx
const user = await getUser(id);        // 200ms
const orders = await getOrders(id);     // 300ms
const analytics = await getAnalytics(); // 500ms
// Total: 1000ms
```

**Fix:**
```tsx
const [user, orders, analytics] = await Promise.all([
  getUser(id),
  getOrders(id),
  getAnalytics(),
]);
// Total: 500ms (slowest query)
```

### 3. No Suspense Boundaries

**Wrong:**
```tsx
export default async function Dashboard() {
  const stats = await getStats();
  const chart = await getChartData();     // Slow
  const activity = await getActivity();   // Slow

  return <div>...</div>;
  // User sees nothing until ALL data is ready
}
```

**Fix:**
```tsx
export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <Chart />
      </Suspense>
      <Suspense fallback={<ActivitySkeleton />}>
        <Activity />
      </Suspense>
    </div>
  );
}
```

### 4. No Revalidation After Mutations

**Wrong:**
```tsx
"use server";
export async function createProduct(data: FormData) {
  await db.product.create({ data: validated });
  // The product list page still shows stale data
}
```

**Fix:**
```tsx
"use server";
export async function createProduct(data: FormData) {
  await db.product.create({ data: validated });
  revalidateTag("products"); // Now the list refreshes
}
```

### 5. Caching Sensitive Data

**Wrong:**
```tsx
// User-specific data cached and served to other users
const profile = await fetch("/api/profile"); // Cached by default
```

**Fix:**
```tsx
const profile = await fetch("/api/profile", { cache: "no-store" });
// Or use cookies()/headers() which automatically opt out of caching
```

### 6. Untyped API Responses

**Wrong:**
```tsx
const data = await fetch(url).then(r => r.json());
// data is `any` — no type safety
```

**Fix:**
```tsx
const data = productSchema.parse(await fetch(url).then(r => r.json()));
// Validated and typed
```

### 7. No error.tsx for Data Routes

**Wrong:** A route fetches data but has no error boundary. If the fetch fails, the user sees a generic Next.js error page.

**Fix:** Add `error.tsx` to every data-dependent route:
```tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>Something went wrong.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### 8. No staleTime on TanStack Query

**Wrong:**
```tsx
useQuery({ queryKey: ["products"], queryFn: fetchProducts });
// Default staleTime is 0 — refetches on every focus/mount
```

**Fix:**
```tsx
useQuery({
  queryKey: ["products"],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
});
```

### 9. Slow Layout Fetch

**Wrong:**
```tsx
// app/(app)/layout.tsx
export default async function AppLayout({ children }) {
  const user = await getFullUserProfile(); // Slow query in layout — blocks ALL child routes
  return <div><Sidebar user={user} />{children}</div>;
}
```

**Fix:** Fetch only what the layout needs, or use Suspense:
```tsx
export default function AppLayout({ children }) {
  return (
    <div>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      {children}
    </div>
  );
}
```

### 10. Using revalidatePath("/") for Everything

**Wrong:**
```tsx
revalidatePath("/"); // Revalidates the entire site — overkill
```

**Fix:** Use targeted tag-based revalidation:
```tsx
// Tag your fetches
fetch(url, { next: { tags: ["products", `product-${id}`] } });

// Revalidate only what changed
revalidateTag("products");
```

---

See also: [Next.js Patterns](../Nextjs-Patterns/nextjs-patterns.md) | [State Management](../State-Management/state-management.md) | [Performance](../Performance/performance.md) | [React Fundamentals](../React-Fundamentals/react-fundamentals.md) | [Forms & Validation](../Forms-Validation/forms-validation.md) | [TypeScript-React](../TypeScript-React/typescript-react.md)

Last reviewed: 2026-02
