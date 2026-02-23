# Security Testing & Monitoring
> SAST, DAST, dependency scanning, security logging, incident response, penetration testing, and bug bounty programs. Security without testing is just hope — verify everything.

---

## Principles

### 1. The Security Testing Pyramid

Like the classic testing pyramid (unit tests at the base, integration tests in the middle, end-to-end tests at the top), security testing has its own layered structure. Each layer catches different vulnerability classes at different costs, speeds, and confidence levels. Understanding this pyramid is how you build a security testing strategy that is both comprehensive and sustainable.

**Static Analysis (SAST) sits at the bottom.** It is the fastest, cheapest, and most frequent layer. SAST tools analyze your source code without running it, pattern-matching against known vulnerability signatures. They run on every commit, every pull request, every build. They catch common patterns: SQL injection via string concatenation, hardcoded secrets, use of insecure cryptographic algorithms, dangerous functions like `eval()`, missing input validation, and XSS sinks like `dangerouslySetInnerHTML`. SAST is not perfect — it produces false positives and cannot understand runtime behavior — but it catches the low-hanging fruit at near-zero marginal cost per scan.

**Dependency Scanning sits in the middle.** Your code is only a fraction of your attack surface — your dependencies are the rest. Dependency scanning checks every package in your dependency tree against known vulnerability databases (the National Vulnerability Database, GitHub Advisory Database, Snyk vulnerability DB). It runs on every build and every PR that modifies dependencies. It catches known CVEs in the libraries you depend on, including transitive dependencies you may not even know you have. The cost is low and the value is high.

**Dynamic Analysis (DAST) sits above that.** DAST tools test your running application by sending malicious inputs and analyzing responses. They catch configuration issues (missing security headers, exposed error details), authentication flaws (session fixation, cookie misconfigurations), and vulnerabilities that only manifest at runtime. DAST is slower than SAST because it requires a deployed application, but it catches vulnerability classes that SAST cannot see.

**Manual Code Review sits higher still.** Human experts review security-sensitive code changes with context that no automated tool possesses. They understand your business logic, your data model, your threat model. They catch authorization flaws ("users can access other users' data by changing the ID parameter"), business logic vulnerabilities ("the discount code can be applied twice"), and architectural issues ("this service trusts input from the other service without validation"). Automated tools miss these entirely.

**Penetration Testing sits at the top.** It is the most expensive, most thorough, and least frequent layer. Professional pentesters simulate real attackers — they chain together multiple small weaknesses into full attack paths, test your incident detection capabilities, and find vulnerabilities that no other layer catches. A good pentest is not just a vulnerability scan with a human running it; it is a creative, adversarial exercise.

The key insight is shift-left security: test early and often, not just at the end. The cost to fix a vulnerability increases by roughly 10x at each stage — a SAST finding fixed during development costs minutes, the same vulnerability found during a pentest costs hours of investigation and retesting, and the same vulnerability found after a breach costs millions. Most teams should start with SAST and dependency scanning in CI (high value, low effort), then add DAST and manual review as they mature, and schedule annual pentests as resources allow.

| Layer | Cost | Speed | Frequency | Catches |
|-------|------|-------|-----------|---------|
| SAST | Low | Seconds | Every commit | Code patterns, common vulnerabilities |
| Dependency Scanning | Low | Seconds | Every build/PR | Known CVEs in dependencies |
| DAST | Medium | Minutes | Per deployment to staging | Runtime issues, configuration flaws |
| Manual Code Review | Medium | Hours | Security-sensitive PRs | Business logic flaws, authorization issues |
| Penetration Testing | High | Days/Weeks | Annually + major changes | Complex attack chains, chained vulnerabilities |

### 2. Static Application Security Testing (SAST)

SAST tools analyze your source code without executing it. They parse your code into an abstract syntax tree, track data flow from sources (user input) to sinks (dangerous functions), and pattern-match against known vulnerability signatures. The result is a list of potential vulnerabilities, each with a location, severity, and description.

**Semgrep is the modern standard for SAST.** It is fast (scans millions of lines in seconds), has a low false positive rate compared to legacy tools, supports custom rules in a YAML-based DSL that developers can actually write, and has a generous free tier that covers most needs. Semgrep's rule registry contains thousands of community-maintained rules covering OWASP Top 10 vulnerabilities across dozens of languages. For JavaScript and TypeScript projects, the `p/javascript` and `p/typescript` rulesets catch SQL injection, XSS, command injection, path traversal, insecure crypto, and hardcoded secrets out of the box.

**CodeQL is GitHub's SAST engine.** It models your code as a queryable database, allowing deep analysis using a SQL-like query language. CodeQL performs interprocedural analysis — it can track tainted data across function boundaries, through callbacks, and across module imports. This catches vulnerabilities that simpler pattern-matching tools miss. CodeQL is free for open-source repositories on GitHub, and the default query packs cover most common vulnerability classes.

**SonarQube is the enterprise SAST platform.** It provides a dashboard with historical trends, quality gates that can block deployments, and support for dozens of languages. The Community Edition is free and covers most needs. SonarQube's strength is its IDE integration — developers see findings in their editor before they even commit.

**ESLint security plugins catch JavaScript/Node.js-specific issues.** The `eslint-plugin-security` plugin catches dangerous patterns: `eval()` with dynamic input, non-literal `require()` calls (which can be exploited for arbitrary file inclusion), regular expressions vulnerable to ReDoS (Regular Expression Denial of Service), and `child_process.exec()` with unsanitized input. The `eslint-plugin-no-unsanitized` plugin catches DOM XSS sinks — calls to `innerHTML`, `outerHTML`, `document.write()`, and `insertAdjacentHTML()` with user-controlled data. These plugins run as part of your normal linting pipeline, which means developers see findings immediately in their editors.

**Custom rules are where SAST delivers its real power.** Every codebase has its own patterns, its own abstractions, its own ways of doing things wrong. The default rulesets catch generic vulnerability patterns, but custom rules catch YOUR mistakes. Examples: "Flag any database query that does not use the Prisma client" — catches developers bypassing the ORM with raw `pg` queries. "Flag any API route handler that does not include the `requireAuth` middleware" — catches unprotected endpoints. "Flag any use of `Math.random()` in a file that imports from the `crypto` module" — catches weak randomness in security-sensitive contexts. "Flag any response that includes the `err.stack` property" — catches stack trace leakage. Writing custom Semgrep rules takes minutes and pays dividends for the life of the project.

**False positive management is essential.** SAST tools produce false positives — that is the nature of static analysis (they are making conservative approximations about runtime behavior). The wrong response is to ignore all findings because some are wrong. The right response is to triage each finding: if it is a true positive, fix it; if it is a false positive, mark it with `nosemgrep` (or the equivalent suppression comment), document the reason in the comment, and move on. Track your false positive rate — if it exceeds 30-40%, your rules need tuning. A high false positive rate causes developers to stop looking at findings, which defeats the purpose.

### 3. Dynamic Application Security Testing (DAST)

DAST tools test your running application from the outside, exactly like an attacker would. They send malicious inputs to every endpoint, analyze the responses, and report vulnerabilities. Unlike SAST, DAST sees your application as it actually behaves at runtime — with all its configuration, middleware, framework defaults, and deployment settings in play.

**OWASP ZAP (Zed Attack Proxy) is the most widely used open-source DAST tool.** It can operate as an intercepting proxy for manual testing or in headless/automated mode for CI/CD integration. ZAP's active scanner sends thousands of payloads to your application: SQL injection probes, XSS payloads, directory traversal sequences, CSRF tokens with modified values, and requests with missing or malformed authentication headers. ZAP's passive scanner analyzes every response for issues that do not require active probing: missing security headers (Content-Security-Policy, X-Frame-Options, Strict-Transport-Security), information disclosure (server version headers, stack traces in error responses, directory listings), cookie misconfigurations (missing Secure, HttpOnly, or SameSite flags), and insecure content delivery (mixed HTTP/HTTPS content).

**Burp Suite Community Edition is the other essential DAST tool,** widely used for manual security testing. The Professional edition adds automated scanning, but the Community edition's intercepting proxy, repeater, and intruder tools are invaluable for manual exploration. Security engineers use Burp to understand application behavior, craft specific attack payloads, and verify findings from automated tools.

**Running DAST in CI/CD requires a deployed application.** The typical workflow is: deploy to a staging environment (identical to production in configuration), run ZAP against the staging URL, parse the results, and fail the pipeline on high or critical findings. ZAP supports baseline scans (passive only, fast, good for every PR) and full scans (active + passive, slower, good for nightly or weekly runs). The baseline scan typically completes in minutes; the full scan can take hours depending on application size.

**DAST has real limitations.** It cannot find business logic flaws — it does not know that users should only see their own data, that discount codes should only be used once, or that the "delete account" endpoint should require re-authentication. It cannot test code paths that require specific state setup (e.g., "a user who has been inactive for 90 days and has a pending payment"). It can produce false positives, particularly for XSS findings where the reflected content is actually properly encoded. And it cannot see vulnerabilities in code paths that it does not reach — if your application has admin endpoints that require specific roles, ZAP will not test them unless you configure authenticated scanning.

**DAST and SAST are complementary.** SAST catches code-level patterns regardless of whether they are reachable; DAST catches runtime issues regardless of what the code looks like. SAST finds SQL injection by looking at code patterns; DAST finds it by sending `' OR 1=1 --` and seeing if the response changes. A mature security testing program uses both.

### 4. Dependency Scanning in CI

Your application's dependency tree is a massive attack surface. A typical Node.js project has hundreds or thousands of transitive dependencies — packages that your dependencies depend on, and so on. Each of these packages is maintained by someone you have never met, and any one of them could contain a known vulnerability or, worse, be deliberately malicious.

**`npm audit` is the built-in starting point** but it is not enough on its own. It checks your `package-lock.json` against the npm advisory database and reports known vulnerabilities. Running `npm audit` in CI with `--audit-level=high` will fail the build when high or critical severity vulnerabilities are found. But `npm audit` only catches known vulnerabilities that have been reported and cataloged — it does not detect malicious packages, supply chain attacks, or suspicious package behavior.

**GitHub Dependabot provides automated alerts and fix PRs.** When enabled, Dependabot monitors your repository's dependency manifest and lock files, cross-references them against the GitHub Advisory Database (which aggregates data from multiple sources including NVD, npm advisories, and community reports), and opens pull requests to update vulnerable dependencies to safe versions. Dependabot alerts appear in the Security tab of your repository. The Dependency Graph shows your full dependency tree, making it easy to understand which transitive dependency introduced a vulnerability.

**Snyk is the leading commercial dependency scanning tool** with a generous free tier (200 tests per month for open-source projects). Snyk integrates with your CI pipeline, your IDE, and your repository. What distinguishes Snyk from `npm audit` is its fix intelligence — Snyk knows which upgrade paths are safe, which vulnerabilities have no fix available yet, and which fixes will break your application. It also monitors your deployed applications for newly disclosed vulnerabilities, not just at build time.

**Socket.dev focuses on what other tools miss: supply chain attacks.** Traditional vulnerability scanners look for known CVEs — vulnerabilities that have been discovered, reported, and cataloged. Socket.dev analyzes package behavior: does this package execute scripts during installation? Does it make network requests? Does it access the filesystem? Has the package's maintainer changed recently? Is the package name suspiciously similar to a popular package (typosquatting)? These are the indicators of malicious packages, which are increasingly common in the npm ecosystem.

**Automated PR annotations** make dependency security visible at the point of decision. Configure your scanning tools to comment on pull requests when a new dependency has known vulnerabilities, when an existing dependency is updated to a version with known issues, or when a new dependency exhibits suspicious behavior. Developers should see this information before they merge, not after.

**Blocking merges on security findings** requires branch protection rules. In GitHub, configure required status checks that include your security scanning jobs. A PR that introduces a dependency with a critical vulnerability should not be mergeable. This is a forcing function — it makes security the path of least resistance.

**False positive triage is necessary.** Not every CVE applies to your usage of a package. A vulnerability in a package's XML parser does not affect you if you never parse XML. Document these decisions with rationale: "CVE-2024-XXXXX in package-name does not apply because we do not use the affected `parseXml()` function. Accepted 2026-01-15 by @security-lead." Store these decisions in a file (e.g., `.nsprc`, `.snyk`, or `audit-resolve.json`) so they persist across builds and are visible in code review.

### 5. Security Logging Best Practices

Security logging is fundamentally different from application logging. Application logs exist for debugging — they help developers understand what happened when something went wrong. Security logs exist for investigation — they help security teams understand who did what, when, from where, and whether it was authorized. If your security logs are inadequate, you cannot detect attacks in progress, investigate incidents after the fact, or prove compliance with regulatory requirements.

**What to log, with concrete examples:**

Authentication events are the highest priority. Log every successful login with the user ID, IP address, timestamp, user agent, and authentication method (password, SSO, MFA). Log every failed login with the username attempted, IP address, timestamp, failure reason (wrong password, account locked, account not found), and the running failure count. Log password resets (requested, completed), MFA enrollment changes, and session creation/destruction. These logs are the first place you look during a credential stuffing attack or account compromise investigation.

Authorization failures come next. When a user attempts to access a resource they do not have permission for, log the user ID, the resource they attempted to access, the action they attempted, the permission they lacked, and their IP address. A burst of authorization failures from a single user often indicates an attacker probing the API with a compromised account, looking for privilege escalation paths.

Input validation failures are security signals. When a request is rejected due to invalid input — a string where a number was expected, a value outside the allowed range, a malformed email address — log the endpoint, the validation errors, and the client IP. A burst of validation failures from a single IP is a strong indicator of automated probing or fuzzing.

Rate limit triggers should be logged with the client identifier (IP address, API key, or user ID), the endpoint, the limit that was exceeded, and the timestamp. Sustained rate limit hits indicate brute force attempts, credential stuffing, or denial-of-service attacks.

Administrative actions are high-value log entries. Every configuration change, user role modification, data export, API key creation or revocation, and security setting change should be logged with the admin's user ID, the action taken, the target of the action, the old and new values (where applicable), and the timestamp. These logs are essential for insider threat detection and compliance audits.

Data access patterns deserve attention in applications handling sensitive data. Log bulk data access (queries returning more than a threshold number of records), access to records belonging to other users (even if authorized — this is useful for anomaly detection), and data exports. These logs help detect data exfiltration.

**Structured logging is non-negotiable.** Use JSON format for every log entry. Unstructured text logs (the kind produced by `console.log`) are nearly useless for automated analysis, correlation, and alerting. JSON logs can be parsed, indexed, searched, and aggregated by any log management platform.

**Use a consistent schema across all services.** Every security log entry should include: timestamp (ISO 8601 format with timezone), log level (info, warn, error), service name (which service produced the log), request ID (a unique identifier that follows a request across all services it touches, enabling cross-service correlation), user ID (if the request is authenticated), IP address (from `X-Forwarded-For` when behind a reverse proxy, with caution about spoofing), action (what happened), resource (what was affected), and result (success or failure with reason).

**Library choice matters for performance.** Pino is the fastest JSON logger for Node.js — it achieves its speed by deferring serialization to a worker thread and using a minimal synchronous path. Winston is more flexible and widely used, with a rich plugin ecosystem for transports (file, HTTP, cloud services). For security logging at scale, Pino is the recommended choice because security logging must never become a performance bottleneck that tempts developers to reduce log coverage.

### 6. Security Monitoring and Alerting

Logging without monitoring is writing a diary that nobody reads. The purpose of security logging is to feed a monitoring system that detects attacks in progress, alerts the right people, and provides the data needed for investigation. Without active monitoring, your logs are only useful after a breach — when someone asks "what happened?" and you have to search through terabytes of data after the fact.

**Real-time alerts should be configured for these scenarios:**

Credential stuffing detection: a burst of authentication failures from multiple IP addresses against multiple accounts within a short time window. This pattern is distinct from a single user forgetting their password — it is an attacker testing a list of stolen credentials. Alert threshold: more than 50 auth failures across more than 10 accounts within 5 minutes.

Brute force detection: many authentication failures against a single account from one or a few IP addresses. Alert threshold: more than 10 failures against a single account within 5 minutes.

Privilege escalation attempts: authenticated users attempting to access admin endpoints, users attempting to modify their own role, or users accessing resources that belong to other users. Any single instance should trigger an alert.

Anomalous data access: a user downloading or querying significantly more data than their historical baseline, accessing records they have never accessed before in bulk, or using data export features outside of business hours.

Rate limit exhaustion: sustained rate limit hits from a single source over an extended period. A few rate limit hits are normal; hundreds per minute from a single IP is an attack.

Application error spikes: a sudden increase in 5xx errors could indicate an attack in progress (SQL injection attempts causing database errors, payload fuzzing causing unhandled exceptions) or a successful compromise (a modified application throwing errors).

**SIEM (Security Information and Event Management) platforms** aggregate logs from all sources — application servers, load balancers, databases, cloud provider audit logs, CDN logs — and provide search, correlation, and alerting capabilities. Options include Datadog Security Monitoring (good integration if you already use Datadog for observability), Elastic Security (the ELK stack with security-focused features — free and self-hosted or cloud-managed), Splunk (the enterprise standard, powerful but expensive), and AWS Security Hub (aggregates findings from AWS services and third-party tools).

**Alert fatigue is the silent killer of security monitoring.** If your team receives 200 alerts per day, they will stop looking at alerts. This is not a hypothetical concern — alert fatigue has contributed to major breaches where the attack was detected but the alert was buried in noise. The fix: tune alert thresholds aggressively (start strict, loosen if false positive rate is too high), group related alerts into incidents (50 auth failures from the same IP block should be one alert, not 50), classify alerts by severity (S1 pages someone immediately, S4 goes to a queue for business-hours review), and have clear escalation procedures (if an S2 alert is not acknowledged within 30 minutes, it escalates to S1).

**Dashboards provide ambient awareness.** Key security metrics should be visible on a wall-mounted screen or a team dashboard that people actually look at. Essential panels: authentication failure rate over time (spikes indicate attacks), rate limit hit rate by endpoint (identifies targeted endpoints), 4xx/5xx error ratio trends (sudden changes indicate problems), top blocked IPs (shows who is attacking you), new user registration rate over time (spikes indicate bot registration campaigns), and a security event timeline showing recent high-severity events.

### 7. Incident Response Playbook

Every team needs a documented incident response plan BEFORE an incident happens. During an incident, people are stressed, disoriented, and prone to mistakes. A playbook gives them a script to follow — not because the script covers every possible scenario, but because it covers the common ones and provides a decision framework for the uncommon ones. Teams without a playbook waste critical time debating what to do, who is in charge, and how to communicate. Those wasted minutes translate directly into additional data compromised, additional systems affected, and additional customers impacted.

**The six phases of incident response** form the backbone of every playbook, derived from the NIST Incident Response framework:

Phase 1 is Preparation. This happens before any incident. Define roles and assign them to specific people (with backups). Set up communication channels — a dedicated Slack channel template, a video call bridge, a status page. Provision tools — ensure your team has access to logs, can revoke credentials, can block IPs, and can deploy hotfixes without going through the normal release process. Create and maintain runbooks for common incident types. Practice with tabletop exercises at least annually.

Phase 2 is Identification. Detect the incident. This can come from monitoring alerts (your SIEM detects a credential stuffing attack), user reports ("I can see another user's data"), external notification (a security researcher reports a vulnerability, a customer reports suspicious activity on their account), or internal discovery (a developer notices something wrong during routine work). The key action in this phase is to classify the severity and activate the appropriate response level.

Phase 3 is Containment. Stop the bleeding. The specific actions depend on the incident type, but common containment actions include: revoking compromised credentials (API keys, user sessions, service accounts), blocking malicious IPs at the firewall or WAF, disabling compromised features (if the vulnerability is in a specific feature, disable it), isolating affected systems (remove compromised servers from the load balancer, rotate database credentials), and preserving evidence (do not wipe logs, take snapshots of affected systems before modifying them).

Phase 4 is Eradication. Remove the root cause. Patch the vulnerability that was exploited. Remove any malware, backdoors, or unauthorized accounts the attacker created. Fix the misconfiguration that allowed the attack. If the attacker created persistent access (SSH keys, cron jobs, modified application code), find and remove all of it.

Phase 5 is Recovery. Restore services to normal operation. Deploy the patched application. Verify data integrity — compare backups to current state, look for unauthorized modifications. Restore from backup if necessary. Monitor closely for recurrence — attackers often return to test whether their access has been fully revoked.

Phase 6 is Lessons Learned. Conduct a blameless post-mortem within 48 hours while details are fresh. Document what happened (timeline of events), how it was detected, what the impact was (data compromised, systems affected, customers impacted, duration), what went well (what parts of the response worked), what did not go well (what was slow, confusing, or missing), and action items with owners and deadlines. The post-mortem is not about blame — it is about learning. If the same incident type can happen again, the post-mortem failed.

**Roles must be clearly defined** so there is no confusion during an incident. The Incident Commander coordinates the overall response — they make decisions, assign tasks, and ensure communication flows. The Technical Lead drives the technical investigation — they analyze logs, identify the vulnerability, develop the fix. The Communications Lead handles all internal and external communication — status updates to leadership, notifications to customers, regulatory filings. The Scribe documents everything — the timeline, decisions made, actions taken, and by whom. Without a scribe, the post-mortem will be based on faulty memory.

**Communication templates save critical time.** Prepare templates for internal status updates (what happened, current status, next steps, ETA), customer notifications (what happened in non-technical terms, what data was affected, what you are doing about it, what they should do), and regulatory notifications (specific to your jurisdiction — GDPR requires notification within 72 hours, other regulations have different requirements).

**Severity tiers determine response urgency.** S1 is an active data breach or system compromise — all hands on deck, immediate response, leadership notified within 15 minutes. S2 is a vulnerability being actively exploited — rapid response, fix deployed within hours. S3 is a vulnerability discovered but not yet exploited — planned response, fix deployed within days. S4 is a potential vulnerability that needs investigation — queued for business-hours analysis. Each tier has different response time requirements, escalation paths, and communication obligations.

### 8. Penetration Testing Basics

Penetration testing is a controlled, authorized simulation of a real attack against your systems. Unlike automated scanning (SAST, DAST, dependency scanning), pentesting is a creative, adversarial exercise conducted by skilled humans who think like attackers. A good pentester does not just run tools — they understand your application's business logic, identify trust boundaries, and chain together multiple small weaknesses into full attack paths that automated tools would never find.

**When to pentest.** Before your initial launch — you do not want your first pentest to be conducted by actual attackers. Annually at minimum — new vulnerabilities are discovered constantly, your codebase changes continuously, and your pentest from last year does not reflect your current attack surface. After major changes — a new authentication system, a new payment integration, a new API, a major architecture change, or a significant infrastructure migration. Each of these introduces new attack surface. After a security incident — verify that the fix is complete and that similar vulnerabilities do not exist elsewhere.

**Scoping determines what the pentesters test and how.** There are three models. Black box testing: the pentester has no knowledge of the system beyond what a public attacker would have — the production URL and nothing else. This simulates an external attacker with no inside knowledge. It is the most realistic scenario but also the least efficient — the pentester spends significant time on reconnaissance that could be skipped. Gray box testing: the pentester has some knowledge — API documentation, a user account, an understanding of the tech stack. This simulates an authenticated attacker or a malicious insider with limited access. This is the most common and usually the best value — the pentester can skip reconnaissance and spend their time on deeper analysis. White box testing: the pentester has full access to source code, architecture diagrams, and infrastructure documentation. This is the most thorough approach — the pentester can identify vulnerabilities that are invisible from the outside — but it is also the most expensive because the scope is essentially unlimited.

**Finding qualified pentest firms.** Look for testers with recognized certifications: CREST (Council of Registered Ethical Security Testers), OSCP (Offensive Security Certified Professional), or OSCE (Offensive Security Certified Expert). Ask for sample reports — a good pentest report includes an executive summary for leadership, detailed technical findings with reproduction steps, risk ratings, and remediation recommendations. Ask for references from companies of similar size and industry. Budget: a web application pentest typically ranges from $5,000 to $50,000+ depending on scope, complexity, and the firm's reputation.

**Bug classes to prioritize for remediation.** Not all findings are equal. Authentication bypass (attacker can log in as any user) is always critical. Authorization flaws (attacker can access other users' data or perform privileged actions) are critical or high depending on impact. Injection vulnerabilities (SQL, command, XSS) are high to critical depending on exploitability and impact. Data exposure (sensitive data in URLs, logs, error messages, or API responses) ranges from medium to critical depending on what is exposed.

**Remediation timelines should be defined before the pentest starts.** Critical findings: fix within 24-48 hours, with a temporary mitigation (WAF rule, feature disable) deployed immediately. High findings: fix within 1 week. Medium findings: fix within 1 month. Low findings: fix within 1 quarter. These timelines should be agreed upon with leadership and the pentest firm.

**Retesting is essential.** After fixing all findings, have the pentest firm verify the fixes. A fix that does not actually work is worse than no fix — it gives you false confidence. Most pentest firms include a retest in their engagement, but confirm this before signing the contract.

### 9. Bug Bounty Programs

A bug bounty program invites external security researchers — a global community of thousands of skilled hackers — to find and report vulnerabilities in your systems in exchange for financial rewards. It is essentially a continuous, massively parallel penetration test. The best researchers are extraordinary: they find vulnerabilities that your internal team, your SAST tools, and your pentesters all missed.

**When to start a bug bounty: not on day one.** A bug bounty program on an application that has not been through basic security testing (SAST, DAST, dependency scanning, at least one pentest) will be overwhelmed with basic, well-known vulnerability classes. You will pay bounties for findings that your own tools should have caught. Start a bug bounty after you have addressed the low-hanging fruit — after your automated testing catches the obvious issues and a pentest has verified the less obvious ones. The bug bounty should be your last line of defense, catching the subtle vulnerabilities that everything else missed.

**Platforms provide the infrastructure.** HackerOne, Bugcrowd, and Intigriti are the major bug bounty platforms. They provide: a submission portal for researchers, triage services (their team reviews reports before they reach you, filtering out noise), payment processing (researchers get paid reliably, which encourages participation), reputation systems (researchers build reputations based on valid findings), and legal frameworks (terms of service that protect both you and the researchers). You can start with a private program (invite-only, a small group of vetted researchers) before going public.

**Scope definition is critical.** Clearly define what is in scope: your production web application, your API, your mobile applications, specific subdomains. Clearly define what is out of scope: third-party services you integrate with (Stripe, Auth0, AWS), social engineering attacks against your employees, denial-of-service attacks (you do not want researchers DoSing your production infrastructure), and physical security. Ambiguous scope leads to disputes, wasted time, and frustrated researchers.

**Reward tiers should be transparent and competitive.** Critical vulnerabilities (remote code execution, authentication bypass, access to all user data): $1,000 to $10,000 or more. High vulnerabilities (SQL injection, stored XSS, authorization bypass for specific resources): $500 to $2,000. Medium vulnerabilities (reflected XSS, CSRF, information disclosure): $100 to $500. Low vulnerabilities (minor information disclosure, missing best practices): $50 to $100. These ranges vary widely by company size and budget — even small rewards attract researchers if your program has a good reputation for responsiveness and fair treatment.

**Safe harbor is non-negotiable.** Your bug bounty policy must explicitly state that researchers who follow your rules (stay in scope, do not access other users' data beyond what is necessary to demonstrate the vulnerability, report findings promptly, do not publicly disclose before the agreed timeline) will not face legal action. This is not generosity — it is pragmatism. Without safe harbor, skilled researchers will not participate because the legal risk is not worth the reward. Your safe harbor statement should be reviewed by your legal team and published prominently.

**Triage process must be responsive.** Someone on your team must review incoming reports within 1-3 business days. First response time is the single most important metric for researcher satisfaction. If reports sit unread for weeks, researchers will stop submitting to your program — and they will tell other researchers. Assign a rotation for triage duty. Acknowledge the report, ask clarifying questions if needed, reproduce the vulnerability, assess severity, and communicate your timeline for a fix.

**Disclosure timelines.** The industry standard is 90 days: the researcher reports the vulnerability, you have 90 days to fix it, after which the researcher may publish the finding publicly. This timeline motivates timely fixes and allows researchers to receive public credit for their work. You can negotiate extensions for particularly complex fixes, but refusing to fix a vulnerability and then threatening legal action against a researcher who discloses it is a reputation-destroying move.

### 10. Security Code Review Checklist

Automated tools catch patterns, but human reviewers catch intent. A security-focused code review is the most effective way to catch business logic vulnerabilities, authorization flaws, and subtle mistakes that SAST tools cannot understand. Not every PR needs a full security review, but PRs that touch authentication, authorization, data handling, input processing, or infrastructure configuration absolutely do.

**What to look for in every security-sensitive code review:**

Hardcoded secrets: API keys, passwords, tokens, encryption keys, or connection strings in source code. These will end up in version control history and potentially in public repositories. Check for common patterns: strings that look like Base64-encoded keys, strings assigned to variables named `secret`, `key`, `password`, `token`, or `apiKey`.

SQL concatenation: any string building that includes user input in a query, even if it uses template literals. The only safe pattern is parameterized queries or ORM query builders. Raw string concatenation, template literals without the ORM's tagged template function, and string formatting functions are all vulnerable.

Missing authentication: new endpoints, routes, or controllers that do not include authentication middleware. In Express, this means routes without `requireAuth` (or your equivalent) in the middleware chain. In Next.js API routes, this means handlers that do not check `session` or call `getServerSession()`. Every endpoint should require authentication unless there is a documented reason it is public.

Missing authorization: endpoints that authenticate the user but do not verify they have permission to access the specific resource. The most common pattern is: user A is authenticated, requests `/api/users/B/data`, and the endpoint returns user B's data without checking that A is authorized to see it. Every endpoint that accesses user-specific data must verify resource ownership or role-based permission.

XSS sinks: use of `dangerouslySetInnerHTML` in React, `v-html` in Vue, `[innerHTML]` in Angular, or raw `innerHTML` assignment in vanilla JavaScript with data that originates from user input. The only safe pattern is to sanitize with DOMPurify before rendering.

Insecure deserialization: parsing untrusted JSON, YAML, or XML without schema validation. A request body parsed with `JSON.parse()` and then spread into a database object allows mass assignment — the attacker can set fields you did not intend (e.g., `isAdmin: true`). Always validate request bodies against a schema (Zod, Joi, Yup) before using them.

Mass assignment: spreading or destructuring the entire request body into a database create/update call. This allows attackers to set any field on the model, including fields like `role`, `isAdmin`, `verified`, or `creditBalance`. Always pick specific fields from the request body.

Debug endpoints: routes like `/api/debug`, `/api/test`, `/api/health/detailed`, or `/api/config` that expose internal application state, environment variables, or configuration. These must not exist in production. If they exist in development, they must be gated behind an environment check.

Error handling: stack traces, internal error messages, database error details, or file paths returned to clients in error responses. In production, error responses should contain a generic message and an error ID for correlation with internal logs — nothing more.

Crypto usage: custom hashing implementations (instead of bcrypt/scrypt/argon2 for passwords), use of MD5 or SHA1 for security purposes, hardcoded initialization vectors, use of ECB mode, or key derivation from passwords without a proper KDF. Cryptography is too easy to get subtly wrong — always use well-tested libraries with secure defaults.

**Reviewer responsibilities.** The reviewer is the last line of defense before code reaches production. For security-sensitive PRs, the reviewer should not just skim the diff — they should understand the threat model, consider how the code could be abused, and think about edge cases. Security-sensitive PRs should require approval from a security-aware team member, enforced via CODEOWNERS rules that require review from the security team for changes to authentication, authorization, and data handling modules.

### 11. Compliance Testing

Compliance frameworks exist because industries learned the hard way that voluntary security measures are inconsistently applied. They establish minimum baselines — floors, not ceilings — for security practices. Understanding which frameworks apply to your application and what they require is not optional if you handle payment data, health records, or serve enterprise customers.

**PCI DSS (Payment Card Industry Data Security Standard)** is required if you handle credit card data in any form — storing, processing, or transmitting. The standard has 12 high-level requirements covering network security, data protection, vulnerability management, access control, monitoring, and security policy. Key requirements include: encrypting cardholder data in transit and at rest, restricting access to cardholder data to those who need it, maintaining a vulnerability management program (patching, scanning), regularly testing security controls (penetration testing, vulnerability scanning), and maintaining an information security policy. The easiest path for most web applications is to use Stripe, Braintree, or a similar payment processor with tokenization — the card data never touches your servers. This reduces your PCI scope to SAQ-A (Self-Assessment Questionnaire A), the simplest compliance level. If you handle card data directly, you need SAQ-D and potentially a Qualified Security Assessor audit, which is significantly more expensive and complex.

**SOC 2 Type II** is the trust framework most commonly required by enterprise customers evaluating SaaS vendors. It covers five trust service criteria: security (the system is protected against unauthorized access), availability (the system is available for operation as committed), processing integrity (system processing is complete, accurate, and authorized), confidentiality (information designated as confidential is protected), and privacy (personal information is collected, used, retained, and disclosed in conformity with commitments). Type II means an auditor examines your controls over a period of time (typically 6-12 months), not just at a point in time (that would be Type I). SOC 2 requires an annual audit by a CPA firm. Common areas of focus: access control (how do you manage who has access to what), change management (how do you deploy code changes), incident response (how do you handle security incidents), and monitoring (how do you detect problems).

**HIPAA (Health Insurance Portability and Accountability Act)** is required if you handle protected health information (PHI) — any individually identifiable health information. Key requirements include access controls (role-based access to PHI), audit logging (who accessed what PHI and when), encryption (PHI must be encrypted in transit and at rest), business associate agreements (BAAs with any third party that handles PHI on your behalf — your cloud provider, your email service, your analytics platform). HIPAA violations carry significant financial penalties — up to $1.5 million per violation category per year.

**ISO 27001** is the international standard for information security management systems (ISMS). It is a voluntary certification but is increasingly expected by enterprise customers, particularly in Europe and Asia. ISO 27001 requires you to establish, implement, maintain, and continually improve an information security management system. The certification process involves a gap analysis, remediation, internal audit, and certification audit by an accredited body.

**The critical insight: compliance certification does NOT equal security.** Equifax was PCI DSS compliant when it was breached. Target was PCI DSS compliant when 40 million credit card numbers were stolen. Compliance frameworks are minimum baselines — they tell you what you must do, not what is sufficient. Many compliance requirements are vague ("implement appropriate security measures"), and auditors have varying standards for what "appropriate" means. Use compliance frameworks as a starting point and a forcing function for basic security hygiene, but do not treat a certification as proof that you are secure.

**Automate compliance evidence collection wherever possible.** Compliance audits require evidence — screenshots of configurations, logs of access reviews, vulnerability scan reports, change management records. Collecting this evidence manually is time-consuming and error-prone. Automate it: export audit logs automatically, run vulnerability scans on a schedule and archive results, use infrastructure-as-code so your configuration is documented in version control, and use tools like Vanta or Drata that continuously collect compliance evidence and map it to framework requirements.

---

## LLM Instructions

When generating security testing and monitoring code, follow these instructions to produce configurations and implementations that are production-ready, maintainable, and aligned with the principles documented above. Security testing infrastructure is foundational — mistakes here create false confidence that is worse than no testing at all.

### 1. Setting Up SAST in CI

Add Semgrep to the CI pipeline as a required check that runs on every pull request and every push to the main branch. Use the `p/javascript` and `p/typescript` default rulesets as a baseline — these cover OWASP Top 10 vulnerability patterns out of the box. Then create custom Semgrep rules specific to the project's patterns and abstractions. For multi-tenant applications using Prisma, write a rule that flags any raw database query not using the Prisma client. For Express applications, write a rule that flags route handlers without authentication middleware. For React applications, write a rule that flags `dangerouslySetInnerHTML` usage without DOMPurify sanitization. Store custom rules in a `.semgrep/` directory at the repository root so they are version-controlled and reviewed alongside the code they protect.

If the project is hosted on GitHub, configure CodeQL as an additional SAST layer. CodeQL's interprocedural analysis catches taint-flow vulnerabilities that Semgrep's pattern matching misses — data flowing from a request parameter through multiple function calls into a SQL query, for example. Enable the default CodeQL query packs for JavaScript and TypeScript.

Add `eslint-plugin-security` and `eslint-plugin-no-unsanitized` to the project's ESLint configuration. These catch Node.js-specific security issues (eval with dynamic input, non-literal require, RegExp DoS) and DOM XSS sinks (innerHTML, outerHTML, document.write) as part of the normal linting process.

Output all SAST results in SARIF (Static Analysis Results Interchange Format) and upload them to the GitHub Security tab using the `github/codeql-action/upload-sarif` action. This centralizes all security findings in one place, tracks them over time, and allows developers to see findings inline in pull request diffs.

### 2. Adding Security Logging

Configure the project's logging library (Pino is recommended for Node.js applications due to its performance) with JSON output format. Create a dedicated security logger instance that is separate from the general application logger — this allows independent configuration of log levels, transports, and retention for security events.

Build a security event logging utility that provides typed event functions. Each function should accept the relevant context and produce a structured log entry with: ISO 8601 timestamp, log level, service name, request ID (extracted from the request context for cross-service correlation), user ID (if authenticated), client IP address (extracted from X-Forwarded-For when behind a reverse proxy, with awareness that this header can be spoofed), action name (a machine-readable string like AUTH_SUCCESS, AUTH_FAILURE, AUTHZ_FAILURE, RATE_LIMIT_HIT, ADMIN_ACTION), resource (what was accessed or modified), and result (success or failure with a reason code).

Add logging middleware that intercepts authentication events (successful and failed logins, token refreshes, password resets), authorization failures (requests rejected by permission checks), and rate limit triggers (requests rejected by rate limiting middleware). This middleware should be applied globally so that no endpoint is accidentally excluded from security logging.

Implement a PII sanitizer that runs before log entries are written. The sanitizer should redact or remove fields that must never appear in logs: passwords, authentication tokens, credit card numbers, social security numbers, and any field that constitutes personally identifiable information under applicable regulations. Use a combination of field name matching (redact any field named password, token, secret, ssn, creditCard) and pattern matching (redact strings matching credit card number patterns, SSN patterns) to catch PII regardless of the field name.

Set up log aggregation to a centralized service (Datadog, Elastic, CloudWatch Logs, or similar) so that security logs from all instances and services are searchable from a single interface. Configure log retention to meet your compliance requirements — most frameworks require 90 days minimum, and many require one year.

### 3. Building an Incident Response Plan

Generate a project-specific incident response playbook based on the application's architecture, deployment model, and threat profile. The playbook should be a living document stored in the repository (not in a wiki that nobody reads) and reviewed quarterly.

Include a team roles section with specific names, contact information (phone numbers, not just Slack handles — Slack may be unavailable during an incident), and backup assignments for each role: Incident Commander, Technical Lead, Communications Lead, and Scribe. Include an escalation matrix that defines who is contacted at each severity level and what the response time expectation is.

Define severity classification criteria specific to the application. S1 should map to scenarios like active data breach, production system compromise, or credential exposure affecting all users. S2 should map to vulnerability being actively exploited with limited impact, or partial system compromise. S3 should map to vulnerability discovered through testing or bug bounty but not known to be exploited. S4 should map to potential vulnerability that requires investigation, or security improvement recommendation.

Create per-incident-type runbooks for the most likely scenarios: data breach (identify scope, contain, notify affected users, notify regulators), credential compromise (revoke and rotate all affected credentials, audit access logs for unauthorized use, notify affected users), DDoS attack (engage CDN/WAF provider, implement emergency rate limiting, communicate with users about degraded service), and application defacement or unauthorized modification (take snapshots for forensics, restore from known-good state, investigate access path).

Include communication templates that can be filled in during an incident rather than composed from scratch under pressure. Templates for internal status updates, customer notification emails, social media statements, and regulatory notifications (with jurisdiction-specific requirements noted) save critical minutes during an incident.

End the playbook with a post-mortem template that ensures consistent documentation: incident timeline (with timestamps), root cause analysis, impact assessment (users affected, data exposed, financial impact), what went well during response, what needs improvement, and action items with owners and deadlines.

### 4. Running Dependency Scanning

Configure `npm audit` as a CI pipeline step that runs on every build. Set the severity threshold to fail the build on high and critical findings using the `--audit-level=high` flag. For projects that cannot immediately address all findings, use `npm audit` with the `--omit=dev` flag to focus on production dependencies first, since devDependencies are not deployed and represent a smaller risk surface.

Enable Dependabot alerts for the repository through GitHub Settings. Configure Dependabot to open pull requests automatically for security updates. Set the PR limit to a manageable number (5-10 open at a time) to avoid overwhelming the team with dependency update PRs.

For projects that build Docker images, add Trivy container scanning to the CI pipeline. Trivy scans the container image for OS-level vulnerabilities (outdated system packages in the base image), application-level vulnerabilities (the same things npm audit catches, plus language-specific issues), and misconfigurations (running as root, unnecessary capabilities). Output Trivy results in SARIF format and upload to the GitHub Security tab alongside SAST results.

Set up branch protection rules that require security scanning checks to pass before a pull request can be merged. This ensures that no one can merge code that introduces a known vulnerability, even accidentally. The required checks should include the SAST scan, the npm audit check, and the Trivy scan (if applicable).

When a vulnerability finding does not apply to your usage of the affected package, document the decision to accept the risk. Create a file (such as `.audit-exceptions.json` or a section in the security documentation) that records: the CVE identifier, the affected package, the reason the vulnerability does not apply, who made the decision, and when it was made. This documentation is essential for audits and for future team members who will wonder why a known CVE was not addressed.

### 5. Conducting a Security Code Review

When reviewing pull requests that touch authentication, authorization, data handling, input processing, cryptography, or infrastructure configuration, apply the security code review checklist systematically. Do not rely on gut feeling or a quick skim of the diff — work through each item on the checklist deliberately.

Start by understanding the change in context. What is the PR trying to accomplish? What data does it handle? What trust boundaries does it cross? Who can trigger this code path? What happens if the input is malicious? These questions frame the security review and help the reviewer think like an attacker rather than a developer.

Check for hardcoded secrets by scanning the diff for strings that look like API keys, tokens, passwords, or connection strings. Check for SQL injection by verifying that all database queries use parameterized queries or ORM query builders, never string concatenation. Check for missing authentication by verifying that every new endpoint includes authentication middleware. Check for missing authorization by verifying that every endpoint that accesses user-specific data checks resource ownership. Check for XSS sinks by verifying that any use of dangerouslySetInnerHTML, v-html, or innerHTML is sanitized with DOMPurify. Check for mass assignment by verifying that request bodies are validated against a schema and that only specific fields are extracted. Check for debug endpoints that should not exist in production. Check for error handling that leaks internal details to clients.

Request changes for any security finding, regardless of severity. Security issues are not "nice to have" fixes — they are blocking. A low-severity information disclosure today can become the reconnaissance step for a critical exploit tomorrow. Document the finding clearly in the review comment, explain why it is a security issue, and suggest the correct approach.

---

## Examples

### 1. Semgrep Configuration for JavaScript/TypeScript

A `.semgrep.yml` file with custom rules tailored to a typical Node.js/TypeScript project, plus the GitHub Actions step to run it:

```yaml
# .semgrep/custom-rules.yml
rules:
  - id: raw-sql-injection
    patterns:
      - pattern-either:
          - pattern: |
              $DB.query($QUERY + ...)
          - pattern: |
              $DB.query(`...${...}...`)
          - pattern: |
              $POOL.query($QUERY + ...)
          - pattern: |
              $POOL.query(`...${...}...`)
    message: >
      SQL query built with string concatenation or template literal interpolation.
      Use parameterized queries instead: $DB.query('SELECT * FROM users WHERE id = $1', [userId])
    severity: ERROR
    languages: [javascript, typescript]
    metadata:
      cwe: "CWE-89: SQL Injection"
      owasp: "A03:2021 - Injection"

  - id: eval-usage
    patterns:
      - pattern: eval(...)
    message: >
      eval() executes arbitrary code. Never use eval() with any input that
      could be influenced by a user. Use JSON.parse() for JSON, a sandboxed
      expression parser for math, or refactor to avoid eval entirely.
    severity: ERROR
    languages: [javascript, typescript]
    metadata:
      cwe: "CWE-95: Eval Injection"

  - id: hardcoded-secret-pattern
    patterns:
      - pattern-either:
          - pattern: |
              const $KEY = "AKIA..."
          - pattern: |
              const $KEY = "sk_live_..."
          - pattern: |
              const $KEY = "sk-..."
          - pattern: |
              $HEADERS = { ..., "Authorization": "Bearer $VALUE", ... }
    message: >
      Possible hardcoded secret detected. Move this value to an environment
      variable and access it via process.env.
    severity: ERROR
    languages: [javascript, typescript]
    metadata:
      cwe: "CWE-798: Hardcoded Credentials"

  - id: dangerouslysetinnerhtml-without-sanitize
    patterns:
      - pattern: |
          dangerouslySetInnerHTML={{__html: $VALUE}}
      - pattern-not: |
          dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(...)}}
      - pattern-not: |
          dangerouslySetInnerHTML={{__html: purify.sanitize(...)}}
    message: >
      dangerouslySetInnerHTML used without DOMPurify sanitization.
      Always sanitize: dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userContent)}}
    severity: ERROR
    languages: [javascript, typescript]
    metadata:
      cwe: "CWE-79: Cross-site Scripting"
      owasp: "A03:2021 - Injection"

  - id: missing-auth-middleware
    patterns:
      - pattern: |
          $APP.get($PATH, async (req, res) => { ... })
      - pattern-not: |
          $APP.get($PATH, requireAuth, ...)
      - pattern-not: |
          $APP.get($PATH, authenticate, ...)
      - pattern-not: |
          $APP.get($PATH, isAuthenticated, ...)
    message: >
      Route handler without authentication middleware. Add requireAuth
      middleware or document why this endpoint is intentionally public.
    severity: WARNING
    languages: [javascript, typescript]
    metadata:
      cwe: "CWE-306: Missing Authentication"

  - id: stack-trace-exposure
    patterns:
      - pattern-either:
          - pattern: |
              res.json({ ..., stack: $ERR.stack, ... })
          - pattern: |
              res.send($ERR.stack)
          - pattern: |
              res.json({ ..., error: $ERR.message, ... })
    message: >
      Error details or stack trace sent in response. In production, return
      a generic error message and an error ID. Log the full error server-side.
    severity: WARNING
    languages: [javascript, typescript]
    metadata:
      cwe: "CWE-209: Information Exposure Through Error Message"

  - id: weak-random
    patterns:
      - pattern: Math.random()
    message: >
      Math.random() is not cryptographically secure. For security-sensitive
      values (tokens, IDs, nonces), use crypto.randomUUID() or
      crypto.randomBytes().
    severity: WARNING
    languages: [javascript, typescript]
    metadata:
      cwe: "CWE-338: Use of Cryptographically Weak PRNG"
```

GitHub Actions workflow step to run Semgrep and upload results:

```yaml
# .github/workflows/security.yml (Semgrep job)
  semgrep:
    name: SAST - Semgrep
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/javascript
            p/typescript
            p/nodejs
            p/owasp-top-ten
            .semgrep/custom-rules.yml
          generateSarif: "1"

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif
          category: semgrep
```

### 2. Security Event Logging (Pino Structured Logging)

A complete security logging setup for a Node.js/Express application using Pino:

```typescript
// src/logging/security-logger.ts
import pino from "pino";

// ── Security event types ──────────────────────────────────────────
export enum SecurityEvent {
  AUTH_SUCCESS = "AUTH_SUCCESS",
  AUTH_FAILURE = "AUTH_FAILURE",
  AUTH_LOGOUT = "AUTH_LOGOUT",
  AUTH_TOKEN_REFRESH = "AUTH_TOKEN_REFRESH",
  AUTH_PASSWORD_RESET = "AUTH_PASSWORD_RESET",
  AUTH_MFA_CHALLENGE = "AUTH_MFA_CHALLENGE",
  AUTHZ_FAILURE = "AUTHZ_FAILURE",
  RATE_LIMIT_HIT = "RATE_LIMIT_HIT",
  INPUT_VALIDATION_FAILURE = "INPUT_VALIDATION_FAILURE",
  ADMIN_ACTION = "ADMIN_ACTION",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  DATA_ACCESS = "DATA_ACCESS",
}

export interface SecurityLogContext {
  requestId: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result: "success" | "failure";
  reason?: string;
  metadata?: Record<string, unknown>;
}

// ── PII sanitizer ─────────────────────────────────────────────────
const SENSITIVE_FIELD_NAMES = new Set([
  "password",
  "passwd",
  "secret",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "api_key",
  "authorization",
  "ssn",
  "socialSecurityNumber",
  "creditCard",
  "creditCardNumber",
  "cardNumber",
  "cvv",
  "cvc",
]);

const SENSITIVE_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "credit_card",
    regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  },
  { name: "ssn", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    name: "bearer_token",
    regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
  },
];

function sanitizeValue(key: string, value: unknown): unknown {
  if (typeof value === "string") {
    if (SENSITIVE_FIELD_NAMES.has(key)) {
      return "[REDACTED]";
    }
    let sanitized = value;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern.regex, `[REDACTED:${pattern.name}]`);
    }
    return sanitized;
  }
  if (typeof value === "object" && value !== null) {
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

export function sanitizeObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(key, value);
  }
  return sanitized;
}

// ── Logger instance ───────────────────────────────────────────────
const securityLogger = pino({
  name: "security",
  level: "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  serializers: {
    metadata: sanitizeObject,
  },
});

// ── Typed logging functions ───────────────────────────────────────
export function logSecurityEvent(
  event: SecurityEvent,
  context: SecurityLogContext
): void {
  const logEntry = {
    event,
    requestId: context.requestId,
    userId: context.userId ?? "anonymous",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    resource: context.resource,
    action: context.action,
    result: context.result,
    reason: context.reason,
    metadata: context.metadata ? sanitizeObject(context.metadata) : undefined,
  };

  if (context.result === "failure") {
    securityLogger.warn(logEntry, `Security event: ${event}`);
  } else {
    securityLogger.info(logEntry, `Security event: ${event}`);
  }
}

export { securityLogger };
```

Express middleware that logs authentication and authorization events:

```typescript
// src/middleware/security-logging.middleware.ts
import { Request, Response, NextFunction } from "express";
import {
  logSecurityEvent,
  SecurityEvent,
} from "../logging/security-logger";

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

function getRequestId(req: Request): string {
  return (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
}

// Log all authentication outcomes
export function authEventLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    if (req.path === "/api/auth/login") {
      const event =
        res.statusCode >= 200 && res.statusCode < 300
          ? SecurityEvent.AUTH_SUCCESS
          : SecurityEvent.AUTH_FAILURE;

      logSecurityEvent(event, {
        requestId: getRequestId(req),
        userId:
          event === SecurityEvent.AUTH_SUCCESS
            ? (body as Record<string, unknown>)?.userId as string
            : undefined,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
        resource: "/api/auth/login",
        action: "login",
        result: event === SecurityEvent.AUTH_SUCCESS ? "success" : "failure",
        reason:
          event === SecurityEvent.AUTH_FAILURE
            ? `HTTP ${res.statusCode}`
            : undefined,
      });
    }

    return originalJson(body);
  };

  next();
}

// Log authorization failures
export function authzFailureLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalStatus = res.status.bind(res);

  res.status = function (code: number) {
    if (code === 403) {
      logSecurityEvent(SecurityEvent.AUTHZ_FAILURE, {
        requestId: getRequestId(req),
        userId: (req as Record<string, unknown>).userId as string,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
        resource: `${req.method} ${req.originalUrl}`,
        action: "access_denied",
        result: "failure",
        reason: "insufficient_permissions",
      });
    }
    return originalStatus(code);
  };

  next();
}

// Log rate limit hits
export function rateLimitLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalStatus = res.status.bind(res);

  res.status = function (code: number) {
    if (code === 429) {
      logSecurityEvent(SecurityEvent.RATE_LIMIT_HIT, {
        requestId: getRequestId(req),
        userId: (req as Record<string, unknown>).userId as string,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
        resource: `${req.method} ${req.originalUrl}`,
        action: "rate_limit_exceeded",
        result: "failure",
        reason: "too_many_requests",
      });
    }
    return originalStatus(code);
  };

  next();
}
```

### 3. Incident Response Playbook Template (Markdown)

A complete, fill-in-the-blanks incident response playbook:

````markdown
# Incident Response Playbook — [Project Name]

## Overview

This playbook defines the procedures for identifying, containing, eradicating,
and recovering from security incidents affecting [Project Name]. All team
members with on-call responsibilities must read this document and participate
in at least one tabletop exercise per year.

**Last updated:** YYYY-MM-DD
**Next review:** YYYY-MM-DD (quarterly)

---

## Team Roles

| Role                  | Primary          | Backup           | Contact                  |
|-----------------------|------------------|------------------|--------------------------|
| Incident Commander    | [Name]           | [Name]           | [Phone] / [Slack]        |
| Technical Lead        | [Name]           | [Name]           | [Phone] / [Slack]        |
| Communications Lead   | [Name]           | [Name]           | [Phone] / [Slack]        |
| Scribe                | [Name]           | [Name]           | [Phone] / [Slack]        |
| Executive Sponsor     | [Name]           | [Name]           | [Phone] / [Email]        |
| Legal Counsel         | [Name / Firm]    | —                | [Phone] / [Email]        |

---

## Severity Classification

| Severity | Description                                        | Response Time | Escalation          |
|----------|----------------------------------------------------|---------------|----------------------|
| S1       | Active data breach, system compromise,             | Immediate     | Executive + Legal    |
|          | credential exposure affecting all users             | (< 15 min)    | within 15 minutes    |
| S2       | Vulnerability actively exploited, limited impact,   | < 1 hour      | Engineering Lead     |
|          | partial system compromise                           |               | within 30 minutes    |
| S3       | Vulnerability discovered, not exploited,            | < 24 hours    | Security team        |
|          | found via testing or bug bounty                     |               | during business hours|
| S4       | Potential vulnerability, needs investigation,       | < 72 hours    | Security backlog     |
|          | security improvement recommendation                 |               |                      |

---

## Incident Type Runbooks

### Data Breach

1. **Contain:** Identify affected systems. Isolate compromised servers (remove
   from load balancer, revoke network access). Preserve forensic evidence
   (take disk snapshots before making changes).
2. **Assess scope:** Determine what data was accessed. Query audit logs for
   unauthorized access patterns. Identify affected users.
3. **Eradicate:** Patch the vulnerability. Rotate all credentials that may
   have been exposed (database passwords, API keys, user sessions).
4. **Notify:** Notify affected users within [X hours]. Notify regulators per
   jurisdiction requirements (GDPR: 72 hours, other: [specify]).
5. **Recover:** Deploy patched application. Verify data integrity against
   backups. Force password resets for affected accounts.

### Credential Compromise (API Key, Service Account, User Credentials)

1. **Contain:** Immediately revoke the compromised credential. Generate new
   credentials and deploy to affected services.
2. **Assess:** Review audit logs for the compromised credential. Identify all
   actions taken with the credential since the suspected compromise time.
3. **Eradicate:** Determine how the credential was compromised (committed to
   repo, phishing, insider). Fix the root cause.
4. **Notify:** If user credentials, notify affected users and force password
   reset. If API key, assess whether customer data was accessed.

### DDoS Attack

1. **Contain:** Engage CDN/WAF provider (Cloudflare, AWS Shield). Enable
   emergency rate limiting. Implement geographic blocking if attack source
   is localized.
2. **Communicate:** Post status update to status page. Notify customers of
   degraded service.
3. **Mitigate:** Work with hosting provider and CDN to absorb/filter traffic.
   Scale infrastructure if possible.
4. **Recover:** Gradually relax emergency measures. Monitor for recurrence.

### Application Defacement / Unauthorized Modification

1. **Contain:** Take the application offline or revert to last known-good
   deployment.
2. **Preserve evidence:** Snapshot the compromised deployment for forensic
   analysis.
3. **Investigate:** Determine the attack vector (compromised credentials,
   exploited vulnerability, supply chain compromise).
4. **Recover:** Redeploy from verified source (Git, not the compromised
   environment). Rotate all deployment credentials.

---

## Communication Templates

### Internal Status Update
```
Subject: [S{1-4}] Security Incident — [Brief Description]

Status: [Investigating | Identified | Monitoring | Resolved]
Severity: S[1-4]
Incident Commander: [Name]
Started: [Timestamp]
Last update: [Timestamp]

Summary: [2-3 sentences describing the incident]

Current actions:
- [Action 1]
- [Action 2]

Next update: [Time]
```

### Customer Notification
```
Subject: Security Notice — [Brief Description]

We are writing to inform you of a security incident that may affect
your account.

What happened: [Non-technical description]

What information was involved: [Specific data types, if known]

What we are doing: [Actions taken and planned]

What you can do: [Password reset, enable MFA, monitor account]

For questions: [Contact email/phone]
```

### Regulatory Notification (GDPR Template)
```
To: [Data Protection Authority]
From: [Organization Data Protection Officer]
Date: [Must be within 72 hours of discovery]

Nature of the breach: [Description]
Categories and approximate number of data subjects: [Number]
Categories and approximate number of records: [Number]
Likely consequences: [Assessment]
Measures taken or proposed: [Actions]
Contact: [DPO name, email, phone]
```

---

## Post-Mortem Template

### Incident: [Title]
**Date:** YYYY-MM-DD
**Duration:** [Start time] — [End time] ([X] hours)
**Severity:** S[1-4]
**Incident Commander:** [Name]

### Timeline
| Time (UTC)   | Event                                    |
|--------------|------------------------------------------|
| HH:MM        | [First indicator of incident]            |
| HH:MM        | [Alert triggered / Report received]      |
| HH:MM        | [Incident Commander engaged]             |
| HH:MM        | [Containment action taken]               |
| HH:MM        | [Root cause identified]                  |
| HH:MM        | [Fix deployed]                           |
| HH:MM        | [Incident resolved]                      |

### Root Cause
[Detailed technical explanation of what caused the incident]

### Impact
- **Users affected:** [Number]
- **Data exposed:** [Types and volume]
- **Duration of exposure:** [Time period]
- **Financial impact:** [If quantifiable]

### What Went Well
- [Item 1]
- [Item 2]

### What Needs Improvement
- [Item 1]
- [Item 2]

### Action Items
| Action                              | Owner    | Due Date   | Status   |
|-------------------------------------|----------|------------|----------|
| [Action 1]                          | [Name]   | YYYY-MM-DD | Open     |
| [Action 2]                          | [Name]   | YYYY-MM-DD | Open     |
````

### 4. GitHub Actions Security Pipeline (SAST + Dependency Scan + Docker Scan)

A complete CI workflow that runs SAST, dependency scanning, and container image scanning:

```yaml
# .github/workflows/security-pipeline.yml
name: Security Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Run weekly full scan on Sundays at 2 AM UTC
    - cron: "0 2 * * 0"

permissions:
  contents: read
  security-events: write
  pull-requests: read

jobs:
  # ── SAST with Semgrep ─────────────────────────────────────────
  sast-semgrep:
    name: SAST — Semgrep
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/javascript
            p/typescript
            p/nodejs
            p/owasp-top-ten
            .semgrep/custom-rules.yml
          generateSarif: "1"
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

      - name: Upload Semgrep SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif
          category: semgrep

  # ── SAST with CodeQL ──────────────────────────────────────────
  sast-codeql:
    name: SAST — CodeQL
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-and-quality

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: codeql

  # ── Dependency scanning ───────────────────────────────────────
  dependency-scan:
    name: Dependency Scan — npm audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit (production deps)
        run: npm audit --omit=dev --audit-level=high

      - name: Run npm audit (full report)
        if: always()
        run: |
          npm audit --json > npm-audit-report.json || true

      - name: Upload audit report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: npm-audit-report
          path: npm-audit-report.json
          retention-days: 90

  # ── Docker image scanning ─────────────────────────────────────
  container-scan:
    name: Container Scan — Trivy
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'push' ||
      github.event_name == 'schedule'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t app:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: "app:${{ github.sha }}"
          format: "sarif"
          output: "trivy-results.sarif"
          severity: "CRITICAL,HIGH"
          exit-code: "1"

      - name: Upload Trivy SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif
          category: trivy

  # ── Security gate ─────────────────────────────────────────────
  security-gate:
    name: Security Gate
    needs: [sast-semgrep, sast-codeql, dependency-scan]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Check security scan results
        run: |
          if [ "${{ needs.sast-semgrep.result }}" == "failure" ] || \
             [ "${{ needs.sast-codeql.result }}" == "failure" ] || \
             [ "${{ needs.dependency-scan.result }}" == "failure" ]; then
            echo "::error::Security checks failed. Review findings in the Security tab."
            exit 1
          fi
          echo "All security checks passed."
```

Branch protection recommendation (configure in GitHub Settings > Branches):

```yaml
# Recommended branch protection rules for main branch:
#
# Required status checks:
#   - "SAST — Semgrep"
#   - "SAST — CodeQL"
#   - "Dependency Scan — npm audit"
#   - "Security Gate"
#
# Additional settings:
#   - Require pull request reviews before merging: Yes
#   - Dismiss stale pull request approvals when new commits are pushed: Yes
#   - Require review from Code Owners: Yes (for security-sensitive paths)
#   - Require signed commits: Recommended
#   - Do not allow bypassing the above settings: Yes
#
# CODEOWNERS file entry for security-sensitive code:
#   /src/auth/          @your-org/security-team
#   /src/middleware/     @your-org/security-team
#   /src/crypto/        @your-org/security-team
#   /.env*              @your-org/security-team
```

### 5. Security Monitoring Dashboard Specification

A Grafana dashboard specification defining key security monitoring panels and alert thresholds:

```json
{
  "dashboard": {
    "title": "Security Monitoring Dashboard",
    "description": "Real-time security metrics and alerting for production environment",
    "refresh": "30s",
    "panels": [
      {
        "title": "Authentication Failure Rate",
        "type": "timeseries",
        "description": "Failed login attempts per minute. Spikes indicate credential stuffing or brute force attacks.",
        "query": "sum(rate(auth_failures_total[1m])) by (reason)",
        "alert": {
          "name": "High Auth Failure Rate",
          "condition": "value > 50 for 5m",
          "severity": "critical",
          "message": "Authentication failure rate exceeds 50/min for 5 minutes. Possible credential stuffing attack.",
          "notification_channels": ["pagerduty-security", "slack-security-alerts"]
        },
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 }
      },
      {
        "title": "Rate Limit Hits by Endpoint",
        "type": "barchart",
        "description": "Rate limit triggers grouped by endpoint. Identifies targeted endpoints.",
        "query": "sum(increase(rate_limit_hits_total[5m])) by (endpoint)",
        "alert": {
          "name": "Sustained Rate Limiting",
          "condition": "any endpoint > 100 hits in 5m",
          "severity": "warning",
          "message": "Sustained rate limiting on endpoint {{ $labels.endpoint }}. Possible brute force or DoS.",
          "notification_channels": ["slack-security-alerts"]
        },
        "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 }
      },
      {
        "title": "HTTP Error Ratio (4xx / 5xx)",
        "type": "gauge",
        "description": "Ratio of error responses to total responses. Sudden increases indicate attacks or compromises.",
        "queries": {
          "4xx_rate": "sum(rate(http_responses_total{status=~'4..'}[5m])) / sum(rate(http_responses_total[5m])) * 100",
          "5xx_rate": "sum(rate(http_responses_total{status=~'5..'}[5m])) / sum(rate(http_responses_total[5m])) * 100"
        },
        "thresholds": {
          "4xx": { "warning": 10, "critical": 25 },
          "5xx": { "warning": 1, "critical": 5 }
        },
        "alert": {
          "name": "5xx Error Spike",
          "condition": "5xx_rate > 5 for 5m",
          "severity": "critical",
          "message": "5xx error rate exceeds 5% for 5 minutes. Possible attack or system compromise.",
          "notification_channels": ["pagerduty-engineering", "slack-security-alerts"]
        },
        "gridPos": { "x": 0, "y": 8, "w": 8, "h": 6 }
      },
      {
        "title": "Top Blocked IPs (Last 24 Hours)",
        "type": "table",
        "description": "IP addresses with the most blocked requests. Useful for identifying persistent attackers.",
        "query": "topk(20, sum(increase(blocked_requests_total[24h])) by (source_ip))",
        "columns": [
          { "field": "source_ip", "header": "IP Address" },
          { "field": "value", "header": "Blocked Requests" },
          { "field": "geo_country", "header": "Country" },
          { "field": "block_reason", "header": "Primary Reason" }
        ],
        "gridPos": { "x": 8, "y": 8, "w": 8, "h": 6 }
      },
      {
        "title": "New User Registrations",
        "type": "timeseries",
        "description": "New user registrations per hour. Sudden spikes indicate bot registration campaigns.",
        "query": "sum(increase(user_registrations_total[1h]))",
        "alert": {
          "name": "Registration Spike",
          "condition": "value > 10x rolling_7d_average for 1h",
          "severity": "warning",
          "message": "User registration rate is 10x above 7-day average. Possible bot registration campaign.",
          "notification_channels": ["slack-security-alerts"]
        },
        "gridPos": { "x": 16, "y": 8, "w": 8, "h": 6 }
      },
      {
        "title": "Security Event Timeline",
        "type": "logs",
        "description": "Recent high-severity security events: AUTH_FAILURE, AUTHZ_FAILURE, RATE_LIMIT_HIT, ADMIN_ACTION.",
        "query": "event in ('AUTH_FAILURE', 'AUTHZ_FAILURE', 'RATE_LIMIT_HIT', 'ADMIN_ACTION', 'SUSPICIOUS_ACTIVITY') | sort timestamp desc | limit 100",
        "columns": [
          { "field": "timestamp", "header": "Time" },
          { "field": "event", "header": "Event" },
          { "field": "userId", "header": "User" },
          { "field": "ipAddress", "header": "IP" },
          { "field": "resource", "header": "Resource" },
          { "field": "reason", "header": "Reason" }
        ],
        "gridPos": { "x": 0, "y": 14, "w": 24, "h": 8 }
      },
      {
        "title": "Brute Force Detection (Per-Account Failures)",
        "type": "timeseries",
        "description": "Accounts with multiple authentication failures. Identifies targeted brute force attacks.",
        "query": "topk(10, sum(increase(auth_failures_total[5m])) by (target_account))",
        "alert": {
          "name": "Brute Force Detected",
          "condition": "any account > 10 failures in 5m",
          "severity": "critical",
          "message": "Account {{ $labels.target_account }} has {{ $value }} auth failures in 5 minutes. Possible brute force attack.",
          "notification_channels": ["pagerduty-security", "slack-security-alerts"]
        },
        "gridPos": { "x": 0, "y": 22, "w": 12, "h": 8 }
      },
      {
        "title": "Authorization Failures by User",
        "type": "timeseries",
        "description": "Users receiving 403 responses. Multiple failures suggest privilege escalation probing.",
        "query": "sum(increase(authz_failures_total[15m])) by (userId)",
        "alert": {
          "name": "Privilege Escalation Probe",
          "condition": "any user > 5 authz failures in 15m",
          "severity": "warning",
          "message": "User {{ $labels.userId }} has {{ $value }} authorization failures in 15 minutes. Possible privilege escalation attempt.",
          "notification_channels": ["slack-security-alerts"]
        },
        "gridPos": { "x": 12, "y": 22, "w": 12, "h": 8 }
      }
    ],
    "alert_notification_channels": [
      {
        "name": "pagerduty-security",
        "type": "pagerduty",
        "description": "Pages the security on-call engineer. Use for S1/S2 incidents only.",
        "settings": { "integration_key": "${PAGERDUTY_SECURITY_KEY}" }
      },
      {
        "name": "pagerduty-engineering",
        "type": "pagerduty",
        "description": "Pages the engineering on-call engineer. Use for 5xx spikes.",
        "settings": { "integration_key": "${PAGERDUTY_ENGINEERING_KEY}" }
      },
      {
        "name": "slack-security-alerts",
        "type": "slack",
        "description": "Posts to #security-alerts channel. Monitored during business hours.",
        "settings": {
          "webhook_url": "${SLACK_SECURITY_WEBHOOK}",
          "channel": "#security-alerts"
        }
      }
    ]
  }
}
```

Alert threshold reference table:

```text
+---------------------------------+-------------------+----------+------------------+
| Alert                           | Threshold         | Severity | Response         |
+---------------------------------+-------------------+----------+------------------+
| Auth failure rate               | > 50/min for 5m   | Critical | Page on-call     |
| Brute force (single account)    | > 10 in 5m        | Critical | Page on-call     |
| 5xx error rate                  | > 5% for 5m       | Critical | Page engineering  |
| Sustained rate limiting         | > 100 in 5m       | Warning  | Slack alert      |
| Authorization failures (user)   | > 5 in 15m        | Warning  | Slack alert      |
| Registration spike              | > 10x avg for 1h  | Warning  | Slack alert      |
| Privilege escalation attempt    | Any single event  | Warning  | Slack alert      |
+---------------------------------+-------------------+----------+------------------+
```

---

## Common Mistakes

### 1. No Security Testing Until the Night Before Launch

**Wrong:** The team builds the application for months with no security testing. A week before launch, someone runs a vulnerability scan, finds 200 issues, and the team either delays launch or — worse — launches anyway with known vulnerabilities. Security testing is treated as a final gate rather than a continuous process.

**Fix:** Integrate SAST and dependency scanning into CI from day one. It takes 30 minutes to add Semgrep and `npm audit` to a GitHub Actions workflow. These tools run on every PR, catch issues when they are introduced (when the code is fresh in the developer's mind), and prevent the accumulation of security debt. By the time you reach launch, the automated tools have been catching the easy stuff for months, and your remaining effort is focused on the harder issues that require DAST and manual review.

### 2. SAST with Default Rules Only (Missing Project-Specific Patterns)

**Wrong:** The team adds Semgrep or CodeQL with the default rulesets and considers SAST "done." The default rules catch generic vulnerability patterns (eval, SQL concatenation, hardcoded secrets), but they know nothing about your application's specific abstractions, middleware, or conventions. Your team has a `requireAuth` middleware that must be on every route, a `sanitizeInput` function that must be called before rendering user content, and a `prismaClient` that is the only approved way to query the database. The default rules cannot enforce any of this.

**Fix:** Write custom SAST rules that enforce YOUR project's conventions. Semgrep makes this straightforward — the rule syntax is YAML-based and reads like pattern matching. Create rules for: "every Express route must include requireAuth middleware" (or be explicitly marked as public), "all database queries must use the Prisma client" (not raw pg), "user input must be sanitized with DOMPurify before dangerouslySetInnerHTML," and "all API responses must use the standardized error format" (not raw error.message). Store custom rules in the repository and review them alongside the code they protect.

### 3. Ignoring SAST/Audit Findings Because "It's a False Positive" (Without Investigation)

**Wrong:** A SAST tool reports a SQL injection finding. A developer glances at it, decides "that's a false positive," and suppresses it without investigation. An `npm audit` reports a high-severity CVE in a dependency. Someone adds it to the ignore list because "we don't use that function." Neither decision is documented, and neither is verified. Six months later, a new developer changes the code and actually introduces the vulnerability the SAST tool was warning about, but the warning is suppressed. The npm vulnerability turns out to be exploitable through a code path nobody checked.

**Fix:** Treat every finding as guilty until proven innocent. Investigate each one. If it is a true positive, fix it. If it is genuinely a false positive, suppress it with a comment that explains WHY (e.g., `// nosemgrep: raw-sql-injection — this query uses pg parameterized syntax, not concatenation`). For dependency vulnerabilities, verify that the vulnerable code path is not reachable from your application, document your analysis, and record the decision with a date and author. Review suppressed findings periodically — code changes may make a previously-safe suppression incorrect.

### 4. Security Logs Missing Critical Fields (Timestamps, User IDs, IP Addresses)

**Wrong:** The application logs authentication failures with `logger.warn("Login failed")`. No timestamp (beyond whatever the log aggregator adds), no user ID, no IP address, no request ID, no indication of which endpoint was targeted. When a credential stuffing attack occurs, the security team can see that logins are failing but cannot determine which accounts are targeted, where the attack originates, or how many unique attackers are involved. The logs are useless for investigation.

**Fix:** Every security log entry must include: ISO 8601 timestamp with timezone, service name, request ID (for cross-service correlation), user ID (if known), IP address, action (machine-readable like AUTH_FAILURE), resource (the endpoint or feature), result (success/failure), and reason (why it failed). Use structured JSON logging so these fields are machine-parseable. The logging middleware should populate these fields automatically so that individual developers do not need to remember to include them. A security log entry should tell you who did what, when, from where, and whether it succeeded — in a single line.

### 5. Logging PII or Secrets in Security Logs

**Wrong:** The security logging middleware logs the full request body for debugging purposes. This means passwords are logged when users log in, credit card numbers are logged when users make payments, and API tokens are logged when users make authenticated requests. The logs are stored in a log aggregation service with broad team access and a 90-day retention policy. The logs themselves become a data breach waiting to happen — an attacker who gains access to the log aggregation service gets passwords, payment data, and API tokens for every user who interacted with the application.

**Fix:** Implement a PII sanitizer that runs before every log entry is written. The sanitizer should: redact any field named password, token, secret, apiKey, authorization, ssn, creditCard (and common variations); apply regex patterns to detect credit card numbers, SSNs, and bearer tokens in string values regardless of field name; and replace matched values with `[REDACTED]`. Test the sanitizer — write unit tests that verify sensitive data never appears in log output. Audit existing logs for PII and purge any that contain it. Configure your log aggregation service with appropriate access controls — not everyone on the team needs access to security logs.

### 6. No Incident Response Plan

**Wrong:** A security researcher emails the team about a critical vulnerability. Nobody knows who should respond. The developer who receives the email panics and deploys a hasty fix that breaks production. Nobody notifies customers. Nobody preserves evidence for investigation. The post-mortem consists of a Slack thread that says "we should have a process for this." Three months later, another incident occurs and the same chaos repeats.

**Fix:** Write an incident response playbook BEFORE you need it. The playbook does not need to be perfect — it needs to exist and cover the basics: who is the Incident Commander (and their backup), what are the severity tiers and response times, what are the immediate containment actions for common incident types (data breach, credential compromise, DDoS), who handles communication (internal and external), and where is the post-mortem template. Store the playbook in the repository where the team can find it. Review it quarterly. Run a tabletop exercise at least once a year — walk through a hypothetical scenario and see where the plan breaks down.

### 7. Penetration Testing Only Once and Never Again

**Wrong:** The team commissions a penetration test before launch. The pentesters find 15 issues, the team fixes them, the pentesters retest and verify the fixes, and the report goes into a filing cabinet. Two years later, the application has changed dramatically — new features, new integrations, new infrastructure — but the pentest from two years ago is still cited as evidence of security. The attack surface has grown 10x since that pentest, and none of the new surface has been tested.

**Fix:** Pentest annually at minimum. Pentest after major changes: new authentication system, new payment integration, new API surface, major infrastructure migration. Each pentest should scope to include both the new attack surface and a representative sample of the existing surface. Consider a bug bounty program for continuous coverage between formal pentests — researchers test your application year-round. Budget for pentesting as a recurring expense, not a one-time project cost.

### 8. Bug Bounty with No Triage Process (Reports Pile Up Unread)

**Wrong:** The company launches a bug bounty program on HackerOne with enthusiasm. Reports come in. Nobody is assigned to triage them. After two weeks, there are 30 unread reports. The first response time is measured in weeks, not days. Researchers stop submitting because they get no response. The few who do submit get frustrated and post their findings on Twitter. The bug bounty program has negative ROI — it damaged the company's reputation and produced zero actionable security improvements.

**Fix:** Do not launch a bug bounty program until you have a triage rotation in place. Assign specific team members to triage duty on a rotating schedule. Set a first-response-time SLA of 1-3 business days. Acknowledge every report promptly, even if the full assessment will take longer. Classify severity quickly and communicate your timeline for a fix. Pay bounties promptly when findings are confirmed — delayed payment discourages future submissions. Monitor your program's metrics on the platform: average first response time, average time to resolution, researcher satisfaction scores. If you cannot maintain the triage process, make the program private (invite-only with a small group) rather than letting reports pile up.

### 9. Security Monitoring Alerts Going to an Unmonitored Channel

**Wrong:** The team sets up security monitoring with Datadog. Alerts are configured to post to a `#security-alerts` Slack channel. Nobody is assigned to monitor the channel. It fills up with alerts — mostly low-severity and informational — and the team mutes it. When a real credential stuffing attack triggers a critical alert, it sits in the muted channel for six hours until someone happens to notice it during a routine check. By then, hundreds of accounts have been compromised.

**Fix:** Route critical alerts (S1, S2) to PagerDuty or an equivalent paging system that actually wakes people up. Route warning-level alerts to a Slack channel that has an assigned owner and a response SLA. Tune alert thresholds aggressively — if an alert fires more than twice a week and is never actionable, either fix the underlying issue or raise the threshold. Group related alerts into incidents — 50 auth failures from the same IP block should be one alert, not 50. Review alert volume weekly and eliminate noise. The goal is that every alert requires a human decision, and every critical alert gets a human response within minutes.

### 10. Treating Compliance Certification as Proof of Security

**Wrong:** The company achieves SOC 2 Type II certification. Leadership tells customers "we are SOC 2 certified" and considers security handled. The compliance audit checked that the company has an access control policy, has incident response procedures, and performs vulnerability scanning — but the access control policy has exceptions for half the engineering team, the incident response procedures have never been tested, and the vulnerability scanning runs monthly but nobody reviews the results. The company is compliant on paper but insecure in practice. When a breach occurs, leadership is surprised because "we were SOC 2 certified."

**Fix:** Treat compliance as a floor, not a ceiling. Compliance frameworks establish minimum baselines that are necessary but not sufficient. Use them as a starting point: they force you to think about access control, incident response, vulnerability management, and monitoring — all good things. But then go beyond the minimums. Actually test your incident response procedures with tabletop exercises. Actually review and act on vulnerability scan results. Actually enforce access control policies without exceptions. Use compliance evidence collection as an opportunity to measure your security posture, not just to produce documents for auditors. When leadership asks "are we secure?" the answer is never "we are SOC 2 certified." The answer is a specific assessment of current risk, recent test results, and known gaps.

---

> **See also:** [Secrets-Environment](../Secrets-Environment/secrets-environment.md) | [Backend-Security](../Backend-Security/backend-security.md) | [Dependencies-Supply-Chain](../Dependencies-Supply-Chain/dependencies-supply-chain.md) | [API-Security](../API-Security/api-security.md) | [Security-Headers-Infrastructure](../Security-Headers-Infrastructure/security-headers-infrastructure.md)
>
> **Last reviewed:** 2026-02
