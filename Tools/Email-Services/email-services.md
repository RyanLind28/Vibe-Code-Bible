# Email Services
> Setup, configuration, and integration of email service providers for modern TypeScript/Next.js applications. Covers Resend, Postmark, SendGrid, and Loops -- from API key creation and domain verification through sending transactional emails, building templates, configuring webhooks, and orchestrating marketing campaigns.

---

## When to Use What

| Feature | Resend | Postmark | SendGrid | Loops |
|---|---|---|---|---|
| **Free tier** | 3,000 emails/month, 1 domain | 100 emails/month | 100 emails/day | 1,000 contacts |
| **Paid starting at** | $20/month (50K emails) | $15/month (10K emails) | $19.95/month (50K emails) | $49/month (5K contacts) |
| **React Email support** | Native (first-party) | Manual render to HTML | Manual render to HTML | No (API-only) |
| **Transactional email** | Yes | Yes (primary focus) | Yes | Yes |
| **Marketing email** | Basic (via Broadcast) | Yes (separate stream) | Yes (full-featured) | Yes (primary focus) |
| **Dynamic templates** | React components | Mustache-based server templates | Handlebars-based templates | Built-in visual editor |
| **Webhooks** | Delivered, bounced, complained, opened, clicked | Bounce, spam complaint, delivery, open, click | Full event webhook + Event Webhook | Contact events, email events |
| **Domain verification** | DKIM, SPF, DMARC via dashboard | DKIM, Return-Path via dashboard | DKIM, SPF via dashboard (domain auth) | DKIM via dashboard |
| **Message streams** | Single stream | Separate transactional + marketing streams | Separate via subuser or IP pool | Separate transactional + marketing |
| **API design** | REST, clean TypeScript SDK | REST, well-documented SDK | REST + SMTP relay, verbose SDK | REST, simple SDK |
| **Best for** | Developer-first projects, React Email users, startups | Deliverability-critical apps, SaaS transactional | High-volume senders, marketing + transactional at scale | SaaS marketing automation, event-driven campaigns |

### Decision Guide

**Choose Resend when** you are building a developer-first product, want the best TypeScript DX, use React Email for templates, and send fewer than 100K emails per month. Resend is the recommended default for new projects. Its API is the cleanest, its React Email integration is native, and its free tier is generous enough for MVP through early growth. Switch away only when you need deliverability guarantees that Resend's younger infrastructure cannot yet match, or when your volume makes its per-email pricing uneconomical.

**Choose Postmark when** email deliverability is a business-critical concern. Postmark's message stream separation means your transactional emails (password resets, security alerts, receipts) are protected from reputation damage caused by marketing campaigns. Postmark consistently benchmarks as the fastest ESP for time-to-inbox. Choose it for fintech, healthtech, or any product where a missed email means a lost customer or a compliance violation. The trade-off is a smaller feature set and a less modern DX than Resend.

**Choose SendGrid when** you need both transactional and marketing email at scale, with a visual template editor for non-technical team members, advanced analytics, and IP address management. SendGrid is the incumbent -- it handles billions of emails per month and has the most mature infrastructure. The trade-off is a more complex API, a heavier SDK, and a dashboard that can feel overwhelming. SendGrid is also the right choice when you need SMTP relay (for legacy systems) or when your marketing team needs a self-serve campaign builder.

**Choose Loops when** your primary need is SaaS marketing automation: onboarding sequences, event-triggered campaigns, newsletter management, and contact segmentation. Loops is not a general-purpose ESP -- it is a marketing email platform purpose-built for SaaS companies. Use it alongside Resend or Postmark for transactional email, and let Loops handle the marketing side. The trade-off is that Loops does not give you the sending infrastructure control that the other three provide, and its transactional email support is secondary to its campaign features.

---

## Principles

### 1. Default to Resend for Developer-First Projects

If you are starting a new TypeScript/Next.js project and the user has not specified an ESP, choose Resend. The reasoning is straightforward: Resend has the cleanest API of any ESP, its TypeScript SDK is first-party and well-typed, it accepts React Email components directly in the send call (no intermediate render step needed), and its free tier covers most products through their first year. The setup path from zero to first email sent is shorter with Resend than with any competitor.

This is an opinionated recommendation. Resend is younger than Postmark and SendGrid, its deliverability monitoring is less mature, and it does not have the decade-long track record of the incumbents. But for most projects, developer experience and speed of integration matter more than deliverability tooling in the first year. You can always migrate to Postmark if deliverability becomes a concern -- the sending abstraction layer described in this guide makes that migration a configuration change rather than a rewrite.

### 2. Always Abstract the Send Function

Never call an ESP's SDK directly from your application logic. Always create a wrapper function that accepts a typed email payload and delegates to the ESP. This abstraction provides three things: type safety (the compiler enforces that you pass the correct props for each email type), testability (you can mock the send function in tests without mocking the ESP SDK), and portability (switching ESPs requires changing only the wrapper, not every call site).

The wrapper should accept a union type of all email types, each with its required props. It should render the appropriate template, call the ESP's send method, and return a typed result. Error handling, retry logic, and logging belong in the wrapper, not in the calling code. This pattern is consistent regardless of which ESP you use.

### 3. Verify Your Domain Before Sending Production Email

Every ESP requires domain verification to send email from your domain. Until you verify, you send from the ESP's shared domain (e.g., `onboarding@resend.dev`), which has terrible deliverability and looks unprofessional. Domain verification involves adding DNS records -- typically DKIM (DomainKeys Identified Mail), SPF (Sender Policy Framework), and optionally DMARC (Domain-based Message Authentication, Reporting, and Conformance) -- that prove you own the domain and authorize the ESP to send on your behalf.

Use a subdomain for email sending, not your root domain. Send transactional email from `mail.yourapp.com` and marketing email from `news.yourapp.com`. This isolates your email reputation from your website and separates transactional from marketing reputation. If your marketing emails get spam complaints, they do not affect your transactional subdomain's reputation.

### 4. Treat Webhooks as the Source of Truth for Delivery Status

Calling `resend.emails.send()` or `postmark.sendEmail()` tells you that the ESP accepted the message. It does not tell you that the message was delivered, opened, clicked, or bounced. The only way to know what happened after acceptance is through webhooks.

Configure webhooks for every ESP you use. At minimum, listen for `delivered`, `bounced`, `complained` (spam complaint), and `unsubscribed` events. Store these events in your database and use them to update email status, suppress future sends to bounced addresses, and track engagement metrics. Webhook endpoints must be idempotent -- ESPs may send the same event multiple times. Use the event ID to deduplicate.

### 5. Separate Transactional and Marketing Infrastructure

Transactional emails (password resets, receipts, security alerts) must arrive reliably. Marketing emails (newsletters, promotions, product updates) inevitably generate spam complaints. If both send from the same domain, IP, or message stream, marketing complaints damage transactional deliverability.

Postmark enforces this separation architecturally with message streams. For Resend and SendGrid, you must enforce it yourself: use separate subdomains, separate API keys where possible, and separate sending functions in your codebase. Your transactional send function should retry aggressively (the user is waiting for their password reset). Your marketing send function should fail gracefully, log the failure, and move on to the next recipient.

### 6. Store API Keys in Environment Variables, Never in Code

Every ESP authenticates via API keys. These keys grant full sending access to your domain. A leaked API key means anyone can send email as your company, which destroys your domain reputation and can be used for phishing. Store API keys in environment variables, never in source code. Use different keys for development (sandbox/test mode) and production. Rotate keys if they are ever exposed in a commit, log, or error message.

### 7. Test Emails in Development Without Sending Real Email

Every ESP provides a way to test without sending to real inboxes. Resend has a test API key and a sandbox domain. Postmark has sandbox mode. SendGrid has a sandbox sending option. Use these in development. For local template development, use React Email's preview server (`npx react-email dev`) to iterate on templates in the browser without sending anything. For integration tests, mock the ESP SDK at the wrapper layer.

---

## LLM Instructions

### 1. Setting Up Resend

When asked to add email sending with Resend, follow this complete setup. Resend is the recommended default unless the user specifies another provider.

1. Install dependencies: `npm install resend @react-email/components` and `npm install -D react-email`.
2. Add the API key to `.env.local`: `RESEND_API_KEY=re_xxxxxxxxxxxx`. Get the key from the Resend dashboard at https://resend.com/api-keys.
3. Create the Resend client at `src/lib/email/resend.ts`. Import `Resend` from the `resend` package and instantiate it with the API key from the environment variable.
4. Create the email wrapper at `src/lib/email/index.ts`. Define a union type of all email templates and their props. Export a `sendEmail` function that accepts the template type, recipient, subject, and typed props.
5. Create the email template directory at `src/emails/`. Each template is a default-exported React component that accepts typed props and returns React Email JSX.
6. Create a shared layout component at `src/emails/components/layout.tsx` with common header, footer, and base styles.
7. Add the preview script to `package.json`: `"email:dev": "email dev --dir src/emails --port 3001"`.
8. For domain verification: go to Resend dashboard > Domains > Add Domain. Add the provided DKIM, SPF, and DMARC DNS records at your domain registrar. Verification typically completes within minutes for DKIM, up to 48 hours for full propagation.
9. For webhooks: go to Resend dashboard > Webhooks > Add Endpoint. Create a Route Handler at `src/app/api/webhooks/resend/route.ts` to receive events. Verify the webhook signature using the `svix` package.

### 2. Setting Up Postmark

When asked to add email sending with Postmark, follow this setup. Recommend Postmark when the user explicitly needs deliverability guarantees or message stream separation.

1. Install dependencies: `npm install postmark`. If using React Email templates, also install `@react-email/components` and `@react-email/render`.
2. Add credentials to `.env.local`: `POSTMARK_SERVER_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Get the token from the Postmark dashboard at https://account.postmarkapp.com/servers -- each server has its own token.
3. Create the Postmark client at `src/lib/email/postmark.ts`. Import `ServerClient` from `postmark` and instantiate it with the server token.
4. Configure message streams: in the Postmark dashboard, create a "transactional" stream (default) and a "broadcast" stream for marketing. Pass the `MessageStream` parameter in every send call.
5. For server-side templates: create templates in the Postmark dashboard using their visual editor. Templates use Mustache syntax (`{{variable}}`). Send with `sendEmailWithTemplate()` passing the template alias and the model (variables object).
6. For React Email templates: render the React component to HTML using `render()` from `@react-email/render`, then pass the rendered HTML to Postmark's `sendEmail()` as the `HtmlBody` parameter.
7. For domain verification: go to Postmark dashboard > Sender Signatures > Add Domain. Add the DKIM and Return-Path DNS records. Postmark does not require SPF if you use their Return-Path domain.
8. For bounce webhooks: go to Postmark dashboard > Servers > Your Server > Webhooks. Configure bounce, spam complaint, and delivery webhooks. Create a Route Handler at `src/app/api/webhooks/postmark/route.ts`.

### 3. Setting Up SendGrid

When asked to add email sending with SendGrid, follow this setup. Recommend SendGrid when the user needs high-volume sending, marketing campaigns with a visual builder, or SMTP relay.

1. Install dependencies: `npm install @sendgrid/mail`. For marketing API: `npm install @sendgrid/client`. If using React Email, also install `@react-email/components` and `@react-email/render`.
2. Add the API key to `.env.local`: `SENDGRID_API_KEY=SG.xxxxxxxxxxxx`. Get the key from https://app.sendgrid.com/settings/api_keys. Create a key with restricted permissions -- only grant "Mail Send" for transactional, add "Marketing" permissions only if needed.
3. Create the SendGrid client at `src/lib/email/sendgrid.ts`. Import `sgMail` from `@sendgrid/mail` and call `sgMail.setApiKey()` with the environment variable.
4. For domain authentication: go to SendGrid dashboard > Settings > Sender Authentication > Domain Authentication. Add the CNAME records SendGrid provides. This configures DKIM and SPF automatically.
5. For dynamic templates: create templates in the SendGrid dashboard using the visual editor or code editor. Templates use Handlebars syntax (`{{variable}}`, `{{#if}}`, `{{#each}}`). Each template gets a `d-xxxxxxxxxxxx` template ID. Send with `sgMail.send()` using the `templateId` and `dynamicTemplateData` fields.
6. For React Email templates: render to HTML with `@react-email/render` and pass as the `html` field in `sgMail.send()`.
7. For Event Webhook: go to Settings > Mail Settings > Event Webhook. Configure the URL, select events (processed, delivered, opened, clicked, bounced, dropped, spam report, unsubscribe). SendGrid sends events in batches.
8. For marketing campaigns: use the Marketing API or the dashboard UI. Create contact lists, design campaigns with the visual editor, and schedule sends.

### 4. Setting Up Loops

When asked to add marketing email automation with Loops, follow this setup. Loops is a SaaS marketing platform, not a general-purpose ESP. Recommend it alongside a transactional ESP (Resend or Postmark).

1. Install dependencies: `npm install loops`. The Loops SDK is lightweight and focused on the contact and event API.
2. Add the API key to `.env.local`: `LOOPS_API_KEY=xxxxxxxxxxxx`. Get the key from the Loops dashboard at https://app.loops.so/settings/api.
3. Create the Loops client at `src/lib/email/loops.ts`. Import `LoopsClient` from `loops` and instantiate it with the API key.
4. Sync contacts: when a user signs up, create or update a contact in Loops using `loops.createContact()` or `loops.updateContact()`. Pass user properties (email, firstName, plan, signupDate) that Loops uses for segmentation.
5. Send events: when a user performs a significant action (activated, upgraded, cancelled, completed onboarding), send an event to Loops using `loops.sendEvent()`. Events trigger campaigns configured in the Loops dashboard.
6. For transactional email: Loops supports transactional sends via `loops.sendTransactionalEmail()`. Pass the `transactionalId` (from the Loops dashboard) and the `dataVariables` object. However, for critical transactional email, use Resend or Postmark instead.
7. For campaign setup: design campaigns in the Loops dashboard. Set triggers (contact created, event received, property changed), define delays, add conditional branches, and compose emails with the visual editor. The engineering team's job is sending the right events and contact properties -- the marketing team configures the campaigns.
8. For domain verification: go to Loops dashboard > Settings > Sending > Add Domain. Add the DKIM DNS record Loops provides.

---

## Examples

### 1. Resend: Complete Setup With React Email

```typescript
// .env.local
// RESEND_API_KEY=re_xxxxxxxxxxxx
// RESEND_DOMAIN=mail.yourapp.com

// --------------------------------------------------------------------------
// src/lib/email/resend.ts — Resend client singleton
// --------------------------------------------------------------------------
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// --------------------------------------------------------------------------
// src/emails/components/layout.tsx — Shared email layout
// --------------------------------------------------------------------------
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function Layout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            margin: "40px auto",
            padding: "40px",
            maxWidth: "560px",
          }}
        >
          <Img
            src="https://yourapp.com/logo.png"
            width="120"
            height="36"
            alt="YourApp"
            style={{ marginBottom: "24px" }}
          />
          {children}
          <Hr style={{ borderColor: "#e6ebf1", margin: "32px 0" }} />
          <Text style={{ color: "#8898aa", fontSize: "12px", lineHeight: "16px" }}>
            YourApp, Inc. 123 Main St, San Francisco, CA 94105
          </Text>
          <Link
            href="{{unsubscribeUrl}}"
            style={{ color: "#8898aa", fontSize: "12px" }}
          >
            Unsubscribe
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

// --------------------------------------------------------------------------
// src/emails/welcome.tsx — Welcome email template
// --------------------------------------------------------------------------
import { Button, Text } from "@react-email/components";
import { Layout } from "./components/layout";
import * as React from "react";

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

export default function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <Layout preview={`Welcome to YourApp, ${name}`}>
      <Text style={{ fontSize: "20px", fontWeight: "bold", color: "#1a1a1a" }}>
        Welcome, {name}!
      </Text>
      <Text style={{ fontSize: "16px", color: "#4a4a4a", lineHeight: "24px" }}>
        Your account is ready. Start by exploring your dashboard to set up your
        first project.
      </Text>
      <Button
        href={loginUrl}
        style={{
          backgroundColor: "#000000",
          borderRadius: "6px",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "bold",
          padding: "12px 24px",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        Go to Dashboard
      </Button>
    </Layout>
  );
}

// Additional templates (password-reset.tsx, invoice-receipt.tsx, etc.)
// follow the same pattern: typed props interface, Layout wrapper, React Email components.

// --------------------------------------------------------------------------
// src/lib/email/index.ts — Typed email sending wrapper
// --------------------------------------------------------------------------
import { resend } from "./resend";
import WelcomeEmail from "@/emails/welcome";
import PasswordResetEmail from "@/emails/password-reset";

type EmailPayload =
  | {
      type: "welcome";
      to: string;
      props: { name: string; loginUrl: string };
    }
  | {
      type: "password_reset";
      to: string;
      props: { name: string; resetUrl: string; expiresInMinutes: number };
    };

const FROM_TRANSACTIONAL = "YourApp <noreply@mail.yourapp.com>";
const FROM_MARKETING = "YourApp <hello@news.yourapp.com>";

const TEMPLATES = {
  welcome: {
    subject: (props: { name: string }) => `Welcome to YourApp, ${props.name}`,
    component: WelcomeEmail,
    from: FROM_TRANSACTIONAL,
  },
  password_reset: {
    subject: () => "Reset your password",
    component: PasswordResetEmail,
    from: FROM_TRANSACTIONAL,
  },
} as const;

export async function sendEmail(payload: EmailPayload) {
  const template = TEMPLATES[payload.type];

  const { data, error } = await resend.emails.send({
    from: template.from,
    to: payload.to,
    subject: template.subject(payload.props as any),
    react: template.component(payload.props as any),
  });

  if (error) {
    console.error(`[email] Failed to send ${payload.type} to ${payload.to}:`, error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  console.log(`[email] Sent ${payload.type} to ${payload.to}, id: ${data?.id}`);
  return data;
}

// --------------------------------------------------------------------------
// src/app/api/auth/forgot-password/route.ts — Using the email wrapper
// --------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { generateResetToken } from "@/lib/auth/tokens";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Return 200 even if user not found to prevent enumeration
    return NextResponse.json({ success: true });
  }

  const token = await generateResetToken(user.id);
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await sendEmail({
    type: "password_reset",
    to: user.email,
    props: {
      name: user.name,
      resetUrl,
      expiresInMinutes: 60,
    },
  });

  return NextResponse.json({ success: true });
}

// --------------------------------------------------------------------------
// src/app/api/webhooks/resend/route.ts — Resend webhook handler
// --------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET!;

interface ResendWebhookEvent {
  type: "email.sent" | "email.delivered" | "email.bounced" | "email.complained" |
        "email.opened" | "email.clicked";
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
    created_at: string;
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: ResendWebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, headers) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Idempotent: upsert by email_id + event type
  switch (event.type) {
    case "email.bounced":
      // Suppress future sends to this address
      await db.emailSuppression.upsert({
        where: { email: event.data.to[0] },
        update: { reason: "bounce", updatedAt: new Date() },
        create: { email: event.data.to[0], reason: "bounce" },
      });
      break;

    case "email.complained":
      await db.emailSuppression.upsert({
        where: { email: event.data.to[0] },
        update: { reason: "complaint", updatedAt: new Date() },
        create: { email: event.data.to[0], reason: "complaint" },
      });
      break;

    case "email.delivered":
      console.log(`[webhook] Delivered: ${event.data.email_id}`);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### 2. Postmark: Server Tokens, Message Streams, and Templates

```typescript
// .env.local
// POSTMARK_SERVER_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
// POSTMARK_WEBHOOK_TOKEN=your-webhook-auth-token

// --------------------------------------------------------------------------
// src/lib/email/postmark.ts — Postmark client and send functions
// --------------------------------------------------------------------------
import { ServerClient } from "postmark";
import { render } from "@react-email/render";

if (!process.env.POSTMARK_SERVER_TOKEN) {
  throw new Error("POSTMARK_SERVER_TOKEN environment variable is not set");
}

export const postmark = new ServerClient(process.env.POSTMARK_SERVER_TOKEN);

// --------------------------------------------------------------------------
// Sending with React Email templates (render to HTML, pass to Postmark)
// --------------------------------------------------------------------------
import WelcomeEmail from "@/emails/welcome";
import PasswordResetEmail from "@/emails/password-reset";

type PostmarkEmailPayload =
  | {
      type: "welcome";
      to: string;
      props: { name: string; loginUrl: string };
      stream: "outbound"; // transactional
    }
  | {
      type: "password_reset";
      to: string;
      props: { name: string; resetUrl: string; expiresInMinutes: number };
      stream: "outbound";
    };

const POSTMARK_TEMPLATES = {
  welcome: {
    subject: (props: { name: string }) => `Welcome, ${props.name}!`,
    component: WelcomeEmail,
  },
  password_reset: {
    subject: () => "Reset your password",
    component: PasswordResetEmail,
  },
} as const;

export async function sendPostmarkEmail(payload: PostmarkEmailPayload) {
  const template = POSTMARK_TEMPLATES[payload.type];
  const html = await render(template.component(payload.props as any));

  const result = await postmark.sendEmail({
    From: "noreply@mail.yourapp.com",
    To: payload.to,
    Subject: template.subject(payload.props as any),
    HtmlBody: html,
    MessageStream: payload.stream,
  });

  console.log(`[postmark] Sent ${payload.type} to ${payload.to}, MessageID: ${result.MessageID}`);
  return result;
}

// --------------------------------------------------------------------------
// Sending with Postmark server-side templates (Mustache syntax)
// --------------------------------------------------------------------------
export async function sendPostmarkTemplate(params: {
  to: string;
  templateAlias: string;
  templateModel: Record<string, unknown>;
  stream: "outbound" | "broadcast";
}) {
  const result = await postmark.sendEmailWithTemplate({
    From: params.stream === "outbound"
      ? "noreply@mail.yourapp.com"
      : "hello@news.yourapp.com",
    To: params.to,
    TemplateAlias: params.templateAlias,
    TemplateModel: params.templateModel,
    MessageStream: params.stream,
  });

  console.log(`[postmark] Sent template ${params.templateAlias} to ${params.to}`);
  return result;
}

// Message Streams:
//   "outbound"  — transactional (default, high-priority delivery)
//   "broadcast" — marketing/bulk (separate reputation, unsubscribe management)
// Always pass the correct stream. Marketing via "outbound" violates TOS.

// --------------------------------------------------------------------------
// src/app/api/webhooks/postmark/route.ts — Bounce and complaint webhooks
// --------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Postmark webhook types
interface PostmarkBounceWebhook {
  RecordType: "Bounce";
  ID: number;
  Type: string; // "HardBounce", "SoftBounce", etc.
  Email: string;
  BouncedAt: string;
  Description: string;
  MessageStream: string;
}

interface PostmarkSpamWebhook {
  RecordType: "SpamComplaint";
  ID: number;
  Email: string;
  MessageStream: string;
}

type PostmarkWebhookPayload = PostmarkBounceWebhook | PostmarkSpamWebhook;

export async function POST(req: NextRequest) {
  // Postmark uses basic auth or a custom header for webhook security
  const authHeader = req.headers.get("authorization");
  const expected = `Basic ${Buffer.from(
    `postmark:${process.env.POSTMARK_WEBHOOK_TOKEN}`
  ).toString("base64")}`;

  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload: PostmarkWebhookPayload = await req.json();

  switch (payload.RecordType) {
    case "Bounce":
      if (payload.Type === "HardBounce") {
        await db.emailSuppression.upsert({
          where: { email: payload.Email },
          update: { reason: "hard_bounce", updatedAt: new Date() },
          create: { email: payload.Email, reason: "hard_bounce" },
        });
        console.log(`[postmark] Hard bounce: ${payload.Email}`);
      }
      break;

    case "SpamComplaint":
      await db.emailSuppression.upsert({
        where: { email: payload.Email },
        update: { reason: "complaint", updatedAt: new Date() },
        create: { email: payload.Email, reason: "complaint" },
      });
      console.log(`[postmark] Spam complaint: ${payload.Email}`);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### 3. SendGrid: API Key, Dynamic Templates, and Marketing

```typescript
// .env.local
// SENDGRID_API_KEY=SG.xxxxxxxxxxxx
// SENDGRID_WEBHOOK_VERIFICATION_KEY=your-verification-key

// --------------------------------------------------------------------------
// src/lib/email/sendgrid.ts — SendGrid client setup
// --------------------------------------------------------------------------
import sgMail from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable is not set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export { sgMail };

// --------------------------------------------------------------------------
// Sending with Dynamic Templates (Handlebars)
// --------------------------------------------------------------------------

// Dynamic templates are created in the SendGrid dashboard.
// Each gets a template ID like "d-xxxxxxxxxxxxxxxxxxxxxxxxxxxx".
// Template variables use Handlebars: {{name}}, {{#if paid}}...{{/if}}

interface SendGridTemplatePayload {
  to: string;
  templateId: string;
  dynamicTemplateData: Record<string, unknown>;
  from?: string;
}

export async function sendSendGridTemplate(payload: SendGridTemplatePayload) {
  const msg = {
    to: payload.to,
    from: payload.from ?? "noreply@mail.yourapp.com",
    templateId: payload.templateId,
    dynamicTemplateData: payload.dynamicTemplateData,
  };

  try {
    const [response] = await sgMail.send(msg);
    console.log(
      `[sendgrid] Sent template ${payload.templateId} to ${payload.to}, ` +
      `status: ${response.statusCode}`
    );
    return response;
  } catch (error: any) {
    console.error(
      `[sendgrid] Failed to send to ${payload.to}:`,
      error.response?.body?.errors ?? error.message
    );
    throw error;
  }
}

// Usage: sendSendGridTemplate({ to: "user@example.com", templateId: "d-abc123", dynamicTemplateData: { name: "Jane", orderNumber: "ORD-12345" } })

// --------------------------------------------------------------------------
// Sending with React Email (render to HTML)
// --------------------------------------------------------------------------
import { render } from "@react-email/render";
import WelcomeEmail from "@/emails/welcome";

export async function sendSendGridHtml(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const msg = {
    to: params.to,
    from: params.from ?? "noreply@mail.yourapp.com",
    subject: params.subject,
    html: params.html,
  };

  const [response] = await sgMail.send(msg);
  return response;
}

// Render React Email component, then pass HTML to sendSendGridHtml()

// --------------------------------------------------------------------------
// Batch sending (up to 1000 recipients per call)
// --------------------------------------------------------------------------
export async function sendSendGridBatch(params: {
  recipients: Array<{ email: string; data: Record<string, unknown> }>;
  templateId: string;
  from?: string;
}) {
  const personalizations = params.recipients.map((r) => ({
    to: [{ email: r.email }],
    dynamicTemplateData: r.data,
  }));

  const msg = {
    from: { email: params.from ?? "hello@news.yourapp.com" },
    templateId: params.templateId,
    personalizations,
  };

  // SendGrid allows up to 1000 personalizations per request
  const [response] = await sgMail.send(msg as any);
  console.log(
    `[sendgrid] Batch sent to ${params.recipients.length} recipients`
  );
  return response;
}

// --------------------------------------------------------------------------
// src/app/api/webhooks/sendgrid/route.ts — Event Webhook
// --------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";
import { EventWebhook, EventWebhookHeader } from "@sendgrid/eventwebhook";
import { db } from "@/lib/db";

interface SendGridEvent {
  email: string;
  event: "processed" | "dropped" | "delivered" | "deferred" | "bounce" |
         "open" | "click" | "spam_report" | "unsubscribe" | "group_unsubscribe";
  sg_event_id: string;
  sg_message_id: string;
  timestamp: number;
  reason?: string;
  url?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify SendGrid signature
  const publicKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY!;
  const signature = req.headers.get(
    EventWebhookHeader.SIGNATURE()
  ) ?? "";
  const timestamp = req.headers.get(
    EventWebhookHeader.TIMESTAMP()
  ) ?? "";

  const ew = new EventWebhook();
  const ecPublicKey = ew.convertPublicKeyToECDSA(publicKey);
  const valid = ew.verifySignature(ecPublicKey, body, signature, timestamp);

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const events: SendGridEvent[] = JSON.parse(body);

  for (const event of events) {
    switch (event.event) {
      case "bounce":
        await db.emailSuppression.upsert({
          where: { email: event.email },
          update: { reason: "bounce", updatedAt: new Date() },
          create: { email: event.email, reason: "bounce" },
        });
        break;

      case "spam_report":
        await db.emailSuppression.upsert({
          where: { email: event.email },
          update: { reason: "complaint", updatedAt: new Date() },
          create: { email: event.email, reason: "complaint" },
        });
        break;

      case "unsubscribe":
      case "group_unsubscribe":
        await db.emailSuppression.upsert({
          where: { email: event.email },
          update: { reason: "unsubscribe", updatedAt: new Date() },
          create: { email: event.email, reason: "unsubscribe" },
        });
        break;

      case "dropped":
        console.warn(`[sendgrid] Dropped: ${event.email}, reason: ${event.reason}`);
        break;
    }
  }

  return NextResponse.json({ received: true });
}
```

### 4. Loops: Contacts, Events, and Transactional Email

```typescript
// .env.local
// LOOPS_API_KEY=xxxxxxxxxxxx

// --------------------------------------------------------------------------
// src/lib/email/loops.ts — Loops client setup
// --------------------------------------------------------------------------
import { LoopsClient } from "loops";

if (!process.env.LOOPS_API_KEY) {
  throw new Error("LOOPS_API_KEY environment variable is not set");
}

export const loops = new LoopsClient(process.env.LOOPS_API_KEY);

// --------------------------------------------------------------------------
// Contact management — sync users to Loops
// --------------------------------------------------------------------------
export async function syncContactToLoops(user: {
  email: string;
  firstName: string;
  lastName?: string;
  userId: string;
  plan?: string;
  signupSource?: string;
  createdAt?: Date;
}) {
  const response = await loops.createContact(user.email, {
    firstName: user.firstName,
    lastName: user.lastName ?? "",
    userId: user.userId,
    plan: user.plan ?? "free",
    signupSource: user.signupSource ?? "organic",
    userGroup: user.plan === "pro" ? "paid" : "free",
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
  });

  console.log(`[loops] Synced contact: ${user.email}`, response);
  return response;
}

// Call after signup:
// await syncContactToLoops({
//   email: user.email,
//   firstName: user.name.split(" ")[0],
//   userId: user.id,
//   plan: "free",
//   signupSource: "google_oauth",
//   createdAt: new Date(),
// });

// --------------------------------------------------------------------------
// Update contact properties (e.g., after plan change)
// --------------------------------------------------------------------------
export async function updateLoopsContact(
  email: string,
  properties: Record<string, string | number | boolean>
) {
  const response = await loops.updateContact(email, properties);
  console.log(`[loops] Updated contact: ${email}`, response);
  return response;
}

// Call after plan upgrade:
// await updateLoopsContact(user.email, {
//   plan: "pro",
//   userGroup: "paid",
//   upgradedAt: new Date().toISOString(),
// });

// --------------------------------------------------------------------------
// Send events — trigger campaigns configured in the Loops dashboard
// --------------------------------------------------------------------------
export async function sendLoopsEvent(params: {
  email?: string;
  userId?: string;
  eventName: string;
  eventProperties?: Record<string, string | number | boolean>;
  contactProperties?: Record<string, string | number | boolean>;
}) {
  // You must provide either email or userId
  const response = await loops.sendEvent({
    email: params.email,
    userId: params.userId,
    eventName: params.eventName,
    eventProperties: params.eventProperties ?? {},
    contactProperties: params.contactProperties ?? {},
  });

  console.log(`[loops] Event sent: ${params.eventName}`, response);
  return response;
}

// Example events that trigger Loops campaigns:
// "onboarding_completed" → sends feature deep-dive sequence
// "feature_activated"    → sends power-user tips
// "trial_expiring"       → sends upgrade nudge sequence
// "subscription_cancelled" → sends win-back campaign

// --------------------------------------------------------------------------
// Transactional email via Loops
// --------------------------------------------------------------------------
export async function sendLoopsTransactional(params: {
  to: string;
  transactionalId: string;
  dataVariables: Record<string, string | number>;
}) {
  // transactionalId is created in the Loops dashboard under Transactional
  const response = await loops.sendTransactionalEmail({
    transactionalId: params.transactionalId,
    email: params.to,
    dataVariables: params.dataVariables,
  });

  console.log(`[loops] Transactional sent to ${params.to}`, response);
  return response;
}

// Usage: sendLoopsTransactional({ to: "user@example.com", transactionalId: "cls_xxx", dataVariables: { name: "Jane" } })

// --------------------------------------------------------------------------
// Signup flow: Resend (transactional welcome) + Loops (marketing sync)
// --------------------------------------------------------------------------
// In your signup route handler:
//   1. Create user in database
//   2. await sendEmail({ type: "welcome", to: user.email, props: { ... } });  // Resend
//   3. await syncContactToLoops({ email, firstName, userId, plan: "free" }); // Loops
//   4. await sendLoopsEvent({ userId, eventName: "user_signed_up" });         // Loops
// See Example 5 for the full multi-ESP architecture pattern.
```

### 5. Multi-ESP Architecture: Resend (Transactional) + Loops (Marketing)

```typescript
// --------------------------------------------------------------------------
// src/lib/email/index.ts — Unified email wrapper for multi-ESP setup
// --------------------------------------------------------------------------
import { resend } from "./resend";
import { sendLoopsEvent, sendLoopsTransactional } from "./loops";
import WelcomeEmail from "@/emails/welcome";
import PasswordResetEmail from "@/emails/password-reset";
import { db } from "@/lib/db";

// ---- Transactional emails (via Resend) ----

type TransactionalPayload =
  | { type: "welcome"; to: string; props: { name: string; loginUrl: string } }
  | { type: "password_reset"; to: string; props: { name: string; resetUrl: string; expiresInMinutes: number } }
  | { type: "invoice_receipt"; to: string; props: { name: string; amount: string; invoiceUrl: string } };

const TRANSACTIONAL_TEMPLATES = {
  welcome: { subject: (p: any) => `Welcome, ${p.name}!`, component: WelcomeEmail },
  password_reset: { subject: () => "Reset your password", component: PasswordResetEmail },
  invoice_receipt: { subject: (p: any) => `Receipt for ${p.amount}`, component: null }, // uses Resend template
} as const;

export async function sendTransactionalEmail(payload: TransactionalPayload) {
  // Check suppression list before sending
  const suppressed = await db.emailSuppression.findUnique({
    where: { email: payload.to },
  });
  if (suppressed) {
    console.warn(`[email] Suppressed: ${payload.to} (${suppressed.reason})`);
    return null;
  }

  const template = TRANSACTIONAL_TEMPLATES[payload.type];

  const { data, error } = await resend.emails.send({
    from: "YourApp <noreply@mail.yourapp.com>",
    to: payload.to,
    subject: template.subject(payload.props as any),
    react: template.component
      ? template.component(payload.props as any)
      : undefined,
  });

  if (error) {
    console.error(`[email] Transactional send failed:`, error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}

// ---- Marketing events (via Loops) ----

type MarketingEvent =
  | { event: "user_signed_up"; userId: string }
  | { event: "onboarding_completed"; userId: string; stepsCompleted: number }
  | { event: "feature_activated"; userId: string; feature: string }
  | { event: "trial_expiring"; userId: string; daysLeft: number }
  | { event: "subscription_cancelled"; userId: string }
  | { event: "subscription_upgraded"; userId: string; plan: string };

export async function sendMarketingEvent(payload: MarketingEvent) {
  const { event, userId, ...properties } = payload;

  await sendLoopsEvent({
    userId,
    eventName: event,
    eventProperties: properties as Record<string, string | number | boolean>,
  });
}

// Transactional: await sendTransactionalEmail({ type: "password_reset", to: email, props: { ... } });
// Marketing:     await sendMarketingEvent({ event: "user_signed_up", userId: user.id });
```

### 6. Domain Verification DNS Records

```text
# Resend — DKIM (CNAME), SPF (TXT), DMARC (TXT)
resend._domainkey.mail.yourapp.com  CNAME  [value from Resend dashboard]
mail.yourapp.com                    TXT    "v=spf1 include:amazonses.com ~all"
_dmarc.mail.yourapp.com             TXT    "v=DMARC1; p=none; rua=mailto:dmarc@yourapp.com"

# Postmark — DKIM (TXT), Return-Path (CNAME)
[selector]._domainkey.mail.yourapp.com  TXT    [value from Postmark dashboard]
pm-bounces.mail.yourapp.com             CNAME  pm.mtasv.net

# SendGrid — Domain Authentication creates 3 CNAME records
em1234.mail.yourapp.com                 CNAME  u12345.wl.sendgrid.net
s1._domainkey.mail.yourapp.com          CNAME  s1.domainkey.u12345.wl.sendgrid.net
s2._domainkey.mail.yourapp.com          CNAME  s2.domainkey.u12345.wl.sendgrid.net

# Loops — DKIM (CNAME)
loops._domainkey.mail.yourapp.com  CNAME  [value from Loops dashboard]

# DMARC (shared, add once on root or subdomain)
# Start with p=none, move to p=quarantine, then p=reject as you gain confidence.
_dmarc.yourapp.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@yourapp.com; pct=100"
```

---

## Common Mistakes

### 1. Calling the ESP SDK Directly From Application Code

**Wrong:** Importing `resend` or `postmark` directly in every Server Action, Route Handler, and background job. Email sending logic, error handling, and template selection are scattered across the codebase. Changing ESPs requires a find-and-replace across dozens of files.

```typescript
// In src/app/api/auth/signup/route.ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({ from: "...", to: user.email, subject: "Welcome", html: "..." });

// In src/app/api/auth/forgot-password/route.ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({ from: "...", to: user.email, subject: "Reset", html: "..." });
```

**Fix:** Create a single email wrapper module that all application code calls. The wrapper handles client instantiation, template rendering, error handling, and suppression checks. Application code never imports the ESP SDK directly.

```typescript
import { sendEmail } from "@/lib/email";
await sendEmail({ type: "welcome", to: user.email, props: { name: user.name, loginUrl: "/dashboard" } });
```

### 2. Not Checking the Suppression List Before Sending

**Wrong:** Sending to every email address without checking whether it has previously bounced or generated a spam complaint. Repeatedly sending to hard-bounced addresses damages your domain reputation. ESPs may suspend your account if your bounce rate exceeds 5%.

```typescript
await resend.emails.send({ to: user.email, ... });
```

**Fix:** Maintain a suppression list populated by webhook events. Check it before every send.

```typescript
const suppressed = await isEmailSuppressed(user.email);
if (suppressed) return;
await sendEmail({ type: "welcome", to: user.email, props: { ... } });
```

### 3. Sending Marketing Email From the Transactional Subdomain

**Wrong:** Using `noreply@mail.yourapp.com` for both password resets and newsletter campaigns. A spam complaint wave from the newsletter tanks the reputation of `mail.yourapp.com`, and transactional emails start landing in spam.

```typescript
// Password reset and newsletter both use the same from address
const from = "noreply@mail.yourapp.com";
```

**Fix:** Use separate subdomains. Transactional from `mail.yourapp.com`, marketing from `news.yourapp.com`. If using Postmark, use separate message streams.

```typescript
const FROM_TRANSACTIONAL = "noreply@mail.yourapp.com";
const FROM_MARKETING = "hello@news.yourapp.com";
```

### 4. Skipping Domain Verification and Sending From a Shared Domain

**Wrong:** Leaving your ESP configured with the default shared sending domain (e.g., `onboarding@resend.dev` or `@em.sendgrid.net`). Shared domains have poor reputation, emails land in spam, and your brand looks unprofessional.

**Fix:** Verify your domain in the ESP dashboard before sending any production email. Add the required DKIM, SPF, and Return-Path DNS records. Use a subdomain (`mail.yourapp.com`) to isolate email reputation from your root domain. Domain verification typically takes minutes for DKIM, up to 48 hours for full DNS propagation.

### 5. Not Verifying Webhook Signatures

**Wrong:** Accepting any POST request to your webhook endpoint without verifying the signature. An attacker can send fake bounce events to suppress legitimate email addresses, or fake delivery events to corrupt your analytics.

```typescript
export async function POST(req: NextRequest) {
  const event = await req.json(); // No signature verification!
  await processEvent(event);
}
```

**Fix:** Every ESP provides a signature verification mechanism. Resend uses Svix signatures. SendGrid uses ECDSA signatures. Postmark uses basic auth or IP allowlisting. Always verify before processing.

```typescript
const wh = new Webhook(WEBHOOK_SECRET);
const event = wh.verify(body, headers); // Throws if invalid
```

### 6. Hardcoding Email Content in the Send Call

**Wrong:** Embedding subject lines, HTML, and copy directly in application code. Email content is scattered, impossible to preview, and changes require a code deployment.

```typescript
await resend.emails.send({
  to: user.email,
  subject: "Your trial ends in 3 days!",
  html: `<h1>Hey ${user.name}</h1><p>Upgrade before it's too late.</p>`,
});
```

**Fix:** Keep all email content in dedicated template files (React Email components, Postmark server templates, or SendGrid dynamic templates). Application code passes only the template identifier and typed data.

```typescript
await sendEmail({
  type: "trial_ending",
  to: user.email,
  props: { name: user.name, daysLeft: 3, upgradeUrl: "/upgrade" },
});
```

### 7. Using the Wrong Postmark Message Stream

**Wrong:** Sending a marketing newsletter via Postmark's default "outbound" (transactional) stream. This violates Postmark's Terms of Service and risks account suspension. Postmark actively monitors stream usage and will flag marketing content sent through the transactional stream.

```typescript
await postmark.sendEmail({
  From: "hello@yourapp.com",
  To: "user@example.com",
  Subject: "Our March Newsletter",
  HtmlBody: newsletterHtml,
  // Missing MessageStream — defaults to "outbound" (transactional)
});
```

**Fix:** Always specify the `MessageStream` parameter. Use `"outbound"` for transactional and `"broadcast"` for marketing.

```typescript
await postmark.sendEmail({
  From: "hello@news.yourapp.com",
  To: "user@example.com",
  Subject: "Our March Newsletter",
  HtmlBody: newsletterHtml,
  MessageStream: "broadcast",
});
```

### 8. Not Handling SendGrid's Batch Webhook Format

**Wrong:** Treating SendGrid's Event Webhook payload as a single event object. SendGrid sends events in batches -- the payload is an array of event objects, not a single object. Parsing it as a single object silently drops all but the first event.

```typescript
const event = await req.json(); // Wrong: this is an array
await processEvent(event);
```

**Fix:** Always parse the payload as an array and iterate over all events.

```typescript
const events: SendGridEvent[] = await req.json();
for (const event of events) {
  await processEvent(event);
}
```

### 9. Forgetting to Pass `List-Unsubscribe` Headers on Marketing Email

**Wrong:** Sending marketing or broadcast email without the `List-Unsubscribe` header. Gmail and other providers use this header to show a prominent "Unsubscribe" button. Without it, users are more likely to mark your email as spam (which is worse for your reputation than an unsubscribe).

**Fix:** Include `List-Unsubscribe` and `List-Unsubscribe-Post` headers on every non-transactional email. The link should immediately unsubscribe the user without requiring login.

```typescript
headers: {
  "List-Unsubscribe": `<https://yourapp.com/unsubscribe?token=${signedToken}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
}
```

### 10. Using Loops for Critical Transactional Email

**Wrong:** Relying on Loops as your sole ESP for password resets, security alerts, and payment receipts. Loops is a marketing email platform optimized for campaigns and sequences, not for the time-sensitive, must-arrive reliability required by transactional email. Its infrastructure is built for throughput, not guaranteed delivery of individual messages.

```typescript
// Don't do this for password resets
await loops.sendTransactionalEmail({
  transactionalId: "password-reset-template",
  email: user.email,
  dataVariables: { resetUrl },
});
```

**Fix:** Use Resend or Postmark for all critical transactional email. Use Loops only for marketing automation, onboarding sequences, and event-triggered campaigns. The multi-ESP pattern described in Example 5 is the recommended architecture.

```typescript
// Transactional via Resend (reliable, fast)
await sendTransactionalEmail({ type: "password_reset", to: user.email, props: { ... } });

// Marketing via Loops (campaign trigger)
await sendMarketingEvent({ event: "trial_expiring", userId: user.id, daysLeft: 3 });
```

---

> **See also:** [Email-Notification-Systems](../../Product-Growth/Email-Notification-Systems/email-notification-systems.md) for drip campaign state machines, notification architecture, digest pipelines, and notification preferences | [Webhooks-Integrations](../../Backend/Webhooks-Integrations/webhooks-integrations.md) for webhook security patterns and idempotent processing | [Auth-Sessions](../../Backend/Auth-Sessions/auth-sessions.md) for password reset flows and security email triggers
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
