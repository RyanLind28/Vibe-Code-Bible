---
title: "Docker & Containerization"
description: Dockerfiles, multi-stage builds, layer caching, docker-compose for local development, container security, image optimization, and orchestration fundamentals — every container from dev to production.
---
# Docker & Containerization

> Dockerfiles, multi-stage builds, layer caching, docker-compose for local development, container security, image optimization, and orchestration fundamentals — every container from dev to production.

---

## Principles

### 1. Immutable Infrastructure

Containers are disposable. You never SSH into a running container to fix something. You never patch a container in place. You build a new image, push it, and replace the old container. If something breaks, you do not debug the container — you fix the Dockerfile, rebuild, and redeploy.

This mindset eliminates "works on my machine" entirely. The image that passes CI is the image that runs in production. No drift, no snowflake servers, no manual configuration. If you need to change anything, it goes through the build pipeline.

**Rules:**

- Never modify running containers — rebuild the image instead
- Never install packages at runtime — include everything in the image
- Store no state inside containers — use external volumes, databases, or object storage
- Treat containers like cattle, not pets — any container can be killed and replaced at any time

### 2. Minimal Base Images

Every megabyte in your image is attack surface, pull time, and storage cost. Start with the smallest base image that works and add only what you need.

**Base image hierarchy (smallest to largest):**

- **`scratch`** — empty filesystem, for statically compiled Go/Rust binaries only
- **`distroless`** — Google's minimal images, no shell or package manager, ideal for production
- **`alpine`** — ~5 MB, musl libc, `apk` package manager. Good for most use cases but watch for musl compatibility issues with native Node.js modules
- **`slim` variants** — Debian-based but stripped down (~80 MB). Best compatibility for Node.js applications
- **`bookworm`/`bullseye`** — full Debian (~120 MB). Use when you need system libraries that are painful to install on Alpine

For Node.js applications, `node:20-slim` is the sweet spot. It has glibc (no musl compatibility surprises) and is small enough for production. Use `node:20` (full) only in build stages where you need build tools like `gcc`, `make`, or `python3` for native module compilation.

### 3. Multi-Stage Builds

Multi-stage builds are the single most important Docker optimization. They separate the build environment (large, with dev dependencies and build tools) from the runtime environment (minimal, with only production dependencies and compiled output).

**The pattern:**

```dockerfile
# Stage 1: Build — includes dev dependencies, compiler, build tools
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime — only production dependencies and built output
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/server.js"]
```

The builder stage might be 1.5 GB with TypeScript, dev dependencies, and build tools. The final image is 200 MB with only the compiled JavaScript and production dependencies. The builder stage is discarded — it never reaches your registry.

### 4. Layer Caching Optimization

Every instruction in a Dockerfile creates a layer. Docker caches layers and reuses them if the inputs have not changed. Layer ordering determines how much of the cache you invalidate on each change.

**The golden rule:** Put things that change least frequently at the top, and things that change most frequently at the bottom.

**Correct order:**

1. Base image (changes rarely)
2. System dependencies (changes rarely)
3. Copy dependency manifests (`package.json`, `package-lock.json`)
4. Install dependencies (changes when dependencies change)
5. Copy application source code (changes on every commit)
6. Build step (changes on every commit)

```dockerfile
# WRONG: Copying everything first busts the cache on every code change
COPY . .
RUN npm ci
RUN npm run build

# CORRECT: Dependencies are cached unless package.json changes
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

If you change a line of application code, the correct ordering reuses the cached `npm ci` layer (often the slowest step). The wrong ordering reinstalls all dependencies on every single build.

### 5. One Process Per Container

A container runs one process. Not your app server, a cron job, and a log shipper all crammed into a single container. Each process gets its own container, its own health check, its own resource limits, and its own scaling.

**Why this matters:**

- **Health checks are meaningful** — a container health check tests one thing. If the web server is healthy but the background worker is dead, separate containers let you detect that.
- **Scaling is granular** — you can scale web servers independently from workers. If you need 10 web instances but only 2 workers, separate containers make this trivial.
- **Restarts are targeted** — if the worker crashes, only the worker restarts. The web server keeps serving traffic.
- **Logs are clean** — each container's stdout/stderr contains logs from one process, making aggregation and debugging straightforward.

Use `docker-compose` or Kubernetes pods to run multiple containers that work together. Do not use process managers like `supervisord` inside containers.

### 6. Health Checks

A container that is running is not necessarily a container that is working. The process might be up but deadlocked, out of memory, or unable to reach the database. Health checks let the orchestrator detect this and replace unhealthy containers.

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

**Health check design:**

- Hit an endpoint that exercises critical dependencies (database connection, cache connection)
- Return 200 if the service can accept traffic, non-200 otherwise
- Keep the check lightweight — it runs every 30 seconds
- Set a `start-period` long enough for the application to boot
- After `retries` consecutive failures, the container is marked unhealthy and the orchestrator replaces it

Do not make health checks do real work (heavy queries, file I/O). A health check that is slow or resource-intensive will cause cascading failures.

### 7. Security Scanning and Non-Root Execution

Containers run as root by default. This means a container breakout exploit gives the attacker root on the host. Always run as a non-root user.

```dockerfile
# Create a non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

# Set ownership of application files
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser
```

**Security practices:**

- **Run as non-root** — always add a `USER` instruction
- **Scan images** — use `docker scout`, Trivy, or Snyk to scan for CVE vulnerabilities in base images and dependencies
- **No secrets in images** — never `COPY .env` or use `ARG` for secrets. Use runtime injection via environment variables or mounted secrets
- **Read-only filesystem** — mount the container filesystem as read-only and use tmpfs for directories that need writes
- **Pin base image digests** — use `node:20-slim@sha256:abc123...` for reproducible builds in production

### 8. Docker Compose for Local Development

Docker Compose defines your entire local development stack in a single file. One command brings up your application, database, cache, message queue, and any other services — all configured to work together.

Compose is for local development, not production. In production, use your cloud provider's managed services (RDS, ElastiCache, managed Kafka) or Kubernetes. Compose gives developers an environment that mirrors production topology without requiring cloud access.

**Principles:**

- Mount source code as a volume for hot reloading — do not rebuild the image on every code change
- Use `depends_on` with health checks to ensure services start in the correct order
- Define a `.env` file for local configuration, never commit it
- Use named volumes for database persistence across container restarts
- Keep the compose file as close to production topology as possible — if production uses PostgreSQL, do not use SQLite locally

### 9. Container Orchestration Fundamentals

For most teams, a managed container platform (AWS ECS/Fargate, Google Cloud Run, Fly.io, Railway) is the right choice. Kubernetes is powerful but operationally expensive — do not adopt it unless you have the team to maintain it.

**When to use what:**

- **Cloud Run / Fargate** — stateless web services that scale to zero. Best for most applications.
- **ECS with EC2** — when you need GPUs, large instances, or sustained workloads where scale-to-zero savings do not apply
- **Kubernetes** — when you need multi-cloud, complex networking, custom scheduling, or have a dedicated platform team
- **Fly.io / Railway** — when you want container-based deployment without cloud provider complexity

Regardless of platform, the fundamentals are the same: health checks, resource limits, rolling updates, horizontal scaling, and centralized logging. Master these concepts and any orchestrator becomes learnable.

### 10. Image Tagging and Registry Strategy

Tags are your deployment versioning system. A disciplined tagging strategy makes deployments traceable, rollbacks instant, and debugging straightforward.

**Tagging rules:**

- **Git SHA** — `myapp:a1b2c3d` for every build. This is the most reliable tag because it maps 1:1 to a commit.
- **Semantic versions** — `myapp:1.2.3` for releases. Use these as human-readable aliases.
- **`latest`** — only for development convenience. Never deploy `latest` to production. It is ambiguous and makes rollback impossible.
- **Environment tags** — avoid `myapp:staging` or `myapp:production`. These are mutable and tell you nothing about what version is running.

**Registry practices:**

- Use a private registry (GitHub Container Registry, ECR, Google Artifact Registry) for production images
- Set retention policies to garbage-collect old images — keep the last 50 tagged images, delete untagged manifests
- Enable vulnerability scanning on push
- Use image signing (Cosign, Notation) for supply chain security in high-compliance environments

---

## LLM Instructions

### When Generating Dockerfiles

When asked to create a Dockerfile:

- Always use multi-stage builds — at minimum a `builder` stage and a `runtime` stage
- Default to `node:20-slim` for Node.js runtime stages, `node:20` for build stages
- Copy `package.json` and `package-lock.json` before copying source code for layer caching
- Use `npm ci` instead of `npm install` for deterministic builds
- Use `npm ci --omit=dev` in the runtime stage to exclude dev dependencies
- Add a `USER` instruction to run as non-root
- Add a `HEALTHCHECK` instruction
- Include a `.dockerignore` file that excludes `node_modules`, `.git`, `.env`, and test files
- Set `NODE_ENV=production` in the runtime stage
- Use `COPY --from=builder` to bring only compiled output into the runtime stage

### When Setting Up Docker Compose

When asked to create a docker-compose configuration:

- Use `docker-compose.yml` (v3.8+ or Compose Specification format)
- Define named volumes for database persistence
- Use `depends_on` with `condition: service_healthy` to enforce startup order
- Mount source code as a bind mount for hot reloading: `./src:/app/src`
- Define a `.env` file for environment variables and reference with `env_file`
- Include health checks for databases and caches
- Expose only necessary ports
- Use a separate `docker-compose.override.yml` for developer-specific settings

### When Optimizing Image Size

When asked to reduce Docker image size:

- Switch to a smaller base image (`slim`, `alpine`, or `distroless`)
- Use multi-stage builds to exclude build tools from the final image
- Combine `RUN` commands to reduce layers: `RUN apt-get update && apt-get install -y ... && rm -rf /var/lib/apt/lists/*`
- Remove caches and temp files in the same `RUN` layer they are created in
- Use `.dockerignore` to prevent large files from entering the build context
- Analyze image layers with `docker history` or `dive` to find bloat
- For Node.js, consider `node:20-slim` + `npm ci --omit=dev` + only copy `dist/` and `node_modules/`

### When Configuring Container Networking

When setting up networking between containers:

- In Compose, services communicate by service name (e.g., `postgres://db:5432`)
- Define custom networks only when you need to isolate groups of services
- Never use `network_mode: host` unless there is a specific performance requirement
- Map ports with `"host:container"` format — only expose what is necessary
- For production, use the cloud provider's networking (VPC, service mesh) rather than Docker networking

### When Writing Container Health Checks

When implementing health checks:

- For HTTP services, use `curl -f http://localhost:PORT/api/health || exit 1`
- For TCP services (databases), use `pg_isready`, `redis-cli ping`, or `mysqladmin ping`
- Set `start-period` long enough for the service to initialize
- Keep the health check lightweight — no heavy queries or file operations
- In Compose, use the `healthcheck` key with `test`, `interval`, `timeout`, `retries`
- In Dockerfiles, use the `HEALTHCHECK` instruction
- Health endpoints should verify critical dependencies (database connectivity, cache availability)

---

## Examples

### 1. Production Node.js Multi-Stage Dockerfile

A complete Dockerfile for a Next.js or Express application with optimized layers, non-root user, and health check.

```dockerfile
# Stage 1: Dependencies
FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runtime
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

# Copy only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder --chown=appuser:appgroup /app/.next ./.next
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/next.config.js ./

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node_modules/.bin/next", "start"]
```

```text
# .dockerignore
node_modules
.next
.git
.gitignore
.env*
*.md
tests/
coverage/
.github/
docker-compose*.yml
Dockerfile
```

### 2. Docker Compose for Full-Stack Local Development

A complete docker-compose setup for a Next.js application with PostgreSQL, Redis, and a background worker.

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps  # Use the deps stage for local dev
    command: npm run dev
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
      - ./next.config.js:/app/next.config.js
    env_file:
      - .env.local
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    command: npm run worker:dev
    volumes:
      - ./src:/app/src
    env_file:
      - .env.local
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes
    restart: unless-stopped

  # Optional: Database admin UI
  adminer:
    image: adminer
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy
    profiles:
      - tools  # Only starts with: docker compose --profile tools up

volumes:
  postgres_data:
  redis_data:
```

### 3. Optimized Python Dockerfile with Layer Caching

A multi-stage Dockerfile for a Python/FastAPI application demonstrating pip caching and slim runtime.

```dockerfile
# Stage 1: Build dependencies
FROM python:3.12 AS builder
WORKDIR /app

# Install build dependencies for compiled packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy only requirements for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim
WORKDIR /app

# Install only runtime system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

# Copy application code
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4. Container Health Check Patterns

Health check implementations for common service types.

```typescript
// /api/health — Express/Next.js health check endpoint
import { Pool } from "pg";
import { Redis } from "ioredis";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Check database
  try {
    await pool.query("SELECT 1");
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  // Check Redis
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
    healthy = false;
  }

  return Response.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
```

```yaml
# docker-compose health checks for common services
services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo:
    image: mongo:7
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 30s
      timeout: 10s
      retries: 5
```

---

## Common Mistakes

### 1. Running Containers as Root

**Wrong:**

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]
# Runs as root by default — container breakout = root on host
```

**Fix:** Always create and switch to a non-root user. This limits the blast radius of container escape vulnerabilities.

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser
USER appuser
CMD ["node", "server.js"]
```

### 2. Using the `latest` Tag in Production

**Wrong:**

```dockerfile
FROM node:latest  # Which version? Changes without warning.
```

```yaml
services:
  app:
    image: myapp:latest  # Which build? Impossible to rollback.
```

**Fix:** Pin exact versions in Dockerfiles and use git SHA tags for application images. `latest` is fine for local experimentation, never for production or CI.

```dockerfile
FROM node:20.11-slim  # Exact version, reproducible builds
```

### 3. Copying node_modules Into the Image

**Wrong:**

```dockerfile
COPY . .  # Copies local node_modules (wrong platform, dev deps included)
RUN npm run build
```

**Fix:** Always install dependencies inside the container from the lockfile. Your local `node_modules` may contain platform-specific binaries (macOS vs Linux) and dev dependencies.

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci  # Clean install from lockfile inside the container
COPY . .
RUN npm run build
```

### 4. No .dockerignore File

**Wrong:** The build context includes `node_modules` (500 MB), `.git` (could be huge), `.env` files (secrets), and test files (unnecessary in production). Build takes forever and the image is bloated.

**Fix:** Create a `.dockerignore` that mirrors your `.gitignore` plus Docker-specific exclusions.

```text
# .dockerignore
node_modules
.next
.git
.gitignore
.env*
*.md
tests/
coverage/
.github/
docker-compose*.yml
Dockerfile
```

### 5. Not Using Multi-Stage Builds

**Wrong:**

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
CMD ["node", "dist/server.js"]
# Image contains: TypeScript compiler, dev dependencies, source code, test files
# Final size: 1.5 GB
```

**Fix:** Use multi-stage builds to separate build and runtime. The final image contains only what is needed to run the application.

```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/server.js"]
# Final size: 200 MB
```

### 6. Busting Layer Cache with Wrong COPY Order

**Wrong:**

```dockerfile
COPY . .           # Any file change invalidates this layer
RUN npm ci         # Reinstalls all deps on every code change
RUN npm run build  # Rebuilds everything
```

**Fix:** Copy dependency files first, install dependencies, then copy source code. Dependencies are cached until `package.json` or `package-lock.json` changes.

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci         # Cached until dependencies change
COPY . .           # Only this and below re-run on code changes
RUN npm run build
```

### 7. Hardcoding Environment Variables in Dockerfile

**Wrong:**

```dockerfile
ENV DATABASE_URL=postgresql://admin:password@prod-db:5432/myapp
ENV API_KEY=sk-live-abc123
```

**Fix:** Never put secrets or environment-specific values in the Dockerfile. Use `ENV` only for non-sensitive, environment-agnostic defaults. Inject actual values at runtime.

```dockerfile
# In Dockerfile — only safe defaults
ENV NODE_ENV=production
ENV PORT=3000

# At runtime — inject secrets
# docker run -e DATABASE_URL="$DATABASE_URL" -e API_KEY="$API_KEY" myapp
```

### 8. Creating Unnecessary Layers

**Wrong:**

```dockerfile
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN rm -rf /var/lib/apt/lists/*  # Cache already baked into previous layers
```

**Fix:** Combine related commands into a single `RUN` instruction. Clean up in the same layer to actually reduce image size.

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    rm -rf /var/lib/apt/lists/*
```

---

> **See also:** [CICD](../CICD/cicd.md) | [Cloud-Architecture](../Cloud-Architecture/cloud-architecture.md) | [Infrastructure-as-Code](../Infrastructure-as-Code/infrastructure-as-code.md) | [Security/Secrets-Environment](../../Security/Secrets-Environment/secrets-environment.md) | [Backend/Background-Jobs](../../Backend/Background-Jobs/background-jobs.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
