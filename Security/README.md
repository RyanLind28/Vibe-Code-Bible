# Security Vibe Coding Knowledge Base

> Application security from secrets management to infrastructure hardening, structured for AI-assisted development. Feed these files to your AI coding assistant to build secure applications by default.

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack multiple files** for complex tasks — the guides cross-reference each other.
4. **Describe what you're building** and the AI now has expert-level security context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| Launching a new SaaS product | `Secrets-Environment` + `Authentication-Identity` + `Security-Headers-Infrastructure` |
| Securing a REST or GraphQL API | `API-Security` + `Backend-Security` + `Secrets-Environment` |
| Adding authentication to an app | `Authentication-Identity` + `Frontend-Security` + `Secrets-Environment` |
| Preparing for GDPR compliance | `Data-Protection` + `Security-Testing-Monitoring` + `Backend-Security` |
| Hardening a Docker deployment | `Security-Headers-Infrastructure` + `Dependencies-Supply-Chain` + `Secrets-Environment` |

**Pro tip:** Start every new project by pasting `Secrets-Environment` into your AI session. This single step prevents the most common and costly security mistake vibe coders make — accidentally committing API keys.

---

## Guides

```
Security/
├── Secrets-Environment/              → .env files, .gitignore, API keys, secret scanning, vaults
├── Authentication-Identity/          → Password hashing, JWT, OAuth, RBAC, MFA, CSRF
├── Backend-Security/                 → SQL injection, SSRF, file uploads, rate limiting, validation
├── Frontend-Security/                → XSS, CSP, CORS, cookies, localStorage, SRI
├── API-Security/                     → OWASP API Top 10, BOLA, GraphQL, webhooks, versioning
├── Data-Protection/                  → Encryption, HTTPS/TLS, PII, GDPR, CCPA, database security
├── Security-Headers-Infrastructure/  → HTTP headers, CSP deep dive, Docker, cloud IAM, CDN
├── Dependencies-Supply-Chain/        → npm audit, lockfiles, Dependabot, SBOMs, typosquatting
└── Security-Testing-Monitoring/      → SAST, DAST, logging, incident response, pentesting
```

### [Secrets & Environment Management](./Secrets-Environment/secrets-environment.md)
API keys, .env files, .gitignore patterns, secret scanning, vault integration, and CI/CD secrets. Includes the .env hierarchy, pre-commit hooks with gitleaks, the BFF proxy pattern, environment variable validation with Zod, and a complete emergency incident response playbook for leaked keys. **Start here for every project.**

### [Authentication & Identity](./Authentication-Identity/authentication-identity.md)
Password hashing (Argon2, bcrypt), JWTs (access + refresh token flow), server-side sessions, OAuth 2.0 with PKCE, RBAC and ABAC authorization, MFA (TOTP, WebAuthn/passkeys), and CSRF protection. Includes Auth.js v5 integration, RBAC middleware with permission checks, and secure password reset flows.

### [Backend Security](./Backend-Security/backend-security.md)
SQL injection prevention (parameterized queries, Prisma, Drizzle), command injection, SSRF, file upload security (MIME validation, presigned S3 URLs), rate limiting, input validation with Zod, error handling without information leakage, path traversal, and mass assignment prevention. Includes a centralized error handler pattern.

### [Frontend Security](./Frontend-Security/frontend-security.md)
XSS prevention (reflected, stored, DOM-based), Content Security Policy with nonces, CORS configuration, secure cookie attributes (HttpOnly, SameSite, __Host- prefix), localStorage risks, iframe protection, DOMPurify sanitization, and Subresource Integrity. Includes CSP middleware for Next.js and Express.

### [API Security](./API-Security/api-security.md)
OWASP API Security Top 10 (2023), BOLA/IDOR prevention, API authentication strategies, rate limiting algorithms, GraphQL security (depth limiting, complexity analysis, introspection), webhook signature verification (Stripe, GitHub), and service-to-service authentication. Includes OpenAPI/Zod validation middleware.

### [Data Protection](./Data-Protection/data-protection.md)
Encryption at rest and in transit, HTTPS/TLS 1.3, PII identification and classification, GDPR compliance (right to access, right to erasure), CCPA/CPRA, data minimization, secure backups, database security, and PostgreSQL Row-Level Security. Includes field-level encryption with AES-256-GCM and GDPR data export/deletion endpoints.

### [Security Headers & Infrastructure](./Security-Headers-Infrastructure/security-headers-infrastructure.md)
HTTP security headers (the essential six), Content-Security-Policy deep dive, Permissions-Policy, HSTS preload, CDN and edge security (Cloudflare WAF), Docker hardening (non-root, read-only, multi-stage), cloud IAM (least privilege, OIDC federation), network security, and Infrastructure as Code scanning.

### [Dependencies & Supply Chain](./Dependencies-Supply-Chain/dependencies-supply-chain.md)
npm/yarn/pnpm audit workflows, lockfile security, Dependabot and Renovate configuration, SBOMs (CycloneDX), typosquatting awareness, CI/CD pipeline security (pinning actions to SHA), Docker image scanning with Trivy, dependency pinning strategies, and runtime dependency security (lifecycle scripts).

### [Security Testing & Monitoring](./Security-Testing-Monitoring/security-testing-monitoring.md)
SAST (Semgrep, CodeQL), DAST (OWASP ZAP), dependency scanning, security logging best practices (Pino structured logging), monitoring and alerting, incident response playbooks, penetration testing, bug bounty programs, security code review checklists, and compliance testing (PCI DSS, SOC 2, HIPAA).

---

## Status

Complete — all 9 guides are written and reviewed. Last updated: 2026-02.
