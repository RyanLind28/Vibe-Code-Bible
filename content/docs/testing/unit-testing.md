---
title: Unit Testing
description: Jest and Vitest setup, React Testing Library, mocking strategies, testing hooks and Server Components, async patterns, snapshot testing, code coverage, and test factories — everything you need to write reliable unit tests for modern React and Next.js applications.
---
# Unit Testing

> Jest and Vitest setup, React Testing Library, mocking strategies, testing hooks and Server Components, async patterns, snapshot testing, code coverage, and test factories — everything you need to write reliable unit tests for modern React and Next.js applications.

---

## Principles

### 1. Test Runner Setup — Vitest vs Jest

Vitest is the recommended test runner for modern projects. It uses the same config as Vite, supports ESM natively, and runs significantly faster than Jest. Jest remains the standard for projects already using it or those with complex configurations that predate Vite.

**When to choose Vitest:**
- New projects or projects using Vite/Next.js with Turbopack
- You want native ESM and TypeScript support without transpilation config
- You want faster test execution via Vite's transform pipeline
- You want a Jest-compatible API (nearly drop-in replacement)

**When to choose Jest:**
- Existing project with extensive Jest config and custom transforms
- You need a specific Jest ecosystem plugin that has no Vitest equivalent
- Your team already knows Jest deeply

**Vitest setup for Next.js:**

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
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/types/**",
        "**/__mocks__/**",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

```typescript
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Automatic cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill, priority, ...rest } = props;
    return <img {...rest} />;
  },
}));
```

**Jest setup for Next.js:**

```typescript
// jest.config.ts
import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterSetup: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/types/**",
  ],
};

export default createJestConfig(config);
```

### 2. Test File Structure and Organization

Good test organization makes tests discoverable, readable, and maintainable. Co-locate tests next to the code they test.

**File naming conventions:**
- `component-name.test.tsx` for React components
- `utility-name.test.ts` for pure functions and utilities
- `hook-name.test.ts` for custom hooks
- `route-name.test.ts` for API route handlers

**Recommended structure — co-located tests:**

```
app/
  dashboard/
    page.tsx
    page.test.tsx
    _components/
      stats-card.tsx
      stats-card.test.tsx
lib/
  utils/
    format-currency.ts
    format-currency.test.ts
  hooks/
    use-debounce.ts
    use-debounce.test.ts
```

**Test structure with describe/it blocks:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("formatCurrency", () => {
  // Group related behaviors
  describe("with USD", () => {
    it("formats whole numbers without decimals", () => {
      expect(formatCurrency(100, "USD")).toBe("$100.00");
    });

    it("formats decimal amounts correctly", () => {
      expect(formatCurrency(99.99, "USD")).toBe("$99.99");
    });

    it("formats negative amounts with a minus sign", () => {
      expect(formatCurrency(-50, "USD")).toBe("-$50.00");
    });
  });

  describe("with EUR", () => {
    it("uses euro symbol", () => {
      expect(formatCurrency(100, "EUR")).toMatch(/100/);
    });
  });

  describe("edge cases", () => {
    it("handles zero", () => {
      expect(formatCurrency(0, "USD")).toBe("$0.00");
    });

    it("throws for invalid currency code", () => {
      expect(() => formatCurrency(100, "INVALID")).toThrow();
    });
  });
});
```

**Setup and teardown:**

```typescript
describe("UserService", () => {
  let service: UserService;

  // Runs once before all tests in this describe block
  beforeAll(async () => {
    await connectToTestDatabase();
  });

  // Runs before each individual test
  beforeEach(() => {
    service = new UserService();
  });

  // Runs after each individual test
  afterEach(async () => {
    await clearTestData();
  });

  // Runs once after all tests in this describe block
  afterAll(async () => {
    await disconnectFromTestDatabase();
  });

  it("creates a user", async () => {
    const user = await service.create({ name: "Alice", email: "alice@test.com" });
    expect(user.id).toBeDefined();
    expect(user.name).toBe("Alice");
  });
});
```

### 3. Testing React Components with Testing Library

React Testing Library enforces testing components the way users interact with them — by querying the DOM as a user would, not by inspecting component internals.

**Core principle: Test behavior, not implementation.**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("submits the form with entered values", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: "alice@example.com",
      password: "password123",
    });
  });

  it("shows validation error for empty email", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it("disables submit button while loading", () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading />);

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });
});
```

**Query priority (use in this order):**

1. `getByRole` — accessible role queries (best for accessibility)
2. `getByLabelText` — form field labels
3. `getByPlaceholderText` — input placeholders
4. `getByText` — visible text content
5. `getByDisplayValue` — current form input values
6. `getByAltText` — image alt text
7. `getByTestId` — last resort, `data-testid` attributes

**Query variants:**

| Variant | No Match | 1 Match | 1+ Matches | Async? |
|---------|----------|---------|------------|--------|
| `getBy` | Throws | Returns | Throws | No |
| `queryBy` | `null` | Returns | Throws | No |
| `findBy` | Throws | Returns | Throws | Yes |
| `getAllBy` | Throws | Array | Array | No |
| `queryAllBy` | `[]` | Array | Array | No |
| `findAllBy` | Throws | Array | Array | Yes |

Use `queryBy` when testing that something does NOT exist:

```typescript
// Correct: use queryBy for asserting absence
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

// Wrong: getBy would throw before the assertion runs
// expect(screen.getByText(/error/i)).not.toBeInTheDocument();
```

Use `findBy` when waiting for async content:

```typescript
// Waits for element to appear (default timeout: 1000ms)
const successMessage = await screen.findByText(/successfully saved/i);
expect(successMessage).toBeInTheDocument();
```

**Testing with user events:**

```typescript
import userEvent from "@testing-library/user-event";

it("handles complex user interactions", async () => {
  const user = userEvent.setup();
  render(<SearchFilter />);

  // Type in search box
  await user.type(screen.getByRole("searchbox"), "react");

  // Select from dropdown
  await user.selectOptions(screen.getByRole("combobox"), "newest");

  // Toggle checkbox
  await user.click(screen.getByRole("checkbox", { name: /include archived/i }));

  // Clear and retype
  await user.clear(screen.getByRole("searchbox"));
  await user.type(screen.getByRole("searchbox"), "vitest");

  // Tab to next element
  await user.tab();

  // Keyboard shortcut
  await user.keyboard("{Control>}k{/Control}");
});
```

**Testing components with context providers:**

```typescript
// tests/utils.tsx — reusable render with providers
import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@/providers/theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Usage in tests
import { renderWithProviders } from "@/tests/utils";

it("renders themed component", () => {
  renderWithProviders(<ThemedButton>Click me</ThemedButton>);
  expect(screen.getByRole("button")).toHaveClass("theme-light");
});
```

### 4. Mocking

Mocking isolates the code under test by replacing dependencies with controlled substitutes. Use mocking strategically — over-mocking leads to brittle tests that pass but miss real bugs.

**Mocking modules:**

```typescript
import { vi, describe, it, expect } from "vitest";
import { createUser } from "./user-service";

// Mock the entire database module
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";

describe("createUser", () => {
  it("creates a user and returns it", async () => {
    const mockUser = { id: "1", name: "Alice", email: "alice@test.com" };
    vi.mocked(db.user.create).mockResolvedValue(mockUser);

    const result = await createUser({ name: "Alice", email: "alice@test.com" });

    expect(db.user.create).toHaveBeenCalledWith({
      data: { name: "Alice", email: "alice@test.com" },
    });
    expect(result).toEqual(mockUser);
  });
});
```

**Mocking API calls with MSW (Mock Service Worker):**

MSW intercepts network requests at the service worker level, making it the most realistic way to mock APIs.

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users", () => {
    return HttpResponse.json({
      data: [
        { id: "1", name: "Alice", email: "alice@example.com" },
        { id: "2", name: "Bob", email: "bob@example.com" },
      ],
      meta: { total: 2 },
    });
  }),

  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { data: { id: "3", ...body } },
      { status: 201 }
    );
  }),

  http.get("/api/users/:id", ({ params }) => {
    if (params.id === "404") {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      data: { id: params.id, name: "Alice", email: "alice@example.com" },
    });
  }),
];
```

```typescript
// tests/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```typescript
// tests/setup.ts — add MSW lifecycle
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// Override handlers per test for error scenarios
import { server } from "@/tests/mocks/server";
import { http, HttpResponse } from "msw";

it("shows error when API fails", async () => {
  server.use(
    http.get("/api/users", () => {
      return HttpResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Server error" } },
        { status: 500 }
      );
    })
  );

  render(<UserList />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

**Mocking Next.js router:**

```typescript
import { vi } from "vitest";
import { useRouter, usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

it("redirects after successful submission", async () => {
  const push = vi.fn();
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  });
  vi.mocked(usePathname).mockReturnValue("/dashboard");

  const user = userEvent.setup();
  render(<CreatePostForm />);

  await user.type(screen.getByLabelText(/title/i), "My Post");
  await user.click(screen.getByRole("button", { name: /create/i }));

  await waitFor(() => {
    expect(push).toHaveBeenCalledWith("/posts/my-post");
  });
});
```

**Spy functions:**

```typescript
// Spy on an existing function without replacing it
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

it("logs errors", () => {
  processData(invalidData);
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Invalid data")
  );
});

afterEach(() => {
  consoleSpy.mockRestore();
});
```

**Mocking environment variables:**

```typescript
it("uses production API URL in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");

  expect(getApiUrl()).toBe("https://api.example.com");

  vi.unstubAllEnvs();
});
```

### 5. Testing Hooks

Custom hooks are tested using `renderHook` from React Testing Library. This renders the hook inside a test component and gives you access to its return value.

```typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCounter } from "./use-counter";

describe("useCounter", () => {
  it("initializes with default value", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("initializes with custom value", () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it("increments the count", () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("decrements the count", () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it("resets to initial value", () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

**Testing hooks with context providers:**

```typescript
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUsers } from "./use-users";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useUsers", () => {
  it("fetches users", async () => {
    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].name).toBe("Alice");
  });
});
```

**Testing async hooks with debounce:**

```typescript
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { useDebounce } from "./use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("debounces value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } }
    );

    // Update the value
    rerender({ value: "world", delay: 500 });

    // Value should not have changed yet
    expect(result.current).toBe("hello");

    // Advance timers past the debounce delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now the value should be updated
    expect(result.current).toBe("world");
  });
});
```

### 6. Testing Server Components and Server Actions

Server Components and Server Actions require different testing strategies since they run on the server and may access databases, file systems, or external APIs directly.

**Testing Server Components:**

Server Components are async functions that return JSX. Test them by calling the function directly and rendering the result.

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import UserProfile from "./page";

// Mock the data layer
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";

describe("UserProfile page", () => {
  it("renders user information", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "1",
      name: "Alice",
      email: "alice@example.com",
      bio: "Software engineer",
    });

    // Server Components are async — await them
    const ui = await UserProfile({ params: { id: "1" } });
    render(ui);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Software engineer")).toBeInTheDocument();
  });

  it("shows not found for missing user", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const ui = await UserProfile({ params: { id: "999" } });
    render(ui);

    expect(screen.getByText(/user not found/i)).toBeInTheDocument();
  });
});
```

**Testing Server Actions:**

```typescript
import { describe, it, expect, vi } from "vitest";
import { createPost } from "./actions";

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

describe("createPost action", () => {
  it("creates a post and revalidates", async () => {
    vi.mocked(db.post.create).mockResolvedValue({
      id: "1",
      title: "Test Post",
      content: "Content here",
      status: "draft",
    });

    const formData = new FormData();
    formData.set("title", "Test Post");
    formData.set("content", "Content here");

    const result = await createPost(formData);

    expect(db.post.create).toHaveBeenCalledWith({
      data: {
        title: "Test Post",
        content: "Content here",
        status: "draft",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/posts");
    expect(result).toEqual({ success: true });
  });

  it("returns validation errors for invalid input", async () => {
    const formData = new FormData();
    formData.set("title", "");
    formData.set("content", "");

    const result = await createPost(formData);

    expect(result).toEqual({
      success: false,
      errors: expect.objectContaining({
        title: expect.any(String),
      }),
    });
    expect(db.post.create).not.toHaveBeenCalled();
  });
});
```

**Testing API Route Handlers:**

```typescript
import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";

describe("POST /api/posts", () => {
  it("creates a post and returns 201", async () => {
    const mockPost = {
      id: "1",
      title: "Test",
      content: "Content",
      status: "draft",
    };
    vi.mocked(db.post.create).mockResolvedValue(mockPost);

    const request = new NextRequest("http://localhost:3000/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: "Test",
        content: "Content",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(mockPost);
  });

  it("returns 400 for invalid input", async () => {
    const request = new NextRequest("http://localhost:3000/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/posts", () => {
  it("returns paginated posts", async () => {
    vi.mocked(db.post.findMany).mockResolvedValue([
      { id: "1", title: "Post 1", content: "Content 1", status: "published" },
      { id: "2", title: "Post 2", content: "Content 2", status: "draft" },
    ]);

    const request = new NextRequest(
      "http://localhost:3000/api/posts?limit=20"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toBeDefined();
  });
});
```

### 7. Async Testing Patterns

Async operations — data fetching, timers, animations — require special handling to avoid flaky tests.

**waitFor — wait for an assertion to pass:**

```typescript
import { render, screen, waitFor } from "@testing-library/react";

it("loads and displays users", async () => {
  render(<UserList />);

  // Shows loading state initially
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for users to appear
  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  // Loading indicator should be gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

**findBy — shorthand for waitFor + getBy:**

```typescript
it("displays success message after save", async () => {
  const user = userEvent.setup();
  render(<SettingsForm />);

  await user.click(screen.getByRole("button", { name: /save/i }));

  // findBy automatically waits
  const message = await screen.findByText(/settings saved/i);
  expect(message).toBeInTheDocument();
});
```

**Testing error states:**

```typescript
it("shows error message when fetch fails", async () => {
  // Override MSW handler for this test
  server.use(
    http.get("/api/users", () => {
      return HttpResponse.json(
        { error: { message: "Internal server error" } },
        { status: 500 }
      );
    })
  );

  render(<UserList />);

  const errorMessage = await screen.findByRole("alert");
  expect(errorMessage).toHaveTextContent(/something went wrong/i);

  // Retry button should be visible
  expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
});
```

**Fake timers for testing debounce, polling, and timeouts:**

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("AutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-saves after 2 seconds of inactivity", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AutoSaveEditor onSave={onSave} />);

    await user.type(screen.getByRole("textbox"), "Hello");

    // Not saved yet (debounce period hasn't elapsed)
    expect(onSave).not.toHaveBeenCalled();

    // Advance past debounce delay
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSave).toHaveBeenCalledWith("Hello");
  });
});
```

### 8. Snapshot Testing

Snapshot testing captures a component's rendered output and compares it against a saved reference. Use sparingly — for stable UI components where you want to detect unintended changes.

**When to use snapshots:**
- Icon components, SVG wrappers
- Static marketing pages or email templates
- Component libraries with stable APIs
- Serialized data structures

**When NOT to use snapshots:**
- Components with dynamic data (timestamps, random IDs)
- Rapidly evolving components during active development
- Components where behavioral tests are more valuable

```typescript
it("renders the logo correctly", () => {
  const { container } = render(<Logo size="large" />);
  expect(container.firstChild).toMatchSnapshot();
});
```

**Inline snapshots — better for small outputs:**

```typescript
it("formats user display name", () => {
  expect(formatDisplayName({ firstName: "Alice", lastName: "Smith" }))
    .toMatchInlineSnapshot(`"Alice Smith"`);
});

it("formats user initials", () => {
  expect(getInitials({ firstName: "Alice", lastName: "Smith" }))
    .toMatchInlineSnapshot(`"AS"`);
});
```

**Updating snapshots when intentional changes are made:**

```bash
# Update all snapshots
vitest --update
# or
jest --updateSnapshot

# Update snapshots interactively
vitest --ui
```

### 9. Code Coverage

Code coverage measures how much of your code is exercised by tests. It is a useful signal but not a goal — 100% coverage does not mean 100% correctness.

**Coverage configuration (Vitest):**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8", // or "istanbul"
      reporter: ["text", "json", "html", "lcov"],
      include: [
        "src/**/*.{ts,tsx}",
        "app/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.stories.{ts,tsx}",
        "**/types/**",
        "**/__mocks__/**",
        "**/index.ts", // barrel files
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

**Running coverage:**

```bash
# Generate coverage report
vitest run --coverage

# Watch mode with coverage
vitest --coverage
```

**What the metrics mean:**

| Metric | What it measures | What it misses |
|--------|-----------------|----------------|
| **Statements** | % of statements executed | Dead code after early returns |
| **Branches** | % of if/else/switch branches taken | Complex boolean logic |
| **Functions** | % of functions called | Functions called with wrong args |
| **Lines** | % of lines executed | Multi-statement lines |

**What coverage does NOT tell you:**

- Whether your assertions are correct (test could execute code without checking results)
- Whether edge cases are covered (you might hit the happy path but miss null/undefined)
- Whether the code is correct (covered code can still have bugs)
- Whether integration between units works (unit coverage says nothing about integration)

**v8 vs istanbul:**

- **v8:** Faster, uses V8's built-in coverage. Occasionally less accurate for complex source maps.
- **istanbul:** Slower, instrumenting-based. More mature, better source map support, more precise for complex transformations.

### 10. Test Factories and Fixtures

Test factories create realistic test data consistently across your test suite. They prevent copy-pasting mock objects and make tests more readable.

**Factory function pattern:**

```typescript
// tests/factories/user.ts
import { faker } from "@faker-js/faker";

interface UserOverrides {
  id?: string;
  name?: string;
  email?: string;
  role?: "admin" | "user" | "moderator";
  createdAt?: Date;
}

export function createUser(overrides: UserOverrides = {}) {
  return {
    id: overrides.id ?? faker.string.uuid(),
    name: overrides.name ?? faker.person.fullName(),
    email: overrides.email ?? faker.internet.email(),
    role: overrides.role ?? "user",
    createdAt: overrides.createdAt ?? faker.date.past(),
    updatedAt: new Date(),
  };
}

export function createUsers(count: number, overrides: UserOverrides = {}) {
  return Array.from({ length: count }, () => createUser(overrides));
}
```

```typescript
// tests/factories/post.ts
import { faker } from "@faker-js/faker";
import { createUser } from "./user";

interface PostOverrides {
  id?: string;
  title?: string;
  content?: string;
  status?: "draft" | "published" | "archived";
  authorId?: string;
}

export function createPost(overrides: PostOverrides = {}) {
  return {
    id: overrides.id ?? faker.string.uuid(),
    title: overrides.title ?? faker.lorem.sentence(),
    content: overrides.content ?? faker.lorem.paragraphs(3),
    status: overrides.status ?? "draft",
    authorId: overrides.authorId ?? faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: new Date(),
  };
}
```

**Using factories in tests:**

```typescript
import { createUser, createUsers } from "@/tests/factories/user";
import { createPost } from "@/tests/factories/post";

describe("UserDashboard", () => {
  it("displays user posts", async () => {
    const user = createUser({ name: "Alice" });
    const posts = [
      createPost({ authorId: user.id, title: "First Post", status: "published" }),
      createPost({ authorId: user.id, title: "Draft Post", status: "draft" }),
    ];

    vi.mocked(db.user.findUnique).mockResolvedValue(user);
    vi.mocked(db.post.findMany).mockResolvedValue(posts);

    render(<UserDashboard userId={user.id} />);

    expect(await screen.findByText("First Post")).toBeInTheDocument();
    expect(screen.getByText("Draft Post")).toBeInTheDocument();
  });

  it("shows empty state for users with no posts", async () => {
    const user = createUser();
    vi.mocked(db.user.findUnique).mockResolvedValue(user);
    vi.mocked(db.post.findMany).mockResolvedValue([]);

    render(<UserDashboard userId={user.id} />);

    expect(await screen.findByText(/no posts yet/i)).toBeInTheDocument();
  });
});
```

**Builder pattern for complex objects:**

```typescript
// tests/factories/order.ts
class OrderBuilder {
  private order: Record<string, unknown> = {
    id: faker.string.uuid(),
    status: "pending",
    items: [],
    total: 0,
    createdAt: new Date(),
  };

  withStatus(status: string) {
    this.order.status = status;
    return this;
  }

  withItems(items: Array<{ name: string; price: number; quantity: number }>) {
    this.order.items = items;
    this.order.total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return this;
  }

  withShipping(address: Record<string, string>) {
    this.order.shippingAddress = address;
    return this;
  }

  build() {
    return { ...this.order };
  }
}

export function orderBuilder() {
  return new OrderBuilder();
}

// Usage
const order = orderBuilder()
  .withStatus("confirmed")
  .withItems([
    { name: "Widget", price: 9.99, quantity: 2 },
    { name: "Gadget", price: 24.99, quantity: 1 },
  ])
  .withShipping({ city: "Portland", state: "OR" })
  .build();
```

### 11. CI Integration

Run tests automatically on every push and pull request to catch regressions early.

**GitHub Actions workflow:**

```yaml
# .github/workflows/test.yml
name: Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
```

---

## LLM Instructions

### Writing Unit Tests for a Component

When generating unit tests for a React component:

- Import from `@testing-library/react` and `@testing-library/user-event`
- Use `screen` queries, preferring `getByRole` and `getByLabelText` over `getByTestId`
- Set up `userEvent.setup()` before render for interaction tests
- Test user-facing behavior, not implementation details (do not test state values directly)
- Mock only external dependencies (API calls, router, database) not internal modules
- Use `vi.fn()` for callback props and assert they are called with expected arguments
- Include tests for: initial render, user interactions, loading states, error states, edge cases

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

describe("ComponentName", () => {
  it("renders initial state correctly", () => {
    render(<ComponentName />);
    expect(screen.getByRole("heading")).toHaveTextContent("Expected Title");
  });

  it("handles user interaction", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<ComponentName onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: /action/i }));
    expect(onAction).toHaveBeenCalledWith(expectedArgs);
  });
});
```

### Writing Tests for Server Actions

When generating tests for Next.js Server Actions:

- Mock `@/lib/db` and `next/cache` (revalidatePath, revalidateTag)
- Create FormData objects to pass as arguments
- Test both success and validation failure paths
- Assert database calls and cache revalidation
- Never test the action through UI rendering — test the function directly

### Writing Tests for API Route Handlers

When generating tests for Next.js API Route Handlers:

- Import the handler functions (GET, POST, PUT, DELETE) directly
- Create `NextRequest` objects with appropriate URL, method, body, and headers
- Assert both the response status code and body content
- Test validation errors, auth failures, and not-found scenarios
- Mock the database layer, not the HTTP layer

### Setting Up Test Infrastructure

When setting up a test suite for a new project:

- Install: `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw @faker-js/faker`
- Create `vitest.config.ts` with jsdom environment and path aliases
- Create `tests/setup.ts` with cleanup, jest-dom matchers, and Next.js mocks
- Create `tests/mocks/handlers.ts` for MSW API mocks
- Create `tests/factories/` for test data factories
- Add coverage thresholds to prevent regression

---

## Examples

### 1. Complete Component Test Suite

A comprehensive test suite for a search component with debounced input, API fetching, and result rendering:

```typescript
// components/search.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { server } from "@/tests/mocks/server";
import { http, HttpResponse } from "msw";
import { Search } from "./search";

describe("Search", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input with placeholder", () => {
    render(<Search />);
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Search..."
    );
  });

  it("debounces search input and fetches results", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    server.use(
      http.get("/api/search", ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q");
        return HttpResponse.json({
          data: [
            { id: "1", title: `Result for "${q}"` },
          ],
        });
      })
    );

    render(<Search />);

    await user.type(screen.getByRole("searchbox"), "react");

    // Advance past debounce delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Wait for results
    expect(await screen.findByText(/result for "react"/i)).toBeInTheDocument();
  });

  it("shows empty state when no results found", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    server.use(
      http.get("/api/search", () => {
        return HttpResponse.json({ data: [] });
      })
    );

    render(<Search />);

    await user.type(screen.getByRole("searchbox"), "xyznonexistent");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(await screen.findByText(/no results/i)).toBeInTheDocument();
  });

  it("shows error state when search fails", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    server.use(
      http.get("/api/search", () => {
        return HttpResponse.json(
          { error: { message: "Search unavailable" } },
          { status: 503 }
        );
      })
    );

    render(<Search />);

    await user.type(screen.getByRole("searchbox"), "test");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("clears results when input is emptied", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    server.use(
      http.get("/api/search", () => {
        return HttpResponse.json({
          data: [{ id: "1", title: "Some Result" }],
        });
      })
    );

    render(<Search />);

    await user.type(screen.getByRole("searchbox"), "test");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(await screen.findByText("Some Result")).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText("Some Result")).not.toBeInTheDocument();
    });
  });
});
```

### 2. Complete API Route Handler Test Suite

```typescript
// app/api/posts/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/posts", () => {
  it("returns paginated posts", async () => {
    const posts = [
      { id: "1", title: "Post 1", status: "published" },
      { id: "2", title: "Post 2", status: "published" },
    ];
    vi.mocked(db.post.findMany).mockResolvedValue(posts);

    const req = new NextRequest("http://localhost/api/posts?limit=10");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(posts);
  });

  it("filters by status", async () => {
    vi.mocked(db.post.findMany).mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/posts?status=draft");
    await GET(req);

    expect(db.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "draft" }),
      })
    );
  });

  it("rejects invalid query parameters", async () => {
    const req = new NextRequest("http://localhost/api/posts?limit=abc");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});

describe("POST /api/posts", () => {
  it("creates a post when authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: "user-1" });
    vi.mocked(db.post.create).mockResolvedValue({
      id: "new-1",
      title: "New Post",
      content: "Content",
      status: "draft",
      authorId: "user-1",
    });

    const req = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "New Post", content: "Content" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.title).toBe("New Post");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

    const req = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
```

---

## Common Mistakes

### 1. Testing Implementation Details

**Wrong:**

```typescript
it("updates the state when button is clicked", () => {
  const { result } = renderHook(() => useState(0));
  act(() => result.current[1](1));
  expect(result.current[0]).toBe(1);
});
```

**Fix:** Test what the user sees, not internal state. Render the component, click the button, and assert the visible output changes. If the component refactors from `useState` to `useReducer`, the test should still pass.

### 2. Using getBy for Absence Assertions

**Wrong:**

```typescript
expect(screen.getByText("Error")).not.toBeInTheDocument();
// Throws before the assertion — getBy throws when element not found
```

**Fix:** Use `queryBy` when asserting something is NOT present: `expect(screen.queryByText("Error")).not.toBeInTheDocument()`.

### 3. Not Awaiting User Events

**Wrong:**

```typescript
it("submits the form", () => {
  const user = userEvent.setup();
  render(<Form />);
  user.click(screen.getByRole("button")); // Missing await
  expect(handleSubmit).toHaveBeenCalled(); // Might fail intermittently
});
```

**Fix:** Always `await` user event calls. `userEvent.setup()` returns async methods that simulate real browser events including focus, pointer, and keyboard sequences.

### 4. Over-Mocking

**Wrong:**

```typescript
// Mocking every internal function
vi.mock("./validate");
vi.mock("./transform");
vi.mock("./format");
// Now you're testing that functions are called, not that they work
```

**Fix:** Only mock external boundaries (network, database, file system, browser APIs). Let internal functions run for real. If a function is pure, test its output directly without mocking its dependencies.

### 5. Snapshot Overuse

**Wrong:**

```typescript
it("renders correctly", () => {
  const { container } = render(<EntireApp />);
  expect(container).toMatchSnapshot();
  // 5000-line snapshot that nobody reviews
});
```

**Fix:** Use snapshots only for small, stable components (icons, badges). For everything else, write explicit assertions about the content you care about. Large snapshots get auto-updated without review.

### 6. Missing Error Path Tests

**Wrong:** Only testing the happy path.

```typescript
it("creates a user", async () => {
  // Only tests successful creation
  const user = await createUser({ name: "Alice" });
  expect(user).toBeDefined();
});
```

**Fix:** Test error scenarios: invalid input, network failures, auth errors, race conditions. Error paths are where most bugs live.

### 7. Test Interdependence

**Wrong:**

```typescript
let createdUserId: string;

it("creates a user", async () => {
  const user = await createUser({ name: "Alice" });
  createdUserId = user.id; // Shared state between tests
});

it("fetches the created user", async () => {
  const user = await fetchUser(createdUserId); // Depends on first test
  expect(user.name).toBe("Alice");
});
```

**Fix:** Each test must be independent. Use `beforeEach` to set up required state. Tests should pass in any order and in isolation.

### 8. Ignoring Async Cleanup

**Wrong:**

```typescript
it("polls for updates", async () => {
  render(<Poller />);
  expect(await screen.findByText("Updated")).toBeInTheDocument();
  // Test ends but polling interval is still running
  // Next test gets "act() warning" from lingering updates
});
```

**Fix:** Clean up timers, subscriptions, and intervals. Use `vi.useFakeTimers()` for timer-based code. Use cleanup functions in `afterEach`. Ensure components properly cancel async work on unmount.

### 9. Hardcoded Test Data

**Wrong:**

```typescript
const mockUser = { id: "1", name: "Test", email: "test@test.com", role: "admin" };
// Copied across 50 test files, some slightly different
```

**Fix:** Use factory functions that generate consistent test data. Factories are the single source of truth for test object shapes and keep tests readable.

### 10. Testing Framework Internals

**Wrong:**

```typescript
it("calls useEffect on mount", () => {
  const spy = vi.spyOn(React, "useEffect");
  render(<Component />);
  expect(spy).toHaveBeenCalled();
});
```

**Fix:** Never test that React hooks are called. Test the observable behavior that results from the hook — the rendered output, side effects (API calls), or DOM changes.

---

> **See also:** [E2E Testing](./e2e-testing) | [Test Strategy](./test-strategy) | [Performance Testing](./performance-testing) | [Frontend/React Fundamentals](../frontend/react-fundamentals)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
