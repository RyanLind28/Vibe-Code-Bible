---
title: Test Strategy
description: Testing pyramid vs testing trophy, what to test and what not to test, TDD and BDD, test doubles taxonomy, risk-based testing, CI/CD integration, flaky test management, contract testing, microservices testing, and building a test plan — the complete strategy for shipping reliable software.
---
# Test Strategy

> Testing pyramid vs testing trophy, what to test and what not to test, TDD and BDD, test doubles taxonomy, risk-based testing, CI/CD integration, flaky test management, contract testing, microservices testing, and building a test plan — the complete strategy for shipping reliable software.

---

## Principles

### 1. Testing Pyramid vs Testing Trophy

The testing pyramid and the testing trophy are two competing models for how to distribute your testing effort. Understanding both is essential because blindly following either one leads to wasted effort or false confidence.

**The Traditional Testing Pyramid**

The pyramid, introduced by Mike Cohn, says you should have many unit tests, fewer integration tests, and very few end-to-end tests. The rationale is economic: unit tests are fast, cheap, and isolated. E2E tests are slow, brittle, and expensive to maintain.

```
        /  E2E  \           Few, slow, expensive
       /----------\
      / Integration \       Moderate count, moderate speed
     /----------------\
    /    Unit Tests     \   Many, fast, cheap
   /---------------------\
```

**The Testing Trophy (Kent C. Dodds)**

The testing trophy reorders priorities for modern frontend and full-stack applications. It argues that integration tests give the highest confidence-per-dollar because they test components working together the way users experience them, without the brittleness of full E2E tests.

```
         /  E2E  \           Few, critical paths only
        /----------\
       / Integration \       Most tests live here
      /----------------\
     /    Unit Tests     \   Pure logic, utilities
    /---------------------\
   /    Static Analysis     \ TypeScript, ESLint, Prettier
  /---------------------------\
```

**Which Model Fits Modern React/Next.js**

For modern React and Next.js applications, the testing trophy is the better default. Here is why:

- **Static analysis** (TypeScript strict mode, ESLint) catches an enormous class of bugs at zero runtime cost. This layer did not exist when the pyramid was conceived.
- **Unit tests** are valuable for pure functions, business logic, and utilities — but testing React components in isolation often means testing implementation details (state changes, internal methods) rather than behavior.
- **Integration tests** (React Testing Library, MSW for API mocking) test components as users interact with them: rendering, clicking, typing, seeing results. These catch real bugs.
- **E2E tests** (Playwright, Cypress) are reserved for critical user journeys: signup, checkout, payment. They are slow and flaky but irreplaceable for validating the full stack.

**Cost-Benefit Tradeoffs**

| Layer | Speed | Confidence | Maintenance Cost | Best For |
|-------|-------|------------|------------------|----------|
| Static Analysis | Instant | Medium | Very Low | Type errors, import mistakes, formatting |
| Unit Tests | < 10ms each | Low-Medium | Low | Pure functions, algorithms, utilities |
| Integration Tests | 50-500ms each | High | Medium | User flows, component behavior, API handlers |
| E2E Tests | 5-30s each | Very High | High | Critical paths, cross-browser, full stack |

The goal is not to pick one model and ignore the other. The goal is to spend your testing budget where it produces the most confidence. For most teams, that means heavy investment in static analysis and integration tests, targeted unit tests for complex logic, and a small E2E suite for critical journeys.

### 2. What to Test

Not all code deserves the same testing investment. Focus your effort on code that is complex, critical, or likely to break.

**Business Logic**

Business rules are the most important thing to test. If your pricing calculation is wrong, nothing else matters. Business logic should be extracted into pure functions that are trivial to unit test.

```typescript
// lib/pricing.ts — pure business logic, easy to test
interface PricingInput {
  basePriceInCents: number;
  quantity: number;
  discountPercent: number;
  taxRate: number;
  isMember: boolean;
}

interface PricingResult {
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  totalInCents: number;
}

export function calculateOrderTotal(input: PricingInput): PricingResult {
  const { basePriceInCents, quantity, discountPercent, taxRate, isMember } = input;

  // Calculate subtotal
  const subtotalInCents = basePriceInCents * quantity;

  // Members get an additional 5% on top of any discount
  const effectiveDiscount = isMember
    ? Math.min(discountPercent + 5, 100)
    : discountPercent;

  // Apply discount
  const discountInCents = Math.round(subtotalInCents * (effectiveDiscount / 100));
  const afterDiscount = subtotalInCents - discountInCents;

  // Apply tax on the discounted amount
  const taxInCents = Math.round(afterDiscount * (taxRate / 100));
  const totalInCents = afterDiscount + taxInCents;

  return { subtotalInCents, discountInCents, taxInCents, totalInCents };
}
```

```typescript
// __tests__/pricing.test.ts
import { calculateOrderTotal } from "@/lib/pricing";

describe("calculateOrderTotal", () => {
  it("calculates total with no discount and no membership", () => {
    const result = calculateOrderTotal({
      basePriceInCents: 1000,
      quantity: 3,
      discountPercent: 0,
      taxRate: 8.5,
      isMember: false,
    });

    expect(result.subtotalInCents).toBe(3000);
    expect(result.discountInCents).toBe(0);
    expect(result.taxInCents).toBe(255); // 3000 * 0.085 = 255
    expect(result.totalInCents).toBe(3255);
  });

  it("applies member discount on top of existing discount", () => {
    const result = calculateOrderTotal({
      basePriceInCents: 2000,
      quantity: 1,
      discountPercent: 10,
      taxRate: 10,
      isMember: true,
    });

    // Member gets 10% + 5% = 15% discount
    expect(result.discountInCents).toBe(300); // 2000 * 0.15
    expect(result.totalInCents).toBe(1870); // (2000 - 300) + 170 tax
  });

  it("caps total discount at 100%", () => {
    const result = calculateOrderTotal({
      basePriceInCents: 5000,
      quantity: 1,
      discountPercent: 98,
      taxRate: 10,
      isMember: true,
    });

    // 98% + 5% = 103%, capped at 100%
    expect(result.discountInCents).toBe(5000);
    expect(result.totalInCents).toBe(0);
  });
});
```

**User-Facing Behavior**

Test what users see and do. If a user clicks "Add to Cart," the cart count should increment and the item should appear. Test the outcome, not the mechanism.

```typescript
// __tests__/add-to-cart.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductPage } from "@/components/product-page";
import { CartProvider } from "@/contexts/cart";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";

describe("Add to Cart", () => {
  it("adds product to cart and updates cart count", async () => {
    const user = userEvent.setup();

    // Mock the API call that adding to cart triggers
    server.use(
      http.post("/api/cart/items", () => {
        return HttpResponse.json({
          data: { id: "item-1", productId: "prod-1", quantity: 1 },
        });
      })
    );

    render(
      <CartProvider>
        <ProductPage productId="prod-1" />
      </CartProvider>
    );

    // Verify cart starts empty
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");

    // User clicks the add to cart button
    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    // Cart count updates
    expect(screen.getByTestId("cart-count")).toHaveTextContent("1");

    // Success toast appears
    expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
  });
});
```

**Edge Cases**

Edge cases are where bugs hide. Empty arrays, null values, boundary conditions, extremely large inputs, unicode strings, concurrent operations — test them explicitly.

```typescript
// __tests__/search.test.ts
import { buildSearchQuery } from "@/lib/search";

describe("buildSearchQuery edge cases", () => {
  it("handles empty search string", () => {
    const query = buildSearchQuery("");
    expect(query).toEqual({ match_all: {} });
  });

  it("handles search string with only whitespace", () => {
    const query = buildSearchQuery("   ");
    expect(query).toEqual({ match_all: {} });
  });

  it("escapes special characters in search input", () => {
    const query = buildSearchQuery('user "admin" OR 1=1 --');
    // Should not produce a raw query injection
    expect(query.query_string?.query).not.toContain("OR 1=1");
  });

  it("handles extremely long search strings", () => {
    const longString = "a".repeat(10000);
    const query = buildSearchQuery(longString);
    // Should truncate or reject, not crash
    expect(query.query_string?.query.length).toBeLessThanOrEqual(500);
  });

  it("handles unicode and emoji in search", () => {
    const query = buildSearchQuery("cafe\u0301 Tokyo");
    expect(query.query_string?.query).toContain("cafe");
  });
});
```

**Error Paths**

Happy paths get tested naturally during development. Error paths get tested only when you write them intentionally. Network failures, permission denials, invalid input, timeout scenarios — these are where production bugs live.

```typescript
// __tests__/api/users.test.ts
import { POST } from "@/app/api/users/route";
import { NextRequest } from "next/server";

describe("POST /api/users error paths", () => {
  it("returns 400 for invalid email format", async () => {
    const request = new NextRequest("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", name: "Test" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toContainEqual(
      expect.objectContaining({ field: "email" })
    );
  });

  it("returns 409 when email already exists", async () => {
    // First creation succeeds
    const request1 = new NextRequest("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ email: "dupe@test.com", name: "First" }),
    });
    await POST(request1);

    // Second creation with same email fails
    const request2 = new NextRequest("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ email: "dupe@test.com", name: "Second" }),
    });

    const response = await POST(request2);
    expect(response.status).toBe(409);
  });

  it("returns 401 when auth token is missing", async () => {
    const request = new NextRequest("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", name: "Test" }),
      // No Authorization header
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

**Integration Points**

Anywhere your code crosses a boundary — database queries, third-party APIs, message queues, file systems — deserves integration testing. These are the seams where assumptions diverge from reality.

**Database Queries**

Complex queries with joins, aggregations, or conditional logic should be tested against a real database (or a test database with the same schema). ORMs can generate surprising SQL. Verify the query returns what you expect.

```typescript
// __tests__/integration/user-repository.test.ts
import { db } from "@/lib/db";
import { createUser, findUsersByOrg, deactivateStaleUsers } from "@/lib/repositories/user";

// Use a test database — reset between tests
beforeEach(async () => {
  await db.user.deleteMany();
  await db.organization.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});

describe("User Repository", () => {
  it("finds users by organization with role filter", async () => {
    const org = await db.organization.create({ data: { name: "Acme" } });
    await db.user.createMany({
      data: [
        { name: "Admin", email: "admin@acme.com", orgId: org.id, role: "admin" },
        { name: "Member", email: "member@acme.com", orgId: org.id, role: "member" },
        { name: "Other", email: "other@other.com", orgId: "other-org", role: "admin" },
      ],
    });

    const admins = await findUsersByOrg(org.id, { role: "admin" });

    expect(admins).toHaveLength(1);
    expect(admins[0].name).toBe("Admin");
  });

  it("deactivates users who have not logged in for 90 days", async () => {
    const ninetyOneDaysAgo = new Date();
    ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);

    await db.user.createMany({
      data: [
        { name: "Stale", email: "stale@test.com", lastLoginAt: ninetyOneDaysAgo, status: "active" },
        { name: "Active", email: "active@test.com", lastLoginAt: recentDate, status: "active" },
      ],
    });

    const deactivated = await deactivateStaleUsers(90);

    expect(deactivated).toBe(1);
    const staleUser = await db.user.findFirst({ where: { email: "stale@test.com" } });
    expect(staleUser?.status).toBe("inactive");
  });
});
```

### 3. What NOT to Test

Testing everything is not a virtue. It is a maintenance burden that slows your team down. Some things are not worth testing, and testing them can actively harm your codebase by making it resistant to refactoring.

**Implementation Details**

Never test how something works internally. Test what it does from the outside. If you test that a component calls `setState` three times or that an internal variable changes, you cannot refactor without breaking tests — even if the behavior is identical.

```typescript
// WRONG: Testing implementation details
it("calls setCount when button is clicked", () => {
  const setCount = vi.fn();
  vi.spyOn(React, "useState").mockReturnValue([0, setCount]);

  render(<Counter />);
  fireEvent.click(screen.getByRole("button"));

  // This tests HOW it works, not WHAT it does
  expect(setCount).toHaveBeenCalledWith(1);
});

// RIGHT: Testing behavior
it("increments the displayed count when button is clicked", async () => {
  const user = userEvent.setup();
  render(<Counter />);

  expect(screen.getByText("Count: 0")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /increment/i }));
  expect(screen.getByText("Count: 1")).toBeInTheDocument();
});
```

**Framework Internals**

Do not test that React renders a component, that Next.js routes work, that Prisma connects to a database, or that Express parses JSON. These are the framework's responsibility. If you find yourself writing a test that would fail only if the framework has a bug, delete it.

**Trivial Code**

Getters, setters, simple mappings, type aliases, and pass-through functions do not need tests. If the function is so simple that the test is a restatement of the implementation, skip it.

```typescript
// Do NOT test this — it is a trivial getter
export function getUserDisplayName(user: User): string {
  return user.name;
}

// DO test this — it has logic and edge cases
export function getUserDisplayName(user: User): string {
  if (user.name) return user.name;
  if (user.email) return user.email.split("@")[0];
  return `User #${user.id.slice(0, 8)}`;
}
```

**Third-Party Library Internals**

Do not test that `lodash.groupBy` groups correctly, that `date-fns.format` formats dates correctly, or that `zod.parse` validates schemas correctly. Test your code that uses these libraries, not the libraries themselves.

**CSS Styling**

Do not write tests that assert CSS class names, inline styles, or pixel dimensions. Styles are a visual concern best verified with visual regression testing (Chromatic, Percy) or manual review. Testing `expect(element).toHaveClass("bg-blue-500")` couples your tests to your CSS framework and breaks on every style change.

**The Litmus Test**

Before writing a test, ask: "If I refactor the internals without changing the behavior, will this test break?" If yes, you are testing implementation details. Rewrite the test to focus on observable behavior.

### 4. Test-Driven Development (TDD)

TDD is a discipline where you write the test before the code. It sounds counterintuitive but produces cleaner APIs, better design, and fewer bugs — when applied in the right contexts.

**The Red-Green-Refactor Cycle**

1. **Red** — Write a failing test that describes the desired behavior
2. **Green** — Write the minimum code to make the test pass
3. **Refactor** — Clean up the code while keeping all tests green

The cycle is small. Each iteration should take 1-5 minutes. If you are spending 30 minutes on the "green" step, your test is too ambitious.

**TDD for API Endpoints**

API endpoints are excellent candidates for TDD because the contract (request in, response out) is clear before implementation begins.

```typescript
// Step 1: RED — Write the test first
// __tests__/api/posts/publish.test.ts
import { PATCH } from "@/app/api/posts/[id]/publish/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createTestUser, createTestPost, authenticatedRequest } from "@/test/helpers";

describe("PATCH /api/posts/:id/publish", () => {
  let userId: string;
  let postId: string;

  beforeEach(async () => {
    await db.post.deleteMany();
    await db.user.deleteMany();
    userId = (await createTestUser()).id;
    postId = (await createTestPost({ authorId: userId, status: "draft" })).id;
  });

  it("publishes a draft post and sets publishedAt timestamp", async () => {
    const request = authenticatedRequest(
      `http://localhost/api/posts/${postId}/publish`,
      { method: "PATCH" },
      userId
    );

    const response = await PATCH(request, { params: Promise.resolve({ id: postId }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("published");
    expect(body.data.publishedAt).toBeTruthy();
  });

  it("returns 404 for non-existent post", async () => {
    const request = authenticatedRequest(
      "http://localhost/api/posts/nonexistent/publish",
      { method: "PATCH" },
      userId
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when user does not own the post", async () => {
    const otherUser = await createTestUser({ email: "other@test.com" });
    const request = authenticatedRequest(
      `http://localhost/api/posts/${postId}/publish`,
      { method: "PATCH" },
      otherUser.id
    );

    const response = await PATCH(request, { params: Promise.resolve({ id: postId }) });

    expect(response.status).toBe(403);
  });

  it("returns 409 when post is already published", async () => {
    // Publish it first
    await db.post.update({
      where: { id: postId },
      data: { status: "published", publishedAt: new Date() },
    });

    const request = authenticatedRequest(
      `http://localhost/api/posts/${postId}/publish`,
      { method: "PATCH" },
      userId
    );

    const response = await PATCH(request, { params: Promise.resolve({ id: postId }) });

    expect(response.status).toBe(409);
  });
});
```

```typescript
// Step 2: GREEN — Implement the minimum code to pass
// app/api/posts/[id]/publish/route.ts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (!session) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });

  if (!post) {
    return apiError("NOT_FOUND", "Post not found", 404);
  }

  if (post.authorId !== session.userId) {
    return apiError("FORBIDDEN", "You can only publish your own posts", 403);
  }

  if (post.status === "published") {
    return apiError("CONFLICT", "Post is already published", 409);
  }

  const updated = await db.post.update({
    where: { id },
    data: { status: "published", publishedAt: new Date() },
  });

  return apiSuccess(updated);
}

// Step 3: REFACTOR — Extract shared authorization logic, add logging, etc.
```

**TDD for React Components**

TDD works for components when you think in terms of user behavior rather than rendering details. Write tests that describe what the user should see and do.

```typescript
// Step 1: RED — Describe the behavior
// __tests__/components/search-autocomplete.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";

describe("SearchAutocomplete", () => {
  it("shows suggestions after user types at least 2 characters", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/search/suggestions", ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q");
        return HttpResponse.json({
          data: [
            { id: "1", title: `Result for ${q}` },
            { id: "2", title: `Another ${q} result` },
          ],
        });
      })
    );

    render(<SearchAutocomplete />);

    const input = screen.getByRole("combobox", { name: /search/i });

    // Type one character — no suggestions yet
    await user.type(input, "a");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    // Type second character — suggestions appear
    await user.type(input, "b");
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    expect(screen.getByText("Result for ab")).toBeInTheDocument();
  });

  it("calls onSelect when user picks a suggestion", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    server.use(
      http.get("/api/search/suggestions", () => {
        return HttpResponse.json({
          data: [{ id: "1", title: "TypeScript Guide" }],
        });
      })
    );

    render(<SearchAutocomplete onSelect={onSelect} />);

    await user.type(screen.getByRole("combobox", { name: /search/i }), "type");
    await waitFor(() => {
      expect(screen.getByText("TypeScript Guide")).toBeInTheDocument();
    });

    await user.click(screen.getByText("TypeScript Guide"));

    expect(onSelect).toHaveBeenCalledWith({ id: "1", title: "TypeScript Guide" });
  });
});
```

**When TDD Helps vs Hurts**

TDD helps when:
- The requirements are clear (API contracts, business rules, algorithms)
- You are building a library or utility with well-defined inputs and outputs
- You are fixing a bug (write the test that reproduces the bug, then fix it)
- The design is uncertain — writing tests first forces you to think about the API before the implementation

TDD hurts when:
- You are exploring or prototyping and the design is not settled
- You are working on UI layout or visual design (use visual testing instead)
- The cost of writing the test exceeds the cost of the bug (trivial code)
- You are working with heavy framework magic where testing setup is expensive (write tests after, not before)

The pragmatic approach: use TDD for business logic, API endpoints, and bug fixes. Use test-after for UI components and exploratory code. Never skip testing entirely.

### 5. Behavior-Driven Development (BDD)

BDD extends TDD by writing tests in a language that non-technical stakeholders can read. The canonical format is Given-When-Then, which maps to Arrange-Act-Assert but reads like a specification.

**Given-When-Then Format**

```
Given a user is logged in
  And the user has items in their cart
When the user clicks "Checkout"
Then the checkout page should display the cart summary
  And the total should include tax
  And a "Place Order" button should be visible
```

This format serves two purposes: it is a specification that product managers can review, and it is a test that developers can automate.

**Implementing BDD with Vitest**

You do not need Cucumber to practice BDD. The Given-When-Then structure maps directly to `describe`/`it` blocks with clear naming.

```typescript
// __tests__/checkout-flow.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutPage } from "@/components/checkout-page";
import { CartProvider } from "@/contexts/cart";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";

describe("Checkout Flow", () => {
  // Given: A logged-in user with items in their cart
  const setupCartWithItems = () => {
    server.use(
      http.get("/api/cart", () => {
        return HttpResponse.json({
          data: {
            items: [
              { id: "item-1", name: "Widget", priceInCents: 2999, quantity: 2 },
              { id: "item-2", name: "Gadget", priceInCents: 4999, quantity: 1 },
            ],
            subtotalInCents: 10997,
            taxInCents: 935,
            totalInCents: 11932,
          },
        });
      })
    );
  };

  describe("Given a user with items in their cart", () => {
    beforeEach(() => {
      setupCartWithItems();
    });

    describe("When the checkout page loads", () => {
      it("Then it displays the cart summary with item names and quantities", async () => {
        render(
          <CartProvider>
            <CheckoutPage />
          </CartProvider>
        );

        await waitFor(() => {
          expect(screen.getByText("Widget")).toBeInTheDocument();
          expect(screen.getByText("x2")).toBeInTheDocument();
          expect(screen.getByText("Gadget")).toBeInTheDocument();
          expect(screen.getByText("x1")).toBeInTheDocument();
        });
      });

      it("Then the total includes tax", async () => {
        render(
          <CartProvider>
            <CheckoutPage />
          </CartProvider>
        );

        await waitFor(() => {
          expect(screen.getByText("$9.35")).toBeInTheDocument(); // Tax
          expect(screen.getByText("$119.32")).toBeInTheDocument(); // Total
        });
      });

      it("Then a Place Order button is visible", async () => {
        render(
          <CartProvider>
            <CheckoutPage />
          </CartProvider>
        );

        await waitFor(() => {
          expect(
            screen.getByRole("button", { name: /place order/i })
          ).toBeInTheDocument();
        });
      });
    });
  });
});
```

**Cucumber/Gherkin Patterns**

For teams that want formal specification documents or need to share specs with non-technical stakeholders, Cucumber with Gherkin syntax provides a structured approach. Feature files are written in plain English and mapped to step definitions in code.

```gherkin
# features/checkout.feature
Feature: Checkout Process
  As a customer with items in my cart
  I want to complete checkout
  So that I can receive my order

  Background:
    Given I am logged in as "customer@example.com"

  Scenario: Successful checkout with valid payment
    Given I have the following items in my cart:
      | Product   | Quantity | Price  |
      | Widget    | 2        | $29.99 |
      | Gadget    | 1        | $49.99 |
    When I navigate to the checkout page
    Then I should see the order total of "$119.32"
    When I enter valid payment details
    And I click "Place Order"
    Then I should see an order confirmation
    And I should receive a confirmation email

  Scenario: Checkout fails with expired card
    Given I have 1 "Widget" in my cart
    When I navigate to the checkout page
    And I enter an expired credit card
    And I click "Place Order"
    Then I should see the error "Your card has expired"
    And no order should be created
```

```typescript
// features/step-definitions/checkout.steps.ts
import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

Given("I am logged in as {string}", async function (email: string) {
  await this.page.goto("/login");
  await this.page.fill('[name="email"]', email);
  await this.page.fill('[name="password"]', "test-password");
  await this.page.click('button[type="submit"]');
  await this.page.waitForURL("/dashboard");
});

Given("I have the following items in my cart:", async function (dataTable) {
  const items = dataTable.hashes();
  for (const item of items) {
    await this.addToCart(item.Product, parseInt(item.Quantity));
  }
});

When("I navigate to the checkout page", async function () {
  await this.page.goto("/checkout");
  await this.page.waitForLoadState("networkidle");
});

Then("I should see the order total of {string}", async function (total: string) {
  const totalElement = this.page.getByTestId("order-total");
  await expect(totalElement).toHaveText(total);
});
```

**When to Use BDD**

BDD is valuable when:
- Multiple stakeholders (product, design, QA, engineering) need to agree on behavior
- You want living documentation that is always in sync with the code
- Acceptance criteria are complex and benefit from structured specification
- You are building a product with extensive business rules

BDD is overhead when:
- You are a small team where developers also define requirements
- The feature is straightforward and well-understood
- The Gherkin layer adds translation cost without adding clarity

### 6. Test Doubles Taxonomy

A "test double" is any object that replaces a real dependency in a test. The term comes from the film industry (stunt double). There are five types, and using the wrong one makes tests brittle, misleading, or useless.

**Mocks**

Mocks verify that specific interactions occurred. They record calls and let you assert that a function was called with specific arguments a specific number of times. Use mocks when the interaction itself is the behavior you are testing.

```typescript
// Testing that an analytics event fires when a user signs up
import { trackEvent } from "@/lib/analytics";
import { signUpUser } from "@/lib/auth";

vi.mock("@/lib/analytics");

describe("signUpUser", () => {
  it("tracks a signup event with the user email", async () => {
    const mockTrack = vi.mocked(trackEvent);

    await signUpUser({ email: "new@user.com", password: "secure-pass-123" });

    // The interaction IS the behavior we care about
    expect(mockTrack).toHaveBeenCalledWith("user_signed_up", {
      email: "new@user.com",
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
```

**Stubs**

Stubs provide canned responses to calls. They do not verify interactions — they just return predetermined data so the code under test can proceed. Use stubs when you need to control what a dependency returns.

```typescript
// Stubbing a payment gateway to test checkout logic
import { PaymentGateway } from "@/lib/payment-gateway";
import { processCheckout } from "@/lib/checkout";

describe("processCheckout", () => {
  it("creates an order when payment succeeds", async () => {
    // Stub: we do not care how many times charge() is called,
    // we just need it to return a success response
    const gateway: PaymentGateway = {
      charge: vi.fn().mockResolvedValue({
        success: true,
        transactionId: "txn_123",
        amount: 5999,
      }),
      refund: vi.fn(),
    };

    const result = await processCheckout({
      cartId: "cart-1",
      paymentMethodId: "pm_test",
      gateway,
    });

    expect(result.status).toBe("confirmed");
    expect(result.transactionId).toBe("txn_123");
  });

  it("does not create an order when payment fails", async () => {
    const gateway: PaymentGateway = {
      charge: vi.fn().mockResolvedValue({
        success: false,
        error: "insufficient_funds",
      }),
      refund: vi.fn(),
    };

    const result = await processCheckout({
      cartId: "cart-1",
      paymentMethodId: "pm_test",
      gateway,
    });

    expect(result.status).toBe("payment_failed");
    expect(result.error).toBe("insufficient_funds");
  });
});
```

**Fakes**

Fakes are working implementations that take shortcuts unsuitable for production. An in-memory database, a local file system instead of S3, or a fake SMTP server are all fakes. They have real behavior but are simplified.

```typescript
// A fake repository that stores data in memory instead of a real database
export class FakeUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async create(data: CreateUserInput): Promise<User> {
    const id = `user_${this.users.size + 1}`;
    const user: User = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User ${id} not found`);
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Test helper — not part of the interface
  clear(): void {
    this.users.clear();
  }
}

// Usage in tests
describe("UserService", () => {
  const repo = new FakeUserRepository();
  const service = new UserService(repo);

  beforeEach(() => repo.clear());

  it("creates a user and retrieves it by email", async () => {
    await service.register({ email: "test@example.com", name: "Test" });
    const user = await service.findByEmail("test@example.com");

    expect(user).toBeTruthy();
    expect(user?.name).toBe("Test");
  });
});
```

**Spies**

Spies wrap a real implementation and record calls without changing behavior. The real function still executes, but you can verify it was called. Use spies when you want the real behavior plus observability.

```typescript
// Spy on console.error to verify error logging without suppressing output
describe("ErrorBoundary", () => {
  it("logs the error when a child component throws", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const ThrowingComponent = () => {
      throw new Error("Component crashed");
    };

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Component crashed"),
      expect.anything()
    );

    consoleSpy.mockRestore();
  });
});
```

**Dummies**

Dummies are objects passed to satisfy a parameter requirement but never actually used. They fill type signatures.

```typescript
// The logger is required by the constructor but not relevant to this test
const dummyLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

describe("OrderProcessor", () => {
  it("calculates the correct total", () => {
    // Logger is injected but not used in calculateTotal
    const processor = new OrderProcessor(dummyLogger);

    const total = processor.calculateTotal([
      { priceInCents: 1000, quantity: 2 },
      { priceInCents: 500, quantity: 3 },
    ]);

    expect(total).toBe(3500);
  });
});
```

**When to Use Each**

| Double | Purpose | Use When |
|--------|---------|----------|
| Mock | Verify interactions | The call itself is the behavior (analytics, notifications, audit logs) |
| Stub | Control return values | You need a dependency to return specific data |
| Fake | Simplified real implementation | You want real behavior without infrastructure (in-memory DB, fake API) |
| Spy | Observe real calls | You want the real behavior but need to verify it happened |
| Dummy | Fill parameters | A parameter is required but irrelevant to the test |

**Over-Mocking Pitfalls**

The most dangerous testing antipattern is mocking so much that your test verifies only that your mocks are wired correctly. Signs of over-mocking:

- The test passes even when the production code is broken
- Every refactor breaks the test even though behavior is unchanged
- You are mocking the thing you are trying to test
- The test setup is longer than the actual assertions
- The test reads like a reimplementation of the code under test

Rule of thumb: mock at the boundary (network, database, file system, third-party APIs), not at internal module boundaries. If you are mocking a function defined in the same codebase, question whether the mock is necessary.

### 7. Risk-Based Testing

You cannot test everything. Risk-based testing is the discipline of investing your testing budget where bugs would cause the most damage.

**Risk Assessment Matrix**

For each feature or component, assess two dimensions:

| | Low Impact | High Impact |
|---|---|---|
| **High Likelihood** | Test moderately | Test extensively |
| **Low Likelihood** | Skip or test minimally | Test moderately |

- **Likelihood** = how likely is this code to have a bug? (Complexity, change frequency, developer unfamiliarity)
- **Impact** = how bad is it if this code has a bug? (Data loss, revenue loss, security breach, user trust)

**Prioritizing What to Test**

High priority (test extensively):
- Payment processing and billing logic
- Authentication and authorization
- Data mutation endpoints (create, update, delete)
- Security-critical code (input validation, encryption, access control)
- Core business logic (pricing, eligibility, scheduling)
- Data migration scripts

Medium priority (test moderately):
- Search and filtering
- Notification delivery
- Admin dashboards
- Reporting and analytics aggregation
- Third-party API integrations

Lower priority (test selectively):
- Static content pages
- Pure UI presentation (test visually, not programmatically)
- Configuration files
- Development tooling

**Critical Path Testing**

Identify the critical user journeys in your application — the paths that, if broken, make the product unusable or cost money. These get the highest testing investment, including E2E tests.

```typescript
// e2e/critical-paths/purchase-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Critical Path: Purchase Flow", () => {
  test("user can browse, add to cart, checkout, and receive confirmation", async ({
    page,
  }) => {
    // Browse products
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: /products/i })).toBeVisible();

    // Select a product
    await page.click('[data-testid="product-card-widget-pro"]');
    await expect(page.getByRole("heading", { name: /widget pro/i })).toBeVisible();

    // Add to cart
    await page.click('button:has-text("Add to Cart")');
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    // Go to checkout
    await page.click('[data-testid="cart-icon"]');
    await page.click('a:has-text("Checkout")');
    await expect(page).toHaveURL(/\/checkout/);

    // Fill shipping info
    await page.fill('[name="address"]', "123 Test St");
    await page.fill('[name="city"]', "Portland");
    await page.selectOption('[name="state"]', "OR");
    await page.fill('[name="zip"]', "97201");

    // Fill payment (test card)
    await page.fill('[name="cardNumber"]', "4242424242424242");
    await page.fill('[name="expiry"]', "12/28");
    await page.fill('[name="cvc"]', "123");

    // Place order
    await page.click('button:has-text("Place Order")');

    // Verify confirmation
    await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("order-number")).toBeVisible();
  });

  test("user sees error for declined card", async ({ page }) => {
    // ... setup cart
    await page.goto("/checkout");

    // Use Stripe's decline test card
    await page.fill('[name="cardNumber"]', "4000000000000002");
    await page.fill('[name="expiry"]', "12/28");
    await page.fill('[name="cvc"]', "123");

    await page.click('button:has-text("Place Order")');

    await expect(page.getByText(/card was declined/i)).toBeVisible();
  });
});
```

### 8. Testing in CI/CD

A fast, reliable CI pipeline is the backbone of a productive team. The order in which you run checks matters because you want the cheapest, fastest checks to fail first.

**Recommended Test Ordering**

Run checks from fastest to slowest, cheapest to most expensive. Fail fast on the cheap stuff so you do not waste minutes waiting for E2E tests to fail on a lint error.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# Cancel in-progress runs for the same branch
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Stage 1: Static analysis (fastest, catches the most trivial errors)
  lint-and-typecheck:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint          # ESLint — catches code quality issues
      - run: pnpm typecheck     # tsc --noEmit — catches type errors
      - run: pnpm format:check  # Prettier — catches formatting issues

  # Stage 2: Unit tests (fast, no external dependencies)
  unit-tests:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit --reporter=junit --outputFile=results/unit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unit-test-results
          path: results/unit.xml

  # Stage 3: Integration tests (require database, slower)
  integration-tests:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:push  # Apply schema to test database
      - run: pnpm test:integration

  # Stage 4: E2E tests (slowest, most expensive)
  e2e-tests:
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**Parallelization**

Split your test suite into shards to run in parallel across multiple CI runners. This is especially valuable for large E2E suites.

```yaml
  # Parallel E2E tests with sharding
  e2e-tests:
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - run: pnpm test:e2e --shard=${{ matrix.shard }}/4
```

**Caching**

Cache dependencies, build artifacts, and Playwright browsers to avoid downloading them on every run.

```yaml
      # Cache Playwright browsers
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      # Cache Next.js build
      - name: Cache Next.js build
        uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
          restore-keys: |
            nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
```

**Fail-Fast Strategy**

The `concurrency` setting cancels in-progress runs when a new commit is pushed to the same branch. The `needs` dependencies ensure expensive tests never run if cheap checks fail. The `fail-fast: false` on the shard matrix ensures all shards complete even if one fails — you want to see all failures, not just the first.

### 9. Test Organization

How you organize test files determines how easy they are to find, run selectively, and maintain.

**File Naming Conventions**

Pick one convention and enforce it. The most common patterns:

```
# Co-located with source (recommended for unit and integration tests)
src/
  lib/
    pricing.ts
    pricing.test.ts          # Unit tests next to source
  components/
    cart/
      cart-summary.tsx
      cart-summary.test.tsx   # Component tests next to component
  app/
    api/
      posts/
        route.ts
        route.test.ts         # API route tests next to route

# Centralized E2E tests (recommended for E2E)
e2e/
  critical-paths/
    purchase-flow.spec.ts
    auth-flow.spec.ts
  smoke/
    health-check.spec.ts

# Test utilities and fixtures
test/
  helpers.ts                  # Shared test utilities
  fixtures/                   # Test data factories
    users.ts
    posts.ts
  mocks/
    handlers.ts               # MSW request handlers
    server.ts                 # MSW server setup
```

**Co-Location vs Centralized Tests**

Co-located tests (test file next to source file) are easier to find and maintain. When you open `pricing.ts`, the test file is right there. When you delete a component, the test goes with it. This is the recommended approach for unit and integration tests.

Centralized tests (all tests in a `__tests__` or `test` directory) are useful for E2E tests and cross-cutting integration tests that do not map 1:1 to source files.

**Test Grouping and Tagging**

Use `describe` blocks to group related tests. Use custom tags or file naming patterns to run subsets of tests.

```typescript
// vitest.config.ts — define test projects for different scopes
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run different test types with different commands
    // pnpm test:unit, pnpm test:integration
  },
});
```

```json
// package.json — scripts for running test subsets
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest --project unit",
    "test:integration": "vitest --project integration",
    "test:e2e": "playwright test",
    "test:e2e:smoke": "playwright test --grep @smoke",
    "test:coverage": "vitest --coverage"
  }
}
```

```typescript
// Tag E2E tests for selective execution
import { test } from "@playwright/test";

test("user can log in @smoke @critical", async ({ page }) => {
  // This test runs when you filter by @smoke or @critical
});

test("user can update profile picture @regression", async ({ page }) => {
  // This test only runs in the full regression suite
});
```

**Recommended Folder Structure**

```
project-root/
  src/
    lib/
      pricing.ts
      pricing.test.ts
      search.ts
      search.test.ts
    components/
      product-card.tsx
      product-card.test.tsx
    app/
      api/
        posts/
          route.ts
          route.test.ts
  e2e/
    auth.spec.ts
    checkout.spec.ts
    search.spec.ts
  test/
    setup.ts                    # Global test setup (vi.setup, MSW, etc.)
    helpers.ts                  # createTestUser(), authenticatedRequest(), etc.
    fixtures/
      users.ts                  # Factory functions for test data
      posts.ts
    mocks/
      handlers.ts               # Default MSW handlers
      server.ts                 # MSW server instance
  vitest.config.ts
  playwright.config.ts
```

### 10. Flaky Test Management

Flaky tests are tests that pass and fail intermittently without any code change. They erode trust in the test suite. When developers stop trusting tests, they stop paying attention to failures, and real bugs slip through.

**Common Causes of Flaky Tests**

1. **Timing and race conditions** — Tests that depend on setTimeout, animations, or network responses arriving in a specific order
2. **Shared mutable state** — Tests that modify global state (database, environment variables, singletons) and affect other tests
3. **Non-deterministic data** — Tests that depend on `Date.now()`, `Math.random()`, or auto-generated IDs
4. **Network dependencies** — Tests that call real APIs, which can be slow, rate-limited, or down
5. **Order dependence** — Tests that pass only when run in a specific sequence
6. **Resource contention** — Tests that compete for ports, files, or database rows

**Identifying Flaky Tests**

```typescript
// vitest.config.ts — run tests multiple times to find flaky ones
export default defineConfig({
  test: {
    // Retry failing tests to identify flakiness
    retry: 2,
    // Report retried tests so you can track them
    reporters: ["default", "json"],
  },
});
```

```yaml
# CI: Run the full suite multiple times on a schedule to catch flakiness
name: Flaky Test Detection
on:
  schedule:
    - cron: "0 6 * * 1"  # Every Monday at 6 AM
jobs:
  detect-flaky:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        run: [1, 2, 3, 4, 5]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit --reporter=json --outputFile=results/run-${{ matrix.run }}.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: flaky-detection-${{ matrix.run }}
          path: results/
```

**Quarantine Strategy**

When a test is identified as flaky, do not delete it and do not let it block deployments. Quarantine it: mark it as skipped with a tracking issue, fix the root cause, and restore it.

```typescript
// Quarantine a flaky test with a tracking issue
describe("NotificationService", () => {
  // QUARANTINED: Flaky due to race condition in WebSocket teardown
  // Tracking: https://github.com/org/repo/issues/342
  // Quarantined: 2026-02-15
  it.skip("delivers real-time notification when new message arrives", async () => {
    // ... flaky test
  });

  // Non-flaky tests continue to run
  it("queues notification for offline users", async () => {
    // ... stable test
  });
});
```

**Fixing Common Flaky Patterns**

```typescript
// FLAKY: Using hardcoded timeouts
it("shows loading then content", async () => {
  render(<DataList />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 1000)); // Arbitrary wait
  expect(screen.getByText("Item 1")).toBeInTheDocument(); // Might not be ready
});

// FIXED: Use waitFor to poll for the expected state
it("shows loading then content", async () => {
  render(<DataList />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });
});
```

```typescript
// FLAKY: Shared database state between tests
describe("UserService", () => {
  it("creates a user", async () => {
    await userService.create({ email: "test@test.com", name: "Test" });
    const user = await userService.findByEmail("test@test.com");
    expect(user).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    // This fails if it runs before the test above, passes if after
    await expect(
      userService.create({ email: "test@test.com", name: "Dupe" })
    ).rejects.toThrow();
  });
});

// FIXED: Clean state before each test
describe("UserService", () => {
  beforeEach(async () => {
    await db.user.deleteMany();
  });

  it("creates a user", async () => {
    await userService.create({ email: "test@test.com", name: "Test" });
    const user = await userService.findByEmail("test@test.com");
    expect(user).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    // Now independent — creates its own prerequisite data
    await userService.create({ email: "test@test.com", name: "First" });
    await expect(
      userService.create({ email: "test@test.com", name: "Dupe" })
    ).rejects.toThrow();
  });
});
```

```typescript
// FLAKY: Test depends on current time
it("formats relative time correctly", () => {
  const result = formatRelativeTime(new Date("2026-03-01T10:00:00Z"));
  expect(result).toBe("2 days ago"); // Fails tomorrow
});

// FIXED: Control the clock
it("formats relative time correctly", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-03T10:00:00Z"));

  const result = formatRelativeTime(new Date("2026-03-01T10:00:00Z"));
  expect(result).toBe("2 days ago");

  vi.useRealTimers();
});
```

### 11. Contract Testing

Contract testing verifies that two services agree on the shape and behavior of their communication. It is the testing technique that prevents "it works on my machine" when one team changes an API and breaks another team's consumer.

**API Contract Testing with Pact**

Pact is the standard tool for consumer-driven contract testing. The consumer defines what it expects from the provider, and the provider verifies it can fulfill those expectations.

```typescript
// Consumer side: Frontend defines what it expects from the API
// __tests__/contracts/user-api.consumer.test.ts
import { PactV4, MatchersV3 } from "@pact-foundation/pact";
import { fetchUser } from "@/lib/api/users";

const { like, eachLike, string, integer, timestamp } = MatchersV3;

const provider = new PactV4({
  consumer: "WebApp",
  provider: "UserService",
  dir: "./pacts", // Generated contract files go here
});

describe("User API Contract", () => {
  it("returns a user by ID", async () => {
    // Define the expected interaction
    await provider
      .addInteraction()
      .given("a user with ID user-1 exists")
      .uponReceiving("a request for user user-1")
      .withRequest("GET", "/api/v1/users/user-1", (builder) => {
        builder.headers({ Accept: "application/json" });
      })
      .willRespondWith(200, (builder) => {
        builder
          .headers({ "Content-Type": "application/json" })
          .jsonBody({
            data: {
              id: string("user-1"),
              name: string("Alice"),
              email: string("alice@example.com"),
              role: string("admin"),
              createdAt: timestamp("2026-01-15T10:30:00Z"),
            },
          });
      })
      .executeTest(async (mockServer) => {
        // Run the real consumer code against the mock server
        const user = await fetchUser("user-1", {
          baseUrl: mockServer.url,
        });

        expect(user.id).toBe("user-1");
        expect(user.name).toBe("Alice");
        expect(user.email).toBe("alice@example.com");
      });
  });

  it("returns 404 for non-existent user", async () => {
    await provider
      .addInteraction()
      .given("no user with ID nonexistent exists")
      .uponReceiving("a request for a non-existent user")
      .withRequest("GET", "/api/v1/users/nonexistent")
      .willRespondWith(404, (builder) => {
        builder.jsonBody({
          error: {
            code: string("NOT_FOUND"),
            message: string("User not found"),
          },
        });
      })
      .executeTest(async (mockServer) => {
        await expect(
          fetchUser("nonexistent", { baseUrl: mockServer.url })
        ).rejects.toThrow("User not found");
      });
  });
});
```

```typescript
// Provider side: The API verifies it can fulfill the contract
// __tests__/contracts/user-api.provider.test.ts
import { Verifier } from "@pact-foundation/pact";
import { startTestServer } from "@/test/helpers";

describe("User API Provider Verification", () => {
  let serverUrl: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const server = await startTestServer();
    serverUrl = server.url;
    cleanup = server.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  it("fulfills the WebApp consumer contract", async () => {
    await new Verifier({
      providerBaseUrl: serverUrl,
      pactUrls: ["./pacts/WebApp-UserService.json"],
      // Set up provider states (seed the database for each scenario)
      stateHandlers: {
        "a user with ID user-1 exists": async () => {
          await db.user.upsert({
            where: { id: "user-1" },
            create: { id: "user-1", name: "Alice", email: "alice@example.com", role: "admin" },
            update: {},
          });
        },
        "no user with ID nonexistent exists": async () => {
          await db.user.deleteMany({ where: { id: "nonexistent" } });
        },
      },
    }).verifyProvider();
  });
});
```

**Consumer-Driven Contracts**

The key insight of consumer-driven contracts is that the consumer defines the contract, not the provider. This inverts the traditional relationship: instead of the API team defining what they will expose and consumers adapting, the consumers define what they need and the provider verifies it can deliver.

This works because:
- Providers often expose more than any single consumer needs
- Breaking changes are caught at the exact point of impact
- Each consumer tests only the fields and behaviors it depends on
- Contracts are published to a Pact Broker so both sides can verify independently

```
Consumer writes test  -->  Pact file generated  -->  Published to Pact Broker
                                                            |
Provider pulls contract  <--  Verifies against real API  <--+
```

### 12. Testing Microservices

Testing microservices is harder than testing a monolith because boundaries are network calls, each service has its own database, and failures cascade. The strategies differ depending on what you are verifying.

**Unit Testing Within a Service**

Unit tests inside a microservice work the same as in any application. Test business logic, validate input handling, check error paths. Nothing special here.

**Integration Testing Across Services**

The challenge is testing that Service A correctly communicates with Service B without requiring both to be running. There are three approaches:

1. **Contract testing** (preferred for inter-service APIs) — covered in the previous section
2. **Service virtualization** — replace downstream services with lightweight simulators
3. **Full integration environment** — run all services together (expensive, slow, flaky)

**Service Virtualization with MSW**

Mock Service Worker (MSW) can simulate downstream microservices during integration tests, giving you realistic behavior without running the actual services.

```typescript
// test/mocks/handlers.ts — Simulate downstream services
import { http, HttpResponse, delay } from "msw";

export const handlers = [
  // Simulate the Payment Service
  http.post("https://payment-service.internal/api/charge", async ({ request }) => {
    const body = (await request.json()) as { amountInCents: number; token: string };

    // Simulate processing time
    await delay(100);

    // Test card tokens that trigger specific responses
    if (body.token === "tok_declined") {
      return HttpResponse.json(
        { error: { code: "CARD_DECLINED", message: "Card was declined" } },
        { status: 402 }
      );
    }

    if (body.token === "tok_timeout") {
      await delay(30000); // Will trigger timeout in the calling service
      return HttpResponse.json({});
    }

    return HttpResponse.json({
      data: {
        transactionId: `txn_${Date.now()}`,
        amountInCents: body.amountInCents,
        status: "captured",
      },
    });
  }),

  // Simulate the Inventory Service
  http.get("https://inventory-service.internal/api/stock/:productId", ({ params }) => {
    const stockLevels: Record<string, number> = {
      "prod-1": 50,
      "prod-2": 0,  // Out of stock
      "prod-3": 2,  // Low stock
    };

    const stock = stockLevels[params.productId as string];
    if (stock === undefined) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Product not found" } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      data: { productId: params.productId, available: stock },
    });
  }),

  // Simulate the Notification Service
  http.post("https://notification-service.internal/api/send", async () => {
    return HttpResponse.json({ data: { messageId: `msg_${Date.now()}` } });
  }),
];
```

```typescript
// __tests__/integration/order-service.test.ts
import { server } from "@/test/mocks/server";
import { createOrder } from "@/services/order-service";

describe("Order Service Integration", () => {
  it("creates an order when payment succeeds and stock is available", async () => {
    const order = await createOrder({
      userId: "user-1",
      items: [{ productId: "prod-1", quantity: 2 }],
      paymentToken: "tok_valid",
    });

    expect(order.status).toBe("confirmed");
    expect(order.paymentTransactionId).toMatch(/^txn_/);
  });

  it("rejects order when product is out of stock", async () => {
    await expect(
      createOrder({
        userId: "user-1",
        items: [{ productId: "prod-2", quantity: 1 }],
        paymentToken: "tok_valid",
      })
    ).rejects.toThrow("Product prod-2 is out of stock");
  });

  it("handles payment service timeout gracefully", async () => {
    const result = await createOrder({
      userId: "user-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentToken: "tok_timeout",
    });

    expect(result.status).toBe("payment_pending");
    // Order is created but marked as pending for retry
  });
});
```

**Testing Resilience Patterns**

Microservices must handle downstream failures gracefully. Test your circuit breakers, retries, and fallbacks.

```typescript
// __tests__/integration/resilience.test.ts
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { PaymentClient } from "@/clients/payment-client";

describe("Payment Client Resilience", () => {
  it("retries on 503 and succeeds on second attempt", async () => {
    let callCount = 0;

    server.use(
      http.post("https://payment-service.internal/api/charge", () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            { error: { code: "SERVICE_UNAVAILABLE" } },
            { status: 503 }
          );
        }
        return HttpResponse.json({
          data: { transactionId: "txn_retry_success", status: "captured" },
        });
      })
    );

    const client = new PaymentClient({ maxRetries: 3, retryDelayMs: 10 });
    const result = await client.charge({ amountInCents: 1000, token: "tok_valid" });

    expect(result.transactionId).toBe("txn_retry_success");
    expect(callCount).toBe(2);
  });

  it("opens circuit breaker after consecutive failures", async () => {
    server.use(
      http.post("https://payment-service.internal/api/charge", () => {
        return HttpResponse.json(
          { error: { code: "INTERNAL_ERROR" } },
          { status: 500 }
        );
      })
    );

    const client = new PaymentClient({
      maxRetries: 1,
      circuitBreakerThreshold: 3,
    });

    // First three calls hit the service and fail
    for (let i = 0; i < 3; i++) {
      await expect(
        client.charge({ amountInCents: 1000, token: "tok_valid" })
      ).rejects.toThrow();
    }

    // Fourth call fails immediately without hitting the service (circuit is open)
    await expect(
      client.charge({ amountInCents: 1000, token: "tok_valid" })
    ).rejects.toThrow("Circuit breaker is open");
  });
});
```

### 13. Building a Test Plan

A test plan is a document that maps a feature's acceptance criteria to specific test cases, with coverage requirements and responsibility assignments. Every non-trivial feature should have one.

**Template for New Features**

```typescript
// test/plans/feature-team-invitations.ts
// This is a structured test plan — not executable, but machine-readable
// and useful as a checklist for developers and reviewers.

export const testPlan = {
  feature: "Team Invitations",
  owner: "backend-team",
  reviewer: "qa-team",
  status: "in-progress",

  acceptanceCriteria: [
    {
      id: "AC-1",
      description: "Admins can invite users by email",
      testCases: [
        {
          id: "TC-1.1",
          type: "integration",
          description: "POST /api/teams/:id/invitations creates invitation and sends email",
          priority: "high",
          status: "written",
        },
        {
          id: "TC-1.2",
          type: "integration",
          description: "Returns 403 when non-admin attempts to invite",
          priority: "high",
          status: "written",
        },
        {
          id: "TC-1.3",
          type: "integration",
          description: "Returns 409 when user is already a team member",
          priority: "medium",
          status: "written",
        },
        {
          id: "TC-1.4",
          type: "integration",
          description: "Returns 400 for invalid email format",
          priority: "medium",
          status: "written",
        },
      ],
    },
    {
      id: "AC-2",
      description: "Invited users can accept invitations",
      testCases: [
        {
          id: "TC-2.1",
          type: "integration",
          description: "POST /api/invitations/:token/accept adds user to team",
          priority: "high",
          status: "written",
        },
        {
          id: "TC-2.2",
          type: "integration",
          description: "Returns 410 for expired invitation (older than 7 days)",
          priority: "high",
          status: "written",
        },
        {
          id: "TC-2.3",
          type: "integration",
          description: "Returns 404 for invalid token",
          priority: "medium",
          status: "written",
        },
        {
          id: "TC-2.4",
          type: "integration",
          description: "Returns 409 when invitation is already accepted",
          priority: "medium",
          status: "written",
        },
      ],
    },
    {
      id: "AC-3",
      description: "End-to-end invitation flow works",
      testCases: [
        {
          id: "TC-3.1",
          type: "e2e",
          description: "Admin invites user, user receives email, clicks link, joins team",
          priority: "critical",
          status: "pending",
        },
      ],
    },
  ],

  coverageRequirements: {
    unit: "90% for lib/invitations/*",
    integration: "All API endpoints and error paths",
    e2e: "Critical path: invite -> accept -> team membership",
  },

  risks: [
    "Email delivery failure — mitigated by retry queue",
    "Race condition if two people accept same invitation — mitigated by database unique constraint",
    "Token brute force — mitigated by rate limiting on accept endpoint",
  ],
};
```

**Acceptance Criteria to Test Cases**

The process for converting acceptance criteria into test cases:

1. **Read the acceptance criterion** — "Admins can invite users by email"
2. **Identify the happy path** — Admin sends valid email, invitation is created, email is sent
3. **Identify error paths** — Invalid email, non-admin user, already a member, rate limited
4. **Identify edge cases** — Inviting yourself, inviting to a full team, unicode email addresses
5. **Identify security paths** — Missing auth, expired tokens, tampered tokens
6. **Assign test types** — Business logic gets unit tests, API behavior gets integration tests, critical flows get E2E tests
7. **Assign priorities** — Critical (blocks release), high (should fix), medium (nice to have)

```typescript
// Example: Converting "Users can reset their password" into test cases
describe("Password Reset", () => {
  // Happy path
  describe("requesting a password reset", () => {
    it("sends a reset email when the email exists", async () => { /* ... */ });
    it("returns 200 even when the email does not exist (prevents enumeration)", async () => { /* ... */ });
    it("rate limits requests to 3 per hour per email", async () => { /* ... */ });
  });

  // Using the reset token
  describe("resetting the password", () => {
    it("allows password change with a valid token", async () => { /* ... */ });
    it("rejects expired tokens (older than 1 hour)", async () => { /* ... */ });
    it("rejects already-used tokens", async () => { /* ... */ });
    it("rejects tokens with tampered signatures", async () => { /* ... */ });
    it("enforces password complexity requirements", async () => { /* ... */ });
    it("invalidates all existing sessions after password change", async () => { /* ... */ });
  });

  // Edge cases
  describe("edge cases", () => {
    it("handles concurrent reset requests for the same email", async () => { /* ... */ });
    it("handles password reset for accounts with social login only", async () => { /* ... */ });
  });
});
```

**Coverage Requirements**

Coverage is a useful signal but a terrible goal. Aim for meaningful coverage of critical code, not 100% coverage of everything.

Recommended thresholds:
- **Business logic** (pricing, permissions, validation): 90-100%
- **API endpoints**: 80-90% (all status codes, all error paths)
- **UI components**: 70-80% (user-facing behavior, not rendering details)
- **Utilities and helpers**: 90-100% (they are small and easy to test)
- **Configuration and glue code**: 0-50% (not worth testing)

```typescript
// vitest.config.ts — coverage configuration
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/index.ts",     // Re-export barrels
        "src/**/*.d.ts",       // Type declarations
        "src/test/**",         // Test utilities
        "src/mocks/**",        // MSW mocks
      ],
      thresholds: {
        // Global thresholds — CI fails if these are not met
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      },
    },
  },
});
```

### 14. Common Testing Patterns and Helpers

Production test suites share common infrastructure: factories for test data, authenticated request helpers, database cleanup, and custom matchers. Investing in this infrastructure pays dividends across every test you write.

**Test Data Factories**

Never hardcode test data inline. Use factory functions that produce valid default data with the ability to override specific fields.

```typescript
// test/fixtures/users.ts
import { db } from "@/lib/db";
import { faker } from "@faker-js/faker";

interface CreateTestUserInput {
  name?: string;
  email?: string;
  role?: "admin" | "member" | "viewer";
  orgId?: string;
}

export async function createTestUser(overrides: CreateTestUserInput = {}) {
  return db.user.create({
    data: {
      name: overrides.name ?? faker.person.fullName(),
      email: overrides.email ?? faker.internet.email(),
      role: overrides.role ?? "member",
      orgId: overrides.orgId ?? undefined,
      passwordHash: "$2b$10$test-hash", // Pre-computed hash for "test-password"
    },
  });
}

// test/fixtures/posts.ts
interface CreateTestPostInput {
  title?: string;
  content?: string;
  status?: "draft" | "published" | "archived";
  authorId: string;
}

export async function createTestPost(overrides: CreateTestPostInput) {
  return db.post.create({
    data: {
      title: overrides.title ?? faker.lorem.sentence(),
      content: overrides.content ?? faker.lorem.paragraphs(3),
      status: overrides.status ?? "draft",
      authorId: overrides.authorId,
    },
  });
}
```

**Authenticated Request Helper**

```typescript
// test/helpers.ts
import { NextRequest } from "next/server";
import { signTestToken } from "./auth";

export function authenticatedRequest(
  url: string,
  init: RequestInit = {},
  userId: string
): NextRequest {
  const token = signTestToken({ userId, role: "member" });

  return new NextRequest(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers as HeadersInit).entries()),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

// Usage:
const request = authenticatedRequest(
  "http://localhost/api/posts",
  {
    method: "POST",
    body: JSON.stringify({ title: "Test", content: "Body" }),
  },
  user.id
);
```

---

## LLM Instructions

### Writing Tests for New Features

When generating tests for a new feature:

- Start by identifying the test type: unit tests for pure logic, integration tests for API routes and component behavior, E2E tests for critical user journeys
- For API routes, test all status codes: 200/201 for success, 400 for validation, 401 for auth, 403 for authorization, 404 for not found, 409 for conflicts
- For React components, test user behavior, not implementation: use `userEvent` instead of `fireEvent`, query by accessible roles and labels, wait for async state with `waitFor`
- Use MSW (Mock Service Worker) for API mocking in component tests, not `jest.mock` on fetch
- Create test data with factory functions, not hardcoded objects
- Clean up database state in `beforeEach`, not `afterEach` (ensures clean state even if a test crashes)

```typescript
// Template: API route test
import { GET, POST } from "@/app/api/[resource]/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createTestUser } from "@/test/fixtures/users";
import { authenticatedRequest } from "@/test/helpers";

describe("POST /api/[resource]", () => {
  let userId: string;

  beforeEach(async () => {
    // Clean slate for every test
    await db.[resource].deleteMany();
    await db.user.deleteMany();
    userId = (await createTestUser()).id;
  });

  it("creates resource with valid input", async () => {
    const request = authenticatedRequest(
      "http://localhost/api/[resource]",
      { method: "POST", body: JSON.stringify({ /* valid input */ }) },
      userId
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ /* expected fields */ });
  });

  it("returns 400 for invalid input", async () => {
    const request = authenticatedRequest(
      "http://localhost/api/[resource]",
      { method: "POST", body: JSON.stringify({ /* invalid input */ }) },
      userId
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const request = new NextRequest("http://localhost/api/[resource]", {
      method: "POST",
      body: JSON.stringify({ /* valid input */ }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

### Writing Tests for React Components

When generating tests for React components:

- Use React Testing Library, not Enzyme or shallow rendering
- Query elements by role, label text, or placeholder text — never by CSS class or component internals
- Use `userEvent.setup()` for interactions, not `fireEvent`
- Mock API calls with MSW handlers, not by mocking fetch or axios directly
- Test what the user sees and does: "When user types in search box and presses Enter, search results appear"
- Do not test that state changed or that a handler was called — test the visible outcome

```typescript
// Template: Component integration test
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { ComponentUnderTest } from "@/components/component-under-test";

describe("ComponentUnderTest", () => {
  it("describes what the user experiences", async () => {
    const user = userEvent.setup();

    // Set up API mocks for this test
    server.use(
      http.get("/api/resource", () => {
        return HttpResponse.json({ data: [/* test data */] });
      })
    );

    // Render with necessary providers
    render(<ComponentUnderTest />);

    // Interact as a user would
    await user.type(screen.getByRole("textbox", { name: /search/i }), "query");
    await user.click(screen.getByRole("button", { name: /search/i }));

    // Assert on what the user sees
    await waitFor(() => {
      expect(screen.getByText("Expected result")).toBeInTheDocument();
    });
  });
});
```

### Setting Up Test Infrastructure

When setting up testing for a new project:

- Install and configure Vitest for unit and integration tests, Playwright for E2E
- Set up MSW for API mocking with a default handler file and a server setup file
- Create a `test/` directory with helpers, fixtures, and mock definitions
- Configure `vitest.config.ts` with path aliases that match the project's `tsconfig.json`
- Add test scripts to `package.json`: `test`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`
- Set up a global test setup file that initializes MSW and any global test configuration

```typescript
// test/setup.ts — Global test setup
import "@testing-library/jest-dom/vitest";
import { server } from "./mocks/server";

// Start MSW before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

// Reset handlers between tests to prevent state leakage
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

```typescript
// test/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
    },
  },
});
```

### Choosing the Right Test Type

When deciding what kind of test to write:

- **Pure function with no side effects** -> Unit test. Fast, simple, no mocks needed.
- **API route handler** -> Integration test. Hit the handler directly with a `NextRequest`, use a real or fake database.
- **React component that fetches data** -> Integration test. Render with MSW mocking the API, test user interactions and visible results.
- **React component that is purely presentational** -> Unit test or skip. If it just renders props, a snapshot or visual test is sufficient.
- **Critical user journey (signup, checkout, payment)** -> E2E test with Playwright. Test the full stack.
- **Business rule (pricing, eligibility, permissions)** -> Unit test. Extract the logic into a pure function and test it thoroughly.
- **Third-party integration (Stripe, SendGrid, Twilio)** -> Integration test with MSW or contract test with Pact. Never call the real API in tests.

---

## Examples

### 1. Complete Test Suite for an API Resource

A full test suite covering all CRUD operations, authentication, authorization, validation, and error handling for a Next.js API route.

```typescript
// __tests__/api/posts/route.test.ts
import { GET, POST } from "@/app/api/posts/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createTestUser, createTestPost } from "@/test/fixtures";
import { authenticatedRequest } from "@/test/helpers";

// Clean database before each test
beforeEach(async () => {
  await db.post.deleteMany();
  await db.user.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});

describe("GET /api/posts", () => {
  it("returns paginated posts with default limit of 20", async () => {
    const author = await createTestUser();

    // Create 25 posts
    for (let i = 0; i < 25; i++) {
      await createTestPost({
        authorId: author.id,
        title: `Post ${i}`,
        status: "published",
      });
    }

    const request = new NextRequest("http://localhost/api/posts");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(20);
    expect(body.meta.hasMore).toBe(true);
    expect(body.meta.nextCursor).toBeTruthy();
  });

  it("filters posts by status", async () => {
    const author = await createTestUser();
    await createTestPost({ authorId: author.id, status: "published" });
    await createTestPost({ authorId: author.id, status: "draft" });
    await createTestPost({ authorId: author.id, status: "published" });

    const request = new NextRequest(
      "http://localhost/api/posts?status=published"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.every((p: { status: string }) => p.status === "published")).toBe(true);
  });

  it("returns 400 for invalid query parameters", async () => {
    const request = new NextRequest(
      "http://localhost/api/posts?limit=999&status=invalid"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/posts", () => {
  let userId: string;

  beforeEach(async () => {
    userId = (await createTestUser()).id;
  });

  it("creates a post with valid input", async () => {
    const request = authenticatedRequest(
      "http://localhost/api/posts",
      {
        method: "POST",
        body: JSON.stringify({
          title: "My New Post",
          content: "This is the content of my post.",
          status: "draft",
        }),
      },
      userId
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.title).toBe("My New Post");
    expect(body.data.status).toBe("draft");
    expect(body.data.id).toBeTruthy();
    expect(body.data.createdAt).toBeTruthy();
  });

  it("returns 400 when title is missing", async () => {
    const request = authenticatedRequest(
      "http://localhost/api/posts",
      {
        method: "POST",
        body: JSON.stringify({ content: "No title provided" }),
      },
      userId
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toContainEqual(
      expect.objectContaining({ field: "title" })
    );
  });

  it("returns 400 when title exceeds 200 characters", async () => {
    const request = authenticatedRequest(
      "http://localhost/api/posts",
      {
        method: "POST",
        body: JSON.stringify({
          title: "x".repeat(201),
          content: "Content",
        }),
      },
      userId
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const request = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", content: "Content" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for malformed JSON body", async () => {
    const request = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signTestToken({ userId })}`,
      },
      body: "not valid json{{{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("defaults status to draft when not specified", async () => {
    const request = authenticatedRequest(
      "http://localhost/api/posts",
      {
        method: "POST",
        body: JSON.stringify({ title: "Test", content: "Content" }),
      },
      userId
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.status).toBe("draft");
  });
});
```

### 2. Complete React Component Test with MSW

A full integration test for a search component that fetches data from an API and handles loading, error, and empty states.

```typescript
// __tests__/components/user-search.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { http, HttpResponse, delay } from "msw";
import { UserSearch } from "@/components/user-search";

describe("UserSearch", () => {
  it("displays search results when user types a query", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/users/search", ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("q");
        return HttpResponse.json({
          data: [
            { id: "1", name: `${query} Smith`, email: `${query}@test.com` },
            { id: "2", name: `${query} Jones`, email: `${query}2@test.com` },
          ],
        });
      })
    );

    render(<UserSearch />);

    const searchInput = screen.getByRole("searchbox", { name: /search users/i });
    await user.type(searchInput, "Alice");

    // Wait for debounced API call and results
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Alice Jones")).toBeInTheDocument();
    });
  });

  it("shows loading indicator while fetching", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/users/search", async () => {
        await delay(500); // Simulate slow response
        return HttpResponse.json({ data: [] });
      })
    );

    render(<UserSearch />);

    await user.type(screen.getByRole("searchbox"), "slow query");

    // Loading indicator appears while waiting for response
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument(); // aria role for spinner
    });

    // Loading indicator disappears when response arrives
    await waitFor(
      () => {
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("shows empty state when no results match", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/users/search", () => {
        return HttpResponse.json({ data: [] });
      })
    );

    render(<UserSearch />);

    await user.type(screen.getByRole("searchbox"), "nonexistent");

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });

  it("shows error message when API call fails", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/users/search", () => {
        return HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
          { status: 500 }
        );
      })
    );

    render(<UserSearch />);

    await user.type(screen.getByRole("searchbox"), "error trigger");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it("calls onSelect callback when user clicks a result", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    server.use(
      http.get("/api/users/search", () => {
        return HttpResponse.json({
          data: [{ id: "user-1", name: "Alice", email: "alice@test.com" }],
        });
      })
    );

    render(<UserSearch onSelect={onSelect} />);

    await user.type(screen.getByRole("searchbox"), "Alice");

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Alice"));

    expect(onSelect).toHaveBeenCalledWith({
      id: "user-1",
      name: "Alice",
      email: "alice@test.com",
    });
  });

  it("debounces API calls (does not call on every keystroke)", async () => {
    const user = userEvent.setup();
    let callCount = 0;

    server.use(
      http.get("/api/users/search", () => {
        callCount++;
        return HttpResponse.json({ data: [] });
      })
    );

    render(<UserSearch debounceMs={300} />);

    // Type quickly — should not trigger a call per keystroke
    await user.type(screen.getByRole("searchbox"), "fast typing");

    // Wait for debounce to settle
    await waitFor(
      () => {
        expect(callCount).toBeGreaterThanOrEqual(1);
      },
      { timeout: 1000 }
    );

    // Should have made far fewer calls than characters typed
    expect(callCount).toBeLessThan(5);
  });
});
```

### 3. E2E Test with Playwright for a Critical Path

```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Seed test user via API
    await page.request.post("/api/test/seed", {
      data: {
        users: [
          {
            email: "testuser@example.com",
            password: "SecurePass123!",
            name: "Test User",
          },
        ],
      },
    });
  });

  test("user can sign up, log in, and access protected content", async ({
    page,
  }) => {
    // Step 1: Navigate to signup
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();

    // Step 2: Fill signup form
    await page.getByLabel("Full Name").fill("New User");
    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Password").fill("NewSecurePass123!");
    await page.getByLabel("Confirm Password").fill("NewSecurePass123!");

    // Step 3: Submit signup
    await page.getByRole("button", { name: /create account/i }).click();

    // Step 4: Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText("Welcome, New User")).toBeVisible();

    // Step 5: Log out
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Step 6: Log back in
    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Password").fill("NewSecurePass123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Step 7: Verify access to protected content
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Welcome, New User")).toBeVisible();
  });

  test("shows validation errors for invalid signup input", async ({ page }) => {
    await page.goto("/signup");

    // Submit with empty fields
    await page.getByRole("button", { name: /create account/i }).click();

    // Verify validation errors
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();

    // Submit with weak password
    await page.getByLabel("Full Name").fill("Test");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password").fill("123");
    await page.getByLabel("Confirm Password").fill("123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/password must be at least/i)).toBeVisible();
  });

  test("shows error for incorrect login credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("testuser@example.com");
    await page.getByLabel("Password").fill("WrongPassword!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    // Try to access protected page without logging in
    await page.goto("/dashboard");

    // Should redirect to login with return URL
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });
});
```

### 4. Test Data Factory with Builder Pattern

```typescript
// test/fixtures/factory.ts
import { db } from "@/lib/db";
import { faker } from "@faker-js/faker";

// Generic builder pattern for test data
class UserBuilder {
  private data: Record<string, unknown> = {
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    role: "member" as const,
    status: "active" as const,
    passwordHash: "$2b$10$test-hash-for-password",
  };

  withName(name: string) {
    this.data.name = name;
    return this;
  }

  withEmail(email: string) {
    this.data.email = email;
    return this;
  }

  withRole(role: "admin" | "member" | "viewer") {
    this.data.role = role;
    return this;
  }

  withStatus(status: "active" | "inactive" | "suspended") {
    this.data.status = status;
    return this;
  }

  inOrg(orgId: string) {
    this.data.orgId = orgId;
    return this;
  }

  async build() {
    return db.user.create({ data: this.data as any });
  }

  // Build without persisting — useful for unit tests
  buildPlain() {
    return {
      id: faker.string.uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...this.data,
    };
  }
}

class PostBuilder {
  private data: Record<string, unknown> = {
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    status: "draft" as const,
  };

  withTitle(title: string) {
    this.data.title = title;
    return this;
  }

  withStatus(status: "draft" | "published" | "archived") {
    this.data.status = status;
    return this;
  }

  byAuthor(authorId: string) {
    this.data.authorId = authorId;
    return this;
  }

  published() {
    this.data.status = "published";
    this.data.publishedAt = new Date();
    return this;
  }

  async build() {
    if (!this.data.authorId) {
      throw new Error("PostBuilder requires an authorId. Call .byAuthor(id) first.");
    }
    return db.post.create({ data: this.data as any });
  }
}

// Factory entry point
export const Factory = {
  user: () => new UserBuilder(),
  post: () => new PostBuilder(),
};

// Usage in tests:
// const admin = await Factory.user().withRole("admin").withEmail("admin@test.com").build();
// const post = await Factory.post().byAuthor(admin.id).published().build();
```

---

## Common Mistakes

### 1. Testing Implementation Details Instead of Behavior

**Wrong:**

```typescript
it("calls the onClick handler", () => {
  const onClick = vi.fn();
  render(<SubmitButton onClick={onClick} />);
  fireEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalled();
});

// Even worse — testing internal state
it("sets isLoading to true", () => {
  const { result } = renderHook(() => useSubmitForm());
  act(() => result.current.submit());
  expect(result.current.isLoading).toBe(true);
});
```

**Fix:** Test the user-visible outcome, not the internal mechanism. If clicking submit should show a loading spinner, test for the spinner. If it should navigate to a success page, test for the navigation.

```typescript
it("shows loading spinner and then success message after submission", async () => {
  const user = userEvent.setup();
  render(<SubmitForm />);

  await user.click(screen.getByRole("button", { name: /submit/i }));

  expect(screen.getByRole("status")).toBeInTheDocument(); // Loading spinner

  await waitFor(() => {
    expect(screen.getByText(/submitted successfully/i)).toBeInTheDocument();
  });
});
```

### 2. Over-Mocking Everything

**Wrong:**

```typescript
// Mocking every internal module — the test proves nothing
vi.mock("@/lib/db");
vi.mock("@/lib/auth");
vi.mock("@/lib/email");
vi.mock("@/lib/logger");
vi.mock("@/lib/validation");

it("creates a user", async () => {
  vi.mocked(db.user.create).mockResolvedValue({ id: "1", name: "Test" });
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(requireAuth).mockResolvedValue({ userId: "admin" });

  const result = await createUser({ email: "test@test.com", name: "Test" });

  expect(db.user.create).toHaveBeenCalled();
  expect(result.id).toBe("1");
  // This test only proves your mocks are wired correctly
});
```

**Fix:** Mock at the boundaries (network, external services) and let the internal code run for real. Use a test database for database operations.

```typescript
// Integration test — real code, real database, real validation
it("creates a user with valid input", async () => {
  const request = authenticatedRequest(
    "http://localhost/api/users",
    {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", name: "Test User" }),
    },
    adminUserId
  );

  const response = await POST(request);
  const body = await response.json();

  expect(response.status).toBe(201);

  // Verify it actually persisted
  const dbUser = await db.user.findUnique({ where: { id: body.data.id } });
  expect(dbUser).toBeTruthy();
  expect(dbUser?.email).toBe("test@test.com");
});
```

### 3. No Test Isolation

**Wrong:**

```typescript
// Tests share state and depend on execution order
let testUser: User;

beforeAll(async () => {
  testUser = await db.user.create({ data: { name: "Shared", email: "shared@test.com" } });
});

it("updates the user name", async () => {
  await db.user.update({ where: { id: testUser.id }, data: { name: "Updated" } });
  const user = await db.user.findUnique({ where: { id: testUser.id } });
  expect(user?.name).toBe("Updated");
});

it("reads the original user name", async () => {
  const user = await db.user.findUnique({ where: { id: testUser.id } });
  expect(user?.name).toBe("Shared"); // FAILS — previous test changed the name
});
```

**Fix:** Create fresh data in `beforeEach` and clean up so each test is independent.

```typescript
beforeEach(async () => {
  await db.user.deleteMany();
});

it("updates the user name", async () => {
  const user = await createTestUser({ name: "Original" });
  await db.user.update({ where: { id: user.id }, data: { name: "Updated" } });

  const updated = await db.user.findUnique({ where: { id: user.id } });
  expect(updated?.name).toBe("Updated");
});

it("reads the user name as created", async () => {
  const user = await createTestUser({ name: "Fresh" });
  const found = await db.user.findUnique({ where: { id: user.id } });
  expect(found?.name).toBe("Fresh"); // Always passes — clean state
});
```

### 4. Using Arbitrary Timeouts Instead of Waiting for Conditions

**Wrong:**

```typescript
it("loads data after mount", async () => {
  render(<DataTable />);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  expect(screen.getByText("Row 1")).toBeInTheDocument();
});
```

**Fix:** Use `waitFor` or `findBy` queries that poll until the condition is met or a timeout is reached.

```typescript
it("loads data after mount", async () => {
  render(<DataTable />);
  // findByText polls automatically — no magic timeouts
  expect(await screen.findByText("Row 1")).toBeInTheDocument();
});
```

### 5. Not Testing Error Paths

**Wrong:**

```typescript
// Only testing the happy path
describe("POST /api/orders", () => {
  it("creates an order", async () => {
    const response = await POST(validRequest);
    expect(response.status).toBe(201);
  });
  // No tests for 400, 401, 403, 404, 409, 500
});
```

**Fix:** For every endpoint, test at least: validation failure (400), missing auth (401), insufficient permissions (403), not found (404), and conflict (409) where applicable.

```typescript
describe("POST /api/orders", () => {
  it("creates an order with valid input", async () => { /* 201 */ });
  it("returns 400 when items array is empty", async () => { /* 400 */ });
  it("returns 400 when item quantity is negative", async () => { /* 400 */ });
  it("returns 401 when not authenticated", async () => { /* 401 */ });
  it("returns 403 when account is suspended", async () => { /* 403 */ });
  it("returns 404 when product does not exist", async () => { /* 404 */ });
  it("returns 409 when product is out of stock", async () => { /* 409 */ });
  it("handles payment service timeout gracefully", async () => { /* 502/503 */ });
});
```

### 6. Snapshot Testing as a Crutch

**Wrong:**

```typescript
// Snapshot tests that nobody reviews
it("renders correctly", () => {
  const { container } = render(<ComplexDashboard data={mockData} />);
  expect(container).toMatchSnapshot();
  // 500-line snapshot that gets auto-updated without thought
});
```

**Fix:** Snapshot tests are useful for small, stable outputs (serialized data, error messages). For UI, test behavior and critical content instead.

```typescript
// Test what matters about the dashboard, not its entire DOM
it("displays the revenue total and chart", async () => {
  render(<ComplexDashboard data={mockData} />);

  expect(screen.getByText("Total Revenue")).toBeInTheDocument();
  expect(screen.getByText("$142,500")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /revenue chart/i })).toBeInTheDocument();
});
```

### 7. Writing Tests That Cannot Fail

**Wrong:**

```typescript
it("should work", async () => {
  const result = await fetchData();
  // No assertions — test always passes
});

// Or assertions that are always true
it("returns something", async () => {
  const result = await fetchData();
  expect(result).toBeDefined(); // Even null is defined
  expect(typeof result).toBe("object"); // null is also an object
});
```

**Fix:** Every test should have at least one meaningful assertion that would fail if the code is broken. Assert on specific values, shapes, and behaviors.

```typescript
it("returns the user with all expected fields", async () => {
  const result = await fetchUser("user-1");

  expect(result).toMatchObject({
    id: "user-1",
    name: expect.any(String),
    email: expect.stringMatching(/@/),
    role: expect.stringMatching(/^(admin|member|viewer)$/),
    createdAt: expect.any(Date),
  });
});
```

### 8. Ignoring Flaky Tests Instead of Fixing Them

**Wrong:**

```typescript
// Team just skips flaky tests and forgets about them
it.skip("sends notification when order ships", () => { /* flaky */ });
it.skip("updates search index on content change", () => { /* flaky */ });
it.skip("syncs user profile across services", () => { /* flaky */ });
// 30 skipped tests, no tracking issues
```

**Fix:** Quarantine flaky tests with tracking issues, a date, and a clear description of the flakiness. Review quarantined tests weekly.

```typescript
// QUARANTINED: Race condition between WebSocket connect and first message
// Issue: https://github.com/org/repo/issues/456
// Quarantined: 2026-02-20
// Owner: @backend-team
it.skip("sends notification when order ships", () => { /* ... */ });
```

### 9. Testing Third-Party Libraries

**Wrong:**

```typescript
it("zod validates email correctly", () => {
  const schema = z.string().email();
  expect(schema.parse("test@test.com")).toBe("test@test.com");
  expect(() => schema.parse("not-email")).toThrow();
});
```

**Fix:** Trust that Zod validates emails. Test your schema — the combination of fields, custom refinements, and transforms that are specific to your application.

```typescript
it("rejects signups with disposable email domains", () => {
  const result = SignupSchema.safeParse({
    email: "user@tempmail.com",
    password: "ValidPass123!",
    name: "Test",
  });

  expect(result.success).toBe(false);
  // This tests YOUR custom refinement, not Zod's email validation
});
```

### 10. No Test Plan for New Features

**Wrong:** Developers implement a feature and write a few tests for the obvious cases. Edge cases, error paths, and security scenarios are discovered by users in production.

**Fix:** Before writing any code, create a test plan that maps acceptance criteria to test cases. Use the template from Principle 13. Share the test plan in the PR description so reviewers can verify coverage.

---

> **See also:** [Unit Testing](./unit-testing.md) | [E2E Testing](./e2e-testing.md) | [Performance Testing](./performance-testing.md) | [CI/CD](../devops/cicd.md) | [Error Handling & Logging](../backend/error-handling-logging.md) | [API Design](../backend/api-design.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
