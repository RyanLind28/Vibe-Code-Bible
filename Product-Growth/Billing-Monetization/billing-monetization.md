# Billing & Monetization
> Stripe subscription lifecycle, trial and freemium patterns, usage-based billing with Stripe Meters, paywall gating on server and client, plan management UI, Stripe Customer Portal integration, dunning and failed payment recovery, proration for mid-cycle changes, tax handling with Stripe Tax, and webhook-driven state synchronization. Revenue infrastructure is the foundation that turns product value into business sustainability — build it once, build it correctly, and never let billing bugs erode user trust.

---

## Principles

### 1. Stripe Is Your Billing Source of Truth, Your Database Is the Read Cache

The most consequential architectural decision in billing is choosing where the source of truth lives. The answer is always Stripe. Stripe manages the subscription state machine — trial periods, active subscriptions, past-due invoices, cancellations, proration credits, tax calculations, and payment retries. Your database stores a synchronized copy of the billing state that your application reads from for fast access. This is not a suggestion — it is the only architecture that does not eventually collapse under edge cases.

The temptation is to manage billing state in your own database and use Stripe only as a payment processor. This fails because billing state machines are extraordinarily complex. A subscription can be `trialing`, `active`, `past_due`, `canceled`, `unpaid`, or `incomplete`. Transitions between these states are triggered by events you do not control — failed charge retries, bank delays, disputed payments, Stripe's internal fraud checks. If your database claims a user is on the Pro plan but Stripe says the subscription is `past_due` because their card was declined, your database is wrong and your application is giving away features for free.

The correct pattern: Stripe webhooks push state changes to your application, and your webhook handler updates your database to match Stripe's state. Your application reads from your local database for performance (you do not want to call the Stripe API on every page load), but Stripe is the authority. When there is a discrepancy, Stripe wins. Build a periodic reconciliation job that compares your local subscription records against Stripe's API and flags mismatches. Store the minimum necessary Stripe data locally: `stripe_customer_id`, `stripe_subscription_id`, `plan_id`, `status`, `current_period_end`, `cancel_at_period_end`, and `trial_end`. Do not attempt to replicate Stripe's entire data model.

### 2. Gate Features on the Server, Never Trust the Client

Paywall enforcement must happen on the server. A client-side paywall that hides a button or redirects to an upgrade page is a UX convenience, not a security boundary. Any user with browser developer tools can bypass client-side gating in seconds. If your premium API endpoint checks the subscription status in a React component instead of in the route handler, your premium features are free for anyone who knows how to use `curl`.

Server-side gating has two layers. The first layer is middleware or route-level checks that verify the user's subscription status before processing the request. For Next.js, this means checking the user's plan in middleware for page-level gating, or in route handlers and server actions for API-level gating. The second layer is the database query — read the user's `subscription_status` and `plan_id` from your local database (synchronized with Stripe via webhooks) and compare against the required plan for the requested resource.

Client-side gating still has a role — it provides a good user experience by showing upgrade prompts, disabling buttons, and displaying plan comparison modals. But the client-side check is decorative. The server-side check is authoritative. If the client says "show the feature" but the server says "subscription is expired," the server wins and returns a 403. Build your gating so that removing all client-side checks would not give any user access to features they have not paid for.

### 3. Trials and Freemium Are Separate Growth Strategies

Free trials and freemium tiers are often conflated, but they are fundamentally different strategies. A free trial gives full access to a paid plan for a limited time — the constraint is temporal. Freemium gives permanent access to a limited feature set — the constraint is functional. Choosing the wrong model, or implementing one when you mean the other, creates confused users and leaked revenue.

Free trials work best when the product's value is immediately obvious once the user has full access. Trials can be with or without a credit card upfront. Card-required trials have higher conversion rates (typically 40-60%) because they filter for purchase intent, but lower trial start rates. No-card trials have higher trial start rates but lower conversion rates (typically 10-25%). The implementation difference is significant: card-required trials create a Stripe subscription immediately with a trial period (Stripe handles the conversion automatically), while no-card trials require you to create the subscription only when the user decides to convert.

Usage-based billing is a third model that charges based on consumption — API calls, compute minutes, messages sent. Stripe Meters provide first-party support for tracking and billing usage. The implementation requires reporting usage events to Stripe in real-time and letting Stripe calculate the invoice amount. This model aligns cost with value but requires careful metering infrastructure to avoid under-billing (lost revenue) or over-billing (chargebacks).

### 4. Webhooks Are the Backbone of Billing State Synchronization

Stripe communicates state changes through webhooks — HTTP POST requests sent to your endpoint when events occur. A subscription renewal generates `invoice.paid`. A failed payment generates `invoice.payment_failed`. A plan change generates `customer.subscription.updated`. Your webhook handler is the integration point where Stripe's state flows into your application.

Webhook handling must be idempotent. Stripe guarantees at-least-once delivery, meaning you may receive the same event multiple times. If your handler processes `invoice.paid` and credits the user's account, processing it twice would double-credit them. Store the event ID and check for duplicates before processing. Webhook handling must also be fast — Stripe expects a 2xx response within 20 seconds. The best practice: receive the webhook, validate the signature, store the raw event, return 200 immediately, and process the event asynchronously.

The critical webhook events for a SaaS application are: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and `checkout.session.completed`. Handle these six events correctly and you cover 95% of billing scenarios.

### 5. Dunning Is Revenue Recovery, Not Error Handling

Between 5% and 15% of subscription payments fail each month — expired cards, insufficient funds, bank declines. Without dunning, every failed payment is a lost customer. With proper dunning, you can recover 30-50% of failed payments automatically.

Stripe provides Smart Retries — an ML-based system that retries failed payments at optimal times. On top of Stripe's retries, implement your own dunning communication sequence: email the customer immediately when a payment fails (with a link to update their card), email again 3 days later, email a final warning 7 days before the grace period ends, and cancel when the grace period expires.

The grace period is the window between payment failure and access revocation. During the grace period, the subscription status is `past_due` — the user still has access to paid features, but they see a banner prompting them to update their payment method. Seven to fourteen days is the industry standard. Implementation requires three components: a webhook handler for `invoice.payment_failed` that flags the user's account, a middleware check that shows a payment-update banner when `past_due`, and a background job that cancels subscriptions past the grace period.

### 6. Proration Makes Plan Changes Fair

When a user upgrades or downgrades mid-billing-cycle, proration calculates the fair amount to charge or credit. Stripe handles proration automatically when you update a subscription's price. The `proration_behavior` parameter controls how it works: `create_prorations` (the default) generates credit and debit line items on the next invoice, `always_invoice` creates and charges an invoice immediately, and `none` disables proration entirely. For upgrades, `always_invoice` provides the best UX because the user sees the charge immediately. For downgrades, `create_prorations` is better because the credit is applied to the next invoice.

Preview proration before confirming the plan change. Use Stripe's `upcoming invoice` API to calculate the exact proration amount and display it to the user in the confirmation dialog: "You'll be charged $15.00 today for the upgrade to Pro. Your next monthly charge will be $50.00 on April 15." Never change a user's plan without telling them what it will cost.

### 7. Tax Compliance Is Not Optional

Stripe Tax automates sales tax, VAT, and GST calculation across jurisdictions. If you sell to customers in the EU, you must charge VAT. If you sell to customers in many US states, you must charge sales tax once you have nexus. Getting this wrong means retroactive tax liability — you owe the tax whether or not you collected it from the customer.

Enable Stripe Tax by setting `automatic_tax: { enabled: true }` when creating subscriptions and checkout sessions. Tax ID collection and validation is required for B2B transactions in many jurisdictions — in the EU, a valid VAT ID may trigger reverse charge. Collect tax IDs during checkout by enabling `tax_id_collection` in your Checkout Session configuration. The common mistake is treating tax as a future problem. Every month you defer tax compliance, you accumulate potential liability. Implement Stripe Tax from your first paying customer — the integration cost is a single parameter.

### 8. The Stripe Customer Portal Eliminates Self-Service Billing UI

Stripe provides a hosted Customer Portal where users can manage subscriptions, update payment methods, view invoices, and cancel. The integration is minimal: create a portal session with the customer's `stripe_customer_id` and redirect to the returned URL. The portal handles plan changes with proration previews, PCI-compliant card collection, invoice downloads, and cancellation flows.

The portal sends webhooks for every action — handle them the same way you handle all Stripe webhooks. The limitation is customization: you cannot deeply customize appearance or add custom steps like cancellation surveys. Build a hybrid approach if needed — use the portal for straightforward actions (payment methods, invoices) and custom UI for actions where you want to intervene (cancellation with retention offer, plan changes with downgrade suggestions).

---

## LLM Instructions

### 1. Setting Up Stripe Subscription Infrastructure

When asked to implement billing or subscriptions, always use Stripe as the billing engine and keep the local database as a synchronized read cache.

1. Install `stripe` for server-side and `@stripe/stripe-js` for client-side. Store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in environment variables. Never expose the secret key to the client.
2. Create billing columns on the users table: `stripe_customer_id`, `stripe_subscription_id`, `plan_id` (default `'free'`), `subscription_status` (default `'none'`), `current_period_end`, `cancel_at_period_end`, and `trial_end`.
3. Create a Stripe customer when the user signs up or on first billing interaction. Always set `metadata.user_id` on the Stripe customer for webhook mapping.
4. Define plans as Stripe Products and Prices. Store price IDs in a configuration file (`src/config/plans.ts`) — never hardcode price IDs in components.
5. Create a webhook endpoint (`/api/webhooks/stripe`) that validates the Stripe signature and handles: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.

### 2. Implementing Paywall Gating

When asked to restrict features by plan, always enforce on the server. Client-side gating is for UX only.

1. Create a plan configuration file mapping plan IDs to features and limits. Each plan entry lists boolean feature flags (e.g., `canExportCSV: true`) and numeric limits (e.g., `maxProjects: 5`).
2. Create a server-side `getUserBillingState(userId)` function that queries the database and returns the effective plan. If subscription status is not `active` or `trialing`, return the free plan regardless of `plan_id`.
3. For page-level gating in Next.js, check the plan in the page Server Component or middleware. If the user lacks access, redirect to the upgrade page.
4. For API-level gating, create a `requireFeature` function that checks the plan before executing the handler. Return 403 with an `upgradeUrl` if access is denied.
5. For client-side UX, create a `usePlan()` hook with `canAccess(feature)` and `getRemainingQuota(resource)` helpers. Always pair with server-side enforcement.

### 3. Building Checkout and Plan Change Flows

When implementing checkout, use Stripe Checkout for new subscriptions and the Stripe API for plan changes.

1. For new subscriptions, create a Stripe Checkout Session with `mode: 'subscription'`, the price ID, `automatic_tax: { enabled: true }`, and `subscription_data.metadata.user_id`. Redirect to the Checkout URL.
2. For upgrades, use `stripe.subscriptions.update()` with the new price and `proration_behavior: 'always_invoice'`. For downgrades, use `proration_behavior: 'create_prorations'`.
3. Before confirming plan changes, preview proration with `stripe.invoices.retrieveUpcoming()` and display the amount to the user.
4. For no-card trials, set `plan_id` and `trial_end` in your database only — create the Stripe subscription when the user converts. For card-required trials, create the subscription with `trial_period_days`.
5. For cancellations, set `cancel_at_period_end: true` rather than canceling immediately. Show a retention offer before confirming.

### 4. Handling Webhooks and State Synchronization

Prioritize idempotency, speed, and reliability in webhook handling.

1. Read the raw request body (not parsed JSON) and verify the signature with `stripe.webhooks.constructEvent()`. Return 400 if verification fails.
2. Check a `processed_webhook_events` table for the event ID before processing. If found, return 200 without processing. After processing, insert the event ID.
3. For subscription events, update billing columns: `subscription_status`, `plan_id` (mapped from price ID), `current_period_end`, `cancel_at_period_end`, and `trial_end`.
4. For `invoice.payment_failed`, set status to `past_due` and trigger a dunning email with a Customer Portal link for payment method updates.
5. For `customer.subscription.deleted`, set the user back to the free plan. This fires only when the subscription is fully canceled — do not downgrade on `cancel_at_period_end: true`.

### 5. Implementing Usage-Based Billing with Stripe Meters

When implementing metered billing, use Stripe Meters for billing calculation and local counters for real-time enforcement.

1. Create a Stripe Meter defining what you measure (API calls, storage, etc.) with the appropriate aggregation type (`sum`, `max`, or `last`).
2. Create a metered Stripe Price referencing the meter with per-unit pricing. Attach it to subscriptions alongside any flat-rate base price.
3. Report usage to Stripe via `stripe.billing.meterEvents.create()` with the customer ID, meter event name, and value.
4. Maintain a local usage counter (database or Redis) for real-time rate limiting. Enforce limits locally for latency; sync with Stripe for billing. Reconcile periodically.
5. Display current usage and projected cost to users. Query local counters for real-time data and calculate projected cost from per-unit pricing.

---

## Examples

### 1. Stripe Webhook Handler with Idempotency (Next.js Route Handler)

```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getPlanFromPriceId } from "@/config/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: skip already-processed events
  const existing = await db.processedWebhookEvent.findUnique({
    where: { eventId: event.id },
  });
  if (existing) return NextResponse.json({ received: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata.user_id;
        if (userId) {
          await db.user.update({
            where: { id: userId },
            data: {
              planId: "free", subscriptionStatus: "none",
              stripeSubscriptionId: null, currentPeriodEnd: null,
              cancelAtPeriodEnd: false, trialEnd: null,
            },
          });
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await syncSubscription(sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const user = await db.user.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: "past_due" },
          });
          await sendDunningEmail(user.id);
        }
        break;
      }
    }

    await db.processedWebhookEvent.create({
      data: { eventId: event.id, eventType: event.type, processedAt: new Date() },
    });
  } catch (err) {
    console.error(`Webhook processing error [${event.type}]:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const planId = getPlanFromPriceId(priceId) ?? "free";

  await db.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      planId,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    },
  });
}

async function sendDunningEmail(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) return;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });
  // Send via your email provider with portalSession.url as the CTA link
}
```

### 2. Plan Configuration and Paywall Gating

```typescript
// src/config/plans.ts
export type PlanId = "free" | "starter" | "pro" | "enterprise";

export type PlanFeatures = {
  maxProjects: number;
  maxTeamMembers: number;
  canExportCSV: boolean;
  canUseAPI: boolean;
  apiRateLimit: number;
};

export type PlanConfig = {
  id: PlanId;
  name: string;
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  monthlyPrice: number; // cents
  features: PlanFeatures;
};

export const plans: Record<PlanId, PlanConfig> = {
  free: {
    id: "free", name: "Free",
    monthlyPriceId: null, annualPriceId: null, monthlyPrice: 0,
    features: {
      maxProjects: 3, maxTeamMembers: 1,
      canExportCSV: false, canUseAPI: false, apiRateLimit: 10,
    },
  },
  starter: {
    id: "starter", name: "Starter",
    monthlyPriceId: "price_starter_monthly_xxx",
    annualPriceId: "price_starter_annual_xxx",
    monthlyPrice: 1900,
    features: {
      maxProjects: 10, maxTeamMembers: 5,
      canExportCSV: true, canUseAPI: false, apiRateLimit: 60,
    },
  },
  pro: {
    id: "pro", name: "Pro",
    monthlyPriceId: "price_pro_monthly_xxx",
    annualPriceId: "price_pro_annual_xxx",
    monthlyPrice: 4900,
    features: {
      maxProjects: 50, maxTeamMembers: 20,
      canExportCSV: true, canUseAPI: true, apiRateLimit: 300,
    },
  },
  enterprise: {
    id: "enterprise", name: "Enterprise",
    monthlyPriceId: "price_enterprise_monthly_xxx",
    annualPriceId: "price_enterprise_annual_xxx",
    monthlyPrice: 19900,
    features: {
      maxProjects: Infinity, maxTeamMembers: Infinity,
      canExportCSV: true, canUseAPI: true, apiRateLimit: 1000,
    },
  },
};

export function getPlanFromPriceId(priceId: string): PlanId | null {
  for (const plan of Object.values(plans)) {
    if (plan.monthlyPriceId === priceId || plan.annualPriceId === priceId) {
      return plan.id;
    }
  }
  return null;
}

// src/lib/billing/gating.ts
import { db } from "@/lib/db";
import { plans, type PlanId, type PlanFeatures } from "@/config/plans";

export async function getUserBillingState(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      planId: true, subscriptionStatus: true,
      currentPeriodEnd: true, cancelAtPeriodEnd: true, trialEnd: true,
    },
  });

  const isActive = ["active", "trialing"].includes(user.subscriptionStatus ?? "");
  const effectivePlan: PlanId = isActive ? (user.planId as PlanId) : "free";

  return {
    planId: effectivePlan,
    plan: plans[effectivePlan],
    isActive,
    isPastDue: user.subscriptionStatus === "past_due",
    isTrial: user.subscriptionStatus === "trialing",
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
  };
}

export async function requireFeature(userId: string, feature: keyof PlanFeatures) {
  const { planId } = await getUserBillingState(userId);
  const value = plans[planId].features[feature];
  const allowed = typeof value === "boolean" ? value : value > 0;

  if (!allowed) {
    const upgrade = Object.values(plans).find(
      (p) => p.features[feature] === true && p.monthlyPrice > 0
    );
    return { allowed: false as const, requiredPlan: upgrade?.id ?? "starter" };
  }
  return { allowed: true as const };
}

// src/app/api/projects/route.ts — API route with paywall check
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserBillingState } from "@/lib/billing/gating";
import { plans } from "@/config/plans";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await getUserBillingState(session.user.id);
  const limit = plans[planId].features.maxProjects;
  const count = await db.project.count({ where: { userId: session.user.id } });

  if (count >= limit) {
    return NextResponse.json(
      { error: "Project limit reached", limit, upgradeUrl: "/settings/billing" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const project = await db.project.create({
    data: { name: body.name, userId: session.user.id },
  });
  return NextResponse.json(project, { status: 201 });
}
```

### 3. Checkout, Plan Change with Proration Preview, and Customer Portal

```typescript
// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plans } from "@/config/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId, billingCycle } = await request.json();
  const plan = plans[planId as keyof typeof plans];
  if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const priceId = billingCycle === "annual" ? plan.annualPriceId : plan.monthlyPriceId;
  if (!priceId) return NextResponse.json({ error: "Free plan needs no checkout" }, { status: 400 });

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });

  // Ensure Stripe customer exists
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: session.user.id },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    subscription_data: { metadata: { user_id: session.user.id } },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

// src/app/api/billing/change-plan/route.ts
// GET: Preview proration | POST: Execute plan change
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plans, type PlanId } from "@/config/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const newPlanId = searchParams.get("planId") as PlanId;
  const cycle = searchParams.get("cycle") ?? "monthly";
  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });

  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  const newPriceId = cycle === "annual"
    ? plans[newPlanId]?.annualPriceId
    : plans[newPlanId]?.monthlyPriceId;
  if (!newPriceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  const itemId = sub.items.data[0]?.id;

  const upcoming = await stripe.invoices.retrieveUpcoming({
    customer: user.stripeCustomerId!,
    subscription: user.stripeSubscriptionId,
    subscription_items: [{ id: itemId, price: newPriceId }],
    subscription_proration_behavior: "always_invoice",
  });

  const prorationAmount = upcoming.lines.data
    .filter((line) => line.proration)
    .reduce((sum, item) => sum + item.amount, 0);

  return NextResponse.json({
    prorationAmount,
    totalDueNow: Math.max(prorationAmount, 0),
    currency: upcoming.currency,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId, billingCycle } = await request.json();
  const newPlan = plans[planId as PlanId];
  if (!newPlan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  const newPriceId = billingCycle === "annual" ? newPlan.annualPriceId : newPlan.monthlyPriceId;
  const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  const currentPriceId = sub.items.data[0]?.price.id;
  const currentPlan = Object.values(plans).find(
    (p) => p.monthlyPriceId === currentPriceId || p.annualPriceId === currentPriceId
  );

  const isUpgrade = (newPlan.monthlyPrice ?? 0) > (currentPlan?.monthlyPrice ?? 0);

  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    items: [{ id: sub.items.data[0]?.id, price: newPriceId! }],
    proration_behavior: isUpgrade ? "always_invoice" : "create_prorations",
    metadata: { user_id: session.user.id },
  });

  return NextResponse.json({ success: true, plan: newPlan.id });
}

// src/app/api/billing/portal/route.ts
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account" }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
```

### 4. Usage-Based Billing with Stripe Meters and Local Enforcement

```typescript
// src/lib/billing/usage.ts
import Stripe from "stripe";
import { db } from "@/lib/db";
import { plans, type PlanId } from "@/config/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function reportAndCheckUsage(
  userId: string,
  units: number = 1
): Promise<{ allowed: boolean; currentUsage: number; limit: number }> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true, planId: true },
  });

  const limit = plans[(user.planId as PlanId) ?? "free"].features.apiRateLimit;
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Atomic increment of local usage counter
  const record = await db.usageRecord.upsert({
    where: { userId_metricName_periodStart: { userId, metricName: "api_calls", periodStart } },
    update: { count: { increment: units } },
    create: { userId, metricName: "api_calls", periodStart, count: units },
  });

  if (record.count > limit) {
    return { allowed: false, currentUsage: record.count, limit };
  }

  // Report to Stripe asynchronously (non-blocking)
  if (user.stripeCustomerId) {
    stripe.billing.meterEvents.create({
      event_name: "api_calls",
      payload: { stripe_customer_id: user.stripeCustomerId, value: String(units) },
    }).catch((err) => console.error("Stripe meter report failed:", err));
  }

  return { allowed: true, currentUsage: record.count, limit };
}

// Usage in API middleware
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reportAndCheckUsage } from "@/lib/billing/usage";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = await reportAndCheckUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", usage: usage.currentUsage, limit: usage.limit },
      { status: 429 }
    );
  }

  const result = await processApiRequest(request);
  return NextResponse.json(result);
}
```

### 5. Database Schema and Reconciliation Job

```sql
-- Billing state columns on users table (PostgreSQL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50) NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan_id);

-- Webhook idempotency table
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage metering table
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  metric_name VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  count BIGINT NOT NULL DEFAULT 0,
  UNIQUE(user_id, metric_name, period_start)
);
```

```typescript
// src/lib/billing/reconciliation.ts — Daily cron job
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getPlanFromPriceId } from "@/config/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function reconcileBillingState() {
  const users = await db.user.findMany({
    where: { stripeSubscriptionId: { not: null } },
    select: { id: true, stripeSubscriptionId: true, planId: true, subscriptionStatus: true },
  });

  const mismatches: Array<{ userId: string; field: string; local: string; stripe: string }> = [];

  for (const user of users) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId!);
      const stripePlan = getPlanFromPriceId(sub.items.data[0]?.price.id) ?? "free";

      if (user.planId !== stripePlan || user.subscriptionStatus !== sub.status) {
        mismatches.push({
          userId: user.id,
          field: user.planId !== stripePlan ? "planId" : "status",
          local: user.planId !== stripePlan ? user.planId : user.subscriptionStatus!,
          stripe: user.planId !== stripePlan ? stripePlan : sub.status,
        });
        // Auto-fix: Stripe is source of truth
        await db.user.update({
          where: { id: user.id },
          data: {
            planId: stripePlan,
            subscriptionStatus: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
      }
    } catch (err) {
      if ((err as Stripe.errors.StripeError).code === "resource_missing") {
        await db.user.update({
          where: { id: user.id },
          data: { planId: "free", subscriptionStatus: "none", stripeSubscriptionId: null },
        });
      }
    }
  }

  if (mismatches.length > 0) {
    console.warn(`Reconciliation: ${mismatches.length} mismatches fixed`, mismatches);
  }
  return { checked: users.length, mismatches };
}
```

---

## Common Mistakes

### 1. Storing Billing State Only in Your Database

**Wrong:** Managing subscription status locally without syncing from Stripe. Your database says "active" while Stripe says "past_due."

```typescript
await db.user.update({
  where: { id: userId },
  data: { planId: "pro", subscriptionStatus: "active" }, // local state — will drift
});
```

**Fix:** Update local state only from Stripe webhooks. Stripe is the source of truth.

```typescript
// In webhook handler — state comes FROM Stripe
await db.user.update({
  where: { id: userId },
  data: {
    planId: getPlanFromPriceId(subscription.items.data[0]?.price.id) ?? "free",
    subscriptionStatus: subscription.status, // from Stripe
  },
});
```

### 2. Client-Side-Only Paywall Gating

**Wrong:** Hiding premium features with a conditional render but not enforcing on the server.

```typescript
function ExportButton({ plan }: { plan: string }) {
  if (plan !== "pro") return null; // bypassed with curl or dev tools
  return <button onClick={handleExport}>Export CSV</button>;
}
```

**Fix:** Enforce on the server. The client-side check is for UX; the server-side check is for security.

```typescript
// In route handler — cannot be bypassed
const check = await requireFeature(session.user.id, "canExportCSV");
if (!check.allowed) {
  return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
}
```

### 3. Not Handling Webhook Idempotency

**Wrong:** Processing every webhook without deduplication. Stripe retries mean `invoice.paid` could fire twice, double-crediting users.

**Fix:** Store processed event IDs and skip duplicates before processing.

### 4. Revoking Access Immediately on Cancellation

**Wrong:** Downgrading to free the moment a user clicks "Cancel." They paid for the full period.

```typescript
await stripe.subscriptions.cancel(subscriptionId); // immediate cancellation
await db.user.update({ where: { id: userId }, data: { planId: "free" } });
```

**Fix:** Use `cancel_at_period_end: true`. Downgrade only when `customer.subscription.deleted` fires.

```typescript
await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
await db.user.update({ where: { id: userId }, data: { cancelAtPeriodEnd: true } });
```

### 5. Hardcoding Stripe Price IDs in Components

**Wrong:** Scattering `"price_1OxKj2ABC123"` across 20 files. When pricing changes, you update everywhere.

**Fix:** Centralize in `src/config/plans.ts`. Reference plans by your own IDs, resolve to Stripe price IDs at the call site.

### 6. Skipping Webhook Signature Verification

**Wrong:** Parsing the webhook body without verifying the Stripe signature. Anyone can POST a fake `invoice.paid` to your endpoint.

```typescript
const event = await request.json(); // no verification — anyone can fake this
```

**Fix:** Always verify with `stripe.webhooks.constructEvent()` using the raw body and signing secret.

```typescript
const body = await request.text(); // raw body required for signature verification
const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
```

### 7. Not Previewing Proration Before Plan Changes

**Wrong:** Changing the plan without showing the prorated charge. Surprise charges cause chargebacks.

**Fix:** Call `stripe.invoices.retrieveUpcoming()` with the new price, display the amount, and only proceed after user confirmation.

### 8. Ignoring the past_due Grace Period

**Wrong:** Immediately revoking access when a payment fails. Many failures resolve with a retry.

```typescript
case "invoice.payment_failed":
  await db.user.update({ data: { planId: "free" } }); // too aggressive
```

**Fix:** Set status to `past_due`, show a payment update banner, send dunning emails, and only revoke access after the grace period expires.

### 9. Not Setting metadata.user_id on Stripe Objects

**Wrong:** Creating Stripe customers and subscriptions without metadata. Webhooks arrive and you cannot map them to your users.

**Fix:** Always set `metadata: { user_id: user.id }` on Stripe customers and subscriptions.

### 10. Deferring Tax Compliance

**Wrong:** Launching without Stripe Tax and planning to "add it later." Every month accumulates potential tax liability.

**Fix:** Enable `automatic_tax: { enabled: true }` and `tax_id_collection: { enabled: true }` from your first checkout session. One parameter prevents retroactive compliance nightmares.

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [Product-Led-Growth](../Product-Led-Growth/product-led-growth.md) | [Conversion-Optimization](../Conversion-Optimization/conversion-optimization.md) | [User-Onboarding](../User-Onboarding/user-onboarding.md) | [Retention-Engagement](../Retention-Engagement/retention-engagement.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
