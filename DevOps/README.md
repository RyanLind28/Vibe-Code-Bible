# DevOps Vibe Coding Knowledge Base

> CI/CD pipelines, containerization, cloud architecture, observability, and infrastructure as code — structured for AI-assisted development. Feed these files to your AI coding assistant to ship reliable infrastructure by default.

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack multiple files** for complex tasks — the guides cross-reference each other.
4. **Describe what you're building** and the AI now has expert-level DevOps context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| Setting up CI/CD from scratch | `CICD` + `Docker-Containers` + `Infrastructure-as-Code` |
| Deploying a containerized app | `Docker-Containers` + `CICD` + `Cloud-Architecture` |
| Designing cloud infrastructure | `Cloud-Architecture` + `Infrastructure-as-Code` + `Monitoring-Logging` |
| Adding observability to production | `Monitoring-Logging` + `CICD` + `Backend/Error-Handling-Logging` |
| Setting up infrastructure as code | `Infrastructure-as-Code` + `Cloud-Architecture` + `Security/Secrets-Environment` |
| Full production setup | `CICD` + `Docker-Containers` + `Cloud-Architecture` + `Monitoring-Logging` + `Infrastructure-as-Code` |

**Pro tip:** Start every DevOps project by pasting `CICD` + `Docker-Containers` into your AI session. These two files establish the deployment pipeline and containerization patterns that every other infrastructure decision builds on.

---

## Guides

```
DevOps/
├── CICD/                    → GitHub Actions, pipelines, deploy strategies, rollback, monorepo CI
├── Docker-Containers/       → Dockerfiles, compose, multi-stage builds, security, orchestration
├── Cloud-Architecture/      → Serverless, edge computing, CDN, multi-region, cost optimization
├── Monitoring-Logging/      → Structured logging, metrics, tracing, alerting, SLOs, incident response
└── Infrastructure-as-Code/  → Terraform, Pulumi, state management, modules, GitOps, drift detection
```

### [CI/CD Pipelines & Deploy Strategies](./CICD/cicd.md)
Pipeline-as-code philosophy, trunk-based development, fast feedback loops with parallel CI jobs, environment promotion (dev → staging → production), blue-green and canary deployments, rollback strategies, secret injection with OIDC, artifact management with git SHA tagging, branch protection and quality gates, and monorepo CI with Turborepo. Includes complete GitHub Actions workflows for CI, Docker build and push, canary deployment with automatic rollback, and monorepo selective builds.

### [Docker & Containerization](./Docker-Containers/docker-containers.md)
Immutable infrastructure mindset, minimal base images (alpine, slim, distroless), multi-stage builds for Node.js and Python, layer caching optimization, one process per container, health check implementation, security scanning and non-root execution, docker-compose for full-stack local development, container orchestration fundamentals (Cloud Run, ECS, Kubernetes), and image tagging and registry strategy. Includes production Dockerfiles, docker-compose with PostgreSQL/Redis/worker, and health check patterns for common services.

### [Cloud Architecture & Edge Computing](./Cloud-Architecture/cloud-architecture.md)
Cloud-native design principles, serverless-first evaluation framework (Lambda vs containers vs edge), edge computing for latency (Cloudflare Workers, Vercel Edge Functions), multi-region strategy (active-passive and active-active), cost optimization (right-sizing, reserved instances, spot, scale-to-zero), managed services over self-hosted, auto-scaling patterns (target tracking, step scaling, scheduled), CDN and caching layers, disaster recovery with RPO/RTO, and vendor lock-in awareness. Includes Vercel + serverless architecture, AWS CDK stack, Cloudflare Workers edge API, and multi-region failover with Terraform.

### [Observability, Alerting & APM](./Monitoring-Logging/monitoring-logging.md)
Three pillars of observability (logs, metrics, traces), structured JSON logging with Pino, alert fatigue prevention, SLOs/SLIs/SLAs and error budgets, distributed tracing with OpenTelemetry, log aggregation and retention tiers, dashboard design (RED method, USE method), incident response workflow and severity levels, synthetic monitoring and uptime checks, and cost-effective observability strategies. Includes structured logging with AsyncLocalStorage correlation IDs, Prometheus SLO-based burn rate alerts, OpenTelemetry auto-instrumentation setup, and incident response runbook template.

### [Infrastructure as Code](./Infrastructure-as-Code/infrastructure-as-code.md)
Everything-in-code philosophy, idempotent deployments, state management (remote state, locking, encryption), modular infrastructure with reusable Terraform modules, environment parity across dev/staging/production, drift detection and prevention, least-privilege IAM, secret management in IaC (Secrets Manager references), infrastructure testing (static analysis, plan review, integration tests, policy as code), and GitOps workflows. Includes complete Terraform project with modules, Pulumi TypeScript stack, environment variable management, and GitOps CI/CD pipeline for Terraform.

---

## Status

Complete — all 5 guides are written and reviewed. Last updated: 2026-03.
