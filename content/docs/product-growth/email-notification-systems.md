---
title: "Email & Notification Systems"
description: ESP configuration, React Email templating, drip campaign state machines, in-app notification architecture, web push setup, notification preferences, digest pipelines, and transactional vs. marketing compliance. The system that reaches users when they are not in your product is as important as the product itself.
---
# Email & Notification Systems
> ESP configuration, React Email templating, drip campaign state machines, in-app notification architecture, web push setup, notification preferences, digest pipelines, and transactional vs. marketing compliance. The system that reaches users when they are not in your product is as important as the product itself.

---

## Principles

### 1. Choose Your ESP Based on Use Case, Not Popularity

Email Service Providers are not interchangeable. Each occupies a distinct position in the reliability-cost-features spectrum, and choosing the wrong one creates problems that compound as your sending volume grows. The three ESPs that matter for modern TypeScript/Next.js products are Resend, Postmark, and Amazon SES. Understanding when to use each is the first architectural decision you make.

Resend is built for developers who use React Email. It has the best DX of any ESP: a clean REST API, first-party TypeScript SDK, native React Email support (you pass a React component directly to the send function), and a generous free tier. Resend is the right default for startups and early-stage products that send fewer than 50,000 emails per month. Its limitations show at scale -- deliverability monitoring is less mature than Postmark's, and you have less control over IP reputation management than SES.

Postmark is the deliverability-obsessed choice. It separates transactional and marketing email into distinct "message streams," each with independent IP reputation. This separation is critical because marketing emails (which get spam complaints) cannot damage the deliverability of your transactional emails (password resets, receipts, security alerts). Postmark is the right choice when email deliverability is a business-critical concern -- SaaS products where a missed password reset email means a lost customer, or financial products where transaction receipts must arrive reliably.

Amazon SES is the high-volume, low-cost choice. At $0.10 per 1,000 emails, it is an order of magnitude cheaper than Resend or Postmark at scale. SES gives you raw sending infrastructure -- you manage your own IP reputation, configure DKIM/SPF/DMARC yourself, handle bounce and complaint processing, and build your own sending logic. SES is the right choice when you send millions of emails per month and have the engineering capacity to operate email infrastructure. For most products, SES is premature optimization until you are spending thousands per month on Resend or Postmark.

### 2. Treat Email Templates as UI Components

HTML email is a hostile rendering environment. Every email client has its own CSS support, its own quirks, and its own way of mangling your carefully crafted layout. Outlook uses the Word rendering engine. Gmail strips `<style>` tags from `<head>` and rewrites class names. Yahoo does not support CSS grid. Building email templates with raw HTML and inline styles is painful, error-prone, and unmaintainable.

React Email solves this by letting you build email templates with React components that compile to email-safe HTML. You write JSX using components like `<Section>`, `<Row>`, `<Column>`, `<Button>`, `<Img>`, and `<Text>` that abstract away the underlying table-based layout and inline styles required for cross-client compatibility. The result is email templates that are as readable, composable, and maintainable as your application UI -- because they use the same language and the same patterns.

The key insight is that email templates should live in your codebase alongside your application code, not in a drag-and-drop editor on a third-party platform. When templates are code, they get version control, type checking, code review, and consistent styling through shared design tokens. You can extract common elements (header, footer, button styles) into shared components and compose them into specific templates. You can pass typed props for dynamic content. You can preview emails in the browser during development using React Email's preview server. This principle applies even if you are not using React Email -- whether you use MJML, Maizzle, or Handlebars, the template source should be in your repository, rendered by your application, and tested in CI.

### 3. Model Drip Campaigns as State Machines

A drip campaign is a multi-step email sequence triggered by a user action. The classic examples are onboarding drips (welcome, feature highlight, activation nudge, upgrade prompt), trial expiration sequences, and re-engagement campaigns. Each campaign has multiple steps, conditional branching, delay intervals, and cancellation conditions.

The mistake most teams make is modeling drip campaigns as a series of scheduled cron jobs or queued delayed messages. This approach falls apart as soon as you add branching logic (if the user activated, skip the nudge and send a feature deep-dive instead), cancellation conditions (if the user upgraded, stop the trial expiration sequence), or dynamic timing (wait 2 days, but only if the user has not logged in). Cron jobs do not have state. Queued messages do not have context.

The correct abstraction is a state machine. Each drip campaign is a finite state machine where states represent the user's position in the sequence, transitions are triggered by events (time elapsed, user action, external signal), and each state entry has a side effect (send an email, update a record, enqueue the next check). The state machine is persisted in the database -- you store the user's current state, the campaign they are enrolled in, and the timestamp of their last transition. A periodic worker checks for users whose next transition is due and advances them. State machines make drip campaigns debuggable (you can query who is in which state), testable (you can unit test individual transitions), and flexible (adding a branch is adding a state, not restructuring the pipeline).

### 4. Build In-App Notifications as a First-Class System

In-app notifications -- the bell icon with a badge count, the notification dropdown, the toast messages -- are often treated as an afterthought. Teams bolt them onto existing systems using ad-hoc database queries and polling. This results in notifications that are slow to appear, inconsistent across views, and impossible to manage at scale.

In-app notifications deserve a dedicated database schema, a dedicated API, and a dedicated real-time delivery mechanism. The schema needs at minimum: a `notifications` table with `id`, `user_id`, `type`, `title`, `body`, `data` (JSONB for type-specific payload), `read_at` (nullable timestamp), `seen_at` (nullable timestamp), `created_at`, and `archived_at`. The distinction between "seen" and "read" matters -- seen means the notification appeared in the user's viewport (which clears the badge count), read means the user clicked on it (which marks it as actioned).

Real-time delivery requires a push mechanism. Polling every 5 seconds is wasteful and still introduces up to 5 seconds of latency. Server-Sent Events (SSE) are the simplest push mechanism for notifications -- they are unidirectional (server to client), work over standard HTTP, survive proxy servers better than WebSockets, and automatically reconnect. In Next.js, implement SSE via a Route Handler that holds the connection open and writes events as they occur. For multi-server deployments, use Redis Pub/Sub or Postgres LISTEN/NOTIFY to fan out notifications from the server that created them to the server holding the user's SSE connection.

### 5. Web Push Is a Permission You Earn

Web push notifications let you reach users even when they are not on your site. They appear in the operating system's native notification UI, which makes them high-visibility and high-interruption. This power comes with a cost: if you abuse it, users revoke the permission, and you can never ask again. The browser's "Block" decision is permanent for your origin.

The worst possible implementation is requesting push notification permission on the first page load. The user has no context, no relationship with your product, and no reason to trust you with their attention. Permission prompt acceptance rates for cold asks hover around 5-10%. In contrast, a permission request that comes after the user has received value -- after they complete onboarding, after they receive their first in-app notification, after they explicitly click a "Get notified" button -- sees acceptance rates of 30-50%.

The technical implementation requires three pieces: a service worker that receives push events and displays notifications, a subscription flow that requests permission and sends the subscription endpoint to your server, and a server-side sending mechanism that dispatches push payloads to stored subscription endpoints. VAPID (Voluntary Application Server Identification) keys authenticate your server to the push service. Generate a key pair once, store the private key as a server-side secret, and include the public key in your service worker registration. The `web-push` npm package handles the encryption and HTTP calls.

### 6. Notification Preferences Are a Contract With Your Users

Every notification system must give users granular control over what they receive, how they receive it, and how often. This is not just good UX -- it is a legal requirement under CAN-SPAM, GDPR, and virtually every email regulation. The unsubscribe link is the minimum; a proper notification preferences center is the standard.

The preferences schema needs two dimensions: notification type and delivery channel. Notification types are the categories your product sends: account activity, social (comments, mentions), product updates, marketing, billing, and security. Delivery channels are the mechanisms: email, in-app, and web push. The preferences table stores a boolean for each (type, channel) pair per user, with sensible defaults that favor the user's peace of mind. Frequency controls add a third dimension -- some users want real-time email for every comment, others want a daily digest. The preferences system should support per-type frequency options: real-time, daily digest, weekly digest, or off.

The preferences UI should be a single page with a clear matrix layout: rows are notification types, columns are delivery channels, and cells are toggles or dropdowns. Include one-click unsubscribe links in every email that map to the specific notification type -- clicking "unsubscribe" on a marketing email should disable marketing emails, not all emails.

### 7. Digests Aggregate Events Into Signal

A digest email collects multiple individual events into a single periodic summary. Instead of sending five separate "new comment" emails in an hour, you send one digest that lists all five comments. Digests reduce notification fatigue, lower email volume (which improves deliverability metrics), and provide a natural summary of what the user missed.

The digest architecture has three components: an event collector, a scheduler, and a renderer. The event collector captures individual notification events and stores them in a staging table. The scheduler runs periodically and queries for users who have pending events and have opted into digest frequency. The renderer groups pending events by type, formats them into a digest email template, sends the email, and marks the events as dispatched.

Timezone handling is critical for digests. A daily digest sent at 9am UTC arrives at 1am for users in San Francisco and 5pm for users in Mumbai. Store the user's timezone preference (or infer it from their browser) and schedule digests relative to their local time. Use a queue system with per-user scheduling rather than a single global cron job. Run the digest processor every hour and filter for users whose local time matches the target delivery hour.

### 8. Separate Transactional From Marketing at Every Layer

Transactional emails are triggered by a user action and contain information the user expects: password reset confirmations, order receipts, security alerts. Marketing emails are sent at the company's initiative to promote content, features, or offers. This distinction has legal, technical, and deliverability implications at every layer.

Legally, transactional emails are exempt from most email marketing regulations. CAN-SPAM does not require an unsubscribe link on transactional emails. GDPR allows transactional emails under "legitimate interest" without explicit marketing consent. Marketing emails require explicit opt-in consent, must include an unsubscribe mechanism, and must honor unsubscribe requests promptly. Mixing transactional and marketing content in a single email (e.g., a password reset with a promotional banner) can reclassify the entire email as marketing.

Technically, transactional and marketing emails should use separate sending infrastructure. With Postmark, use separate message streams. With Resend or SES, configure separate subdomains (`mail.yourapp.com` for transactional, `news.yourapp.com` for marketing) with independent DKIM keys and SPF records. In your codebase, separate transactional and marketing sending into distinct modules with different retry strategies -- transactional emails should retry aggressively (the user is waiting), marketing emails should fail gracefully and log for batch review.

---

## LLM Instructions

### 1. Setting Up an ESP With React Email

When asked to add email sending to a project, always start with Resend unless the user specifies otherwise. Configure the ESP, create a React Email template structure, and set up a typed send function.

1. Install dependencies: `resend` for the sending API and `@react-email/components` for template components. Install `react-email` as a dev dependency for the local preview server.
2. Create the email template directory at `src/emails/`. Each template is a React component file that exports a default function. Use React Email components (`Html`, `Head`, `Body`, `Container`, `Section`, `Text`, `Button`, `Img`, `Hr`, `Link`, `Preview`) for layout.
3. Create a shared layout component at `src/emails/components/layout.tsx` that includes the common header (logo), footer (company address, unsubscribe link), and base styles. Every email template wraps its content with this layout.
4. Create a typed email client at `src/lib/email/index.ts` that wraps the Resend SDK. Define a union type of all email types and their expected props. The `sendEmail` function accepts the email type, recipient, and typed props, then renders the correct React Email component.
5. For transactional emails, send immediately in your Server Action or Route Handler. For marketing and drip emails, enqueue the send via a job queue (Inngest, Trigger.dev, or a database-backed queue) to handle rate limiting and retries.
6. Configure DNS records: add the DKIM, SPF, and DMARC records that Resend provides. Verify the domain in the Resend dashboard. Use a subdomain (`mail.yourapp.com`) to isolate email reputation from your root domain.
7. Add the React Email preview server script to `package.json`: `"email:dev": "email dev --dir src/emails --port 3001"`.

### 2. Building Drip Campaign State Machines

When asked to implement a multi-step email sequence, model it as a database-backed state machine rather than a series of scheduled jobs.

1. Create a `drip_campaigns` table that defines available campaigns: `id`, `name`, `description`, `is_active`. Create a `drip_enrollments` table for user progress: `id`, `user_id`, `campaign_id`, `current_state`, `enrolled_at`, `last_transition_at`, `next_transition_at`, `completed_at`, `cancelled_at`. Index on `(next_transition_at)` where `completed_at IS NULL AND cancelled_at IS NULL`.
2. Define campaign steps in code as a typed state machine: each step has a `state` name, optional `emailTemplate`, `delayHours`, optional `branches` (with condition functions and target states), and a `nextState`.
3. Implement enrollment: insert a row with the initial state and compute `next_transition_at` from the first step's delay.
4. Implement the transition worker: a scheduled function that queries pending transitions, evaluates branch conditions, sends the email, advances the state, and computes the next transition time.
5. Implement cancellation: set `cancelled_at` on the enrollment when the user takes an action that should stop the campaign (e.g., upgrades during a trial expiration drip).
6. Log every transition with user ID, campaign, from-state, and to-state for auditability.

### 3. Implementing In-App Notifications With Real-Time Delivery

When asked to add notifications to an application, build a system with database persistence, API endpoints, real-time delivery via SSE, and a notification center UI.

1. Create the `notifications` table: `id` (UUID), `user_id`, `type`, `title`, `body`, `data` (JSONB), `action_url`, `read_at`, `seen_at`, `archived_at`, `created_at`. Index on `(user_id, created_at DESC)` and `(user_id, read_at)` filtered by `archived_at IS NULL`.
2. Create a notification creation function that inserts the row and publishes a real-time event via Redis Pub/Sub or Postgres NOTIFY.
3. Implement an SSE endpoint as a Next.js Route Handler. Authenticate the user, open a long-lived response with `Content-Type: text/event-stream`, subscribe to the user's channel, and write notifications as SSE events. Handle cleanup on client disconnect.
4. Create API routes: `GET /api/notifications` (paginated, filtered), `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`, and `PATCH /api/notifications/:id/archive`.
5. Build the notification center component: bell icon with unread badge, dropdown with notification list, SSE connection for real-time updates, mark-all-as-read action, and click-to-navigate behavior.

### 4. Setting Up Web Push Notifications

When asked to implement browser push notifications, build the complete pipeline: service worker, permission prompt UX, subscription persistence, and server-side sending.

1. Create `public/sw.js` handling `push` (parse payload, call `showNotification`) and `notificationclick` (close notification, call `clients.openWindow` with the target URL).
2. Generate VAPID keys: `npx web-push generate-vapid-keys`. Store private key as `VAPID_PRIVATE_KEY`, public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
3. Create a client subscription module: check support, register the service worker, subscribe via `pushManager.subscribe()` with the VAPID public key, and POST the subscription to your API.
4. Create `POST /api/push/subscribe` to store the subscription (endpoint, keys) linked to the user. Create a server-side send function using `web-push` that handles 410 responses by deleting stale subscriptions.
5. Never call `subscribeToPush()` on page load. Show a soft prompt with context ("Get notified when someone replies") and only trigger the native permission prompt on explicit user action.

### 5. Building Notification Preferences and Digest Pipelines

When asked to add notification settings or digest functionality, build a preferences system with per-type, per-channel granularity and a digest aggregation pipeline.

1. Create `notification_preferences` table: `user_id`, `notification_type`, `channel`, `enabled`, `frequency` (realtime/daily_digest/weekly_digest). Unique constraint on `(user_id, notification_type, channel)`.
2. Create a `shouldNotify(userId, type, channel)` function that queries preferences with sensible defaults. Call it before every notification dispatch.
3. Create a `digest_queue` table: `user_id`, `notification_type`, `title`, `body`, `data`, `action_url`, `created_at`, `dispatched_at`. When `shouldNotify` returns that the user wants a digest, insert into `digest_queue` instead of sending immediately.
4. Implement the digest worker: run hourly, filter for users whose local time matches the target hour, group pending events by type, render a digest email, send, and mark as dispatched.
5. Build the preferences UI as a settings page with a table layout: rows are notification types, columns are channels, cells are toggles (with frequency dropdown for email). Include one-click unsubscribe via signed tokens and `List-Unsubscribe` headers.

---

## Examples

### 1. React Email Templates With Typed Send Function (Resend)

```typescript
// src/emails/components/layout.tsx
import {
  Html, Head, Body, Container, Section, Img, Text, Hr, Link, Preview,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

type LayoutProps = {
  preview: string;
  children: React.ReactNode;
  unsubscribeUrl?: string;
};

export function EmailLayout({ preview, children, unsubscribeUrl }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] px-4 py-8">
            <Section className="mb-8">
              <Img
                src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`}
                width="120" height="36" alt="Acme"
              />
            </Section>
            <Section className="rounded-lg bg-white px-8 py-10 shadow-sm">
              {children}
            </Section>
            <Section className="mt-8 text-center">
              <Hr className="mb-4 border-gray-200" />
              <Text className="text-xs text-gray-400">
                Acme Inc, 123 Main St, San Francisco, CA 94102
              </Text>
              {unsubscribeUrl && (
                <Text className="text-xs text-gray-400">
                  <Link href={unsubscribeUrl} className="text-gray-400 underline">
                    Unsubscribe
                  </Link>{" | "}
                  <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`}
                    className="text-gray-400 underline">
                    Notification settings
                  </Link>
                </Text>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// src/emails/welcome.tsx
import { Text, Button, Section } from "@react-email/components";
import { EmailLayout } from "./components/layout";

type WelcomeEmailProps = { name: string; activationUrl: string };

export default function WelcomeEmail({ name, activationUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to Acme, ${name}!`}>
      <Text className="text-2xl font-bold text-gray-900">
        Welcome aboard, {name}!
      </Text>
      <Text className="mt-2 text-base text-gray-600">
        Your account is ready. Complete your setup to unlock all features.
      </Text>
      <Section className="mt-6 text-center">
        <Button href={activationUrl}
          className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white">
          Complete Setup
        </Button>
      </Section>
    </EmailLayout>
  );
}

// src/lib/email/index.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailMap = {
  welcome: { name: string; activationUrl: string };
  trial_ending: { name: string; daysLeft: number; upgradeUrl: string };
  comment_notification: {
    recipientName: string; commenterName: string;
    commentPreview: string; postTitle: string;
    commentUrl: string; unsubscribeUrl: string;
  };
};

const templates: Record<keyof EmailMap, () => Promise<{ default: React.FC<any> }>> = {
  welcome: () => import("@/emails/welcome"),
  trial_ending: () => import("@/emails/trial-ending"),
  comment_notification: () => import("@/emails/comment-notification"),
};

export async function sendEmail<K extends keyof EmailMap>(params: {
  type: K;
  to: string;
  subject: string;
  props: EmailMap[K];
  headers?: Record<string, string>;
}) {
  const mod = await templates[params.type]();
  const Template = mod.default;

  const { data, error } = await resend.emails.send({
    from: "Acme <hello@mail.acme.com>",
    to: params.to,
    subject: params.subject,
    react: Template(params.props),
    headers: { ...params.headers, "X-Email-Type": params.type },
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
  return data;
}
```

### 2. Drip Campaign State Machine (TypeScript + SQL)

```sql
CREATE TABLE drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  campaign VARCHAR(100) NOT NULL,
  current_state VARCHAR(100) NOT NULL DEFAULT 'enrolled',
  state_data JSONB DEFAULT '{}',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_transition_at TIMESTAMPTZ DEFAULT NOW(),
  next_transition_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  UNIQUE(user_id, campaign)
);

CREATE INDEX idx_drip_pending ON drip_enrollments (next_transition_at)
  WHERE completed_at IS NULL AND cancelled_at IS NULL;
```

```typescript
// src/lib/drip/engine.ts
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

type DripStep = {
  emailTemplate?: string;
  emailSubject?: string;
  emailProps?: (user: User) => Record<string, unknown>;
  delayHours: number;
  branches?: Array<{
    condition: (user: User) => Promise<boolean>;
    targetState: string;
  }>;
  nextState?: string;
};

type Campaign = { initialState: string; steps: Record<string, DripStep> };

const campaigns: Record<string, Campaign> = {
  onboarding: {
    initialState: "enrolled",
    steps: {
      enrolled: {
        emailTemplate: "welcome",
        emailSubject: "Welcome to Acme",
        emailProps: (user) => ({
          name: user.name,
          activationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
        }),
        delayHours: 0,
        nextState: "welcome_sent",
      },
      welcome_sent: {
        delayHours: 48,
        branches: [
          {
            condition: async (user) => {
              const u = await db.user.findUnique({ where: { id: user.id } });
              return u?.activatedAt !== null;
            },
            targetState: "activated_path",
          },
        ],
        emailTemplate: "feature_highlight",
        emailSubject: "3 features to save you hours this week",
        emailProps: (user) => ({ name: user.name }),
        nextState: "nudge_sent",
      },
      activated_path: {
        delayHours: 120,
        emailTemplate: "power_user_tips",
        emailSubject: "Advanced tips for power users",
        emailProps: (user) => ({ name: user.name }),
        nextState: "completed",
      },
      nudge_sent: {
        delayHours: 168,
        emailTemplate: "upgrade_prompt",
        emailSubject: "Unlock the full potential of Acme",
        emailProps: (user) => ({ name: user.name }),
        nextState: "completed",
      },
      completed: { delayHours: 0 },
    },
  },
};

export async function enrollUser(userId: string, campaignName: string) {
  const campaign = campaigns[campaignName];
  if (!campaign) throw new Error(`Unknown campaign: ${campaignName}`);

  const step = campaign.steps[campaign.initialState];

  return db.dripEnrollment.upsert({
    where: { userId_campaign: { userId, campaign: campaignName } },
    create: {
      userId,
      campaign: campaignName,
      currentState: campaign.initialState,
      nextTransitionAt: new Date(Date.now() + step.delayHours * 3600_000),
    },
    update: {},
  });
}

export async function cancelEnrollment(userId: string, campaignName: string) {
  await db.dripEnrollment.updateMany({
    where: { userId, campaign: campaignName, completedAt: null, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
}

export async function processPendingTransitions() {
  const pending = await db.dripEnrollment.findMany({
    where: { nextTransitionAt: { lte: new Date() }, completedAt: null, cancelledAt: null },
    include: { user: true },
    take: 100,
  });

  for (const enrollment of pending) {
    const campaign = campaigns[enrollment.campaign];
    if (!campaign) continue;
    const step = campaign.steps[enrollment.currentState];
    if (!step) continue;

    // Evaluate branches
    let nextState = step.nextState;
    if (step.branches) {
      for (const branch of step.branches) {
        if (await branch.condition(enrollment.user)) {
          nextState = branch.targetState;
          break;
        }
      }
    }

    // Send email
    if (step.emailTemplate && step.emailProps) {
      await sendEmail({
        type: step.emailTemplate as any,
        to: enrollment.user.email,
        subject: step.emailSubject!,
        props: step.emailProps(enrollment.user),
      });
    }

    // Advance state
    if (!nextState || nextState === "completed") {
      await db.dripEnrollment.update({
        where: { id: enrollment.id },
        data: { currentState: "completed", completedAt: new Date(), nextTransitionAt: null },
      });
    } else {
      const nextStep = campaign.steps[nextState];
      await db.dripEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentState: nextState,
          lastTransitionAt: new Date(),
          nextTransitionAt: nextStep
            ? new Date(Date.now() + nextStep.delayHours * 3600_000)
            : null,
        },
      });
    }
  }
}
```

### 3. In-App Notifications With SSE (Next.js + Redis)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  action_url VARCHAR(500),
  read_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_feed ON notifications (user_id, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX idx_notifications_unread ON notifications (user_id)
  WHERE read_at IS NULL AND archived_at IS NULL;
```

```typescript
// src/lib/notifications/create.ts
import { db } from "@/lib/db";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export async function createNotification(params: {
  userId: string; type: string; title: string;
  body?: string; data?: Record<string, unknown>; actionUrl?: string;
}) {
  const notification = await db.notification.create({ data: params });
  await redis.publish(`notifications:${params.userId}`, JSON.stringify(notification));
  return notification;
}

// src/app/api/notifications/stream/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import Redis from "ioredis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const subscriber = new Redis(process.env.REDIS_URL!);
      const channel = `notifications:${session.user.id}`;

      controller.enqueue(encoder.encode(": connected\n\n"));

      subscriber.subscribe(channel);
      subscriber.on("message", (_ch: string, message: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          subscriber.unsubscribe(channel);
          subscriber.disconnect();
        }
      });

      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(": keepalive\n\n")); }
        catch { clearInterval(keepalive); }
      }, 30_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        subscriber.unsubscribe(channel);
        subscriber.disconnect();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// src/components/notifications/notification-center.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";

type Notification = {
  id: string; type: string; title: string; body?: string;
  actionUrl?: string; readAt: string | null; createdAt: string;
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // SSE connection
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    es.onmessage = (event) => {
      const n: Notification = JSON.parse(event.data);
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
    };
    return () => es.close();
  }, []);

  // Initial fetch
  useEffect(() => {
    fetch("/api/notifications?filter=all").then((r) => r.json()).then((data) => {
      setNotifications(data.items);
      setUnreadCount(data.items.filter((n: Notification) => !n.readAt).length);
    });
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  const handleClick = useCallback(async (n: Notification) => {
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.actionUrl) window.location.href = n.actionUrl;
  }, []);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative rounded-full p-2 hover:bg-gray-100">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-sm text-blue-600 hover:text-blue-800">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet</p>
            ) : notifications.map((n) => (
              <button key={n.id} onClick={() => handleClick(n)}
                className={`w-full border-b px-4 py-3 text-left hover:bg-gray-50 ${!n.readAt ? "bg-blue-50" : ""}`}>
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{n.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Web Push With Soft Permission Prompt (Service Worker + Next.js)

```javascript
// public/sw.js
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/icon-192.png",
      badge: "/badge-72.png",
      tag: payload.tag,
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

```typescript
// src/lib/push/client.ts
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return res.ok;
  } catch { return false; }
}

// src/lib/push/server.ts
import webpush from "web-push";
import { db } from "@/lib/db";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const subs = await db.pushSubscription.findMany({ where: { userId } });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    })
  );
}

// src/components/push/push-prompt.tsx — soft prompt, not cold ask
"use client";
import { useState, useEffect } from "react";
import { isPushSupported, subscribeToPush } from "@/lib/push/client";

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPushSupported() && Notification.permission === "default") setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-medium text-blue-900">Get notified about replies</p>
          <p className="mt-1 text-sm text-blue-700">
            Receive a browser notification when someone replies to your comments.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShow(false)}
            className="rounded-md px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100">
            Not now
          </button>
          <button onClick={async () => { setLoading(true); await subscribeToPush(); setShow(false); }}
            disabled={loading}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Enabling..." : "Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5. Notification Preferences With Digest Pipeline

```sql
CREATE TABLE notification_preferences (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  frequency VARCHAR(20) NOT NULL DEFAULT 'realtime',
  UNIQUE(user_id, notification_type, channel)
);

CREATE TABLE digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  action_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ
);

CREATE INDEX idx_digest_pending ON digest_queue (user_id, created_at)
  WHERE dispatched_at IS NULL;
```

```typescript
// src/lib/notifications/preferences.ts
import { db } from "@/lib/db";

const DEFAULTS: Record<string, Record<string, { enabled: boolean; frequency: string }>> = {
  account:         { email: { enabled: true, frequency: "realtime" },  in_app: { enabled: true, frequency: "realtime" },  web_push: { enabled: false, frequency: "realtime" } },
  social:          { email: { enabled: true, frequency: "daily_digest" }, in_app: { enabled: true, frequency: "realtime" },  web_push: { enabled: true, frequency: "realtime" } },
  product_updates: { email: { enabled: true, frequency: "weekly_digest" }, in_app: { enabled: true, frequency: "realtime" },  web_push: { enabled: false, frequency: "realtime" } },
  marketing:       { email: { enabled: false, frequency: "realtime" }, in_app: { enabled: false, frequency: "realtime" }, web_push: { enabled: false, frequency: "realtime" } },
  billing:         { email: { enabled: true, frequency: "realtime" },  in_app: { enabled: true, frequency: "realtime" },  web_push: { enabled: false, frequency: "realtime" } },
  security:        { email: { enabled: true, frequency: "realtime" },  in_app: { enabled: true, frequency: "realtime" },  web_push: { enabled: true, frequency: "realtime" } },
};

export async function shouldNotify(userId: string, type: string, channel: string): Promise<boolean> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId_notificationType_channel: { userId, notificationType: type, channel } },
  });
  return pref ? pref.enabled : (DEFAULTS[type]?.[channel]?.enabled ?? false);
}

export async function getFrequency(userId: string, type: string, channel: string): Promise<string> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId_notificationType_channel: { userId, notificationType: type, channel } },
  });
  return pref ? pref.frequency : (DEFAULTS[type]?.[channel]?.frequency ?? "realtime");
}

// src/lib/notifications/dispatch.ts
import { createNotification } from "./create";
import { sendEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push/server";
import { shouldNotify, getFrequency } from "./preferences";
import { db } from "@/lib/db";

export async function dispatchNotification(params: {
  userId: string; type: string; title: string; body?: string;
  data?: Record<string, unknown>; actionUrl?: string;
  emailTemplate?: string; emailSubject?: string; emailProps?: Record<string, unknown>;
}) {
  // In-app: always real-time if enabled
  if (await shouldNotify(params.userId, params.type, "in_app")) {
    await createNotification(params);
  }

  // Web push
  if (await shouldNotify(params.userId, params.type, "web_push")) {
    await sendPushNotification(params.userId, {
      title: params.title, body: params.body ?? "", url: params.actionUrl,
    });
  }

  // Email: check frequency
  if (await shouldNotify(params.userId, params.type, "email")) {
    const freq = await getFrequency(params.userId, params.type, "email");
    if (freq === "realtime" && params.emailTemplate) {
      const user = await db.user.findUnique({ where: { id: params.userId } });
      if (user) {
        await sendEmail({
          type: params.emailTemplate as any,
          to: user.email,
          subject: params.emailSubject ?? params.title,
          props: params.emailProps ?? {},
        });
      }
    } else if (freq === "daily_digest" || freq === "weekly_digest") {
      await db.digestQueue.create({
        data: {
          userId: params.userId, notificationType: params.type,
          title: params.title, body: params.body,
          data: params.data ?? {}, actionUrl: params.actionUrl,
        },
      });
    }
  }
}

// src/lib/notifications/digest-worker.ts
export async function processDigests() {
  const currentUtcHour = new Date().getUTCHours();

  // Find users whose local 9am matches the current UTC hour
  const users = await db.$queryRaw<Array<{ id: string; email: string; name: string }>>`
    SELECT u.id, u.email, u.name FROM users u
    WHERE u.timezone_offset = ${9 - currentUtcHour}
    AND u.id IN (SELECT DISTINCT user_id FROM digest_queue WHERE dispatched_at IS NULL)
  `;

  for (const user of users) {
    const pending = await db.digestQueue.findMany({
      where: { userId: user.id, dispatchedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (pending.length === 0) continue;

    // Group by type
    const grouped: Record<string, typeof pending> = {};
    for (const event of pending) {
      (grouped[event.notificationType] ??= []).push(event);
    }

    await sendEmail({
      type: "digest" as any,
      to: user.email,
      subject: `Your ${pending.length} updates from Acme`,
      props: {
        name: user.name,
        groups: Object.entries(grouped).map(([type, events]) => ({
          type, events: events.map((e) => ({ title: e.title, body: e.body, actionUrl: e.actionUrl })),
        })),
      },
    });

    await db.digestQueue.updateMany({
      where: { id: { in: pending.map((e) => e.id) } },
      data: { dispatchedAt: new Date() },
    });
  }
}
```

---

## Common Mistakes

### 1. Using One Domain for Transactional and Marketing Email

**Wrong:** Sending password resets, receipts, newsletters, and promotions all from `noreply@yourapp.com`. A spam complaint wave from a marketing campaign tanks your domain reputation, and password reset emails start landing in spam.

**Fix:** Use separate subdomains with independent DNS records. Transactional sends from `mail.yourapp.com`, marketing from `news.yourapp.com`. If you use Postmark, configure separate message streams. Transactional deliverability should never depend on marketing reception.

### 2. Building Email Templates With Raw HTML

**Wrong:** Hundreds of lines of nested `<table>` elements with inline styles. Unreadable, unmaintainable, and breaks when you change the brand color.

```html
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr><td style="padding: 20px; font-family: Arial; font-size: 16px; color: #333;">
    Welcome to our platform!
  </td></tr>
</table>
```

**Fix:** Use React Email to abstract table layout into components.

```typescript
<Text className="text-base text-gray-700">Welcome to our platform!</Text>
```

### 3. Requesting Push Permission on First Page Load

**Wrong:** Calling `Notification.requestPermission()` immediately. The user clicks "Block," and the permission is permanently denied for your origin.

```typescript
useEffect(() => { Notification.requestPermission(); }, []);
```

**Fix:** Show a soft prompt explaining the value, then call the native prompt only on explicit user action.

```typescript
<button onClick={subscribeToPush}>Enable reply notifications</button>
```

### 4. Hardcoding Email Content in Send Calls

**Wrong:** Embedding subject lines and HTML directly in the send function, scattering email content across the codebase.

```typescript
await resend.emails.send({
  to: user.email,
  subject: "Your trial ends tomorrow!",
  html: `<h1>Hey ${user.name}</h1><p>Upgrade now</p>`,
});
```

**Fix:** Keep all content in dedicated template files. The send function receives a template type and typed props.

```typescript
await sendEmail({
  type: "trial_ending",
  to: user.email,
  subject: "Your trial ends tomorrow",
  props: { name: user.name, daysLeft: 1, upgradeUrl: "/upgrade" },
});
```

### 5. Polling for New Notifications

**Wrong:** `setInterval` polling every 5 seconds. Most polls return nothing, it adds server load, and still has latency.

```typescript
const interval = setInterval(() => fetch("/api/notifications"), 5000);
```

**Fix:** Use Server-Sent Events. Zero wasted requests, near-zero latency.

```typescript
const es = new EventSource("/api/notifications/stream");
es.onmessage = (event) => {
  setNotifications((prev) => [JSON.parse(event.data), ...prev]);
};
```

### 6. Drip Campaigns as Scheduled Delayed Messages

**Wrong:** Queuing all messages at enrollment time. Impossible to cancel or branch.

```typescript
await queue.add("send-email", { template: "welcome" }, { delay: 0 });
await queue.add("send-email", { template: "tip-1" }, { delay: 172800000 });
await queue.add("send-email", { template: "tip-2" }, { delay: 432000000 });
```

**Fix:** Use a state machine with database-persisted state. A periodic worker processes transitions.

```typescript
await enrollUser(userId, "onboarding"); // sets initial state in DB
// Worker evaluates conditions and advances state on schedule
```

### 7. No Unsubscribe Mechanism in Non-Transactional Email

**Wrong:** Sending product update or marketing emails without a working unsubscribe link. Violates CAN-SPAM and GDPR. Users who cannot unsubscribe mark the email as spam instead.

**Fix:** Include a visible unsubscribe link and `List-Unsubscribe` header in every non-transactional email. The link should immediately disable that notification type without requiring login.

```typescript
headers: {
  "List-Unsubscribe": `<${APP_URL}/unsubscribe?token=${signedToken}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
}
```

### 8. Sending Digests at a Fixed UTC Time

**Wrong:** Running the digest cron at 9:00 UTC for all users. Users in San Francisco receive it at 1:00am. Users in Tokyo receive it at 6:00pm.

**Fix:** Store the user's timezone. Run the digest processor every hour and filter for users whose local time matches the target hour.

```typescript
const currentUtcHour = new Date().getUTCHours();
const users = await db.user.findMany({
  where: { timezoneOffset: 9 - currentUtcHour },
});
```

### 9. Storing Push Subscriptions Without Cleanup

**Wrong:** Storing every push subscription indefinitely. Users switch browsers, clear data, or revoke permissions. Every send attempts delivery to dead endpoints.

**Fix:** Handle 410/404 responses by deleting stale subscriptions. Track `lastSuccessAt` to identify abandoned subscriptions.

```typescript
catch (err: any) {
  if (err.statusCode === 410 || err.statusCode === 404) {
    await db.pushSubscription.delete({ where: { id: sub.id } });
  }
}
```

### 10. Not Distinguishing Seen From Read

**Wrong:** Using a single `is_read` boolean. Opening the notification dropdown marks everything as "read," even items the user glanced at without clicking.

**Fix:** Track `seen_at` (appeared in viewport, clears badge) and `read_at` (user clicked, marks as actioned) as separate timestamps.

```sql
-- Badge count: WHERE seen_at IS NULL AND archived_at IS NULL
-- Unread styling: WHERE read_at IS NULL
```

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [Retention-Engagement](../Retention-Engagement/retention-engagement.md) | [Referral-Viral-Loops](../Referral-Viral-Loops/referral-viral-loops.md) | [User-Onboarding](../User-Onboarding/user-onboarding.md) | [Billing-Monetization](../Billing-Monetization/billing-monetization.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
