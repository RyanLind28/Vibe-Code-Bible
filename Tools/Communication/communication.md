# Communication Tools
> Twilio for SMS, voice, and WhatsApp; Stream for in-app chat, activity feeds, and video; Knock for unified multi-channel notifications -- choosing, configuring, and integrating the communication infrastructure that connects your product to your users and your users to each other.

---

## When to Use What

Every product eventually needs to communicate with its users. The question is which layer of communication you need and which tool owns that layer. These three services occupy distinct, mostly non-overlapping territories. Choosing the wrong tool for the job means fighting the API instead of building features.

| Capability | **Twilio** | **Stream** | **Knock** |
|---|---|---|---|
| **SMS (transactional)** | Native, best-in-class | Not supported | Via Twilio/Vonage integration |
| **SMS (marketing/OTP)** | Native, Verify API | Not supported | Via Twilio integration |
| **Voice calls** | Native, programmable voice | Not supported | Not supported |
| **WhatsApp messaging** | Native, Business API | Not supported | Not supported |
| **In-app chat SDK** | Conversations API (limited) | Native, best-in-class | Not supported |
| **Video/audio calls** | Programmable Video | Native video SDK | Not supported |
| **Activity feeds** | Not supported | Native feed SDK | Not supported |
| **React components** | None (API only) | Full component library | NotificationFeed, Preferences |
| **Multi-channel notifications** | SMS/voice/WhatsApp only | Not a notification system | Native, best-in-class |
| **Email notifications** | SendGrid (subsidiary) | Not supported | Native, multi-provider |
| **Push notifications** | Not supported | Push for chat only | Native (FCM/APNs) |
| **In-app notifications** | Not supported | Not a notification system | Native feed + toasts |
| **Workflow orchestration** | Not supported | Not supported | Native workflow engine |
| **Pricing model** | Per-message/per-minute | Per MAU (chat), per feed user | Per notification sent |
| **Free tier** | Trial credit (~$15) | 100 chat MAU, 500 feed MAU | 10,000 notifications/mo |
| **Best for** | Telecom: SMS, voice, WhatsApp, OTP verification | Real-time social: chat, feeds, video inside your app | Notification routing: email + push + in-app + SMS unified |

**The opinionated recommendation:**

- **Need to send SMS, make voice calls, or integrate WhatsApp?** Use Twilio. Nothing else comes close to its telecom infrastructure, global carrier network, and regulatory compliance tooling.
- **Need in-app chat, activity feeds, or video between users?** Use Stream. Its pre-built React components and real-time infrastructure save months of engineering time. Building chat from scratch with WebSockets is a rite of passage, not a business decision.
- **Need to notify users across email, push, in-app, and SMS from a single trigger?** Use Knock. It replaces the brittle custom notification system every team eventually builds and regrets. One workflow trigger fans out to every channel with user preferences respected automatically.

These three tools complement each other. A typical stack uses Twilio as the SMS transport layer, Stream for in-app chat, and Knock as the notification orchestration layer that routes to email (via Resend/Postmark), push (via FCM/APNs), in-app (via its own feed), and SMS (via Twilio). Knock can even use Twilio as its SMS provider, making them work together rather than compete.

---

## Principles

### 1. Build vs. Buy for Real-Time Messaging

The temptation to build chat yourself is strong. WebSockets are well-understood, the data model seems simple (users, channels, messages), and you avoid vendor lock-in. But chat is an iceberg problem. The visible part -- sending and displaying messages -- is 10% of the work. The invisible 90% includes: message delivery guarantees across flaky mobile connections, read receipts and typing indicators at scale, message threading and reactions, file and image attachments with preview generation, push notifications when the app is backgrounded, offline message queuing and sync, moderation and content filtering, user presence and online/offline status, message search and history pagination, and handling the thundering herd when a popular channel receives a burst of messages.

Stream's chat SDK handles all of this out of the box with pre-built React components that you customise with your design system. Building it yourself with raw WebSockets and a Postgres table is viable for a two-person internal tool. For a customer-facing product, the build-vs-buy calculus overwhelmingly favours buying. The same logic applies to activity feeds -- the fan-out problem (distributing a single post to thousands of followers' feeds efficiently) is a solved-but-hard infrastructure challenge that Stream has optimised for years.

Use Twilio Conversations only when you need SMS/WhatsApp as a first-class channel in your chat experience (e.g., customer support where agents chat from a web app and customers reply via SMS). For pure in-app chat, Stream is the better tool.

### 2. Real-Time Chat Architecture Considerations

Even when using a managed chat SDK like Stream, you need to understand the architecture to make good integration decisions. Stream's chat follows a client-server model where the client SDK maintains a persistent WebSocket connection to Stream's edge servers. Your backend's role is limited to three things: generating user tokens (so clients cannot impersonate other users), creating and configuring channels (permissions, custom data), and handling webhooks for server-side reactions to chat events (message sent, user joined, flagged content).

The critical architectural decision is where to generate user tokens. Tokens must be created server-side because they require your Stream API secret. In Next.js App Router, this means a Server Action or Route Handler that authenticates the user (via your auth system), then generates a Stream token for that user. Never expose your Stream API secret to the client. Never generate tokens on the client. Never use development tokens in production -- they bypass all permission checks.

Channel design also matters. One-to-one conversations, group chats, and broadcast channels have different permission models. Stream supports channel types with configurable permissions (who can read, write, add members, delete messages). Define your channel types early -- changing permissions on existing channels at scale is painful. Use custom channel data to store your domain-specific metadata (linked project ID, support ticket reference, etc.) rather than maintaining a separate mapping table in your database.

### 3. Notification Fatigue and Digest Strategy

The number one reason users disable notifications is volume. Every notification you send is a withdrawal from a finite attention budget. If you overdraw, the user turns off notifications entirely -- or worse, uninstalls the app. The antidote is intelligent batching and digest strategies.

Knock's workflow engine supports batching natively. Instead of sending a separate notification for every comment on a post, you configure a batch window (e.g., 5 minutes). All comment notifications within that window are collected and delivered as a single notification: "Sarah, Mike, and 3 others commented on your post." This reduces notification volume by 60-80% for active content without losing any information.

For email specifically, daily and weekly digests replace real-time notifications with periodic summaries. The user opts into digest frequency through their notification preferences. Your system collects events during the digest period, groups them by type, and renders a single email. Knock handles this with its digest function in workflows -- you define the batch window, the grouping key, and the template, and Knock accumulates events and delivers the digest on schedule.

The key insight is that different notification types deserve different urgency levels. Security alerts (new login, password changed) must be real-time. Social notifications (comments, likes) should batch within a short window. Product updates and marketing should be daily or weekly digests at most. Map your notification types to urgency tiers and configure delivery timing accordingly.

### 4. SMS Compliance Is Non-Negotiable

SMS is the most regulated communication channel you will use. Violating SMS compliance rules results in carrier filtering (your messages stop being delivered), fines from carriers and regulatory bodies, and potential legal action. The rules vary by country, but the core requirements in the US (TCPA, CTIA guidelines) and similar frameworks elsewhere are:

**Opt-in is mandatory.** You cannot send SMS to a user who has not explicitly consented. "Explicit" means the user took a clear action -- checking a checkbox, entering their phone number in a form that states they will receive messages, or texting a keyword to your number. Having a phone number in your database is not consent. Having email consent is not SMS consent. Each channel requires independent consent.

**Opt-out must be instant and honoured.** When a user replies STOP to your number, you must immediately stop sending messages and confirm the opt-out. Twilio handles STOP/UNSTOP keywords automatically for US long codes and toll-free numbers, but you must still update your own database to reflect the opt-out. Continuing to attempt delivery after an opt-out is a violation even if the carrier blocks the message.

**Message content has rules.** You must identify yourself in the message. You must include opt-out instructions (e.g., "Reply STOP to unsubscribe") in marketing messages. You must not send messages outside permitted hours (typically 8am-9pm in the recipient's local timezone for marketing). You must not use URL shorteners on shared short codes (carriers flag them as spam).

**10DLC registration is required** for application-to-person (A2P) messaging on US 10-digit long codes. You register your brand and campaign with The Campaign Registry (TCR) through Twilio's console. Unregistered traffic is subject to heavy filtering and will increasingly be blocked entirely. Register before you send your first production message, not after deliverability drops.

### 5. Webhook Handling for Delivery Status

All three services communicate back to your application via webhooks. Twilio sends status callbacks for SMS delivery (sent, delivered, failed, undelivered), voice call events (ringing, answered, completed), and message replies. Stream sends webhooks for chat events (message.new, message.read, channel.created, user.flagged). Knock sends webhooks for workflow execution events (notification.sent, notification.delivered, notification.bounced).

Robust webhook handling follows a consistent pattern regardless of the service:

**Verify the webhook signature.** Twilio signs requests with your auth token. Stream signs with your API secret using HMAC-SHA256. Knock signs with a webhook signing secret. Always verify before processing. Skipping verification means anyone can trigger actions in your system by posting to your webhook URL.

**Respond with 200 immediately, then process asynchronously.** Webhook providers have timeout windows (typically 5-15 seconds). If your endpoint does not respond in time, the provider retries, and you process the same event multiple times. Acknowledge receipt immediately, then enqueue the event for background processing.

**Implement idempotency.** Webhook providers guarantee at-least-once delivery, not exactly-once. Store processed event IDs and skip duplicates. Use the provider's event ID (Twilio's `MessageSid`, Stream's `message.id`, Knock's event ID) as your idempotency key.

**Handle failures gracefully.** If processing fails after acknowledgement, you need a recovery mechanism. Log the raw webhook payload, implement a dead-letter queue, and build a retry/replay mechanism for failed events.

### 6. Server-Side Token Generation and Security

Both Stream and Knock require client-side tokens that are generated server-side. This is a security boundary that must not be compromised. The pattern is the same for both services: the client authenticates with your application (via your auth system -- NextAuth, Clerk, Supabase Auth, etc.), your server generates a service-specific token for the authenticated user, and the client uses that token to connect to the service's real-time infrastructure.

For Stream, the token is a JWT signed with your Stream API secret. It contains the user ID and an optional expiration time. For Knock, the token is generated via Knock's API and scoped to a specific user. In both cases, the token should be short-lived (1 hour is typical) and refreshed transparently before expiration.

Never hardcode tokens. Never generate tokens in client-side code. Never use the same token for all users. Never skip token expiration. A leaked long-lived admin token gives an attacker full access to your chat system or notification infrastructure.

### 7. Unified Communication Architecture

The most common architecture mistake is treating each communication channel as an independent system. You end up with SMS logic in one service, email in another, push in a third, and in-app notifications in a fourth -- each with its own event triggers, user preference checks, and delivery tracking. When a user changes their notification preferences, you update four systems. When you add a new notification type, you implement it four times. When delivery fails on one channel, there is no fallback logic.

Knock solves this by acting as the orchestration layer. A single workflow trigger (e.g., "comment.created") fans out to all configured channels. The workflow respects user preferences (the user opted out of email for comments but wants push), applies batching rules (collect comments for 5 minutes before sending), handles channel-specific formatting (short text for push, rich HTML for email, structured data for in-app), and manages fallback logic (if push fails, try email).

Even if you do not use Knock, design your notification system with a single entry point. Every notification goes through one function that resolves the user's preferences, formats the payload for each channel, and dispatches to the appropriate transport. Twilio for SMS, Resend for email, FCM for push, your own database for in-app. The orchestration logic lives in one place, not scattered across your codebase.

---

## LLM Instructions

### 1. Setting Up Twilio for SMS

When asked to add SMS capabilities to a Next.js project, install the Twilio SDK, configure environment variables, and create a server-side utility for sending messages. Always use the REST API via the Node SDK -- never use Twilio's client-side libraries for sending messages.

```typescript
// 1. Install
// npm install twilio

// 2. Environment variables (.env.local)
// TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// TWILIO_PHONE_NUMBER=+1234567890

// 3. lib/twilio.ts -- Singleton client
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export const twilioClient = twilio(accountSid, authToken);

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;
```

```typescript
// 4. lib/sms.ts -- Typed SMS sending function
import { twilioClient, TWILIO_PHONE_NUMBER } from "./twilio";

interface SendSmsParams {
  to: string;       // E.164 format: +1234567890
  body: string;     // Max 1600 chars (multi-segment)
  statusCallback?: string; // Webhook URL for delivery status
}

export async function sendSms({ to, body, statusCallback }: SendSmsParams) {
  const message = await twilioClient.messages.create({
    to,
    from: TWILIO_PHONE_NUMBER,
    body,
    ...(statusCallback && { statusCallback }),
  });

  return {
    sid: message.sid,
    status: message.status, // "queued" initially
  };
}
```

```typescript
// 5. app/api/sms/send/route.ts -- API route for sending SMS
import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sms";
import { auth } from "@/lib/auth"; // Your auth system

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, body } = await request.json();

  // Validate E.164 phone number format
  if (!/^\+[1-9]\d{1,14}$/.test(to)) {
    return NextResponse.json(
      { error: "Invalid phone number. Use E.164 format: +1234567890" },
      { status: 400 }
    );
  }

  try {
    const result = await sendSms({
      to,
      body,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
    });

    return NextResponse.json({ messageSid: result.sid, status: result.status });
  } catch (error: any) {
    console.error("SMS send failed:", error.message);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
```

### 2. Twilio WhatsApp Messaging

When asked to integrate WhatsApp messaging, use the same Twilio client but with the WhatsApp-specific `from` format. WhatsApp requires pre-approved message templates for business-initiated conversations. User-initiated conversations (where the user messages you first) allow free-form replies within a 24-hour window.

```typescript
// lib/whatsapp.ts
import { twilioClient } from "./twilio";

interface SendWhatsAppParams {
  to: string;         // E.164 format: +1234567890 (no "whatsapp:" prefix)
  body?: string;      // Free-form text (only in 24hr reply window)
  templateSid?: string; // For business-initiated messages
  templateVars?: Record<string, string>;
}

export async function sendWhatsApp({
  to,
  body,
  templateSid,
  templateVars,
}: SendWhatsAppParams) {
  const messageParams: any = {
    to: `whatsapp:${to}`,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER!}`,
  };

  if (templateSid) {
    // Business-initiated: use approved template
    messageParams.contentSid = templateSid;
    if (templateVars) {
      messageParams.contentVariables = JSON.stringify(templateVars);
    }
  } else if (body) {
    // Reply within 24hr window: free-form text
    messageParams.body = body;
  }

  const message = await twilioClient.messages.create(messageParams);
  return { sid: message.sid, status: message.status };
}
```

```typescript
// For development/testing, use the Twilio Sandbox:
// 1. Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message
// 2. Send "join <sandbox-keyword>" from your WhatsApp to the sandbox number
// 3. Use the sandbox number as TWILIO_WHATSAPP_NUMBER
// 4. Free-form messages work without templates in sandbox mode

// For production:
// 1. Register a WhatsApp Business Profile in Twilio Console
// 2. Get a dedicated WhatsApp-enabled number
// 3. Create and submit message templates for approval (takes 24-48hrs)
// 4. Use contentSid for business-initiated messages
```

### 3. Twilio Verify API for OTP

When asked to add phone verification or OTP, use Twilio Verify -- not raw SMS. Verify handles rate limiting, code generation, code validation, fraud detection, and multi-channel delivery (SMS, voice call, email, WhatsApp) automatically.

```typescript
// lib/verify.ts
import { twilioClient } from "./twilio";

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;
// Create a Verify Service in Twilio Console > Verify > Services
// The Service SID starts with "VA"

export async function sendVerificationCode(
  to: string,
  channel: "sms" | "call" | "email" | "whatsapp" = "sms"
) {
  const verification = await twilioClient.verify.v2
    .services(VERIFY_SERVICE_SID)
    .verifications.create({
      to, // E.164 phone number or email address
      channel,
    });

  return { status: verification.status }; // "pending"
}

export async function checkVerificationCode(to: string, code: string) {
  try {
    const check = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to,
        code,
      });

    return {
      valid: check.status === "approved",
      status: check.status, // "approved" or "pending"
    };
  } catch (error: any) {
    // Code expired or too many attempts
    if (error.code === 20404) {
      return { valid: false, status: "expired" };
    }
    throw error;
  }
}
```

```typescript
// app/api/verify/send/route.ts
import { NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/verify";

export async function POST(request: Request) {
  const { phone } = await request.json();

  if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
    return NextResponse.json(
      { error: "Invalid phone number format" },
      { status: 400 }
    );
  }

  try {
    const result = await sendVerificationCode(phone);
    return NextResponse.json({ status: result.status });
  } catch (error: any) {
    // Rate limited by Twilio Verify (max 5 attempts per phone per interval)
    if (error.code === 60203) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 500 }
    );
  }
}

// app/api/verify/check/route.ts
import { NextResponse } from "next/server";
import { checkVerificationCode } from "@/lib/verify";

export async function POST(request: Request) {
  const { phone, code } = await request.json();

  const result = await checkVerificationCode(phone, code);

  if (result.valid) {
    // Mark phone as verified in your database
    // Set session flag, issue token, etc.
    return NextResponse.json({ verified: true });
  }

  return NextResponse.json(
    { verified: false, status: result.status },
    { status: 400 }
  );
}
```

### 4. Twilio Incoming Message Webhooks

When asked to handle incoming SMS or WhatsApp messages, set up a webhook endpoint that Twilio posts to when messages arrive. Configure the webhook URL in the Twilio Console under your phone number's messaging configuration.

```typescript
// app/api/sms/incoming/route.ts
import { NextResponse } from "next/server";
import twilio from "twilio";

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(request: Request) {
  // 1. Verify the request is from Twilio
  const url = new URL(request.url);
  const body = await request.text();
  const params = new URLSearchParams(body);

  const signature = request.headers.get("x-twilio-signature") || "";
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}${url.pathname}`;

  const isValid = twilio.validateRequest(
    TWILIO_AUTH_TOKEN,
    signature,
    fullUrl,
    Object.fromEntries(params)
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // 2. Extract message data
  const from = params.get("From")!;        // +1234567890 or whatsapp:+1234567890
  const to = params.get("To")!;
  const messageBody = params.get("Body")!;
  const messageSid = params.get("MessageSid")!;
  const numMedia = parseInt(params.get("NumMedia") || "0", 10);

  // 3. Handle opt-out keywords (Twilio handles STOP automatically,
  //    but you should update your database)
  const upperBody = messageBody.trim().toUpperCase();
  if (["STOP", "UNSUBSCRIBE", "CANCEL", "QUIT"].includes(upperBody)) {
    await updateOptOutStatus(from, true);
    // Twilio sends an automatic STOP confirmation -- no TwiML response needed
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // 4. Process the incoming message
  await processIncomingMessage({
    from,
    to,
    body: messageBody,
    sid: messageSid,
    mediaCount: numMedia,
    // Access media URLs: params.get("MediaUrl0"), params.get("MediaContentType0")
  });

  // 5. Optionally reply with TwiML
  const twiml = `
    <Response>
      <Message>Thanks for your message! We'll get back to you shortly.</Message>
    </Response>
  `;

  return new Response(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
```

```typescript
// app/api/sms/status/route.ts -- Delivery status webhook
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  const messageSid = params.get("MessageSid")!;
  const status = params.get("MessageStatus")!;
  // Status values: queued, sent, delivered, undelivered, failed
  const errorCode = params.get("ErrorCode"); // Present if failed/undelivered

  await updateMessageStatus(messageSid, status, errorCode);

  return NextResponse.json({ received: true });
}
```

### 5. Twilio Voice Calls

When asked to add voice calling capabilities, use Twilio's programmable voice. Voice calls use TwiML (Twilio Markup Language) to define call flows -- what to say, what to play, how to route.

```typescript
// lib/voice.ts
import { twilioClient, TWILIO_PHONE_NUMBER } from "./twilio";

interface MakeCallParams {
  to: string;
  twimlUrl: string;     // URL that returns TwiML instructions
  statusCallback?: string;
}

export async function makeCall({ to, twimlUrl, statusCallback }: MakeCallParams) {
  const call = await twilioClient.calls.create({
    to,
    from: TWILIO_PHONE_NUMBER,
    url: twimlUrl,
    ...(statusCallback && {
      statusCallback,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    }),
  });

  return { sid: call.sid, status: call.status };
}
```

```typescript
// app/api/voice/twiml/route.ts -- TwiML for call flow
export async function POST(request: Request) {
  // Simple example: text-to-speech greeting, then gather digits
  const twiml = `
    <Response>
      <Say voice="Polly.Amy" language="en-GB">
        Hello! Thank you for calling. Press 1 for support, or press 2 for billing.
      </Say>
      <Gather numDigits="1" action="/api/voice/handle-input" method="POST">
        <Say>Please make your selection now.</Say>
      </Gather>
      <Say>We didn't receive any input. Goodbye.</Say>
    </Response>
  `;

  return new Response(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

// app/api/voice/handle-input/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const digit = params.get("Digits");

  let twiml: string;

  switch (digit) {
    case "1":
      twiml = `
        <Response>
          <Say>Connecting you to support.</Say>
          <Dial>${process.env.SUPPORT_PHONE_NUMBER}</Dial>
        </Response>
      `;
      break;
    case "2":
      twiml = `
        <Response>
          <Say>Connecting you to billing.</Say>
          <Dial>${process.env.BILLING_PHONE_NUMBER}</Dial>
        </Response>
      `;
      break;
    default:
      twiml = `
        <Response>
          <Say>Invalid selection. Goodbye.</Say>
        </Response>
      `;
  }

  return new Response(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
```

### 6. Setting Up Stream Chat

When asked to add in-app chat, install the Stream Chat SDK and React components. The setup requires a server-side token generator and a client-side provider.

```typescript
// 1. Install
// npm install stream-chat stream-chat-react

// 2. Environment variables (.env.local)
// NEXT_PUBLIC_STREAM_API_KEY=your_api_key
// STREAM_API_SECRET=your_api_secret  (server-side only, no NEXT_PUBLIC_ prefix)

// 3. lib/stream.ts -- Server-side client (for token generation, admin operations)
import { StreamChat } from "stream-chat";

let serverClient: StreamChat | null = null;

export function getStreamServerClient(): StreamChat {
  if (!serverClient) {
    serverClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
  }
  return serverClient;
}

// Generate a user token -- MUST be called server-side only
export function generateStreamToken(userId: string): string {
  const client = getStreamServerClient();
  return client.createToken(userId);
}

// Generate a token with expiration (recommended for production)
export function generateStreamTokenWithExpiry(
  userId: string,
  expiresInSeconds: number = 3600
): string {
  const client = getStreamServerClient();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return client.createToken(userId, expiresAt);
}
```

```typescript
// 4. app/api/stream/token/route.ts -- Token endpoint
import { NextResponse } from "next/server";
import { generateStreamTokenWithExpiry, getStreamServerClient } from "@/lib/stream";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Upsert the user in Stream (sync from your auth system)
  const serverClient = getStreamServerClient();
  await serverClient.upsertUser({
    id: session.user.id,
    name: session.user.name || "Anonymous",
    image: session.user.image,
    // Custom fields
    role: "user",
  });

  const token = generateStreamTokenWithExpiry(session.user.id);

  return NextResponse.json({ token, userId: session.user.id });
}
```

```typescript
// 5. components/chat/stream-provider.tsx -- Client-side provider
"use client";

import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { Chat } from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

interface StreamProviderProps {
  children: React.ReactNode;
}

export function StreamChatProvider({ children }: StreamProviderProps) {
  const [client, setClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    const chatClient = StreamChat.getInstance(apiKey);

    async function connectUser() {
      // Fetch token from your backend
      const res = await fetch("/api/stream/token");
      const { token, userId } = await res.json();

      await chatClient.connectUser(
        { id: userId },
        token
      );

      setClient(chatClient);
    }

    connectUser();

    return () => {
      chatClient.disconnectUser().then(() => {
        setClient(null);
      });
    };
  }, []);

  if (!client) return <div>Loading chat...</div>;

  return (
    <Chat client={client} theme="str-chat__theme-light">
      {children}
    </Chat>
  );
}
```

### 7. Stream Chat Components and Channels

When building the chat UI, use Stream's pre-built components for the message list, input, and channel list. These handle typing indicators, read receipts, reactions, file uploads, and infinite scroll out of the box.

```typescript
// components/chat/chat-view.tsx
"use client";

import { useEffect, useState } from "react";
import { Channel as StreamChannel } from "stream-chat";
import {
  Channel,
  ChannelHeader,
  ChannelList,
  MessageInput,
  MessageList,
  Thread,
  Window,
  useCreateChatClient,
} from "stream-chat-react";

interface ChatViewProps {
  userId: string;
}

export function ChatView({ userId }: ChatViewProps) {
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);

  // Filter: show channels the current user is a member of
  const filters = { type: "messaging", members: { $in: [userId] } };
  const sort = { last_message_at: -1 as const };
  const options = { limit: 20, presence: true, state: true };

  return (
    <div className="flex h-[600px]">
      {/* Left sidebar: channel list */}
      <div className="w-[300px] border-r">
        <ChannelList
          filters={filters}
          sort={sort}
          options={options}
          setActiveChannel={setActiveChannel}
          showChannelSearch
        />
      </div>

      {/* Right panel: active conversation */}
      <div className="flex-1">
        <Channel channel={activeChannel ?? undefined}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageInput focus />
          </Window>
          <Thread />
        </Channel>
      </div>
    </div>
  );
}
```

```typescript
// Creating channels server-side
// app/api/chat/channels/route.ts
import { NextResponse } from "next/server";
import { getStreamServerClient } from "@/lib/stream";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberIds, name, type = "messaging" } = await request.json();

  const serverClient = getStreamServerClient();

  // Create a channel with specific members
  const channel = serverClient.channel(type, {
    members: [session.user.id, ...memberIds],
    name,
    created_by_id: session.user.id,
    // Custom data
    // project_id: "proj_123",
  });

  await channel.create();

  return NextResponse.json({
    channelId: channel.id,
    channelType: channel.type,
  });
}
```

```typescript
// Custom message types for rich content
// Server-side: send a custom message with structured data
import { getStreamServerClient } from "@/lib/stream";

export async function sendSystemMessage(
  channelId: string,
  channelType: string,
  data: {
    type: "invoice" | "file_shared" | "task_assigned";
    payload: Record<string, unknown>;
  }
) {
  const serverClient = getStreamServerClient();
  const channel = serverClient.channel(channelType, channelId);

  await channel.sendMessage({
    text: "", // Required but can be empty for custom types
    user_id: "system", // Requires a "system" user to be created
    type: "regular",
    // Custom fields
    custom_type: data.type,
    custom_payload: data.payload,
  });
}

// Client-side: render custom message types
// components/chat/custom-message.tsx
"use client";

import { MessageSimple, useMessageContext } from "stream-chat-react";

export function CustomMessage() {
  const { message } = useMessageContext();

  // Render custom message types with specialised UI
  if (message.custom_type === "invoice") {
    return (
      <div className="rounded-lg border bg-blue-50 p-4">
        <p className="font-semibold">Invoice #{message.custom_payload?.invoiceId}</p>
        <p className="text-2xl">${message.custom_payload?.amount}</p>
        <a
          href={message.custom_payload?.url as string}
          className="text-blue-600 underline"
        >
          View Invoice
        </a>
      </div>
    );
  }

  // Fall back to default rendering for normal messages
  return <MessageSimple />;
}

// Use it: <Channel Message={CustomMessage}>...</Channel>
```

### 8. Stream Activity Feeds

When asked to build activity feeds (social feeds, notification feeds, changelog feeds), use Stream's Feeds SDK. Activity feeds handle the fan-out problem -- distributing a single activity to potentially millions of followers' feeds.

```typescript
// 1. Install
// npm install getstream

// 2. lib/stream-feeds.ts -- Server-side feed client
import { connect } from "getstream";

let feedClient: ReturnType<typeof connect> | null = null;

export function getStreamFeedClient() {
  if (!feedClient) {
    feedClient = connect(
      process.env.STREAM_FEEDS_API_KEY!,
      process.env.STREAM_FEEDS_API_SECRET!,
      process.env.STREAM_FEEDS_APP_ID!
    );
  }
  return feedClient;
}

// Generate a read-only feed token for the client
export function generateFeedToken(userId: string): string {
  const client = getStreamFeedClient();
  return client.createUserToken(userId);
}
```

```typescript
// 3. Adding activities to a feed
// app/api/feeds/post/route.ts
import { NextResponse } from "next/server";
import { getStreamFeedClient } from "@/lib/stream-feeds";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, verb, object, target } = await request.json();

  const client = getStreamFeedClient();

  // Add activity to the user's feed
  const userFeed = client.feed("user", session.user.id);
  const activity = await userFeed.addActivity({
    actor: `user:${session.user.id}`,
    verb: verb || "post",           // "post", "like", "comment", "share"
    object: object || `post:${Date.now()}`,
    // Custom fields
    text,
    author_name: session.user.name,
    author_image: session.user.image,
    ...(target && { target }),
  });

  return NextResponse.json({ activityId: activity.id });
}

// 4. Following/unfollowing feeds
export async function followUser(currentUserId: string, targetUserId: string) {
  const client = getStreamFeedClient();

  // Current user's timeline feed follows target user's user feed
  const timelineFeed = client.feed("timeline", currentUserId);
  await timelineFeed.follow("user", targetUserId);
}

export async function unfollowUser(currentUserId: string, targetUserId: string) {
  const client = getStreamFeedClient();

  const timelineFeed = client.feed("timeline", currentUserId);
  await timelineFeed.unfollow("user", targetUserId);
}
```

### 9. Setting Up Knock for Multi-Channel Notifications

When asked to add a notification system that spans email, push, in-app, and SMS, use Knock. Install both the server SDK (for triggering) and the React SDK (for in-app UI).

```typescript
// 1. Install
// npm install @knocklabs/node @knocklabs/react

// 2. Environment variables (.env.local)
// KNOCK_API_KEY=sk_xxxxxxxxxxxxx           (server-side secret key)
// NEXT_PUBLIC_KNOCK_PUBLIC_API_KEY=pk_xxxxxxxxxxxxx  (client-side public key)
// KNOCK_SIGNING_KEY=xxxxxxxxxxxxx           (for user token signing)
// NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

// 3. lib/knock.ts -- Server-side client
import { Knock } from "@knocklabs/node";

let knockClient: Knock | null = null;

export function getKnockClient(): Knock {
  if (!knockClient) {
    knockClient = new Knock(process.env.KNOCK_API_KEY!);
  }
  return knockClient;
}
```

```typescript
// 4. Defining a workflow in Knock Dashboard:
//
// Workflow: "new-comment"
// Trigger data: { commentId, commentText, postTitle, commenterName, postUrl }
//
// Steps:
//   1. Batch (5 minute window, group by: recipient + postTitle)
//   2. Channel: In-app feed
//   3. Delay: 5 minutes
//   4. Channel: Email (only if not seen in-app)
//   5. Channel: Push notification
//   6. Channel: SMS (only if preference enabled)
//
// Each channel step has its own template using Knock's template language:
//   In-app: "{{ commenterName }} commented on {{ postTitle }}"
//   Email:  Full HTML template with comment preview
//   Push:   "{{ commenterName }}: {{ commentText | truncate: 80 }}"
//   SMS:    "New comment on {{ postTitle }} from {{ commenterName }}"
```

```typescript
// 5. Triggering a workflow -- server-side
import { getKnockClient } from "@/lib/knock";

interface TriggerCommentNotificationParams {
  recipientIds: string[];    // User IDs to notify
  commentId: string;
  commentText: string;
  postTitle: string;
  commenterName: string;
  postUrl: string;
  actorId: string;           // The user who made the comment
}

export async function notifyNewComment({
  recipientIds,
  commentId,
  commentText,
  postTitle,
  commenterName,
  postUrl,
  actorId,
}: TriggerCommentNotificationParams) {
  const knock = getKnockClient();

  await knock.workflows.trigger("new-comment", {
    recipients: recipientIds,
    actor: actorId,
    data: {
      commentId,
      commentText,
      postTitle,
      commenterName,
      postUrl,
    },
    // Optional: tenant for multi-tenant apps
    // tenant: "org_123",
  });
}

// Usage in your comment creation handler:
// app/api/comments/route.ts
import { NextResponse } from "next/server";
import { notifyNewComment } from "@/lib/notifications";

export async function POST(request: Request) {
  const session = await auth();
  const { postId, text } = await request.json();

  // 1. Save comment to database
  const comment = await db.comment.create({
    data: { postId, userId: session.user.id, text },
  });

  // 2. Get post details and subscriber IDs
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { subscribers: true },
  });

  // 3. Trigger notification (fire-and-forget, do not await in the response path)
  notifyNewComment({
    recipientIds: post.subscribers
      .filter((s) => s.userId !== session.user.id) // Don't notify the commenter
      .map((s) => s.userId),
    commentId: comment.id,
    commentText: text,
    postTitle: post.title,
    commenterName: session.user.name,
    postUrl: `/posts/${post.slug}`,
    actorId: session.user.id,
  }).catch((err) => console.error("Notification trigger failed:", err));

  return NextResponse.json({ comment });
}
```

### 10. Knock In-App Notification Feed

When building the in-app notification bell and feed, use Knock's React components. They handle real-time updates, badge counts, read/unread state, and infinite scroll.

```typescript
// 1. Generate user tokens server-side
// app/api/knock/token/route.ts
import { NextResponse } from "next/server";
import { getKnockClient } from "@/lib/knock";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const knock = getKnockClient();

  // Identify the user in Knock (upsert)
  await knock.users.identify(session.user.id, {
    name: session.user.name,
    email: session.user.email,
    // Custom properties
    // avatar: session.user.image,
    // plan: "pro",
  });

  // Generate a signed token for client-side access
  // Requires KNOCK_SIGNING_KEY environment variable
  const { Knock: KnockClient } = await import("@knocklabs/node");
  const token = await KnockClient.signUserToken(session.user.id, {
    signingKey: process.env.KNOCK_SIGNING_KEY!,
    expiresInSeconds: 3600,
  });

  return NextResponse.json({ token, userId: session.user.id });
}
```

```typescript
// 2. components/notifications/knock-provider.tsx
"use client";

import { useEffect, useState } from "react";
import { KnockProvider, KnockFeedProvider } from "@knocklabs/react";
import "@knocklabs/react/dist/index.css";

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [knockAuth, setKnockAuth] = useState<{
    token: string;
    userId: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/knock/token")
      .then((res) => res.json())
      .then(setKnockAuth)
      .catch(console.error);
  }, []);

  if (!knockAuth) return <>{children}</>;

  return (
    <KnockProvider
      apiKey={process.env.NEXT_PUBLIC_KNOCK_PUBLIC_API_KEY!}
      userId={knockAuth.userId}
      userToken={knockAuth.token}
    >
      <KnockFeedProvider
        feedId={process.env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID!}
      >
        {children}
      </KnockFeedProvider>
    </KnockProvider>
  );
}
```

```typescript
// 3. components/notifications/notification-bell.tsx
"use client";

import { useState, useRef } from "react";
import {
  NotificationIconButton,
  NotificationFeedPopover,
} from "@knocklabs/react";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <NotificationIconButton
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <NotificationFeedPopover
          buttonRef={buttonRef}
          isVisible={isOpen}
          onClose={() => setIsOpen(false)}
          onNotificationClick={(item) => {
            // Navigate to the relevant page
            const url = item.data?.url;
            if (url) {
              window.location.href = url as string;
            }
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}
```

```typescript
// 4. Custom notification feed (instead of the popover)
// components/notifications/notification-feed.tsx
"use client";

import { useKnockFeed, NotificationCell } from "@knocklabs/react";
import { formatDistanceToNow } from "date-fns";

export function NotificationFeed() {
  const { feedClient, useFeedStore } = useKnockFeed();
  const { items, metadata } = useFeedStore();

  const handleMarkAllRead = () => {
    feedClient.markAllAsRead();
  };

  const handleMarkAsRead = (itemId: string) => {
    feedClient.markAsRead({ id: itemId } as any);
  };

  return (
    <div className="max-w-md rounded-lg border bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">
          Notifications
          {metadata.unseen_count > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {metadata.unseen_count}
            </span>
          )}
        </h2>
        <button
          onClick={handleMarkAllRead}
          className="text-sm text-blue-600 hover:underline"
        >
          Mark all read
        </button>
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No notifications yet</p>
        ) : (
          items.map((item) => (
            <NotificationCell key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
```

### 11. Knock Notification Preferences

When asked to build a notification preferences UI, use Knock's preference center. Users control which notification types they receive and on which channels.

```typescript
// 1. Define preference sets in Knock Dashboard:
//
// Workflow categories:
//   - "social"    -> comment.new, mention, follow
//   - "updates"   -> product.update, changelog
//   - "billing"   -> invoice.created, payment.failed
//   - "security"  -> login.new_device, password.changed
//
// Default preferences (set in Dashboard):
//   social:   { in_app: true, email: true, push: true, sms: false }
//   updates:  { in_app: true, email: true, push: false, sms: false }
//   billing:  { in_app: true, email: true, push: true, sms: true }
//   security: { in_app: true, email: true, push: true, sms: true }
```

```typescript
// 2. Server-side: set preferences programmatically
import { getKnockClient } from "@/lib/knock";

export async function setUserPreferences(
  userId: string,
  preferences: Record<string, Record<string, boolean>>
) {
  const knock = getKnockClient();

  await knock.users.setPreferences(userId, {
    channel_types: {
      email: preferences.email?.enabled ?? true,
      sms: preferences.sms?.enabled ?? false,
      push: preferences.push?.enabled ?? true,
      in_app_feed: true, // Always keep in-app enabled
    },
    workflows: {
      "comment-new": {
        channel_types: {
          email: preferences.social?.email ?? true,
          sms: preferences.social?.sms ?? false,
          push: preferences.social?.push ?? true,
        },
      },
      "product-update": {
        channel_types: {
          email: preferences.updates?.email ?? true,
          sms: preferences.updates?.sms ?? false,
          push: preferences.updates?.push ?? false,
        },
      },
      // Security notifications: always on, do not allow disabling
      "login-new-device": {
        channel_types: {
          email: true,
          push: true,
          sms: true,
        },
      },
    },
  });
}
```

```typescript
// 3. components/notifications/preference-center.tsx
"use client";

import { useEffect, useState } from "react";

interface PreferenceRow {
  category: string;
  label: string;
  description: string;
  channels: {
    in_app: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  locked?: boolean; // Security notifications cannot be disabled
}

const DEFAULT_PREFERENCES: PreferenceRow[] = [
  {
    category: "social",
    label: "Social",
    description: "Comments, mentions, and follows",
    channels: { in_app: true, email: true, push: true, sms: false },
  },
  {
    category: "updates",
    label: "Product Updates",
    description: "New features and changelog",
    channels: { in_app: true, email: true, push: false, sms: false },
  },
  {
    category: "billing",
    label: "Billing",
    description: "Invoices, payment confirmations, and failures",
    channels: { in_app: true, email: true, push: true, sms: true },
  },
  {
    category: "security",
    label: "Security",
    description: "Login alerts and password changes",
    channels: { in_app: true, email: true, push: true, sms: true },
    locked: true,
  },
];

export function PreferenceCenter() {
  const [preferences, setPreferences] =
    useState<PreferenceRow[]>(DEFAULT_PREFERENCES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load saved preferences from API
    fetch("/api/notifications/preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) setPreferences(data.preferences);
      })
      .catch(console.error);
  }, []);

  const toggleChannel = (
    categoryIndex: number,
    channel: keyof PreferenceRow["channels"]
  ) => {
    setPreferences((prev) => {
      const updated = [...prev];
      if (updated[categoryIndex].locked) return updated;
      updated[categoryIndex] = {
        ...updated[categoryIndex],
        channels: {
          ...updated[categoryIndex].channels,
          [channel]: !updated[categoryIndex].channels[channel],
        },
      };
      return updated;
    });
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
    } finally {
      setSaving(false);
    }
  };

  const channelHeaders = [
    { key: "in_app" as const, label: "In-App" },
    { key: "email" as const, label: "Email" },
    { key: "push" as const, label: "Push" },
    { key: "sms" as const, label: "SMS" },
  ];

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Notification Preferences</h2>
        <p className="text-sm text-gray-500">
          Choose how you want to be notified for each category.
        </p>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
            <th className="p-4">Category</th>
            {channelHeaders.map((ch) => (
              <th key={ch.key} className="p-4 text-center">
                {ch.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preferences.map((pref, rowIdx) => (
            <tr key={pref.category} className="border-b last:border-b-0">
              <td className="p-4">
                <p className="font-medium">{pref.label}</p>
                <p className="text-sm text-gray-500">{pref.description}</p>
              </td>
              {channelHeaders.map((ch) => (
                <td key={ch.key} className="p-4 text-center">
                  <input
                    type="checkbox"
                    checked={pref.channels[ch.key]}
                    onChange={() => toggleChannel(rowIdx, ch.key)}
                    disabled={pref.locked}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end border-t p-4">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
```

### 12. Knock Multi-Channel Workflow Example

When building a complete notification flow that spans all channels, this is the full pattern -- from event to delivery across in-app, email, push, and SMS with batching, preferences, and fallback logic.

```typescript
// Complete workflow: "order-status-updated"
//
// Knock Dashboard workflow configuration:
//
// Trigger data schema:
//   orderId: string
//   orderNumber: string
//   status: "confirmed" | "shipped" | "delivered" | "cancelled"
//   trackingUrl?: string
//   estimatedDelivery?: string
//
// Workflow steps:
//   1. Function: set notification urgency based on status
//   2. Branch:
//      - If status == "shipped" or "delivered":
//          a. In-app feed (immediate)
//          b. Push notification (immediate)
//          c. Email (immediate)
//          d. SMS (only if user opted in)
//      - If status == "confirmed":
//          a. In-app feed (immediate)
//          b. Email (immediate)
//      - If status == "cancelled":
//          a. In-app feed (immediate)
//          b. Email (immediate)
//          c. Push notification (immediate)
//          d. SMS (immediate, override preferences)
```

```typescript
// Triggering the workflow from your order service
// lib/notifications/order.ts
import { getKnockClient } from "@/lib/knock";

type OrderStatus = "confirmed" | "shipped" | "delivered" | "cancelled";

interface OrderStatusNotification {
  userId: string;
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export async function notifyOrderStatusChange({
  userId,
  orderId,
  orderNumber,
  status,
  trackingUrl,
  estimatedDelivery,
}: OrderStatusNotification) {
  const knock = getKnockClient();

  await knock.workflows.trigger("order-status-updated", {
    recipients: [userId],
    data: {
      orderId,
      orderNumber,
      status,
      trackingUrl,
      estimatedDelivery,
      // Template helpers
      statusEmoji: {
        confirmed: "receipt",
        shipped: "package",
        delivered: "check",
        cancelled: "warning",
      }[status],
      statusLabel: {
        confirmed: "Order Confirmed",
        shipped: "Order Shipped",
        delivered: "Order Delivered",
        cancelled: "Order Cancelled",
      }[status],
    },
  });
}
```

```typescript
// Connecting Twilio as the SMS channel in Knock:
//
// 1. In Knock Dashboard, go to Integrations > Channels > SMS
// 2. Select "Twilio" as the SMS provider
// 3. Enter your Twilio Account SID and Auth Token
// 4. Enter your Twilio phone number (the "from" number)
// 5. Save -- Knock will now use Twilio to deliver SMS notifications
//
// This means you use Twilio for direct SMS (OTP, transactional)
// and Knock routes through Twilio for notification SMS.
// One Twilio account, two integration paths.
```

---

## Examples

### Twilio: Complete OTP Verification Flow

```typescript
// Full phone verification flow for Next.js App Router

// 1. lib/twilio.ts (shared client)
import twilio from "twilio";

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// 2. app/verify/page.tsx (client component)
"use client";

import { useState } from "react";

export default function VerifyPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "verified">("phone");
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    setError("");
    const res = await fetch("/api/verify/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    if (res.ok) {
      setStep("code");
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleVerifyCode = async () => {
    setError("");
    const res = await fetch("/api/verify/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });

    const data = await res.json();
    if (data.verified) {
      setStep("verified");
    } else {
      setError("Invalid code. Please try again.");
    }
  };

  if (step === "verified") {
    return (
      <div className="p-8 text-center">
        <p className="text-green-600 text-lg font-semibold">
          Phone verified successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto p-8 space-y-4">
      {step === "phone" && (
        <>
          <label className="block text-sm font-medium">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            className="w-full rounded border px-3 py-2"
          />
          <button
            onClick={handleSendCode}
            className="w-full rounded bg-blue-600 py-2 text-white"
          >
            Send Verification Code
          </button>
        </>
      )}

      {step === "code" && (
        <>
          <p className="text-sm text-gray-600">
            Enter the 6-digit code sent to {phone}
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            className="w-full rounded border px-3 py-2 text-center text-2xl tracking-widest"
          />
          <button
            onClick={handleVerifyCode}
            className="w-full rounded bg-blue-600 py-2 text-white"
          >
            Verify Code
          </button>
          <button
            onClick={handleSendCode}
            className="w-full text-sm text-blue-600 underline"
          >
            Resend Code
          </button>
        </>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
```

### Stream: Minimal Chat Setup

```typescript
// Complete minimal chat in one page

// app/chat/page.tsx
import { ChatClient } from "./chat-client";
import { auth } from "@/lib/auth";
import { generateStreamTokenWithExpiry, getStreamServerClient } from "@/lib/stream";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Server-side: sync user and generate token
  const serverClient = getStreamServerClient();
  await serverClient.upsertUser({
    id: session.user.id,
    name: session.user.name || "Anonymous",
    image: session.user.image,
  });

  const token = generateStreamTokenWithExpiry(session.user.id);

  return (
    <ChatClient
      userId={session.user.id}
      userName={session.user.name || "Anonymous"}
      userImage={session.user.image}
      token={token}
    />
  );
}
```

```typescript
// app/chat/chat-client.tsx
"use client";

import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import {
  Chat,
  Channel,
  ChannelHeader,
  ChannelList,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";

interface ChatClientProps {
  userId: string;
  userName: string;
  userImage?: string | null;
  token: string;
}

export function ChatClient({ userId, userName, userImage, token }: ChatClientProps) {
  const [client, setClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    const chatClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_API_KEY!
    );

    chatClient
      .connectUser(
        { id: userId, name: userName, image: userImage || undefined },
        token
      )
      .then(() => setClient(chatClient));

    return () => {
      chatClient.disconnectUser();
    };
  }, [userId, userName, userImage, token]);

  if (!client) {
    return <div className="flex h-screen items-center justify-center">Loading chat...</div>;
  }

  return (
    <div className="h-screen">
      <Chat client={client} theme="str-chat__theme-light">
        <div className="flex h-full">
          <div className="w-[300px] border-r">
            <ChannelList
              filters={{ type: "messaging", members: { $in: [userId] } }}
              sort={{ last_message_at: -1 }}
              options={{ presence: true, state: true }}
              showChannelSearch
            />
          </div>
          <div className="flex-1">
            <Channel>
              <Window>
                <ChannelHeader />
                <MessageList />
                <MessageInput focus />
              </Window>
              <Thread />
            </Channel>
          </div>
        </div>
      </Chat>
    </div>
  );
}
```

### Knock: Full Notification Bell Integration

```typescript
// Complete notification bell with real-time updates

// app/layout.tsx (add provider to root layout)
import { NotificationProvider } from "@/components/notifications/knock-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          <nav className="flex items-center justify-between border-b px-6 py-3">
            <a href="/" className="text-lg font-bold">MyApp</a>
            <div className="flex items-center gap-4">
              {/* The notification bell auto-updates in real-time */}
              <NotificationBell />
              <UserMenu />
            </div>
          </nav>
          <main>{children}</main>
        </NotificationProvider>
      </body>
    </html>
  );
}
```

```typescript
// Triggering a notification from a Server Action
// app/actions/comments.ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getKnockClient } from "@/lib/knock";
import { revalidatePath } from "next/cache";

export async function createComment(postId: string, text: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const comment = await db.comment.create({
    data: {
      postId,
      userId: session.user.id,
      text,
    },
  });

  const post = await db.post.findUniqueOrThrow({
    where: { id: postId },
    include: {
      author: true,
      subscribers: { select: { userId: true } },
    },
  });

  // Notify all subscribers except the commenter
  const recipientIds = post.subscribers
    .map((s) => s.userId)
    .filter((id) => id !== session.user.id);

  if (recipientIds.length > 0) {
    const knock = getKnockClient();
    await knock.workflows.trigger("new-comment", {
      recipients: recipientIds,
      actor: session.user.id,
      data: {
        commentText: text,
        postTitle: post.title,
        commenterName: session.user.name,
        url: `/posts/${post.slug}#comment-${comment.id}`,
      },
    });
  }

  revalidatePath(`/posts/${post.slug}`);
  return comment;
}
```

---

## Common Mistakes

### 1. Exposing Twilio Auth Token on the Client

**Wrong:** Importing the Twilio client in a React component or any file that gets bundled for the browser.

```typescript
// components/sms-button.tsx
"use client";
import { twilioClient } from "@/lib/twilio"; // Auth token leaks to client bundle
```

**Fix:** All Twilio operations must happen server-side. Use Route Handlers or Server Actions as the boundary.

```typescript
// The client calls an API route. The API route calls Twilio.
const res = await fetch("/api/sms/send", {
  method: "POST",
  body: JSON.stringify({ to: phone, body: message }),
});
```

### 2. Sending SMS Without Verifying E.164 Format

**Wrong:** Passing user-entered phone numbers directly to Twilio. Numbers like "555-1234" or "(555) 123-4567" cause API errors or misrouted messages.

```typescript
await twilioClient.messages.create({
  to: userInput, // "555-1234" -- Twilio rejects this
  from: TWILIO_PHONE_NUMBER,
  body: "Your code is 123456",
});
```

**Fix:** Validate and format to E.164 before any API call. Use a library like `libphonenumber-js` for parsing.

```typescript
import { parsePhoneNumberFromString } from "libphonenumber-js";

const parsed = parsePhoneNumberFromString(userInput, "US");
if (!parsed || !parsed.isValid()) {
  throw new Error("Invalid phone number");
}
const e164 = parsed.format("E.164"); // "+15551234567"
```

### 3. Using Stream Development Tokens in Production

**Wrong:** Using `client.devToken(userId)` or disabling token authentication to "simplify" setup. Development tokens bypass all permission checks.

```typescript
// NEVER in production:
const token = chatClient.devToken(userId);
```

**Fix:** Always generate proper signed tokens server-side with expiration.

```typescript
const token = serverClient.createToken(userId, Math.floor(Date.now() / 1000) + 3600);
```

### 4. Not Disconnecting Stream Chat Client on Unmount

**Wrong:** Connecting the Stream client without cleaning up. Each connection consumes a MAU slot and leaks WebSocket connections.

```typescript
useEffect(() => {
  const client = StreamChat.getInstance(apiKey);
  client.connectUser({ id: userId }, token);
  setClient(client);
  // No cleanup -- WebSocket leaks, MAU inflates
}, []);
```

**Fix:** Always disconnect in the cleanup function.

```typescript
useEffect(() => {
  const client = StreamChat.getInstance(apiKey);
  client.connectUser({ id: userId }, token).then(() => setClient(client));

  return () => {
    client.disconnectUser();
    setClient(null);
  };
}, [userId, token]);
```

### 5. Triggering Knock Workflows Without Identifying Users First

**Wrong:** Triggering a workflow for a user ID that Knock has never seen. The notification has no email, no phone, no push token -- it silently fails on every channel except in-app.

```typescript
await knock.workflows.trigger("welcome", {
  recipients: ["user_123"], // Knock has no data for this user
});
```

**Fix:** Identify the user in Knock (with their email, phone, name) before or alongside the workflow trigger. Do this during signup or login.

```typescript
await knock.users.identify("user_123", {
  name: "Jane Smith",
  email: "jane@example.com",
  phone_number: "+1234567890",
});

await knock.workflows.trigger("welcome", {
  recipients: ["user_123"],
});
```

### 6. Not Handling Webhook Signature Verification

**Wrong:** Processing webhook payloads without verifying the sender. Any HTTP client can post fake events to your webhook URL.

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  // Immediately process -- no verification
  await processEvent(body);
}
```

**Fix:** Verify the signature using the provider's SDK before processing.

```typescript
// Twilio
const isValid = twilio.validateRequest(authToken, signature, url, params);
if (!isValid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

// Stream
const isValid = serverClient.verifyWebhook(body, signature);
if (!isValid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

### 7. Sending Every Notification in Real-Time

**Wrong:** Triggering an email, push, and SMS for every single event. A popular post gets 50 comments in 10 minutes, and the author receives 50 emails, 50 push notifications, and 50 SMS messages.

```typescript
// In comment handler -- fires for EVERY comment
await knock.workflows.trigger("new-comment", {
  recipients: [post.authorId],
  data: { commentText: comment.text },
});
// With no batching, this sends 50 separate notifications
```

**Fix:** Configure batching in your Knock workflow. Collect events within a time window and deliver a single aggregated notification.

```
// Knock workflow step configuration:
// Step 1: Batch
//   Window: 5 minutes
//   Group by: recipient + data.postId
// Step 2: In-app (template uses {{ total_activities }} for count)
// Step 3: Email (template lists all batched comments)
```

### 8. Ignoring SMS Compliance and 10DLC Registration

**Wrong:** Sending production SMS from an unregistered number. Messages are filtered, delivery rates are low, and your number risks being blocked.

```typescript
// Sending immediately after getting a Twilio number
// without A2P 10DLC registration
await sendSms({ to: "+1555...", body: "Check out our sale!" });
// 40-60% of messages silently filtered by carriers
```

**Fix:** Register your brand and campaign with TCR through Twilio's console before sending production A2P traffic. Use toll-free verification for lower volume. Include opt-out language in marketing messages.

```typescript
// After 10DLC registration, delivery rates jump to 95%+
// Always include opt-out for marketing messages:
await sendSms({
  to: "+1555...",
  body: "Your order #1234 has shipped! Track: https://... Reply STOP to opt out.",
});
```

### 9. Building a Custom Chat UI From Scratch Over Stream

**Wrong:** Using Stream's API but ignoring the React component library. You rebuild typing indicators, read receipts, infinite scroll, file upload previews, and thread navigation from scratch.

```typescript
// Months of work to replicate what Stream gives you for free:
const [messages, setMessages] = useState([]);
const [typing, setTyping] = useState({});
const [unread, setUnread] = useState(0);
// ... hundreds of lines of custom state management
```

**Fix:** Start with Stream's pre-built components. Customise with theme overrides and component swapping, not full rebuilds.

```typescript
// Stream's components handle all of this out of the box:
<Channel>
  <Window>
    <ChannelHeader />
    <MessageList />
    <MessageInput />
  </Window>
  <Thread />
</Channel>

// Customise appearance with CSS variables or component overrides:
// <Channel Message={CustomMessage} Input={CustomInput}>
```

### 10. Hardcoding Notification Content in Your Application Code

**Wrong:** Building notification text, email HTML, and push payloads in your backend code. Changing a notification's wording requires a code deploy.

```typescript
await knock.workflows.trigger("new-comment", {
  recipients: [userId],
  data: {
    // You template in your code instead of in Knock
    emailSubject: `${commenter} commented on "${postTitle}"`,
    emailBody: `<h1>${commenter} left a comment</h1><p>${text}</p>`,
    pushTitle: `New comment from ${commenter}`,
    pushBody: text.substring(0, 80),
  },
});
```

**Fix:** Pass raw data to Knock and let the workflow templates handle formatting. Edit templates in Knock's dashboard without deploying code.

```typescript
await knock.workflows.trigger("new-comment", {
  recipients: [userId],
  actor: commenterId,
  data: {
    commentText: text,
    postTitle,
    postUrl: `/posts/${slug}`,
  },
});

// Templates in Knock Dashboard:
// Email subject: "{{ actor.name }} commented on {{ postTitle }}"
// Push body:     "{{ data.commentText | truncate: 80 }}"
// In-app:        "{{ actor.name }} commented on {{ postTitle }}"
```

---

> **See also:** [Email-Notification-Systems](../../Product-Growth/Email-Notification-Systems/email-notification-systems.md) for notification patterns and email architecture | [Real-Time](../../Backend/Real-Time/real-time.md) for WebSocket and SSE fundamentals | [Email-Services](../Email-Services/email-services.md) for email-specific tools (Resend, Postmark, SES)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
