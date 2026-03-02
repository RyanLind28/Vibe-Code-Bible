# Referral & Viral Loops
> Referral link tracking, invite systems, viral coefficient measurement, Web Share API integration, dynamic OG images, two-sided reward fulfillment, fraud prevention, and referral analytics. A well-engineered referral system turns your happiest users into your most cost-effective acquisition channel.

---

## Principles

### 1. Referral Links Are Attribution Infrastructure

A referral link is not just a URL with a code appended to it. It is a piece of attribution infrastructure that must survive every step of the user journey -- from initial click through browser redirects, signup flows, email verification, and eventual activation. If the referral code is lost at any point in that chain, the referrer gets no credit, the invitee gets no reward, and the entire incentive structure breaks down. Treat referral link tracking with the same rigor you would apply to payment processing: every state transition must be recorded, every edge case must be handled, and the data must be auditable.

The referral code itself should be a short, URL-safe, unique identifier tied to a specific user. A common pattern is a nanoid or hashid of 8-12 characters (`ref_k7x9m2p4`), stored in a `referral_codes` table with a foreign key to the referring user. Avoid using the user's actual ID or email as the referral code -- it leaks PII in URLs, in browser history, and in any analytics tool that captures the full URL. The code should be deterministic per user (one canonical code per user) unless you need per-campaign tracking, in which case a user can have multiple codes with different metadata.

When the invitee clicks the referral link, the code must be captured and persisted immediately. Store it in a first-party cookie and in a query parameter on the landing page. The cookie survives navigation away from the landing page and back. When the invitee eventually signs up (which may happen hours or days later), read the referral code from the cookie and write it to the user's record in the database. This is the "referral attribution" moment. But attribution is not the same as reward -- the reward comes later, after the invitee completes the activation criteria (Principle 5).

The database schema for referral tracking needs three core tables: `referral_codes` (maps codes to users), `referral_clicks` (logs every click on a referral link with timestamp, IP, user agent, and the landing page), and `referrals` (links a referrer user to an invitee user with status tracking). The `referrals` table is the source of truth for the entire referral lifecycle. Its status column progresses through a state machine: `clicked` -> `signed_up` -> `activated` -> `rewarded`. Each transition is timestamped. This state machine makes it trivial to answer questions like "how many people clicked but never signed up?" or "what is the average time from signup to activation for referred users?"

### 2. The Invite System Must Be Frictionless

The moment a user decides to invite someone is a fleeting moment of enthusiasm. Every additional step between that decision and the invite being sent reduces the probability that it happens. If your invite flow requires the user to copy a link, open their email client, paste the link, write a subject line, and compose a message, you have already lost most of them. The invite system must make sharing as close to a single action as possible.

There are three primary invite mechanisms, and a complete referral system supports all three. **Shareable links** are the baseline -- the user copies their unique referral URL and pastes it wherever they want (text message, Slack, social media). The copy-to-clipboard interaction should provide instant visual feedback (a checkmark, a tooltip, a brief animation). **Email invites** let the user enter one or more email addresses and send a pre-composed invitation directly from your product. This is higher friction than a link but higher conversion because the email arrives in the invitee's inbox with the referrer's name attached, which provides social proof. **Native sharing** via the Web Share API (Principle 4) triggers the operating system's share sheet on mobile, giving users access to every app on their device -- WhatsApp, iMessage, Telegram, email -- in a single tap.

Bulk invitations matter for products with team or workspace dynamics. If your product benefits from having multiple people from the same organization, let users paste a list of email addresses or import contacts. Validate addresses on the client side (format check) and on the server side (MX record check for the domain). Deduplicate against existing users and against already-pending invitations. Rate-limit bulk invites to prevent abuse -- a reasonable default is 20 invites per user per day.

The invite email itself should be sent from a transactional email service (Resend, Postmark, SendGrid) with proper DKIM/SPF/DMARC configuration to avoid spam folders. The email should include the referrer's name, a clear call-to-action button, and the referral link. Personalization increases open rates significantly -- "Alex invited you to try ProductName" outperforms "You have been invited to try ProductName." The email content and copywriting are covered in the Copywriting chapter; what matters here is that the email system is reliable, fast (delivered within seconds), and trackable (open tracking, click tracking).

### 3. Viral Coefficient Determines Whether Growth Is Self-Sustaining

The viral coefficient (K-factor) is the single most important metric for a referral program. It measures whether each cohort of users generates enough new users to sustain or accelerate growth without additional acquisition spend. The formula is simple: `K = i * c`, where `i` is the average number of invites each user sends and `c` is the conversion rate of those invites (the percentage that result in a new activated user). If K > 1, every user brings in more than one additional user, and growth is exponential. If K = 0.5, every 100 users generate 50 new users, who generate 25, who generate 12.5 -- growth is additive but decelerating.

Very few products achieve K > 1 for sustained periods. Dropbox's famous referral program had a K-factor around 0.6-0.7, which was extraordinary for a B2B product. Most SaaS products see K-factors between 0.1 and 0.4. But even a K-factor of 0.2 is valuable -- it means 20% of your new users come from referrals, which are typically free or near-free, reducing your blended customer acquisition cost. The goal is not necessarily to achieve viral growth (K > 1) but to maximize the viral coefficient as a complement to paid and organic acquisition.

To increase K, you have two levers: increase the number of invites sent per user (`i`) or increase the invite conversion rate (`c`). Increasing `i` is about surface area and timing -- putting the invite action in the right place at the right moment (immediately after the user experiences a value moment, inside a natural sharing context, within the onboarding flow). Increasing `c` is about the quality of the invite experience -- the landing page, the social proof, the value proposition, and the incentive. A/B test both sides independently. Track `i` and `c` as separate metrics so you can attribute improvements to specific changes.

The viral cycle time -- how long it takes for one user to generate the next -- is equally important but often overlooked. A K-factor of 0.8 with a 2-day cycle time produces far more growth than a K-factor of 0.8 with a 30-day cycle time, because the compounding happens faster. Reduce cycle time by prompting the invite earlier in the user journey, making the signup flow shorter for referred users, and accelerating activation (perhaps with a streamlined onboarding for users who arrive via referral).

### 4. Two-Sided Rewards Align Incentives

A referral reward structure can be single-sided (only the referrer gets rewarded), double-sided (both referrer and invitee get rewarded), or tiered (rewards increase with the number of successful referrals). The research and industry practice overwhelmingly favor double-sided rewards because they align incentives: the referrer is motivated to invite people who will actually use the product (because the reward depends on activation), and the invitee has an extra reason to sign up and activate (because they receive a tangible benefit).

Dropbox's program gave both the referrer and the invitee 500 MB of free storage. Uber gave both a free ride. Airbnb gave both travel credit. The common pattern is that the reward is the product itself -- additional usage, extended trials, premium features. Product-based rewards are superior to cash rewards for three reasons: they reinforce the product's value, they cost the company less than their perceived value (500 MB of storage costs Dropbox fractions of a cent but feels valuable to the user), and they attract users who are genuinely interested in the product rather than reward arbitrageurs farming cash bonuses.

The activation trigger for reward fulfillment must be carefully defined. Rewarding at signup invites fraud and low-quality referrals -- the referrer can create fake accounts to farm rewards. Rewarding at activation (the invitee completes a meaningful action like creating a project, making a purchase, or reaching a usage threshold) ensures the invitee is a real user who found value in the product. The downside of activation-based rewards is delayed gratification for the referrer, so clearly communicate the reward status: "Sarah signed up! She will need to complete her first project before you both earn your bonus."

Tiered rewards create a power-law dynamic where your most enthusiastic advocates are increasingly rewarded. Example: first 3 referrals earn 1 month of Pro each, referrals 4-10 earn 2 months, referrals 11+ earn 3 months plus a lifetime badge. Tiers work because the users who refer the most people are your strongest advocates and deserve disproportionate recognition. However, tiered systems must be carefully designed to avoid feeling like a pyramid scheme -- the value must flow from the product, not from recruiting.

### 5. Fraud Prevention Is Non-Negotiable

Every referral program with a monetary or tangible reward will attract abuse. The question is not whether people will try to game the system but how many will succeed before you detect and stop them. Self-referral (a user creates a second account using their own referral link) is the most common form of abuse. Fake account creation at scale (using disposable email services and VPNs) is the most damaging. And collusion rings (groups of people signing up and referring each other in a circle) are the hardest to detect.

The first line of defense is activation-based rewards (Principle 4). If the invitee must complete a non-trivial action before the reward is granted, self-referral becomes expensive -- the abuser must actually use the product under a fake identity. The second line is device and network fingerprinting: flag referrals where the referrer and invitee share the same IP address, the same browser fingerprint, or the same device ID. These signals are not proof of fraud (family members share networks) but they are strong enough to trigger a manual review or a hold on the reward.

Server-side fraud detection should check for patterns at referral creation time and at reward fulfillment time. At creation: is the invitee's email from a known disposable email provider? Has this IP address been used to create accounts before? Is the referral code being used at an unusually high rate? At fulfillment: did the invitee complete activation suspiciously quickly (faster than the 5th percentile of normal users)? Did the invitee's activity pattern match the referrer's (same features used, same times of day)? Build a scoring system that accumulates signals and blocks rewards above a threshold.

Rate limiting is critical. Cap the number of referral rewards a single user can earn in a given time period (e.g., 10 per month). Cap the number of accounts that can be created from a single IP address in a time window. Cap the number of referral clicks from a single source. These caps do not prevent sophisticated fraud, but they limit the blast radius and force abusers to invest more effort, reducing the ROI of gaming.

The fraud review queue should surface flagged referrals with all available context: referrer account age, referrer usage patterns, invitee email domain, shared signals (IP, fingerprint), time between referral click and signup, time between signup and activation. Give your trust and safety team (or yourself, in the early days) the ability to approve, deny, or permanently ban. Log every decision for auditability.

### 6. Referral Program Architecture Types

There are several distinct referral program architectures, and the right one depends on your product, your users, and your growth stage. The simplest is the **link-based program**: every user gets a unique referral link, shares it wherever they want, and earns a reward when the invitee activates. This works for consumer products with broad appeal and requires minimal implementation beyond the core referral tracking infrastructure.

The **invite-based program** adds an explicit invite step: the user enters the invitee's email address, and the product sends the invitation directly. This gives you control over the messaging and timing, and it creates a social obligation (the invitee received a personal email from someone they know, not a generic marketing link). Invite-based programs typically have higher conversion rates per invite but lower total invites sent, because the friction is higher. For B2B products, invite-based programs often outperform link-based ones because business relationships carry more social weight.

The **milestone program** rewards referrals not individually but in batches: refer 3 friends to unlock Feature X, refer 10 to unlock Feature Y. This gamifies the referral process and creates visible goals for the referrer. Morning Brew's referral program is the canonical example -- refer 3 friends for premium content, 10 for a mug, 25 for a t-shirt. Milestone programs work well for media products and communities where the reward can be physical merchandise or exclusive access.

The **affiliate program** extends referral tracking to non-users: bloggers, influencers, and partners who earn a commission (typically a percentage of the referred user's first payment) for driving signups. Affiliate programs require more sophisticated tracking (cross-domain, cookie-based attribution with configurable windows) and legal infrastructure (tax reporting, minimum payouts, terms of service). They overlap with the Growth Marketing Channels chapter but the tracking infrastructure is shared with your referral system.

### 7. Referral Analytics Close the Feedback Loop

You cannot improve what you do not measure, and referral programs have more measurable surface area than most growth levers. The referral funnel has discrete, trackable stages: invite sent -> link clicked -> signup started -> signup completed -> activated -> reward fulfilled. Conversion rates between each stage reveal exactly where the funnel leaks. If 100 invites are sent but only 5 links are clicked, the problem is the invite message or the channel. If 50 links are clicked but only 3 sign up, the problem is the landing page or the value proposition. If 20 sign up but only 2 activate, the problem is onboarding for referred users.

Attribution quality matters as much as attribution quantity. Track not just how many referrals each user generates, but the lifetime value (LTV) of referred users compared to users from other channels. Referred users typically have 15-25% higher LTV than organic users (because the referrer pre-qualifies them -- they are likely to have a similar use case and similar engagement patterns). If your data shows referred users have equal or lower LTV, something is wrong with your targeting or your incentive structure is attracting the wrong people.

Cohort the referral data by referrer acquisition date and by program changes. If you change the reward from "1 month free" to "2 months free," does the invite-sent-per-user rate increase? Does the quality of invitees change? If you add the Web Share API, does the mobile invite rate increase? Every change to the referral program should be measured as an experiment with a clear hypothesis and a control group. The Analytics Instrumentation chapter covers the event tracking infrastructure needed to capture this data; this chapter focuses on what to track and how to interpret it.

Build a referral dashboard that shows: total invites sent (daily/weekly), referral funnel conversion rates, K-factor trend over time, reward fulfillment rate, top referrers (your power users and potential advocates), referred user LTV vs. organic user LTV, and fraud detection flags. This dashboard should be the first thing the growth team checks each morning.

### 8. Dynamic OG Images and the Web Share API

When a referral link is shared on social media, in a messaging app, or in an email with link preview, the Open Graph (OG) image is the single most impactful element determining whether the recipient clicks. A generic OG image says "this is a product." A dynamic OG image personalized to the referrer says "Alex thinks you should try this product" -- it adds social proof, it catches the eye because it looks different from every other link preview, and it makes the referrer feel like the product was built for them.

Dynamic OG image generation works by rendering an image on-the-fly when the social platform or messaging app requests it. The OG meta tags on the referral landing page point to an image URL that includes the referral code as a parameter: `<meta property="og:image" content="https://app.com/api/og?ref=k7x9m2p4" />`. The image endpoint looks up the referrer's name (and optionally their avatar), renders an image using a library like `@vercel/og` (which uses Satori to convert JSX to SVG to PNG), and returns it with appropriate caching headers. Cache aggressively -- the image for a given referral code does not change and is requested many times.

The Web Share API (`navigator.share()`) enables native sharing on mobile devices. When the user taps "Invite Friends," instead of showing a custom share sheet or copying to clipboard, the browser invokes the operating system's native share dialog, which includes every installed messaging and social app. This dramatically increases the share surface area on mobile -- users can share to WhatsApp, iMessage, Telegram, Instagram DMs, and dozens of other apps in a single tap. The API accepts a title, text, and URL, and is supported in Safari, Chrome on Android, and Edge. On desktop, where the API is less consistently supported, fall back to copy-to-clipboard.

The share payload matters. The URL should be the referral link (obviously). The text should be concise, personal, and include the value proposition: "I have been using ProductName and thought you would like it. Try it with my link and we both get a free month." A/B test the share text just as you would A/B test any other conversion-critical copy. Track which share method the user chose (if the Web Share API provides it via the resolved promise, though this data is limited in practice) to understand which channels drive the most referral conversions.

---

## LLM Instructions

### 1. Building the Referral Tracking Database Schema and Core API

When asked to add a referral system, implement the full tracking infrastructure from database schema to API routes.

1. Create a Prisma schema (or raw SQL migration) with three core models: `ReferralCode` (id, code as unique index, userId as foreign key, createdAt), `ReferralClick` (id, referralCodeId, ip, userAgent, landingPage, createdAt), and `Referral` (id, referrerUserId, inviteeUserId nullable, referralCodeId, status enum of `clicked`/`signed_up`/`activated`/`rewarded`, clickedAt, signedUpAt, activatedAt, rewardedAt, createdAt). The status field is the state machine that tracks the referral lifecycle.
2. Create a utility function `generateReferralCode(userId: string)` that generates a unique 8-character nanoid prefixed with `ref_`, stores it in the `ReferralCode` table, and returns the full referral URL (`https://app.com/?ref=ref_k7x9m2p4`). If the user already has a code, return the existing one.
3. Create a Next.js middleware or layout-level component that reads the `ref` query parameter on any page, stores it in a `referral_code` cookie with a 30-day expiry, and logs a `ReferralClick` record via an API route or server action.
4. Modify the signup flow to read the `referral_code` cookie. After user creation, look up the referral code, find the referrer, and create a `Referral` record with status `signed_up`. Set `inviteeUserId` and `signedUpAt`.
5. Create a server action or API route for activation events. When the invitee completes the activation criteria (configurable -- first project created, first purchase, etc.), update the referral status to `activated` and trigger the reward fulfillment logic.
6. Create a `GET /api/referrals/stats` route that returns the current user's referral metrics: total invites sent, total signups, total activations, total rewards earned, and the user's referral link.

### 2. Implementing the Invite System with Email Delivery

When asked to build the invite flow, implement shareable links, email invites, and native sharing.

1. Create a React component `ReferralShareCard` that displays the user's referral link with a copy-to-clipboard button (using `navigator.clipboard.writeText`), an email invite form (input for comma-separated email addresses), and a native share button (using `navigator.share` with feature detection fallback).
2. Create a `POST /api/referrals/invite` API route that accepts an array of email addresses, validates each (format check, reject disposable email domains from a known list), deduplicates against existing users and pending invites, rate-limits to 20 per user per day, and sends invite emails via Resend.
3. The invite email template should include the referrer's name, a personalized subject line ("Alex invited you to ProductName"), a clear CTA button linking to the referral URL, and a brief value proposition. Use Resend's React email templates for type-safe email rendering.
4. Track the invite event server-side: `referral_invite_sent` with properties `{ referrer_id, invitee_email_hash, channel: "email" }`. Hash the invitee email for privacy -- do not store raw invitee emails in analytics.
5. For the Web Share API integration, detect support with `typeof navigator.share === "function"`, construct the share payload with the referral URL and a pre-composed message, and track the share attempt: `referral_share_attempted` with property `{ channel: "native_share" }`.

### 3. Implementing Reward Fulfillment and K-Factor Tracking

When asked to build the reward system, implement activation-based two-sided rewards with viral coefficient measurement.

1. Define the activation criteria in a configuration object: `{ type: "event", event: "project_created", minCount: 1 }` or `{ type: "purchase", minAmount: 1 }`. This should be changeable without code deployments.
2. Create a reward fulfillment function that is called when the activation criteria is met. It should: find the referral record for the activated user, verify the referral status is `signed_up` (prevent double rewards), update status to `activated`, grant the invitee reward (e.g., extend trial, add credits), grant the referrer reward, update status to `rewarded`, and send notification emails to both parties.
3. Implement fraud checks before granting rewards: compare referrer and invitee IP addresses (flag if identical), check if the invitee's email is from a disposable domain, check if the activation happened suspiciously fast (below 5th percentile), and check if the referrer has exceeded the monthly reward cap.
4. Create a K-factor calculation function that queries referral data for a given time period: `K = (total_invites_sent / total_active_users) * (total_activations / total_invites_sent)`. Simplify to `K = total_activations / total_active_users`. Track this metric daily and display it on the referral dashboard.
5. Store all reward transactions in a `ReferralReward` table (id, referralId, userId, rewardType, rewardValue, status, createdAt) for auditability and to support reward reversal if fraud is detected later.

### 4. Generating Dynamic OG Images for Referral Links

When asked to create personalized share previews, implement dynamic OG image generation.

1. Create a Next.js Route Handler at `app/api/og/route.tsx` that reads the `ref` query parameter, looks up the referrer's name and avatar from the database, and generates a PNG image using `@vercel/og` (the `ImageResponse` class).
2. The image should be 1200x630 pixels (standard OG dimensions), include the product logo, the referrer's name ("Invited by Alex"), and a brief value proposition. Use JSX with inline styles (Satori supports a subset of CSS including flexbox).
3. Set response headers for aggressive caching: `Cache-Control: public, max-age=31536000, immutable` since the image for a given referral code never changes.
4. On the referral landing page, set the OG meta tags dynamically using Next.js `generateMetadata`: `og:image` pointing to `/api/og?ref=CODE`, `og:title` with the personalized title, and `og:description` with the value proposition.
5. Test the OG image by using Facebook's Sharing Debugger, Twitter's Card Validator, or the opengraph.xyz preview tool. Verify the image renders correctly on all major platforms.

### 5. Building the Referral Analytics Dashboard

When asked to build referral reporting, implement SQL queries and a dashboard API.

1. Create a `GET /api/referrals/analytics` route that accepts a date range and returns: total referral links generated, total clicks, total signups, total activations, total rewards granted, funnel conversion rates between each stage, K-factor for the period, and top 10 referrers by activated referrals.
2. Write SQL queries (or Prisma queries) for each metric. The funnel query should compute conversion rates between adjacent stages: click-to-signup, signup-to-activation, activation-to-reward. Use window functions or CTEs for clean SQL.
3. Compute referred user LTV by joining the referrals table with revenue data. Compare the average LTV of referred users vs. organic users. Return both values and the percentage difference.
4. Create a time-series query that computes daily K-factor over the last 90 days. This reveals trends -- is the referral program improving or degrading over time?
5. Surface fraud signals in the analytics: count of flagged referrals, count of blocked rewards, most common fraud signal (same IP, disposable email, fast activation). This helps the team tune fraud thresholds.

---

## Examples

### 1. Referral Database Schema and Core API

```typescript
// prisma/schema.prisma — Referral models
model ReferralCode {
  id        String   @id @default(cuid())
  code      String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  clicks    ReferralClick[]
  referrals Referral[]
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([code])
}

model ReferralClick {
  id             String       @id @default(cuid())
  referralCodeId String
  referralCode   ReferralCode @relation(fields: [referralCodeId], references: [id])
  ip             String?
  userAgent      String?
  landingPage    String?
  createdAt      DateTime     @default(now())

  @@index([referralCodeId])
  @@index([ip])
}

model Referral {
  id              String        @id @default(cuid())
  referrerUserId  String
  referrer        User          @relation("ReferralsMade", fields: [referrerUserId], references: [id])
  inviteeUserId   String?
  invitee         User?         @relation("ReferralsReceived", fields: [inviteeUserId], references: [id])
  referralCodeId  String
  referralCode    ReferralCode  @relation(fields: [referralCodeId], references: [id])
  status          ReferralStatus @default(clicked)
  clickedAt       DateTime      @default(now())
  signedUpAt      DateTime?
  activatedAt     DateTime?
  rewardedAt      DateTime?
  rewardId        String?
  fraudScore      Int           @default(0)
  fraudSignals    Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([referrerUserId])
  @@index([inviteeUserId])
  @@index([status])
}

model ReferralReward {
  id          String       @id @default(cuid())
  referralId  String
  userId      String
  rewardType  RewardType
  rewardValue Int          // e.g., days of pro, credits, cents
  status      RewardStatus @default(pending)
  createdAt   DateTime     @default(now())

  @@index([referralId])
  @@index([userId])
}

enum ReferralStatus {
  clicked
  signed_up
  activated
  rewarded
}

enum RewardType {
  trial_extension
  credits
  plan_upgrade
}

enum RewardStatus {
  pending
  granted
  reversed
}
```

```typescript
// src/lib/referrals/codes.ts — Referral code generation and lookup
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

const REFERRAL_CODE_LENGTH = 8;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function getOrCreateReferralCode(userId: string): Promise<{
  code: string;
  url: string;
}> {
  // Return existing code if the user already has one
  const existing = await prisma.referralCode.findFirst({
    where: { userId },
  });

  if (existing) {
    return {
      code: existing.code,
      url: `${BASE_URL}/?ref=${existing.code}`,
    };
  }

  // Generate a new unique code
  let code: string;
  let isUnique = false;

  do {
    code = `ref_${nanoid(REFERRAL_CODE_LENGTH)}`;
    const conflict = await prisma.referralCode.findUnique({
      where: { code },
    });
    isUnique = !conflict;
  } while (!isUnique);

  await prisma.referralCode.create({
    data: { code, userId },
  });

  return {
    code,
    url: `${BASE_URL}/?ref=${code}`,
  };
}

export async function resolveReferralCode(code: string) {
  return prisma.referralCode.findUnique({
    where: { code },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
}
```

```typescript
// src/lib/referrals/tracking.ts — Referral click and signup tracking
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const REFERRAL_COOKIE = "referral_code";
const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function trackReferralClick(
  code: string,
  ip: string | null,
  userAgent: string | null,
  landingPage: string
) {
  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
  });

  if (!referralCode) return null;

  // Log the click
  await prisma.referralClick.create({
    data: {
      referralCodeId: referralCode.id,
      ip,
      userAgent,
      landingPage,
    },
  });

  return referralCode;
}

export async function setReferralCookie(code: string) {
  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_COOKIE, code, {
    maxAge: REFERRAL_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function getReferralCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFERRAL_COOKIE)?.value ?? null;
}

export async function attributeSignup(inviteeUserId: string) {
  const code = await getReferralCookie();
  if (!code) return null;

  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
    include: { user: true },
  });

  if (!referralCode) return null;

  // Prevent self-referral
  if (referralCode.userId === inviteeUserId) return null;

  // Check if this invitee already has a referral
  const existingReferral = await prisma.referral.findFirst({
    where: { inviteeUserId },
  });

  if (existingReferral) return existingReferral;

  // Create the referral record
  const referral = await prisma.referral.create({
    data: {
      referrerUserId: referralCode.userId,
      inviteeUserId,
      referralCodeId: referralCode.id,
      status: "signed_up",
      signedUpAt: new Date(),
    },
  });

  return referral;
}
```

```typescript
// src/middleware.ts — Capture referral code from URL and set cookie
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const refCode = request.nextUrl.searchParams.get("ref");

  if (refCode && !request.cookies.get("referral_code")) {
    // Set the referral cookie for later attribution
    response.cookies.set("referral_code", refCode, {
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    // Log the click asynchronously via an internal API call
    const clickUrl = new URL("/api/referrals/click", request.url);
    clickUrl.searchParams.set("code", refCode);
    clickUrl.searchParams.set("landing", request.nextUrl.pathname);
    clickUrl.searchParams.set("ip", request.headers.get("x-forwarded-for") ?? "unknown");
    clickUrl.searchParams.set("ua", request.headers.get("user-agent") ?? "unknown");

    // Fire-and-forget: do not await in middleware to avoid latency
    fetch(clickUrl.toString(), { method: "POST" }).catch(() => {});
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
```

### 2. Invite System with Email Delivery and Web Share API

```typescript
// src/app/api/referrals/invite/route.ts — Email invite API route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateReferralCode } from "@/lib/referrals/codes";
import { ReferralInviteEmail } from "@/emails/referral-invite";
import { analytics } from "@/lib/analytics";
import { createHash } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// Common disposable email domains to reject
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com",
  "throwaway.email", "yopmail.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "dispostable.com",
]);

const inviteSchema = z.object({
  emails: z
    .array(z.string().email())
    .min(1, "At least one email is required")
    .max(20, "Maximum 20 invites at a time"),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Rate limit: 20 invites per user per day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const invitesToday = await prisma.referralClick.count({
    where: {
      referralCode: { userId: session.user.id },
      createdAt: { gte: today },
    },
  });

  if (invitesToday + parsed.data.emails.length > 20) {
    return NextResponse.json(
      { error: "Daily invite limit reached (20 per day)" },
      { status: 429 }
    );
  }

  const { code, url } = await getOrCreateReferralCode(session.user.id);

  // Filter out invalid and duplicate emails
  const validEmails: string[] = [];
  const rejected: { email: string; reason: string }[] = [];

  for (const email of parsed.data.emails) {
    const domain = email.split("@")[1].toLowerCase();

    if (DISPOSABLE_DOMAINS.has(domain)) {
      rejected.push({ email, reason: "Disposable email domain" });
      continue;
    }

    // Check if already a user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      rejected.push({ email, reason: "Already a user" });
      continue;
    }

    validEmails.push(email);
  }

  // Send invite emails
  const sent: string[] = [];
  for (const email of validEmails) {
    try {
      await resend.emails.send({
        from: "ProductName <invites@notifications.product.com>",
        to: email,
        subject: `${session.user.name} invited you to ProductName`,
        react: ReferralInviteEmail({
          referrerName: session.user.name ?? "A friend",
          referralUrl: url,
          inviteeEmail: email,
        }),
      });
      sent.push(email);

      // Track invite event with hashed email for privacy
      const emailHash = createHash("sha256").update(email).digest("hex").slice(0, 16);
      analytics.track("referral_invite_sent", {
        referrerId: session.user.id,
        inviteeEmailHash: emailHash,
        channel: "email",
      });
    } catch (error) {
      rejected.push({ email, reason: "Failed to send" });
    }
  }

  return NextResponse.json({
    sent: sent.length,
    rejected,
    referralUrl: url,
  });
}
```

```typescript
// src/emails/referral-invite.tsx — Resend React email template
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ReferralInviteEmailProps {
  referrerName: string;
  referralUrl: string;
  inviteeEmail: string;
}

export function ReferralInviteEmail({
  referrerName,
  referralUrl,
}: ReferralInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{referrerName} thinks you will love ProductName</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
        <Container
          style={{
            maxWidth: "480px",
            margin: "40px auto",
            background: "#ffffff",
            borderRadius: "8px",
            padding: "40px",
          }}
        >
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            {referrerName} invited you to ProductName
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", lineHeight: "1.6" }}>
            {referrerName} has been using ProductName and thought you would find
            it valuable. Sign up with the link below and you will both receive a
            free month of Pro.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={referralUrl}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                padding: "12px 32px",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Accept Invitation
            </Button>
          </Section>
          <Text style={{ fontSize: "14px", color: "#6b7280" }}>
            This invitation was sent by {referrerName} via ProductName. If you
            did not expect this email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

```tsx
// src/components/referral-share-card.tsx — Share UI with copy, email, and native share
"use client";

import { useState, useCallback } from "react";
import { Check, Copy, Mail, Share2 } from "lucide-react";

interface ReferralShareCardProps {
  referralUrl: string;
  referralCode: string;
  totalReferrals: number;
  totalRewards: number;
}

export function ReferralShareCard({
  referralUrl,
  referralCode,
  totalReferrals,
  totalRewards,
}: ReferralShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; rejected: any[] } | null>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralUrl]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator.share !== "function") {
      // Fallback to copy
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: "Join me on ProductName",
        text: "I have been using ProductName and thought you would like it. Sign up with my link and we both get a free month of Pro.",
        url: referralUrl,
      });
    } catch (err) {
      // User cancelled the share dialog — not an error
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  }, [referralUrl, handleCopy]);

  const handleEmailInvite = useCallback(async () => {
    const emailList = emails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emailList.length === 0) return;

    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/referrals/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: emailList }),
      });

      const data = await response.json();
      setResult(data);
      if (data.sent > 0) setEmails("");
    } catch (error) {
      setResult({ sent: 0, rejected: [{ reason: "Network error" }] });
    } finally {
      setSending(false);
    }
  }, [emails]);

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold">Invite Friends, Earn Rewards</h3>
      <p className="mt-1 text-sm text-gray-600">
        Share your link. When a friend signs up and creates their first project,
        you both get a free month of Pro.
      </p>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-md bg-blue-50 p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{totalReferrals}</div>
          <div className="text-xs text-blue-600">Friends Referred</div>
        </div>
        <div className="rounded-md bg-green-50 p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{totalRewards}</div>
          <div className="text-xs text-green-600">Rewards Earned</div>
        </div>
      </div>

      {/* Referral link with copy button */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={referralUrl}
          className="flex-1 rounded-md border bg-gray-50 px-3 py-2 text-sm"
        />
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Native share button (mobile) */}
      <button
        onClick={handleNativeShare}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <Share2 className="h-4 w-4" />
        Share with Friends
      </button>

      {/* Email invite form */}
      <div className="mt-6 border-t pt-4">
        <label className="text-sm font-medium">Invite by Email</label>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="Enter email addresses, separated by commas"
          rows={2}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
        <button
          onClick={handleEmailInvite}
          disabled={sending || !emails.trim()}
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {sending ? "Sending..." : "Send Invites"}
        </button>

        {result && (
          <p className="mt-2 text-sm">
            {result.sent > 0 && (
              <span className="text-green-600">
                {result.sent} invite{result.sent !== 1 ? "s" : ""} sent.{" "}
              </span>
            )}
            {result.rejected.length > 0 && (
              <span className="text-amber-600">
                {result.rejected.length} skipped (already users or invalid).
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
```

### 3. Reward Fulfillment with Fraud Detection

```typescript
// src/lib/referrals/rewards.ts — Activation-based reward fulfillment
import { prisma } from "@/lib/db";
import { analytics } from "@/lib/analytics";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ActivationConfig {
  type: "event" | "purchase";
  event?: string;
  minCount?: number;
  minAmountCents?: number;
}

const ACTIVATION_CONFIG: ActivationConfig = {
  type: "event",
  event: "project_created",
  minCount: 1,
};

const REWARD_CONFIG = {
  referrer: { type: "trial_extension" as const, valueDays: 30 },
  invitee: { type: "trial_extension" as const, valueDays: 30 },
  maxRewardsPerMonth: 10,
};

interface FraudSignals {
  sameIp: boolean;
  disposableEmail: boolean;
  fastActivation: boolean;
  suspiciousPattern: boolean;
}

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com",
  "throwaway.email", "yopmail.com",
]);

async function computeFraudScore(referralId: string): Promise<{
  score: number;
  signals: FraudSignals;
}> {
  const referral = await prisma.referral.findUniqueOrThrow({
    where: { id: referralId },
    include: {
      referrer: true,
      invitee: true,
      referralCode: { include: { clicks: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });

  const signals: FraudSignals = {
    sameIp: false,
    disposableEmail: false,
    fastActivation: false,
    suspiciousPattern: false,
  };
  let score = 0;

  // Signal 1: Same IP address
  const lastClick = referral.referralCode.clicks[0];
  if (lastClick?.ip && referral.invitee?.email) {
    // Check if referrer has logged in from this IP
    const referrerSession = await prisma.session.findFirst({
      where: {
        userId: referral.referrerUserId,
        // Assuming sessions store IP — adjust to your schema
      },
    });
    // Simplified: in production, compare actual IPs from session logs
    if (lastClick.ip === referrerSession?.ip) {
      signals.sameIp = true;
      score += 40;
    }
  }

  // Signal 2: Disposable email
  if (referral.invitee?.email) {
    const domain = referral.invitee.email.split("@")[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      signals.disposableEmail = true;
      score += 30;
    }
  }

  // Signal 3: Suspiciously fast activation
  if (referral.signedUpAt && referral.activatedAt) {
    const activationTimeMs =
      referral.activatedAt.getTime() - referral.signedUpAt.getTime();
    const fiveMinutes = 5 * 60 * 1000;
    if (activationTimeMs < fiveMinutes) {
      signals.fastActivation = true;
      score += 25;
    }
  }

  // Signal 4: Referrer has too many referrals this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyReferrals = await prisma.referral.count({
    where: {
      referrerUserId: referral.referrerUserId,
      status: { in: ["activated", "rewarded"] },
      activatedAt: { gte: monthStart },
    },
  });

  if (monthlyReferrals > REWARD_CONFIG.maxRewardsPerMonth) {
    signals.suspiciousPattern = true;
    score += 20;
  }

  return { score, signals };
}

export async function handleActivation(inviteeUserId: string) {
  // Find the referral for this invitee
  const referral = await prisma.referral.findFirst({
    where: {
      inviteeUserId,
      status: "signed_up",
    },
  });

  if (!referral) return null; // No referral or already processed

  // Update status to activated
  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: "activated", activatedAt: new Date() },
  });

  // Run fraud checks
  const { score, signals } = await computeFraudScore(referral.id);

  // Store fraud data regardless of outcome
  await prisma.referral.update({
    where: { id: referral.id },
    data: { fraudScore: score, fraudSignals: signals },
  });

  // Block reward if fraud score is too high
  if (score >= 50) {
    analytics.track("referral_reward_blocked", {
      referralId: referral.id,
      fraudScore: score,
      signals,
    });
    return { status: "blocked", fraudScore: score, signals };
  }

  // Grant rewards to both parties
  await prisma.$transaction(async (tx) => {
    // Invitee reward
    await tx.referralReward.create({
      data: {
        referralId: referral.id,
        userId: inviteeUserId,
        rewardType: REWARD_CONFIG.invitee.type,
        rewardValue: REWARD_CONFIG.invitee.valueDays,
        status: "granted",
      },
    });

    // Extend invitee's trial
    await tx.user.update({
      where: { id: inviteeUserId },
      data: {
        trialEndsAt: {
          // Add days to current trial end or from now if expired
          set: new Date(
            Date.now() + REWARD_CONFIG.invitee.valueDays * 24 * 60 * 60 * 1000
          ),
        },
      },
    });

    // Referrer reward
    await tx.referralReward.create({
      data: {
        referralId: referral.id,
        userId: referral.referrerUserId,
        rewardType: REWARD_CONFIG.referrer.type,
        rewardValue: REWARD_CONFIG.referrer.valueDays,
        status: "granted",
      },
    });

    // Extend referrer's trial
    await tx.user.update({
      where: { id: referral.referrerUserId },
      data: {
        trialEndsAt: {
          set: new Date(
            Date.now() + REWARD_CONFIG.referrer.valueDays * 24 * 60 * 60 * 1000
          ),
        },
      },
    });

    // Update referral status
    await tx.referral.update({
      where: { id: referral.id },
      data: { status: "rewarded", rewardedAt: new Date() },
    });
  });

  // Track the reward event
  analytics.track("referral_reward_granted", {
    referralId: referral.id,
    referrerUserId: referral.referrerUserId,
    inviteeUserId,
    rewardType: REWARD_CONFIG.referrer.type,
    rewardValue: REWARD_CONFIG.referrer.valueDays,
  });

  return { status: "rewarded", fraudScore: score };
}
```

```typescript
// src/app/api/referrals/stats/route.ts — User-facing referral stats
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateReferralCode } from "@/lib/referrals/codes";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [referralCode, referrals, rewards] = await Promise.all([
    getOrCreateReferralCode(userId),
    prisma.referral.groupBy({
      by: ["status"],
      where: { referrerUserId: userId },
      _count: { id: true },
    }),
    prisma.referralReward.aggregate({
      where: { userId, status: "granted" },
      _sum: { rewardValue: true },
      _count: { id: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    referrals.map((r) => [r.status, r._count.id])
  );

  return NextResponse.json({
    referralUrl: referralCode.url,
    referralCode: referralCode.code,
    stats: {
      clicked: statusCounts.clicked ?? 0,
      signedUp: statusCounts.signed_up ?? 0,
      activated: statusCounts.activated ?? 0,
      rewarded: statusCounts.rewarded ?? 0,
    },
    totalRewardsEarned: rewards._count.id,
    totalRewardDays: rewards._sum.rewardValue ?? 0,
  });
}
```

### 4. Dynamic OG Image Generation

```tsx
// src/app/api/og/route.tsx — Dynamic OG image for referral links
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { resolveReferralCode } from "@/lib/referrals/codes";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("ref");

  if (!code) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "1200px",
            height: "630px",
            background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
            color: "#ffffff",
            fontFamily: "system-ui",
          }}
        >
          <div style={{ fontSize: "64px", fontWeight: 700 }}>ProductName</div>
          <div style={{ fontSize: "28px", marginTop: "16px", color: "#94a3b8" }}>
            Build faster. Ship smarter.
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Look up the referrer
  const referralCode = await resolveReferralCode(code);
  const referrerName = referralCode?.user?.name ?? "A friend";
  const referrerInitial = referrerName.charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
          color: "#ffffff",
          fontFamily: "system-ui",
        }}
      >
        {/* Referrer avatar placeholder */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#3b82f6",
            fontSize: "36px",
            fontWeight: 700,
          }}
        >
          {referrerInitial}
        </div>
        <div style={{ fontSize: "24px", marginTop: "20px", color: "#94a3b8" }}>
          Invited by
        </div>
        <div style={{ fontSize: "48px", fontWeight: 700, marginTop: "8px" }}>
          {referrerName}
        </div>
        <div
          style={{
            fontSize: "28px",
            marginTop: "24px",
            color: "#cbd5e1",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Join ProductName and you both get a free month of Pro
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "32px",
            padding: "12px 40px",
            background: "#2563eb",
            borderRadius: "8px",
            fontSize: "22px",
            fontWeight: 600,
          }}
        >
          Accept Invitation
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
```

```typescript
// src/app/invite/[code]/page.tsx — Referral landing page with dynamic metadata
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveReferralCode } from "@/lib/referrals/codes";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const referralCode = await resolveReferralCode(code);

  if (!referralCode) return {};

  const referrerName = referralCode.user?.name ?? "A friend";
  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/og?ref=${code}`;

  return {
    title: `${referrerName} invited you to ProductName`,
    description:
      "Sign up with this invite link and you both get a free month of Pro.",
    openGraph: {
      title: `${referrerName} invited you to ProductName`,
      description:
        "Sign up with this invite link and you both get a free month of Pro.",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Invitation from ${referrerName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${referrerName} invited you to ProductName`,
      description:
        "Sign up with this invite link and you both get a free month of Pro.",
      images: [ogImageUrl],
    },
  };
}

export default async function ReferralLandingPage({ params }: PageProps) {
  const { code } = await params;
  const referralCode = await resolveReferralCode(code);

  if (!referralCode) notFound();

  const referrerName = referralCode.user?.name ?? "A friend";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
          {referrerName.charAt(0).toUpperCase()}
        </div>
        <h1 className="mt-6 text-3xl font-bold">
          {referrerName} invited you to ProductName
        </h1>
        <p className="mt-3 text-gray-600">
          Sign up now and you both get a free month of Pro. No credit card
          required.
        </p>
        <a
          href={`/signup?ref=${code}`}
          className="mt-8 inline-block rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white hover:bg-blue-700"
        >
          Get Started Free
        </a>
        <p className="mt-4 text-sm text-gray-500">
          Free 14-day trial + 30 bonus days from this invitation
        </p>
      </div>
    </main>
  );
}
```

### 5. Referral Analytics Queries and K-Factor Calculation

```sql
-- Referral funnel analysis: conversion rates between each stage
-- Run against PostgreSQL with the Prisma-generated schema

WITH funnel AS (
  SELECT
    status,
    COUNT(*) AS count
  FROM "Referral"
  WHERE "createdAt" >= NOW() - INTERVAL '30 days'
  GROUP BY status
),
totals AS (
  SELECT
    COALESCE(SUM(count) FILTER (WHERE status IN ('clicked', 'signed_up', 'activated', 'rewarded')), 0) AS total_clicked,
    COALESCE(SUM(count) FILTER (WHERE status IN ('signed_up', 'activated', 'rewarded')), 0) AS total_signed_up,
    COALESCE(SUM(count) FILTER (WHERE status IN ('activated', 'rewarded')), 0) AS total_activated,
    COALESCE(SUM(count) FILTER (WHERE status = 'rewarded'), 0) AS total_rewarded
  FROM funnel
)
SELECT
  total_clicked AS "Clicks",
  total_signed_up AS "Signups",
  total_activated AS "Activations",
  total_rewarded AS "Rewards",
  CASE WHEN total_clicked > 0
    THEN ROUND(total_signed_up::numeric / total_clicked * 100, 1)
    ELSE 0
  END AS "Click-to-Signup %",
  CASE WHEN total_signed_up > 0
    THEN ROUND(total_activated::numeric / total_signed_up * 100, 1)
    ELSE 0
  END AS "Signup-to-Activation %",
  CASE WHEN total_activated > 0
    THEN ROUND(total_rewarded::numeric / total_activated * 100, 1)
    ELSE 0
  END AS "Activation-to-Reward %"
FROM totals;
```

```sql
-- K-factor calculation: daily viral coefficient over the last 90 days

WITH daily_users AS (
  SELECT
    DATE_TRUNC('day', "createdAt") AS day,
    COUNT(DISTINCT id) AS active_users
  FROM "User"
  WHERE "createdAt" >= NOW() - INTERVAL '90 days'
  GROUP BY DATE_TRUNC('day', "createdAt")
),
daily_invites AS (
  SELECT
    DATE_TRUNC('day', rc."createdAt") AS day,
    COUNT(*) AS invites_sent
  FROM "ReferralClick" rc
  WHERE rc."createdAt" >= NOW() - INTERVAL '90 days'
  GROUP BY DATE_TRUNC('day', rc."createdAt")
),
daily_activations AS (
  SELECT
    DATE_TRUNC('day', "activatedAt") AS day,
    COUNT(*) AS activations
  FROM "Referral"
  WHERE "activatedAt" IS NOT NULL
    AND "activatedAt" >= NOW() - INTERVAL '90 days'
  GROUP BY DATE_TRUNC('day', "activatedAt")
)
SELECT
  du.day,
  du.active_users,
  COALESCE(di.invites_sent, 0) AS invites_sent,
  COALESCE(da.activations, 0) AS activations,
  CASE WHEN du.active_users > 0
    THEN ROUND(
      (COALESCE(di.invites_sent, 0)::numeric / du.active_users) *
      (COALESCE(da.activations, 0)::numeric / NULLIF(COALESCE(di.invites_sent, 0), 0)),
      4
    )
    ELSE 0
  END AS k_factor
FROM daily_users du
LEFT JOIN daily_invites di ON du.day = di.day
LEFT JOIN daily_activations da ON du.day = da.day
ORDER BY du.day DESC;
```

```sql
-- Referred user LTV comparison: referred users vs. organic users

WITH user_revenue AS (
  SELECT
    u.id AS user_id,
    CASE
      WHEN r.id IS NOT NULL THEN 'referred'
      ELSE 'organic'
    END AS acquisition_source,
    COALESCE(SUM(p.amount_cents), 0) AS total_revenue_cents,
    u."createdAt" AS signup_date
  FROM "User" u
  LEFT JOIN "Referral" r
    ON r."inviteeUserId" = u.id
    AND r.status = 'rewarded'
  LEFT JOIN "Payment" p
    ON p."userId" = u.id
    AND p.status = 'succeeded'
  WHERE u."createdAt" >= NOW() - INTERVAL '6 months'
  GROUP BY u.id, r.id, u."createdAt"
)
SELECT
  acquisition_source,
  COUNT(DISTINCT user_id) AS users,
  ROUND(AVG(total_revenue_cents) / 100.0, 2) AS avg_ltv_dollars,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_revenue_cents) / 100.0, 2) AS median_ltv_dollars,
  ROUND(SUM(total_revenue_cents) / 100.0, 2) AS total_revenue_dollars
FROM user_revenue
GROUP BY acquisition_source
ORDER BY acquisition_source;
```

```typescript
// src/lib/referrals/kfactor.ts — K-factor calculation utility
import { prisma } from "@/lib/db";

export interface KFactorResult {
  kFactor: number;
  invitesPerUser: number;
  conversionRate: number;
  totalActiveUsers: number;
  totalInvitesSent: number;
  totalActivations: number;
  periodStart: Date;
  periodEnd: Date;
}

export async function calculateKFactor(
  periodDays: number = 30
): Promise<KFactorResult> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  const periodEnd = new Date();

  const [activeUsers, invitesSent, activations] = await Promise.all([
    // Users who were active in the period
    prisma.user.count({
      where: {
        lastActiveAt: { gte: periodStart },
      },
    }),
    // Total referral invites sent (clicks on referral links)
    prisma.referralClick.count({
      where: {
        createdAt: { gte: periodStart },
      },
    }),
    // Total successful activations from referrals
    prisma.referral.count({
      where: {
        activatedAt: { gte: periodStart },
        status: { in: ["activated", "rewarded"] },
      },
    }),
  ]);

  const invitesPerUser = activeUsers > 0 ? invitesSent / activeUsers : 0;
  const conversionRate = invitesSent > 0 ? activations / invitesSent : 0;
  const kFactor = invitesPerUser * conversionRate;

  return {
    kFactor: Math.round(kFactor * 1000) / 1000,
    invitesPerUser: Math.round(invitesPerUser * 100) / 100,
    conversionRate: Math.round(conversionRate * 1000) / 1000,
    totalActiveUsers: activeUsers,
    totalInvitesSent: invitesSent,
    totalActivations: activations,
    periodStart,
    periodEnd,
  };
}
```

---

## Common Mistakes

### 1. Granting Rewards at Signup Instead of Activation

**Wrong:** Granting the referral reward the moment the invitee creates an account, before they have done anything meaningful with the product.

```typescript
// Rewards at signup — invites fraud and low-quality referrals
async function handleSignup(userId: string) {
  const referral = await findReferralForUser(userId);
  if (referral) {
    await grantReward(referral.referrerUserId); // Immediate reward
    await grantReward(userId);
  }
}
```

**Fix:** Require activation (a meaningful product action) before granting rewards. This ensures the invitee is a real user and dramatically reduces fraud.

```typescript
// Reward only after activation — invitee must create their first project
async function handleProjectCreated(userId: string, isFirst: boolean) {
  if (!isFirst) return;

  const referral = await prisma.referral.findFirst({
    where: { inviteeUserId: userId, status: "signed_up" },
  });

  if (referral) {
    await handleActivation(userId); // Fraud checks + reward fulfillment
  }
}
```

### 2. Losing the Referral Code During Navigation

**Wrong:** Only reading the referral code from the URL query parameter at signup time. If the user navigates to other pages before signing up, the code is lost.

```typescript
// Code lost after first navigation — user visits /pricing then /signup
export default function SignupPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref"); // null if user navigated here
}
```

**Fix:** Capture the referral code in a cookie on the first page load (in middleware) and read it from the cookie during signup. The cookie survives navigation.

```typescript
// Middleware captures the code on any page and persists it
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const refCode = request.nextUrl.searchParams.get("ref");

  if (refCode && !request.cookies.get("referral_code")) {
    response.cookies.set("referral_code", refCode, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

// Signup reads from the persisted cookie
async function handleSignup(userId: string) {
  const cookieStore = await cookies();
  const refCode = cookieStore.get("referral_code")?.value;
  if (refCode) {
    await attributeSignup(userId); // Uses cookie value
  }
}
```

### 3. Not Preventing Self-Referrals

**Wrong:** Allowing a user to sign up with their own referral code by using a different email or an incognito window, earning a reward for referring themselves.

```typescript
// No self-referral check — user can refer themselves
async function attributeSignup(inviteeUserId: string) {
  const code = await getReferralCookie();
  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
  });
  // Missing: check if referrer === invitee
  await prisma.referral.create({
    data: {
      referrerUserId: referralCode.userId,
      inviteeUserId,
      // ...
    },
  });
}
```

**Fix:** Check that the referrer and invitee are different users. Also check for shared IP addresses, device fingerprints, and email domain patterns as additional fraud signals.

```typescript
async function attributeSignup(inviteeUserId: string) {
  const code = await getReferralCookie();
  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
    include: { user: true },
  });

  if (!referralCode) return null;

  // Block self-referral
  if (referralCode.userId === inviteeUserId) return null;

  // Check for email domain match (weak signal but worth logging)
  const referrer = referralCode.user;
  const invitee = await prisma.user.findUnique({ where: { id: inviteeUserId } });
  const sameEmailDomain =
    referrer.email.split("@")[1] === invitee?.email.split("@")[1];

  await prisma.referral.create({
    data: {
      referrerUserId: referralCode.userId,
      inviteeUserId,
      fraudSignals: { sameEmailDomain },
      // ...
    },
  });
}
```

### 4. Using User IDs or Emails as Referral Codes

**Wrong:** Using the user's database ID or email address as their referral code. This exposes PII in URLs, browser history, analytics tools, and server logs.

```typescript
// PII in the URL — exposed in browser history, logs, analytics
const referralUrl = `https://app.com/?ref=${user.email}`;
// or
const referralUrl = `https://app.com/?ref=${user.id}`;
```

**Fix:** Generate a random, opaque referral code that maps to the user in the database. The code reveals nothing about the user's identity.

```typescript
// Opaque code — no PII exposure
import { nanoid } from "nanoid";

const code = `ref_${nanoid(8)}`; // e.g., "ref_k7x9m2p4"
const referralUrl = `https://app.com/?ref=${code}`;

// The code-to-user mapping lives only in the database
await prisma.referralCode.create({
  data: { code, userId: user.id },
});
```

### 5. No Rate Limiting on Invite Sending

**Wrong:** Allowing unlimited invite emails, enabling abuse (spam) and wasting transactional email budget.

```typescript
// No rate limit — user can send 10,000 invites in one request
export async function POST(request: NextRequest) {
  const { emails } = await request.json();
  for (const email of emails) {
    await resend.emails.send({ to: email, /* ... */ });
  }
}
```

**Fix:** Cap invites per request, per user per day, and per IP address. Return clear error messages when limits are hit.

```typescript
export async function POST(request: NextRequest) {
  const { emails } = await request.json();

  // Cap per request
  if (emails.length > 20) {
    return NextResponse.json(
      { error: "Maximum 20 invites per request" },
      { status: 400 }
    );
  }

  // Cap per user per day
  const invitesToday = await countInvitesToday(session.user.id);
  if (invitesToday + emails.length > 20) {
    return NextResponse.json(
      { error: "Daily invite limit reached (20 per day)" },
      { status: 429 }
    );
  }

  // Proceed with sending
  for (const email of emails) {
    await resend.emails.send({ to: email, /* ... */ });
  }
}
```

### 6. Missing Web Share API Feature Detection

**Wrong:** Calling `navigator.share()` without checking if the browser supports it, crashing on desktop browsers.

```typescript
// Crashes on browsers that don't support the Web Share API
async function handleShare() {
  await navigator.share({
    title: "Join ProductName",
    url: referralUrl,
  });
}
```

**Fix:** Feature-detect the API and provide a fallback (copy to clipboard) for unsupported browsers.

```typescript
async function handleShare() {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Join ProductName",
        text: "I've been using ProductName — try it with my link.",
        url: referralUrl,
      });
    } catch (err) {
      // User cancelled — not an error
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  } else {
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(referralUrl);
    showToast("Link copied to clipboard");
  }
}
```

### 7. Not Caching Dynamic OG Images

**Wrong:** Generating the OG image on every request without caching. Social platforms and messaging apps request OG images multiple times (for preview, for display, for different resolutions), hammering your server.

```typescript
// No caching — image regenerated on every request
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("ref");
  const referrer = await lookupReferrer(code);
  return new ImageResponse(<OGImage name={referrer.name} />, {
    width: 1200,
    height: 630,
    // Missing: Cache-Control header
  });
}
```

**Fix:** Set aggressive cache headers. The OG image for a given referral code never changes, so it can be cached indefinitely.

```typescript
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("ref");
  const referrer = await lookupReferrer(code);
  return new ImageResponse(<OGImage name={referrer.name} />, {
    width: 1200,
    height: 630,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000",
    },
  });
}
```

### 8. Tracking Raw Invitee Emails in Analytics

**Wrong:** Sending the invitee's full email address to your analytics provider. This violates privacy principles, may breach GDPR, and pollutes your analytics with PII.

```typescript
// PII in analytics — do not send raw emails to third-party analytics
analytics.track("referral_invite_sent", {
  referrerId: user.id,
  inviteeEmail: "friend@example.com", // PII leak
});
```

**Fix:** Hash the email before sending it to analytics. This preserves the ability to deduplicate and count unique invitees without exposing raw email addresses.

```typescript
import { createHash } from "crypto";

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
}

analytics.track("referral_invite_sent", {
  referrerId: user.id,
  inviteeEmailHash: hashEmail("friend@example.com"),
  channel: "email",
});
```

### 9. Computing K-Factor Without Separating the Two Levers

**Wrong:** Only tracking the overall K-factor number without breaking it into its components (`invites_per_user` and `conversion_rate`). When K drops, you have no idea whether fewer people are sharing or fewer invitees are converting.

```typescript
// Only the final number — no diagnostic power
const kFactor = totalActivations / totalActiveUsers;
console.log(`K-factor: ${kFactor}`);
```

**Fix:** Track both components separately so you can diagnose changes and target improvements.

```typescript
const invitesPerUser = totalInvitesSent / totalActiveUsers;
const conversionRate = totalActivations / totalInvitesSent;
const kFactor = invitesPerUser * conversionRate;

// Now you can see which lever changed
analytics.track("referral_kfactor_computed", {
  kFactor,
  invitesPerUser,      // Did sharing decrease?
  conversionRate,      // Did invite quality decrease?
  totalActiveUsers,
  totalInvitesSent,
  totalActivations,
  period: "30d",
});
```

### 10. Not Deduplicating Referral Attribution

**Wrong:** Creating a new referral record every time the same invitee clicks a referral link, or allowing multiple referrers to claim the same invitee.

```typescript
// Duplicate referrals — same invitee attributed to multiple referrers
async function attributeSignup(inviteeUserId: string) {
  const code = await getReferralCookie();
  const referralCode = await lookupCode(code);

  // No deduplication check — creates duplicate records
  await prisma.referral.create({
    data: {
      referrerUserId: referralCode.userId,
      inviteeUserId,
      status: "signed_up",
    },
  });
}
```

**Fix:** Check if the invitee already has a referral record before creating one. Use a unique constraint on `inviteeUserId` in the database to enforce this at the schema level.

```typescript
async function attributeSignup(inviteeUserId: string) {
  const code = await getReferralCookie();
  const referralCode = await lookupCode(code);

  if (!referralCode) return null;

  // Check for existing referral — first referrer wins
  const existing = await prisma.referral.findFirst({
    where: { inviteeUserId },
  });

  if (existing) return existing; // Already attributed

  return prisma.referral.create({
    data: {
      referrerUserId: referralCode.userId,
      inviteeUserId,
      referralCodeId: referralCode.id,
      status: "signed_up",
      signedUpAt: new Date(),
    },
  });
}
```

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [Email-Notification-Systems](../Email-Notification-Systems/email-notification-systems.md) | [Growth-Marketing-Channels](../Growth-Marketing-Channels/growth-marketing-channels.md) | [Retention-Engagement](../Retention-Engagement/retention-engagement.md) | [Product-Led-Growth](../Product-Led-Growth/product-led-growth.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
