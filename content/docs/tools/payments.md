---
title: Payment Tools
description: Integrate payment processing into Next.js applications using Stripe, LemonSqueezy, or Paddle -- choose based on whether you want full control (Stripe) or a Merchant of Record to handle tax and compliance for you (LemonSqueezy/Paddle).
---
# Payment Tools

> Integrate payment processing into Next.js applications using Stripe, LemonSqueezy, or Paddle -- choose based on whether you want full control (Stripe) or a Merchant of Record to handle tax and compliance for you (LemonSqueezy/Paddle).

---

## When to Use What

| Feature                  | Stripe                                    | LemonSqueezy                             | Paddle                                    |
| ------------------------ | ----------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| **Pricing / Fees**       | 2.9% + 30c (US cards)                     | 5% + 50c per transaction                 | 5% + 50c per transaction                  |
| **Merchant of Record**   | No -- you are the merchant                | Yes -- LS is the merchant                | Yes -- Paddle is the merchant             |
| **Tax Handling**         | Stripe Tax (add-on, extra fee per txn)    | Included -- LS handles all sales tax/VAT | Included -- Paddle handles all tax/VAT    |
| **Subscriptions**        | Full-featured, highly customizable        | Built-in, simpler API                    | Built-in, enterprise-grade                |
| **One-time Payments**    | Checkout Sessions, Payment Intents        | Checkout overlays, product variants      | Checkout overlays, one-time items         |
| **Usage-based Billing**  | Metered billing, usage records API        | Not natively supported                   | Limited support                           |
| **Marketplace/Connect**  | Stripe Connect (full platform support)    | Not supported                            | Not supported                             |
| **Payouts**              | You receive funds directly (minus fees)   | LS pays you (net of tax + fees)          | Paddle pays you (net of tax + fees)       |
| **License Keys**         | Not built-in (use third-party)            | Built-in license key generation          | Not built-in                              |
| **Best For**             | SaaS, marketplaces, complex billing       | Solo devs, small SaaS, digital products  | Mid-to-enterprise SaaS, B2B software      |

**The Key Decision: Merchant of Record vs. Self-Managed.** Stripe makes you the merchant -- you collect payments, remit sales tax, handle VAT compliance, issue invoices, and deal with chargebacks. LemonSqueezy and Paddle are the legal seller; they calculate and remit all sales tax, VAT, and GST worldwide. The tradeoff: higher fees (5% vs 2.9%) and less control.

**Recommendation:**

- Use **Stripe** as default for most SaaS -- maximum control, best ecosystem, lowest fees, broadest feature set. If you have the resources (or willingness) to handle tax compliance, Stripe is the clear winner.
- Use **LemonSqueezy** if you are a solo developer or small team selling digital products/SaaS and do not want to deal with tax compliance. It is the simplest path to getting paid globally with zero tax headaches.
- Use **Paddle** for mid-to-enterprise B2B SaaS wanting MoR benefits with enterprise features like advanced revenue recovery (dunning), localized pricing, and custom contract support.

---

## Principles

### 1. Never Trust the Client for Pricing

All prices must be validated server-side. The client sends a price ID; the server looks it up from your database or the provider's product catalog.

```typescript
// WRONG: Price from client
const { price } = req.body; // User could send $0.01

// RIGHT: Price ID from client, looked up server-side
const { priceId } = req.body;
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: priceId, quantity: 1 }],
});
```

### 2. Webhooks Are Your Source of Truth

Never rely on client-side redirects to confirm payment. Always verify webhook signatures. Make handlers idempotent (same event delivered twice must not create duplicates). Respond with 200 quickly -- do heavy processing asynchronously.

### 3. Separate Payment Logic from Business Logic

Create an abstraction layer so you can swap providers or test without hitting real APIs.

```typescript
interface BillingProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<Subscription>;
  handleWebhook(payload: string, signature: string): Promise<WebhookResult>;
}
```

### 4. Handle All Subscription States

Subscriptions have more states than "active" and "cancelled." Handle: **trialing**, **past_due** (payment failed, retrying), **unpaid** (all retries failed), **paused**, **cancelled but period not ended** (full access until period end), and **incomplete** (requires 3D Secure).

```typescript
function hasAnyAccess(subscription: Subscription): boolean {
  if (['active', 'trialing'].includes(subscription.status)) return true;
  if (subscription.cancelAtPeriodEnd && new Date() < subscription.currentPeriodEnd) return true;
  return false;
}
```

### 5. Sync Billing Data to Your Database

Never rely solely on the payment provider as your database. Store customer ID mappings, subscription status, plan, and period dates locally for fast lookups and provider portability.

```typescript
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(), // 'stripe' | 'lemonsqueezy' | 'paddle'
  providerCustomerId: text('provider_customer_id').notNull(),
  providerSubscriptionId: text('provider_subscription_id').notNull(),
  providerPriceId: text('provider_price_id').notNull(),
  status: text('status').notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 6. Use Environment Variables Correctly

Every provider has test/sandbox and live modes. Never hardcode keys. Only publishable/client keys get the `NEXT_PUBLIC_` prefix.

```bash
# Server only (no NEXT_PUBLIC_ prefix)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Safe for client
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 7. Implement Structured Error Handling

Payment failures happen -- cards decline, 3D Secure times out, webhooks fail. Catch provider-specific errors and surface user-friendly messages. Never expose raw provider errors to users.

```typescript
import Stripe from 'stripe';

async function safeCheckout(userId: string, priceId: string) {
  try {
    const session = await stripe.checkout.sessions.create({ /* ... */ });
    return { success: true, url: session.url };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      return { success: false, error: 'Your card was declined. Please try another card.' };
    }
    if (error instanceof Stripe.errors.StripeRateLimitError) {
      return { success: false, error: 'Please try again in a moment.' };
    }
    console.error(`[Billing] Unexpected error for user ${userId}:`, error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
```

---

## LLM Instructions

### Stripe

Install: `npm install stripe @stripe/stripe-js`

#### Server-Side Instance

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia', // Always pin the API version
  typescript: true,
});
```

#### Client-Side Instance

```typescript
// lib/stripe-client.ts
import { loadStripe } from '@stripe/stripe-js';

let stripePromise: ReturnType<typeof loadStripe>;
export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
```

#### Checkout Session

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { priceId } = await req.json();
  const allowedPrices = [process.env.STRIPE_PRO_MONTHLY_PRICE_ID, process.env.STRIPE_PRO_YEARLY_PRICE_ID];
  if (!allowedPrices.includes(priceId)) return NextResponse.json({ error: 'Invalid price' }, { status: 400 });

  let customerId = await getStripeCustomerId(session.user.id);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email!, metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await saveStripeCustomerId(session.user.id, customerId);
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?cancelled=true`,
    subscription_data: { metadata: { userId: session.user.id } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

#### Webhook Endpoint

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text(); // MUST be raw text for signature verification
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(subscriptions).set({
        status: sub.status,
        providerPriceId: sub.items.data[0]?.price.id ?? '',
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date(),
      }).where(eq(subscriptions.userId, sub.metadata.userId));
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(subscriptions).set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(subscriptions.userId, sub.metadata.userId));
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const user = await getUserByStripeCustomerId(invoice.customer as string);
      if (user) await sendPaymentFailedEmail(user.email);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

#### Subscription Management

```typescript
// Cancel at period end
await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

// Change plan (upgrade/downgrade)
const sub = await stripe.subscriptions.retrieve(subscriptionId);
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: sub.items.data[0].id, price: newPriceId }],
  proration_behavior: 'always_invoice',
});
```

#### Customer Portal

Saves significant development time -- lets users manage billing, invoices, and subscriptions without custom UI.

```typescript
// app/api/billing-portal/route.ts
const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
});
return NextResponse.json({ url: portalSession.url });
```

#### Stripe Tax

```typescript
const checkoutSession = await stripe.checkout.sessions.create({
  // ...other options
  automatic_tax: { enabled: true },
  customer_update: { address: 'auto' },
});
```

Set your tax settings in the Stripe Dashboard: register tax IDs, set origin address, configure taxable products.

#### Usage-Based Billing

```typescript
// Report usage for metered pricing
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: 1,
  timestamp: Math.floor(Date.now() / 1000),
  action: 'increment',
});
```

#### Stripe Connect (Marketplaces)

```typescript
// Create connected account and onboarding link
const account = await stripe.accounts.create({
  type: 'express', country: 'US', email: seller.email,
  capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
});
const accountLink = await stripe.accountLinks.create({
  account: account.id, type: 'account_onboarding',
  refresh_url: `${APP_URL}/onboarding/refresh`,
  return_url: `${APP_URL}/onboarding/complete`,
});

// Payment with platform fee
await stripe.paymentIntents.create({
  amount: 10000, currency: 'usd',
  application_fee_amount: 1500,
  transfer_data: { destination: connectedAccountId },
});
```

---

### LemonSqueezy

Install: `npm install @lemonsqueezy/lemonsqueezy.js`

#### SDK Setup

```typescript
// lib/lemonsqueezy.ts
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

export function configureLemonSqueezy() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    onError: (error) => { console.error('[LemonSqueezy]', error); throw error; },
  });
}
```

Call `configureLemonSqueezy()` before any API call.

#### Creating a Checkout

```typescript
// app/api/checkout/lemonsqueezy/route.ts
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  configureLemonSqueezy();

  const { variantId } = await req.json();
  const checkout = await createCheckout(process.env.LEMONSQUEEZY_STORE_ID!, variantId, {
    checkoutOptions: { embed: true, media: true, logo: true },
    checkoutData: {
      email: session.user.email ?? undefined,
      custom: { userId: session.user.id },
    },
    productOptions: {
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    },
  });

  return NextResponse.json({ checkoutUrl: checkout.data?.data.attributes.url });
}
```

#### Checkout Overlay (Client-Side)

```typescript
// components/lemonsqueezy-button.tsx
'use client';
import { useState, useEffect } from 'react';

export function LemonSqueezyButton({ variantId }: { variantId: string }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.defer = true;
    script.onload = () => (window as any).createLemonSqueezy?.();
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    const res = await fetch('/api/checkout/lemonsqueezy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId }),
    });
    const { checkoutUrl } = await res.json();
    if (checkoutUrl) (window as any).LemonSqueezy?.Url.Open(checkoutUrl);
    setLoading(false);
  };

  return <button onClick={handleCheckout} disabled={loading}>{loading ? 'Loading...' : 'Subscribe'}</button>;
}
```

#### Webhook Handling

LemonSqueezy webhooks use HMAC-SHA256 for verification.

```typescript
// app/api/webhooks/lemonsqueezy/route.ts
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');
  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!);
  const digest = hmac.update(rawBody).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventName = event.meta.event_name;
  const userId = event.meta.custom_data?.userId;

  switch (eventName) {
    case 'subscription_created': {
      const attrs = event.data.attributes;
      await db.insert(subscriptions).values({
        id: crypto.randomUUID(), userId: userId!, provider: 'lemonsqueezy',
        providerCustomerId: String(attrs.customer_id),
        providerSubscriptionId: event.data.id,
        providerPriceId: String(attrs.variant_id),
        status: attrs.status,
        currentPeriodEnd: new Date(attrs.ends_at ?? attrs.renews_at),
        createdAt: new Date(), updatedAt: new Date(),
      });
      break;
    }
    case 'subscription_updated': {
      const attrs = event.data.attributes;
      await db.update(subscriptions).set({
        status: attrs.status, providerPriceId: String(attrs.variant_id),
        cancelAtPeriodEnd: attrs.cancelled, updatedAt: new Date(),
      }).where(eq(subscriptions.providerSubscriptionId, event.data.id));
      break;
    }
    case 'subscription_cancelled':
      await db.update(subscriptions).set({ status: 'cancelled', cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptions.providerSubscriptionId, event.data.id));
      break;
    case 'order_created':
      if (userId) await grantOneTimePurchase(userId, event.data.attributes);
      break;
    case 'license_key_created':
      if (userId) await storeLicenseKey(userId, event.data.attributes.key, event.data.attributes.activation_limit);
      break;
  }

  return NextResponse.json({ received: true });
}
```

#### Subscription Management

```typescript
import { cancelSubscription, updateSubscription } from '@lemonsqueezy/lemonsqueezy.js';

// Cancel (at period end by default)
await cancelSubscription(subscriptionId);

// Pause
await updateSubscription(subscriptionId, { pause: { mode: 'void' } });

// Resume
await updateSubscription(subscriptionId, { cancelled: false });

// Unpause
await updateSubscription(subscriptionId, { pause: null });
```

#### License Keys

```typescript
import { validateLicense, activateLicense } from '@lemonsqueezy/lemonsqueezy.js';

const result = await validateLicense(licenseKey, instanceName);
// result.data?.valid, result.data?.meta?.status, result.data?.meta?.activations_count

const activation = await activateLicense(licenseKey, instanceName);
// activation.data?.activated, activation.data?.instance?.id
```

#### Customer Portal

LemonSqueezy provides a hosted portal URL per customer:

```typescript
const sub = await getSubscription(subscriptionId);
const portalUrl = sub.data?.data.attributes.urls.customer_portal;
```

---

### Paddle

Install: `npm install @paddle/paddle-js @paddle/paddle-node-sdk`

#### Server-Side Setup

```typescript
// lib/paddle.ts
import { Paddle, Environment } from '@paddle/paddle-node-sdk';

export const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment: process.env.PADDLE_ENVIRONMENT === 'production'
    ? Environment.production : Environment.sandbox,
});
```

#### Client-Side Paddle.js

```typescript
// components/paddle-provider.tsx
'use client';
import { useEffect, useState } from 'react';
import { initializePaddle, Paddle, Environments, type EventCallback } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;

export function usePaddle() {
  const [paddle, setPaddle] = useState<Paddle | null>(paddleInstance);

  useEffect(() => {
    if (paddleInstance) { setPaddle(paddleInstance); return; }
    initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production'
        ? Environments.production : Environments.sandbox,
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      eventCallback: ((event) => {
        if (event.name === 'checkout.completed') console.log('[Paddle] Checkout completed');
      }) as EventCallback,
    }).then((instance) => { if (instance) { paddleInstance = instance; setPaddle(instance); } });
  }, []);

  return paddle;
}
```

#### Checkout (Overlay)

Paddle checkout opens directly from the client -- no server-side session creation needed.

```typescript
// components/paddle-checkout-button.tsx
'use client';
import { usePaddle } from './paddle-provider';

export function PaddleCheckoutButton({ priceId, userEmail, userId }: {
  priceId: string; userEmail?: string; userId?: string;
}) {
  const paddle = usePaddle();

  const handleCheckout = () => {
    if (!paddle) return;
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: userEmail },
      customData: { userId },
      settings: {
        displayMode: 'overlay', theme: 'light', locale: 'en',
        successUrl: `${window.location.origin}/billing?success=true`,
      },
    });
  };

  return <button onClick={handleCheckout} disabled={!paddle}>{paddle ? 'Subscribe' : 'Loading...'}</button>;
}
```

#### Webhook Handling

```typescript
// app/api/webhooks/paddle/route.ts
import { paddle } from '@/lib/paddle';
import { EventName } from '@paddle/paddle-node-sdk';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('paddle-signature');
  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event;
  try {
    event = paddle.webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET_KEY!, signature);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  if (!event) return NextResponse.json({ error: 'Parse failed' }, { status: 400 });

  switch (event.eventType) {
    case EventName.SubscriptionCreated: {
      const userId = (event.data.customData as any)?.userId;
      if (!userId) break;
      const item = event.data.items[0];
      await db.insert(subscriptions).values({
        id: crypto.randomUUID(), userId, provider: 'paddle',
        providerCustomerId: event.data.customerId,
        providerSubscriptionId: event.data.id,
        providerPriceId: item?.price?.id ?? '',
        status: event.data.status,
        currentPeriodEnd: event.data.currentBillingPeriod?.endsAt
          ? new Date(event.data.currentBillingPeriod.endsAt) : null,
        createdAt: new Date(), updatedAt: new Date(),
      });
      break;
    }
    case EventName.SubscriptionUpdated: {
      const item = event.data.items[0];
      await db.update(subscriptions).set({
        status: event.data.status, providerPriceId: item?.price?.id ?? '',
        cancelAtPeriodEnd: event.data.scheduledChange?.action === 'cancel',
        updatedAt: new Date(),
      }).where(eq(subscriptions.providerSubscriptionId, event.data.id));
      break;
    }
    case EventName.SubscriptionCanceled:
      await db.update(subscriptions).set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(subscriptions.providerSubscriptionId, event.data.id));
      break;
  }

  return NextResponse.json({ received: true });
}
```

#### Subscription Management

```typescript
// Cancel at period end
await paddle.subscriptions.cancel(subscriptionId, { effectiveFrom: 'next_billing_period' });

// Change plan
await paddle.subscriptions.update(subscriptionId, {
  items: [{ priceId: newPriceId, quantity: 1 }],
  prorationBillingMode: 'prorated_immediately',
});

// Pause / Resume
await paddle.subscriptions.pause(subscriptionId, { effectiveFrom: 'next_billing_period' });
await paddle.subscriptions.resume(subscriptionId, { effectiveFrom: 'immediately' });
```

---

## Examples

### Project Structure (Any Provider)

```
project/
  .env.local                          # Provider keys (never commit)
  lib/
    stripe.ts                         # or lemonsqueezy.ts or paddle.ts
  app/
    api/
      checkout/route.ts               # Create checkout
      billing-portal/route.ts         # Customer portal redirect
      subscription/route.ts           # Manage subscription
      webhooks/[provider]/route.ts    # Webhook handler
    billing/page.tsx                   # Billing page
  components/
    pricing-button.tsx                 # Checkout trigger
```

### Testing Webhooks Locally

```bash
# Stripe: CLI forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed

# LemonSqueezy / Paddle: Use a tunnel
npx localtunnel --port 3000  # or ngrok http 3000
# Set the public URL as webhook endpoint in the provider dashboard

# Stripe test cards:
# 4242424242424242 -- Succeeds
# 4000000000000002 -- Declined
# 4000002500003155 -- Requires 3D Secure
```

### Middleware for Subscription Gating

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const BILLING_REQUIRED = ['/app'];

export async function middleware(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL('/login', req.url));

  const requiresBilling = BILLING_REQUIRED.some((r) => req.nextUrl.pathname.startsWith(r));
  if (requiresBilling) {
    const sub = await getUserSubscription(session.user.id);
    if (!sub || !hasAnyAccess(sub)) return NextResponse.redirect(new URL('/billing', req.url));
  }
  return NextResponse.next();
}
```

### Server Action Pattern (Alternative to API Routes)

```typescript
// actions/billing.ts
'use server';
import { stripe } from '@/lib/stripe';
import { redirect } from 'next/navigation';

export async function createCheckoutAction(priceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const customerId = await getOrCreateStripeCustomer(session.user.id, session.user.email!);
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId, mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    subscription_data: { metadata: { userId: session.user.id } },
  });
  if (checkoutSession.url) redirect(checkoutSession.url);
}
```

---

## Common Mistakes

### 1. Parsing Webhook Body as JSON Before Signature Verification

**Wrong:** `const body = await req.json()` then `constructEvent(JSON.stringify(body), ...)` -- re-stringifying changes byte representation.
**Fix:** `const body = await req.text()` -- always use the raw body for signature verification.

### 2. Non-Idempotent Webhook Handlers

**Wrong:** Blindly inserting a subscription record on every `subscription_created` event -- duplicate if retried.
**Fix:** Check if the record already exists by `providerSubscriptionId` before inserting.

### 3. Relying on Client Redirect for Payment Confirmation

**Wrong:** Activating a subscription when the user lands on `?success=true` -- the URL parameter can be faked.
**Fix:** Only activate subscriptions in the webhook handler. The success page is purely cosmetic.

### 4. Hardcoding Prices or Accepting Client-Provided Amounts

**Wrong:** `price_data: { unit_amount: req.body.amount }` -- user controls the price.
**Fix:** Validate `priceId` against an allowlist of known price IDs, then pass it to the checkout.

### 5. Not Handling Subscription Status Transitions

**Wrong:** `user.isSubscribed` as a boolean -- misses trialing, past_due, cancelled-but-active states.
**Fix:** Store the full status string and check it with a function that handles all states (see Principles section 4).

### 6. Creating Duplicate Stripe Customers

**Wrong:** Calling `stripe.customers.create()` on every checkout without checking for an existing customer.
**Fix:** Store `stripeCustomerId` in your user table, look it up first, create only if it does not exist.

### 7. Exposing Secret Keys to the Client

**Wrong:** `NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_test_...` -- the `NEXT_PUBLIC_` prefix exposes it to the browser.
**Fix:** Only publishable/client keys use `NEXT_PUBLIC_`. Secret keys, API keys, and webhook secrets never get this prefix.

### 8. Not Testing Webhooks Before Deploying

**Wrong:** Deploying to production without testing webhooks -- you discover bugs when real customers pay.
**Fix:** Use `stripe listen --forward-to`, `stripe trigger`, LemonSqueezy dashboard test webhooks, or Paddle Sandbox simulator. Test the full flow locally.

### 9. Ignoring Currency Formatting

**Wrong:** `<p>Price: ${amount / 100}/mo</p>` -- breaks for non-USD currencies and non-US locales.
**Fix:** Use `Intl.NumberFormat` with the correct currency code:

```typescript
function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 0,
  }).format(amount / 100);
}
```

### 10. Forgetting to Cancel at Period End

**Wrong:** Immediately deleting the subscription -- user loses access mid-billing-period they already paid for.
**Fix:** Use `cancel_at_period_end: true` (Stripe), `cancelSubscription()` which defaults to period end (LS), or `effectiveFrom: 'next_billing_period'` (Paddle). The user keeps access until their paid period expires.

---

> **See also:** [Product-Growth/Billing-Monetization](../../Product-Growth/Billing-Monetization/billing-monetization.md) for billing patterns and monetization strategy | [Stripe Docs](https://stripe.com/docs) | [LemonSqueezy Docs](https://docs.lemonsqueezy.com) | [Paddle Docs](https://developer.paddle.com)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
