# Analytics & Monitoring
> Product analytics, error tracking, session replay, feature flags, and privacy-first web analytics — the complete toolkit for understanding what users do, why they churn, and where your code breaks in production.

---

## When to Use What

| Feature | PostHog | Plausible | Sentry | Mixpanel | LogSnag |
|---|---|---|---|---|---|
| **Free tier** | 1M events/mo, 5K sessions | Free self-host; cloud from $9/mo | 5K errors, 10K perf transactions | 20M events/mo | Free 1K events/mo |
| **Product analytics** | Full (funnels, retention, paths) | Basic (pageviews, referrers, goals) | No | Full (funnels, retention, flows) | No |
| **Error tracking** | No | No | Full (stack traces, breadcrumbs, source maps) | No | No |
| **Session replay** | Yes (included) | No | Yes (with errors linked) | No | No |
| **Feature flags** | Yes (built-in, multivariate) | No | No | No | No |
| **Privacy-focused** | Configurable (can self-host) | Yes (cookie-free, GDPR-compliant by default) | No (collects IP, device data) | No | N/A (server-side) |
| **Self-hostable** | Yes (Docker, k8s) | Yes (Docker) | Yes (complex) | No | No |
| **Real-time dev notifications** | No | No | Yes (error alerts) | No | Yes (primary purpose) |
| **Best for** | All-in-one product analytics + flags | Marketing sites, privacy-conscious products | Error tracking + performance in any app | Deep product analytics + user segmentation | Developer event feeds, internal dashboards |

### Decision Guide

**Pick PostHog** when you want one tool for analytics, session replay, feature flags, and A/B testing. It replaces Mixpanel + LaunchDarkly + Hotjar. Self-hostable for full data control. This is the recommended default for product teams.

**Pick Plausible** when you need lightweight, privacy-first website analytics that does not require a cookie banner. Ideal for marketing sites, landing pages, blogs, and any project where GDPR compliance is a hard requirement. Pair it with PostHog or Mixpanel inside your app.

**Pick Sentry** always. Regardless of your analytics choice, run Sentry for error tracking and performance monitoring. It catches runtime errors, unhandled rejections, slow API routes, and lets you replay user sessions that led to crashes. Non-negotiable for production apps.

**Pick Mixpanel** when you need best-in-class funnel analysis, cohort retention, and user segmentation without the overhead of feature flags or session replay. Mixpanel's query engine and visualization tools are more polished than PostHog's for complex product analytics.

**Pick LogSnag** when you want real-time visibility into server-side events without building a dashboard. It pushes events (user signups, payments, deployments, cron completions) to a feed with notifications. Think of it as a structured Slack webhook for product events.

### Recommended Stack

For most SaaS products, run this combination:

- **PostHog** — product analytics, feature flags, session replay, A/B testing
- **Sentry** — error tracking, performance monitoring, crash replay
- **LogSnag** — real-time developer event feed, server-side event notifications

For marketing-heavy products with strict privacy requirements:

- **Plausible** — website analytics (public-facing pages)
- **PostHog** or **Mixpanel** — product analytics (behind auth)
- **Sentry** — error tracking

---

## Principles

### 1. Instrument Analytics at the Provider Layer, Not Throughout Your App

Every analytics tool in this guide should sit behind an abstraction layer. Your application code calls `analytics.track("signup_completed", { plan: "pro" })` — it never calls `posthog.capture()` or `mixpanel.track()` directly. This principle is covered in depth in the Analytics Instrumentation guide, but the tools in this file are the providers that plug into that abstraction.

When setting up the tools below, treat each one as a provider adapter. Initialize it once, wrap its API in a consistent interface, and register it with your analytics client. This means you can swap PostHog for Mixpanel, add Plausible alongside PostHog, or remove a provider entirely — all without touching any component code.

Sentry is the exception. Sentry's error tracking hooks into the runtime (global error handlers, React error boundaries, unhandled promise rejections) and must be initialized at the framework level. You do not call Sentry manually in most cases — it captures errors automatically. But you should still configure Sentry in one place, not scatter `Sentry.captureException()` calls throughout your codebase.

### 2. Initialize Once, at the Root

Every tool in this guide requires initialization — an API key, configuration options, and often a provider wrapper component. Initialize each tool exactly once, as early as possible in the application lifecycle.

For Next.js App Router, this means:

- **Client-side tools** (PostHog, Plausible script, Mixpanel) are initialized in a client component rendered inside your root layout. Use a `Providers` wrapper component that handles all initialization.
- **Server-side tools** (PostHog Node, Sentry server, LogSnag) are initialized in a shared module (`src/lib/posthog-server.ts`, `src/lib/sentry.ts`, `src/lib/logsnag.ts`) that is imported wherever needed in Server Components, Server Actions, and Route Handlers.
- **Sentry** requires separate initialization for client, server, and edge runtimes via `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` at the project root.

Never initialize a tool inside a component that renders multiple times. Never initialize conditionally based on a prop or state value. Initialize once, at the root, unconditionally (gated only by environment checks like `process.env.NODE_ENV === "production"`).

### 3. Identify Users Consistently Across Tools

When a user logs in, you must call `identify()` on every analytics provider with the same user ID. This links anonymous pre-login behavior to the authenticated user. If PostHog knows the user as `user_123` but Mixpanel knows them as `usr-123`, you cannot cross-reference data between tools.

Use your database primary key as the canonical user ID everywhere. Do not use email addresses (they change), usernames (they change), or auto-generated provider IDs (they are provider-specific). Call identify immediately after authentication succeeds — in your login callback, OAuth redirect handler, or session creation logic.

User properties (name, email, plan, company) should be set at identify time and updated whenever they change. These properties power segmentation in every tool: "show me retention for users on the Pro plan" or "filter session replays to Enterprise customers."

### 4. Separate Development from Production

Never send development data to production analytics. Every event fired during local development, testing, or staging pollutes your production data and makes every metric unreliable. A single developer running `npm run dev` and clicking around can generate hundreds of events that skew your funnel analysis.

For every tool in this guide:

- Use separate project keys for development and production
- OR disable tracking entirely in non-production environments
- OR use a `development` flag that routes events to a separate project or suppresses them

The simplest approach: check `process.env.NODE_ENV` at initialization time and either skip initialization entirely in development or use a development-specific API key. PostHog, Mixpanel, and Sentry all support multiple projects — use them.

### 5. Respect User Privacy and Consent

Analytics tools collect user behavior data. Some (Plausible) are designed to be privacy-first and require no consent. Others (PostHog, Mixpanel, Sentry) set cookies and collect personally identifiable information, which requires explicit user consent under GDPR, CCPA, and similar regulations.

Your consent implementation should gate analytics initialization, not just event tracking. If the user has not consented to analytics cookies, do not initialize PostHog or Mixpanel at all — do not just suppress events. Uninitiated SDKs cannot set cookies or collect data. Sentry sits in a grey area: error tracking is arguably a "legitimate interest" under GDPR, but session replay captures user interactions and should be gated behind consent.

Plausible is the exception — it collects no personal data, sets no cookies, and does not require consent. This is its primary value proposition for public-facing pages.

### 6. Monitor Performance Impact

Analytics scripts add weight to your client bundle and fire network requests on every tracked event. A poorly configured analytics stack can add 200KB+ of JavaScript and hundreds of milliseconds to page load times.

Measure the impact:

- **PostHog** — `posthog-js` is ~45KB gzipped. Load it asynchronously. Enable autocapture selectively, not globally (autocapture generates a high volume of events and can cause performance issues on complex pages).
- **Plausible** — <1KB script. Negligible impact. This is its performance advantage.
- **Sentry** — `@sentry/nextjs` can add 30-60KB gzipped. Use tree shaking and lazy loading for the replay SDK. Set `tracesSampleRate` below 1.0 in production to reduce overhead.
- **Mixpanel** — `mixpanel-browser` is ~30KB gzipped. Comparable to PostHog without session replay.
- **LogSnag** — server-side only. Zero client impact.

If you are running PostHog + Sentry + Mixpanel on the client, you are adding 100KB+ of analytics JavaScript. Consolidate: PostHog can replace Mixpanel, and you rarely need both.

### 7. Use Server-Side Tracking for Critical Events

Ad blockers block client-side analytics scripts in 25-40% of browsers (higher for technical audiences). Every critical business event — signup, purchase, plan change, cancellation — should be tracked server-side to ensure accuracy.

PostHog and Mixpanel both offer Node.js SDKs for server-side tracking. LogSnag is server-side by design. Sentry's server-side SDK captures errors and performance data from your API routes and Server Actions.

The pattern: track UI interactions (button clicks, form starts, page views) on the client. Track business outcomes (signup completed, payment processed, feature activated) on the server. When both exist, use the server-side event as the source of truth for metrics.

---

## LLM Instructions

### PostHog

When setting up PostHog in a Next.js App Router project:

1. Install both the client and server SDKs: `posthog-js` for browser tracking and `posthog-node` for server-side tracking.
2. Create a `PostHogProvider` client component that initializes `posthog-js` with the project API key and instance URL. Wrap this around the app in the root layout. Use `usePathname()` and `useSearchParams()` to track page views on route changes.
3. Create a server-side PostHog client module that instantiates `PostHog` from `posthog-node`. This is used in Server Components, Server Actions, Route Handlers, and middleware.
4. Call `posthog.identify()` on the client after login with the user's database ID and properties (name, email, plan).
5. Track custom events with `posthog.capture("event_name", { properties })` on the client and `serverPosthog.capture({ distinctId, event, properties })` on the server. Always call `serverPosthog.shutdown()` or `serverPosthog.flush()` in short-lived contexts (Route Handlers, Server Actions) to ensure events are sent before the function exits.
6. Use `posthog.isFeatureEnabled("flag-name")` for client-side feature flags. For server-side flags, use `await serverPosthog.isFeatureEnabled("flag-name", distinctId)`.
7. Enable session replay by setting `session_recording: { recordCrossOriginIframes: true }` in the PostHog init config if needed. Session replay is opt-in per project in PostHog settings.
8. Do not enable autocapture unless specifically requested. It generates excessive events and often captures sensitive form data. Use explicit `capture()` calls for meaningful events.

### Plausible

When setting up Plausible in a Next.js project:

1. Add the Plausible script tag to the root layout `<head>` using Next.js `<Script>` component with `strategy="afterInteractive"`. The script source is `https://plausible.io/js/script.js` for cloud or your self-hosted URL.
2. For custom event tracking, use the `plausible()` function that becomes available globally after the script loads. Call `window.plausible("event_name", { props: { key: "value" } })`.
3. To bypass ad blockers, set up a proxy route in Next.js that forwards requests to Plausible's API. Create a Route Handler at `/api/proxy/plausible/[...path]/route.ts` that proxies to `plausible.io`. Update the script `src` to point to your proxy.
4. Configure goals in the Plausible dashboard to track conversions. Goals match on the custom event names you send via `window.plausible()`.
5. Plausible does not require a cookie banner. Do not wrap it in consent logic — this defeats its purpose. It is privacy-compliant by design.
6. For TypeScript projects, declare the `plausible` function on the `Window` interface to avoid type errors.

### Sentry

When setting up Sentry in a Next.js App Router project:

1. Run `npx @sentry/wizard@latest -i nextjs` to scaffold the configuration. This creates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and updates `next.config.ts` with the Sentry webpack plugin for source maps.
2. Configure `Sentry.init()` in each config file with the DSN, environment, traces sample rate (start with `0.1` in production, `1.0` in development), and replay sample rate.
3. Wrap the root layout with Sentry's error boundary to catch React rendering errors. Use `Sentry.ErrorBoundary` or the `withSentryConfig` wrapper in `next.config.ts`.
4. For Server Actions and Route Handlers, use `Sentry.withServerActionInstrumentation()` and `Sentry.wrapApiHandlerWithSentry()` to capture errors and performance data.
5. Enable source maps upload in `next.config.ts` via the Sentry webpack plugin so that production stack traces show original TypeScript code, not minified bundles. Set `hideSourceMaps: true` to upload maps without exposing them publicly.
6. Use `Sentry.captureException(error)` for manually caught errors that you handle gracefully but still want to track. Use `Sentry.captureMessage("description")` for non-error events that warrant attention.
7. Set `Sentry.setUser({ id, email })` after authentication to link errors to specific users.
8. Configure session replay with `replaysSessionSampleRate: 0.1` (10% of normal sessions) and `replaysOnErrorSampleRate: 1.0` (100% of sessions with errors). This keeps costs manageable while ensuring you always have replay for error sessions.
9. Do not set `tracesSampleRate: 1.0` in production. This sends a performance transaction for every request and will exhaust your quota. Use `0.1` to `0.3` and increase only if needed.

### Mixpanel

When setting up Mixpanel in a Next.js App Router project:

1. Install `mixpanel-browser` for client-side tracking. Optionally install `mixpanel` (the Node.js SDK) for server-side tracking.
2. Initialize Mixpanel in a client component with `mixpanel.init("PROJECT_TOKEN", { track_pageview: true, persistence: "localStorage" })`. Set `persistence: "localStorage"` to avoid cookie-related consent issues, or `persistence: "cookie"` if you need cross-subdomain tracking.
3. Call `mixpanel.identify("user_id")` after login. Call `mixpanel.people.set({ $name, $email, plan, company })` to set user profile properties.
4. Track events with `mixpanel.track("event_name", { property: "value" })`. Follow the `object_action` naming convention from your event taxonomy.
5. Use `mixpanel.reset()` on logout to clear the user identity and start a new anonymous session.
6. For group analytics (B2B products), call `mixpanel.set_group("company", "company_id")` to associate users with groups. This enables company-level analytics.
7. For server-side tracking, create a Mixpanel instance with `Mixpanel.init("PROJECT_TOKEN")` and call `mixpanel.track("event", { distinct_id: "user_id", ...properties })`.

### LogSnag

When setting up LogSnag in a Next.js project:

1. Install `logsnag` and create a server-side client module. LogSnag is API-based and runs only on the server — there is no client-side SDK.
2. Initialize with `new LogSnag({ token: process.env.LOGSNAG_TOKEN!, project: "your-project" })`.
3. Publish events with `logsnag.publish({ channel: "payments", event: "Payment Received", description: "$49 from user@example.com", icon: "💰", tags: { plan: "pro", amount: 49 }, notify: true })`.
4. Use channels to organize events: `signups`, `payments`, `errors`, `deployments`, `cron-jobs`. Create channels in the LogSnag dashboard first.
5. Track numerical insights with `logsnag.insight({ title: "MRR", value: 12500, icon: "💵" })` to maintain real-time KPI displays.
6. Set `notify: true` on events that require immediate attention (failed payments, new enterprise signups, error spikes). Leave it `false` for routine events.
7. LogSnag is for developer visibility, not product analytics. Do not try to build funnels or retention analysis with it. Use it as a real-time feed of important server-side events.

---

## Examples

### PostHog: Complete Next.js App Router Setup

**Install dependencies:**

```bash
npm install posthog-js posthog-node
```

**Environment variables (`.env.local`):**

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**PostHog client initialization (`src/lib/posthog.ts`):**

```typescript
import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    person_profiles: "identified_only",
    capture_pageview: false, // we manually capture pageviews on route change
    capture_pageleave: true,
    autocapture: false, // explicit tracking only — avoids noise and sensitive data capture
    session_recording: {
      maskAllInputs: true, // mask form inputs by default for privacy
      maskTextSelector: "[data-sensitive]", // mask elements with data-sensitive attribute
    },
  });
}
```

**PostHog Provider component (`src/components/providers/posthog-provider.tsx`):**

```typescript
"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { initPostHog } from "@/lib/posthog";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    let url = window.origin + pathname;
    const search = searchParams.toString();
    if (search) {
      url += `?${search}`;
    }

    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
```

**Server-side PostHog client (`src/lib/posthog-server.ts`):**

```typescript
import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getServerPostHog(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      flushAt: 1, // flush immediately in serverless environments
      flushInterval: 0,
    });
  }
  return posthogClient;
}
```

**Identify users and track events (`src/lib/analytics/posthog-helpers.ts`):**

```typescript
import posthog from "posthog-js";

// Call after login — links anonymous session to authenticated user
export function identifyUser(user: { id: string; name: string; email: string; plan: string; createdAt: string }) {
  posthog.identify(user.id, {
    name: user.name, email: user.email, plan: user.plan, created_at: user.createdAt,
  });
}

// Call on logout
export function resetUser() { posthog.reset(); }

// Client-side event tracking
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

// usage:
// trackEvent("project_created", { template: "blank", source: "dashboard" });
// trackEvent("plan_upgraded", { from: "free", to: "pro", trigger: "paywall" });
```

**Server-side tracking in a Server Action:**

```typescript
"use server";

import { getServerPostHog } from "@/lib/posthog-server";
import { auth } from "@/lib/auth";

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;

  // ... create project in database ...

  const posthog = getServerPostHog();
  posthog.capture({
    distinctId: session.user.id,
    event: "project_created",
    properties: {
      project_name: name,
      source: "server_action",
    },
  });
  await posthog.flush(); // critical: flush before serverless function exits
}
```

**Feature flags:**

```typescript
"use client";

import { useFeatureFlagEnabled, useFeatureFlagPayload } from "posthog-js/react";

export function PricingPage() {
  const isNewPricingEnabled = useFeatureFlagEnabled("new-pricing-page");
  const pricingConfig = useFeatureFlagPayload("new-pricing-page") as {
    showAnnualToggle: boolean;
    highlightPlan: string;
  } | undefined;

  if (isNewPricingEnabled) {
    return (
      <NewPricingPage
        showAnnualToggle={pricingConfig?.showAnnualToggle ?? true}
        highlightPlan={pricingConfig?.highlightPlan ?? "pro"}
      />
    );
  }

  return <LegacyPricingPage />;
}
```

**Server-side feature flags:**

```typescript
import { getServerPostHog } from "@/lib/posthog-server";

export async function getFeatureFlag(
  flagName: string,
  userId: string
): Promise<boolean> {
  const posthog = getServerPostHog();
  const isEnabled = await posthog.isFeatureEnabled(flagName, userId);
  return isEnabled ?? false;
}

// usage in a Server Component
export default async function DashboardPage() {
  const session = await auth();
  const showBetaFeature = await getFeatureFlag("beta-dashboard", session.user.id);

  return (
    <Dashboard>
      {showBetaFeature && <BetaWidget />}
    </Dashboard>
  );
}
```

### Plausible: Next.js Setup with Proxy

**Script tag in root layout (`src/app/layout.tsx`):**

```typescript
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          defer
          data-domain="yourdomain.com"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
        {/* Or use your proxy to bypass ad blockers: */}
        {/* src="/proxy/js/script.js" */}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**TypeScript type declaration (`src/types/plausible.d.ts`):**

```typescript
interface Window {
  plausible: (event: string, options?: { props?: Record<string, string | number | boolean>; revenue?: { currency: string; amount: number } }) => void;
}
```

**Custom event tracking helper (`src/lib/plausible.ts`):**

```typescript
export function trackPlausibleEvent(
  event: string,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;
  if (!window.plausible) return;

  window.plausible(event, { props });
}

// usage:
// trackPlausibleEvent("Signup", { plan: "pro", source: "landing-page" });
// trackPlausibleEvent("Download", { file: "whitepaper.pdf" });
// trackPlausibleEvent("Purchase", { plan: "enterprise" });
```

For revenue tracking, add the `revenue` field: `window.plausible("Purchase", { revenue: { currency: "USD", amount: 49 }, props: { plan: "pro" } })`.

**Ad blocker proxy via Next.js Route Handler (`src/app/api/proxy/plausible/[...path]/route.ts`):**

```typescript
import { NextRequest, NextResponse } from "next/server";

const PLAUSIBLE_HOST = "https://plausible.io";

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>, method: "GET" | "POST") {
  const { path } = await params;
  const targetUrl = `${PLAUSIBLE_HOST}/${path.join("/")}`;
  const body = method === "POST" ? await request.text() : undefined;

  const response = await fetch(targetUrl, {
    method,
    headers: {
      ...(method === "POST" && { "Content-Type": "application/json" }),
      "User-Agent": request.headers.get("user-agent") ?? "",
      "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? request.ip ?? "",
    },
    body,
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/plain",
      ...(method === "GET" && { "Cache-Control": "public, max-age=86400" }),
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, "GET");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, "POST");
}
```

**Updated script tag using proxy:**

```typescript
<Script
  defer
  data-domain="yourdomain.com"
  data-api="/api/proxy/plausible/api/event"
  src="/api/proxy/plausible/js/script.js"
  strategy="afterInteractive"
/>
```

### Sentry: Complete Next.js App Router Setup

**Install and scaffold:**

```bash
npx @sentry/wizard@latest -i nextjs
```

This creates the following files automatically. Customize them as shown below.

**Client configuration (`sentry.client.config.ts`):**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session replay
  replaysSessionSampleRate: 0.1, // 10% of normal sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false, // set to true for stricter privacy
      maskAllInputs: true,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out noise
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /Loading chunk \d+ failed/,
    /ChunkLoadError/,
  ],

  beforeSend(event) {
    // Strip PII from error events if needed
    if (event.user) {
      delete event.user.ip_address;
    }
    return event;
  },
});
```

**Server configuration (`sentry.server.config.ts`):**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Capture unhandled exceptions in Server Components and Route Handlers
  integrations: [
    Sentry.prismaIntegration(), // if using Prisma — auto-instruments DB queries
  ],
});
```

**Edge configuration (`sentry.edge.config.ts`):**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});
```

**Next.js config with Sentry (`next.config.ts`):**

```typescript
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // your existing Next.js config
};

export default withSentryConfig(nextConfig, {
  // Upload source maps for readable stack traces
  org: "your-sentry-org",
  project: "your-sentry-project",
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps but do not expose them publicly
  hideSourceMaps: true,

  // Silence source map upload logs in CI
  silent: !process.env.CI,

  // Automatically instrument Server Components, Route Handlers, and middleware
  automaticVercelMonitors: true,

  // Tunnel Sentry events through your domain to bypass ad blockers
  tunnelRoute: "/monitoring",

  // Disable Sentry's telemetry during builds
  telemetry: false,
});
```

**Global error handler (`src/app/global-error.tsx`):**

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <p>Our team has been notified. Please try again.</p>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
```

Route-level error boundaries (`src/app/dashboard/error.tsx`, etc.) follow the same pattern as `global-error.tsx` — call `Sentry.captureException(error)` in a `useEffect` and render a retry UI. Add `tags` to distinguish sections: `Sentry.captureException(error, { tags: { section: "dashboard" } })`.

**Instrument Server Actions:**

```typescript
"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  return await Sentry.withServerActionInstrumentation(
    "updateProfile",
    {
      recordResponse: true,
    },
    async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");

      const name = formData.get("name") as string;

      // ... update profile in database ...

      return { success: true };
    }
  );
}
```

**Set user context after auth (`src/components/providers/sentry-user-sync.tsx`):**

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function SentryUserSync() {
  const { data: session } = useSession();
  useEffect(() => {
    if (session?.user) Sentry.setUser({ id: session.user.id, email: session.user.email ?? undefined });
    else Sentry.setUser(null);
  }, [session]);
  return null;
}
```

### Mixpanel: Next.js App Router Setup

**Install:**

```bash
npm install mixpanel-browser
# Optional server-side:
npm install mixpanel
```

**Client initialization (`src/lib/mixpanel.ts`):**

```typescript
import mixpanel from "mixpanel-browser";

let initialized = false;

export function initMixpanel() {
  if (typeof window === "undefined") return;
  if (initialized) return;

  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!, {
    track_pageview: "url-with-path", // auto-track pageviews
    persistence: "localStorage", // avoid cookie consent issues
    ignore_dnt: false, // respect Do Not Track
    batch_requests: true, // batch events for performance
    api_host: "https://api-eu.mixpanel.com", // EU data residency (use api.mixpanel.com for US)
  });

  initialized = true;
}

export { mixpanel };
```

**Mixpanel Provider (`src/components/providers/mixpanel-provider.tsx`):**

```typescript
"use client";

import { useEffect } from "react";
import { initMixpanel } from "@/lib/mixpanel";

export function MixpanelProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      initMixpanel();
    }
  }, []);

  return <>{children}</>;
}
```

**Identify users and group analytics:**

```typescript
import mixpanel from "mixpanel-browser";

export function identifyMixpanelUser(user: { id: string; name: string; email: string; plan: string; createdAt: string; companyId?: string; companyName?: string }) {
  mixpanel.identify(user.id);
  mixpanel.people.set({ $name: user.name, $email: user.email, plan: user.plan, $created: user.createdAt });

  // Group analytics for B2B products
  if (user.companyId) {
    mixpanel.set_group("company", user.companyId);
    mixpanel.get_group("company", user.companyId).set({ $name: user.companyName, plan: user.plan });
  }
}

export function resetMixpanelUser() { mixpanel.reset(); }
```

**Track events:**

```typescript
import mixpanel from "mixpanel-browser";

export function trackMixpanelEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  mixpanel.track(event, properties);
}

// usage:
// trackMixpanelEvent("project_created", { template: "blank", source: "dashboard" });
// trackMixpanelEvent("feature_used", { feature: "export", format: "csv" });

// Track timed events (measures duration between start and completion)
export function startTimedEvent(event: string) {
  mixpanel.time_event(event);
}

// usage:
// startTimedEvent("onboarding_flow"); // call when user starts onboarding
// trackMixpanelEvent("onboarding_flow", { completed: true }); // call when finished — duration is auto-calculated
```

**Server-side tracking (`src/lib/mixpanel-server.ts`):**

```typescript
import Mixpanel from "mixpanel";

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN!, {
  host: "api-eu.mixpanel.com", // EU data residency (use api.mixpanel.com for US)
});

export function trackServerEvent(distinctId: string, event: string, properties?: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    mixpanel.track(event, { distinct_id: distinctId, ...properties }, (err) => (err ? reject(err) : resolve()));
  });
}

export function setServerUserProfile(distinctId: string, properties: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    mixpanel.people.set(distinctId, properties, (err) => (err ? reject(err) : resolve()));
  });
}
```

### LogSnag: Server-Side Event Tracking

**Install:**

```bash
npm install logsnag
```

**LogSnag client (`src/lib/logsnag.ts`):**

```typescript
import { LogSnag } from "logsnag";

let logsnagClient: LogSnag | null = null;

export function getLogSnag(): LogSnag {
  if (!logsnagClient) {
    logsnagClient = new LogSnag({
      token: process.env.LOGSNAG_TOKEN!,
      project: process.env.LOGSNAG_PROJECT!, // e.g., "my-saas"
    });
  }
  return logsnagClient;
}
```

**Publish events from Server Actions and Route Handlers (`src/lib/logsnag-events.ts`):**

```typescript
import { getLogSnag } from "@/lib/logsnag";

// Signup notification
export async function trackSignup(user: { id: string; email: string; plan: string }) {
  await getLogSnag().publish({
    channel: "signups",
    event: "New Signup",
    description: `${user.email} signed up for ${user.plan} plan`,
    icon: "🎉",
    tags: { plan: user.plan, "user-id": user.id },
    notify: true,
  });
}

// Payment notification
export async function trackPayment(payment: { userId: string; amount: number; plan: string; email: string }) {
  await getLogSnag().publish({
    channel: "payments",
    event: "Payment Received",
    description: `$${payment.amount} from ${payment.email} — ${payment.plan} plan`,
    icon: "💰",
    tags: { plan: payment.plan, amount: String(payment.amount) },
    notify: true,
  });
}

// Deployment notification (notify only for production)
export async function trackDeployment(deployment: { version: string; environment: string; deployedBy: string }) {
  await getLogSnag().publish({
    channel: "deployments",
    event: "Deployment Complete",
    description: `v${deployment.version} deployed to ${deployment.environment} by ${deployment.deployedBy}`,
    icon: "🚀",
    tags: { version: deployment.version, environment: deployment.environment },
    notify: deployment.environment === "production",
  });
}

// Failed cron job alert
export async function trackCronFailure(job: { name: string; error: string }) {
  await getLogSnag().publish({
    channel: "cron-jobs",
    event: "Cron Job Failed",
    description: `${job.name} failed: ${job.error}`,
    icon: "❌",
    tags: { job: job.name },
    notify: true,
  });
}
```

**Track real-time KPI insights:**

```typescript
import { getLogSnag } from "@/lib/logsnag";

export async function updateInsights(metrics: { mrr?: number; totalUsers?: number; activeTrials?: number }) {
  const logsnag = getLogSnag();
  const updates: Promise<void>[] = [];

  if (metrics.mrr !== undefined) updates.push(logsnag.insight({ title: "MRR", value: `$${metrics.mrr.toLocaleString()}`, icon: "💵" }));
  if (metrics.totalUsers !== undefined) updates.push(logsnag.insight({ title: "Total Users", value: metrics.totalUsers, icon: "👥" }));
  if (metrics.activeTrials !== undefined) updates.push(logsnag.insight({ title: "Active Trials", value: metrics.activeTrials, icon: "⏳" }));

  await Promise.all(updates);
}
// Call from a daily cron job: await updateInsights({ mrr: 12500, totalUsers: 842, activeTrials: 23 });
```

### Combining All Providers: Root Layout

**Root layout with all providers (`src/app/layout.tsx`):**

```typescript
import type { Metadata } from "next";
import Script from "next/script";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { MixpanelProvider } from "@/components/providers/mixpanel-provider";
import { SentryUserSync } from "@/components/providers/sentry-user-sync";

export const metadata: Metadata = {
  title: "Your App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Plausible — lightweight, cookie-free, no consent needed */}
        <Script
          defer
          data-domain="yourdomain.com"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </head>
      <body>
        {/* PostHog — product analytics, feature flags, session replay */}
        <PostHogProvider>
          {/* Mixpanel — only if you need it alongside PostHog */}
          <MixpanelProvider>
            {/* Sentry user context sync */}
            <SentryUserSync />
            {children}
          </MixpanelProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
```

### Unified Analytics Wrapper (Provider-Agnostic)

**Data layer that dispatches to all providers (`src/lib/analytics/index.ts`):**

```typescript
import posthog from "posthog-js";
import mixpanel from "mixpanel-browser";
import * as Sentry from "@sentry/nextjs";

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

type UserIdentity = {
  id: string;
  name: string;
  email: string;
  plan: string;
  [key: string]: unknown;
};

class Analytics {
  private enabled = false;

  init() {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    this.enabled = true;
  }

  track({ name, properties }: AnalyticsEvent) {
    if (!this.enabled) return;

    // PostHog
    posthog.capture(name, properties);

    // Mixpanel (if using both — usually pick one)
    // mixpanel.track(name, properties as Record<string, unknown>);

    // Plausible (for key conversion events only)
    if (window.plausible) {
      window.plausible(name, {
        props: properties as Record<string, string | number | boolean>,
      });
    }
  }

  identify(user: UserIdentity) {
    if (!this.enabled) return;

    // PostHog
    posthog.identify(user.id, {
      name: user.name,
      email: user.email,
      plan: user.plan,
    });

    // Mixpanel
    // mixpanel.identify(user.id);
    // mixpanel.people.set({ $name: user.name, $email: user.email, plan: user.plan });

    // Sentry
    Sentry.setUser({ id: user.id, email: user.email });
  }

  reset() {
    if (!this.enabled) return;

    posthog.reset();
    // mixpanel.reset();
    Sentry.setUser(null);
  }
}

export const analytics = new Analytics();
```

---

## Common Mistakes

### 1. Initializing Analytics in Multiple Places

**Wrong:**

```typescript
// page-a.tsx
posthog.init("phc_key", { api_host: "https://us.i.posthog.com" });

// page-b.tsx
posthog.init("phc_key", { api_host: "https://us.i.posthog.com" });
```

**Fix:** Initialize once in a `PostHogProvider` component rendered in the root layout. Every other file imports the already-initialized `posthog` instance.

### 2. Forgetting to Flush Server-Side Events

**Wrong:** Calling `posthog.capture()` in a Route Handler or Server Action without `await posthog.flush()`. The function exits before the event is sent — it is silently lost.

**Fix:** Always `await posthog.flush()` before returning in serverless environments. PostHog Node batches events asynchronously — in long-running servers this is fine, but serverless functions terminate immediately after the response.

```typescript
const posthog = getServerPostHog();
posthog.capture({ distinctId: "user-1", event: "api_called" });
await posthog.flush(); // without this, the event is lost in serverless
return NextResponse.json({ ok: true });
```

### 3. Setting Sentry tracesSampleRate to 1.0 in Production

**Wrong:** `Sentry.init({ tracesSampleRate: 1.0 })` — sends a performance transaction for every single request.

**Fix:** Use `0.1` to `0.3` in production. A rate of `1.0` with 100K requests/day means 100K transactions — you will exhaust your Sentry quota in hours. Use `tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0`.

### 4. Enabling PostHog Autocapture Without Filtering

**Wrong:** `posthog.init("phc_key", { autocapture: true })` — captures every click, input change, and form submission.

**Fix:** Set `autocapture: false` and use explicit `posthog.capture()` calls. Autocapture generates thousands of noisy events, makes dashboards unusable, and can capture sensitive form data (passwords, credit card fields). Track only meaningful events explicitly.

### 5. Sending Development Events to Production Analytics

**Wrong:**

```typescript
// No environment check — every npm run dev fires real events
export function MixpanelProvider({ children }) {
  useEffect(() => {
    initMixpanel();
  }, []);
  return <>{children}</>;
}
```

**Fix:** Gate initialization on the environment. Use separate project tokens for development and production, or skip initialization entirely in development.

```typescript
export function MixpanelProvider({ children }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      initMixpanel();
    }
  }, []);
  return <>{children}</>;
}
```

### 6. Using LogSnag for Product Analytics

**Wrong:**

```typescript
// Trying to build funnels with LogSnag
await logsnag.publish({ channel: "analytics", event: "Page Viewed", ... });
await logsnag.publish({ channel: "analytics", event: "Button Clicked", ... });
await logsnag.publish({ channel: "analytics", event: "Form Started", ... });
```

**Fix:** LogSnag is an event feed for developers, not an analytics platform. It has no funnel analysis, no retention charts, no cohort queries. Use it for high-signal server-side events: signups, payments, errors, deployments. Use PostHog or Mixpanel for product analytics.

```typescript
// LogSnag: high-signal events only
await logsnag.publish({ channel: "signups", event: "New Signup", notify: true, ... });
await logsnag.publish({ channel: "payments", event: "Payment Failed", notify: true, ... });
```

### 7. Not Setting User Context in Sentry

**Wrong:**

```typescript
// Errors show up as anonymous — you cannot tell which user was affected
Sentry.init({ dsn: "..." });
// never calls Sentry.setUser()
```

**Fix:** Call `Sentry.setUser()` after authentication. This links every error, performance transaction, and session replay to a specific user. When a customer reports a bug, you can search Sentry by their user ID to find the exact error and replay.

```typescript
// After login:
Sentry.setUser({ id: user.id, email: user.email });

// After logout:
Sentry.setUser(null);
```

### 8. Wrapping Plausible in Consent Management

**Wrong:**

```typescript
// Pointless — Plausible does not use cookies or collect PII
{hasConsented && (
  <Script data-domain="yourdomain.com" src="https://plausible.io/js/script.js" />
)}
```

**Fix:** Plausible is specifically designed to be privacy-compliant without consent. It does not set cookies, does not collect personal data, and does not track users across sessions. Loading it behind a consent banner defeats its entire value proposition. Load it unconditionally.

```typescript
<Script
  defer
  data-domain="yourdomain.com"
  src="https://plausible.io/js/script.js"
  strategy="afterInteractive"
/>
```

### 9. Duplicating Event Names Across Providers

**Wrong:**

```typescript
posthog.capture("User Signed Up", { plan: "pro" });
mixpanel.track("signup_completed", { plan_type: "pro" });
// same event, different names and property keys — impossible to reconcile data
```

**Fix:** Use a single event taxonomy with consistent names and properties across all providers. The data layer pattern (see the Unified Analytics Wrapper example above) enforces this by dispatching the same event name and properties to every provider.

```typescript
analytics.track({
  name: "signup_completed",
  properties: { plan: "pro" },
});
// dispatches "signup_completed" with { plan: "pro" } to PostHog, Mixpanel, Plausible
```

### 10. Not Configuring Sentry Source Maps

**Wrong:** Shipping to production without `withSentryConfig` in `next.config.ts`. Production errors show minified stack traces like `a.js:1:4523` — completely useless for debugging.

**Fix:** Wrap your config with `withSentryConfig(nextConfig, { org, project, authToken: process.env.SENTRY_AUTH_TOKEN, hideSourceMaps: true })`. This uploads source maps during build so errors show original TypeScript file names and line numbers, without exposing maps publicly. See the full Sentry example above.

---

> **See also:** [Product-Growth/Analytics-Instrumentation](../../Product-Growth/Analytics-Instrumentation/analytics-instrumentation.md) for provider-agnostic data layer patterns, event taxonomy design, UTM/attribution capture, consent management, and funnel/cohort SQL queries | [DevOps/Monitoring-Logging](../../DevOps/Monitoring-Logging/monitoring-logging.md) for infrastructure observability, structured logging, alerting, and SLOs | [Frontend/Performance](../../Frontend/Performance/performance.md) for measuring analytics script impact on Core Web Vitals
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
