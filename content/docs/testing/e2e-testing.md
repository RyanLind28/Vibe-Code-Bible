---
title: E2E Testing
description: Playwright setup and architecture, resilient selectors, page object model, testing user flows, visual regression, network interception, multi-browser testing, parallel execution, CI/CD integration, accessibility testing, Cypress comparison, and test data management — everything you need to ship confidence in every deploy.
---
# E2E Testing

> Playwright setup and architecture, resilient selectors, page object model, testing user flows, visual regression, network interception, multi-browser testing, parallel execution, CI/CD integration, accessibility testing, Cypress comparison, and test data management — everything you need to ship confidence in every deploy.

---

## Principles

### 1. Playwright Setup and Configuration

Playwright is the modern standard for end-to-end testing. It supports Chromium, Firefox, and WebKit out of the box, runs tests in parallel by default, and provides first-class TypeScript support. Unlike Selenium, Playwright controls browsers through the DevTools Protocol (for Chromium) and equivalent protocols for Firefox and WebKit, giving it precise control over networking, storage, and browser contexts.

**Installation:**

```bash
# Initialize a new Playwright project
npm init playwright@latest

# Or add to an existing project
npm install -D @playwright/test

# Install browsers (Chromium, Firefox, WebKit)
npx playwright install

# Install system dependencies (Linux CI)
npx playwright install-deps
```

**Project structure:**

```
project-root/
├── e2e/
│   ├── fixtures/             # Custom test fixtures
│   │   └── base.ts
│   ├── pages/                # Page object models
│   │   ├── login.page.ts
│   │   ├── dashboard.page.ts
│   │   └── settings.page.ts
│   ├── helpers/              # Shared utilities
│   │   ├── auth.ts
│   │   ├── api.ts
│   │   └── test-data.ts
│   ├── tests/                # Test files
│   │   ├── auth.spec.ts
│   │   ├── dashboard.spec.ts
│   │   └── settings.spec.ts
│   └── global-setup.ts       # Runs once before all tests
├── playwright.config.ts       # Main configuration
└── package.json
```

**Configuration (`playwright.config.ts`):**

The configuration file is the single source of truth for how Playwright runs your tests. Every setting here can be overridden per-project or per-test.

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Read environment variables for configuration
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CI = !!process.env.CI;

export default defineConfig({
  // Directory containing test files
  testDir: "./e2e/tests",

  // Match test files by pattern
  testMatch: "**/*.spec.ts",

  // Maximum time a single test can run (30 seconds)
  timeout: 30_000,

  // Maximum time expect() assertions can wait
  expect: {
    timeout: 5_000,
    // Visual comparison defaults
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  // Run tests in parallel across files
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: CI,

  // Retry failed tests — more retries on CI where flakiness is more common
  retries: CI ? 2 : 0,

  // Number of parallel workers
  // CI: use 1 worker for stability; local: use 50% of CPUs
  workers: CI ? 1 : undefined,

  // Reporter configuration
  reporter: CI
    ? [
        ["html", { open: "never" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
        ["github"],
      ]
    : [["html", { open: "on-failure" }]],

  // Shared settings for all projects
  use: {
    // Base URL for page.goto("/") and similar navigation
    baseURL: BASE_URL,

    // Collect trace on first retry for debugging
    trace: "on-first-retry",

    // Record video on failure
    video: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Maximum time for each navigation action (page.goto, page.click that triggers navigation)
    navigationTimeout: 15_000,

    // Maximum time for each action (click, fill, etc.)
    actionTimeout: 10_000,
  },

  // Browser/device configurations to test against
  projects: [
    // Desktop browsers
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile viewports
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],

  // Start a local dev server before running tests
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
```

**Global setup** runs once before all test suites. Use it for authentication state that every test needs:

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Launch a browser to create shared authentication state
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log in once and save the authentication state
  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for authentication to complete
  await page.waitForURL("**/dashboard");

  // Save storage state (cookies + localStorage) to a file
  await context.storageState({ path: "e2e/.auth/admin.json" });

  await browser.close();
}

export default globalSetup;
```

Reference the global setup in `playwright.config.ts`:

```typescript
export default defineConfig({
  globalSetup: require.resolve("./e2e/global-setup"),
  // ...rest of config
});
```

### 2. Writing Tests

Playwright tests follow the Arrange-Act-Assert pattern. Each test file is a collection of related tests grouped by `test.describe`. Playwright provides auto-waiting, meaning every action (click, fill, assertion) automatically waits for the element to be ready before executing.

**Basic test structure:**

```typescript
// e2e/tests/dashboard.spec.ts
import { test, expect } from "@playwright/test";

// Describe groups related tests
test.describe("Dashboard", () => {
  // beforeEach runs before every test in this describe block
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("displays the welcome message", async ({ page }) => {
    // Arrange: page is already navigated in beforeEach

    // Act: no user action needed for this assertion

    // Assert: check that the heading is visible
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("shows recent activity feed", async ({ page }) => {
    // Assert: activity feed section exists and has items
    const activityFeed = page.getByTestId("activity-feed");
    await expect(activityFeed).toBeVisible();

    // Check that at least one activity item is rendered
    const items = activityFeed.getByRole("listitem");
    await expect(items).toHaveCount(5);
  });

  test("navigates to settings when clicking the settings link", async ({ page }) => {
    // Act: click the settings link
    await page.getByRole("link", { name: "Settings" }).click();

    // Assert: URL has changed
    await expect(page).toHaveURL(/.*\/settings/);

    // Assert: settings page heading is visible
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
```

**Navigation patterns:**

```typescript
test("navigation patterns", async ({ page }) => {
  // Navigate to a URL (waits for load event by default)
  await page.goto("/products");

  // Wait for a specific network state
  await page.goto("/products", { waitUntil: "networkidle" });

  // Navigate using click (Playwright auto-waits for navigation)
  await page.getByRole("link", { name: "Products" }).click();

  // Wait for a specific URL pattern after navigation
  await page.waitForURL("**/products/**");

  // Go back and forward
  await page.goBack();
  await page.goForward();

  // Reload the page
  await page.reload();
});
```

**Assertion patterns:**

Playwright assertions auto-retry until the condition is met or the timeout expires. This is different from Jest/Vitest assertions, which fail immediately.

```typescript
test("assertion patterns", async ({ page }) => {
  await page.goto("/dashboard");

  // Visibility assertions
  await expect(page.getByText("Welcome")).toBeVisible();
  await expect(page.getByText("Loading...")).toBeHidden();
  await expect(page.getByTestId("deleted-item")).not.toBeVisible();

  // Text content assertions
  await expect(page.getByTestId("user-count")).toHaveText("42 users");
  await expect(page.getByTestId("user-count")).toContainText("42");

  // Input value assertions
  await expect(page.getByLabel("Email")).toHaveValue("admin@example.com");
  await expect(page.getByLabel("Email")).not.toBeEmpty();

  // Attribute assertions
  await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Submit" })).not.toBeDisabled();

  // CSS class/style assertions
  await expect(page.getByTestId("alert")).toHaveClass(/alert-success/);
  await expect(page.getByTestId("sidebar")).toHaveCSS("display", "flex");

  // URL and title assertions
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page).toHaveTitle(/Dashboard/);

  // Count assertions
  await expect(page.getByRole("row")).toHaveCount(10);

  // Custom timeout for slow operations
  await expect(page.getByText("Report generated")).toBeVisible({
    timeout: 30_000,
  });
});
```

**Timeouts and auto-waiting:**

Playwright has three levels of timeouts, and understanding them prevents most timing-related test failures:

```typescript
// 1. Test timeout — maximum time for the entire test (default 30s)
test("slow test", async ({ page }) => {
  test.setTimeout(60_000); // Override for this specific test

  await page.goto("/reports/generate");
  await page.getByRole("button", { name: "Generate" }).click();

  // This assertion will wait up to the expect timeout (default 5s)
  await expect(page.getByText("Report ready")).toBeVisible();
});

// 2. Action timeout — maximum time for a single action (click, fill)
// Set globally in config via use.actionTimeout or per-action:
test("action timeout", async ({ page }) => {
  await page.goto("/slow-page");

  // Override timeout for a specific action
  await page.getByRole("button", { name: "Load" }).click({
    timeout: 15_000,
  });
});

// 3. Navigation timeout — maximum time for page.goto and navigation events
// Set globally in config via use.navigationTimeout or per-navigation:
test("navigation timeout", async ({ page }) => {
  await page.goto("/heavy-page", {
    timeout: 30_000,
    waitUntil: "domcontentloaded", // Don't wait for all resources
  });
});
```

### 3. Selectors and Locators

Locators are the foundation of resilient tests. A good locator strategy means your tests survive redesigns, refactors, and content changes. A bad locator strategy means every CSS class rename or DOM restructure breaks dozens of tests.

**Locator priority (best to worst):**

1. `getByRole` — accessible role + name (most resilient, tests accessibility)
2. `getByLabel` — form labels (great for form inputs)
3. `getByPlaceholder` — placeholder text (acceptable for search fields)
4. `getByText` — visible text content (good for buttons, links, headings)
5. `getByTestId` — data-testid attribute (escape hatch for complex components)
6. CSS selectors — class names and structure (fragile, use as last resort)
7. XPath — DOM traversal (extremely fragile, never use in new tests)

**Role-based selectors (preferred):**

```typescript
test("role-based selectors", async ({ page }) => {
  await page.goto("/");

  // Headings
  await page.getByRole("heading", { name: "Dashboard" }).click();
  await page.getByRole("heading", { level: 1 }).isVisible();

  // Buttons
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: /save/i }).click(); // Regex for case-insensitive

  // Links
  await page.getByRole("link", { name: "Settings" }).click();

  // Navigation
  await page.getByRole("navigation").getByRole("link", { name: "Home" }).click();

  // Form elements
  await page.getByRole("textbox", { name: "Email" }).fill("user@example.com");
  await page.getByRole("checkbox", { name: "Accept terms" }).check();
  await page.getByRole("combobox", { name: "Country" }).selectOption("US");
  await page.getByRole("radio", { name: "Monthly" }).check();

  // Tables
  const table = page.getByRole("table");
  const rows = table.getByRole("row");
  const firstRow = rows.nth(1); // Skip header row
  await expect(firstRow.getByRole("cell").first()).toHaveText("Alice");

  // Dialogs
  const dialog = page.getByRole("dialog", { name: "Confirm deletion" });
  await dialog.getByRole("button", { name: "Delete" }).click();

  // Lists
  const list = page.getByRole("list", { name: "Recent items" });
  await expect(list.getByRole("listitem")).toHaveCount(5);
});
```

**Label-based selectors (ideal for forms):**

```typescript
test("label-based selectors", async ({ page }) => {
  await page.goto("/register");

  // These map to <label for="..."> elements
  await page.getByLabel("First name").fill("Alice");
  await page.getByLabel("Last name").fill("Smith");
  await page.getByLabel("Email address").fill("alice@example.com");
  await page.getByLabel("Password").fill("SecurePass123!");
  await page.getByLabel("Confirm password").fill("SecurePass123!");

  // Regex for partial or case-insensitive matching
  await page.getByLabel(/terms/i).check();
});
```

**Test ID selectors (escape hatch):**

Use `data-testid` when no semantic selector is available. This is common for custom components, dynamically generated content, or visually identical elements that need differentiation.

```typescript
test("test-id selectors", async ({ page }) => {
  await page.goto("/dashboard");

  // Use when the element has no accessible role or unique text
  const chart = page.getByTestId("revenue-chart");
  await expect(chart).toBeVisible();

  // Useful for list items that share the same structure
  const firstCard = page.getByTestId("project-card-1");
  await expect(firstCard.getByText("Project Alpha")).toBeVisible();

  // Configure the test ID attribute in playwright.config.ts:
  // use: { testIdAttribute: 'data-test' }  // Use 'data-test' instead of 'data-testid'
});
```

**Chaining and filtering locators:**

```typescript
test("locator chaining and filtering", async ({ page }) => {
  await page.goto("/users");

  // Chain locators to narrow scope
  const sidebar = page.getByRole("complementary");
  const sidebarLinks = sidebar.getByRole("link");

  // Filter locators by text or other conditions
  const activeRow = page
    .getByRole("row")
    .filter({ hasText: "Active" });
  await expect(activeRow).toHaveCount(3);

  // Filter by child element
  const rowWithDeleteButton = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "Delete" }) });

  // Combine nth() for positional selection
  const secondActiveRow = page
    .getByRole("row")
    .filter({ hasText: "Active" })
    .nth(1);

  // Use .first() and .last()
  const firstItem = page.getByRole("listitem").first();
  const lastItem = page.getByRole("listitem").last();
});
```

**CSS and XPath selectors (last resort):**

```typescript
test("css and xpath selectors", async ({ page }) => {
  // CSS selectors — use only when no semantic locator works
  await page.locator(".sidebar-menu > li.active").click();
  await page.locator('[aria-expanded="true"]').click();
  await page.locator("article:has-text('Playwright')").click();

  // XPath — avoid in new tests, acceptable when migrating legacy tests
  await page.locator("xpath=//div[@class='container']//button").click();

  // Combining CSS with text
  await page.locator("button", { hasText: "Submit" }).click();
});
```

### 4. Page Object Model

The Page Object Model (POM) encapsulates page structure and interactions behind a clean API. Each page in your application gets a corresponding class that exposes user-visible actions as methods and page elements as locators. Tests call page object methods instead of directly manipulating the DOM. When the UI changes, you update one page object, not fifty tests.

**Basic page object:**

```typescript
// e2e/pages/login.page.ts
import { type Page, type Locator, expect } from "@playwright/test";

export class LoginPage {
  // Locators — defined once, reused across methods
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;
  private readonly forgotPasswordLink: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.errorMessage = page.getByRole("alert");
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot password?" });
  }

  // Navigation
  async goto() {
    await this.page.goto("/login");
  }

  // Actions — named after what the user does, not what the test needs
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  // Assertions — encapsulate common checks
  async expectError(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/.*\/dashboard/);
  }

  async expectFormEmpty() {
    await expect(this.emailInput).toBeEmpty();
    await expect(this.passwordInput).toBeEmpty();
  }
}
```

**Complex page object with composition:**

```typescript
// e2e/pages/dashboard.page.ts
import { type Page, type Locator, expect } from "@playwright/test";

// Component object for a reusable UI component
class Sidebar {
  private readonly container: Locator;

  constructor(page: Page) {
    this.container = page.getByRole("complementary");
  }

  async navigateTo(linkName: string) {
    await this.container.getByRole("link", { name: linkName }).click();
  }

  async expectActiveItem(name: string) {
    const activeLink = this.container.getByRole("link", { name });
    await expect(activeLink).toHaveAttribute("aria-current", "page");
  }
}

class DataTable {
  private readonly container: Locator;

  constructor(page: Page, testId: string) {
    this.container = page.getByTestId(testId);
  }

  async getRowCount(): Promise<number> {
    return this.container.getByRole("row").count() - 1; // Subtract header row
  }

  async getRowByText(text: string): Promise<Locator> {
    return this.container.getByRole("row").filter({ hasText: text });
  }

  async sortBy(columnName: string) {
    await this.container
      .getByRole("columnheader", { name: columnName })
      .click();
  }

  async expectRowCount(count: number) {
    // +1 for header row
    await expect(this.container.getByRole("row")).toHaveCount(count + 1);
  }

  async expectSorted(columnName: string, direction: "asc" | "desc") {
    const header = this.container.getByRole("columnheader", { name: columnName });
    await expect(header).toHaveAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
  }
}

export class DashboardPage {
  readonly sidebar: Sidebar;
  readonly projectsTable: DataTable;

  private readonly searchInput: Locator;
  private readonly createButton: Locator;
  private readonly notificationBadge: Locator;

  constructor(private readonly page: Page) {
    this.sidebar = new Sidebar(page);
    this.projectsTable = new DataTable(page, "projects-table");
    this.searchInput = page.getByRole("searchbox", { name: "Search projects" });
    this.createButton = page.getByRole("button", { name: "New project" });
    this.notificationBadge = page.getByTestId("notification-badge");
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for search results to update (debounced input)
    await this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/projects") && response.status() === 200
    );
  }

  async createProject() {
    await this.createButton.click();
    await expect(this.page).toHaveURL(/.*\/projects\/new/);
  }

  async expectNotificationCount(count: number) {
    if (count === 0) {
      await expect(this.notificationBadge).toBeHidden();
    } else {
      await expect(this.notificationBadge).toHaveText(String(count));
    }
  }
}
```

**Custom fixtures for page objects:**

Fixtures inject page objects into tests automatically, eliminating boilerplate construction:

```typescript
// e2e/fixtures/base.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";
import { SettingsPage } from "../pages/settings.page";

// Declare the types for your custom fixtures
type PageFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  settingsPage: SettingsPage;
};

// Extend the base test with custom fixtures
export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },
});

// Re-export expect for convenience
export { expect } from "@playwright/test";
```

**Using fixtures in tests:**

```typescript
// e2e/tests/dashboard.spec.ts
import { test, expect } from "../fixtures/base";

test.describe("Dashboard", () => {
  test("shows projects after login", async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.login("admin@example.com", "password123");
    await loginPage.expectLoggedIn();

    await dashboardPage.goto();
    await dashboardPage.projectsTable.expectRowCount(5);
  });

  test("filters projects by search", async ({ dashboardPage, page }) => {
    // Use stored auth state instead of logging in each time
    await page.goto("/dashboard");

    await dashboardPage.search("Alpha");
    await dashboardPage.projectsTable.expectRowCount(1);
  });
});
```

### 5. Testing User Flows

Real applications have complex user flows that span multiple pages and involve authentication, form submissions, multi-step processes, file uploads, and interactive components. Testing these flows end-to-end catches integration bugs that unit tests miss.

**Authentication flows:**

```typescript
// e2e/tests/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("allows a new user to sign up", async ({ page }) => {
    await page.goto("/signup");

    // Fill the registration form
    await page.getByLabel("Full name").fill("Alice Johnson");
    await page.getByLabel("Email").fill(`alice-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("SecurePass123!");
    await page.getByLabel("Confirm password").fill("SecurePass123!");
    await page.getByLabel(/terms/i).check();

    await page.getByRole("button", { name: "Create account" }).click();

    // Verify redirect to onboarding or dashboard
    await expect(page).toHaveURL(/.*\/(onboarding|dashboard)/);
    await expect(
      page.getByRole("heading", { name: /welcome/i })
    ).toBeVisible();
  });

  test("shows validation errors for invalid signup", async ({ page }) => {
    await page.goto("/signup");

    // Submit empty form
    await page.getByRole("button", { name: "Create account" }).click();

    // Check for validation messages
    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("allows an existing user to log in", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/.*\/dashboard/);

    // Verify the user's name appears in the header
    await expect(page.getByTestId("user-menu")).toContainText("Admin");
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should stay on login page with error
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole("alert")).toContainText(
      "Invalid email or password"
    );
  });

  test("allows a user to log out", async ({ page }) => {
    // Start authenticated
    await page.goto("/dashboard");

    // Open user menu and click logout
    await page.getByTestId("user-menu").click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    // Verify redirect to login page
    await expect(page).toHaveURL(/.*\/login/);

    // Verify that navigating to a protected page redirects to login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("redirects to originally requested page after login", async ({
    page,
  }) => {
    // Try to access a protected page while unauthenticated
    await page.goto("/settings/billing");

    // Should redirect to login with return URL
    await expect(page).toHaveURL(/.*\/login.*returnUrl/);

    // Log in
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should redirect back to the originally requested page
    await expect(page).toHaveURL(/.*\/settings\/billing/);
  });
});
```

**Using stored authentication state:**

Instead of logging in during every test, save authentication state once and reuse it:

```typescript
// e2e/fixtures/auth.ts
import { test as base, expect } from "@playwright/test";

// Define an authenticated test fixture
export const test = base.extend({
  // Use stored authentication state — every test starts already logged in
  storageState: async ({}, use) => {
    await use("e2e/.auth/admin.json");
  },
});

export { expect };
```

```typescript
// e2e/tests/dashboard.spec.ts
// Import from auth fixture instead of base — tests are pre-authenticated
import { test, expect } from "../fixtures/auth";

test("shows dashboard content", async ({ page }) => {
  // No login needed — storageState handles authentication
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

**Form submission flows:**

```typescript
// e2e/tests/forms.spec.ts
import { test, expect } from "../fixtures/auth";

test.describe("Project creation form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects/new");
  });

  test("creates a project with all fields", async ({ page }) => {
    // Text inputs
    await page.getByLabel("Project name").fill("New Feature");
    await page.getByLabel("Description").fill(
      "A comprehensive feature that improves user experience"
    );

    // Select dropdown
    await page.getByLabel("Category").selectOption("engineering");

    // Radio buttons
    await page.getByLabel("High priority").check();

    // Date picker
    await page.getByLabel("Due date").fill("2026-06-15");

    // Multi-select / tags
    const tagInput = page.getByLabel("Tags");
    await tagInput.fill("frontend");
    await page.getByRole("option", { name: "frontend" }).click();
    await tagInput.fill("react");
    await page.getByRole("option", { name: "react" }).click();

    // Rich text editor (contenteditable)
    const editor = page.getByRole("textbox", { name: "Notes" });
    await editor.fill("Initial project notes with important details.");

    // Submit
    await page.getByRole("button", { name: "Create project" }).click();

    // Verify success
    await expect(page.getByText("Project created successfully")).toBeVisible();
    await expect(page).toHaveURL(/.*\/projects\/[\w-]+/);
  });

  test("preserves form data after validation error", async ({ page }) => {
    // Fill some fields but leave required field empty
    await page.getByLabel("Description").fill("Has description");
    // Name is required but left empty

    await page.getByRole("button", { name: "Create project" }).click();

    // Error is shown
    await expect(page.getByText("Project name is required")).toBeVisible();

    // Previously entered data is preserved
    await expect(page.getByLabel("Description")).toHaveValue(
      "Has description"
    );
  });
});
```

**Multi-step wizard:**

```typescript
// e2e/tests/onboarding.spec.ts
import { test, expect } from "@playwright/test";

test("completes the onboarding wizard", async ({ page }) => {
  await page.goto("/onboarding");

  // Step 1: Personal info
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await page.getByLabel("Full name").fill("Alice Johnson");
  await page.getByLabel("Job title").fill("Software Engineer");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: Team setup
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await page.getByLabel("Team name").fill("Platform Team");
  await page.getByLabel("Team size").selectOption("10-50");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3: Preferences
  await expect(page.getByText("Step 3 of 4")).toBeVisible();
  await page.getByLabel("Dark mode").check();
  await page.getByLabel("Email notifications").check();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 4: Review and confirm
  await expect(page.getByText("Step 4 of 4")).toBeVisible();
  await expect(page.getByText("Alice Johnson")).toBeVisible();
  await expect(page.getByText("Platform Team")).toBeVisible();
  await page.getByRole("button", { name: "Complete setup" }).click();

  // Verify completion
  await expect(page).toHaveURL(/.*\/dashboard/);
  await expect(page.getByText("Setup complete")).toBeVisible();
});

test("allows navigating back through wizard steps", async ({ page }) => {
  await page.goto("/onboarding");

  // Complete step 1
  await page.getByLabel("Full name").fill("Alice Johnson");
  await page.getByLabel("Job title").fill("Software Engineer");
  await page.getByRole("button", { name: "Next" }).click();

  // On step 2, go back
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();

  // Step 1 data is preserved
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Alice Johnson");
});
```

**File uploads:**

```typescript
// e2e/tests/file-upload.spec.ts
import { test, expect } from "../fixtures/auth";
import path from "path";

test.describe("File uploads", () => {
  test("uploads a single file via file input", async ({ page }) => {
    await page.goto("/settings/profile");

    // Set input files directly (works with hidden file inputs)
    const fileInput = page.getByTestId("avatar-upload");
    await fileInput.setInputFiles(
      path.join(__dirname, "../fixtures/files/avatar.png")
    );

    // Wait for upload to complete
    await expect(page.getByText("Upload complete")).toBeVisible();

    // Verify preview appears
    await expect(page.getByAltText("Profile avatar")).toBeVisible();
  });

  test("uploads multiple files", async ({ page }) => {
    await page.goto("/projects/1/attachments");

    const fileInput = page.getByTestId("file-upload");
    await fileInput.setInputFiles([
      path.join(__dirname, "../fixtures/files/document.pdf"),
      path.join(__dirname, "../fixtures/files/spreadsheet.xlsx"),
    ]);

    // Both files appear in the upload list
    await expect(page.getByText("document.pdf")).toBeVisible();
    await expect(page.getByText("spreadsheet.xlsx")).toBeVisible();
  });

  test("handles drag and drop file upload", async ({ page }) => {
    await page.goto("/projects/1/attachments");

    // Create a synthetic file for drag-and-drop
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(["test content"], "test-file.txt", {
        type: "text/plain",
      });
      dt.items.add(file);
      return dt;
    });

    // Dispatch drag-and-drop events to the drop zone
    const dropZone = page.getByTestId("drop-zone");
    await dropZone.dispatchEvent("dragenter", { dataTransfer });
    await dropZone.dispatchEvent("drop", { dataTransfer });

    await expect(page.getByText("test-file.txt")).toBeVisible();
  });

  test("rejects files that exceed size limit", async ({ page }) => {
    await page.goto("/settings/profile");

    // Create a large file buffer (simulate 15MB file)
    const fileInput = page.getByTestId("avatar-upload");
    const buffer = Buffer.alloc(15 * 1024 * 1024, "a");

    await fileInput.setInputFiles({
      name: "huge-image.png",
      mimeType: "image/png",
      buffer,
    });

    await expect(page.getByText(/file size exceeds/i)).toBeVisible();
  });
});
```

**Drag and drop interactions:**

```typescript
// e2e/tests/kanban.spec.ts
import { test, expect } from "../fixtures/auth";

test("moves a card between kanban columns via drag and drop", async ({
  page,
}) => {
  await page.goto("/projects/1/board");

  // Identify the source card and target column
  const card = page.getByTestId("task-card-42");
  const targetColumn = page.getByTestId("column-in-progress");

  // Perform drag and drop
  await card.dragTo(targetColumn);

  // Verify the card moved to the new column
  await expect(targetColumn.getByTestId("task-card-42")).toBeVisible();

  // Verify the API was called to persist the change
  // (network interception could also verify this)
  await page.reload();
  await expect(targetColumn.getByTestId("task-card-42")).toBeVisible();
});
```

### 6. Network Interception

Network interception (also called request mocking or API stubbing) lets you control what the browser sees from the server. This is essential for testing error states, loading states, edge cases, and offline behavior without modifying the backend.

**Mocking API responses:**

```typescript
// e2e/tests/api-mocking.spec.ts
import { test, expect } from "@playwright/test";

test("displays data from mocked API", async ({ page }) => {
  // Intercept the API call before navigating
  await page.route("**/api/projects", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          { id: "1", name: "Project Alpha", status: "active" },
          { id: "2", name: "Project Beta", status: "archived" },
        ],
        meta: { hasMore: false, nextCursor: undefined, limit: 20 },
      }),
    });
  });

  await page.goto("/dashboard");

  // Verify the mocked data is displayed
  await expect(page.getByText("Project Alpha")).toBeVisible();
  await expect(page.getByText("Project Beta")).toBeVisible();
});

test("handles API error gracefully", async ({ page }) => {
  // Mock a server error
  await page.route("**/api/projects", (route) => {
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Database connection failed",
        },
      }),
    });
  });

  await page.goto("/dashboard");

  // Verify error state is shown
  await expect(page.getByText("Something went wrong")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try again" })
  ).toBeVisible();
});

test("shows loading state while API is slow", async ({ page }) => {
  // Delay the response to test loading state
  await page.route("**/api/projects", async (route) => {
    // Wait 3 seconds before responding
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { hasMore: false, limit: 20 } }),
    });
  });

  await page.goto("/dashboard");

  // Loading state should be visible while waiting
  await expect(page.getByTestId("loading-skeleton")).toBeVisible();

  // After response, loading disappears and content appears
  await expect(page.getByTestId("loading-skeleton")).toBeHidden({
    timeout: 5_000,
  });
  await expect(page.getByText("No projects found")).toBeVisible();
});

test("handles network failure", async ({ page }) => {
  // Abort the request to simulate a network failure
  await page.route("**/api/projects", (route) => {
    route.abort("connectionrefused");
  });

  await page.goto("/dashboard");

  await expect(page.getByText(/network error/i)).toBeVisible();
});
```

**Intercepting and modifying requests:**

```typescript
test("modifies request headers", async ({ page }) => {
  // Add a custom header to all API requests
  await page.route("**/api/**", (route) => {
    const headers = route.request().headers();
    route.continue({
      headers: {
        ...headers,
        "X-Test-Mode": "true",
        "X-Request-Id": `test-${Date.now()}`,
      },
    });
  });

  await page.goto("/dashboard");
});

test("intercepts and inspects request body", async ({ page }) => {
  let capturedBody: Record<string, unknown> | null = null;

  // Capture the request body when a form is submitted
  await page.route("**/api/projects", (route) => {
    if (route.request().method() === "POST") {
      capturedBody = route.request().postDataJSON();
    }
    route.continue();
  });

  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Captured Project");
  await page.getByRole("button", { name: "Create project" }).click();

  // Verify the request body
  expect(capturedBody).toEqual(
    expect.objectContaining({ name: "Captured Project" })
  );
});
```

**Waiting for specific network responses:**

```typescript
test("waits for specific API response", async ({ page }) => {
  await page.goto("/dashboard");

  // Start waiting for the response BEFORE triggering the action
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/projects") &&
      response.status() === 200
  );

  await page.getByRole("button", { name: "Refresh" }).click();

  // Wait for the specific response
  const response = await responsePromise;
  const data = await response.json();
  expect(data.data).toHaveLength(5);
});
```

**Recording and replaying HAR files:**

HAR (HTTP Archive) files capture real API responses so you can replay them in tests. This is useful for creating deterministic test data from production-like responses.

```typescript
// Record a HAR file during a test run
test("record API responses to HAR", async ({ page }) => {
  // Start recording all network requests to a HAR file
  await page.routeFromHAR("e2e/fixtures/har/dashboard.har", {
    update: true, // true = record mode; false = replay mode
    url: "**/api/**",
  });

  await page.goto("/dashboard");

  // Interact with the page to trigger all API calls you want to record
  await page.getByRole("button", { name: "Load more" }).click();
  await page.getByLabel("Search").fill("test");

  // The HAR file is saved when the test finishes
});

// Replay the HAR file in subsequent test runs
test("replay API responses from HAR", async ({ page }) => {
  // Use the previously recorded HAR file to mock API responses
  await page.routeFromHAR("e2e/fixtures/har/dashboard.har", {
    update: false, // Replay mode
    url: "**/api/**",
    notFound: "abort", // Abort requests not found in the HAR file
  });

  await page.goto("/dashboard");
  await expect(page.getByTestId("projects-table")).toBeVisible();
});
```

### 7. Visual Regression Testing

Visual regression testing catches unintended UI changes by comparing screenshots of the current build against baseline images. Playwright's built-in `toHaveScreenshot` and `toMatchSnapshot` methods handle this without third-party tools.

**Basic screenshot comparison:**

```typescript
// e2e/tests/visual.spec.ts
import { test, expect } from "@playwright/test";

test("dashboard matches visual baseline", async ({ page }) => {
  await page.goto("/dashboard");

  // Wait for all data to load before taking the screenshot
  await expect(page.getByTestId("projects-table")).toBeVisible();

  // Compare full page screenshot against baseline
  // First run creates the baseline; subsequent runs compare against it
  await expect(page).toHaveScreenshot("dashboard.png", {
    fullPage: true,
  });
});

test("login form matches visual baseline", async ({ page }) => {
  await page.goto("/login");

  // Screenshot a specific element instead of the full page
  const form = page.getByTestId("login-form");
  await expect(form).toHaveScreenshot("login-form.png");
});
```

**Configuring pixel thresholds:**

Visual comparisons need tolerance for anti-aliasing differences across operating systems and browsers. Playwright provides three ways to configure tolerance:

```typescript
test("visual comparison with custom threshold", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveScreenshot("dashboard-relaxed.png", {
    // Maximum allowed ratio of different pixels (0.01 = 1%)
    maxDiffPixelRatio: 0.01,

    // Or: maximum number of different pixels
    // maxDiffPixels: 100,

    // Or: per-pixel color difference threshold (0-1)
    // threshold: 0.2,

    // Wait for animations to complete
    animations: "disabled",

    // Mask dynamic elements that change between runs
    mask: [
      page.getByTestId("timestamp"),
      page.getByTestId("random-avatar"),
    ],
  });
});
```

**Handling dynamic content:**

```typescript
test("screenshots with masked dynamic content", async ({ page }) => {
  await page.goto("/dashboard");

  // Mask elements that change between runs (timestamps, avatars, ads)
  await expect(page).toHaveScreenshot("dashboard-stable.png", {
    mask: [
      page.locator("time"), // All timestamp elements
      page.getByTestId("notification-count"),
      page.getByAltText("User avatar"),
    ],
    // Replace masked areas with this color
    maskColor: "#FF00FF",
  });
});

test("freeze animations before screenshot", async ({ page }) => {
  await page.goto("/landing-page");

  // Disable CSS animations and transitions
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });

  await expect(page).toHaveScreenshot("landing-page.png");
});
```

**Updating baselines:**

```bash
# Update all screenshot baselines
npx playwright test --update-snapshots

# Update baselines for a specific test file
npx playwright test visual.spec.ts --update-snapshots

# Update baselines for a specific project (browser)
npx playwright test --project=chromium --update-snapshots
```

Baselines are stored in a directory next to the test file by default:

```
e2e/tests/
├── visual.spec.ts
└── visual.spec.ts-snapshots/
    ├── dashboard-chromium-linux.png
    ├── dashboard-firefox-linux.png
    └── dashboard-webkit-linux.png
```

Note that baselines are platform-specific. The file name includes the browser and OS. In CI, you must generate baselines on the same OS (usually Linux) that CI uses. Commit baselines to version control.

### 8. Multi-Browser Testing

Playwright supports Chromium, Firefox, and WebKit (the engine behind Safari) out of the box. Each runs as a separate project in your configuration, and you can add mobile device emulation for responsive testing.

**Browser-specific projects:**

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  projects: [
    // Desktop browsers
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Chromium-specific settings
        launchOptions: {
          args: ["--disable-web-security"], // Only if testing requires it
        },
      },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile devices
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        // Mobile Chromium with touch events and mobile viewport
      },
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 14"],
        // WebKit with iPhone viewport, touch, and device scale factor
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["iPad Pro 11"],
      },
    },
  ],
});
```

**Running specific browsers:**

```bash
# Run all browsers
npx playwright test

# Run only Chromium
npx playwright test --project=chromium

# Run desktop browsers only
npx playwright test --project=chromium --project=firefox --project=webkit

# Run mobile only
npx playwright test --project=mobile-chrome --project=mobile-safari
```

**Testing responsive behavior:**

```typescript
// e2e/tests/responsive.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Responsive layout", () => {
  test("shows hamburger menu on mobile", async ({ page, isMobile }) => {
    await page.goto("/dashboard");

    if (isMobile) {
      // Mobile: hamburger menu should be visible, sidebar hidden
      await expect(
        page.getByRole("button", { name: "Open menu" })
      ).toBeVisible();
      await expect(page.getByRole("complementary")).toBeHidden();

      // Open the menu
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("complementary")).toBeVisible();
    } else {
      // Desktop: sidebar visible, no hamburger menu
      await expect(page.getByRole("complementary")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open menu" })
      ).toBeHidden();
    }
  });

  test("stacks cards vertically on small screens", async ({ page }) => {
    // Manually set a custom viewport size
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");

    const cards = page.getByTestId("stat-card");
    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();

    // On mobile, second card should be below the first (stacked)
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y);
  });
});
```

**Device emulation with geolocation, locale, and permissions:**

```typescript
test.describe("Geolocation and locale", () => {
  test.use({
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    geolocation: { latitude: 52.52, longitude: 13.405 },
    permissions: ["geolocation"],
  });

  test("shows content in German locale", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Willkommen")).toBeVisible();
  });

  test("detects Berlin geolocation", async ({ page }) => {
    await page.goto("/nearby");
    await expect(page.getByText("Berlin")).toBeVisible();
  });
});
```

### 9. Parallel Execution

Playwright runs tests in parallel by default, distributing them across multiple worker processes. Understanding how parallelism works prevents shared-state bugs and makes your test suite fast.

**Worker configuration:**

```typescript
// playwright.config.ts
export default defineConfig({
  // Run test files in parallel
  fullyParallel: true,

  // Number of worker processes
  // undefined = half the CPU cores (Playwright default)
  // 1 = serial execution (useful for debugging or CI)
  workers: process.env.CI ? 1 : undefined,
});
```

**Controlling parallelism in tests:**

```typescript
// Tests within a describe block run in parallel by default (when fullyParallel is true)
test.describe("Independent tests", () => {
  test("test A", async ({ page }) => { /* ... */ });
  test("test B", async ({ page }) => { /* ... */ });
  test("test C", async ({ page }) => { /* ... */ });
});

// Force serial execution when tests depend on each other
test.describe.serial("Sequential workflow", () => {
  test("step 1: create a project", async ({ page }) => {
    await page.goto("/projects/new");
    await page.getByLabel("Name").fill("Serial Test Project");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/.*\/projects\/[\w-]+/);
  });

  test("step 2: verify project appears in list", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByText("Serial Test Project")).toBeVisible();
  });

  test("step 3: delete the project", async ({ page }) => {
    await page.goto("/projects");
    await page
      .getByRole("row", { name: /Serial Test Project/ })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("Serial Test Project")).toBeHidden();
  });
});
```

**Test isolation:**

Every test in Playwright gets a fresh browser context (new cookies, new localStorage, new session). This is the default and eliminates cross-test contamination. However, if tests share external state (database rows, files on disk), you must handle cleanup explicitly.

```typescript
// e2e/fixtures/isolated.ts
import { test as base, expect } from "@playwright/test";

// A fixture that creates isolated test data and cleans up afterward
export const test = base.extend<{
  testProject: { id: string; name: string };
}>({
  testProject: async ({ request }, use) => {
    // Setup: create a unique project via API before the test
    const name = `test-project-${Date.now()}`;
    const response = await request.post("/api/projects", {
      data: { name, description: "E2E test project" },
    });
    const project = (await response.json()).data;

    // Provide the project to the test
    await use(project);

    // Teardown: delete the project after the test, regardless of pass/fail
    await request.delete(`/api/projects/${project.id}`);
  },
});

export { expect };
```

**Sharding for CI:**

Sharding splits your test suite across multiple CI machines for faster execution:

```bash
# Split tests across 4 machines
# Machine 1:
npx playwright test --shard=1/4

# Machine 2:
npx playwright test --shard=2/4

# Machine 3:
npx playwright test --shard=3/4

# Machine 4:
npx playwright test --shard=4/4
```

**Global setup and teardown:**

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  // Runs once before ALL tests (before any worker starts)
  // Use for: seeding a database, creating shared auth tokens, starting services

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create shared auth state
  const baseURL = config.projects[0].use.baseURL!;
  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");

  // Save for reuse across all tests
  await context.storageState({ path: "e2e/.auth/admin.json" });

  await browser.close();
}

export default globalSetup;
```

```typescript
// e2e/global-teardown.ts
async function globalTeardown() {
  // Runs once after ALL tests complete
  // Use for: cleaning up test databases, removing test files, stopping services
  console.log("Global teardown: cleaning up test data...");
}

export default globalTeardown;
```

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: require.resolve("./e2e/global-setup"),
  globalTeardown: require.resolve("./e2e/global-teardown"),
  // ...rest of config
});
```

### 10. CI/CD Integration

E2E tests are only valuable if they run on every push. A robust CI pipeline runs Playwright tests automatically, collects artifacts (traces, screenshots, videos) for debugging failures, and reports results clearly.

**GitHub Actions workflow:**

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Cancel in-progress runs for the same PR/branch
concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

jobs:
  e2e:
    name: Playwright Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    # Optional: run against a real database
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

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

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Setup database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Build application
        run: npm run build
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Run Playwright tests
        run: npx playwright test
        env:
          CI: true
          BASE_URL: http://localhost:3000
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Upload test artifacts (traces, screenshots, videos)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-artifacts
          path: test-results/
          retention-days: 14
```

**Sharded CI for large test suites:**

```yaml
# .github/workflows/e2e-sharded.yml
name: E2E Tests (Sharded)

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    name: Shard ${{ matrix.shard }}
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run Playwright tests (shard ${{ matrix.shard }})
        run: npx playwright test --shard=${{ matrix.shard }}
        env:
          CI: true

      - name: Upload shard report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ strategy.job-index }}
          path: blob-report/
          retention-days: 1

  merge-reports:
    name: Merge Shard Reports
    if: always()
    needs: [e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Download shard reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload merged report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

To generate blob reports for sharding, update your `playwright.config.ts` reporter configuration:

```typescript
// playwright.config.ts (CI section)
export default defineConfig({
  reporter: process.env.CI
    ? [["blob"], ["github"]]
    : [["html", { open: "on-failure" }]],
});
```

**Debugging CI failures:**

```bash
# Download the test artifacts from GitHub Actions and view the trace
# After downloading playwright-report/ artifact:
npx playwright show-report playwright-report

# View a specific trace file locally
npx playwright show-trace test-results/auth-login-chromium/trace.zip
```

Traces contain a complete recording of the test: DOM snapshots at every step, network requests, console logs, and screenshots. They are the single most useful debugging tool for CI failures. Always enable them on retry (`trace: "on-first-retry"` in config).

### 11. Accessibility Testing

Accessibility testing ensures your application is usable by people with disabilities and meets WCAG (Web Content Accessibility Guidelines) compliance. Integrating `@axe-core/playwright` into your E2E tests catches accessibility violations automatically.

**Setup:**

```bash
npm install -D @axe-core/playwright
```

**Basic accessibility scan:**

```typescript
// e2e/tests/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("home page has no accessibility violations", async ({ page }) => {
    await page.goto("/");

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("login page has no accessibility violations", async ({ page }) => {
    await page.goto("/login");

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test("dashboard has no critical accessibility violations", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Wait for dynamic content to load before scanning
    await expect(page.getByTestId("projects-table")).toBeVisible();

    const results = await new AxeBuilder({ page })
      // Only fail on critical and serious issues
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Exclude known third-party widget with violations you cannot fix
      .exclude("#third-party-chat-widget")
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

**Scanning specific components:**

```typescript
test("modal dialog is accessible", async ({ page }) => {
  await page.goto("/dashboard");

  // Open a dialog
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Scan only the dialog, not the entire page
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

**Reusable accessibility fixture:**

```typescript
// e2e/fixtures/a11y.ts
import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type A11yFixtures = {
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<A11yFixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude("#third-party-chat-widget");

    await use(makeAxeBuilder);
  },
});

export { expect };
```

```typescript
// e2e/tests/a11y-audit.spec.ts
import { test, expect } from "../fixtures/a11y";

// Test every critical page for accessibility
const pagesToAudit = [
  { name: "Home", path: "/" },
  { name: "Login", path: "/login" },
  { name: "Signup", path: "/signup" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Settings", path: "/settings" },
  { name: "Profile", path: "/settings/profile" },
];

for (const { name, path } of pagesToAudit) {
  test(`${name} page passes accessibility audit`, async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.goto(path);

    // Allow page to fully render
    await page.waitForLoadState("networkidle");

    const results = await makeAxeBuilder().analyze();

    // Log violations for debugging before asserting
    if (results.violations.length > 0) {
      console.log(
        `Accessibility violations on ${name}:`,
        JSON.stringify(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
          })),
          null,
          2
        )
      );
    }

    expect(results.violations).toEqual([]);
  });
}
```

**Keyboard navigation testing:**

```typescript
test("form is navigable by keyboard", async ({ page }) => {
  await page.goto("/login");

  // Tab to email input
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email")).toBeFocused();

  // Type email
  await page.keyboard.type("user@example.com");

  // Tab to password input
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password")).toBeFocused();

  // Type password
  await page.keyboard.type("password123");

  // Tab to submit button
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Sign in" })
  ).toBeFocused();

  // Submit via Enter key
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/.*\/dashboard/);
});

test("dialog traps focus", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "Delete project" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Focus should be inside the dialog
  const focusedElement = page.locator(":focus");
  await expect(dialog).toContainText(
    await focusedElement.textContent() ?? ""
  );

  // Tab through dialog elements — focus should not leave the dialog
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Cancel" })
  ).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Delete" })
  ).toBeFocused();

  // Escape closes the dialog
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
```

### 12. Playwright vs Cypress

Playwright and Cypress are the two dominant E2E testing frameworks. They make fundamentally different architectural choices, and the right tool depends on your team and project.

**Architecture:**

| Aspect | Playwright | Cypress |
|--------|-----------|---------|
| Browser control | DevTools Protocol (out-of-process) | Injects into browser (in-process) |
| Browser support | Chromium, Firefox, WebKit | Chromium, Firefox, WebKit (limited) |
| Tabs/windows | Full multi-tab support | Single tab only |
| iframes | First-class support | Requires workarounds |
| Network layer | Full intercept (including service workers) | Application-level only |
| Language | JavaScript, TypeScript, Python, Java, C# | JavaScript, TypeScript only |
| Parallelism | Built-in workers + sharding | Requires Cypress Cloud or third-party tools |
| Mobile | Device emulation (viewport, touch, user agent) | Viewport only |
| Component testing | Experimental | Built-in |

**When to choose Playwright:**

- Multi-browser testing is a requirement (especially WebKit/Safari)
- Tests need multi-tab or multi-window support
- Your team uses languages other than JavaScript
- You need fine-grained network control (WebSocket interception, service workers)
- You want built-in parallelism without paid services
- CI cost matters (Playwright is fully free and open-source)

**When to choose Cypress:**

- Your team is already invested in the Cypress ecosystem
- You need built-in component testing alongside E2E
- The interactive test runner / time-travel debugger is important for your workflow
- Your application only needs to support Chromium-based browsers
- Your QA team prefers the Cypress Dashboard for test analytics

**Migration from Cypress to Playwright:**

```typescript
// Cypress test
describe("Login", () => {
  it("should log in successfully", () => {
    cy.visit("/login");
    cy.get('[data-testid="email"]').type("user@example.com");
    cy.get('[data-testid="password"]').type("password123");
    cy.get('[data-testid="submit"]').click();
    cy.url().should("include", "/dashboard");
    cy.contains("Welcome back").should("be.visible");
  });
});

// Equivalent Playwright test
import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("should log in successfully", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});
```

Key differences when migrating:

- Replace `cy.visit()` with `page.goto()`
- Replace `cy.get('[data-testid="x"]')` with `page.getByTestId("x")` or semantic locators
- Replace `cy.contains("text")` with `page.getByText("text")`
- Replace `.type()` with `.fill()` (Playwright clears the field first)
- Replace `.should("be.visible")` with `await expect(...).toBeVisible()`
- Add `async/await` to everything (Playwright uses real Promises, not Cypress command chains)
- Replace `cy.intercept()` with `page.route()`

### 13. Test Data Management

E2E tests need data, and managing that data reliably is one of the hardest parts of E2E testing. Tests must create the state they need, clean up after themselves, and never depend on data created by other tests.

**API-based setup (preferred):**

Using your application's API to create test data is faster than UI-based setup and more maintainable than direct database access.

```typescript
// e2e/helpers/test-data.ts
import { APIRequestContext } from "@playwright/test";

export class TestDataHelper {
  constructor(private readonly request: APIRequestContext) {}

  async createUser(overrides: Partial<{
    name: string;
    email: string;
    password: string;
    role: string;
  }> = {}) {
    const data = {
      name: overrides.name ?? `Test User ${Date.now()}`,
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      password: overrides.password ?? "TestPass123!",
      role: overrides.role ?? "member",
    };

    const response = await this.request.post("/api/admin/users", { data });
    if (!response.ok()) {
      throw new Error(
        `Failed to create user: ${response.status()} ${await response.text()}`
      );
    }

    return { ...(await response.json()).data, password: data.password };
  }

  async createProject(overrides: Partial<{
    name: string;
    description: string;
    status: string;
  }> = {}) {
    const data = {
      name: overrides.name ?? `Test Project ${Date.now()}`,
      description: overrides.description ?? "Created by E2E test",
      status: overrides.status ?? "active",
    };

    const response = await this.request.post("/api/projects", { data });
    if (!response.ok()) {
      throw new Error(
        `Failed to create project: ${response.status()} ${await response.text()}`
      );
    }

    return (await response.json()).data;
  }

  async deleteUser(id: string) {
    await this.request.delete(`/api/admin/users/${id}`);
  }

  async deleteProject(id: string) {
    await this.request.delete(`/api/projects/${id}`);
  }

  async resetDatabase() {
    const response = await this.request.post("/api/admin/reset", {
      headers: { "X-Test-Secret": process.env.TEST_SECRET ?? "" },
    });
    if (!response.ok()) {
      throw new Error("Failed to reset database");
    }
  }
}
```

**Test data fixture:**

```typescript
// e2e/fixtures/test-data.ts
import { test as base, expect } from "@playwright/test";
import { TestDataHelper } from "../helpers/test-data";

type TestDataFixtures = {
  testData: TestDataHelper;
  testUser: { id: string; email: string; password: string; name: string };
  testProject: { id: string; name: string };
};

export const test = base.extend<TestDataFixtures>({
  testData: async ({ request }, use) => {
    await use(new TestDataHelper(request));
  },

  testUser: async ({ testData }, use) => {
    // Create a unique user for this test
    const user = await testData.createUser();
    await use(user);
    // Clean up after the test
    await testData.deleteUser(user.id);
  },

  testProject: async ({ testData }, use) => {
    const project = await testData.createProject();
    await use(project);
    await testData.deleteProject(project.id);
  },
});

export { expect };
```

**Using test data in tests:**

```typescript
// e2e/tests/project-management.spec.ts
import { test, expect } from "../fixtures/test-data";

test("allows editing a project name", async ({ page, testProject }) => {
  // testProject was created automatically by the fixture
  await page.goto(`/projects/${testProject.id}/settings`);

  await page.getByLabel("Project name").clear();
  await page.getByLabel("Project name").fill("Updated Project Name");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Settings saved")).toBeVisible();

  // Verify the change persisted
  await page.reload();
  await expect(page.getByLabel("Project name")).toHaveValue(
    "Updated Project Name"
  );

  // Cleanup happens automatically via the fixture teardown
});

test("new user sees empty dashboard", async ({ page, testUser }) => {
  // Log in as the freshly created test user
  await page.goto("/login");
  await page.getByLabel("Email").fill(testUser.email);
  await page.getByLabel("Password").fill(testUser.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/.*\/dashboard/);
  await expect(page.getByText("No projects yet")).toBeVisible();
});
```

**Database seeding for deterministic test state:**

```typescript
// e2e/helpers/seed.ts
import { execSync } from "child_process";

export function seedDatabase() {
  // Run Prisma seed command to populate the database with known test data
  execSync("npx prisma db seed", {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
    stdio: "pipe",
  });
}

export function resetDatabase() {
  // Reset to a clean state by running migrations fresh
  execSync("npx prisma migrate reset --force --skip-seed", {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
    stdio: "pipe",
  });
}
```

```typescript
// e2e/global-setup.ts
import { seedDatabase } from "./helpers/seed";

async function globalSetup() {
  // Seed the database once before all tests
  seedDatabase();
}

export default globalSetup;
```

**Cleanup strategies comparison:**

| Strategy | Pros | Cons |
|----------|------|------|
| API teardown in fixture | Precise, per-test cleanup | Requires API endpoints for deletion |
| Database reset before each test | Fully deterministic | Slow for large datasets |
| Database reset before test suite | Fast, deterministic baseline | Tests must not depend on each other |
| Transaction rollback | Fastest possible reset | Requires database-level integration |
| Unique data per test (timestamps) | No cleanup needed for reads | Accumulates data over time |

### 14. Debugging Playwright Tests

When tests fail, Playwright provides multiple debugging tools. Understanding them saves hours of debugging.

**Interactive debugging:**

```bash
# Run tests with the Playwright Inspector (step-by-step debugger)
npx playwright test --debug

# Run a specific test with the inspector
npx playwright test auth.spec.ts --debug

# Run tests in headed mode (see the browser)
npx playwright test --headed

# Run with the Playwright UI mode (interactive test explorer)
npx playwright test --ui
```

**Using `page.pause()` for breakpoints:**

```typescript
test("debug this test", async ({ page }) => {
  await page.goto("/dashboard");

  // This pauses the test and opens the Playwright Inspector
  // You can inspect the page, run locator queries, and step through
  await page.pause();

  await page.getByRole("button", { name: "Create" }).click();
});
```

**Trace viewer:**

```bash
# View a trace file generated from a failed test
npx playwright show-trace test-results/auth-login-chromium/trace.zip

# Or view online at trace.playwright.dev (drag and drop the zip file)
```

Traces contain: DOM snapshots at every action, network request/response log, console log, action log with timing, and before/after screenshots for every step.

---

## LLM Instructions

```
You are an expert Playwright E2E testing engineer. When writing or reviewing E2E tests, follow these rules:

SETUP:
- Use playwright.config.ts with defineConfig() for all configuration.
- Set baseURL, timeouts, retries, and reporter in the config — not in individual tests.
- Use projects array for multi-browser testing (chromium, firefox, webkit).
- Configure webServer to auto-start the dev server.
- Use global-setup.ts for shared authentication state (storageState).

LOCATORS (in order of preference):
1. getByRole("button", { name: "Submit" }) — best for accessibility and resilience
2. getByLabel("Email") — best for form inputs
3. getByText("Welcome") — good for static visible text
4. getByTestId("chart") — escape hatch when no semantic locator exists
5. page.locator(".class") — last resort, avoid in new tests
NEVER use XPath in new tests. NEVER use auto-generated selectors.

PAGE OBJECTS:
- Create one page object per application page.
- Define locators in the constructor, expose actions as async methods.
- Name methods after user actions ("login", "createProject"), not DOM operations ("clickButton").
- Encapsulate assertions in expect* methods on the page object.
- Use composition (separate classes for reusable components like sidebar, table, modal).
- Use custom fixtures (test.extend) to inject page objects into tests.

TEST STRUCTURE:
- Each test must be independent — no test should depend on the result of another test.
- Use test.describe() to group related tests.
- Use beforeEach for shared setup (navigation).
- Prefer stored auth state (storageState) over logging in during each test.
- Use fixtures for test data setup and teardown.

ASSERTIONS:
- Always use expect() from @playwright/test — it auto-retries.
- Prefer toBeVisible() over toHaveCount(1) for checking element presence.
- Prefer toHaveURL() over manual URL checks.
- Add custom timeouts only for known slow operations.

NETWORK INTERCEPTION:
- Use page.route() to mock API responses for error states and edge cases.
- Use route.fulfill() for full response mocking.
- Use route.abort() for network failure simulation.
- Use page.routeFromHAR() for deterministic replay of recorded API responses.
- Set up routes BEFORE navigating to the page.

VISUAL TESTING:
- Use toHaveScreenshot() for visual regression testing.
- Mask dynamic content (timestamps, avatars) with the mask option.
- Disable animations before taking screenshots.
- Commit baseline images to version control.
- Update baselines with --update-snapshots flag.

CI/CD:
- Use GitHub Actions with ubuntu-latest.
- Install browsers with "npx playwright install --with-deps".
- Set retries: 2 for CI.
- Upload playwright-report as artifact (always) and test-results as artifact (on failure).
- Use sharding (--shard=N/M) for large test suites.
- Use blob reporter for sharded runs, merge with "npx playwright merge-reports".

ACCESSIBILITY:
- Use @axe-core/playwright for automated WCAG compliance checks.
- Scan every critical page in a loop using a pagesToAudit array.
- Use withTags(["wcag2a", "wcag2aa"]) for WCAG 2.x AA compliance.
- Test keyboard navigation for forms and dialogs.
- Verify focus trapping in modal dialogs.

TEST DATA:
- Create test data via API in fixtures — never via UI for data setup.
- Use unique identifiers (Date.now() or uuid) to prevent collision.
- Always clean up test data in fixture teardown.
- Use storageState for authentication — do not log in via UI in every test.

COMMON PATTERNS:
- Waiting for API: const responsePromise = page.waitForResponse(); await action; await responsePromise;
- File upload: await input.setInputFiles(path);
- Drag and drop: await source.dragTo(target);
- New tab: const [newPage] = await Promise.all([context.waitForEvent("page"), clickAction]);
- Dialog handling: page.on("dialog", d => d.accept()); await triggerAction;

AVOID:
- page.waitForTimeout() — use auto-waiting or waitForResponse/waitForURL instead.
- Hard-coded waits or sleep().
- Tests that depend on execution order.
- CSS selectors for elements that have accessible roles.
- Asserting against implementation details (CSS classes, DOM structure).
- test.only() in committed code (use forbidOnly: true in CI config).
```

---

## Examples

### 1. Complete Authentication Test Suite

A production-ready test suite covering login, signup, logout, password reset, and session management:

```typescript
// e2e/pages/auth.page.ts
import { type Page, type Locator, expect } from "@playwright/test";

export class AuthPage {
  // Login form
  private readonly loginEmail: Locator;
  private readonly loginPassword: Locator;
  private readonly loginButton: Locator;
  private readonly loginError: Locator;

  // Signup form
  private readonly signupName: Locator;
  private readonly signupEmail: Locator;
  private readonly signupPassword: Locator;
  private readonly signupConfirmPassword: Locator;
  private readonly signupTerms: Locator;
  private readonly signupButton: Locator;

  // Shared
  private readonly userMenu: Locator;

  constructor(private readonly page: Page) {
    this.loginEmail = page.getByLabel("Email");
    this.loginPassword = page.getByLabel("Password");
    this.loginButton = page.getByRole("button", { name: "Sign in" });
    this.loginError = page.getByRole("alert");

    this.signupName = page.getByLabel("Full name");
    this.signupEmail = page.getByLabel("Email");
    this.signupPassword = page.getByLabel("Password", { exact: true });
    this.signupConfirmPassword = page.getByLabel("Confirm password");
    this.signupTerms = page.getByLabel(/terms/i);
    this.signupButton = page.getByRole("button", { name: "Create account" });

    this.userMenu = page.getByTestId("user-menu");
  }

  async gotoLogin() {
    await this.page.goto("/login");
  }

  async gotoSignup() {
    await this.page.goto("/signup");
  }

  async login(email: string, password: string) {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await this.loginButton.click();
  }

  async signup(data: {
    name: string;
    email: string;
    password: string;
  }) {
    await this.signupName.fill(data.name);
    await this.signupEmail.fill(data.email);
    await this.signupPassword.fill(data.password);
    await this.signupConfirmPassword.fill(data.password);
    await this.signupTerms.check();
    await this.signupButton.click();
  }

  async logout() {
    await this.userMenu.click();
    await this.page.getByRole("menuitem", { name: "Log out" }).click();
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/.*\/dashboard/);
    await expect(this.userMenu).toBeVisible();
  }

  async expectLoggedOut() {
    await expect(this.page).toHaveURL(/.*\/login/);
  }

  async expectLoginError(message: string) {
    await expect(this.loginError).toBeVisible();
    await expect(this.loginError).toContainText(message);
  }
}
```

```typescript
// e2e/tests/auth-flow.spec.ts
import { test as base, expect } from "@playwright/test";
import { AuthPage } from "../pages/auth.page";

const test = base.extend<{ authPage: AuthPage }>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
});

test.describe("Authentication Flows", () => {
  test.describe("Login", () => {
    test("successful login redirects to dashboard", async ({ authPage }) => {
      await authPage.gotoLogin();
      await authPage.login("admin@example.com", "password123");
      await authPage.expectLoggedIn();
    });

    test("invalid password shows error message", async ({ authPage }) => {
      await authPage.gotoLogin();
      await authPage.login("admin@example.com", "wrongpassword");
      await authPage.expectLoginError("Invalid email or password");
    });

    test("non-existent email shows error message", async ({ authPage }) => {
      await authPage.gotoLogin();
      await authPage.login("nonexistent@example.com", "password123");
      await authPage.expectLoginError("Invalid email or password");
    });

    test("empty form shows validation errors", async ({ authPage, page }) => {
      await authPage.gotoLogin();
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("Email is required")).toBeVisible();
    });
  });

  test.describe("Signup", () => {
    test("successful signup redirects to dashboard", async ({ authPage }) => {
      await authPage.gotoSignup();
      await authPage.signup({
        name: "New User",
        email: `newuser-${Date.now()}@example.com`,
        password: "SecurePass123!",
      });
      await authPage.expectLoggedIn();
    });

    test("duplicate email shows error", async ({ authPage, page }) => {
      await authPage.gotoSignup();
      await authPage.signup({
        name: "Duplicate",
        email: "admin@example.com", // Already exists
        password: "SecurePass123!",
      });
      await expect(page.getByText(/already exists/i)).toBeVisible();
    });
  });

  test.describe("Logout", () => {
    test("logout clears session and redirects to login", async ({
      authPage,
      page,
    }) => {
      // Log in first
      await authPage.gotoLogin();
      await authPage.login("admin@example.com", "password123");
      await authPage.expectLoggedIn();

      // Log out
      await authPage.logout();
      await authPage.expectLoggedOut();

      // Protected pages should redirect to login
      await page.goto("/dashboard");
      await authPage.expectLoggedOut();
    });
  });

  test.describe("Session Management", () => {
    test("expired session redirects to login", async ({ page }) => {
      // Mock the API to return 401 (expired session)
      await page.route("**/api/me", (route) => {
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "UNAUTHORIZED", message: "Session expired" },
          }),
        });
      });

      await page.goto("/dashboard");
      await expect(page).toHaveURL(/.*\/login/);
    });
  });
});
```

### 2. Full CRUD Test Suite with Test Data Fixtures

A complete test suite for managing projects, demonstrating fixture-based data management and the page object model:

```typescript
// e2e/pages/projects.page.ts
import { type Page, type Locator, expect } from "@playwright/test";

export class ProjectsPage {
  private readonly searchInput: Locator;
  private readonly createButton: Locator;
  private readonly projectTable: Locator;
  private readonly emptyState: Locator;
  private readonly successToast: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByRole("searchbox", { name: "Search" });
    this.createButton = page.getByRole("button", { name: "New project" });
    this.projectTable = page.getByTestId("projects-table");
    this.emptyState = page.getByText("No projects found");
    this.successToast = page.getByRole("status");
  }

  async goto() {
    await this.page.goto("/projects");
    await this.page.waitForLoadState("networkidle");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounced search to complete
    await this.page.waitForResponse(
      (res) => res.url().includes("/api/projects") && res.status() === 200
    );
  }

  async clickCreate() {
    await this.createButton.click();
    await expect(this.page).toHaveURL(/.*\/projects\/new/);
  }

  async openProject(name: string) {
    await this.projectTable
      .getByRole("row", { name: new RegExp(name) })
      .getByRole("link")
      .first()
      .click();
  }

  async deleteProject(name: string) {
    const row = this.projectTable.getByRole("row", { name: new RegExp(name) });
    await row.getByRole("button", { name: "Delete" }).click();

    // Confirm deletion in the dialog
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
  }

  async expectProjectVisible(name: string) {
    await expect(
      this.projectTable.getByRole("row", { name: new RegExp(name) })
    ).toBeVisible();
  }

  async expectProjectNotVisible(name: string) {
    await expect(
      this.projectTable.getByRole("row", { name: new RegExp(name) })
    ).toBeHidden();
  }

  async expectSuccessMessage(message: string) {
    await expect(this.successToast).toContainText(message);
  }

  async expectEmpty() {
    await expect(this.emptyState).toBeVisible();
  }

  async expectRowCount(count: number) {
    // +1 for header row
    await expect(this.projectTable.getByRole("row")).toHaveCount(count + 1);
  }
}

export class ProjectFormPage {
  private readonly nameInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly statusSelect: Locator;
  private readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByLabel("Project name");
    this.descriptionInput = page.getByLabel("Description");
    this.statusSelect = page.getByLabel("Status");
    this.saveButton = page.getByRole("button", { name: /save|create/i });
  }

  async fillForm(data: {
    name: string;
    description?: string;
    status?: string;
  }) {
    await this.nameInput.fill(data.name);
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }
    if (data.status) {
      await this.statusSelect.selectOption(data.status);
    }
  }

  async submit() {
    await this.saveButton.click();
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
```

```typescript
// e2e/fixtures/project-fixtures.ts
import { test as base, expect } from "@playwright/test";
import { ProjectsPage, ProjectFormPage } from "../pages/projects.page";

type ProjectFixtures = {
  projectsPage: ProjectsPage;
  projectFormPage: ProjectFormPage;
  seededProject: { id: string; name: string };
};

export const test = base.extend<ProjectFixtures>({
  // Use stored auth state so tests are pre-authenticated
  storageState: "e2e/.auth/admin.json",

  projectsPage: async ({ page }, use) => {
    await use(new ProjectsPage(page));
  },

  projectFormPage: async ({ page }, use) => {
    await use(new ProjectFormPage(page));
  },

  seededProject: async ({ request }, use) => {
    // Create a project via API before the test
    const name = `E2E Project ${Date.now()}`;
    const response = await request.post("/api/projects", {
      data: { name, description: "Seeded for E2E test", status: "active" },
    });
    const project = (await response.json()).data;

    await use({ id: project.id, name });

    // Cleanup: delete the project after the test
    await request.delete(`/api/projects/${project.id}`);
  },
});

export { expect };
```

```typescript
// e2e/tests/projects-crud.spec.ts
import { test, expect } from "../fixtures/project-fixtures";

test.describe("Projects CRUD", () => {
  test("lists existing projects", async ({ projectsPage, seededProject }) => {
    await projectsPage.goto();
    await projectsPage.expectProjectVisible(seededProject.name);
  });

  test("creates a new project", async ({
    projectsPage,
    projectFormPage,
    page,
  }) => {
    const projectName = `Created Project ${Date.now()}`;

    await projectsPage.goto();
    await projectsPage.clickCreate();

    await projectFormPage.fillForm({
      name: projectName,
      description: "Created via E2E test",
      status: "active",
    });
    await projectFormPage.submit();

    // Verify redirect to project detail page
    await expect(page).toHaveURL(/.*\/projects\/[\w-]+/);

    // Navigate back to list and verify the project appears
    await projectsPage.goto();
    await projectsPage.expectProjectVisible(projectName);
  });

  test("validates required fields on create", async ({
    projectsPage,
    projectFormPage,
  }) => {
    await projectsPage.goto();
    await projectsPage.clickCreate();

    // Submit without filling required fields
    await projectFormPage.submit();
    await projectFormPage.expectValidationError("Project name is required");
  });

  test("searches for projects", async ({ projectsPage, seededProject }) => {
    await projectsPage.goto();

    // Search for the seeded project
    await projectsPage.search(seededProject.name);
    await projectsPage.expectProjectVisible(seededProject.name);

    // Search for something that does not exist
    await projectsPage.search("nonexistent-project-xyz");
    await projectsPage.expectEmpty();
  });

  test("deletes a project", async ({
    projectsPage,
    seededProject,
    request,
  }) => {
    await projectsPage.goto();
    await projectsPage.expectProjectVisible(seededProject.name);

    await projectsPage.deleteProject(seededProject.name);
    await projectsPage.expectSuccessMessage("Project deleted");
    await projectsPage.expectProjectNotVisible(seededProject.name);
  });
});
```

### 3. CI-Ready Accessibility Audit Suite

```typescript
// e2e/tests/a11y-suite.spec.ts
import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const test = base.extend<{ axe: () => AxeBuilder }>({
  storageState: "e2e/.auth/admin.json",
  axe: async ({ page }, use) => {
    await use(() =>
      new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude("#intercom-container") // Exclude third-party widgets
    );
  },
});

// Define all pages to audit
const routes = [
  { name: "Landing page", path: "/", auth: false },
  { name: "Login", path: "/login", auth: false },
  { name: "Signup", path: "/signup", auth: false },
  { name: "Dashboard", path: "/dashboard", auth: true },
  { name: "Projects", path: "/projects", auth: true },
  { name: "Settings", path: "/settings", auth: true },
  { name: "Profile", path: "/settings/profile", auth: true },
  { name: "Billing", path: "/settings/billing", auth: true },
];

for (const route of routes) {
  test(`${route.name} (${route.path}) passes WCAG 2.1 AA`, async ({
    page,
    axe,
  }) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");

    const results = await axe().analyze();

    // Provide detailed failure output
    const violations = results.violations.map((v) => ({
      rule: v.id,
      impact: v.impact,
      description: v.description,
      helpUrl: v.helpUrl,
      targets: v.nodes.map((n) => n.target).flat(),
    }));

    expect(
      violations,
      `${route.name} has ${violations.length} accessibility violations:\n` +
        JSON.stringify(violations, null, 2)
    ).toHaveLength(0);
  });
}
```

### 4. Network Interception for Error State Testing

```typescript
// e2e/tests/error-states.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Error state handling", () => {
  test("shows error page on 500 response", async ({ page }) => {
    await page.route("**/api/projects", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Server error" },
        }),
      });
    });

    await page.goto("/projects");

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Try again" })
    ).toBeVisible();
  });

  test("retry button re-fetches data after error", async ({ page }) => {
    let requestCount = 0;

    await page.route("**/api/projects", (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First request: return error
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "INTERNAL_ERROR", message: "Server error" },
          }),
        });
      } else {
        // Second request: return success
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [{ id: "1", name: "Project Alpha", status: "active" }],
            meta: { hasMore: false, limit: 20 },
          }),
        });
      }
    });

    await page.goto("/projects");

    // Error state is shown
    await expect(page.getByText("Something went wrong")).toBeVisible();

    // Click retry
    await page.getByRole("button", { name: "Try again" }).click();

    // Data is now shown
    await expect(page.getByText("Project Alpha")).toBeVisible();
  });

  test("shows offline banner when network is unavailable", async ({
    page,
    context,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("projects-table")).toBeVisible();

    // Simulate going offline
    await context.setOffline(true);

    // Try to perform an action that requires network
    await page.getByRole("button", { name: "Refresh" }).click();

    await expect(page.getByText(/offline|network/i)).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });

  test("handles rate limiting gracefully", async ({ page }) => {
    await page.route("**/api/projects", (route) => {
      route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: { "Retry-After": "5" },
        body: JSON.stringify({
          error: { code: "RATE_LIMIT", message: "Too many requests" },
        }),
      });
    });

    await page.goto("/projects");
    await expect(page.getByText(/too many requests|try again/i)).toBeVisible();
  });
});
```

### 5. Multi-Step Workflow with Visual Regression

```typescript
// e2e/tests/onboarding-visual.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Onboarding wizard", () => {
  test("each step matches visual baseline", async ({ page }) => {
    await page.goto("/onboarding");

    // Step 1
    await expect(page.getByText("Step 1")).toBeVisible();
    await expect(page).toHaveScreenshot("onboarding-step-1.png", {
      animations: "disabled",
    });

    await page.getByLabel("Full name").fill("Alice Johnson");
    await page.getByLabel("Job title").fill("Engineer");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2
    await expect(page.getByText("Step 2")).toBeVisible();
    await expect(page).toHaveScreenshot("onboarding-step-2.png", {
      animations: "disabled",
    });

    await page.getByLabel("Team name").fill("Platform");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3
    await expect(page.getByText("Step 3")).toBeVisible();
    await expect(page).toHaveScreenshot("onboarding-step-3.png", {
      animations: "disabled",
    });

    await page.getByRole("button", { name: "Next" }).click();

    // Step 4 - Review
    await expect(page.getByText("Step 4")).toBeVisible();
    await expect(page).toHaveScreenshot("onboarding-step-4-review.png", {
      animations: "disabled",
      mask: [page.locator("time")], // Mask timestamps
    });
  });
});
```

---

## Common Mistakes

### 1. Using Hard-Coded Waits

**Wrong:**

```typescript
test("shows data after loading", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForTimeout(3000); // Arbitrary wait
  await expect(page.getByText("Project Alpha")).toBeVisible();
});
```

**Fix:** Use auto-waiting assertions or explicit wait conditions. `expect().toBeVisible()` already auto-retries. For network-dependent content, wait for the specific API response:

```typescript
test("shows data after loading", async ({ page }) => {
  await page.goto("/dashboard");
  // Playwright auto-retries this assertion until it passes or times out
  await expect(page.getByText("Project Alpha")).toBeVisible();
});
```

### 2. Fragile CSS Selectors

**Wrong:**

```typescript
test("clicks the submit button", async ({ page }) => {
  // Breaks when CSS classes change, DOM structure changes, or components re-order
  await page.locator("div.form-container > div:nth-child(3) > button.btn-primary").click();
});
```

**Fix:** Use semantic locators based on accessibility roles, labels, or text content:

```typescript
test("clicks the submit button", async ({ page }) => {
  await page.getByRole("button", { name: "Submit" }).click();
});
```

### 3. Tests That Depend on Other Tests

**Wrong:**

```typescript
test.describe("Project management", () => {
  test("creates a project", async ({ page }) => {
    await page.goto("/projects/new");
    await page.getByLabel("Name").fill("Shared Project");
    await page.getByRole("button", { name: "Create" }).click();
  });

  // This test DEPENDS on the test above having run first
  test("edits the project", async ({ page }) => {
    await page.goto("/projects");
    await page.getByText("Shared Project").click(); // Fails if create test did not run
    await page.getByLabel("Name").fill("Updated Project");
  });
});
```

**Fix:** Each test creates its own data via fixtures or API setup. Tests must be independent:

```typescript
test("edits a project", async ({ page, request }) => {
  // Create the project this test needs via API
  const res = await request.post("/api/projects", {
    data: { name: `Edit Test ${Date.now()}` },
  });
  const project = (await res.json()).data;

  await page.goto(`/projects/${project.id}/edit`);
  await page.getByLabel("Name").fill("Updated Project");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Updated Project")).toBeVisible();
});
```

### 4. Logging In Via UI in Every Test

**Wrong:**

```typescript
test("shows dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");

  // NOW the actual test begins...
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

**Fix:** Save authentication state once in `globalSetup` and reuse it via `storageState`:

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: require.resolve("./e2e/global-setup"),
  projects: [{
    name: "authenticated",
    use: { storageState: "e2e/.auth/admin.json" },
  }],
});

// Tests start already authenticated
test("shows dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

### 5. Not Waiting for Network Before Asserting

**Wrong:**

```typescript
test("search returns results", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("searchbox").fill("Alpha");
  // Assertion runs immediately — search API has not responded yet
  await expect(page.getByText("Project Alpha")).toBeVisible();
});
```

**Fix:** Wait for the API response before asserting on results that depend on it, especially for debounced inputs:

```typescript
test("search returns results", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("searchbox").fill("Alpha");

  // Wait for the search API to respond
  await page.waitForResponse(
    (res) => res.url().includes("/api/projects") && res.status() === 200
  );

  await expect(page.getByText("Project Alpha")).toBeVisible();
});
```

### 6. Screenshots Without Masking Dynamic Content

**Wrong:**

```typescript
test("dashboard visual regression", async ({ page }) => {
  await page.goto("/dashboard");
  // Fails on every run because timestamps, notification counts, and avatars change
  await expect(page).toHaveScreenshot("dashboard.png");
});
```

**Fix:** Mask elements that change between runs:

```typescript
test("dashboard visual regression", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveScreenshot("dashboard.png", {
    animations: "disabled",
    mask: [
      page.locator("time"),
      page.getByTestId("notification-count"),
      page.getByAltText("User avatar"),
    ],
  });
});
```

### 7. No Cleanup of Test Data

**Wrong:**

```typescript
test("creates a user", async ({ page }) => {
  await page.goto("/admin/users/new");
  await page.getByLabel("Email").fill("permanent-test-user@example.com");
  await page.getByRole("button", { name: "Create" }).click();
  // Test data accumulates with every run — eventually causes failures
});
```

**Fix:** Use fixtures with teardown to clean up after each test:

```typescript
const test = base.extend<{ testUser: { id: string; email: string } }>({
  testUser: async ({ request }, use) => {
    const email = `test-${Date.now()}@example.com`;
    const res = await request.post("/api/admin/users", { data: { email, name: "Test" } });
    const user = (await res.json()).data;

    await use(user);

    // Cleanup runs even if the test fails
    await request.delete(`/api/admin/users/${user.id}`);
  },
});
```

### 8. Not Using `forbidOnly` in CI

**Wrong:**

```typescript
// Someone accidentally committed this:
test.only("my debugging test", async ({ page }) => {
  // Only this test runs — the entire rest of the suite is silently skipped
});
```

**Fix:** Set `forbidOnly: true` in CI configuration so the build fails if `test.only` is committed:

```typescript
// playwright.config.ts
export default defineConfig({
  forbidOnly: !!process.env.CI,
});
```

### 9. Ignoring Accessibility in E2E Tests

**Wrong:** Running a full E2E suite without any accessibility checks, then discovering WCAG violations after launch.

**Fix:** Add an accessibility audit for every critical page. It takes minimal effort and catches real issues:

```typescript
import AxeBuilder from "@axe-core/playwright";

test("page passes accessibility audit", async ({ page }) => {
  await page.goto("/dashboard");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### 10. Running All Browsers in Local Development

**Wrong:** Running `npx playwright test` locally with all 5 projects (chromium, firefox, webkit, mobile-chrome, mobile-safari) on every change, wasting 5 minutes per run.

**Fix:** Run a single browser locally for fast iteration. Run all browsers in CI:

```bash
# Local development: single browser, fast feedback
npx playwright test --project=chromium

# CI: all browsers, full coverage
npx playwright test
```

---

> **See also:** [Unit Testing](./unit-testing) | [Test Strategy](./test-strategy) | [Performance Testing](./performance-testing)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
