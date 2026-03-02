---
title: "Product & Growth Vibe Coding Knowledge Base"
description: Analytics instrumentation, experimentation, conversion optimization, onboarding, retention, email/notification systems, referral loops, billing, marketing channels, and product-led growth — structured for AI-assisted development. Feed these files to your AI coding assistant to build products that grow by default.
---
# Product & Growth Vibe Coding Knowledge Base

> Analytics instrumentation, experimentation, conversion optimization, onboarding, retention, email/notification systems, referral loops, billing, marketing channels, and product-led growth — structured for AI-assisted development. Feed these files to your AI coding assistant to build products that grow by default.

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack multiple files** for complex tasks — the guides cross-reference each other.
4. **Describe what you're building** and the AI now has expert-level growth engineering context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| Launching a SaaS MVP with billing | `Analytics-Instrumentation` + `User-Onboarding` + `Billing-Monetization` |
| Adding A/B testing to existing product | `Experimentation` + `Analytics-Instrumentation` + `Conversion-Optimization` |
| Building a referral program | `Referral-Viral-Loops` + `Email-Notification-Systems` + `Analytics-Instrumentation` |
| Running paid ads to a landing page | `Growth-Marketing-Channels` + `Conversion-Optimization` + `Analytics-Instrumentation` |
| Reducing churn | `Retention-Engagement` + `Email-Notification-Systems` + `Analytics-Instrumentation` |
| Implementing freemium with upgrades | `Product-Led-Growth` + `Billing-Monetization` + `User-Onboarding` |

**Pro tip:** Start every growth project by pasting `Analytics-Instrumentation` into your AI session. It is the anchor guide — every other growth file depends on measurement. You cannot optimize what you do not track.

---

## Guides

```
Product-Growth/
├── Analytics-Instrumentation/    → Event tracking, data layer pattern, UTM/attribution, funnels, cohorts, consent
├── Experimentation/              → Feature flags, A/B tests, hash-based assignment, statistical significance, flag cleanup
├── Conversion-Optimization/      → Multi-step funnels, social proof, Stripe Checkout, field analytics, exit-intent
├── User-Onboarding/              → Activation metrics, state machines, checklists, progressive profiling, guided tours
├── Retention-Engagement/         → Cohort retention, engagement loops, churn prediction, gamification, digest emails
├── Email-Notification-Systems/   → ESP setup, React Email, drip campaigns, in-app notifications, web push, preferences
├── Referral-Viral-Loops/         → Referral tracking, invite systems, K-factor, Web Share API, reward fulfillment, fraud
├── Billing-Monetization/         → Stripe subscriptions, trials/freemium, usage billing, paywalls, dunning, tax
├── Growth-Marketing-Channels/    → Marketing pixels, server-side tracking, UTM pipeline, social auth, programmatic pages
└── Product-Led-Growth/           → PLG flywheel, self-serve signup, usage gates, PQL scoring, upgrade triggers, expansion
```

### [Analytics & Instrumentation](./Analytics-Instrumentation/analytics-instrumentation.md)
Event tracking architecture, provider-agnostic data layer pattern for Next.js, UTM/attribution capture with middleware, funnel and cohort SQL queries, product metrics dashboards, privacy/consent implementation, and server-side vs. client-side tracking. Includes a complete type-safe analytics client, PostHog provider adapter, consent manager, and attribution pipeline. **Start here for every project.**

### [Experimentation](./Experimentation/experimentation.md)
Feature flag systems (PostHog, LaunchDarkly, custom), hypothesis-driven A/B test design, hash-based deterministic variant assignment, server-side rendering with variants in Next.js middleware, statistical significance and sample size calculation, sequential testing to avoid peeking bias, and flag cleanup lifecycle. Includes hash-based evaluator, middleware integration, exposure tracking, and experiment analysis SQL.

### [Conversion Optimization](./Conversion-Optimization/conversion-optimization.md)
Multi-step funnel engineering with state machines, social proof components (live counters, testimonials, customer logos), Stripe Checkout integration (redirect and embedded), form optimization with field-level analytics, trust signal components, exit-intent detection, abandoned flow recovery triggers, and ethical urgency patterns. Includes funnel hooks, checkout server actions, exit-intent detection, and field analytics.

### [User Onboarding](./User-Onboarding/user-onboarding.md)
Activation metrics and "aha moment" definition, onboarding state machine with database schema, checklist component with progress tracking, progressive profiling (collecting user data gradually), empty state onboarding, guided tour system with React portals and spotlight overlays, time-to-value optimization, and onboarding segmentation by user type. Includes full state machine, checklist UI, tour system, and onboarding funnel SQL.

### [Retention & Engagement](./Retention-Engagement/retention-engagement.md)
Cohort retention SQL analysis, engagement loop design (trigger-action-reward-investment), churn prediction scoring with weighted signals, feature adoption tracking and discovery prompts, re-engagement workflows with escalating sequences, digest email generation, and gamification patterns (streaks, achievements, milestones). Includes retention queries, churn scorer, streak system, and digest builder.

### [Email & Notification Systems](./Email-Notification-Systems/email-notification-systems.md)
ESP setup and comparison (Resend, Postmark, SES), React Email templating with shared layouts, drip campaign state machines with branching logic, in-app notification system with database schema and real-time SSE delivery, web push notifications with service worker setup, notification preferences UI with per-channel controls, and digest architecture with timezone handling. Includes email templates, campaign engine, notification center, and push pipeline.

### [Referral & Viral Loops](./Referral-Viral-Loops/referral-viral-loops.md)
Referral link tracking with database schema, invite system (email, shareable links, bulk), viral coefficient (K-factor) calculation and optimization, Web Share API integration with dynamic OG images, two-sided reward fulfillment on activation, fraud prevention (self-referral, fake accounts, device fingerprinting), and referral analytics. Includes Prisma schema, invite API, reward engine, and K-factor queries.

### [Billing & Monetization](./Billing-Monetization/billing-monetization.md)
Stripe subscriptions lifecycle (create, upgrade, downgrade, cancel), trial and freemium patterns, usage-based billing with Stripe Meters, paywall gating (server-side middleware and client-side checks), plan management UI, Stripe Customer Portal integration, dunning and failed payment handling, proration with preview, and tax compliance with Stripe Tax. Includes webhook handler, paywall middleware, checkout flows, and usage reporting.

### [Growth & Marketing Channels](./Growth-Marketing-Channels/growth-marketing-channels.md)
Marketing pixel integration (Google Ads, Meta, LinkedIn) with consent gating, server-side conversion tracking (Meta Conversions API, Google Measurement Protocol), UTM attribution pipeline from middleware to database, social auth as growth lever (Google One Tap), programmatic landing pages with Next.js dynamic routes, ROAS tracking with end-to-end attribution, and OG/Twitter Card meta tags. Includes pixel manager, server-side APIs, landing page generator, and attribution queries.

### [Product-Led Growth](./Product-Led-Growth/product-led-growth.md)
PLG flywheel architecture, zero-friction self-serve signup, freemium usage gates (soft limits vs. hard limits), product-qualified lead (PQL) scoring with CRM sync, contextual upgrade triggers with frequency capping, expansion revenue patterns (seats, usage, add-ons), self-serve vs. sales-assist routing, and PLG metrics (time-to-value, NRR, expansion MRR). Includes entitlements service, PQL scorer, upgrade trigger system, and PLG dashboard queries. **Capstone file — references all other guides.**

---

## Status

Complete — all 10 guides are written and reviewed. Last updated: 2026-03.

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
