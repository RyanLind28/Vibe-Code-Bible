---
title: Performance Testing
description: Lighthouse CI, Core Web Vitals measurement, load testing with k6 and Artillery, React profiling, bundle analysis, database query profiling, memory leak detection, and real user monitoring — everything you need to find and fix performance bottlenecks.
---
# Performance Testing

> Lighthouse CI, Core Web Vitals measurement, load testing with k6 and Artillery, React profiling, bundle analysis, database query profiling, memory leak detection, and real user monitoring — everything you need to find and fix performance bottlenecks.

---

## Principles

### 1. Performance Testing Fundamentals

Performance testing is not one thing — it is a family of tests, each answering a different question.

| Test Type | Question it Answers | Duration | Traffic Pattern |
|-----------|-------------------|----------|-----------------|
| **Load test** | Can the system handle expected traffic? | 5-30 min | Steady, expected volume |
| **Stress test** | At what point does the system break? | 10-30 min | Gradually increasing beyond capacity |
| **Soak test** | Does the system degrade over time? | 1-24 hours | Steady, sustained load |
| **Spike test** | Can the system handle sudden bursts? | 5-10 min | Sudden sharp increase, then drop |
| **Smoke test** | Does the system work at minimal load? | 1-2 min | Minimal traffic (sanity check) |

**Setting performance budgets:**

Performance budgets define acceptable thresholds. Without them, performance degrades gradually and nobody notices until users complain.

```
LCP (Largest Contentful Paint):  < 2.5s
INP (Interaction to Next Paint):  < 200ms
CLS (Cumulative Layout Shift):   < 0.1
FCP (First Contentful Paint):    < 1.8s
TTFB (Time to First Byte):      < 800ms
Total bundle size (JS):          < 200KB compressed
API response time (p95):        < 500ms
API response time (p99):        < 1000ms
```

### 2. Lighthouse CI

Lighthouse CI automates Lighthouse audits in your CI pipeline, catching performance regressions before they reach production.

**Installation and setup:**

```bash
npm install -D @lhci/cli
```

**Configuration:**

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      // Start your server before collecting
      startServerCommand: "npm run start",
      startServerReadyPattern: "ready on",
      startServerReadyTimeout: 30000,
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/docs",
        "http://localhost:3000/pricing",
      ],
      numberOfRuns: 3, // Run each URL 3 times for stability
      settings: {
        preset: "desktop", // or "perf" for mobile throttling
      },
    },
    assert: {
      assertions: {
        // Performance scores (0-1)
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],

        // Core Web Vitals
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],

        // Resource budgets
        "resource-summary:script:size": [
          "error",
          { maxNumericValue: 200000 }, // 200KB
        ],
        "resource-summary:total:size": [
          "warn",
          { maxNumericValue: 500000 }, // 500KB
        ],
      },
    },
    upload: {
      target: "temporary-public-storage", // Free, public Lighthouse results
    },
  },
};
```

**GitHub Actions integration:**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npx @lhci/cli autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### 3. Core Web Vitals

Core Web Vitals are Google's metrics for measuring real-world user experience. They directly impact SEO rankings and user satisfaction.

**LCP (Largest Contentful Paint) — Loading performance:**

LCP measures how long it takes for the largest visible content element to render. Target: under 2.5 seconds.

Common causes of poor LCP:
- Slow server response (TTFB > 800ms)
- Render-blocking CSS and JavaScript
- Slow resource load times (large images, fonts)
- Client-side rendering delays

```typescript
// Measure LCP in your application
import { onLCP } from "web-vitals";

onLCP((metric) => {
  console.log("LCP:", metric.value, "ms");
  console.log("Element:", metric.entries[0]?.element);

  // Send to your analytics
  sendToAnalytics({
    name: "LCP",
    value: metric.value,
    id: metric.id,
    navigationType: metric.navigationType,
  });
});
```

**Fixing LCP issues:**

```typescript
// 1. Preload the LCP image
// In Next.js, use priority prop
import Image from "next/image";

export function HeroBanner() {
  return (
    <Image
      src="/hero.webp"
      alt="Hero banner"
      width={1200}
      height={600}
      priority // Adds <link rel="preload">
      sizes="100vw"
    />
  );
}

// 2. Avoid layout shifts that delay LCP
// Always set width and height on images
<Image
  src="/product.webp"
  alt="Product"
  width={400}
  height={300}
  style={{ width: "100%", height: "auto" }}
/>

// 3. Inline critical CSS
// next.config.mjs
const config = {
  experimental: {
    optimizeCss: true,
  },
};
```

**INP (Interaction to Next Paint) — Responsiveness:**

INP measures the latency of user interactions (clicks, taps, key presses). Target: under 200ms.

```typescript
import { onINP } from "web-vitals";

onINP((metric) => {
  console.log("INP:", metric.value, "ms");

  // The interaction that caused the worst INP
  const entry = metric.entries[0];
  console.log("Target:", entry?.target);
  console.log("Type:", entry?.name); // "click", "keydown", etc.
});
```

**CLS (Cumulative Layout Shift) — Visual stability:**

CLS measures unexpected layout shifts during the page lifecycle. Target: under 0.1.

```typescript
import { onCLS } from "web-vitals";

onCLS((metric) => {
  console.log("CLS:", metric.value);

  // Each layout shift that contributed
  metric.entries.forEach((entry) => {
    entry.sources?.forEach((source) => {
      console.log("Shifted element:", source.node);
      console.log("Previous rect:", source.previousRect);
      console.log("Current rect:", source.currentRect);
    });
  });
});
```

**Complete web-vitals setup:**

```typescript
// lib/vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";

function sendToAnalytics(metric: Metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // "good" | "needs-improvement" | "poor"
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
  };

  // Use sendBeacon for reliability on page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/vitals", JSON.stringify(body));
  } else {
    fetch("/api/vitals", {
      method: "POST",
      body: JSON.stringify(body),
      keepalive: true,
    });
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

### 4. Load Testing with k6

k6 is the modern standard for load testing. It uses JavaScript for test scripts, runs efficiently in Go, and produces detailed metrics.

**Installation:**

```bash
# macOS
brew install k6

# Or via Docker
docker run --rm -i grafana/k6 run - <script.js
```

**Basic load test:**

```javascript
// load-tests/api-load.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const apiDuration = new Trend("api_duration");

export const options = {
  // Stages define the load profile
  stages: [
    { duration: "1m", target: 10 },   // Ramp up to 10 users
    { duration: "3m", target: 10 },   // Stay at 10 users
    { duration: "1m", target: 50 },   // Ramp up to 50 users
    { duration: "3m", target: 50 },   // Stay at 50 users
    { duration: "1m", target: 0 },    // Ramp down to 0
  ],

  // Pass/fail thresholds
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95th < 500ms, 99th < 1s
    errors: ["rate<0.01"],                           // Error rate < 1%
    api_duration: ["p(95)<400"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // GET list of posts
  const listRes = http.get(`${BASE_URL}/api/posts?limit=20`);
  check(listRes, {
    "list status is 200": (r) => r.status === 200,
    "list has data": (r) => JSON.parse(r.body).data.length > 0,
  });
  apiDuration.add(listRes.timings.duration);
  errorRate.add(listRes.status !== 200);

  sleep(1); // Think time between requests

  // GET single post
  const detailRes = http.get(`${BASE_URL}/api/posts/1`);
  check(detailRes, {
    "detail status is 200": (r) => r.status === 200,
  });
  apiDuration.add(detailRes.timings.duration);
  errorRate.add(detailRes.status !== 200);

  sleep(1);
}
```

**Running k6:**

```bash
# Run load test
k6 run load-tests/api-load.js

# Run with environment variables
k6 run --env BASE_URL=https://staging.example.com load-tests/api-load.js

# Output results to JSON for analysis
k6 run --out json=results.json load-tests/api-load.js
```

**Stress test pattern:**

```javascript
// load-tests/stress.js
export const options = {
  stages: [
    { duration: "2m", target: 100 },   // Ramp to normal load
    { duration: "5m", target: 100 },   // Hold normal load
    { duration: "2m", target: 200 },   // Ramp to double
    { duration: "5m", target: 200 },   // Hold double
    { duration: "2m", target: 400 },   // Ramp to 4x
    { duration: "5m", target: 400 },   // Hold — does it break?
    { duration: "5m", target: 0 },     // Recovery — does it recover?
  ],
  thresholds: {
    http_req_duration: ["p(99)<2000"], // Allow higher latency under stress
    http_req_failed: ["rate<0.05"],    // Allow up to 5% failures
  },
};
```

**Spike test pattern:**

```javascript
// load-tests/spike.js
export const options = {
  stages: [
    { duration: "30s", target: 10 },    // Normal load
    { duration: "10s", target: 500 },   // Sudden spike
    { duration: "2m", target: 500 },    // Hold spike
    { duration: "10s", target: 10 },    // Drop back
    { duration: "1m", target: 10 },     // Recovery period
  ],
};
```

### 5. Load Testing with Artillery

Artillery is a Node.js-based load testing tool with YAML configuration and excellent plugin support.

```yaml
# load-tests/artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 20
      name: "Sustained load"
    - duration: 60
      arrivalRate: 50
      name: "Peak load"
  defaults:
    headers:
      Content-Type: "application/json"
  ensure:
    thresholds:
      - http.response_time.p95: 500
      - http.response_time.p99: 1000

scenarios:
  - name: "Browse and search"
    weight: 70
    flow:
      - get:
          url: "/api/posts?limit=20"
          capture:
            - json: "$.data[0].id"
              as: "postId"
      - think: 2
      - get:
          url: "/api/posts/{{ postId }}"
      - think: 1
      - get:
          url: "/api/search?q=react&limit=10"

  - name: "Create content"
    weight: 30
    flow:
      - post:
          url: "/api/posts"
          json:
            title: "Load test post {{ $randomString() }}"
            content: "This is a load test post"
          expect:
            - statusCode: 201
```

```bash
# Run Artillery test
npx artillery run load-tests/artillery.yml

# Generate HTML report
npx artillery run --output report.json load-tests/artillery.yml
npx artillery report report.json
```

### 6. React Profiling

React profiling identifies components that render too often or too slowly.

**React DevTools Profiler:**

The Profiler records each render, showing which components rendered, why they rendered, and how long they took.

Steps:
1. Open React DevTools in Chrome/Firefox
2. Go to the Profiler tab
3. Click "Record" and interact with your app
4. Stop recording and analyze the flamegraph

**Programmatic profiling in code:**

```typescript
import { Profiler, type ProfilerOnRenderCallback } from "react";

const onRender: ProfilerOnRenderCallback = (
  id,           // Component tree identifier
  phase,        // "mount" or "update"
  actualDuration,   // Time spent rendering
  baseDuration,     // Estimated time for full re-render
  startTime,
  commitTime
) => {
  if (actualDuration > 16) {
    // Longer than one frame (60fps)
    console.warn(
      `Slow render: ${id} took ${actualDuration.toFixed(1)}ms (${phase})`
    );
  }
};

export function App() {
  return (
    <Profiler id="App" onRender={onRender}>
      <Dashboard />
    </Profiler>
  );
}
```

**Identifying unnecessary re-renders:**

```typescript
// why-did-you-render setup (development only)
// src/wdyr.ts
import React from "react";

if (process.env.NODE_ENV === "development") {
  const whyDidYouRender = (await import("@welldone-software/why-did-you-render")).default;
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    logOnDifferentValues: true,
  });
}
```

**Common optimizations:**

```typescript
// 1. Memoize expensive computations
import { useMemo } from "react";

function ProductList({ products, filters }: Props) {
  const filteredProducts = useMemo(
    () => products.filter((p) => matchesFilters(p, filters)),
    [products, filters]
  );

  return filteredProducts.map((p) => <ProductCard key={p.id} product={p} />);
}

// 2. Memoize callback props to prevent child re-renders
import { useCallback } from "react";

function Parent() {
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
  }, []);

  return <ChildList onSelect={handleSelect} />;
}

// 3. Use React.memo for pure display components
const ProductCard = React.memo(function ProductCard({ product }: Props) {
  return (
    <div>
      <h3>{product.name}</h3>
      <p>{product.price}</p>
    </div>
  );
});
```

### 7. Bundle Analysis

Large JavaScript bundles slow down page loads. Analyze what is in your bundle and eliminate unnecessary code.

**Next.js bundle analyzer:**

```bash
npm install -D @next/bundle-analyzer
```

```javascript
// next.config.mjs
import withBundleAnalyzer from "@next/bundle-analyzer";

const config = {
  // ... your config
};

export default process.env.ANALYZE === "true"
  ? withBundleAnalyzer({ enabled: true })(config)
  : config;
```

```bash
# Generate bundle analysis
ANALYZE=true npm run build
```

**Common bundle size wins:**

```typescript
// 1. Dynamic imports for heavy components
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-only component
});

// 2. Import only what you need from large libraries
// Wrong: imports entire library
import { format } from "date-fns";

// Right: imports only the function
import format from "date-fns/format";

// 3. Replace heavy libraries with lighter alternatives
// Replace moment.js (300KB) with date-fns (tree-shakeable)
// Replace lodash (70KB) with individual lodash-es imports
// Replace axios (13KB) with native fetch

// 4. Check for duplicate dependencies
// package.json — ensure only one version of shared deps
```

### 8. Database Query Profiling

Slow database queries are the most common server-side performance bottleneck.

**PostgreSQL EXPLAIN ANALYZE:**

```sql
-- Show query execution plan with actual timing
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT p.*, u.name as author_name
FROM posts p
JOIN users u ON u.id = p.author_id
WHERE p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 20;

-- Key things to look for:
-- Seq Scan: table scan without index (slow for large tables)
-- Nested Loop: N+1 pattern (each row triggers another query)
-- Sort: in-memory sort (add index on sort column)
-- Rows estimated vs actual: large difference means stale statistics
```

**Prisma query logging:**

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "warn", emit: "stdout" },
    { level: "error", emit: "stdout" },
  ],
});

// Log slow queries in development
db.$on("query", (e) => {
  if (e.duration > 100) {
    // Queries taking > 100ms
    console.warn(`Slow query (${e.duration}ms):`, e.query);
    console.warn("Params:", e.params);
  }
});
```

**Detecting N+1 queries:**

```typescript
// Wrong: N+1 problem — 1 query for posts + N queries for authors
const posts = await db.post.findMany({ take: 20 });
for (const post of posts) {
  const author = await db.user.findUnique({ where: { id: post.authorId } });
  post.author = author;
}

// Fix: Include related data in a single query
const posts = await db.post.findMany({
  take: 20,
  include: { author: true },
});

// Or use a DataLoader for GraphQL resolvers
```

### 9. Memory Leak Detection

Memory leaks cause applications to slow down over time and eventually crash. They are especially common in long-running React applications.

**Common React memory leaks:**

```typescript
// 1. Missing cleanup in useEffect
// Wrong:
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  // No cleanup — interval runs after component unmounts
}, []);

// Fix:
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);

// 2. Unaborted fetch requests
// Wrong:
useEffect(() => {
  fetch("/api/data").then((r) => r.json()).then(setData);
}, []);

// Fix:
useEffect(() => {
  const controller = new AbortController();
  fetch("/api/data", { signal: controller.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => {
      if (e.name !== "AbortError") throw e;
    });
  return () => controller.abort();
}, []);

// 3. Event listeners not removed
// Wrong:
useEffect(() => {
  window.addEventListener("resize", handleResize);
}, []);

// Fix:
useEffect(() => {
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

// 4. Storing references to unmounted components
// Wrong:
const ref = useRef<HTMLDivElement>(null);
useEffect(() => {
  someGlobalCache.set("myElement", ref.current);
  // ref.current stored in global cache — never garbage collected
}, []);
```

**Chrome DevTools memory profiling:**

1. Open DevTools > Memory tab
2. Take a heap snapshot (baseline)
3. Perform the action suspected of leaking
4. Take another heap snapshot
5. Compare snapshots — look for growing object counts
6. Filter by "Objects allocated between snapshots"

**Programmatic leak detection in tests:**

```typescript
// Detect leaks in test environment
import { describe, it, expect } from "vitest";

describe("memory leaks", () => {
  it("component cleans up subscriptions on unmount", () => {
    const unsubscribe = vi.fn();
    vi.mock("@/lib/events", () => ({
      subscribe: vi.fn(() => unsubscribe),
    }));

    const { unmount } = render(<LiveFeed />);

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
```

### 10. Runtime Benchmarking

Micro-benchmarks measure the performance of individual functions. Use them to compare implementation approaches, not to predict real-world performance.

```typescript
// benchmarks/sort.bench.ts
import { bench, describe } from "vitest";

describe("sorting algorithms", () => {
  const data = Array.from({ length: 10000 }, () => Math.random());

  bench("Array.sort", () => {
    [...data].sort((a, b) => a - b);
  });

  bench("custom quicksort", () => {
    quickSort([...data]);
  });
});
```

```bash
# Run benchmarks with Vitest
vitest bench
```

**Pitfalls of micro-benchmarking:**
- JIT compilation can optimize away the code you're measuring
- Results vary with CPU load, thermal throttling, and garbage collection
- Micro-benchmarks do not account for cache effects, memory allocation, or I/O
- Always benchmark with realistic data sizes and shapes

### 11. Synthetic Monitoring

Synthetic monitoring runs automated checks against your production site on a schedule, alerting you to performance regressions before users notice.

```typescript
// Using Checkly (or similar) for synthetic monitoring
// checkly.config.ts
import { defineConfig } from "checkly";

export default defineConfig({
  projectName: "My App",
  checks: {
    frequency: 5, // Check every 5 minutes
    locations: ["us-east-1", "eu-west-1", "ap-southeast-1"],
    runtimeId: "2024.02",
    browserChecks: {
      testMatch: "**/__checks__/**/*.check.ts",
    },
  },
});

// __checks__/homepage.check.ts
import { test, expect } from "@playwright/test";

test("homepage loads within budget", async ({ page }) => {
  const startTime = Date.now();

  await page.goto("https://example.com");

  // Check LCP proxy
  await expect(page.locator("h1")).toBeVisible();

  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);

  // Check for critical elements
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});
```

### 12. Real User Monitoring (RUM)

RUM collects performance data from actual users in the field. Unlike synthetic monitoring (lab data), RUM shows what real users experience across different devices, networks, and geographies.

**Percentile analysis:**

| Percentile | What it tells you |
|------------|------------------|
| **p50** (median) | Typical experience — half of users are faster, half slower |
| **p75** | The "good" threshold — 75% of users have this experience or better |
| **p95** | Tail latency — 1 in 20 users has this bad an experience |
| **p99** | Worst case — important for SLA compliance |

Always optimize for p75 or higher. Mean/average is misleading because outliers skew it.

**Next.js + Vercel Analytics:**

```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Custom RUM with web-vitals:**

```typescript
// lib/rum.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";

interface VitalData {
  name: string;
  value: number;
  rating: string;
  delta: number;
  id: string;
  url: string;
  connection?: string;
  deviceMemory?: number;
  userAgent: string;
}

function collectVital(metric: Metric) {
  const data: VitalData = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  // Add connection info if available
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
    deviceMemory?: number;
  };
  if (nav.connection?.effectiveType) {
    data.connection = nav.connection.effectiveType;
  }
  if (nav.deviceMemory) {
    data.deviceMemory = nav.deviceMemory;
  }

  // Send to your analytics endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/vitals", JSON.stringify(data));
  }
}

export function initRUM() {
  onCLS(collectVital);
  onINP(collectVital);
  onLCP(collectVital);
  onFCP(collectVital);
  onTTFB(collectVital);
}
```

### 13. CI Pipeline Integration

Automate performance checks to catch regressions on every pull request.

**Complete performance CI pipeline:**

```yaml
# .github/workflows/performance.yml
name: Performance Checks
on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - name: Check bundle size
        run: |
          # Extract bundle size from Next.js build output
          size=$(find .next -name "*.js" -path "*/_next/static*" -exec wc -c {} + | tail -1 | awk '{print $1}')
          echo "Total JS bundle: ${size} bytes"
          # Fail if over 300KB
          if [ "$size" -gt 300000 ]; then
            echo "Bundle size exceeds budget (300KB)"
            exit 1
          fi

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse CI
        run: npx @lhci/cli autorun
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-report
          path: .lighthouseci/

  load-test:
    runs-on: ubuntu-latest
    if: github.event.pull_request.label == 'needs-load-test'
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: load-tests/smoke.js
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
```

---

## LLM Instructions

### Setting Up Performance Testing

When setting up performance testing for a project:

- Install Lighthouse CI: `npm install -D @lhci/cli`
- Create `lighthouserc.js` with assertions for Core Web Vitals and performance score
- Add `web-vitals` package for client-side RUM: `npm install web-vitals`
- Create a vitals reporting endpoint or use Vercel Analytics
- Set up bundle analysis with `@next/bundle-analyzer`
- Add performance budgets to CI pipeline

### Writing Load Tests

When generating k6 load test scripts:

- Define clear stages (ramp-up, sustained, ramp-down)
- Set thresholds for p95 and p99 response times
- Include checks for response status and body content
- Add think time (sleep) between requests to simulate real users
- Create separate scripts for smoke, load, stress, and spike tests
- Use environment variables for base URLs so tests work in any environment

### Optimizing React Performance

When asked to improve React rendering performance:

- Profile first — do not optimize without data
- Check for unnecessary re-renders with React DevTools Profiler
- Use `React.memo` only for components that re-render with the same props
- Use `useMemo` for expensive computations, not for simple values
- Use `useCallback` for callbacks passed to memoized children
- Split large components into smaller ones to reduce re-render scope
- Use dynamic imports for heavy components not needed on initial load

### Analyzing Bundle Size

When asked to reduce bundle size:

- Run `ANALYZE=true npm run build` to visualize the bundle
- Identify the largest dependencies and look for lighter alternatives
- Use dynamic imports for routes and heavy components
- Check for duplicate dependencies with `npm ls <package>`
- Ensure tree shaking works by using ES module imports
- Move large dependencies to server-only imports where possible

---

## Examples

### 1. Complete k6 Load Test for an API

```javascript
// load-tests/api-comprehensive.js
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("error_rate");
const apiLatency = new Trend("api_latency");
const requestCount = new Counter("request_count");

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 20 },
        { duration: "3m", target: 20 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    error_rate: ["rate<0.01"],
    api_latency: ["p(95)<400"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  group("browse posts", () => {
    const list = http.get(`${BASE}/api/posts?limit=20&status=published`);
    check(list, { "list 200": (r) => r.status === 200 });
    apiLatency.add(list.timings.duration);
    errorRate.add(list.status !== 200);
    requestCount.add(1);

    if (list.status === 200) {
      const posts = JSON.parse(list.body).data;
      if (posts.length > 0) {
        const post = posts[Math.floor(Math.random() * posts.length)];
        const detail = http.get(`${BASE}/api/posts/${post.id}`);
        check(detail, { "detail 200": (r) => r.status === 200 });
        apiLatency.add(detail.timings.duration);
        requestCount.add(1);
      }
    }
  });

  group("search", () => {
    const terms = ["react", "next", "testing", "api", "deploy"];
    const term = terms[Math.floor(Math.random() * terms.length)];
    const search = http.get(`${BASE}/api/search?q=${term}`);
    check(search, { "search 200": (r) => r.status === 200 });
    apiLatency.add(search.timings.duration);
    requestCount.add(1);
  });

  sleep(Math.random() * 3 + 1); // 1-4 second think time
}
```

### 2. Lighthouse CI with Budget Assertions

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start",
      startServerReadyPattern: "ready on",
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/docs",
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        "resource-summary:script:size": ["error", { maxNumericValue: 200000 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
```

---

## Common Mistakes

### 1. Testing Only Happy Path Performance

**Wrong:** Load testing with a single endpoint at low concurrency and declaring the system "fast."

**Fix:** Test realistic user flows with mixed read/write operations at expected concurrency. Include search, pagination, and authenticated endpoints. Test at peak expected traffic, not average.

### 2. No Performance Budgets

**Wrong:** Running Lighthouse occasionally and looking at scores without thresholds.

**Fix:** Set explicit budgets in `lighthouserc.js` and CI. Fail the build when budgets are exceeded. Budgets prevent gradual performance degradation that nobody notices.

### 3. Ignoring p95/p99 Latency

**Wrong:** Measuring only average response time.

```
Average: 150ms (looks fine)
p95: 2500ms (1 in 20 users waits 2.5 seconds)
p99: 8000ms (1 in 100 users waits 8 seconds)
```

**Fix:** Always measure and set thresholds on p95 and p99. The average hides the worst experiences. If you have 10,000 daily users, p99 = 100 users with a terrible experience every day.

### 4. Premature Optimization

**Wrong:** Adding `React.memo` to every component, `useMemo` to every value, and `useCallback` to every function before profiling.

**Fix:** Profile first, optimize second. Most components re-render fast enough. Memoization has its own cost (comparison overhead, memory). Only optimize components that the profiler shows are slow or re-rendering excessively.

### 5. Load Testing Against Production

**Wrong:** Running a load test against your production environment without warning.

**Fix:** Load test against a staging environment that mirrors production. If you must test production, schedule it during low-traffic windows, start with a smoke test, and have rollback procedures ready. Notify your team first.

### 6. Measuring Lab Data Only

**Wrong:** Only running Lighthouse in CI and assuming it represents real user experience.

**Fix:** Lab data (Lighthouse, CI checks) catches regressions. Field data (RUM, web-vitals) shows actual user experience. You need both. A page can score 100 in Lighthouse but be slow for users on 3G connections in distant regions.

### 7. Ignoring Bundle Size Until It Is Too Late

**Wrong:** Adding dependencies freely and only checking bundle size months later when the site is slow.

**Fix:** Add `@next/bundle-analyzer` from day one. Check bundle size on every PR. Set a budget (e.g., 200KB compressed JS). Question every new dependency: is there a lighter alternative? Can it be loaded dynamically?

### 8. Not Testing Under Realistic Network Conditions

**Wrong:** Testing performance only on a fast local network or wired connection.

**Fix:** Test with throttled network conditions. Chrome DevTools has presets for slow 3G and fast 3G. Lighthouse mobile preset includes CPU and network throttling. Your users are not all on gigabit fiber.

### 9. Missing Database Indexes

**Wrong:** Deploying without checking query performance.

```sql
-- This query scans the entire table
SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC;
-- Seq Scan on posts (cost=0.00..45232.10 rows=10000)
```

**Fix:** Run `EXPLAIN ANALYZE` on your most common queries. Add indexes for WHERE, ORDER BY, and JOIN columns. Monitor slow query logs. A missing index on a high-traffic query can bring down your entire application.

### 10. No Baseline Measurements

**Wrong:** Optimizing without knowing where you started. "I think it's faster now."

**Fix:** Measure before and after every optimization. Record LCP, INP, CLS, bundle size, and API latency as baselines. After each change, compare against the baseline to quantify the improvement. If you cannot measure it, you cannot improve it.

---

> **See also:** [Unit Testing](./unit-testing) | [E2E Testing](./e2e-testing) | [Test Strategy](./test-strategy) | [Frontend/Performance](../frontend/performance) | [Backend/Caching Strategies](../backend/caching-strategies) | [DevOps/Monitoring & Logging](../devops/monitoring-logging)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
