---
title: Product-Led Growth
description: PLG flywheel architecture, zero-friction self-serve signup, freemium usage gates, product-qualified lead scoring, contextual upgrade triggers, expansion revenue patterns, self-serve vs sales-assist routing, and PLG metrics. The product is the primary driver of acquisition, conversion, and expansion — every user interaction is a growth opportunity encoded in code.
---
# Product-Led Growth
> PLG flywheel architecture, zero-friction self-serve signup, freemium usage gates, product-qualified lead scoring, contextual upgrade triggers, expansion revenue patterns, self-serve vs sales-assist routing, and PLG metrics. The product is the primary driver of acquisition, conversion, and expansion — every user interaction is a growth opportunity encoded in code.

---

## Principles

### 1. The PLG Flywheel Is a System, Not a Feature

Product-led growth is not a pricing page or a free tier. It is a self-reinforcing system where product usage drives acquisition (users invite others), conversion (free users hit value thresholds that justify paying), and expansion (paying users discover more value and upgrade). Each stage feeds the next in a loop: more users create more usage, more usage creates more value, more value creates more paying customers, more paying customers invite more users. The flywheel metaphor is precise — it has inertia. It is difficult to start but, once spinning, it compounds.

The flywheel has four stages, and each must be instrumented and optimized independently. **Acquire**: users discover the product through organic channels — referrals, word of mouth, content, SEO, or viral loops built into the product itself (shared documents, public profiles, embedded widgets). **Activate**: new users reach their "aha moment" — the point where they experience the product's core value for the first time. This is the most critical stage because users who do not activate never reach the conversion stage. See the [User-Onboarding guide](../User-Onboarding/user-onboarding.md) for activation patterns. **Convert**: activated users hit a usage gate or see enough value to justify paying. The gate can be a soft limit (degraded experience) or a hard limit (feature blocked). See the [Billing-Monetization guide](../Billing-Monetization/billing-monetization.md) for Stripe implementation details. **Expand**: paying users add seats, upgrade plans, or purchase add-on features. Expansion revenue compounds — a customer who started at $50/month and expanded to $200/month is four customers' worth of revenue acquired once.

From an engineering perspective, the flywheel is a set of interconnected systems: the analytics data layer tracks user behavior across all stages (see [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md)), the onboarding flow drives activation, usage gates trigger conversion, expansion prompts surface at moments of demonstrated value, and referral mechanics close the loop back to acquisition (see [Referral-Viral-Loops](../Referral-Viral-Loops/referral-viral-loops.md)). Building a PLG product means building all of these systems and connecting them through shared event data.

### 2. Zero-Friction Self-Serve Signup Eliminates Every Barrier

The distance between "I want to try this" and "I am using this" must be as close to zero as possible. Every field on a signup form, every confirmation email, every "tell us about your company" screen is a point of friction that kills a percentage of potential users. The goal is not zero friction — some friction is unavoidable (email verification, terms acceptance) — but zero unnecessary friction. If a piece of information is not needed to deliver value in the first session, do not ask for it at signup.

The ideal PLG signup flow is: OAuth (Google/GitHub) click, land in the product with sample data or a guided setup, start using the product immediately. No credit card. No phone number. No company name. No "what brings you here today?" survey. Collect that information later, progressively, as the user engages deeper. The user's first session should be spent experiencing the product, not filling out forms. The onboarding survey can happen after the user has seen value — at that point, they are invested and willing to share context.

From a technical standpoint, self-serve signup means your authentication system, provisioning pipeline, and default state must work without human intervention. The database must seed default resources (sample project, starter template, demo data) automatically on account creation. The application must be usable without billing information — free-tier access is granted implicitly, not by submitting a payment form. Every edge case that would require a support ticket ("I signed up but my workspace wasn't created") is a failure of the self-serve system. Test the signup-to-value path obsessively.

### 3. Freemium Usage Gates — Soft vs Hard Limits

Usage gates are the boundaries between free and paid tiers. They determine when a free user encounters a reason to pay. There are two types, and the choice between them is a strategic decision with significant revenue and retention implications.

**Hard limits** block functionality entirely when the user exceeds the free tier. "You have used 3 of 3 projects. Upgrade to create more." The user cannot proceed without upgrading. Hard limits create a clear conversion trigger — the user needs more, and they must pay to get it. The risk: users who hit a hard limit and are not yet convinced of the product's value will leave instead of upgrading. Hard limits work best for resources that are clearly valued (storage, seats, projects) and when the free tier provides enough runway for users to experience full value before hitting the wall.

**Soft limits** degrade the experience without blocking it. "Export is available on the Pro plan. Your data will include a watermark." or "Free accounts are limited to 100 API calls per hour." The user can still use the product, but the experience is diminished. Soft limits create ongoing friction that incentivizes upgrading without forcing an immediate decision. They work well for quality-of-life features (faster processing, higher resolution, priority support) and when the free tier needs to remain genuinely useful to drive word-of-mouth growth.

The implementation pattern for both types is a middleware-level entitlement check. Every API route and server action that accesses a gated resource should verify the user's plan entitlements before executing. Do not scatter plan checks throughout your UI components — centralize the logic in a service layer that returns a clear verdict: allowed, soft-limited (with degradation details), or blocked (with upgrade context). The UI reads this verdict and renders accordingly. This separation keeps your business logic in one place and makes it trivial to adjust limits without touching dozens of components. The entitlement data itself should be cached aggressively — plan checks happen on nearly every request, and hitting the database each time is wasteful.

### 4. Product-Qualified Leads (PQLs) Over Marketing-Qualified Leads

A marketing-qualified lead (MQL) is someone who downloaded a whitepaper or attended a webinar. A product-qualified lead (PQL) is someone who has used your product enough that their behavior signals buying intent. PQLs convert at 5-10x the rate of MQLs because the signal is behavioral, not aspirational — the user is not saying they are interested, they are demonstrating it through usage.

PQL scoring assigns numeric weights to product usage signals and sums them into a composite score that indicates readiness to buy. High-signal events include: inviting team members (collaboration intent), integrating with external tools (investing in the product's ecosystem), exceeding free-tier limits (demonstrating need), using advanced features (power user behavior), and returning consistently over multiple days (retention signal). Low-signal events include: viewing the pricing page (browsing, not buying), clicking "Learn more" (curiosity, not intent), and signing up (everyone does this). The scoring model should weight high-signal events heavily and low-signal events minimally.

The PQL score drives two systems. First, an automated CRM sync that pushes qualified leads to your sales team's pipeline in Salesforce or HubSpot. The sync should include the user's product usage data (features used, team size, activity frequency) so the sales rep has context for the conversation. Second, in-product upgrade triggers that surface contextual offers when the user's behavior indicates they would benefit from a paid plan. The scoring model is never perfect on day one — iterate on the weights using conversion data. Track which PQL score thresholds actually predict upgrades and adjust accordingly. See [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) for the event tracking that feeds PQL scoring.

### 5. Contextual Upgrade Triggers, Not Spam

Upgrade prompts must appear at the moment the user experiences the value gap between their current plan and the next tier. The moment a user tries to create their fourth project on a three-project free plan is the right time to show an upgrade prompt. A random Tuesday when the user is in the middle of editing a document is the wrong time. Context is everything — an upgrade prompt that appears when the user needs more is helpful. The same prompt appearing when the user does not need more is spam.

Frequency capping prevents upgrade fatigue. A user who dismisses an upgrade prompt should not see the same prompt again for a configurable period — 7 days is a reasonable default for soft prompts, 24 hours for hard-limit blocks. Track prompt impressions and dismissals as events and enforce the cap on the server side or via a client-side cookie. Without capping, aggressive upgrade prompting degrades the user experience and accelerates churn on the free tier — exactly the opposite of the intended effect.

The implementation requires three components. A **trigger registry** that maps usage events to upgrade prompt configurations: "when `projects_count >= plan.maxProjects`, show the project limit prompt." A **frequency cap store** that tracks when each user last saw each prompt type and suppresses prompts within the cooldown window. And a **prompt renderer** that displays the appropriate upgrade UI — inline banners, modals, or toast notifications depending on the severity and context. The trigger registry should be configuration-driven (database or JSON), not hardcoded, so product managers can adjust triggers without engineering deployments. See [Conversion-Optimization](../Conversion-Optimization/conversion-optimization.md) for funnel optimization around these upgrade moments.

### 6. Expansion Revenue Is the Compounding Engine

In a PLG model, the majority of long-term revenue comes not from initial conversions but from expansion — existing customers paying more over time. Expansion revenue has zero acquisition cost. A customer who upgrades from $50/month to $200/month generates $150/month of expansion MRR with no marketing spend, no sales cycle, and no onboarding cost. If your expansion MRR exceeds your churned MRR, you have negative net revenue churn — your existing customer base grows even if you acquire no new customers. This is the defining financial characteristic of the best PLG companies.

There are three primary expansion vectors. **Seat-based expansion**: the product becomes more valuable with more team members, and each seat costs money. The growth loop is: one user joins, invites colleagues, colleagues become active, the team grows, the bill grows. Seat expansion works when the product's value is inherently collaborative. **Usage-based expansion**: the customer's bill grows as they use more of the product — more API calls, more storage, more compute. Usage-based pricing aligns the vendor's revenue with the customer's success. **Feature-based expansion**: higher tiers unlock capabilities that power users need — advanced analytics, SSO, audit logs, custom integrations. Feature expansion works when there is a clear value ladder from individual to team to enterprise needs.

The engineering challenge is building systems that detect expansion opportunities and surface them naturally. Track usage metrics per account in real time — seat count, API call volume, storage consumed, feature adoption. Set thresholds that indicate expansion readiness: "This account has 8 active users but only 5 paid seats" or "This account used 90% of their API quota this month." When a threshold is crossed, trigger the appropriate action: an in-product upgrade prompt for self-serve accounts or a CRM notification for sales-assisted accounts. The key is that expansion should feel like a natural progression, not a sales pitch.

### 7. Self-Serve vs Sales-Assist: Route by Deal Complexity

Not every customer should buy through a self-serve checkout. A solo developer upgrading to a $29/month plan should click "Upgrade," enter a credit card, and be done in 30 seconds. An enterprise team evaluating a $50,000/year contract needs a demo, security review, custom pricing, and a signed MSA. Routing every customer through the same path optimizes for neither.

The routing decision is based on two factors: deal size and deal complexity. Low-value, low-complexity deals (individual plans, small teams, standard pricing) should be fully self-serve. The user upgrades through the product's billing UI, managed by Stripe or a similar payment processor. See [Billing-Monetization](../Billing-Monetization/billing-monetization.md) for Stripe implementation. High-value, high-complexity deals (enterprise contracts, custom pricing, procurement requirements) should be sales-assisted. The product detects signals that indicate enterprise intent — multiple users from the same email domain, requests for SSO or SAML, interest in custom SLAs — and routes these leads to sales.

The middle ground is sales-assist: the user starts self-serve but a sales rep intervenes to accelerate or customize the deal. This works well for mid-market customers ($500-5,000/month) who could self-serve but would convert faster with a guided experience. The implementation is a PQL threshold: when a free or trial user's PQL score exceeds a configurable threshold and their estimated deal size falls in the mid-market range, the system notifies a sales rep and optionally surfaces a "Talk to sales" prompt in the product. The sales rep has full context (product usage data, team size, features explored) and reaches out with a personalized offer rather than a cold pitch.

### 8. PLG Metrics: Measure the Flywheel

PLG requires its own metrics framework because traditional SaaS metrics (MQL volume, sales pipeline, quota attainment) do not capture the product-driven growth loops. The core PLG metrics are:

**Time-to-value (TTV)** measures how quickly a new user reaches their first meaningful outcome. For a project management tool, TTV might be "time from signup to first task completed." For an analytics tool, "time from signup to first dashboard created." Shorter TTV means higher activation rates. Track TTV as the difference between `signup_completed` and `activation_event` timestamps. Benchmark against yourself weekly and optimize relentlessly — every hour you shave off TTV increases the percentage of users who activate before losing interest.

**Product-qualified lead rate** measures the percentage of free users whose usage signals indicate buying intent. PQL rate = (users with PQL score above threshold) / (total active free users). A healthy PQL rate is 15-30% — if it is too low, your free tier may be too generous (users get everything they need for free) or your scoring model is too strict. If it is too high, your free tier may be too restrictive (users hit gates before experiencing value) or your scoring model is too loose.

**Natural rate of growth (NRG)** measures the percentage of revenue that comes from organic, product-driven channels rather than paid marketing or outbound sales. NRG = (organic signups x activation rate x ARPU) / total new ARR. An NRG above 50% indicates that the product itself is the primary growth driver. Below 50%, growth is sales-led or marketing-led, and the PLG flywheel needs work.

**Expansion MRR** measures the revenue gained from existing customers upgrading, adding seats, or increasing usage. Net revenue retention (NRR) = (starting MRR + expansion MRR - churned MRR - contraction MRR) / starting MRR. NRR above 100% means your existing customer base is growing — the holy grail of PLG. Track expansion MRR by source (seat expansion, plan upgrade, usage overage) to understand which expansion vector is strongest. See [Retention-Engagement](../Retention-Engagement/retention-engagement.md) for retention patterns that support expansion.

---

## LLM Instructions

### 1. Building the PLG Flywheel Data Model

When asked to implement a product-led growth system, start by building the data model and entitlement system that powers the entire flywheel.

1. Create a plan definitions table or configuration file (`src/lib/plans/definitions.ts`) that defines every plan tier with its name, price, billing cycle, and entitlements. Entitlements are the specific limits and features for each plan: `maxProjects`, `maxSeats`, `maxStorageMb`, `apiRateLimit`, `features` (array of feature keys). Every gated resource must have a corresponding entitlement field.
2. Create a `subscriptions` table with columns: `id`, `user_id` (or `org_id`), `plan_id`, `status` (active, trialing, canceled, past_due), `stripe_subscription_id`, `current_period_start`, `current_period_end`, `seats_purchased`, `created_at`, `updated_at`. This table is the source of truth for what each account is entitled to.
3. Create a `usage` table with columns: `id`, `org_id`, `metric` (e.g., "projects", "api_calls", "storage_mb"), `value` (current count), `period_start`, `period_end`, `updated_at`. Update this table on every usage-affecting action. Index on `(org_id, metric, period_start)`.
4. Create an entitlements service (`src/lib/entitlements/index.ts`) that takes an `org_id`, looks up their plan and current usage, and returns an entitlement verdict for any gated resource: `{ allowed: true }`, `{ allowed: false, reason: "limit_reached", limit: 3, current: 3, upgradeUrl: "/billing/upgrade" }`, or `{ allowed: true, softLimit: true, message: "..." }`. Every API route and server action calls this service before executing gated operations.
5. Create a React hook (`useEntitlement`) and a server-side helper (`checkEntitlement`) that wrap the entitlements service for use in client and server components respectively. The hook should return the verdict plus a pre-configured upgrade prompt component that can be rendered inline when `allowed` is false.

### 2. Implementing PQL Scoring and CRM Sync

When building a product-qualified lead scoring system, implement event-driven scoring with configurable weights and automated CRM sync.

1. Define a scoring configuration (`src/lib/pql/scoring-config.ts`) that maps product events to point values. High-signal events: `invite_sent` (+15), `integration_connected` (+20), `usage_limit_reached` (+25), `advanced_feature_used` (+10), `daily_active_3_consecutive` (+15). Low-signal events: `pricing_page_viewed` (+3), `signup_completed` (+5), `docs_visited` (+2). Store weights in a database table for runtime adjustment without deploys.
2. Create a `pql_scores` table with columns: `org_id`, `score` (integer), `signals` (JSONB array of contributing events with timestamps), `qualified_at` (timestamp when score first exceeded threshold), `synced_to_crm` (boolean), `updated_at`. Update this table via a database trigger or an event handler that fires after qualifying events are tracked.
3. Implement a background job (cron or event-driven) that recalculates PQL scores periodically. The job reads recent events from the analytics events table, applies the scoring weights, and updates the `pql_scores` table. Use a sliding window (last 30 days) so scores decay naturally when users become inactive.
4. Build a CRM sync worker that pushes newly qualified leads to Salesforce or HubSpot via their REST API. The sync payload should include: contact email, company name (from the org record), PQL score, top contributing signals, current plan, team size, and a link to the user's product usage dashboard. Mark `synced_to_crm = true` after successful push.
5. Create an internal dashboard or admin API endpoint that lists current PQLs, their scores, top signals, and CRM sync status. Include a feedback loop: when a sales rep marks a PQL as "converted" or "not qualified" in the CRM, sync that outcome back to your system and use it to tune scoring weights over time.

### 3. Building Contextual Upgrade Triggers with Frequency Capping

When implementing upgrade prompts, build a trigger system that shows the right prompt at the right time without overwhelming users.

1. Create a trigger registry (`src/lib/upgrade-triggers/registry.ts`) that defines upgrade triggers as objects: `{ id: "project_limit", condition: (usage, plan) => usage.projects >= plan.maxProjects, promptType: "modal" | "banner" | "inline", severity: "hard" | "soft", cooldownDays: 7, message: "..." }`. Each trigger has a unique ID, a condition function, a UI treatment, and a cooldown period.
2. Create a `prompt_impressions` table with columns: `id`, `user_id`, `trigger_id`, `shown_at`, `action` ("dismissed", "clicked_upgrade", "clicked_later"). This table enforces frequency capping and provides analytics on prompt effectiveness.
3. Implement a server-side function (`getActiveUpgradeTriggers(userId)`) that evaluates all triggers against the user's current usage and plan, filters out triggers that are within their cooldown window (based on `prompt_impressions`), and returns the highest-priority active trigger (if any). Priority: hard limits first, then soft limits by recency.
4. Create a client component (`<UpgradePromptProvider>`) that calls the trigger evaluation API on mount and on usage-affecting actions. When a trigger fires, render the appropriate UI treatment (modal, banner, or inline message). Track the impression by writing to `prompt_impressions`.
5. Wire the prompt actions to the billing flow: "Upgrade now" navigates to the plan selection page with the relevant plan pre-selected, "Talk to sales" opens a calendly link or in-app chat with context, "Maybe later" dismisses the prompt and records the cooldown. Every action is tracked as an analytics event for funnel analysis. See [Conversion-Optimization](../Conversion-Optimization/conversion-optimization.md) for optimizing these conversion funnels.

### 4. Implementing the Self-Serve to Sales-Assist Router

When building a system that routes users to the appropriate buying experience, implement signal-based routing with configurable thresholds.

1. Define routing rules in configuration (`src/lib/routing/rules.ts`): self-serve criteria (individual accounts, < 5 seats, standard plans), sales-assist criteria (PQL score > threshold, 5-50 seats, mid-market plans), enterprise criteria (> 50 seats, SSO requested, same-domain team > 10 users, custom pricing requested). Each rule maps to a buying experience.
2. Create a route evaluation function (`getBuyingRoute(orgId)`) that checks the org's attributes and usage against the routing rules and returns the recommended path: `"self-serve"` (show checkout UI), `"sales-assist"` (show checkout with optional "Talk to sales" CTA), or `"enterprise"` (show "Contact sales" with custom demo scheduling).
3. Integrate the router into the pricing page and upgrade prompts. When a user clicks "Upgrade," call `getBuyingRoute()` and render the appropriate experience. For self-serve, redirect to the Stripe checkout. For sales-assist, show the checkout with a persistent "Need help? Talk to sales" banner. For enterprise, show a contact form that creates a deal in the CRM.
4. When routing to sales-assist or enterprise, fire a CRM notification that includes the org's product usage summary, team size, current plan, PQL score, and the specific upgrade trigger that initiated the conversation. The sales rep should never ask "So what brings you here?" — they should already know.
5. Track routing decisions and outcomes as events: `buying_route_assigned`, `checkout_started`, `sales_meeting_booked`, `deal_closed`. Build a dashboard that shows conversion rates by route to validate that the routing thresholds are set correctly. Adjust thresholds quarterly based on conversion data.

### 5. Building the PLG Metrics Dashboard

When implementing PLG-specific metrics, compute them from raw product and billing data and surface them in an internal dashboard.

1. Compute time-to-value (TTV) as a SQL query: join the `signup_completed` event timestamp with the first occurrence of the activation event, grouped by signup cohort (week). Report the median TTV per cohort and the percentage of users who activated within 1 hour, 24 hours, and 7 days. Set a target TTV and alert when the median exceeds it.
2. Compute PQL rate from the `pql_scores` table: `COUNT(score > threshold) / COUNT(active_free_users)` per week. Segment by acquisition source (organic, referral, paid) to identify which channels produce the most qualified users.
3. Compute natural rate of growth: `(organic_signups * activation_rate * avg_arpu) / total_new_arr`. Pull organic signups from the events table (users without paid UTM attribution), activation rate from the funnel query, ARPU from the billing system, and total new ARR from Stripe.
4. Compute expansion MRR from Stripe subscription data or your billing table: sum of all subscription amount increases in the period, broken down by expansion type (seat addition, plan upgrade, usage overage). Compute net revenue retention (NRR) monthly: `(starting_mrr + expansion_mrr - churn_mrr - contraction_mrr) / starting_mrr`.
5. Surface all metrics in an internal admin dashboard with weekly trend charts. Include the four core PLG metrics (TTV, PQL rate, NRG, expansion MRR/NRR) plus supporting metrics: free-to-paid conversion rate, self-serve vs sales-assist conversion rate, upgrade prompt click-through rate, and seat expansion rate. See [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) for the underlying event tracking infrastructure.

---

## Examples

### 1. Entitlements Service with Soft and Hard Limits

```typescript
// src/lib/plans/definitions.ts
export interface PlanEntitlements {
  maxProjects: number;
  maxSeats: number;
  maxStorageMb: number;
  apiRateLimit: number; // requests per hour
  features: string[];
}

export const plans: Record<string, PlanEntitlements> = {
  free: {
    maxProjects: 3,
    maxSeats: 1,
    maxStorageMb: 500,
    apiRateLimit: 100,
    features: ["basic_analytics", "email_support"],
  },
  pro: {
    maxProjects: 25,
    maxSeats: 10,
    maxStorageMb: 10_000,
    apiRateLimit: 5_000,
    features: [
      "basic_analytics",
      "advanced_analytics",
      "custom_domains",
      "priority_support",
      "api_access",
    ],
  },
  business: {
    maxProjects: -1, // unlimited
    maxSeats: 50,
    maxStorageMb: 100_000,
    apiRateLimit: 50_000,
    features: [
      "basic_analytics",
      "advanced_analytics",
      "custom_domains",
      "priority_support",
      "api_access",
      "sso",
      "audit_log",
      "custom_roles",
    ],
  },
};

// src/lib/entitlements/index.ts
import { db } from "@/lib/db";
import { plans, type PlanEntitlements } from "@/lib/plans/definitions";

export type EntitlementVerdict =
  | { allowed: true; softLimit?: false }
  | { allowed: true; softLimit: true; message: string; percentUsed: number }
  | {
      allowed: false;
      reason: "limit_reached" | "feature_unavailable";
      limit?: number;
      current?: number;
      requiredPlan: string;
    };

type UsageMetric = "projects" | "seats" | "storage_mb" | "api_calls";

async function getOrgUsage(
  orgId: string,
  metric: UsageMetric
): Promise<number> {
  const row = await db.usage.findFirst({
    where: { orgId, metric },
    orderBy: { periodStart: "desc" },
  });
  return row?.value ?? 0;
}

async function getOrgPlan(orgId: string): Promise<string> {
  const sub = await db.subscription.findFirst({
    where: { orgId, status: { in: ["active", "trialing"] } },
  });
  return sub?.planId ?? "free";
}

export async function checkEntitlement(
  orgId: string,
  resource: UsageMetric
): Promise<EntitlementVerdict> {
  const [planId, currentUsage] = await Promise.all([
    getOrgPlan(orgId),
    getOrgUsage(orgId, resource),
  ]);

  const entitlements = plans[planId];
  if (!entitlements) {
    return { allowed: false, reason: "limit_reached", requiredPlan: "pro" };
  }

  const limitMap: Record<UsageMetric, number> = {
    projects: entitlements.maxProjects,
    seats: entitlements.maxSeats,
    storage_mb: entitlements.maxStorageMb,
    api_calls: entitlements.apiRateLimit,
  };

  const limit = limitMap[resource];

  // Unlimited
  if (limit === -1) {
    return { allowed: true };
  }

  // Hard limit reached
  if (currentUsage >= limit) {
    const nextPlan =
      planId === "free" ? "pro" : planId === "pro" ? "business" : "enterprise";
    return {
      allowed: false,
      reason: "limit_reached",
      limit,
      current: currentUsage,
      requiredPlan: nextPlan,
    };
  }

  // Soft limit warning at 80%
  const percentUsed = (currentUsage / limit) * 100;
  if (percentUsed >= 80) {
    return {
      allowed: true,
      softLimit: true,
      message: `You've used ${currentUsage} of ${limit} ${resource}. Consider upgrading for more capacity.`,
      percentUsed,
    };
  }

  return { allowed: true };
}

export async function checkFeature(
  orgId: string,
  feature: string
): Promise<EntitlementVerdict> {
  const planId = await getOrgPlan(orgId);
  const entitlements = plans[planId];

  if (entitlements?.features.includes(feature)) {
    return { allowed: true };
  }

  // Find the lowest plan that includes this feature
  const requiredPlan =
    Object.entries(plans).find(([_, p]) =>
      p.features.includes(feature)
    )?.[0] ?? "business";

  return {
    allowed: false,
    reason: "feature_unavailable",
    requiredPlan,
  };
}

// src/lib/entitlements/middleware.ts — wraps server actions with plan checks
import { checkEntitlement } from "@/lib/entitlements";
import { getOrgId } from "@/lib/auth";

export async function withEntitlement(
  resource: "projects" | "seats" | "storage_mb" | "api_calls",
  action: () => Promise<unknown>
) {
  const orgId = await getOrgId();
  const verdict = await checkEntitlement(orgId, resource);
  if (!verdict.allowed) {
    return { error: "upgrade_required", ...verdict };
  }
  return action();
}

// Usage in a server action — src/app/actions/create-project.ts
"use server";
import { withEntitlement } from "@/lib/entitlements/middleware";
import { db } from "@/lib/db";
import { trackServerEvent } from "@/lib/analytics/server";
import { getOrgId, getUserId } from "@/lib/auth";

export async function createProject(formData: FormData) {
  return withEntitlement("projects", async () => {
    const [orgId, userId] = await Promise.all([getOrgId(), getUserId()]);
    const name = formData.get("name") as string;

    const project = await db.project.create({
      data: { name, orgId, createdBy: userId },
    });
    await db.usage.upsert({
      where: { orgId_metric: { orgId, metric: "projects" } },
      update: { value: { increment: 1 } },
      create: { orgId, metric: "projects", value: 1 },
    });
    trackServerEvent(userId, "project_created", { projectId: project.id, orgId });
    return { success: true, project };
  });
}
```

### 2. PQL Scoring Engine with CRM Sync

```typescript
// src/lib/pql/scoring-config.ts
export interface ScoringSignal {
  event: string;
  points: number;
  maxPerPeriod: number; // cap repeated events
  description: string;
}

export const scoringSignals: ScoringSignal[] = [
  {
    event: "invite_sent",
    points: 15,
    maxPerPeriod: 3,
    description: "Invited a team member",
  },
  {
    event: "integration_connected",
    points: 20,
    maxPerPeriod: 5,
    description: "Connected an integration",
  },
  {
    event: "usage_limit_reached",
    points: 25,
    maxPerPeriod: 1,
    description: "Hit a usage limit",
  },
  {
    event: "advanced_feature_used",
    points: 10,
    maxPerPeriod: 3,
    description: "Used an advanced feature",
  },
  {
    event: "project_created",
    points: 5,
    maxPerPeriod: 5,
    description: "Created a project",
  },
  {
    event: "pricing_page_viewed",
    points: 3,
    maxPerPeriod: 1,
    description: "Viewed pricing page",
  },
  {
    event: "signup_completed",
    points: 5,
    maxPerPeriod: 1,
    description: "Completed signup",
  },
];

export const PQL_THRESHOLD = 50;

// src/lib/pql/score-calculator.ts
import { db } from "@/lib/db";
import { scoringSignals, PQL_THRESHOLD } from "./scoring-config";

interface PQLResult {
  orgId: string;
  score: number;
  signals: Array<{
    event: string;
    count: number;
    points: number;
    description: string;
  }>;
  qualified: boolean;
}

export async function calculatePQLScore(orgId: string): Promise<PQLResult> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all qualifying events for this org in the scoring window
  const eventCounts = await db.$queryRaw<
    Array<{ event_name: string; event_count: number }>
  >`
    SELECT
      e.event_name,
      COUNT(*)::int AS event_count
    FROM events e
    INNER JOIN users u ON e.user_id = u.id
    WHERE u.org_id = ${orgId}
      AND e.event_name IN (${scoringSignals.map((s) => s.event).join(",")})
      AND e.timestamp >= ${thirtyDaysAgo}
    GROUP BY e.event_name
  `;

  const eventMap = new Map(
    eventCounts.map((r) => [r.event_name, r.event_count])
  );

  let totalScore = 0;
  const signals: PQLResult["signals"] = [];

  for (const signal of scoringSignals) {
    const rawCount = eventMap.get(signal.event) ?? 0;
    const cappedCount = Math.min(rawCount, signal.maxPerPeriod);
    const points = cappedCount * signal.points;

    if (points > 0) {
      totalScore += points;
      signals.push({
        event: signal.event,
        count: cappedCount,
        points,
        description: signal.description,
      });
    }
  }

  // Check for consecutive daily activity bonus
  const activeDays = await db.$queryRaw<Array<{ active_days: number }>>`
    SELECT COUNT(DISTINCT DATE(e.timestamp))::int AS active_days
    FROM events e
    INNER JOIN users u ON e.user_id = u.id
    WHERE u.org_id = ${orgId}
      AND e.timestamp >= ${thirtyDaysAgo}
  `;

  if (activeDays[0]?.active_days >= 7) {
    totalScore += 15;
    signals.push({
      event: "weekly_active",
      count: activeDays[0].active_days,
      points: 15,
      description: "Active 7+ days in last 30 days",
    });
  }

  const qualified = totalScore >= PQL_THRESHOLD;

  // Persist the score
  await db.pqlScore.upsert({
    where: { orgId },
    update: {
      score: totalScore,
      signals: JSON.stringify(signals),
      qualifiedAt: qualified ? new Date() : null,
      updatedAt: new Date(),
    },
    create: {
      orgId,
      score: totalScore,
      signals: JSON.stringify(signals),
      qualifiedAt: qualified ? new Date() : null,
    },
  });

  return { orgId, score: totalScore, signals, qualified };
}

// src/lib/pql/crm-sync.ts
import { db } from "@/lib/db";
import { PQL_THRESHOLD } from "./scoring-config";

async function pushToHubSpot(
  email: string,
  properties: Record<string, string | number>
): Promise<void> {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: { email, ...properties } }),
  });
  // If contact already exists, update instead
  if (res.status === 409) {
    await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${email}?idProperty=email`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties }),
      }
    );
  } else if (!res.ok) {
    throw new Error(`HubSpot sync failed: ${res.status}`);
  }
}

export async function syncPQLsToHubSpot() {
  const unsynced = await db.pqlScore.findMany({
    where: { score: { gte: PQL_THRESHOLD }, syncedToCrm: false },
    include: {
      org: {
        include: {
          owner: { select: { email: true, name: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  let synced = 0;
  let errors = 0;

  for (const pql of unsynced) {
    try {
      const signals = JSON.parse(pql.signals as string);
      const topSignals = signals
        .sort((a: { points: number }, b: { points: number }) => b.points - a.points)
        .slice(0, 3)
        .map((s: { description: string }) => s.description)
        .join("; ");

      await pushToHubSpot(pql.org.owner.email, {
        pql_score: pql.score,
        pql_top_signals: topSignals,
        company: pql.org.name,
        team_size: pql.org._count.members,
        product_plan: "free",
        pql_qualified_date: pql.qualifiedAt?.toISOString() ?? "",
        lifecyclestage: "salesqualifiedlead",
      });

      await db.pqlScore.update({
        where: { orgId: pql.orgId },
        data: { syncedToCrm: true },
      });
      synced++;
    } catch (err) {
      console.error(`Failed to sync PQL for org ${pql.orgId}:`, err);
      errors++;
    }
  }
  return { synced, errors };
}
```

### 3. Contextual Upgrade Triggers with Frequency Capping

```typescript
// src/lib/upgrade-triggers/registry.ts
import type { PlanEntitlements } from "@/lib/plans/definitions";

interface UsageSnapshot {
  projects: number;
  seats: number;
  storageMb: number;
  apiCalls: number;
}

export interface UpgradeTrigger {
  id: string;
  condition: (usage: UsageSnapshot, plan: PlanEntitlements) => boolean;
  promptType: "modal" | "banner" | "inline";
  severity: "hard" | "soft";
  cooldownDays: number;
  title: string;
  message: string;
  ctaText: string;
  recommendedPlan: string;
}

export const upgradeTriggers: UpgradeTrigger[] = [
  {
    id: "project_limit_hard",
    condition: (usage, plan) =>
      plan.maxProjects !== -1 && usage.projects >= plan.maxProjects,
    promptType: "modal",
    severity: "hard",
    cooldownDays: 1,
    title: "Project limit reached",
    message:
      "You've used all {limit} projects on your current plan. Upgrade to create unlimited projects.",
    ctaText: "Upgrade to Pro",
    recommendedPlan: "pro",
  },
  {
    id: "project_limit_soft",
    condition: (usage, plan) =>
      plan.maxProjects !== -1 &&
      usage.projects >= Math.floor(plan.maxProjects * 0.8) &&
      usage.projects < plan.maxProjects,
    promptType: "banner",
    severity: "soft",
    cooldownDays: 7,
    title: "Running low on projects",
    message:
      "You've used {current} of {limit} projects. Upgrade for more capacity.",
    ctaText: "View plans",
    recommendedPlan: "pro",
  },
  {
    id: "seat_limit_hard",
    condition: (usage, plan) => usage.seats >= plan.maxSeats,
    promptType: "modal",
    severity: "hard",
    cooldownDays: 1,
    title: "Seat limit reached",
    message:
      "Your team has filled all {limit} seats. Upgrade to add more members.",
    ctaText: "Add more seats",
    recommendedPlan: "pro",
  },
  {
    id: "api_rate_soft",
    condition: (usage, plan) => usage.apiCalls >= plan.apiRateLimit * 0.9,
    promptType: "banner",
    severity: "soft",
    cooldownDays: 3,
    title: "Approaching API limit",
    message:
      "You've used {current} of {limit} API calls this period. Upgrade to avoid rate limiting.",
    ctaText: "Increase limits",
    recommendedPlan: "pro",
  },
];

// src/lib/upgrade-triggers/evaluator.ts
import { db } from "@/lib/db";
import { upgradeTriggers, type UpgradeTrigger } from "./registry";
import { plans } from "@/lib/plans/definitions";

interface ActiveTrigger extends UpgradeTrigger {
  interpolatedMessage: string;
}

export async function getActiveUpgradeTrigger(
  userId: string,
  orgId: string
): Promise<ActiveTrigger | null> {
  const sub = await db.subscription.findFirst({
    where: { orgId, status: { in: ["active", "trialing"] } },
  });
  const planId = sub?.planId ?? "free";
  const plan = plans[planId];
  if (!plan) return null;

  const usageRows = await db.usage.findMany({ where: { orgId } });
  const usage = {
    projects: usageRows.find((r) => r.metric === "projects")?.value ?? 0,
    seats: usageRows.find((r) => r.metric === "seats")?.value ?? 0,
    storageMb: usageRows.find((r) => r.metric === "storage_mb")?.value ?? 0,
    apiCalls: usageRows.find((r) => r.metric === "api_calls")?.value ?? 0,
  };

  // Map trigger IDs to the usage metric they reference
  const impressions = await db.promptImpression.findMany({ where: { userId } });
  const lastShownMap = new Map(impressions.map((i) => [i.triggerId, i.shownAt]));

  // Evaluate in priority order: hard limits first
  const sorted = [...upgradeTriggers].sort((a, b) =>
    a.severity === "hard" && b.severity !== "hard" ? -1 :
    b.severity === "hard" && a.severity !== "hard" ? 1 : 0
  );

  for (const trigger of sorted) {
    if (!trigger.condition(usage, plan)) continue;

    // Enforce cooldown
    const lastShown = lastShownMap.get(trigger.id);
    if (lastShown) {
      const cooldownMs = trigger.cooldownDays * 24 * 60 * 60 * 1000;
      if (Date.now() - lastShown.getTime() < cooldownMs) continue;
    }

    const metricKey = trigger.id.startsWith("api") ? "api_calls"
      : trigger.id.startsWith("seat") ? "seats" : "projects";
    const current = usage[metricKey as keyof typeof usage];
    const limitMap = { projects: plan.maxProjects, seats: plan.maxSeats,
      storage_mb: plan.maxStorageMb, api_calls: plan.apiRateLimit };

    return {
      ...trigger,
      interpolatedMessage: trigger.message
        .replace("{current}", String(current))
        .replace("{limit}", String(limitMap[metricKey as keyof typeof limitMap])),
    };
  }
  return null;
}

// src/components/upgrade-prompt-provider.tsx
"use client";
import { useEffect, useState } from "react";
import { analytics } from "@/lib/analytics";

interface TriggerData {
  id: string;
  promptType: "modal" | "banner" | "inline";
  severity: "hard" | "soft";
  title: string;
  interpolatedMessage: string;
  ctaText: string;
  recommendedPlan: string;
}

export function UpgradePromptProvider({ children }: { children: React.ReactNode }) {
  const [trigger, setTrigger] = useState<TriggerData | null>(null);

  useEffect(() => {
    fetch("/api/upgrade-triggers/check").then(async (res) => {
      if (!res.ok) return;
      const { trigger } = await res.json();
      if (trigger) {
        setTrigger(trigger);
        analytics.track("upgrade_prompt_shown", {
          trigger_id: trigger.id, severity: trigger.severity, source: window.location.pathname,
        });
      }
    });
  }, []);

  async function handleAction(action: "dismissed" | "clicked_upgrade") {
    if (!trigger) return;
    await fetch("/api/upgrade-triggers/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerId: trigger.id, action }),
    });
    analytics.track("upgrade_prompt_acted", { trigger_id: trigger.id, action });
    if (action === "clicked_upgrade") {
      window.location.href = `/billing/upgrade?plan=${trigger.recommendedPlan}`;
    }
    setTrigger(null);
  }

  return (
    <>
      {children}
      {trigger?.promptType === "banner" && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 p-4 flex items-center justify-between z-50">
          <div>
            <p className="font-medium text-amber-900">{trigger.title}</p>
            <p className="text-sm text-amber-700">{trigger.interpolatedMessage}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleAction("dismissed")} className="px-3 py-1.5 text-sm text-amber-700">Maybe later</button>
            <button onClick={() => handleAction("clicked_upgrade")} className="px-4 py-1.5 text-sm bg-amber-600 text-white rounded-md">{trigger.ctaText}</button>
          </div>
        </div>
      )}
      {trigger?.promptType === "modal" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold">{trigger.title}</h3>
            <p className="mt-2 text-gray-600">{trigger.interpolatedMessage}</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => handleAction("dismissed")} className="px-4 py-2 text-sm text-gray-600">Maybe later</button>
              <button onClick={() => handleAction("clicked_upgrade")} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md">{trigger.ctaText}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

### 4. PLG Metrics SQL Queries

```sql
-- Time-to-value by signup cohort (weekly)
WITH signups AS (
  SELECT user_id, MIN(timestamp) AS signup_at,
    DATE_TRUNC('week', MIN(timestamp)) AS cohort_week
  FROM events
  WHERE event_name = 'signup_completed'
    AND timestamp >= NOW() - INTERVAL '12 weeks'
  GROUP BY user_id
),
activations AS (
  SELECT e.user_id, MIN(e.timestamp) AS activated_at
  FROM events e
  INNER JOIN signups s ON e.user_id = s.user_id
  WHERE e.event_name = 'onboarding_completed'
    AND e.timestamp > s.signup_at
    AND e.timestamp <= s.signup_at + INTERVAL '30 days'
  GROUP BY e.user_id
),
ttv AS (
  SELECT s.cohort_week, s.user_id,
    EXTRACT(EPOCH FROM (a.activated_at - s.signup_at)) / 3600.0 AS hours_to_value
  FROM signups s INNER JOIN activations a ON s.user_id = a.user_id
)
SELECT cohort_week,
  COUNT(*) AS activated_users,
  (SELECT COUNT(*) FROM signups s2 WHERE s2.cohort_week = ttv.cohort_week) AS total_signups,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours_to_value)::numeric, 1) AS median_ttv_hours,
  ROUND(COUNT(*) FILTER (WHERE hours_to_value <= 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS pct_within_1hr,
  ROUND(COUNT(*) FILTER (WHERE hours_to_value <= 24)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS pct_within_24hr
FROM ttv GROUP BY cohort_week ORDER BY cohort_week DESC;

-- PQL conversion funnel: qualified leads → upgrade → expansion
WITH pql_qualified AS (
  SELECT org_id, score, qualified_at,
    DATE_TRUNC('week', qualified_at) AS qualified_week
  FROM pql_scores
  WHERE qualified_at IS NOT NULL AND qualified_at >= NOW() - INTERVAL '12 weeks'
),
upgraded AS (
  SELECT DISTINCT s.org_id, MIN(s.created_at) AS upgraded_at
  FROM subscriptions s INNER JOIN pql_qualified pq ON s.org_id = pq.org_id
  WHERE s.plan_id != 'free' AND s.created_at > pq.qualified_at
  GROUP BY s.org_id
),
expanded AS (
  SELECT DISTINCT e.properties->>'org_id' AS org_id
  FROM events e INNER JOIN upgraded u ON (e.properties->>'org_id') = u.org_id
  WHERE e.event_name IN ('plan_upgraded', 'seat_added') AND e.timestamp > u.upgraded_at
)
SELECT pq.qualified_week,
  COUNT(DISTINCT pq.org_id) AS total_pqls,
  COUNT(DISTINCT u.org_id) AS converted,
  ROUND(COUNT(DISTINCT u.org_id)::numeric / NULLIF(COUNT(DISTINCT pq.org_id), 0) * 100, 1) AS pql_conversion_pct,
  COUNT(DISTINCT ex.org_id) AS expanded,
  ROUND(COUNT(DISTINCT ex.org_id)::numeric / NULLIF(COUNT(DISTINCT u.org_id), 0) * 100, 1) AS expansion_rate_pct
FROM pql_qualified pq
LEFT JOIN upgraded u ON pq.org_id = u.org_id
LEFT JOIN expanded ex ON pq.org_id = ex.org_id
GROUP BY pq.qualified_week ORDER BY pq.qualified_week DESC;

-- Net revenue retention (NRR) by month
WITH monthly_mrr AS (
  SELECT DATE_TRUNC('month', period_start) AS month, org_id,
    SUM(amount_cents) / 100.0 AS mrr
  FROM subscription_periods WHERE status = 'active'
  GROUP BY DATE_TRUNC('month', period_start), org_id
),
mrr_changes AS (
  SELECT curr.month,
    SUM(CASE WHEN prev.org_id IS NULL THEN curr.mrr ELSE 0 END) AS new_mrr,
    SUM(CASE WHEN prev.org_id IS NOT NULL AND curr.mrr > prev.mrr THEN curr.mrr - prev.mrr ELSE 0 END) AS expansion_mrr,
    SUM(CASE WHEN prev.org_id IS NOT NULL AND curr.mrr < prev.mrr THEN prev.mrr - curr.mrr ELSE 0 END) AS contraction_mrr,
    SUM(CASE WHEN curr_next.org_id IS NULL AND curr.mrr > 0 THEN curr.mrr ELSE 0 END) AS churned_mrr
  FROM monthly_mrr curr
  LEFT JOIN monthly_mrr prev ON curr.org_id = prev.org_id AND prev.month = curr.month - INTERVAL '1 month'
  LEFT JOIN monthly_mrr curr_next ON curr.org_id = curr_next.org_id AND curr_next.month = curr.month + INTERVAL '1 month'
  GROUP BY curr.month
)
SELECT month, ROUND(new_mrr, 2) AS new_mrr, ROUND(expansion_mrr, 2) AS expansion_mrr,
  ROUND(contraction_mrr, 2) AS contraction_mrr, ROUND(churned_mrr, 2) AS churned_mrr
FROM mrr_changes WHERE month >= NOW() - INTERVAL '12 months' ORDER BY month DESC;

-- Expansion MRR breakdown by type
SELECT DATE_TRUNC('month', e.timestamp) AS month,
  CASE WHEN e.event_name = 'seat_added' THEN 'seat_expansion'
       WHEN e.event_name = 'plan_upgraded' THEN 'plan_upgrade'
       WHEN e.event_name = 'usage_overage_charged' THEN 'usage_overage'
  END AS expansion_type,
  COUNT(DISTINCT e.properties->>'org_id') AS orgs,
  SUM((e.properties->>'amount_cents')::int) / 100.0 AS expansion_revenue
FROM events e
WHERE e.event_name IN ('seat_added', 'plan_upgraded', 'usage_overage_charged')
  AND e.timestamp >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', e.timestamp), expansion_type
ORDER BY month DESC, expansion_revenue DESC;
```

### 5. Self-Serve to Sales-Assist Router

```typescript
// src/lib/routing/rules.ts
export type BuyingRoute = "self-serve" | "sales-assist" | "enterprise";

interface RoutingSignals {
  seatCount: number;
  pqlScore: number;
  sameEmailDomainUsers: number;
  requestedSso: boolean;
  requestedCustomPricing: boolean;
  estimatedAcv: number; // annual contract value in dollars
}

interface RoutingRule {
  route: BuyingRoute;
  priority: number; // lower = higher priority
  condition: (signals: RoutingSignals) => boolean;
}

const routingRules: RoutingRule[] = [
  {
    route: "enterprise",
    priority: 1,
    condition: (s) =>
      s.seatCount > 50 ||
      s.requestedSso ||
      s.requestedCustomPricing ||
      s.sameEmailDomainUsers > 10 ||
      s.estimatedAcv > 50_000,
  },
  {
    route: "sales-assist",
    priority: 2,
    condition: (s) =>
      (s.seatCount >= 5 && s.seatCount <= 50) ||
      (s.pqlScore > 75 && s.estimatedAcv > 5_000) ||
      s.sameEmailDomainUsers > 5,
  },
  {
    route: "self-serve",
    priority: 3,
    condition: () => true, // default fallback
  },
];

export function evaluateRoute(signals: RoutingSignals): BuyingRoute {
  const sorted = [...routingRules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (rule.condition(signals)) {
      return rule.route;
    }
  }
  return "self-serve";
}

// src/lib/routing/evaluate.ts
import { db } from "@/lib/db";
import { evaluateRoute, type BuyingRoute } from "./rules";
import { trackServerEvent } from "@/lib/analytics/server";

export async function getBuyingRoute(orgId: string) {
  const org = await db.org.findUniqueOrThrow({
    where: { id: orgId },
    include: { members: true, owner: true, subscription: true, pqlScore: true },
  });

  const ownerDomain = org.owner.email.split("@")[1];
  const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
  const sameEmailDomainUsers = personalDomains.includes(ownerDomain) ? 0
    : await db.user.count({ where: { email: { endsWith: `@${ownerDomain}` } } });

  const enterpriseRequests = await db.featureRequest.count({
    where: { orgId, feature: { in: ["sso", "saml", "custom_pricing", "sla"] } },
  });

  const seatCount = org.members.length;
  const planPrices: Record<string, number> = { free: 0, pro: 29, business: 99 };
  const estimatedAcv = (planPrices[org.subscription?.planId ?? "free"] ?? 29) * seatCount * 12;

  const signals = {
    seatCount, pqlScore: org.pqlScore?.score ?? 0, sameEmailDomainUsers,
    requestedSso: enterpriseRequests > 0, requestedCustomPricing: false, estimatedAcv,
  };
  const route = evaluateRoute(signals);

  trackServerEvent(org.owner.id, "buying_route_assigned", {
    orgId, route, seatCount, pqlScore: signals.pqlScore, estimatedAcv,
  });

  return { route, signals };
}

// src/app/api/upgrade/route.ts
import { NextResponse } from "next/server";
import { getBuyingRoute } from "@/lib/routing/evaluate";
import { getOrgId } from "@/lib/auth";

export async function GET() {
  const orgId = await getOrgId();
  const { route, signals } = await getBuyingRoute(orgId);

  return NextResponse.json({ route, signals });
}

// src/app/billing/upgrade/page.tsx
import { getBuyingRoute } from "@/lib/routing/evaluate";
import { getOrgId } from "@/lib/auth";
import { SelfServeCheckout } from "@/components/billing/self-serve-checkout";
import { SalesAssistCheckout } from "@/components/billing/sales-assist-checkout";
import { EnterpriseContact } from "@/components/billing/enterprise-contact";

export default async function UpgradePage() {
  const orgId = await getOrgId();
  const { route, signals } = await getBuyingRoute(orgId);

  switch (route) {
    case "self-serve":
      return <SelfServeCheckout />;
    case "sales-assist":
      return (
        <SalesAssistCheckout
          showSalesCtaAfterSeconds={10}
          context={{
            seatCount: signals.seatCount,
            estimatedAcv: signals.estimatedAcv,
          }}
        />
      );
    case "enterprise":
      return (
        <EnterpriseContact
          prefilledSeats={signals.seatCount}
          pqlScore={signals.pqlScore}
        />
      );
  }
}
```

---

## Common Mistakes

### 1. Gating Features Before Users Experience Value

**Wrong:** Blocking core functionality on the free tier so aggressively that users never reach the "aha moment." If users cannot experience the product's value before hitting a paywall, they leave instead of upgrading.

```typescript
// User signs up, immediately hits a wall
export async function createProject(data: ProjectData) {
  const plan = await getUserPlan(data.userId);
  if (plan === "free") {
    throw new Error("Projects require a paid plan");
  }
  // Free users can never do anything useful
}
```

**Fix:** Allow free users to complete the core workflow at least once. Gate on volume (3 projects, not 0), not on access. The free tier must deliver genuine value so users understand what they are paying to expand.

```typescript
export async function createProject(data: ProjectData) {
  const verdict = await checkEntitlement(data.orgId, "projects");
  if (!verdict.allowed) {
    return {
      error: "upgrade_required",
      limit: verdict.limit,       // e.g., 3
      current: verdict.current,   // e.g., 3
      requiredPlan: verdict.requiredPlan,
    };
  }
  return db.project.create({ data });
}
```

### 2. Hardcoding Plan Checks Throughout the Codebase

**Wrong:** Scattering `if (plan === "free")` checks across dozens of components, API routes, and server actions. When you add a new plan or change entitlements, you must find and update every check.

```typescript
// Scattered across 30+ files
if (user.plan === "free") {
  return <UpgradePrompt />;
}
if (user.plan !== "enterprise") {
  throw new Error("SSO requires Enterprise");
}
```

**Fix:** Centralize all plan logic in an entitlements service. Components and API routes call `checkEntitlement()` or `checkFeature()` and receive a verdict object. Plan logic changes in one file.

```typescript
const verdict = await checkFeature(orgId, "sso");
if (!verdict.allowed) {
  return <UpgradePrompt requiredPlan={verdict.requiredPlan} />;
}
```

### 3. No Frequency Capping on Upgrade Prompts

**Wrong:** Showing an upgrade modal every time the user performs an action near a limit. The user dismisses the modal 10 times per session and grows to resent the product.

```typescript
// Fires on every action — user sees this constantly
if (usage.projects >= plan.maxProjects * 0.8) {
  showUpgradeModal(); // no tracking, no cooldown
}
```

**Fix:** Track prompt impressions in a database table and enforce cooldown periods. Soft prompts: 7-day cooldown after dismissal. Hard limit modals: 24-hour cooldown. Never show more than one upgrade prompt per session unless the user hits a hard limit.

```typescript
const trigger = await getActiveUpgradeTrigger(userId, orgId);
// Returns null if all matching triggers are within cooldown
if (trigger) {
  await recordImpression(userId, trigger.id);
  showUpgradePrompt(trigger);
}
```

### 4. PQL Scoring Without Decay or Caps

**Wrong:** Accumulating PQL points indefinitely. A user who was very active 6 months ago but has not logged in for 3 months still has a high PQL score — the sales team wastes time contacting inactive users.

```typescript
// Score only goes up, never down
async function updatePQLScore(orgId: string, event: string) {
  const points = scoringMap[event] ?? 0;
  await db.pqlScore.update({
    where: { orgId },
    data: { score: { increment: points } },
  });
}
```

**Fix:** Use a sliding window for PQL scoring (last 30 days). Only count events within the window, so scores naturally decay when users become inactive. Cap repeated events to prevent gaming (e.g., max 3 `invite_sent` events count per period).

```typescript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const events = await db.event.findMany({
  where: { orgId, timestamp: { gte: thirtyDaysAgo } },
});
// Recalculate from scratch using only recent events with caps
```

### 5. Treating All Customers the Same in the Upgrade Flow

**Wrong:** Routing every user to the same Stripe checkout page regardless of deal size, team size, or complexity. Enterprise buyers who need invoicing, procurement, and security review abandon the self-serve checkout. Solo developers who want a quick upgrade get routed to a "Contact sales" form and never hear back.

**Fix:** Implement signal-based routing. Evaluate team size, PQL score, estimated ACV, and enterprise signals (SSO requests, same-domain users) to route users to the appropriate buying experience: self-serve checkout, sales-assisted checkout, or enterprise contact form.

### 6. Not Tracking Expansion Revenue Separately

**Wrong:** Lumping all revenue together as "MRR" without distinguishing between new revenue and expansion revenue. You cannot tell whether growth is coming from new customers or existing customers paying more. You cannot calculate net revenue retention.

```sql
-- All revenue in one bucket — useless for PLG analysis
SELECT SUM(amount_cents) / 100 AS total_mrr
FROM subscriptions
WHERE status = 'active';
```

**Fix:** Track revenue changes by type: new MRR (first subscription), expansion MRR (upgrades, seat additions), contraction MRR (downgrades), and churned MRR (cancellations). Calculate NRR monthly to understand whether your existing customer base is growing.

```sql
SELECT
  expansion_type,
  SUM(delta_cents) / 100.0 AS expansion_mrr
FROM subscription_changes
WHERE change_type = 'expansion'
  AND changed_at >= DATE_TRUNC('month', NOW())
GROUP BY expansion_type;
```

### 7. Building Usage Gates on the Client Side Only

**Wrong:** Checking plan limits in React components but not on the server. Users can bypass client-side gates by calling your API directly, using the browser console, or disabling JavaScript.

```typescript
// Client-side only — trivially bypassed
function CreateProjectButton() {
  const { plan, projectCount } = useOrg();
  if (projectCount >= PLAN_LIMITS[plan].maxProjects) {
    return <UpgradePrompt />;
  }
  return <button onClick={createProject}>New Project</button>;
}
// API route has no limit check — anyone can POST
```

**Fix:** Enforce limits on the server. The client-side check is a UX convenience (show the prompt before the user clicks). The server-side check is the enforcement mechanism (reject the request if the limit is exceeded). Both must exist.

```typescript
// Server action — the actual enforcement
export async function createProject(data: FormData) {
  const verdict = await checkEntitlement(orgId, "projects");
  if (!verdict.allowed) {
    return { error: "upgrade_required", ...verdict };
  }
  return db.project.create({ data: { name: data.get("name") } });
}
```

### 8. Measuring PLG Success with Traditional Sales Metrics

**Wrong:** Evaluating a PLG motion using MQL volume, sales pipeline value, and quota attainment. These metrics measure sales-led growth and will always make PLG look like it is underperforming because PLG revenue bypasses the sales pipeline entirely.

**Fix:** Use PLG-native metrics: time-to-value, PQL rate, natural rate of growth, free-to-paid conversion rate, expansion MRR, and net revenue retention. Report self-serve revenue and sales-assisted revenue separately. The goal is not to replace sales metrics but to add product metrics that capture the PLG flywheel.

### 9. Ignoring the Activation Step Between Signup and Conversion

**Wrong:** Optimizing for signup volume and conversion rate while ignoring activation. You acquire thousands of users and show them upgrade prompts, but most never experienced the product's value. Conversion rates are terrible because unactivated users will never pay.

**Fix:** Define a clear activation milestone (the user's first meaningful outcome), measure time-to-value, and optimize the path from signup to activation before optimizing the path from activation to conversion. A PLG funnel is signup -> activate -> convert -> expand. Skipping activation breaks the entire chain. See [User-Onboarding](../User-Onboarding/user-onboarding.md) for activation flow patterns.

### 10. Overcomplicating the Free Tier

**Wrong:** Creating a free tier with dozens of exceptions, conditional limits, and complex entitlement logic that confuses users and creates engineering maintenance burden. "Free includes 3 projects but only 2 can have more than 10 tasks, and API access is limited to read-only on weekdays" is not a free tier, it is a puzzle.

**Fix:** Keep free tier limits simple and easy to explain in one sentence. "Free: 3 projects, 1 user, 500 MB storage." Users should understand exactly what they get and exactly what they would gain by upgrading. Complex limits create confusion, not conversion.

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [Billing-Monetization](../Billing-Monetization/billing-monetization.md) | [User-Onboarding](../User-Onboarding/user-onboarding.md) | [Conversion-Optimization](../Conversion-Optimization/conversion-optimization.md) | [Retention-Engagement](../Retention-Engagement/retention-engagement.md) | [Referral-Viral-Loops](../Referral-Viral-Loops/referral-viral-loops.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
