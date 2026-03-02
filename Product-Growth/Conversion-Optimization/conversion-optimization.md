# Conversion Optimization
> Funnel engineering, social proof systems, Stripe Checkout integration, form analytics, trust signal components, exit-intent detection, abandoned flow recovery, and ethical urgency patterns. Conversion optimization is not persuasion tricks — it is systematic removal of friction, reinforcement of trust, and precise measurement of every step between intent and action.

---

## Principles

### 1. Funnels Are State Machines, Not Pageviews

A conversion funnel is a finite state machine where each state represents a step the user must complete, each transition represents a user action, and each drop-off represents a failure to transition. Treating funnels as sequences of pageviews — landing page, pricing page, checkout page — misses the critical detail: users do not drop off between pages, they drop off between decisions. The decision to click "Start Trial" is a transition. The decision to enter a credit card is a transition. Each transition has friction, and your job is to measure and reduce that friction.

Multi-step funnels (wizards, onboarding flows, checkout processes) should be modeled explicitly in code as state machines. Each step has an ID, a set of required fields, validation rules, and analytics events. The funnel state — which step the user is on, which steps are complete, which fields have been filled — lives in a centralized store (React context, URL state, or server-side session). When you need to answer "at which step do 40% of users abandon the signup flow?", you need structured step data, not guesswork derived from page URLs.

The state machine approach enables recovery. When a user returns to a partially completed funnel, you can restore their progress. When a user abandons at step 3, you can send a targeted recovery email that links directly to step 3 with their data pre-filled. Track every transition explicitly: `funnel_step_viewed`, `funnel_step_completed`, `funnel_step_abandoned`, `funnel_completed`. Include the funnel name, step number, step name, time spent on the step, and any validation errors encountered.

### 2. Social Proof Reduces Perceived Risk

Social proof is a cognitive shortcut: when people are uncertain about a decision, they look at what other people have done. In a product context, social proof answers the question "am I making a mistake?" — and the answer is "no, because 10,000 other people made this same choice." This is not manipulation; it is information. Prospective customers genuinely want to know if other people like them use and trust your product.

There are five forms of social proof, each with different strengths. **Aggregate numbers** ("10,000+ teams use our product") provide scale. **Customer logos** provide identity — they signal that recognizable companies use the product. **Testimonials** provide narrative — they describe specific problems solved. **Live activity indicators** ("Sarah from London just signed up") provide immediacy. **Review scores** provide independent validation from third-party reviewers.

The engineering challenge is making social proof dynamic and real. Hardcoded testimonials feel stale. A live counter that never changes feels fake. The most effective social proof components pull from real data: actual customer counts from the database, actual testimonials from a CMS, actual review scores from an API. Cache social proof data aggressively — a customer count that is 6 hours stale is still authentic. Never fabricate social proof. Fake counters, invented testimonials, and manufactured urgency destroy trust when discovered. Every number displayed to users should be traceable to a real data source.

### 3. Checkout Friction Is Revenue Friction

Every additional field, every extra click, every confusing label in your checkout flow directly reduces revenue. Baymard Institute research consistently shows that 70% of online shopping carts are abandoned, and the top reasons are all friction: unexpected costs (48%), required account creation (26%), complicated checkout process (22%). Each of these is an engineering problem with an engineering solution.

Stripe Checkout exists specifically to minimize checkout friction. It handles card input, validation, error messages, 3D Secure authentication, Apple Pay, Google Pay, and localized payment methods. The architectural decision is between redirect mode (user leaves your site, completes payment on Stripe's hosted page, returns via a success URL) and embedded mode (Stripe's checkout UI renders inside your page via an iframe). Redirect is simpler to implement and inherently PCI-compliant because card data never touches your server.

Server-side checkout session creation is critical. Never create Stripe Checkout sessions from the client — this exposes your price IDs and allows manipulation. Create the session in a Server Action or API route, pass only the session ID to the client, and redirect from there. The server controls pricing, applies discounts, sets metadata, and defines the success and cancel URLs.

### 4. Field-Level Analytics Reveal Hidden Friction

Form-level analytics (did the user submit the form or not?) is insufficient. Field-level analytics tells you which specific fields cause friction: which fields take the longest to complete, which fields trigger validation errors, which fields the user focuses on and then abandons. This granularity transforms "our signup form has a 30% completion rate" into "40% of users who reach the phone number field abandon the form."

Implement field-level tracking by attaching event listeners to focus, blur, and error events on each form field. On focus, record the field name and timestamp. On blur, compute the time spent and check if the field was filled or skipped. On validation error, record the error type. On form abandonment (the user navigates away), record which field was last focused. This data feeds a field-level funnel that shows the drop-off rate at each field.

Field-level analytics must be privacy-conscious. Track field names, timing, and error types — never track field values. "The user spent 12 seconds on the email field and encountered a validation error" is useful analytics data. "The user typed john@example.com" is PII that creates compliance risk. Build the tracking layer to be structurally incapable of capturing values, not just configured not to.

### 5. Trust Signals Address Specific Objections

Trust signals are UI elements that address the specific objections a prospect has at the moment of decision. They are not decorative badges scattered across a page — they are strategic answers to the questions running through the user's mind: "Is my payment secure?" (security badges), "What if it doesn't work?" (money-back guarantee, free trial), "Is this company legitimate?" (review scores, certifications), "Can I get help?" (support availability).

The engineering pattern for trust signals is a component library with placement logic. Each trust signal is a reusable component that fetches its data from a central source. Placement is context-dependent: security badges appear near payment forms, guarantee badges appear near pricing CTAs, review scores appear near comparison sections. The placement is mapped to the objection the user is most likely to have at that point in the flow.

Trust signals have diminishing returns. Three well-placed badges that address specific objections are more effective than fifteen badges that create visual clutter. Prioritize the objections that your user research identifies as most common and place trust signals at the moments of highest decision anxiety — typically near CTAs and payment forms.

### 6. Exit-Intent Is a Last-Chance Intervention

Exit-intent detection identifies when a user is about to leave the page — typically by tracking the mouse cursor moving toward the browser's close button or address bar. On desktop, this is detected by monitoring the `mouseleave` event on `document.documentElement` and checking if the cursor crossed the top boundary of the viewport. On mobile, exit-intent proxies include the `visibilitychange` event (switching tabs/apps) or the back-button gesture.

Exit-intent popups are the most common intervention. The key engineering consideration is throttling: show the exit-intent popup at most once per session (or once per 24 hours, stored in a cookie). Repeated popups are hostile UX. The detection algorithm must filter false positives — require a minimum engagement threshold (at least 10 seconds on page, at least 25% scroll depth) to prevent triggering on users who are not engaged enough to recover.

Exit-intent is most effective on high-value pages: pricing pages, checkout flows, and long-form content. On pricing pages, it can offer a time-limited discount or free trial. On checkout pages, it can surface an abandoned cart recovery link. The content of the exit-intent popup should match the page context — a pricing page popup offering a blog subscription solves the wrong problem.

### 7. Abandoned Flow Recovery Is a System, Not an Email

When a user starts a checkout or fills out half a signup form and then leaves, they have demonstrated intent. Recovery is the process of re-engaging these users. It is a system with multiple channels, multiple touchpoints (immediate, 1 hour, 24 hours, 3 days), and personalized content referencing exactly where they left off.

The foundation is server-side state persistence. When a user begins a multi-step flow, save their progress to the database at each step, keyed by user ID or session ID. This enables resumption (the user returns and picks up where they left off) and provides data for recovery messages (you know which step they abandoned). The recovery sequence should escalate in value: first a simple reminder, then a value proposition, then an incentive.

Detection of abandonment requires definition. Define it as "the user has not interacted with the funnel for X minutes AND has navigated away." Use the `visibilitychange` or `beforeunload` event to detect departure. A server-side cron job identifies sessions inactive for the threshold period and triggers the recovery sequence, which includes a tokenized deep link that restores the user's exact progress.

### 8. Ethical Urgency Respects the User

Urgency and scarcity patterns — countdown timers, limited availability indicators — increase conversion by leveraging loss aversion. But these patterns exist on a spectrum from ethical to manipulative, and the line is simple: if the urgency is real, it is ethical. If the urgency is fabricated, it is a dark pattern.

A countdown timer for a genuine sale that ends at midnight is ethical. A countdown timer that resets every time the user visits the page is a lie. A "limited availability" indicator for a product with genuinely limited capacity (event tickets, cohort-based courses) is ethical. The same indicator for a SaaS product with unlimited seats is a lie.

The engineering implementation ties the display directly to real data. A countdown timer reads its end time from the database. When the timer expires, the server enforces the expiration, not just the client. Limited availability indicators query actual inventory. Countdown timers must account for time zone differences (use server time), clock skew (sync periodically), and state after expiration.

---

## LLM Instructions

### 1. Building Multi-Step Funnel Components

When asked to create a multi-step signup, onboarding, or checkout flow, implement it as a state machine with step tracking and persistence.

1. Define the funnel steps as a TypeScript array of step configurations. Each step has an `id`, `title`, `fields` (array of field names), `validation` (Zod schema), and `analyticsEvent`. Store this in a dedicated file (e.g., `src/lib/funnels/signup-funnel.ts`).
2. Create a `useFunnel` hook that manages the current step index, step data (record of step ID to form values), navigation functions (`next()`, `back()`, `goTo()`), and computed state (`isFirstStep`, `isLastStep`, `progress`). Store funnel state in URL search params for resumable flows or React context for modal flows.
3. On each step transition, fire `funnel_step_completed` with properties: `{ funnel, step, step_name, time_on_step_ms, fields_filled, fields_total }`. On funnel completion, fire `funnel_completed` with `{ funnel, total_steps, total_time_ms }`.
4. Persist partial funnel progress to the server after each step completion. When the user returns, restore progress and resume at the next incomplete step. For anonymous users, use a session cookie as the key.
5. Render a progress indicator that shows total steps, current step, and completed steps. This reduces anxiety by answering "how much more do I need to do?"

### 2. Implementing Social Proof Components

When asked to add social proof, build data-driven components that display real metrics.

1. Create a `SocialProof` component library with variants: `CustomerCount`, `CustomerLogos`, `Testimonials`, `LiveActivity`, and `ReviewScore`. Each fetches data from a server-side source.
2. `CustomerCount` queries the users table. `Testimonials` fetches from a CMS or database. `LiveActivity` queries recent events. Cache all queries with a TTL of 1-6 hours.
3. For `LiveActivity`, use SSE or polling (every 30 seconds) to update the feed. Display entries as notification-style toasts. Show generalized location data ("A user in London") — never full names or emails.
4. Implement a `SocialProofPlacement` wrapper that accepts a `context` prop (`hero`, `pricing`, `checkout`) and renders the appropriate variant. Hero sections get logos. Pricing pages get testimonials. Checkout pages get security-focused proof.
5. All numbers must be real. Create a `social-proof-data` module that queries real sources and caches results. Include a `lastUpdated` timestamp for transparency.

### 3. Integrating Stripe Checkout

When asked to add payment functionality, use Stripe Checkout in redirect mode unless the user specifically requests embedded mode.

1. Create a Server Action or API route that creates a Stripe Checkout session. Accept only the plan identifier from the client — look up the price ID server-side from a trusted mapping. Never accept price amounts from the client.
2. Set `success_url` with a session ID placeholder: `success_url: \`${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}\``. On the success page, verify payment server-side — never trust the URL alone.
3. Attach metadata to the session: `metadata: { userId, plan, source }`. This metadata flows through to the webhook and lets you associate payment with the user.
4. Handle the `checkout.session.completed` webhook. Verify the signature. Update the user's plan in the database. Fire analytics. Send confirmation email. The webhook is the source of truth — not the success page.
5. Load Stripe.js lazily (only on checkout button click). Show a loading state while the session is being created.

### 4. Implementing Exit-Intent Detection

When asked to add exit-intent popups, build a detection system with throttling and context-awareness.

1. Create a `useExitIntent` hook that monitors `mouseleave` on `document.documentElement`. Trigger when `event.clientY <= 0`. Require minimum engagement: 10+ seconds on page and 25%+ scroll depth.
2. Implement session-level throttling via sessionStorage. For cross-session throttling, set a cookie with 24-hour expiration. Never show the popup more than once per 24-hour period.
3. For mobile, detect `visibilitychange` and back-button press. Show a bottom-sheet instead of a modal.
4. Fire analytics events: `exit_intent_detected`, `exit_intent_shown`, `exit_intent_converted`, `exit_intent_dismissed`. Track page context and the offer shown.
5. Make popup content context-dependent: create a config map from page patterns to popup content. Pricing pages get discount offers, checkout pages get cart-save offers.

### 5. Building Abandoned Flow Recovery

When asked to implement flow recovery, build the full pipeline from detection to re-engagement.

1. Create a `funnel_sessions` database table with columns: `id`, `user_id`, `session_id`, `funnel_name`, `current_step`, `step_data` (JSONB), `status` (in_progress/completed/abandoned/recovered), `last_activity_at`, `recovery_email_sent_at`. Index on `(status, last_activity_at)`.
2. Update the session record on every step transition. On funnel completion, set `status = 'completed'`.
3. Create a cron job that runs every 15 minutes, querying sessions where `status = 'in_progress' AND last_activity_at < NOW() - INTERVAL '1 hour'`. Mark as `abandoned` and enqueue recovery emails.
4. The recovery email includes a tokenized deep link (`/recover?token=<signed-jwt>`) that restores funnel state and resumes at the abandoned step. The JWT contains the session ID and expires after 7 days.
5. Implement escalating touchpoints: 1 hour (reminder), 24 hours (value prop), 72 hours (incentive). Track `recovery_email_opened`, `recovery_link_clicked`, `recovery_completed`. Stop the sequence on completion.

---

## Examples

### 1. Multi-Step Funnel with State Tracking (React + TypeScript)

```typescript
// src/lib/funnels/signup-funnel.ts
import { z } from "zod";

export interface FunnelStep<T extends z.ZodType = z.ZodType> {
  id: string;
  title: string;
  description: string;
  schema: T;
}

export const signupSteps = [
  {
    id: "account",
    title: "Create your account",
    description: "Enter your email and choose a password.",
    schema: z.object({
      email: z.string().email("Please enter a valid email"),
      password: z.string().min(8, "Password must be at least 8 characters"),
    }),
  },
  {
    id: "profile",
    title: "Tell us about yourself",
    description: "Help us personalize your experience.",
    schema: z.object({
      fullName: z.string().min(2, "Name is required"),
      companyName: z.string().optional(),
      role: z.enum(["engineer", "designer", "pm", "founder", "other"]),
    }),
  },
  {
    id: "workspace",
    title: "Set up your workspace",
    description: "Create your first project to get started.",
    schema: z.object({
      workspaceName: z.string().min(2, "Workspace name is required"),
      teamSize: z.enum(["solo", "2-5", "6-20", "21-100", "100+"]),
    }),
  },
] as const satisfies FunnelStep[];

// src/hooks/use-funnel.ts
"use client";

import { useCallback, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";
import type { FunnelStep } from "@/lib/funnels/signup-funnel";

interface FunnelState {
  currentStepIndex: number;
  stepData: Record<string, Record<string, unknown>>;
  startedAt: number;
  stepStartedAt: number;
}

export function useFunnel({
  name,
  steps,
  onComplete,
}: {
  name: string;
  steps: readonly FunnelStep[];
  onComplete: (data: Record<string, Record<string, unknown>>) => void;
}) {
  const [state, setState] = useState<FunnelState>({
    currentStepIndex: 0,
    stepData: {},
    startedAt: Date.now(),
    stepStartedAt: Date.now(),
  });

  const currentStep = steps[state.currentStepIndex];
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === steps.length - 1;
  const progress = ((state.currentStepIndex + 1) / steps.length) * 100;

  const next = useCallback(
    (data: Record<string, unknown>) => {
      const step = steps[state.currentStepIndex];
      const result = step.schema.safeParse(data);
      if (!result.success) {
        return { success: false as const, errors: result.error.flatten().fieldErrors };
      }

      analytics.track("funnel_step_completed", {
        funnel: name,
        step: state.currentStepIndex + 1,
        step_name: step.id,
        time_on_step_ms: Date.now() - state.stepStartedAt,
        fields_filled: Object.keys(data).filter((k) => data[k] != null && data[k] !== "").length,
        fields_total: Object.keys(step.schema.shape).length,
      });

      const newStepData = { ...state.stepData, [step.id]: result.data };

      if (isLastStep) {
        analytics.track("funnel_completed", {
          funnel: name,
          total_steps: steps.length,
          total_time_ms: Date.now() - state.startedAt,
        });
        onComplete(newStepData);
      } else {
        setState((s) => ({
          ...s,
          stepData: newStepData,
          currentStepIndex: s.currentStepIndex + 1,
          stepStartedAt: Date.now(),
        }));
        // Persist progress for recovery
        fetch("/api/funnels/persist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ funnel: name, currentStep: steps[state.currentStepIndex + 1].id, stepData: newStepData }),
        });
      }
      return { success: true as const };
    },
    [state, steps, name, isLastStep, onComplete]
  );

  const back = useCallback(() => {
    if (isFirstStep) return;
    setState((s) => ({ ...s, currentStepIndex: s.currentStepIndex - 1, stepStartedAt: Date.now() }));
  }, [isFirstStep]);

  return { currentStep, currentStepIndex: state.currentStepIndex, stepData: state.stepData, isFirstStep, isLastStep, progress, next, back };
}
```

### 2. Stripe Checkout Integration (Next.js Server Action + Webhook)

```typescript
// src/app/actions/checkout.ts
"use server";

import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<string, { monthly: string; annual: string }> = {
  pro: { monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!, annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID! },
  team: { monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID!, annual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID! },
};

export async function createCheckoutSession(plan: string, billingCycle: "monthly" | "annual") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const priceId = PRICE_MAP[plan]?.[billingCycle];
  if (!priceId) throw new Error("Invalid plan");

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
    customerId = customer.id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: session.user.id,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing?canceled=true`,
    metadata: { userId: session.user.id, plan, billingCycle },
    subscription_data: { metadata: { userId: session.user.id, plan } },
  });

  return { url: checkoutSession.url };
}

// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { trackServerEvent } from "@/lib/analytics/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (!userId || !plan) break;

    await db.user.update({
      where: { id: userId },
      data: { plan, stripeSubscriptionId: session.subscription as string, planActivatedAt: new Date() },
    });

    trackServerEvent(userId, "checkout_completed", {
      plan,
      billing_cycle: session.metadata?.billingCycle,
      amount_total: session.amount_total,
    });
  }

  return NextResponse.json({ received: true });
}

// src/components/checkout-button.tsx
"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/app/actions/checkout";
import { analytics } from "@/lib/analytics";

export function CheckoutButton({ plan, billingCycle, children }: {
  plan: string;
  billingCycle: "monthly" | "annual";
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    analytics.track("checkout_started", { plan, billing_cycle: billingCycle, source: window.location.pathname });

    try {
      const { url } = await createCheckoutSession(plan, billingCycle);
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Checkout failed:", error);
      setLoading(false);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50">
      {loading ? "Redirecting..." : children}
    </button>
  );
}
```

### 3. Exit-Intent Detection with Context-Aware Popups (React)

```typescript
// src/hooks/use-exit-intent.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";

export function useExitIntent({ threshold = 10_000, scrollDepth = 25, enabled = true } = {}) {
  const [triggered, setTriggered] = useState(false);
  const pageLoadTime = useRef(Date.now());
  const hasScrolled = useRef(false);

  const checkScroll = useCallback(() => {
    const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    if (pct >= scrollDepth) hasScrolled.current = true;
  }, [scrollDepth]);

  const handleMouseLeave = useCallback((event: MouseEvent) => {
    if (event.clientY > 0) return;
    if (Date.now() - pageLoadTime.current < threshold) return;
    if (!hasScrolled.current) return;
    if (sessionStorage.getItem("exit_intent_shown")) return;

    sessionStorage.setItem("exit_intent_shown", "true");
    analytics.track("exit_intent_detected", { page: window.location.pathname, time_on_page_ms: Date.now() - pageLoadTime.current });
    setTriggered(true);
  }, [threshold]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("scroll", checkScroll, { passive: true });
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("scroll", checkScroll);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [enabled, checkScroll, handleMouseLeave]);

  const dismiss = useCallback(() => { analytics.track("exit_intent_dismissed", { page: window.location.pathname }); setTriggered(false); }, []);
  const convert = useCallback((action: string) => { analytics.track("exit_intent_converted", { page: window.location.pathname, action }); setTriggered(false); }, []);

  return { triggered, dismiss, convert };
}

// src/components/exit-intent-popup.tsx
"use client";

import { useExitIntent } from "@/hooks/use-exit-intent";
import { usePathname } from "next/navigation";

const EXIT_INTENT_CONFIG: Record<string, { headline: string; body: string; cta: string; action: string }> = {
  "/pricing": {
    headline: "Still deciding?",
    body: "Start a 14-day free trial — no credit card required.",
    cta: "Start Free Trial",
    action: "start_trial",
  },
  "/checkout": {
    headline: "Save your progress",
    body: "We can email you a link to resume checkout whenever you are ready.",
    cta: "Email Me a Link",
    action: "save_checkout",
  },
};

function getConfig(pathname: string) {
  if (EXIT_INTENT_CONFIG[pathname]) return EXIT_INTENT_CONFIG[pathname];
  for (const [pattern, config] of Object.entries(EXIT_INTENT_CONFIG)) {
    if (pathname.startsWith(pattern)) return config;
  }
  return null;
}

export function ExitIntentPopup() {
  const pathname = usePathname();
  const config = getConfig(pathname);
  const { triggered, dismiss, convert } = useExitIntent({ enabled: !!config });

  if (!triggered || !config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold mb-3">{config.headline}</h2>
        <p className="text-gray-600 mb-6">{config.body}</p>
        <button onClick={() => convert(config.action)} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium mb-3">{config.cta}</button>
        <button onClick={dismiss} className="w-full px-6 py-3 text-gray-500 text-sm">No thanks</button>
      </div>
    </div>
  );
}
```

### 4. Field-Level Form Analytics and Abandoned Flow Recovery

```typescript
// src/hooks/use-field-analytics.ts
"use client";

import { useCallback, useRef } from "react";
import { analytics } from "@/lib/analytics";

export function useFieldAnalytics({ formName }: { formName: string }) {
  const activeField = useRef<{ name: string; focusedAt: number } | null>(null);

  const getFieldProps = useCallback(
    (fieldName: string) => ({
      onFocus: () => {
        activeField.current = { name: fieldName, focusedAt: Date.now() };
        analytics.track("form_field_focused", { form: formName, field: fieldName });
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        if (!activeField.current || activeField.current.name !== fieldName) return;
        analytics.track("form_field_completed", {
          form: formName,
          field: fieldName,
          time_spent_ms: Date.now() - activeField.current.focusedAt,
          has_value: e.target.value !== "", // boolean only — never the actual value
        });
        activeField.current = null;
      },
    }),
    [formName]
  );

  const onFieldError = useCallback(
    (fieldName: string, errorType: string) => {
      analytics.track("form_field_error", { form: formName, field: fieldName, error_type: errorType });
    },
    [formName]
  );

  const onFormAbandoned = useCallback(() => {
    analytics.track("form_abandoned", {
      form: formName,
      last_field: activeField.current?.name ?? "unknown",
    });
  }, [formName]);

  return { getFieldProps, onFieldError, onFormAbandoned };
}

// src/app/api/cron/abandoned-funnels/route.ts
// Scheduled via Vercel Cron every 15 minutes
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { funnelSessions } from "@/lib/db/schema";
import { eq, and, lt, isNull } from "drizzle-orm";
import { trackServerEvent } from "@/lib/analytics/server";
import jwt from "jsonwebtoken";
import { sendRecoveryEmail } from "@/lib/email/recovery";

export async function GET() {
  const abandoned = await db
    .select()
    .from(funnelSessions)
    .where(
      and(
        eq(funnelSessions.status, "in_progress"),
        lt(funnelSessions.lastActivityAt, new Date(Date.now() - 60 * 60 * 1000)),
        isNull(funnelSessions.recoveryEmailSentAt)
      )
    )
    .limit(100);

  for (const session of abandoned) {
    await db.update(funnelSessions).set({ status: "abandoned" }).where(eq(funnelSessions.id, session.id));
    if (!session.email) continue;

    const token = jwt.sign(
      { sessionId: session.id, funnelName: session.funnelName },
      process.env.RECOVERY_JWT_SECRET!,
      { expiresIn: "7d" }
    );

    await sendRecoveryEmail({
      to: session.email,
      funnelName: session.funnelName,
      recoveryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/recover?token=${token}`,
    });

    await db.update(funnelSessions).set({ recoveryEmailSentAt: new Date() }).where(eq(funnelSessions.id, session.id));
    trackServerEvent(session.userId ?? session.sessionId, "recovery_email_sent", { funnel: session.funnelName, abandoned_step: session.currentStep });
  }

  return NextResponse.json({ processed: abandoned.length });
}
```

```sql
-- Funnel abandonment analysis: where do users drop off, and how effective is recovery?
WITH funnel_stats AS (
  SELECT
    funnel_name,
    current_step AS abandoned_step,
    status,
    COUNT(*) AS session_count,
    COUNT(*) FILTER (WHERE recovery_email_sent_at IS NOT NULL) AS recovery_sent,
    COUNT(*) FILTER (WHERE status = 'recovered') AS recovered
  FROM funnel_sessions
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY funnel_name, current_step, status
)
SELECT
  funnel_name,
  abandoned_step,
  SUM(session_count) AS total_sessions,
  SUM(CASE WHEN status = 'abandoned' THEN session_count ELSE 0 END) AS abandoned,
  SUM(CASE WHEN status = 'completed' THEN session_count ELSE 0 END) AS completed,
  SUM(recovered) AS recovered_sessions,
  ROUND(SUM(recovered)::numeric / NULLIF(SUM(recovery_sent), 0) * 100, 1) AS recovery_rate_pct
FROM funnel_stats
GROUP BY funnel_name, abandoned_step
ORDER BY funnel_name, abandoned DESC;

-- Field-level friction analysis: which fields cause the most drop-off?
SELECT
  properties->>'form' AS form_name,
  properties->>'field' AS field_name,
  COUNT(*) FILTER (WHERE event_name = 'form_field_focused') AS focus_count,
  COUNT(*) FILTER (WHERE event_name = 'form_field_completed') AS completion_count,
  COUNT(*) FILTER (WHERE event_name = 'form_field_error') AS error_count,
  ROUND(AVG(CASE WHEN event_name = 'form_field_completed' THEN (properties->>'time_spent_ms')::numeric END), 0) AS avg_time_ms,
  ROUND(1.0 - COUNT(*) FILTER (WHERE event_name = 'form_field_completed')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE event_name = 'form_field_focused'), 0), 3) AS drop_off_rate
FROM events
WHERE event_name IN ('form_field_focused', 'form_field_completed', 'form_field_error')
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY properties->>'form', properties->>'field'
ORDER BY drop_off_rate DESC;
```

---

## Common Mistakes

### 1. Building a Custom Checkout Form Instead of Using Stripe Checkout

**Wrong:** Building your own credit card form with custom inputs, manual validation, and direct API calls. This creates PCI compliance burden, misses Apple Pay/Google Pay, and requires ongoing maintenance.

```typescript
// Months of work, PCI compliance burden, fragile
<form onSubmit={handlePayment}>
  <input name="cardNumber" placeholder="Card number" />
  <input name="expiry" placeholder="MM/YY" />
  <input name="cvc" placeholder="CVC" />
</form>
```

**Fix:** Use Stripe Checkout in redirect mode. Total integration under 100 lines.

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
});
window.location.href = session.url;
```

### 2. Creating Stripe Checkout Sessions on the Client

**Wrong:** Exposing price IDs and session creation logic to the client, allowing price manipulation.

**Fix:** Create Checkout sessions exclusively in Server Actions or API routes. The server looks up the price ID from a trusted mapping — `const priceId = PRICE_MAP[plan]` — and returns only the session URL to the client.

### 3. Tracking Form Field Values Instead of Metadata

**Wrong:** Capturing the actual values users type into fields as analytics properties — leaking PII and potentially passwords into analytics providers.

```typescript
analytics.track("field_completed", { field: "email", value: "john@example.com" }); // PII leak
```

**Fix:** Track only metadata: field name, time spent, `has_value: true/false`, and error types. Never track the actual value.

```typescript
analytics.track("form_field_completed", { field: "email", time_spent_ms: 3200, has_value: true });
```

### 4. Exit-Intent Popup on Every Page Without Throttling

**Wrong:** Showing an exit-intent popup on every page the user visits, or showing it again immediately after dismissal.

```typescript
document.addEventListener("mouseleave", () => setShowPopup(true)); // fires constantly
```

**Fix:** Require minimum engagement (time + scroll), throttle to once per session via sessionStorage, and only trigger on high-value pages.

```typescript
if (e.clientY > 0) return;
if (Date.now() - pageLoadTime < 10_000) return;
if (!hasScrolled25Percent) return;
if (sessionStorage.getItem("exit_intent_shown")) return;
sessionStorage.setItem("exit_intent_shown", "true");
setShowPopup(true);
```

### 5. Fake Urgency That Resets on Page Reload

**Wrong:** A countdown timer that starts from a fixed duration on every page load.

```typescript
const [timeLeft, setTimeLeft] = useState(30 * 60); // resets to 30 min every visit — fake
```

**Fix:** Tie the countdown to a real server-side deadline. When the timer expires, the server enforces the expiration.

```typescript
const endTime = new Date(promotionEndDate); // real end date from server
const [timeLeft, setTimeLeft] = useState(() =>
  Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000))
);
```

### 6. No Funnel Step Tracking

**Wrong:** Only tracking funnel start and completion, with no visibility into which steps cause drop-offs.

```typescript
analytics.track("signup_started", {}); // ... 5 steps ...
analytics.track("signup_completed", {}); // where did 70% of users disappear?
```

**Fix:** Track every step transition with step metadata to create a queryable drop-off funnel.

```typescript
analytics.track("funnel_step_completed", { funnel: "signup", step: 1, step_name: "account", time_on_step_ms: 8500 });
analytics.track("funnel_step_completed", { funnel: "signup", step: 2, step_name: "profile", time_on_step_ms: 15200 });
```

### 7. Social Proof with Hardcoded Numbers

**Wrong:** Displaying a customer count that was set once and never updated, or a number that was never accurate.

```typescript
<p>Join 5,000+ happy customers</p> // was accurate 6 months ago
```

**Fix:** Query real data and cache it. Update automatically.

```typescript
async function getCustomerCount(): Promise<number> {
  const cached = await redis.get("customer_count");
  if (cached) return parseInt(cached, 10);
  const result = await db.execute(sql`SELECT COUNT(*) AS count FROM users WHERE status = 'active'`);
  await redis.set("customer_count", result.rows[0].count, "EX", 3600);
  return result.rows[0].count;
}
```

### 8. Recovery Emails Without Deep Links

**Wrong:** Sending a recovery email with a link to the homepage. The user has to start the entire flow over.

```typescript
await sendEmail({ to: user.email, body: `<a href="https://app.com">Click here</a>` }); // useless
```

**Fix:** Include a tokenized deep link that restores the user's exact progress.

```typescript
const token = jwt.sign({ sessionId: funnel.id }, SECRET, { expiresIn: "7d" });
await sendEmail({ to: user.email, body: `<a href="https://app.com/recover?token=${token}">Continue from step ${step}</a>` });
```

### 9. Trust Signals Placed Randomly Instead of Contextually

**Wrong:** Scattering badges on every page without matching them to the objection the user has at that point. A security badge on the blog solves no objection.

**Fix:** Map trust signals to decision points. Security badges near payment forms. Guarantees near pricing CTAs. Review scores near comparison sections.

```typescript
function TrustSignals({ context }: { context: "hero" | "pricing" | "checkout" }) {
  switch (context) {
    case "hero": return <CustomerLogos />;
    case "pricing": return <><MoneyBackGuarantee /><ReviewScore /></>;
    case "checkout": return <><SecurityBadge /><EncryptionNotice /></>;
  }
}
```

### 10. Treating the Stripe Webhook as Optional

**Wrong:** Relying on the success page redirect to update the user's plan. If the user closes the browser after paying but before the page loads, the plan is never updated.

```typescript
// src/app/checkout/success/page.tsx — UNRELIABLE
export default async function SuccessPage({ searchParams }) {
  await db.user.update({ where: { id: userId }, data: { plan: "pro" } }); // may never run
}
```

**Fix:** Handle plan updates in the webhook. Use the success page only for UI confirmation.

```typescript
// Webhook — guaranteed delivery
case "checkout.session.completed":
  await db.user.update({ where: { id: session.metadata.userId }, data: { plan: session.metadata.plan } });

// Success page — purely presentational
export default function SuccessPage() { return <h1>Welcome to Pro!</h1>; }
```

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [Experimentation](../Experimentation/experimentation.md) | [User-Onboarding](../User-Onboarding/user-onboarding.md) | [Billing-Monetization](../Billing-Monetization/billing-monetization.md) | [Growth-Marketing-Channels](../Growth-Marketing-Channels/growth-marketing-channels.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
