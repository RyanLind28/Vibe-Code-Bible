# Data Protection
> Encryption at rest and in transit, HTTPS/TLS, PII handling, GDPR/CCPA compliance, data minimization, secure backups, and database security. Data is the target — protect it at every layer.

---

## Principles

### 1. Defense in Depth for Data

Data protection is not a single lock on a single door. It is a series of concentric barriers, each designed to hold when the one outside it fails. You must assume every individual control will eventually be defeated — by misconfiguration, by a zero-day, by an insider, by an operational mistake. The question is never "will a layer fail?" but "when a layer fails, what catches the attacker next?"

The five layers of data defense:

- **Layer 1 — Encryption in Transit (TLS):** Every network connection carrying data must be encrypted. This prevents eavesdropping on the wire, whether the wire is the public internet or an internal network segment. TLS protects data as it moves between the user's browser and your server, between your server and your database, between microservices, and between your application and third-party APIs.

- **Layer 2 — Encryption at Rest (Disk, Database, Field):** Data stored on disk must be encrypted. This protects against physical theft of storage media, unauthorized access to database files, and exposure through improperly decommissioned hardware. Encryption at rest operates at three sub-layers: full-disk encryption (the baseline), database-level transparent encryption (protects database files), and field-level application encryption (protects individual sensitive values even from database administrators).

- **Layer 3 — Access Control (Who Can Read/Write What):** Not every user, service, or administrator needs access to every piece of data. The principle of least privilege applies to data access just as it applies to system permissions. Database roles, application-layer authorization, and row-level security all contribute to ensuring that only the right principals can see the right data.

- **Layer 4 — Monitoring and Auditing (Who Accessed What, When):** If someone reads, modifies, or exports data, you need to know about it. Audit logs provide accountability, enable breach detection, and satisfy compliance requirements. Without monitoring, a breach can persist for months before discovery.

- **Layer 5 — Data Lifecycle Management (Retention, Deletion, Archival):** Data that no longer serves a purpose is pure liability. Retention policies define how long data lives. Deletion procedures ensure it actually goes away. Archival strategies move cold data to cheaper, more restricted storage.

When these layers work together, they create compounding protection. If a database backup is stolen, encryption at rest means the data is unreadable without the key. If the encryption key is also compromised, field-level encryption on sensitive columns (SSNs, payment tokens, health records) provides yet another barrier that requires a completely different key. If the attacker somehow obtains both keys, access control logs reveal that an unauthorized entity accessed the key store, triggering incident response before the data is exploited. No single layer is sufficient. All five together create a system where an attacker must defeat multiple independent controls — and that is exponentially harder than defeating one.

### 2. HTTPS Everywhere and TLS 1.3

Every connection must use HTTPS. There are no exceptions. Not for internal services, not for development environments that "will never be exposed," not for health check endpoints, not for "low-sensitivity" data. The cost of HTTPS is effectively zero — certificates are free, performance overhead is negligible, and the security benefit is absolute. Plaintext HTTP transmits data where anyone on the network path can read it: ISPs, Wi-Fi hotspot operators, compromised routers, and state-level surveillance.

**TLS 1.3 over TLS 1.2.** TLS 1.3 is the current standard, and it represents a significant improvement over 1.2 in both security and performance. The handshake completes in one round trip (1-RTT), compared to two in TLS 1.2. Session resumption can happen in zero round trips (0-RTT), making subsequent connections even faster. TLS 1.3 removed all weak cipher suites — no more RC4, 3DES, CBC mode ciphers, or static RSA key exchange. The handshake is simplified: there is no negotiation of insecure options because insecure options do not exist. The only cipher suites available are strong authenticated encryption (AES-GCM, ChaCha20-Poly1305). This means TLS 1.3 is both faster and more secure — there is no tradeoff.

**Certificate management.** Let's Encrypt provides free, automated, widely trusted TLS certificates. Auto-renewal should be configured through certbot (for traditional servers) or built into your reverse proxy — Caddy has built-in ACME support and handles certificate issuance and renewal automatically with zero configuration. For cloud platforms (Vercel, Netlify, AWS CloudFront), HTTPS is handled automatically. There is no reason for any production service to lack a valid TLS certificate.

**Mixed content.** If your page loads over HTTPS but includes resources (scripts, images, stylesheets, API calls) over HTTP, browsers will block or warn about the insecure resources. This breaks functionality and trains users to ignore security warnings. Every resource your page loads must also be HTTPS. Audit your content for hardcoded `http://` URLs.

**HSTS (HTTP Strict Transport Security).** HSTS tells the browser: "Always use HTTPS for this domain, even if the user types `http://` or follows an HTTP link." This prevents SSL stripping attacks, where an attacker intercepts the initial HTTP request (before the redirect to HTTPS) and downgrades the connection. HSTS is set via the `Strict-Transport-Security` response header with a `max-age` (in seconds), `includeSubDomains` (apply to all subdomains), and optionally `preload`. HSTS preload goes further: you submit your domain to the browser's built-in HSTS list, so the browser never even attempts an HTTP connection — not even the very first one. This closes the window that regular HSTS leaves open (the first visit before the header is received).

**Internal services need TLS too.** Database connections, Redis connections, message queue connections, service-to-service gRPC or HTTP calls — all of these must use TLS. "It's behind the firewall" is not a defense. Internal networks get compromised. Lateral movement is a standard attacker technique. A compromised application server on the internal network can sniff unencrypted database traffic and harvest credentials or sensitive data. Encrypt everything, everywhere, always.

### 3. Encryption at Rest

Encryption at rest protects data when it is stored — on disk, in a database, in a backup, in a cache. It is the second layer of defense in depth, and it operates at three distinct levels, each protecting against different threats.

**Full-disk encryption** is the baseline. BitLocker (Windows), LUKS (Linux), and FileVault (macOS) encrypt the entire disk so that data is unreadable without the decryption key. In cloud environments, this translates to encrypted volumes: AWS EBS encryption, GCP Persistent Disk encryption, Azure Disk Encryption. Full-disk encryption protects against physical theft of drives, improper decommissioning of hardware, and unauthorized access to raw storage. It does NOT protect against an attacker who gains access to the running system (because the disk is decrypted while the system is running). That is what the next levels address.

**Database-level encryption** — Transparent Data Encryption (TDE) — has the database engine encrypt all data files, log files, and temporary files. AWS RDS, Azure SQL, PlanetScale, and most managed database services support TDE. It is transparent to the application: the database handles encryption and decryption automatically. TDE protects against theft of database files (someone copies the `.ibd` files or the backup dump). It does NOT protect against an attacker who has valid database credentials, because the database decrypts data before returning it to any authenticated client.

**Field-level encryption** is the strongest and most targeted layer. The application encrypts individual columns containing the most sensitive data — Social Security numbers, credit card tokens, health records, government IDs — using application-layer encryption before writing to the database. The database stores only ciphertext. Even a database administrator running raw queries sees only encrypted blobs. Only the application, with the correct key, can decrypt the data.

**Algorithm: AES-256-GCM.** Use AES-256-GCM (Galois/Counter Mode) for field-level encryption. It is authenticated encryption, meaning it provides both confidentiality (the data is encrypted) and integrity (any tampering with the ciphertext is detected). GCM mode requires a unique initialization vector (IV) for every encryption operation — reusing an IV with the same key is catastrophic. Generate a random 12-byte IV for each encryption, and store it alongside the ciphertext.

**Key management.** The encryption key must never be stored alongside the encrypted data. If both the encrypted database and the encryption key are on the same server, an attacker who compromises that server gets both. Store keys in a dedicated Key Management Service (KMS) — AWS KMS, GCP Cloud KMS, Azure Key Vault — or a Hardware Security Module (HSM) for the highest assurance. Keys should be loaded into the application at startup from the KMS or a secrets manager, never hardcoded or committed to version control.

**Key rotation.** Periodically re-encrypt data with new keys. This limits the exposure window if a key is compromised. When rotating, keep old keys available for decrypting data that was encrypted with them (store a key version identifier alongside the ciphertext), but use the new key for all new encryption. Key rotation should be automated, not manual.

### 4. PII Identification and Classification

PII — Personally Identifiable Information — is any data that can identify a specific person, either directly or in combination with other data. You cannot protect PII if you do not know where it is. The first step in data protection is always identification and classification.

**Direct identifiers** can identify a person on their own: full name, email address, phone number, Social Security Number or national ID, passport number, driver's license number, biometric data (fingerprints, face scans, voice prints), photographs, and full street addresses.

**Indirect identifiers** can identify a person when combined with other data: date of birth, ZIP code or postal code, gender, IP address, device identifiers (IMEI, advertising IDs), browser cookies, geolocation data, employment information, and education history. Research has shown that 87% of the US population can be uniquely identified by the combination of ZIP code, date of birth, and gender alone. Indirect identifiers deserve serious protection.

**Data classification tiers.** Not all data requires the same level of protection. Classifying data into tiers allows you to apply appropriate controls without over-engineering or under-protecting:

- **Public:** Data that can be shared freely with no risk. Company name, published blog posts, public pricing, open-source code. No encryption required for display, but integrity protections still apply.
- **Internal:** Not public, but not sensitive. Internal documentation, non-PII analytics, team rosters. Access restricted to authenticated employees. Encryption at rest and in transit.
- **Confidential:** PII, financial data, health records, customer data. Access restricted to authorized roles only. Encryption at rest (including field-level for direct identifiers) and in transit. Audit logging for all access. Subject to GDPR, CCPA, HIPAA, and other regulations.
- **Restricted:** The most sensitive data — passwords, encryption keys, payment card data (PCI DSS scope), authentication secrets. Strictest controls. Need-to-know access only. HSM-backed key storage. Full audit trails. Incident response plans specifically for this data.

**Data flow mapping.** Document where PII enters your system (forms, API requests, file imports, third-party integrations), where it is stored (primary database, cache layers, log files, analytics stores, backups), where it is transmitted (API responses, email notifications, webhook payloads, export files), and where it exits (third-party integrations, reports, data warehouses). This mapping is not optional — it is a GDPR requirement (Article 30, Records of Processing Activities) and a practical necessity. You cannot protect data you do not know you have. Data flow maps should be living documents, updated whenever a new feature introduces a new data path.

### 5. GDPR Compliance Essentials

The General Data Protection Regulation (GDPR) is the European Union's comprehensive data protection law. It applies to any organization that processes personal data of EU residents, regardless of where the organization is based. If you have users in the EU — and on the internet, you almost certainly do — GDPR applies to you. The penalties for non-compliance are severe: up to 4% of annual global revenue or 20 million euros, whichever is higher.

**Lawful basis for processing.** You need a legal reason to process personal data. GDPR defines six lawful bases: consent (the user explicitly agrees), contract performance (processing is necessary to fulfill a contract with the user), legal obligation (processing is required by law), legitimate interest (processing is necessary for your legitimate business interests, balanced against the user's rights), vital interest (processing is necessary to protect someone's life), and public task (processing is necessary for a task carried out in the public interest). Most SaaS applications rely on consent and contract performance.

**Consent requirements.** GDPR consent is a high bar. It must be freely given (not bundled with terms of service as a take-it-or-leave-it condition), specific (consent to one thing does not cover another), informed (the user understands what they are consenting to), and unambiguous (requires a clear affirmative action — a checkbox the user actively checks, not a pre-checked box). Consent must also be as easy to withdraw as it was to give. "By using this site you consent to..." is NOT valid GDPR consent. Pre-checked checkboxes are NOT valid consent. Buried consent in terms of service is NOT valid consent.

**Right to access (Article 15).** Any user can request a copy of all their personal data that you hold. You must provide it within 30 days, in a commonly used, machine-readable format (JSON, CSV). This means you need to know where all of a user's data lives across all your systems, and you need an automated or semi-automated process to collect and export it. Manual, ad-hoc fulfillment does not scale and introduces errors.

**Right to erasure / right to be forgotten (Article 17).** Users can request deletion of their personal data. You must comply unless you have a legitimate legal obligation to retain it (tax records, legal holds). Deletion must be thorough: not just the primary user record, but comments, activity logs, uploaded files, cached data, and backups (or documented backup retention periods in your privacy policy). Soft deletion followed by hard deletion after a grace period is the standard pattern.

**Right to data portability (Article 20).** Users can request their data in a structured, commonly used, machine-readable format so they can transfer it to another service. JSON and CSV are the standard formats. This is a competitive fairness measure — users should not be locked into your platform because migrating their data is impractical.

**Data Processing Agreements (DPAs).** When you share personal data with processors — hosting providers, analytics services, email providers, payment processors, CDN providers — you must have a DPA in place. The DPA defines what the processor can do with the data, what security measures they must maintain, and what happens in a breach. Most major SaaS providers (AWS, Google Cloud, Stripe, SendGrid) provide standard DPAs.

**Data protection by design and by default.** Privacy is not a feature you bolt on before launch. It is a design principle that influences architecture decisions from the start. Default to the most privacy-protective settings. Collect the minimum data necessary. Encrypt by default. Log access by default. Delete when no longer needed by default.

### 6. CCPA/CPRA Compliance

The California Consumer Privacy Act (CCPA), as amended by the California Privacy Rights Act (CPRA), is the United States' most comprehensive state-level privacy law. It applies to for-profit businesses that do business in California and meet at least one of three thresholds: annual gross revenue exceeding $25 million, buying, selling, or sharing the personal information of 100,000 or more consumers or households per year, or deriving 50% or more of annual revenue from selling or sharing consumers' personal information.

**Right to know.** Consumers have the right to request what personal information you collect about them, the categories of sources from which it was collected, the business or commercial purpose for collecting or selling it, the categories of third parties with whom you share it, and the specific pieces of personal information you have collected. You must provide this information within 45 days of a verifiable request.

**Right to delete.** Consumers can request that you delete their personal information, and you must also notify your service providers and contractors to delete it. There are exceptions for data necessary to complete transactions, detect security incidents, comply with legal obligations, and other specified purposes.

**Right to opt-out of sale or sharing.** If you sell or share personal information (and "sharing" has a broad definition that includes sharing for cross-context behavioral advertising), you must provide a clear, conspicuous link titled "Do Not Sell or Share My Personal Information" on your website. When a consumer exercises this right, you must stop selling or sharing their data. You must also respect Global Privacy Control (GPC) signals sent by the user's browser.

**Right to correct.** Consumers can request that you correct inaccurate personal information that you maintain about them.

**Right to limit use of sensitive personal information.** Sensitive personal information under CPRA includes Social Security numbers, financial account information, precise geolocation, racial or ethnic origin, religious beliefs, genetic data, biometric data, health information, and sex life or sexual orientation data. Consumers can direct you to limit the use of this data to what is necessary for providing the requested service.

**How CCPA differs from GDPR.** The philosophical models are different. GDPR requires a lawful basis before processing (opt-in model). CCPA allows processing but gives consumers the right to opt out of sale/sharing (opt-out model). CCPA has revenue and data volume thresholds; GDPR applies to all organizations regardless of size. CCPA focuses specifically on the sale and sharing of data; GDPR covers all processing activities. Despite these differences, the practical implementation overlaps significantly: both require data inventories, transparent privacy policies, user rights fulfillment workflows, and incident response procedures. Building for GDPR compliance generally gets you most of the way to CCPA compliance.

### 7. Data Minimization

Data minimization is the principle that you should collect, process, and retain only the data that is strictly necessary for the stated purpose. It is both a GDPR requirement (Article 5(1)(c)) and a security best practice. Data you do not have cannot be breached, cannot be subpoenaed, cannot be misused, and does not need to be protected. Every additional field you collect is additional liability.

**The collection question.** For every piece of data your application collects, ask: "Do we actually need this field to provide the service the user is requesting?" If the answer is not a clear yes, do not collect it. Do you need the user's date of birth for a project management tool? No. Do you need their phone number if you only communicate by email? No. Do you need their physical address if you do not ship anything? No. Collect what you need, nothing more.

**Retention policies.** Data that was necessary when collected may not be necessary forever. Define how long you keep each category of data, then enforce those limits with automated deletion:

- Session logs and request logs: 90 days (enough for debugging and short-term analytics)
- User analytics and behavioral data: 1 to 2 years (aggregate after that)
- User accounts and profile data: retained until deletion requested, then deleted within 30 days
- Financial transaction records: 7 years (legal/tax requirements in most jurisdictions)
- Legal hold data: retained as specified by legal counsel, no longer

These are starting points. Your specific retention periods should be documented in your privacy policy and justified by business or legal need.

**Anonymization vs. pseudonymization.** These are different techniques with different legal implications. Anonymization permanently removes all identifying information from a dataset, making it impossible to re-identify individuals. Truly anonymized data is NOT subject to GDPR because it is no longer personal data. Pseudonymization replaces direct identifiers with tokens or pseudonyms, but the mapping between the token and the original identity exists somewhere. Pseudonymized data IS still subject to GDPR because re-identification is possible. Use anonymization for analytics, aggregate reporting, and machine learning training data. Use pseudonymization when you need to re-identify the data later (e.g., for customer support or transaction processing).

**"We might need it later" is not valid.** This is the most common justification for over-collection and over-retention, and it is not a legitimate basis under any privacy regulation. If you do not have a current, specific, documented purpose for a piece of data, you should not be collecting it. If you are retaining data without a current purpose, you should be deleting it. Future hypothetical needs do not justify present privacy risks.

### 8. Secure Backup Patterns

Backups are a copy of your data. If your production data is sensitive — and it almost certainly is — your backups are equally sensitive and require equally rigorous protection. A backup that is easier to access than the production database is a liability, not an asset.

**Encrypted backups.** All backups must be encrypted at rest using AES-256 or equivalent. The encryption must happen before or during the backup write, not as a separate step that could be skipped or fail. Backups in transit (being transferred to offsite storage, replicated to another region) must be encrypted with TLS. The backup encryption key must be stored separately from the backup itself — if the backup and the key are in the same location, an attacker who accesses one gets both.

**Access controls.** Backup access should be completely separate from production access. A compromised application credential or a compromised developer account should not grant access to backups. Use separate IAM roles, separate credentials, separate access policies. The people who need to access backups (operations, on-call engineers during incidents) are a small subset of the people who access production systems.

**Testing restores.** A backup that has never been tested is not a backup — it is a hope. Regularly test that backups can be restored to a working state. This means actually restoring the backup to a test environment and verifying data integrity, not just checking that the backup file exists and is the right size. Schedule restore tests quarterly at minimum. Document the restore procedure so it can be followed under the stress of an actual incident.

**Backup schedule.** A standard schedule: daily incremental backups (only changes since the last backup), weekly full backups, monthly archival backups. Retention: 30 days for daily backups, 12 months for monthly backups, longer for compliance-mandated data. Point-in-time recovery (PITR) for databases: enable WAL archiving (PostgreSQL) or binary logging (MySQL) to allow restoring to any point in time, not just the last backup.

**Offsite and cross-region storage.** Backups stored in the same region, same availability zone, or same account as production are vulnerable to the same failures — regional outages, account compromises, ransomware that spreads across the entire environment. Store backups in a different region and, ideally, a different account or provider.

**Immutable backups.** Ransomware increasingly targets backups, knowing that organizations will pay if they cannot restore. Use write-once storage to prevent backup modification or deletion: AWS S3 Object Lock (Governance or Compliance mode), Azure Immutable Blob Storage, or GCP Bucket Lock. Once written, the backup cannot be altered or deleted until the retention period expires, even by an administrator.

**Retention alignment with privacy.** Backup retention must be consistent with your privacy commitments. GDPR's right to erasure means deleted data must eventually be removed from backups too. The practical approach is to document your backup retention period in your privacy policy (e.g., "deleted data may persist in encrypted backups for up to 30 days") and ensure your retention windows are reasonable. Do not retain backups indefinitely.

### 9. Database Security

The database is where your most valuable data lives. It is the primary target for attackers and the primary source of data breaches. Database security is not the database administrator's job — it is the application team's responsibility.

**Least-privilege database users.** Never use a single, all-powerful database credential for everything. Create separate database roles for different access patterns:

- **Application user:** SELECT, INSERT, UPDATE, DELETE on application tables only. This is what your running application uses. It cannot alter schema, drop tables, or access system tables.
- **Migration user:** ALTER, CREATE, DROP, plus the application permissions. Used only during deployments to run schema migrations. This credential should not be available to the running application.
- **Read-only user:** SELECT only, on specific tables or views. Used for reporting, analytics dashboards, and data exports. Cannot modify any data.
- **Admin user:** Full access. Used only for emergency maintenance, database recovery, and extraordinary operations. Never used by the application. Access requires explicit justification and is audited.

This separation means that a SQL injection vulnerability in the application can only do what the application user can do — read and modify application data. It cannot drop tables, create new users, or access system configuration.

**Network isolation.** Databases must be in a private subnet, not accessible from the public internet. There is no legitimate reason for a production database to have a public IP address. Access from application servers should be through VPC peering, private links, or private subnets within the same VPC. Security groups and network ACLs should restrict database port access to only the application server IPs or security groups.

**Connection encryption.** Enable SSL/TLS for all database connections. For PostgreSQL, set `ssl: true` and `sslmode: 'require'` (or `'verify-full'` for certificate validation) in the connection configuration. For MySQL, set `ssl: { rejectUnauthorized: true }`. Managed database services (AWS RDS, Cloud SQL, PlanetScale) provide SSL certificates — use them. Unencrypted database connections transmit queries and results in plaintext, including passwords in authentication and sensitive data in results.

**Query and audit logging.** Enable slow query logs to identify performance issues. Enable audit logs for compliance — who executed what query, when, from what IP. But be careful: query logs can contain sensitive parameter values. If your query is `SELECT * FROM users WHERE ssn = '123-45-6789'`, that SSN is now in your log files. Use parameterized queries (which you should be doing anyway to prevent SQL injection) and configure logging to record query templates, not parameter values, for sensitive operations.

**Row-Level Security (PostgreSQL RLS).** RLS is a database-enforced access control mechanism that restricts which rows a user or role can see, based on policies you define. This is particularly powerful for multi-tenant applications where data isolation is critical. Instead of relying on the application to always include a `WHERE tenant_id = ?` clause (which a bug or oversight could omit), RLS enforces the restriction at the database layer. Even if the application sends a query without a tenant filter, the database only returns rows belonging to the current tenant. This is defense in depth applied to data access.

### 10. Data Breach Response

A data breach is not a matter of if but when. Every organization with valuable data will eventually experience a security incident. The difference between a well-handled breach and a catastrophic one is preparation. If you are writing your incident response plan during the incident, you have already failed.

**Regulatory notification timelines.** GDPR requires notification to the supervisory authority within 72 hours of becoming aware of a breach involving personal data, unless the breach is unlikely to result in a risk to individuals' rights. CCPA requires notification to affected consumers "in the most expedient time possible and without unreasonable delay." Many US states have their own notification requirements with varying timelines. Know which regulations apply to you and what their deadlines are before an incident occurs.

**Notification content.** Breach notifications must include: a description of what happened in plain language, the categories and approximate number of individuals affected, the categories and approximate number of data records affected, the name and contact details of your data protection officer or point of contact, a description of the likely consequences of the breach, and a description of the measures taken or proposed to address the breach and mitigate its effects.

**Internal incident response process.** Step 1: Contain the breach immediately. Revoke compromised credentials, block unauthorized access, isolate affected systems. Speed matters more than perfection — stop the bleeding first. Step 2: Assess the scope. What data was accessed or exfiltrated? How many users are affected? How did the attacker gain access? What is the timeline of the breach? Step 3: Notify authorities and affected individuals per regulatory requirements and your legal obligations. Step 4: Remediate the vulnerability that was exploited. Patch, reconfigure, and harden. Step 5: Post-mortem and lessons learned. Document what happened, what went wrong, what went right, and what changes will prevent recurrence.

**Evidence preservation.** Do not destroy logs, wipe systems, or reset configurations before the investigation is complete. Forensic evidence is critical for understanding the breach, fulfilling regulatory obligations, and potential legal proceedings. Preserve system logs, network traffic captures, database audit logs, and application logs. Create forensic images of compromised systems before remediation.

**Timeline documentation.** Maintain a detailed, timestamped record of events, discoveries, decisions, and actions throughout the incident. This timeline is critical for regulatory reporting, legal defense, insurance claims, and the post-mortem. Start documenting immediately when the incident is discovered.

**Legal counsel.** Involve legal counsel early in any breach response. Notification requirements vary by jurisdiction, and the legal team needs to assess obligations, manage communications, and protect privilege where appropriate. Do not make public statements about a breach without legal review.

**Cyber liability insurance.** Cyber insurance can cover breach response costs (forensics, notification, credit monitoring for affected individuals), legal fees, regulatory fines (where insurable), and business interruption losses. Obtain coverage before you need it. Review your policy to understand what is covered and what the notification requirements are — many policies require notification to the insurer within hours of discovering a breach.

### 11. Tokenization and Masking

Tokenization and masking are complementary techniques that reduce the exposure of sensitive data by replacing it with non-sensitive substitutes. They serve different purposes but share the same goal: limiting who and what can see the real data.

**Tokenization** replaces sensitive data with a non-sensitive equivalent — a token — that has no exploitable value on its own. The mapping between the token and the original data is stored securely by the tokenization service, completely separate from the system that uses the tokens. The best real-world example is Stripe's payment tokenization. When a user enters their credit card number, Stripe's client-side library (Stripe.js or Stripe Elements) sends the card number directly to Stripe's servers, which return a token. Your server never touches the actual card number — it only stores and uses the token. Stripe handles PCI compliance for the card data. Your PCI scope is massively reduced because cardholder data never passes through your infrastructure. This pattern applies beyond payments: any sensitive data that needs to be referenced but not directly used can be tokenized.

**Data masking** shows partial data for display purposes, revealing just enough for the user to identify the record without exposing the full value. Common masking patterns: credit card numbers shown as `**** **** **** 4242` (only the last four digits visible), email addresses shown as `j***@gmail.com`, Social Security numbers shown as `***-**-1234`, phone numbers shown as `(***) ***-5678`. Masking is a presentation-layer technique. The full data exists in storage, but the application returns only the masked version in API responses and UI displays unless the user has specific authorization to see the full value.

**Non-production environments.** This is where many organizations fail catastrophically. Production data — with real PII, real financial information, real health records — gets copied to staging, development, and testing environments that have weaker security controls, broader access, and less monitoring. This is how breaches happen. NEVER copy production PII to non-production environments. Instead, use masked or anonymized copies of production data (run a masking pipeline that replaces real PII with synthetic equivalents), synthetic data generation tools (Faker.js for JavaScript, Snaplet for PostgreSQL, or custom generators that produce realistic but fake data), or a dedicated, access-controlled staging environment with full audit logging for the rare cases where real data is truly necessary for debugging. The default must be synthetic data. Real data in non-production environments should require explicit approval and have a defined expiration.

---

## LLM Instructions

When generating code or configuration related to data protection, follow these directives precisely. Data protection is not an area where "close enough" is acceptable. Incorrect encryption, misconfigured TLS, or incomplete GDPR compliance can result in data breaches, regulatory fines, and loss of user trust. Every recommendation must be specific, correct, and production-ready.

### Implementing HTTPS and TLS

When configuring TLS for any service, always set TLS 1.3 as the preferred version. For Nginx, configure the `ssl_protocols` directive to include `TLSv1.3` and `TLSv1.2` (keep 1.2 for compatibility with older clients, but 1.3 should be preferred). Do not include TLS 1.0 or TLS 1.1 — they are deprecated and insecure. Set the cipher suite order to prefer strong AEAD ciphers: AES-256-GCM, ChaCha20-Poly1305, AES-128-GCM. Enable OCSP stapling to improve TLS handshake performance and privacy.

1. Always configure the HSTS header with a `max-age` of at least 31536000 (one year), include `includeSubDomains`, and add the `preload` directive if the domain is eligible for HSTS preload submission.
2. For platforms like Vercel and Netlify, HTTPS is automatic — configure custom headers in `vercel.json` or `netlify.toml` to add HSTS and other security headers.
3. For Express.js applications, do not handle TLS in Node.js directly. Use a reverse proxy (Nginx, Caddy) for TLS termination. Node.js handles the application logic; the reverse proxy handles encryption.
4. Enable SSL for all database connections. For PostgreSQL with `pg` or Prisma, set `ssl: true` or `sslmode: require` in the connection string. For MySQL, enable SSL and set `rejectUnauthorized: true`.
5. Add the `Strict-Transport-Security` header through your reverse proxy or application middleware, not as a meta tag in HTML.

### Handling PII in Application Code

Identify every field in your database schema that contains PII. Cross-reference with the data classification tiers: direct identifiers (name, email, phone, SSN) and indirect identifiers (IP address, date of birth, location). Apply protection proportional to the classification tier.

1. Encrypt all Confidential and Restricted PII fields (SSN, tax ID, government-issued IDs, payment information) with application-layer encryption using AES-256-GCM before writing to the database. Use a well-tested encryption library, not a hand-rolled implementation.
2. Implement data access logging for all PII fields. When a user, admin, or service reads PII, log the accessor's identity, the fields accessed, the timestamp, and the purpose. This is necessary for GDPR compliance and breach investigation.
3. Create a data export endpoint that fulfills GDPR Article 15 (right to access). This endpoint must collect all user data across all tables — profile, content, activity, preferences, any data associated with their user ID — and return it as a JSON or CSV download.
4. Create a data deletion endpoint that fulfills GDPR Article 17 (right to erasure). Implement soft-delete first (mark records with a `deletedAt` timestamp), then schedule hard-delete after a grace period (30 days). Cascade through all related tables.
5. Apply data masking in all API responses that include PII. Return only the last four digits of phone numbers, masked email addresses, and never return SSNs or full government IDs in API responses unless specifically required and authorized.
6. Never log PII in application logs. Sanitize log output to replace PII with placeholders or hashes. A log entry should never contain an email address, phone number, IP address, or any direct identifier in plaintext.

### Setting Up Database Security

Database security must be configured before the first line of application code is deployed. It is not a post-launch hardening task. Every database environment — development, staging, production — should follow these practices, with production being the strictest.

1. Create separate database roles: an application role with SELECT, INSERT, UPDATE, and DELETE on application tables only; a migration role with ALTER, CREATE, and DROP for schema changes during deployments; a read-only role with SELECT only for reporting and analytics; and an admin role for emergency maintenance that is never used by the application.
2. Place the database in a private subnet with no public IP address. Configure security groups to allow connections only from application server IPs or security groups. Deny all other inbound traffic.
3. Enable connection encryption (SSL/TLS) for all database connections. Use certificate verification (`sslmode: verify-full` for PostgreSQL) in production to prevent man-in-the-middle attacks.
4. Enable audit logging at the database level. For PostgreSQL, use the `pgaudit` extension. For MySQL, enable the audit log plugin. Configure logging to capture authentication events, schema changes, and access to sensitive tables.
5. For multi-tenant applications, implement PostgreSQL Row-Level Security (RLS) to enforce data isolation at the database layer. Create policies that restrict row visibility based on the current tenant context. This provides defense in depth beyond application-level filtering.

### Implementing Consent Management

Consent management is a legal and technical requirement under GDPR and CCPA. It must be implemented as a first-class system feature, not an afterthought or a cosmetic cookie banner.

1. Create a consent preferences table that records what each user has consented to, when they consented, which version of the consent text they agreed to, and the interface through which consent was given (web form, API, mobile app).
2. Build a user-facing preference center where users can view their current consent choices, grant or withdraw consent for specific purposes (marketing emails, analytics tracking, data sharing with partners), and see the history of their consent changes.
3. Record every consent event as an immutable audit log entry: user ID, consent type, granted or withdrawn, timestamp, IP address, user agent, and the specific consent text version. This log is your evidence that consent was validly obtained.
4. Implement the CCPA "Do Not Sell or Share My Personal Information" toggle. When activated, immediately stop sharing the user's data with third-party advertising or analytics partners. Respect the Global Privacy Control (GPC) browser signal as an automatic opt-out.
5. Enforce consent checks before any non-essential data processing. Before firing analytics events, sending marketing emails, or sharing data with third parties, check the user's consent status. If consent has not been granted or has been withdrawn, do not process the data.

### Building Data Export and Deletion Endpoints

GDPR Articles 15, 17, and 20 require that users can access, delete, and port their data. These endpoints must be robust, secure, and auditable.

1. For the data export endpoint (Article 15, right to access): authenticate the requesting user, then query all tables that contain data associated with their user ID — profile information, content they created (posts, comments, files), activity logs, preference settings, consent records, and any other linked data. Assemble it into a structured JSON object with clear keys and include metadata (export date, data categories included). Return it as a downloadable file.
2. Rate-limit the data export endpoint to prevent abuse. One export request per user per 24 hours is reasonable. Queue large exports as background jobs and notify the user when the export is ready for download.
3. For the data deletion endpoint (Article 17, right to erasure): implement a two-phase approach. Phase 1 is soft-delete: set `deletedAt = now()` on the user record and all related records. The user's account is immediately inaccessible, but data is recoverable during a 30-day grace period (in case of accidental deletion or account recovery). Phase 2 is hard-delete: a scheduled job runs daily and permanently removes all records where `deletedAt` is older than 30 days. This cascades through all related tables.
4. Log every deletion event: who requested it, what was deleted, when, and the regulatory basis (user request, data retention policy expiration, legal hold release). These logs must be retained for compliance auditing even after the data itself is deleted.
5. Send a confirmation to the user when the deletion process begins (immediate acknowledgment) and when it completes (after hard-delete). Include information about any data that was retained and why (e.g., transaction records retained for tax compliance).

---

## Examples

### 1. Field-Level Encryption for Sensitive Data (Node.js + crypto)

Encrypt sensitive fields (SSN, tax ID, government IDs) at the application layer before they reach the database. This ensures that even database administrators and backup theft cannot expose the raw values.

```typescript
// lib/encryption.ts
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits, recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const ENCODING = "base64" as const;

// Key loaded from environment, never hardcoded
// Must be exactly 32 bytes (256 bits) for AES-256
function getEncryptionKey(): Buffer {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${key.length} bytes`
    );
  }
  return key;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a base64 string containing: IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Concatenate IV + encrypted + authTag into a single buffer
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString(ENCODING);
}

/**
 * Decrypts a base64 string produced by encrypt().
 * Verifies the authentication tag to detect tampering.
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, ENCODING);

  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
```

```typescript
// lib/prisma-encryption-middleware.ts
import { Prisma } from "@prisma/client";
import { encrypt, decrypt } from "./encryption";

// Fields that require application-layer encryption
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ["ssn", "taxId", "governmentId"],
  PaymentMethod: ["accountNumber", "routingNumber"],
  HealthRecord: ["diagnosis", "medications"],
};

/**
 * Prisma middleware that automatically encrypts fields on write
 * and decrypts on read for specified models and fields.
 */
export const encryptionMiddleware: Prisma.Middleware = async (params, next) => {
  const modelFields = ENCRYPTED_FIELDS[params.model ?? ""];

  if (modelFields && params.action === "create") {
    for (const field of modelFields) {
      if (params.args.data[field]) {
        params.args.data[field] = encrypt(params.args.data[field]);
      }
    }
  }

  if (modelFields && params.action === "update") {
    for (const field of modelFields) {
      if (params.args.data[field]) {
        params.args.data[field] = encrypt(params.args.data[field]);
      }
    }
  }

  if (modelFields && params.action === "createMany") {
    for (const record of params.args.data) {
      for (const field of modelFields) {
        if (record[field]) {
          record[field] = encrypt(record[field]);
        }
      }
    }
  }

  const result = await next(params);

  // Decrypt on read
  if (modelFields && result) {
    const decryptRecord = (record: Record<string, unknown>) => {
      for (const field of modelFields) {
        if (typeof record[field] === "string") {
          try {
            record[field] = decrypt(record[field] as string);
          } catch {
            // Field may not be encrypted (e.g., null or already decrypted)
          }
        }
      }
      return record;
    };

    if (Array.isArray(result)) {
      return result.map(decryptRecord);
    } else if (typeof result === "object" && result !== null) {
      return decryptRecord(result as Record<string, unknown>);
    }
  }

  return result;
};
```

```typescript
// prisma-client.ts — Applying the middleware
import { PrismaClient } from "@prisma/client";
import { encryptionMiddleware } from "./lib/prisma-encryption-middleware";

const prisma = new PrismaClient();
prisma.$use(encryptionMiddleware);

export default prisma;

// Usage is transparent — encryption/decryption happens automatically:
// await prisma.user.create({
//   data: { name: "Jane", email: "jane@example.com", ssn: "123-45-6789" }
// });
// The SSN is encrypted before it hits the database.
//
// const user = await prisma.user.findUnique({ where: { id: 1 } });
// user.ssn is automatically decrypted: "123-45-6789"
```

### 2. HSTS and TLS Configuration (Nginx + Vercel + Cloudflare)

Production TLS configuration that enforces HTTPS, uses strong ciphers, and enables HSTS.

```nginx
# /etc/nginx/conf.d/tls.conf
# TLS configuration for Nginx — include in your server blocks

# TLS protocol versions — 1.3 preferred, 1.2 for compatibility
ssl_protocols TLSv1.3 TLSv1.2;

# Cipher suites — strong AEAD ciphers only
# TLS 1.3 ciphers are configured automatically (AES-256-GCM, ChaCha20-Poly1305)
# TLS 1.2 ciphers are set explicitly:
ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;

# OCSP Stapling — the server fetches the certificate's revocation status
# and sends it to the client, improving performance and privacy
ssl_stapling on;
ssl_stapling_verify on;
resolver 1.1.1.1 8.8.8.8 valid=300s;
resolver_timeout 5s;

# SSL session settings
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;  # Disable for forward secrecy

# HSTS — force HTTPS for 2 years, include subdomains, enable preload
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

```nginx
# /etc/nginx/sites-available/app.conf
# Full server block with TLS and redirect

# Redirect all HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    # Certificate files (managed by certbot or your CA)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Include shared TLS configuration
    include /etc/nginx/conf.d/tls.conf;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "0" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```json
// vercel.json — HSTS and security headers for Vercel deployments
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

```yaml
# Cloudflare settings (configured via dashboard or API)
# These are the recommended settings, not a config file format:
#
# SSL/TLS:
#   Encryption mode: Full (strict)
#   Minimum TLS Version: TLS 1.2
#   TLS 1.3: Enabled
#   Always Use HTTPS: On
#   Automatic HTTPS Rewrites: On
#
# HSTS:
#   Enable HSTS: On
#   Max Age: 12 months
#   Include subdomains: On
#   Preload: On
#   No-Sniff: On
#
# Edge Certificates:
#   Always Use HTTPS: On
#   HTTP Strict Transport Security: Enabled
#   Minimum TLS Version: 1.2
#   Opportunistic Encryption: On
```

### 3. GDPR Data Export Endpoint (Next.js API Route)

A complete implementation of GDPR Article 15 (right to access) that collects all user data across multiple tables and returns it as a structured, downloadable JSON file.

```typescript
// app/api/user/data-export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma-client";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit: 1 export per user per 24 hours
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(1, "24h"),
  prefix: "data-export",
});

interface UserDataExport {
  exportMetadata: {
    exportDate: string;
    userId: string;
    dataCategories: string[];
    format: string;
    gdprArticle: string;
  };
  profile: Record<string, unknown>;
  posts: Record<string, unknown>[];
  comments: Record<string, unknown>[];
  preferences: Record<string, unknown> | null;
  consentRecords: Record<string, unknown>[];
  activityLog: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
}

export async function POST(request: NextRequest) {
  // Step 1: Authenticate the user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Step 2: Rate limiting to prevent abuse
  const { success, remaining, reset } = await ratelimit.limit(userId);
  if (!success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. You can request one data export per 24 hours.",
        retryAfter: new Date(reset).toISOString(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    // Step 3: Collect all user data across all tables
    const [profile, posts, comments, preferences, consentRecords, activityLog, sessions] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            // Exclude: passwordHash, internal flags
          },
        }),
        prisma.post.findMany({
          where: { authorId: userId },
          select: {
            id: true,
            title: true,
            content: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.comment.findMany({
          where: { authorId: userId },
          select: {
            id: true,
            content: true,
            postId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.userPreferences.findUnique({
          where: { userId },
          select: {
            theme: true,
            language: true,
            emailNotifications: true,
            marketingEmails: true,
            updatedAt: true,
          },
        }),
        prisma.consentRecord.findMany({
          where: { userId },
          select: {
            consentType: true,
            granted: true,
            consentText: true,
            grantedAt: true,
            withdrawnAt: true,
            ipAddress: true,
          },
          orderBy: { grantedAt: "desc" },
        }),
        prisma.activityLog.findMany({
          where: { userId },
          select: {
            action: true,
            resource: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1000, // Limit to last 1000 activities
        }),
        prisma.session.findMany({
          where: { userId },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Step 4: Assemble the export
    const dataExport: UserDataExport = {
      exportMetadata: {
        exportDate: new Date().toISOString(),
        userId,
        dataCategories: [
          "profile",
          "posts",
          "comments",
          "preferences",
          "consentRecords",
          "activityLog",
          "sessions",
        ],
        format: "JSON",
        gdprArticle: "Article 15 — Right of access by the data subject",
      },
      profile,
      posts,
      comments,
      preferences,
      consentRecords,
      activityLog,
      sessions,
    };

    // Step 5: Log the export event for audit purposes
    await prisma.activityLog.create({
      data: {
        userId,
        action: "DATA_EXPORT",
        resource: "user_data",
        metadata: JSON.stringify({
          recordCounts: {
            posts: posts.length,
            comments: comments.length,
            consentRecords: consentRecords.length,
            activityLog: activityLog.length,
            sessions: sessions.length,
          },
        }),
        ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? "unknown",
        userAgent: request.headers.get("user-agent") ?? "unknown",
      },
    });

    // Step 6: Return as downloadable JSON
    const jsonString = JSON.stringify(dataExport, null, 2);
    const fileName = `data-export-${userId}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Export-Remaining": remaining.toString(),
      },
    });
  } catch (error) {
    console.error("Data export failed:", error);
    return NextResponse.json(
      { error: "Data export failed. Please try again or contact support." },
      { status: 500 }
    );
  }
}
```

### 4. GDPR Right to Erasure / Account Deletion

A two-phase deletion system: immediate soft-delete that makes the account inaccessible, followed by scheduled hard-delete that permanently removes all data after a 30-day grace period.

```typescript
// app/api/user/delete-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma-client";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();

  // Require explicit confirmation
  if (body.confirmation !== "DELETE_MY_ACCOUNT") {
    return NextResponse.json(
      {
        error:
          'You must send { "confirmation": "DELETE_MY_ACCOUNT" } to confirm deletion.',
      },
      { status: 400 }
    );
  }

  try {
    const now = new Date();

    // Phase 1: Soft-delete — mark everything as deleted
    await prisma.$transaction(async (tx) => {
      // Mark user as deleted
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          email: `deleted-${userId}@deleted.local`, // Anonymize email
          name: "Deleted User",
        },
      });

      // Soft-delete all user content
      await tx.post.updateMany({
        where: { authorId: userId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.comment.updateMany({
        where: { authorId: userId, deletedAt: null },
        data: { deletedAt: now },
      });

      // Revoke all active sessions immediately
      await tx.session.deleteMany({
        where: { userId },
      });

      // Revoke all API tokens
      await tx.apiToken.deleteMany({
        where: { userId },
      });

      // Log the deletion event
      await tx.auditLog.create({
        data: {
          action: "ACCOUNT_DELETION_INITIATED",
          targetUserId: userId,
          performedBy: userId,
          metadata: JSON.stringify({
            phase: "soft-delete",
            scheduledHardDelete: new Date(
              now.getTime() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
            reason: "user_request",
            gdprArticle: "Article 17 — Right to erasure",
          }),
          ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
        },
      });
    });

    // Send confirmation email (to the original email, captured before anonymization)
    const originalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // The email was already anonymized in the transaction,
    // so we use the session email which is still the original
    await sendEmail({
      to: session.user.email!,
      subject: "Your account has been scheduled for deletion",
      template: "account-deletion-confirmation",
      data: {
        userName: session.user.name,
        deletionDate: new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000
        ).toLocaleDateString(),
        supportEmail: "privacy@example.com",
      },
    });

    return NextResponse.json({
      message: "Account deletion initiated.",
      details: {
        softDeletedAt: now.toISOString(),
        permanentDeletionDate: new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        gracePeriodDays: 30,
        contact: "privacy@example.com to cancel deletion during grace period",
      },
    });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json(
      { error: "Account deletion failed. Please contact support." },
      { status: 500 }
    );
  }
}
```

```typescript
// jobs/hard-delete-expired-accounts.ts
// Run daily via cron: 0 3 * * * (3 AM daily)
import prisma from "@/lib/prisma-client";

const GRACE_PERIOD_DAYS = 30;

export async function hardDeleteExpiredAccounts(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - GRACE_PERIOD_DAYS);

  // Find all users whose soft-delete grace period has expired
  const usersToDelete = await prisma.user.findMany({
    where: {
      deletedAt: {
        not: null,
        lte: cutoffDate,
      },
    },
    select: { id: true, deletedAt: true },
  });

  console.log(
    `[hard-delete] Found ${usersToDelete.length} users past grace period`
  );

  for (const user of usersToDelete) {
    try {
      await prisma.$transaction(async (tx) => {
        const userId = user.id;

        // Delete in dependency order (children before parents)
        // Each delete removes the actual rows permanently

        await tx.activityLog.deleteMany({ where: { userId } });
        await tx.consentRecord.deleteMany({ where: { userId } });
        await tx.userPreferences.deleteMany({ where: { userId } });

        // Delete comments on user's posts by other users (orphan cleanup)
        const userPostIds = await tx.post.findMany({
          where: { authorId: userId },
          select: { id: true },
        });
        if (userPostIds.length > 0) {
          await tx.comment.deleteMany({
            where: {
              postId: { in: userPostIds.map((p) => p.id) },
            },
          });
        }

        // Delete user's own comments
        await tx.comment.deleteMany({ where: { authorId: userId } });

        // Delete user's posts
        await tx.post.deleteMany({ where: { authorId: userId } });

        // Delete likes, follows, notifications
        await tx.like.deleteMany({ where: { userId } });
        await tx.follow.deleteMany({
          where: { OR: [{ followerId: userId }, { followingId: userId }] },
        });
        await tx.notification.deleteMany({ where: { userId } });

        // Finally, delete the user record
        await tx.user.delete({ where: { id: userId } });

        // Audit log entry (this one persists — it references the deleted user by ID)
        await tx.auditLog.create({
          data: {
            action: "ACCOUNT_HARD_DELETED",
            targetUserId: userId,
            performedBy: "system:hard-delete-job",
            metadata: JSON.stringify({
              phase: "hard-delete",
              originalDeletionRequest: user.deletedAt?.toISOString(),
              permanentlyDeletedAt: new Date().toISOString(),
              tablesAffected: [
                "activityLog",
                "consentRecord",
                "userPreferences",
                "comment",
                "post",
                "like",
                "follow",
                "notification",
                "user",
              ],
            }),
          },
        });
      });

      console.log(`[hard-delete] Permanently deleted user ${user.id}`);
    } catch (error) {
      console.error(`[hard-delete] Failed to delete user ${user.id}:`, error);
      // Continue with next user — don't let one failure stop the batch
    }
  }

  console.log(`[hard-delete] Completed. Processed ${usersToDelete.length} users.`);
}
```

```typescript
// Register the cron job (e.g., using a task scheduler like node-cron)
// scripts/register-cron-jobs.ts
import cron from "node-cron";
import { hardDeleteExpiredAccounts } from "@/jobs/hard-delete-expired-accounts";

// Run at 3:00 AM UTC daily
cron.schedule("0 3 * * *", async () => {
  console.log("[cron] Starting hard-delete expired accounts job");
  try {
    await hardDeleteExpiredAccounts();
  } catch (error) {
    console.error("[cron] Hard-delete job failed:", error);
    // Alert ops team via monitoring (Datadog, PagerDuty, etc.)
  }
});
```

### 5. PostgreSQL Row-Level Security (RLS) Setup

Row-Level Security enforces tenant data isolation at the database layer. Even if the application has a bug that omits a tenant filter, the database prevents cross-tenant data access.

```sql
-- migrations/001_enable_rls.sql
-- Enable RLS on multi-tenant tables

-- Step 1: Create the tenant-scoped tables (if not already created)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    assigned_to TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Enable Row-Level Security on tenant tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies
-- The policies use current_setting('app.current_tenant_id') to determine
-- which tenant the current request belongs to. The application sets this
-- session variable before executing any queries.

-- Projects: users can only see/modify projects in their organization
CREATE POLICY projects_tenant_isolation ON projects
    USING (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY projects_tenant_insert ON projects
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY projects_tenant_update ON projects
    FOR UPDATE
    USING (organization_id = current_setting('app.current_tenant_id')::UUID)
    WITH CHECK (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY projects_tenant_delete ON projects
    FOR DELETE
    USING (organization_id = current_setting('app.current_tenant_id')::UUID);

-- Tasks: same pattern
CREATE POLICY tasks_tenant_isolation ON tasks
    USING (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tasks_tenant_insert ON tasks
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tasks_tenant_update ON tasks
    FOR UPDATE
    USING (organization_id = current_setting('app.current_tenant_id')::UUID)
    WITH CHECK (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tasks_tenant_delete ON tasks
    FOR DELETE
    USING (organization_id = current_setting('app.current_tenant_id')::UUID);

-- Step 4: Create an application role that RLS applies to
-- (RLS does not apply to superusers by default)
CREATE ROLE app_user LOGIN PASSWORD 'use-a-strong-password-here';
GRANT SELECT, INSERT, UPDATE, DELETE ON projects, tasks TO app_user;
GRANT SELECT ON organizations TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
```

```typescript
// lib/db-with-rls.ts
// Middleware that sets the tenant context before every database query

import { Pool, PoolClient } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 20,
});

/**
 * Executes a callback with a database connection scoped to a specific tenant.
 * Sets the app.current_tenant_id session variable so that PostgreSQL RLS
 * policies enforce tenant isolation.
 */
export async function withTenantDb<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    // Set the tenant context for this connection
    // This is what RLS policies check against
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [
      tenantId,
    ]);

    // Execute the callback with the tenant-scoped connection
    const result = await callback(client);
    return result;
  } finally {
    // Release the connection back to the pool
    // The session variable is automatically cleared because we used
    // set_config with is_local=true (the third parameter)
    client.release();
  }
}
```

```typescript
// Example usage in an API route
// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantDb } from "@/lib/db-with-rls";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.organizationId;

  // Even if we forget a WHERE clause, RLS prevents cross-tenant data access
  const projects = await withTenantDb(tenantId, async (client) => {
    // This query has NO tenant filter — but RLS enforces it automatically
    const result = await client.query(
      "SELECT id, name, description, created_at FROM projects ORDER BY created_at DESC"
    );
    return result.rows;
  });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.organizationId;
  const body = await request.json();

  const project = await withTenantDb(tenantId, async (client) => {
    // RLS WITH CHECK ensures the organization_id matches the tenant context
    // Attempting to insert with a different organization_id will fail
    const result = await client.query(
      `INSERT INTO projects (organization_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_at`,
      [tenantId, body.name, body.description]
    );
    return result.rows[0];
  });

  return NextResponse.json({ project }, { status: 201 });
}
```

```typescript
// Testing tenant isolation
// __tests__/rls-isolation.test.ts
import { withTenantDb } from "@/lib/db-with-rls";

describe("Row-Level Security tenant isolation", () => {
  const tenantA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const tenantB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  beforeAll(async () => {
    // Seed test data for both tenants
    await withTenantDb(tenantA, async (client) => {
      await client.query(
        "INSERT INTO organizations (id, name) VALUES ($1, 'Tenant A') ON CONFLICT DO NOTHING",
        [tenantA]
      );
      await client.query(
        "INSERT INTO projects (organization_id, name) VALUES ($1, 'Project Alpha')",
        [tenantA]
      );
    });

    await withTenantDb(tenantB, async (client) => {
      await client.query(
        "INSERT INTO organizations (id, name) VALUES ($1, 'Tenant B') ON CONFLICT DO NOTHING",
        [tenantB]
      );
      await client.query(
        "INSERT INTO projects (organization_id, name) VALUES ($1, 'Project Beta')",
        [tenantB]
      );
    });
  });

  test("Tenant A can only see their own projects", async () => {
    const projects = await withTenantDb(tenantA, async (client) => {
      const result = await client.query("SELECT name FROM projects");
      return result.rows;
    });

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Project Alpha");
    // "Project Beta" is invisible to Tenant A — RLS filters it out
  });

  test("Tenant B can only see their own projects", async () => {
    const projects = await withTenantDb(tenantB, async (client) => {
      const result = await client.query("SELECT name FROM projects");
      return result.rows;
    });

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Project Beta");
    // "Project Alpha" is invisible to Tenant B
  });

  test("Tenant A cannot insert data for Tenant B", async () => {
    await expect(
      withTenantDb(tenantA, async (client) => {
        await client.query(
          "INSERT INTO projects (organization_id, name) VALUES ($1, 'Sneaky Project')",
          [tenantB] // Trying to insert with Tenant B's ID while authenticated as Tenant A
        );
      })
    ).rejects.toThrow(); // RLS WITH CHECK prevents this
  });
});
```

---

## Common Mistakes

### 1. No HTTPS on Internal Services ("It's Behind the Firewall")

**Wrong:** Leaving database connections, Redis connections, and service-to-service HTTP calls unencrypted because they are on an internal network. The assumption is that the firewall is an impenetrable boundary and nothing inside it can be compromised. In reality, internal networks are breached regularly through phishing, supply chain attacks, compromised dependencies, and misconfigured cloud security groups. An attacker who gains a foothold on any internal server can sniff unencrypted traffic and harvest database credentials, session tokens, and PII.

**Fix:** Encrypt everything, everywhere. Enable TLS for PostgreSQL connections (`ssl: true`), Redis connections (TLS mode in AWS ElastiCache, Upstash, or `rediss://` protocol), and all internal HTTP calls (use HTTPS for service-to-service communication). Use mutual TLS (mTLS) for service mesh environments where both client and server authenticate each other. Treat the internal network as hostile — because after a breach, it is.

### 2. TLS 1.0/1.1 Still Enabled

**Wrong:** Keeping TLS 1.0 and TLS 1.1 enabled on servers for "backward compatibility." These protocol versions have known vulnerabilities (BEAST, POODLE, CRIME) and use weak cipher suites. PCI DSS has explicitly prohibited TLS 1.0 since 2018. Major browsers have deprecated TLS 1.0 and 1.1. There is virtually no legitimate client that requires these versions.

**Fix:** Disable TLS 1.0 and TLS 1.1 on all servers. Set `ssl_protocols TLSv1.3 TLSv1.2;` in Nginx configuration. For cloud load balancers and CDNs (AWS ALB, Cloudflare, CloudFront), set the minimum TLS version to 1.2. Test with SSL Labs (ssllabs.com/ssltest) to verify your configuration scores A or A+. Monitor your access logs for any clients attempting TLS 1.0/1.1 connections — if there are any, they need to be upgraded, not accommodated.

### 3. Storing Credit Card Numbers Instead of Tokens

**Wrong:** Storing full credit card numbers (PANs) in your database, even if encrypted. This puts your entire application in PCI DSS scope, requiring extensive compliance audits, penetration testing, quarterly scans, and significant operational overhead. A breach that exposes credit card numbers has severe legal, financial, and reputational consequences.

**Fix:** Use a payment processor (Stripe, Braintree, Adyen) that provides tokenization. The user's card number goes directly to the payment processor via their client-side SDK — your server never touches it. You store only the token (e.g., Stripe's `pm_*` or `tok_*` identifiers), which is useless without access to the payment processor's systems. This reduces your PCI scope to SAQ A or SAQ A-EP (the simplest levels). Never store CVVs under any circumstances — even PCI DSS prohibits it.

### 4. Copying Production Data to Development Without Masking

**Wrong:** Creating a database dump of production and restoring it directly to development or staging environments. Now every developer on the team has access to real customer names, email addresses, phone numbers, financial data, and potentially health records — on machines with weaker security, broader access, and no audit logging. This is a GDPR violation and a breach waiting to happen.

**Fix:** Never copy production PII to non-production environments. Build a data masking pipeline that replaces real PII with synthetic equivalents (real names become fake names, real emails become `user-{hash}@example.com`, real SSNs become randomly generated ones). Use Faker.js for generating realistic synthetic data, Snaplet for cloning PostgreSQL databases with automatic anonymization, or custom scripts that sanitize specific fields. For schema and relationship testing, use seed scripts that generate entirely synthetic datasets.

### 5. No Data Retention Policy

**Wrong:** Keeping all data indefinitely because "storage is cheap" and "we might need it someday." Five years of user activity logs, abandoned account data, expired session records, and obsolete analytics data sitting in the database. This maximizes the blast radius of any breach, increases compliance risk (GDPR requires data minimization), slows down database operations, and increases backup sizes and costs.

**Fix:** Define a retention policy for every category of data. Session logs: 90 days. User analytics: 1 to 2 years, then aggregate. Inactive accounts: notify after 12 months, delete after 18 months. Financial records: 7 years per tax requirements. Implement automated deletion jobs that enforce these policies. Document retention periods in your privacy policy. Review the policy annually. Data you do not have cannot be breached, cannot be subpoenaed, and does not cost you anything to protect.

### 6. Cookie Consent Banner That Does Nothing (Tracking Runs Regardless)

**Wrong:** Displaying a cookie consent banner for GDPR compliance, but loading Google Analytics, Facebook Pixel, marketing trackers, and third-party scripts regardless of whether the user consents. The banner is purely cosmetic — clicking "Accept" or "Reject" makes no difference to the actual tracking behavior. This is not compliance; it is a liability. Regulators have issued significant fines for this exact pattern.

**Fix:** Implement a real consent management system. Before consent is given, no non-essential cookies are set and no tracking scripts are loaded. When the user gives consent, load the scripts for the categories they consented to (analytics, marketing, etc.). When they decline or withdraw consent, do not load those scripts and delete any cookies they set. Use a consent management platform (CMP) or build your own consent gate that conditionally loads third-party scripts. Test by inspecting cookies and network requests before and after consent — you should see zero tracking activity before consent is granted.

### 7. Database Running with Public Network Access

**Wrong:** Setting up a database with a public IP address and relying on username/password authentication as the only access control. Cloud provider setup wizards sometimes default to public access for convenience. The database is now discoverable by port scanners, vulnerable to brute-force attacks, and exposed to any exploit in the database software. Automated attacks against publicly accessible databases are constant and indiscriminate.

**Fix:** Place the database in a private subnet with no public IP address. Access it only through application servers in the same VPC, through VPC peering for cross-account access, or through a bastion host or VPN for administrative access. Configure security groups to allow database port traffic only from specific application server security groups or IP ranges. Deny all other inbound traffic. Use IAM-based authentication (AWS RDS IAM auth) instead of static passwords where possible. For local development, use a local database or connect to a development database through an SSH tunnel.

### 8. Backups Not Encrypted

**Wrong:** Running daily database backups that produce unencrypted dump files stored on a shared network drive, an S3 bucket with default settings, or a backup server with broad access. An unencrypted backup is a complete copy of your database in plaintext. If an attacker obtains it, they have everything — every user record, every credential, every piece of PII — with no encryption to slow them down.

**Fix:** Encrypt all backups at rest. For AWS RDS automated backups, enable encryption on the RDS instance (backups inherit the instance's encryption). For manual backups (pg_dump, mysqldump), pipe the output through encryption (gpg, age, or openssl) before writing to storage. Store backups in encrypted storage (S3 with SSE-KMS, encrypted EBS volumes). Use separate encryption keys for backups (stored in KMS, not alongside the backup). Enable S3 Object Lock for immutability. Restrict backup access to a dedicated IAM role that is separate from application and developer roles.

### 9. Collecting Data "Just in Case" (No Minimization)

**Wrong:** Adding fields to registration forms, user profiles, and data collection endpoints because "marketing might want it," "analytics could use it," or "we might need it for a future feature." The sign-up form asks for phone number, date of birth, company size, industry, job title, and physical address — for a note-taking app. Each unnecessary field is additional PII that must be protected, reported in data exports, deleted on request, and defended in a breach.

**Fix:** Apply the minimization test to every field: "Is this data necessary to provide the service the user is requesting right now?" If the answer is no, do not collect it. If marketing wants demographic data, collect it optionally and separately (not as part of sign-up). If analytics needs behavioral data, use anonymous or pseudonymous tracking. If a future feature might need data you do not currently collect, collect it when the feature is built — not before. Every field you do not collect is a field you cannot breach.

### 10. No Plan for Data Breach Notification

**Wrong:** Having no documented incident response plan, no designated point of contact for data protection issues, no pre-drafted notification templates, and no understanding of which regulations apply to your data. When a breach occurs (and it will), the team scrambles to figure out who to notify, what to say, what the legal deadlines are, and who is in charge. The 72-hour GDPR notification window is consumed by confusion and panic rather than effective response.

**Fix:** Create a written incident response plan before you need it. The plan must include: designated incident commander and response team members, contact information for legal counsel, regulatory authorities, and cyber insurance carrier, notification templates for authorities and affected individuals (pre-drafted, reviewed by legal), a checklist of regulatory requirements by jurisdiction (GDPR 72-hour rule, CCPA requirements, state notification laws), forensic evidence preservation procedures, and a communication chain (who tells whom, in what order). Run a tabletop exercise at least annually — walk through a realistic breach scenario and test the plan. Update the plan after every exercise and every real incident.

---

> **See also:** [Secrets-Environment](../Secrets-Environment/secrets-environment.md) | [Authentication-Identity](../Authentication-Identity/authentication-identity.md) | [Security-Headers-Infrastructure](../Security-Headers-Infrastructure/security-headers-infrastructure.md) | [Backend-Security](../Backend-Security/backend-security.md) | [API-Security](../API-Security/api-security.md)
>
> **Last reviewed:** 2026-02
