# Real-Time

> WebSockets, Server-Sent Events, Pub/Sub, presence, scaling real-time, Socket.io, managed services, optimistic UI, and real-time security — pushing data to clients the moment it changes.

---

## Principles

### 1. Real-Time Landscape

There are three primary mechanisms for pushing data from server to client. Each has different trade-offs.

| Technology | Direction | Connection | Reconnect | Use Case |
|-----------|-----------|------------|-----------|----------|
| **Server-Sent Events (SSE)** | Server → Client (unidirectional) | HTTP | Automatic | Notifications, live feeds, AI streaming |
| **WebSockets** | Bidirectional | TCP (upgraded from HTTP) | Manual | Chat, collaboration, gaming |
| **HTTP Long Polling** | Simulated push | HTTP | Per request | Legacy fallback, simple updates |

**Decision guide:**

- **Use SSE when:** you only need server-to-client data flow (notifications, live updates, AI response streaming, dashboards). SSE is simpler, works through HTTP proxies and CDNs, and auto-reconnects.
- **Use WebSockets when:** you need bidirectional communication (chat, collaborative editing, multiplayer). WebSockets require more infrastructure but enable two-way interaction.
- **Use managed services when:** you need real-time at scale without managing WebSocket infrastructure (Ably, Pusher, Supabase Realtime).
- **Use HTTP polling as a last resort** when the other options are unavailable or the update frequency is very low (check every 30 seconds).

### 2. Server-Sent Events (SSE)

SSE is the simplest real-time technology. The client opens a long-lived HTTP connection, and the server pushes events through it. The browser handles reconnection automatically.

**How it works:**

```
Client: GET /api/events (Accept: text/event-stream)
Server: HTTP 200 (Content-Type: text/event-stream)
Server: data: {"type":"notification","message":"New post"}\n\n
Server: data: {"type":"notification","message":"New comment"}\n\n
... connection stays open ...
```

**Server implementation:**

```typescript
// app/api/events/route.ts
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Subscribe to events (Redis Pub/Sub, database changes, etc.)
      const unsubscribe = eventEmitter.on("notification", (data) => {
        const event = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(event));
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30_000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Client implementation:**

```typescript
// hooks/useSSE.ts
import { useEffect, useCallback, useRef } from "react";

export function useSSE<T>(url: string, onMessage: (data: T) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        onMessage(data);
      } catch {
        // Ignore non-JSON messages (heartbeats, comments)
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects with exponential backoff
      console.warn("SSE connection error — will auto-reconnect");
    };

    eventSourceRef.current = es;
  }, [url, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);
}

// Usage
function NotificationFeed() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useSSE<Notification>("/api/events", (notification) => {
    setNotifications((prev) => [notification, ...prev]);
  });

  return (
    <ul>
      {notifications.map((n) => (
        <li key={n.id}>{n.message}</li>
      ))}
    </ul>
  );
}
```

**SSE event format:**

```
event: notification
id: msg-123
data: {"type":"new_post","title":"Hello World"}

event: presence
id: msg-124
data: {"userId":"42","status":"online"}

: this is a comment (ignored by EventSource)
```

- `event:` — optional event type (client can listen for specific types)
- `id:` — event ID (used for reconnection — client sends `Last-Event-ID` header)
- `data:` — the payload (can span multiple lines)
- `: ` — comment (used for heartbeats)

### 3. WebSockets

WebSockets provide full-duplex communication over a single TCP connection. Both client and server can send messages at any time.

**Socket.io** is the most popular WebSocket library for Node.js. It adds rooms, namespaces, auto-reconnection, and fallback to HTTP long-polling.

```typescript
// server.ts (Express + Socket.io)
import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Performance settings
  pingInterval: 25_000,
  pingTimeout: 20_000,
  transports: ["websocket", "polling"],
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const user = await verifyToken(token);
    socket.data.userId = user.id;
    socket.data.organizationId = user.organizationId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const { userId, organizationId } = socket.data;

  // Join organization room
  socket.join(`org:${organizationId}`);

  // Notify others
  socket.to(`org:${organizationId}`).emit("user:online", { userId });

  // Handle messages
  socket.on("message:send", async (data) => {
    const message = await saveMessage({
      content: data.content,
      channelId: data.channelId,
      authorId: userId,
    });

    // Broadcast to channel room
    io.to(`channel:${data.channelId}`).emit("message:new", message);
  });

  // Join/leave channels
  socket.on("channel:join", (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on("channel:leave", (channelId) => {
    socket.leave(`channel:${channelId}`);
  });

  // Typing indicators
  socket.on("typing:start", (channelId) => {
    socket.to(`channel:${channelId}`).emit("typing:update", {
      userId,
      channelId,
      isTyping: true,
    });
  });

  socket.on("typing:stop", (channelId) => {
    socket.to(`channel:${channelId}`).emit("typing:update", {
      userId,
      channelId,
      isTyping: false,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    socket.to(`org:${organizationId}`).emit("user:offline", { userId });
  });
});

server.listen(3001);
```

**Native `ws` library (lower level):**

Use the `ws` library when you don't need Socket.io's features (rooms, namespaces, auto-reconnection) and want minimal overhead:

```typescript
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3001 });

wss.on("connection", (ws, request) => {
  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());
    // Broadcast to all connected clients
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  });

  // Heartbeat
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
});

// Detect broken connections
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);
```

### 4. Pub/Sub Pattern

Pub/Sub decouples event producers from consumers. When your application runs on multiple servers, each server has its own set of WebSocket connections. Pub/Sub ensures that an event published on server A reaches clients connected to server B.

**Redis Pub/Sub:**

```typescript
// lib/pubsub.ts
import Redis from "ioredis";

const publisher = new Redis(process.env.REDIS_URL!);
const subscriber = new Redis(process.env.REDIS_URL!);

type MessageHandler = (channel: string, message: string) => void;
const handlers = new Map<string, MessageHandler[]>();

subscriber.on("message", (channel, message) => {
  const channelHandlers = handlers.get(channel) ?? [];
  for (const handler of channelHandlers) {
    handler(channel, message);
  }
});

export function publish(channel: string, data: unknown) {
  return publisher.publish(channel, JSON.stringify(data));
}

export function subscribe(channel: string, handler: MessageHandler) {
  const existing = handlers.get(channel) ?? [];
  existing.push(handler);
  handlers.set(channel, existing);

  if (existing.length === 1) {
    subscriber.subscribe(channel);
  }

  return () => {
    const list = handlers.get(channel) ?? [];
    const index = list.indexOf(handler);
    if (index !== -1) list.splice(index, 1);
    if (list.length === 0) {
      subscriber.unsubscribe(channel);
      handlers.delete(channel);
    }
  };
}
```

**Socket.io with Redis adapter (multi-server):**

```typescript
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

const io = new Server(server);
io.adapter(createAdapter(pubClient, subClient));

// Now io.to("room").emit() works across all servers
// Server A emits → Redis → Server B delivers to its connected clients
```

### 5. Scaling Real-Time

A single server can handle thousands of WebSocket connections. Beyond that, you need horizontal scaling with shared state.

**Scaling architecture:**

```
Client → Load Balancer (sticky sessions) → Server 1 ←→ Redis Pub/Sub ←→ Server 2
                                          Server 3 ←→ Redis Pub/Sub ←→ Server 4
```

**Key requirements:**
- **Sticky sessions** — a WebSocket connection must stay on the same server for its lifetime. Configure your load balancer (ALB, Nginx) with sticky sessions or use connection ID routing.
- **Redis adapter** — Socket.io's Redis adapter broadcasts events across servers
- **Connection limits** — each server can handle ~10,000–50,000 concurrent connections (depends on memory and message rate)
- **Horizontal scaling** — add more servers behind the load balancer as connections grow

```nginx
# Nginx configuration for WebSocket proxy with sticky sessions
upstream websocket_servers {
  ip_hash;  # Sticky sessions by client IP
  server ws1.example.com:3001;
  server ws2.example.com:3001;
}

server {
  location /socket.io/ {
    proxy_pass http://websocket_servers;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;  # Keep alive for 24 hours
  }
}
```

### 6. Presence and Online Status

Presence tracking shows which users are currently online. It requires tracking connections, detecting disconnections, and broadcasting status changes.

```typescript
// lib/presence.ts
import { redis } from "@/lib/redis";
import { publish } from "@/lib/pubsub";

const PRESENCE_TTL = 60; // seconds — users go "offline" after 60s without heartbeat
const PRESENCE_KEY = "presence";

export async function setOnline(userId: string, metadata?: Record<string, string>) {
  const key = `${PRESENCE_KEY}:${userId}`;

  await redis.hset(key, {
    status: "online",
    lastSeen: Date.now().toString(),
    ...metadata,
  });
  await redis.expire(key, PRESENCE_TTL);

  // Broadcast to subscribers
  await publish("presence", { userId, status: "online" });
}

export async function setOffline(userId: string) {
  await redis.del(`${PRESENCE_KEY}:${userId}`);
  await publish("presence", { userId, status: "offline" });
}

export async function heartbeat(userId: string) {
  const key = `${PRESENCE_KEY}:${userId}`;
  const exists = await redis.exists(key);

  if (exists) {
    await redis.hset(key, "lastSeen", Date.now().toString());
    await redis.expire(key, PRESENCE_TTL);
  } else {
    await setOnline(userId);
  }
}

export async function getOnlineUsers(userIds: string[]): Promise<Map<string, boolean>> {
  const pipeline = redis.pipeline();
  for (const id of userIds) {
    pipeline.exists(`${PRESENCE_KEY}:${id}`);
  }

  const results = await pipeline.exec();
  const statusMap = new Map<string, boolean>();

  userIds.forEach((id, index) => {
    statusMap.set(id, results?.[index]?.[1] === 1);
  });

  return statusMap;
}

// Socket.io integration
io.on("connection", (socket) => {
  const { userId } = socket.data;

  // Set online on connect
  setOnline(userId);

  // Heartbeat every 30 seconds
  const heartbeatInterval = setInterval(() => {
    heartbeat(userId);
  }, 30_000);

  // Set offline on disconnect (with grace period)
  socket.on("disconnect", () => {
    clearInterval(heartbeatInterval);
    // Wait 5 seconds before marking offline (handles page refresh)
    setTimeout(() => {
      setOffline(userId);
    }, 5_000);
  });
});
```

### 7. Real-Time with Managed Services

For applications that need real-time without managing WebSocket infrastructure, managed services handle the connection management, scaling, and reliability.

**Ably:**

```typescript
// Server-side: publish events
import Ably from "ably";

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
const channel = ably.channels.get("notifications");

await channel.publish("new-post", {
  postId: "123",
  title: "Hello World",
  authorName: "Alice",
});

// Client-side: subscribe to events
import { useChannel } from "ably/react";

function NotificationFeed() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useChannel("notifications", "new-post", (message) => {
    setNotifications((prev) => [message.data, ...prev]);
  });

  return <NotificationList items={notifications} />;
}
```

**Pusher:**

```typescript
// Server-side
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
});

await pusher.trigger("channel-name", "event-name", {
  message: "Hello from server",
});

// Client-side
import PusherJS from "pusher-js";

const pusher = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

const channel = pusher.subscribe("channel-name");
channel.bind("event-name", (data) => {
  console.log("Received:", data);
});
```

**Supabase Realtime:**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Subscribe to database changes
const subscription = supabase
  .channel("posts")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "posts" },
    (payload) => {
      console.log("New post:", payload.new);
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

**When to use managed vs self-hosted:**

| Factor | Self-Hosted (Socket.io) | Managed (Ably/Pusher) |
|--------|------------------------|----------------------|
| Control | Full | Limited |
| Scaling | You manage | Automatic |
| Cost at low volume | Lower | Higher (per-message pricing) |
| Cost at high volume | Server costs | Can be expensive |
| Reliability | You guarantee | SLA-backed |
| Features | Build what you need | Built-in presence, history, auth |
| Latency | Depends on infra | Global edge network |

### 8. Optimistic UI with Real-Time Sync

Optimistic UI shows the result of an action immediately, before the server confirms it. Real-time sync corrects any discrepancies when the server responds.

```typescript
// hooks/useOptimisticMessages.ts
import { useState, useCallback } from "react";
import { useSSE } from "./useSSE";

interface Message {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  status: "sending" | "sent" | "failed";
}

export function useOptimisticMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  // Receive confirmed messages from server
  useSSE<Message>(`/api/channels/${channelId}/events`, (serverMessage) => {
    setMessages((prev) => {
      // Replace optimistic message with server-confirmed version
      const optimisticIndex = prev.findIndex(
        (m) => m.status === "sending" && m.content === serverMessage.content
      );

      if (optimisticIndex !== -1) {
        const updated = [...prev];
        updated[optimisticIndex] = { ...serverMessage, status: "sent" };
        return updated;
      }

      // New message from another user
      return [...prev, { ...serverMessage, status: "sent" }];
    });
  });

  const sendMessage = useCallback(async (content: string, authorId: string) => {
    const tempId = `temp-${Date.now()}`;

    // Optimistic: add immediately
    const optimistic: Message = {
      id: tempId,
      content,
      authorId,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      await fetch(`/api/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      // Server will push the confirmed message via SSE
    } catch {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
    }
  }, [channelId]);

  return { messages, sendMessage };
}
```

**Conflict resolution strategies:**

| Strategy | How | When |
|----------|-----|------|
| **Last-write-wins** | Latest timestamp wins | Simple data, rare conflicts |
| **Server-authoritative** | Server's version is always correct | Critical data |
| **Merge** | Combine changes from both sides | Collaborative editing |
| **CRDTs** | Conflict-free data structures | Offline-first, distributed |

### 9. Real-Time Security

Real-time connections require authentication and authorization just like HTTP requests. An unauthenticated WebSocket connection is an open door.

**Authentication on connect:**

```typescript
// Verify auth before accepting WebSocket connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token ??
    socket.handshake.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const session = await validateSession(token);
    socket.data.userId = session.userId;
    socket.data.organizationId = session.organizationId;
    socket.data.role = session.role;
    next();
  } catch {
    next(new Error("Invalid or expired session"));
  }
});
```

**Authorization per channel:**

```typescript
// Verify permission before joining a channel
socket.on("channel:join", async (channelId) => {
  const { userId, organizationId } = socket.data;

  const channel = await db.channel.findFirst({
    where: { id: channelId, organizationId },
  });

  if (!channel) {
    socket.emit("error", { code: "FORBIDDEN", message: "Channel not found" });
    return;
  }

  // Check membership for private channels
  if (channel.isPrivate) {
    const member = await db.channelMember.findFirst({
      where: { channelId, userId },
    });

    if (!member) {
      socket.emit("error", { code: "FORBIDDEN", message: "Not a member of this channel" });
      return;
    }
  }

  socket.join(`channel:${channelId}`);
  socket.emit("channel:joined", { channelId });
});
```

**Rate limiting messages:**

```typescript
// Simple per-socket rate limiter
const rateLimits = new Map<string, number[]>();

function isRateLimited(socketId: string, maxPerMinute = 60): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(socketId) ?? [];

  // Remove timestamps older than 1 minute
  const recent = timestamps.filter((t) => now - t < 60_000);
  recent.push(now);
  rateLimits.set(socketId, recent);

  return recent.length > maxPerMinute;
}

socket.on("message:send", async (data) => {
  if (isRateLimited(socket.id)) {
    socket.emit("error", { code: "RATE_LIMITED", message: "Slow down" });
    return;
  }
  // Process message...
});
```

> Cross-reference: [Security/API-Security](../../Security/API-Security/api-security.md) covers WebSocket security, authentication strategies, and rate limiting.

---

## LLM Instructions

### Choosing a Real-Time Approach

When deciding on real-time technology:

- **SSE** if data flows only server → client (notifications, live feeds, AI streaming, dashboards)
- **WebSockets** if data flows both ways (chat, collaborative editing, gaming)
- **Managed service** (Ably, Pusher) if you don't want to manage WebSocket infrastructure
- **Supabase Realtime** if you're already using Supabase
- Default to SSE — it's simpler, auto-reconnects, works through all proxies, and covers most use cases
- Only use WebSockets when you genuinely need bidirectional communication

### Implementing SSE

When creating an SSE endpoint:

- Set `Content-Type: text/event-stream` and `Cache-Control: no-cache`
- Use `ReadableStream` in Next.js Route Handlers
- Send a heartbeat comment (`: heartbeat\n\n`) every 30 seconds to prevent proxy timeouts
- Include `id:` field in events so the client can resume from `Last-Event-ID` on reconnect
- Clean up resources (intervals, subscriptions) when `request.signal` aborts
- Handle backpressure — don't queue unbounded messages for slow clients

### Setting Up WebSockets

When implementing WebSocket communication:

- Use Socket.io for most applications — it handles reconnection, rooms, and fallback
- Authenticate on connection (in `io.use()` middleware), not on each message
- Use rooms for broadcasting to groups (channels, organizations, users)
- Implement heartbeat/ping to detect broken connections
- Add the Redis adapter immediately if you plan to scale beyond one server
- Namespace by feature: `/chat`, `/notifications`, `/presence`

### Scaling Real-Time

When preparing real-time for production:

- Add Redis adapter for Socket.io from the start — switching later is harder
- Configure sticky sessions in the load balancer
- Monitor connection counts per server
- Set connection limits per server (10,000–50,000 depending on message rate)
- Use Redis Pub/Sub for cross-server event broadcasting
- Consider managed services if infrastructure management is a bottleneck

### Using Managed Services

When integrating a managed real-time service:

- Choose based on your needs: Ably for complex features, Pusher for simplicity, Supabase for DB-change streaming
- Use server-side publishing and client-side subscribing (never publish from the client directly)
- Implement token-based auth — generate a short-lived token on your server for the client
- Use channel naming conventions: `private-user:42`, `presence-channel:room1`
- Monitor message counts for cost control — managed services charge per message

---

## Examples

### 1. SSE Endpoint for Live Notifications

A complete SSE endpoint that streams notifications to authenticated users:

```typescript
// app/api/notifications/stream/route.ts
import { auth } from "@/auth";
import { subscribe } from "@/lib/pubsub";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let eventId = 0;

  const stream = new ReadableStream({
    start(controller) {
      // Send connection established
      controller.enqueue(encoder.encode(`: connected to notification stream\n\n`));

      // Subscribe to user-specific notifications
      const unsubUser = subscribe(`notifications:${userId}`, (_channel, message) => {
        eventId++;
        const event = [
          `id: ${eventId}`,
          `event: notification`,
          `data: ${message}`,
          "",
          "",
        ].join("\n");
        controller.enqueue(encoder.encode(event));
      });

      // Subscribe to org-wide announcements
      const orgId = session.user.organizationId;
      const unsubOrg = orgId
        ? subscribe(`announcements:${orgId}`, (_channel, message) => {
            eventId++;
            const event = [
              `id: ${eventId}`,
              `event: announcement`,
              `data: ${message}`,
              "",
              "",
            ].join("\n");
            controller.enqueue(encoder.encode(event));
          })
        : () => {};

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
      }, 30_000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        unsubUser();
        unsubOrg();
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}

// Sending a notification (from anywhere in your backend)
import { publish } from "@/lib/pubsub";

async function notifyUser(userId: string, notification: {
  type: string;
  title: string;
  message: string;
  url?: string;
}) {
  // Store in database
  const saved = await db.notification.create({
    data: { userId, ...notification },
  });

  // Publish to SSE stream
  await publish(`notifications:${userId}`, JSON.stringify({
    id: saved.id,
    ...notification,
    createdAt: saved.createdAt,
  }));
}
```

### 2. Socket.io Chat with Rooms and Presence

A complete chat server with rooms, typing indicators, and online status:

```typescript
// server/chat.ts
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { db } from "@/lib/db";
import { setOnline, setOffline, heartbeat } from "@/lib/presence";

export async function setupChat(httpServer: any) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);

  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    adapter: createAdapter(pubClient, subClient),
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const session = await validateSession(socket.handshake.auth.token);
      socket.data = { userId: session.userId, orgId: session.organizationId };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const { userId, orgId } = socket.data;

    // Mark online and join org room
    await setOnline(userId, { orgId });
    socket.join(`org:${orgId}`);

    // Broadcast presence
    socket.to(`org:${orgId}`).emit("presence:online", { userId });

    // Heartbeat
    const hbInterval = setInterval(() => heartbeat(userId), 30_000);

    // Join a channel
    socket.on("channel:join", async (channelId: string) => {
      // Verify access
      const hasAccess = await checkChannelAccess(userId, channelId);
      if (!hasAccess) {
        socket.emit("error", { message: "No access to this channel" });
        return;
      }

      socket.join(`channel:${channelId}`);

      // Send recent messages
      const messages = await db.message.findMany({
        where: { channelId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      });

      socket.emit("channel:history", { channelId, messages: messages.reverse() });
    });

    // Send message
    socket.on("message:send", async (data: { channelId: string; content: string }) => {
      const message = await db.message.create({
        data: {
          channelId: data.channelId,
          authorId: userId,
          content: data.content,
        },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      });

      io.to(`channel:${data.channelId}`).emit("message:new", message);
    });

    // Typing indicator
    socket.on("typing:start", (channelId: string) => {
      socket.to(`channel:${channelId}`).emit("typing:update", {
        userId,
        channelId,
        typing: true,
      });
    });

    socket.on("typing:stop", (channelId: string) => {
      socket.to(`channel:${channelId}`).emit("typing:update", {
        userId,
        channelId,
        typing: false,
      });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      clearInterval(hbInterval);
      setTimeout(async () => {
        // Check if user reconnected on another socket
        const sockets = await io.in(`org:${orgId}`).fetchSockets();
        const stillConnected = sockets.some((s) => s.data.userId === userId);
        if (!stillConnected) {
          await setOffline(userId);
          io.to(`org:${orgId}`).emit("presence:offline", { userId });
        }
      }, 5_000);
    });
  });

  return io;
}
```

### 3. Redis Pub/Sub for Multi-Server

A Pub/Sub layer that enables real-time events across multiple server instances:

```typescript
// lib/realtime-pubsub.ts
import Redis from "ioredis";
import { logger } from "@/lib/logger";

const publisher = new Redis(process.env.REDIS_URL!);
const subscriber = new Redis(process.env.REDIS_URL!);

type MessageCallback = (data: unknown) => void;
const subscriptions = new Map<string, Set<MessageCallback>>();

subscriber.on("message", (channel, rawMessage) => {
  const callbacks = subscriptions.get(channel);
  if (!callbacks) return;

  let data: unknown;
  try {
    data = JSON.parse(rawMessage);
  } catch {
    data = rawMessage;
  }

  for (const callback of callbacks) {
    try {
      callback(data);
    } catch (err) {
      logger.error({ channel, err, msg: "Pub/Sub handler error" });
    }
  }
});

export function publishEvent(channel: string, data: unknown): Promise<number> {
  return publisher.publish(channel, JSON.stringify(data));
}

export function subscribeToChannel(channel: string, callback: MessageCallback): () => void {
  let callbacks = subscriptions.get(channel);

  if (!callbacks) {
    callbacks = new Set();
    subscriptions.set(channel, callbacks);
    subscriber.subscribe(channel);
  }

  callbacks.add(callback);

  // Return unsubscribe function
  return () => {
    callbacks!.delete(callback);
    if (callbacks!.size === 0) {
      subscriptions.delete(channel);
      subscriber.unsubscribe(channel);
    }
  };
}

// Usage: SSE endpoint backed by Redis Pub/Sub
// This works across multiple server instances
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      const unsub = subscribeToChannel(`user:${userId}:events`, (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 30_000);

      request.signal.addEventListener("abort", () => {
        unsub();
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

// Publish from anywhere — all servers receive it
await publishEvent(`user:${userId}:events`, {
  type: "notification",
  title: "New comment on your post",
  url: `/posts/${postId}`,
});
```

### 4. Supabase Realtime Subscription

Database change streaming with Supabase Realtime:

```typescript
// hooks/useRealtimePosts.ts
import { useEffect, useState } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Post {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

export function useRealtimePosts(organizationId: string) {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    // Initial fetch
    supabase
      .from("posts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setPosts(data);
      });

    // Subscribe to changes
    const channel: RealtimeChannel = supabase
      .channel(`posts:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          setPosts((prev) =>
            prev.map((p) => (p.id === (payload.new as Post).id ? (payload.new as Post) : p))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "posts",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          setPosts((prev) => prev.filter((p) => p.id !== (payload.old as Post).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return posts;
}
```

### 5. Optimistic Real-Time Todo List

A todo list with optimistic updates and server-side sync:

```typescript
// hooks/useTodos.ts
import { useState, useCallback, useRef } from "react";
import { useSSE } from "@/hooks/useSSE";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  optimistic?: boolean;
}

type TodoEvent =
  | { type: "todo:created"; todo: Todo }
  | { type: "todo:updated"; todo: Todo }
  | { type: "todo:deleted"; todoId: string };

export function useTodos(listId: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const optimisticIds = useRef(new Map<string, string>()); // tempId → serverId

  // Receive server events
  useSSE<TodoEvent>(`/api/lists/${listId}/events`, (event) => {
    switch (event.type) {
      case "todo:created": {
        setTodos((prev) => {
          // Check if this is confirming an optimistic add
          const tempId = [...optimisticIds.current.entries()]
            .find(([, text]) => text === event.todo.text)?.[0];

          if (tempId) {
            optimisticIds.current.delete(tempId);
            return prev.map((t) =>
              t.id === tempId ? { ...event.todo, optimistic: false } : t
            );
          }
          // New todo from another user
          return [...prev, event.todo];
        });
        break;
      }
      case "todo:updated":
        setTodos((prev) =>
          prev.map((t) => (t.id === event.todo.id ? event.todo : t))
        );
        break;
      case "todo:deleted":
        setTodos((prev) => prev.filter((t) => t.id !== event.todoId));
        break;
    }
  });

  const addTodo = useCallback(async (text: string) => {
    const tempId = `temp-${Date.now()}`;
    optimisticIds.current.set(tempId, text);

    // Optimistic add
    setTodos((prev) => [
      ...prev,
      {
        id: tempId,
        text,
        completed: false,
        createdAt: new Date().toISOString(),
        optimistic: true,
      },
    ]);

    try {
      await fetch(`/api/lists/${listId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch {
      // Revert optimistic add
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
      optimisticIds.current.delete(tempId);
    }
  }, [listId]);

  const toggleTodo = useCallback(async (todoId: string) => {
    // Optimistic toggle
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId ? { ...t, completed: !t.completed, optimistic: true } : t
      )
    );

    try {
      const todo = todos.find((t) => t.id === todoId);
      await fetch(`/api/lists/${listId}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo?.completed }),
      });
    } catch {
      // Revert
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId ? { ...t, completed: !t.completed, optimistic: false } : t
        )
      );
    }
  }, [listId, todos]);

  const deleteTodo = useCallback(async (todoId: string) => {
    const deleted = todos.find((t) => t.id === todoId);

    // Optimistic delete
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    try {
      await fetch(`/api/lists/${listId}/todos/${todoId}`, { method: "DELETE" });
    } catch {
      // Revert
      if (deleted) setTodos((prev) => [...prev, deleted]);
    }
  }, [listId, todos]);

  return { todos, addTodo, toggleTodo, deleteTodo };
}
```

---

## Common Mistakes

### 1. WebSockets When SSE Suffices

**Wrong:** Using Socket.io for a notification system that only pushes data from server to client, adding unnecessary complexity and infrastructure.

**Fix:** Use SSE for unidirectional server-to-client communication. SSE is simpler, auto-reconnects, works through all HTTP proxies, and requires no additional infrastructure. Reserve WebSockets for bidirectional communication.

### 2. No Reconnection Logic

**Wrong:** WebSocket disconnects (network change, server deploy) and the client never reconnects, showing stale data indefinitely.

**Fix:** SSE reconnects automatically (built into `EventSource`). For WebSockets, use Socket.io (built-in reconnection) or implement manual reconnection with exponential backoff.

### 3. No Heartbeat

**Wrong:** Long-lived connections sit idle for hours. Proxy servers, firewalls, and load balancers silently close them after their timeout (often 60 seconds).

**Fix:** Send a heartbeat every 30 seconds. For SSE, send a comment (`: heartbeat\n\n`). For WebSockets, Socket.io sends ping/pong automatically. For raw `ws`, implement ping/pong manually.

### 4. Memory Leaks from Unclosed Connections

**Wrong:** Creating event subscriptions, intervals, or listeners for each connection without cleaning them up on disconnect.

**Fix:** Store references to all subscriptions, intervals, and listeners created per connection. Clean them all up in the disconnect handler. Use `request.signal.addEventListener("abort", ...)` for SSE and `socket.on("disconnect", ...)` for WebSockets.

### 5. Broadcasting to All Connections

**Wrong:** Sending every event to every connected client. A notification for user A goes to all 10,000 connected users.

**Fix:** Use rooms/channels to scope messages. Socket.io: `io.to("user:42").emit(...)`. SSE: subscribe to user-specific Pub/Sub channels. Only send events to the clients that should receive them.

### 6. No Auth on WebSocket Connect

**Wrong:** Accepting WebSocket connections without authentication, allowing anyone to connect and receive events.

**Fix:** Authenticate during the WebSocket handshake (in Socket.io `io.use()` middleware). Verify the token before accepting the connection. Reject unauthenticated connections with an error.

### 7. Polling When Real-Time Exists

**Wrong:** Polling `GET /api/notifications?since=...` every 5 seconds when SSE or WebSockets would provide instant updates with less server load.

**Fix:** Use SSE for push notifications. It uses a single long-lived connection instead of repeated HTTP requests, reducing server load, network traffic, and latency from up to 5 seconds to near-instant.

### 8. No Horizontal Scaling Plan

**Wrong:** Building a WebSocket server that works on one instance, then discovering it cannot scale to multiple servers because state is in-memory.

**Fix:** Use Redis adapter for Socket.io from the start. Use Redis Pub/Sub for SSE. Store presence in Redis, not in local memory. Design for horizontal scaling even if you start with one server.

### 9. Sending Full State Instead of Diffs

**Wrong:** Sending the entire list of 500 todos every time one item changes, wasting bandwidth and causing UI flicker.

**Fix:** Send diffs: `{ type: "todo:updated", todo: { id: "42", completed: true } }`. Let the client merge the change into its local state. Full state syncs should only happen on initial connection or reconnection.

---

> **See also:** [API-Design](../API-Design/api-design.md) | [Caching-Strategies](../Caching-Strategies/caching-strategies.md) | [Serverless-Edge](../Serverless-Edge/serverless-edge.md) | [Background-Jobs](../Background-Jobs/background-jobs.md) | [Security/API-Security](../../Security/API-Security/api-security.md)
>
> **Last reviewed:** 2026-02
