# State Management
> Server state, client state, URL state, and form state — choosing the right tool for each type in React and Next.js, structured for AI-assisted development.

---

## Principles

### 1. The Four Types of Frontend State

Not all state is the same. Using the wrong tool for the wrong type is the root of most state management pain:

**Server state** — data that lives on the server and is cached on the client (users, products, posts). It's not your state — it's a cache of someone else's state. Use TanStack Query or SWR.

**Client state** — ephemeral UI state that only exists in the browser (sidebar open/closed, selected tab, modal visibility). Use `useState`, `useReducer`, Zustand, or Jotai.

**URL state** — state that should survive page refresh and be shareable via URL (search filters, pagination, sort order). Use `useSearchParams` or nuqs.

**Form state** — input values, validation errors, dirty/touched tracking, submission state. Use React Hook Form + Zod.

The golden rule: **keep state in the right place.** Server data in a cache library. Filters in the URL. UI toggles in local state. Don't put everything in a global store.

### 2. Server State Paradigm Shift

The old model: fetch data in `useEffect`, store it in `useState` or Redux, manually handle loading/error/refetching.

The new model: treat server data as a **cache** with automatic:
- Deduplication — multiple components requesting the same data make one request
- Background refetching — stale data is shown instantly, fresh data replaces it
- Cache invalidation — mutations automatically refresh related queries
- Optimistic updates — UI updates immediately, rolls back on failure

This is what TanStack Query (React Query) and SWR provide. Use them instead of `useEffect` + `useState` for server data.

### 3. TanStack Query (React Query)

The standard for server state management in client components:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function ProductList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch("/api/products").then(r => r.json()),
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;
  return <ProductGrid products={data} />;
}
```

**Key concepts:**
- `queryKey` — unique identifier for the cached data. Include all variables that affect the query.
- `staleTime` — how long data is considered fresh (no background refetch)
- `gcTime` — how long unused data stays in cache before garbage collection
- `queryFn` — the function that fetches the data

### 4. SWR: The Simpler Alternative

SWR (stale-while-revalidate) is simpler than TanStack Query with fewer features:

```tsx
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function Profile() {
  const { data, error, isLoading } = useSWR("/api/user", fetcher);
  // ...
}
```

**Choose SWR when:** You need simple data fetching with caching and don't need optimistic updates, infinite queries, or complex cache invalidation.

**Choose TanStack Query when:** You need mutations, optimistic updates, manual cache manipulation, or complex query patterns.

### 5. Zustand

Lightweight client state management. No boilerplate, no providers, no context:

```tsx
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

// Usage — with selector for minimal re-renders
function Sidebar() {
  const open = useUIStore(state => state.sidebarOpen);
  const toggle = useUIStore(state => state.toggleSidebar);
  // Only re-renders when sidebarOpen changes
  return open ? <SidebarContent onClose={toggle} /> : null;
}
```

**When to use Zustand:** Client UI state that needs to be shared across components that aren't in a parent-child relationship. Examples: sidebar state, theme, notification queue, shopping cart.

### 6. Jotai

Atomic state management — each piece of state is an independent atom:

```tsx
import { atom, useAtom, useAtomValue } from "jotai";

// Atoms
const themeAtom = atom<"light" | "dark" | "system">("system");
const localeAtom = atom<string>("en");

// Derived atom — computed from other atoms
const isDarkAtom = atom(get => {
  const theme = get(themeAtom);
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
});

// Usage
function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);
  return <select value={theme} onChange={e => setTheme(e.target.value as any)}>...</select>;
}

function SomeComponent() {
  const isDark = useAtomValue(isDarkAtom); // Read-only, derived
  return <div className={isDark ? "dark" : ""}>{/* ... */}</div>;
}
```

**When to use Jotai:** When you have many small, independent pieces of state that components subscribe to individually. Good for form builders, config panels, and feature flags.

### 7. When You Don't Need a Library

`useState` is sufficient for most component-level state. `useReducer` handles complex state transitions. Don't reach for Zustand or Jotai until you actually have state sharing problems.

**Rules of thumb:**
- State used by one component → `useState`
- Complex state transitions in one component → `useReducer`
- State shared by 2-3 nearby components → lift state to parent
- State shared across distant components (low update frequency) → Context
- State shared across distant components (high update frequency) → Zustand/Jotai
- Server data → TanStack Query / SWR
- URL-persisted data → URL state (nuqs / searchParams)

### 8. URL State

Filters, search queries, pagination, and sort order belong in the URL. This makes the UI bookmarkable, shareable, and survives page refresh.

**Next.js `useSearchParams`:**
```tsx
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

function Filters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const category = searchParams.get("category") ?? "all";
  // ...
}
```

**nuqs — type-safe URL state:**
```tsx
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";

function ProductFilters() {
  const [category, setCategory] = useQueryState("category", parseAsString.withDefault("all"));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault("name"));

  return (
    <div>
      <select value={category} onChange={e => setCategory(e.target.value)}>
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>
      {/* ... */}
    </div>
  );
}
```

### 9. React Context: When and Performance Pitfalls

Context is for low-frequency, global values: theme, locale, auth state, feature flags.

**The problem:** Every consumer of a Context re-renders when ANY value in the Context changes. If you put 10 values in one Context, changing one re-renders all consumers.

**Split contexts by update frequency:**

```tsx
// WRONG — one context for everything
const AppContext = createContext({ user, theme, locale, sidebarOpen });

// RIGHT — separate contexts by update frequency
const AuthContext = createContext<AuthState>(null);     // Changes on login/logout
const ThemeContext = createContext<ThemeState>(null);    // Changes rarely
const UIContext = createContext<UIState>(null);          // Changes frequently
```

**When to use Context vs Zustand:**
- Context → static/rare updates (theme, locale, auth, feature flags)
- Zustand → frequent updates (UI state, notifications, real-time data)

### 10. State Machines for Complex UI

When state transitions have rules (not any state can go to any other state), use a state machine:

```tsx
import { useMachine } from "@xstate/react";
import { createMachine } from "xstate";

const checkoutMachine = createMachine({
  id: "checkout",
  initial: "cart",
  states: {
    cart: {
      on: { PROCEED: "shipping" },
    },
    shipping: {
      on: {
        PROCEED: "payment",
        BACK: "cart",
      },
    },
    payment: {
      on: {
        SUBMIT: "processing",
        BACK: "shipping",
      },
    },
    processing: {
      on: {
        SUCCESS: "confirmation",
        FAILURE: "payment",
      },
    },
    confirmation: {
      type: "final",
    },
  },
});
```

**When to use state machines:** Multi-step forms, checkout flows, media players, complex modals with multiple states, anything where invalid state transitions cause bugs.

### 11. Global State Anti-Patterns

**"Put everything in Redux"** — the old approach. Most apps don't need Redux. Server data belongs in a cache library, not a global store.

**Prop drilling avoidance at all costs** — adding global state to avoid passing props through 2-3 levels is worse than the prop drilling. Composition (children prop) often solves prop drilling without any state library.

**Storing server data in client state** — fetching data in `useEffect`, storing in `useState` or Zustand. This loses all cache benefits (deduplication, background refetching, stale-while-revalidate).

---

## LLM Instructions

### Choosing a State Solution

When deciding how to manage state:
1. **Is it server data?** → TanStack Query (client components) or Server Components (preferred for Next.js)
2. **Should it be in the URL?** (filters, search, pagination, sort) → nuqs or useSearchParams
3. **Is it form data?** → React Hook Form + Zod
4. **Is it shared across distant components?** → Zustand (frequent updates) or Context (rare updates)
5. **Is it local to one component?** → `useState` or `useReducer`

### TanStack Query Setup

When setting up TanStack Query:
- Create a `QueryClientProvider` in a client component wrapper
- Define `staleTime` globally (recommended: 5 minutes for most apps)
- Create custom hooks for each data type: `useProducts()`, `useUser()`, etc.
- Use `queryKey` arrays that include all filter/pagination parameters
- Use `useMutation` + `queryClient.invalidateQueries` for mutations
- Use `placeholderData: keepPreviousData` for pagination to avoid loading flicker

### Zustand Setup

When creating a Zustand store:
- One store per domain (UI store, cart store, notification store)
- Use selectors to prevent unnecessary re-renders: `useStore(s => s.value)`
- Add `persist` middleware for state that should survive page refresh
- Add `devtools` middleware for debugging
- Keep stores thin — don't put server data in Zustand

### URL State

When state should be in the URL:
- Install `nuqs` for type-safe URL state with Next.js App Router
- Use parsers: `parseAsString`, `parseAsInteger`, `parseAsArrayOf`
- Set sensible defaults with `.withDefault()`
- Debounce search inputs to avoid excessive URL updates
- Use `shallow: true` routing when URL changes shouldn't trigger data refetching

### Context Correctly

When using React Context:
- Split contexts by update frequency (auth, theme, locale as separate contexts)
- Use a Provider component that wraps the context value in `useMemo`
- Never put rapidly changing values in Context
- Colocate the provider as close to the consumers as possible
- Expose a custom hook: `useAuth()` instead of `useContext(AuthContext)`

### Avoiding Over-Engineering

Before adding a state library, ask:
1. Can this be derived from existing state? (compute during render)
2. Can this stay in the URL? (useSearchParams)
3. Can this stay local? (useState)
4. Can lifting state to a parent solve the sharing problem?
5. Can the children prop solve the prop drilling?

Only add Zustand/Jotai when you've exhausted simpler options.

---

## Examples

### 1. TanStack Query CRUD with Optimistic Updates

Complete data management for a todo application:

```tsx
// hooks/use-todos.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const todoKeys = {
  all: ["todos"] as const,
  list: (filters: { status?: string }) => [...todoKeys.all, "list", filters] as const,
  detail: (id: string) => [...todoKeys.all, "detail", id] as const,
};

export function useTodos(status?: string) {
  return useQuery({
    queryKey: todoKeys.list({ status }),
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const res = await fetch(`/api/todos${params}`);
      if (!res.ok) throw new Error("Failed to fetch todos");
      return res.json() as Promise<Todo[]>;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to create todo");
      return res.json() as Promise<Todo>;
    },
    // Optimistic update
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.all });

      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.list({}));

      queryClient.setQueryData<Todo[]>(todoKeys.list({}), (old = []) => [
        ...old,
        { id: `temp-${Date.now()}`, text, completed: false },
      ]);

      return { previousTodos };
    },
    onError: (_err, _text, context) => {
      // Roll back on error
      if (context?.previousTodos) {
        queryClient.setQueryData(todoKeys.list({}), context.previousTodos);
      }
    },
    onSettled: () => {
      // Always refetch after mutation to get server truth
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}

export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update todo");
      return res.json() as Promise<Todo>;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.all });
      const previous = queryClient.getQueryData<Todo[]>(todoKeys.list({}));

      queryClient.setQueryData<Todo[]>(todoKeys.list({}), (old = []) =>
        old.map(todo => (todo.id === id ? { ...todo, completed } : todo)),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(todoKeys.list({}), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}
```

```tsx
// components/todo-list.tsx
"use client";

import { useTodos, useCreateTodo, useToggleTodo } from "@/hooks/use-todos";
import { useRef } from "react";

export function TodoList() {
  const { data: todos = [], isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const toggleTodo = useToggleTodo();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text) return;
    createTodo.mutate(text);
    inputRef.current!.value = "";
  }

  if (isLoading) return <TodoSkeleton />;

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input
          ref={inputRef}
          placeholder="Add a todo..."
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={createTodo.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>
      <ul className="space-y-2">
        {todos.map(todo => (
          <li key={todo.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo.mutate({ id: todo.id, completed: !todo.completed })}
              className="h-4 w-4"
            />
            <span className={todo.completed ? "line-through text-gray-400" : ""}>
              {todo.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. Zustand Store with Persist and DevTools

A shopping cart store with localStorage persistence:

```tsx
// stores/cart-store.ts
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],

        addItem: (item) =>
          set(
            state => {
              const existing = state.items.find(i => i.id === item.id);
              if (existing) {
                return {
                  items: state.items.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
                  ),
                };
              }
              return { items: [...state.items, { ...item, quantity: 1 }] };
            },
            false,
            "addItem",
          ),

        removeItem: (id) =>
          set(
            state => ({ items: state.items.filter(i => i.id !== id) }),
            false,
            "removeItem",
          ),

        updateQuantity: (id, quantity) =>
          set(
            state => ({
              items:
                quantity <= 0
                  ? state.items.filter(i => i.id !== id)
                  : state.items.map(i => (i.id === id ? { ...i, quantity } : i)),
            }),
            false,
            "updateQuantity",
          ),

        clearCart: () => set({ items: [] }, false, "clearCart"),

        total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

        itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      }),
      {
        name: "cart-storage", // localStorage key
      },
    ),
    { name: "CartStore" },
  ),
);
```

```tsx
// Usage — selectors prevent unnecessary re-renders
function CartIcon() {
  const count = useCartStore(s => s.itemCount());
  return (
    <button className="relative">
      <ShoppingCartIcon />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
          {count}
        </span>
      )}
    </button>
  );
}

function CartTotal() {
  const total = useCartStore(s => s.total());
  return <p className="text-xl font-bold">${total.toFixed(2)}</p>;
}

function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore(s => s.addItem);
  return (
    <button onClick={() => addItem(product)} className="rounded bg-blue-600 px-4 py-2 text-white">
      Add to Cart
    </button>
  );
}
```

### 3. URL State with nuqs

A filterable product table with URL-persisted state:

```tsx
// app/products/page.tsx
import { Suspense } from "react";
import { ProductFilters } from "./filters";
import { ProductGrid } from "./grid";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Products</h1>
      <Suspense>
        <ProductFilters />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </div>
  );
}
```

```tsx
// app/products/filters.tsx
"use client";

import { useQueryState, parseAsString, parseAsInteger, parseAsStringLiteral } from "nuqs";

const sortOptions = ["name", "price-asc", "price-desc", "newest"] as const;

export function ProductFilters() {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [category, setCategory] = useQueryState("category", parseAsString.withDefault("all"));
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(sortOptions).withDefault("name"),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  return (
    <div className="flex flex-wrap gap-4">
      <input
        value={search}
        onChange={e => {
          setSearch(e.target.value || null); // null removes from URL
          setPage(1); // Reset page on filter change
        }}
        placeholder="Search products..."
        className="rounded border px-3 py-2"
      />

      <select
        value={category}
        onChange={e => {
          setCategory(e.target.value === "all" ? null : e.target.value);
          setPage(1);
        }}
        className="rounded border px-3 py-2"
      >
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="books">Books</option>
      </select>

      <select
        value={sort}
        onChange={e => setSort(e.target.value as typeof sortOptions[number])}
        className="rounded border px-3 py-2"
      >
        <option value="name">Name</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="newest">Newest</option>
      </select>
    </div>
  );
}

// URL: /products?q=laptop&category=electronics&sort=price-asc&page=2
// Shareable, bookmarkable, survives refresh
```

### 4. Auth Context Pattern

A properly structured authentication context:

```tsx
// contexts/auth.tsx
"use client";

import { createContext, useContext, useMemo, useCallback, useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    fetch("/api/auth/session")
      .then(r => (r.ok ? r.json() : null))
      .then(data => setUser(data?.user ?? null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const { user } = await res.json();
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  // Memoize to prevent unnecessary re-renders of consumers
  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// Convenience hook for protected pages
export function useRequireAuth() {
  const { user, isLoading } = useAuth();

  if (!isLoading && !user) {
    throw new Error("Authentication required");
  }

  return { user: user!, isLoading };
}
```

### 5. Jotai Atoms for Theme and Feature Flags

Atomic state for independent, subscribable values:

```tsx
// atoms/app.ts
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Persisted atoms (localStorage)
export const themeAtom = atomWithStorage<"light" | "dark" | "system">("theme", "system");
export const localeAtom = atomWithStorage<string>("locale", "en");
export const sidebarCollapsedAtom = atomWithStorage("sidebar-collapsed", false);

// Feature flags (from server, read-only in client)
export const featureFlagsAtom = atom<Record<string, boolean>>({});

// Derived atoms
export const isDarkModeAtom = atom(get => {
  const theme = get(themeAtom);
  if (theme !== "system") return theme === "dark";
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

export const isFeatureEnabledAtom = (feature: string) =>
  atom(get => get(featureFlagsAtom)[feature] ?? false);
```

```tsx
// Usage — each component subscribes to only the atoms it needs
"use client";

import { useAtom, useAtomValue } from "jotai";
import { themeAtom, isDarkModeAtom, sidebarCollapsedAtom } from "@/atoms/app";

function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);
  // Only re-renders when theme changes
  return (
    <select value={theme} onChange={e => setTheme(e.target.value as any)}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}

function SidebarToggle() {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  // Only re-renders when sidebar state changes — not when theme changes
  return (
    <button onClick={() => setCollapsed(!collapsed)}>
      {collapsed ? "Expand" : "Collapse"}
    </button>
  );
}
```

---

## Common Mistakes

### 1. useEffect + useState for Server Data

**Wrong:**
```tsx
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch("/api/products")
    .then(r => r.json())
    .then(setProducts)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
```

**Fix:** Use TanStack Query or Server Components:
```tsx
// TanStack Query
const { data: products, isLoading, error } = useQuery({
  queryKey: ["products"],
  queryFn: () => fetch("/api/products").then(r => r.json()),
});

// Or Server Component (preferred in Next.js)
async function Products() {
  const products = await db.product.findMany();
  return <ProductList products={products} />;
}
```

### 2. Everything in Global State

**Wrong:**
```tsx
const useStore = create(set => ({
  user: null,
  products: [],
  selectedProduct: null,
  isModalOpen: false,
  formData: {},
  searchQuery: "",
  // ... 30 more fields mixing server data, UI state, and form data
}));
```

**Fix:** Separate by type:
- Server data → TanStack Query
- Search/filter → URL state
- Form data → React Hook Form
- UI toggles → `useState` or minimal Zustand store

### 3. Filters Not in the URL

**Wrong:**
```tsx
const [category, setCategory] = useState("all");
const [sort, setSort] = useState("name");
// User refreshes page → filters reset. Can't share the filtered view.
```

**Fix:** Use URL state:
```tsx
const [category, setCategory] = useQueryState("category", parseAsString.withDefault("all"));
const [sort, setSort] = useQueryState("sort", parseAsString.withDefault("name"));
// URL: /products?category=electronics&sort=price — bookmarkable, shareable
```

### 4. Single Monolithic Context

**Wrong:**
```tsx
const AppContext = createContext({
  user, theme, locale, notifications, sidebarOpen, modalStack, toasts
});
// Changing sidebarOpen re-renders everything that reads user, theme, etc.
```

**Fix:** Split by update frequency:
```tsx
const AuthContext = createContext(authValue);         // Rare updates
const ThemeContext = createContext(themeValue);        // Rare updates
const NotificationContext = createContext(notifValue); // Frequent — consider Zustand
```

### 5. No Cache Invalidation After Mutations

**Wrong:**
```tsx
const mutation = useMutation({
  mutationFn: (data) => fetch("/api/products", { method: "POST", body: JSON.stringify(data) }),
  // No onSuccess — the product list is stale
});
```

**Fix:**
```tsx
const mutation = useMutation({
  mutationFn: createProduct,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});
```

### 6. Prop Drilling Through 5+ Levels

**Wrong:**
```tsx
<App user={user}>
  <Layout user={user}>
    <Sidebar user={user}>
      <UserMenu user={user}>
        <Avatar user={user} />
```

**Fix:** Use Context or composition:
```tsx
// Context for widely-used data
const { user } = useAuth();

// Or composition for one-off cases
<Layout sidebar={<Sidebar><UserMenu user={user} /></Sidebar>}>
  {children}
</Layout>
```

### 7. Redux for Two Values

**Wrong:** Installing Redux, Redux Toolkit, creating slices, middleware, and a store for tracking `{ sidebarOpen: boolean, theme: string }`.

**Fix:** `useState` in a parent component or a 5-line Zustand store.

### 8. No Zustand Selectors

**Wrong:**
```tsx
function CartIcon() {
  const store = useCartStore(); // Re-renders on ANY store change
  return <span>{store.items.length}</span>;
}
```

**Fix:**
```tsx
function CartIcon() {
  const count = useCartStore(s => s.items.length); // Only re-renders when count changes
  return <span>{count}</span>;
}
```

### 9. Server Data in Client State Store

**Wrong:**
```tsx
const useStore = create(set => ({
  products: [],
  fetchProducts: async () => {
    const data = await fetch("/api/products").then(r => r.json());
    set({ products: data });
  },
}));
```

**Fix:** Server data is a cache — use a cache library:
```tsx
const { data: products } = useQuery({
  queryKey: ["products"],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000,
});
```

### 10. Over-Engineering State Before You Need It

**Wrong:** Starting a project by installing Zustand, Jotai, TanStack Query, nuqs, and XState "because we might need them."

**Fix:** Start with `useState` and Server Components. Add libraries when you hit a real problem:
- Needed cache invalidation → add TanStack Query
- Needed shared UI state → add Zustand
- Needed URL persistence → add nuqs
- Needed complex transitions → add XState

---

> **See also:** [React Fundamentals](../React-Fundamentals/react-fundamentals.md) | [Data Fetching](../Data-Fetching/data-fetching.md) | [Forms & Validation](../Forms-Validation/forms-validation.md) | [Component Patterns](../Component-Patterns/component-patterns.md) | [Next.js Patterns](../Nextjs-Patterns/nextjs-patterns.md) | [UX Patterns](../../UIUX/UX-Patterns/ux-patterns.md)
>
> **Last reviewed:** 2026-02
