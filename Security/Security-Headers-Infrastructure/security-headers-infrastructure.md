# Security Headers & Infrastructure
> HTTP security headers, Content-Security-Policy deep dive, Permissions-Policy, HSTS preload, CDN security, Docker hardening, and cloud IAM. The infrastructure layer is your last line of defense — configure it correctly.

---

## Principles

### 1. HTTP Security Headers Overview

Security headers are free security wins. They require no code changes, no refactoring, no new dependencies — just configuration. A few lines in your server config or middleware and you've eliminated entire classes of attacks. There is no excuse for shipping a production application without them.

The essential set every production application needs:

- **Strict-Transport-Security** — Forces HTTPS for all future requests. Once the browser sees this header, it will never attempt an HTTP connection to your domain until the max-age expires. This prevents SSL stripping attacks where an attacker downgrades your users from HTTPS to HTTP.
- **Content-Security-Policy** — Controls which resources (scripts, styles, images, fonts, frames) the browser is allowed to load and from where. This is your primary defense against cross-site scripting (XSS). A properly configured CSP can make XSS exploitation nearly impossible even when an injection vulnerability exists.
- **X-Content-Type-Options: nosniff** — Prevents the browser from MIME-sniffing a response away from the declared Content-Type. Without this, a file served as `text/plain` could be interpreted as JavaScript if it contains valid JS syntax. One header, one value, no configuration needed.
- **X-Frame-Options** — Prevents your site from being embedded in iframes on other domains, blocking clickjacking attacks. Set to `DENY` (no framing at all) or `SAMEORIGIN` (only your own domain can frame you). This header is being superseded by CSP's `frame-ancestors` directive, but include both for backward compatibility with older browsers.
- **Referrer-Policy** — Controls how much URL information is leaked to other sites when users click links or your pages load external resources. The default browser behavior sends the full URL including query parameters, which can leak tokens, search queries, and user IDs to every external resource.
- **Permissions-Policy** — Disables browser APIs your application doesn't use (camera, microphone, geolocation, payment). If you don't use it, disable it. Reducing your API surface area reduces your attack surface.

Testing tools to verify your configuration:

| Tool | What It Does | Score Type |
|------|-------------|------------|
| SecurityHeaders.com | Grades your security headers | A+ to F |
| Mozilla Observatory | Comprehensive security scan including headers, TLS, cookies | 0-100 numeric score |
| Google Lighthouse | Includes security checks in its audit suite | Pass/Fail per check |
| Hardenize | Deep analysis of DNS, TLS, email security, and headers | Detailed report |

Here is the uncomfortable reality: most sites score an F on SecurityHeaders.com. The majority of production web applications ship with zero security headers. Adding the six headers listed above immediately puts you ahead of 90% of the web. This is low-hanging fruit — pick it.

### 2. Content-Security-Policy Deep Dive

CSP is the most important and most complex security header. It deserves its own deep dive because getting it right is the difference between "we have a CSP" and "our CSP actually protects us."

**Building from scratch.** Start with the strictest possible policy and relax it only when you have a specific, documented reason. The base policy every application should start with is `default-src 'self'`, which tells the browser to only allow resources loaded from your own origin. Everything else — scripts, styles, images, fonts, connections — inherits from `default-src` unless explicitly overridden.

Then add specific directives as your application requires them:

- `script-src 'self'` — Only allow scripts from your own origin. For inline scripts, use nonces (preferred) or hashes. Never use `'unsafe-inline'` for scripts unless you have absolutely no alternative.
- `style-src 'self' 'unsafe-inline'` — CSS-in-JS libraries (styled-components, Emotion, Tailwind's runtime) often inject styles dynamically, requiring `'unsafe-inline'`. If possible, use nonces for styles too, but this is harder with CSS-in-JS. The security risk of `'unsafe-inline'` for styles is lower than for scripts.
- `img-src 'self' data: https://cdn.example.com` — Allow images from your origin, data URIs (for inline images), and your CDN. Be specific about which external domains can serve images.
- `connect-src 'self' https://api.example.com` — Controls where `fetch()`, `XMLHttpRequest`, WebSocket, and EventSource can connect. Lock this to your API endpoints only.
- `font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com` — Google Fonts requires both domains: googleapis.com for the CSS and gstatic.com for the font files.
- `frame-ancestors 'none'` — No one can iframe your site. This replaces X-Frame-Options. Use `'self'` if you need to iframe yourself.
- `object-src 'none'` — Blocks Flash and other plugins. There is no legitimate reason to allow this in a modern application.
- `base-uri 'self'` — Prevents attackers from injecting a `<base>` tag that redirects all relative URLs on your page to their server.

**Nonce-based inline scripts.** The modern approach to allowing inline scripts without `'unsafe-inline'` is nonces. For each HTTP request, generate a cryptographic random nonce (128 bits minimum, base64-encoded). Add this nonce to the CSP header as `script-src 'nonce-<value>'` and to each inline script tag as `<script nonce="<value>">`. The nonce must be unique per request and cryptographically random — never use a predictable value, a timestamp, or a counter.

**strict-dynamic.** When a nonced script loads another script dynamically (for example, using `document.createElement('script')` to load analytics or a third-party library), `strict-dynamic` propagates trust to the dynamically loaded script without requiring its origin in the CSP. This dramatically simplifies CSP for single-page applications and any app that loads scripts dynamically. When `strict-dynamic` is present, the browser ignores `self` and URL-based allowlists in `script-src`, relying entirely on nonces and hashes for trust propagation.

**Violation reporting.** CSP supports two reporting mechanisms: the deprecated `report-uri` directive and the newer `report-to` directive (which uses the Reporting API). Violation reports are JSON objects sent to your endpoint containing the blocked URI, the violated directive, and the page URL. Services like report-uri.com and sentry.io aggregate these reports into dashboards. Always configure reporting — it tells you when your CSP is blocking legitimate resources or when someone is attempting an attack.

**Report-only mode.** Deploy your CSP using the `Content-Security-Policy-Report-Only` header first. This logs violations without actually blocking anything. Run in report-only mode for at least two weeks in production, fix all legitimate violations, then switch to enforcing mode with `Content-Security-Policy`. Skipping report-only mode is how teams deploy a CSP on Friday afternoon and spend the weekend debugging why the site is broken.

### 3. Permissions-Policy (formerly Feature-Policy)

Permissions-Policy controls which browser features your site is allowed to use. Every browser API you don't explicitly need should be disabled. This reduces your attack surface — if your application is compromised, the attacker cannot leverage features you've disabled.

Common directives and what they control:

| Directive | What It Disables | Why Disable It |
|-----------|-----------------|----------------|
| `camera=()` | Camera access | Prevents malicious scripts from activating the camera |
| `microphone=()` | Microphone access | Prevents audio recording |
| `geolocation=()` | GPS/location access | Prevents location tracking |
| `payment=()` | Payment Request API | Prevents unauthorized payment dialogs |
| `usb=()` | WebUSB API | Prevents USB device access |
| `bluetooth=()` | Web Bluetooth API | Prevents Bluetooth device access |
| `fullscreen=(self)` | Fullscreen API for other origins | Prevents phishing via fullscreen overlays |
| `autoplay=(self)` | Media autoplay for other origins | Prevents embedded content from autoplaying |

The header format is: `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()`.

The empty parentheses `()` mean "no one can use this feature, not even the page itself." Using `(self)` means "only our origin can use it." You can also delegate features to specific origins for iframes: `camera=(self "https://videochat.example.com")` allows your origin and a specific third-party video chat service to access the camera.

The principle is straightforward: if you don't use a browser API, disable it. Even if it seems harmless, even if you think no attacker would bother. Disable it anyway. Future browser features are moving toward an opt-in model controlled by Permissions-Policy, so getting into the habit now prepares your application for the future web.

### 4. HSTS and Preload

HTTP Strict Transport Security (HSTS) tells the browser: "never connect to this domain over plain HTTP. Always use HTTPS." The full recommended header value is `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

Breaking down each component:

**max-age** specifies how long (in seconds) the browser should remember to force HTTPS. The value 63072000 equals two years, which is the recommended production value. During initial deployment, start with a shorter value — 300 seconds (five minutes) — and gradually increase it (3600, 86400, 604800, 2592000, 63072000) after verifying that everything works correctly over HTTPS. If you discover a problem, a short max-age lets the HSTS entry expire quickly so users can fall back to HTTP while you fix it.

**includeSubDomains** applies the HSTS policy to every subdomain of your domain. This is critically important because without it, an attacker could set up or hijack a subdomain (like `http://fake.example.com`) and perform SSL stripping attacks. If any subdomain serves content over HTTP, fix it before enabling `includeSubDomains` — otherwise users will be unable to access those subdomains.

**preload** signals that you want your domain added to the browser's built-in HSTS preload list, maintained at hstspreload.org. The preload list is hardcoded into browser binaries. Once your domain is on the list, browsers will never attempt an HTTP connection to your domain — not even on the very first visit before they've seen your HSTS header. This closes the one remaining vulnerability in standard HSTS: the first visit, where the browser hasn't yet received the header and could be intercepted.

All major browsers — Chrome, Firefox, Safari, Edge, Opera — share the same HSTS preload list. Submission requires: valid HTTPS certificate, redirect HTTP to HTTPS, `max-age` of at least 31536000 (one year), `includeSubDomains` directive, `preload` directive.

**Warning about preload:** removal from the preload list can take months because it requires a browser release cycle. Only submit for preload when you are certain that your entire domain and all subdomains are fully HTTPS and will remain so permanently. This is not easily reversible.

### 5. Referrer-Policy

The `Referer` header (yes, it's misspelled — the HTTP spec locked in the typo in 1996) tells the destination site where the user came from. By default, browsers send the full URL including path and query parameters. This is a privacy and security problem.

Consider a URL like `https://yourapp.com/account/reset-password?token=abc123`. Without a Referrer-Policy, if the user clicks any external link on that page, the full URL including the password reset token is sent to the external site. This applies to every external resource loaded on the page too — analytics scripts, CDN resources, fonts, images.

Recommended policy values:

- **strict-origin-when-cross-origin** (recommended for most applications) — For same-origin requests, sends the full URL (useful for your own analytics). For cross-origin requests, sends only the origin (e.g., `https://yourapp.com` without the path). For HTTPS-to-HTTP downgrades, sends nothing. This is the best balance of privacy and functionality.
- **no-referrer** — Never sends any referer information to anyone. Maximum privacy, but breaks analytics, affiliate tracking, and any feature that depends on knowing where users came from.
- **origin** — Always sends only the origin (domain), never the full path. Good for privacy but still leaks that users visited your site.
- **same-origin** — Sends the full referer for same-origin requests, nothing for cross-origin requests. Useful when you want internal analytics but no external leakage.

The bottom line: set `Referrer-Policy: strict-origin-when-cross-origin` as your default. If your application handles particularly sensitive URLs (medical, financial, legal), consider `no-referrer`.

### 6. Additional Security Headers

Beyond the essential six, several additional headers provide defense-in-depth for specific attack vectors.

**X-Content-Type-Options: nosniff** prevents the browser from MIME-sniffing a response away from the declared Content-Type. Without this header, a file uploaded by a user as `image.txt` could be interpreted as JavaScript if the browser sniffs valid JS syntax in the content. This is a one-value header with zero configuration complexity — there is no reason to omit it.

**Cross-Origin-Opener-Policy (COOP)** set to `same-origin` prevents other windows (opened via `window.open()` or `target="_blank"`) from obtaining a reference to your window object. This mitigates certain side-channel attacks (like Spectre) that exploit cross-origin window references. COOP with the value `same-origin` is required to enable `SharedArrayBuffer` and high-resolution timers (which browsers disabled after Spectre because they could be used as timing oracles).

**Cross-Origin-Embedder-Policy (COEP)** set to `require-corp` ensures that every cross-origin resource your page loads has explicitly opted into being loaded (via CORS or the Cross-Origin-Resource-Policy header). Like COOP, it is required for `SharedArrayBuffer`. The combination of COOP + COEP creates a "cross-origin isolated" browsing context.

**Cross-Origin-Resource-Policy (CORP)** set to `same-origin` or `same-site` prevents your resources (images, scripts, stylesheets) from being loaded by other origins. This protects against speculative execution side-channel attacks where an attacker's page loads your resources to perform Spectre-style data extraction.

When to use the COOP + COEP combination: when your application needs `SharedArrayBuffer` (required for WebAssembly threading, advanced video/audio processing, some game engines) or when you want maximum cross-origin isolation as a defense-in-depth measure. Be aware that enabling COEP with `require-corp` can break third-party resources that haven't set their own CORP or CORS headers.

### 7. CDN and Edge Security

Your CDN is the first layer of defense — it handles traffic before your application server ever sees it. Configure it properly and you eliminate a large class of attacks at the network edge.

**Cloudflare** provides a comprehensive security stack: a Web Application Firewall (WAF) with managed rulesets (OWASP Top 10, Cloudflare-curated rules, and custom rules you define), bot management that distinguishes legitimate bots (Googlebot) from malicious scrapers and credential stuffers, automatic DDoS protection that absorbs volumetric attacks without any configuration, and rate limiting rules that throttle abusive clients. Cloudflare also lets you add and modify security headers at the edge using Transform Rules or Cloudflare Workers — meaning you can add a full security header set without touching your application code.

**Vercel** supports security headers via `vercel.json` configuration or Next.js middleware. DDoS protection is included by default. Edge Functions (running on Cloudflare Workers under the hood) enable custom security logic like rate limiting, bot detection, and geofencing at the edge.

**AWS CloudFront** provides signed URLs and signed cookies for content that should only be accessible to authorized users (paid content, private downloads, time-limited access). CloudFront integrates with AWS WAF for request filtering and supports Lambda@Edge or CloudFront Functions for custom security logic. Origin Access Control (OAC) prevents direct access to your S3 origin — users must go through CloudFront.

**Origin protection** is critically important. Hide your origin server's IP address behind the CDN. If an attacker discovers your origin IP (through DNS history, email headers, or server misconfiguration), they can send requests directly to the origin, bypassing all CDN security features — WAF, rate limiting, DDoS protection, bot management. Use allowlisting to only accept connections from your CDN's IP ranges. Cloudflare publishes their IP ranges at cloudflare.com/ips; AWS publishes CloudFront ranges via their IP ranges API.

**Edge-level rate limiting** is more efficient than application-level rate limiting because requests are blocked before they reach your server, before they consume your compute resources, and before they touch your database. Apply rate limits at the CDN layer for public endpoints (login, registration, API) and reserve application-level rate limiting for business logic (e.g., "no more than 100 API calls per minute per API key").

### 8. Docker Security Hardening

Docker containers are not a security boundary by default. A misconfigured container running as root with all Linux capabilities is barely better than running the application directly on the host. Hardening Docker requires deliberate configuration.

**Non-root containers.** By default, Docker runs processes as root inside the container. This means if an attacker exploits a vulnerability in your application, they have root access inside the container — and potentially can escape to the host. The fix: create a non-root user in the Dockerfile and switch to it. Create the user with explicit UID/GID (e.g., UID 1001, GID 1001) for consistency. Set ownership of application files to this user. Add the `USER` directive before `CMD`/`ENTRYPOINT`.

**Read-only file systems.** Run containers with a read-only root filesystem. This prevents an attacker from modifying application code, installing tools, or writing persistence mechanisms. Use `tmpfs` mounts for directories that legitimately need write access: `/tmp` for temporary files, `/var/run` for PID files, and any application-specific cache directories. In Docker Compose, set `read_only: true` and declare `tmpfs` mounts explicitly.

**Drop Linux capabilities.** Linux capabilities are fine-grained permissions that subdivide root's powers. By default, Docker grants a set of capabilities to containers. Drop all of them with `cap_drop: ALL` and add back only what's needed. Most Node.js applications need no capabilities at all. If your application binds to a port below 1024, it might need `NET_BIND_SERVICE` — but it's better to bind to a high port (3000, 8080) and let the reverse proxy handle port 80/443.

**no-new-privileges** prevents processes inside the container from gaining additional privileges via `setuid` or `setgid` binaries. This blocks a common privilege escalation technique.

**Minimal base images.** Use the smallest possible base image. Alpine Linux is approximately 5MB. Google's distroless images contain only your runtime (Node.js, Python, Java) and nothing else — no shell, no package manager, no utilities. The `scratch` image is completely empty and suitable for statically compiled binaries (Go, Rust). Fewer packages in the base image means fewer potential vulnerabilities. A full Debian image has over 100 packages with potential CVEs; an Alpine image has a fraction of that.

**Multi-stage builds** use one stage to build your application (with full build tools, compilers, dev dependencies) and a separate stage for the runtime image (containing only production artifacts). Build tools, source code, development dependencies, and intermediate artifacts never ship in the production image. This reduces image size and eliminates an entire category of attack surface.

**Docker secrets.** Never use `ENV` or `ARG` for secrets in Dockerfiles. Environment variables set with `ENV` persist in every layer of the image and are visible with `docker history`. Build arguments set with `ARG` are similarly exposed. Use Docker secrets (for Swarm) or BuildKit's `--mount=type=secret` for build-time secrets. At runtime, mount secrets from your orchestrator (Kubernetes Secrets, AWS Secrets Manager, HashiCorp Vault) as files, not environment variables.

### 9. Cloud IAM Basics

Identity and Access Management (IAM) is the control plane for your cloud infrastructure. If IAM is misconfigured, nothing else matters — an attacker with over-privileged access can disable your WAF, delete your backups, exfiltrate your data, and spin up crypto miners on your account.

**Principle of least privilege** is the foundation. Every user, service account, and application should have only the minimum permissions required to perform its function. A web application that reads from S3 and sends email via SES does not need `s3:*` and `ses:*` — it needs `s3:GetObject` on a specific bucket and `ses:SendEmail` from a specific verified identity.

**IAM policies** define what actions are allowed on which resources. In AWS, policies are JSON documents specifying `Effect` (Allow or Deny), `Action` (the API operations), and `Resource` (the ARN of the specific resource). Always scope policies to specific resources — never use `Resource: "*"` unless the action genuinely applies to all resources (which is rare).

**Service accounts vs user accounts.** Applications should authenticate using service accounts (machine identities), not human user credentials. A developer's AWS access keys should never be embedded in application code, committed to a repository, or used in production. Use IAM roles for EC2 instances, ECS task roles, Lambda execution roles, and Kubernetes service accounts.

**No long-lived access keys.** Static access keys are a liability — they don't expire, they get committed to repositories, they get shared in Slack messages, they get left in former employees' laptops. Use temporary credentials instead: AWS STS (Security Token Service) issues short-lived tokens. GCP Workload Identity and Azure Managed Identity provide automatic credential rotation for cloud-native workloads.

**OIDC federation for CI/CD.** Modern CI/CD platforms (GitHub Actions, GitLab CI, CircleCI) support OIDC federation — your CI/CD pipeline authenticates to your cloud provider using a short-lived OIDC token instead of stored access keys. GitHub Actions can assume an AWS IAM role directly using `aws-actions/configure-aws-credentials` with OIDC. No secrets to store, no keys to rotate, no credentials to leak.

**Audit trails.** AWS CloudTrail, GCP Cloud Audit Logs, and Azure Activity Log record every API call made in your account — who did what, when, and from where. Enable these logs, ship them to a centralized logging system, set up alerts for suspicious activity (root account usage, IAM policy changes, security group modifications), and retain them for at least one year.

**Regular access reviews.** Permissions accumulate over time. Developers who left the team still have access. Service accounts created for a one-time migration still have admin privileges. Schedule quarterly access reviews to audit who has access to what and remove unnecessary permissions. AWS IAM Access Analyzer can identify resources shared with external entities and unused permissions.

### 10. Network Security

Network architecture is the foundation of infrastructure security. A properly segmented network limits the blast radius of any compromise — an attacker who breaches your web server should not be able to reach your database directly.

**VPCs (Virtual Private Clouds)** provide network isolation for your cloud infrastructure. Every serious deployment should use a VPC with carefully designed subnets.

- **Public subnets** contain only resources that must be internet-accessible: load balancers, NAT gateways, and bastion hosts (if you use them). Application servers, databases, and internal services should never be in public subnets.
- **Private subnets** contain everything else: application servers, databases, caches, message queues, and internal microservices. Resources in private subnets access the internet through a NAT gateway (for outbound traffic like pulling packages) but are not directly accessible from the internet.

**Security groups** are stateful firewalls at the instance level. Define allowed inbound and outbound traffic per service. Your web server's security group allows inbound traffic on ports 80 and 443 from the load balancer's security group only. Your database's security group allows inbound traffic on port 5432 from the application server's security group only. Reference security groups by ID, not by IP range — this way the rules update automatically as instances scale.

**Network ACLs** are stateless firewalls at the subnet level, providing an additional layer of defense. They process rules in order (lowest number first) and require explicit rules for both inbound and outbound traffic (because they're stateless). Use them as a coarse-grained backstop; use security groups for fine-grained per-service rules.

**Bastion hosts (jump boxes)** are hardened servers in a public subnet used to SSH into instances in private subnets. However, the better modern alternative is AWS Systems Manager Session Manager — it requires no bastion host, no open SSH ports, no SSH key management, and provides a full audit trail of every session. GCP's Identity-Aware Proxy and Azure Bastion provide similar capabilities.

**DNS security.** DNSSEC (DNS Security Extensions) prevents DNS spoofing by cryptographically signing DNS records. Without DNSSEC, an attacker can poison DNS responses and redirect your users to a malicious server. Enable DNSSEC on your domain and validate DNSSEC responses in your resolvers.

**Zero-trust networking** rejects the traditional model of "inside the network perimeter is trusted." Instead, every request is authenticated and authorized regardless of its source — even requests from inside your network. Key concepts include microsegmentation (fine-grained network policies between every service), identity-aware proxies (Google BeyondCorp, Cloudflare Access, Tailscale) that authenticate users before granting network access, and mutual TLS (mTLS) where both client and server present certificates, ensuring both sides of every connection are authenticated.

### 11. Infrastructure as Code Security

Infrastructure as Code (IaC) — Terraform, CloudFormation, Pulumi, CDK — defines your infrastructure in version-controlled files. This is powerful but introduces a new attack surface: misconfigurations in your IaC templates become misconfigurations in your live infrastructure.

**Scanning IaC templates** before deployment catches misconfigurations in code review, not in production. Key tools:

| Tool | Frameworks Supported | Key Strengths |
|------|---------------------|---------------|
| tfsec | Terraform | Fast, extensive rules, good IDE integration |
| checkov | Terraform, CloudFormation, Kubernetes, ARM | Multi-framework, custom policies, CI/CD integration |
| cfn_nag | CloudFormation | AWS-focused, detailed findings |
| kics | Terraform, CloudFormation, Ansible, Docker, Kubernetes | Broadest framework support |
| trivy config | Terraform, CloudFormation, Dockerfile, Kubernetes | Integrated with container scanning |

Common findings these tools catch: S3 buckets without encryption or with public access, security groups with `0.0.0.0/0` ingress (open to the entire internet), RDS instances without encryption at rest, IAM policies with wildcard `*` permissions, CloudTrail not enabled, VPC flow logs not enabled, EBS volumes not encrypted.

**No secrets in IaC.** Never hardcode secrets — database passwords, API keys, TLS certificates — in Terraform files, CloudFormation templates, or Pulumi code. These files are version-controlled and readable by everyone with repository access. Instead, reference secrets managers: `aws_secretsmanager_secret` in Terraform, `AWS::SecretsManager::Secret` in CloudFormation, or `pulumi.secret()` in Pulumi.

**State file security.** Terraform state files contain the complete state of your infrastructure including resource IDs, IP addresses, and sometimes plaintext secrets (if a resource attribute contains a secret). Store state remotely with encryption: S3 with server-side encryption and versioning, or Terraform Cloud. Restrict state file access to CI/CD pipelines — individual developers should not need direct access to state files.

**Drift detection** compares the actual infrastructure state to the declared state in your IaC templates. Drift indicates either unauthorized manual changes (someone clicked around in the console) or failed deployments. Run `terraform plan` regularly in CI to detect drift. AWS Config Rules and GCP Security Command Center can also detect configuration drift in real time.

---

## LLM Instructions

### 1. Adding Security Headers to a Project

When deploying any web application to production, you must add the full set of recommended security headers. The exact mechanism depends on the framework and hosting platform, but the headers themselves are universal.

For Next.js applications, configure security headers either in the `next.config.js` file using the `headers` async function or in middleware (`middleware.ts`) that intercepts every response. Middleware is preferred when you need dynamic values like CSP nonces that change per request. The `next.config.js` approach is simpler for static header values.

For Express applications, install and configure the `helmet` npm package. Helmet sets sensible security header defaults out of the box, but you must customize the Content-Security-Policy to match your application's resource loading requirements. Do not use Helmet's default CSP without modification — it will likely be too restrictive or too permissive for your specific application.

For Nginx, add `add_header` directives in the server block or location blocks of your configuration. Be aware that `add_header` in a child block (location) removes all headers set in the parent block (server) — you must either repeat all headers in every location block or use the `always` parameter and set headers at the server level only.

For Vercel deployments, configure headers in `vercel.json` under the `headers` array, specifying the source path pattern and the header key-value pairs. For more complex scenarios, use Next.js middleware running on Vercel Edge Functions.

For Cloudflare, use Transform Rules (in the dashboard or via API) to add headers to all responses, or deploy a Cloudflare Worker that modifies response headers. Workers give you the most flexibility — you can generate dynamic CSP nonces, vary headers by path, and implement complex logic.

Regardless of the platform, always include these six headers at minimum: Strict-Transport-Security with a long max-age including subdomains, Content-Security-Policy tailored to your application, X-Content-Type-Options set to nosniff, X-Frame-Options set to DENY or SAMEORIGIN, Referrer-Policy set to strict-origin-when-cross-origin, and Permissions-Policy disabling all unused browser APIs.

### 2. Building a Content Security Policy

When generating or modifying a Content Security Policy, start with the strictest possible configuration and relax it only when specific, documented requirements demand it. Never start permissive and try to tighten later — you will miss things.

1. Begin with `default-src 'self'` as the foundation. This blocks all external resources by default.
2. Add `script-src` with a nonce for inline scripts. Generate a cryptographically random nonce for each request using a secure random number generator. Include `'strict-dynamic'` if the application loads scripts dynamically.
3. Add `style-src` with `'self'` and, if CSS-in-JS libraries require it, `'unsafe-inline'` — but document why and explore nonce-based alternatives first.
4. Add `connect-src` listing only the specific API endpoints the application communicates with.
5. Add `img-src`, `font-src`, `media-src`, and `frame-src` with only the specific origins required.
6. Always include `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'` (or `'self'` if the application is intentionally frameable).
7. Add `report-to` or `report-uri` pointing to a violation reporting endpoint.
8. Deploy using `Content-Security-Policy-Report-Only` first. Monitor violation reports for at least two weeks in production. Fix all legitimate violations — resources that should be allowed but are being blocked. Then switch to enforcing mode.
9. Document every CSP directive and every exception. When a new developer asks "why is unsafe-inline allowed for styles?" the answer should be in the CSP comments or documentation, not in someone's memory.

### 3. Hardening Docker Images

When creating or reviewing Dockerfiles, apply security hardening systematically. Every production Docker image should follow these practices.

1. Use a multi-stage build. The first stage installs build tools, runs npm ci, compiles TypeScript, and performs any build steps. The second stage starts from a minimal base image (Alpine, distroless, or scratch) and copies only the production artifacts — compiled code, production node_modules, and static assets. The build stage never ships.
2. Create a non-root user in the runtime stage with explicit UID and GID. Set ownership of the application directory to this user. Place the USER directive after all file operations but before CMD or ENTRYPOINT.
3. Pin the base image to a specific SHA256 digest, not just a tag. Tags are mutable — `node:20-alpine` today might be a different image tomorrow. Pinning to a digest ensures reproducible builds and prevents supply chain attacks via tag manipulation.
4. Set the filesystem to read-only by adding documentation comments recommending `--read-only` at runtime, or by setting appropriate filesystem permissions. Declare tmpfs volumes for any directories that require write access.
5. Drop all Linux capabilities in the Compose file or runtime configuration. Add back only specific capabilities if absolutely required.
6. Add `--no-new-privileges` to prevent privilege escalation.
7. Include a HEALTHCHECK instruction so the orchestrator can detect and restart unhealthy containers.
8. Never use ENV or ARG for secrets. Use BuildKit secret mounts for build-time secrets and runtime secret injection from your orchestrator.
9. Scan the final image with Trivy or Grype before deployment. Fail the CI pipeline if critical or high vulnerabilities are found.

### 4. Configuring Cloud IAM

When setting up cloud IAM for an application, follow the principle of least privilege rigorously. Over-permissive IAM is one of the most common and most dangerous cloud misconfigurations.

1. Identify every cloud service the application interacts with: S3 buckets, databases, email services, queues, secrets managers. For each service, identify the specific actions required — read only, write only, or specific operations.
2. Create IAM policies scoped to specific resources using ARNs. Never use wildcard resources unless the action genuinely applies to all resources of that type, which is rare.
3. Use service accounts (IAM roles for AWS, service accounts for GCP, managed identities for Azure) for application authentication. Never embed human user credentials in application code.
4. For CI/CD pipelines, configure OIDC federation. GitHub Actions, GitLab CI, and CircleCI all support OIDC tokens that can be exchanged for short-lived cloud credentials. This eliminates the need to store long-lived access keys as CI/CD secrets.
5. Enable audit logging (CloudTrail, Cloud Audit Logs, Activity Log) from day one. Ship logs to a centralized system. Set up alerts for high-risk events: root account usage, IAM policy modifications, security group changes, and any API call from an unusual IP or region.
6. Schedule quarterly access reviews. Use IAM Access Analyzer (AWS), IAM Recommender (GCP), or similar tools to identify unused permissions and overly broad policies.

### 5. Setting Up CDN Security

When configuring a CDN for a production application, security should be a first-class concern alongside performance.

1. Enable the CDN's Web Application Firewall with managed rulesets. For Cloudflare, enable the OWASP Core Ruleset and Cloudflare Managed Ruleset. For AWS WAF, use the AWS Managed Rules for common threats (SQL injection, XSS, bad bots).
2. Configure bot management to block known malicious bots while allowing legitimate crawlers (search engines, monitoring services). Use CAPTCHA challenges for suspicious traffic rather than outright blocks.
3. Set up rate limiting rules at the edge for authentication endpoints (login, registration, password reset), API endpoints, and any resource-intensive operations. Edge rate limiting blocks abusive traffic before it reaches your origin server.
4. Add security headers via CDN configuration so that even if your origin application fails to set them, the CDN ensures they are present on every response. This is defense in depth.
5. Protect your origin server by hiding its IP address. Remove DNS records that point directly to the origin. Configure the origin firewall to only accept connections from CDN IP ranges. Verify this by scanning for your origin IP in DNS history tools and certificate transparency logs.
6. For protected content (paid resources, private files, time-limited downloads), use signed URLs or signed cookies that expire after a configurable time period. Never rely solely on obscurity (hard-to-guess URLs) for access control.

---

## Examples

### 1. Complete Security Headers Configuration (Next.js middleware + Express + Nginx)

**Next.js Middleware (middleware.ts):**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Generate a nonce for CSP (used in conjunction with layout.tsx)
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Content-Security-Policy with nonce
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self' https://api.example.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `report-uri https://your-report-endpoint.example.com/csp`,
  ].join("; ");

  // Set all security headers
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()"
  );
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // Pass nonce to the page via a custom header (read in layout.tsx)
  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes that don't need CSP
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
```

**Express with Helmet (server.ts):**

```typescript
import express from "express";
import helmet from "helmet";
import crypto from "node:crypto";

const app = express();

// Generate nonce per request
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

// Helmet with custom configuration
app.use((req, res, next) => {
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", `'nonce-${res.locals.nonce}'`, "'strict-dynamic'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://cdn.example.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.example.com"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        reportUri: "https://your-report-endpoint.example.com/csp",
      },
    },
    strictTransportSecurity: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
    xDnsPrefetchControl: { allow: true },
    permissionsPolicy: {
      features: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        bluetooth: [],
      },
    },
  })(req, res, next);
});

// Make nonce available to templates
app.use((req, res, next) => {
  res.locals.cspNonce = res.locals.nonce;
  next();
});

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Secure App</title></head>
      <body>
        <h1>Hello, secure world</h1>
        <script nonce="${res.locals.nonce}">
          console.log("This inline script is allowed by the CSP nonce");
        </script>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

**Nginx Configuration (nginx.conf):**

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.example.com; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;

    # Remove server version header
    server_tokens off;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Block access to hidden files
    location ~ /\. {
        deny all;
        return 404;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

### 2. Content-Security-Policy with Nonces (Next.js App Router)

**middleware.ts — Generate nonce and set CSP:**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Build a strict CSP with nonce and strict-dynamic
  const cspDirectives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' https://api.example.com wss://ws.example.com`,
    `worker-src 'self' blob:`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
    `report-to csp-endpoint`,
  ];

  const cspHeaderValue = cspDirectives.join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set the CSP header on the response
  response.headers.set("Content-Security-Policy", cspHeaderValue);

  // Set the Reporting-Endpoints header for report-to
  response.headers.set(
    "Reporting-Endpoints",
    'csp-endpoint="https://your-report-endpoint.example.com/csp"'
  );

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
```

**app/layout.tsx — Read nonce and apply to scripts:**

```tsx
import { headers } from "next/headers";
import Script from "next/script";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";

  return (
    <html lang="en">
      <head>
        {/* Third-party scripts with nonce — strict-dynamic propagates trust */}
        <Script
          src="https://analytics.example.com/script.js"
          strategy="afterInteractive"
          nonce={nonce}
        />
      </head>
      <body>
        {children}

        {/* Inline script with nonce */}
        <Script
          id="app-config"
          nonce={nonce}
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.__APP_CONFIG__ = {
                apiUrl: "https://api.example.com",
                environment: "production"
              };
            `,
          }}
        />
      </body>
    </html>
  );
}
```

**app/components/NonceProvider.tsx — Share nonce with client components:**

```tsx
"use client";

import { createContext, useContext } from "react";

const NonceContext = createContext<string>("");

export function NonceProvider({
  nonce,
  children,
}: {
  nonce: string;
  children: React.ReactNode;
}) {
  return (
    <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>
  );
}

export function useNonce(): string {
  return useContext(NonceContext);
}
```

**app/components/InlineScript.tsx — Safe inline scripts with nonce:**

```tsx
"use client";

import { useNonce } from "./NonceProvider";

interface InlineScriptProps {
  id: string;
  code: string;
}

export function InlineScript({ id, code }: InlineScriptProps) {
  const nonce = useNonce();

  return (
    <script
      id={id}
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
```

### 3. Secure Dockerfile (Node.js Application)

**Dockerfile:**

```dockerfile
# ==============================================================================
# Stage 1: Build
# ==============================================================================
FROM node:20-alpine@sha256:1a526b97cace6b4006256570efa1a29cd1fe4b96a5301f8d48e87c5139438a45 AS builder

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

# Build the application
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# ==============================================================================
# Stage 2: Runtime
# ==============================================================================
FROM node:20-alpine@sha256:1a526b97cace6b4006256570efa1a29cd1fe4b96a5301f8d48e87c5139438a45 AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user with explicit UID/GID
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

WORKDIR /app

# Copy production artifacts from builder
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/public ./public

# Set environment to production
ENV NODE_ENV=production

# Switch to non-root user
USER appuser

# Expose port (documentation only — does not publish the port)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]
```

**docker-compose.yml:**

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      # Database URL is injected from secrets, not hardcoded
    env_file:
      - .env.production  # Contains non-secret config only
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=64m
      - /var/run:noexec,nosuid,size=4m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/ssl:ro
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid
      - /var/run:noexec,nosuid
      - /var/cache/nginx:noexec,nosuid
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Required for binding to ports 80/443
    depends_on:
      app:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**.dockerignore:**

```text
node_modules
.git
.gitignore
.env
.env.*
*.md
Dockerfile
docker-compose.yml
.dockerignore
.vscode
.idea
coverage
tests
__tests__
*.test.ts
*.spec.ts
.github
.husky
```

### 4. AWS IAM Least-Privilege Policy (Typical Web App)

**Terraform IAM configuration (iam.tf):**

```hcl
# ==============================================================================
# IAM Role for the web application (ECS Task or EC2)
# ==============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  app_name   = "my-web-app"
}

# IAM Role for the application
resource "aws_iam_role" "app_role" {
  name = "${local.app_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:ecs:${local.region}:${local.account_id}:*"
          }
        }
      }
    ]
  })

  tags = {
    Application = local.app_name
    ManagedBy   = "terraform"
  }
}

# S3: Read-only access to a specific bucket
resource "aws_iam_role_policy" "s3_read" {
  name = "${local.app_name}-s3-read"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ReadSpecificBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${local.app_name}-assets",
          "arn:aws:s3:::${local.app_name}-assets/*"
        ]
      }
    ]
  })
}

# S3: Write access to uploads bucket only
resource "aws_iam_role_policy" "s3_write_uploads" {
  name = "${local.app_name}-s3-write-uploads"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3WriteUploadsBucket"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${local.app_name}-uploads/*"
        ]
      }
    ]
  })
}

# SES: Send email only (no receive, no management)
resource "aws_iam_role_policy" "ses_send" {
  name = "${local.app_name}-ses-send"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SESSendEmailOnly"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = [
          "arn:aws:ses:${local.region}:${local.account_id}:identity/noreply@example.com"
        ]
        Condition = {
          StringEquals = {
            "ses:FromAddress" = "noreply@example.com"
          }
        }
      }
    ]
  })
}

# Secrets Manager: Read specific secrets only
resource "aws_iam_role_policy" "secrets_read" {
  name = "${local.app_name}-secrets-read"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:${local.app_name}/*"
        ]
      }
    ]
  })
}

# ==============================================================================
# OIDC Federation for GitHub Actions CI/CD
# ==============================================================================

# GitHub OIDC Provider (create once per AWS account)
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    ManagedBy = "terraform"
  }
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "${local.app_name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # Only allow from specific repo and branch
            "token.actions.githubusercontent.com:sub" = "repo:your-org/your-repo:ref:refs/heads/main"
          }
        }
      }
    ]
  })

  tags = {
    Application = local.app_name
    ManagedBy   = "terraform"
  }
}

# GitHub Actions: ECR push permissions (for deploying container images)
resource "aws_iam_role_policy" "github_actions_ecr" {
  name = "${local.app_name}-github-actions-ecr"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "arn:aws:ecr:${local.region}:${local.account_id}:repository/${local.app_name}"
      },
      {
        Sid    = "ECSUpdate"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ]
        Resource = "arn:aws:ecs:${local.region}:${local.account_id}:service/${local.app_name}-cluster/${local.app_name}-service"
      }
    ]
  })
}
```

**GitHub Actions workflow using OIDC (.github/workflows/deploy.yml):**

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/my-web-app-github-actions
          aws-region: us-east-1
          # No access keys needed — OIDC handles authentication

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and Push Docker Image
        run: |
          docker build -t ${{ steps.login-ecr.outputs.registry }}/my-web-app:${{ github.sha }} .
          docker push ${{ steps.login-ecr.outputs.registry }}/my-web-app:${{ github.sha }}

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster my-web-app-cluster \
            --service my-web-app-service \
            --force-new-deployment
```

### 5. Cloudflare Workers Security Headers

**worker.ts:**

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    // Fetch the original response from the origin
    const response = await fetch(request);

    // Clone the response so we can modify headers
    const newResponse = new Response(response.body, response);

    // Generate a nonce for this request
    const nonce = btoa(crypto.randomUUID());

    // Content-Security-Policy — strict, with nonce for inline scripts
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: https://cdn.example.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' https://api.example.com`,
      `media-src 'self'`,
      `frame-ancestors 'none'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `upgrade-insecure-requests`,
      `report-uri https://your-report-endpoint.example.com/csp`,
    ].join("; ");

    // Set all security headers
    newResponse.headers.set("Content-Security-Policy", csp);
    newResponse.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    newResponse.headers.set("X-Content-Type-Options", "nosniff");
    newResponse.headers.set("X-Frame-Options", "DENY");
    newResponse.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
    newResponse.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()"
    );
    newResponse.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    newResponse.headers.set(
      "Cross-Origin-Embedder-Policy",
      "require-corp"
    );
    newResponse.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    newResponse.headers.set("X-DNS-Prefetch-Control", "on");

    // Remove headers that leak server information
    newResponse.headers.delete("Server");
    newResponse.headers.delete("X-Powered-By");

    // If the response is HTML, inject the nonce into script tags
    const contentType = newResponse.headers.get("Content-Type") || "";
    if (contentType.includes("text/html")) {
      const html = await newResponse.text();
      const modifiedHtml = html.replace(
        /<script(?![^>]*\bnonce=)/gi,
        `<script nonce="${nonce}"`
      );
      return new Response(modifiedHtml, {
        status: newResponse.status,
        statusText: newResponse.statusText,
        headers: newResponse.headers,
      });
    }

    return newResponse;
  },
} satisfies ExportedHandler;
```

**wrangler.toml:**

```toml
name = "security-headers-worker"
main = "src/worker.ts"
compatibility_date = "2024-09-25"

# Routes — apply to all traffic on the domain
routes = [
  { pattern = "example.com/*", zone_name = "example.com" },
  { pattern = "www.example.com/*", zone_name = "example.com" }
]

# Environment-specific configuration
[env.production]
name = "security-headers-worker-prod"
routes = [
  { pattern = "example.com/*", zone_name = "example.com" },
  { pattern = "www.example.com/*", zone_name = "example.com" }
]

[env.staging]
name = "security-headers-worker-staging"
routes = [
  { pattern = "staging.example.com/*", zone_name = "example.com" }
]

# Observability
[observability]
enabled = true
```

**package.json for the Worker:**

```json
{
  "name": "security-headers-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "deploy:production": "wrangler deploy --env production"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240925.0",
    "typescript": "^5.5.0",
    "wrangler": "^3.78.0"
  }
}
```

---

## Common Mistakes

### 1. No Security Headers at All

**Wrong:** Deploying an application to production with zero security headers. The server responds with only `Content-Type` and `Content-Length`, leaving the browser with no instructions on how to protect the user. The site scores an F on SecurityHeaders.com. The team says "we'll add headers later" and never does.

**Fix:** Add all six recommended security headers before the first production deployment. Use Helmet for Express, middleware for Next.js, or add_header directives for Nginx. This takes 15 minutes and eliminates entire classes of attacks. Add a CI check that scans your deployed application with SecurityHeaders.com's API and fails the build on anything below an A grade. There is no valid excuse for shipping without security headers — they are free and require no code changes.

### 2. CSP Set to `default-src *` (Defeats the Purpose)

**Wrong:** Setting `Content-Security-Policy: default-src *` or `default-src 'self' 'unsafe-inline' 'unsafe-eval' *`. This allows loading resources from any origin, executing inline scripts, and using `eval()`. The CSP header exists and makes the site appear to have a security policy, but it protects against absolutely nothing. Some teams add this to "check the box" on a security audit.

```text
Content-Security-Policy: default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'
```

**Fix:** Start with `default-src 'self'` and add only what your application specifically needs. Use nonces for inline scripts instead of `'unsafe-inline'`. Never allow `'unsafe-eval'` — if a library requires it, find an alternative library. Every CSP directive and every exception should be documented with a reason. Deploy in report-only mode first, fix violations, then enforce.

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-abc123' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.example.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'
```

### 3. HSTS with Short max-age or Missing includeSubDomains

**Wrong:** Setting `Strict-Transport-Security: max-age=300` in production. A five-minute max-age means the browser forgets to force HTTPS after five minutes. An attacker performing an SSL stripping attack just needs to wait for the HSTS entry to expire. Or setting a long max-age but omitting `includeSubDomains`, which allows an attacker to exploit HTTP subdomains for SSL stripping.

```text
Strict-Transport-Security: max-age=300
```

**Fix:** Use `max-age=63072000; includeSubDomains; preload` for production. Start with a short max-age only during initial deployment and testing, then ramp up to the full two-year value once you've confirmed HTTPS works across all subdomains. Submit to the HSTS preload list (hstspreload.org) for maximum protection.

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 4. Docker Containers Running as Root

**Wrong:** Using the default Docker configuration where the application process runs as root inside the container. The Dockerfile has no `USER` directive, and the team doesn't know the process is running as root because they never checked.

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "server.js"]
# Process runs as root — if compromised, attacker has root in the container
```

**Fix:** Create a non-root user with explicit UID/GID and switch to it before the CMD instruction. Set ownership of application files to the non-root user.

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser
COPY --chown=appuser:appgroup . .
RUN npm ci --omit=dev
USER appuser
CMD ["node", "server.js"]
```

### 5. Secrets in Dockerfiles or Docker Compose Environment Variables

**Wrong:** Hardcoding secrets directly in the Dockerfile using `ENV` or passing them as build arguments with `ARG`. These values persist in the image layers and are visible to anyone who can pull the image.

```dockerfile
FROM node:20-alpine
ENV DATABASE_URL=postgres://admin:SuperSecret123@db.example.com:5432/myapp
ENV API_KEY=sk_live_abc123456789
COPY . .
CMD ["node", "server.js"]
```

Or in docker-compose.yml:

```yaml
services:
  app:
    environment:
      - DATABASE_URL=postgres://admin:SuperSecret123@db.example.com:5432/myapp
```

**Fix:** Never put secrets in Dockerfiles or compose files. Use runtime secret injection. For Docker Compose, use `.env` files (not committed to git) or Docker secrets. For Kubernetes, use Secrets (ideally backed by an external secrets manager like AWS Secrets Manager or HashiCorp Vault). For builds, use BuildKit secret mounts.

```dockerfile
# Build-time secret access (if needed)
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm ci

# Runtime: secrets injected by orchestrator, not in image
CMD ["node", "server.js"]
```

```yaml
services:
  app:
    env_file:
      - .env  # Not committed to git — in .gitignore
    # Or use Docker secrets
    secrets:
      - db_password
secrets:
  db_password:
    external: true
```

### 6. Cloud IAM with Admin/Wildcard Permissions

**Wrong:** Giving an application or CI/CD pipeline `AdministratorAccess` or broad wildcard policies because "we'll tighten it later." The application only needs to read from one S3 bucket and send emails, but it has permission to delete every resource in the AWS account.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
```

**Fix:** Create specific policies scoped to exact actions and resources. Use the AWS IAM Access Analyzer to generate a policy based on actual usage — deploy with broad permissions temporarily, let the analyzer observe what actions are actually used, then replace the broad policy with a minimal one.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-app-assets/*"
    },
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail"],
      "Resource": "arn:aws:ses:us-east-1:123456789012:identity/noreply@example.com"
    }
  ]
}
```

### 7. No WAF or DDoS Protection on Public APIs

**Wrong:** Exposing API endpoints directly to the internet without any CDN, WAF, or rate limiting. A single attacker can flood your API with requests, overwhelm your database, and take down your entire application. Bots scrape your data, credential stuffers attack your login endpoint, and you have no visibility into the attack traffic.

**Fix:** Put all public-facing APIs behind a CDN with WAF and rate limiting. Use Cloudflare (free tier includes basic WAF and DDoS protection), AWS WAF with CloudFront, or similar services. Configure rate limiting at the edge — 100 requests per minute for login endpoints, 1000 requests per minute for general API access. Enable bot management to block known malicious user agents and IP reputation lists. This costs little or nothing (Cloudflare's free tier is extremely capable) and prevents the most common infrastructure attacks.

### 8. Exposing Internal Services on Public Networks

**Wrong:** Running a database, cache (Redis), or message queue (RabbitMQ) on a public IP address. The team sets a security group that allows `0.0.0.0/0` on port 5432 "temporarily for debugging" and forgets to remove it. The database is now accessible from anywhere on the internet, protected only by its password — which is often weak or default.

```hcl
resource "aws_security_group_rule" "db_access" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]  # Entire internet can reach the database
  security_group_id = aws_security_group.database.id
}
```

**Fix:** Place databases, caches, and internal services in private subnets with no public IP. Allow inbound traffic only from the application server's security group. Use VPC endpoints for AWS services to keep traffic on the AWS backbone. Never use `0.0.0.0/0` for any internal service.

```hcl
resource "aws_security_group_rule" "db_access" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app_server.id  # Only app servers
  security_group_id        = aws_security_group.database.id
}
```

### 9. Infrastructure Secrets in Version-Controlled IaC Files

**Wrong:** Hardcoding database passwords, API keys, and TLS private keys directly in Terraform files or CloudFormation templates. These files are committed to the repository where every developer (and potentially public, if the repo is misconfigured) can see the secrets. Even if removed in a later commit, the secrets remain in git history forever.

```hcl
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = "SuperSecretPassword123!"  # Visible in git history forever
}
```

**Fix:** Use references to secrets managers. Store secrets in AWS Secrets Manager, HashiCorp Vault, or similar services. Reference them in Terraform using data sources. Use `sensitive = true` to prevent secrets from appearing in plan output. For the Terraform state file (which will contain the actual values), use encrypted remote state with restricted access.

```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "my-app/db-password"
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

### 10. Ignoring Security Header Warnings from Scanners

**Wrong:** Running SecurityHeaders.com or Mozilla Observatory, seeing warnings about missing or misconfigured headers, and ignoring them. The team treats security header grades like optional suggestions rather than actionable findings. Tickets are created but deprioritized because "the app works fine without them."

**Fix:** Treat security header scanner results as bugs with defined severity levels. Missing HSTS is a high-severity finding because it enables SSL stripping. Missing CSP is critical because it leaves XSS completely unmitigated. Integrate scanning into CI/CD — run Mozilla Observatory or a custom header check after every deployment and fail the pipeline if the grade drops below a threshold. Add security header testing to your automated test suite using a simple HTTP request that asserts all expected headers are present with correct values.

```typescript
// In your integration tests
describe("Security Headers", () => {
  it("should include all required security headers", async () => {
    const response = await fetch("https://staging.example.com");

    expect(response.headers.get("strict-transport-security")).toContain("max-age=63072000");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
  });
});
```

---

> **See also:** [Frontend-Security](../Frontend-Security/frontend-security.md) | [Data-Protection](../Data-Protection/data-protection.md) | [Secrets-Environment](../Secrets-Environment/secrets-environment.md) | [Dependencies-Supply-Chain](../Dependencies-Supply-Chain/dependencies-supply-chain.md) | [Security-Testing-Monitoring](../Security-Testing-Monitoring/security-testing-monitoring.md)
>
> **Last reviewed:** 2026-02
