# React Fundamentals
> Core React 19 patterns — hooks, state, effects, refs, error boundaries, Suspense, and concurrent features for AI-assisted development.

---

## Principles

### 1. UI as a Function of State

React's mental model: `UI = f(state)`. Your component is a function that takes data and returns JSX. When state changes, React re-runs the function and efficiently updates the DOM. You never touch the DOM directly — you describe what the UI should look like for any given state, and React figures out the diff.

This is why mutation breaks React. If you mutate state, React doesn't know anything changed. Always create new references:

```tsx
// WRONG — React won't re-render
user.name = "Alice";
setUser(user);

// RIGHT — new reference triggers re-render
setUser({ ...user, name: "Alice" });
```

### 2. useState and the Rules of State Updates

State is the single mechanism for triggering re-renders. Key rules:

**Immutable updates.** Never mutate. Always spread objects and arrays.

**Batching.** React 18+ batches all state updates in event handlers, timeouts, promises, and native events. Multiple `setState` calls in the same function produce one re-render.

**Functional updaters.** When new state depends on old state, use the function form:

```tsx
// WRONG — stale closure if called multiple times
setCount(count + 1);

// RIGHT — always reads latest state
setCount(prev => prev + 1);
```

**Lazy initializers.** If initial state is expensive to compute, pass a function:

```tsx
const [data, setData] = useState(() => parseExpensiveJSON(raw));
```

### 3. useEffect and the Synchronization Model

`useEffect` is not a lifecycle method — it's a synchronization mechanism. It synchronizes your component with an external system (API, DOM API, timer, WebSocket, third-party library).

**Dependency array rules:**
- Every value from the component scope used inside the effect must be in the dependency array
- Empty array `[]` means "run once after initial render and clean up on unmount"
- No array means "run after every render" — almost never what you want

**Cleanup is mandatory** for subscriptions, timers, and event listeners:

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then(setData);
  return () => controller.abort();
}, [url]);
```

**You don't need useEffect for:**
- Transforming data for rendering (compute during render)
- Handling user events (use event handlers)
- Resetting state when props change (use a `key`)
- Anything that doesn't synchronize with an external system

### 4. useRef: Mutable Values That Don't Trigger Re-renders

`useRef` holds a mutable `.current` value that persists across renders without triggering re-renders. Two main uses:

**DOM references:**

```tsx
const inputRef = useRef<HTMLInputElement>(null);
// Later: inputRef.current?.focus();
```

**Mutable instance variables** (previous values, timers, flags):

```tsx
const prevValue = useRef(value);
useEffect(() => {
  prevValue.current = value;
});
```

Never read or write `.current` during rendering (except for lazy initialization). Side effects with refs belong in `useEffect` or event handlers.

### 5. useMemo, useCallback, and React.memo: When to Optimize

These are performance tools, not defaults. They have a cost: memory for caching + comparison overhead on every render.

**React.memo** — wraps a component to skip re-rendering when props haven't changed (shallow comparison). Use for components that re-render often with the same props.

**useMemo** — caches a computed value. Use when computation is genuinely expensive (filtering 10,000 items, not formatting a string).

**useCallback** — caches a function reference. Primary use case: passing callbacks to `React.memo`-wrapped children.

**React Compiler (React 19).** Automatically memoizes components and values. If your project uses React Compiler, manual `useMemo`/`useCallback` are redundant. The compiler handles it. Check your build config to know if it's active.

**Rule of thumb:** Don't memoize by default. Profile first. If the React DevTools Profiler shows a component re-rendering unnecessarily and it's measurably slow, then memoize.

### 6. React 19 New Hooks

**useTransition** — marks a state update as non-urgent, keeping the UI responsive during expensive transitions:

```tsx
const [isPending, startTransition] = useTransition();
startTransition(() => setFilteredData(expensiveFilter(data)));
```

**useOptimistic** — shows optimistic state while an async action is pending:

```tsx
const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (state, newItem) => [...state, { ...newItem, pending: true }]
);
```

**useActionState** — manages form state from Server Actions (replaces `useFormState`):

```tsx
const [state, formAction, isPending] = useActionState(serverAction, initialState);
```

**use** — reads a resource (Promise or Context) during render. Unlike hooks, `use` can be called conditionally:

```tsx
const data = use(dataPromise);
const theme = use(ThemeContext);
```

### 7. JSX Patterns and Anti-Patterns

**Conditional rendering options:**

```tsx
// Boolean gate — clean for show/hide
{isLoggedIn && <Dashboard />}

// Ternary — clean for either/or
{isLoggedIn ? <Dashboard /> : <Login />}

// Early return — clean for layout-level changes
if (!user) return <Login />;
return <Dashboard user={user} />;
```

**The `&&` pitfall with falsy values:**

```tsx
// BUG: renders "0" as text when count is 0
{count && <Badge count={count} />}

// FIX: explicit boolean
{count > 0 && <Badge count={count} />}
```

**Keys must be stable and unique.** Use database IDs or natural keys. Never use `Math.random()`. Avoid array index unless the list is static and never reordered.

**Fragments avoid unnecessary wrapper divs:**

```tsx
<>
  <Header />
  <Main />
</>
```

### 8. Refs and Imperative Handles

**forwardRef** passes a ref through a component to a child DOM element:

```tsx
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));
```

**useImperativeHandle** exposes a custom API instead of the full DOM node:

```tsx
useImperativeHandle(ref, () => ({
  focus: () => inputRef.current?.focus(),
  scrollIntoView: () => inputRef.current?.scrollIntoView({ behavior: "smooth" }),
}));
```

Use sparingly — imperative patterns are an escape hatch, not the default.

### 9. Error Boundaries

Error boundaries catch JavaScript errors in the component tree below them and display a fallback UI. They must be class components (no hook equivalent yet):

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { logError(error, info); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

**What they catch:** Rendering errors, lifecycle errors, constructor errors.
**What they don't catch:** Event handlers, async code, server-side rendering, errors in the boundary itself.

Use `react-error-boundary` for a production-ready implementation with reset and retry capabilities.

**Place boundaries strategically:**
- One at the app root (catch-all)
- One around each major feature section
- One around risky third-party components

### 10. Suspense and Concurrent Features

Suspense lets you declaratively handle loading states:

```tsx
<Suspense fallback={<Skeleton />}>
  <AsyncComponent />
</Suspense>
```

Suspense works with:
- `React.lazy()` for code-split components
- Data fetching libraries that integrate with Suspense (TanStack Query, Next.js RSC)
- The `use()` hook with Promises

**Nested Suspense boundaries** create progressive loading:

```tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<ContentSkeleton />}>
    <MainContent />
  </Suspense>
  <Suspense fallback={<SidebarSkeleton />}>
    <Sidebar />
  </Suspense>
</Suspense>
```

Each boundary resolves independently. The header shows first, then content and sidebar resolve separately.

### 11. Strict Mode, Reconciliation, and the Virtual DOM

**Strict Mode** (development only) intentionally double-invokes:
- Component functions (to find impure renders)
- useEffect setup and cleanup (to find missing cleanup)
- Constructors and other lifecycle methods

If your component breaks in Strict Mode, it has a bug. Don't remove Strict Mode — fix the component.

**Reconciliation** is React's diffing algorithm. Key rules:
- Different element types → tear down and rebuild entire subtree
- Same element type → update props in place
- Keys tell React which items in a list correspond across renders

**Virtual DOM** is React's in-memory representation. On state change: re-render → diff old vs new VDOM → apply minimal DOM updates. You never need to think about this — just write pure render functions and let React handle it.

---

## LLM Instructions

### Writing Components

When generating React components:
- Use functional components exclusively. Class components are only for error boundaries.
- Use TypeScript with explicit prop interfaces. Define `interface Props` above the component.
- Destructure props in the function signature: `function Card({ title, children }: Props)`.
- Use named exports, not default exports: `export function Card()` not `export default function Card`.
- Keep components under 150 lines. If larger, extract sub-components or custom hooks.
- Colocate related code. Put the component, its types, its styles, and its tests in the same directory.

### Choosing Hooks

Follow this decision tree:
- Need to store a value and re-render on change → `useState`
- Need to derive a value from existing state/props → compute during render (no hook)
- Need to synchronize with an external system → `useEffect`
- Need a mutable value that doesn't trigger re-renders → `useRef`
- Need a DOM reference → `useRef`
- Need to mark a slow state update as non-urgent → `useTransition`
- Need optimistic UI during an async action → `useOptimistic`
- Need form state from a Server Action → `useActionState`
- Need expensive computation cached → `useMemo` (profile first)
- Need stable function reference for memoized child → `useCallback` (profile first)

### Handling Effects

Before writing a `useEffect`, ask: "Am I synchronizing with an external system?" If no, you probably don't need it.

Common cases that DO need useEffect:
- Subscribing to WebSocket, EventSource, or BroadcastChannel
- Setting up/tearing down third-party libraries (maps, charts, editors)
- Syncing with browser APIs (IntersectionObserver, ResizeObserver, MediaQuery)
- Fetching data when no framework handles it (prefer Server Components or TanStack Query)

Common cases that do NOT need useEffect:
- Computing derived values → calculate during render
- Handling user interactions → use event handlers
- Resetting state when a key prop changes → use the `key` prop
- "Running something on mount" → usually a sign of wrong architecture

### Error Boundaries

Always wrap these in error boundaries:
- The app root
- Route-level content areas
- Data-dependent sections
- Third-party widget integrations

Use `react-error-boundary` for features like `resetKeys`, `onReset`, and `FallbackComponent`.

### Suspense Strategy

Place Suspense boundaries to match your loading UX:
- One wrapper for the whole page → single loading state
- Separate wrappers for independent sections → progressive reveal
- Inside list items → each item loads independently

Never put a Suspense boundary inside a component that throws — put it above in the parent.

### Avoiding Anti-Patterns

When reviewing or generating code, watch for:
- `useEffect` that updates state based on props or other state (use derived state instead)
- Components defined inside other components (define at module level)
- Missing cleanup in effects that subscribe to things
- Index keys on dynamic, reorderable lists
- `useState` + `useEffect` to sync two pieces of state (compute one from the other)

---

## Examples

### 1. useLocalStorage Custom Hook

A reusable hook that syncs state with localStorage, with SSR safety and cross-tab synchronization:

```tsx
import { useState, useEffect, useCallback } from "react";

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    },
    [key],
  );

  // Sync across tabs
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === key && e.newValue !== null) {
        setStoredValue(JSON.parse(e.newValue) as T);
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue] as const;
}

// Usage
function Settings() {
  const [theme, setTheme] = useLocalStorage("theme", "system");
  const [fontSize, setFontSize] = useLocalStorage("font-size", 16);

  return (
    <div>
      <select value={theme} onChange={e => setTheme(e.target.value)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <input
        type="range"
        min={12}
        max={24}
        value={fontSize}
        onChange={e => setFontSize(Number(e.target.value))}
      />
    </div>
  );
}
```

### 2. Error Boundary with Recovery

Using `react-error-boundary` for production-ready error handling with retry and reset:

```tsx
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <pre className="mt-2 text-sm text-red-600">{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

function logError(error: Error, info: { componentStack?: string | null }) {
  // Send to your error tracking service
  console.error("Caught by boundary:", error, info.componentStack);
}

// Usage — resets when userId changes
function UserProfile({ userId }: { userId: string }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      resetKeys={[userId]}
      onReset={() => {
        // Clear any cached data that might have caused the error
      }}
    >
      <UserDetails userId={userId} />
      <UserPosts userId={userId} />
    </ErrorBoundary>
  );
}
```

### 3. useOptimistic Todo List

Optimistic UI that shows new items immediately while the server processes:

```tsx
"use client";

import { useOptimistic, useRef } from "react";

interface Todo {
  id: string;
  text: string;
  pending?: boolean;
}

function TodoList({
  todos,
  addTodoAction,
}: {
  todos: Todo[];
  addTodoAction: (text: string) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (state, newText: string) => [
      ...state,
      { id: `temp-${Date.now()}`, text: newText, pending: true },
    ],
  );

  async function handleSubmit(formData: FormData) {
    const text = formData.get("text") as string;
    if (!text.trim()) return;
    formRef.current?.reset();
    addOptimistic(text);
    await addTodoAction(text);
  }

  return (
    <div>
      <form ref={formRef} action={handleSubmit}>
        <input
          name="text"
          placeholder="Add a todo..."
          className="rounded border px-3 py-2"
          required
        />
        <button type="submit" className="ml-2 rounded bg-blue-600 px-4 py-2 text-white">
          Add
        </button>
      </form>
      <ul className="mt-4 space-y-2">
        {optimisticTodos.map(todo => (
          <li
            key={todo.id}
            className={todo.pending ? "opacity-50" : ""}
          >
            {todo.text}
            {todo.pending && <span className="ml-2 text-sm text-gray-400">Saving...</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4. useTransition for Expensive Filtering

Keeping the input responsive while filtering a large dataset:

```tsx
"use client";

import { useState, useTransition, useMemo } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

function ProductFilter({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(
    () => ["all", ...new Set(products.map(p => p.category))],
    [products],
  );

  // The filtered list is derived state — computed during render
  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  return (
    <div>
      <div className="flex gap-4">
        <input
          value={query}
          onChange={e => {
            // Input stays responsive — filtering is non-urgent
            startTransition(() => setQuery(e.target.value));
          }}
          placeholder="Search products..."
          className="rounded border px-3 py-2"
        />
        <select
          value={category}
          onChange={e => startTransition(() => setCategory(e.target.value))}
          className="rounded border px-3 py-2"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All Categories" : cat}
            </option>
          ))}
        </select>
      </div>

      <div className={isPending ? "opacity-70 transition-opacity" : ""}>
        <p className="my-4 text-sm text-gray-500">{filtered.length} products</p>
        <ul className="space-y-2">
          {filtered.map(product => (
            <li key={product.id} className="rounded border p-3">
              <span className="font-medium">{product.name}</span>
              <span className="ml-2 text-gray-500">${product.price}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### 5. Nested Suspense Hierarchy

Progressive loading where each section resolves independently:

```tsx
import { Suspense } from "react";

function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Header loads with the page — no Suspense needed */}
      <header className="col-span-12">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </header>

      {/* Stats load first — small data */}
      <Suspense fallback={<StatsSkeleton />}>
        <section className="col-span-12">
          <StatsCards />
        </section>
      </Suspense>

      {/* Chart and activity load independently */}
      <Suspense fallback={<ChartSkeleton />}>
        <section className="col-span-8">
          <RevenueChart />
        </section>
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <aside className="col-span-4">
          <RecentActivity />
        </aside>
      </Suspense>
    </div>
  );
}

// Skeleton components match the shape of loaded content
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-80 animate-pulse rounded-lg bg-gray-200" />;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
      ))}
    </div>
  );
}
```

---

## Common Mistakes

### 1. useEffect for Derived State

**Wrong:**
```tsx
const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState(0);

useEffect(() => {
  setTotal(items.reduce((sum, item) => sum + item.price, 0));
}, [items]);
```

**Fix:** Compute during render — no hook needed:
```tsx
const [items, setItems] = useState<Item[]>([]);
const total = items.reduce((sum, item) => sum + item.price, 0);
```

### 2. Missing or Incorrect Dependencies

**Wrong:**
```tsx
useEffect(() => {
  fetchUser(userId).then(setUser);
}, []); // Missing userId — stale data when userId changes
```

**Fix:** Include all dependencies:
```tsx
useEffect(() => {
  const controller = new AbortController();
  fetchUser(userId, { signal: controller.signal }).then(setUser);
  return () => controller.abort();
}, [userId]);
```

### 3. Mutating State Directly

**Wrong:**
```tsx
const handleToggle = (id: string) => {
  const item = items.find(i => i.id === id);
  if (item) item.completed = !item.completed; // Mutation!
  setItems(items); // Same reference — no re-render
};
```

**Fix:** Create new references:
```tsx
const handleToggle = (id: string) => {
  setItems(items.map(item =>
    item.id === id ? { ...item, completed: !item.completed } : item
  ));
};
```

### 4. Defining Components Inside Components

**Wrong:**
```tsx
function Parent() {
  // This creates a NEW component type every render
  // Child's state resets every time Parent re-renders
  function Child() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
  }
  return <Child />;
}
```

**Fix:** Define components at module level:
```tsx
function Child() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

function Parent() {
  return <Child />;
}
```

### 5. Array Index as Key on Dynamic Lists

**Wrong:**
```tsx
{todos.map((todo, index) => (
  <TodoItem key={index} todo={todo} /> // Items shuffled = wrong state preserved
))}
```

**Fix:** Use a stable, unique identifier:
```tsx
{todos.map(todo => (
  <TodoItem key={todo.id} todo={todo} />
))}
```

Index keys are only safe for static lists that are never reordered, filtered, or have items inserted.

### 6. Calling Hooks Conditionally

**Wrong:**
```tsx
function Profile({ user }: { user?: User }) {
  if (!user) return null;
  const [editing, setEditing] = useState(false); // Hook after early return!
}
```

**Fix:** Hooks must be called in the same order every render:
```tsx
function Profile({ user }: { user?: User }) {
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  // ...
}
```

### 7. Empty Dependencies as "componentDidMount"

**Wrong:**
```tsx
useEffect(() => {
  // "I just want this to run once on mount"
  const sub = eventBus.subscribe(handleEvent);
  // No cleanup — memory leak
}, []);
```

**Fix:** Think in terms of synchronization, not lifecycle. Always clean up:
```tsx
useEffect(() => {
  const sub = eventBus.subscribe(handleEvent);
  return () => sub.unsubscribe();
}, [handleEvent]);
```

### 8. Premature Memoization

**Wrong:**
```tsx
// Wrapping EVERYTHING in useMemo/useCallback
const name = useMemo(() => `${first} ${last}`, [first, last]);
const handleClick = useCallback(() => setOpen(true), []);
```

**Fix:** Only memoize when profiling shows a measurable benefit:
```tsx
const name = `${first} ${last}`; // String concat is fast
const handleClick = () => setOpen(true); // Fine for most components

// DO memoize: expensive computation passed to a memo'd child
const sortedData = useMemo(
  () => data.toSorted((a, b) => a.score - b.score),
  [data],
);
```

### 9. Missing Effect Cleanup

**Wrong:**
```tsx
useEffect(() => {
  const interval = setInterval(() => setCount(c => c + 1), 1000);
  // No cleanup — interval runs forever, even after unmount
}, []);
```

**Fix:** Always return a cleanup function:
```tsx
useEffect(() => {
  const interval = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(interval);
}, []);
```

### 10. The `&&` Operator with Falsy Numbers

**Wrong:**
```tsx
// Renders "0" as text when count is 0
{count && <NotificationBadge count={count} />}
```

**Fix:** Use explicit boolean comparison:
```tsx
{count > 0 && <NotificationBadge count={count} />}

// Or use a ternary
{count ? <NotificationBadge count={count} /> : null}
```

---

> **See also:** [Next.js Patterns](../Nextjs-Patterns/nextjs-patterns.md) | [TypeScript-React](../TypeScript-React/typescript-react.md) | [Component Patterns](../Component-Patterns/component-patterns.md) | [State Management](../State-Management/state-management.md) | [Data Fetching](../Data-Fetching/data-fetching.md) | [Forms & Validation](../Forms-Validation/forms-validation.md)
>
> **Last reviewed:** 2026-02
