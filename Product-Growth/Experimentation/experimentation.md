# Experimentation & Feature Flags
> Feature flag systems, A/B test design, hypothesis-driven development, hash-based variant assignment, server-side rendering with variants, statistical significance, sequential testing, and flag cleanup lifecycle. Every product decision should be an experiment — ship fast, measure impact, and let data settle debates.

---

## Principles

### 1. Hypothesis-Driven Development

Every experiment starts with a hypothesis, not a hunch. A hypothesis is a falsifiable statement that connects a change to a measurable outcome: "If we simplify the signup form from 5 fields to 3, we will increase signup completion rate by 15% because reducing friction lowers the cognitive cost of starting." The hypothesis has four components: the change (simplify the form), the metric (signup completion rate), the expected magnitude (15% increase), and the rationale (friction reduction). Without a written hypothesis, you are not experimenting — you are guessing with extra steps.

The hypothesis forces rigor before code is written. It forces the team to agree on what metric matters, what counts as a win, and how long to run the experiment. Without this alignment, experiments devolve into opinion battles after the results come in: "Well, signups went up but engagement went down, so was it a win?" If the hypothesis specified the primary metric upfront, the answer is clear.

Document every experiment with a consistent template: hypothesis, primary metric, secondary metrics (guardrail metrics that should not regress), audience (who sees the experiment), sample size needed, and expected runtime. This document becomes the experiment's source of truth and prevents post-hoc rationalization — changing the success criteria after seeing the results.

Guardrail metrics are critical. If simplifying the signup form increases signups by 20% but the users who sign up with fewer fields have 50% lower activation rates, the experiment is a net loss. Guardrails protect against winning on the primary metric while silently destroying downstream value. Common guardrails include: activation rate, retention rate, support ticket volume, and error rates.

### 2. Feature Flags as Infrastructure

Feature flags are boolean or multi-valued switches that control which code paths execute for which users. They are not just an experimentation tool — they are a deployment safety mechanism, a gradual rollout controller, and a kill switch for broken features. Treat feature flags as infrastructure, not as temporary hacks.

There are four types of feature flags, each with different lifecycles. **Release flags** control the rollout of new features — they start at 0%, ramp to 10%, 50%, 100%, and are then removed. Their lifecycle is days to weeks. **Experiment flags** assign users to variants for A/B tests — they exist for the duration of the experiment and are removed when a winner is declared. Their lifecycle is weeks to months. **Ops flags** are kill switches that disable features during incidents — they are permanent infrastructure. **Permission flags** gate features by plan or user segment — they are long-lived and tied to business logic.

The key architectural decision is where flags are evaluated: client-side or server-side. Client-side evaluation (the flag SDK runs in the browser) has the advantage of zero latency after the initial flag load, but it cannot prevent content flash (the user sees the control variant before the flag loads and switches to the treatment). Server-side evaluation (flags are checked during SSR or in API handlers) eliminates flash but requires the flag SDK on the server. For Next.js applications, server-side evaluation in middleware or Server Components is strongly preferred because it renders the correct variant from the first paint.

### 3. Deterministic Variant Assignment

Variant assignment must be deterministic — the same user must always see the same variant for the duration of the experiment. If a user sees the new signup form today and the old form tomorrow, you are not running an experiment. You are confusing users and contaminating your data.

The standard approach is hash-based assignment. Concatenate the user ID (or anonymous session ID) with the experiment key, hash the result (MurmurHash3 or FNV-1a are common choices for speed; cryptographic hashes like SHA-256 work but are slower), and use the hash modulo 100 to assign a bucket. Buckets 0-49 go to control, 50-99 go to treatment. This is deterministic (same input always produces same output), does not require a database lookup, and distributes users uniformly across variants.

For logged-out users, use a persistent anonymous ID stored in a first-party cookie. Generate a UUID on first visit and use it as the hash input. This ensures the user sees the same variant across page loads. When the user signs up, link the anonymous ID to their user ID so their pre-signup experiment exposure is preserved in the analysis.

Traffic allocation is separate from variant assignment. You might want to run an experiment on only 20% of traffic (to limit blast radius). The pattern: first hash to determine if the user is in the experiment (bucket 0-19 = in, 20-99 = out), then hash again with a different salt to determine the variant (0-49 = control, 50-99 = treatment). This keeps the in/out decision independent from the variant decision.

### 4. Statistical Significance and Sample Size

An experiment result is statistically significant when the observed difference between variants is unlikely to have occurred by chance. The industry standard threshold is p < 0.05, meaning there is less than a 5% probability that the result is a false positive (the difference is not real). Alongside the p-value, check statistical power — the probability of detecting a real effect. The standard target is 80% power, meaning you have an 80% chance of detecting a true effect of the expected size.

Sample size depends on three factors: the baseline conversion rate, the minimum detectable effect (MDE), and the desired significance and power levels. For a signup page with a 10% baseline conversion rate, detecting a 10% relative improvement (to 11%) with 95% significance and 80% power requires approximately 14,700 users per variant. Detecting a 5% relative improvement requires approximately 58,800 per variant. This math is non-negotiable — running the experiment with fewer users produces unreliable results.

The most dangerous mistake in experimentation is peeking — checking results before the predetermined sample size is reached and stopping the experiment early when the result "looks good." Continuous peeking inflates the false positive rate dramatically. If you check results 10 times during an experiment, the effective false positive rate rises from 5% to over 25%. You will "detect" effects that do not exist.

There are two solutions to the peeking problem. **Fixed-horizon testing** predetermines the sample size, runs the experiment until that sample size is reached, and only then evaluates the result. No peeking. **Sequential testing** uses adjusted significance thresholds that account for multiple looks at the data. Methods like the mSPRT (mixture Sequential Probability Ratio Test) allow valid conclusions at any point during the experiment by widening the confidence interval to compensate for multiple comparisons. PostHog and Statsig use sequential testing by default.

### 5. Avoiding Experimentation Pitfalls

**Selection bias** occurs when the experiment and control groups are not comparable. If you accidentally expose the experiment only to users on a specific plan or from a specific geography, the results reflect that segment, not your overall user base. Hash-based assignment prevents this by distributing users uniformly, but you must verify that the distribution is actually uniform — check that the groups have similar sizes and similar baseline metrics before analyzing results.

**Novelty effect** inflates short-term results. Users react to changes simply because they are new. A redesigned pricing page might see a spike in conversions in the first week because users explore the new layout, not because the new layout is genuinely better. Let experiments run for at least one full business cycle (typically 2 weeks) to account for novelty wearing off.

**Interaction effects** occur when multiple experiments overlap. If Experiment A changes the homepage headline and Experiment B changes the homepage CTA, and a user is in the treatment group for both, you cannot attribute any conversion change to either experiment individually. The effects interact. The simplest solution is mutual exclusion — ensure experiments that affect the same user journey do not overlap in audience. Use experiment layers or namespaces to enforce this.

**Simpson's paradox** occurs when a trend that appears in overall data reverses when the data is segmented. An experiment might show a 5% improvement overall, but when split by device type, it shows a 10% improvement on mobile and a 5% regression on desktop. Always segment results by key dimensions (device, plan, geography, traffic source) before declaring a winner.

### 6. Flag Cleanup and Technical Debt

Feature flags that are not cleaned up after experiments conclude are one of the fastest-growing sources of technical debt. Every flag adds a conditional branch to your code. Ten uncleaned flags create hundreds of possible code paths, most of which are never tested. The flag evaluation logic (which might call an external service) adds latency to every request. And stale flags confuse new team members who do not know whether a flag is still active or a relic.

The cleanup lifecycle is: experiment concludes → winner is declared → losing variant code is deleted → flag evaluation is replaced with the winning code path → flag is archived in the flag management system. This should happen within one sprint of the experiment concluding. Set a calendar reminder or automate a Slack notification when experiments end.

Some teams add an expiration date to every feature flag at creation time. After the expiration date, the flag system logs a warning or throws an error in development, forcing cleanup. This is aggressive but effective — it makes flag debt impossible to ignore.

The rule of thumb: a codebase should have fewer than 20 active feature flags at any time. If you have more, you are not cleaning up fast enough, or you are using flags for things that should be configuration or business logic.

### 7. Server-Side Experimentation in Next.js

Server-side experimentation eliminates content flash by resolving the variant before the page is rendered. In Next.js App Router, this means evaluating feature flags in Server Components, middleware, or `generateMetadata` — not in client-side `useEffect` hooks that cause a visible switch.

The middleware approach is the most robust. In `middleware.ts`, evaluate the experiment flag based on the user's cookie (which contains their anonymous or authenticated ID). Set the variant as a cookie or header so that Server Components can read it without re-evaluating the flag. This ensures the variant is consistent across all components on the page and across navigation.

For Server Components, read the variant from the cookie set by middleware and conditionally render the appropriate UI. For Client Components that need the variant (e.g., for tracking), pass it as a prop from the Server Component or read it from the cookie.

Edge-compatible flag evaluation is important for middleware performance. Avoid flag SDKs that make network requests during evaluation — these add latency to every page load. Instead, use SDKs that evaluate flags locally using a cached flag configuration (PostHog, LaunchDarkly, and Statsig all support local evaluation). Fetch the flag configuration periodically (every 30-60 seconds) and cache it in memory.

---

## LLM Instructions

### 1. Setting Up Feature Flags in a Next.js Project

When asked to add feature flags or A/B testing, implement a provider-agnostic flag system that evaluates server-side to prevent content flash.

1. Create a flag definition file (`src/lib/flags/definitions.ts`) that lists all active experiments with their key, variants, default variant, and traffic allocation. This file is the single source of truth for what experiments are running.
2. Create a flag evaluation module (`src/lib/flags/evaluate.ts`) that implements hash-based variant assignment. Accept the user ID and experiment key, hash them with MurmurHash3 or SHA-256, and return the assigned variant. For traffic allocation, use a two-stage hash: first determine if the user is in the experiment, then determine their variant.
3. Create a middleware (`src/middleware.ts`) that evaluates flags for the current user on every request and sets the results as cookies. Server Components read variant assignments from these cookies.
4. For PostHog or LaunchDarkly integration, create a provider adapter that wraps the SDK's flag evaluation. Use local evaluation mode (feature flag config cached in memory) to avoid network requests on every page load.
5. Every flag must have an associated cleanup ticket. When creating a flag, also create a TODO or issue that tracks removing the flag after the experiment concludes.

### 2. Implementing an A/B Test End-to-End

When implementing a specific A/B test, follow this complete flow from hypothesis to cleanup.

1. Document the hypothesis using the template: "If [change], then [metric] will [direction] by [magnitude] because [rationale]." Identify the primary metric, guardrail metrics, and required sample size.
2. Create the feature flag with the experiment key and variant definitions (control and treatment at minimum). Set the traffic allocation (start at 10-20% for risky changes, 50-50 for low-risk).
3. Implement both variants in the code behind the feature flag. The control variant renders the existing behavior. The treatment variant renders the new behavior. Both variants must track the same events to enable comparison.
4. Add experiment exposure tracking: when a user is assigned a variant, fire an `experiment_viewed` event with properties `{ experiment: "key", variant: "control|treatment" }`. This event is critical for analysis — it tells you exactly which users were in the experiment.
5. After the experiment concludes, remove the losing variant code, replace the flag evaluation with the winning behavior, archive the flag, and delete the cleanup ticket.

### 3. Building a Custom Feature Flag System

When building a lightweight feature flag system without a third-party provider, implement these core components.

1. Store flag definitions in a database table with columns: `key` (unique), `description`, `variants` (JSON array), `traffic_pct` (0-100), `status` (active/paused/archived), `created_at`, `expires_at`. This allows flags to be managed without code deployments.
2. Implement hash-based evaluation: `hash(userId + flagKey) % 100`. If the result is less than `traffic_pct`, the user is in the experiment. Then `hash(userId + flagKey + "variant") % variants.length` determines the variant. Use consistent hashing so the same user always gets the same result.
3. Cache flag definitions in memory with a TTL of 30-60 seconds. Fetch from the database on cache miss. This prevents a database query on every flag evaluation while keeping flags relatively fresh.
4. Create an admin API or UI to create, update, pause, and archive flags. Pausing a flag should immediately stop assigning new users but not change existing assignments.
5. Add an override mechanism: a cookie or query parameter (`?flag_override=experiment_key:variant`) that forces a specific variant in development and QA. Disable overrides in production.

### 4. Analyzing Experiment Results

When building experiment analysis, compute statistical significance correctly and present results clearly.

1. Count unique users exposed to each variant (from `experiment_viewed` events). Count unique users who completed the target action (from the primary metric event). Compute the conversion rate for each variant.
2. Use a two-proportion z-test to compute the p-value. The test statistic is `z = (p1 - p2) / sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))` where `p1` and `p2` are the conversion rates and `n1` and `n2` are the sample sizes.
3. Compute the 95% confidence interval for the difference in conversion rates. If the interval does not contain zero, the result is significant at the 95% level.
4. Check guardrail metrics: compute the same analysis for each guardrail metric and flag any that show significant regression.
5. Segment results by key dimensions (device type, plan, geography, traffic source) and flag any segments where the result direction differs from the overall result (Simpson's paradox).

### 5. Flag Lifecycle Management

When maintaining feature flags, enforce cleanup to prevent flag debt from accumulating.

1. Every flag must have a status: `active` (currently running), `paused` (stopped but not cleaned up), `archived` (experiment complete, code cleaned up). Only `active` flags are evaluated.
2. Set an `expires_at` date on every flag at creation time. In development, log a warning when evaluating an expired flag. In CI, fail the build if any flag in the codebase has been expired for more than 2 weeks.
3. After an experiment concludes, immediately update the flag status to `paused` and create a code cleanup PR. The PR should: remove the losing variant code, replace flag evaluation with the winning behavior, and delete the flag from the definitions file.
4. Maintain a flag dashboard that shows all active flags, their age, their expiration date, and the experiment results. Flag any experiment that has been running for more than 4 weeks without a conclusion.
5. Keep total active flags under 20. If the count exceeds 20, pause all new experiments until cleanup brings the count down. Flag debt compounds faster than technical debt.

---

## Examples

### 1. Hash-Based Variant Assignment

```typescript
// src/lib/flags/evaluate.ts
import { createHash } from "crypto";

type Variant = string;

interface ExperimentConfig {
  key: string;
  variants: Variant[];
  trafficPct: number; // 0-100
}

function hashToNumber(input: string): number {
  const hash = createHash("sha256").update(input).digest("hex");
  // Use first 8 hex chars (32 bits) for a uniform distribution
  return parseInt(hash.substring(0, 8), 16);
}

export function getVariant(
  userId: string,
  experiment: ExperimentConfig
): Variant | null {
  // Stage 1: Is this user in the experiment?
  const trafficHash = hashToNumber(`${userId}:${experiment.key}:traffic`);
  const trafficBucket = trafficHash % 100;

  if (trafficBucket >= experiment.trafficPct) {
    return null; // User is not in the experiment
  }

  // Stage 2: Which variant?
  const variantHash = hashToNumber(`${userId}:${experiment.key}:variant`);
  const variantIndex = variantHash % experiment.variants.length;

  return experiment.variants[variantIndex];
}

// Usage
const experiment: ExperimentConfig = {
  key: "simplified_signup",
  variants: ["control", "treatment"],
  trafficPct: 50,
};

const variant = getVariant("user_abc123", experiment);
// Always returns the same variant for the same user+experiment
```

### 2. Server-Side Experimentation in Next.js Middleware

```typescript
// src/lib/flags/definitions.ts
export const experiments = {
  simplified_signup: {
    key: "simplified_signup",
    variants: ["control", "treatment"] as const,
    trafficPct: 100,
  },
  new_pricing_page: {
    key: "new_pricing_page",
    variants: ["control", "variant_a", "variant_b"] as const,
    trafficPct: 30,
  },
} as const;

export type ExperimentKey = keyof typeof experiments;

// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { experiments } from "@/lib/flags/definitions";
import { getVariant } from "@/lib/flags/evaluate";

const VISITOR_COOKIE = "visitor_id";
const FLAGS_COOKIE = "feature_flags";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get or create visitor ID
  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = uuid();
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  // Evaluate all active experiments
  const flags: Record<string, string> = {};
  for (const [key, config] of Object.entries(experiments)) {
    const variant = getVariant(visitorId, config);
    if (variant) {
      flags[key] = variant;
    }
  }

  // Set flags cookie for Server Components to read
  response.cookies.set(FLAGS_COOKIE, JSON.stringify(flags), {
    maxAge: 60 * 60, // 1 hour — re-evaluated on next visit
    httpOnly: false, // client needs to read for tracking
    sameSite: "lax",
  });

  return response;
}

// src/lib/flags/server.ts — reading flags in Server Components
import { cookies } from "next/headers";
import type { ExperimentKey } from "./definitions";

export async function getFlag(experiment: ExperimentKey): Promise<string | null> {
  const cookieStore = await cookies();
  const flagsRaw = cookieStore.get("feature_flags")?.value;
  if (!flagsRaw) return null;

  try {
    const flags = JSON.parse(flagsRaw);
    return flags[experiment] ?? null;
  } catch {
    return null;
  }
}

// Usage in a Server Component
// src/app/signup/page.tsx
import { getFlag } from "@/lib/flags/server";

export default async function SignupPage() {
  const variant = await getFlag("simplified_signup");

  if (variant === "treatment") {
    return <SimplifiedSignupForm />;
  }

  return <StandardSignupForm />;
}
```

### 3. Experiment Exposure Tracking

```typescript
// src/components/experiment-tracker.tsx
"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

interface ExperimentTrackerProps {
  experiment: string;
  variant: string;
  children: React.ReactNode;
}

export function ExperimentTracker({
  experiment,
  variant,
  children,
}: ExperimentTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    analytics.track("experiment_viewed", {
      experiment,
      variant,
      source: window.location.pathname,
    });
  }, [experiment, variant]);

  return <>{children}</>;
}

// Usage in a page
export default async function PricingPage() {
  const variant = await getFlag("new_pricing_page");

  return (
    <ExperimentTracker experiment="new_pricing_page" variant={variant ?? "control"}>
      {variant === "variant_a" ? (
        <PricingPageA />
      ) : variant === "variant_b" ? (
        <PricingPageB />
      ) : (
        <PricingPageControl />
      )}
    </ExperimentTracker>
  );
}
```

### 4. Experiment Results Analysis (SQL)

```sql
-- Analyze experiment results: simplified_signup
-- Primary metric: signup_completed rate
-- Guardrail: onboarding_completed rate

WITH exposed AS (
  SELECT
    user_id,
    properties->>'variant' AS variant,
    MIN(timestamp) AS exposure_time
  FROM events
  WHERE event_name = 'experiment_viewed'
    AND properties->>'experiment' = 'simplified_signup'
    AND timestamp >= '2026-02-01'
  GROUP BY user_id, properties->>'variant'
),
conversions AS (
  SELECT DISTINCT e.user_id
  FROM events e
  INNER JOIN exposed ex ON e.user_id = ex.user_id
    AND e.timestamp > ex.exposure_time
  WHERE e.event_name = 'signup_completed'
),
guardrail AS (
  SELECT DISTINCT e.user_id
  FROM events e
  INNER JOIN exposed ex ON e.user_id = ex.user_id
    AND e.timestamp > ex.exposure_time
  WHERE e.event_name = 'onboarding_completed'
)
SELECT
  ex.variant,
  COUNT(DISTINCT ex.user_id) AS exposed_users,
  COUNT(DISTINCT c.user_id) AS conversions,
  ROUND(
    COUNT(DISTINCT c.user_id)::numeric /
    NULLIF(COUNT(DISTINCT ex.user_id), 0) * 100, 2
  ) AS conversion_rate_pct,
  COUNT(DISTINCT g.user_id) AS guardrail_conversions,
  ROUND(
    COUNT(DISTINCT g.user_id)::numeric /
    NULLIF(COUNT(DISTINCT ex.user_id), 0) * 100, 2
  ) AS guardrail_rate_pct
FROM exposed ex
LEFT JOIN conversions c ON ex.user_id = c.user_id
LEFT JOIN guardrail g ON ex.user_id = g.user_id
GROUP BY ex.variant
ORDER BY ex.variant;
```

### 5. PostHog Feature Flag Integration

```typescript
// src/lib/flags/providers/posthog.ts
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST,
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY, // for local evaluation
});

// Use local evaluation to avoid network requests per flag check
await posthog.reloadFeatureFlags();

export async function getPostHogFlag(
  flagKey: string,
  userId: string,
  userProperties?: Record<string, unknown>
): Promise<string | boolean | undefined> {
  return posthog.getFeatureFlag(flagKey, userId, {
    personProperties: userProperties,
  });
}

export async function getAllPostHogFlags(
  userId: string,
  userProperties?: Record<string, unknown>
): Promise<Record<string, string | boolean>> {
  return posthog.getAllFlags(userId, {
    personProperties: userProperties,
  });
}

// Middleware integration
// src/middleware.ts
import { getAllPostHogFlags } from "@/lib/flags/providers/posthog";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const visitorId = request.cookies.get("visitor_id")?.value ?? uuid();

  const flags = await getAllPostHogFlags(visitorId);

  response.cookies.set("feature_flags", JSON.stringify(flags), {
    maxAge: 3600,
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}
```

### 6. Mutual Exclusion Groups for Overlapping Experiments

```typescript
// src/lib/flags/exclusion.ts
// Prevents users from being in multiple experiments that affect the same surface

import { createHash } from "crypto";

interface ExperimentLayer {
  name: string; // e.g., "pricing_page", "signup_flow"
  experiments: string[]; // experiment keys in this layer
}

// Define layers — experiments in the same layer are mutually exclusive
const layers: ExperimentLayer[] = [
  {
    name: "pricing_page",
    experiments: ["new_pricing_layout", "pricing_social_proof", "annual_discount_test"],
  },
  {
    name: "signup_flow",
    experiments: ["simplified_signup", "social_login_first"],
  },
];

function hashToNumber(input: string): number {
  const hash = createHash("sha256").update(input).digest("hex");
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * For a given user and experiment, determine if they should be included.
 * Within a layer, only one experiment can be active for a user.
 * Experiments NOT in any layer are independent (no exclusion).
 */
export function isUserInExperiment(
  userId: string,
  experimentKey: string
): boolean {
  // Find the layer this experiment belongs to
  const layer = layers.find((l) => l.experiments.includes(experimentKey));

  if (!layer) {
    // No layer = no exclusion, evaluate normally
    return true;
  }

  // Hash user into the layer to pick which experiment they're in
  const layerHash = hashToNumber(`${userId}:layer:${layer.name}`);
  const activeExperiments = layer.experiments; // only active ones in practice
  const selectedIndex = layerHash % activeExperiments.length;
  const selectedExperiment = activeExperiments[selectedIndex];

  // User is only in the experiment if it's the one selected for them in this layer
  return selectedExperiment === experimentKey;
}

// Usage with the existing getVariant function
export function getVariantWithExclusion(
  userId: string,
  experiment: ExperimentConfig
): Variant | null {
  if (!isUserInExperiment(userId, experiment.key)) {
    return null; // excluded by layer
  }
  return getVariant(userId, experiment);
}
```

### 7. Feature Flag Database Schema and Admin API

```sql
-- Feature flags table for database-backed flag management
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  variants JSONB NOT NULL DEFAULT '["control", "treatment"]',
  traffic_pct INTEGER NOT NULL DEFAULT 0 CHECK (traffic_pct BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused', 'archived')),
  targeting_rules JSONB DEFAULT NULL, -- optional: target by plan, geography, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Experiment results log
CREATE TABLE experiment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL REFERENCES feature_flags(key),
  concluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  winner TEXT, -- null if inconclusive
  primary_metric TEXT NOT NULL,
  primary_lift_pct NUMERIC(6,2),
  significant BOOLEAN NOT NULL,
  sample_size_control INTEGER NOT NULL,
  sample_size_treatment INTEGER NOT NULL,
  notes TEXT,
  cleanup_pr TEXT -- link to the cleanup PR
);

CREATE INDEX idx_flags_status ON feature_flags(status);
CREATE INDEX idx_flags_expires ON feature_flags(expires_at) WHERE status = 'active';
```

```typescript
// src/app/api/admin/flags/route.ts
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateFlagSchema = z.object({
  traffic_pct: z.number().min(0).max(100).optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  description: z.string().optional(),
});

// GET /api/admin/flags — list all flags with age and status
export async function GET() {
  const flags = await db.featureFlag.findMany({
    orderBy: { createdAt: "desc" },
  });

  const enriched = flags.map((flag) => ({
    ...flag,
    age_days: Math.floor(
      (Date.now() - flag.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    ),
    is_expired: flag.expiresAt ? flag.expiresAt < new Date() : false,
  }));

  return NextResponse.json({ flags: enriched });
}

// PATCH /api/admin/flags/:key — update flag traffic or status
export async function PATCH(request: NextRequest) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const body = UpdateFlagSchema.parse(await request.json());

  const updated = await db.featureFlag.update({
    where: { key },
    data: {
      ...body,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ flag: updated });
}
```

### 7. Statistical Significance Calculator

```typescript
// src/lib/experiments/statistics.ts

interface ExperimentArm {
  visitors: number;
  conversions: number;
}

interface SignificanceResult {
  controlRate: number;
  treatmentRate: number;
  relativeLift: number;
  zScore: number;
  pValue: number;
  significant: boolean; // p < 0.05
  confidenceInterval: [number, number]; // 95% CI on the difference
  requiredSampleSize: number; // per arm, for 80% power at observed effect
}

export function computeSignificance(
  control: ExperimentArm,
  treatment: ExperimentArm
): SignificanceResult {
  const p1 = control.conversions / control.visitors;
  const p2 = treatment.conversions / treatment.visitors;
  const n1 = control.visitors;
  const n2 = treatment.visitors;

  // Pooled proportion
  const pPooled = (control.conversions + treatment.conversions) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));

  // Z-score
  const z = se === 0 ? 0 : (p2 - p1) / se;

  // Two-tailed p-value (approximation using error function)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  // 95% CI on the difference (not pooled SE — use unpooled for CI)
  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const diff = p2 - p1;
  const ci: [number, number] = [diff - 1.96 * seDiff, diff + 1.96 * seDiff];

  // Required sample size for 80% power (two-tailed, alpha=0.05)
  const effect = Math.abs(p2 - p1) || 0.01; // avoid division by zero
  const pAvg = (p1 + p2) / 2;
  const requiredN = Math.ceil(
    (2 * pAvg * (1 - pAvg) * Math.pow(1.96 + 0.84, 2)) / Math.pow(effect, 2)
  );

  return {
    controlRate: p1,
    treatmentRate: p2,
    relativeLift: p1 === 0 ? 0 : ((p2 - p1) / p1) * 100,
    zScore: z,
    pValue,
    significant: pValue < 0.05,
    confidenceInterval: ci,
    requiredSampleSize: requiredN,
  };
}

// Standard normal CDF approximation (Abramowitz and Stegun)
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
```

---

## Common Mistakes

### 1. Client-Side Flag Evaluation Causing Content Flash

**Wrong:** Evaluating feature flags in a `useEffect` hook on the client side, causing the page to render the default variant and then flash to the assigned variant when the flag loads.

```typescript
// Content flash — user sees control then switches to treatment
const [variant, setVariant] = useState("control");
useEffect(() => {
  setVariant(posthog.getFeatureFlag("experiment") ?? "control");
}, []);
```

**Fix:** Evaluate flags server-side in middleware or Server Components. Set the variant as a cookie during the middleware phase so the first render is already correct. No flash, no layout shift.

### 2. Peeking at Results and Stopping Early

**Wrong:** Checking experiment results daily and declaring a winner as soon as the result "looks significant." This inflates false positive rates from 5% to 25%+ and leads to shipping changes that do not actually work.

**Fix:** Predetermine the sample size before starting. Run the experiment until the sample size is reached. If you must check results early, use sequential testing methods (mSPRT) that account for multiple looks. PostHog and Statsig use sequential testing by default.

### 3. Not Tracking Experiment Exposure

**Wrong:** Analyzing experiment results by comparing all users who could have been in the experiment, rather than only users who were actually exposed to a variant. This dilutes the effect and makes real improvements appear insignificant.

**Fix:** Fire an `experiment_viewed` event every time a user is shown a variant. Only include users with this event in the analysis. A user who was assigned to the treatment but never visited the affected page should not be in the analysis.

### 4. Running Overlapping Experiments on the Same Surface

**Wrong:** Running two experiments that both modify the pricing page at the same time. Experiment A changes the headline, Experiment B changes the CTA button. Users in both treatment groups see a page with two changes, making it impossible to attribute any conversion difference to either change.

**Fix:** Use experiment namespaces or mutual exclusion groups. Experiments that affect the same page or user flow should not run concurrently. If they must overlap, use a factorial design that explicitly tests all combinations.

### 5. Never Cleaning Up Feature Flags

**Wrong:** Leaving experiment flags in the codebase indefinitely after the experiment concludes. After 6 months, the codebase has 50 flags, hundreds of conditional branches, and nobody knows which flags are still relevant.

**Fix:** Set an expiration date on every flag at creation. Enforce cleanup within one sprint of experiment conclusion. Log warnings for expired flags in development. Fail the build if flags are expired for more than 2 weeks. Keep active flag count under 20.

### 6. Using Random Assignment Instead of Hash-Based Assignment

**Wrong:** Assigning variants with `Math.random()` on each page load. The user sees a different variant every time they visit, contaminating the experiment data.

```typescript
const variant = Math.random() > 0.5 ? "treatment" : "control";
```

**Fix:** Use hash-based deterministic assignment. Hash the user ID with the experiment key. The same input always produces the same output, so the user sees the same variant on every visit.

### 7. No Guardrail Metrics

**Wrong:** Optimizing for the primary metric (signups) without monitoring downstream effects. The experiment increases signups by 20% but the new users churn at 2x the rate — a net loss of revenue.

**Fix:** Define 2-3 guardrail metrics alongside the primary metric for every experiment. Common guardrails: activation rate, 7-day retention, support tickets, error rates. If any guardrail shows significant regression, the experiment is not a winner regardless of the primary metric result.

### 8. Testing Too Many Variants

**Wrong:** Running an A/B/C/D/E test with 5 variants. With 5 variants and a 10% baseline conversion rate, you need approximately 75,000 users per variant to detect a 10% relative improvement — 375,000 total. At 1,000 signups per week, the experiment takes 7 years.

**Fix:** Limit experiments to 2-3 variants. Use A/B for most experiments (control vs. treatment). Use A/B/C only when you have two genuinely distinct approaches and sufficient traffic to reach significance within 2-4 weeks.

### 9. Storing Flag State Only in Memory

**Wrong:** Keeping all feature flag definitions hardcoded in a TypeScript file. Every flag change requires a code deployment, and flags cannot be toggled in an emergency without pushing new code.

```typescript
// Hardcoded — requires deployment to change
const FLAGS = {
  new_checkout: true,
  redesigned_dashboard: false,
};
```

**Fix:** Store flag definitions in a database or a flag management service. Cache them in memory with a short TTL (30-60 seconds) so changes propagate quickly without a deployment. Keep a hardcoded fallback for when the database is unreachable.

```typescript
// Database-backed with in-memory cache
let flagCache: Record<string, FlagConfig> = {};
let cacheExpiry = 0;

async function getFlags(): Promise<Record<string, FlagConfig>> {
  if (Date.now() < cacheExpiry) return flagCache;

  try {
    const flags = await db.featureFlag.findMany({ where: { status: "active" } });
    flagCache = Object.fromEntries(flags.map((f) => [f.key, f]));
    cacheExpiry = Date.now() + 30_000; // 30s TTL
  } catch {
    // Fallback to stale cache if DB is down
  }
  return flagCache;
}
```

### 10. No Experiment Documentation

**Wrong:** Running experiments without recording the hypothesis, success criteria, or results. After three months, nobody knows why a feature exists in its current form, whether it was validated, or what was learned.

**Fix:** Create an experiment registry — a table or document that tracks every experiment with its hypothesis, primary metric, guardrail metrics, start date, end date, results, and decision. This becomes institutional knowledge that prevents re-running failed experiments and provides context for future product decisions.

```typescript
// src/lib/flags/registry.ts
interface ExperimentRecord {
  key: string;
  hypothesis: string;
  primaryMetric: string;
  guardrailMetrics: string[];
  trafficPct: number;
  startDate: string;
  endDate: string | null;
  status: "running" | "concluded" | "killed";
  result: {
    winner: string | null;
    primaryLift: number | null;
    significant: boolean;
    notes: string;
  } | null;
}

// Store alongside flag definitions for easy lookup
export const experimentRegistry: ExperimentRecord[] = [
  {
    key: "simplified_signup",
    hypothesis:
      "Reducing signup form from 5 fields to 3 will increase completion rate by 15% because friction is the primary drop-off cause",
    primaryMetric: "signup_completion_rate",
    guardrailMetrics: ["activation_rate", "7d_retention"],
    trafficPct: 50,
    startDate: "2026-02-01",
    endDate: "2026-02-15",
    status: "concluded",
    result: {
      winner: "treatment",
      primaryLift: 18.3,
      significant: true,
      notes: "Guardrails stable. Shipped treatment. Cleanup PR #342.",
    },
  },
];
```

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [Conversion-Optimization](../Conversion-Optimization/conversion-optimization.md) | [Product-Led-Growth](../Product-Led-Growth/product-led-growth.md) | [User-Onboarding](../User-Onboarding/user-onboarding.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
