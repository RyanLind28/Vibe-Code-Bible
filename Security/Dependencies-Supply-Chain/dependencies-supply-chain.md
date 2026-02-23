# Dependencies & Supply Chain Security
> npm/yarn/pnpm audit, lockfile security, Dependabot, SBOMs, typosquatting, CI/CD pipeline security, and Docker image scanning. Your application is only as secure as its weakest dependency.

---

## Principles

### 1. The Supply Chain Attack Surface

Modern applications depend on hundreds to thousands of transitive packages. When you install a single popular framework like Next.js or NestJS, you pull in 200+ packages you never explicitly chose. A single compromised package anywhere in that tree can compromise every downstream project that depends on it. This is not theoretical. It has happened repeatedly, at scale, and it will happen again.

Real-world incidents that define the threat landscape:

**event-stream (2018)** — A maintainer of a popular npm package with millions of downloads handed over publishing rights to an unknown contributor who had made a few small PRs. That new maintainer added a dependency called `flatmap-stream` containing obfuscated code that targeted the Copay Bitcoin wallet. The malicious code stole cryptocurrency from users. The attack went undetected for two months. This demonstrated that social engineering of open-source maintainers is a viable attack vector.

**ua-parser-js (2021)** — A package with 8 million weekly downloads was hijacked when the maintainer's npm account was compromised. The attacker published versions containing a cryptominer and credential-stealing malware. Because many CI/CD pipelines ran `npm install` without lockfiles or with loose version ranges, the compromised version was automatically pulled into thousands of builds within hours.

**colors.js and faker.js (2022)** — The maintainer of these widely-used packages deliberately sabotaged them in protest against corporations using open-source without compensation. `colors.js` was updated to print an infinite loop of garbage text, and `faker.js` was replaced with a version that did the same. This broke thousands of projects and demonstrated that even intentional sabotage by a trusted maintainer is a real risk.

**xz-utils (2024)** — A sophisticated, multi-year social engineering attack targeted the maintainer of `xz-utils`, a critical compression library used in virtually every Linux distribution. An attacker spent years building trust as a contributor, eventually gaining commit access and injecting a backdoor that compromised SSH authentication on affected systems. The attack was discovered by accident when a developer noticed unusual SSH performance. This is the most sophisticated supply chain attack documented to date and shows that even mature, well-maintained projects are vulnerable.

The npm ecosystem's trust model compounds these risks. Anyone can publish a package to the public registry. Packages can include `preinstall`, `install`, and `postinstall` scripts that execute arbitrary code the moment you run `npm install`. There is no mandatory code review, no sandboxing of install scripts, and no requirement that published code match the source repository. The `node_modules` directory in a typical project contains code from hundreds of individual maintainers, most of whom you have never heard of and whose security practices you cannot verify.

Your application is only as secure as its least-secure transitive dependency. Treat dependency management as a first-class security concern, not an afterthought.

The scale of the problem is worth quantifying. A typical React application has 1,200+ packages in `node_modules`. A Next.js application has 1,800+. A NestJS backend may have 800+. Each of these packages is maintained by individuals with varying levels of security awareness, and any one of them could be a vector for compromise. The attack does not have to target a popular package — it can target a small, deeply nested utility that no one monitors but that happens to be in the dependency tree of thousands of projects. This is why defense in depth (auditing, lockfiles, SBOMs, scanning, minimal dependencies) is essential. No single measure is sufficient.


### 2. npm/yarn/pnpm Audit Workflows

Package auditing is the most basic layer of supply chain defense. Every major package manager ships a built-in audit command that checks your installed dependencies against known vulnerability databases.

`npm audit` scans your `package-lock.json` against the GitHub Advisory Database (which aggregates data from the National Vulnerability Database, security advisories, and community reports). It reports vulnerabilities by severity level: critical, high, moderate, and low. Each finding includes the vulnerable package name, the affected version range, the patched version (if available), the dependency path showing how the vulnerable package entered your tree, and a link to the advisory with full details.

`npm audit fix` attempts to automatically resolve vulnerabilities by updating packages to patched versions while respecting semver constraints. If a vulnerability exists in `lodash@4.17.20` and the fix is in `4.17.21`, and your `package.json` allows `^4.17.0`, then `npm audit fix` can resolve it automatically. However, if the fix requires a major version bump (e.g., the vulnerable package is at `2.x` and the fix is only in `3.x`), `npm audit fix` will not make that change without the `--force` flag. Use `npm audit fix --force` with extreme caution because it allows semver-major changes that may break your application.

`yarn audit` provides the same functionality with a different output format. It groups vulnerabilities by advisory and shows the resolution path. Yarn Berry (v2+) has `yarn npm audit` with similar capabilities. `pnpm audit` works the same way but benefits from pnpm's stricter dependency resolution, which can sometimes reduce your exposure to transitive vulnerabilities because pnpm does not hoist packages by default.

For CI integration, run `npm audit --audit-level=high` to fail the build only on high and critical vulnerabilities. Setting the threshold to `moderate` or `low` will generate too many failures from vulnerabilities that are often not exploitable in your context. The `--omit=dev` flag restricts the audit to production dependencies only. This is a reasonable choice because devDependencies do not ship to your users — a vulnerability in your testing framework does not directly affect your production application. However, devDependencies can still be a risk in CI/CD environments where they are installed and executed, so consider auditing both and treating them with different severity thresholds.

Manual resolution is sometimes necessary. When `npm audit fix` cannot resolve a vulnerability — for example, when the vulnerability is in a transitive dependency and the direct dependency has not released an update — you have several options. You can use npm `overrides` (npm v8.3+) or yarn `resolutions` to force a specific version of the transitive dependency. You can find an alternative package that provides the same functionality without the vulnerability. Or you can accept the risk after determining that the vulnerability does not apply to your usage (e.g., a Regular Expression Denial of Service vulnerability in a function you never call) and document that decision explicitly.

False positives are a reality. Some reported vulnerabilities require specific conditions to exploit that do not exist in your application. When this happens, document the decision with a comment in your code or a security log entry explaining why the vulnerability does not apply. Do not ignore the entire audit output because of a few false positives — that defeats the purpose.


### 3. Lockfile Security

Lockfiles are the foundation of reproducible, secure builds. They pin the exact version of every direct and transitive dependency along with the integrity hash (SHA-512) used to verify the downloaded package matches what was expected.

The three main lockfiles are `package-lock.json` (npm), `yarn.lock` (Yarn), and `pnpm-lock.yaml` (pnpm). They MUST be committed to version control. Without a committed lockfile, `npm install` resolves the latest version matching the semver range in `package.json`. This means two developers running `npm install` a day apart may get different dependency versions. A CI build on Monday may use different packages than a CI build on Tuesday. This is non-deterministic and dangerous — if a package is compromised between those two installs, one environment is affected and the other is not, creating inconsistencies that are extremely difficult to debug.

The critical distinction between `npm ci` and `npm install` determines your CI/CD security posture. `npm ci` (clean install) installs packages exactly as specified in the lockfile. If the lockfile is out of sync with `package.json`, the command fails. It deletes `node_modules` before installing, ensuring a clean state. It is faster than `npm install` because it skips the dependency resolution step. `npm install`, by contrast, can modify the lockfile if it detects that `package.json` has changed, and it does not delete existing `node_modules`. ALWAYS use `npm ci` in CI/CD pipelines, automated builds, and production deployments.

Lockfile injection is a subtle attack vector that targets the code review process. A malicious pull request can modify the lockfile to point to a compromised package version or a different registry entirely, while the changes to `package.json` look innocent. Reviewers who focus only on source code changes and skip lockfile diffs will miss this. Always review lockfile changes in pull requests. Look for: unexpected registry URL changes, version changes that do not correspond to `package.json` changes, and integrity hash modifications. Tools like `lockfile-lint` can automate some of these checks.

The integrity hash in the lockfile is a critical security control. When `npm ci` installs a package, it downloads the tarball and computes its SHA-512 hash, then compares it to the hash stored in the lockfile. If they do not match, the installation fails. This prevents a scenario where an attacker compromises the registry and replaces a package tarball with a malicious one — the hash mismatch will catch it. Never manually edit integrity hashes in your lockfile.

Some organizations take lockfile security further by adopting lockfile-only installations in production. The application is built in a controlled CI environment using `npm ci`, and the resulting `node_modules` (or a bundled artifact) is deployed directly. Production servers never run `npm install` at all, eliminating the risk of registry compromise affecting production deployments.

Lockfile linting tools like `lockfile-lint` can enforce policies on your lockfile: requiring that all packages come from a specific registry (preventing registry URL injection), verifying that HTTPS is used for all registry URLs, and ensuring that integrity hashes are present for every package. Add `lockfile-lint` as a CI step alongside your audit to catch lockfile manipulation before it reaches production. Configure it to whitelist only your expected registries (typically `https://registry.npmjs.org` and your private registry if applicable).


### 4. Dependabot and Renovate

Keeping dependencies up to date is essential for security, but doing it manually is unsustainable. Automated dependency update tools monitor your dependencies, detect when new versions are released, and create pull requests with the updates so your CI pipeline can validate them automatically.

Dependabot is GitHub's built-in solution, configured through `.github/dependabot.yml`. It supports npm, pip, Docker, GitHub Actions, Go modules, Cargo, Maven, NuGet, and many more ecosystems. For each ecosystem, you configure the directory to scan, the update schedule (daily, weekly, monthly), and optional grouping rules. Dependabot creates individual PRs for each update by default, which can overwhelm teams with dozens of PRs per week. Grouping rules (available since 2023) let you combine related updates into a single PR — for example, grouping all patch and minor updates together, or grouping all packages in a specific namespace like `@testing-library/*`.

Renovate is an open-source alternative (also available as a GitHub App) that offers significantly more configuration flexibility. It supports everything Dependabot does plus additional features: auto-merge policies that merge updates automatically when CI passes (without human review for low-risk changes), custom grouping and scheduling rules, support for complex monorepo setups, regex-based package managers (for Dockerfiles, Helm charts, and other non-standard dependency declarations), and commit message conventions that integrate with your existing workflow.

The recommended strategy for both tools combines automation with human judgment. Auto-merge patch and minor updates that pass your full CI test suite. These updates are low risk — patch versions contain only bug fixes, and minor versions add features without breaking changes. If your test suite is comprehensive, these updates can flow to production without human review, dramatically reducing the burden on your team. Require manual review for major version updates, which may contain breaking changes that need code modifications. Group related updates to reduce PR noise — all ESLint-related packages in one PR, all AWS SDK packages in another.

Schedule your dependency updates based on your team's capacity. Daily updates mean you always have the latest patches but generate more PRs. Weekly updates (typically Monday morning) batch changes and are easier to manage. For security updates specifically, both tools can be configured to create PRs immediately regardless of the regular schedule, ensuring critical patches are not delayed.

Both Dependabot and Renovate include changelogs in the PR description, show the version diff, and link to release notes. This context helps reviewers make informed decisions about whether to merge. Combine this with a comprehensive test suite and you have a system that keeps your dependencies current with minimal manual effort.

A critical consideration for auto-merge: only enable it if your test suite is comprehensive enough to catch regressions. A project with 90%+ code coverage and thorough integration tests can confidently auto-merge patch updates. A project with minimal tests should require human review for all updates because the tests will not catch breakage. Auto-merge is a reward for good testing practices, not a shortcut around them.

Both tools also support security-specific update strategies. When a security advisory is published for a dependency, Dependabot and Renovate can create a PR immediately regardless of the regular schedule. These security PRs should be treated with the highest priority — review and merge them as quickly as possible, ideally the same day they are opened. Configure notifications (Slack, email, PagerDuty) for security-related dependency PRs to ensure they are not lost in the noise of regular updates.


### 5. Software Bill of Materials (SBOM)

An SBOM is a complete, machine-readable inventory of every component in your application, including all direct and transitive dependencies, their exact versions, their licenses, and their relationships to each other. Think of it as a detailed ingredient list for your software.

Two primary formats dominate the SBOM landscape. CycloneDX, developed under the OWASP Foundation, is designed specifically for security use cases and supports JSON, XML, and Protocol Buffers formats. It includes fields for vulnerability information, license compliance, and component relationships. SPDX (Software Package Data Exchange), maintained by the Linux Foundation, is an ISO standard (ISO/IEC 5962:2021) and focuses on license compliance in addition to security. Both formats are widely supported by security tools and are suitable for most use cases, but CycloneDX is generally preferred in the application security community for its simplicity and security-first design.

SBOMs matter most when a new vulnerability is discovered. When Log4Shell (CVE-2021-44228) was announced in December 2021, organizations without SBOMs spent days or weeks manually checking whether they were affected. Organizations with SBOMs searched their inventory and had an answer in minutes. The same pattern repeats with every major vulnerability disclosure — having an SBOM transforms incident response from a panicked investigation into a quick database query.

Regulatory requirements are driving SBOM adoption. US Executive Order 14028 (May 2021) requires SBOMs for all software sold to the federal government. The EU Cyber Resilience Act (expected to take full effect by 2027) will require SBOMs for products with digital elements sold in the EU. Even if your current customers do not require SBOMs, building the generation pipeline now prepares you for future requirements.

Generation tools for the npm ecosystem include `@cyclonedx/npm` (formerly `@cyclonedx/bom`), which reads your `node_modules` and `package-lock.json` to produce a CycloneDX SBOM. `cdxgen` by CycloneDX supports multiple ecosystems (npm, Python, Java, Go, and more) and can generate SBOMs from both source code and container images. `syft` by Anchore is another multi-ecosystem tool that produces both CycloneDX and SPDX formats and integrates well with container scanning workflows.

Integrate SBOM generation into your CI/CD pipeline. Generate the SBOM during the build step, store it as a build artifact alongside your release, scan it against vulnerability databases (using tools like `grype` or `osv-scanner`), and include it in your Docker image labels or as a companion file with your deployment artifacts. This creates a continuous, auditable record of exactly what software components are in every version of your application.

SBOM storage and lifecycle management deserves attention. Store SBOMs with a retention period that matches your compliance requirements — typically at least one year, often longer. Version your SBOMs alongside your releases so you can always determine exactly what components were in a specific production deployment. When incident response requires checking for a newly disclosed vulnerability, you should be able to query your SBOM archive for every application version deployed in the last 12 months. Tools like Dependency-Track (OWASP) provide a centralized platform for ingesting, storing, and querying SBOMs across your entire organization.


### 6. Typosquatting Awareness

Typosquatting is the practice of publishing a malicious package with a name deceptively similar to a popular, legitimate package. The attacker relies on developers making typos during installation or copy-pasting incorrect package names. This attack is simple, effective, and disturbingly common.

Common typosquatting techniques include: character transposition (`lodash` vs `lodahs`), missing or extra characters (`express` vs `expres` or `expresss`), homoglyph substitution (using characters that look similar, like `rn` instead of `m`), scope confusion (`@angular/core` vs `@angullar/core`), and hyphen variations (`cross-env` vs `crossenv`, which was an actual typosquatting case that affected real users).

Manifest confusion is a related but distinct attack. The `package.json` that npm displays on the registry website may differ from the `package.json` inside the published tarball. An attacker can publish a package where the registry page shows innocent metadata and dependencies, but the actual installed package contains different dependencies, different scripts, or additional files. This means you cannot rely on inspecting a package's page on npmjs.com to determine what will actually be installed. You must inspect the tarball itself.

Prevention requires vigilance at multiple points. Before installing any package, verify the name carefully — read it character by character, especially for packages you found through search results, blog posts, or AI-generated suggestions. Check download counts on npmjs.com: a legitimate popular package has tens of thousands to millions of weekly downloads. A typosquat typically has very few downloads (often a spike when it is first published as bots or confused developers install it). Check the maintainer's profile: legitimate popular packages are maintained by known individuals or organizations with a history of published packages. Check the repository link: legitimate packages link to active, well-maintained GitHub repositories.

Use `npm pack --dry-run` to inspect a package before installation. This shows you every file that will be included in the package without actually installing it. Look for suspicious files, unexpected scripts, or files that do not belong in the package (like compiled binaries or obfuscated JavaScript).

npm provenance (launched in 2023) is a significant advancement. When enabled, npm links published packages to their source repository and specific build process, creating a verifiable chain from source code to published package. You can verify that a package was built from the code in its claimed GitHub repository by checking the provenance badge on npmjs.com. Prefer packages with provenance verification when choosing between alternatives.

Socket.dev provides automated analysis of packages for suspicious behavior. It detects network calls during installation, filesystem access outside the package directory, obfuscated code, install scripts with suspicious patterns, and other indicators of malicious intent. Integrating Socket.dev into your development workflow adds a layer of automated protection against both typosquatting and compromised legitimate packages.

The npm CLI also provides tools for investigating packages before installation. `npm view package-name` shows metadata including the maintainer, version history, and dependencies. `npm view package-name time` shows when each version was published, which can reveal suspicious patterns (e.g., a package with years of inactivity suddenly publishing a new version). `npm view package-name maintainers` shows who has publish access. Combine these checks into a habit: every time you add a new dependency, spend two minutes verifying it. Those two minutes can prevent weeks of incident response.

Starjacking is another deceptive technique where a malicious package claims to be associated with a popular GitHub repository. The attacker sets the `repository` field in `package.json` to point to a legitimate, high-star repository, making the package appear trustworthy on npmjs.com. Always verify that the repository actually lists the npm package in its `package.json` and that the repository maintainers are the same as the npm package maintainers.


### 7. CI/CD Pipeline Security

Your CI/CD pipeline has access to your source code, your secrets (API keys, deployment credentials, signing keys), and the ability to deploy to production. A compromised pipeline is a compromised production environment. Supply chain attacks increasingly target the CI/CD process itself, not just the application dependencies.

GitHub Actions security starts with how you reference actions. Every `uses:` directive in a workflow specifies an action to run. If you reference an action by tag (`uses: actions/checkout@v4`), you are trusting that the tag will always point to the same code. But tags are mutable — the action's maintainer (or an attacker who compromises their account) can move a tag to point to completely different code. Pin actions to a full SHA hash instead: `uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11`. SHA hashes are immutable. The code at that commit cannot change. This is the single most important GitHub Actions security practice.

The `permissions` block controls what access your workflow has. By default, GitHub Actions workflows have broad permissions including write access to your repository contents, packages, and more. Always set `permissions:` at the workflow level to the minimum needed. Most workflows need only `contents: read`. Jobs that create releases need `contents: write`. Jobs that comment on PRs need `pull-requests: write`. Explicitly declaring permissions prevents a compromised action from doing more damage than necessary.

The `pull_request_target` event is one of the most dangerous features in GitHub Actions. It triggers on PRs from forks but runs in the context of the base repository, with access to secrets and write permissions. If you combine `pull_request_target` with `actions/checkout` of the PR's code (using `ref: ${{ github.event.pull_request.head.sha }}`), you are executing untrusted code with full access to your repository's secrets. Attackers actively scan for this misconfiguration. NEVER check out PR code in a `pull_request_target` workflow. Use the regular `pull_request` event instead, which runs in the context of the fork and does not have access to secrets.

Third-party actions are a supply chain risk in themselves. Every action you use has full access to the code, environment variables, and secrets available to the job it runs in. An action that uploads test coverage results could also exfiltrate your deployment keys. Audit every third-party action before using it: read the source code, check the maintainer's reputation, verify that the action does only what it claims, and pin to a SHA hash. Prefer official actions from verified organizations (GitHub, AWS, Google Cloud) over community alternatives when the functionality is equivalent.

Self-hosted runners introduce additional risks. Unlike GitHub-hosted runners (which are ephemeral VMs destroyed after each job), self-hosted runners persist between jobs. A malicious workflow can install a backdoor, modify system packages, or steal cached credentials that persist for future jobs. For public repositories (where anyone can open a PR and trigger a workflow), NEVER use persistent self-hosted runners. Use ephemeral runners (a new VM for each job) or use GitHub-hosted runners.

Secret exposure is a constant concern. GitHub masks known secrets in workflow logs, but this protection is easily bypassed. An attacker can encode secrets with `base64`, reverse them, split them across multiple log lines, send them via HTTP to an external server, or write them to workflow artifacts. Minimize secret exposure by: using OIDC tokens instead of long-lived secrets where possible (AWS, GCP, and Azure all support this), restricting which jobs and steps have access to each secret, and using environment-level secrets that are only available to specific deployment environments.

Workflow approvals provide another layer of protection. For workflows triggered by PRs from first-time contributors or fork contributors, GitHub can require manual approval before the workflow runs. Enable this setting (it is the default for public repositories) and do not disable it. Review the PR code before approving the workflow run — an attacker's first PR may contain a workflow modification that exfiltrates secrets or installs a backdoor.

Reusable workflows and composite actions should be treated with the same scrutiny as third-party actions. If your organization has shared workflows, store them in a dedicated repository with branch protection, require code review for all changes, and pin references to specific commit SHAs. A compromised shared workflow can affect every repository that uses it, making it a high-value target.


### 8. Docker Image Security

Docker images are a critical part of your supply chain. The base image you choose, the packages installed during the build, and the final image configuration all affect your security posture. A production Docker image is not just your application code — it includes an operating system, system libraries, package managers, and potentially hundreds of packages you never explicitly chose.

Minimal base images dramatically reduce your attack surface. The default `node:20` image is based on Debian and weighs over 1GB, containing hundreds of system packages — many of which your application never uses but each of which could contain vulnerabilities. `node:20-alpine` is based on Alpine Linux and weighs approximately 130MB. `node:20-slim` is a stripped-down Debian image at approximately 200MB. Google Distroless images (`gcr.io/distroless/nodejs20-debian12`) contain only the Node.js runtime and its required system libraries — no shell, no package manager, no extra utilities — weighing approximately 130MB but with a far smaller vulnerability footprint than even Alpine. For statically compiled binaries (Go, Rust), the `scratch` image is completely empty, resulting in an image that contains nothing but your application binary.

Image scanning detects known vulnerabilities in the packages within your Docker image. Trivy (by Aqua Security) is the most widely adopted open-source scanner — it is fast, comprehensive, and supports multiple output formats including SARIF for integration with GitHub's Security tab. Grype (by Anchore) is another strong open-source option. Snyk Container provides commercial scanning with additional features. Run your scanner in CI and fail the build on critical and high severity findings. This prevents vulnerable images from reaching your container registry.

Pin base image digests for reproducible, secure builds. Tags like `node:20-alpine` are mutable — they change whenever a new Alpine patch or Node.js patch is released. Today `node:20-alpine` might resolve to one image, and tomorrow it might resolve to a different one. Use the full digest instead: `FROM node:20-alpine@sha256:abc123...`. This guarantees that every build uses the exact same base image. Combine this with Dependabot or Renovate to receive automated PRs when new base image versions are available, so you can update on your schedule after testing.

Multi-stage builds are essential for production images. Use a full build image (with npm, TypeScript compiler, build tools) in the first stage to compile your application, then copy only the production output (compiled JavaScript, `node_modules` with production dependencies only) to a minimal runtime image. This means your production image does not contain TypeScript, your source `.ts` files, npm, build tools, or devDependencies. The result is a smaller image (faster deploys, less storage), fewer packages (fewer vulnerabilities), and reduced information disclosure (attackers cannot inspect your source code if they gain access to the container).

Image signing with cosign (part of the Sigstore project) creates a cryptographic signature for your Docker image that can be verified before deployment. This ensures that the image running in production is exactly the image your CI pipeline built, with no tampering in between. Kubernetes admission controllers can enforce signature verification, rejecting unsigned or tampered images. This is an advanced practice but increasingly important for high-security environments.

Always run containers as a non-root user. By default, processes in a Docker container run as root. If an attacker exploits a vulnerability in your application, they have root access inside the container (and potentially can escape to the host in some configurations). Add a `USER` directive in your Dockerfile to run as a non-privileged user. Node.js does not need root access to serve HTTP traffic on non-privileged ports (1024+).

Container runtime security extends beyond the image itself. Use read-only root filesystems (`docker run --read-only`) to prevent attackers from writing to the filesystem. Mount only the directories your application needs to write to (like `/tmp` or a specific data directory) as writable volumes. Drop all Linux capabilities and add back only the ones your application needs (`--cap-drop=ALL --cap-add=NET_BIND_SERVICE`). These runtime restrictions limit what an attacker can do even if they gain code execution inside the container.

Regularly rebuild your Docker images even if your application code has not changed. Base image maintainers release security patches frequently, and a rebuild pulls in the latest patched base image (when using digest pinning with Dependabot/Renovate, this happens through the automated PR workflow). Stale images that have not been rebuilt in months accumulate known vulnerabilities in their base OS packages.


### 9. Dependency Pinning and Version Strategy

How you specify dependency versions in `package.json` directly affects the predictability and security of your builds. The npm semver range syntax is flexible but introduces non-determinism that can be exploited or can cause unexpected breakage.

Version ranges use caret (`^`) and tilde (`~`) prefixes. `^1.2.3` allows any version `>=1.2.3` and `<2.0.0`. `~1.2.3` allows any version `>=1.2.3` and `<1.3.0`. When you run `npm install` (not `npm ci`), npm resolves these ranges to the latest matching version available at that moment. If you install today and get `1.2.3`, and tomorrow the maintainer publishes `1.2.4` (which happens to be compromised), anyone running `npm install` tomorrow gets the compromised version. The lockfile protects you only if you use `npm ci` and only if the lockfile has not been updated.

For applications (things you deploy), pin exact versions in `package.json`: `"lodash": "4.17.21"` instead of `"^4.17.21"`. This means that even `npm install` (without a lockfile) will install only that exact version. Combined with a lockfile and `npm ci`, you get fully deterministic builds. The downside is that you do not automatically get patch updates — but that is the point. Updates should be deliberate, tested, and reviewed, not automatic and silent.

For libraries (packages you publish for others to consume), version ranges are appropriate and expected. If your library pins `"lodash": "4.17.21"` and a consumer also depends on lodash but at `4.17.20`, npm would need to install two copies. Ranges like `"^4.17.0"` allow npm to find a single version that satisfies all consumers, reducing duplication and `node_modules` size.

The combined strategy for applications is: pin exact versions in `package.json` for maximum control, commit the lockfile for integrity verification, use `npm ci` in all automated environments, and configure Dependabot or Renovate for controlled, tested updates. This gives you deterministic builds (the lockfile and exact pins ensure every install produces the same result), no surprise updates (nothing changes without an explicit PR), and timely security patches (automated PRs notify you of updates and run your test suite against them).

For transitive dependencies, you can use npm `overrides` (npm v8.3+) or yarn `resolutions` to force a specific version of a package anywhere in your dependency tree. This is useful when a direct dependency has not updated to include a security patch for one of its own dependencies. Document every override with a comment explaining why it exists and when it should be removed (typically when the direct dependency releases an update that includes the fix).

Dependency minimization is a complementary strategy. Every dependency you add is a liability — it increases your attack surface, your maintenance burden, and your exposure to supply chain risk. Before adding a new package, ask: can this be done with Node.js built-in APIs? Can this be done with a dependency already in the project? Is this package doing something trivial that can be implemented in 20 lines of code? The `is-odd` and `is-even` npm packages (which literally check if a number is odd or even) are extreme examples, but the principle applies broadly. A project with 50 well-chosen dependencies is more secure than a project with 200 dependencies chosen carelessly. Every removed dependency is one fewer potential point of compromise.


### 10. Runtime Dependency Security

The security of your dependencies extends beyond installation into runtime. npm lifecycle scripts, the Node.js permission model, and runtime analysis tools provide layers of defense against malicious or compromised packages.

npm lifecycle scripts — `preinstall`, `install`, and `postinstall` — run automatically during `npm install`. These scripts are intended for legitimate purposes like compiling native addons (the `sharp` image processing library compiles C++ code, `bcrypt` compiles cryptographic functions, `sqlite3` compiles the SQLite engine). However, they are also the primary attack vector for malicious packages. A compromised package's `postinstall` script can execute any command on your machine: download and run a binary, exfiltrate environment variables (including credentials), install a persistent backdoor, or modify other files in your project.

The `--ignore-scripts` flag prevents lifecycle scripts from running during installation. You can set this globally for a project by adding `ignore-scripts=true` to your `.npmrc` file. When scripts are disabled globally, packages that genuinely need them (native modules) will fail to build. You then explicitly allow scripts for those specific packages. npm supports this with the `--foreground-scripts` flag or by running the install scripts manually for specific packages after the initial install. This approach follows the principle of least privilege — scripts run only for packages that need them, and you have explicitly approved each one.

Socket.dev provides automated package analysis that goes beyond known vulnerability databases. It analyzes the actual behavior of packages: does the package make network requests during installation? Does it access the filesystem outside its own directory? Does it contain obfuscated code? Does it have install scripts that do unusual things? Does it access environment variables? Socket.dev integrates with GitHub to analyze PRs that add or update dependencies, flagging suspicious packages before they enter your codebase.

The Node.js permission model (available behind `--experimental-permission` since Node.js 20) restricts what a Node.js process can do at the runtime level. You can control filesystem read and write access (specifying which directories), network access, child process spawning, and worker thread creation. Running your application with `--experimental-permission --allow-fs-read=/app --allow-fs-write=/app/data --allow-net` restricts filesystem access to specific directories while allowing network access. This provides defense-in-depth: even if a dependency is compromised, the damage it can do is limited by the permission model.

Runtime monitoring and anomaly detection provide additional protection. Tools like Falco (for containerized environments) can detect unusual behavior at runtime — unexpected network connections, file access patterns that deviate from the norm, and process execution that does not match the expected behavior of your application. While this does not prevent an attack, it significantly reduces the time to detect one.

Corepack (included with Node.js 16.9+) provides another layer of runtime safety by managing package manager versions. It ensures that every developer and CI environment uses the exact same version of npm, yarn, or pnpm, preventing inconsistencies that could lead to different dependency resolution behavior. Enable Corepack with `corepack enable` and specify your package manager version in `package.json` using the `packageManager` field. This eliminates an entire class of "works on my machine" problems related to package manager version differences.


### 11. Vendoring and Mirroring

For organizations with strict security, compliance, or reliability requirements, downloading dependencies from the public npm registry on every build introduces unacceptable risk. Vendoring and private registry mirroring provide alternatives.

Vendoring means copying all dependency source code directly into your repository. Instead of downloading packages from npm during the build, you commit the entire `node_modules` directory (or a compressed archive of it) to version control. When to vendor: air-gapped environments where build machines have no internet access, extreme reliability requirements where an npm outage must not prevent you from building and deploying, and compliance requirements where every line of code (including dependencies) must be audited and stored in your controlled repository. The downsides are significant: repository size grows dramatically (hundreds of megabytes to gigabytes of dependency code), updates require re-vendoring and committing large diffs, and code review of vendored updates is impractical. Vendoring is a last resort, not a default strategy.

Private npm registries provide a middle ground. Verdaccio is an open-source, self-hosted npm registry that can serve as both a private package host (for your organization's internal packages) and a caching proxy for the public npm registry. When a developer runs `npm install`, the request goes to your Verdaccio instance. If the package exists in Verdaccio's cache, it is served immediately. If not, Verdaccio downloads it from the public registry, caches it, and serves it. Subsequent installs use the cache. This provides faster installs (local network vs. internet), resilience against npm outages, and a controlled list of packages available to your organization.

Enterprise solutions include JFrog Artifactory, Sonatype Nexus, GitHub Packages, and AWS CodeArtifact. These provide the same caching/proxying capabilities as Verdaccio plus enterprise features: access control, vulnerability scanning at the registry level (blocking vulnerable packages from being downloaded), license compliance checking, and audit logging. Some organizations configure their registry to operate in "allowlist" mode, where only explicitly approved packages can be downloaded. This is the most restrictive but most secure approach.

npm proxy configuration is straightforward. Set the registry URL in your `.npmrc` file (per-project or per-user), and all npm commands will use your private registry instead of the public one. For scoped packages (like `@mycompany/mypackage`), you can configure a separate registry per scope, allowing private packages to come from your internal registry while public packages come from npm (or your proxy of npm).

Dependency confusion (also called namespace confusion) is a specific attack that targets organizations with private packages. If your organization has a private package called `@mycompany/utils` but also uses unscoped internal packages (e.g., `mycompany-utils`), an attacker can publish a package with the same unscoped name on the public npm registry with a higher version number. If your `.npmrc` is not configured correctly, npm may prefer the public registry version over your private one, installing the attacker's code instead. Prevention: always use scoped package names for private packages (`@mycompany/package-name`), configure your `.npmrc` to resolve your scope exclusively from your private registry, and never use unscoped names for internal packages.

Combining mirroring with the other practices in this guide creates a robust supply chain: packages are downloaded through your controlled registry (mirroring), pinned to exact versions (lockfile), audited for vulnerabilities (npm audit, Trivy, grype), tracked in an SBOM (CycloneDX), and updated through automated, tested PRs (Dependabot/Renovate). No single practice is sufficient on its own, but together they create overlapping layers of defense that make successful supply chain attacks significantly harder to execute and faster to detect.

---

## LLM Instructions

### 1. Setting Up Dependency Auditing in CI

When generating CI/CD pipeline configurations for projects that use npm, yarn, or pnpm, always include a dependency auditing step. This step should run `npm audit --audit-level=high` (or the equivalent for the package manager in use) and should be configured to fail the build when high or critical vulnerabilities are detected. Position this step early in the pipeline, after dependency installation but before tests, so that vulnerable builds are caught quickly.

For projects that build Docker images, add a Trivy scan step after the image build. Configure Trivy to scan for critical and high severity vulnerabilities and to output results in SARIF format when the project is hosted on GitHub, so findings appear in the Security tab. The Trivy scan should fail the build if critical vulnerabilities are found, preventing vulnerable images from being pushed to the container registry.

For GitHub-hosted projects, include the `actions/dependency-review-action` on pull request events. This action compares the dependencies in the PR against the base branch and flags any newly introduced vulnerabilities, providing feedback directly in the PR before merge. Configure it to fail on high and critical severity findings.

1. Always add `npm audit --audit-level=high` as a CI step that runs on every push and pull request.
2. Add `--omit=dev` to the audit command when only production dependencies matter for the deployment context.
3. Generate an audit report as a CI artifact so the team can review findings even when the build passes.
4. For Docker-based projects, add a Trivy image scan step that fails on critical and high findings.
5. Include the GitHub dependency review action on all pull request workflows.
6. Configure SARIF upload to GitHub's Security tab for centralized vulnerability tracking.
7. Never suppress audit failures without documenting the reason in the pipeline configuration.
8. When generating a CI pipeline for a monorepo, include separate audit steps for each workspace or package directory.
9. Configure audit report retention to match the organization's compliance requirements (minimum 90 days, ideally 365 days).

### 2. Configuring Dependabot/Renovate

When a user asks for automated dependency management, generate a Dependabot or Renovate configuration that follows security best practices. The configuration should cover all relevant ecosystems in the project: npm dependencies, GitHub Actions, Docker base images, and any other package managers in use.

For Dependabot, generate a `.github/dependabot.yml` file that groups patch and minor updates together (to reduce PR volume), keeps major updates as separate PRs (for manual review), schedules updates weekly, and includes labels for automated workflows. Configure the npm ecosystem with the project's root directory, and include separate entries for GitHub Actions (to keep action versions current) and Docker (if Dockerfiles are present).

For Renovate, generate a `renovate.json` file with the `config:recommended` preset as a starting point. Add group rules for related packages (all ESLint packages together, all testing library packages together, all AWS SDK packages together). Configure auto-merge for patch and minor updates that pass CI, require approval for major updates, and set a schedule that aligns with the team's workflow. Include a commit message convention that matches the project's existing convention.

1. Always cover all ecosystems present in the project, not just npm.
2. Group related updates to reduce PR noise: patch and minor together, major separate.
3. Enable auto-merge for patch and minor updates when the project has a comprehensive test suite.
4. Schedule updates weekly for most teams, daily only for projects with dedicated dependency management capacity.
5. For GitHub Actions, configure Dependabot to pin actions to full SHA hashes and update them regularly.
6. Include labels on dependency PRs so automated workflows can identify and process them.
7. For monorepos, configure directory-specific rules and group packages by workspace.
8. Include a comment in the configuration explaining the auto-merge policy so future maintainers understand the rationale.
9. Configure security update notifications to a team channel (Slack, Teams) so critical patches are not missed.

### 3. Generating SBOMs

When generating build pipelines or release workflows, include SBOM generation as a standard step. The SBOM should be generated after dependencies are installed (so it captures the exact versions in use), formatted in CycloneDX JSON format (the most widely supported format for security tooling), and stored as a build artifact alongside the release.

Use `@cyclonedx/npm` for npm projects or `cdxgen` for multi-ecosystem projects. After generating the SBOM, scan it against vulnerability databases using `grype` or `osv-scanner` to catch any known vulnerabilities that the standard audit step might miss (these tools sometimes have different database coverage). If the project produces Docker images, include the SBOM in the image labels using the `--label` flag in the Dockerfile or the `--attest` flag with `docker buildx`.

1. Generate the SBOM as part of every CI build, not just releases, so you always have an up-to-date inventory.
2. Use CycloneDX JSON format for maximum compatibility with security tools.
3. Store the SBOM as a CI artifact with a retention period that matches your compliance requirements.
4. Scan the SBOM against vulnerability databases immediately after generation.
5. Include the SBOM in Docker image attestations when building container images.
6. For releases, attach the SBOM file to the GitHub release alongside the release binaries.
7. Never generate SBOMs from `package.json` alone — always generate from the installed `node_modules` or lockfile to capture the exact resolved versions.
8. Include license information in the SBOM for compliance teams to review alongside security data.
9. When generating SBOMs for Docker images, use Syft to capture both application dependencies and OS-level packages in a single SBOM.

### 4. Securing Docker Images

When generating Dockerfiles for Node.js applications, always use multi-stage builds with a minimal runtime image. The build stage should use a full Node.js image with all necessary build tools, while the production stage should use either Alpine or Distroless as the base. Pin the base image to a specific digest, not just a tag, to ensure reproducible builds.

Include a `USER` directive to run the application as a non-root user. Do not install unnecessary packages in the production stage. Copy only the compiled output and production `node_modules` from the build stage, never the full source code or devDependencies. Set appropriate labels including the SBOM reference and build metadata.

1. Always use multi-stage builds: a build stage with full tools and a production stage with minimal runtime.
2. Pin base images to digests, not just tags, for reproducible and secure builds.
3. Use `node:20-alpine` or Google Distroless as the production base image, never the full `node:20` image.
4. Include a `USER node` or `USER 1001` directive to run as non-root.
5. Copy only production artifacts to the final stage: compiled JavaScript and production `node_modules`.
6. Do not include `.env` files, source maps, test files, or documentation in the production image.
7. Add a Trivy scan step in the CI pipeline that runs after the Docker build and fails on critical findings.
8. Set `NODE_ENV=production` in the Dockerfile to ensure only production dependencies are included.
9. Add a `.dockerignore` file that excludes `.git`, `node_modules`, `.env`, test files, and documentation from the build context.
10. When generating Docker Compose files for development, never expose the Docker socket to application containers.

### 5. Reviewing Dependencies Before Installation

When an AI coding assistant suggests adding a new dependency (via `npm install package-name`), always verify the package before installation. This is especially important because AI models may hallucinate package names that do not exist (and an attacker could register those hallucinated names), or may suggest packages that have known security issues.

Before generating an `npm install` command for a new package, consider whether the functionality could be achieved with built-in Node.js APIs or existing dependencies. If a new package is genuinely needed, verify the package name is exactly correct (no typos or character transpositions), note the expected download count range so the developer can verify on npmjs.com, and recommend checking for npm provenance.

1. Always double-check package names for typosquatting before including them in install commands.
2. Prefer well-established packages with high download counts, active maintenance, and npm provenance.
3. When suggesting alternatives, list the npm package name exactly as it appears on the registry.
4. Recommend running `npm pack --dry-run` for unfamiliar packages before installation.
5. If a package requires install scripts (native modules), note this explicitly so the developer can make an informed decision.
6. Never suggest installing packages with `sudo` or with disabled security checks unless absolutely necessary and explicitly documented.
7. When suggesting a package, also suggest checking Socket.dev for a risk assessment.
8. If a package has fewer than 100 weekly downloads or has not been updated in over two years, flag it as potentially risky and suggest well-maintained alternatives.
9. When generating code that could work with built-in Node.js APIs (crypto, fs, path, url, http), prefer the built-in over adding a third-party dependency.
10. Never suggest running `npx` with an unverified package name, as `npx` downloads and executes packages immediately without review.

---

## Examples

### 1. GitHub Actions CI with Dependency Audit and Scanning

```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write
  pull-requests: read

jobs:
  dependency-audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Setup Node.js
        uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version: "20"
          cache: "npm"

      - name: Verify lockfile integrity
        run: |
          # Ensure package-lock.json exists and is committed
          if [ ! -f package-lock.json ]; then
            echo "ERROR: package-lock.json not found. It must be committed to git."
            exit 1
          fi

      - name: Install dependencies (clean install from lockfile)
        run: npm ci

      - name: Run npm audit (production dependencies)
        run: npm audit --audit-level=high --omit=dev

      - name: Run npm audit (all dependencies, non-blocking)
        run: npm audit --audit-level=critical || true
        # Full audit is informational; production audit above is the gate

      - name: Generate audit report artifact
        if: always()
        run: npm audit --json > audit-report.json || true

      - name: Upload audit report
        if: always()
        uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
        with:
          name: npm-audit-report
          path: audit-report.json
          retention-days: 30

  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout repository
        uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Dependency Review
        uses: actions/dependency-review-action@9129d7d40b8c12c1ed0f60f83b0c8571c14e3aab # v4.3.2
        with:
          fail-on-severity: high
          deny-licenses: GPL-3.0, AGPL-3.0
          comment-summary-in-pr: always

  docker-scan:
    name: Docker Image Scan
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Checkout repository
        uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@d710430a6722f083d3b36b8339ff66b32f22ee55 # v0.19.0
        with:
          image-ref: "myapp:${{ github.sha }}"
          format: "sarif"
          output: "trivy-results.sarif"
          severity: "CRITICAL,HIGH"
          exit-code: "1"

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@1b1aada464948af03b950897e5eb522f92603cc2 # v3.24.9
        if: always()
        with:
          sarif_file: "trivy-results.sarif"
```

### 2. Dependabot Configuration (Complete `.github/dependabot.yml`)

```yaml
# .github/dependabot.yml
# Automated dependency updates with security-first configuration
version: 2

updates:
  # npm dependencies - weekly updates with grouping
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/New_York"
    # Group patch and minor updates to reduce PR noise
    groups:
      # All non-major updates in a single PR
      patch-and-minor:
        update-types:
          - "patch"
          - "minor"
      # Group testing-related packages together
      testing:
        patterns:
          - "@testing-library/*"
          - "jest"
          - "jest-*"
          - "ts-jest"
          - "@types/jest"
        update-types:
          - "major"
      # Group ESLint-related packages
      linting:
        patterns:
          - "eslint"
          - "eslint-*"
          - "@eslint/*"
          - "@typescript-eslint/*"
          - "prettier"
        update-types:
          - "major"
    # Limit open PRs to avoid overwhelming the team
    open-pull-requests-limit: 15
    # Labels for CI/CD automation and filtering
    labels:
      - "dependencies"
      - "automated"
    # Reviewers for major updates
    reviewers:
      - "your-org/security-team"
    # Commit message configuration
    commit-message:
      prefix: "deps"
      include: "scope"
    # Allow specific actions for version updates
    allow:
      - dependency-type: "all"

  # GitHub Actions - monthly updates, pin to SHA
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    labels:
      - "dependencies"
      - "ci"
    # Group all action updates together
    groups:
      github-actions:
        patterns:
          - "*"

  # Docker base images - weekly updates
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "dependencies"
      - "docker"
    reviewers:
      - "your-org/platform-team"
```

### 3. Renovate Configuration (`renovate.json`)

```json5
// renovate.json
// Renovate configuration with auto-merge, grouping, and security best practices
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    "helpers:pinGitHubActionDigests",
    ":pinVersions",
    "schedule:weekends",
    "group:monorepos",
    "group:recommended"
  ],
  "labels": ["dependencies", "automated"],
  "prConcurrentLimit": 15,
  "prHourlyLimit": 5,

  // Auto-merge patch and minor updates that pass CI
  "packageRules": [
    {
      "description": "Auto-merge patch and minor updates",
      "matchUpdateTypes": ["patch", "minor"],
      "automerge": true,
      "automergeType": "pr",
      "automergeStrategy": "squash",
      "platformAutomerge": true
    },
    {
      "description": "Require review for major updates",
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "reviewers": ["team:security-reviewers"],
      "labels": ["dependencies", "breaking-change"]
    },
    {
      "description": "Group all ESLint-related packages",
      "matchPackagePatterns": [
        "^eslint",
        "^@eslint/",
        "^@typescript-eslint/"
      ],
      "groupName": "eslint",
      "groupSlug": "eslint"
    },
    {
      "description": "Group all testing packages",
      "matchPackagePatterns": [
        "^@testing-library/",
        "^jest",
        "^ts-jest",
        "^@types/jest",
        "^vitest"
      ],
      "groupName": "testing",
      "groupSlug": "testing"
    },
    {
      "description": "Group all AWS SDK packages",
      "matchPackagePatterns": ["^@aws-sdk/"],
      "groupName": "aws-sdk",
      "groupSlug": "aws-sdk"
    },
    {
      "description": "Pin GitHub Actions to SHA digests",
      "matchManagers": ["github-actions"],
      "pinDigests": true,
      "automerge": true
    },
    {
      "description": "Pin Docker digests and auto-merge patches",
      "matchManagers": ["dockerfile"],
      "pinDigests": true,
      "automerge": false,
      "reviewers": ["team:platform"]
    },
    {
      "description": "Security updates get highest priority",
      "matchUpdateTypes": ["patch", "minor"],
      "matchCategories": ["security"],
      "automerge": true,
      "priorityLevel": 1,
      "labels": ["dependencies", "security"]
    }
  ],

  // Commit message convention matching conventional commits
  "commitMessagePrefix": "deps:",
  "commitMessageAction": "update",
  "commitMessageTopic": "{{depName}}",

  // Vulnerability alerts - always create PRs immediately
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security", "urgent"],
    "automerge": true,
    "schedule": ["at any time"]
  },

  // Lock file maintenance - weekly
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 5am on monday"]
  }
}
```

### 4. Docker Image Scanning with Trivy in CI

```yaml
# .github/workflows/docker-security.yml
name: Docker Security Scan

on:
  push:
    branches: [main]
    paths:
      - "Dockerfile"
      - "package.json"
      - "package-lock.json"
      - "src/**"
  pull_request:
    paths:
      - "Dockerfile"
      - "package.json"
      - "package-lock.json"

permissions:
  contents: read
  security-events: write
  packages: write

env:
  IMAGE_NAME: myapp
  REGISTRY: ghcr.io

jobs:
  build-and-scan:
    name: Build and Scan Docker Image
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@f95db51fddba0c2d1ec667646a06c2ce06100226 # v3.0.0

      - name: Build Docker image for scanning
        uses: docker/build-push-action@4a13e500e55cf31b7a5d59a38ab2040ab0f42f56 # v5.1.0
        with:
          context: .
          load: true
          tags: "${{ env.IMAGE_NAME }}:scan"
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Scan 1: Trivy vulnerability scan (blocking on critical/high)
      - name: Trivy vulnerability scan (blocking)
        uses: aquasecurity/trivy-action@d710430a6722f083d3b36b8339ff66b32f22ee55 # v0.19.0
        with:
          image-ref: "${{ env.IMAGE_NAME }}:scan"
          format: "table"
          exit-code: "1"
          severity: "CRITICAL,HIGH"
          ignore-unfixed: true

      # Scan 2: Full scan with SARIF output for GitHub Security tab
      - name: Trivy full scan (SARIF output)
        uses: aquasecurity/trivy-action@d710430a6722f083d3b36b8339ff66b32f22ee55 # v0.19.0
        if: always()
        with:
          image-ref: "${{ env.IMAGE_NAME }}:scan"
          format: "sarif"
          output: "trivy-results.sarif"
          severity: "CRITICAL,HIGH,MEDIUM"

      - name: Upload Trivy results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@1b1aada464948af03b950897e5eb522f92603cc2 # v3.24.9
        if: always()
        with:
          sarif_file: "trivy-results.sarif"

      # Scan 3: Generate scan report as artifact
      - name: Trivy JSON report
        uses: aquasecurity/trivy-action@d710430a6722f083d3b36b8339ff66b32f22ee55 # v0.19.0
        if: always()
        with:
          image-ref: "${{ env.IMAGE_NAME }}:scan"
          format: "json"
          output: "trivy-report.json"

      - name: Upload scan report artifact
        uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
        if: always()
        with:
          name: trivy-scan-report
          path: trivy-report.json
          retention-days: 90

      # Push to registry only if scan passes
      - name: Log in to GitHub Container Registry
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: docker/login-action@343f7c4344506bcbf9b4de18042ae17996df046d # v3.0.0
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push production image
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: docker/build-push-action@4a13e500e55cf31b7a5d59a38ab2040ab0f42f56 # v5.1.0
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

```dockerfile
# Dockerfile — Secure multi-stage build for Node.js
# Stage 1: Build
FROM node:20-alpine@sha256:928b24aaadbd47c1a7722c563b471d874f3e109cd59f0f3de1db0850e3472893 AS build

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && \
    # Run install scripts only for known native modules
    npm rebuild bcrypt sharp

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Stage 2: Production runtime
FROM node:20-alpine@sha256:928b24aaadbd47c1a7722c563b471d874f3e109cd59f0f3de1db0850e3472893 AS production

# Security: run as non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copy only production artifacts from build stage
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json

# Security: no shell access, minimal environment
ENV NODE_ENV=production
ENV PORT=3000

# Security: non-root user
USER appuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]

CMD ["node", "dist/main.js"]
```

### 5. SBOM Generation and Verification (CycloneDX)

```yaml
# .github/workflows/sbom.yml
name: SBOM Generation and Scanning

on:
  push:
    branches: [main]
  release:
    types: [published]

permissions:
  contents: write
  security-events: write

jobs:
  generate-sbom:
    name: Generate and Scan SBOM
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Setup Node.js
        uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      # Generate SBOM using CycloneDX
      - name: Install CycloneDX npm plugin
        run: npm install -g @cyclonedx/cyclonedx-npm

      - name: Generate SBOM (CycloneDX JSON)
        run: |
          cyclonedx-npm --output-file sbom.cdx.json \
            --output-format json \
            --package-lock-only \
            --mc-type application

      - name: Validate SBOM format
        run: |
          # Basic validation: check that the SBOM is valid JSON with expected fields
          node -e "
            const sbom = require('./sbom.cdx.json');
            console.log('SBOM Format:', sbom.bomFormat);
            console.log('Spec Version:', sbom.specVersion);
            console.log('Components:', sbom.components?.length || 0);
            if (!sbom.bomFormat || !sbom.components) {
              console.error('ERROR: Invalid SBOM structure');
              process.exit(1);
            }
            console.log('SBOM validation passed.');
          "

      # Scan SBOM for known vulnerabilities using Grype
      - name: Install Grype
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | \
            sh -s -- -b /usr/local/bin

      - name: Scan SBOM for vulnerabilities
        run: |
          grype sbom:./sbom.cdx.json \
            --output table \
            --fail-on critical

      - name: Generate Grype JSON report
        if: always()
        run: |
          grype sbom:./sbom.cdx.json \
            --output json \
            --file grype-report.json || true

      # Upload artifacts
      - name: Upload SBOM artifact
        uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
        if: always()
        with:
          name: sbom-cyclonedx
          path: sbom.cdx.json
          retention-days: 365

      - name: Upload Grype vulnerability report
        uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
        if: always()
        with:
          name: grype-vulnerability-report
          path: grype-report.json
          retention-days: 90

      # Attach SBOM to GitHub Release
      - name: Attach SBOM to release
        if: github.event_name == 'release'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release upload "${{ github.event.release.tag_name }}" \
            sbom.cdx.json \
            --clobber

  # Separate job: scan Docker image SBOM
  docker-sbom:
    name: Docker Image SBOM
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Checkout repository
        uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Build Docker image
        run: docker build -t myapp:sbom-scan .

      # Generate SBOM from Docker image using Syft
      - name: Install Syft
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | \
            sh -s -- -b /usr/local/bin

      - name: Generate Docker image SBOM
        run: |
          syft myapp:sbom-scan \
            --output cyclonedx-json \
            --file docker-sbom.cdx.json

      - name: Scan Docker SBOM for vulnerabilities
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | \
            sh -s -- -b /usr/local/bin
          grype sbom:./docker-sbom.cdx.json \
            --output table \
            --fail-on critical

      - name: Upload Docker SBOM
        uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
        if: always()
        with:
          name: docker-sbom-cyclonedx
          path: docker-sbom.cdx.json
          retention-days: 365
```

---

## Common Mistakes

### 1. Not Running `npm audit` in CI

**Wrong:** Running `npm audit` locally once during initial setup, then never again. Developers run it manually "when they remember." No CI step enforces it. A vulnerability is disclosed in a transitive dependency, but nobody notices for months because nothing checks automatically.

**Fix:** Add `npm audit --audit-level=high --omit=dev` as a required CI step on every push and pull request. Fail the build on high and critical vulnerabilities. Store the audit report as a CI artifact for review. For the full dependency set (including devDependencies), run a separate non-blocking audit step so the team is informed without blocking every build on low-risk findings. Set up weekly reviews of the audit report to address moderate-severity findings before they accumulate.

### 2. Lockfile Not Committed to Git

**Wrong:** Adding `package-lock.json` or `yarn.lock` to `.gitignore` because it "causes merge conflicts" or "is auto-generated." Each developer and CI environment resolves dependencies independently, potentially getting different versions. A compromised package version is installed in CI but not on developer machines, making the attack invisible during local testing.

**Fix:** Always commit your lockfile (`package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`) to version control. Yes, lockfile merge conflicts happen — resolve them by deleting the lockfile, running `npm install` to regenerate it, and committing the result. The minor inconvenience of merge conflicts is vastly outweighed by the security and reproducibility benefits of a committed lockfile. Configure CI to use `npm ci`, which will fail if the lockfile is missing or out of sync.

### 3. Using `npm install` Instead of `npm ci` in CI/CD

**Wrong:** Using `npm install` in CI/CD pipelines and Dockerfiles. This command can modify the lockfile, does not guarantee a clean `node_modules`, and may resolve different versions than what was tested locally. In a Dockerfile, `RUN npm install` may produce a different `node_modules` every time the image is rebuilt, even with the same lockfile, because `npm install` respects the lockfile only as a hint, not a mandate.

**Fix:** Use `npm ci` in every automated environment: CI pipelines, Docker builds, staging deployments, and production deployments. `npm ci` installs exactly what the lockfile specifies, fails if the lockfile is out of sync with `package.json`, and deletes `node_modules` before installing for a guaranteed clean state. Reserve `npm install` for local development when you are intentionally adding or updating packages.

### 4. Pinning GitHub Actions to Tags Instead of SHA

**Wrong:** Referencing GitHub Actions by tag: `uses: actions/checkout@v4` or `uses: some-org/some-action@v2`. Tags are mutable — they can be moved to point to different code at any time. If the action maintainer's account is compromised, the attacker can retag `v4` to point to malicious code. Every repository using `@v4` will execute the attacker's code on the next workflow run.

**Fix:** Pin every GitHub Action to a full SHA hash: `uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11`. Add a comment with the version for readability: `# v4.1.1`. SHA hashes are immutable — the code at that commit can never change. Use Dependabot or Renovate to create automated PRs when new action versions are released, so you stay current while maintaining immutability.

### 5. Ignoring `npm audit` Warnings Because "It's a Dev Dependency"

**Wrong:** Dismissing all vulnerabilities in devDependencies with "it doesn't ship to production, so it doesn't matter." While it is true that devDependencies are not included in your production bundle, they ARE installed and executed in your CI/CD environment. A compromised devDependency can: steal CI secrets, inject malicious code into your build output, modify your source code during the build process, or exfiltrate your repository contents.

**Fix:** Treat devDependency vulnerabilities with a different but non-zero risk level. Use `npm audit --omit=dev` for the blocking CI gate (fail on high/critical production vulnerabilities) and run a separate `npm audit` (all dependencies) as an informational step. Address devDependency vulnerabilities at a lower urgency but do not ignore them entirely. Critical vulnerabilities in build tools like webpack, babel, or TypeScript should be treated seriously because they execute during your build.

### 6. Docker Base Images Pinned to `latest` or Mutable Tags

**Wrong:** Using `FROM node:latest` or `FROM node:20` in a Dockerfile. The `latest` tag changes with every new Node.js release. Even `node:20` changes with every patch release (20.11.0, 20.11.1, etc.). Your image builds are non-deterministic — the same Dockerfile produces different images on different days, potentially introducing new vulnerabilities or breaking changes without any code change.

**Fix:** Pin Docker base images to their SHA256 digest: `FROM node:20-alpine@sha256:abc123...`. This guarantees that every build uses the exact same base image regardless of when it runs. Use Dependabot or Renovate to receive automated PRs when new base image versions are available. Review the changelog, run your test suite, and merge — giving you controlled, tested updates instead of silent, untested changes. Find the current digest with `docker inspect --format='{{index .RepoDigests 0}}' node:20-alpine`.

### 7. No Dependabot or Renovate for Automated Updates

**Wrong:** Relying on developers to manually check for dependency updates. In practice, this means dependencies are never updated until something breaks or a security audit forces it. By then, you may be dozens of versions behind, making the update painful and risky. Security patches go unnoticed for weeks or months.

**Fix:** Configure Dependabot or Renovate immediately for every project. Start with a minimal configuration: weekly npm updates, grouped by update type. Enable auto-merge for patch and minor updates that pass CI. This requires almost zero ongoing effort from the team and ensures that security patches are applied within a week of release. Expand the configuration over time to cover GitHub Actions, Docker base images, and other ecosystems. The initial setup takes less than 30 minutes and pays for itself the first time a security patch is automatically applied while the team is focused on other work.

### 8. Running `npm install` with Unknown Packages from AI Suggestions Without Checking

**Wrong:** An AI coding assistant suggests `npm install super-useful-lib` and the developer runs it without verification. The package name might be a hallucination (the AI generated a plausible-sounding name that does not exist yet — but an attacker could register it). Or the package exists but has been compromised, is unmaintained, or contains malicious install scripts. The developer trusts the AI's suggestion implicitly.

**Fix:** Before installing any package suggested by an AI or found in a blog post, verify it: search for the exact package name on npmjs.com, check the weekly download count (popular packages have thousands or millions), check the last publish date (unmaintained packages are risky), check the maintainer's profile and other packages, look for the npm provenance badge, and run `npm pack package-name --dry-run` to inspect its contents before installing. If the package does not exist on npm, do NOT create a placeholder — that name might be intentionally unclaimed and the functionality might exist under a different name.

### 9. Lifecycle Scripts Running Without Review

**Wrong:** Installing packages with default npm settings, which execute `preinstall`, `install`, and `postinstall` scripts automatically. A developer runs `npm install` for a new project and a malicious `postinstall` script executes a cryptominer, exfiltrates environment variables, or installs a persistent backdoor. The developer never knows because the malicious output is hidden among normal installation logs.

**Fix:** Add `ignore-scripts=true` to your project's `.npmrc` file to disable lifecycle scripts by default. When a package legitimately needs install scripts (native modules like `bcrypt`, `sharp`, `sqlite3`), run `npm rebuild package-name` explicitly for that specific package. This way, scripts run only for packages you have explicitly approved. Review the scripts of any package that requires them by examining the `scripts` field in its `package.json`. Use Socket.dev to automatically flag packages with suspicious install scripts.

### 10. No SBOM for Applications Deployed to Production

**Wrong:** Deploying applications without any record of which dependencies (and which versions) are included. When a critical vulnerability is announced (like Log4Shell), the team spends hours or days manually investigating `package-lock.json` files across dozens of repositories to determine exposure. By the time they have an answer, the vulnerability may have already been exploited.

**Fix:** Generate an SBOM (CycloneDX JSON format) as part of every CI build and store it as a build artifact alongside the release. When a vulnerability is disclosed, you can search your SBOM inventory in seconds to determine which applications are affected, which version of the vulnerable component they include, and which deployments need immediate patching. Attach the SBOM to GitHub Releases for versioned applications. For containerized applications, include the SBOM as a Docker image attestation so it travels with the image through your deployment pipeline. Use a centralized tool like OWASP Dependency-Track to aggregate SBOMs across all your applications for organization-wide vulnerability visibility.

---

> **See also:** [Secrets-Environment](../Secrets-Environment/secrets-environment.md) | [Security-Headers-Infrastructure](../Security-Headers-Infrastructure/security-headers-infrastructure.md) | [Security-Testing-Monitoring](../Security-Testing-Monitoring/security-testing-monitoring.md) | [Backend-Security](../Backend-Security/backend-security.md) | [API-Security](../API-Security/api-security.md)
>
> **Last reviewed:** 2026-02
