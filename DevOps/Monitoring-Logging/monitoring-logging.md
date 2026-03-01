# Observability, Alerting & APM

> Structured logging, metrics, distributed tracing, alert design, SLOs and SLIs, dashboards, incident response, and cost-effective observability — every signal from your production systems.

---

## Principles

### 1. The Three Pillars of Observability

Observability is not monitoring with a fancier name. Monitoring tells you when something is broken. Observability tells you why. The three pillars — logs, metrics, and traces — work together to give you full visibility into your production systems.

**Logs** — discrete events with context. "User 42 failed to authenticate at 14:32:01 because the session token was expired." Logs answer "what happened?"

**Metrics** — numeric measurements over time. "HTTP request latency p99 is 450ms. Error rate is 0.3%. CPU utilization is 72%." Metrics answer "how is the system performing?"

**Traces** — the journey of a single request through your distributed system. "This API call took 340ms total: 5ms in middleware, 12ms in auth, 280ms in database query, 43ms in serialization." Traces answer "where is the bottleneck?"

Each pillar alone is insufficient. Logs without metrics means you drown in noise without knowing what matters. Metrics without traces means you know something is slow but not where. Traces without logs means you see the journey but not the details of what went wrong at each step.

**The practical stack:**

- **Logs** — Pino (Node.js), structured JSON, shipped to a log aggregator (Datadog, Grafana Loki, AWS CloudWatch)
- **Metrics** — Prometheus, StatsD, or Datadog agent collecting counters, gauges, and histograms
- **Traces** — OpenTelemetry SDK auto-instrumenting HTTP, database, and cache calls, exported to Jaeger, Tempo, or Datadog APM

### 2. Structured Logging

Unstructured logs are text blobs that are impossible to search, filter, or aggregate at scale. Structured logs are JSON objects with consistent fields that machines can parse and humans can query.

**Unstructured (useless at scale):**

```text
[2026-03-01 14:32:01] ERROR: Failed to process payment for user john@example.com - timeout after 30s
```

**Structured (queryable, filterable, aggregatable):**

```json
{
  "level": "error",
  "timestamp": "2026-03-01T14:32:01.234Z",
  "message": "Payment processing failed",
  "service": "payment-api",
  "traceId": "abc123def456",
  "requestId": "req-789",
  "userId": "user-42",
  "error": {
    "type": "TimeoutError",
    "message": "Gateway timeout after 30000ms",
    "provider": "stripe"
  },
  "duration": 30012
}
```

**Rules for structured logging:**

- Use JSON format — every log aggregator parses it natively
- Include a `traceId` or `requestId` in every log for correlation
- Use consistent field names across all services (`userId`, not `user_id` in one service and `uid` in another)
- Log at appropriate levels: `error` for failures requiring attention, `warn` for degraded but functional, `info` for significant business events, `debug` for development only
- Never log sensitive data: passwords, tokens, credit card numbers, personal health information
- Include enough context to debug without reproducing — the request parameters, the error type, the duration, the service name

### 3. Alert Fatigue Prevention

If your team gets 50 alerts a day and ignores 48 of them, you do not have alerting — you have noise. Every alert that does not require human action trains your team to ignore alerts, including the one that matters.

**Alert design principles:**

- **Alert on symptoms, not causes** — alert on "error rate > 1% for 5 minutes," not "database CPU > 80%." Users care about errors, not CPU.
- **Alert on SLO burn rate** — if your SLO is 99.9% availability (43 minutes of downtime per month), alert when you are burning through your error budget faster than expected.
- **Require action** — every alert must have a runbook. If the response is "check the dashboard and decide if it matters," it should not be an alert.
- **Use severity levels** — `critical` (pages on-call, requires immediate response), `warning` (creates a ticket, investigate during business hours), `info` (logged, no notification).
- **Set appropriate windows** — a 1-minute spike is not an alert. A 5-minute sustained degradation is. Avoid alerting on transient anomalies.

**Reducing noise:**

- Merge related alerts — 10 failing health checks from the same service should be 1 alert, not 10
- Auto-resolve alerts when the condition clears
- Review alert frequency monthly — if an alert fires more than 5 times without action, either fix the underlying issue or remove the alert
- Keep a pager rotation — one person is on-call, not the entire team

### 4. SLOs, SLIs, and SLAs

SLOs (Service Level Objectives) define the reliability target your team commits to. They are the foundation of every alerting and incident response decision.

**SLI (Service Level Indicator)** — the metric you measure. "The proportion of successful HTTP requests" or "The proportion of requests served within 200ms."

**SLO (Service Level Objective)** — the target for the SLI. "99.9% of requests succeed" or "95% of requests complete within 200ms."

**SLA (Service Level Agreement)** — the contractual commitment to customers, usually less ambitious than the SLO. If your SLO is 99.9%, your SLA might be 99.5% with penalties for breach.

**Error budget:**

- A 99.9% SLO means you can tolerate 43 minutes of downtime per month
- Track error budget consumption in real-time
- When the budget is nearly exhausted, freeze feature deployments and focus on reliability
- When the budget is healthy, deploy aggressively — you have room for risk

**Choosing SLOs:**

- Start with 99.9% for user-facing services — this is 8.7 hours of downtime per year
- Use 99.95% or 99.99% only if the business truly requires it — the engineering cost increases exponentially
- Internal tools can have lower SLOs (99%, 99.5%)
- Batch processing SLOs should be based on throughput and freshness, not latency

### 5. Distributed Tracing

In a monolith, a slow request is easy to profile. In a microservices or serverless architecture, a single user request might touch 5–10 services. Without distributed tracing, debugging performance issues across service boundaries is guesswork.

**How it works:**

1. The first service (usually an API gateway or edge function) generates a trace ID
2. The trace ID is propagated through every downstream service call via HTTP headers (`traceparent`, `X-Trace-Id`)
3. Each service records spans — named, timed operations within the trace (database query, cache lookup, external API call)
4. Spans are exported to a tracing backend (Jaeger, Tempo, Datadog APM) where the full request journey is visualized

**OpenTelemetry** is the standard. It provides vendor-neutral instrumentation for HTTP, database, and cache operations. Auto-instrumentation means you add the SDK once and get tracing for Express, Fastify, Prisma, Redis, and HTTP clients without modifying application code.

**When to trace:**

- Every HTTP request to your API
- Cross-service calls (service A calling service B)
- Database queries (especially slow ones)
- External API calls (Stripe, SendGrid, etc.)
- Queue message processing

**When NOT to trace (for cost):**

- Health check endpoints
- Static asset serving
- High-volume internal polling (heartbeats)
- Use sampling (10–20% of traces) in high-traffic services to control cost

### 6. Log Aggregation and Retention

Logs are useless if they sit on individual server disks. Centralized log aggregation collects logs from all services into a single searchable system.

**Log pipeline:**

1. Application writes structured JSON to stdout
2. Container runtime / log agent collects stdout
3. Log shipper (Fluentd, Vector, Datadog agent) forwards to aggregator
4. Aggregator indexes and stores logs (Grafana Loki, Elasticsearch, Datadog, CloudWatch)
5. Engineers query logs through a UI or API

**Retention strategy:**

- **Hot storage** (fast queries, expensive) — last 7–14 days. This covers active debugging and incident response.
- **Warm storage** (slower queries, cheaper) — 30–90 days. Covers post-incident reviews and trend analysis.
- **Cold storage** (archive, cheapest) — 1–7 years. Compliance requirements, audit trails. Store in S3/GCS with lifecycle policies.

**Cost control:**

- Log only what you need — do not log every request body in production
- Use log levels appropriately — `debug` logs should never reach production aggregators
- Sample verbose logs — log 10% of successful requests, 100% of errors
- Set up log-based alerts instead of storing everything — alert on patterns, then increase verbosity when investigating

### 7. Dashboards That Matter

A dashboard with 50 panels is not a dashboard — it is a wall of noise. Good dashboards are designed for specific audiences and answer specific questions.

**Dashboard types:**

- **Service health dashboard** — the first thing you look at during an incident. Shows error rate, latency (p50, p95, p99), request rate, and saturation (CPU, memory, connections). One dashboard per service. USE method (Utilization, Saturation, Errors) or RED method (Rate, Errors, Duration).
- **Business metrics dashboard** — shows what the business cares about. Sign-ups, conversions, revenue, active users. Updated in real-time or near-real-time.
- **Infrastructure dashboard** — CPU, memory, disk, network across all hosts/containers. Useful for capacity planning, not incident response.
- **On-call dashboard** — current alerts, error budget burn rate, recent deploys, and quick links to runbooks.

**Dashboard rules:**

- Every panel must answer a question — if you cannot articulate what question a panel answers, remove it
- Use consistent time ranges across panels — 1 hour for incident response, 24 hours for daily review, 7 days for trend analysis
- Include deployment markers — overlay deploy timestamps on metric graphs to correlate changes with impact
- Link dashboards to runbooks — clicking on a degraded metric should lead to investigation steps
- Review dashboards quarterly — remove panels nobody looks at, add panels for new failure modes

### 8. Incident Response

When production breaks, every minute of confusion costs money and trust. A clear incident response process reduces resolution time from hours to minutes.

**Incident workflow:**

1. **Detect** — alert fires or user reports an issue
2. **Triage** — determine severity. Is this affecting users? How many? Is there a workaround?
3. **Assemble** — page the on-call engineer. For SEV-1, establish a war room (Slack channel, video call)
4. **Investigate** — check dashboards, recent deploys, error logs, traces. Was there a recent change?
5. **Mitigate** — stop the bleeding. Rollback, feature flag, scale up, failover. Mitigation first, root cause later.
6. **Communicate** — update the status page. Notify affected customers. Keep stakeholders informed every 15–30 minutes.
7. **Resolve** — confirm the issue is fixed. Monitor for recurrence.
8. **Post-mortem** — blameless review within 48 hours. Document what happened, why, and what will prevent it from recurring.

**Severity levels:**

| Level | Impact | Response Time | Example |
|-------|--------|--------------|---------|
| SEV-1 | Service down, all users affected | Immediate, page on-call | Complete outage, data corruption |
| SEV-2 | Degraded service, many users affected | 15 minutes | Partial outage, significant latency |
| SEV-3 | Minor impact, some users affected | 1 hour | Single feature broken, minor errors |
| SEV-4 | No user impact, internal issue | Next business day | Elevated error rate in logging, CI broken |

### 9. Uptime and Synthetic Monitoring

Internal health checks tell you if the service thinks it is healthy. External synthetic monitoring tells you if users can actually reach it.

**Synthetic monitoring checks:**

- **Uptime checks** — hit your public endpoints every 30–60 seconds from multiple geographic locations. If all locations report failure, it is you, not the network.
- **Transaction monitoring** — automated scripts that simulate user flows (login, add to cart, checkout). These catch issues that simple health checks miss.
- **SSL certificate monitoring** — alert 30 days before certificate expiration. Expired certificates cause complete outages.
- **DNS monitoring** — verify DNS records resolve correctly. DNS misconfigurations can redirect traffic to the wrong server.

**Tools:** Checkly, Better Uptime, Pingdom, UptimeRobot, or Cloudflare health checks.

**Rules:**

- Monitor from at least 3 geographic locations
- Set alert thresholds at 2+ consecutive failures (avoid transient false positives)
- Include synthetic monitoring in your SLO measurement — if users cannot reach you, it is downtime regardless of what your internal checks say
- Monitor critical third-party dependencies (payment providers, auth providers) separately

### 10. Cost-Effective Observability

Observability costs scale with data volume. Without discipline, your monitoring bill will exceed your infrastructure bill. The goal is maximum insight per dollar, not maximum data.

**Cost drivers:**

- **Log volume** — the biggest cost driver. Every log line costs money to ingest, index, and store. A single verbose loop logging at 1,000 lines/second costs more than your database.
- **Metric cardinality** — the number of unique time series. A metric with labels `{userId, endpoint, statusCode}` explodes combinatorially. 10,000 users x 100 endpoints x 10 status codes = 10 million time series.
- **Trace sampling** — tracing every request in a high-traffic service is prohibitively expensive. Sample 10–20% and trace 100% of errors.
- **Retention** — keeping 90 days of full-resolution logs is 9x more expensive than 10 days. Use tiered retention.

**Optimization strategies:**

- Drop debug-level logs before they reach the aggregator
- Use log sampling for high-volume, low-value events (health checks, successful auth)
- Avoid high-cardinality metric labels — never use user IDs, request IDs, or email addresses as metric labels
- Set retention tiers: 7 days hot, 30 days warm, archive beyond that
- Evaluate your observability vendor annually — Datadog, Grafana Cloud, and New Relic have dramatically different pricing models depending on your data shape
- Consider open-source stacks (Grafana + Loki + Tempo + Prometheus) to avoid per-GB ingestion costs

---

## LLM Instructions

### When Setting Up Monitoring

When asked to set up monitoring or observability:

- Default to OpenTelemetry for instrumentation — it is vendor-neutral and works with all major backends
- Use Pino for Node.js structured logging — it is the fastest JSON logger
- Recommend the RED method for service dashboards: Rate (requests/sec), Errors (error rate), Duration (latency distribution)
- Include health check endpoints that verify database and cache connectivity
- Set up both internal health checks and external synthetic monitoring
- Always include deployment markers on metric dashboards
- Recommend Grafana Cloud or Datadog for managed observability, with open-source self-hosted as a cost-saving alternative

### When Configuring Alerts

When asked to create alerting rules:

- Alert on symptoms (error rate, latency), not causes (CPU, memory)
- Use multi-window burn rate alerting for SLO-based alerts
- Set appropriate evaluation windows — 5 minutes minimum to avoid transient spikes
- Include a severity level with every alert
- Require a runbook link for every alert
- Group related alerts to prevent notification storms
- Auto-resolve alerts when the condition clears
- Default to Slack/email for warnings, PagerDuty/Opsgenie for critical alerts

### When Implementing Structured Logging

When asked to add logging:

- Use Pino with JSON format for Node.js applications
- Include `traceId`, `requestId`, `service`, `level`, `timestamp`, and `message` in every log entry
- Use `AsyncLocalStorage` to propagate request context (trace ID, user ID) without passing it through every function
- Log at appropriate levels: `error` for failures, `warn` for degraded states, `info` for business events, `debug` for development
- Never log passwords, tokens, API keys, credit card numbers, or PII
- Redact sensitive fields using Pino redact paths
- Write to stdout — let the container runtime handle log collection

### When Designing Dashboards

When asked to create dashboards:

- Create one service health dashboard per service using RED method (Rate, Errors, Duration)
- Include p50, p95, and p99 latency — averages hide tail latency problems
- Add deployment event overlays to correlate changes with metric shifts
- Keep dashboards to 6–8 panels maximum — one screen, no scrolling
- Use consistent color coding: green = healthy, yellow = warning, red = critical
- Include links to related dashboards and runbooks in panel descriptions
- Recommend Grafana for self-hosted, Datadog for managed

### When Setting Up Distributed Tracing

When asked to implement tracing:

- Use OpenTelemetry SDK with auto-instrumentation for the application framework
- Propagate trace context via W3C `traceparent` header
- Export traces to Jaeger (self-hosted), Grafana Tempo (open-source), or Datadog APM (managed)
- Add custom spans for business-critical operations
- Sample traces at 10–20% for high-traffic services, 100% for low-traffic
- Always trace 100% of error responses regardless of sampling rate
- Exclude health check and readiness probe endpoints from tracing

---

## Examples

### 1. Structured Logging Setup with Correlation IDs

A complete logging configuration with Pino, request context propagation using AsyncLocalStorage, and redaction of sensitive fields.

```typescript
// lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "secret",
      "creditCard",
      "ssn",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

```typescript
// lib/request-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

interface RequestContext {
  requestId: string;
  traceId: string;
  userId?: string;
  startTime: number;
}

export const requestStore = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(
  traceId?: string,
  userId?: string
): RequestContext {
  return {
    requestId: randomUUID(),
    traceId: traceId ?? randomUUID(),
    userId,
    startTime: Date.now(),
  };
}

export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore();
}
```

```typescript
// middleware/logging.ts — Express middleware
import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { requestStore, createRequestContext } from "../lib/request-context";

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const traceId = req.headers["x-trace-id"] as string | undefined;
  const context = createRequestContext(traceId);

  requestStore.run(context, () => {
    // Log request start
    logger.info({
      msg: "Request started",
      requestId: context.requestId,
      traceId: context.traceId,
      method: req.method,
      path: req.path,
      userAgent: req.headers["user-agent"],
    });

    // Log response on finish
    res.on("finish", () => {
      const duration = Date.now() - context.startTime;
      const logData = {
        msg: "Request completed",
        requestId: context.requestId,
        traceId: context.traceId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      };

      if (res.statusCode >= 500) {
        logger.error(logData);
      } else if (res.statusCode >= 400) {
        logger.warn(logData);
      } else {
        logger.info(logData);
      }
    });

    next();
  });
}
```

```typescript
// Usage in application code — context is automatic
import { logger } from "../lib/logger";
import { getRequestContext } from "../lib/request-context";

export async function processOrder(orderId: string) {
  const ctx = getRequestContext();

  logger.info({
    msg: "Processing order",
    requestId: ctx?.requestId,
    traceId: ctx?.traceId,
    orderId,
  });

  try {
    // ... process order
    logger.info({
      msg: "Order processed successfully",
      requestId: ctx?.requestId,
      traceId: ctx?.traceId,
      orderId,
    });
  } catch (error) {
    logger.error({
      msg: "Order processing failed",
      requestId: ctx?.requestId,
      traceId: ctx?.traceId,
      orderId,
      err: error,
    });
    throw error;
  }
}
```

### 2. Prometheus Alerting Rules with SLO-Based Burn Rate

Alerting configuration using Prometheus rules with multi-window burn rate for SLO violation detection.

```yaml
# prometheus/rules/slo-alerts.yml
groups:
  - name: slo-alerts
    rules:
      # Error rate SLO: 99.9% success rate (0.1% error budget)
      # Multi-window burn rate alerting

      # Fast burn: consuming 14.4x error budget (exhausts in 1 hour)
      # Alert after 2 minutes of sustained fast burn
      - alert: HighErrorBurnRate_Critical
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > (14.4 * 0.001)
          and
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) > (14.4 * 0.001)
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error burn rate — SLO at risk"
          description: >
            Error rate is {{ $value | humanizePercentage }} which exceeds
            14.4x the error budget. At this rate, the monthly error budget
            will be exhausted in less than 1 hour.
          runbook: "https://wiki.example.com/runbooks/high-error-rate"

      # Slow burn: consuming 3x error budget (exhausts in 10 days)
      # Alert after 30 minutes of sustained slow burn
      - alert: HighErrorBurnRate_Warning
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[30m]))
            /
            sum(rate(http_requests_total[30m]))
          ) > (3 * 0.001)
          and
          (
            sum(rate(http_requests_total{status=~"5.."}[6h]))
            /
            sum(rate(http_requests_total[6h]))
          ) > (3 * 0.001)
        for: 30m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Elevated error burn rate"
          description: >
            Error rate has been elevated for 30+ minutes. At this rate,
            the monthly error budget will be exhausted in ~10 days.
          runbook: "https://wiki.example.com/runbooks/elevated-error-rate"

      # Latency SLO: 95% of requests under 200ms
      - alert: HighLatency_Critical
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 0.5
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "p95 latency exceeds 500ms"
          description: >
            95th percentile latency is {{ $value | humanizeDuration }}.
            Target is 200ms. Investigate slow endpoints.
          runbook: "https://wiki.example.com/runbooks/high-latency"

  - name: infrastructure-alerts
    rules:
      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes > 0.9
        for: 10m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "Memory usage above 90%"
          description: >
            Instance {{ $labels.instance }} memory usage is
            {{ $value | humanizePercentage }} for 10+ minutes.

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}
          / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Disk space below 10%"
          description: >
            Instance {{ $labels.instance }} has less than 10% disk space
            remaining on {{ $labels.mountpoint }}.
```

### 3. OpenTelemetry Distributed Tracing Setup

Complete OpenTelemetry auto-instrumentation for a Node.js application with custom spans and trace export.

```typescript
// instrumentation.ts — load BEFORE application code
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME ?? "api",
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION ?? "unknown",
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV ?? "development",
  }),

  // Trace exporter — sends to OTLP-compatible backend
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
  }),

  // Metric exporter
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 30000,
  }),

  // Sample 20% of traces in production, 100% in development
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(
      process.env.NODE_ENV === "production" ? 0.2 : 1.0
    ),
  }),

  // Auto-instrument HTTP, Express, database clients, etc.
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        // Ignore health check endpoints
        ignoreIncomingRequestHook: (request) => {
          return request.url === "/api/health" || request.url === "/ready";
        },
      },
      "@opentelemetry/instrumentation-fs": {
        enabled: false, // Too noisy
      },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

```typescript
// lib/tracing.ts — custom span helpers
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("app");

// Wrap any async function in a traced span
export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number>,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Usage in application code
export async function processPayment(orderId: string, amount: number) {
  return withSpan(
    "payment.process",
    { "order.id": orderId, "payment.amount": amount },
    async () => {
      // This span is automatically a child of the current trace
      const charge = await withSpan(
        "stripe.charge.create",
        { "payment.provider": "stripe" },
        async () => {
          // Stripe API call — auto-instrumented HTTP client adds its own span
          return stripe.charges.create({ amount, currency: "usd" });
        }
      );

      await withSpan(
        "order.update_status",
        { "order.id": orderId, "order.status": "paid" },
        async () => {
          await db.order.update({
            where: { id: orderId },
            data: { status: "paid", chargeId: charge.id },
          });
        }
      );

      return charge;
    }
  );
}
```

### 4. Incident Response Runbook Template

A structured template for incident response that teams can customize per alert.

```markdown
# Runbook: High Error Rate (API)

## Alert
- **Name:** HighErrorBurnRate_Critical
- **Severity:** Critical (pages on-call)
- **Condition:** Error rate exceeds 14.4x SLO burn rate for 2+ minutes

## Triage (2 minutes)

1. Open the [API Service Dashboard](https://grafana.example.com/d/api-service)
2. Check error rate panel — is the spike sustained or transient?
3. Check the [Recent Deploys Dashboard](https://grafana.example.com/d/deploys) — was there a deployment in the last 30 minutes?
4. Check [Status Page](https://status.example.com) — is a dependency down?

## Investigation (5 minutes)

1. Check error logs filtered by the current time window:
   ```
   Query: level="error" service="api" | last 15 minutes
   ```
2. Look for patterns: same endpoint? Same error type? Same user segment?
3. Check traces for failed requests — where in the request lifecycle is the failure?
4. Check downstream dependencies:
   - Database: [DB Dashboard](https://grafana.example.com/d/postgres)
   - Redis: [Cache Dashboard](https://grafana.example.com/d/redis)
   - Third-party APIs: [External API Dashboard](https://grafana.example.com/d/external)

## Mitigation

### If caused by a recent deployment:
1. Rollback: `gh workflow run rollback.yml -f version=PREVIOUS_SHA`
2. Verify error rate returns to normal within 5 minutes
3. Create an incident ticket for investigation

### If caused by a downstream dependency:
1. Enable circuit breaker / fallback if available
2. Check dependency status page
3. Consider failover to backup service if available

### If caused by traffic spike:
1. Check if traffic is legitimate or an attack
2. If legitimate: scale up (`kubectl scale deployment api --replicas=10`)
3. If attack: enable rate limiting, block IPs at CDN level

## Communication
- Update #incidents Slack channel with current status
- If SEV-1: update status page within 15 minutes
- Notify stakeholders every 30 minutes until resolved

## Post-Incident
- Schedule blameless post-mortem within 48 hours
- Document: timeline, root cause, impact, action items
- Template: [Post-Mortem Template](https://wiki.example.com/post-mortem-template)
```

---

## Common Mistakes

### 1. Logging Sensitive Data

**Wrong:**

```typescript
logger.info({
  msg: "User login",
  email: user.email,
  password: req.body.password,  // NEVER log passwords
  token: session.token,          // NEVER log session tokens
  creditCard: payment.cardNumber, // NEVER log payment data
});
```

**Fix:** Redact sensitive fields. Log identifiers (user ID) instead of PII (email). Use Pino's built-in redaction to catch accidental leaks.

```typescript
logger.info({
  msg: "User login",
  userId: user.id,
  // No password, no token, no PII
});
```

### 2. Alerting on Everything

**Wrong:** 50 alerts configured for every possible metric threshold. The team gets 30 notifications a day, ignores all of them, and misses the real outage.

**Fix:** Alert on symptoms that affect users (error rate, latency), not infrastructure metrics (CPU, memory) unless they are genuinely actionable. Every alert must have a runbook. If an alert fires and the response is "ignore it," delete the alert.

### 3. No Correlation IDs

**Wrong:** Logs from different services have no way to be linked. When a user reports an issue, you manually search logs by timestamp and pray.

**Fix:** Generate a request ID at the entry point and propagate it through every service call and log entry. Use `AsyncLocalStorage` to avoid passing the ID through every function signature.

### 4. Unstructured Log Formats

**Wrong:**

```text
2026-03-01 14:32:01 [ERROR] PaymentService - Payment failed for user john@example.com: timeout
```

This cannot be parsed, filtered, or aggregated by log management tools without custom regex.

**Fix:** Use structured JSON logs with consistent field names. Every log aggregator parses JSON natively.

```json
{"level":"error","timestamp":"2026-03-01T14:32:01Z","service":"payment","msg":"Payment failed","userId":"user-42","error":"timeout"}
```

### 5. Dashboard Overload

**Wrong:** A single dashboard with 40 panels covering every metric from CPU to cache hit ratio to deployment frequency. Nobody uses it because finding the relevant panel takes longer than debugging the issue.

**Fix:** Create focused dashboards for specific audiences. One service health dashboard (6–8 panels) per service. One business metrics dashboard. One on-call dashboard. If a panel has not been looked at in a month, remove it.

### 6. No Log Retention Policy

**Wrong:** Storing every log at full resolution indefinitely. Three months later, the observability bill is $5,000/month and climbing.

**Fix:** Define retention tiers. 7–14 days at full resolution for active debugging. 30–90 days compressed for trend analysis. Archive to cold storage (S3) for compliance. Drop debug-level logs before they reach the aggregator.

### 7. Monitoring Only Happy Paths

**Wrong:** Dashboards show request rate and average latency. Everything looks green. Meanwhile, 2% of users are getting 500 errors and the p99 latency is 8 seconds.

**Fix:** Monitor error rates, not just success rates. Show p95 and p99 latency, not just p50 or averages. Include error categorization (4xx vs 5xx, by endpoint, by error type). Set up synthetic monitoring that exercises critical user flows end-to-end.

### 8. High-Cardinality Metric Labels

**Wrong:**

```typescript
// This creates a unique time series for every user
metrics.counter("api.requests", { userId: user.id, endpoint: req.path });
// 100,000 users × 50 endpoints = 5 million time series = massive bill
```

**Fix:** Use low-cardinality labels only: HTTP method, status code class (2xx/4xx/5xx), endpoint pattern (not specific IDs), service name. Track per-user metrics in logs, not metrics.

```typescript
// Low cardinality — bounded number of time series
metrics.counter("api.requests", {
  method: req.method,
  status: String(res.statusCode),
  endpoint: req.route?.path ?? "unknown",  // "/users/:id", not "/users/42"
});
```

---

> **See also:** [CICD](../CICD/cicd.md) | [Cloud-Architecture](../Cloud-Architecture/cloud-architecture.md) | [Infrastructure-as-Code](../Infrastructure-as-Code/infrastructure-as-code.md) | [Backend/Error-Handling-Logging](../../Backend/Error-Handling-Logging/error-handling-logging.md) | [Security/Security-Testing-Monitoring](../../Security/Security-Testing-Monitoring/security-testing-monitoring.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
