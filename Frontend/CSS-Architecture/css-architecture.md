# CSS Architecture
> Tailwind CSS v4, CSS Modules, utility-first patterns, and styling strategies for React and Next.js — structured for AI-assisted development.

---

## Principles

### 1. The Styling Landscape in 2025-2026

**Tailwind CSS** dominates. It's the default choice for new projects, especially AI-assisted ones — utilities map 1:1 to CSS properties, making LLM output predictable and consistent.

**CSS Modules** remain solid for scoped component styles when you prefer writing traditional CSS or need complex selectors (pseudo-elements, animations, `@container` queries with named containers).

**Runtime CSS-in-JS is dead for Server Components.** Libraries like styled-components and Emotion inject styles via JavaScript at runtime. Server Components don't run JavaScript on the client, so runtime CSS-in-JS libraries break. Use Tailwind or CSS Modules instead.

**CSS-in-JS alternatives that work with RSC:** StyleX (Meta's compile-time CSS-in-JS), Panda CSS, and vanilla-extract all compile to static CSS at build time.

### 2. Tailwind CSS: Philosophy and Configuration

Tailwind is a utility-first CSS framework. Instead of writing custom CSS, you compose small utility classes directly in markup: `className="flex items-center gap-4 rounded-lg bg-white p-6 shadow"`.

**Why it works for AI coding:** Every utility maps to exactly one CSS property-value pair. There's no naming to invent, no cascade to debug, no specificity wars. The AI generates consistent output because the vocabulary is fixed.

**Tailwind v4** uses CSS-first configuration with `@theme`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-50: oklch(0.97 0.01 250);
  --color-brand-500: oklch(0.55 0.15 250);
  --color-brand-900: oklch(0.25 0.08 250);

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --radius-DEFAULT: 0.5rem;
  --radius-lg: 0.75rem;

  --breakpoint-xs: 30rem;
}
```

In Tailwind v4, the CSS file IS the config. No `tailwind.config.ts` needed for most projects.

### 3. CSS Modules: Scoped Styles

CSS Modules generate unique class names at build time, preventing style collisions:

```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: background-color 150ms;
}

.primary {
  background-color: var(--color-brand-500);
  color: white;
}

.primary:hover {
  background-color: var(--color-brand-600);
}
```

```tsx
import styles from "./Button.module.css";

export function Button({ variant = "primary", children }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  );
}
```

**When to choose CSS Modules over Tailwind:**
- Complex pseudo-element styling (`::before`, `::after`)
- Named container queries with `@container`
- Migrating an existing codebase that uses CSS Modules
- Team preference for writing traditional CSS

### 4. Utility-First vs Semantic CSS

**Utility-first** scales better for AI-assisted development because:
- No naming decisions (the AI doesn't have to invent `.card-header-wrapper`)
- No dead CSS — unused utilities are purged automatically
- Colocation — styles live in the component, not a separate file
- Predictable output — `p-4` always means `padding: 1rem`

**Semantic CSS** (`class="card"`) reads more naturally but creates naming burden, dead-code risk, and requires maintaining a separate stylesheet.

**The practical choice:** Use Tailwind for components. Use CSS custom properties for design tokens. Use CSS Modules only when Tailwind can't express what you need.

### 5. Styling Server Components

Server Components render on the server and send HTML to the client. They support:
- Tailwind utility classes (compiled at build time)
- CSS Modules (compiled at build time)
- Inline styles (`style={{ color: "red" }}`)
- Global CSS imported in `layout.tsx`

They do NOT support:
- Runtime CSS-in-JS (styled-components, Emotion) — no client-side JavaScript to inject styles
- `useEffect`-based style manipulation

### 6. Global Styles Strategy

Keep global CSS minimal. Use it for:
- CSS reset / normalize
- CSS custom properties (design tokens)
- Base typography styles
- Third-party library overrides

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* Design tokens */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.15 0 0);
  --color-muted: oklch(0.55 0 0);
  --color-border: oklch(0.9 0 0);
}

@layer base {
  *,
  *::before,
  *::after {
    border-color: var(--color-border);
  }

  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
```

### 7. The cn() Utility Pattern

Every project using Tailwind needs `cn()` — a function that merges class names and handles Tailwind conflicts:

```tsx
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Why:** Without `cn()`, conflicting Tailwind classes don't resolve correctly:

```tsx
// Without cn() — both padding classes apply, unpredictable result
<div className={`p-4 ${large ? "p-8" : ""}`} />

// With cn() — p-8 wins when large is true
<div className={cn("p-4", large && "p-8")} />
```

Use `cn()` in every component that accepts a `className` prop:

```tsx
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn("rounded-lg border bg-white p-6 shadow-sm", className)}>
      {children}
    </div>
  );
}
```

### 8. Responsive Patterns in React

Tailwind uses mobile-first breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`. Write base styles for mobile, then add breakpoints for larger screens:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id} item={item} />)}
</div>
```

**Container queries** scope responsive behavior to the container, not the viewport:

```tsx
<div className="@container">
  <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
    {/* Responds to container width, not viewport */}
  </div>
</div>
```

**Fluid typography** with `clamp()`:

```css
@theme {
  --font-size-heading: clamp(1.5rem, 1rem + 2vw, 3rem);
}
```

### 9. Dark Mode Implementation

Tailwind's `dark:` variant combined with `next-themes`:

```tsx
// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
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

**Semantic tokens that adapt to dark mode:**

```css
@theme {
  --color-surface: oklch(1 0 0);
  --color-surface-elevated: oklch(0.98 0 0);
  --color-text: oklch(0.15 0 0);
  --color-text-muted: oklch(0.45 0 0);
}

.dark {
  --color-surface: oklch(0.15 0 0);
  --color-surface-elevated: oklch(0.2 0 0);
  --color-text: oklch(0.95 0 0);
  --color-text-muted: oklch(0.65 0 0);
}
```

```tsx
// Component uses semantic tokens — works in both modes
<div className="bg-surface text-text rounded-lg p-6">
  <p className="text-text-muted">Subtitle</p>
</div>
```

### 10. Animation with Tailwind

**Simple transitions:**
```tsx
<button className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
  Click me
</button>
```

**Tailwind's built-in animations:**
```tsx
<div className="animate-spin" />    {/* Spinner */}
<div className="animate-pulse" />   {/* Skeleton loading */}
<div className="animate-bounce" />  {/* Attention */}
```

**Custom keyframes in Tailwind v4:**
```css
@theme {
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(0.5rem); }
  to { opacity: 1; transform: translateY(0); }
}
```

```tsx
<div className="animate-fade-in">Appears with fade</div>
```

**For complex animations** (spring physics, gestures, layout animations), use Motion (formerly Framer Motion). See the UIUX Animation & Motion guide.

**Always respect reduced motion:**
```tsx
<div className="animate-slide-up motion-reduce:animate-none">
  Content
</div>
```

---

## LLM Instructions

### Setting Up Tailwind

When setting up a new project with Tailwind:
- Install Tailwind v4: `npm install tailwindcss @tailwindcss/postcss`
- Configure PostCSS with `@tailwindcss/postcss`
- Create `globals.css` with `@import "tailwindcss"` and `@theme` block
- Install `clsx` and `tailwind-merge`, create the `cn()` utility
- Set up dark mode with `next-themes` if needed
- Use CSS custom properties in `@theme` for all design tokens (colors, fonts, spacing, radii)

### Writing Styles

When generating component styles:
- Use Tailwind utility classes as the default styling method
- Accept `className?: string` as a prop on all reusable components
- Use `cn()` to merge base styles with the className prop
- Use `cva` (class-variance-authority) for components with multiple variants
- Write mobile-first: base classes for mobile, `md:` for tablet, `lg:` for desktop
- Use `dark:` variant for dark mode overrides, or semantic tokens that auto-switch

### Dark Mode

When implementing dark mode:
- Install `next-themes` and create a `Providers` component
- Wrap the app in `ThemeProvider` with `attribute="class"`
- Add `suppressHydrationMismatch` to `<html>`
- Define semantic color tokens that change between light/dark
- Test both themes — especially contrast ratios
- Provide a three-way toggle: System / Light / Dark

### Responsive Layouts

When building responsive layouts:
- Always start mobile-first — base styles are the mobile layout
- Use Tailwind's responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Use CSS Grid for 2D layouts, Flexbox for 1D layouts
- Use container queries (`@container` + `@md:`, `@lg:`) for reusable components
- Use `clamp()` for fluid typography and spacing
- Test at all breakpoints — don't just check desktop and mobile

### Choosing a Styling Approach

When deciding how to style a component:
- **Default: Tailwind** — for all standard component styling
- **CSS Modules** — when you need complex selectors, pseudo-elements, or `@container` with named containers
- **Inline styles** — only for truly dynamic values (calculated positions, user-selected colors)
- **Never runtime CSS-in-JS** — not compatible with Server Components

---

## Examples

### 1. Tailwind v4 Theme Configuration

A complete theme setup using Tailwind v4's CSS-first configuration:

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* Colors — oklch for perceptual uniformity */
  --color-brand-50: oklch(0.97 0.01 250);
  --color-brand-100: oklch(0.93 0.03 250);
  --color-brand-200: oklch(0.87 0.06 250);
  --color-brand-300: oklch(0.77 0.10 250);
  --color-brand-400: oklch(0.65 0.14 250);
  --color-brand-500: oklch(0.55 0.15 250);
  --color-brand-600: oklch(0.47 0.14 250);
  --color-brand-700: oklch(0.39 0.12 250);
  --color-brand-800: oklch(0.31 0.09 250);
  --color-brand-900: oklch(0.25 0.08 250);

  --color-gray-50: oklch(0.98 0 0);
  --color-gray-100: oklch(0.96 0 0);
  --color-gray-200: oklch(0.90 0 0);
  --color-gray-300: oklch(0.83 0 0);
  --color-gray-400: oklch(0.65 0 0);
  --color-gray-500: oklch(0.55 0 0);
  --color-gray-600: oklch(0.44 0 0);
  --color-gray-700: oklch(0.37 0 0);
  --color-gray-800: oklch(0.27 0 0);
  --color-gray-900: oklch(0.18 0 0);

  /* Semantic tokens */
  --color-background: var(--color-gray-50);
  --color-foreground: var(--color-gray-900);
  --color-muted: var(--color-gray-500);
  --color-border: var(--color-gray-200);
  --color-ring: var(--color-brand-500);

  /* Typography */
  --font-sans: "Inter Variable", system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;

  /* Spacing / sizing */
  --radius-sm: 0.25rem;
  --radius-DEFAULT: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Animation */
  --animate-fade-in: fade-in 0.2s ease-out;
  --animate-slide-down: slide-down 0.2s ease-out;
}

/* Dark mode overrides */
.dark {
  --color-background: var(--color-gray-900);
  --color-foreground: var(--color-gray-50);
  --color-muted: var(--color-gray-400);
  --color-border: var(--color-gray-800);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-0.5rem); }
  to { opacity: 1; transform: translateY(0); }
}

@layer base {
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
```

### 2. cn() + cva Variant Pattern

Component variants using class-variance-authority (cva) with cn():

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-white hover:bg-brand-600",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-50",
        outline: "border border-border bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800",
        ghost: "hover:bg-gray-100 dark:hover:bg-gray-800",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        link: "text-brand-500 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

// Usage
<Button variant="default" size="lg">Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost" size="icon"><SearchIcon /></Button>
<Button variant="destructive" className="w-full">Delete Account</Button>
```

### 3. CSS Modules Component

A notification component using CSS Modules for complex pseudo-element styling:

```css
/* Notification.module.css */
.notification {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid var(--accent-color, var(--color-brand-500));
  background-color: var(--bg-color, var(--color-brand-50));
}

.notification::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    oklch(1 0 0 / 0.1),
    transparent 50%
  );
  pointer-events: none;
}

.info {
  --accent-color: var(--color-brand-500);
  --bg-color: var(--color-brand-50);
}

.warning {
  --accent-color: oklch(0.75 0.15 85);
  --bg-color: oklch(0.97 0.02 85);
}

.error {
  --accent-color: oklch(0.55 0.2 25);
  --bg-color: oklch(0.97 0.02 25);
}

.success {
  --accent-color: oklch(0.55 0.15 145);
  --bg-color: oklch(0.97 0.02 145);
}

.icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--accent-color);
}

.content {
  flex: 1;
  min-width: 0;
}

.title {
  font-weight: 600;
  font-size: 0.875rem;
}

.message {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-muted);
}
```

```tsx
// Notification.tsx
import styles from "./Notification.module.css";

type NotificationType = "info" | "warning" | "error" | "success";

interface NotificationProps {
  type: NotificationType;
  title: string;
  message?: string;
}

export function Notification({ type, title, message }: NotificationProps) {
  return (
    <div className={`${styles.notification} ${styles[type]}`} role="alert">
      <NotificationIcon type={type} className={styles.icon} />
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  );
}
```

### 4. Dark Mode with next-themes

Complete dark mode setup with a three-way toggle:

```tsx
// components/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render nothing until mounted
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-10 w-10" />;

  return (
    <button
      onClick={() => {
        if (theme === "light") setTheme("dark");
        else if (theme === "dark") setTheme("system");
        else setTheme("light");
      }}
      className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label={`Current theme: ${theme}. Click to switch.`}
    >
      {theme === "light" && <SunIcon className="h-5 w-5" />}
      {theme === "dark" && <MoonIcon className="h-5 w-5" />}
      {theme === "system" && <MonitorIcon className="h-5 w-5" />}
    </button>
  );
}
```

```css
/* globals.css — Token-based dark mode */
@theme {
  --color-surface: oklch(1 0 0);
  --color-surface-elevated: oklch(0.98 0 0);
  --color-surface-sunken: oklch(0.96 0 0);
  --color-text-primary: oklch(0.13 0 0);
  --color-text-secondary: oklch(0.45 0 0);
  --color-border: oklch(0.90 0 0);
}

.dark {
  --color-surface: oklch(0.13 0 0);
  --color-surface-elevated: oklch(0.18 0 0);
  --color-surface-sunken: oklch(0.10 0 0);
  --color-text-primary: oklch(0.95 0 0);
  --color-text-secondary: oklch(0.65 0 0);
  --color-border: oklch(0.25 0 0);
}
```

### 5. Responsive Dashboard Layout

A responsive layout that adapts from stacked mobile to sidebar desktop:

```tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar — hidden on mobile, fixed on desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface-elevated lg:block">
        <nav className="sticky top-0 space-y-1 p-4">
          <NavLink href="/dashboard" icon={<HomeIcon />}>Home</NavLink>
          <NavLink href="/dashboard/analytics" icon={<ChartIcon />}>Analytics</NavLink>
          <NavLink href="/dashboard/settings" icon={<GearIcon />}>Settings</NavLink>
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface lg:hidden">
        <div className="flex justify-around py-2">
          <MobileNavLink href="/dashboard" icon={<HomeIcon />} label="Home" />
          <MobileNavLink href="/dashboard/analytics" icon={<ChartIcon />} label="Analytics" />
          <MobileNavLink href="/dashboard/settings" icon={<GearIcon />} label="Settings" />
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 pb-16 lg:pb-0">
        <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Responsive card grid
function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Stats — 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value="$12,345" />
        <StatCard label="Users" value="1,234" />
        <StatCard label="Orders" value="567" />
        <StatCard label="Conversion" value="3.2%" />
      </div>

      {/* Chart + sidebar — stacked on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
```

---

## Common Mistakes

### 1. Using Runtime CSS-in-JS with Server Components

**Wrong:**
```tsx
// This fails in Server Components — no client JS to inject styles
import styled from "styled-components";
const Title = styled.h1`font-size: 2rem;`;
```

**Fix:** Use Tailwind or CSS Modules:
```tsx
<h1 className="text-3xl font-bold">Title</h1>
```

### 2. Not Using cn() for Class Merging

**Wrong:**
```tsx
export function Card({ className }: { className?: string }) {
  return <div className={`rounded-lg p-4 bg-white ${className}`} />;
  // If className contains "p-8", both p-4 and p-8 apply — unpredictable
}
```

**Fix:**
```tsx
import { cn } from "@/lib/utils";

export function Card({ className }: { className?: string }) {
  return <div className={cn("rounded-lg p-4 bg-white", className)} />;
  // cn() resolves conflicts — p-8 overrides p-4
}
```

### 3. Arbitrary Values Everywhere

**Wrong:**
```tsx
<div className="w-[347px] h-[89px] mt-[13px] text-[15px] text-[#1a73e8]" />
```

**Fix:** Use Tailwind's scale or define tokens:
```tsx
// Use existing scale values
<div className="w-80 h-20 mt-3 text-sm text-brand-500" />

// Or add tokens if you need custom values
// globals.css: @theme { --spacing-card: 22rem; }
```

### 4. Desktop-First Responsive Design

**Wrong:**
```tsx
// Start with desktop, hide things for mobile
<div className="grid-cols-4 lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1" />
```

**Fix:** Mobile-first — base classes for mobile, add breakpoints for larger:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" />
```

### 5. Misconfigured Dark Mode Colors

**Wrong:**
```tsx
// Hardcoded colors that don't adapt to dark mode
<div className="bg-white text-black border-gray-200" />
```

**Fix:** Use semantic tokens:
```tsx
<div className="bg-surface text-text-primary border-border" />
```

Or use explicit dark variants:
```tsx
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-50" />
```

### 6. Duplicating Tokens Between CSS and Config

**Wrong:**
```css
/* globals.css */
:root { --brand-color: #3b82f6; }
```
```ts
// tailwind.config.ts
module.exports = { theme: { extend: { colors: { brand: "#3b82f6" } } } }
```

**Fix:** In Tailwind v4, define everything once in CSS:
```css
@theme {
  --color-brand: oklch(0.55 0.15 250);
}
```

### 7. Overusing @apply

**Wrong:**
```css
/* Defeats the purpose of utility-first */
.btn {
  @apply inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2;
}
```

**Fix:** Keep utilities in markup. Use `cva()` for variant logic:
```tsx
const button = cva("inline-flex items-center justify-center gap-2 rounded-md ...", {
  variants: { variant: { primary: "bg-blue-600 ...", secondary: "bg-gray-100 ..." } },
});
```

### 8. Custom Media Queries Alongside Tailwind Breakpoints

**Wrong:**
```css
/* This doesn't align with Tailwind's breakpoints */
@media (min-width: 768px) { .sidebar { width: 250px; } }
/* But the component uses Tailwind's md: which is also 768px — confusing */
```

**Fix:** Use Tailwind's breakpoint utilities consistently. If you need CSS Modules with responsive behavior, use the same breakpoint values as Tailwind.

### 9. Mixing Multiple Styling Approaches in One Component

**Wrong:**
```tsx
<div
  className="flex items-center" // Tailwind
  style={{ backgroundColor: token.bg }} // Inline
>
  <span className={styles.label}>Text</span> {/* CSS Modules */}
</div>
```

**Fix:** Pick one approach per component. Tailwind is the default:
```tsx
<div className="flex items-center" style={{ backgroundColor: token.bg }}>
  <span className="text-sm font-medium text-gray-600">Text</span>
</div>
```

Inline styles are acceptable only for truly dynamic values (user-configurable colors, calculated positions).

---

See also: [Design Systems](../../UIUX/Design-Systems/design-systems.md) | [Dark Mode](../../UIUX/Dark-Mode/dark-mode.md) | [Typography & Color](../../UIUX/Typography-Color/typography-color.md) | [Responsive Design](../../UIUX/Responsive-Design/responsive-design.md) | [Animation & Motion](../../UIUX/Animation-Motion/animation-motion.md) | [Next.js Patterns](../Nextjs-Patterns/nextjs-patterns.md) | [Component Patterns](../Component-Patterns/component-patterns.md)

Last reviewed: 2026-02
