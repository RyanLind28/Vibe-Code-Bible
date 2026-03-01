# Cloud Architecture & Edge Computing

> Cloud-native design, serverless-first evaluation, edge computing, CDN strategies, multi-region architecture, auto-scaling, cost optimization, and disaster recovery — every decision from compute to the edge.

---

## Principles

### 1. Cloud-Native Design

Cloud-native is not "running your monolith on EC2." It is designing applications to leverage cloud primitives: managed databases, object storage, message queues, serverless functions, and CDN edges. You use the cloud's strengths instead of fighting its constraints.

**Cloud-native characteristics:**

- **Stateless compute** — application instances hold no local state. Session data lives in Redis or a database, file uploads go to S3, caches use ElastiCache. Any instance can be killed and replaced without data loss.
- **Horizontal scaling** — add more instances, not bigger instances. Design for 10 instances handling 100 requests each, not 1 instance handling 1,000.
- **Infrastructure as managed services** — use RDS instead of self-managed PostgreSQL. Use SQS instead of self-managed RabbitMQ. You are not in the business of patching database kernels.
- **Failure is normal** — instances die, networks partition, services degrade. Design for graceful degradation, not perfection.

The twelve-factor app methodology remains the foundation: config in environment variables, backing services as attached resources, logs as event streams, and admin processes as one-off tasks.

### 2. Serverless-First Evaluation

Start every new project by asking: "Can this run serverless?" If the answer is yes, you eliminate server management, pay only for what you use, and get automatic scaling. If the answer is no, you need a specific reason.

**Serverless works well for:**

- Request/response web applications (Next.js on Vercel, API routes on Lambda)
- Event-driven processing (file uploads, webhook handlers, queue consumers)
- Scheduled tasks (cron jobs, data pipeline steps)
- APIs with bursty traffic patterns (idle most of the time, spikes during business hours)

**Serverless works poorly for:**

- Long-running processes (>15 minutes on Lambda, >30 seconds on Vercel)
- WebSocket connections (serverless functions are stateless and short-lived)
- GPU workloads (ML inference, video transcoding)
- High-throughput, consistent traffic (serverless per-invocation pricing exceeds container pricing at scale)

**The decision framework:**

| Factor | Serverless | Containers |
|--------|-----------|-----------|
| Traffic pattern | Bursty / variable | Consistent / predictable |
| Execution time | < 30 seconds | Minutes to hours |
| State | Stateless | Stateful or long-lived connections |
| Scale-to-zero | Critical (low traffic) | Not needed (always-on) |
| Cost at scale | Expensive (per-invocation) | Cheaper (per-hour compute) |

> Cross-reference: [Backend/Serverless-Edge](../../Backend/Serverless-Edge/serverless-edge.md) covers serverless patterns, cold start optimization, and streaming responses in depth.

### 3. Edge Computing for Latency

Edge computing runs your code in data centers close to the user — 50ms away instead of 200ms. For static content this is a CDN. For dynamic content this is edge functions (Cloudflare Workers, Vercel Edge Functions, Deno Deploy).

**What belongs at the edge:**

- **Static assets** — HTML, CSS, JS, images, fonts. Serve from CDN, cache aggressively.
- **Authentication checks** — validate JWTs at the edge before requests reach your origin. Reject unauthorized requests without the round trip.
- **Redirects and rewrites** — URL routing decisions at the edge avoid origin round trips.
- **Geolocation logic** — serve localized content, enforce regional compliance, route to nearest backend.
- **A/B testing** — split traffic at the edge by cookie or header, serve different variants without origin involvement.

**What does not belong at the edge:**

- Database writes — edge functions cannot maintain persistent connections to traditional databases. Use edge-compatible databases (Neon, PlanetScale, Turso) or proxy through your origin.
- Heavy computation — edge runtimes have CPU time limits (50ms on Cloudflare Workers free tier).
- Anything requiring Node.js APIs — edge runtimes use a limited JavaScript subset (no `fs`, no `child_process`).

### 4. Multi-Region Strategy

Single-region architecture is a single point of failure. If `us-east-1` goes down (and it has), your entire application is offline. Multi-region architecture provides resilience and lower latency for global users.

**Multi-region tiers:**

- **Active-passive** — one primary region handles all traffic. A standby region has replicated data and can be promoted if primary fails. Simpler but has failover downtime (minutes).
- **Active-active** — multiple regions serve traffic simultaneously. Users are routed to the nearest region. More complex but provides near-zero downtime and lower latency.

**Multi-region challenges:**

- **Data replication** — database writes must propagate across regions. Eventual consistency is usually acceptable. Strong consistency across regions requires consensus protocols with significant latency penalties.
- **Conflict resolution** — if two users update the same record in different regions simultaneously, you need a conflict resolution strategy (last-write-wins, CRDTs, or application-level merging).
- **DNS-based routing** — use Route53, Cloudflare, or your DNS provider's geo-routing to direct users to the nearest region.
- **Cost** — multi-region doubles (or more) your infrastructure cost. Justify it with business requirements (SLA commitments, regulatory compliance, global user base).

For most startups, a single region with a CDN for static assets and edge functions for latency-sensitive logic is sufficient. Multi-region becomes necessary when you have contractual uptime SLAs or a global user base where 200ms+ latency is unacceptable.

### 5. Cost Optimization

Cloud billing is designed to be confusing. Without active management, costs will grow faster than your user base. Optimize proactively, not when the bill arrives.

**High-impact cost strategies:**

- **Right-size compute** — monitor CPU and memory utilization. If your instances average 15% CPU, you are paying for 85% waste. Downsize or switch to burstable instances (T-series on AWS).
- **Reserved instances / savings plans** — commit to 1-year or 3-year terms for predictable workloads and save 30–60% over on-demand pricing.
- **Spot instances for batch work** — use spot/preemptible instances for background jobs, CI runners, and batch processing. Up to 90% cheaper, with the tradeoff of potential interruption.
- **Scale to zero** — use serverless or auto-scaling groups with min=0 for development and staging environments. Pay nothing when nobody is using them.
- **Delete unused resources** — orphaned EBS volumes, old snapshots, unused Elastic IPs, idle load balancers. These accumulate silently.
- **Egress awareness** — data leaving your cloud provider is expensive. Keep data processing within the same region. Use CloudFront or a CDN to cache responses instead of hitting your origin for every request.

**Cost alerts:**

- Set billing alerts at 50%, 80%, and 100% of your expected monthly spend
- Use AWS Cost Explorer, GCP Billing Reports, or third-party tools (Vantage, Infracost)
- Review costs weekly during growth phases, monthly during steady state

### 6. Managed Services Over Self-Hosted

Every service you self-host is a service you must patch, monitor, back up, scale, and debug at 3 AM. Managed services trade higher per-unit cost for operational simplicity.

**Always use managed:**

- **Databases** — RDS, Cloud SQL, Neon, PlanetScale, Supabase. Self-managed PostgreSQL requires backup scripts, replication setup, failover testing, and version upgrades. RDS handles all of this.
- **Caching** — ElastiCache, Upstash, Momento. Self-managed Redis needs persistence configuration, memory management, and cluster setup.
- **Search** — Algolia, Typesense Cloud, Elastic Cloud. Self-managed Elasticsearch is operationally intensive and resource-hungry.
- **Email** — Resend, SendGrid, AWS SES. Running your own mail server is a nightmare of deliverability, reputation management, and compliance.

**Consider self-hosted when:**

- The managed service does not exist or is prohibitively expensive for your scale
- You need complete control over configuration (rare)
- Regulatory requirements mandate data residency that no managed provider supports
- You have a dedicated platform/infrastructure team

### 7. Auto-Scaling Patterns

Auto-scaling adjusts your compute capacity based on demand. The goal is maintaining performance during traffic spikes while minimizing cost during quiet periods.

**Scaling metrics:**

- **CPU utilization** — scale when average CPU exceeds 70%. Simple and works for most workloads.
- **Request count** — scale based on requests per target. Better for web servers where CPU does not correlate linearly with load.
- **Queue depth** — scale workers based on the number of pending messages. The most responsive metric for queue-based architectures.
- **Custom metrics** — latency p99, active connections, business metrics. Use when standard metrics do not capture your scaling needs.

**Scaling policies:**

- **Target tracking** — "keep average CPU at 60%." The platform figures out how many instances are needed. Simplest and recommended.
- **Step scaling** — "if CPU > 70% add 2 instances, if CPU > 90% add 5 instances." More control, more configuration.
- **Scheduled scaling** — "scale to 10 instances at 9 AM, scale down to 2 at 6 PM." For predictable traffic patterns.

**Rules:**

- Scale out fast, scale in slowly — add instances immediately, wait 10+ minutes before removing them to avoid thrashing
- Set minimum instance counts to handle baseline traffic without cold starts
- Test scaling by simulating load — do not wait for production to discover your scaling limits
- Always set maximum instance counts to prevent runaway costs from traffic spikes or DDoS

### 8. CDN and Caching Layers

A CDN (Content Delivery Network) caches your content at edge locations worldwide. For static assets, this eliminates origin requests entirely. For dynamic content, it reduces latency by serving cached responses from the nearest edge.

**Caching hierarchy:**

1. **Browser cache** — `Cache-Control` headers tell the browser to cache assets locally. Zero network requests for cached assets.
2. **CDN / Edge cache** — Cloudflare, CloudFront, Vercel Edge Network cache responses at 200+ global locations.
3. **Application cache** — Redis, in-memory caches for frequently accessed data.
4. **Database** — the source of truth, hit only when caches miss.

**CDN configuration:**

- **Static assets** — cache forever with content-hash filenames (`app.a1b2c3.js`). Set `Cache-Control: public, max-age=31536000, immutable`.
- **HTML pages** — short TTL with revalidation. `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- **API responses** — cache only when appropriate (public data, infrequently changing). Use `Vary` headers for content negotiation.
- **Authenticated content** — never cache at the CDN. Use `Cache-Control: private, no-store`.

> Cross-reference: [Backend/Caching-Strategies](../../Backend/Caching-Strategies/caching-strategies.md) covers application-level caching patterns in depth.

### 9. Disaster Recovery and Backup

Disaster recovery is not optional. The question is not if your infrastructure will fail, but when. A disaster recovery plan covers data backup, service recovery, and communication.

**RPO and RTO:**

- **RPO (Recovery Point Objective)** — how much data can you afford to lose? An RPO of 1 hour means you back up at least hourly.
- **RTO (Recovery Time Objective)** — how quickly must you recover? An RTO of 15 minutes means you need automated failover, not manual recovery.

**Backup strategy:**

- **Database** — automated daily snapshots + continuous WAL archiving for point-in-time recovery. Test restore monthly.
- **Object storage** — enable versioning on S3/GCS buckets. Cross-region replication for critical data.
- **Configuration** — all infrastructure is code (Terraform, Pulumi). If your cloud account is compromised, you can rebuild from the repo.
- **Secrets** — back up secret manager contents. If your vault is unavailable, you need a recovery path.

**Testing:**

- Run a disaster recovery drill quarterly
- Practice restoring from backups — a backup you have never restored is not a backup
- Simulate region failure and verify failover works
- Document the runbook: who does what, in what order, with what credentials

### 10. Vendor Lock-In Awareness

Every cloud service you adopt creates a switching cost. Some lock-in is acceptable — the productivity gains of a managed service outweigh the theoretical risk of needing to migrate. But understand what you are committing to.

**Low lock-in (easy to switch):**

- Compute (VMs, containers) — standard Linux and Docker run anywhere
- Object storage — S3 API is a de facto standard, supported by most providers
- PostgreSQL / MySQL — managed database, but the engine is portable
- DNS — standard protocol, easy to migrate records

**High lock-in (expensive to switch):**

- Proprietary databases (DynamoDB, Firestore, Cosmos DB) — unique APIs and data models
- Serverless functions — Lambda, Cloud Functions, Cloudflare Workers all have different runtimes and deployment models
- IAM and networking — VPC configurations, security groups, and IAM policies are deeply provider-specific
- ML/AI services — SageMaker, Vertex AI, Bedrock all have proprietary APIs

**Mitigation strategies:**

- Use open standards where possible (PostgreSQL over DynamoDB, S3-compatible storage, OpenTelemetry over CloudWatch)
- Abstract cloud-specific code behind interfaces — wrap S3 calls in a `StorageService`, not raw SDK calls throughout your codebase
- Avoid proprietary services for core business logic — use them for commodity tasks (email, CDN, DNS)
- Document your cloud dependencies and their alternatives

---

## LLM Instructions

### When Designing Cloud Architecture

When asked to design or review cloud architecture:

- Default to serverless (Vercel, Cloudflare Workers, AWS Lambda) for new projects unless there is a specific reason for containers
- Recommend managed services over self-hosted for databases, caches, queues, and search
- Include a CDN for all static assets — there is no reason not to
- Design for horizontal scaling, not vertical — stateless compute, external state stores
- Include health checks and monitoring in every architecture diagram
- Consider cost from day one — mention pricing implications of architectural choices
- Use the simplest architecture that meets requirements — do not add Kubernetes for a landing page

### When Choosing Between Serverless and Containers

When asked to evaluate compute options:

- Recommend serverless for: APIs, webhooks, scheduled tasks, event processing, low/bursty traffic
- Recommend containers for: WebSocket servers, long-running processes, GPU workloads, consistent high-throughput traffic
- Recommend edge functions for: authentication, redirects, A/B testing, geolocation, API proxying
- Always mention cold start implications for serverless
- Compare cost at the expected traffic volume, not theoretical maximum
- Default to Vercel for Next.js projects, Cloudflare Workers for edge-first, AWS Lambda for event-driven backends

### When Configuring CDN and Edge

When setting up CDN or edge computing:

- Set long cache TTLs with content-hash filenames for static assets
- Use `stale-while-revalidate` for HTML and API responses that can tolerate slight staleness
- Never cache authenticated or personalized content at the CDN
- Configure custom cache keys when the default URL-based key is insufficient
- Set up cache purging for content that changes on publish (CMS, e-commerce inventory)
- Use edge functions for logic that benefits from low latency (auth checks, redirects, geo-routing)

### When Planning Multi-Region

When asked to design multi-region architecture:

- Default to active-passive for most applications — simpler and sufficient for most SLA requirements
- Recommend active-active only when latency requirements or regulatory constraints demand it
- Use DNS-based routing (Route53, Cloudflare) for traffic distribution
- Plan for data replication lag — recommend eventual consistency unless the application requires strong consistency
- Call out the cost implications (2x+ infrastructure cost)
- Include a failover runbook with clear steps and responsible parties

### When Optimizing Cloud Costs

When asked to reduce cloud costs:

- Start with utilization analysis — right-size underutilized instances first
- Recommend reserved instances or savings plans for steady-state workloads
- Suggest spot instances for fault-tolerant batch processing
- Identify resources that can scale to zero (dev/staging environments)
- Check for orphaned resources (unattached volumes, old snapshots, unused IPs)
- Set up billing alerts at 50%, 80%, and 100% of expected spend
- Consider Vercel/Cloudflare over AWS for simple web applications — often cheaper and simpler

---

## Examples

### 1. Vercel + Serverless Architecture for Next.js

A production architecture using Vercel for a Next.js application with managed backing services.

```text
Architecture Overview:
┌─────────────────────────────────────────────────────────┐
│                    Vercel Platform                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Edge Network │  │ Serverless   │  │ Edge Functions │  │
│  │ (CDN/Static) │  │ Functions    │  │ (Middleware)   │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
└─────────┼────────────────┼───────────────────┼───────────┘
          │                │                   │
          │         ┌──────┴───────┐    ┌──────┴──────┐
          │         │              │    │             │
     Static CDN   ┌─┴─┐  ┌──────┐│    │  Auth Check │
                  │Neon│  │Upstash││    │  Geo-route  │
                  │ DB │  │Redis  ││    │  Rate-limit │
                  └────┘  └──────┘│    └─────────────┘
                          ┌──────┐│
                          │  S3  ││
                          │Blob  ││
                          └──────┘│
                                  │
```

```typescript
// next.config.ts — Vercel-optimized configuration
import type { NextConfig } from "next";

const config: NextConfig = {
  // Static assets served from Vercel Edge Network (CDN)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.example.com" },
    ],
    // Vercel Image Optimization — resize, convert to WebP at the edge
    formats: ["image/avif", "image/webp"],
  },

  // Headers for CDN caching
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        // Immutable static assets — cache forever
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default config;
```

```typescript
// middleware.ts — runs at the edge, before serverless functions
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Auth check at the edge — reject unauthorized requests instantly
  const token = request.cookies.get("session")?.value;
  if (request.nextUrl.pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Geo-based routing
  const country = request.geo?.country ?? "US";
  if (country === "DE" && !request.nextUrl.pathname.startsWith("/de")) {
    return NextResponse.redirect(new URL(`/de${request.nextUrl.pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### 2. AWS Architecture — Lambda + API Gateway + DynamoDB

A serverless architecture on AWS for an event-driven API with infrastructure defined in CDK.

```typescript
// lib/api-stack.ts — AWS CDK infrastructure
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table — on-demand billing, scales automatically
    const table = new dynamodb.Table(this, "ItemsTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add GSI for query patterns
    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });

    // S3 bucket for file storage
    const bucket = new s3.Bucket(this, "AssetsBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        { expiration: cdk.Duration.days(90), prefix: "tmp/" },
      ],
    });

    // Lambda function
    const handler = new lambda.Function(this, "ApiHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions
    table.grantReadWriteData(handler);
    bucket.grantReadWrite(handler);

    // API Gateway
    const api = new apigateway.RestApi(this, "Api", {
      restApiName: "Items API",
      deployOptions: {
        stageName: "v1",
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
    });

    const items = api.root.addResource("items");
    items.addMethod("GET", new apigateway.LambdaIntegration(handler));
    items.addMethod("POST", new apigateway.LambdaIntegration(handler));

    const item = items.addResource("{id}");
    item.addMethod("GET", new apigateway.LambdaIntegration(handler));
    item.addMethod("PUT", new apigateway.LambdaIntegration(handler));
    item.addMethod("DELETE", new apigateway.LambdaIntegration(handler));

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "CDN", {
      defaultBehavior: {
        origin: new origins.RestApiOrigin(api),
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        "/static/*": {
          origin: new origins.S3Origin(bucket),
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
    });

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    new cdk.CfnOutput(this, "CDNUrl", { value: `https://${distribution.domainName}` });
  }
}
```

### 3. Cloudflare Workers Edge Computing

An edge-first API using Cloudflare Workers with KV storage and D1 database.

```typescript
// src/worker.ts — Cloudflare Worker
export interface Env {
  CACHE: KVNamespace;
  DB: D1Database;
  RATE_LIMITER: RateLimit;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Rate limiting at the edge
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return new Response("Rate limited", { status: 429 });
    }

    // Route handling
    if (url.pathname === "/api/products" && request.method === "GET") {
      return handleGetProducts(request, env);
    }

    if (url.pathname.startsWith("/api/products/") && request.method === "GET") {
      const id = url.pathname.split("/").pop();
      return handleGetProduct(id!, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleGetProducts(request: Request, env: Env): Promise<Response> {
  // Check KV cache first
  const cached = await env.CACHE.get("products:all", "json");
  if (cached) {
    return Response.json(cached, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "X-Cache": "HIT",
      },
    });
  }

  // Query D1 database at the edge
  const { results } = await env.DB.prepare(
    "SELECT id, name, price, category FROM products WHERE active = 1 ORDER BY name LIMIT 100"
  ).all();

  // Cache in KV for 5 minutes
  await env.CACHE.put("products:all", JSON.stringify(results), {
    expirationTtl: 300,
  });

  return Response.json(results, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Cache": "MISS",
    },
  });
}

async function handleGetProduct(id: string, env: Env): Promise<Response> {
  const cached = await env.CACHE.get(`products:${id}`, "json");
  if (cached) {
    return Response.json(cached, {
      headers: { "X-Cache": "HIT" },
    });
  }

  const product = await env.DB.prepare(
    "SELECT * FROM products WHERE id = ? AND active = 1"
  ).bind(id).first();

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  await env.CACHE.put(`products:${id}`, JSON.stringify(product), {
    expirationTtl: 300,
  });

  return Response.json(product, {
    headers: { "X-Cache": "MISS" },
  });
}
```

```toml
# wrangler.toml — Cloudflare Workers configuration
name = "api"
main = "src/worker.ts"
compatibility_date = "2024-12-01"

[[kv_namespaces]]
binding = "CACHE"
id = "abc123"

[[d1_databases]]
binding = "DB"
database_name = "production"
database_id = "def456"

[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "0"
simple = { limit = 100, period = 60 }

[env.staging]
name = "api-staging"

[[env.staging.kv_namespaces]]
binding = "CACHE"
id = "staging-abc123"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "staging"
database_id = "staging-def456"
```

### 4. Multi-Region Failover Configuration

DNS-based failover using Cloudflare with health checks for automatic region switching.

```typescript
// infrastructure/failover.ts — Multi-region failover configuration
// This would be implemented via Cloudflare API or Terraform

interface RegionConfig {
  name: string;
  endpoint: string;
  healthCheckPath: string;
  priority: number;
}

const regions: RegionConfig[] = [
  {
    name: "us-east",
    endpoint: "us-east.api.example.com",
    healthCheckPath: "/api/health",
    priority: 1, // Primary
  },
  {
    name: "eu-west",
    endpoint: "eu-west.api.example.com",
    healthCheckPath: "/api/health",
    priority: 2, // Secondary
  },
];

// Health check implementation — runs in each region
// GET /api/health
export async function healthCheck(db: Database, redis: Cache): Promise<Response> {
  const checks: Record<string, { status: string; latencyMs: number }> = {};
  let healthy = true;

  // Database check
  const dbStart = Date.now();
  try {
    await db.query("SELECT 1");
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "error", latencyMs: Date.now() - dbStart };
    healthy = false;
  }

  // Cache check
  const cacheStart = Date.now();
  try {
    await redis.ping();
    checks.cache = { status: "ok", latencyMs: Date.now() - cacheStart };
  } catch {
    checks.cache = { status: "error", latencyMs: Date.now() - cacheStart };
    healthy = false;
  }

  return Response.json(
    {
      status: healthy ? "healthy" : "degraded",
      region: process.env.REGION,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
```

```hcl
# terraform/cloudflare-failover.tf — DNS-based failover
resource "cloudflare_load_balancer" "api" {
  zone_id          = var.cloudflare_zone_id
  name             = "api.example.com"
  fallback_pool_id = cloudflare_load_balancer_pool.us_east.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.us_east.id,
    cloudflare_load_balancer_pool.eu_west.id,
  ]
  steering_policy = "geo"

  region_pools {
    region = "WNAM"  # Western North America
    pool_ids = [cloudflare_load_balancer_pool.us_east.id]
  }
  region_pools {
    region = "ENAM"  # Eastern North America
    pool_ids = [cloudflare_load_balancer_pool.us_east.id]
  }
  region_pools {
    region = "WEU"  # Western Europe
    pool_ids = [cloudflare_load_balancer_pool.eu_west.id]
  }
}

resource "cloudflare_load_balancer_pool" "us_east" {
  name = "us-east-pool"
  origins {
    name    = "us-east-origin"
    address = "us-east.api.example.com"
    enabled = true
  }
  notification_email = "ops@example.com"
  monitor            = cloudflare_load_balancer_monitor.health.id
}

resource "cloudflare_load_balancer_pool" "eu_west" {
  name = "eu-west-pool"
  origins {
    name    = "eu-west-origin"
    address = "eu-west.api.example.com"
    enabled = true
  }
  notification_email = "ops@example.com"
  monitor            = cloudflare_load_balancer_monitor.health.id
}

resource "cloudflare_load_balancer_monitor" "health" {
  type             = "https"
  expected_body    = "healthy"
  expected_codes   = "200"
  method           = "GET"
  timeout          = 5
  retries          = 2
  interval         = 60
  path             = "/api/health"
  description      = "API Health Check"
  allow_insecure   = false
  follow_redirects = true
}
```

---

## Common Mistakes

### 1. Over-Provisioning Resources

**Wrong:** Running `m5.4xlarge` instances (16 vCPU, 64 GB RAM) for an API that uses 2% CPU and 1 GB RAM. Paying $500/month for $30 worth of compute.

**Fix:** Start small and scale up based on actual utilization. Use burstable instances (`t3.medium`) for variable workloads. Monitor CPU and memory for a week before sizing. Use auto-scaling instead of over-provisioning for peak capacity.

### 2. No Cost Alerts

**Wrong:** Discovering a $15,000 AWS bill because a misconfigured auto-scaling group spun up 200 instances and nobody noticed for two weeks.

**Fix:** Set billing alerts on day one. AWS Budgets, GCP Billing Alerts, or third-party tools. Alert at 50% (awareness), 80% (investigate), and 100% (act immediately). Set a hard spending limit if your provider supports it.

### 3. Ignoring Cold Starts

**Wrong:** Using Lambda for a latency-sensitive API endpoint without accounting for cold starts. Users experience 3-second response times on the first request after idle periods.

**Fix:** Understand cold start characteristics for your platform. Use provisioned concurrency for critical paths. Keep function bundles small. Use edge functions (which have minimal cold starts) for latency-sensitive logic. Consider containers for APIs that need consistent sub-100ms response times.

### 4. No CDN for Static Assets

**Wrong:** Serving JavaScript bundles, CSS files, images, and fonts directly from your origin server. Every user in every geography hits your single-region backend for assets that never change.

**Fix:** Put a CDN in front of everything static. Most hosting platforms (Vercel, Netlify, Cloudflare Pages) include CDN by default. For custom infrastructure, add CloudFront, Cloudflare, or Fastly. Set long cache TTLs with content-hash filenames for immutable caching.

### 5. Single-Region Everything

**Wrong:** Running your entire production infrastructure in `us-east-1` with no failover. When the region has an outage (it has happened multiple times), your application is completely offline.

**Fix:** At minimum, ensure your database has cross-region read replicas and your backups are stored in a different region. Use a CDN for static content (inherently multi-region). For critical applications, implement active-passive failover with DNS health checks.

### 6. Not Using Managed Databases

**Wrong:** Running PostgreSQL on an EC2 instance with manual backups, no replication, and prayer-based disaster recovery. Spending weekends patching the database server instead of building features.

**Fix:** Use a managed database service (RDS, Cloud SQL, Neon, PlanetScale, Supabase). Automated backups, replication, failover, and patches are included. The 20–30% cost premium over self-hosted pays for itself in operational time saved.

### 7. Manual Scaling

**Wrong:** Manually SSH-ing into a server to restart services or manually adjusting instance counts through the cloud console based on Slack alerts from users complaining about slow performance.

**Fix:** Implement auto-scaling with appropriate metrics (CPU, request count, queue depth). Define scaling policies in code (Terraform, CDK, Pulumi). Set up alerts that fire before users notice degradation. Test scaling behavior under simulated load.

### 8. Ignoring Egress Costs

**Wrong:** Transferring 10 TB of data per month between regions or out of the cloud without realizing egress costs $0.09/GB. Monthly surprise: $900 just in data transfer.

**Fix:** Keep data processing within the same region and availability zone. Use a CDN to cache responses at the edge instead of hitting your origin for every request. Compress responses. Use VPC endpoints for AWS service-to-service communication (no egress charges). Monitor data transfer as a cost category.

---

> **See also:** [CICD](../CICD/cicd.md) | [Docker-Containers](../Docker-Containers/docker-containers.md) | [Monitoring-Logging](../Monitoring-Logging/monitoring-logging.md) | [Infrastructure-as-Code](../Infrastructure-as-Code/infrastructure-as-code.md) | [Backend/Serverless-Edge](../../Backend/Serverless-Edge/serverless-edge.md) | [Backend/Caching-Strategies](../../Backend/Caching-Strategies/caching-strategies.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
