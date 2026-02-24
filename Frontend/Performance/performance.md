# Performance
> Web Vitals, bundle optimization, code splitting, image/font loading, and profiling strategies for React and Next.js — structured for AI-assisted development.

---

## Principles

### 1. Web Vitals: LCP, CLS, INP

Google's Core Web Vitals are the three metrics that matter most:

**Largest Contentful Paint (LCP)** — time until the largest visible element renders. Target: under 2.5 seconds.
- Affected by: server response time, resource load time, render-blocking resources, client-side rendering
- Fix: optimize the LCP element (hero image, heading), use `priority` on LCP images, stream HTML with Suspense

**Cumulative Layout Shift (CLS)** — unexpected layout movement. Target: under 0.1.
- Affected by: images without dimensions, dynamic content injection, web fonts causing FOIT/FOUT, ads and embeds
- Fix: always set `width`/`height` on images, use `next/font`, reserve space for dynamic content

**Interaction to Next Paint (INP)** — responsiveness to user input. Target: under 200ms.
- Affected by: long JavaScript tasks, heavy re-renders, blocking the main thread
- Fix: use `useTransition` for expensive updates, break up long tasks, minimize client-side JavaScript

### 2. Bundle Size: The Silent Killer

Every kilobyte of JavaScript has a cost beyond download: parse → compile → execute. On a mid-range phone, 1MB of JavaScript can block the main thread for 2-4 seconds.

**The chain:** Large bundle → slow parse → slow TTI → poor INP → bad user experience

**Audit your bundle regularly.** Most projects ship 2-3x more JavaScript than they realize from:
- Full library imports (`import _ from "lodash"` vs `import groupBy from "lodash/groupBy"`)
- Barrel file re-exports (`index.ts` that re-exports everything)
- Dependencies you forgot about
- Polyfills you don't need

### 3. Code Splitting Strategies

**Route-based splitting** (automatic in Next.js) — each page gets its own bundle. The user only downloads JavaScript for the current page.

**Component-based splitting** — lazy-load heavy components that aren't visible on initial render:

```tsx
const Chart = lazy(() => import("./Chart"));
const Editor = lazy(() => import("./Editor"));
```

**Library-based splitting** — dynamically import heavy libraries only when needed:

```tsx
async function handleExport() {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  // ...
}
```

### 4. React.lazy and Dynamic Imports

`React.lazy` code-splits a component and loads it on demand:

```tsx
import { lazy, Suspense } from "react";

const HeavyChart = lazy(() => import("@/components/HeavyChart"));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

**Next.js `next/dynamic`** adds SSR control:

```tsx
import dynamic from "next/dynamic";

// Skip SSR for browser-only components (maps, editors, charts)
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```

### 5. Image Optimization

Images are typically the heaviest resources on a page. Key optimizations:

**Format:** WebP is 25-35% smaller than JPEG. AVIF is 30-50% smaller. `next/image` automatically converts to the best supported format.

**Responsive sizing:** Serve appropriately sized images for each viewport:

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority  // Only for LCP image
/>
```

**Lazy loading:** `next/image` lazy-loads by default. Only add `priority` to the above-the-fold LCP image.

**Blur placeholder:** Show a blurred preview while loading:

```tsx
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={base64Placeholder}  // Generate at build time
/>
```

### 6. Font Optimization

Web fonts cause layout shift (FOUT) or invisible text (FOIT). `next/font` solves both:

```tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",       // Text visible immediately with fallback font
  variable: "--font-sans",
});
```

**Key rules:**
- Always use `next/font` — it self-hosts fonts with zero layout shift
- Use `display: "swap"` for body text (text visible immediately)
- Use variable fonts when available (one file instead of multiple weights)
- Subset fonts to only the character sets you need (`subsets: ["latin"]`)

### 7. Script Optimization

Third-party scripts (analytics, chat widgets, ads) are performance killers. Control their loading:

```tsx
import Script from "next/script";

// Load after page is interactive
<Script src="https://analytics.example.com/script.js" strategy="afterInteractive" />

// Load when browser is idle
<Script src="https://chat-widget.example.com/widget.js" strategy="lazyOnload" />

// Load before page hydration (rare — only for critical scripts)
<Script src="/critical.js" strategy="beforeInteractive" />
```

**Rules:**
- Never put third-party scripts in `<head>` without `async` or `defer`
- Use `strategy="lazyOnload"` for anything non-essential (chat, analytics, social widgets)
- Audit third-party script impact with Chrome DevTools → Performance tab

### 8. Tree Shaking and Dead Code

Tree shaking eliminates unused code from your bundle. It requires ES modules (`import`/`export`):

**Works with tree shaking:**
```tsx
import { format } from "date-fns";  // Only 'format' is bundled
```

**Breaks tree shaking:**
```tsx
const dateFns = require("date-fns");  // CommonJS — entire library bundled
```

**Barrel files are tree shaking killers.** A barrel file (`index.ts`) that re-exports everything forces the bundler to include all modules:

```tsx
// components/index.ts — AVOID this pattern
export { Button } from "./Button";
export { Card } from "./Card";
export { Dialog } from "./Dialog";
export { HeavyChart } from "./HeavyChart"; // Always bundled even if unused
```

**Fix:** Import directly from the source file:
```tsx
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
```

### 9. Memoization: When It Helps vs Hurts

Memoization has a cost: memory allocation for the cached value plus shallow comparison on every render.

**Memoize when:**
- A component re-renders frequently with the same props AND the render is measurably slow
- An expensive computation runs on every render (sorting/filtering thousands of items)
- A callback is passed to a `React.memo`-wrapped child

**Don't memoize when:**
- The computation is cheap (string formatting, simple math)
- The component renders infrequently
- The props always change anyway (new objects/arrays every render)

**React Compiler (React 19)** automatically memoizes. If your project uses the React Compiler, you don't need manual `useMemo`/`useCallback`. Check your babel/next config for `babel-plugin-react-compiler`.

### 10. Server Components and Performance

Server Components are the biggest performance lever in modern React:

- **Zero client JavaScript** for Server Components — HTML only
- **Direct data access** — no API roundtrip, no client-side waterfall
- **Streaming** — send HTML progressively, show content as it's ready
- **Smaller bundles** — dependencies used only in Server Components stay on the server

**The principle:** Keep as much of your app in Server Components as possible. Only use `"use client"` for interactive elements. Push `"use client"` boundaries as deep as possible in the component tree.

### 11. Lighthouse CI and Performance Budgets

Automate performance checks in CI to prevent regressions:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci && npm run build
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v12
        with:
          uploadArtifacts: true
          budgetPath: ./budget.json
```

```json
// budget.json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "interactive", "budget": 3500 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "total", "budget": 800 }
    ]
  }
]
```

### 12. React DevTools Profiler

The Profiler tab in React DevTools shows exactly why and how long each component renders:

**Flame chart** — shows the component tree with render times. Gray = didn't render. Colored = rendered. Brighter = slower.

**Ranked chart** — shows components sorted by render duration. Start optimization with the slowest.

**Why did this render?** Enable "Record why each component rendered" in Profiler settings to see:
- Props changed
- State changed
- Parent rendered
- Context changed
- Hooks changed

**Workflow:** Profile → identify slow components → investigate (unnecessary re-renders? expensive computation?) → fix (memoize, split, move state down) → profile again to verify.

---

## LLM Instructions

### Bundle Analysis

When asked to analyze or optimize a bundle:
- Run `npx next build` and check the output table for page sizes
- Use `@next/bundle-analyzer` to visualize: install it, add to `next.config.ts`, run `ANALYZE=true next build`
- Look for: oversized pages (>200KB JS), full library imports, barrel file imports
- Recommend: direct imports, `React.lazy` for heavy components, `next/dynamic` with `ssr: false` for browser-only components

### Code Splitting

When generating components, consider code splitting for:
- Route-level components (automatic in Next.js)
- Heavy visualizations (charts, maps, editors) → `next/dynamic` with `ssr: false`
- Modals and dialogs → `React.lazy` (not visible on initial render)
- PDF/Excel export functionality → dynamic `import()` in the handler
- Admin-only features → `React.lazy` behind permission checks

### Image and Font Optimization

When working with images:
- Always use `next/image` instead of `<img>`
- Set `priority` only on the single LCP image (typically the hero image)
- Provide `sizes` prop for responsive images
- Use `fill` mode with `object-cover` when dimensions are unknown
- Configure `remotePatterns` in `next.config.ts` for external images

When working with fonts:
- Always use `next/font` (Google or local) in the root layout
- Use variable fonts when available
- Set `display: "swap"` for body text
- Apply via CSS variables, not direct className on every element

### Web Vitals Monitoring

When setting up performance monitoring:
- Use Next.js `useReportWebVitals` hook or the `web-vitals` library
- Log CWV data to your analytics service
- Set up alerts for regressions (LCP > 2.5s, CLS > 0.1, INP > 200ms)
- Test on real devices — Chrome DevTools throttling underestimates mobile slowness

### Performance Anti-Patterns to Flag

When reviewing code, flag these patterns:
- `import * from` or full library imports (lodash, date-fns, icons)
- Barrel files (`index.ts`) that re-export entire directories
- `<img>` instead of `next/image`
- No `priority` on the LCP image
- Synchronous third-party scripts in `<head>`
- `"use client"` on page-level components when only a small part needs interactivity
- `useEffect` + `useState` for data fetching in components that could be Server Components

---

## Examples

### 1. Bundle Analysis and Fixing

Identifying and fixing bundle issues:

```tsx
// next.config.ts — Enable bundle analyzer
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const config: NextConfig = {};

export default withBundleAnalyzer(config);
```

```bash
# Run analysis
ANALYZE=true npm run build
```

Common fixes found through analysis:

```tsx
// BEFORE: Full lodash import (71KB)
import _ from "lodash";
const grouped = _.groupBy(items, "category");

// AFTER: Direct import (4KB)
import groupBy from "lodash/groupBy";
const grouped = groupBy(items, "category");
```

```tsx
// BEFORE: Full icon library (150KB+)
import { FiSearch, FiUser, FiSettings } from "react-icons/fi";

// AFTER: Direct imports
import FiSearch from "react-icons/fi/FiSearch";
import FiUser from "react-icons/fi/FiUser";
import FiSettings from "react-icons/fi/FiSettings";
```

```tsx
// BEFORE: All date-fns functions (75KB)
import { format, parseISO, differenceInDays } from "date-fns";

// This is actually fine — date-fns v3 supports tree shaking with ES modules.
// But if you only use format, import just that:
import { format } from "date-fns/format";
```

### 2. Code Splitting with React.lazy and next/dynamic

Lazy-loading heavy components:

```tsx
// Dashboard with lazy-loaded chart
import { lazy, Suspense } from "react";

const RevenueChart = lazy(() => import("@/components/charts/RevenueChart"));
const UserMap = lazy(() => import("@/components/charts/UserMap"));

function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Charts lazy-load when the component mounts */}
      <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
        <RevenueChart data={data.revenue} />
      </Suspense>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
        <UserMap locations={data.locations} />
      </Suspense>
    </div>
  );
}
```

```tsx
// Browser-only component with next/dynamic
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor"),
  {
    ssr: false, // Editor uses browser APIs not available during SSR
    loading: () => (
      <div className="h-64 animate-pulse rounded-lg border bg-gray-50" />
    ),
  },
);

function PostEditor() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Write your post</h2>
      <RichTextEditor />
    </div>
  );
}
```

```tsx
// Dynamic import for export functionality
function ExportButton({ data }: { data: ReportData }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      // jsPDF is only loaded when the user clicks Export
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.text(data.title, 10, 10);
      // ... build PDF
      doc.save("report.pdf");
    } finally {
      setExporting(false);
    }
  }

  return (
    <button onClick={handleExport} disabled={exporting}>
      {exporting ? "Exporting..." : "Export PDF"}
    </button>
  );
}
```

### 3. Responsive Image with next/image

Optimized image component with responsive sizing and blur placeholder:

```tsx
import Image from "next/image";

interface HeroImageProps {
  src: string;
  alt: string;
  blurDataURL?: string;
}

export function HeroImage({ src, alt, blurDataURL }: HeroImageProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
        priority               // This is the LCP element
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        className="object-cover"
      />
    </div>
  );
}

// Product image grid — lazy loaded, not priority
export function ProductImageGrid({ images }: { images: ProductImage[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {images.map((image, index) => (
        <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg">
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform hover:scale-105"
            // No priority — these lazy-load as user scrolls
          />
        </div>
      ))}
    </div>
  );
}
```

### 4. Lighthouse CI GitHub Action

Automated performance testing on every pull request:

```yaml
# .github/workflows/performance.yml
name: Performance Budget
on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci
      - run: npm run build

      - name: Start server
        run: npm start &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run Lighthouse
        id: lighthouse
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/products
            http://localhost:3000/blog
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true

      - name: Comment PR with results
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: lighthouse
          message: |
            ## Lighthouse Results
            ${{ steps.lighthouse.outputs.manifest }}
```

```json
// lighthouse-budget.json
[
  {
    "path": "/",
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "total-blocking-time", "budget": 300 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 250 },
      { "resourceType": "image", "budget": 500 },
      { "resourceType": "total", "budget": 800 }
    ]
  }
]
```

### 5. Memoization Done Right

Profiling-driven memoization with clear before/after:

```tsx
"use client";

import { useMemo, useCallback, memo, useState, useTransition } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  tags: string[];
}

// Memoize the row component — it re-renders when parent filters change
// Only worth it because this renders hundreds of times
const ProductRow = memo(function ProductRow({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (id: string) => void;
}) {
  return (
    <tr
      className="cursor-pointer border-b hover:bg-gray-50"
      onClick={() => onSelect(product.id)}
    >
      <td className="px-4 py-3">{product.name}</td>
      <td className="px-4 py-3">${product.price.toFixed(2)}</td>
      <td className="px-4 py-3">{product.category}</td>
    </tr>
  );
});

export function ProductTable({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "price">("name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // useMemo — sorting + filtering 10,000 products is genuinely expensive
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()),
    );
    return filtered.toSorted((a, b) => {
      if (sortKey === "price") return a.price - b.price;
      return a.name.localeCompare(b.name);
    });
  }, [products, query, sortKey]);

  // useCallback — stabilize reference for memo'd ProductRow
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return (
    <div>
      <input
        value={query}
        onChange={e => startTransition(() => setQuery(e.target.value))}
        placeholder="Search products..."
        className="mb-4 w-full rounded border px-3 py-2"
      />
      <div className={isPending ? "opacity-70" : ""}>
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm font-medium text-gray-500">
              <th className="px-4 py-2">
                <button onClick={() => setSortKey("name")}>Name</button>
              </th>
              <th className="px-4 py-2">
                <button onClick={() => setSortKey("price")}>Price</button>
              </th>
              <th className="px-4 py-2">Category</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <ProductRow
                key={product.id}
                product={product}
                onSelect={handleSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Common Mistakes

### 1. Full Library Imports

**Wrong:**
```tsx
import _ from "lodash";               // 71KB
import moment from "moment";           // 67KB
import * as Icons from "lucide-react"; // All icons bundled
```

**Fix:** Import only what you need:
```tsx
import groupBy from "lodash/groupBy";
import { format } from "date-fns";
import { Search, User, Settings } from "lucide-react"; // Lucide tree-shakes
```

### 2. No Priority on the LCP Image

**Wrong:**
```tsx
<Image src="/hero.jpg" alt="Hero" width={1200} height={630} />
// Lazy-loaded by default — delays LCP
```

**Fix:**
```tsx
<Image src="/hero.jpg" alt="Hero" width={1200} height={630} priority />
```

Only one image on the page should have `priority` — the LCP element.

### 3. Barrel File Re-Exports

**Wrong:**
```tsx
// components/index.ts
export * from "./Button";
export * from "./Card";
export * from "./Dialog";
export * from "./DataTable";     // 50KB component
export * from "./RichTextEditor"; // 200KB component

// page.tsx — importing Button pulls in everything
import { Button } from "@/components";
```

**Fix:** Import directly:
```tsx
import { Button } from "@/components/Button";
```

### 4. Images Without Dimensions

**Wrong:**
```tsx
<img src="/photo.jpg" alt="Photo" />
// Browser doesn't know the size → content jumps when image loads → CLS
```

**Fix:**
```tsx
<Image src="/photo.jpg" alt="Photo" width={800} height={600} />
// Or use fill mode with a sized container
<div className="relative aspect-video">
  <Image src="/photo.jpg" alt="Photo" fill className="object-cover" />
</div>
```

### 5. Synchronous Third-Party Scripts

**Wrong:**
```tsx
<head>
  <script src="https://analytics.example.com/tracker.js" />  {/* Blocks rendering */}
</head>
```

**Fix:**
```tsx
import Script from "next/script";
<Script src="https://analytics.example.com/tracker.js" strategy="afterInteractive" />
```

### 6. Premature Optimization

**Wrong:**
```tsx
// Memoizing everything "just in case"
const greeting = useMemo(() => `Hello, ${name}!`, [name]);
const handleClick = useCallback(() => setOpen(true), []);
const items = useMemo(() => [1, 2, 3], []);
```

**Fix:** Only optimize when profiling shows a problem:
```tsx
const greeting = `Hello, ${name}!`;
const handleClick = () => setOpen(true);
const items = [1, 2, 3];
```

### 7. "use client" on Static Content

**Wrong:**
```tsx
"use client"; // Entire page becomes client-side JavaScript
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>We build great software.</p>
      {/* No interactivity — this should be a Server Component */}
    </div>
  );
}
```

**Fix:** Keep it as a Server Component (no directive). Only add `"use client"` to components that need hooks, state, or event handlers.

### 8. Font Layout Shift

**Wrong:**
```tsx
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />
// External font request → FOUT/FOIT → layout shift
```

**Fix:**
```tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });
// Self-hosted, zero layout shift, preloaded
```

### 9. Eagerly Loading All Route Components

**Wrong:**
```tsx
import Dashboard from "@/components/Dashboard";
import Analytics from "@/components/Analytics";
import Settings from "@/components/Settings";
import AdminPanel from "@/components/AdminPanel"; // Heavy, rarely used
```

**Fix:** Lazy-load rarely visited or heavy routes:
```tsx
import dynamic from "next/dynamic";

const AdminPanel = dynamic(() => import("@/components/AdminPanel"), {
  loading: () => <AdminSkeleton />,
});
```

In Next.js App Router, route-level splitting is automatic via the file system. This applies more to component-level imports within a route.

### 10. Ignoring INP

**Wrong:**
```tsx
function SearchPage() {
  const [query, setQuery] = useState("");
  // Filtering 50,000 items synchronously on every keystroke
  const results = items.filter(i => i.name.includes(query));
  // ...
}
```

**Fix:** Use `useTransition` to keep input responsive:
```tsx
function SearchPage() {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <input
      value={query}
      onChange={e => startTransition(() => setQuery(e.target.value))}
    />
  );
}
```

---

> **See also:** [React Fundamentals](../React-Fundamentals/react-fundamentals.md) | [Next.js Patterns](../Nextjs-Patterns/nextjs-patterns.md) | [CSS Architecture](../CSS-Architecture/css-architecture.md) | [Data Fetching](../Data-Fetching/data-fetching.md) | [Responsive Design](../../UIUX/Responsive-Design/responsive-design.md) | [Mobile-First](../../UIUX/Mobile-First/mobile-first.md)
>
> **Last reviewed:** 2026-02
