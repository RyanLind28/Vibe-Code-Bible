# Growth & Marketing Channels
> Pixel integration, server-side conversion APIs, UTM attribution pipelines, social auth as acquisition lever, programmatic landing pages, ROAS tracking, OG/Twitter Card meta tags, and per-channel landing page performance measurement. Every dollar spent on acquisition should be traceable from ad click to revenue — the code must close the loop.

---

## Principles

### 1. Marketing Pixels Are Consent-Gated, Load-Order-Sensitive Code

Marketing pixels — Google Ads gtag, Meta Pixel (fbq), LinkedIn Insight Tag, TikTok Pixel — are third-party JavaScript snippets that fire events back to ad platforms. They exist so that when a user clicks an ad, lands on your site, and eventually converts, the ad platform can attribute that conversion to the specific ad, ad group, and campaign that drove it. Without pixels, your ad platforms have no idea what happens after the click. You are spending money blind.

The technical reality of pixels is messier than the concept. Each pixel is a third-party script that loads additional scripts, sets cookies, and sends network requests to external servers. They add page weight (50-200KB per pixel), increase time-to-interactive, and are the primary target of ad blockers. Loading three or four pixels on every page can add 500ms+ to page load — a measurable hit to conversion rates. This is the fundamental tension: the code you need to measure marketing effectiveness actively harms the user experience that drives conversions.

Load order matters. Pixels must be initialized before you fire events. The standard pattern is: load the pixel script in the document head (or dynamically after consent), call the initialization function with your pixel ID, then fire specific events (page view, purchase, lead) at the appropriate moments. If you fire an event before the pixel initializes, the event is silently lost. If you load the pixel after the page is interactive, you miss the initial page view. In Next.js, the `<Script>` component with `strategy="afterInteractive"` or `strategy="lazyOnload"` gives you control over when each script loads, but you must still sequence initialization and event firing correctly.

Consent is not optional. In GDPR jurisdictions, marketing pixels are categorized as "marketing" cookies and require explicit opt-in before loading. This means you cannot place pixel scripts in your `<head>` unconditionally. You must wait for the user to consent, then dynamically load and initialize the pixels. The consent state should gate pixel loading at the infrastructure level — not scattered across individual components. A pixel manager that reads consent state and conditionally loads scripts is the correct pattern.

### 2. Server-Side Conversion Tracking Survives Ad Blockers

Client-side pixels have a critical weakness: ad blockers. Between 25% and 45% of users (higher in technical and developer audiences) run ad blockers that prevent pixel scripts from loading, pixel cookies from being set, and pixel network requests from reaching ad platform servers. When a user with an ad blocker clicks your Google Ad, converts, and pays you $200/month, Google Ads has no idea the conversion happened. Your reported ROAS is artificially low, your bidding algorithms are under-optimized, and your budget allocation is misinformed.

Server-side conversion APIs solve this by sending conversion data directly from your server to the ad platform's server — no browser involved, no ad blocker to circumvent. Google Ads offers the Google Ads Conversion API (formerly Offline Conversion Import), Meta offers the Conversions API (CAPI), and LinkedIn offers the Conversions API. The pattern is the same: when a conversion event occurs on your backend (signup, purchase, trial start), your server makes an HTTPS POST to the ad platform's API with the conversion details and a user identifier (usually a hashed email or a click ID).

The click ID is the key linking mechanism. When a user clicks a Google Ad, Google appends a `gclid` parameter to the URL. When they click a Meta ad, Meta appends an `fbclid`. Your middleware or landing page must capture these click IDs on arrival and persist them — in a cookie, in the database attached to the user's session, or both. When the user later converts, you send the stored click ID back to the ad platform's server-side API along with the conversion event. The ad platform matches the click ID to the original ad click and attributes the conversion.

The best practice is to run both client-side pixels and server-side APIs simultaneously, with deduplication. The client-side pixel provides real-time conversion data for users without ad blockers. The server-side API fills in the gaps for blocked users and provides a higher-trust signal (server events are harder to fake than browser events). Both Google and Meta support event deduplication via an `event_id` parameter — send the same unique event ID from both client and server, and the platform counts it only once.

### 3. UTM Attribution Connects Ad Spend to User Lifecycle

UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`) are the universal standard for tagging marketing traffic. They answer the question every growth team asks: "Where did this user come from?" But UTM capture is only useful if the data flows through the entire user lifecycle — from first visit to signup to activation to payment to churn. A UTM that is captured on landing and forgotten at signup is worthless. A UTM that is stored on the user record and joined to revenue data in your warehouse is the foundation of all channel performance analysis.

The attribution pipeline has four stages. **Capture**: middleware reads UTM parameters from the URL on the first page load and stores them in a first-party cookie with a 30-day expiration. Also capture click IDs (`gclid`, `fbclid`, `li_fat_id`) at this stage — they are equally important for server-side conversion APIs. **Persist**: when the user signs up, read the attribution cookie and write the values to the user record in your database. This is the permanent connection between the user and their acquisition source. **Enrich**: on the server side, also log the HTTP referrer, the landing page URL, and the signup timestamp. These provide fallback attribution when UTM parameters are absent. **Analyze**: join user records with revenue data to compute cost per acquisition (CPA), lifetime value (LTV) by channel, and return on ad spend (ROAS) per campaign.

The most common failure point is stage two — persisting attribution to the user record. Teams capture UTMs on the landing page, track them in analytics events, but never write them to the database. This means attribution lives only in the analytics tool (PostHog, Mixpanel) and cannot be joined with revenue data in the application database. The fix is simple: add `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid`, and `landing_page` columns to your users table. Populate them at signup from the attribution cookie. This data is permanent, queryable, and joinable with every other table in your database.

First-touch versus last-touch attribution is a modeling decision, not a technical one. First-touch credits the channel that originally introduced the user. Last-touch credits the channel that drove the final conversion. Most early-stage products should use first-touch because it answers the question "which channel is bringing us new users?" — the most actionable question when you are still figuring out channel-market fit. Store both if you can (first-touch in the user record, last-touch in the conversion event), but default to first-touch for reporting.

### 4. Social Auth Is an Acquisition Lever, Not Just a Login Method

Google One Tap, "Sign in with Google," "Sign in with GitHub," and "Continue with Apple" are presented as authentication methods, but they are growth levers. Every field you remove from the signup form increases conversion. A traditional email/password signup requires the user to type an email, create a password, click "Sign Up," open their inbox, find the verification email, and click the confirmation link. Google One Tap requires a single click — the user is authenticated, their email is verified, and their name and profile photo are captured, all in one interaction.

The conversion impact is significant. Companies consistently report 20-40% increases in signup conversion rates when adding Google One Tap alongside traditional signup. The reason is not just fewer fields — it is trust and commitment reduction. Users trust Google's authentication more than they trust a new product's password storage. And clicking a Google button feels less like "creating an account" (commitment) and more like "trying it out" (exploration). This psychological framing matters enormously at the top of the funnel.

From a data perspective, social auth gives you verified information for free. Email addresses from Google sign-in are pre-verified — no confirmation email needed, no bounce risk for marketing emails. You get the user's name without asking for it. You may get their profile photo, which populates the UI and increases engagement. And you know their Google account locale, which informs localization decisions. All of this data would require additional form fields or follow-up prompts with traditional signup.

The growth-relevant implementation detail is placement and timing. Google One Tap should appear automatically on first visit, not buried behind a "Sign In" link. The One Tap prompt appears as an overlay in the top-right corner and can be triggered on any page — not just a dedicated signup page. This means a user reading a blog post, exploring a feature page, or viewing a case study can sign up with a single click without navigating away. The implementation is a script tag plus a configuration object. But the growth impact depends on where and when you trigger it. Trigger it too aggressively and it annoys visitors. Trigger it only on the signup page and you miss the majority of your traffic.

### 5. Programmatic Landing Pages Scale Acquisition

Programmatic landing pages are pages generated from data rather than designed individually. Instead of a designer and copywriter creating one landing page for "project management software," you generate hundreds of pages from a database: "project management software for agencies," "project management software for construction," "project management software for remote teams." Each page targets a specific keyword or audience segment, each has unique content derived from a template plus data, and each has its own URL that can be indexed and linked to.

The technical pattern in Next.js is dynamic routes with `generateStaticParams`. Define a route like `app/solutions/[industry]/page.tsx`. The `generateStaticParams` function queries your database (or a CMS or a JSON file) and returns an array of `{ industry }` objects. Next.js generates a static page for each entry at build time. The template is the same — hero section, feature list, testimonials, CTA — but the data varies per industry. The headline, body copy, customer logos, and testimonials are all pulled from the database for each industry. The result is hundreds of unique, high-performance static pages that load instantly.

The growth value of programmatic pages comes from specificity. A visitor who searches "project management for construction" and lands on a page with a headline "Project Management Built for Construction Teams," testimonials from construction companies, and screenshots showing construction-specific features converts at 2-5x the rate of a generic landing page. The page matches the searcher's intent precisely. This is not SEO (that chapter covers indexing and ranking strategy) — this is conversion architecture. The page exists because it converts better, not just because it ranks.

Programmatic landing pages also enable paid acquisition at scale. Each page becomes a distinct landing page for a Google Ads campaign targeting that specific keyword. Instead of sending all ad traffic to one generic page, you send each ad group to its matching programmatic page. This improves Quality Score (the landing page is relevant to the keyword), which lowers cost-per-click, which improves ROAS. The measurement infrastructure must track conversion rate per landing page per traffic source — this is how you identify which programmatic pages are performing and which need iteration.

### 6. ROAS Tracking Requires End-to-End Data Plumbing

Return on ad spend (ROAS) is the ratio of revenue generated to ad spend: if you spend $1,000 on Google Ads and the users acquired from those ads generate $5,000 in revenue, your ROAS is 5x. This is the single most important metric for paid acquisition because it directly answers: "Is this money well spent?" A channel with 10,000 signups and 1x ROAS is worse than a channel with 500 signups and 8x ROAS — you lose money on volume with the first and print money with the second.

Computing ROAS requires connecting three data sources that typically live in different systems. **Ad spend** lives in the ad platform (Google Ads, Meta Ads Manager, LinkedIn Campaign Manager). **User acquisition source** lives in your application database (the UTM/attribution data stored on the user record). **Revenue** lives in your billing system (Stripe, your subscriptions table). The ROAS calculation joins these: total revenue from users where `utm_source = 'google'` and `utm_campaign = 'brand_q1'`, divided by total spend on that campaign from the Google Ads API. This join is the hard part.

Most teams never close this loop because the data lives in silos. Marketing owns the ad platforms. Engineering owns the database. Finance owns Stripe. Nobody owns the join. The technical solution is a scheduled job (daily or hourly) that pulls spend data from ad platform APIs, pulls revenue data from Stripe or your subscriptions table, joins on campaign identifier, and writes the result to a reporting table. This can be a cron job, a dbt model, or a data pipeline in your warehouse. The key requirement is that campaign naming conventions are consistent — if Google Ads calls the campaign "brand_q1_2026" and your UTM tag says "brand-q1," the join fails silently and your ROAS numbers are wrong.

The second failure mode is attribution window mismatch. Ad platforms attribute conversions within a configurable window (Google defaults to 30 days post-click). Your server-side tracking attributes conversions at the moment they happen. If a user clicks an ad on January 1, signs up on January 15, and pays on February 1, Google counts the conversion if it is within the window but your internal reporting needs to connect the January 1 click to the February 1 payment. Store the original click timestamp alongside the attribution data so your ROAS queries can use any attribution window you choose.

### 7. OG and Twitter Card Meta Tags Drive Social Traffic

When someone shares a link to your product on Twitter, LinkedIn, Slack, Discord, or iMessage, the platform fetches your page's HTML and renders a preview card using Open Graph (OG) and Twitter Card meta tags. A link without OG tags renders as a bare URL — no image, no title, no description. A link with well-configured OG tags renders as a rich card with a compelling image, a clear title, and a descriptive summary. The rich card gets dramatically more clicks. This is not vanity — it is a measurable acquisition channel. Every user share, every team Slack message, every investor deck link is a potential acquisition event, and the OG card determines whether someone clicks through.

The required tags are: `og:title` (the page title, 60 characters max for full display), `og:description` (a summary, 150 characters for most platforms), `og:image` (an image URL, ideally 1200x630 pixels for optimal display across all platforms), `og:url` (the canonical URL), and `og:type` (usually "website"). For Twitter Cards specifically, add `twitter:card` (set to "summary_large_image" for the large preview), `twitter:title`, `twitter:description`, and `twitter:image`. Twitter prefers its own tags but falls back to OG tags if its specific tags are missing.

Dynamic OG images are a high-leverage growth tactic. Instead of a single static OG image for your entire site, generate unique images per page. A blog post shares an OG image with the post title rendered on a branded background. A user's public profile shares an OG image with their name and avatar. A programmatic landing page shares an OG image with the industry name. Next.js supports this natively with the `ImageResponse` API in route handlers — you write JSX that renders to an image at request time. The dynamic image makes every shared link visually unique and contextually relevant, which increases click-through rates.

In Next.js App Router, meta tags are set via the `metadata` export or `generateMetadata` function in page files. Static pages use the `metadata` object. Dynamic pages use `generateMetadata` to compute tags based on route parameters or data. The `generateMetadata` function runs on the server at request time (or build time for static pages), so it can fetch data from your database or CMS. This is the correct place to set OG tags — not in a client-side `useEffect` that manipulates `document.head`, which does not work for social crawlers that do not execute JavaScript.

### 8. Landing Page Performance Tracking Closes the Optimization Loop

Every landing page is an experiment. It has a traffic source (where visitors come from), a conversion action (what you want them to do), and a conversion rate (what percentage actually do it). Landing page performance tracking measures this per page and per traffic source, enabling data-driven decisions about where to invest marketing spend and which pages need optimization.

The core metric is conversion rate segmented by two dimensions: the landing page URL and the traffic source. A `/solutions/agencies` page might convert at 8% from Google Ads but only 2% from LinkedIn Ads. This tells you that the page resonates with Google Ads traffic (likely search intent) but not with LinkedIn traffic (likely display/awareness). The actionable insight: either create a different landing page for LinkedIn traffic or stop spending on LinkedIn for this page. Without per-page, per-source conversion tracking, you are averaging across dimensions and losing the signal.

The implementation requires connecting three data points: the landing page (from the URL path), the traffic source (from UTM parameters or referrer), and the conversion event (from your analytics or database). The simplest approach is a SQL query that joins your page_view events with your signup events on user_id, grouped by landing page and utm_source. But this requires that your page view tracking includes the landing page path and that your attribution cookie persists from landing to conversion. If either link is broken, the data is incomplete.

Beyond raw conversion rate, track time-to-conversion (how long between landing and converting), bounce rate (what percentage leave without any interaction), and scroll depth (how far down the page visitors read before leaving or converting). These secondary metrics diagnose why a page is underperforming. A page with high traffic, low bounce rate, and deep scrolling but low conversion likely has a weak CTA or a friction point in the signup flow. A page with high bounce rate likely has a message mismatch — the ad promised something the page does not deliver. Each pattern points to a different fix.

---

## LLM Instructions

### 1. Integrating Marketing Pixels with Consent Gating

When asked to add marketing pixels (Google Ads, Meta Pixel, LinkedIn Insight Tag) to a Next.js project, always implement them behind a consent layer. Never load pixels unconditionally.

1. Create a pixel manager module (`src/lib/marketing/pixels.ts`) that exports functions for each pixel: `loadGoogleAds(conversionId)`, `loadMetaPixel(pixelId)`, `loadLinkedInInsight(partnerId)`. Each function dynamically injects the pixel's script tag and initializes it. These functions are only called after consent is granted.
2. Each pixel loader should check `typeof window !== "undefined"` before executing. Use `document.createElement("script")` for dynamic injection or Next.js `<Script>` with `strategy="afterInteractive"`. Set a global flag (e.g., `window.__gtagLoaded`) to prevent double-initialization if the function is called multiple times.
3. Create a consent-aware wrapper (`src/lib/marketing/index.ts`) that reads the user's marketing consent state from the consent cookie. When consent is granted, initialize all marketing pixels. When consent is revoked, do not load pixels and clear any pixel-set cookies.
4. For event firing, create typed functions: `trackGoogleConversion(conversionLabel, value?)`, `trackMetaEvent(eventName, params?)`, `trackLinkedInConversion(conversionId)`. Each function checks that the corresponding pixel is loaded before firing. If the pixel is not loaded (consent denied or ad blocked), the function is a silent no-op.
5. In Next.js App Router, create a `MarketingPixels` client component that reads consent state, loads pixels on mount, and re-evaluates when consent changes. Place it in the root layout so pixels are available on every page. Do not load pixel scripts in `<head>` directly — always go through the consent-gated loader.

### 2. Implementing Server-Side Conversion Tracking

When asked to add server-side conversion tracking for Google Ads or Meta, implement API route handlers that send conversion events directly from your server to the ad platform's API.

1. Create API helper modules for each platform: `src/lib/marketing/google-conversions.ts` and `src/lib/marketing/meta-conversions.ts`. Each module exports a function that sends a conversion event to the platform's server-side API.
2. For Google Ads, use the Google Ads API with an OAuth2 service account. The conversion upload requires the `gclid` (Google Click ID captured on landing), conversion action ID, conversion time, and optionally a conversion value. Store `gclid` in the attribution cookie at landing and persist it to the user record at signup.
3. For Meta Conversions API (CAPI), send events to `https://graph.facebook.com/v18.0/{pixel_id}/events` with your access token. Each event requires `event_name`, `event_time`, `action_source` (set to "website"), and `user_data` containing hashed email (`em`), hashed phone (`ph`), or `fbc` (the Facebook Click ID from the `_fbc` cookie) and `fbp` (the Facebook Browser ID from the `_fbp` cookie).
4. Call server-side conversion functions from your backend after business-critical events: signup completion, trial start, purchase, plan upgrade. Pass an `event_id` that matches the client-side pixel event for deduplication. The ad platform will count only one conversion per `event_id` even if both client and server report it.
5. Handle errors gracefully: log failures, implement retry with exponential backoff for transient errors (rate limits, network timeouts), and alert on persistent failures. Server-side conversion data feeds your ad platform's bidding algorithms — if it stops flowing, your ad performance degrades within days.

### 3. Building the UTM Attribution Pipeline

When implementing UTM attribution, build the complete pipeline from URL capture to database persistence to revenue reporting.

1. Create Next.js middleware (`src/middleware.ts`) that reads UTM parameters and click IDs (`gclid`, `fbclid`, `li_fat_id`, `ttclid`) from the URL search params on every request. If any attribution parameters are present, store them in a first-party cookie named `attribution` with a 30-day expiration. Include the landing page path and timestamp in the cookie data.
2. Use a "first-touch" persistence strategy: only set the attribution cookie if one does not already exist. This preserves the original acquisition source. If you need last-touch attribution as well, store it in a separate cookie (`attribution_last`).
3. Add attribution columns to your users table: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid`, `landing_page`, `referrer`, `attributed_at`. Populate these columns when the user signs up by reading the attribution cookie in your signup server action or API route.
4. Create a reusable `getAttributionFromCookies()` utility that reads and parses the attribution cookie. Call this in your signup flow, your conversion tracking, and your analytics event enrichment. One function, used everywhere attribution data is needed.
5. For ROAS reporting, create a SQL view or scheduled query that joins the users table (with attribution data) to the subscriptions/payments table (with revenue data), grouped by `utm_source` and `utm_campaign`. This gives you revenue per channel and per campaign, which you compare to ad spend data pulled from platform APIs.

### 4. Implementing Programmatic Landing Pages

When asked to create landing pages at scale from data, use Next.js dynamic routes with static generation.

1. Define the data source: a database table, CMS collection, or JSON file that contains per-page data. Each entry should have a slug (used in the URL), headline, description, feature highlights, testimonials, and any other per-page content. The schema should be typed with TypeScript.
2. Create a dynamic route: `app/solutions/[slug]/page.tsx`. Implement `generateStaticParams()` to return all slugs from the data source. Implement `generateMetadata()` to return per-page title, description, and OG tags (including a dynamic OG image URL).
3. Build a shared landing page template component that accepts the per-page data as props. The template renders: hero section (headline, subheadline, CTA), feature grid, social proof (logos, testimonials), and a conversion form or CTA. The layout is identical across all pages; only the content varies.
4. Create a dynamic OG image route: `app/solutions/[slug]/opengraph-image.tsx` using Next.js `ImageResponse`. The image renders the page headline and a branded background at 1200x630 pixels. This gives every programmatic page a unique, contextually relevant social sharing image.
5. Add per-page analytics: track `landing_page_viewed` with the slug, traffic source (from attribution cookie), and any experiment variant. Track `landing_page_cta_clicked` when the user clicks the primary CTA. These events feed your per-page conversion rate analysis.

### 5. Setting Up OG and Twitter Card Meta Tags

When implementing social sharing meta tags, use Next.js metadata API for server-rendered tags that social crawlers can parse.

1. For static pages, export a `metadata` object from the page file with `title`, `description`, `openGraph` (containing `title`, `description`, `images`, `url`, `type`), and `twitter` (containing `card`, `title`, `description`, `images`). Set `twitter.card` to `"summary_large_image"` for the large preview format.
2. For dynamic pages, export a `generateMetadata` function that accepts `{ params }` and returns the metadata object. Fetch per-page data inside this function and compute the title, description, and OG image URL dynamically. This function runs on the server, so it can access your database or CMS directly.
3. Create a shared OG image route handler (`app/api/og/route.tsx`) using `ImageResponse` from `next/og`. Accept query parameters (title, subtitle, optional image URL) and render a branded card image at 1200x630. Reference this route in your `openGraph.images` metadata.
4. Set default meta tags in your root `layout.tsx` using the `metadata` export. These defaults apply to any page that does not override them. Include a default OG image, site name, and description. Page-level metadata merges with layout-level metadata, so pages only need to specify what differs.
5. Validate OG tags after deployment using the Facebook Sharing Debugger, Twitter Card Validator, and LinkedIn Post Inspector. These tools show exactly how your link will render on each platform. Cache-bust by appending a query parameter to the URL if you need to force a re-scrape after updating tags.

---

## Examples

### 1. Consent-Gated Marketing Pixel Manager (TypeScript + Next.js)

```typescript
// src/lib/marketing/pixels.ts
// Consent-gated pixel loading — never loads scripts without explicit consent

type PixelStatus = "not_loaded" | "loading" | "loaded" | "blocked";

const pixelState: Record<string, PixelStatus> = {
  gtag: "not_loaded",
  fbq: "not_loaded",
  lintrk: "not_loaded",
};

function injectScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${id}`));
    document.head.appendChild(script);
  });
}

// --- Google Ads (gtag.js) ---

export async function loadGoogleAds(conversionId: string) {
  if (typeof window === "undefined") return;
  if (pixelState.gtag !== "not_loaded") return;
  pixelState.gtag = "loading";

  // Initialize the dataLayer and gtag function before the script loads
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", conversionId, { send_page_view: false });

  try {
    await injectScript(
      `https://www.googletagmanager.com/gtag/js?id=${conversionId}`,
      "gtag-script"
    );
    pixelState.gtag = "loaded";
  } catch {
    pixelState.gtag = "blocked";
  }
}

export function trackGoogleConversion(
  conversionLabel: string,
  value?: number,
  currency: string = "USD"
) {
  if (pixelState.gtag !== "loaded" || !window.gtag) return;
  window.gtag("event", "conversion", {
    send_to: conversionLabel,
    ...(value !== undefined && { value, currency }),
  });
}

// --- Meta Pixel (fbq) ---

export async function loadMetaPixel(pixelId: string) {
  if (typeof window === "undefined") return;
  if (pixelState.fbq !== "not_loaded") return;
  pixelState.fbq = "loading";

  // Initialize fbq inline (Meta's standard pattern)
  const n: any = (window.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];

  try {
    await injectScript(
      "https://connect.facebook.net/en_US/fbevents.js",
      "fb-pixel-script"
    );
    window.fbq("init", pixelId);
    pixelState.fbq = "loaded";
  } catch {
    pixelState.fbq = "blocked";
  }
}

export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
) {
  if (pixelState.fbq !== "loaded" || !window.fbq) return;
  const options = eventId ? { eventID: eventId } : undefined;
  window.fbq("track", eventName, params, options);
}

// --- LinkedIn Insight Tag ---
// Same pattern as above: check pixelState, inject script, track with guard.
// loadLinkedInInsight(partnerId) → injects snap.licdn.com/li.lms-analytics/insight.min.js
// trackLinkedInConversion(conversionId) → window.lintrk("track", { conversion_id })

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    _linkedin_data_partner_ids?: string[];
    lintrk?: (...args: any[]) => void;
  }
}

// src/lib/marketing/index.ts — Consent-aware pixel orchestrator
import { hasConsent } from "@/lib/analytics/consent";
import { loadGoogleAds, loadMetaPixel } from "./pixels";

export async function initMarketingPixels() {
  if (!hasConsent("marketing")) return;
  await Promise.allSettled([
    loadGoogleAds(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID!),
    loadMetaPixel(process.env.NEXT_PUBLIC_META_PIXEL_ID!),
    // loadLinkedInInsight(process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID!),
  ]);
}

// src/components/marketing-pixels.tsx — place in root layout
"use client";
import { useEffect } from "react";
import { initMarketingPixels } from "@/lib/marketing";

export function MarketingPixels() {
  useEffect(() => {
    initMarketingPixels();
    const handler = () => initMarketingPixels();
    window.addEventListener("consent_changed", handler);
    return () => window.removeEventListener("consent_changed", handler);
  }, []);
  return null;
}
```

### 2. Server-Side Meta Conversions API + Google Ads Conversion Upload (TypeScript)

```typescript
// src/lib/marketing/meta-conversions.ts
// Server-side Meta Conversions API (CAPI) — ad-blocker resilient

import crypto from "crypto";

const META_PIXEL_ID = process.env.META_PIXEL_ID!;
const META_ACCESS_TOKEN = process.env.META_CONVERSIONS_ACCESS_TOKEN!;
const META_API_VERSION = "v21.0";

interface MetaUserData {
  email?: string; phone?: string;
  fbc?: string;   // _fbc cookie (click ID)
  fbp?: string;   // _fbp cookie (browser ID)
  clientIpAddress?: string; clientUserAgent?: string;
}

interface MetaConversionEvent {
  eventName: string; eventId: string; // eventId must match client-side for dedup
  eventTime?: number; userData: MetaUserData;
  customData?: Record<string, unknown>; eventSourceUrl?: string;
}

function hashSHA256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export async function sendMetaConversion(event: MetaConversionEvent) {
  const eventTime = event.eventTime ?? Math.floor(Date.now() / 1000);

  const userData: Record<string, string> = {};
  if (event.userData.email) userData.em = hashSHA256(event.userData.email);
  if (event.userData.phone) userData.ph = hashSHA256(event.userData.phone);
  if (event.userData.fbc) userData.fbc = event.userData.fbc;
  if (event.userData.fbp) userData.fbp = event.userData.fbp;
  if (event.userData.clientIpAddress)
    userData.client_ip_address = event.userData.clientIpAddress;
  if (event.userData.clientUserAgent)
    userData.client_user_agent = event.userData.clientUserAgent;

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: eventTime,
        event_id: event.eventId,
        action_source: "website",
        event_source_url: event.eventSourceUrl,
        user_data: userData,
        custom_data: event.customData,
      },
    ],
    access_token: META_ACCESS_TOKEN,
  };

  const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Meta CAPI] Conversion failed:", error);
    throw new Error(`Meta CAPI error: ${response.status}`);
  }

  return response.json();
}

// src/lib/marketing/google-conversions.ts
// Server-side Google Ads conversion upload via Measurement Protocol

const GA_MEASUREMENT_ID = process.env.GOOGLE_MEASUREMENT_ID!;
const GA_API_SECRET = process.env.GOOGLE_MEASUREMENT_API_SECRET!;

interface GoogleConversionEvent {
  clientId: string; eventName: string; gclid?: string;
  conversionValue?: number; currency?: string; transactionId?: string;
}

export async function sendGoogleConversion(event: GoogleConversionEvent) {
  const url = new URL(
    "https://www.google-analytics.com/mp/collect"
  );
  url.searchParams.set("measurement_id", GA_MEASUREMENT_ID);
  url.searchParams.set("api_secret", GA_API_SECRET);

  const payload = {
    client_id: event.clientId,
    events: [
      {
        name: event.eventName,
        params: {
          ...(event.gclid && { gclid: event.gclid }),
          ...(event.conversionValue !== undefined && {
            value: event.conversionValue,
            currency: event.currency ?? "USD",
          }),
          ...(event.transactionId && {
            transaction_id: event.transactionId,
          }),
        },
      },
    ],
  };

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("[Google MP] Conversion failed:", response.status);
    throw new Error(`Google Measurement Protocol error: ${response.status}`);
  }
}

// src/app/actions/purchase.ts — fires deduped server-side conversions
"use server";

import { nanoid } from "nanoid";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { sendMetaConversion } from "@/lib/marketing/meta-conversions";
import { sendGoogleConversion } from "@/lib/marketing/google-conversions";

export async function completePurchase(planId: string) {
  const user = await getCurrentUser();
  const plan = await db.plan.findUniqueOrThrow({ where: { id: planId } });
  const subscription = await db.subscription.create({
    data: { userId: user.id, planId, status: "active" },
  });

  // Shared event ID for client+server deduplication
  const eventId = nanoid();

  const cookieStore = await cookies();
  const headersList = await headers();
  const attribution = JSON.parse(cookieStore.get("attribution")?.value ?? "{}");

  // Fire both platform conversions in parallel
  await Promise.allSettled([
    sendMetaConversion({
      eventName: "Purchase",
      eventId,
      userData: {
        email: user.email,
        fbc: cookieStore.get("_fbc")?.value,
        fbp: cookieStore.get("_fbp")?.value,
        clientIpAddress: headersList.get("x-forwarded-for") ?? undefined,
        clientUserAgent: headersList.get("user-agent") ?? undefined,
      },
      customData: { value: plan.priceInCents / 100, currency: "USD" },
      eventSourceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
    }),
    sendGoogleConversion({
      clientId: cookieStore.get("_ga")?.value?.split(".").slice(2).join(".") ?? "",
      eventName: "purchase",
      gclid: attribution.gclid,
      conversionValue: plan.priceInCents / 100,
      transactionId: eventId,
    }),
  ]);

  return { success: true, eventId, subscriptionId: subscription.id };
}
```

### 3. Programmatic Landing Pages with Dynamic OG Images (Next.js App Router)

```typescript
// Database schema (Prisma)
// model Solution {
//   id           String   @id @default(cuid())
//   slug         String   @unique
//   industry     String
//   headline     String
//   subheadline  String
//   description  String   @db.Text
//   features     Json     // string[]
//   testimonials Json     // { name: string; company: string; quote: string }[]
//   logoUrls     Json     // string[]
//   ctaText      String   @default("Start Free Trial")
//   createdAt    DateTime @default(now())
//   updatedAt    DateTime @updatedAt
// }

// app/solutions/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LandingPageTemplate } from "@/components/landing-page-template";
import { LandingPageTracker } from "@/components/landing-page-tracker";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const solutions = await db.solution.findMany({
    select: { slug: true },
  });
  return solutions.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = await db.solution.findUnique({ where: { slug } });
  if (!solution) return {};

  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/solutions/${slug}/opengraph-image`;

  return {
    title: `${solution.headline} | YourProduct`,
    description: solution.description.slice(0, 155),
    openGraph: {
      title: solution.headline,
      description: solution.subheadline,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/solutions/${slug}`,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: solution.headline,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: solution.headline,
      description: solution.subheadline,
      images: [ogImageUrl],
    },
  };
}

export default async function SolutionPage({ params }: PageProps) {
  const { slug } = await params;
  const solution = await db.solution.findUnique({ where: { slug } });
  if (!solution) notFound();

  return (
    <LandingPageTracker slug={slug}>
      <LandingPageTemplate
        headline={solution.headline}
        subheadline={solution.subheadline}
        description={solution.description}
        features={solution.features as string[]}
        testimonials={
          solution.testimonials as {
            name: string;
            company: string;
            quote: string;
          }[]
        }
        logoUrls={solution.logoUrls as string[]}
        ctaText={solution.ctaText}
        ctaHref="/signup"
      />
    </LandingPageTracker>
  );
}

// app/solutions/[slug]/opengraph-image.tsx
// Dynamic OG image generation — unique image per programmatic page

import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "edge";
export const alt = "Solution page preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = await db.solution.findUnique({
    where: { slug },
    select: { headline: true, subheadline: true, industry: true },
  });

  if (!solution) {
    return new ImageResponse(
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: "100%", background: "#0f172a", color: "white", fontSize: 48 }}>
        YourProduct
      </div>,
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 24, color: "#60a5fa", marginBottom: 16 }}>
          YourProduct for {solution.industry}
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          {solution.headline}
        </div>
        <div style={{ fontSize: 24, color: "#94a3b8" }}>
          {solution.subheadline}
        </div>
      </div>
    ),
    { ...size }
  );
}

// src/components/landing-page-tracker.tsx — fires once per page view
"use client";
import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";
import { getAttribution } from "@/lib/analytics/attribution";

export function LandingPageTracker({ slug, children }: { slug: string; children: React.ReactNode }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const attr = getAttribution();
    analytics.track("landing_page_viewed", {
      slug, source: attr.utm_source ?? "direct",
      medium: attr.utm_medium ?? "none", campaign: attr.utm_campaign ?? "none",
    });
  }, [slug]);
  return <>{children}</>;
}
```

### 4. UTM Attribution Pipeline: Middleware to Database to ROAS Query

```typescript
// src/middleware.ts
// Captures UTMs, click IDs, and referrer on every request

import { NextRequest, NextResponse } from "next/server";

const ATTRIBUTION_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "li_fat_id", "ttclid", "ref", "via",
] as const;

const ATTRIBUTION_COOKIE = "attribution";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const response = NextResponse.next();

  // Only set attribution if no existing cookie (first-touch)
  const existingAttribution = request.cookies.get(ATTRIBUTION_COOKIE);
  if (existingAttribution) return response;

  const attribution: Record<string, string> = {};
  for (const param of ATTRIBUTION_PARAMS) {
    const value = url.searchParams.get(param);
    if (value) attribution[param] = value;
  }

  if (Object.keys(attribution).length > 0) {
    attribution.landing_page = url.pathname;
    attribution.timestamp = new Date().toISOString();

    // Capture referrer from header
    const referer = request.headers.get("referer");
    if (referer) attribution.referrer = referer;

    response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(attribution), {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};

// src/lib/marketing/attribution.ts — Client-side attribution reader
import Cookies from "js-cookie";

export interface Attribution {
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
  utm_term?: string; utm_content?: string; gclid?: string;
  fbclid?: string; li_fat_id?: string; ttclid?: string;
  ref?: string; via?: string; landing_page?: string;
  referrer?: string; timestamp?: string;
}

export function getAttribution(): Attribution {
  try { return JSON.parse(Cookies.get("attribution") ?? "{}"); }
  catch { return {}; }
}

// src/app/actions/signup.ts — Persists attribution to user record at signup
"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { trackServerEvent, identifyUser } from "@/lib/analytics/server";
import { nanoid } from "nanoid";

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const user = await db.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });

  // Read and persist attribution — the critical step
  const cookieStore = await cookies();
  const attributionRaw = cookieStore.get("attribution")?.value;
  const attribution = attributionRaw ? JSON.parse(attributionRaw) : {};

  await db.user.update({
    where: { id: user.id },
    data: {
      utmSource: attribution.utm_source ?? null,
      utmMedium: attribution.utm_medium ?? null,
      utmCampaign: attribution.utm_campaign ?? null,
      utmTerm: attribution.utm_term ?? null,
      utmContent: attribution.utm_content ?? null,
      gclid: attribution.gclid ?? null,
      fbclid: attribution.fbclid ?? null,
      landingPage: attribution.landing_page ?? null,
      referrer: attribution.referrer ?? null,
      attributedAt: attribution.timestamp
        ? new Date(attribution.timestamp)
        : new Date(),
    },
  });

  const eventId = nanoid();
  trackServerEvent(user.id, "signup_completed", {
    method: "email",
    ...attribution,
    event_id: eventId,
  });

  identifyUser(user.id, {
    email: user.email,
    utm_source: attribution.utm_source,
    utm_campaign: attribution.utm_campaign,
  });

  // Server-side Meta conversion (see Example 2 for sendMetaConversion)
  // sendMetaConversion({ eventName: "Lead", eventId, userData: { ... } })

  return { success: true, userId: user.id };
}
```

```sql
-- ROAS query: revenue per channel per campaign (last 90 days)
-- Joins user attribution with subscription revenue data

WITH user_revenue AS (
  SELECT
    u.id AS user_id,
    u.utm_source,
    u.utm_medium,
    u.utm_campaign,
    u.gclid,
    u.created_at AS signup_date,
    COALESCE(SUM(p.amount_cents), 0) AS total_revenue_cents
  FROM users u
  LEFT JOIN payments p ON u.id = p.user_id
    AND p.status = 'succeeded'
    AND p.created_at >= NOW() - INTERVAL '90 days'
  WHERE u.created_at >= NOW() - INTERVAL '90 days'
  GROUP BY u.id, u.utm_source, u.utm_medium, u.utm_campaign,
           u.gclid, u.created_at
)
SELECT
  COALESCE(utm_source, 'direct') AS channel,
  COALESCE(utm_medium, 'none') AS medium,
  COALESCE(utm_campaign, 'none') AS campaign,
  COUNT(DISTINCT user_id) AS signups,
  COUNT(DISTINCT CASE WHEN total_revenue_cents > 0 THEN user_id END)
    AS paying_users,
  ROUND(
    COUNT(DISTINCT CASE WHEN total_revenue_cents > 0 THEN user_id END)::numeric
    / NULLIF(COUNT(DISTINCT user_id), 0) * 100, 1
  ) AS conversion_to_paid_pct,
  SUM(total_revenue_cents) / 100.0 AS total_revenue_usd,
  ROUND(
    SUM(total_revenue_cents)::numeric
    / NULLIF(COUNT(DISTINCT user_id), 0) / 100.0, 2
  ) AS revenue_per_signup_usd
FROM user_revenue
GROUP BY utm_source, utm_medium, utm_campaign
ORDER BY total_revenue_usd DESC;

-- Landing page conversion rate by traffic source (last 30 days)
-- Join landing_page_viewed events → signup_completed, grouped by slug + source
WITH landings AS (
  SELECT user_id, properties->>'slug' AS slug,
    properties->>'source' AS source, MIN(timestamp) AS landed_at
  FROM events WHERE event_name = 'landing_page_viewed'
    AND timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY user_id, properties->>'slug', properties->>'source'
),
conversions AS (
  SELECT DISTINCT user_id, MIN(timestamp) AS converted_at
  FROM events WHERE event_name = 'signup_completed'
    AND timestamp >= NOW() - INTERVAL '30 days' GROUP BY user_id
)
SELECT l.slug, l.source,
  COUNT(DISTINCT l.user_id) AS visitors,
  COUNT(DISTINCT c.user_id) AS signups,
  ROUND(COUNT(DISTINCT c.user_id)::numeric
    / NULLIF(COUNT(DISTINCT l.user_id), 0) * 100, 2) AS conversion_rate_pct
FROM landings l
LEFT JOIN conversions c ON l.user_id = c.user_id AND c.converted_at > l.landed_at
GROUP BY l.slug, l.source
HAVING COUNT(DISTINCT l.user_id) >= 50
ORDER BY conversion_rate_pct DESC;
```

### 5. Google One Tap Social Auth as Growth Lever (Next.js)

```typescript
// src/components/google-one-tap.tsx
// Google One Tap — appears automatically on pages to capture signups
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { analytics } from "@/lib/analytics";

interface GoogleOneTapProps {
  clientId: string;
  onSuccess?: (userId: string) => void;
}

export function GoogleOneTap({ clientId, onSuccess }: GoogleOneTapProps) {
  const initialized = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load the Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,         // don't auto-sign-in returning users
        cancel_on_tap_outside: true,
        context: "signup",
        itp_support: true,
      });

      // Display the One Tap prompt
      window.google?.accounts.id.prompt((notification) => {
        if (notification.isDisplayed()) {
          analytics.track("google_one_tap_displayed", {
            source: window.location.pathname,
          });
        }
        if (notification.isSkippedMoment()) {
          analytics.track("google_one_tap_skipped", {
            reason: notification.getSkippedReason(),
            source: window.location.pathname,
          });
        }
      });
    };
    document.head.appendChild(script);

    return () => {
      window.google?.accounts.id.cancel();
    };
  }, [clientId]);

  async function handleCredentialResponse(response: { credential: string }) {
    analytics.track("google_one_tap_clicked", {
      source: window.location.pathname,
    });

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (!res.ok) throw new Error("Authentication failed");

      const data = await res.json();

      analytics.track("signup_completed", { method: "google" });
      analytics.identify(data.userId, {
        email: data.email,
        name: data.name,
        signup_method: "google_one_tap",
      });

      onSuccess?.(data.userId);
      router.push("/onboarding");
    } catch (error) {
      console.error("Google One Tap auth failed:", error);
    }
  }

  return null; // One Tap renders its own UI overlay
}

// src/app/api/auth/google/route.ts
// API route that verifies the Google JWT, finds or creates the user,
// persists attribution data, and creates a session.
// See the Security chapter for full auth implementation details.
// Key growth points:
//   - emailVerified: true (Google emails are pre-verified — no confirmation flow)
//   - Read attribution cookie and persist to user record (same as email signup)
//   - trackServerEvent("signup_completed", { method: "google", ...attribution })
//   - identifyUser(user.id, { signup_method: "google_one_tap" })

// Usage: place <GoogleOneTap clientId={...} /> in your marketing layout
// Shows One Tap on all marketing pages (blog, pricing, features, etc.)
```

---

## Common Mistakes

### 1. Loading Marketing Pixels Without Consent

**Wrong:** Unconditionally loading pixel scripts in the document head or root layout. This fires tracking before the user consents, violating GDPR and exposing your company to fines.

```typescript
// WRONG: loads pixels for everyone in layout.tsx, no consent check
<Script src="https://www.googletagmanager.com/gtag/js?id=AW-123456" strategy="afterInteractive" />
<Script id="fb-pixel" strategy="afterInteractive">
  {`fbq('init', '123456789'); fbq('track', 'PageView');`}
</Script>
```

**Fix:** Gate all pixel loading behind your consent manager. Only initialize after the user explicitly opts in. Use the `MarketingPixels` component from Example 1 which checks `hasConsent("marketing")` before calling `initMarketingPixels()`.

### 2. Not Capturing Click IDs (gclid/fbclid) for Server-Side Tracking

**Wrong:** Capturing UTM parameters but ignoring platform-specific click IDs. Without `gclid` and `fbclid`, your server-side conversion APIs cannot attribute conversions back to specific ad clicks.

```typescript
// Only captures UTMs — misses the critical click IDs
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign"];
for (const param of UTM_PARAMS) {
  const value = url.searchParams.get(param);
  if (value) attribution[param] = value;
}
```

**Fix:** Capture all attribution parameters including platform click IDs. These are essential for server-side conversion APIs to match conversions to ad clicks.

```typescript
const ATTRIBUTION_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid",    // Google Ads click ID
  "fbclid",   // Meta click ID
  "li_fat_id", // LinkedIn click ID
  "ttclid",   // TikTok click ID
  "ref", "via",
] as const;

for (const param of ATTRIBUTION_PARAMS) {
  const value = url.searchParams.get(param);
  if (value) attribution[param] = value;
}
```

### 3. Firing Pixel Events Before Pixel Initialization

**Wrong:** Calling `fbq("track", "Purchase")` or `gtag("event", "conversion")` before the pixel script has loaded and initialized. The function does not exist yet, so the event is silently lost — or it throws an error that breaks the page.

```typescript
// Called immediately — but the pixel script hasn't loaded yet
function handlePurchase() {
  window.fbq("track", "Purchase", { value: 49.99, currency: "USD" });
  // TypeError: window.fbq is not a function
}
```

**Fix:** Check that the pixel function exists before calling it. Use the pixel manager's typed functions that include guard checks.

```typescript
import { trackMetaEvent } from "@/lib/marketing/pixels";

function handlePurchase(eventId: string) {
  // trackMetaEvent checks pixelState internally — safe to call anytime
  trackMetaEvent("Purchase", { value: 49.99, currency: "USD" }, eventId);
}
```

### 4. Losing Attribution on Single-Page Navigation

**Wrong:** Reading UTM parameters only on the landing page using `window.location.search` in a component's `useEffect`. When the user navigates to `/pricing` via client-side routing, the UTMs are gone from the URL and the component on `/pricing` cannot read them.

```typescript
// This only works on the exact landing URL — lost after navigation
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source"); // null after navigation
}, []);
```

**Fix:** Capture UTM parameters in Next.js middleware on the initial server request and persist them in a cookie. Read from the cookie everywhere else — it survives navigation, page reloads, and even multi-day return visits.

```typescript
// Middleware captures once → cookie persists across all navigation
// Components read from cookie, not from URL
import { getAttribution } from "@/lib/marketing/attribution";

function SignupForm() {
  const handleSubmit = () => {
    const attribution = getAttribution(); // reads from cookie
    analytics.track("signup_started", { source: attribution.utm_source });
  };
}
```

### 5. Not Deduplicating Client + Server Conversion Events

**Wrong:** Sending conversion events from both the client-side pixel and the server-side API without a shared `event_id`. The ad platform counts the conversion twice, inflating your reported conversions and corrupting your bidding algorithms.

```typescript
// Client fires one event...
fbq("track", "Purchase", { value: 49.99 });

// Server fires another — platform counts it as TWO purchases
await sendMetaConversion({
  eventName: "Purchase",
  eventId: nanoid(), // different ID = no dedup
  userData: { email: user.email },
  customData: { value: 49.99 },
});
```

**Fix:** Generate a single `event_id` and pass it to both client and server events. The ad platform deduplicates on this ID.

```typescript
// Generate one event_id shared between client and server
const eventId = nanoid();

// Client-side: pass eventID option
trackMetaEvent("Purchase", { value: 49.99, currency: "USD" }, eventId);

// Server-side: same eventId
await sendMetaConversion({
  eventName: "Purchase",
  eventId,  // same ID → platform deduplicates
  userData: { email: user.email },
  customData: { value: 49.99, currency: "USD" },
});
```

### 6. Setting OG Meta Tags in Client-Side JavaScript

**Wrong:** Setting Open Graph tags dynamically with `document.head` manipulation in a `useEffect`. Social platform crawlers (Facebook, Twitter, LinkedIn) do not execute JavaScript — they parse the initial HTML. Client-side meta tags are invisible to crawlers, so shared links render without title, description, or image.

```typescript
// Social crawlers never see these tags — they don't run JavaScript
useEffect(() => {
  const meta = document.createElement("meta");
  meta.setAttribute("property", "og:title");
  meta.setAttribute("content", product.name);
  document.head.appendChild(meta);
}, [product]);
```

**Fix:** Use Next.js `generateMetadata` to set OG tags on the server. The tags are included in the initial HTML response that crawlers parse.

```typescript
// app/products/[id]/page.tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  return {
    openGraph: {
      title: product?.name,
      description: product?.description,
      images: [{ url: `/api/og?title=${encodeURIComponent(product?.name ?? "")}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: product?.name,
      description: product?.description,
    },
  };
}
```

### 7. Not Persisting Attribution to the User Database Record

**Wrong:** Capturing UTM parameters in analytics events but never writing them to the users table. Attribution data lives only in PostHog or Mixpanel, so it cannot be joined with revenue data in your application database. ROAS calculations become impossible without manual CSV exports and spreadsheet joins.

```typescript
// Tracked in analytics but never saved to the database
trackServerEvent(user.id, "signup_completed", {
  method: "email",
  utm_source: attribution.utm_source, // only in PostHog, not in your DB
});
```

**Fix:** Write attribution columns to the user record at signup. This makes attribution data joinable with every other table — subscriptions, payments, feature usage.

```typescript
await db.user.update({
  where: { id: user.id },
  data: {
    utmSource: attribution.utm_source ?? null,
    utmMedium: attribution.utm_medium ?? null,
    utmCampaign: attribution.utm_campaign ?? null,
    gclid: attribution.gclid ?? null,
    landingPage: attribution.landing_page ?? null,
  },
});
// Now: SELECT utm_source, SUM(revenue) FROM users JOIN payments ... GROUP BY utm_source
```

### 8. Mismatched Campaign Names Between Ad Platform and UTM Tags

**Wrong:** Naming a Google Ads campaign "Brand - Q1 2026" in the platform but tagging the URL with `utm_campaign=brand_q1`. When you try to join ad spend with revenue by campaign name, nothing matches. Your ROAS calculations silently return zero for every campaign.

**Fix:** Establish a campaign naming convention that is used identically in the ad platform and in UTM tags. Use lowercase, underscores, no spaces: `brand_q1_2026`. Document the convention and enforce it in your UTM builder. Periodically audit by querying `SELECT DISTINCT utm_campaign FROM users` and comparing against your ad platform campaign list.

### 9. Using a Generic Landing Page for All Ad Traffic

**Wrong:** Running 20 different ad groups targeting 20 different keywords, all pointing to the same homepage. The user searches "project management for agencies," clicks your ad, and lands on a generic page about "project management for everyone." Message mismatch kills conversion rate and tanks your Quality Score, raising your CPC.

**Fix:** Create programmatic landing pages that match ad group intent. Each ad group points to a landing page with a headline, testimonials, and features relevant to that specific keyword or audience. Use `generateStaticParams` in Next.js to generate pages from a data source. Track conversion rate per landing page per traffic source to identify which pages are performing.

### 10. Running Only Client-Side Pixels Without Server-Side Backup

**Wrong:** Relying exclusively on browser-based pixel tracking for conversion data. For technical audiences with 30-40% ad blocker usage, you are losing a third of your conversion data. Your ad platform's bidding algorithm optimizes on incomplete data, your reported ROAS is artificially low, and your budget allocation is misinformed.

**Fix:** Implement server-side conversion APIs (Meta CAPI, Google Measurement Protocol) alongside client-side pixels. Use a shared `event_id` for deduplication (see Example 2 and Common Mistake 5). Server-side events are immune to ad blockers and provide a higher-trust signal to ad platforms. Run both in parallel — client for real-time, server for completeness.

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [Conversion-Optimization](../Conversion-Optimization/conversion-optimization.md) | [Referral-Viral-Loops](../Referral-Viral-Loops/referral-viral-loops.md) | [Product-Led-Growth](../Product-Led-Growth/product-led-growth.md) | [Experimentation](../Experimentation/experimentation.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
