# Live Chat & Support
> Widget integration, chatbot automation, knowledge base deflection, user identification, and real-time support tooling for Next.js applications. Live chat is the fastest feedback loop between your users and your team — but only if you load it without tanking performance and configure it so the right conversations reach the right people.

---

## When to Use What

| Feature | Tawk.to | Crisp | Intercom |
|---|---|---|---|
| **Pricing** | Free forever (paid add-ons for white-label, video chat, hire agents) | Free tier + Pro at $25/mo per workspace, Unlimited at $95/mo | Starter at $39/seat/mo, Pro and Premium significantly higher |
| **Free tier** | Full platform free, unlimited agents, unlimited chat history | Free for 2 seats with basic chat, contact form, and mobile apps | 14-day trial only, no permanent free tier |
| **Live chat widget** | Yes, highly customizable (colors, position, attention grabbers, pre-chat forms) | Yes, customizable with color, position, locale, and availability schedules | Yes, customizable messenger with launcher styles and home screen cards |
| **Chatbot / AI** | Basic auto-triggers and canned responses, no visual bot builder | Visual chatbot scenario builder with conditional logic, AI assist via plugin | Fin AI agent (GPT-powered resolution bot), custom bot builder with branching logic |
| **Knowledge base** | Basic knowledge base included | Built-in help center with article editor, categories, and search | Full help center with collections, articles, search, and Fin AI integration |
| **CRM** | Built-in CRM with contacts, segments, and custom properties | Built-in CRM with contacts, companies, segments, and data enrichment | Full CRM with companies, contacts, custom attributes, and lifecycle tracking |
| **Product tours** | No | No native product tours | Yes, visual product tour builder with step targeting and conditional display |
| **API / SDK** | REST API v1, JavaScript API for widget control, webhooks | REST API, crisp-sdk-web npm package, webhooks, plugin marketplace | REST API, @intercom/messenger-js-sdk npm package, webhooks, Canvas Kit for custom apps |
| **Best for** | Bootstrapped startups, side projects, MVPs, and teams that need live chat without a budget | Growing SaaS with 1-50 employees who need chat plus CRM plus automation in one tool | Funded startups and enterprises who need a unified customer communication platform with AI resolution |

**Opinionated recommendation:** Start with Tawk.to when you have zero budget and need live chat tomorrow. Move to Crisp when you need chatbot automation, a knowledge base, and CRM without enterprise pricing. Graduate to Intercom when you have funding, need AI-powered ticket resolution, product tours, and your support volume justifies the per-seat cost.

---

## Principles

### 1. Add Live Chat at the Right Product Stage

Live chat is not a day-one feature for every product. If you have no users, a chat widget is a monument to nobody. If you have 10 users, a feedback email works better than a widget they will never click. Live chat becomes valuable at two inflection points: when you have enough traffic that users encounter problems you cannot anticipate, and when conversion rate on your pricing page matters enough that real-time intervention pays for itself.

For pre-launch and early MVP (under 100 users), use a simple feedback form or email link. For post-launch with growing traffic (100-1000 users), add Tawk.to — it is free, takes 10 minutes to install, and gives you real-time visibility into who is on your site. For scaling SaaS (1000+ users), invest in Crisp or Intercom to automate repetitive questions and identify high-value conversations. Do not install Intercom at $39/seat/month when you have 3 customers. That money is better spent on literally anything else.

The decision to add live chat should also be driven by support ticket patterns. If more than 40% of your support emails contain questions answered in your documentation, you need a knowledge base with chat deflection, not more human agents. Track your deflection rate: the percentage of support conversations that are resolved without human intervention.

### 2. Lazy-Load the Widget to Protect Performance

Every live chat widget ships a JavaScript bundle. Tawk.to loads approximately 200KB. Crisp loads approximately 180KB. Intercom loads approximately 250KB with the full messenger. Loading these synchronously in your layout blocks rendering and destroys your Core Web Vitals. A chat widget that adds 800ms to your Largest Contentful Paint is costing you conversions, not saving them.

The non-negotiable rule: never load a chat widget in your initial bundle. Always lazy-load it after the page is interactive. The implementation patterns vary by tool (covered in LLM Instructions), but the principle is universal. Use `next/dynamic` with `ssr: false`, or load the script inside a `useEffect` with a delay or an Intersection Observer trigger. Some teams load the widget only after a user scrolls, after 5 seconds of idle time, or when the user hovers near the bottom of the page.

Measure the impact. Before adding the widget, record your Lighthouse performance score and LCP. After adding it with lazy loading, verify the degradation is under 50ms LCP impact. If it exceeds that, you are loading too early or too synchronously. The widget should be invisible to performance benchmarks on initial page load.

For pages where chat is critical (pricing, checkout), consider preloading the script with `<link rel="preload">` or `<link rel="modulepreload">` to warm the cache without executing. For pages where chat is unnecessary (blog posts, documentation), do not load the widget at all. Route-based conditional loading is free performance.

### 3. Pass User Identity and Context to Every Conversation

The single most impactful configuration for any chat tool is user identification. When a logged-in user opens chat, the support agent should immediately see their name, email, plan, account creation date, and any relevant metadata. Without this, every conversation starts with "What is your email?" and "What plan are you on?" which wastes time for both parties and frustrates users who expect you to know who they are.

All three tools support identity passing. Tawk.to uses the Visitor API (`Tawk_API.visitor`). Crisp uses `$crisp.push(["set", "user:email", [email]])`. Intercom uses the `boot` or `update` method with user attributes. The pattern is the same: when the user authenticates, push their identity to the chat widget. When they log out, reset the widget to anonymous mode.

Pass context beyond identity. Include the current page URL, the user's subscription plan, their account age, their last 3 actions, and any error state they may be experiencing. When a user opens chat from an error page, automatically include the error message in the conversation metadata. This context turns a 5-minute diagnostic conversation into a 30-second resolution.

For security: Intercom supports identity verification via HMAC, Crisp supports token-based verification, and Tawk.to supports a secure mode hash. Always enable identity verification in production to prevent users from impersonating other users by passing a different email to the widget.

### 4. Design the Chatbot-to-Human Handoff Deliberately

Chatbots are deflection tools, not replacement tools. The goal of a chatbot is to answer repetitive questions (password resets, pricing inquiries, feature availability) so humans can focus on complex, high-value conversations (enterprise sales, technical debugging, escalated complaints). The chatbot is the first responder. The human is the specialist.

The handoff trigger matters enormously. A chatbot that says "I cannot help with that, let me connect you to a human" after two messages is a good experience. A chatbot that loops through 8 clarifying questions before admitting defeat is infuriating. Design your chatbot flows with explicit escape hatches: a "Talk to a human" button visible at every step, sentiment detection that escalates frustrated users automatically, and a maximum interaction depth (3-4 exchanges) after which the bot offers human handoff unconditionally.

Configure handoff to preserve context. When a conversation transfers from bot to human, the agent must see the full bot conversation, the user's identity, and any data the bot collected (issue category, order number, error message). Crisp and Intercom both support conversation continuity during handoff. Tawk.to requires manual context passing through the REST API.

Set expectations about response time. If no agents are online, do not show "Chat with us" and then display "No agents available" after the user types a message. Instead, show "Leave a message" or hide the widget entirely when offline. Tawk.to, Crisp, and Intercom all support online/offline modes with different widget states.

### 5. Use Knowledge Base Articles as the Primary Deflection Layer

Before investing in chatbot flows, build a knowledge base. A well-written set of 20-30 help articles covering your most common questions will deflect more conversations than a sophisticated chatbot with no content behind it. The knowledge base is the content layer. The chatbot is the routing layer. Without content, the router has nothing to route to.

All three tools offer knowledge base functionality, but the quality varies. Tawk.to has a basic knowledge base. Crisp has a solid help center with categories, SEO-friendly URLs, and search. Intercom has a full help center with collections, articles, suggested articles in the messenger, and Fin AI that reads your articles to answer questions automatically.

Structure your knowledge base around user intent, not product features. Users do not search for "Webhook Configuration API" — they search for "How do I get notified when a payment fails?" Group articles by job-to-be-done: "Getting Started," "Billing & Payments," "Account Settings," "Troubleshooting." Each article should answer one question completely, including screenshots and code examples where relevant.

Measure deflection rate: `(total_widget_opens - conversations_started) / total_widget_opens`. If users open the widget, see a suggested article, read it, and close the widget without starting a conversation, that is a successful deflection. Aim for a 30-50% deflection rate. Below 30%, your articles are not answering the right questions. Above 50%, verify users are not giving up because they cannot find the "talk to a human" button.

### 6. Handle Mobile and Responsive Layouts

Chat widgets on mobile are a UX minefield. A floating button in the bottom-right corner that works perfectly on desktop can obscure a critical CTA on mobile. A chat window that opens to 100% viewport height can trap users who cannot figure out how to close it. Every chat tool has mobile styling issues that you must address explicitly.

Position the widget to avoid conflicts with your own UI. If you have a bottom navigation bar, the chat button must sit above it. If you have a floating action button, the chat button must not overlap it. All three tools support position customization — use it. Tawk.to allows pixel-level offset. Crisp supports `position` configuration. Intercom supports custom launcher positioning and the option to hide the default launcher entirely in favor of a custom button.

On mobile, consider hiding the widget by default and showing it only on specific pages (support, pricing, account settings). This prevents the widget from cluttering pages where users are trying to consume content. Use the JavaScript API to show/hide the widget based on route: `Tawk_API.showWidget()` / `Tawk_API.hideWidget()`, `$crisp.push(["do", "chat:show"])` / `$crisp.push(["do", "chat:hide"])`, or `Intercom('show')` / `Intercom('hide')`.

Test the widget on actual mobile devices, not just responsive browser windows. Chat widget behavior differs between iOS Safari, Chrome on Android, and in-app browsers. The keyboard opening can push the chat input off screen. The back button can close the app instead of the chat window. These are not edge cases — they are the majority of your mobile chat sessions.

### 7. Instrument Support Metrics from Day One

You cannot improve what you do not measure. From the moment you add live chat, track five metrics. **First response time**: the median time between a user sending a message and an agent replying. Target under 2 minutes during business hours. **Resolution time**: the median time from first message to conversation marked resolved. Target under 15 minutes for simple issues. **Deflection rate**: the percentage of widget opens that do not result in a conversation (resolved by knowledge base or chatbot). Target 30-50%. **Customer satisfaction (CSAT)**: post-conversation survey score. Target above 90%. **Conversations per user**: the average number of support conversations per active user per month. A rising trend means your product is getting harder to use.

All three tools provide built-in analytics dashboards. But do not rely solely on them. Push conversation data to your analytics warehouse (via webhooks or API) so you can correlate support metrics with product metrics. Users who contact support within their first 7 days have different retention profiles than users who never contact support — understanding this correlation requires joining support data with product data.

Tag conversations by category (billing, bug report, feature request, how-to). Aggregate these tags monthly. If "how to export data" is your top category for three months straight, that is not a support problem — it is a UX problem. The export feature is not discoverable. Support metrics should feed directly into product prioritization.

---

## LLM Instructions

### 1. Tawk.to Integration in Next.js App Router

When asked to integrate Tawk.to into a Next.js App Router application, follow this pattern precisely.

Tawk.to does not publish an npm package. Integration is done by embedding their script snippet. The script must be loaded client-side only, after hydration, to avoid SSR errors and performance degradation.

1. Create a `TawkToWidget` client component at `src/components/support/tawk-to-widget.tsx`. Use `"use client"` directive. Inside a `useEffect`, create a script element that loads the Tawk.to embed script asynchronously. The script source follows the pattern `https://embed.tawk.to/{PROPERTY_ID}/{WIDGET_ID}`. Store both IDs in environment variables: `NEXT_PUBLIC_TAWK_PROPERTY_ID` and `NEXT_PUBLIC_TAWK_WIDGET_ID`. Set `script.async = true` and `script.charset = "utf-8"`. Append the script to `document.body`. Return a cleanup function that removes the script element.

2. Initialize the `Tawk_API` global object before the script loads. Declare `window.Tawk_API = window.Tawk_API || {}` and `window.Tawk_LoadStart = new Date()` at the top of the effect. This is required by Tawk.to's initialization sequence.

3. For user identification, set `window.Tawk_API.visitor` before the script loads with `name`, `email`, and `hash` (for secure mode). The hash is an HMAC-SHA256 of the visitor email signed with your Tawk.to API key, computed server-side and passed to the component as a prop.

4. For widget customization (auto-trigger messages, pre-chat forms, custom colors), use `window.Tawk_API.customStyle` to set bubble color, header color, and position. Use `window.Tawk_API.onLoad` callback to execute post-load configuration like `Tawk_API.setAttributes()` for custom visitor properties.

5. Import the component in your root layout (`src/app/layout.tsx`) using `next/dynamic` with `ssr: false` to ensure zero server-side rendering. Wrap the dynamic import in a `Suspense` boundary with no fallback (the widget should appear silently).

6. For conditional loading (only on certain pages), create a `SupportProvider` context that reads the current pathname from `usePathname()` and only renders the widget component when the path matches a support-eligible route (pricing, dashboard, account settings).

7. For the REST API, use Tawk.to's REST API v1 to manage tickets programmatically. Create a server-side utility at `src/lib/tawk/api.ts` that wraps the API with typed functions: `getChats()`, `getVisitorDetails(visitorId)`, `sendMessage(chatId, message)`. Authenticate with your API key via Basic auth header.

8. Extend the global Window interface in a `src/types/tawk.d.ts` declaration file to type `Tawk_API` methods: `showWidget()`, `hideWidget()`, `toggle()`, `maximize()`, `minimize()`, `popup()`, `setAttributes(attributes, callback)`, `addEvent(eventName, metadata, callback)`, `addTags(tags, callback)`, `onLoad`, `onBeforeLoad`, `onChatMaximized`, `onChatMinimized`, `onChatStarted`, `onChatEnded`, `visitor`.

### 2. Crisp Integration in Next.js App Router

When asked to integrate Crisp into a Next.js App Router application, follow this pattern precisely.

Crisp publishes the `crisp-sdk-web` npm package which provides a typed JavaScript interface. However, the underlying script still loads asynchronously from Crisp's CDN.

1. Install `crisp-sdk-web` as a dependency. Create a `CrispProvider` client component at `src/components/support/crisp-provider.tsx`. Use `"use client"` directive. Inside a `useEffect`, import the Crisp SDK and call `Crisp.configure(websiteId)` where `websiteId` comes from `NEXT_PUBLIC_CRISP_WEBSITE_ID` environment variable.

2. For user identification, call `Crisp.user.setEmail(email)`, `Crisp.user.setNickname(name)`, and `Crisp.user.setAvatar(avatarUrl)` after configuration. For custom data, use `Crisp.session.setData({ plan: "pro", accountAge: 45, mrr: 99 })`. For segments, use `Crisp.session.setSegments(["paying", "enterprise"])`. All identification calls must happen after `Crisp.configure()` resolves.

3. For token-based identity verification, generate a token server-side using HMAC-SHA256 of the user's email with your Crisp secret key. Pass this token to `Crisp.user.setTokenId(token)`. This prevents user impersonation. Create a server action or API route at `src/app/api/crisp-token/route.ts` that computes and returns this token for the authenticated user.

4. For event handling, use `Crisp.chat.onChatOpened(() => { ... })`, `Crisp.chat.onChatClosed(() => { ... })`, `Crisp.chat.onMessageReceived((message) => { ... })`, and `Crisp.message.onMessageSent((message) => { ... })`. Use these to trigger analytics events (track chat opened in your analytics provider) and to update UI state.

5. For chatbot scenarios, configure them in the Crisp dashboard under Plugins > Bot. Scenarios are visual flows with triggers (page URL, time on page, return visitor), conditions (user segment, data attribute), and actions (send message, ask question, route to operator, set data). The LLM should generate the scenario logic description, but the actual scenario must be built in the Crisp dashboard. Recommend scenario triggers: greeting after 10 seconds on pricing page, proactive help after 3 page views without conversion, exit-intent on checkout.

6. For the knowledge base (Crisp Helpdesk), configure it in the Crisp dashboard. Articles are served at `help.yourdomain.com` or embedded in the chat widget. Use the Crisp REST API to programmatically manage articles: `POST /v1/website/{websiteId}/helpdesk/locale/{locale}/article` with title, content (Markdown), category, and status fields. Create a utility at `src/lib/crisp/api.ts` for article CRUD operations.

7. For API integration, use the Crisp REST API v1. Authenticate with your API token ID and API key via Basic auth. Create typed wrappers at `src/lib/crisp/api.ts` for conversation management: `listConversations(websiteId)`, `getConversation(websiteId, sessionId)`, `sendMessage(websiteId, sessionId, message)`, `resolveConversation(websiteId, sessionId)`. Use these for server-side automation like sending proactive messages based on backend events.

8. Import the `CrispProvider` in your root layout using `next/dynamic` with `ssr: false`. Pass user data from your auth session as props. The component renders `null` — it only executes side effects.

### 3. Intercom Integration in Next.js App Router

When asked to integrate Intercom into a Next.js App Router application, follow this pattern precisely.

Intercom publishes `@intercom/messenger-js-sdk` which provides a modern, typed SDK.

1. Install `@intercom/messenger-js-sdk` as a dependency. Create an `IntercomProvider` client component at `src/components/support/intercom-provider.tsx`. Use `"use client"` directive. Inside a `useEffect`, import Intercom from the SDK and call `Intercom({ app_id: process.env.NEXT_PUBLIC_INTERCOM_APP_ID })` to boot the messenger in anonymous mode.

2. For authenticated users, call Intercom with the full identity payload: `Intercom({ app_id, user_id, name, email, created_at (Unix timestamp), user_hash (HMAC for identity verification), custom_attributes: { plan, company, mrr } })`. The `user_hash` is an HMAC-SHA256 of the `user_id` signed with your Intercom identity verification secret, computed server-side.

3. Create an identity verification API route at `src/app/api/intercom-hash/route.ts` that takes the authenticated user's ID, computes the HMAC, and returns it. Call this route from the client component on mount and pass the hash to the Intercom boot call. Never expose the secret key to the client.

4. For page navigation tracking in the App Router, use `usePathname()` from `next/navigation` and call `Intercom('update')` on every pathname change. This ensures Intercom tracks page views correctly in a single-page application. Use a `useEffect` with `pathname` as the dependency.

5. For custom launchers (replacing the default floating button with your own UI element), boot Intercom with `hide_default_launcher: true`, then create a custom button component that calls `Intercom('show')` on click. This gives full control over the launcher's position, style, and visibility. Use this when the default launcher conflicts with your app's UI.

6. For product tours, create tours in the Intercom dashboard using the visual builder. Tours target specific pages and user segments. Trigger tours programmatically with `Intercom('startTour', tourId)`. Use this for contextual onboarding: when a user reaches a feature for the first time, start the relevant tour. Combine with your onboarding state machine to prevent showing tours for completed steps.

7. For the help center, create articles and collections in the Intercom dashboard. Articles appear in the messenger's home screen and are searchable. Use the REST API to manage articles programmatically: `POST /articles` with title, body (HTML), author_id, and parent_id. Create a utility at `src/lib/intercom/api.ts` that wraps the API with typed functions for article management, conversation management, and contact management. Authenticate with a Bearer token.

8. For conversation management via API, create server-side functions for common operations: `createConversation(userId, message)`, `replyToConversation(conversationId, adminId, message)`, `closeConversation(conversationId, adminId)`, `tagConversation(conversationId, tagId)`. Use these for automated workflows: when a user hits a critical error, create a proactive conversation with context about the error.

9. For Fin AI setup, configure Fin in the Intercom dashboard under Fin > Settings. Point Fin at your help center articles and any external content sources. Fin uses your articles to generate answers. The quality of Fin responses is directly proportional to the quality of your help center content. Write articles that answer specific questions with clear, structured content — Fin performs poorly on vague, marketing-heavy articles.

10. Handle shutdown cleanly. When the user logs out, call `Intercom('shutdown')` to clear the messenger state, then re-initialize in anonymous mode if needed. This prevents identity leakage between users on shared devices.

---

## Examples

### Tawk.to: Complete Next.js Integration

**Type declarations (`src/types/tawk.d.ts`):**

```typescript
interface TawkAPI {
  maximize: () => void;
  minimize: () => void;
  toggle: () => void;
  popup: () => void;
  showWidget: () => void;
  hideWidget: () => void;
  toggleVisibility: () => void;
  getWindowType: () => string;
  getStatus: () => string;
  isChatMaximized: () => boolean;
  isChatMinimized: () => boolean;
  isChatHidden: () => boolean;
  isChatOngoing: () => boolean;
  isVisitorEngaged: () => boolean;
  setAttributes: (
    attributes: Record<string, string | number | boolean>,
    callback?: (error: Error | null) => void
  ) => void;
  addEvent: (
    eventName: string,
    metadata?: Record<string, string | number>,
    callback?: (error: Error | null) => void
  ) => void;
  addTags: (
    tags: string[],
    callback?: (error: Error | null) => void
  ) => void;
  removeTags: (
    tags: string[],
    callback?: (error: Error | null) => void
  ) => void;
  endChat: () => void;
  visitor?: {
    name?: string;
    email?: string;
    hash?: string;
  };
  customStyle?: {
    visibility?: {
      desktop?: { position?: string; xOffset?: number | string; yOffset?: number | string };
      mobile?: { position?: string; xOffset?: number; yOffset?: number };
      bubble?: { show?: boolean };
    };
    zIndex?: number | string;
  };
  onLoad?: () => void;
  onBeforeLoad?: () => void;
  onChatMaximized?: () => void;
  onChatMinimized?: () => void;
  onChatHidden?: () => void;
  onChatStarted?: () => void;
  onChatEnded?: () => void;
  onPrechatSubmit?: (data: Record<string, string>) => void;
  onOfflineSubmit?: (data: Record<string, string>) => void;
  onChatMessageVisitor?: (message: string) => void;
  onChatMessageAgent?: (message: string) => void;
  onChatMessageSystem?: (message: string) => void;
  onAgentJoinChat?: (data: { name: string; position: string; image: string }) => void;
  onAgentLeaveChat?: (data: { name: string; id: string }) => void;
  onChatSatisfaction?: (satisfaction: string) => void;
  onVisitorNameChanged?: (visitorName: string) => void;
  onFileUpload?: (link: string) => void;
  onTagsUpdated?: (tags: string[]) => void;
  onUnreadCountChanged?: (count: number) => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkAPI;
    Tawk_LoadStart?: Date;
  }
}

export {};
```

**Widget component (`src/components/support/tawk-to-widget.tsx`):**

```typescript
"use client";

import { useEffect } from "react";

interface TawkToWidgetProps {
  /** Visitor name for identified users */
  visitorName?: string;
  /** Visitor email for identified users */
  visitorEmail?: string;
  /** HMAC hash for secure mode (computed server-side) */
  visitorHash?: string;
  /** Custom attributes to set on the visitor */
  customAttributes?: Record<string, string | number | boolean>;
}

export function TawkToWidget({
  visitorName,
  visitorEmail,
  visitorHash,
  customAttributes,
}: TawkToWidgetProps) {
  useEffect(() => {
    const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
    const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;

    if (!propertyId || !widgetId) {
      console.warn("Tawk.to: Missing NEXT_PUBLIC_TAWK_PROPERTY_ID or NEXT_PUBLIC_TAWK_WIDGET_ID");
      return;
    }

    // Initialize Tawk_API before script loads
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Set visitor identity if available
    if (visitorEmail) {
      window.Tawk_API.visitor = {
        name: visitorName || undefined,
        email: visitorEmail,
        hash: visitorHash || undefined,
      };
    }

    // Configure widget position to avoid overlapping app UI
    window.Tawk_API.customStyle = {
      visibility: {
        desktop: {
          position: "br", // bottom-right
          xOffset: 20,
          yOffset: 20,
        },
        mobile: {
          position: "br",
          xOffset: 10,
          yOffset: 70, // above mobile nav bar
        },
      },
    };

    // Set custom attributes and events after widget loads
    window.Tawk_API.onLoad = () => {
      if (customAttributes && window.Tawk_API) {
        window.Tawk_API.setAttributes(customAttributes, (error) => {
          if (error) console.error("Tawk.to: Failed to set attributes", error);
        });
      }
    };

    // Create and inject the script
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = "utf-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      document.body.removeChild(script);
      delete window.Tawk_API;
      delete window.Tawk_LoadStart;
    };
  }, [visitorName, visitorEmail, visitorHash, customAttributes]);

  return null;
}
```

**Dynamic import in root layout (`src/app/layout.tsx`):**

```typescript
import dynamic from "next/dynamic";
import { auth } from "@/lib/auth";
import { computeTawkHash } from "@/lib/tawk/hash";

const TawkToWidget = dynamic(
  () => import("@/components/support/tawk-to-widget").then((mod) => mod.TawkToWidget),
  { ssr: false }
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Compute HMAC hash server-side for secure mode
  const visitorHash = session?.user?.email
    ? computeTawkHash(session.user.email)
    : undefined;

  return (
    <html lang="en">
      <body>
        {children}
        <TawkToWidget
          visitorName={session?.user?.name ?? undefined}
          visitorEmail={session?.user?.email ?? undefined}
          visitorHash={visitorHash}
          customAttributes={
            session?.user
              ? {
                  plan: session.user.plan ?? "free",
                  accountId: session.user.id,
                }
              : undefined
          }
        />
      </body>
    </html>
  );
}
```

**Server-side HMAC computation (`src/lib/tawk/hash.ts`):**

```typescript
import { createHmac } from "crypto";

export function computeTawkHash(email: string): string {
  const apiKey = process.env.TAWK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TAWK_API_KEY environment variable");
  }
  return createHmac("sha256", apiKey).update(email).digest("hex");
}
```

**REST API wrapper (`src/lib/tawk/api.ts`):**

```typescript
const TAWK_API_BASE = "https://api.tawk.to/v1";

interface TawkApiConfig {
  apiKey: string;
  propertyId: string;
}

function getAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

export function createTawkClient(config: TawkApiConfig) {
  const { apiKey, propertyId } = config;

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${TAWK_API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(apiKey),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Tawk API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    /** List recent chats for the property */
    async getChats(page = 0, limit = 20) {
      return request<{ data: Array<{ id: string; visitor: { name: string; email: string }; messages: unknown[] }> }>(
        `/property/${propertyId}/chats?page=${page}&limit=${limit}`
      );
    },

    /** Get details of a specific chat */
    async getChat(chatId: string) {
      return request<{ data: { id: string; visitor: Record<string, unknown>; messages: unknown[] } }>(
        `/property/${propertyId}/chat/${chatId}`
      );
    },

    /** Get visitor details */
    async getVisitor(visitorId: string) {
      return request<{ data: { name: string; email: string; city: string; country: string } }>(
        `/property/${propertyId}/visitor/${visitorId}`
      );
    },

    /** Create a ticket from a chat */
    async createTicket(data: { chatId: string; subject: string; message: string }) {
      return request<{ data: { id: string } }>(`/property/${propertyId}/ticket`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  };
}

// Usage in a server action or API route:
// const tawk = createTawkClient({
//   apiKey: process.env.TAWK_API_KEY!,
//   propertyId: process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID!,
// });
// const chats = await tawk.getChats();
```

**Auto-trigger configuration (set in Tawk.to dashboard or via API):**

```typescript
// Example: Trigger proactive message on pricing page after 10 seconds
// This runs inside the onLoad callback of TawkToWidget

window.Tawk_API!.onLoad = () => {
  // Track page-specific events for auto-trigger targeting
  if (window.location.pathname === "/pricing") {
    window.Tawk_API!.addEvent("viewed-pricing", {
      timestamp: Date.now().toString(),
    });
  }

  // Track high-intent actions
  if (window.location.pathname.startsWith("/checkout")) {
    window.Tawk_API!.addTags(["checkout-visitor"]);
  }
};
```

---

### Crisp: Complete Next.js Integration

**Provider component (`src/components/support/crisp-provider.tsx`):**

```typescript
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

interface CrispProviderProps {
  /** User email for identification */
  userEmail?: string;
  /** User display name */
  userName?: string;
  /** User avatar URL */
  userAvatar?: string;
  /** Token for identity verification (computed server-side) */
  userToken?: string;
  /** Custom session data */
  sessionData?: Record<string, string | number | boolean>;
  /** Segments to apply to the session */
  segments?: string[];
  /** Routes where the widget should be hidden */
  hiddenRoutes?: string[];
}

export function CrispProvider({
  userEmail,
  userName,
  userAvatar,
  userToken,
  sessionData,
  segments,
  hiddenRoutes = [],
}: CrispProviderProps) {
  const pathname = usePathname();

  // Initialize Crisp on mount
  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!websiteId) {
      console.warn("Crisp: Missing NEXT_PUBLIC_CRISP_WEBSITE_ID");
      return;
    }

    let isMounted = true;

    async function initCrisp() {
      const { Crisp } = await import("crisp-sdk-web");

      if (!isMounted) return;

      Crisp.configure(websiteId!);

      // Set user identity
      if (userEmail) {
        Crisp.user.setEmail(userEmail);
        if (userToken) {
          Crisp.user.setTokenId(userToken);
        }
      }
      if (userName) {
        Crisp.user.setNickname(userName);
      }
      if (userAvatar) {
        Crisp.user.setAvatar(userAvatar);
      }

      // Set session data (custom attributes visible to agents)
      if (sessionData) {
        Crisp.session.setData(sessionData);
      }

      // Set segments for chatbot targeting and filtering
      if (segments && segments.length > 0) {
        Crisp.session.setSegments(segments, true); // true = overwrite existing
      }

      // Register event listeners for analytics
      Crisp.chat.onChatOpened(() => {
        // Example: track in your analytics provider
        // analytics.track("support_chat_opened", { page: window.location.pathname });
      });

      Crisp.chat.onChatClosed(() => {
        // analytics.track("support_chat_closed");
      });

      Crisp.message.onMessageSent(() => {
        // analytics.track("support_message_sent");
      });
    }

    initCrisp();

    return () => {
      isMounted = false;
    };
  }, [userEmail, userName, userAvatar, userToken, sessionData, segments]);

  // Show/hide widget based on route
  useEffect(() => {
    async function updateVisibility() {
      const { Crisp } = await import("crisp-sdk-web");
      const shouldHide = hiddenRoutes.some((route) => pathname.startsWith(route));

      if (shouldHide) {
        Crisp.chat.hide();
      } else {
        Crisp.chat.show();
      }
    }

    if (hiddenRoutes.length > 0) {
      updateVisibility();
    }
  }, [pathname, hiddenRoutes]);

  return null;
}
```

**Identity verification API route (`src/app/api/crisp-token/route.ts`):**

```typescript
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.CRISP_IDENTITY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Crisp identity secret not configured" }, { status: 500 });
  }

  const token = createHmac("sha256", secret)
    .update(session.user.email)
    .digest("hex");

  return NextResponse.json({ token });
}
```

**Dynamic import in root layout (`src/app/layout.tsx`):**

```typescript
import dynamic from "next/dynamic";
import { auth } from "@/lib/auth";
import { computeCrispToken } from "@/lib/crisp/token";

const CrispProvider = dynamic(
  () => import("@/components/support/crisp-provider").then((mod) => mod.CrispProvider),
  { ssr: false }
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const crispToken = session?.user?.email
    ? computeCrispToken(session.user.email)
    : undefined;

  return (
    <html lang="en">
      <body>
        {children}
        <CrispProvider
          userEmail={session?.user?.email ?? undefined}
          userName={session?.user?.name ?? undefined}
          userAvatar={session?.user?.image ?? undefined}
          userToken={crispToken}
          sessionData={
            session?.user
              ? {
                  plan: session.user.plan ?? "free",
                  accountId: session.user.id,
                  signupDate: session.user.createdAt ?? "",
                }
              : undefined
          }
          segments={
            session?.user?.plan === "pro" ? ["paying", "pro"] : ["free"]
          }
          hiddenRoutes={["/blog", "/docs"]}
        />
      </body>
    </html>
  );
}
```

**REST API wrapper (`src/lib/crisp/api.ts`):**

```typescript
const CRISP_API_BASE = "https://api.crisp.chat/v1";

interface CrispApiConfig {
  tokenId: string;
  tokenKey: string;
  websiteId: string;
}

export function createCrispClient(config: CrispApiConfig) {
  const { tokenId, tokenKey, websiteId } = config;

  const authHeader = `Basic ${Buffer.from(`${tokenId}:${tokenKey}`).toString("base64")}`;

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${CRISP_API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Crisp API error: ${response.status} - ${body}`);
    }

    const json = await response.json();
    return json.data as T;
  }

  return {
    // --- Conversations ---

    /** List conversations with optional pagination */
    async listConversations(page = 1) {
      return request<Array<{ session_id: string; meta: Record<string, unknown>; state: string }>>(
        `/website/${websiteId}/conversations/${page}`
      );
    },

    /** Get a single conversation */
    async getConversation(sessionId: string) {
      return request<{ session_id: string; state: string; meta: Record<string, unknown> }>(
        `/website/${websiteId}/conversation/${sessionId}`
      );
    },

    /** Get messages in a conversation */
    async getMessages(sessionId: string) {
      return request<Array<{ type: string; from: string; content: string; timestamp: number }>>(
        `/website/${websiteId}/conversation/${sessionId}/messages`
      );
    },

    /** Send a message in a conversation */
    async sendMessage(sessionId: string, message: string, type: "text" | "note" = "text") {
      return request<void>(`/website/${websiteId}/conversation/${sessionId}/message`, {
        method: "POST",
        body: JSON.stringify({
          type,
          from: "operator",
          origin: "chat",
          content: message,
        }),
      });
    },

    /** Resolve a conversation */
    async resolveConversation(sessionId: string) {
      return request<void>(`/website/${websiteId}/conversation/${sessionId}/state`, {
        method: "PATCH",
        body: JSON.stringify({ state: "resolved" }),
      });
    },

    // --- Helpdesk Articles ---

    /** Create a helpdesk article */
    async createArticle(locale: string, data: { title: string; content: string; category?: string; status?: "published" | "draft" }) {
      return request<{ article_id: string }>(
        `/website/${websiteId}/helpdesk/locale/${locale}/article`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    },

    /** Update an existing article */
    async updateArticle(locale: string, articleId: string, data: Partial<{ title: string; content: string; status: string }>) {
      return request<void>(
        `/website/${websiteId}/helpdesk/locale/${locale}/article/${articleId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
    },

    /** List all articles */
    async listArticles(locale: string, page = 1) {
      return request<Array<{ article_id: string; title: string; status: string }>>(
        `/website/${websiteId}/helpdesk/locale/${locale}/articles/${page}`
      );
    },

    // --- People (CRM) ---

    /** Get a contact profile */
    async getContact(peopleId: string) {
      return request<{ people_id: string; email: string; data: Record<string, unknown> }>(
        `/website/${websiteId}/people/data/${peopleId}`
      );
    },

    /** Update a contact profile */
    async updateContact(peopleId: string, data: Record<string, unknown>) {
      return request<void>(`/website/${websiteId}/people/data/${peopleId}`, {
        method: "PATCH",
        body: JSON.stringify({ data }),
      });
    },
  };
}

// Usage:
// const crisp = createCrispClient({
//   tokenId: process.env.CRISP_TOKEN_ID!,
//   tokenKey: process.env.CRISP_TOKEN_KEY!,
//   websiteId: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID!,
// });
// const conversations = await crisp.listConversations();
```

**Token computation utility (`src/lib/crisp/token.ts`):**

```typescript
import { createHmac } from "crypto";

export function computeCrispToken(email: string): string {
  const secret = process.env.CRISP_IDENTITY_SECRET;
  if (!secret) {
    throw new Error("Missing CRISP_IDENTITY_SECRET environment variable");
  }
  return createHmac("sha256", secret).update(email).digest("hex");
}
```

---

### Intercom: Complete Next.js Integration

**Provider component (`src/components/support/intercom-provider.tsx`):**

```typescript
"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Intercom from "@intercom/messenger-js-sdk";

interface IntercomProviderProps {
  /** Intercom app ID */
  appId: string;
  /** Authenticated user ID */
  userId?: string;
  /** User display name */
  userName?: string;
  /** User email */
  userEmail?: string;
  /** Unix timestamp of user creation */
  userCreatedAt?: number;
  /** HMAC hash for identity verification (computed server-side) */
  userHash?: string;
  /** Custom attributes to pass to Intercom */
  customAttributes?: Record<string, string | number | boolean>;
  /** Whether to hide the default launcher */
  hideDefaultLauncher?: boolean;
  /** Routes where Intercom should be hidden */
  hiddenRoutes?: string[];
}

export function IntercomProvider({
  appId,
  userId,
  userName,
  userEmail,
  userCreatedAt,
  userHash,
  customAttributes,
  hideDefaultLauncher = false,
  hiddenRoutes = [],
}: IntercomProviderProps) {
  const pathname = usePathname();

  // Boot Intercom on mount
  useEffect(() => {
    if (!appId) {
      console.warn("Intercom: Missing app_id");
      return;
    }

    const settings: Record<string, unknown> = {
      app_id: appId,
      hide_default_launcher: hideDefaultLauncher,
    };

    // Add authenticated user data
    if (userId && userEmail) {
      settings.user_id = userId;
      settings.email = userEmail;
      if (userName) settings.name = userName;
      if (userCreatedAt) settings.created_at = userCreatedAt;
      if (userHash) settings.user_hash = userHash;
      if (customAttributes) {
        Object.assign(settings, customAttributes);
      }
    }

    Intercom(settings);

    return () => {
      Intercom("shutdown");
    };
  }, [appId, userId, userName, userEmail, userCreatedAt, userHash, customAttributes, hideDefaultLauncher]);

  // Update on route change for SPA page tracking
  useEffect(() => {
    Intercom("update");
  }, [pathname]);

  // Hide/show based on route
  useEffect(() => {
    if (hiddenRoutes.length === 0) return;

    const shouldHide = hiddenRoutes.some((route) => pathname.startsWith(route));

    if (shouldHide) {
      Intercom("update", { hide_default_launcher: true });
    } else {
      Intercom("update", { hide_default_launcher: hideDefaultLauncher });
    }
  }, [pathname, hiddenRoutes, hideDefaultLauncher]);

  return null;
}
```

**Identity verification API route (`src/app/api/intercom-hash/route.ts`):**

```typescript
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.INTERCOM_IDENTITY_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Intercom identity secret not configured" },
      { status: 500 }
    );
  }

  const hash = createHmac("sha256", secret)
    .update(session.user.id)
    .digest("hex");

  return NextResponse.json({ hash });
}
```

**Dynamic import in root layout (`src/app/layout.tsx`):**

```typescript
import dynamic from "next/dynamic";
import { auth } from "@/lib/auth";
import { computeIntercomHash } from "@/lib/intercom/hash";

const IntercomProvider = dynamic(
  () => import("@/components/support/intercom-provider").then((mod) => mod.IntercomProvider),
  { ssr: false }
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const intercomHash = session?.user?.id
    ? computeIntercomHash(session.user.id)
    : undefined;

  return (
    <html lang="en">
      <body>
        {children}
        <IntercomProvider
          appId={process.env.NEXT_PUBLIC_INTERCOM_APP_ID!}
          userId={session?.user?.id}
          userName={session?.user?.name ?? undefined}
          userEmail={session?.user?.email ?? undefined}
          userCreatedAt={
            session?.user?.createdAt
              ? Math.floor(new Date(session.user.createdAt).getTime() / 1000)
              : undefined
          }
          userHash={intercomHash}
          customAttributes={
            session?.user
              ? {
                  plan: session.user.plan ?? "free",
                  company_name: session.user.companyName ?? "",
                  mrr: session.user.mrr ?? 0,
                }
              : undefined
          }
          hiddenRoutes={["/blog", "/docs"]}
        />
      </body>
    </html>
  );
}
```

**Custom launcher component (`src/components/support/intercom-launcher.tsx`):**

```typescript
"use client";

import { useCallback } from "react";
import Intercom from "@intercom/messenger-js-sdk";

interface IntercomLauncherProps {
  /** Number of unread messages to show in badge */
  unreadCount?: number;
  className?: string;
}

export function IntercomLauncher({ unreadCount = 0, className }: IntercomLauncherProps) {
  const handleClick = useCallback(() => {
    Intercom("show");
  }, []);

  return (
    <button
      onClick={handleClick}
      className={className}
      aria-label={`Open support chat${unreadCount > 0 ? `, ${unreadCount} unread messages` : ""}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 20.97v-3.364a4.393 4.393 0 0 1-1.942-1.655 4.482 4.482 0 0 1-.645-1.753c-.244-1.424-.244-2.956 0-4.38.25-1.458 1.283-2.647 2.5-3.16Z" />
        <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
```

**Product tour trigger (`src/hooks/use-intercom-tour.ts`):**

```typescript
"use client";

import { useEffect, useRef } from "react";
import Intercom from "@intercom/messenger-js-sdk";

/**
 * Trigger an Intercom product tour when a condition is met.
 * Uses localStorage to prevent showing the same tour twice.
 */
export function useIntercomTour(tourId: number, shouldTrigger: boolean) {
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!shouldTrigger || hasTriggered.current) return;

    const storageKey = `intercom_tour_${tourId}_completed`;
    const alreadyCompleted = localStorage.getItem(storageKey) === "true";

    if (alreadyCompleted) return;

    // Slight delay to ensure the page has rendered target elements
    const timer = setTimeout(() => {
      Intercom("startTour", tourId);
      hasTriggered.current = true;
      localStorage.setItem(storageKey, "true");
    }, 1000);

    return () => clearTimeout(timer);
  }, [tourId, shouldTrigger]);
}

// Usage in a page component:
// function DashboardPage() {
//   const { isFirstVisit } = useOnboarding();
//   useIntercomTour(12345, isFirstVisit);
//   return <Dashboard />;
// }
```

**REST API wrapper (`src/lib/intercom/api.ts`):**

```typescript
const INTERCOM_API_BASE = "https://api.intercom.io";

interface IntercomApiConfig {
  accessToken: string;
}

export function createIntercomClient(config: IntercomApiConfig) {
  const { accessToken } = config;

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${INTERCOM_API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Intercom-Version": "2.11",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Intercom API error: ${response.status} - ${body}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    // --- Conversations ---

    /** Create a new conversation from a user */
    async createConversation(userId: string, message: string) {
      return request<{ id: string; state: string }>("/conversations", {
        method: "POST",
        body: JSON.stringify({
          from: { type: "user", id: userId },
          body: message,
        }),
      });
    },

    /** Reply to a conversation as an admin */
    async replyToConversation(conversationId: string, adminId: string, message: string) {
      return request<{ id: string }>(`/conversations/${conversationId}/reply`, {
        method: "POST",
        body: JSON.stringify({
          message_type: "comment",
          type: "admin",
          admin_id: adminId,
          body: message,
        }),
      });
    },

    /** Close a conversation */
    async closeConversation(conversationId: string, adminId: string, body?: string) {
      return request<{ id: string }>(`/conversations/${conversationId}/parts`, {
        method: "POST",
        body: JSON.stringify({
          message_type: "close",
          type: "admin",
          admin_id: adminId,
          body: body || "Conversation resolved.",
        }),
      });
    },

    /** Tag a conversation */
    async tagConversation(conversationId: string, tagId: string) {
      return request<{ id: string }>(`/conversations/${conversationId}/tags`, {
        method: "POST",
        body: JSON.stringify({ id: tagId }),
      });
    },

    /** Search conversations with filters */
    async searchConversations(query: {
      field: string;
      operator: string;
      value: string | number | boolean;
    }) {
      return request<{ conversations: Array<{ id: string; state: string; title: string }> }>(
        "/conversations/search",
        {
          method: "POST",
          body: JSON.stringify({
            query: {
              field: query.field,
              operator: query.operator,
              value: query.value,
            },
          }),
        }
      );
    },

    // --- Articles ---

    /** Create a help center article */
    async createArticle(data: {
      title: string;
      body: string;
      author_id: number;
      state: "published" | "draft";
      parent_id?: number;
      parent_type?: "collection" | "section";
    }) {
      return request<{ id: string; title: string }>("/articles", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    /** Update an existing article */
    async updateArticle(articleId: string, data: Partial<{ title: string; body: string; state: string }>) {
      return request<{ id: string }>(`/articles/${articleId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    /** List all articles */
    async listArticles(page = 1, perPage = 25) {
      return request<{ data: Array<{ id: string; title: string; state: string }> }>(
        `/articles?page=${page}&per_page=${perPage}`
      );
    },

    // --- Contacts ---

    /** Find or create a contact */
    async findOrCreateContact(data: { email: string; name?: string; custom_attributes?: Record<string, unknown> }) {
      // Search first
      const searchResult = await request<{ data: Array<{ id: string }> }>("/contacts/search", {
        method: "POST",
        body: JSON.stringify({
          query: {
            field: "email",
            operator: "=",
            value: data.email,
          },
        }),
      });

      if (searchResult.data.length > 0) {
        return searchResult.data[0];
      }

      // Create if not found
      return request<{ id: string }>("/contacts", {
        method: "POST",
        body: JSON.stringify({
          role: "user",
          ...data,
        }),
      });
    },

    /** Update contact attributes */
    async updateContact(contactId: string, data: Record<string, unknown>) {
      return request<{ id: string }>(`/contacts/${contactId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    // --- Events ---

    /** Submit a user event for behavioral targeting */
    async trackEvent(data: { event_name: string; user_id: string; metadata?: Record<string, unknown>; created_at?: number }) {
      return request<void>("/events", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          created_at: data.created_at || Math.floor(Date.now() / 1000),
        }),
      });
    },
  };
}

// Usage:
// const intercom = createIntercomClient({
//   accessToken: process.env.INTERCOM_ACCESS_TOKEN!,
// });
// await intercom.createConversation("user_abc123", "I need help with billing.");
```

**HMAC utility (`src/lib/intercom/hash.ts`):**

```typescript
import { createHmac } from "crypto";

export function computeIntercomHash(userId: string): string {
  const secret = process.env.INTERCOM_IDENTITY_SECRET;
  if (!secret) {
    throw new Error("Missing INTERCOM_IDENTITY_SECRET environment variable");
  }
  return createHmac("sha256", secret).update(userId).digest("hex");
}
```

---

## Common Mistakes

### 1. Loading the Chat Widget Synchronously in the Layout

**Wrong:** Embedding the Tawk.to or Crisp script tag directly in `<head>` or at the top of the body, blocking initial render.

```typescript
// layout.tsx — the wrong way
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <script src="https://embed.tawk.to/PROP_ID/WIDGET_ID" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Fix:** Use `next/dynamic` with `ssr: false` to lazy-load the widget component. The script loads only after the page is interactive.

```typescript
import dynamic from "next/dynamic";

const TawkToWidget = dynamic(
  () => import("@/components/support/tawk-to-widget").then((mod) => mod.TawkToWidget),
  { ssr: false }
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <TawkToWidget />
      </body>
    </html>
  );
}
```

### 2. Not Passing User Identity to the Widget

**Wrong:** Every conversation starts with the agent asking "What is your email?" because the widget is running in anonymous mode for logged-in users.

```typescript
// No identity passed — agent has zero context
useEffect(() => {
  Crisp.configure(websiteId);
  // That is it. No user data.
}, []);
```

**Fix:** Always pass the authenticated user's identity immediately after configuration.

```typescript
useEffect(() => {
  Crisp.configure(websiteId);
  if (session?.user) {
    Crisp.user.setEmail(session.user.email);
    Crisp.user.setNickname(session.user.name);
    Crisp.session.setData({
      plan: session.user.plan,
      accountId: session.user.id,
      signupDate: session.user.createdAt,
    });
  }
}, [session]);
```

### 3. Skipping Identity Verification in Production

**Wrong:** Accepting whatever email the client passes without server-side verification. Any user can open the browser console and call `Crisp.user.setEmail("ceo@competitor.com")` to impersonate another user.

```typescript
// Client passes email directly — no HMAC verification
Crisp.user.setEmail(userEmail);
```

**Fix:** Compute an HMAC hash server-side and pass it to the widget. The chat provider verifies the hash matches the email, preventing impersonation.

```typescript
// Server-side
const token = createHmac("sha256", process.env.CRISP_IDENTITY_SECRET!)
  .update(userEmail)
  .digest("hex");

// Client-side
Crisp.user.setEmail(userEmail);
Crisp.user.setTokenId(token); // Crisp verifies this hash
```

### 4. Not Handling Route Changes in the App Router

**Wrong:** Intercom does not track page views after the initial load because the App Router navigates client-side without full page reloads.

```typescript
// Boot once, never update — Intercom thinks the user is on the same page forever
useEffect(() => {
  Intercom({ app_id: appId });
}, []);
```

**Fix:** Watch for pathname changes and call `Intercom('update')` on every navigation.

```typescript
const pathname = usePathname();

useEffect(() => {
  Intercom({ app_id: appId });
}, []);

useEffect(() => {
  Intercom("update");
}, [pathname]);
```

### 5. Showing the Widget on Every Page

**Wrong:** The chat bubble appears on blog posts, documentation, marketing pages, and the login screen. Users on the blog do not need live support. The widget adds unnecessary JavaScript and visual clutter.

```typescript
// Widget always visible, no route filtering
export function ChatWidget() {
  useEffect(() => {
    Crisp.configure(websiteId);
  }, []);
  return null;
}
```

**Fix:** Conditionally show the widget based on the current route. Hide it on content pages, show it on product and support pages.

```typescript
const pathname = usePathname();

useEffect(() => {
  const supportPages = ["/dashboard", "/settings", "/pricing", "/account"];
  const isSupported = supportPages.some((page) => pathname.startsWith(page));

  if (isSupported) {
    Crisp.chat.show();
  } else {
    Crisp.chat.hide();
  }
}, [pathname]);
```

### 6. Not Cleaning Up on User Logout

**Wrong:** User A logs out and User B logs in on the same browser. Intercom still shows User A's identity and conversation history because `shutdown` was never called.

```typescript
// Logout handler — no Intercom cleanup
async function handleLogout() {
  await signOut();
  router.push("/login");
}
```

**Fix:** Call `shutdown` on logout to clear the messenger state, then re-initialize in anonymous mode.

```typescript
async function handleLogout() {
  Intercom("shutdown"); // Clear User A's data
  await signOut();
  Intercom({ app_id: appId }); // Re-init anonymous
  router.push("/login");
}
```

### 7. Chatbot Loops Without Human Escape Hatch

**Wrong:** The chatbot asks clarifying questions in a loop. The user cannot reach a human until they complete the entire bot flow. After 6 questions with no resolution, the user closes the tab.

```
Bot: What issue are you experiencing?
User: Billing problem
Bot: What kind of billing problem?
User: I was charged twice
Bot: When were you charged?
User: Yesterday
Bot: Can you provide your invoice number?
User: I DON'T KNOW JUST LET ME TALK TO SOMEONE
Bot: I did not understand that. What kind of billing problem are you experiencing?
```

**Fix:** Add a "Talk to a human" option at every step. Limit bot interactions to 3 exchanges before unconditionally offering human handoff.

```
Bot: What issue are you experiencing?
  [Billing] [Technical] [Account] [Talk to a human]
User: Billing
Bot: I can help with billing. What happened?
  [Charged twice] [Refund request] [Update payment] [Talk to a human]
User: Charged twice
Bot: I am sorry about that. Let me connect you with our billing team right away.
  → [Routes to human agent with context: "Billing > Charged twice"]
```

### 8. Exposing Chat Provider API Keys in Client Code

**Wrong:** Storing the REST API key or identity verification secret in `NEXT_PUBLIC_` environment variables, exposing them to the browser.

```env
# .env.local — WRONG
NEXT_PUBLIC_INTERCOM_SECRET=sk_live_abc123def456
NEXT_PUBLIC_TAWK_API_KEY=abc123xyz
```

**Fix:** Only expose the public app/widget ID to the client. Keep API keys and secrets server-side only. Compute HMAC hashes in API routes or server actions.

```env
# .env.local — CORRECT
NEXT_PUBLIC_INTERCOM_APP_ID=abc123              # Safe: public identifier
INTERCOM_IDENTITY_SECRET=sk_live_abc123def456   # Server-only: never reaches client
INTERCOM_ACCESS_TOKEN=dG9rOmFiYz...             # Server-only: API access
```

### 9. Not Setting Offline Mode Behavior

**Wrong:** The widget shows "Chat with us" at 3 AM when no agents are online. The user types a message, hits send, and sees "No agents available. Leave a message." The user already wrote the message expecting a live response and is now frustrated.

```typescript
// Widget always shows "Chat with us" regardless of agent availability
Crisp.configure(websiteId);
```

**Fix:** Configure offline behavior explicitly. Show a "Leave a message" form when offline, or hide the widget entirely.

```typescript
// In Crisp: set availability schedule in dashboard
// In Tawk.to: configure offline form in widget settings
// In Intercom: use office hours and set away mode messaging

// Programmatic approach: check agent availability
Crisp.chat.onChatOpened(() => {
  // Crisp automatically shows offline form when no operators are available
  // Ensure you have configured the offline form in dashboard > Settings > Chat Widget
});

// For Tawk.to: hide widget entirely when offline
window.Tawk_API!.onBeforeLoad = () => {
  if (window.Tawk_API!.getStatus() === "offline") {
    window.Tawk_API!.hideWidget();
  }
};
```

### 10. Ignoring Content Security Policy (CSP) Headers

**Wrong:** Adding a chat widget to a site with strict CSP headers. The widget script is blocked by the browser. No error appears in the UI, the widget simply does not load, and no one notices for weeks.

```typescript
// next.config.ts — strict CSP that blocks chat widgets
const cspHeader = `
  script-src 'self';
  connect-src 'self';
  frame-src 'self';
`;
```

**Fix:** Add the chat provider's domains to your CSP policy. Each provider requires specific domains for scripts, WebSocket connections, and iframe content.

```typescript
// next.config.ts — CSP with Tawk.to allowed
const cspHeader = `
  script-src 'self' https://embed.tawk.to;
  connect-src 'self' wss://chat.tawk.to https://va.tawk.to;
  frame-src 'self' https://tawk.to;
  img-src 'self' https://tawk.to;
`;

// For Crisp:
// script-src 'self' https://client.crisp.chat;
// connect-src 'self' wss://client.relay.crisp.chat https://client.crisp.chat;
// frame-src 'self' https://game.crisp.chat;
// img-src 'self' https://image.crisp.chat https://storage.crisp.chat;

// For Intercom:
// script-src 'self' https://widget.intercom.io https://js.intercomcdn.com;
// connect-src 'self' https://api-iam.intercom.io wss://nexus-websocket-a.intercom.io;
// frame-src 'self' https://intercom-sheets.com;
// img-src 'self' https://static.intercomassets.com https://downloads.intercomcdn.com;
```

---

> **See also:** [Communication](../Communication/communication.md) for notification infrastructure and real-time messaging foundations | [User-Onboarding](../../Product-Growth/User-Onboarding/user-onboarding.md) for guided tour systems and activation flows that complement in-app support
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
