# Backend Security
> SQL injection, command injection, SSRF, file upload security, rate limiting, input validation, error handling, and path traversal prevention. Every endpoint is an attack surface — harden them all.

---

## Principles

### 1. The Principle of Least Privilege

Every component in your system should operate with the absolute minimum set of permissions it needs to do its job — and nothing more. This is the foundational security principle that underpins everything else in this document. When you violate it, you are not just creating a vulnerability; you are creating a blast radius. A compromised component with minimal permissions is a contained incident. A compromised component with root access is a catastrophe.

**Database users.** Your application should never connect to the database as a superuser, `postgres`, `root`, or any account with administrative privileges. Create a dedicated application user that has SELECT, INSERT, UPDATE, and DELETE permissions on the specific tables it needs. It should not have CREATE, DROP, ALTER, GRANT, or any DDL permissions. If you have a migration runner, that is a separate user with separate credentials — it runs once during deployment and its credentials are not baked into your application runtime. If you need read-only access for analytics or reporting, that is a third user with only SELECT permission.

**File system.** The application process should not have write access to its own source code directory, its configuration files, or any directory outside of a designated writable area (e.g., `/tmp` or a specific uploads directory). If an attacker achieves remote code execution but the process cannot write to the filesystem, the attack surface shrinks dramatically. Container runtimes make this easier — run your process as a non-root user inside the container.

**API keys and service credentials.** Every API key should be scoped to the specific services and actions needed. An S3 key that only needs to upload to a single bucket should not have `s3:*` permissions on `*` resources. A Stripe key that only needs to create charges should not be a full-access secret key. Most cloud providers and SaaS platforms support fine-grained permission scoping — use it.

**Network.** Services should only be accessible to the components that need them. Your database should not be exposed to the public internet. Your internal microservices should not be reachable from outside the VPC. Use security groups, network policies, and firewall rules to enforce this. The default posture is deny — if a connection is not explicitly allowed, it is blocked.

This principle applies at every layer: database, file system, network, API keys, environment variables, container permissions, and application code. Every time you grant a permission, ask yourself: "What is the worst thing that could happen if this component is compromised?" Then reduce the permissions until the answer is "not much."

| Layer | Least Privilege Applied | Common Violation |
|-------|------------------------|------------------|
| Database | App user with SELECT/INSERT/UPDATE/DELETE on specific tables | Connecting as `postgres` or `root` |
| File system | Non-root process, read-only source directory | Running as root, writable `/app` directory |
| API keys | Scoped to specific service, action, and resource | Wildcard permissions (`s3:*` on `*`) |
| Network | Internal services not publicly accessible | Database port open to `0.0.0.0/0` |
| Container | Non-root user, read-only filesystem, dropped capabilities | Running as root with all capabilities |
| Application | Role-based access control with default deny | Admin endpoints with no authorization check |

### 2. SQL Injection Prevention

SQL injection is the oldest, most well-documented, and still one of the most exploited vulnerabilities in web applications. It works because of a fundamental confusion between code and data: when user input is concatenated directly into a SQL query string, the database cannot distinguish between the query structure and the user's data. The user's data becomes part of the query itself.

Here is how the attack works. Suppose your query is built as a string: `SELECT * FROM users WHERE email = '` plus the user's email input plus `'`. If the user submits a normal email, the query works as intended. But if the user submits `' OR 1=1 --`, the query becomes `SELECT * FROM users WHERE email = '' OR 1=1 --'`. The `OR 1=1` makes the WHERE clause always true, returning every row. The `--` comments out the rest of the query. The attacker now has every user record in your database. Worse variations can use `UNION SELECT` to extract data from other tables, `DROP TABLE` to destroy data, or time-based blind injection to exfiltrate data character by character.

**Parameterized queries** (also called prepared statements) are the definitive solution. With parameterized queries, the SQL structure is sent to the database engine separately from the data values. The database compiles the query structure first, then binds the data values into the designated slots. The data can never be interpreted as SQL code, no matter what it contains. This is not sanitization or escaping — it is a fundamentally different mechanism that eliminates the vulnerability class entirely.

**ORMs** (Prisma, Drizzle, Sequelize, TypeORM) use parameterized queries internally for their standard query builder methods. When you use `prisma.user.findMany({ where: { email: input } })`, Prisma generates a parameterized query. You are safe. However, every ORM has escape hatches for raw SQL: Prisma has `$queryRaw` and `$executeRaw`, Drizzle has the `sql` operator, Sequelize has `sequelize.query()`, and TypeORM has `query()`. These raw query methods can be used safely or unsafely depending on how you pass values.

The safe pattern for raw queries varies by ORM. In Prisma, use `$queryRaw` with tagged template literals — the template literal syntax automatically parameterizes interpolated values. In Drizzle, use the `sql` tagged template from `drizzle-orm`. In raw `pg` or `mysql2`, use numbered placeholders (`$1`, `$2` for PostgreSQL, `?` for MySQL) and pass values as a separate array. Never build the query string with string concatenation, template literals without the ORM's sql tag, or string formatting functions.

**Stored procedures are not inherently safe.** If a stored procedure internally concatenates a parameter into a dynamic SQL string (using `EXECUTE` or `EXEC`), it is just as vulnerable as application-level string concatenation. Stored procedures are only safe if they use parameterized queries internally.

**Dynamic column/table names** cannot be parameterized (parameters are for values, not identifiers). If you need dynamic column or table names, use an allowlist: define the set of valid names in your code and reject anything not in the list.

### 3. Command Injection Prevention

Command injection occurs when user input is passed to a system shell for execution. In Node.js, the primary vector is `child_process.exec()`, which spawns a shell (`/bin/sh` on Linux/macOS, `cmd.exe` on Windows) and passes the command string to it. The shell interprets metacharacters — semicolons (`;`) to chain commands, pipes (`|`) to redirect output, double ampersands (`&&`) to run conditional commands, backticks to execute subcommands, and dollar-parentheses for command substitution. If user input reaches `exec()`, the attacker can append arbitrary commands.

Consider a server that converts images using ImageMagick: if the filename input reaches `exec('convert ' + filename + ' output.png')`, an attacker could submit a filename of `; rm -rf / ;` and the shell would execute that command with the server's permissions.

**The primary defense is to never use `exec()`.** Use `execFile()` instead. The critical difference: `execFile()` does not spawn a shell. It calls the target binary directly and passes arguments as an array. There are no metacharacters because there is no shell to interpret them. The arguments are passed to the process as literal strings.

**The better defense is to not shell out at all.** Most tasks that developers reach for shell commands to accomplish have native Node.js alternatives. Use the `fs` module instead of `exec('rm ...')` or `exec('cp ...')`. Use `sharp` instead of `exec('convert ...')`. Use `archiver` instead of `exec('zip ...')`. Use `node-fetch` or the built-in `fetch` instead of `exec('curl ...')`. Every shell command you eliminate is an attack surface you remove.

If you absolutely must use external commands with user-influenced arguments, apply an allowlist. Do not try to sanitize or escape the input — allowlist the acceptable values. For example, if the user selects an image format, validate that their selection is one of `["png", "jpg", "webp"]` before passing it to any command.

The same principle applies to code execution functions: `eval()`, `new Function()`, `setTimeout(string)`, `setInterval(string)`, and `vm.runInNewContext()` all execute arbitrary code. None of these should ever receive user input. If you need to evaluate user-provided expressions, use a sandboxed expression parser (like `mathjs` for math expressions) — never a general-purpose code evaluator.

### 4. Server-Side Request Forgery (SSRF)

SSRF is an attack where an adversary tricks your server into making HTTP requests to unintended destinations. The attacker does not make the request directly — your server makes it on their behalf, using your server's network position and credentials. This is particularly dangerous because your server typically has access to internal networks, cloud metadata services, and private APIs that are not accessible from the public internet.

The most common vector is any feature that accepts a URL from the user and fetches it: URL preview generators, webhook callbacks, avatar-from-URL features, RSS feed importers, PDF generators that accept URLs, and API integrations where the user specifies an endpoint.

The most dangerous SSRF target in cloud environments is the instance metadata service. On AWS EC2, `http://169.254.169.254/latest/meta-data/` returns instance information including IAM role credentials. If your application has an IAM role attached (which it should, for accessing AWS services), an SSRF vulnerability can extract temporary credentials that grant the attacker the same permissions as your application. Google Cloud and Azure have equivalent metadata endpoints.

**Prevention strategies, in order of preference:**

- **Allowlist domains/IPs.** If the feature only needs to fetch from known domains (e.g., a list of supported webhook providers), maintain a strict allowlist and reject everything else. This is the strongest defense.
- **Block internal IP ranges.** If you must allow arbitrary URLs, block requests to internal networks: `127.0.0.0/8` (loopback), `10.0.0.0/8` (private class A), `172.16.0.0/12` (private class B), `192.168.0.0/16` (private class C), `169.254.0.0/16` (link-local, includes cloud metadata), and `0.0.0.0`.
- **Parse and validate URLs carefully.** Use the `URL` constructor to parse the user-provided URL. Check the resolved hostname against your blocklist. Be aware of DNS rebinding attacks — a domain could resolve to a public IP during validation but to an internal IP when the actual request is made. Use the resolved IP, not the hostname, for your blocklist check.
- **Follow redirects carefully.** An allowed domain could redirect to an internal IP. Validate every redirect target, not just the initial URL.
- **Use IMDSv2 on AWS.** IMDSv2 requires a PUT request to obtain a session token before metadata can be accessed. This prevents many SSRF attacks because most SSRF vectors only allow GET requests.

SSRF is not just a theoretical concern. It has been used in high-profile breaches to extract cloud credentials and pivot to other services. If your application fetches URLs based on user input, SSRF prevention is mandatory.

### 5. File Upload Security

File uploads are one of the most dangerous features to implement because they allow users to place arbitrary content on your server. Every aspect of the upload — the file content, the MIME type header, the file extension, and the filename — is attacker-controlled. If any of these are trusted without verification, the result can range from stored XSS to remote code execution.

**MIME type validation.** The `Content-Type` header sent by the client is set by the client — it proves nothing. The file extension (`.jpg`, `.pdf`) is part of the filename, which is also set by the client — it proves nothing. The only reliable way to determine a file's actual type is to read its magic bytes (the first few bytes of the file content that identify the format). Use the `file-type` package in Node.js to detect the actual MIME type from the file's binary content. If the magic bytes say it is a PNG but the extension says `.exe`, reject it.

**File size limits.** Set per-endpoint size limits. An avatar upload should not accept a 500MB file. Use `multer`'s `limits` option to enforce this at the middleware level before the file reaches your handler. Limits should match the use case: 5MB for avatars, 25MB for documents, 100MB for video — whatever your application requires.

**Filenames.** Never use the original filename provided by the user. It can contain path traversal sequences (`../../etc/passwd`), special characters that break file systems, or be impossibly long. Generate a new filename using a UUID or content hash. Store the original filename in your database if you need to display it, but the file on disk or in object storage should have a safe, generated name.

**Storage location.** Never store uploaded files in your web root (e.g., the `public` directory of an Express or Next.js app). If a user uploads a `.html` file and it is served from your domain, it executes in your origin with access to your cookies. Store uploads outside the web root and serve them through a controlled endpoint, or better yet, store them in a separate object storage service (S3, R2, GCS) on a different domain.

**Image processing.** Images can contain EXIF metadata (GPS coordinates, device information) and can even contain embedded scripts in certain formats. Re-encode uploaded images using `sharp` to strip all metadata and ensure the output is a clean image file. This also normalizes the format and prevents image-based exploits.

**The presigned URL pattern.** For production applications, the recommended approach is to never have uploads flow through your server at all. The flow: (1) the client requests a presigned upload URL from your server, (2) your server generates a presigned S3/R2/GCS URL with constraints (file size, content type, expiration), (3) the client uploads directly to object storage using the presigned URL, (4) your server is notified (via webhook or client callback) and records the upload in the database. This eliminates the server as a bottleneck and removes the risk of server-side file handling vulnerabilities.

**Virus scanning.** For user-uploaded files that will be shared with other users (documents, attachments), scan them with ClamAV or a cloud-based virus scanning service. This adds latency, so scan asynchronously — accept the upload, quarantine it, scan in the background, and only make it available after it passes.

### 6. Rate Limiting and Throttling

Rate limiting is not optional. Every public endpoint on your server must have a rate limit. Without rate limiting, an attacker can: brute-force passwords, enumerate user accounts, exhaust your API quotas with third-party services, rack up compute costs, and execute denial-of-service attacks. Rate limiting is your first line of defense against automated abuse.

**Endpoints that require strict rate limiting:**

- Login and authentication (prevents brute-force attacks)
- Registration (prevents account creation spam)
- Password reset (prevents email bombing and token brute-forcing)
- Email/SMS sending endpoints (prevents abuse of your messaging quota)
- File uploads (prevents storage exhaustion)
- Search and expensive queries (prevents resource exhaustion)
- Any endpoint that triggers a paid third-party API call

**Algorithms.** The three primary rate limiting algorithms are:

| Algorithm | Behavior | Best For |
|-----------|----------|----------|
| Token bucket | Allows bursts up to the bucket capacity, then limits to the refill rate | APIs where occasional bursts are acceptable |
| Sliding window | Counts requests in a rolling time window (e.g., the last 60 seconds) | Smooth, consistent rate enforcement |
| Fixed window | Counts requests per fixed interval (e.g., per minute, per hour) | Simple implementation, can have burst-at-boundary issues |

**Distributed rate limiting.** If your application runs on multiple server instances (which it should, for reliability), in-memory rate limiting is useless — each instance tracks its own counter independently. Use a shared backing store, typically Redis, so all instances share the same rate limit counters. The `rate-limit-redis` package provides a Redis store for `express-rate-limit`.

**Rate limit headers.** Return these headers with every response so clients can self-regulate:

- `X-RateLimit-Limit` — the maximum number of requests allowed in the window
- `X-RateLimit-Remaining` — how many requests the client has left
- `X-RateLimit-Reset` — when the window resets (Unix timestamp or seconds remaining)

**Tiered limits.** Different user classes get different limits: anonymous users get the most restrictive limits (e.g., 100 requests per hour), authenticated users get moderate limits (e.g., 1000 per hour), and premium/enterprise users get generous limits (e.g., 10000 per hour). This is both a security measure and a business model.

**Response format.** When a client exceeds the rate limit, return HTTP `429 Too Many Requests` with a `Retry-After` header indicating how many seconds the client should wait. Include a JSON body with a clear error message.

### 7. Server-Side Input Validation

Client-side validation is a user experience feature. It provides immediate feedback in the browser so users do not have to wait for a server round-trip to learn that their email is malformed. It is not a security feature. Anyone can bypass client-side validation with browser DevTools, curl, Postman, or a custom script. Your server must validate every piece of input independently, as if the client performed no validation at all.

**Validate at the API boundary.** Input validation should be the first thing your route handler does — before any business logic, database queries, or file system operations. Use a middleware pattern that validates the request against a schema and either passes the validated data to the handler or returns a 400 error.

**Schema validation libraries.** Zod is the recommended choice for TypeScript projects. It provides type inference (your validated data is automatically typed), composable schemas, and excellent error messages. Joi is the mature alternative with extensive validation rules. Yup is focused on form validation but works server-side too. Pick one and use it consistently across your entire API.

**What to validate:**

- **Types** — Is the value actually a string, number, boolean, or array? JSON parsing handles some of this, but be explicit.
- **Lengths** — Minimum and maximum string lengths. An email should not be 10,000 characters. A username should be between 3 and 30 characters. Array lengths should have maximums to prevent memory exhaustion.
- **Formats** — Email addresses, URLs, UUIDs, phone numbers, dates. Use proven regex patterns or built-in validators, not custom regex.
- **Ranges** — Minimum and maximum values for numbers and dates. A quantity should not be negative. A birth date should not be in the future.
- **Enums** — If a field should be one of a known set of values (e.g., status: "active" | "inactive"), validate against the set. Do not accept arbitrary strings.
- **Nested objects** — Validate the structure of nested objects and arrays, not just top-level fields.
- **Pagination parameters** — Page numbers and limits should have maximums. Accepting `limit=999999999` is a denial-of-service vector.

**Type coercion attacks.** In JavaScript, `"0"` is truthy but `0` is falsy. `"true"` is a string, not a boolean. `"1"` + 1 is `"11"`, not 2. Strict schema validation prevents these subtle bugs from becoming security issues. Define exact types in your schema and reject values that do not match.

**ReDoS (Regular Expression Denial of Service).** Complex regular expressions with nested quantifiers (e.g., `(a+)+$`) can take exponential time on certain inputs. If you apply such a regex to user input, an attacker can send a crafted string that hangs your server. Defenses: use the `re2` library (which uses a linear-time regex engine), avoid nested quantifiers, or validate input length before applying complex patterns.

### 8. Error Handling and Information Leakage

The error messages your API returns are a treasure trove for attackers — if you let them be. A stack trace reveals your file structure, your framework and its version, your database type, internal function names, and often even the specific query that failed. This information helps attackers identify known vulnerabilities, understand your architecture, and craft targeted exploits.

**The rule is simple: in production, never return internal error details to the client.** Return a generic, user-friendly message and an error code. Log the full error internally with all the detail you need for debugging.

**Development vs. production error responses.** In development, you want full error details — stack traces, query strings, internal state — to debug quickly. In production, you want a sanitized response. Use `process.env.NODE_ENV` to control this behavior. Your error handler should have a clear branch: if production, return the generic response; if development, return everything.

**Structured error responses.** Use a consistent error response format across your entire API. A recommended structure:

- `error.code` — A machine-readable error code specific to your application (e.g., `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `UNAUTHORIZED`). These are your application-level codes, not HTTP status codes.
- `error.message` — A human-readable description safe for display to end users.
- `error.details` — An optional array of specific field-level errors (for validation errors). Only include in development or for validation errors where the detail is safe to return.

**HTTP status codes** are for the transport layer. Use them correctly (400 for bad input, 401 for unauthenticated, 403 for unauthorized, 404 for not found, 429 for rate limited, 500 for internal errors), but do not rely on them as your only error communication. Clients need your application-specific error codes to handle errors programmatically.

**Centralized error handling in Express.** Express has a specific pattern for error handling: a middleware function with four arguments `(err, req, res, next)`. This should be registered after all routes. All errors — whether thrown in route handlers, rejected promises, or passed to `next(err)` — should flow through this single handler. This ensures consistent error formatting and logging.

**Request ID correlation.** Generate a unique request ID for every incoming request (use the `uuid` package or accept the `X-Request-ID` header from a load balancer). Include this ID in your error logs and in the error response to the client. When a user reports "I got an error," you can ask for the error ID and find the exact log entry.

**Specific information leaks to watch for:**

- Database error messages that reveal table names, column names, or query structure
- File paths in stack traces that reveal your directory structure
- Framework version headers (`X-Powered-By: Express`) — disable these
- Detailed 404 messages that confirm or deny the existence of resources (user enumeration)
- Timing differences in error responses (e.g., "invalid username" vs. "invalid password" reveals which one was wrong)

### 9. Path Traversal Prevention

Path traversal (also called directory traversal) is an attack where the user manipulates file path parameters to access files outside the intended directory. The classic attack uses `../` sequences to navigate up the directory tree. If your server has an endpoint that serves files based on a user-provided name, and it naively concatenates that name with a base directory, an attacker can request `../../../etc/passwd` to read the system password file, or `../../.env` to read your environment variables.

**How the attack works in Node.js.** If your code does `fs.readFile('/uploads/' + req.query.filename)` and the user sends `filename=../../../../etc/passwd`, Node.js resolves this to `/etc/passwd`. The `path.join()` function does NOT prevent this — `path.join('/uploads', '../../etc/passwd')` returns `/etc/passwd`. This is not a bug in `path.join()`; it is designed to resolve relative paths.

**The defense pattern.** Use `path.resolve()` to get the absolute path, then verify it starts with your intended base directory. The steps: (1) resolve the base directory to an absolute path, (2) resolve the user-provided path relative to the base directory, (3) check that the resolved path starts with the resolved base directory. If it does not, the user is attempting path traversal — reject the request.

The key insight is that `path.resolve()` eliminates all `..` sequences and returns the true absolute path. You can then do a simple string prefix check to verify containment.

**Additional defenses:**

- **Never use user input directly in file system operations.** This includes `fs.readFile()`, `fs.writeFile()`, `fs.unlink()`, `fs.readdir()`, and any method that takes a path.
- **UUID-based file lookup.** Instead of using user-provided filenames at all, store a mapping in your database: the user references files by UUID, and your server looks up the actual file path from the database. The user never provides or sees a file path.
- **Chroot or container isolation.** Running your application in a container with a minimal filesystem means that even a successful path traversal finds nothing useful to read.
- **Reject suspicious characters.** As an additional layer (not the only defense), reject filenames containing `..`, `/`, `\`, null bytes (`%00`), and other path-sensitive characters.

### 10. Mass Assignment and Object Injection

Mass assignment is a vulnerability where an attacker sends extra fields in a request body, and the server blindly copies all of them onto a data model. If your code does `Object.assign(user, req.body)` or `{ ...user, ...req.body }`, an attacker who sends `{ "name": "John", "role": "admin" }` just made themselves an admin. This works because JavaScript objects are open by default — you can add any property to any object.

The same vulnerability appears in different forms. Using spread syntax to merge request data with a database record. Passing `req.body` directly to an ORM's `create()` or `update()` method without filtering. Using `Object.assign()` to update a model. Any pattern where all fields from the request are accepted without an explicit allowlist is vulnerable.

**Prevention strategies:**

- **Explicit field picking.** Destructure only the fields you expect: `const { name, email } = req.body`. This is the simplest defense. Only the fields you explicitly name are extracted; everything else is ignored.
- **Zod schemas.** When you validate with Zod, only the fields defined in the schema pass through. Zod's `.parse()` method strips unknown fields by default. This means your validation layer also prevents mass assignment — if you use it consistently.
- **DTO (Data Transfer Object) pattern.** Define a class or type for each endpoint's expected input. Map from the request body to the DTO, then from the DTO to your data model. The DTO acts as a firewall between untrusted input and your internal models.
- **ORM-level protection.** Prisma's `create()` and `update()` methods accept typed objects — TypeScript will catch extra fields at compile time. Drizzle's insert and update builders are similarly typed. However, TypeScript types are erased at runtime, so do not rely on this as your only defense.
- **Field selection on output.** The inverse of mass assignment: do not return fields the client should not see. Use Prisma's `select` or Drizzle's column selection to return only the intended fields. Never return `password`, `passwordHash`, `internalNotes`, or other sensitive fields.

Common fields that attackers target in mass assignment: `role`, `isAdmin`, `isVerified`, `emailVerified`, `balance`, `credits`, `permissions`, `subscriptionTier`, `createdAt`, `updatedAt`.

### 11. Logging Security Events

Your logs are your forensic record. When a security incident occurs — and it will — your logs determine whether you can understand what happened, when it happened, and who was affected. Poor logging means you are flying blind. Excessive logging means you are creating a liability. The goal is to log the right things, in the right format, while keeping sensitive data out.

**What to log:**

- Authentication events: successful logins (with username and IP), failed logins (with attempted username and IP — but NOT the attempted password), account lockouts, password changes, MFA enrollment and usage.
- Authorization failures: when a user attempts to access a resource or perform an action they are not permitted to. This is potential probing — someone testing what they can access.
- Input validation failures: repeated validation errors from the same IP or user can indicate automated scanning or fuzzing.
- Rate limit triggers: who is hitting rate limits, and on which endpoints. This can indicate brute-force attempts or scraping.
- Admin actions: every action performed by an administrator (user modifications, configuration changes, data exports) should be logged with the admin's identity and a description of the change.
- Data access patterns: bulk data downloads, unusual query patterns, access to sensitive records. These can indicate data exfiltration.

**What NOT to log:**

- Passwords (including failed password attempts — an off-by-one typo is one character from the real password)
- Authentication tokens, session tokens, JWTs
- API keys and secrets
- Credit card numbers, SSNs, or other PII beyond what is necessary for identification
- Full request bodies (they may contain sensitive fields — log only the fields you have verified are safe)

**Structured logging.** Use JSON-formatted logs. Human-readable text logs are fine for local development, but production logs should be machine-parseable JSON. Use Pino (high-performance, JSON-native) or Winston with a JSON transport. Each log entry should include:

- Timestamp in ISO 8601 format
- Log level (info, warn, error)
- Request ID (for correlating all log entries from a single request)
- User ID (if authenticated)
- IP address
- Action performed
- Resource affected
- Result (success/failure)

**Log injection prevention.** If user-provided values end up in your logs (usernames, email addresses, error messages), an attacker can inject newlines and fake log entries. In text-based log formats, the string `\nINFO: Admin user logged in successfully` injected into a username would create a fake log line. JSON logging mitigates this because newlines within a JSON string value are escaped, but you should still sanitize control characters from user input that appears in logs.

---

## LLM Instructions

### Writing Database Queries

When generating any database query, ALWAYS use parameterized queries or the ORM's built-in query methods. Never concatenate or interpolate user input directly into a SQL string using string concatenation, manual template literals, or string formatting functions.

1. When using Prisma, use the standard client methods (findMany, findUnique, create, update, delete) for all standard operations. These are parameterized by default. When raw SQL is required, use `prisma.$queryRaw` with tagged template literals — the tagged template syntax automatically parameterizes interpolated values. Never use `prisma.$queryRawUnsafe` unless the query string is entirely hardcoded with no user input.

2. When using Drizzle, use the query builder for standard operations. When raw SQL is needed, use the `sql` tagged template from `drizzle-orm`. Interpolated values in the `sql` tag are automatically parameterized. Never build SQL strings with plain template literals or concatenation.

3. When using raw database clients (`pg`, `mysql2`, `better-sqlite3`), always use the parameterized query interface: `$1`, `$2` placeholders for PostgreSQL, `?` placeholders for MySQL, and `?` placeholders for SQLite, with values passed as a separate array argument.

4. When a query requires dynamic column names, table names, or ORDER BY directions (which cannot be parameterized because they are identifiers, not values), use a hardcoded allowlist. Define the valid options as an array or object in your code, validate the user input against this list, and reject anything not in the list. Then use the validated, allowlisted value in the query.

5. Never generate queries that use LIKE with unescaped user input. The `%` and `_` characters are wildcards in SQL LIKE clauses. If the user input should be treated as a literal string, escape these characters before using them in a LIKE pattern, or use the ORM's built-in contains/startsWith/endsWith operators which handle this automatically.

### Handling File Uploads

When implementing file upload functionality, follow a defense-in-depth approach that validates at every layer.

1. Always validate the file's actual MIME type by reading its magic bytes using the `file-type` package. Do not trust the `Content-Type` header or the file extension — both are user-controlled. After reading the magic bytes, compare the detected type against an allowlist of acceptable types for the specific endpoint.

2. Enforce file size limits at the middleware level using multer's `limits` configuration. Set per-endpoint limits that match the use case — a profile avatar does not need the same limit as a document upload. Reject oversized files before they are fully buffered into memory.

3. Generate a safe filename using UUID v4 or a content hash (SHA-256 of the file content). Never use the original filename from the user for storage. Store the original filename in the database if it needs to be displayed, but the actual stored file should have the generated name.

4. For production applications, prefer the presigned URL pattern: the client requests a presigned upload URL from your server, your server generates a signed S3, R2, or GCS URL with constraints (allowed content type, maximum size, expiration time), and the client uploads directly to object storage. Your server never handles the file bytes.

5. For uploaded images, always re-encode using sharp to strip EXIF metadata (which may contain GPS coordinates and device information) and to neutralize any image-based exploits. Output the image in a standard format (WebP, PNG, or JPEG) at the appropriate quality level.

### Implementing Rate Limiting

Add rate limiting to every public-facing route in your application. This is not optional — it is a baseline security requirement.

1. Use express-rate-limit with a Redis backing store for production deployments. In-memory rate limiting only works for single-instance deployments and is lost on restart. Redis ensures rate limits are shared across all server instances and persist across deployments.

2. Apply different rate limits to different categories of endpoints. Authentication endpoints (login, register, password reset, MFA verification) should have strict limits: five to ten requests per minute per IP. Standard API endpoints should have moderate limits: one hundred to one thousand requests per hour. Read-only, cacheable endpoints can have more generous limits.

3. Always return rate limit headers in every response: X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset. These headers allow well-behaved clients to self-regulate and avoid hitting the limit.

4. When a client exceeds the rate limit, return HTTP 429 Too Many Requests with a Retry-After header specifying how many seconds the client should wait before retrying. Include a JSON error body with a clear message and your application's rate limit error code.

5. Consider rate limiting by multiple dimensions: per IP address for unauthenticated requests, per user ID for authenticated requests, and per API key for machine-to-machine APIs. IP-based limiting alone is insufficient — many users share IPs behind NAT or corporate proxies.

### Validating Request Input

Create and enforce schema validation for every API endpoint. Validation is not optional, and it is not something you add later — it is the first line of code in every route handler.

1. Define a Zod schema for every endpoint that specifies the exact shape of the request body, query parameters, and URL parameters. Use strict types — if a field should be a number, define it as `z.number()`, not `z.string()` that you parse later. Use `.min()`, `.max()`, `.email()`, `.url()`, `.uuid()`, and other built-in validators.

2. Create a reusable validation middleware that takes a Zod schema and returns an Express middleware function. This middleware should parse the request against the schema, attach the validated and typed data to the request object, and return a structured 400 error if validation fails.

3. For pagination endpoints, always set maximum values for page size and limit parameters. A request for page one million with a limit of one million is a denial-of-service attack. Set sensible defaults (page 1, limit 20) and maximums (limit 100).

4. Validate file uploads separately from JSON body validation. Check the MIME type against an allowlist, enforce the size limit, and validate any associated metadata fields (alt text, description) with a Zod schema.

5. For endpoints that accept search queries or filter parameters, validate the allowed filter fields against an allowlist. Do not allow arbitrary field names in filter objects — this can lead to NoSQL injection or unexpected query behavior.

### Returning Errors Safely

Build a centralized error handling system that separates what you log from what you return to clients.

1. Create custom error classes that extend a base AppError class. Each error class should have an HTTP status code, an application-specific error code, and a user-safe message. Common classes: ValidationError (400), AuthenticationError (401), AuthorizationError (403), NotFoundError (404), RateLimitError (429), and InternalError (500).

2. In your centralized error handler middleware, check the NODE_ENV environment variable. In production, return only the error code and user-safe message. In development, return the full error including stack trace, original error message, and request context.

3. Log every error internally with the full error details: stack trace, request ID, user ID, request path, request body (with sensitive fields redacted), and timestamp. Use structured JSON logging so these entries are searchable and parseable.

4. Ensure that unhandled promise rejections and uncaught exceptions are caught by your error handler. In Express, use an async wrapper or express-async-errors to ensure async route handler errors reach the error middleware. Unhandled rejections should log the error and shut down gracefully (not crash silently).

5. Use consistent error response structure across every endpoint. Clients should be able to parse every error response with the same code. Never return plain text errors, HTML error pages, or framework-default error formats in production.

---

## Examples

### 1. Parameterized Queries vs. SQL Injection (Prisma, Raw SQL, Drizzle)

**VULNERABLE: String concatenation in raw SQL**

```sql
-- What the attacker submits as email: ' OR 1=1 --
-- The resulting query:
SELECT * FROM users WHERE email = '' OR 1=1 --'
-- Returns ALL users. The attacker wins.
```

**VULNERABLE: Prisma with unsafe raw query**

```typescript
// NEVER DO THIS — user input is interpolated into the query string
const email = req.body.email; // attacker-controlled
const users = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

**SECURE: Prisma with parameterized raw query**

```typescript
// SAFE — tagged template literal automatically parameterizes values
const email = req.body.email;
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;

// Even better — use the Prisma client API (always parameterized)
const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, email: true, name: true }, // explicit field selection
});
```

**VULNERABLE: Raw pg client with string concatenation**

```typescript
// NEVER DO THIS
const email = req.body.email;
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

**SECURE: Raw pg client with parameterized query**

```typescript
// SAFE — $1 placeholder with separate values array
const email = req.body.email;
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// Login query — parameterized
const { email, password } = req.body;
const result = await pool.query(
  'SELECT id, email, password_hash FROM users WHERE email = $1 AND active = $2',
  [email, true]
);
```

**VULNERABLE: Drizzle with unsafe raw SQL**

```typescript
// NEVER DO THIS
import { sql } from 'drizzle-orm';
const email = req.body.email;
const users = await db.execute(
  sql.raw(`SELECT * FROM users WHERE email = '${email}'`)
);
```

**SECURE: Drizzle with parameterized query**

```typescript
import { sql, eq } from 'drizzle-orm';
import { users } from './schema';

// SAFE — sql tagged template parameterizes values
const email = req.body.email;
const result = await db.execute(
  sql`SELECT * FROM users WHERE email = ${email}`
);

// Even better — use the Drizzle query builder (always parameterized)
const user = await db
  .select({
    id: users.id,
    email: users.email,
    name: users.name,
  })
  .from(users)
  .where(eq(users.email, email));
```

**Dynamic column names with allowlist**

```typescript
// Column names cannot be parameterized — use an allowlist
const ALLOWED_SORT_COLUMNS = ['name', 'email', 'created_at'] as const;
type SortColumn = (typeof ALLOWED_SORT_COLUMNS)[number];

function getSortColumn(input: string): SortColumn {
  if (!ALLOWED_SORT_COLUMNS.includes(input as SortColumn)) {
    throw new AppError('INVALID_SORT_COLUMN', `Invalid sort column: ${input}`, 400);
  }
  return input as SortColumn;
}

// Usage in route handler
const sortColumn = getSortColumn(req.query.sort as string);
const users = await db
  .select()
  .from(usersTable)
  .orderBy(usersTable[sortColumn]);
```

### 2. File Upload Endpoint with Full Validation (Express + Multer + S3 Presigned URLs)

**Pattern A: Server-side upload with full validation**

```typescript
import express from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = '/var/app/uploads'; // outside web root
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Multer configuration — memory storage for processing before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const router = express.Router();

router.post(
  '/api/users/:userId/avatar',
  authenticate, // your auth middleware
  upload.single('avatar'),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'An image file is required.',
          },
        });
      }

      // Step 1: Validate MIME type using magic bytes (NOT the header)
      const detectedType = await fileTypeFromBuffer(file.buffer);
      if (!detectedType || !ALLOWED_IMAGE_TYPES.has(detectedType.mime)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File type not allowed. Accepted: ${[...ALLOWED_IMAGE_TYPES].join(', ')}`,
          },
        });
      }

      // Step 2: Re-encode the image with sharp to strip EXIF and neutralize exploits
      const processedBuffer = await sharp(file.buffer)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer();

      // Step 3: Generate a safe filename (UUID, not user-provided)
      const filename = `${randomUUID()}.webp`;
      const filePath = path.join(UPLOAD_DIR, filename);

      // Step 4: Write to disk outside the web root
      await fs.writeFile(filePath, processedBuffer);

      // Step 5: Store reference in database
      const avatar = await prisma.userAvatar.upsert({
        where: { userId: req.params.userId },
        create: {
          userId: req.params.userId,
          filename,
          originalName: file.originalname,
          mimeType: 'image/webp',
          size: processedBuffer.length,
        },
        update: {
          filename,
          originalName: file.originalname,
          mimeType: 'image/webp',
          size: processedBuffer.length,
        },
      });

      res.status(200).json({
        data: {
          avatarUrl: `/api/users/${req.params.userId}/avatar/${filename}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Serve avatar through a controlled endpoint (not static files)
router.get('/api/users/:userId/avatar/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Validate filename format (UUID + extension only)
    const UUID_FILENAME_REGEX = /^[0-9a-f-]{36}\.webp$/;
    if (!UUID_FILENAME_REGEX.test(filename)) {
      return res.status(400).json({
        error: { code: 'INVALID_FILENAME', message: 'Invalid filename format.' },
      });
    }

    // Path traversal prevention
    const filePath = path.resolve(UPLOAD_DIR, filename);
    if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied.' },
      });
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});
```

**Pattern B: Presigned URL upload (recommended for production)**

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.UPLOAD_BUCKET!;

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const presignRequestSchema = z.object({
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  fileSizeBytes: z.number().int().min(1).max(5 * 1024 * 1024), // max 5MB
});

router.post('/api/uploads/presign', authenticate, async (req, res, next) => {
  try {
    const { contentType, fileSizeBytes } = presignRequestSchema.parse(req.body);

    const fileKey = `uploads/${req.user.id}/${randomUUID()}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
      Metadata: {
        'uploaded-by': req.user.id,
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    // Record the pending upload in the database
    const upload = await prisma.upload.create({
      data: {
        userId: req.user.id,
        fileKey,
        contentType,
        status: 'pending',
      },
    });

    res.status(200).json({
      data: {
        uploadUrl: presignedUrl,
        uploadId: upload.id,
        fileKey,
        expiresIn: 300,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Client confirms upload is complete
router.post('/api/uploads/:uploadId/confirm', authenticate, async (req, res, next) => {
  try {
    const upload = await prisma.upload.findFirst({
      where: {
        id: req.params.uploadId,
        userId: req.user.id,
        status: 'pending',
      },
    });

    if (!upload) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Upload not found.' },
      });
    }

    // Verify the file exists in S3
    // Optionally: trigger virus scan, image processing, etc.

    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: 'confirmed' },
    });

    res.status(200).json({
      data: { uploadId: upload.id, status: 'confirmed' },
    });
  } catch (error) {
    next(error);
  }
});
```

### 3. Rate Limiting Middleware (Express + express-rate-limit + Redis)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import express from 'express';

// Shared Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false,
});

// ---- Rate Limit Factory ----

interface RateLimitConfig {
  windowMs: number;
  max: number;
  prefix: string;
  message?: string;
}

function createRateLimiter(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true, // Return X-RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* legacy headers

    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: `rl:${config.prefix}:`,
    }),

    // Key generator — use IP for anonymous, user ID for authenticated
    keyGenerator: (req) => {
      const userId = (req as any).user?.id;
      return userId || req.ip || 'unknown';
    },

    // Custom response when rate limited
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message:
            config.message ||
            'Too many requests. Please try again later.',
          retryAfter: Math.ceil(config.windowMs / 1000),
        },
      });
    },

    // Skip rate limiting for trusted internal services
    skip: (req) => {
      const internalKey = req.headers['x-internal-service-key'];
      return internalKey === process.env.INTERNAL_SERVICE_KEY;
    },
  });
}

// ---- Tiered Rate Limiters ----

// Strict: authentication endpoints (login, register, password reset)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  prefix: 'auth',
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

// Moderate: standard API endpoints
const apiLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  prefix: 'api',
});

// Strict: password reset (prevents email bombing)
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  prefix: 'pw-reset',
  message: 'Too many password reset requests. Please try again in 1 hour.',
});

// Generous: read-only public endpoints
const publicReadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5000, // 5000 requests per hour
  prefix: 'public-read',
});

// ---- Apply to Routes ----

const app = express();

// Authentication routes — strict limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);

// Standard API routes — moderate limits
app.use('/api/v1', apiLimiter);

// Public read routes — generous limits
app.use('/api/public', publicReadLimiter);

// ---- Per-User Rate Limiting for Authenticated Routes ----

function createUserRateLimiter(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: `rl:user:${config.prefix}:`,
    }),
    keyGenerator: (req) => {
      // Authenticated routes always key by user ID
      return (req as any).user?.id || req.ip || 'unknown';
    },
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: config.message || 'Too many requests.',
          retryAfter: Math.ceil(config.windowMs / 1000),
        },
      });
    },
  });
}

// Example: file upload rate limit — 20 uploads per hour per user
const uploadLimiter = createUserRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  prefix: 'upload',
  message: 'Upload limit reached. Please try again later.',
});

app.use('/api/uploads', authenticate, uploadLimiter);
```

### 4. Input Validation with Zod (Express Middleware)

```typescript
import { z, ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// ---- Validation Middleware Factory ----

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ location: string; field: string; message: string }> = [];

    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        errors.push(
          ...err.issues.map((issue) => ({
            location: 'body',
            field: issue.path.join('.'),
            message: issue.message,
          }))
        );
      }
    }

    try {
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as any;
      }
    } catch (err) {
      if (err instanceof ZodError) {
        errors.push(
          ...err.issues.map((issue) => ({
            location: 'query',
            field: issue.path.join('.'),
            message: issue.message,
          }))
        );
      }
    }

    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
    } catch (err) {
      if (err instanceof ZodError) {
        errors.push(
          ...err.issues.map((issue) => ({
            location: 'params',
            field: issue.path.join('.'),
            message: issue.message,
          }))
        );
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: errors,
        },
      });
    }

    next();
  };
}

// ---- Schema Definitions ----

// User registration schema
const registerBodySchema = z.object({
  email: z
    .string()
    .email('Invalid email address.')
    .max(255, 'Email must be 255 characters or fewer.')
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string()
    .min(12, 'Password must be at least 12 characters.')
    .max(128, 'Password must be 128 characters or fewer.')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one digit.'
    ),

  name: z
    .string()
    .min(1, 'Name is required.')
    .max(100, 'Name must be 100 characters or fewer.')
    .trim(),

  // Optional fields with strict validation
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +14155551234).')
    .optional(),

  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service.' }),
  }),
});

// Pagination query schema (reusable)
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['name', 'email', 'created_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// URL params schema
const userParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format.'),
});

// Search/filter schema
const userSearchSchema = paginationSchema.extend({
  search: z
    .string()
    .max(200, 'Search query too long.')
    .transform((val) => val.trim())
    .optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

// ---- Route Definitions ----

const router = express.Router();

// Registration endpoint
router.post(
  '/api/auth/register',
  validate({ body: registerBodySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.body is now fully validated and typed
      const { email, password, name, phone } = req.body;

      // Check for existing user
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists.',
          },
        });
      }

      // Create user (password hashing handled by service layer)
      const user = await userService.createUser({ email, password, name, phone });

      res.status(201).json({
        data: { userId: user.id, email: user.email },
      });
    } catch (error) {
      next(error);
    }
  }
);

// List users with pagination and filters
router.get(
  '/api/users',
  authenticate,
  authorize('admin'),
  validate({ query: userSearchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, sort, order, search, role, status } = req.query as z.infer<
        typeof userSearchSchema
      >;

      const offset = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (role) where.role = role;
      if (status) where.status = status;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
          orderBy: { [sort]: order },
          skip: offset,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      res.status(200).json({
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single user by ID
router.get(
  '/api/users/:userId',
  authenticate,
  validate({ params: userParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      if (!user) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'User not found.' },
        });
      }

      res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);
```

### 5. Centralized Error Handler (Express)

```typescript
import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
});

// ---- Custom Error Classes ----

class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required.') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found.`, 404);
  }
}

class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
    this.retryAfter = retryAfter;
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

// ---- Request ID Middleware ----

import { randomUUID } from 'crypto';

function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId =
    (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// ---- Async Handler Wrapper ----

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ---- Centralized Error Handler ----

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = (req as any).requestId || 'unknown';
  const isProduction = process.env.NODE_ENV === 'production';

  // Determine error details
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred.';
  let details: unknown = undefined;
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  } else if (err.name === 'ZodError') {
    // Handle Zod validation errors that bypass middleware
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = (err as any).issues?.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    isOperational = true;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token.';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired.';
    isOperational = true;
  }

  // ---- Log the full error internally ----
  const logPayload = {
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
    code,
    userId: (req as any).user?.id || null,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      isOperational,
    },
  };

  if (statusCode >= 500) {
    logger.error(logPayload, 'Unhandled server error');
  } else if (statusCode >= 400) {
    logger.warn(logPayload, 'Client error');
  }

  // ---- Build client response ----
  const response: Record<string, any> = {
    error: {
      code,
      message: isProduction && !isOperational ? 'An unexpected error occurred.' : message,
      requestId,
    },
  };

  // Include details for validation errors (safe to return) and in development
  if (details && (code === 'VALIDATION_ERROR' || !isProduction)) {
    response.error.details = details;
  }

  // In development, include stack trace and raw error info
  if (!isProduction) {
    response.error.stack = err.stack;
    response.error.raw = {
      name: err.name,
      message: err.message,
    };
  }

  // Set Retry-After header for rate limit errors
  if (err instanceof RateLimitError) {
    res.setHeader('Retry-After', err.retryAfter);
  }

  res.status(statusCode).json(response);
}

// ---- Not Found Handler (for undefined routes) ----

function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      requestId: (req as any).requestId || 'unknown',
    },
  });
}

// ---- Application Setup ----

import express, { RequestHandler } from 'express';

const app = express();

// Disable X-Powered-By header (information leakage)
app.disable('x-powered-by');

// Request ID — first middleware
app.use(requestIdMiddleware);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Your routes go here
// app.use('/api', apiRouter);

// 404 handler — after all routes
app.use(notFoundHandler);

// Error handler — last middleware
app.use(errorHandler);

// ---- Usage in Route Handlers ----

const router = express.Router();

router.get(
  '/api/orders/:orderId',
  authenticate,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.userId !== (req as any).user.id) {
      throw new AuthorizationError();
    }

    res.json({ data: order });
  })
);

router.post(
  '/api/orders',
  authenticate,
  asyncHandler(async (req, res) => {
    const { items, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      throw new ValidationError('Order must contain at least one item.', [
        { field: 'items', message: 'At least one item is required.' },
      ]);
    }

    const existingOrder = await prisma.order.findFirst({
      where: {
        userId: (req as any).user.id,
        idempotencyKey: req.headers['idempotency-key'] as string,
      },
    });

    if (existingOrder) {
      throw new ConflictError('An order with this idempotency key already exists.');
    }

    const order = await orderService.createOrder({
      userId: (req as any).user.id,
      items,
      shippingAddress,
      idempotencyKey: req.headers['idempotency-key'] as string,
    });

    res.status(201).json({ data: order });
  })
);

export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
  asyncHandler,
};
```

---

## Common Mistakes

### 1. String Concatenation in SQL Queries

**Wrong:** Building SQL queries by concatenating user input into the query string. This includes using template literals without the ORM's sql tag, string addition, or any method that embeds user values directly into the SQL text. Example: `` `SELECT * FROM users WHERE email = '${email}'` `` — this is SQL injection waiting to happen.

**Fix:** Always use parameterized queries. With Prisma, use `$queryRaw` with tagged template literals. With raw `pg`, use `$1` placeholders and a separate values array. With Drizzle, use the `sql` tagged template. With any ORM, prefer the built-in query builder methods over raw SQL. Parameterized queries separate the SQL structure from the data at the protocol level — the data can never be interpreted as SQL code.

### 2. Trusting File Extensions for Upload Validation

**Wrong:** Checking the file extension (`.jpg`, `.pdf`) or the `Content-Type` header to determine whether an uploaded file is safe. Both of these values are set by the client and can be anything the attacker wants. A file named `malware.jpg` with a `Content-Type: image/jpeg` header can contain executable code, a PHP web shell, or an HTML file that executes JavaScript in your domain's context.

**Fix:** Validate the file's actual content by reading its magic bytes using the `file-type` package. The first few bytes of a file (the "magic bytes" or "file signature") identify the actual format regardless of the filename or headers. Compare the detected MIME type against an allowlist of acceptable types. Additionally, re-encode images with `sharp` to strip metadata and neutralize embedded payloads. Generate UUID filenames and store files outside the web root.

### 3. No Rate Limiting on Authentication Endpoints

**Wrong:** Deploying login, registration, and password reset endpoints without rate limiting. An attacker can send thousands of login attempts per second to brute-force passwords, enumerate valid usernames (by observing different error messages for valid vs. invalid accounts), or bomb a user's email with password reset messages.

**Fix:** Apply strict rate limits to all authentication endpoints: 5-10 attempts per 15 minutes per IP for login, 3 password reset requests per hour per email, and 5 registrations per hour per IP. Use Redis-backed rate limiting for distributed systems. Return `429 Too Many Requests` with a `Retry-After` header. Combine with account lockout after repeated failures and CAPTCHA challenges for suspicious activity.

### 4. Stack Traces Returned to Clients in Production

**Wrong:** Returning the full error object, including stack traces, to the client in production responses. Default Express error handling does this. Stack traces reveal file paths, line numbers, framework versions, database types, internal function names, and dependency versions — all valuable intelligence for an attacker.

**Fix:** Implement a centralized error handler that checks `NODE_ENV`. In production, return only a generic error message and an application-specific error code. In development, return full details. Log the complete error internally (with request ID, user ID, and stack trace) for debugging. Disable the `X-Powered-By` header with `app.disable('x-powered-by')`. Never include raw database errors in client responses.

### 5. Using eval() or Function() with User Input

**Wrong:** Passing user input to `eval()`, `new Function()`, `setTimeout(string)`, `setInterval(string)`, or `vm.runInNewContext()`. These functions execute arbitrary JavaScript code. If user input reaches them, the attacker has full remote code execution — they can read environment variables (including database credentials and API keys), access the filesystem, make network requests, and compromise the entire server.

**Fix:** Never use `eval()` or `new Function()` with any data that originates from a user, directly or indirectly. For math expressions, use a sandboxed expression parser like `mathjs`. For template rendering, use a proper template engine (Handlebars, EJS) with auto-escaping. For JSON parsing, use `JSON.parse()`. For dynamic property access, use a lookup object with an allowlist of valid keys. There is no safe way to eval user input — eliminate the vector entirely.

### 6. Accepting All Fields from Request Bodies (Mass Assignment)

**Wrong:** Spreading or assigning the entire `req.body` onto a database model: `await prisma.user.update({ where: { id }, data: req.body })` or `Object.assign(user, req.body)`. An attacker can add `"role": "admin"`, `"isVerified": true`, `"balance": 99999`, or any other field to the request body, and your code will faithfully apply it.

**Fix:** Explicitly pick the allowed fields for each endpoint. Destructure only what you need: `const { name, email } = req.body`. Use Zod schemas that define exactly which fields are accepted — Zod strips unknown fields by default. Create specific DTOs for create and update operations. At the ORM level, use Prisma's `select` and Drizzle's column selection to control which fields are returned. Never pass `req.body` directly to a database operation.

### 7. Logging Sensitive Data (Passwords, Tokens, Full Request Bodies)

**Wrong:** Logging full request bodies (`logger.info({ body: req.body })`), which may contain passwords, credit card numbers, or API keys. Logging authentication tokens (`logger.info({ token: req.headers.authorization })`). Logging failed password attempts (`logger.warn({ password: req.body.password })`). Your logs become a second database of credentials, often with weaker access controls than the primary database.

**Fix:** Define an explicit allowlist of fields that are safe to log for each context. Redact sensitive fields before logging: create a utility function that strips known sensitive keys (password, token, authorization, creditCard, ssn, secret) from objects before they reach the logger. Log identifiers (user ID, email) but never credentials. For request logging, log the HTTP method, path, status code, and duration — not the body. Configure your logging library to use a redaction list.

### 8. Path Traversal via Unvalidated File Parameters

**Wrong:** Using user-provided filenames directly in file system operations: `fs.readFile('/uploads/' + req.params.filename)` or `path.join(baseDir, req.query.file)`. An attacker sends `../../.env` or `../../../etc/passwd` and reads files outside the intended directory. `path.join()` does not prevent this — it resolves `..` sequences as intended.

**Fix:** Use `path.resolve()` to get the absolute path, then verify it starts with your base directory: `const safePath = path.resolve(baseDir, userInput); if (!safePath.startsWith(path.resolve(baseDir))) throw new Error('Invalid path');`. Better yet, avoid user-provided paths entirely — use UUID-based file lookups where the user provides a file ID and your server looks up the actual path in the database. Reject filenames containing `..`, `/`, `\`, and null bytes as an additional defense layer.

### 9. Relying Only on Client-Side Validation

**Wrong:** Implementing validation only in the frontend (React form validation, HTML5 required attributes, JavaScript input checks) and assuming the server will only receive valid data. Any validation that runs in the browser can be bypassed by sending requests directly to the API using curl, Postman, a custom script, or browser DevTools. Client-side validation is a UX feature, not a security boundary.

**Fix:** Validate every input on the server side, at the API boundary, before any business logic executes. Use Zod, Joi, or Yup to define schemas for every endpoint's request body, query parameters, and URL parameters. Create a validation middleware that runs the schema and returns structured errors. Client-side and server-side validation should use the same rules (share Zod schemas between frontend and backend in a monorepo), but the server-side validation is the authoritative gate. Never skip it.

### 10. Running Database Connections as Root/Admin User

**Wrong:** Configuring your application's database connection string with the `postgres`, `root`, or `sa` superuser account. If an SQL injection vulnerability is discovered (or any other vulnerability that allows query execution), the attacker has full database privileges — they can read all tables in all databases, create new admin accounts, drop tables, dump credentials, and in some databases, execute system commands.

**Fix:** Create a dedicated application database user with the minimum required permissions: SELECT, INSERT, UPDATE, and DELETE on the specific tables your application uses. No DDL permissions (CREATE, DROP, ALTER). No GRANT permissions. No access to system tables or other databases. Use a separate, more privileged user for database migrations — run it only during deployment, with separate credentials stored in a deployment-only secret, not in the application's runtime environment. Regularly audit database user permissions and revoke anything unnecessary.

---

> **See also:** [Authentication-Identity](../Authentication-Identity/authentication-identity.md) | [API-Security](../API-Security/api-security.md) | [Secrets-Environment](../Secrets-Environment/secrets-environment.md) | [Data-Protection](../Data-Protection/data-protection.md) | [Security-Testing-Monitoring](../Security-Testing-Monitoring/security-testing-monitoring.md)
>
> **Last reviewed:** 2026-02
