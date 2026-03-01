# CI/CD Pipelines & Deploy Strategies

> Pipeline-as-code, GitHub Actions workflows, environment promotion, blue-green and canary deployments, rollback strategies, and release automation — every push from commit to production.

---

## Principles

### 1. Pipeline as Code

Your CI/CD pipeline is infrastructure. It belongs in version control, reviewed in pull requests, and tested like any other code. Never configure pipelines through a web UI where changes are invisible, unreviewable, and irreversible.

GitHub Actions uses `.github/workflows/*.yml` files that live alongside your application code. This means your pipeline evolves with your application — a migration that needs a new build step gets that step added in the same PR. There is no drift between what the dashboard says and what actually runs.

**Rules:**

- Every pipeline change goes through a pull request
- Pin action versions to full commit SHAs, not tags (tags can be moved)
- Store reusable workflows in `.github/workflows/` and composite actions in `.github/actions/`
- Use `workflow_dispatch` for manual triggers when you need escape hatches

### 2. Trunk-Based Development

Long-lived feature branches are where productivity goes to die. The longer a branch lives, the more painful the merge, the more likely conflicts, and the higher the risk of a broken deploy.

Trunk-based development means everyone commits to `main` (or merges short-lived branches into `main`) frequently — at least once a day. Feature flags control what users see, not branches. This keeps the codebase in a continuously deployable state.

**The workflow:**

- Branch from `main`, keep the branch alive for hours or a few days at most
- Use feature flags for incomplete features instead of long-lived branches
- Merge to `main` through pull requests with required CI checks
- `main` is always deployable — if CI passes, it can ship
- Release branches are unnecessary when you have feature flags and good rollback

### 3. Fast Feedback Loops

A CI pipeline that takes 30 minutes to tell you your code is broken is a CI pipeline people will learn to ignore. The goal is feedback in under 10 minutes for the common case.

**How to keep CI fast:**

- **Parallelize jobs** — lint, type-check, unit tests, and integration tests should run concurrently, not sequentially
- **Cache aggressively** — `node_modules`, Docker layers, build artifacts, test databases
- **Run only what changed** — in monorepos, use path filters or tools like Turborepo/Nx to skip unaffected packages
- **Fail fast** — put the cheapest checks first (lint, type-check) so obvious errors are caught in seconds
- **Split test suites** — distribute tests across parallel runners when the suite grows large

The order matters: lint (10s) → type-check (15s) → unit tests (30s) → build (60s) → integration tests (90s) → e2e tests (180s). If lint fails, nothing else runs.

### 4. Environment Promotion

Code should travel through environments in one direction: development → staging → production. Never deploy untested code directly to production. Never test in production what you could have tested in staging.

**Environment strategy:**

- **Development/Preview** — every PR gets a preview deployment (Vercel, Netlify, or custom). Developers can share URLs for review.
- **Staging** — mirrors production as closely as possible. Same infrastructure, same environment variables (pointing to staging services), same data shape (anonymized production data or realistic seeds).
- **Production** — only receives code that passed staging. Deploys are automated after staging verification or gated behind manual approval for high-risk changes.

Environment parity is critical. If staging uses SQLite and production uses PostgreSQL, you will discover bugs in production. If staging has 1 GB of data and production has 1 TB, your query performance assumptions are wrong.

### 5. Blue-Green Deployments

Blue-green deployment eliminates downtime by maintaining two identical production environments. "Blue" runs the current version. "Green" runs the new version. Traffic switches instantly from blue to green once green is verified healthy.

**How it works:**

- Deploy the new version to the green environment
- Run health checks and smoke tests against green
- Switch the load balancer or DNS to point to green
- The old blue environment becomes the instant rollback target
- Once confident, blue becomes the next green for the subsequent release

The cost is running two environments simultaneously. For serverless architectures this cost is near zero. For traditional infrastructure, this means double the compute during deployments. The tradeoff is worth it — rollback is a DNS switch, not a redeploy.

### 6. Canary Deployments

Instead of switching 100% of traffic at once, canary deployments route a small percentage (1–5%) to the new version while the rest continues hitting the old version. If error rates, latency, or business metrics degrade, the canary is killed automatically.

**Canary progression:**

- Deploy new version to canary pool
- Route 1% of traffic to canary
- Monitor error rates, latency p99, and key business metrics for 10–15 minutes
- If healthy, increase to 10%, then 50%, then 100%
- If any metric degrades beyond threshold, automatic rollback to 0%

Canary deployments require robust monitoring. You need real-time visibility into error rates segmented by version. Without observability, a canary is just a slow rollout with extra steps.

> Cross-reference: [DevOps/Monitoring-Logging](../Monitoring-Logging/monitoring-logging.md) covers the observability stack needed for canary analysis.

### 7. Rollback Strategies

Every deployment strategy needs a rollback plan that can execute in under 2 minutes. If your rollback process involves "revert the PR, wait for CI, redeploy," your users are experiencing the outage for 15+ minutes.

**Rollback approaches by deployment type:**

- **Blue-green** — switch traffic back to the previous environment (seconds)
- **Canary** — route 0% to new version (seconds)
- **Container-based** — redeploy previous image tag (1–2 minutes)
- **Serverless** — repoint alias to previous function version (seconds)
- **Database migrations** — this is the hard part. Forward-only migrations with backward compatibility are safer than rollback migrations

**Rules:**

- Never delete the previous deployment artifact until the new version is confirmed stable
- Tag every production deployment with a version identifier
- Test your rollback process regularly — a rollback you have never practiced will fail when you need it most
- Database changes should be backward-compatible so the old code can run against the new schema during rollback

### 8. Secret Injection in CI

Secrets do not belong in your repository, your pipeline YAML, or your Docker images. They are injected at runtime from a secure store.

**GitHub Actions secrets:**

- Use repository secrets or organization secrets, never hardcode values
- Use environment-scoped secrets for deployment credentials (staging secrets vs production secrets)
- Use OIDC for cloud provider authentication instead of long-lived access keys
- Mask secrets in logs automatically — but do not rely on masking as your only protection

**Secret hierarchy:**

- **CI/CD secrets** — API keys for the pipeline itself (npm tokens, Docker registry creds, cloud deploy keys)
- **Application secrets** — injected into the runtime environment, never baked into build artifacts
- **Ephemeral secrets** — short-lived tokens generated per deployment via OIDC or vault

> Cross-reference: [Security/Secrets-Environment](../../Security/Secrets-Environment/secrets-environment.md) covers application secret management in depth.

### 9. Artifact Management

Build once, deploy everywhere. Never rebuild the same commit for different environments. A single CI run produces an artifact (Docker image, bundle, binary) that is promoted through environments unchanged. Environment-specific configuration is injected at deploy time, not build time.

**Artifact practices:**

- Tag artifacts with the git SHA for traceability: `myapp:a1b2c3d`
- Store artifacts in a registry (Docker Hub, GitHub Container Registry, ECR, Artifactory)
- Sign artifacts to verify they have not been tampered with
- Set retention policies — keep the last 30 production artifacts, garbage-collect the rest
- Never use `latest` as a deployment target. `latest` is ambiguous and makes rollback impossible.

### 10. Branch Protection and Quality Gates

Automated checks are only valuable if they cannot be bypassed. Branch protection rules enforce that CI must pass before code reaches `main`.

**Minimum branch protection for `main`:**

- Require pull request reviews (at least 1 reviewer)
- Require status checks to pass (lint, type-check, tests, build)
- Require branches to be up-to-date before merging
- Require signed commits for audit trails
- Disable force pushes — `main` history is immutable

**Quality gates in CI:**

- **Code coverage thresholds** — not 100%, but enforce that coverage does not decrease. 80% is a reasonable floor.
- **Bundle size limits** — fail CI if the JavaScript bundle exceeds a threshold
- **Lighthouse scores** — fail CI if performance, accessibility, or SEO scores drop below targets
- **Security scanning** — SAST, dependency audit, secret scanning as required checks
- **Linting and formatting** — zero tolerance for lint errors. Format on save, check in CI.

---

## LLM Instructions

### When Generating GitHub Actions Workflows

When asked to create a CI/CD pipeline:

- Always use `actions/checkout@v4` with `fetch-depth: 0` when git history is needed (changelogs, versioning)
- Pin actions to full SHA hashes, not version tags: `actions/setup-node@8f152de45cc393bb48ce5d89d36b731f54556e65` (v4.0.0)
- Set `concurrency` groups to cancel redundant runs on the same branch
- Use `permissions` at the job level to follow least-privilege principle
- Cache `node_modules` with `actions/cache` keyed on lockfile hash
- Use `matrix` strategy for testing across Node versions only when the project supports multiple versions
- Set `timeout-minutes` on every job to prevent hung workflows from burning minutes
- Use `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` to restrict deploy steps to main branch pushes

### When Setting Up Deploy Pipelines

When asked to create a deployment pipeline:

- Default to preview deployments for PRs, automatic deploys to staging on merge to `main`, and manual approval gates for production
- Use GitHub Environments with protection rules for staging and production
- Store deployment-specific secrets in environment-scoped secrets, not repository-level secrets
- Include health check verification after every deployment step
- Add deployment status notifications (Slack, Discord) as a final step
- Use `environment` key in workflow jobs to trigger environment protection rules

### When Configuring Environment Promotion

When setting up multi-environment pipelines:

- Define environments as separate jobs with dependencies: `deploy-staging` → `deploy-production`
- Use `needs:` to enforce ordering between jobs
- Use GitHub environment protection rules with required reviewers for production
- Generate environment-specific configuration from templates, never copy-paste with different values
- Include a smoke test job after each deployment that verifies critical endpoints respond correctly
- Use the same Docker image or build artifact across all environments — only inject environment variables at deploy time

### When Implementing Rollback Logic

When asked to create rollback mechanisms:

- Store the previous deployment identifier (image tag, function version, commit SHA) as a deployment output
- Create a `workflow_dispatch` rollback workflow that accepts a version to roll back to
- For container deployments, redeploy the previous image tag rather than reverting code and rebuilding
- For serverless, use function versioning and alias swapping
- Include post-rollback health checks to verify the rollback succeeded
- Log rollback events for incident review

### When Structuring Monorepo CI

When generating CI for monorepos:

- Use path filters in `on.push.paths` and `on.pull_request.paths` to trigger only affected package pipelines
- Use Turborepo or Nx for intelligent task orchestration with caching
- Define a shared base workflow for common steps (checkout, install, cache) and job-specific workflows per package
- Use `actions/cache` with hash keys that include the specific package lockfile
- Run affected tests only: `turbo run test --filter=...[origin/main]`
- Ensure the CI configuration scales — adding a new package should require minimal pipeline changes

---

## Examples

### 1. Full CI Pipeline — Lint, Test, Build, Deploy

A complete GitHub Actions workflow for a Next.js application with parallel checks and sequential deployment.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci

      - run: npm run lint
      - run: npm run type-check

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci
      - run: npm test -- --coverage

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [lint-and-typecheck, test]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next/
          retention-days: 1

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [build]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next/

      - name: Deploy to staging
        run: npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Smoke test staging
        run: |
          STAGING_URL="${{ vars.STAGING_URL }}"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/health")
          if [ "$STATUS" != "200" ]; then
            echo "Staging health check failed with status $STATUS"
            exit 1
          fi
          echo "Staging health check passed"

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [deploy-staging]
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next/

      - name: Deploy to production
        run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Smoke test production
        run: |
          PROD_URL="${{ vars.PRODUCTION_URL }}"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/health")
          if [ "$STATUS" != "200" ]; then
            echo "Production health check failed with status $STATUS"
            exit 1
          fi
          echo "Production health check passed"

      - name: Notify deployment
        if: always()
        run: |
          STATUS="${{ job.status }}"
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"Production deploy ${STATUS}: ${{ github.sha }}\"}"
```

### 2. Docker Build and Push with Multi-Platform Support

A workflow that builds a Docker image, pushes to GitHub Container Registry, and deploys to a container platform.

```yaml
# .github/workflows/docker-deploy.yml
name: Docker Build & Deploy

on:
  push:
    branches: [main]
    tags: ["v*"]

permissions:
  contents: read
  packages: write

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    name: Build & Push Image
    runs-on: ubuntu-latest
    timeout-minutes: 15
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=tag
            type=raw,value=latest,enable={{is_default_branch}}

      - id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [build-and-push]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy container
        run: |
          # Replace with your deployment mechanism
          # (AWS ECS, Google Cloud Run, Fly.io, Railway, etc.)
          echo "Deploying image: ${{ needs.build-and-push.outputs.image-tag }}"
          # fly deploy --image ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ needs.build-and-push.outputs.image-digest }}

      - name: Verify deployment
        run: |
          sleep 10
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${{ vars.PRODUCTION_URL }}/api/health")
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed"
            exit 1
          fi
```

### 3. Canary Deployment with Automatic Rollback

A workflow that implements canary deployments with traffic shifting and automatic rollback on error rate threshold breach.

```yaml
# .github/workflows/canary-deploy.yml
name: Canary Deploy

on:
  workflow_dispatch:
    inputs:
      image-tag:
        description: "Docker image tag to deploy"
        required: true

permissions:
  contents: read

jobs:
  canary:
    name: Canary Deployment
    runs-on: ubuntu-latest
    timeout-minutes: 30
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy canary (1% traffic)
        id: canary-deploy
        run: |
          # Deploy new version to canary target group
          # This is platform-specific (AWS ALB, Kubernetes, Cloudflare, etc.)
          echo "Deploying ${{ inputs.image-tag }} to canary"
          # aws ecs update-service --cluster prod --service canary \
          #   --task-definition myapp:${{ inputs.image-tag }}

      - name: Monitor canary (5 minutes)
        id: canary-monitor
        run: |
          echo "Monitoring canary for 5 minutes..."
          CANARY_HEALTHY=true

          for i in $(seq 1 5); do
            sleep 60

            # Query error rate from monitoring system
            # ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(http_errors{version='canary'}[1m])")
            ERROR_RATE=0  # Replace with actual monitoring query

            echo "Minute $i: Error rate = $ERROR_RATE"

            if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
              echo "Error rate exceeds 1% threshold"
              CANARY_HEALTHY=false
              break
            fi
          done

          echo "healthy=$CANARY_HEALTHY" >> $GITHUB_OUTPUT

      - name: Promote or rollback
        run: |
          if [ "${{ steps.canary-monitor.outputs.healthy }}" == "true" ]; then
            echo "Canary healthy — promoting to 100%"
            # Shift all traffic to new version
            # aws ecs update-service --cluster prod --service primary \
            #   --task-definition myapp:${{ inputs.image-tag }}
          else
            echo "Canary unhealthy — rolling back"
            # Remove canary, all traffic stays on previous version
            # aws ecs update-service --cluster prod --service canary \
            #   --task-definition myapp:$PREVIOUS_TAG
            exit 1
          fi

      - name: Notify result
        if: always()
        run: |
          STATUS="${{ job.status }}"
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"Canary deploy ${STATUS}: ${{ inputs.image-tag }}\"}"
```

### 4. Monorepo CI with Turborepo

A pipeline that uses Turborepo to build and test only affected packages in a monorepo.

```yaml
# .github/workflows/monorepo-ci.yml
name: Monorepo CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  determine-affected:
    name: Determine Affected Packages
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      packages: ${{ steps.affected.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci

      - id: affected
        run: |
          AFFECTED=$(npx turbo run build --filter='...[origin/main]' --dry-run=json | jq -c '.packages')
          echo "packages=$AFFECTED" >> $GITHUB_OUTPUT
          echo "Affected packages: $AFFECTED"

  lint-and-test:
    name: Lint & Test
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [determine-affected]
    if: needs.determine-affected.outputs.packages != '[]'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci

      # Turborepo remote caching
      - run: npx turbo run lint test --filter='...[origin/main]'
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}

  build:
    name: Build Affected
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [lint-and-test]
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci

      - run: npx turbo run build --filter='...[origin/main]'
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

## Common Mistakes

### 1. Hardcoding Secrets in Workflows

**Wrong:**

```yaml
env:
  DATABASE_URL: "postgresql://admin:password123@prod-db.example.com:5432/myapp"
  API_KEY: "sk-live-abc123def456"
```

**Fix:** Use GitHub Actions secrets and reference them with `${{ secrets.SECRET_NAME }}`. Scope deployment secrets to specific environments. Use OIDC for cloud provider authentication instead of long-lived keys.

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  API_KEY: ${{ secrets.API_KEY }}
```

### 2. No Dependency Caching

**Wrong:**

```yaml
steps:
  - uses: actions/checkout@v4
  - run: npm install  # Downloads everything from scratch every run
  - run: npm test
```

**Fix:** Use `actions/setup-node` with `cache: "npm"` or `actions/cache` with a hash of your lockfile. This can reduce install time from 60+ seconds to under 5 seconds.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: "npm"
  - run: npm ci  # Use ci, not install — deterministic from lockfile
  - run: npm test
```

### 3. No Concurrency Control

**Wrong:** Pushing three commits in quick succession triggers three full CI runs that all try to deploy simultaneously, causing race conditions and wasted compute.

**Fix:** Set concurrency groups to cancel redundant runs on the same branch. Only the latest push matters for PRs.

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

### 4. Deploying Without Health Checks

**Wrong:** The deploy step finishes, the workflow shows green, but the application is crashing on startup. Nobody notices for 20 minutes.

**Fix:** Always include a health check step after deployment. Hit a known endpoint and verify the response. Fail the workflow if the health check fails — this triggers notifications and makes the failure visible.

```yaml
- name: Verify deployment
  run: |
    for i in $(seq 1 10); do
      STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${{ vars.PRODUCTION_URL }}/api/health")
      if [ "$STATUS" == "200" ]; then
        echo "Health check passed"
        exit 0
      fi
      echo "Attempt $i: status $STATUS, retrying..."
      sleep 5
    done
    echo "Health check failed after 10 attempts"
    exit 1
```

### 5. Not Pinning Action Versions

**Wrong:**

```yaml
- uses: actions/checkout@main    # Could change at any time
- uses: actions/setup-node@v4    # Tag could be moved to point to different commit
```

**Fix:** Pin to the full commit SHA. Add a comment with the version for readability. Use Dependabot or Renovate to keep action versions updated via pull requests.

```yaml
- uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608  # v4.1.0
- uses: actions/setup-node@8f152de45cc393bb48ce5d89d36b731f54556e65  # v4.0.0
```

### 6. Running All Tests on Every Change

**Wrong:** A documentation change triggers the full test suite including e2e tests, taking 20 minutes. A CSS fix runs database integration tests.

**Fix:** Use path filters to run only relevant checks. In monorepos, use Turborepo or Nx to detect affected packages.

```yaml
on:
  push:
    paths:
      - "src/**"
      - "package.json"
      - "package-lock.json"
    # Ignores changes to docs/, .md files, etc.
```

### 7. No Timeout on Jobs

**Wrong:** A test hangs waiting for a database connection that never comes. The workflow runs for 6 hours, burning through your GitHub Actions minutes before someone notices.

**Fix:** Set `timeout-minutes` on every job. 10 minutes is reasonable for most CI jobs. 30 minutes maximum for e2e test suites.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # Kill if stuck
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

### 8. Skipping Staging

**Wrong:** Deploying directly from CI to production because "it works on my machine" and "the tests passed." Then discovering that the staging database migration was never tested against realistic data.

**Fix:** Always deploy to staging first. Run smoke tests against staging. Add a manual approval gate or automatic promotion delay between staging and production. The 5 minutes this adds to your pipeline saves hours of incident response.

### 9. Rebuilding Artifacts Per Environment

**Wrong:** Building the application separately for staging and production, resulting in potentially different artifacts due to different build times, dependency resolutions, or flaky builds.

**Fix:** Build once, deploy everywhere. Produce a single artifact (Docker image, build output) from CI and promote that exact artifact through environments. Inject environment-specific configuration at deploy time, not build time.

### 10. Over-Complex Pipeline YAML

**Wrong:** A single 500-line workflow file with deeply nested conditionals, duplicated steps across jobs, and inline scripts doing heavy lifting.

**Fix:** Break pipelines into focused workflows. Extract repeated steps into composite actions in `.github/actions/`. Move complex scripts into shell scripts in the repository that can be tested locally. A readable pipeline is a maintainable pipeline.

```yaml
# .github/actions/setup/action.yml — reusable composite action
name: "Setup Node & Dependencies"
runs:
  using: "composite"
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: "npm"
    - run: npm ci
      shell: bash
```

```yaml
# In your workflow — clean and readable
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup
  - run: npm test
```

---

> **See also:** [Docker-Containers](../Docker-Containers/docker-containers.md) | [Infrastructure-as-Code](../Infrastructure-as-Code/infrastructure-as-code.md) | [Monitoring-Logging](../Monitoring-Logging/monitoring-logging.md) | [Security/Secrets-Environment](../../Security/Secrets-Environment/secrets-environment.md) | [Backend/Serverless-Edge](../../Backend/Serverless-Edge/serverless-edge.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
