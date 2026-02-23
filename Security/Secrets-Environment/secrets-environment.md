# Secrets & Environment Management
> API keys, .env files, .gitignore patterns, secret scanning, vault integration, and CI/CD secrets management. The single most critical security discipline for vibe coders — one leaked key can cost you thousands.

---

## Principles

### 1. Why Secrets Management Is the #1 Security Priority

Every single push to a public GitHub repository is scanned by automated bots within seconds. Not minutes. Seconds. These bots look for patterns that match API keys, database credentials, cloud provider tokens, and payment processor secrets. When they find one, they exploit it immediately — spinning up cryptocurrency miners on your AWS account, exfiltrating customer data from your database, or making fraudulent charges through your payment processor. There is no grace period. There is no warning. The moment a secret hits a public remote, you should consider it compromised.

This is not hypothetical. In 2014, AWS reported that some developers received bills exceeding $50,000 after accidentally committing their access keys to public repositories. Bots spun up hundreds of EC2 instances for cryptocurrency mining within minutes of the push. In 2016, Uber suffered a massive data breach affecting 57 million users because two engineers stored AWS credentials in a private GitHub repository that was later accessed by attackers. The breach cost Uber $148 million in settlement fees and incalculable reputational damage. In 2019, a researcher demonstrated that a test AWS key committed to GitHub was compromised in under four minutes by automated scanners.

Vibe coders are especially vulnerable to this class of attack for several specific reasons:

- **Rapid iteration speed** — When you are moving fast and shipping features, it is easy to skip the step where you review what files are staged for commit. A quick `git add .` followed by `git push` can include files you never intended to share.
- **Copying AI-generated code without reviewing** — AI assistants frequently generate code with placeholder API keys or, worse, suggest patterns that embed keys directly in source files. If you paste and push without reading every line, you may commit a secret without realizing it.
- **Pushing quickly to share progress** — Vibe coding often involves showing progress to collaborators, friends, or social media. The urgency to push and deploy can override the caution needed to check for exposed secrets.
- **Unfamiliarity with what constitutes a secret** — Many vibe coders do not realize that a Stripe secret key (`sk_live_...`) in their codebase means an attacker can issue refunds, access customer payment data, create charges on behalf of the business, and essentially take over the entire payment infrastructure.

The cost of a single leaked secret can range from inconvenient (a $200 cloud bill from a rate-limited API key) to catastrophic (complete database exfiltration, regulatory fines, business closure). Secrets management is not a nice-to-have security practice — it is the single most important discipline to master before writing your first line of code.

**The golden rule: if a value would cause damage in the hands of a stranger, it is a secret, and it must never exist in your source code, your git history, your CI logs, or your Slack messages.**

### 2. The .env File Pattern

Environment files (`.env` files) are the standard mechanism for separating secrets and configuration from source code. A `.env` file is a plain text file where each line contains a key-value pair in the format `KEY=value`. These files sit at the root of your project and are loaded into `process.env` (in Node.js) or the equivalent in other runtimes at application startup.

The convention for `.env` files follows a hierarchy, and understanding this hierarchy is essential:

| File | Purpose | Committed to Git? |
|---|---|---|
| `.env` | Shared defaults for all environments | Only if it contains no secrets |
| `.env.local` | Local overrides, personal credentials | **Never** |
| `.env.development` | Development-specific values | Only if it contains no secrets |
| `.env.development.local` | Personal dev overrides | **Never** |
| `.env.production` | Production-specific values | **Never** (contains real credentials) |
| `.env.production.local` | Personal prod overrides | **Never** |
| `.env.test` | Test environment values | Only if it contains no secrets |
| `.env.example` | Template with placeholders | **Always** |

**Framework loading order matters.** Each framework loads `.env` files in a specific priority order, where later files override earlier ones:

- **Next.js** loads in this order (highest priority first): `.env.local` > `.env.development.local` (or `.env.production.local`) > `.env.development` (or `.env.production`) > `.env`. The `.env.local` file always wins, which is why it is the correct place for your personal secrets.
- **Vite** follows a nearly identical hierarchy: `.env.local` > `.env.[mode].local` > `.env.[mode]` > `.env`. The `mode` is typically `development` or `production`.
- **Create React App** uses the same convention as Next.js with the same loading order.
- **Express / Node.js** does not load `.env` files automatically. You must install the `dotenv` package and call `require('dotenv').config()` (or `import 'dotenv/config'`) at the very top of your entry file, before any other imports that might access `process.env`.

**Variable naming conventions** should be consistent across your entire project:

- Use `SCREAMING_SNAKE_CASE` for all environment variable names — this is a universal convention across all platforms and languages.
- Group variables by service using a common prefix: `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_PASSWORD` for database config. `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` for Stripe. `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` for authentication.
- Prefix public client-side variables with the framework-required prefix (`NEXT_PUBLIC_`, `VITE_`) and keep them visually separated from server-only variables in the file.
- Never use generic names like `KEY`, `SECRET`, or `TOKEN` without a service prefix. You will eventually have multiple services, and ambiguous names cause bugs that are difficult to trace.

### 3. The .gitignore Foundation

The `.gitignore` file is the first line of defense against accidentally committing secrets to your repository. It tells Git which files and patterns to exclude from version control. But there is a critical nuance that trips up nearly every new developer: **`.gitignore` only works on untracked files.** Once a file has been committed to the repository — even once — adding it to `.gitignore` will not remove it from tracking. The file will continue to be tracked, and changes to it will continue to appear in diffs and commits.

This is why the `.gitignore` file must exist before your first commit. Not after. Not "when you remember." Before. The correct project initialization sequence is:

1. Create the project directory
2. Create `.gitignore` with all necessary patterns
3. Run `git init`
4. Create your initial files
5. Run `git status` to verify no sensitive files are listed
6. Make your first commit

The complete security-focused `.gitignore` should cover these categories:

- **Environment files** — `.env`, `.env.local`, `.env.development.local`, `.env.production.local`, `.env.production`, and any other `.env.*` variant. The one exception is `.env.example`, which should always be committed. The pattern `.env*` with a negation `!.env.example` handles this cleanly.
- **Private keys and certificates** — `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.cert`, `*.crt`, `*.csr`, `*.jks`, `*.keystore`. These are cryptographic materials that must never be in version control.
- **OS-generated files** — `.DS_Store` (macOS), `Thumbs.db` (Windows), `Desktop.ini` (Windows). These are noise that can occasionally contain path information you do not want to share.
- **IDE and editor configs that may contain credentials** — `.idea/` (JetBrains IDEs can store database credentials in workspace files), `.vscode/settings.json` (may contain extension-specific tokens), `*.sublime-workspace`.
- **Log files** — `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`. Logs can contain secrets that were accidentally printed during debugging.
- **Dependency directories** — `node_modules/`, `vendor/`, `.venv/`, `__pycache__/`. These are large, reproducible, and occasionally contain cached credentials.
- **Build output** — `dist/`, `build/`, `.next/`, `.nuxt/`, `.output/`. Build artifacts can contain inlined environment variables.
- **Coverage and test output** — `coverage/`, `.nyc_output/`, `*.lcov`. Not secrets, but unnecessary noise.

**Recovery when a file was already tracked:** If you already committed a `.env` file before setting up `.gitignore`, adding the pattern to `.gitignore` is not enough. You must explicitly untrack the file using `git rm --cached .env`. This removes the file from Git's index (tracking) without deleting it from your local filesystem. After running this command, commit the change, and the file will be properly ignored going forward. But remember — the file still exists in your git history. If it contained secrets, you must also clean the history (see Principle 11).

**Global gitignore for machine-wide patterns:** You can configure a global `.gitignore` file at `~/.gitignore_global` (or any path you choose) that applies to every repository on your machine. This is the ideal place for OS files like `.DS_Store` and editor configs. Configure it with `git config --global core.excludesfile ~/.gitignore_global`. This way, you never have to remember to include `.DS_Store` in every project's `.gitignore`.

### 4. API Key Lifecycle: Generation, Scoping, Rotation, Revocation

Every API key has a lifecycle, and managing that lifecycle deliberately is the difference between a secure application and a ticking time bomb. The four phases are generation, scoping, rotation, and revocation.

**Generation** — When generating a new API key, always do so from the provider's dashboard with a clear purpose in mind. Name the key descriptively: "production-backend-stripe" or "staging-openai-feature-x," not "my-key" or "test." Many providers allow you to attach metadata or descriptions to keys — use them. This naming discipline becomes critical when you have 15 keys across 5 services and need to figure out which one to rotate.

**Scoping (Principle of Least Privilege)** — Never generate a key with more permissions than the specific task requires. This is the principle of least privilege applied to API access:

- If your application only needs to read data from an API, generate a read-only key. Do not use a read-write key "just in case."
- If a provider supports IP allowlisting, restrict the key to your server's IP addresses or CIDR ranges.
- If a provider supports endpoint-level scoping, restrict the key to only the endpoints your application calls.
- If a provider supports project-level or resource-level scoping, restrict the key to the specific resources it needs.
- Never use a single "master key" or "admin key" for application code. Admin keys are for the dashboard, not for your server.

**Rotation** — API keys should be rotated on a schedule, even if you have no evidence of compromise. Rotation limits the blast radius of an undetected leak and is required by most compliance frameworks (SOC 2, PCI DSS, HIPAA):

| Sensitivity | Rotation Schedule | Examples |
|---|---|---|
| Critical | 30 days | Root credentials, signing keys, encryption master keys |
| High | 90 days | Database passwords, payment processor secrets, email service keys |
| Medium | 180 days | Internal service keys, analytics tokens, monitoring API keys |
| Low | 365 days (or on compromise) | Public API keys with rate limits, read-only tokens |

Rotation should be a zero-downtime operation. The pattern is: generate the new key, update your application to use both old and new (or deploy with the new key), verify the application works with the new key, then revoke the old key. Most secrets managers automate this process.

**Naming conventions for team environments** help prevent the catastrophic mistake of using a production key in development:

- `STRIPE_SK_LIVE` vs `STRIPE_SK_TEST` — the environment is in the name
- `OPENAI_API_KEY_PROJECT_ALPHA` vs `OPENAI_API_KEY_PROJECT_BETA` — the project is in the name
- `DATABASE_URL_STAGING` vs `DATABASE_URL_PRODUCTION` — you cannot accidentally confuse them

**Revocation** — When compromise is suspected, the response order is absolute: **revoke first, investigate second.** Do not waste time trying to determine if the key was actually used maliciously. Do not wait for confirmation. Do not "monitor for a bit." Revoke the key immediately at the provider's dashboard, generate a new one, deploy the new one, and then investigate what happened. The cost of a brief service interruption during key rotation is infinitely lower than the cost of an attacker using your credentials for even one additional minute.

### 5. The Hierarchy of Secrets

Not all secrets deserve the same level of protection. Treating a Google Maps API key with the same paranoia as your database root password creates unnecessary friction, while treating your Stripe secret key as casually as your analytics ID creates catastrophic risk. Understanding the hierarchy allows you to apply proportional protection.

**Classification:**

| Level | Description | Examples | If Leaked... |
|---|---|---|---|
| **Low** | Public-facing keys with built-in restrictions | Google Maps API key (HTTP referrer restricted), Stripe publishable key (`pk_live_`), public analytics IDs, reCAPTCHA site key | Attacker can run up your usage bill. Mitigated by rate limits and domain restrictions. |
| **Medium** | Internal service keys with limited scope | Read-only analytics API tokens, monitoring service keys (Sentry, Datadog), feature flag service tokens, non-privileged CI/CD tokens | Attacker can read internal telemetry data or modify feature flags. Uncomfortable but not catastrophic. |
| **High** | Keys that access sensitive data or can cause financial harm | Database credentials, Stripe secret key (`sk_live_`), SendGrid/Resend API keys, OAuth client secrets, AWS IAM keys with limited scope | Attacker can read/modify customer data, send emails as your domain, make charges, access cloud resources. Significant damage. |
| **Critical** | Keys that provide root or admin-level access | Database root passwords, AWS root credentials, signing keys for JWTs or code, encryption master keys, Terraform state encryption keys | Total compromise. Attacker has full control. Data loss, financial ruin, legal liability. |

**Storage decisions based on classification:**

- **Low** — Can be stored in `.env` files or even embedded in client-side code (with domain restrictions and usage quotas configured at the provider). These keys are designed to be somewhat public.
- **Medium** — Should be stored in `.env` files with regular rotation. Consider a secrets manager if the team is growing or if you have compliance requirements.
- **High** — Should be stored in a dedicated secrets manager or vault for production. `.env` files are acceptable for local development only. Require rotation schedules and access logging.
- **Critical** — Must be stored in a vault with audit logging, access policies, and ideally MFA for retrieval. These keys should never exist in `.env` files, even locally. Use the vault's CLI or SDK to inject them at runtime.

The point of this hierarchy is not to create bureaucracy — it is to focus your limited security attention on the secrets that matter most. If you only have time to do one thing, protect the High and Critical secrets. Everything else is secondary.

### 6. Environment Variable Architecture

The Twelve-Factor App methodology (published by Heroku engineers in 2011, still the gold standard for web application configuration) states in Factor III: "Store config in the environment." The core insight is that configuration that varies between environments (development, staging, production) should be injected via environment variables, not embedded in code. This allows the same codebase to run in any environment without modification.

There are two fundamentally different ways environment variables reach your application, and confusing them is a common source of security vulnerabilities:

**Runtime injection** means the variable is set in the process environment when the application starts. The application reads it from `process.env` at the moment it needs it. The value never appears in the built artifacts (the JavaScript bundles, the Docker image layers, the static files). This is how server-side variables work in Node.js, and it is the secure default for secrets.

**Build-time embedding** means the variable is read during the build step (webpack, esbuild, Vite's build process, Next.js's build) and its value is literally inlined into the output JavaScript. The variable's value becomes a string constant in your client-side bundle. Anyone who downloads your JavaScript can see it. This is how framework-prefixed variables work.

**The critical danger of `NEXT_PUBLIC_` in Next.js:** Any environment variable whose name starts with `NEXT_PUBLIC_` is embedded into the client-side JavaScript bundle at build time. It is visible in View Source. It is visible in DevTools. It is visible to every user of your application and every bot that crawls it. If your variable is prefixed with `NEXT_PUBLIC_`, it is not a secret — it is a public value. There are no exceptions to this rule.

**The same applies to `VITE_` in Vite:** Any variable prefixed with `VITE_` is exposed to the client-side bundle via `import.meta.env.VITE_*`. It is readable by anyone.

**Server-only variables in Next.js** (those without the `NEXT_PUBLIC_` prefix) are available in:

- API Routes (`app/api/*/route.ts`)
- Server Components (the default in App Router)
- `getServerSideProps` (Pages Router)
- Server Actions
- Middleware

They are NOT available in:

- Client Components (`'use client'`)
- `getStaticProps` (runs at build time, and the output is static)
- Any code that runs in the browser

**The practical rule:** Put `NEXT_PUBLIC_` or `VITE_` in front of a variable name only if you would be comfortable writing that value on a billboard next to a highway. If the answer is no, the variable must not have the prefix, and it must only be accessed in server-side code.

### 7. Secret Scanning and Pre-Commit Hooks

The best time to catch a secret in your code is before it reaches the remote repository. Once a secret is pushed — even to a private repository — you should consider it compromised. Private repositories can be made public accidentally, access can be shared too broadly, and GitHub itself can have access control misconfigurations. The defense is layered scanning: in your editor, in your pre-commit hooks, in your CI pipeline, and at the platform level.

**GitHub's built-in secret scanning** is a powerful first layer. GitHub scans every push to public repositories (and private repositories on GitHub Enterprise or with GitHub Advanced Security) for known secret patterns from over 200 service providers. When a match is found, GitHub notifies the provider, who can automatically revoke the key. GitHub also offers **push protection**, which blocks the push entirely if a secret is detected, giving you a chance to remove it before it ever reaches the remote. Push protection should be enabled on every repository you own — it is available for free on public repositories.

**Third-party scanning tools** provide additional coverage:

- **gitleaks** — Open-source, regex-based scanner. Fast, configurable, works as a pre-commit hook or CI step. Detects patterns for AWS keys, Stripe keys, GitHub tokens, generic API keys, private keys, and more. The default ruleset covers the vast majority of common secret formats, and you can add custom rules for your specific providers.
- **trufflehog** — Uses both regex patterns and entropy analysis (detecting high-randomness strings that are likely secrets even if they do not match a known pattern). Excellent at finding secrets that do not follow standard formats. Can scan git history, not just the current state.
- **git-secrets** — Developed by AWS Labs, focused on preventing AWS credential leaks. Installs as a git hook and scans every commit for AWS access key patterns.

**Pre-commit hooks with `husky`** are the most effective local protection. A pre-commit hook runs automatically before every commit, and if it exits with a non-zero code, the commit is blocked. By running `gitleaks` in a pre-commit hook, you ensure that no secret can be committed from your machine without being detected:

- Install `husky` as a dev dependency
- Initialize husky to create the `.husky/` directory
- Create a `.husky/pre-commit` script that runs `gitleaks` against staged files
- Every developer on the team installs and uses the same hooks (husky's `prepare` script ensures this)

**Common regex patterns that scanners detect:**

| Pattern | What It Matches |
|---|---|
| `AKIA[0-9A-Z]{16}` | AWS Access Key ID |
| `sk_live_[a-zA-Z0-9]{24,}` | Stripe Live Secret Key |
| `sk_test_[a-zA-Z0-9]{24,}` | Stripe Test Secret Key |
| `ghp_[a-zA-Z0-9]{36}` | GitHub Personal Access Token |
| `gho_[a-zA-Z0-9]{36}` | GitHub OAuth Access Token |
| `github_pat_[a-zA-Z0-9_]{82}` | GitHub Fine-Grained PAT |
| `xoxb-[0-9]{10,}-[a-zA-Z0-9]{24}` | Slack Bot Token |
| `SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}` | SendGrid API Key |
| `-----BEGIN (RSA\|EC\|DSA)? ?PRIVATE KEY-----` | Private Key File Content |

**The critical timing point:** Scanning must happen before push, not after. Every secret scanning tool that runs in CI — while useful for detecting historical leaks — only catches secrets after they have already been pushed to the remote. At that point, the secret should be considered compromised. Pre-commit hooks are the only mechanism that catches secrets before they leave your machine.

### 8. Vault and Secrets Manager Patterns

For solo developers working on small projects, `.env` files with good `.gitignore` discipline are sufficient. But there comes a point where the `.env` approach breaks down and you need a dedicated secrets manager. That transition point typically arrives when one or more of these conditions are true:

- **Multiple environments** — You have development, staging, and production environments, and keeping `.env` files in sync across all of them becomes error-prone and dangerous (accidentally deploying with dev credentials in production).
- **Team size exceeds 2-3 people** — Sharing `.env` files via Slack, email, or even encrypted channels becomes a security liability. New team members need onboarding, departing members require secret rotation.
- **Compliance requirements** — SOC 2, PCI DSS, HIPAA, and GDPR all have requirements around secret storage, access control, and audit logging that `.env` files cannot satisfy.
- **Secrets that need automatic rotation** — Database passwords, API keys with expiration policies, and temporary credentials benefit from automated rotation that secrets managers provide.
- **Audit requirements** — You need to know who accessed what secret and when. `.env` files provide zero audit trail.

**HashiCorp Vault** is the gold standard for secrets management in infrastructure-heavy environments. Key capabilities include dynamic secrets (Vault generates a unique database credential for each application instance, with a TTL lease that automatically expires), granular policies (team A can only access secrets in path `secret/team-a/*`), comprehensive audit logging (every read and write is logged with the identity of the requestor), and encryption as a service (Vault can encrypt data without your application ever seeing the raw encryption key).

**AWS Secrets Manager** is the natural choice for teams already on AWS. It provides automatic rotation for Amazon RDS credentials (Vault generates new database passwords on a schedule and updates both the secret and the database), cross-account access for organizations with multiple AWS accounts, and native integration with ECS, Lambda, and other AWS services. The cost is $0.40 per secret per month plus $0.05 per 10,000 API calls.

**AWS Systems Manager Parameter Store** is a free alternative for small teams. The standard tier allows up to 10,000 parameters at no cost, with no rotation automation but with KMS encryption and IAM-based access control. For teams that only need to store a handful of secrets and are willing to rotate manually, Parameter Store is an excellent starting point.

**Google Secret Manager** is the GCP equivalent, with automatic replication across regions, IAM-based access control, and versioning (you can access previous versions of a secret, which is useful during rotation).

**Doppler** is a startup-friendly option that deserves special mention for vibe coders. It syncs secrets to your local `.env` file for development (so your local workflow does not change), integrates with every major CI/CD platform, provides a web dashboard for non-technical team members, and supports environment-level access control out of the box. The free tier supports up to 5 team members.

**Two patterns for secret delivery:**

- **Fetch-at-runtime** — The application calls the secrets manager API on startup, retrieves the secrets it needs, and stores them in memory. The secrets never exist on disk. This is the more secure pattern but requires network access to the secrets manager and adds startup latency.
- **Inject-at-deploy** — The CI/CD pipeline fetches secrets from the manager and injects them as environment variables into the deployment target (Kubernetes secrets, ECS task definitions, serverless function configuration). The secrets exist in the orchestration layer's memory but not in source code or build artifacts. This is simpler to implement and does not require the application to know about the secrets manager.

For most vibe coders, the recommended progression is: start with `.env` files and good `.gitignore` discipline, graduate to Doppler or AWS Parameter Store when you add a second team member or a second environment, and move to Vault or AWS Secrets Manager when you have compliance requirements or need dynamic secrets.

### 9. CI/CD Secrets Management

Continuous Integration and Continuous Deployment pipelines need access to secrets (deployment credentials, API keys for integration tests, signing keys for artifacts), but CI/CD environments present unique security challenges. The pipeline runs in an ephemeral environment you do not fully control, the logs are often visible to the entire team, and third-party actions or plugins may have access to the pipeline's environment.

**GitHub Actions secrets** are the most common mechanism for GitHub-hosted projects. There are two types:

- **Repository secrets** — Available to all workflows in the repository. Set via Settings > Secrets and variables > Actions. Accessed in workflows as `${{ secrets.SECRET_NAME }}`.
- **Environment secrets** — Scoped to a specific environment (e.g., `staging` or `production`). The workflow must declare `environment: production` to access them. Environments can have protection rules: required reviewers (a team lead must approve before the production deployment runs), wait timers, and branch restrictions (only the `main` branch can deploy to production).

**How GitHub Actions secrets work under the hood:** Secrets are encrypted at rest using libsodium sealed boxes. They are decrypted and injected as environment variables only for the duration of the workflow run. GitHub automatically masks secret values in logs — if the exact secret string appears in log output, it is replaced with `***`. However, this masking is not foolproof. A malicious or compromised GitHub Action can exfiltrate secrets by encoding them in base64 (which does not match the masking filter), by writing them to an artifact file, or by sending them to an external HTTP endpoint. This is why you should audit every third-party action you use and prefer pinning actions to a specific commit SHA rather than a mutable tag.

**Environment protection rules** are essential for production safety. At minimum, configure:

- Required reviewers for the production environment (a human must approve)
- Branch restrictions limiting production deployments to the `main` branch only
- A wait timer (even 5 minutes) that gives you a window to cancel an accidental production deployment

**Docker secrets require special attention.** The two most common mistakes with Docker are:

- **Using `ENV` for secrets in Dockerfiles** — The `ENV` instruction persists the value in the image layer. Anyone who pulls your image can run `docker inspect` or `docker history` and see the secret in plain text. This is true even if you "unset" the variable in a later layer, because each layer is independently inspectable.
- **Using `ARG` for secrets in Dockerfiles** — While `ARG` values are not persisted in the final image in the same way as `ENV`, they are still visible in `docker history` and in the build cache. They are not a safe mechanism for secrets.

The correct approach for build-time secrets in Docker is **BuildKit's `--mount=type=secret`**, which mounts a secret file into the build container for a single `RUN` step without persisting it in any layer. For runtime secrets, inject them via environment variables at container startup (`docker run -e SECRET=value` or via Kubernetes secrets / ECS task definitions).

**Universal CI/CD rules:**

- Never `echo` or `printenv` secrets in CI logs, even for debugging. If you need to verify a secret is set, check its length or check that it is non-empty without printing the value.
- Never write secrets to files that are uploaded as build artifacts.
- Use OIDC (OpenID Connect) for cloud provider authentication from CI/CD where possible, instead of long-lived credentials. GitHub Actions supports OIDC federation with AWS, GCP, and Azure.
- Scope CI/CD secrets to the minimum permissions needed. The deployment key should only have deploy permissions, not admin access.

### 10. Client-Side Secret Exposure

This principle cannot be stated clearly enough: **any value embedded in client-side JavaScript is visible to every user of your application.** There is no way to hide a value in JavaScript that runs in the browser. Minification does not hide it (it just renames variables). Obfuscation does not hide it (it just makes it harder to read, but not impossible). Webpack or esbuild bundling does not hide it (the value is a string literal in the output). If a value is in the JavaScript bundle that the browser downloads, it is public.

This means every API key, every token, every secret that appears in your frontend code can be found by anyone who opens DevTools, views the page source, or runs a simple string search on the downloaded JavaScript files. Automated tools make this trivially easy.

**The BFF (Backend For Frontend) proxy pattern** is the standard solution. Instead of calling external APIs directly from the frontend with a secret key, you create a server-side endpoint that acts as a proxy:

1. The frontend calls YOUR server (e.g., `POST /api/generate-text` with the user's prompt)
2. Your server validates the request (is the user authenticated? is the request rate-limited? is the input valid?)
3. Your server calls the external API (e.g., OpenAI) using the secret key stored in a server-only environment variable
4. Your server returns only the necessary data to the frontend
5. The secret key never appears in client-side code, network requests visible in DevTools, or the JavaScript bundle

Next.js makes this pattern particularly natural with API Routes (App Router: `app/api/*/route.ts`) and Server Actions. The secret lives in a server-only environment variable, the API route or Server Action accesses it on the server, and the frontend never sees it.

**Compensating controls for necessarily-public keys** — Some API keys are designed to be used client-side. The Google Maps JavaScript API requires a key in the script tag. Stripe's publishable key (`pk_live_`) must be in the frontend for Stripe Elements to work. For these keys:

- **Domain/HTTP referrer restrictions** — Configure the key at the provider's dashboard to only accept requests from your domain(s). This prevents someone from using your key on their own site.
- **IP restrictions** — Where supported, restrict server-side keys to your server's IP addresses.
- **Usage quotas** — Set daily or monthly usage limits so that even if the key is abused, the financial damage is capped.
- **Separate keys for separate concerns** — Use a different Google Maps key for your marketing site than for your application, so you can set different restrictions and quotas.

Even with these controls, treat every client-side key as potentially abused and design your billing alerts and quotas accordingly. A $50 quota on a Google Maps API key is much better than discovering a $5,000 bill because someone used your unrestricted key for their geocoding project.

### 11. Emergency Response: "I Accidentally Committed My API Key"

This will happen to you. It happens to virtually every developer at least once. The question is not whether it will happen but how quickly and effectively you respond. Speed is everything — every minute the secret is exposed is a minute an attacker can exploit it.

**IMMEDIATELY (within minutes of discovery):**

1. **Revoke or rotate the exposed key at the provider's dashboard.** This is step one. Not step three. Not "after you clean up the repo." Step one. Go to the Stripe dashboard, the AWS console, the OpenAI platform, whatever provider issued the key, and revoke it or generate a new one. Your application may break temporarily. That is acceptable. A broken application is infinitely better than an exploited one.

2. **Check the provider's usage logs for unauthorized activity.** Most providers show API usage logs. Look for requests you did not make, unusual geographic origins, unexpected endpoints, or volume spikes. If you see unauthorized activity, you now have an active breach and should engage your incident response process (notify your team, potentially notify affected users, potentially notify law enforcement if customer data was accessed).

3. **Do NOT just delete the file and commit.** This is the most common mistake. Running `git rm .env && git commit -m "remove secrets"` removes the file from the current state of the repository, but the file — and its contents — still exist in the git history. Anyone who clones the repo and runs `git log --all --full-history -- .env` can see every version of that file. The secret is still exposed.

**THEN (within hours):**

4. **Remove the secret from git history.** The recommended tool is `git filter-repo` (a Python-based tool that has officially replaced the older `git filter-branch`). An alternative is BFG Repo Cleaner, which is faster but less flexible. Both tools rewrite the repository's history to remove the specified file or string from every commit.

5. **Force-push to all branches.** After rewriting history, you must force-push (`git push --force --all` and `git push --force --tags`) to update the remote repository. This is one of the very few situations where force-pushing is correct and necessary.

6. **Notify your team to re-clone.** After a history rewrite, every team member's local clone has the old (compromised) history. They must delete their local clone and re-clone from the remote, or use `git fetch --all && git reset --hard origin/main` on each branch. This is disruptive, which is why preventing the leak in the first place is so important.

7. **Rotate ALL secrets that were in the same file.** If your `.env` file contained your database password, your Stripe key, your OpenAI key, and your email service key, and any one of them was exposed, you must assume ALL of them were compromised. Rotate every secret that was in the same file or the same commit.

8. **Check GitHub's Security tab.** Go to your repository's Security tab and look for "Secret scanning alerts." GitHub may have already detected the leak and notified the provider. If push protection was enabled, it may have blocked the push entirely (in which case the secret never reached the remote, and you are safe — but you should still rotate the key as a precaution).

9. **Conduct a brief post-mortem.** How did this happen? Was `.gitignore` missing? Did someone run `git add .` without checking? Was a pre-commit hook not installed? Fix the root cause so it does not happen again.

**Remember:** GitHub's event data, forks, pull requests, and cached pages may retain the exposed secret even after you rewrite history. If the repository is public, assume the secret was captured by automated scanners within seconds of the push. Revocation is non-negotiable.

### 12. Secrets in Team Environments

When you are the only developer on a project, secrets management is relatively simple: keep them in your `.env.local` file and do not commit them. When a second person joins the project, everything changes. You need to get them the secrets somehow, and the "somehow" is where most teams introduce their worst security vulnerabilities.

**Never share secrets through these channels:**

- **Slack or Discord DMs** — These platforms store message history indefinitely (on paid plans), index messages for search, and are accessible to workspace admins. A secret shared in a Slack DM is a secret stored in Salesforce's infrastructure forever.
- **Email** — Email is stored in plain text on mail servers, is forwarded and CC'd unpredictably, and is often retained for years by organizational backup policies. Email is one of the least secure communication channels that exists.
- **Text messages (SMS, iMessage, WhatsApp)** — These are backed up to cloud services, synced across devices, and accessible to carriers (SMS) or platform providers.
- **Shared documents (Google Docs, Notion, Confluence)** — These have access controls, but those controls change over time. A Google Doc shared with "anyone with the link" is one URL leak away from being public.
- **Screenshots or photos** — Not searchable by automated tools but trivially readable by humans, and stored in photo libraries that sync to the cloud.

**Secure methods for sharing secrets in teams:**

- **1Password or Bitwarden team vaults** — Create a shared vault per project. New team members are granted access to the vault. Secrets are retrieved from the vault, not from messages. When someone leaves the team, their vault access is revoked. Both tools have CLI integrations that can inject secrets into `.env` files locally.
- **Doppler** — Each team member connects their local environment to Doppler, which syncs the correct secrets for their environment. No manual sharing required. Doppler's access control ensures each person only sees secrets for their role.
- **`age`-encrypted files in the repository** — For small teams that want to avoid external services, you can commit encrypted secret files to the repo using `age` (a modern, simple encryption tool). Each team member has an `age` key pair, and the secrets file is encrypted to all team members' public keys. This approach keeps secrets in the repo (convenient) while ensuring they are encrypted (secure).

**Onboarding process:**

1. New developer is granted access to the project's password vault or secrets manager, scoped to their role (a frontend developer does not need database credentials).
2. They retrieve or sync secrets to their local `.env.local` file.
3. They verify their environment works by running the application.
4. At no point are raw credentials transmitted via any messaging platform.

**Offboarding process (this is non-negotiable):**

1. Remove the departing team member's access to all secrets managers, vaults, and cloud consoles.
2. **Rotate every secret they had access to.** Every single one. Even if you trust them completely. Even if they left on good terms. People's devices get stolen. People's accounts get compromised. The only way to guarantee a departed team member's knowledge of a secret cannot be exploited is to ensure that secret no longer works.
3. Update the secrets in all environments (development, staging, production).
4. Verify the application still works with the new secrets.
5. Document the rotation in your team's security log.

The offboarding rotation is the step most teams skip because it is inconvenient. It is also the step that prevents the breach that happens six months later when a former contractor's laptop is stolen.

### 13. The `.env.example` Contract

Every project that uses environment variables must have a `.env.example` file committed to the repository. This file is not optional. It is not a nice-to-have. It is a contract between the project and every developer (present and future) who will work on it. Without it, a new developer cloning the repository has no idea what environment variables are required, what format they should be in, or what services the application depends on.

The `.env.example` file serves three critical purposes:

**Documentation** — It is the authoritative source of truth for what environment variables the application requires. Every variable should have a comment explaining what it is, where to get it, and what format it should be in. This documentation lives next to the code, not in a wiki that nobody updates.

**Onboarding** — When a new developer clones the repository, their first step is `cp .env.example .env.local` and then filling in the values. The `.env.example` file makes this process self-service — they can see exactly what they need without asking anyone.

**CI validation** — A startup script or the application's environment validation module (see Example 5) can compare the variables in `.env.example` against the variables actually set in the environment and fail fast if any are missing. This catches configuration errors at startup, not at 3 AM when a user triggers the one code path that accesses the unset variable.

**Format rules for `.env.example`:**

- Group variables by service with comment headers
- Use clearly fake placeholder values that could never be mistaken for real credentials: `your-stripe-secret-key-here` (good), `sk_test_abc123def456` (bad — this looks real and could actually be a real test key)
- Include the format/pattern in the placeholder so the developer knows what to expect: `your-database-url-here (format: postgresql://user:pass@host:5432/db)`
- Include a URL or description of where to obtain each credential: `# Get from https://dashboard.stripe.com/apikeys`
- Mark which variables are optional vs required: `# Required` or `# Optional (defaults to 3000)`

**The `.env.example` should always be committed to Git.** It contains no real secrets, only placeholders and documentation. It should be updated every time a new environment variable is added to the project. Treating `.env.example` maintenance as part of the definition of done for any feature that introduces a new environment variable ensures it never falls out of date.

---

## LLM Instructions

### 1. Setting Up a New Project's Secret Infrastructure

When you are tasked with creating a new project — whether from a framework starter, a boilerplate, or from scratch — the secret infrastructure must be the very first thing you set up, before any application code is written and before the first commit is made. This is not optional and it is not something to "add later."

Begin by creating a comprehensive `.gitignore` file tailored to the project's technology stack. The file must cover all environment file patterns (with an explicit negation for `.env.example`), all private key and certificate extensions, OS-generated files, IDE configuration directories, dependency directories, build output directories, and log files. If the project uses Node.js, include `node_modules/`. If it uses Python, include `.venv/`, `__pycache__/`, and `*.pyc`. Verify the `.gitignore` is complete for the stack before proceeding.

Next, create a `.env.example` file that documents every environment variable the application will need. Group variables by service, include comments explaining each variable's purpose and where to obtain the credential, and use clearly fake placeholder values. Never use values that could be mistaken for real credentials.

After the `.gitignore` and `.env.example` are in place, set up `husky` for pre-commit hooks and configure `gitleaks` as the secret scanning tool. The pre-commit hook should run `gitleaks` against staged files so that any commit containing a secret pattern is blocked before it reaches the repository. Include the `gitleaks` configuration in the project so the scanning rules are shared across all team members.

Before making the initial commit, run `git status` and verify that no `.env` files (other than `.env.example`), no private key files, and no other sensitive files appear in the list of tracked files. Only proceed with the commit after this verification.

### 2. Handling Environment Variables in Framework Projects

When working with Next.js projects, use the `NEXT_PUBLIC_` prefix only for values that are intentionally and necessarily public: the site URL, an analytics tracking ID, a reCAPTCHA site key. All secrets — database credentials, API keys for external services, OAuth client secrets, encryption keys — must use non-prefixed variable names and must only be accessed in server-side code: API Routes in the App Router, Server Components, Server Actions, middleware, or `getServerSideProps` in the Pages Router. If a user asks you to access a secret in a Client Component or in code that runs in the browser, refuse and explain that the secret would be exposed to every user. Instead, create a server-side API route that acts as a proxy.

For Vite projects, the same principle applies with the `VITE_` prefix. Variables prefixed with `VITE_` are embedded in the client-side bundle via `import.meta.env` and are visible to everyone. Server-only secrets in Vite projects must be accessed through a backend server (Express, Fastify, or a serverless function) that the Vite frontend calls.

For Express or standalone Node.js projects, use the `dotenv` package to load environment variables. The `require('dotenv').config()` or `import 'dotenv/config'` call must be the very first line in the application's entry file, before any other imports that might access `process.env`. This ensures all variables are available when subsequent modules initialize.

For Docker Compose projects, use the `env_file` directive in the compose file to point to a `.env` file. Never inline secret values directly in the `docker-compose.yml` file, as this file is typically committed to the repository.

Always recommend environment variable validation at startup using a schema validation library like Zod. This ensures the application fails fast with a clear error message when a required variable is missing, rather than crashing at runtime when the unset variable is first accessed.

### 3. Implementing the BFF Proxy Pattern

When a user asks you to call a third-party API from the frontend — for example, "call the OpenAI API from my React app" or "use the Stripe API in my component" — you must never put the API key in the frontend code. This is a hard rule with no exceptions for secret keys.

Instead, implement the Backend For Frontend proxy pattern. Create a server-side API route that serves as the intermediary between the frontend and the external service. The route should perform the following steps in order: first, validate the incoming request (check authentication, validate the request body schema, enforce rate limits); second, retrieve the API key from a server-only environment variable; third, call the external API with the secret key; fourth, process the response and return only the data the frontend needs, stripping any sensitive metadata.

In Next.js App Router projects, this means creating a route handler at a path like `app/api/ai/route.ts` that exports a POST function. The function reads the API key from `process.env` (no `NEXT_PUBLIC_` prefix), calls the external API, and returns the response. The frontend component calls this internal route using `fetch('/api/ai', ...)` and never interacts with the external API directly.

For projects without a built-in server-side layer (e.g., a pure Vite SPA), you must create a separate backend service (an Express server, a serverless function, or an edge function) that holds the secrets and proxies the requests. Explain to the user why this additional layer is necessary and that it is the standard industry practice for protecting API keys.

### 4. Responding to Secret Exposure

When a user tells you they accidentally committed a secret — whether they say "I pushed my API key," "my .env file is in the repo," "I think my Stripe key is on GitHub," or any variation — treat it as an active security emergency. Do not downplay the severity. Do not suggest they "just delete the file."

Walk through the full incident response procedure immediately. First, direct them to revoke or rotate the exposed key at the provider's dashboard right now, before doing anything else. Emphasize that this is time-critical and that automated bots scan GitHub pushes in real-time. Second, tell them to check the provider's usage logs for any unauthorized access. Third, explain that deleting the file and committing does not remove it from git history — the secret is still accessible in previous commits. Fourth, walk them through removing the secret from history using `git filter-repo` or BFG Repo Cleaner, force-pushing the cleaned history, and notifying team members to re-clone. Fifth, tell them to rotate every other secret that was in the same file, since if one was exposed, all should be considered compromised.

Do not skip any of these steps, even if the user says "it was only up for a few seconds" or "the repo is private." Automated scanners operate in seconds, and private repositories can become public or be accessed through compromised GitHub credentials.

### 5. Generating .gitignore Files

When creating or initializing a project, always generate a thorough `.gitignore` file as part of the very first step. The file should be organized into clearly commented sections covering the following categories.

Environment and secret files: all `.env` variants with an explicit negation for `.env.example`, private key files in all common formats (PEM, KEY, P12, PFX, CERT), and any other credential or token files specific to the stack.

Operating system files: `.DS_Store` for macOS, `Thumbs.db` and `Desktop.ini` for Windows, and any other OS-generated metadata files.

IDE and editor configurations: `.idea/` for JetBrains IDEs (which can contain database credentials in workspace files), `.vscode/settings.json` (which may contain extension-specific tokens while still allowing `.vscode/extensions.json` to be committed), Sublime Text workspace files, and Vim swap files.

Dependencies and package manager artifacts: `node_modules/` for Node.js, `.venv/` and `__pycache__/` for Python, `vendor/` for PHP and Go, and any other language-specific dependency directories.

Build output: `dist/`, `build/`, `.next/`, `.nuxt/`, `.output/`, `.vercel/`, and any other framework-specific build directories.

Test and coverage output: `coverage/`, `.nyc_output/`, `*.lcov`, and test result files.

Log files: `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`, and any other log file patterns.

Framework-specific sensitive files: `.vercel/` (Vercel deployment config), `.netlify/` (Netlify config), `amplify/` (AWS Amplify config), and any other deployment platform directories that may contain credentials or project-specific configurations.

### 6. Setting Up Secret Scanning

When a user asks you to set up security tooling for their project, or when you are initializing a project that will contain secrets, install and configure `gitleaks` with `husky` pre-commit hooks as part of the project setup.

For npm-based projects, install `husky` as a development dependency and run the initialization command to create the `.husky/` directory with the necessary git hook scripts. Create the pre-commit hook file inside the `.husky/` directory that runs `gitleaks` in pre-commit mode against staged files. This ensures that every commit is scanned for secret patterns before it is created.

Create a `.gitleaks.toml` configuration file at the project root. The configuration should include the default rules for common secret patterns (AWS keys, Stripe keys, GitHub tokens, generic private keys) and any custom rules for API keys specific to the services the project uses. Include an allowlist section that permits known false positives (such as placeholder values in `.env.example` or test fixtures) without suppressing real detections.

For GitHub repositories, remind the user to enable push protection in the repository's Security settings under "Code security and analysis." Push protection is free for public repositories and available with GitHub Advanced Security for private repositories. It provides a second layer of defense at the platform level, catching secrets that might slip past local pre-commit hooks.

Additionally, recommend adding a `gitleaks` step to the CI pipeline (a GitHub Actions workflow that runs `gitleaks detect` on every pull request) as a third layer of defense. This catches secrets committed by contributors who may not have the pre-commit hooks installed locally.

---

## Examples

### 1. Complete .gitignore for a Full-Stack JavaScript Project

```gitignore
# ============================================
# Environment & Secret Files
# ============================================
# Block all .env files EXCEPT .env.example
.env
.env.*
!.env.example

# Private keys and certificates
*.pem
*.key
*.p12
*.pfx
*.cert
*.crt
*.csr
*.jks
*.keystore

# ============================================
# Operating System Files
# ============================================
.DS_Store
Thumbs.db
Desktop.ini
._*

# ============================================
# IDE & Editor Configurations
# ============================================
# JetBrains IDEs (may store DB credentials in workspace)
.idea/

# VS Code - block settings (may contain tokens)
# but allow recommended extensions
.vscode/*
!.vscode/extensions.json
!.vscode/launch.json

# Sublime Text
*.sublime-workspace
*.sublime-project

# Vim
*.swp
*.swo
*~

# ============================================
# Dependencies
# ============================================
node_modules/
.pnp
.pnp.js
.yarn/install-state.gz

# ============================================
# Build Output
# ============================================
dist/
build/
.next/
.nuxt/
.output/
out/
.vercel/
.netlify/

# ============================================
# Test & Coverage
# ============================================
coverage/
.nyc_output/
*.lcov
.vitest/

# ============================================
# Log Files
# ============================================
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# ============================================
# Miscellaneous
# ============================================
# Sentry config (may contain auth token)
.sentryclirc

# Turbo cache
.turbo/

# TypeScript build info
*.tsbuildinfo

# Local Prisma files
prisma/*.db
prisma/*.db-journal

# Wrangler (Cloudflare Workers)
.wrangler/
.dev.vars
```

### 2. The .env.example / .env.local Pattern (Next.js with @t3-oss/env-nextjs)

The `.env.example` file committed to the repository:

```bash
# ============================================
# DATABASE
# ============================================
# PostgreSQL connection string
# Get from: your database provider (Neon, Supabase, PlanetScale, etc.)
# Format: postgresql://user:password@host:port/database
DATABASE_URL=your-database-url-here

# ============================================
# AUTHENTICATION (NextAuth.js / Auth.js)
# ============================================
# Random secret for session encryption
# Generate with: openssl rand -base64 32
AUTH_SECRET=your-auth-secret-here

# Google OAuth credentials
# Get from: https://console.cloud.google.com/apis/credentials
AUTH_GOOGLE_ID=your-google-client-id-here
AUTH_GOOGLE_SECRET=your-google-client-secret-here

# ============================================
# STRIPE
# ============================================
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=your-stripe-secret-key-here
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret-here

# Publishable key (safe for client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key-here

# ============================================
# AI / OPENAI
# ============================================
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here

# ============================================
# EMAIL (Resend)
# ============================================
# Get from: https://resend.com/api-keys
RESEND_API_KEY=your-resend-api-key-here

# ============================================
# PUBLIC / CLIENT-SIDE
# ============================================
# Your app's public URL (no trailing slash)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# PostHog analytics (optional)
# NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key-here
# NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

The `env.ts` validation file using `@t3-oss/env-nextjs` with Zod:

```typescript
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Server-side environment variables — never exposed to the client.
   * Accessed via: env.DATABASE_URL (in server code only)
   */
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .startsWith("postgresql://", "Must be a PostgreSQL connection string"),

    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters"),

    AUTH_GOOGLE_ID: z.string().min(1, "Google OAuth client ID is required"),
    AUTH_GOOGLE_SECRET: z
      .string()
      .min(1, "Google OAuth client secret is required"),

    STRIPE_SECRET_KEY: z
      .string()
      .startsWith("sk_", "Stripe secret key must start with sk_"),

    STRIPE_WEBHOOK_SECRET: z
      .string()
      .startsWith("whsec_", "Stripe webhook secret must start with whsec_"),

    OPENAI_API_KEY: z
      .string()
      .startsWith("sk-", "OpenAI API key must start with sk-"),

    RESEND_API_KEY: z
      .string()
      .startsWith("re_", "Resend API key must start with re_"),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /*
   * Client-side environment variables — embedded in the browser bundle.
   * ONLY put values here that are safe for public exposure.
   * Accessed via: env.NEXT_PUBLIC_APP_URL (in any code)
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
      .string()
      .startsWith("pk_", "Stripe publishable key must start with pk_"),
  },

  /*
   * Runtime values — must match the keys defined above.
   * This bridges process.env to the typed env object.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },

  /*
   * Skip validation in edge runtime or when building with Docker
   * where not all env vars are available at build time.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /*
   * Treat empty strings as undefined (catches `VAR=` mistakes).
   */
  emptyStringAsUndefined: true,
});
```

Importing and using the validated environment:

```typescript
// In a Server Component or API Route:
import { env } from "@/env";

// TypeScript knows the exact type — no undefined checks needed
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.OPENAI_API_KEY}`, // string, guaranteed
  },
  body: JSON.stringify({ model: "gpt-4o", messages }),
});
```

If a required variable is missing, the application fails at startup with a clear error:

```
❌ Invalid environment variables:
  DATABASE_URL: Must be a PostgreSQL connection string (received: undefined)
  STRIPE_SECRET_KEY: Stripe secret key must start with sk_ (received: undefined)
```

### 3. Pre-Commit Hook Setup with Husky + Gitleaks

Step 1 — Install husky:

```bash
# Install husky as a dev dependency
npm install -D husky

# Initialize husky (creates .husky/ directory and updates package.json)
npx husky init
```

Step 2 — Install gitleaks (macOS with Homebrew, or download the binary):

```bash
# macOS
brew install gitleaks

# Or download from GitHub releases for any platform:
# https://github.com/gitleaks/gitleaks/releases
```

Step 3 — Create the pre-commit hook:

```bash
#!/usr/bin/env sh
# .husky/pre-commit
# Run gitleaks to scan staged files for secrets before committing

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
  echo "⚠️  gitleaks is not installed. Install it with: brew install gitleaks"
  echo "   Skipping secret scan. Install gitleaks to enable pre-commit scanning."
  exit 0
fi

# Scan only staged changes (fast, only checks what you're about to commit)
gitleaks git --pre-commit --staged --verbose

# If gitleaks finds a secret, it exits with code 1 and the commit is blocked.
# If no secrets are found, it exits with code 0 and the commit proceeds.
```

Step 4 — Make the hook executable:

```bash
chmod +x .husky/pre-commit
```

Step 5 — Create the gitleaks configuration file:

```toml
# .gitleaks.toml
# Gitleaks configuration for secret scanning

title = "Project Secret Scanning Rules"

# =============================================
# Custom rules (supplement the built-in rules)
# =============================================

[[rules]]
id = "stripe-secret-key"
description = "Stripe Secret Key"
regex = '''sk_(live|test)_[a-zA-Z0-9]{24,}'''
tags = ["stripe", "secret", "financial"]

[[rules]]
id = "stripe-webhook-secret"
description = "Stripe Webhook Secret"
regex = '''whsec_[a-zA-Z0-9]{32,}'''
tags = ["stripe", "secret"]

[[rules]]
id = "openai-api-key"
description = "OpenAI API Key"
regex = '''sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,}'''
tags = ["openai", "secret", "ai"]

[[rules]]
id = "openai-api-key-v2"
description = "OpenAI API Key (new format)"
regex = '''sk-proj-[a-zA-Z0-9_-]{40,}'''
tags = ["openai", "secret", "ai"]

[[rules]]
id = "resend-api-key"
description = "Resend API Key"
regex = '''re_[a-zA-Z0-9]{20,}'''
tags = ["resend", "secret", "email"]

[[rules]]
id = "supabase-service-role"
description = "Supabase Service Role Key"
regex = '''eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{40,}'''
tags = ["supabase", "secret"]

[[rules]]
id = "database-url-with-password"
description = "Database URL with embedded password"
regex = '''(postgresql|mysql|mongodb(\+srv)?):\/\/[^:]+:[^@]+@[^\/]+\/'''
tags = ["database", "secret"]

[[rules]]
id = "generic-high-entropy"
description = "Generic API Key assignment"
regex = '''(?i)(api[_-]?key|api[_-]?secret|access[_-]?token|secret[_-]?key)\s*[=:]\s*['"][a-zA-Z0-9\/+]{32,}['"]'''
tags = ["generic", "secret"]

# =============================================
# Allowlist (suppress known false positives)
# =============================================

[allowlist]
description = "Global allowlist"

# Allow placeholder values in example files
paths = [
  '''.env\.example$''',
  '''\.gitleaks\.toml$''',
  '''.*test.*fixture.*''',
  '''.*\.test\.(ts|js|tsx|jsx)$''',
  '''.*\.spec\.(ts|js|tsx|jsx)$''',
]

# Allow known non-secret patterns
regexes = [
  '''your-[a-z-]+-here''',
  '''placeholder''',
  '''CHANGE_ME''',
  '''xxx+''',
]
```

Step 6 — Add the `prepare` script to `package.json` so husky is installed automatically for all developers:

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9.0.0"
  }
}
```

When a developer clones the repo and runs `npm install`, the `prepare` script runs automatically and sets up the git hooks. The next time they try to commit a file containing a pattern that matches a secret, the commit is blocked:

```bash
$ git commit -m "add feature"

    ○
    │╲
    │ ○
    ○ ░
    ░    gitleaks

Finding:     STRIPE_SECRET_KEY=sk_live_51J3K8LMN...
Secret:      sk_live_51J3K8LMN...
RuleID:      stripe-secret-key
File:        src/lib/stripe.ts
Line:        3

12:34PM WRN leaks found: 1

❌ Secret detected in staged files. Commit blocked.
   Remove the secret and use an environment variable instead.
```

### 4. BFF Proxy Route (Next.js API Route)

The server-side API route that holds the secret:

```typescript
// app/api/ai/route.ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";

// Rate limiter: 10 requests per 60 seconds per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
});

// Request body schema
const requestSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(2000, "Prompt must be under 2000 characters"),
  model: z.enum(["gpt-4o", "gpt-4o-mini"]).default("gpt-4o-mini"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, model } = parsed.data;

    // 3. Call OpenAI with the server-only API key
    //    env.OPENAI_API_KEY is NEVER exposed to the client.
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Be concise.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("OpenAI API error:", response.status, errorData);
      return NextResponse.json(
        { error: "AI service unavailable. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();

    // 4. Return ONLY the response text — no raw API response,
    //    no usage metadata that could leak model info
    return NextResponse.json({
      message: data.choices[0]?.message?.content ?? "",
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

The frontend component that calls the internal route:

```typescript
// components/ai-chat.tsx
"use client";

import { useState } from "react";

export function AiChat() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Call YOUR internal API route — NOT the OpenAI API directly.
      // The API key lives on the server and never reaches this code.
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Request failed");
      }

      const data = await res.json();
      setResponse(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask a question..."
        maxLength={2000}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Thinking..." : "Send"}
      </button>
      {error && <p role="alert">{error}</p>}
      {response && <div>{response}</div>}
    </form>
  );
}

// Notice: there is no API key anywhere in this file.
// The browser's Network tab will show a request to /api/ai,
// NOT a request to api.openai.com.
// The OpenAI API key is invisible to the client.
```

### 5. Environment Variable Validation with Zod (Standalone Node.js / Express)

```typescript
// src/env.ts
// Validates ALL environment variables at startup.
// Import this FIRST in your entry file, before anything else.

import { z } from "zod";
import "dotenv/config"; // Load .env file into process.env

const envSchema = z.object({
  // =============================================
  // Server
  // =============================================
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce // coerce converts string "3000" to number 3000
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  // =============================================
  // Database
  // =============================================
  DATABASE_URL: z
    .string({ required_error: "DATABASE_URL is required" })
    .url("DATABASE_URL must be a valid URL")
    .startsWith("postgresql://", "Only PostgreSQL is supported"),

  // =============================================
  // Authentication
  // =============================================
  JWT_SECRET: z
    .string({ required_error: "JWT_SECRET is required" })
    .min(32, "JWT_SECRET must be at least 32 characters for security"),

  JWT_EXPIRES_IN: z
    .string()
    .default("7d"),

  // =============================================
  // External Services
  // =============================================
  STRIPE_SECRET_KEY: z
    .string({ required_error: "STRIPE_SECRET_KEY is required" })
    .startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_"),

  STRIPE_WEBHOOK_SECRET: z
    .string({ required_error: "STRIPE_WEBHOOK_SECRET is required" })
    .startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_"),

  RESEND_API_KEY: z
    .string({ required_error: "RESEND_API_KEY is required" })
    .startsWith("re_", "RESEND_API_KEY must start with re_"),

  // =============================================
  // Optional Services
  // =============================================
  SENTRY_DSN: z
    .string()
    .url()
    .optional(),

  REDIS_URL: z
    .string()
    .url()
    .optional(),
});

// Parse and validate
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "\n❌ Invalid environment variables:\n",
    parsed.error.flatten().fieldErrors
  );
  console.error(
    "\n💡 Copy .env.example to .env and fill in the required values:\n",
    "   cp .env.example .env\n"
  );
  process.exit(1);
}

// Export the validated, typed environment object
export const env = parsed.data;

// TypeScript now knows the exact shape:
// env.PORT         → number
// env.DATABASE_URL → string
// env.SENTRY_DSN   → string | undefined
// env.NODE_ENV     → "development" | "test" | "production"
```

Using the validated env in the application entry file:

```typescript
// src/index.ts
// Import env FIRST — it loads dotenv and validates variables.
// If validation fails, the process exits here with a clear error.
import { env } from "./env";

import express from "express";
import { connectDatabase } from "./db";
import { apiRouter } from "./routes/api";

const app = express();

app.use(express.json());
app.use("/api", apiRouter);

async function main() {
  await connectDatabase(env.DATABASE_URL);

  app.listen(env.PORT, () => {
    console.log(
      `Server running on port ${env.PORT} in ${env.NODE_ENV} mode`
    );
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

If environment variables are missing, the developer sees this at startup:

```bash
$ npm run dev

❌ Invalid environment variables:
 {
   DATABASE_URL: [ 'DATABASE_URL is required' ],
   JWT_SECRET: [ 'JWT_SECRET must be at least 32 characters for security' ],
   STRIPE_SECRET_KEY: [ 'STRIPE_SECRET_KEY is required' ],
   STRIPE_WEBHOOK_SECRET: [ 'STRIPE_WEBHOOK_SECRET is required' ],
   RESEND_API_KEY: [ 'RESEND_API_KEY is required' ]
 }

💡 Copy .env.example to .env and fill in the required values:
   cp .env.example .env
```

### 6. Emergency Key Rotation Script + Incident Response Checklist

A bash script demonstrating the key rotation and history cleanup workflow:

```bash
#!/usr/bin/env bash
# emergency-key-rotation.sh
# Run this script when a secret has been committed to a repository.
# This script guides you through the incident response process.

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${RED}${BOLD}"
echo "============================================"
echo "  SECRET EXPOSURE INCIDENT RESPONSE"
echo "============================================"
echo -e "${NC}"

# Step 1: Immediate key revocation
echo -e "${RED}${BOLD}STEP 1: REVOKE THE EXPOSED KEY NOW${NC}"
echo ""
echo "Before doing ANYTHING else, go to the provider's dashboard"
echo "and revoke or rotate the exposed key."
echo ""
echo "Common provider dashboards:"
echo "  - AWS:        https://console.aws.amazon.com/iam"
echo "  - Stripe:     https://dashboard.stripe.com/apikeys"
echo "  - OpenAI:     https://platform.openai.com/api-keys"
echo "  - GitHub:     https://github.com/settings/tokens"
echo "  - SendGrid:   https://app.sendgrid.com/settings/api_keys"
echo "  - Supabase:   https://supabase.com/dashboard (Project Settings > API)"
echo "  - Resend:     https://resend.com/api-keys"
echo ""
read -p "Have you revoked/rotated the key at the provider? (yes/no): " REVOKED

if [ "$REVOKED" != "yes" ]; then
  echo -e "${RED}STOP. Revoke the key FIRST. Run this script again after.${NC}"
  exit 1
fi

# Step 2: Check provider logs
echo ""
echo -e "${YELLOW}${BOLD}STEP 2: CHECK PROVIDER USAGE LOGS${NC}"
echo ""
echo "Check the provider's dashboard for:"
echo "  - Requests from unfamiliar IP addresses"
echo "  - Requests outside your normal usage patterns"
echo "  - Unusual geographic origins"
echo "  - Spikes in API usage or charges"
echo ""
read -p "Any signs of unauthorized usage? (yes/no/unsure): " UNAUTHORIZED

if [ "$UNAUTHORIZED" = "yes" ]; then
  echo -e "${RED}${BOLD}ACTIVE BREACH DETECTED.${NC}"
  echo "Consider: notifying affected users, contacting the provider's"
  echo "security team, preserving logs for investigation, consulting legal."
  echo ""
fi

# Step 3: Remove secret from git history
echo ""
echo -e "${YELLOW}${BOLD}STEP 3: REMOVE SECRET FROM GIT HISTORY${NC}"
echo ""

# Check if git-filter-repo is installed
if command -v git-filter-repo &> /dev/null; then
  echo "git-filter-repo is installed. Proceeding..."
  echo ""

  read -p "Enter the file path to remove from history (e.g., .env): " SECRET_FILE

  echo ""
  echo "This will rewrite the entire git history to remove: ${SECRET_FILE}"
  echo -e "${RED}WARNING: This is a destructive operation. Back up your repo first.${NC}"
  read -p "Continue? (yes/no): " CONTINUE

  if [ "$CONTINUE" = "yes" ]; then
    # Create a backup
    BACKUP_DIR="../$(basename "$(pwd)")-backup-$(date +%Y%m%d%H%M%S)"
    echo "Creating backup at: ${BACKUP_DIR}"
    cp -r "$(pwd)" "$BACKUP_DIR"

    # Remove the file from all history
    git filter-repo --invert-paths --path "$SECRET_FILE" --force

    echo -e "${GREEN}History rewritten. ${SECRET_FILE} removed from all commits.${NC}"
  fi
else
  echo "git-filter-repo is NOT installed."
  echo "Install it with: brew install git-filter-repo"
  echo ""
  echo "Alternative: Use BFG Repo Cleaner"
  echo "  1. Download: https://rtyley.github.io/bfg-repo-cleaner/"
  echo "  2. Run: java -jar bfg.jar --delete-files .env"
  echo "  3. Run: git reflog expire --expire=now --all"
  echo "  4. Run: git gc --prune=now --aggressive"
fi

# Step 4: Force push
echo ""
echo -e "${YELLOW}${BOLD}STEP 4: FORCE PUSH TO REMOTE${NC}"
echo ""
echo "After rewriting history, force push ALL branches and tags:"
echo ""
echo "  git push --force --all"
echo "  git push --force --tags"
echo ""
read -p "Force push now? (yes/no): " FORCE_PUSH

if [ "$FORCE_PUSH" = "yes" ]; then
  git push --force --all
  git push --force --tags
  echo -e "${GREEN}Force push complete.${NC}"
fi

# Step 5: Team notification
echo ""
echo -e "${YELLOW}${BOLD}STEP 5: NOTIFY YOUR TEAM${NC}"
echo ""
echo "Send this message to your team:"
echo ""
echo -e "${BOLD}---"
echo "SECURITY INCIDENT: Secret exposure in repository"
echo ""
echo "A secret was accidentally committed and has been removed from"
echo "git history. The affected key has been revoked and rotated."
echo ""
echo "ACTION REQUIRED:"
echo "1. Delete your local clone of this repository"
echo "2. Re-clone from the remote: git clone <repo-url>"
echo "3. Update your .env.local with the new credentials"
echo "   (available in [1Password/Doppler/vault])"
echo "4. Do NOT use git pull — the history has been rewritten"
echo -e "---${NC}"

# Step 6: Rotate all co-located secrets
echo ""
echo -e "${YELLOW}${BOLD}STEP 6: ROTATE ALL CO-LOCATED SECRETS${NC}"
echo ""
echo "If the exposed file contained OTHER secrets, rotate ALL of them."
echo "Assume that if one secret in a file was exposed, every secret"
echo "in that file was captured by automated scanners."
echo ""
echo "Secrets to rotate:"
echo "  [ ] Database credentials"
echo "  [ ] All API keys in the same file"
echo "  [ ] OAuth client secrets"
echo "  [ ] Webhook secrets"
echo "  [ ] JWT signing secrets"
echo "  [ ] Any other credentials in the same file"
echo ""

# Summary
echo -e "${GREEN}${BOLD}"
echo "============================================"
echo "  INCIDENT RESPONSE CHECKLIST SUMMARY"
echo "============================================"
echo -e "${NC}"
echo "  [$([ "$REVOKED" = "yes" ] && echo "x" || echo " ")] Key revoked at provider dashboard"
echo "  [ ] Provider usage logs checked for unauthorized access"
echo "  [ ] Secret removed from git history (git filter-repo)"
echo "  [ ] Force pushed to all branches and tags"
echo "  [ ] Team notified to re-clone"
echo "  [ ] All co-located secrets rotated"
echo "  [ ] New secrets distributed via secure channel"
echo "  [ ] Application verified working with new credentials"
echo "  [ ] GitHub Security tab checked for alerts"
echo "  [ ] Post-mortem documented (root cause + prevention)"
echo ""
echo "Keep this checklist until all items are complete."
```

Incident response checklist as a standalone reference:

```markdown
## Incident Response: Exposed Secret Checklist

### Immediate (within minutes)
- [ ] Revoke/rotate the exposed key at the provider's dashboard
- [ ] Check provider usage logs for unauthorized requests
- [ ] Assess scope: what other secrets were in the same file?

### Within one hour
- [ ] Remove the secret from git history (`git filter-repo`)
- [ ] Force push cleaned history to all remote branches and tags
- [ ] Notify all team members to delete local clones and re-clone
- [ ] Rotate ALL secrets that were in the same file or commit

### Within 24 hours
- [ ] Distribute new secrets via secure channel (vault/1Password)
- [ ] Verify application works with new credentials in all environments
- [ ] Check GitHub Security tab for secret scanning alerts
- [ ] Review CI/CD logs for any exposure of the secret
- [ ] Check if the repo was forked (forks retain the old history)

### Post-incident
- [ ] Document root cause (missing .gitignore? no pre-commit hook?)
- [ ] Implement preventive measures (add hooks, scanning, training)
- [ ] Schedule follow-up review in 30 days
- [ ] If customer data was accessed, follow breach notification procedures
```

---

## Common Mistakes

### 1. Committing .env Files to Git

**Wrong:** The project has no `.gitignore` file, or the `.gitignore` does not include `.env` patterns. The developer runs `git add .` and commits. The `.env` file, complete with database credentials, API keys, and payment processor secrets, is now in the repository history. Even if the repository is private today, it may be made public tomorrow, or a collaborator may fork it publicly.

```
# No .gitignore exists — everything gets committed
$ git add .
$ git commit -m "initial commit"
# .env is now in the repo with all your secrets
```

**Fix:** Create `.gitignore` before the first commit, with `.env*` and `!.env.example` patterns. If `.env` was already committed, run `git rm --cached .env` to untrack it (this does not delete the local file), then commit. If secrets were pushed to a remote, follow the full incident response procedure: revoke keys, clean history with `git filter-repo`, force-push, and rotate all affected secrets.

```bash
# Untrack .env without deleting the local file
git rm --cached .env
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
git add .gitignore
git commit -m "remove .env from tracking and add to .gitignore"
```

### 2. No .gitignore Before First Commit

**Wrong:** The developer creates the project, writes code, makes several commits, and then realizes they should have a `.gitignore`. They create one and add `.env` to it, but the `.env` file was already committed in the first commit. The `.gitignore` entry has no effect on an already-tracked file. The developer believes they are protected but the secret is still tracked and updated with every subsequent commit.

**Fix:** Always create `.gitignore` as the very first file in a new project, before `git init` or the first commit. Use a comprehensive template for your stack. If you missed this step, adding `.gitignore` later only affects new files — you must also run `git rm --cached` on every file that should have been ignored. If those files contained secrets and were pushed, treat it as an incident.

### 3. Using NEXT_PUBLIC_ or VITE_ for Secrets

**Wrong:** The developer names their Stripe secret key `NEXT_PUBLIC_STRIPE_SECRET_KEY` because "the frontend needs it for checkout." This variable is now compiled into the client-side JavaScript bundle. Every user who visits the site can find it in the page source or the downloaded JavaScript. An attacker can use this key to issue refunds, access customer payment data, and create charges.

```
# .env.local — WRONG!
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_51J3K8LMN...
NEXT_PUBLIC_DATABASE_URL=postgresql://admin:password@db.example.com:5432/prod
```

**Fix:** Only use `NEXT_PUBLIC_` (or `VITE_`) for values that are intentionally public: site URL, analytics IDs, publishable keys. All secrets must be non-prefixed and accessed only in server-side code (API routes, Server Components, `getServerSideProps`). If the frontend needs to trigger a payment, it calls your server-side API route, which uses the secret key.

```
# .env.local — CORRECT
STRIPE_SECRET_KEY=sk_live_51J3K8LMN...
DATABASE_URL=postgresql://admin:password@db.example.com:5432/prod
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51J3K8LMN...
NEXT_PUBLIC_APP_URL=https://myapp.com
```

### 4. Hardcoding API Keys in Source Code

**Wrong:** The developer pastes an API key directly into a source file, often copied from AI-generated code or a tutorial. The key is now in the source code, will be committed to git, and is visible to anyone with access to the repository. Even if the developer later removes it, it remains in git history.

```typescript
// src/lib/openai.ts — WRONG!
const openai = new OpenAI({
  apiKey: "sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234",
});
```

**Fix:** Always read API keys from environment variables. Never have a literal secret string in source code. If an AI assistant generates code with a hardcoded key, replace it with an environment variable reference before committing.

```typescript
// src/lib/openai.ts — CORRECT
import { env } from "@/env";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
```

### 5. Sharing Secrets via Slack/Email

**Wrong:** A team lead pastes the production database credentials in a Slack DM to onboard a new developer. The credentials are now stored in Slack's infrastructure indefinitely, searchable by workspace admins, and backed up by Slack's retention policies. If the Slack workspace is compromised (a regular occurrence), those credentials are exposed.

**Fix:** Use a dedicated secrets management tool for team sharing. 1Password and Bitwarden both offer team vaults where secrets can be shared securely with access control. Doppler syncs secrets to each developer's local environment automatically. For a quick secure share, use a tool that generates an expiring, one-time-view link (1Password's "share item" feature, or Yopass for self-hosted). Never put a secret in any messaging platform.

### 6. Same API Key for Dev and Production

**Wrong:** The developer uses the same Stripe secret key, the same database credentials, and the same API keys for both development and production. A mistake during development (accidentally running a script that deletes all records, triggering a webhook loop, exceeding rate limits) directly impacts the production environment and real customers.

**Fix:** Generate separate API keys for each environment. Most providers support multiple keys (Stripe has explicit test vs live modes). Use distinct environment variable files (`.env.development` and `.env.production`) or distinct secrets in your secrets manager. Name keys to make the environment obvious: `STRIPE_SK_TEST` for development, `STRIPE_SK_LIVE` for production. Your development database should be a completely separate instance from production.

### 7. Not Rotating Keys After Team Member Departure

**Wrong:** A developer who had access to all production secrets leaves the team (voluntarily or involuntarily). The remaining team members do not rotate any credentials. Six months later, the departed developer's laptop is stolen, or their personal machine is compromised, and the attacker finds the old credentials cached in the developer's shell history, `.env` files, or password manager.

**Fix:** When any team member with access to secrets departs, immediately rotate every secret they had access to. This means: new database passwords, new API keys, new webhook secrets, new OAuth client secrets — everything. Update all environments with the new credentials. This is disruptive and time-consuming, which is exactly why you should limit secret access to only the people who need it (principle of least privilege applies to humans too). Document which secrets each team member can access so the rotation scope is clear during offboarding.

### 8. Trusting `git rm` to Remove Secrets from History

**Wrong:** The developer realizes a secret was committed, runs `git rm .env`, commits the deletion, and believes the problem is solved. But `git rm` only removes the file from the current working tree and future commits. The file — and the secret it contains — still exists in every previous commit where it was present. Anyone who clones the repository can access the secret by checking out the old commit or using `git log --all --full-history -- .env` followed by `git show`.

```bash
# THIS DOES NOT REMOVE THE SECRET FROM HISTORY
git rm .env
git commit -m "remove .env file"
git push
# The secret is STILL in previous commits!
```

**Fix:** To truly remove a secret from git history, you must rewrite the repository's history using `git filter-repo` (preferred) or BFG Repo Cleaner. After rewriting, force-push to the remote, and have all team members re-clone. But even this is not a guarantee — if the repository is public, automated scanners may have already captured the secret. Always revoke the exposed key first, regardless of any cleanup steps.

```bash
# CORRECT: Remove file from ALL history
git filter-repo --invert-paths --path .env --force
git push --force --all
git push --force --tags
# Team members must delete their local clones and re-clone
```

### 9. Storing Secrets in Docker Images

**Wrong:** The developer puts API keys in the Dockerfile using `ENV` or `ARG` instructions. These values are baked into the image layers permanently. Anyone who pulls the image can extract the secrets using `docker inspect` or `docker history --no-trunc`. If the image is pushed to a public registry, the secrets are public.

```dockerfile
# Dockerfile — WRONG!
FROM node:20-alpine
ENV STRIPE_SECRET_KEY=sk_live_51J3K8LMN...
ENV DATABASE_URL=postgresql://admin:password@db:5432/prod
COPY . .
RUN npm install
CMD ["node", "src/index.js"]
```

**Fix:** Never put secrets in Dockerfiles. For runtime secrets, inject them when starting the container via environment variables (`docker run -e STRIPE_SECRET_KEY=...` or via Kubernetes secrets or ECS task definitions). For build-time secrets (needed only during `docker build`), use BuildKit's secret mount feature, which makes the secret available for a single `RUN` instruction without persisting it in any image layer.

```dockerfile
# Dockerfile — CORRECT
FROM node:20-alpine
COPY package*.json ./
RUN npm ci --production
COPY . .
# No secrets anywhere in the Dockerfile.
# Inject at runtime: docker run -e STRIPE_SECRET_KEY=... myapp
CMD ["node", "src/index.js"]
```

```bash
# For build-time secrets (e.g., private npm registry token):
DOCKER_BUILDKIT=1 docker build \
  --secret id=npmrc,src=.npmrc \
  -t myapp .
```

### 10. No Validation of Environment Variables at Startup

**Wrong:** The application accesses `process.env.STRIPE_SECRET_KEY` deep inside a payment processing function. The variable was never set (the developer forgot to add it to `.env.local`, or the CI/CD pipeline is misconfigured). The application starts successfully, serves traffic, and then crashes at 2 AM when the first user tries to make a purchase. The error message is `TypeError: Cannot read properties of undefined (reading 'startsWith')` — cryptic and unhelpful.

```typescript
// Deep in the application — WRONG!
export async function createCharge(amount: number) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // undefined!
  // Crashes here at runtime, maybe hours after deployment
  return stripe.charges.create({ amount, currency: "usd" });
}
```

**Fix:** Validate all environment variables at application startup using a schema validation library like Zod. If any required variable is missing or has an invalid format, the application refuses to start and prints a clear error message listing exactly which variables are missing. This catches configuration errors at deploy time, not at 2 AM.

```typescript
// src/env.ts — CORRECT: validated at startup
import { z } from "zod";
const env = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
}).parse(process.env);
// If STRIPE_SECRET_KEY is missing, the app crashes HERE
// with a clear message, at startup, before serving any traffic.
export { env };
```

### 11. Logging Environment Variables for Debugging

**Wrong:** The developer is troubleshooting a configuration issue and adds `console.log(process.env)` to dump all environment variables. This logs every secret in the application to the console output — which, in a CI/CD environment, means the secrets appear in the build logs. Build logs are often stored for weeks or months, are accessible to the entire team, and may be accessible to third-party CI services.

```typescript
// WRONG — never do this!
console.log("Debug env:", process.env);
console.log("Stripe key:", process.env.STRIPE_SECRET_KEY);
console.log("Config:", JSON.stringify(process.env, null, 2));
```

**Fix:** Never log environment variables, even temporarily. If you need to verify a variable is set, log whether it exists and its length, not its value. Better yet, use the Zod validation pattern (see Example 5) so you never need to debug whether variables are set — the validation tells you at startup.

```typescript
// CORRECT — verify without exposing
console.log("STRIPE_SECRET_KEY is set:", !!process.env.STRIPE_SECRET_KEY);
console.log("STRIPE_SECRET_KEY length:", process.env.STRIPE_SECRET_KEY?.length);
// Never log the actual value.
```

### 12. .env.example with Real Values

**Wrong:** The developer creates a `.env.example` file but populates it with real API keys (perhaps their test keys, perhaps copied directly from their `.env.local`). The `.env.example` is committed to Git because it is supposed to be committed. The real keys are now in the repository, visible to anyone with access. Even test keys can be problematic — Stripe test keys allow creating test charges and accessing test customer data.

```bash
# .env.example — WRONG! These are real keys!
STRIPE_SECRET_KEY=sk_test_51J3K8LMNoP7Q8R9S0T1U2V3
OPENAI_API_KEY=sk-proj-abc123def456ghi789
DATABASE_URL=postgresql://admin:realpassword@db.example.com:5432/mydb
```

**Fix:** Use clearly fake placeholder values that could never be mistaken for real credentials. Include the format so the developer knows what the real value should look like, and add comments explaining where to obtain each credential.

```bash
# .env.example — CORRECT: clearly fake placeholders
# Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=your-stripe-secret-key-here

# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here

# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://localhost:5432/myapp_dev
```

---

> **See also:** [API-Security](../API-Security/api-security.md) | [Backend-Security](../Backend-Security/backend-security.md) | [Security-Headers-Infrastructure](../Security-Headers-Infrastructure/security-headers-infrastructure.md) | [Security-Testing-Monitoring](../Security-Testing-Monitoring/security-testing-monitoring.md) | [Dependencies-Supply-Chain](../Dependencies-Supply-Chain/dependencies-supply-chain.md)
>
> **Last reviewed:** 2026-02
