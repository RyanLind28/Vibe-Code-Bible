---
title: Tools Vibe Coding Knowledge Base
description: "Vendor-specific setup, configuration, and integration guides for ~40 tools across 13 categories. The concept chapters teach you *how auth works* — this chapter teaches you *how to set up Clerk*. Feed these files to your AI coding assistant alongside the relevant concept chapters to go from \"I need X\" to \"X is working in production.\""
---
# Tools Vibe Coding Knowledge Base

> Vendor-specific setup, configuration, and integration guides for ~40 tools across 13 categories. The concept chapters teach you *how auth works* — this chapter teaches you *how to set up Clerk*. Feed these files to your AI coding assistant alongside the relevant concept chapters to go from "I need X" to "X is working in production."

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack with concept chapters** for full coverage — pair `Tools/Authentication` with `Security/Authentication-Identity` for both the tool setup and the security patterns.
4. **Describe what you're building** and the AI now has expert-level tool configuration context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| SaaS MVP from scratch | `BaaS-Platforms` (Supabase) + `Payments` (Stripe) + `Email-Services` (Resend) + `Hosting-Deployment` (Vercel) |
| Adding search to existing app | `Search` (Meilisearch or Algolia) + `Hosting-Deployment` (deploy search instance) |
| Setting up customer support | `Live-Chat-Support` (Tawk.to or Crisp) + `Communication` (Knock for notifications) |
| Full auth system | `Authentication` (Clerk or Auth.js) + `Databases` (Neon) + `Security/Authentication-Identity` |
| Content-driven site | `CMS` (Sanity) + `Hosting-Deployment` (Cloudflare) + `Analytics-Monitoring` (Plausible) |
| Background processing | `Background-Jobs` (Inngest) + `Analytics-Monitoring` (Sentry) + `Backend/Background-Jobs` |
| File uploads | `File-Storage` (Uploadthing or R2) + `Backend/Serverless-Edge` (presigned URLs) |
| Billing and subscriptions | `Payments` (Stripe) + `Product-Growth/Billing-Monetization` (billing patterns) |
| Real-time chat feature | `Communication` (Stream) + `Backend/Real-Time` (real-time architecture) |
| Email drip campaigns | `Email-Services` (Resend + Loops) + `Product-Growth/Email-Notification-Systems` (drip patterns) |

**Pro tip:** Start with the concept chapter for the *pattern* you need, then add the Tools file for the *specific service* you chose. The concept chapter teaches your AI the architecture; the Tools file teaches it the vendor-specific API calls and configuration.

## Decision Flowchart

**"I need a backend"** → Do you want to manage infrastructure?
- No → [BaaS Platforms](./BaaS-Platforms/baas-platforms.md) (Supabase, Firebase, Convex, Appwrite)
- Yes → [Databases](./Databases/databases.md) (Neon, PlanetScale, Turso) + [Hosting](./Hosting-Deployment/hosting-deployment.md) (Fly.io)

**"I need auth"** → Do you want pre-built UI components?
- Yes → [Authentication](./Authentication/authentication.md) (Clerk or Kinde)
- No, open-source → [Authentication](./Authentication/authentication.md) (Auth.js)
- Already using Supabase → [Authentication](./Authentication/authentication.md) (Supabase Auth)

**"I need payments"** → Do you want to handle tax/compliance yourself?
- Yes (more control) → [Payments](./Payments/payments.md) (Stripe)
- No (Merchant of Record) → [Payments](./Payments/payments.md) (LemonSqueezy or Paddle)

**"I need email"** → Transactional or marketing?
- Transactional → [Email Services](./Email-Services/email-services.md) (Resend or Postmark)
- Marketing/drip → [Email Services](./Email-Services/email-services.md) (Loops or SendGrid)

**"I need analytics"** → Product analytics or error tracking?
- Product analytics → [Analytics & Monitoring](./Analytics-Monitoring/analytics-monitoring.md) (PostHog or Mixpanel)
- Error tracking → [Analytics & Monitoring](./Analytics-Monitoring/analytics-monitoring.md) (Sentry)
- Privacy-first web analytics → [Analytics & Monitoring](./Analytics-Monitoring/analytics-monitoring.md) (Plausible)

**"I need search"** → Budget matters?
- Managed, pay-as-you-go → [Search](./Search/search.md) (Algolia)
- Open-source, self-host → [Search](./Search/search.md) (Meilisearch or Typesense)

**"I need a CMS"** → Self-hosted or managed?
- Managed → [CMS](./CMS/cms.md) (Sanity or Contentful)
- Self-hosted → [CMS](./CMS/cms.md) (Payload CMS)

**"I need file uploads"** → Simple or S3-compatible?
- Simple, Next.js-native → [File Storage](./File-Storage/file-storage.md) (Uploadthing)
- S3-compatible, no egress fees → [File Storage](./File-Storage/file-storage.md) (Cloudflare R2)

---

## Guides

```
Tools/
├── BaaS-Platforms/              → Supabase, Firebase, Convex, Appwrite
├── Authentication/              → Clerk, Auth.js/NextAuth, Kinde, Supabase Auth
├── Databases/                   → Neon, PlanetScale, Turso, MongoDB Atlas
├── Email-Services/              → Resend, Postmark, SendGrid, Loops
├── Analytics-Monitoring/        → PostHog, Plausible, Sentry, Mixpanel, LogSnag
├── Payments/                    → Stripe, LemonSqueezy, Paddle
├── Live-Chat-Support/           → Tawk.to, Crisp, Intercom
├── Background-Jobs/             → Inngest, Trigger.dev, BullMQ, Upstash QStash
├── Hosting-Deployment/          → Vercel, Cloudflare, Netlify, Fly.io
├── Search/                      → Algolia, Meilisearch, Typesense
├── CMS/                         → Sanity, Payload CMS, Contentful
├── File-Storage/                → Uploadthing, Cloudflare R2, AWS S3, Supabase Storage
└── Communication/               → Twilio, Stream, Knock
```

### [BaaS Platforms](./BaaS-Platforms/baas-platforms.md)
Supabase (Postgres, Auth, Storage, Realtime, Edge Functions), Firebase (Firestore, Auth, Cloud Functions, Hosting), Convex (reactive database, server functions, real-time sync), and Appwrite (open-source BaaS). Full project setup, client initialization, Row-Level Security policies, real-time subscriptions, type safety, and comparison table for choosing between platforms. Start here if you want a full backend without managing infrastructure.

### [Authentication](./Authentication/authentication.md)
Clerk (managed auth with pre-built UI, organizations, webhooks), Auth.js/NextAuth (open-source, provider-based), Kinde (managed auth with feature flags), and Supabase Auth (integrated with Supabase stack). Zero-to-working setup for each in Next.js App Router — middleware, session handling, protecting routes, social providers, webhook sync, and environment variables.

### [Databases](./Databases/databases.md)
Neon (serverless Postgres, branching, connection pooling), PlanetScale (serverless MySQL, safe migrations), Turso (edge SQLite/libSQL, embedded replicas), and MongoDB Atlas (document DB, Atlas Search). Connection setup, Prisma and Drizzle ORM configuration for each provider, serverless driver selection, branching for preview deployments, and edge deployment patterns.

### [Email Services](./Email-Services/email-services.md)
Resend (React Email integration, modern API), Postmark (deliverability-focused, message streams), SendGrid (scale, marketing + transactional), and Loops (SaaS marketing, event-triggered campaigns). Domain verification, sending transactional and marketing email, webhook handling, React Email template setup, and provider abstraction patterns.

### [Analytics & Monitoring](./Analytics-Monitoring/analytics-monitoring.md)
PostHog (product analytics, feature flags, session replay), Plausible (privacy-first, cookie-free), Sentry (error tracking, performance monitoring), Mixpanel (funnels, retention), and LogSnag (developer event tracking). Provider initialization, user identification, event tracking, feature flags, session replay configuration, and ad-blocker proxy setup.

### [Payments](./Payments/payments.md)
Stripe (subscriptions, one-time, usage-based, Connect, Tax), LemonSqueezy (Merchant of Record — handles tax and compliance), and Paddle (MoR alternative). Checkout session creation, webhook endpoint with signature verification, subscription lifecycle management, Customer Portal, and the critical distinction between handling tax yourself vs. using a Merchant of Record.

### [Live Chat & Support](./Live-Chat-Support/live-chat-support.md)
Tawk.to (free forever, customizable widget), Crisp (chat + CRM + chatbot + knowledge base), and Intercom (customer messaging platform, product tours). Widget installation with lazy loading for performance, user identification, chatbot configuration, knowledge base setup, and API integration for automated workflows.

### [Background Jobs](./Background-Jobs/background-jobs.md)
Inngest (event-driven step functions, serverless), Trigger.dev (background jobs with dashboard), BullMQ (Redis-based queues, self-hosted), and Upstash QStash (serverless message queue). Job definition, scheduling, retry configuration, monitoring dashboards, and the critical choice between serverless-native (Inngest/QStash) and self-hosted (BullMQ) approaches.

### [Hosting & Deployment](./Hosting-Deployment/hosting-deployment.md)
Vercel (Next.js-optimized, serverless, edge), Cloudflare (Workers, Pages, R2, D1, KV), Netlify (static + serverless, forms), and Fly.io (containers at the edge, Postgres, volumes). Deployment configuration, environment variables, custom domains, preview deployments, CI/CD setup, and choosing between serverless platforms and container-based hosting.

### [Search](./Search/search.md)
Algolia (instant search, typo tolerance, faceted search), Meilisearch (open-source, self-hostable), and Typesense (open-source, geo-search). Index creation, document ingestion, search UI integration with React InstantSearch, database sync pipelines, relevance tuning, and when to graduate from database `LIKE` queries to a dedicated search engine.

### [CMS](./CMS/cms.md)
Sanity (GROQ queries, real-time collaboration, customizable Studio), Payload CMS (open-source TypeScript CMS, self-hosted), and Contentful (enterprise headless CMS, GraphQL + REST). Schema definition, content fetching in Next.js, preview/draft mode, webhook-triggered revalidation, rich text rendering, and image optimization.

### [File Storage & Uploads](./File-Storage/file-storage.md)
Uploadthing (type-safe uploads for Next.js), Cloudflare R2 (S3-compatible, no egress fees), AWS S3 (presigned URLs, IAM policies), and Supabase Storage (integrated with Supabase Auth). Upload components, presigned URL flow, access control, image optimization, CDN delivery, and the critical rule: never proxy file uploads through your server.

### [Communication](./Communication/communication.md)
Twilio (SMS, voice, WhatsApp, Verify), Stream (chat SDK, activity feeds, video), and Knock (unified notifications — email, push, in-app, SMS). Sending SMS and WhatsApp messages, in-app chat components, multi-channel notification workflows, user token generation, webhook handling for delivery status, and notification preference management.

---

## Cross-Reference Map

Tools that appear in multiple categories get primary coverage in one file and cross-references elsewhere:

| Tool | Primary File | Also Referenced In |
|------|-------------|-------------------|
| Supabase | BaaS-Platforms | Authentication, Databases, File-Storage |
| Cloudflare | Hosting-Deployment | File-Storage (R2) |
| Stripe | Payments | Product-Growth/Billing-Monetization |
| Upstash | Background-Jobs (QStash) | Databases (Redis) |
| Auth.js | Authentication | Backend/Auth-Sessions |

## Related Concept Chapters

Each Tools file focuses on *setup and configuration*. For the underlying *patterns and principles*, see:

| Topic | Concept Chapter |
|-------|----------------|
| Auth patterns, RBAC, JWT | [Security/Authentication-Identity](../Security/Authentication-Identity/authentication-identity.md) |
| Database schema design, indexing | [Backend/Database-Design](../Backend/Database-Design/database-design.md) |
| Queue architecture, retry patterns | [Backend/Background-Jobs](../Backend/Background-Jobs/background-jobs.md) |
| Billing patterns, subscription lifecycle | [Product-Growth/Billing-Monetization](../Product-Growth/Billing-Monetization/billing-monetization.md) |
| Drip campaigns, notification architecture | [Product-Growth/Email-Notification-Systems](../Product-Growth/Email-Notification-Systems/email-notification-systems.md) |
| Analytics data layer, event taxonomy | [Product-Growth/Analytics-Instrumentation](../Product-Growth/Analytics-Instrumentation/analytics-instrumentation.md) |
| CI/CD pipelines | [DevOps/CICD](../DevOps/CICD/cicd.md) |
| Cloud architecture, infrastructure | [DevOps/Cloud-Architecture](../DevOps/Cloud-Architecture/cloud-architecture.md) |
| Real-time architecture (WebSockets, SSE) | [Backend/Real-Time](../Backend/Real-Time/real-time.md) |
| Presigned URL patterns | [Backend/Serverless-Edge](../Backend/Serverless-Edge/serverless-edge.md) |

---

## Status

Complete — all 13 guides are written and reviewed. Last updated: 2026-03.

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
