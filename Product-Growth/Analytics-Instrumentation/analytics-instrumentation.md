# Analytics & Instrumentation
> Event tracking architecture, data layer patterns, provider-agnostic analytics wrappers, UTM/attribution capture, funnel and cohort SQL queries, product metrics dashboards, and privacy/consent implementation. Measurement is the foundation of growth — you cannot optimize what you do not track.

---

## Principles

### 1. Track Events, Not Pageviews

Pageview-based analytics tells you which pages people visited. Event-based analytics tells you what people did. In a product context, user behavior is what matters — did they click "Start Trial," complete onboarding, invite a teammate, or upgrade to a paid plan? Pageviews are a proxy metric from the Web 1.0 era when navigation was the only interaction. Modern products are interactive applications where the most important actions (expanding a dropdown, toggling a setting, completing a multi-step form) may never trigger a page navigation.

Event-based analytics captures discrete user actions with structured metadata. An event has a name (what happened), properties (context about what happened), and a timestamp. The event name should follow a consistent naming convention — `object_action` (noun_verb) is the most common and most greppable pattern: `signup_started`, `signup_completed`, `plan_upgraded`, `invite_sent`, `feature_used`. This convention reads naturally, sorts alphabetically by object, and makes it trivial to find all events related to a specific object.

Properties provide the context that makes events useful. A `plan_upgraded` event is marginally useful. A `plan_upgraded` event with properties `{ from: "free", to: "pro", trial_days_remaining: 3, trigger: "paywall_modal" }` tells you exactly what happened, from where, and why. Include enough properties to answer the follow-up questions you will inevitably ask. But do not track everything — every event has a storage cost, a processing cost, and a cognitive cost when querying. Track the events that inform decisions.

The distinction between product analytics (what users do inside the product) and marketing analytics (how users arrive at the product) is crucial. Product analytics tools (PostHog, Mixpanel, Amplitude) excel at event-based analysis: funnels, cohorts, retention curves, user journeys. Marketing analytics tools (Google Analytics, attribution platforms) excel at traffic-source analysis: channels, campaigns, landing pages, conversion attribution. Most products need both, and the data layer pattern (Principle 3) makes it possible to send events to both without coupling your application code to either.

### 2. Define Your Metrics Before Writing Code

Every product needs a metrics framework — a hierarchy of numbers that tells you whether the product is healthy, growing, or dying. The most widely adopted framework is the pirate metrics model (AARRR): Acquisition (how do users find you?), Activation (do they have a good first experience?), Retention (do they come back?), Revenue (do they pay?), Referral (do they tell others?). Each stage has a primary metric and supporting metrics.

The North Star Metric is the single number that best captures the core value your product delivers to users. For Slack, it is messages sent. For Airbnb, it is nights booked. For a project management tool, it might be tasks completed. The North Star is not revenue — revenue is a lagging indicator of value delivered. The North Star is the leading indicator: if users are getting value, revenue follows.

Input metrics are the levers that drive the North Star. If your North Star is "weekly active projects," your input metrics might be: new signups per week, activation rate (% of signups who create a project), and weekly retention rate (% of users who return). These input metrics are actionable — you can run experiments to improve each one. The North Star is the outcome; input metrics are the dials.

Define your metrics before instrumenting your code because the metrics determine which events you need to track. If your activation metric is "user creates their first project within 24 hours of signup," you need events for `signup_completed` (with timestamp) and `project_created` (with `is_first: true` property). If you instrument first and define metrics later, you will inevitably discover gaps — missing events, missing properties, missing timestamps — that require re-instrumentation and retroactive data backfilling.

### 3. The Data Layer Pattern

The data layer is an abstraction that decouples your application code from analytics providers. Instead of calling `posthog.capture()`, `mixpanel.track()`, and `gtag()` directly throughout your codebase, you call a single `analytics.track()` function that dispatches the event to all configured providers. This pattern is essential because analytics providers change — you will switch from Mixpanel to PostHog, add Google Analytics alongside Amplitude, or introduce a data warehouse. Without a data layer, every provider change requires modifying every file that tracks an event.

The data layer consists of three components. The **event definitions** are a TypeScript type map that defines every valid event name and its expected properties. This provides autocomplete and compile-time validation — you cannot misspell an event name or forget a required property. The **analytics client** is a singleton class or module that implements `track()`, `identify()`, `page()`, and `reset()` methods. Each method iterates over the configured providers and calls the appropriate provider-specific method. The **provider adapters** are thin wrappers around each analytics SDK that translate the generic event format into the provider's specific API.

This pattern also centralizes consent enforcement. The analytics client checks the user's consent status before dispatching any event. If the user has not consented to analytics cookies, events are either suppressed entirely or sent without personally identifiable information, depending on your privacy requirements.

A well-implemented data layer means your application code never imports an analytics SDK directly. It imports your analytics module — and that module is the only place that knows which providers exist and how to talk to them.

### 4. Server-Side vs. Client-Side Tracking

Client-side tracking runs in the user's browser and captures interactions as they happen: clicks, form submissions, page views, scroll depth. It is the default approach because it requires no backend changes and captures the full user experience. However, client-side tracking has significant limitations. Ad blockers block analytics scripts — between 25% and 40% of users (higher in technical audiences) never appear in your client-side analytics. JavaScript errors, slow networks, and tab closures cause events to be lost. And client-side data is inherently untrustworthy — anyone can open the browser console and fire arbitrary events.

Server-side tracking runs on your backend and captures events triggered by API calls: signups, purchases, plan changes, feature usage that involves an API request. Server-side events are reliable (no ad blockers, no network issues), trustworthy (the server controls what gets tracked), and accurate (they reflect actual system state, not client-side optimism). The limitation: server-side tracking cannot capture interactions that do not hit the server — hover states, scroll behavior, client-side navigation.

The best approach is hybrid. Track user interactions (clicks, form starts, UI engagement) on the client. Track business-critical events (signups, purchases, plan changes, feature activation) on the server. When the same event exists on both sides (e.g., form submission), prefer the server-side event for metrics because it reflects the actual outcome. Use the client-side event for user experience analysis (how long did the form take? which fields caused hesitation?).

For server-side tracking in Next.js, Server Actions and Route Handlers are the natural integration points. Call your analytics client from the server after the business logic succeeds — this ensures you only track events that actually happened, not optimistic client-side predictions.

### 5. UTM Parameters and Attribution

UTM parameters are query string tags that identify the source of traffic: `utm_source` (where), `utm_medium` (how), `utm_campaign` (why), `utm_term` (keyword), and `utm_content` (variant). When a user lands on your site from a marketing email, the URL might be `https://app.com/pricing?utm_source=email&utm_medium=newsletter&utm_campaign=spring_launch`. These parameters tell you exactly which marketing effort drove this visit.

Attribution is the process of connecting a user's conversion (signup, purchase) to the marketing touchpoint that influenced it. First-touch attribution credits the first interaction (the blog post that introduced them). Last-touch attribution credits the final interaction before conversion (the pricing page they clicked from an ad). Multi-touch attribution distributes credit across all touchpoints. Most products start with last-touch because it is simpler and actionable — it tells you which channel is currently driving conversions.

Capture UTM parameters on the first page load and persist them in a cookie or localStorage. When the user eventually signs up (which may be days later), attach the stored UTM values to the signup event and save them to the user record in your database. This connects the user's entire lifecycle — from first visit to activation to revenue — back to the marketing channel that acquired them.

The common mistake is losing UTM parameters during navigation. If a user lands on `/blog/post?utm_source=twitter` and navigates to `/pricing` and then `/signup`, the UTM parameters are gone from the URL. You must capture them on the first page load and persist them across the session. A middleware or layout-level component that reads UTM parameters from the URL and stores them in a cookie is the standard pattern.

### 6. Privacy, Consent, and Compliance

Analytics tracking requires user consent in the EU (GDPR), California (CCPA), and an expanding number of jurisdictions. Consent is not a checkbox you add to be nice — it is a legal requirement with fines up to 4% of global revenue for violations. The practical implementation affects your entire analytics architecture.

A consent management platform (CMP) presents the cookie banner and records the user's choices. The user's consent state determines which analytics providers receive events. Three tiers are standard: **Necessary** (always allowed — authentication cookies, security), **Analytics** (requires opt-in — PostHog, Mixpanel, GA4), and **Marketing** (requires opt-in — Facebook Pixel, Google Ads). Each provider is tagged with a consent category, and the data layer checks consent before dispatching events.

Server-side analytics that process only anonymized, non-personal data may not require consent under GDPR — this depends on your legal interpretation and the specific data collected. Aggregate event counts (how many times was a feature used?) are generally safe. Events tied to a user ID or containing IP addresses are personal data and require consent.

The safest approach: implement consent management from day one. Retrofitting consent onto an existing analytics system is painful — you must audit every event, categorize every provider, and handle the state where half your historical data was collected without consent. Building consent into the data layer from the start means every event automatically respects the user's choice.

### 7. Funnel and Cohort Analysis

A funnel is a sequence of events that represents a user journey toward a goal. The classic SaaS funnel is: visited site → signed up → activated (completed onboarding) → converted (started paying). Funnel analysis shows you where users drop off — if 1,000 users visit your site, 100 sign up, 30 activate, and 10 convert, your biggest leak is between visit and signup (90% drop-off). This tells you where to focus optimization effort.

Cohort analysis groups users by a shared characteristic (usually their signup date) and tracks their behavior over time. A retention cohort shows what percentage of users who signed up in Week 1 are still active in Week 2, Week 3, Week 4, and so on. Cohort analysis reveals trends that aggregate metrics hide. Your overall retention rate might be 40%, but if January's cohort retained at 30% and March's cohort retained at 50%, something you changed between January and March is working. Without cohort analysis, you would not see this improvement until it showed up in aggregate months later.

Both funnels and cohorts are best computed from raw event data in your data warehouse (PostgreSQL, BigQuery, Snowflake) rather than relying solely on analytics provider dashboards. Provider dashboards are convenient but inflexible — you cannot join analytics data with your product database to answer questions like "what is the conversion rate for users who received a referral link vs. organic signups?" SQL queries against your own data are infinitely flexible and reproducible.

### 8. Product Metrics Dashboards

A dashboard is only useful if it drives action. The most common dashboard failure is tracking everything and acting on nothing. A good product dashboard has three properties: it is glanceable (you can assess product health in under 10 seconds), it is actionable (every metric on the dashboard maps to something you can change), and it is current (data is updated at least daily, ideally hourly).

The recommended dashboard structure: a single "Product Health" dashboard with 4-6 key metrics. Daily active users (DAU) or weekly active users (WAU) as an engagement pulse. Signup-to-activation rate as an onboarding quality indicator. Revenue metrics (MRR, new MRR, churned MRR). Retention rate (Week 1 or Month 1, depending on your product's natural usage frequency). And one "focus metric" — the metric your team is currently trying to improve.

Dashboards belong in the product, not in a separate tool. Teams that have to open Metabase or Looker to check metrics check less often. A lightweight internal dashboard built with your existing stack (React + SQL queries) that loads on your admin panel keeps metrics visible and top of mind.

---

## LLM Instructions

### 1. Setting Up a Provider-Agnostic Analytics Data Layer

When asked to add analytics to a project, never import an analytics provider SDK directly into application code. Always create a data layer abstraction that decouples application code from providers.

1. Create an event definition file (`src/lib/analytics/events.ts`) that defines every event name and its required properties as a TypeScript record type. Use the `object_action` naming convention for all events. Every property should be explicitly typed — no `Record<string, any>`.
2. Create provider adapter files (`src/lib/analytics/providers/posthog.ts`, `src/lib/analytics/providers/ga4.ts`, etc.) that each export `init()`, `track()`, `identify()`, `page()`, and `reset()` functions. Each adapter translates the generic event format into the provider-specific API.
3. Create the analytics client (`src/lib/analytics/index.ts`) that exports `analytics.track()`, `analytics.identify()`, `analytics.page()`, and `analytics.reset()`. The client iterates over all enabled provider adapters and calls the corresponding method on each. It checks consent status before dispatching any event.
4. For Next.js App Router projects, create an `AnalyticsProvider` component that initializes analytics on mount, tracks page views on route changes using `usePathname()`, and provides the analytics client via React context or direct import.
5. Never track personally identifiable information (PII) in event properties unless absolutely necessary and the user has consented. Avoid tracking email addresses, full names, or IP addresses in event properties. Use anonymous user IDs and identify the user separately via `analytics.identify()`.

### 2. Implementing Event Tracking in React/Next.js

When instrumenting user interactions, follow these patterns for consistency and reliability.

1. Track events at the point of user intent, not at the point of side effect. Track `signup_form_submitted` when the user clicks the submit button, not when the API response arrives. Track server-side success events (`signup_completed`) separately on the backend after the operation actually succeeds.
2. For button clicks and form submissions, call `analytics.track()` inline in the event handler. Do not create wrapper components or HOCs for tracking — they add indirection without value. The tracking call should be visually adjacent to the action it describes.
3. For page-level tracking (e.g., "user viewed the pricing page"), use a `useEffect` in the page component or a layout-level tracker that fires on route changes. Use `usePathname()` from Next.js to detect navigation.
4. For feature usage tracking, create a `useTrackFeature` hook that fires a `feature_used` event with the feature name and relevant metadata. Call this hook in the component that represents the feature entry point.
5. Always include contextual properties: the page or component where the event occurred (`source`), the user's current plan if relevant (`plan`), and any experiment variant the user is in (`variant`). These properties are essential for segmented analysis.

### 3. Building UTM Capture and Attribution

When implementing UTM tracking and attribution, capture parameters on first visit and persist them through to conversion.

1. Create a middleware or root layout component that reads UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`) from the URL on every page load. If any UTM parameters are present, store them in a first-party cookie with a 30-day expiration. Use the cookie name `attribution`.
2. Also capture `ref`, `via`, and `referrer` parameters for non-UTM attribution (e.g., referral links). Store these in the same cookie.
3. Read the document referrer (`document.referrer`) on first visit and store it alongside UTM parameters. This provides fallback attribution when UTM parameters are not present.
4. When the user signs up or converts, read the attribution cookie and attach all values to the signup event as properties. Also save the attribution data to the user record in the database for long-term analysis.
5. For server-side rendering in Next.js, read UTM parameters from the request URL in middleware and set them as cookies. This ensures attribution is captured even if client-side JavaScript has not loaded yet.

### 4. Writing Funnel and Cohort Queries

When building analytics queries, use raw SQL against the events table for maximum flexibility.

1. Structure the events table with columns: `id`, `user_id`, `event_name`, `properties` (JSONB), `timestamp`, `session_id`. Index on `(event_name, timestamp)` and `(user_id, event_name, timestamp)` for query performance.
2. For funnel queries, use a CTE (Common Table Expression) chain where each step filters users who completed the previous step. Count distinct users at each step to compute drop-off rates.
3. For cohort retention queries, group users by their signup week (the cohort), then for each subsequent week check if they performed a qualifying activity event. Use `DATE_TRUNC('week', ...)` for weekly cohorts.
4. Always filter for a specific date range to keep queries fast. Add a `WHERE timestamp >= NOW() - INTERVAL '90 days'` to prevent full table scans on large event tables.
5. When building dashboards, materialize expensive queries as views or scheduled aggregations. Do not run raw funnel queries on every dashboard page load — precompute daily and cache the results.

### 5. Implementing Consent Management

When adding consent management, build it into the data layer from the start rather than retrofitting it later.

1. Create a consent state module (`src/lib/analytics/consent.ts`) that reads consent preferences from a cookie (e.g., `cookie_consent`). The cookie stores a JSON object mapping consent categories to booleans: `{ analytics: true, marketing: false }`.
2. Present a cookie banner on first visit using a client component. The banner should clearly explain what each category does. Use three categories: Necessary (always on), Analytics (opt-in), and Marketing (opt-in). Store the user's choices in the consent cookie and dispatch a custom event when consent changes.
3. In the analytics client, check consent status before dispatching events to each provider. Tag each provider with its required consent category. Only dispatch to providers whose required category is consented.
4. When consent is revoked, call the provider's opt-out method if available, clear any provider-set cookies, and stop sending events to that provider.
5. For GDPR compliance, consent must be granular (not just "accept all"), freely given (not coerced with dark patterns), and revocable (the user can change their mind at any time via a settings link).

---

## Examples

### 1. Type-Safe Analytics Data Layer (TypeScript + Next.js)

```typescript
// src/lib/analytics/events.ts
export type AnalyticsEvents = {
  signup_started: { source: string };
  signup_completed: { method: "email" | "google" | "github" };
  onboarding_step_completed: { step: number; step_name: string };
  onboarding_completed: { duration_seconds: number };
  feature_used: { feature: string; source: string };
  plan_viewed: { plan: string; source: string };
  plan_upgraded: { from: string; to: string; trigger: string };
  invite_sent: { method: "email" | "link"; count: number };
  checkout_started: { plan: string; billing_cycle: "monthly" | "annual" };
  checkout_completed: { plan: string; amount_cents: number };
  page_viewed: { path: string; title: string; referrer?: string };
};

// src/lib/analytics/providers/posthog.ts
import posthog from "posthog-js";

export const PostHogProvider = {
  name: "posthog" as const,
  consent: "analytics" as const,

  init() {
    if (typeof window === "undefined") return;
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // we handle this manually
      capture_pageleave: true,
      persistence: "localStorage+cookie",
    });
  },

  track(event: string, properties?: Record<string, unknown>) {
    posthog.capture(event, properties);
  },

  identify(userId: string, traits?: Record<string, unknown>) {
    posthog.identify(userId, traits);
  },

  page(name: string, properties?: Record<string, unknown>) {
    posthog.capture("$pageview", { ...properties, $current_url: name });
  },

  reset() {
    posthog.reset();
  },
};

// src/lib/analytics/consent.ts
import Cookies from "js-cookie";

type ConsentCategory = "necessary" | "analytics" | "marketing";
type ConsentState = Record<ConsentCategory, boolean>;

const CONSENT_COOKIE = "cookie_consent";
const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function getConsent(): ConsentState {
  const raw = Cookies.get(CONSENT_COOKIE);
  if (!raw) return DEFAULT_CONSENT;
  try {
    return { ...DEFAULT_CONSENT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function setConsent(consent: Partial<ConsentState>) {
  const current = getConsent();
  const updated = { ...current, ...consent, necessary: true };
  Cookies.set(CONSENT_COOKIE, JSON.stringify(updated), {
    expires: 365,
    sameSite: "lax",
  });
  window.dispatchEvent(
    new CustomEvent("consent_changed", { detail: updated })
  );
  return updated;
}

export function hasConsent(category: ConsentCategory): boolean {
  return getConsent()[category];
}

// src/lib/analytics/index.ts
import type { AnalyticsEvents } from "./events";
import { PostHogProvider } from "./providers/posthog";
import { hasConsent } from "./consent";

type Provider = {
  name: string;
  consent: "necessary" | "analytics" | "marketing";
  init: () => void;
  track: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  page: (name: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

const providers: Provider[] = [PostHogProvider];

function dispatch(method: keyof Omit<Provider, "name" | "consent" | "init">, ...args: unknown[]) {
  for (const provider of providers) {
    if (!hasConsent(provider.consent)) continue;
    try {
      (provider[method] as Function)(...args);
    } catch (err) {
      console.error(`Analytics error [${provider.name}]:`, err);
    }
  }
}

export const analytics = {
  init() {
    for (const provider of providers) {
      if (hasConsent(provider.consent)) provider.init();
    }
    // Re-init when consent changes
    if (typeof window !== "undefined") {
      window.addEventListener("consent_changed", () => {
        for (const provider of providers) {
          if (hasConsent(provider.consent)) provider.init();
        }
      });
    }
  },

  track<K extends keyof AnalyticsEvents>(event: K, properties: AnalyticsEvents[K]) {
    dispatch("track", event, properties);
  },

  identify(userId: string, traits?: Record<string, unknown>) {
    dispatch("identify", userId, traits);
  },

  page(path: string, properties?: Record<string, unknown>) {
    dispatch("page", path, properties);
  },

  reset() {
    dispatch("reset");
  },
};
```

### 2. UTM Capture Middleware (Next.js)

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const UTM_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "ref", "via",
] as const;

const ATTRIBUTION_COOKIE = "attribution";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const response = NextResponse.next();

  // Check if any attribution params exist in the URL
  const attribution: Record<string, string> = {};
  for (const param of UTM_PARAMS) {
    const value = url.searchParams.get(param);
    if (value) attribution[param] = value;
  }

  // Only set cookie if we have new attribution data
  if (Object.keys(attribution).length > 0) {
    // Add landing page
    attribution.landing_page = url.pathname;
    attribution.timestamp = new Date().toISOString();

    response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(attribution), {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false, // client needs to read this
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}

// src/lib/analytics/attribution.ts
import Cookies from "js-cookie";

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ref?: string;
  via?: string;
  landing_page?: string;
  timestamp?: string;
  referrer?: string;
};

export function getAttribution(): Attribution {
  const raw = Cookies.get("attribution");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function captureReferrer() {
  if (typeof document === "undefined") return;
  const referrer = document.referrer;
  if (!referrer) return;

  // Don't overwrite existing attribution
  const existing = getAttribution();
  if (existing.utm_source) return;

  const current = Cookies.get("attribution");
  const data = current ? JSON.parse(current) : {};
  data.referrer = referrer;
  Cookies.set("attribution", JSON.stringify(data), { expires: 30 });
}
```

### 3. Funnel Analysis SQL Query

```sql
-- Signup-to-activation funnel: last 30 days
-- Steps: signup_completed → onboarding_step_completed (step 1) → onboarding_completed → feature_used
WITH step1 AS (
  SELECT DISTINCT user_id, MIN(timestamp) AS ts
  FROM events
  WHERE event_name = 'signup_completed'
    AND timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
),
step2 AS (
  SELECT DISTINCT e.user_id, MIN(e.timestamp) AS ts
  FROM events e
  INNER JOIN step1 s ON e.user_id = s.user_id AND e.timestamp > s.ts
  WHERE e.event_name = 'onboarding_step_completed'
    AND e.properties->>'step' = '1'
  GROUP BY e.user_id
),
step3 AS (
  SELECT DISTINCT e.user_id, MIN(e.timestamp) AS ts
  FROM events e
  INNER JOIN step2 s ON e.user_id = s.user_id AND e.timestamp > s.ts
  WHERE e.event_name = 'onboarding_completed'
  GROUP BY e.user_id
),
step4 AS (
  SELECT DISTINCT e.user_id
  FROM events e
  INNER JOIN step3 s ON e.user_id = s.user_id AND e.timestamp > s.ts
  WHERE e.event_name = 'feature_used'
)
SELECT
  'Signed Up'           AS step,
  COUNT(*) AS users,
  100.0 AS pct
FROM step1
UNION ALL
SELECT
  'Started Onboarding',
  (SELECT COUNT(*) FROM step2),
  ROUND((SELECT COUNT(*) FROM step2)::numeric / NULLIF((SELECT COUNT(*) FROM step1), 0) * 100, 1)
UNION ALL
SELECT
  'Completed Onboarding',
  (SELECT COUNT(*) FROM step3),
  ROUND((SELECT COUNT(*) FROM step3)::numeric / NULLIF((SELECT COUNT(*) FROM step1), 0) * 100, 1)
UNION ALL
SELECT
  'Used Feature',
  (SELECT COUNT(*) FROM step4),
  ROUND((SELECT COUNT(*) FROM step4)::numeric / NULLIF((SELECT COUNT(*) FROM step1), 0) * 100, 1);
```

### 4. Cohort Retention Query

```sql
-- Weekly cohort retention: what % of each signup cohort is active N weeks later?
WITH cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('week', MIN(timestamp)) AS cohort_week
  FROM events
  WHERE event_name = 'signup_completed'
    AND timestamp >= NOW() - INTERVAL '12 weeks'
  GROUP BY user_id
),
activity AS (
  SELECT DISTINCT
    user_id,
    DATE_TRUNC('week', timestamp) AS activity_week
  FROM events
  WHERE event_name IN ('feature_used', 'page_viewed')
    AND timestamp >= NOW() - INTERVAL '12 weeks'
),
retention AS (
  SELECT
    c.cohort_week,
    EXTRACT(WEEK FROM a.activity_week - c.cohort_week)::int AS week_number,
    COUNT(DISTINCT a.user_id) AS active_users,
    COUNT(DISTINCT c.user_id) AS cohort_size
  FROM cohorts c
  LEFT JOIN activity a ON c.user_id = a.user_id
    AND a.activity_week >= c.cohort_week
  GROUP BY c.cohort_week, week_number
)
SELECT
  cohort_week,
  week_number,
  active_users,
  cohort_size,
  ROUND(active_users::numeric / NULLIF(cohort_size, 0) * 100, 1) AS retention_pct
FROM retention
WHERE week_number BETWEEN 0 AND 8
ORDER BY cohort_week, week_number;
```

### 5. Server-Side Event Tracking (Next.js Server Action)

```typescript
// src/lib/analytics/server.ts
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST,
  flushAt: 10,
  flushInterval: 5000,
});

export function trackServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  posthog.capture({
    distinctId: userId,
    event,
    properties: {
      ...properties,
      $lib: "server",
      environment: process.env.NODE_ENV,
    },
  });
}

export function identifyUser(
  userId: string,
  traits: Record<string, unknown>
) {
  posthog.identify({
    distinctId: userId,
    properties: traits,
  });
}

// Usage in a Server Action
// src/app/actions/signup.ts
"use server";

import { db } from "@/lib/db";
import { trackServerEvent, identifyUser } from "@/lib/analytics/server";
import { cookies } from "next/headers";

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // ... validation and user creation ...
  const user = await db.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });

  // Read attribution from cookie
  const cookieStore = await cookies();
  const attributionRaw = cookieStore.get("attribution")?.value;
  const attribution = attributionRaw ? JSON.parse(attributionRaw) : {};

  // Server-side tracking — reliable, no ad blockers
  trackServerEvent(user.id, "signup_completed", {
    method: "email",
    ...attribution,
  });

  identifyUser(user.id, {
    email: user.email,
    created_at: user.createdAt.toISOString(),
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
  });

  return { success: true, userId: user.id };
}
```

### 6. Next.js Analytics Provider Component

```typescript
// src/components/analytics-provider.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analytics } from "@/lib/analytics";
import { captureReferrer, getAttribution } from "@/lib/analytics/attribution";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);
  const previousPath = useRef<string | null>(null);

  // Initialize analytics once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    analytics.init();
    captureReferrer();

    // Track initial page view
    analytics.page(pathname, {
      title: document.title,
      referrer: document.referrer,
      ...getAttribution(),
    });
    previousPath.current = pathname;
  }, []);

  // Track subsequent navigations
  useEffect(() => {
    if (!initialized.current) return;
    if (pathname === previousPath.current) return;

    analytics.page(pathname, {
      title: document.title,
      previous_path: previousPath.current,
    });
    previousPath.current = pathname;
  }, [pathname, searchParams]);

  return <>{children}</>;
}

// src/app/layout.tsx
import { AnalyticsProvider } from "@/components/analytics-provider";
import { Suspense } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}
```

### 7. Product Health Dashboard API (Next.js)

```typescript
// src/app/api/admin/metrics/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

interface MetricResult {
  label: string;
  value: number;
  change: number; // % change from previous period
  period: string;
}

export async function GET() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    dauCurrent,
    dauPrevious,
    signupsCurrent,
    signupsPrevious,
    activationCurrent,
    activationPrevious,
    mrrResult,
  ] = await Promise.all([
    // DAU: unique users with any event in last 24h
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM events
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
        AND user_id IS NOT NULL
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM events
      WHERE timestamp >= NOW() - INTERVAL '48 hours'
        AND timestamp < NOW() - INTERVAL '24 hours'
        AND user_id IS NOT NULL
    `,
    // Signups in last 30 days
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM events
      WHERE event_name = 'signup_completed'
        AND timestamp >= ${thirtyDaysAgo}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM events
      WHERE event_name = 'signup_completed'
        AND timestamp >= ${sixtyDaysAgo}
        AND timestamp < ${thirtyDaysAgo}
    `,
    // Activation rate (last 30 days)
    db.$queryRaw<[{ rate: number }]>`
      SELECT ROUND(
        COUNT(DISTINCT CASE WHEN a.user_id IS NOT NULL THEN s.user_id END)::numeric /
        NULLIF(COUNT(DISTINCT s.user_id), 0) * 100, 1
      ) as rate
      FROM events s
      LEFT JOIN events a ON s.user_id = a.user_id
        AND a.event_name = 'onboarding_completed'
        AND a.timestamp > s.timestamp
        AND a.timestamp <= s.timestamp + INTERVAL '7 days'
      WHERE s.event_name = 'signup_completed'
        AND s.timestamp >= ${thirtyDaysAgo}
    `,
    db.$queryRaw<[{ rate: number }]>`
      SELECT ROUND(
        COUNT(DISTINCT CASE WHEN a.user_id IS NOT NULL THEN s.user_id END)::numeric /
        NULLIF(COUNT(DISTINCT s.user_id), 0) * 100, 1
      ) as rate
      FROM events s
      LEFT JOIN events a ON s.user_id = a.user_id
        AND a.event_name = 'onboarding_completed'
        AND a.timestamp > s.timestamp
        AND a.timestamp <= s.timestamp + INTERVAL '7 days'
      WHERE s.event_name = 'signup_completed'
        AND s.timestamp >= ${sixtyDaysAgo}
        AND s.timestamp < ${thirtyDaysAgo}
    `,
    // MRR from subscriptions table
    db.$queryRaw<[{ mrr: number }]>`
      SELECT COALESCE(SUM(
        CASE
          WHEN billing_cycle = 'annual' THEN price_cents / 12
          ELSE price_cents
        END
      ), 0)::numeric / 100 as mrr
      FROM subscriptions
      WHERE status = 'active'
    `,
  ]);

  const dau = Number(dauCurrent[0].count);
  const dauPrev = Number(dauPrevious[0].count);
  const signups = Number(signupsCurrent[0].count);
  const signupsPrev = Number(signupsPrevious[0].count);
  const activation = Number(activationCurrent[0].rate);
  const activationPrev = Number(activationPrevious[0].rate);
  const mrr = Number(mrrResult[0].mrr);

  function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  const metrics: MetricResult[] = [
    { label: "Daily Active Users", value: dau, change: pctChange(dau, dauPrev), period: "24h" },
    { label: "Signups", value: signups, change: pctChange(signups, signupsPrev), period: "30d" },
    { label: "Activation Rate", value: activation, change: pctChange(activation, activationPrev), period: "30d" },
    { label: "MRR", value: mrr, change: 0, period: "current" },
  ];

  return NextResponse.json({ metrics, generatedAt: now.toISOString() });
}
```

### 8. Events Table Schema and Indexes

```sql
-- Core events table for product analytics
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- null for anonymous events
  anonymous_id UUID, -- from visitor cookie
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  session_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Essential indexes for analytics queries
CREATE INDEX idx_events_name_ts ON events (event_name, timestamp);
CREATE INDEX idx_events_user_name_ts ON events (user_id, event_name, timestamp);
CREATE INDEX idx_events_session ON events (session_id, timestamp);
CREATE INDEX idx_events_ts ON events (timestamp);

-- Partial index for signup events (frequently queried)
CREATE INDEX idx_events_signups ON events (user_id, timestamp)
  WHERE event_name = 'signup_completed';

-- Attribution table for long-term storage
CREATE TABLE user_attribution (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  landing_page TEXT,
  first_visit_at TIMESTAMPTZ,
  signup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attribution_source ON user_attribution (utm_source, signup_at);
CREATE INDEX idx_attribution_campaign ON user_attribution (utm_campaign, signup_at);
```

---

## Common Mistakes

### 1. Tracking Everything Without a Plan

**Wrong:** Instrumenting every button click, every hover, every scroll position, and every keystroke "because we might need the data someday." This creates a massive, expensive event stream that nobody queries. The noise drowns out the signal.

**Fix:** Start with your metrics framework (AARRR). Define 5-10 key events that directly measure each stage of your funnel. Add more events only when a specific analysis requires them. Track events that inform decisions, not events that feel comprehensive.

### 2. Calling Analytics Providers Directly

**Wrong:** Importing `posthog` or `mixpanel` directly throughout your codebase, creating tight coupling to a specific provider.

```typescript
// Scattered across 50+ files
import posthog from "posthog-js";
posthog.capture("button_clicked", { button: "signup" });
```

**Fix:** Use the data layer pattern. Import your analytics client, never the provider SDK. When you switch providers, you change one adapter file instead of 50 application files.

```typescript
import { analytics } from "@/lib/analytics";
analytics.track("signup_started", { source: "hero_cta" });
```

### 3. Inconsistent Event Naming

**Wrong:** Mixing naming conventions — `signupCompleted`, `user_signed_up`, `Sign Up`, `signup-complete`, `SIGNUP_DONE`. These events cannot be queried consistently and create duplicate funnels.

**Fix:** Pick one convention and enforce it with TypeScript. Use `object_action` in snake_case: `signup_started`, `signup_completed`, `plan_upgraded`, `invite_sent`. Define all events in a single type file and never use untyped string event names.

### 4. Losing UTM Parameters on Navigation

**Wrong:** Reading UTM parameters only on the landing page component. When the user navigates to another page, the parameters are gone from the URL and never captured.

**Fix:** Capture UTM parameters in middleware or a root layout effect on the first page load. Persist them in a first-party cookie with a 30-day expiration. Read from the cookie — not the URL — when the user converts.

### 5. Trusting Client-Side Data for Business Metrics

**Wrong:** Using client-side analytics as the source of truth for revenue, conversion rates, or user counts. Ad blockers, JavaScript errors, and bot traffic make client-side data unreliable — often 20-40% undercounted for technical audiences.

**Fix:** Track business-critical events (signups, purchases, plan changes) server-side. Use client-side analytics for behavioral insights (UI interactions, scroll depth, engagement patterns). Cross-reference both data sources but never report revenue based on client-side tracking alone.

### 6. No Consent Management

**Wrong:** Loading analytics scripts on every page load regardless of user consent. This violates GDPR and CCPA and exposes your company to significant fines.

```typescript
// Loads tracking immediately — illegal in the EU without consent
useEffect(() => {
  posthog.init(POSTHOG_KEY);
  gtag("config", GA_ID);
  fbq("init", FB_PIXEL);
}, []);
```

**Fix:** Check consent status before initializing any non-essential analytics provider. Present a clear cookie banner. Only load tracking scripts after the user has opted in. Respect the user's choice — if they decline analytics, do not track.

### 7. Ignoring Anonymous-to-Identified User Linking

**Wrong:** Assigning a new anonymous ID when the user first visits and a new user ID when they sign up, creating two disconnected user profiles. All pre-signup behavior (which pages they viewed, which features they explored, which marketing channel brought them) is lost.

**Fix:** When a user signs up or logs in, call `analytics.identify(userId)` which links the anonymous session to the authenticated user. PostHog, Mixpanel, and Amplitude all support this — it merges the anonymous event history with the identified user profile.

### 8. Hardcoding Dashboard Queries

**Wrong:** Writing dashboard SQL directly in your admin panel components. When the schema changes or a metric definition is updated, you must find and update every query.

**Fix:** Create a `metrics` module with named query functions: `getSignupFunnel(dateRange)`, `getRetentionCohorts(weeks)`, `getDailyActiveUsers(dateRange)`. Dashboard components call these functions. Metric definitions change in one place.

### 9. Tracking PII in Event Properties

**Wrong:** Including email addresses, names, phone numbers, or IP addresses in event properties. This data ends up in third-party analytics providers, cannot be easily deleted for GDPR "right to erasure" requests, and creates unnecessary compliance risk.

```typescript
analytics.track("signup_completed", {
  email: "user@example.com", // PII in event properties
  name: "John Doe",          // more PII
  ip: request.ip,            // even more PII
});
```

**Fix:** Track only the user ID in events. Use `analytics.identify()` to set user traits separately — these can be managed and deleted independently. Avoid storing PII in event properties that get replicated across multiple analytics providers.

### 10. Not Validating Events in Development

**Wrong:** Deploying tracking code without verifying that events fire correctly, have the right properties, and appear in the analytics provider's dashboard. Discovering weeks later that a critical funnel event was never tracked.

**Fix:** Add analytics validation to your development workflow. Log all events to the browser console in development mode. Use PostHog's event debugger or Mixpanel's live view to verify events in real time during QA. Include analytics verification in your PR checklist for any feature that adds or modifies tracked behavior.

---

> **See also:** [Experimentation](../Experimentation/experimentation.md) | [Conversion-Optimization](../Conversion-Optimization/conversion-optimization.md) | [Growth-Marketing-Channels](../Growth-Marketing-Channels/growth-marketing-channels.md) | [Retention-Engagement](../Retention-Engagement/retention-engagement.md) | [Product-Led-Growth](../Product-Led-Growth/product-led-growth.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
