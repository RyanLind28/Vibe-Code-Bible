# Authentication & Identity
> Password hashing, JWTs, sessions, OAuth 2.0, OIDC, RBAC, MFA, and CSRF protection. Authentication is the front door to your application — get it right or nothing else matters.

---

## Principles

### 1. Authentication vs. Authorization

Authentication (AuthN) and Authorization (AuthZ) are two fundamentally different concerns, and confusing them is one of the most common architectural mistakes in web development. AuthN answers the question "who are you?" AuthZ answers the question "what can you do?" Both are required in every production system. A system that authenticates but does not authorize allows any logged-in user to access any resource — a customer could view admin dashboards, modify other users' data, or delete production records. A system that authorizes without authenticating trusts the client to self-identify, which means anyone can claim to be an admin by forging a request header.

These two concerns must be implemented as separate layers. Authentication happens first: the user proves their identity through credentials, tokens, or federated identity. Authorization happens second: the system checks whether the authenticated identity has permission to perform the requested action on the requested resource. Mixing these layers leads to fragile, unpredictable security. A 401 Unauthorized response means the user is not authenticated — they have not proven who they are. A 403 Forbidden response means the user is authenticated but not authorized — they proved who they are, but they do not have permission.

Most modern frameworks handle both concerns through distinct mechanisms. In Next.js, Auth.js (formerly NextAuth.js) handles AuthN — login, signup, session management, OAuth. Middleware and server-side checks handle AuthZ — verifying roles, checking permissions, enforcing resource ownership. In Express, Passport.js handles AuthN while custom middleware handles AuthZ.

| Concern | AuthN (Authentication) | AuthZ (Authorization) |
|---|---|---|
| Question answered | "Who are you?" | "What can you do?" |
| Failure response | 401 Unauthorized | 403 Forbidden |
| Typical actions | Login, signup, password reset, MFA, OAuth | Role checks, permission guards, resource ownership, policy evaluation |
| Where it runs | Before any business logic | After authentication, before resource access |
| State stored | Session tokens, JWTs, cookies | Roles, permissions, policies |
| Common tools | Auth.js, Passport.js, Clerk, Lucia | Custom middleware, CASL, Casbin |

Never skip either layer. Even internal APIs behind a VPN need both AuthN and AuthZ. "But only our services call this endpoint" is not a security strategy — it is a prayer.

### 2. Password Hashing: bcrypt, scrypt, and Argon2

Storing passwords in plain text is the single most egregious security failure an application can commit. There is no excuse, no edge case, no MVP justification that makes it acceptable. Storing passwords hashed with MD5 or SHA-256 is only marginally better — these algorithms were designed for speed, not security. MD5 can be cracked at billions of hashes per second on modern GPUs. SHA-256 fares only slightly better. Rainbow tables — precomputed hash-to-password mappings — make unsalted hashes trivially reversible.

The purpose of a password hashing algorithm is to be deliberately slow. Slow enough that verifying a single password takes a fraction of a second (imperceptible to a legitimate user) but cracking millions of passwords becomes computationally infeasible.

**bcrypt** is the established standard and remains a solid choice. It has a configurable work factor (cost factor) that controls how many iterations the algorithm performs. At cost factor 12, bcrypt performs approximately 3 hashes per second on a modern CPU — compare that to MD5's billions per second. bcrypt has a built-in salt (randomly generated per hash), so you never need to manage salts separately. The minimum acceptable cost factor is 12. Increase it as hardware improves. The only real limitation of bcrypt is that it truncates passwords at 72 bytes — longer passwords are silently ignored beyond that point.

**scrypt** is memory-hard, meaning it requires a significant amount of RAM to compute each hash. This makes it resistant to GPU and ASIC attacks because these devices have limited memory per core. scrypt is a good choice when GPU resistance is a primary concern, but it is less widely adopted and has fewer battle-tested library implementations.

**Argon2id** is the modern recommendation. It won the Password Hashing Competition in 2015 and is recommended by OWASP as of 2024. Argon2id combines Argon2i (resistant to side-channel attacks) and Argon2d (resistant to GPU attacks). It offers three configurable parameters: memory cost (how much RAM each hash requires), time cost (number of iterations), and parallelism (number of threads). OWASP recommends a minimum of 19 MiB memory cost, time cost of 2, and parallelism of 1 — though higher values are better if your server can handle the load.

Regardless of which algorithm you choose, always use timing-safe comparison when verifying passwords. Standard string comparison (`===`) leaks information about how many characters matched through response time differences. An attacker can exploit this to guess passwords character by character. Use `crypto.timingSafeEqual` in Node.js or let the hashing library handle comparison (both `bcrypt.compare` and `argon2.verify` are timing-safe by default).

The absolute rule: NEVER implement your own hashing algorithm. Use `argon2` or `bcrypt` from npm. These libraries have been audited, battle-tested, and hardened over years of production use. Your custom implementation has not.

### 3. JSON Web Tokens (JWTs)

A JSON Web Token is a compact, URL-safe token format that consists of three parts separated by dots: header, payload, and signature. Each part is base64url-encoded (not encrypted — anyone can decode and read a JWT). The header declares the signing algorithm. The payload contains claims (key-value pairs like user ID, role, expiration time). The signature is a cryptographic hash of the header and payload, produced using a secret key or key pair.

JWTs are signed, not encrypted. This is a critical distinction. Signing guarantees that the token has not been tampered with — if anyone modifies the payload, the signature will not match. But signing does not hide the contents. Anyone who intercepts a JWT can decode the payload and read everything in it. Never put sensitive data in a JWT: no passwords, no credit card numbers, no Social Security numbers, no API keys. Keep the payload minimal — user ID, role, token type, and expiration. JWTs appear in every request header, so large payloads increase bandwidth and latency.

Two primary signing algorithms dominate production use. **HS256** (HMAC with SHA-256) is symmetric — the same secret signs and verifies the token. It is simpler, faster, and perfectly adequate for monolithic applications where the same server both issues and verifies tokens. **RS256** (RSA with SHA-256) is asymmetric — a private key signs the token and a public key verifies it. This is essential for distributed systems: the auth server holds the private key, and any service can verify tokens using the public key without having the ability to forge them.

The standard pattern for JWT authentication uses two tokens. The **access token** is short-lived (15 minutes is the industry standard) and carries the user's identity and permissions. It is sent with every authenticated request. When it expires, the user is not forced to log in again because of the second token. The **refresh token** is long-lived (7 to 30 days) and is used exclusively to obtain a new access token. It should be stored in an httpOnly cookie and rotated on each use — when a refresh token is exchanged for a new access token, a new refresh token is also issued, and the old one is invalidated. This limits the damage window if a refresh token is stolen.

Token storage is a frequently debated topic with a clear answer. **httpOnly cookies** are the preferred storage mechanism. An httpOnly cookie cannot be accessed by JavaScript, making it immune to XSS attacks. Even if an attacker injects malicious JavaScript into your page, they cannot steal the token. The alternative — storing JWTs in localStorage and sending them via the Authorization header — means any XSS vulnerability gives an attacker full access to the token. Use httpOnly cookies. Set `Secure` (HTTPS only), `SameSite=Lax` (CSRF baseline protection), and `Path=/` (or scope to the API path).

Stateless verification is one of JWT's primary selling points: to verify a token, the server only needs to check the signature and the expiration time. No database lookup required. However, pure stateless verification has a significant limitation — you cannot revoke a token before it expires. If a user logs out or changes their password, their existing access tokens remain valid until they expire. The pragmatic solution is **stateless + denylist**: maintain a list of revoked token IDs (the `jti` claim) in a fast store like Redis, and check the denylist during verification. Since access tokens are short-lived (15 minutes), the denylist remains small and the performance impact is negligible.

### 4. Session Management

Server-side sessions are the traditional alternative to JWTs and remain the right choice for many applications. In a session-based system, the server generates a unique session ID, stores the session data server-side (in Redis, a database, or memory), and sends only the session ID to the client as a cookie. On each request, the server looks up the session ID to retrieve the user's data. The key advantage: invalidation is instant. Delete the session from the store and the user is immediately logged out. No denylists, no waiting for expiration.

The choice between sessions and JWTs is architectural, not religious. Sessions are better when: you need instant revocation, your architecture is monolithic or uses sticky sessions, you have a shared session store, or your data access patterns benefit from server-side state. JWTs are better when: you have a distributed microservices architecture, you want stateless verification, or different services need to independently verify identity without a shared session store.

Session stores vary in their tradeoffs. **Redis** is the gold standard for session storage: it is fast (sub-millisecond reads), supports TTL (time-to-live) for automatic expiration, and handles high concurrency well. **PostgreSQL** or another relational database works but is slower — acceptable for low-traffic applications. **In-memory storage** (like Express's default `MemoryStore`) must never be used in production — it leaks memory, does not scale across multiple processes, and loses all sessions on restart.

Session ID generation is a security-critical operation. A session ID must be cryptographically random, generated using `crypto.randomBytes(32)` or equivalent. A session ID must never be sequential (1, 2, 3), timestamp-based, or derived from user data. Predictable session IDs allow session hijacking — an attacker can guess valid session IDs and impersonate users.

**Session fixation** is an attack where the attacker sets the victim's session ID before the victim logs in. The attacker gives the victim a URL containing a known session ID. When the victim logs in, the server associates their authenticated session with that known ID — and the attacker now has a valid authenticated session. The prevention is simple: regenerate the session ID after every login. Destroy the old session, create a new one, and carry over only the necessary data.

Session expiration should use two timers. **Idle timeout** (typically 30 minutes) expires the session after a period of inactivity. If the user does not make any requests for 30 minutes, they must log in again. **Absolute timeout** (typically 8-24 hours) expires the session regardless of activity — even if the user has been active continuously, they must re-authenticate after the absolute timeout. This limits the damage window of a stolen session. **Sliding expiration** resets the idle timer on each request, so active users are not interrupted.

### 5. OAuth 2.0 and OpenID Connect

OAuth 2.0 and OpenID Connect (OIDC) are the standards for federated authentication and authorization. They are frequently confused, so let us be precise. **OAuth 2.0** is an authorization framework — it allows a user to grant a third-party application access to their resources on another service (e.g., "let this app read my Google Calendar"). OAuth 2.0 does not, by itself, tell you who the user is. **OpenID Connect** is an identity layer built on top of OAuth 2.0 — it adds authentication by introducing the ID token, which contains claims about the user (email, name, profile picture). When people say "log in with Google," they mean OIDC.

The **Authorization Code flow** is the standard for server-rendered web applications. The flow: (1) the app redirects the user to the authorization server with the requested scopes, (2) the user authenticates and consents, (3) the authorization server redirects back with an authorization code, (4) the app's server exchanges the code for tokens (access token, refresh token, and optionally an ID token). The code exchange happens server-to-server, so the tokens are never exposed to the browser.

For Single Page Applications (SPAs) and mobile apps, the **Authorization Code flow with PKCE** (Proof Key for Code Exchange) is required. PKCE adds a code verifier and code challenge to prevent authorization code interception attacks. The client generates a random code verifier, hashes it to create a code challenge, sends the challenge in the authorization request, and includes the original verifier when exchanging the code. This proves that the client requesting the token exchange is the same client that initiated the flow. PKCE is now recommended for all client types, not just public clients.

The **Implicit flow** is deprecated and should never be used in new applications. It returns tokens directly in the URL fragment, exposing them in browser history, referrer headers, and proxy logs. It does not support refresh tokens, forcing the user to re-authenticate when the access token expires. Modern SPAs should use Authorization Code with PKCE instead.

The **Client Credentials flow** is for machine-to-machine communication where no user is involved. A service authenticates using its own client ID and client secret to obtain an access token. This is common for backend services communicating with each other.

OIDC adds the **ID token** to OAuth 2.0. The ID token is a JWT that contains standardized claims about the user: `sub` (unique identifier), `email`, `name`, `picture`, `email_verified`, and more. The ID token is meant to be consumed by the client application — it tells the app who the user is. The access token, by contrast, is meant to be sent to resource servers — it grants access to APIs.

Common OIDC providers include Google, GitHub, Apple, Microsoft, Auth0, Clerk, and Supabase Auth. The recommendation for most projects is clear: use a library. Auth.js (NextAuth.js) for Next.js, Lucia for framework-agnostic Node.js, or Passport.js for Express. These libraries handle the OAuth flows, token exchange, session management, and provider quirks that would take weeks to implement and years to harden if built from scratch.

### 6. Role-Based Access Control (RBAC)

RBAC is the most common authorization model and the right starting point for nearly every application. The concept is simple: define roles, assign permissions to roles, and assign roles to users. A user's effective permissions are the union of all permissions from all their assigned roles.

Common role patterns appear across nearly every application. **Admin** has full access to all resources and operations. **Editor** can read and write content but cannot manage users or system settings. **Viewer** can read content but cannot modify anything. **Owner** has full access to resources they created — this is a special case because it requires checking the resource's `created_by` field, not just the user's role. Many applications need additional roles like **Moderator** (can manage user-generated content but not user accounts) or **Billing** (can manage subscriptions and invoices but not content).

The database schema for RBAC follows a standard pattern using junction tables.

- The `users` table stores user accounts with columns for id, email, password hash, and timestamps.
- The `roles` table stores role definitions with columns for id, name (e.g., "admin", "editor"), and description.
- The `user_roles` junction table links users to roles with columns for user_id and role_id, forming a many-to-many relationship.
- The `permissions` table stores individual permissions with columns for id and name (e.g., "posts:create", "posts:delete", "users:manage").
- The `role_permissions` junction table links roles to permissions with columns for role_id and permission_id, forming another many-to-many relationship.

The permission naming convention `resource:action` (like `posts:create`, `posts:delete`, `users:manage`) is widely adopted because it is readable, greppable, and hierarchical. You can check for `posts:*` to mean "all post permissions" in your middleware.

The middleware pattern for RBAC is straightforward: a function that accepts the required role or permission and returns a middleware function that checks the authenticated user's roles and permissions. The pattern `requireRole('admin')` checks if the user has the admin role. The pattern `requirePermission('posts:delete')` checks if any of the user's roles include the `posts:delete` permission. The check should happen after authentication middleware and before the route handler.

The principle of least privilege is non-negotiable: every new user starts with the minimum role (typically viewer or a custom restricted role). Privileges are granted explicitly, never assumed. An admin must deliberately promote a user to a higher role. If you default new users to a permissive role, a compromised registration flow becomes a full-access breach.

Role hierarchy simplifies management: admin inherits all editor permissions, editor inherits all viewer permissions. This means you only need to define permissions at the most restrictive level — viewer permissions automatically propagate upward. Implement this either by flattening permissions at role assignment time or by checking the hierarchy at authorization time.

### 7. Attribute-Based Access Control (ABAC)

RBAC works until it does not. When you encounter requirements like "editors can only edit posts in their own department," "users can view records from their region only," or "contractors can access resources only during business hours," you have outgrown RBAC. These rules depend on attributes of the user, the resource, and the environment — not just the user's role.

ABAC evaluates policies based on four categories of attributes. **Subject attributes** describe the user making the request: their role, department, clearance level, geographic region, account type, or any other user property. **Resource attributes** describe the resource being accessed: its owner, department, classification level, creation date, or status. **Environment attributes** describe the context of the request: the current time, the user's IP address, the device type, or whether the request originates from a corporate network. **Action attributes** describe what the user wants to do: read, write, delete, approve, export.

An ABAC policy is a rule that evaluates these attributes. For example: "Allow the action if the user's department matches the resource's department AND the user's role is at least editor AND the current time is within business hours." These policies can be as simple or as complex as your requirements demand.

ABAC is more flexible than RBAC but more complex to implement, test, and audit. Every policy is a custom rule that must be evaluated at runtime, and the interaction between multiple policies can be difficult to reason about. Debugging "why was this user denied access?" becomes harder when the answer depends on a combination of six attributes across three categories.

The practical recommendation: start with RBAC. When you encounter a requirement that RBAC cannot express cleanly, add ABAC for that specific use case. Most applications need RBAC for 90% of their authorization logic and ABAC for the remaining 10%. Libraries like CASL (for JavaScript) and Casbin (multi-language) support both RBAC and ABAC patterns and provide a structured way to define and evaluate policies.

### 8. Multi-Factor Authentication (MFA)

Multi-factor authentication requires users to prove their identity using two or more independent factors from different categories. The three categories are: something you know (a password, a PIN), something you have (a phone, a security key, a smart card), and something you are (a fingerprint, facial recognition, iris scan). True MFA requires factors from at least two different categories — requiring a password and a security question is NOT MFA because both are "something you know."

**TOTP** (Time-based One-Time Password) is the most widely adopted MFA method. It works by sharing a secret key between the server and an authenticator app (Google Authenticator, Authy, 1Password). The app and server both compute a 6-digit code based on the shared secret and the current time (in 30-second intervals). The user enters the code from their app, and the server computes the expected code to verify. TOTP is simple, well-understood, and works offline. The shared secret must be generated securely and stored encrypted on the server.

**WebAuthn / Passkeys** represent the future of authentication. WebAuthn uses public key cryptography — the user's device generates a key pair, stores the private key securely (in a hardware security module, secure enclave, or TPM), and shares the public key with the server. Authentication happens by signing a challenge with the private key. This is phishing-resistant because the key is bound to the origin (domain) — even if a user visits a phishing site, the browser will not send the credential because the origin does not match. Passkeys extend WebAuthn with cloud synchronization, allowing credentials to sync across devices via iCloud Keychain, Google Password Manager, or similar systems.

**SMS codes** are the weakest form of MFA and should be used only as a last resort or fallback. SMS is vulnerable to SIM swapping attacks (an attacker convinces the carrier to transfer the victim's phone number), SS7 protocol exploits (intercepting SMS messages at the network level), and social engineering (tricking customer support into revealing the code). Despite these weaknesses, SMS MFA is dramatically better than no MFA at all.

**Backup codes** are essential for any MFA implementation. During MFA setup, generate 8-10 single-use recovery codes. Display them to the user once and instruct them to store the codes securely. Hash the backup codes before storing them in the database — treat them exactly like passwords. When a user enters a backup code, hash it and compare against the stored hashes. Delete the code after use (it is one-time only).

Recovery flows must always exist. Never lock a user out of their account permanently. Provide multiple recovery paths: backup codes (primary), trusted device verification, email-based recovery (if email is verified and not the compromised factor), and as a last resort, admin-assisted recovery with identity verification. The recovery flow should be designed before MFA is implemented, not bolted on afterward.

### 9. CSRF Protection

Cross-Site Request Forgery (CSRF) is an attack that tricks a logged-in user's browser into making unintended requests to your application. The attack exploits the browser's automatic inclusion of cookies with every request to a domain. If a user is logged into your banking app at `bank.com` and visits a malicious page, that page can contain a hidden form that submits a POST request to `bank.com/transfer`. The browser automatically includes the user's session cookie, and the server processes the request as if the user initiated it.

CSRF only affects cookie-based authentication. If your API uses Bearer token authentication (where the client explicitly sets the Authorization header on each request), CSRF is not a concern — the browser does not automatically attach Authorization headers to cross-origin requests.

The **synchronizer token pattern** is the classic CSRF defense. The server generates a cryptographically random token and associates it with the user's session. The token is embedded in every form as a hidden field. When the form is submitted, the server validates that the submitted token matches the session's token. An attacker cannot read the token from another origin (blocked by the same-origin policy), so they cannot forge a valid form submission.

The **double submit cookie pattern** is an alternative that does not require server-side state. The server sets a random token as a cookie AND the client includes the same token value in a request header (e.g., `X-CSRF-Token`). The server validates that the cookie value matches the header value. This works because an attacker can cause the browser to send the cookie (automatic) but cannot read the cookie to set the header (blocked by same-origin policy).

The **`SameSite` cookie attribute** provides significant CSRF protection as a browser-level defense. `SameSite=Lax` (the default in modern browsers) prevents the cookie from being sent on cross-site POST requests, form submissions, and other "unsafe" methods originating from a different site. Cookies are still sent on cross-site GET navigation (clicking a link), which is acceptable because GET requests should be safe (no side effects). `SameSite=Strict` blocks the cookie from being sent on any cross-origin request, including navigation — this means clicking a link to your site from an email or another site will not include the cookie, which can be jarring for users.

For most applications, the combination of `SameSite=Lax` on auth cookies and framework-level CSRF tokens on state-mutating operations provides robust protection. Next.js Server Actions include CSRF protection automatically. Express applications should use the `csurf` middleware or implement the double submit cookie pattern.

### 10. Secure Password Reset Flows

Password reset flows are a critical attack surface because they provide an alternative path to account access that bypasses the password entirely. A poorly implemented reset flow is equivalent to having no password at all.

The reset flow begins when the user requests a password reset. Generate a cryptographically random token using `crypto.randomBytes(32)` (producing a 256-bit token). This token is the temporary credential — it grants the ability to set a new password, so it must be treated with the same care as a password.

**Hash the reset token before storing it in the database.** This is the most commonly skipped step and the most important. If an attacker gains read access to your database (SQL injection, backup leak, insider threat), raw reset tokens give them the ability to reset any user's password. Hash the token with SHA-256 (speed is fine here — reset tokens are high-entropy, unlike passwords) and store only the hash. Send the raw token to the user via email. When the user clicks the reset link, hash the submitted token and compare it against the stored hash.

Set a short expiration: 15 to 30 minutes is ideal, 1 hour is the maximum. Password reset tokens should be the shortest-lived credentials in your system. Make the token single-use — delete it immediately after a successful password reset, and also delete it after the first failed attempt (to prevent brute force against the token).

Rate limit reset requests. Allow a maximum of 3-5 reset requests per email address per hour. Without rate limiting, an attacker can flood a user's inbox with reset emails (a denial-of-service against the user) or probe your system for valid email addresses.

NEVER confirm or deny whether an email address exists in your system. The response to a password reset request must always be: "If an account with that email exists, we have sent a reset link." If you respond differently for existing vs. non-existing emails (e.g., "No account found with that email"), you enable user enumeration — an attacker can discover which email addresses are registered by observing the response. This information is valuable for targeted phishing, credential stuffing, and social engineering.

After a successful password reset, invalidate all existing sessions for that user. A password reset may indicate a compromised account — the old sessions could belong to the attacker.

### 11. Account Lockout and Brute Force Protection

Brute force attacks are inevitable. Every public-facing login endpoint will be subjected to automated credential guessing, credential stuffing (using credentials from data breaches), and bot-driven attacks. Defense must be layered and proportional — too aggressive and you create a denial-of-service vulnerability (an attacker locks out legitimate users), too lenient and you allow password guessing.

**Progressive delays** add increasing response time after consecutive failed attempts. The 1st failed attempt gets an instant response. The 3rd gets a 1-second delay. The 5th gets a 5-second delay. The 10th gets a 30-second delay. These delays are server-side (the server sleeps before responding) and do not affect other users. Progressive delays slow down automated attacks without inconveniencing legitimate users who mistype their password once or twice.

**Account lockout** disables login after a threshold of consecutive failures (typically 10). The recommended approach is to require email verification to unlock — send a link to the account's email address. Time-based lockouts (e.g., "locked for 30 minutes") are less secure because an attacker can simply wait. Email-based unlock ensures that only the account owner can re-enable login. Be careful: account lockout can be weaponized. An attacker can intentionally lock out a target user's account. Mitigate this by requiring lockout only for the specific IP or device that triggered it, not globally for the account.

**CAPTCHA triggers** present a CAPTCHA challenge after 3 failed login attempts. This blocks automated bots while allowing legitimate users to continue. Use a modern CAPTCHA solution (hCaptcha, Cloudflare Turnstile) — traditional CAPTCHAs are increasingly solvable by AI.

**IP-based rate limiting** limits the number of login attempts from a single IP address, regardless of which account is targeted. This catches credential stuffing attacks where an attacker tries one password across thousands of accounts. Implement this separately from per-account limits. Typical thresholds: 20-50 login attempts per IP per hour.

**Credential stuffing defense** goes beyond rate limiting. During registration and password changes, check the proposed password against known breached credentials using the HaveIBeenPwned API (which supports k-anonymity — you only send the first 5 characters of the password's SHA-1 hash, so the API never sees the full password). If the password appears in known breaches, reject it and require a different password.

**Bot detection** at the infrastructure level provides broad protection: fail2ban (automatic IP banning based on log patterns), Cloudflare Bot Management (behavioral analysis and challenge pages), or WAF (Web Application Firewall) rules that identify and block attack patterns. These are defense-in-depth layers that complement application-level protections.

---

## LLM Instructions

### 1. Implementing Authentication in a New Project

When asked to add authentication to a project, always default to established, well-maintained libraries rather than custom implementations. Custom authentication code is the single most common source of critical security vulnerabilities in web applications. The number of edge cases, attack vectors, and specification details that a custom implementation must handle correctly is enormous, and getting any one of them wrong can compromise the entire system.

For Next.js applications, use Auth.js (formerly NextAuth.js) version 5 or Clerk. Auth.js is open source, supports dozens of providers, and integrates natively with the App Router. Clerk is a managed service that handles the entire authentication UI and backend. For Express applications, use Passport.js or Lucia. Passport.js is the established standard with strategies for every conceivable authentication method. Lucia is a newer, lighter alternative that provides excellent TypeScript support and a clearer API.

1. Never implement password hashing from scratch. Use the `argon2` npm package with Argon2id as the variant. If Argon2 is not available in the deployment environment, fall back to `bcrypt` with a minimum cost factor of 12. Never use MD5, SHA-1, SHA-256, or any non-password-specific hash function.
2. Store authentication tokens in httpOnly cookies, never in localStorage or sessionStorage. Set the `Secure` flag to ensure cookies are only sent over HTTPS. Set `SameSite=Lax` as a baseline CSRF defense.
3. Always implement the access token plus refresh token pattern for JWT-based authentication. Access tokens should expire in 15 minutes. Refresh tokens should expire in 7 to 30 days and be rotated on each use.
4. Never expose internal authentication errors to the client. Login failures should always return a generic message like "Invalid email or password" regardless of whether the email exists or the password is wrong.
5. When setting up a new project, include account lockout, rate limiting, and CSRF protection from the beginning. These are not features to add later — they are baseline security requirements.

### 2. Building JWT-Based Authentication

When implementing JWT authentication, follow the access token plus refresh token pattern without exception. This pattern balances security (short-lived access tokens limit the damage window of a stolen token) with usability (refresh tokens prevent the user from having to log in every 15 minutes).

1. Generate access tokens with a 15-minute expiry. The payload should contain only the user ID, their role or roles, and the token type. Do not include email addresses, names, or any other personal information unless it is needed by every single API consumer on every single request.
2. Generate refresh tokens with a 7 to 30 day expiry. Store them in httpOnly cookies with the `Secure` and `SameSite=Lax` flags. Implement refresh token rotation: when a refresh token is used to obtain a new access token, issue a new refresh token and invalidate the old one. If an old refresh token is presented after rotation, assume it has been stolen and invalidate the entire token family.
3. Create authentication middleware that extracts the token from the cookie or the Authorization header, verifies the signature using the appropriate algorithm (RS256 for distributed systems, HS256 for monoliths), checks the expiration time, and attaches the decoded user object to the request for downstream handlers.
4. Handle token refresh automatically and transparently. When the access token is expired but the refresh token is valid, issue a new token pair without requiring the user to re-authenticate. On the client side, implement an HTTP interceptor that retries failed requests after refreshing the token.
5. For logout, clear both cookies and optionally add the refresh token's `jti` (JWT ID) to a denylist in Redis with a TTL matching the token's remaining lifetime. This ensures that stolen refresh tokens cannot be used after the user logs out.

### 3. Setting Up OAuth and Social Login

When adding social login (Google, GitHub, Apple, etc.), use the Authorization Code flow with PKCE for all client types. Even for server-rendered applications that could use the plain Authorization Code flow, PKCE adds security with negligible complexity when using a library.

1. Configure the OAuth provider's developer console with the correct redirect URI. This URI must match exactly — no trailing slashes, no different ports, no HTTP vs HTTPS mismatch. A misconfigured redirect URI is the most common reason OAuth integration fails during development.
2. Use a library to handle the flow. In Auth.js v5, configure the providers in your auth configuration file. In Passport.js, use the appropriate strategy (passport-google-oauth20, passport-github2). These libraries handle the state parameter, code exchange, token validation, and user info retrieval.
3. Handle account linking: when a user has already registered with an email address and later attempts to sign in with an OAuth provider that returns the same email, link the OAuth identity to the existing account rather than creating a duplicate. Verify the email is confirmed on both sides before linking.
4. Always validate the `state` parameter in the OAuth callback. The state parameter is a CSRF protection mechanism built into OAuth — the client generates a random state, includes it in the authorization request, and verifies it is returned unchanged in the callback. Libraries handle this automatically, but if implementing manually, never skip it.
5. Store the provider's user ID (the `sub` claim from the ID token) in a separate `oauth_accounts` table linked to your users table. This allows a single user to have multiple OAuth identities and a password-based identity simultaneously.

### 4. Implementing Authorization Middleware

Authorization middleware should be separate from authentication middleware and should follow a factory pattern that accepts the required roles or permissions as parameters.

1. Create a middleware factory function named `requirePermission` that accepts a permission string like "posts:delete" and returns an Express or Next.js middleware function. The middleware should extract the user from the request object (placed there by the preceding authentication middleware), look up the user's roles and their associated permissions, and check if any role grants the required permission.
2. Return 403 Forbidden when the user is authenticated but not authorized. Return 401 Unauthorized when no authentication is present. This distinction matters for client-side logic — a 401 triggers a login redirect, while a 403 triggers an "access denied" message.
3. For resource-level authorization — determining whether a user can edit a specific post, for example — do not rely solely on route-level middleware. Check ownership in the data access layer. The middleware verifies "this user has the posts:edit permission," and the data access function verifies "this specific post belongs to this user." Both checks are required.
4. Log all authorization failures. Include the user ID, the requested resource, the required permission, and the user's actual permissions. These logs are critical for debugging access issues and detecting privilege escalation attempts.
5. Never implement authorization checks only on the frontend. Frontend checks improve the user experience (hiding buttons the user cannot use) but provide zero security. Every authorization check must be enforced server-side because the client is untrusted.

### 5. Adding CSRF Protection

CSRF protection requirements depend on how authentication tokens are transmitted. This distinction is critical and frequently misunderstood.

1. For cookie-based authentication (sessions, JWTs in cookies), CSRF protection is mandatory. Set `SameSite=Lax` on all authentication cookies as a baseline defense. This alone blocks the most common CSRF vectors — cross-site form submissions and cross-site POST requests.
2. For additional defense, implement the double submit cookie pattern or use the framework's built-in CSRF protection. Next.js Server Actions include CSRF protection automatically via origin checking. For Express, generate a random CSRF token, set it as a cookie, and require the client to include the same value in a custom header on every state-mutating request.
3. For API-only backends that use Bearer token authentication exclusively (the client sets the Authorization header on every request, no cookies involved), CSRF protection is not needed. The browser does not automatically send Authorization headers, so a cross-site request will not include the token.
4. For hybrid architectures — where some endpoints use cookie auth and others use Bearer tokens — apply CSRF protection to all cookie-authenticated endpoints. Do not assume the architecture will remain hybrid. Protect every endpoint that relies on automatic credential submission.
5. When rendering forms in React or other frontend frameworks, include the CSRF token as a hidden field or as a custom header on the form submission request. The token should be fetched from the CSRF cookie or from a dedicated API endpoint that returns the current token.

---

## Examples

### 1. Password Hashing and Verification with Argon2 (Node.js)

```typescript
// src/lib/password.ts
import argon2 from "argon2";

/**
 * Hash a plain-text password using Argon2id.
 * OWASP recommended settings: memoryCost 65536 KiB (64 MiB),
 * timeCost 3 iterations, parallelism 4 threads.
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a plain-text password against an Argon2id hash.
 * argon2.verify is timing-safe internally.
 */
export async function verifyPassword(
  hash: string,
  plain: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // If the hash is malformed or the algorithm is unrecognized, fail closed.
    return false;
  }
}
```

```typescript
// src/routes/auth.ts — Registration endpoint
import { Router, Request, Response } from "express";
import { hashPassword, verifyPassword } from "../lib/password";
import { db } from "../lib/database";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate password strength (minimum 12 characters recommended)
  if (!password || password.length < 12) {
    return res.status(400).json({ error: "Password must be at least 12 characters." });
  }

  // Check if user already exists — use a constant-time approach
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Do NOT reveal that the email is already registered.
    // Return the same response as a successful registration.
    return res.status(201).json({ message: "Account created. Check your email to verify." });
  }

  const passwordHash = await hashPassword(password);

  await db.user.create({
    data: {
      email,
      passwordHash,
      emailVerified: false,
    },
  });

  // Send verification email (omitted for brevity)

  return res.status(201).json({ message: "Account created. Check your email to verify." });
});
```

```typescript
// src/routes/auth.ts — Login endpoint
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await db.user.findUnique({ where: { email } });

  // Always verify even if the user doesn't exist.
  // This prevents timing attacks that reveal whether an email is registered.
  const dummyHash = "$argon2id$v=19$m=65536,t=3,p=4$dW5rbm93bg$dW5rbm93bg";
  const isValid = user
    ? await verifyPassword(user.passwordHash, password)
    : await verifyPassword(dummyHash, password);

  if (!user || !isValid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: "Please verify your email before logging in." });
  }

  // Create session or issue JWT (see Example 2)
  // ...

  return res.status(200).json({ message: "Login successful." });
});

export default router;
```

### 2. JWT Access + Refresh Token Flow (Express)

```typescript
// src/lib/tokens.ts
import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

interface TokenPayload {
  userId: string;
  role: string;
}

/**
 * Generate a short-lived access token (15 minutes).
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { sub: payload.userId, role: payload.role, type: "access" },
    ACCESS_SECRET,
    { expiresIn: "15m", algorithm: "HS256" } as SignOptions
  );
}

/**
 * Generate a long-lived refresh token (7 days).
 * Includes a unique jti for denylist/rotation tracking.
 */
export function generateRefreshToken(payload: TokenPayload): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { sub: payload.userId, role: payload.role, type: "refresh", jti },
    REFRESH_SECRET,
    { expiresIn: "7d", algorithm: "HS256" } as SignOptions
  );
}

/**
 * Verify and decode an access token.
 */
export function verifyAccessToken(token: string): JwtPayload & TokenPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET, {
    algorithms: ["HS256"],
  }) as JwtPayload & TokenPayload & { type: string };

  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

/**
 * Verify and decode a refresh token.
 */
export function verifyRefreshToken(
  token: string
): JwtPayload & TokenPayload & { jti: string } {
  const decoded = jwt.verify(token, REFRESH_SECRET, {
    algorithms: ["HS256"],
  }) as JwtPayload & TokenPayload & { type: string; jti: string };

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
}
```

```typescript
// src/lib/cookies.ts
import { CookieOptions, Response } from "express";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const COOKIE_BASE: CookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax",
  path: "/",
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  res.cookie("access_token", accessToken, {
    ...COOKIE_BASE,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refresh_token", refreshToken, {
    ...COOKIE_BASE,
    path: "/api/auth", // Restrict refresh token to auth endpoints only
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("access_token", { ...COOKIE_BASE });
  res.clearCookie("refresh_token", { ...COOKIE_BASE, path: "/api/auth" });
}
```

```typescript
// src/middleware/authenticate.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/tokens";

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; role: string };
}

/**
 * Authentication middleware: verifies the access token and attaches the user
 * to the request. Returns 401 if no valid token is present.
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token =
    req.cookies?.access_token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.sub as string, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}
```

```typescript
// src/routes/auth.ts — Login, Refresh, and Logout
import { Router, Request, Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../lib/tokens";
import { setAuthCookies, clearAuthCookies } from "../lib/cookies";
import { verifyPassword } from "../lib/password";
import { db } from "../lib/database";
import { redis } from "../lib/redis";

const router = Router();

// --- Login: issue access + refresh tokens ---
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await db.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    role: user.role,
  });

  // Store refresh token family in Redis for rotation tracking
  const decoded = verifyRefreshToken(refreshToken);
  await redis.set(`refresh:${decoded.jti}`, user.id, "EX", 7 * 24 * 60 * 60);

  setAuthCookies(res, accessToken, refreshToken);
  return res.status(200).json({ message: "Login successful." });
});

// --- Refresh: exchange refresh token for a new token pair ---
router.post("/refresh", async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  if (!token) {
    return res.status(401).json({ error: "Refresh token required." });
  }

  try {
    const decoded = verifyRefreshToken(token);

    // Check if this refresh token has been revoked (rotation check)
    const stored = await redis.get(`refresh:${decoded.jti}`);
    if (!stored) {
      // Token was already used or revoked — possible theft.
      // Invalidate ALL refresh tokens for this user.
      // (In production, track token families for precise invalidation.)
      clearAuthCookies(res);
      return res.status(401).json({ error: "Token reuse detected. Please log in again." });
    }

    // Revoke the old refresh token
    await redis.del(`refresh:${decoded.jti}`);

    // Issue a new token pair
    const user = await db.user.findUnique({ where: { id: decoded.sub as string } });
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    const newAccessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      role: user.role,
    });

    // Store the new refresh token
    const newDecoded = verifyRefreshToken(newRefreshToken);
    await redis.set(`refresh:${newDecoded.jti}`, user.id, "EX", 7 * 24 * 60 * 60);

    setAuthCookies(res, newAccessToken, newRefreshToken);
    return res.status(200).json({ message: "Tokens refreshed." });
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid refresh token." });
  }
});

// --- Logout: clear cookies and revoke refresh token ---
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await redis.del(`refresh:${decoded.jti}`);
    } catch {
      // Token is invalid — nothing to revoke
    }
  }

  clearAuthCookies(res);
  return res.status(200).json({ message: "Logged out." });
});

export default router;
```

### 3. OAuth 2.0 Authorization Code with PKCE (Next.js + Auth.js v5)

```typescript
// src/auth.ts — Auth.js v5 configuration
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // PKCE is enabled by default in Auth.js v5 for OAuth providers
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const isValid = await verifyPassword(
          user.passwordHash,
          credentials.password as string
        );
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: {
    strategy: "jwt", // Use JWT sessions for Credentials provider compatibility
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, attach role to the JWT
      if (user) {
        token.role = (user as any).role ?? "viewer";
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose role and userId in the client-side session
      if (session.user) {
        session.user.id = token.userId as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
});
```

```typescript
// src/app/api/auth/[...nextauth]/route.ts — API route handler
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

```typescript
// src/app/dashboard/page.tsx — Protected server component
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user.name ?? session.user.email}</p>
      <p>Role: {(session.user as any).role}</p>
    </div>
  );
}
```

```tsx
// src/components/auth-buttons.tsx — Sign-in and sign-out buttons
"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButtons() {
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="btn btn-primary"
      >
        Sign in with Google
      </button>
      <button
        onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
        className="btn btn-secondary"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="btn btn-outline"
    >
      Sign out
    </button>
  );
}
```

```typescript
// src/middleware.ts — Protect routes with Next.js middleware
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Protected routes — redirect to login if not authenticated
  const protectedPaths = ["/dashboard", "/settings", "/admin"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes — require admin role
  if (pathname.startsWith("/admin")) {
    const role = (req.auth?.user as any)?.role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/admin/:path*"],
};
```

### 4. RBAC Middleware with Permission Checks (Express / Next.js)

```sql
-- Database schema for RBAC (PostgreSQL)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'admin', 'editor', 'viewer'
  description TEXT
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE permissions (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL -- e.g., 'posts:create', 'posts:delete', 'users:manage'
);

CREATE TABLE role_permissions (
  role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Seed default roles and permissions
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access to all resources'),
  ('editor', 'Can create and edit content'),
  ('viewer', 'Read-only access');

INSERT INTO permissions (name) VALUES
  ('posts:create'), ('posts:read'), ('posts:update'), ('posts:delete'),
  ('users:read'), ('users:manage'),
  ('settings:read'), ('settings:update');

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin';

-- Editor gets post CRUD and user read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'editor'
  AND p.name IN ('posts:create', 'posts:read', 'posts:update', 'posts:delete', 'users:read');

-- Viewer gets read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.name IN ('posts:read', 'users:read', 'settings:read');
```

```typescript
// src/types/auth.ts — RBAC type definitions
export type Role = "admin" | "editor" | "viewer";

export type Permission =
  | "posts:create"
  | "posts:read"
  | "posts:update"
  | "posts:delete"
  | "users:read"
  | "users:manage"
  | "settings:read"
  | "settings:update";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
}
```

```typescript
// src/lib/permissions.ts — Load and check permissions
import { db } from "./database";
import { Permission } from "../types/auth";

/**
 * Load all permissions for a user by resolving their roles.
 * Cache this in Redis or in the JWT for performance.
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const result = await db.$queryRaw<{ name: string }[]>`
    SELECT DISTINCT p.name
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = ${userId}::uuid
  `;

  return result.map((r) => r.name as Permission);
}

/**
 * Check if a set of permissions includes the required permission.
 */
export function hasPermission(
  userPermissions: Permission[],
  required: Permission
): boolean {
  return userPermissions.includes(required);
}
```

```typescript
// src/middleware/authorize.ts — Permission-based middleware factory
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authenticate";
import { getUserPermissions, hasPermission } from "../lib/permissions";
import { Permission } from "../types/auth";

/**
 * Middleware factory: require a specific permission.
 * Must be used AFTER the authenticate middleware.
 */
export function requirePermission(required: Permission) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const permissions = await getUserPermissions(req.user.userId);

    if (!hasPermission(permissions, required)) {
      console.warn(
        `Authorization denied: user=${req.user.userId} ` +
        `required=${required} had=[${permissions.join(", ")}]`
      );
      res.status(403).json({ error: "Insufficient permissions." });
      return;
    }

    next();
  };
}

/**
 * Middleware factory: require resource ownership.
 * Checks that the authenticated user owns the resource.
 */
export function requireOwnership(
  getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | null>
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    // Admins bypass ownership checks
    const permissions = await getUserPermissions(req.user.userId);
    if (permissions.includes("users:manage" as Permission)) {
      return next();
    }

    const ownerId = await getResourceOwnerId(req);
    if (!ownerId) {
      res.status(404).json({ error: "Resource not found." });
      return;
    }

    if (ownerId !== req.user.userId) {
      console.warn(
        `Ownership denied: user=${req.user.userId} resource_owner=${ownerId}`
      );
      res.status(403).json({ error: "You do not have access to this resource." });
      return;
    }

    next();
  };
}
```

```typescript
// src/routes/posts.ts — Using RBAC middleware in Express routes
import { Router } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/authenticate";
import { requirePermission, requireOwnership } from "../middleware/authorize";
import { db } from "../lib/database";

const router = Router();

// Any authenticated user with posts:read can list posts
router.get(
  "/",
  authenticate,
  requirePermission("posts:read"),
  async (req: AuthenticatedRequest, res) => {
    const posts = await db.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(posts);
  }
);

// Only users with posts:create can create posts
router.post(
  "/",
  authenticate,
  requirePermission("posts:create"),
  async (req: AuthenticatedRequest, res) => {
    const post = await db.post.create({
      data: {
        title: req.body.title,
        content: req.body.content,
        authorId: req.user!.userId,
      },
    });
    res.status(201).json(post);
  }
);

// Update: require posts:update AND ownership (or admin)
router.put(
  "/:id",
  authenticate,
  requirePermission("posts:update"),
  requireOwnership(async (req) => {
    const post = await db.post.findUnique({ where: { id: req.params.id } });
    return post?.authorId ?? null;
  }),
  async (req: AuthenticatedRequest, res) => {
    const updated = await db.post.update({
      where: { id: req.params.id },
      data: { title: req.body.title, content: req.body.content },
    });
    res.json(updated);
  }
);

// Delete: require posts:delete AND ownership (or admin)
router.delete(
  "/:id",
  authenticate,
  requirePermission("posts:delete"),
  requireOwnership(async (req) => {
    const post = await db.post.findUnique({ where: { id: req.params.id } });
    return post?.authorId ?? null;
  }),
  async (req: AuthenticatedRequest, res) => {
    await db.post.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }
);

export default router;
```

### 5. CSRF Protection (Double Submit Cookie + SameSite)

```typescript
// src/lib/csrf.ts — CSRF token generation and validation
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32; // 256 bits

/**
 * Generate a cryptographically random CSRF token.
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Middleware: Set a CSRF cookie on every response if one doesn't exist.
 * The cookie is NOT httpOnly — the client needs to read it to send
 * the value back in a header.
 */
export function csrfCookieMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Client must read this to set the header
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  next();
}

/**
 * Middleware: Validate the CSRF token on state-mutating requests.
 * Compares the cookie value to the header value (double submit pattern).
 * Only applies to POST, PUT, PATCH, DELETE methods.
 */
export function csrfValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken) {
    res.status(403).json({ error: "CSRF token missing." });
    return;
  }

  // Timing-safe comparison to prevent timing attacks
  const cookieBuffer = Buffer.from(cookieToken, "utf8");
  const headerBuffer = Buffer.from(headerToken, "utf8");

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !crypto.timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    res.status(403).json({ error: "CSRF token mismatch." });
    return;
  }

  next();
}
```

```typescript
// src/app.ts — Applying CSRF middleware to an Express app
import express from "express";
import cookieParser from "cookie-parser";
import { csrfCookieMiddleware, csrfValidationMiddleware } from "./lib/csrf";
import authRoutes from "./routes/auth";
import postRoutes from "./routes/posts";

const app = express();

app.use(express.json());
app.use(cookieParser());

// Set the CSRF cookie on every response
app.use(csrfCookieMiddleware);

// Validate CSRF tokens on all state-mutating requests
app.use(csrfValidationMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

export default app;
```

```tsx
// src/components/create-post-form.tsx — React form with CSRF token
"use client";

import { useState, FormEvent } from "react";

/**
 * Read the CSRF token from the cookie.
 * The csrf_token cookie is NOT httpOnly, so JavaScript can read it.
 */
function getCsrfToken(): string {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match?.[1] ?? "";
}

export function CreatePostForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCsrfToken(), // Include CSRF token in header
        },
        credentials: "include", // Include cookies (auth + CSRF)
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create post.");
      }

      setSuccess(true);
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-red-600" role="alert">{error}</p>}
      {success && <p className="text-green-600">Post created!</p>}
      <button type="submit">Create Post</button>
    </form>
  );
}
```

CSRF protection decision guide:

- **Cookie-based auth (sessions, JWTs in cookies):** CSRF protection is required. Use SameSite=Lax on auth cookies as a baseline. Add double submit cookie or synchronizer token pattern for defense in depth.
- **Bearer token auth (Authorization header):** CSRF protection is not needed. The browser does not automatically attach Authorization headers to cross-origin requests.
- **Next.js Server Actions:** CSRF protection is built in. Server Actions validate the Origin header automatically.
- **Mixed auth (some endpoints use cookies, others use Bearer):** Apply CSRF protection to all cookie-authenticated endpoints.

---

## Common Mistakes

### 1. Storing Passwords in Plain Text or with MD5/SHA

**Wrong:** Storing passwords directly in the database without hashing, or using MD5 or SHA-256 which are designed for speed, not security. MD5 can be cracked at billions of hashes per second on consumer GPUs. A database breach exposes every user's password instantly.

```typescript
// WRONG: Plain text
await db.user.create({ data: { email, password } });

// WRONG: MD5 — cracked at billions/sec
import crypto from "crypto";
const hash = crypto.createHash("md5").update(password).digest("hex");

// WRONG: SHA-256 — fast, no salt, no work factor
const hash = crypto.createHash("sha256").update(password).digest("hex");
```

**Fix:** Use Argon2id (preferred) or bcrypt with a minimum cost factor of 12. These algorithms are deliberately slow and include built-in salting.

```typescript
// CORRECT: Argon2id
import argon2 from "argon2";
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});

// CORRECT: bcrypt with cost factor 12
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 12);
```

### 2. Putting JWTs in localStorage

**Wrong:** Storing JWTs in localStorage or sessionStorage. Any XSS vulnerability — a single unescaped user input, a compromised third-party script, a browser extension — gives the attacker full access to the token.

```typescript
// WRONG: Accessible to any JavaScript on the page
localStorage.setItem("token", jwt);
const token = localStorage.getItem("token");
fetch("/api/data", { headers: { Authorization: `Bearer ${token}` } });
```

**Fix:** Store tokens in httpOnly cookies. They cannot be accessed by JavaScript, making them immune to XSS theft.

```typescript
// CORRECT: httpOnly cookie — invisible to JavaScript
res.cookie("access_token", jwt, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 15 * 60 * 1000,
});
```

### 3. No Token Expiry or Excessively Long Expiry

**Wrong:** Issuing access tokens that never expire or that last for days or weeks. If such a token is stolen, the attacker has unlimited access.

```typescript
// WRONG: No expiry
const token = jwt.sign({ userId: user.id }, SECRET);

// WRONG: 30-day access token
const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "30d" });
```

**Fix:** Access tokens should expire in 15 minutes. Use refresh tokens (7-30 days) to issue new access tokens without requiring re-authentication.

```typescript
// CORRECT: Short-lived access token + long-lived refresh token
const accessToken = jwt.sign({ sub: user.id, type: "access" }, SECRET, {
  expiresIn: "15m",
});
const refreshToken = jwt.sign({ sub: user.id, type: "refresh" }, REFRESH_SECRET, {
  expiresIn: "7d",
});
```

### 4. Using the Implicit Grant Flow for SPAs

**Wrong:** Using the OAuth 2.0 Implicit flow, which returns tokens directly in the URL fragment. Tokens appear in browser history, server logs, referrer headers, and can be intercepted by malicious scripts.

**Fix:** Use Authorization Code flow with PKCE for all client types, including SPAs and mobile apps. PKCE prevents authorization code interception and keeps tokens out of URLs. The Implicit flow is deprecated in OAuth 2.1 and should never be used in new applications.

### 5. Rolling Your Own Crypto

**Wrong:** Implementing custom password hashing, custom JWT signing, custom token generation, or custom encryption. Security code is uniquely difficult to write correctly because bugs are silent — the code works, but it is insecure.

```typescript
// WRONG: Custom "hashing" with XOR and base64
function hashPassword(password: string): string {
  const key = "my-secret-key";
  let result = "";
  for (let i = 0; i < password.length; i++) {
    result += String.fromCharCode(
      password.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return Buffer.from(result).toString("base64");
}

// WRONG: Custom JWT implementation
function createToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `${header}.${body}.`;
}
```

**Fix:** Use established, audited libraries for all cryptographic operations. `argon2` or `bcrypt` for password hashing, `jsonwebtoken` for JWTs, `crypto.randomBytes` for token generation. These libraries have been battle-tested across millions of production deployments.

### 6. Session IDs That Are Predictable

**Wrong:** Generating session IDs using sequential numbers, timestamps, user IDs, or Math.random() (which is not cryptographically secure). An attacker can predict valid session IDs and hijack sessions.

```typescript
// WRONG: Sequential
let sessionCounter = 0;
const sessionId = String(++sessionCounter);

// WRONG: Timestamp-based
const sessionId = Date.now().toString(36);

// WRONG: Math.random() is not cryptographically secure
const sessionId = Math.random().toString(36).substring(2);
```

**Fix:** Use `crypto.randomBytes(32)` to generate 256-bit cryptographically random session IDs. Or use a session library (express-session, iron-session) that handles generation correctly.

```typescript
// CORRECT: Cryptographically random
import crypto from "crypto";
const sessionId = crypto.randomBytes(32).toString("hex");
```

### 7. Not Invalidating Sessions on Password Change

**Wrong:** Allowing existing sessions to remain valid after a user changes their password. If the password change was prompted by a suspected compromise, the attacker's existing session remains active.

**Fix:** Invalidate all existing sessions when a user changes their password. For JWTs, maintain a per-user token version counter — increment it on password change and include the version in the JWT. Reject tokens with an old version. For server-side sessions, delete all sessions for the user from the session store.

```typescript
// CORRECT: Invalidate all sessions on password change
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  // ... verify current password, hash new password ...

  await db.user.update({
    where: { id: req.user.userId },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 }, // Invalidates all existing JWTs
    },
  });

  // Delete all sessions from Redis
  const keys = await redis.keys(`session:${req.user.userId}:*`);
  if (keys.length > 0) await redis.del(...keys);

  res.json({ message: "Password changed. Please log in again." });
});
```

### 8. CSRF Protection Disabled "Because We Use JWTs"

**Wrong:** Disabling CSRF protection entirely because the application uses JWTs, without considering HOW the JWTs are transmitted. If JWTs are stored in cookies (which they should be, for XSS protection), they are automatically sent by the browser — making them just as vulnerable to CSRF as session cookies.

**Fix:** The determining factor is not the token format but the transport mechanism. If authentication tokens are in cookies (httpOnly cookies, session cookies), CSRF protection is required. If tokens are sent exclusively via the Authorization header (Bearer tokens), CSRF protection is not needed. Since the recommendation is to store JWTs in httpOnly cookies, most JWT-based applications DO need CSRF protection.

### 9. MFA as an Afterthought with No Recovery Path

**Wrong:** Adding MFA support but not implementing recovery flows. Users who lose their phone, security key, or authenticator app are permanently locked out of their accounts. This is both a usability disaster and a support burden.

**Fix:** Design recovery before MFA. Generate 8-10 backup codes during MFA enrollment and display them once. Hash them before storage. Provide multiple recovery paths: backup codes (primary), trusted device verification, email-based recovery with identity verification, and admin-assisted recovery as a last resort. Test the recovery flow as thoroughly as the enrollment flow.

```typescript
// CORRECT: Generate backup codes during MFA enrollment
import crypto from "crypto";
import argon2 from "argon2";

async function generateBackupCodes(userId: string): Promise<string[]> {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex"); // 8-character hex code
    codes.push(code);
    hashedCodes.push(await argon2.hash(code, { type: argon2.argon2id }));
  }

  // Store hashed codes in the database
  await db.backupCode.createMany({
    data: hashedCodes.map((hash) => ({
      userId,
      codeHash: hash,
      used: false,
    })),
  });

  // Return plain codes to display to the user ONCE
  return codes;
}
```

### 10. Returning Different Errors for "User Not Found" vs. "Wrong Password"

**Wrong:** Returning specific error messages that reveal whether an email address is registered in the system. This allows attackers to enumerate valid user accounts, which is valuable for credential stuffing, phishing, and social engineering.

```typescript
// WRONG: Reveals whether the email exists
const user = await db.user.findUnique({ where: { email } });
if (!user) {
  return res.status(404).json({ error: "No account found with this email." });
}

const isValid = await verifyPassword(user.passwordHash, password);
if (!isValid) {
  return res.status(401).json({ error: "Incorrect password." });
}
```

**Fix:** Always return the same generic error message regardless of whether the email exists or the password is wrong. Perform password verification even when the user is not found (to prevent timing-based enumeration). Apply the same principle to registration ("We sent a verification email") and password reset flows.

```typescript
// CORRECT: Same error message for both cases
const user = await db.user.findUnique({ where: { email } });

// Always verify to prevent timing attacks
const dummyHash = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA";
const isValid = user
  ? await verifyPassword(user.passwordHash, password)
  : await verifyPassword(dummyHash, password);

if (!user || !isValid) {
  return res.status(401).json({ error: "Invalid email or password." });
}
```

---

> **See also:** [Secrets-Environment](../Secrets-Environment/secrets-environment.md) | [API-Security](../API-Security/api-security.md) | [Frontend-Security](../Frontend-Security/frontend-security.md) | [Backend-Security](../Backend-Security/backend-security.md) | [Data-Protection](../Data-Protection/data-protection.md)
>
> **Last reviewed:** 2026-02
