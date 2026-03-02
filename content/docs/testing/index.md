---
title: Testing Vibe Coding Knowledge Base
description: Test strategy, unit testing, end-to-end testing, and performance testing — structured for AI-assisted development. Feed these files to your AI coding assistant to ship tested, reliable software by default.
---
# Testing Vibe Coding Knowledge Base

> Test strategy, unit testing, end-to-end testing, and performance testing — structured for AI-assisted development. Feed these files to your AI coding assistant to ship tested, reliable software by default.

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack multiple files** for complex tasks — the guides cross-reference each other.
4. **Describe what you're building** and the AI now has expert-level testing context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| Adding tests to an existing project | `Test-Strategy` + `Unit-Testing` |
| Setting up CI with full test coverage | `Unit-Testing` + `E2E-Testing` + `Test-Strategy` |
| Testing a new feature end-to-end | `Unit-Testing` + `E2E-Testing` |
| Debugging a slow application | `Performance-Testing` + `Backend/Caching-Strategies` |
| Building a test suite from scratch | `Test-Strategy` + `Unit-Testing` + `E2E-Testing` + `Performance-Testing` |
| Optimizing Core Web Vitals | `Performance-Testing` + `SEO/Technical-SEO/Core-Web-Vitals` |

**Pro tip:** Start every testing effort by pasting `Test-Strategy` into your AI session first. It establishes what to test and how much to test — preventing both over-testing and under-testing.

---

## Guides

```
Testing/
├── Unit-Testing/            → Jest, Vitest, mocking, test structure, coverage
├── E2E-Testing/             → Playwright, Cypress, test flows, CI integration
├── Performance-Testing/     → Load testing, Lighthouse, benchmarks, profiling
└── Test-Strategy/           → What to test, testing pyramid, TDD, test plans
```

### [Unit Testing](./unit-testing)
Jest and Vitest setup and configuration, test file structure and naming conventions, testing React components with Testing Library, mocking modules, functions, and API calls, snapshot testing, testing hooks and context, async testing patterns, code coverage configuration and thresholds, test factories and fixtures, and CI integration. Includes complete examples for Next.js App Router components, Server Actions, and API Route Handlers.

### [E2E Testing](./e2e-testing)
Playwright setup and architecture, writing resilient selectors, page object model pattern, testing user flows (auth, forms, navigation), visual regression testing, API mocking and network interception, multi-browser and mobile testing, parallel test execution, CI/CD pipeline integration with GitHub Actions, Cypress comparison, accessibility testing with axe-core, and test data management. Includes complete test suites for common SaaS flows.

### [Performance Testing](./performance-testing)
Lighthouse CI setup and budgets, Core Web Vitals measurement (LCP, INP, CLS), load testing with k6 and Artillery, stress testing and soak testing patterns, React profiling and render optimization, bundle analysis with Next.js, database query profiling, memory leak detection, runtime benchmarking, synthetic monitoring, and real user monitoring (RUM). Includes complete CI pipelines for automated performance regression detection.

### [Test Strategy](./test-strategy)
Testing pyramid and trophy models, what to test vs what not to test, test-driven development (TDD) workflow, behavior-driven development (BDD), risk-based testing prioritization, testing in CI/CD pipelines, test organization and naming conventions, flaky test management, test doubles taxonomy (mocks, stubs, fakes, spies), testing microservices and APIs, contract testing, and building a test plan for new features. Includes decision frameworks for choosing the right test type.

---

## Status

Complete — all 4 guides are written and reviewed. Last updated: 2026-03.

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
