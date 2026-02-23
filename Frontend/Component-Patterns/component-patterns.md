# Component Patterns
> Composition, compound components, custom hooks, headless UI, and reusable patterns for React — structured for AI-assisted development.

---

## Principles

### 1. Composition Over Configuration

When a component grows past 10-15 props, it's a sign you're configuring when you should be composing. Instead of a monolithic component with props for every variation, compose small, focused components:

**Configuration (bad at scale):**
```tsx
<Card
  title="Order Summary"
  subtitle="3 items"
  icon={<ShoppingCartIcon />}
  headerAction={<Button>Edit</Button>}
  footer={<Total amount={99.99} />}
  bordered
  padded
/>
```

**Composition (scales well):**
```tsx
<Card>
  <Card.Header>
    <ShoppingCartIcon />
    <div>
      <Card.Title>Order Summary</Card.Title>
      <Card.Subtitle>3 items</Card.Subtitle>
    </div>
    <Button>Edit</Button>
  </Card.Header>
  <Card.Body>{/* content */}</Card.Body>
  <Card.Footer>
    <Total amount={99.99} />
  </Card.Footer>
</Card>
```

Composition is more flexible, more readable, and the AI can generate more creative layouts without needing to know 30 prop combinations.

### 2. Compound Components

Compound components share implicit state through Context, letting users compose sub-components in any order:

```tsx
// Usage — the developer controls layout, Tabs handles state
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">...</Tabs.Content>
  <Tabs.Content value="analytics">...</Tabs.Content>
  <Tabs.Content value="settings">...</Tabs.Content>
</Tabs>
```

The parent (`Tabs`) provides context. Children (`Tabs.Trigger`, `Tabs.Content`) consume it. The developer arranges them freely — Tabs doesn't care about the DOM structure between its children.

### 3. Custom Hooks

Custom hooks extract reusable stateful logic from components. They're the primary abstraction in React:

**Rules for custom hooks:**
- Name starts with `use`
- Encapsulates one concern (not a kitchen sink)
- Returns only what consumers need
- Handles cleanup (unsubscribe, abort, clear)
- Is testable in isolation

**Good custom hook candidates:**
- Data fetching logic that's reused across components
- Browser API integrations (media queries, intersection observer, clipboard)
- Complex state transitions (multi-step wizard, undo/redo)
- Debounced/throttled values

### 4. Headless / Unstyled Libraries

Headless UI libraries provide behavior and accessibility without styling:

- **Radix UI** — the most popular, extensive primitive collection
- **React Aria (Adobe)** — the most accessible, used by Spectrum
- **Headless UI (Tailwind Labs)** — simpler API, fewer components

**Why headless:** You get keyboard navigation, focus management, ARIA attributes, and screen reader support for free. Then you add your own styles with Tailwind. Don't rebuild a combobox from scratch — use Radix or React Aria and style it.

### 5. Render Props

Render props pass a function as children (or a prop) that receives data and returns JSX:

```tsx
<Combobox items={products}>
  {({ filteredItems, query, setQuery }) => (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>
        {filteredItems.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
    </>
  )}
</Combobox>
```

**When to use render props over hooks:** When the component provides both state AND DOM elements (like portals, popovers), or when you need to expose multiple render slots. In most cases, prefer custom hooks.

### 6. Higher-Order Components (HOCs)

HOCs wrap a component to add behavior. They're less common since hooks, but still useful for cross-cutting concerns:

```tsx
function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { user, isLoading } = useAuth();
    if (isLoading) return <Skeleton />;
    if (!user) redirect("/login");
    return <Component {...props} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard);
```

**When to use HOCs:** Rare in modern React. Most use cases are better served by hooks + composition. Consider HOCs for wrapping entire routes with auth/layout logic.

### 7. Children Patterns

**`children` as ReactNode** — the most common pattern:
```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border p-4">{children}</div>;
}
```

**Render function children** — when children need data from the parent:
```tsx
<DataFetcher url="/api/data">
  {(data) => <Display data={data} />}
</DataFetcher>
```

**Slots pattern** — named children via props:
```tsx
interface DialogProps {
  trigger: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

**Avoid `React.Children` and `cloneElement`** — they're fragile and break with wrappers. Use Context or explicit slots instead.

### 8. Ref Forwarding

Any reusable component that wraps a DOM element should forward refs:

```tsx
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    const id = useId();
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          className={cn(
            "mt-1 w-full rounded border px-3 py-2",
            error && "border-red-500",
            className,
          )}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
```

### 9. Provider Pattern

When multiple providers nest deeply, compose them:

```tsx
// Before — deeply nested providers
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </ToastProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// After — composed providers
function composeProviders(...providers: React.FC<{ children: React.ReactNode }>[]) {
  return function ComposedProviders({ children }: { children: React.ReactNode }) {
    return providers.reduceRight(
      (child, Provider) => <Provider>{child}</Provider>,
      children,
    );
  };
}

const Providers = composeProviders(
  ThemeProvider,
  AuthProvider,
  ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  ToastProvider,
  ModalProvider,
);

function App() {
  return <Providers>{children}</Providers>;
}
```

### 10. Container vs Presentational in the RSC Era

The old "container vs presentational" split maps naturally to Server vs Client Components in Next.js:

**Server Components (containers):**
- Fetch data
- Access server resources (database, file system, env vars)
- Pass data down to presentational components
- Zero client-side JavaScript

**Client Components (presentational + interactive):**
- Receive data via props
- Handle user interaction (clicks, forms, drag-and-drop)
- Manage local UI state
- Use browser APIs

```tsx
// Server Component — fetches data, passes it down
export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;
  const user = await getUser(id);
  const posts = await getUserPosts(id);

  return (
    <div>
      <UserHeader user={user} />           {/* Server — static display */}
      <FollowButton userId={id} />          {/* Client — interactive */}
      <PostList posts={posts} />            {/* Server — static display */}
    </div>
  );
}
```

---

## LLM Instructions

### Building Reusable Components

When generating reusable components:
- Accept `className?: string` and merge with `cn()`
- Forward refs with `forwardRef` for any component wrapping a DOM element
- Use compound components for complex UI (Tabs, Accordion, Select, Menu)
- Accept `children: React.ReactNode` for content projection
- Keep the API surface small — prefer composition over props
- Export named: `export function Button()` not `export default`

### Extracting Custom Hooks

When creating custom hooks:
- Name with `use` prefix: `useLocalStorage`, `useMediaQuery`, `useDebounce`
- Accept configuration as parameters, return only what consumers need
- Handle cleanup: return cleanup in useEffect, abort controllers for fetch
- Type return values explicitly for documentation
- Consider returning tuple `[value, setter]` for simple hooks or object `{ value, isLoading, error }` for complex ones

### Using Headless Libraries

When implementing UI patterns, prefer headless libraries over custom implementations:
- **Dialogs/Modals** → Radix Dialog or React Aria Dialog
- **Dropdowns/Menus** → Radix DropdownMenu
- **Comboboxes/Autocomplete** → Radix Combobox or React Aria ComboBox
- **Tooltips** → Radix Tooltip
- **Tabs** → Radix Tabs
- **Accordions** → Radix Accordion

Wrap them with your project's Tailwind styles and export them as your design system components.

### Composition with Children and Slots

When a component needs flexible content areas:
- Use `children` for the primary content slot
- Use named props for additional slots: `header`, `footer`, `trigger`, `icon`
- For complex layouts, use compound components with Context
- Avoid `React.Children.map` and `cloneElement` — they break with wrappers

### Deciding Between Patterns

- **Simple UI** → Just a component with props
- **Styled variants** → cva (class-variance-authority)
- **Complex with flexible layout** → Compound components
- **Reusable logic** → Custom hook
- **Accessible primitive** → Headless library + Tailwind wrapper
- **Cross-cutting concern** → HOC or hook (prefer hook)
- **Data → JSX mapping with flexibility** → Render prop or generic component

---

## Examples

### 1. Compound Tabs Component

A fully accessible tabs implementation using compound components:

```tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useId,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// Context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs compound components must be used within <Tabs>");
  return context;
}

// Root
interface TabsProps {
  defaultValue: string;
  children: ReactNode;
  className?: string;
  onChange?: (value: string) => void;
}

export function Tabs({ defaultValue, children, className, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const baseId = useId();

  function handleChange(value: string) {
    setActiveTab(value);
    onChange?.(value);
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// List
Tabs.List = function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 border-b", className)}
    >
      {children}
    </div>
  );
};

// Trigger
Tabs.Trigger = function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { activeTab, setActiveTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-controls={`${baseId}-panel-${value}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(value)}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors -mb-px",
        isActive
          ? "border-b-2 border-brand-500 text-brand-600"
          : "text-gray-500 hover:text-gray-700",
        className,
      )}
    >
      {children}
    </button>
  );
};

// Content
Tabs.Content = function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { activeTab, baseId } = useTabsContext();
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("pt-4", className)}
    >
      {children}
    </div>
  );
};

// Usage
function SettingsPage() {
  return (
    <Tabs defaultValue="general">
      <Tabs.List>
        <Tabs.Trigger value="general">General</Tabs.Trigger>
        <Tabs.Trigger value="security">Security</Tabs.Trigger>
        <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="general">
        <GeneralSettings />
      </Tabs.Content>
      <Tabs.Content value="security">
        <SecuritySettings />
      </Tabs.Content>
      <Tabs.Content value="notifications">
        <NotificationSettings />
      </Tabs.Content>
    </Tabs>
  );
}
```

### 2. Custom Hooks Collection

Four practical custom hooks:

```tsx
// hooks/use-debounce.ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function Search() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  // Fetch with debouncedQuery instead of query
}
```

```tsx
// hooks/use-media-query.ts
import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    function handleChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

// Usage
function Layout() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

```tsx
// hooks/use-click-outside.ts
import { useEffect, useRef, type RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [handler]);

  return ref;
}

// Usage
function Dropdown() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  return <div ref={ref}>{open && <DropdownMenu />}</div>;
}
```

```tsx
// hooks/use-copy-to-clipboard.ts
import { useState, useCallback } from "react";

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return { copied, copy };
}

// Usage
function CodeBlock({ code }: { code: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <div className="relative">
      <pre>{code}</pre>
      <button onClick={() => copy(code)}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
```

### 3. Radix Dialog Wrapper

Wrapping a headless Radix Dialog with project styles:

```tsx
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef, type ReactNode } from "react";

export function Dialog({ children, ...props }: DialogPrimitive.DialogProps) {
  return <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>;
}

Dialog.Trigger = DialogPrimitive.Trigger;

Dialog.Content = forwardRef<
  HTMLDivElement,
  DialogPrimitive.DialogContentProps & { title: string; description?: string }
>(({ title, description, children, className, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-fade-in" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
        "rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900",
        "data-[state=open]:animate-slide-up",
        className,
      )}
      {...props}
    >
      <div className="mb-4">
        <DialogPrimitive.Title className="text-lg font-semibold">
          {title}
        </DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="mt-1 text-sm text-gray-500">
            {description}
          </DialogPrimitive.Description>
        )}
      </div>

      {children}

      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));

Dialog.Content.displayName = "DialogContent";

// Usage
function DeleteConfirmation({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <button className="text-red-600">Delete</button>
      </Dialog.Trigger>
      <Dialog.Content
        title="Delete Item"
        description="This action cannot be undone."
      >
        <div className="flex justify-end gap-3">
          <DialogPrimitive.Close asChild>
            <button className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </DialogPrimitive.Close>
          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
```

### 4. Provider Composition Utility

Cleanly compose multiple providers without deep nesting:

```tsx
// lib/compose-providers.tsx
import type { ComponentType, ReactNode } from "react";

type Provider = ComponentType<{ children: ReactNode }>;

export function composeProviders(...providers: Provider[]) {
  return function ComposedProviders({ children }: { children: ReactNode }) {
    return providers.reduceRight(
      (child, Provider) => <Provider>{child}</Provider>,
      children,
    );
  };
}
```

```tsx
// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth";
import { ToastProvider } from "@/contexts/toast";
import { composeProviders } from "@/lib/compose-providers";
import { useState } from "react";

function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Theme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}

export const Providers = composeProviders(
  Theme,
  QueryProvider,
  AuthProvider,
  ToastProvider,
);
```

```tsx
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationMismatch>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 5. Generic List with Render Props

A reusable list component that handles loading, empty, and error states:

```tsx
interface ListProps<T> {
  items: T[];
  isLoading?: boolean;
  error?: Error | null;
  renderItem: (item: T, index: number) => ReactNode;
  renderEmpty?: () => ReactNode;
  renderError?: (error: Error) => ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function List<T>({
  items,
  isLoading,
  error,
  renderItem,
  renderEmpty,
  renderError,
  keyExtractor,
  className,
}: ListProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return renderError ? (
      renderError(error)
    ) : (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error.message}
      </div>
    );
  }

  if (items.length === 0) {
    return renderEmpty ? (
      renderEmpty()
    ) : (
      <div className="py-12 text-center text-gray-500">No items found</div>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage
function UserList() {
  const { data: users = [], isLoading, error } = useUsers();

  return (
    <List
      items={users}
      isLoading={isLoading}
      error={error}
      keyExtractor={user => user.id}
      renderItem={user => (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Avatar src={user.avatar} alt={user.name} />
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      )}
      renderEmpty={() => (
        <div className="py-12 text-center">
          <p className="text-gray-500">No users yet</p>
          <button className="mt-2 text-brand-500">Invite users</button>
        </div>
      )}
    />
  );
}
```

---

## Common Mistakes

### 1. Giant Components With 30+ Props

**Wrong:**
```tsx
<DataTable
  data={data}
  columns={columns}
  sortable
  filterable
  paginated
  pageSize={10}
  onSort={handleSort}
  onFilter={handleFilter}
  onPageChange={handlePage}
  selectable
  onSelect={handleSelect}
  expandable
  renderExpanded={row => <Details row={row} />}
  headerActions={<Button>Export</Button>}
  emptyMessage="No data"
  loading={isLoading}
  error={error}
  // ... 15 more props
/>
```

**Fix:** Use composition:
```tsx
<DataTable data={data}>
  <DataTable.Toolbar>
    <DataTable.Search />
    <DataTable.Filter column="status" options={statusOptions} />
    <Button>Export</Button>
  </DataTable.Toolbar>
  <DataTable.Content columns={columns} />
  <DataTable.Pagination pageSize={10} />
</DataTable>
```

### 2. No Ref Forwarding on Reusable Components

**Wrong:**
```tsx
function Input({ label, ...props }: InputProps) {
  return <input {...props} />;
  // Parent can't call inputRef.current.focus()
}
```

**Fix:**
```tsx
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  ),
);
```

### 3. Reimplementing Accessibility

**Wrong:**
```tsx
function Dropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>Menu</button>
      {open && <div className="absolute">{/* items */}</div>}
    </div>
  );
  // Missing: keyboard nav, focus trap, Escape to close, ARIA attributes, click outside
}
```

**Fix:** Use a headless library:
```tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

function Dropdown() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Profile</DropdownMenu.Item>
          <DropdownMenu.Item>Settings</DropdownMenu.Item>
          <DropdownMenu.Item>Logout</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
  // All a11y handled: keyboard, focus trap, ARIA, click outside
}
```

### 4. Prop Drilling Over Composition

**Wrong:**
```tsx
function Page({ user }) {
  return <Layout user={user}><Content user={user} /></Layout>;
}
function Layout({ user, children }) {
  return <div><Header user={user} />{children}</div>;
}
function Header({ user }) {
  return <nav><Avatar user={user} /></nav>;
}
```

**Fix:** Use composition (children) or context:
```tsx
function Page({ user }) {
  return (
    <Layout header={<Header><Avatar user={user} /></Header>}>
      <Content user={user} />
    </Layout>
  );
}
function Layout({ header, children }) {
  return <div>{header}{children}</div>;
}
```

### 5. Overusing cloneElement

**Wrong:**
```tsx
function ButtonGroup({ children }) {
  return (
    <div className="flex gap-2">
      {React.Children.map(children, child =>
        React.cloneElement(child, { size: "sm", variant: "outline" }),
      )}
    </div>
  );
  // Breaks if children are wrapped in a fragment or conditional
}
```

**Fix:** Use Context or explicit props:
```tsx
const ButtonGroupContext = createContext<{ size: string; variant: string } | null>(null);

function ButtonGroup({ children }) {
  return (
    <ButtonGroupContext.Provider value={{ size: "sm", variant: "outline" }}>
      <div className="flex gap-2">{children}</div>
    </ButtonGroupContext.Provider>
  );
}
```

### 6. Custom Hooks That Do Too Much

**Wrong:**
```tsx
function useEverything() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // 200 lines of mixed concerns
}
```

**Fix:** One hook per concern:
```tsx
function useAuth() { /* user state */ }
function useTheme() { /* theme state */ }
function useNotifications() { /* notification state */ }
```

### 7. Untyped Data Components

**Wrong:**
```tsx
function DataTable({ data, columns }) {
  // data is any, columns is any — no autocompletion, no type checking
}
```

**Fix:** Use generics:
```tsx
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

function DataTable<T>({ data, columns }: { data: T[]; columns: Column<T>[] }) {
  // Fully typed — columns are constrained to keys of T
}
```

### 8. Ten Nested Providers

**Wrong:**
```tsx
<Provider1>
  <Provider2>
    <Provider3>
      <Provider4>
        <Provider5>
          <Provider6>
            <Provider7>
              {children}
            </Provider7>
          </Provider6>
        </Provider5>
      </Provider4>
    </Provider3>
  </Provider2>
</Provider1>
```

**Fix:** Use the `composeProviders` utility (see Example 4).

### 9. Structure-Dependent Children

**Wrong:**
```tsx
function Tabs({ children }) {
  // Assumes children[0] is the tab list and children[1] is the panels
  const tabs = children[0];
  const panels = children[1];
  // Breaks if someone wraps them in a div or fragment
}
```

**Fix:** Use compound components with Context (see Example 1) or explicit props:
```tsx
function Tabs({ tabs, panels }) { ... }
```

---

See also: [React Fundamentals](../React-Fundamentals/react-fundamentals.md) | [TypeScript-React](../TypeScript-React/typescript-react.md) | [CSS Architecture](../CSS-Architecture/css-architecture.md) | [Accessibility](../../UIUX/Accessibility/accessibility.md) | [Design Systems](../../UIUX/Design-Systems/design-systems.md) | [UX Patterns](../../UIUX/UX-Patterns/ux-patterns.md)

Last reviewed: 2026-02
