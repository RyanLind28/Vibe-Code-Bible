# Design Systems

> A design system is the single source of truth for how your product looks and behaves. It replaces guesswork with constraints, turns one-off components into reusable building blocks, and ensures that every screen your team ships feels like it belongs to the same product.

---

## Principles

### 1. What a Design System Is and Why It Matters

A design system is a collection of reusable components, guided by clear standards, that can be assembled to build any number of applications. It is not a component library alone — it includes tokens, guidelines, patterns, documentation, and the governance process around them.

**Why it matters:**

- **Consistency.** Every button, card, and form field looks and behaves the same way across every page and every team.
- **Speed.** Developers stop rebuilding the same dropdown for the fourth time. Designers stop redlining the same spacing values.
- **Scalability.** New features and new teams can ship UI that matches the existing product without reverse-engineering styles from screenshots.
- **Quality.** Centralized components get accessibility, performance, and cross-browser testing once. Every consumer inherits those fixes.

A design system is an investment. It costs time upfront but compounds over every feature shipped after it exists.

### 2. Design Tokens

Design tokens are the atomic values of your visual language. They are named variables that store colors, spacing, typography, shadows, border radii, and other low-level style decisions. Tokens are the bridge between design and code — they ensure that a designer's "primary blue" and a developer's `--color-primary` always refer to the same value.

**Token categories:**

| Category | Examples |
|----------|----------|
| Color | `--color-primary-500`, `--color-neutral-100`, `--color-error` |
| Spacing | `--space-1` (4px), `--space-2` (8px), `--space-4` (16px) |
| Typography | `--font-family-sans`, `--font-size-lg`, `--line-height-tight` |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Border radius | `--radius-sm`, `--radius-md`, `--radius-full` |
| Transitions | `--duration-fast`, `--duration-normal`, `--easing-default` |

**Token tiers:**

1. **Global tokens** define raw values: `--blue-500: #3b82f6`.
2. **Alias (semantic) tokens** assign meaning: `--color-primary: var(--blue-500)`.
3. **Component tokens** scope decisions: `--button-bg: var(--color-primary)`.

This layering means changing your brand color requires updating a single global token. Every alias and component token that references it updates automatically.

### 3. Component Architecture — Atomic Design

Brad Frost's Atomic Design provides a mental model for structuring components by complexity:

| Level | Description | Examples |
|-------|-------------|----------|
| **Atoms** | Smallest indivisible elements | Button, Input, Label, Icon, Badge |
| **Molecules** | Groups of atoms forming a functional unit | Search bar (Input + Button), Form field (Label + Input + Error) |
| **Organisms** | Complex sections composed of molecules | Navigation header, Product card grid, Signup form |
| **Templates** | Page-level layouts with placeholder content | Dashboard layout, Settings page layout |
| **Pages** | Templates filled with real data | The actual rendered dashboard |

Not every project needs to follow atomic design rigidly. The core lesson is: build small, compose upward, and never let a page-level component contain styles that should live in an atom.

### 4. Theming with CSS Custom Properties and Token Systems

CSS custom properties (variables) are the engine behind runtime theming. Unlike preprocessor variables (Sass `$vars`), custom properties cascade, can be overridden per scope, and can be changed at runtime with JavaScript.

**Theming strategy:**

1. Define your semantic tokens on `:root` for the default (light) theme.
2. Override those same tokens on a `.dark` class (or `[data-theme="dark"]` attribute) for the dark theme.
3. Components reference only semantic tokens — never raw color values.
4. Switching themes becomes toggling a single class or attribute on `<html>`.

This approach supports light mode, dark mode, and any number of additional themes (high contrast, brand variants) without touching component code.

### 5. Component API Design

A well-designed component API is predictable, composable, and hard to misuse. The props you expose are the contract between the design system and its consumers.

**Guidelines:**

- **Variant prop** for visual style: `variant="primary" | "secondary" | "outline" | "ghost" | "destructive"`.
- **Size prop** using a consistent scale: `size="sm" | "md" | "lg"`.
- **State** handled via standard HTML/ARIA attributes when possible: `disabled`, `aria-busy`, `aria-expanded`.
- **Composition over configuration.** Prefer `children` and slot patterns over deeply nested configuration objects. A `Card` should accept `Card.Header`, `Card.Body`, `Card.Footer` — not a `header` prop that accepts a string.
- **Spread remaining props** to the underlying DOM element so consumers can add `className`, `id`, `data-*`, and event handlers without the component blocking them.
- **Use TypeScript** to make invalid states unrepresentable. A `Button` with `variant="link"` should not accept a `size` prop if link buttons are always unsized.
- **Forward refs** so consumers can imperatively focus or measure the DOM node.

### 6. Design System Documentation and Storybook

A design system without documentation is a component library nobody uses. Documentation should live alongside the code and include:

- **Usage guidelines.** When to use this component and when not to.
- **Props table.** Every prop, its type, default value, and description.
- **Interactive examples.** Storybook stories that let consumers see every variant, size, and state.
- **Do / Don't examples.** Visual pairs showing correct and incorrect usage.
- **Accessibility notes.** Keyboard behavior, ARIA attributes, and screen reader announcements.

[Storybook](https://storybook.js.org/) is the industry standard for developing, testing, and documenting components in isolation. Each component gets a set of "stories" — named exports that render specific states.

### 7. When to Build vs. Use Existing Systems

Not every team should build a design system from scratch. The decision depends on scale, resources, and uniqueness requirements.

| Approach | When to choose it | Examples |
|----------|--------------------|----------|
| **Use a headless/unstyled library** | You want full visual control but don't want to build interaction patterns (keyboard nav, focus trapping, ARIA) from scratch | Radix UI, Headless UI, React Aria |
| **Use a copy-paste component collection** | You want ownership of the code, a strong starting point, and the ability to customize everything | shadcn/ui |
| **Use a fully styled framework** | You need to ship fast and can accept the framework's visual opinions | MUI (Material UI), Chakra UI, Ant Design |
| **Build from scratch** | You have a large team, a unique brand, and the resources to maintain it long-term | Custom system on top of Radix primitives |

**Rule of thumb:** Start with an existing system. Fork or eject only when you hit real limitations, not hypothetical ones.

### 8. Governance and Versioning

A design system serves multiple teams and products. Without governance, it becomes a dumping ground of one-off components and conflicting patterns.

**Semantic versioning (semver):** Version your design system as a package. Follow `MAJOR.MINOR.PATCH`:
- **PATCH (1.0.1):** Bug fix, visual tweak that does not change API or behavior.
- **MINOR (1.1.0):** New component, new variant, new token. Non-breaking — consumers can upgrade without changes.
- **MAJOR (2.0.0):** Removed component, renamed prop, changed token value that affects consumers. Breaking — consumers must update their code.

**Changelog:** Maintain a `CHANGELOG.md` with every release. For each version, list: what changed, why it changed, and what consumers need to do (for breaking changes). Automate this with conventional commits and tools like `changesets` or `release-please`.

**Breaking change strategy:**
1. **Deprecate first.** Add a deprecation warning in MINOR (console.warn, strikethrough in docs). Give consumers a release cycle to migrate.
2. **Remove in the next MAJOR.** Only after deprecation has been communicated.
3. **Provide codemods** when possible — automated scripts that refactor consumer code from old API to new API.

**Contribution model:** Define who can add, modify, or remove components. A typical model: anyone can propose via a GitHub issue or PR. A small core team reviews for consistency, accessibility, and API quality. Design review before merge.

### 9. Multi-Framework Support

Large organizations often have teams using React, Vue, Angular, or plain HTML. A design system should provide consistent tokens and, ideally, consistent components across frameworks.

**Shared token layer:** Design tokens (colors, spacing, typography, shadows, radii) should be framework-agnostic. Define them as:
- CSS custom properties (works everywhere).
- JSON token files (consumed by build tools to generate CSS, Tailwind config, iOS constants, Android resources).
- Use [Style Dictionary](https://amzn.github.io/style-dictionary/) or [Cobalt UI](https://cobalt-ui.pages.dev/) to generate multi-platform outputs from a single token source.

**Web Components:** For truly framework-agnostic components, build with Web Components (using Lit, Stencil, or native `customElements`). These work in React, Vue, Angular, and plain HTML. The trade-off: DX is less polished than native framework components, and React's synthetic event system can be awkward with custom elements.

**Practical approach:** Most teams are better served by building tokens as CSS custom properties (shared) and components in their primary framework (e.g., React). If a secondary framework needs the same components, start with the shared tokens and rebuild components natively in that framework.

---

## LLM Instructions

When an AI assistant is asked to build or maintain a design system, follow these directives:

### Design Token Systems

1. Define a complete token set covering: color palettes (with numeric scales like 50--950), spacing (based on a 4px or 8px grid), typography (font families, sizes, weights, line heights, letter spacing), shadows (sm/md/lg/xl), border radii, and transition durations.
2. Structure tokens in three tiers: global (raw values), semantic/alias (purpose-driven references like `--color-primary`, `--color-surface`, `--color-on-surface`), and component-level (scoped overrides like `--button-bg`).
3. Output tokens as CSS custom properties on `:root`. If the project uses Tailwind, also output a `tailwind.config.js` theme extension that maps to the same token values.
4. Always include semantic tokens for surfaces, borders, text (primary, secondary, muted), and interactive states (hover, active, focus, disabled).

### Component API Design

1. Define component props using TypeScript interfaces with JSDoc comments.
2. Include a `variant` prop (visual style), `size` prop (sm/md/lg), and forward all remaining HTML attributes via `ComponentPropsWithoutRef` or equivalent.
3. Use `forwardRef` so the underlying DOM element is accessible to consumers.
4. Use `cva` (class-variance-authority) or a similar utility to map variant/size combinations to class names when using Tailwind CSS.
5. Ensure every interactive component is keyboard accessible and includes appropriate ARIA attributes. Reference the Accessibility guide for specific patterns.
6. Default to the most common variant and size (usually "primary" and "md").

### Themed Component Libraries

1. Implement theming via CSS custom properties with a `data-theme` attribute on the root element.
2. Define at minimum a light and dark theme. Each theme overrides the same set of semantic tokens.
3. Provide a ThemeProvider React component (or equivalent) that: reads the user's system preference via `prefers-color-scheme`, checks for a stored preference in `localStorage`, applies the correct `data-theme` attribute, and exposes a toggle function via context.
4. Never hardcode color values in components. Always reference semantic tokens.

### Storybook Stories

1. Generate a default story that renders the component with default props.
2. Generate a story for every variant, every size, and key states (disabled, loading, error).
3. Use Storybook's `argTypes` to expose interactive controls for all props.
4. Add a "Playground" story that enables all controls for free-form testing.
5. Include JSDoc or MDX documentation blocks explaining usage, do/don't guidance, and accessibility notes.
6. Use decorators to wrap stories in a ThemeProvider so theme switching works in Storybook.

---

## Examples

### Example 1: Design Tokens in CSS Custom Properties

```css
/* tokens.css — Complete design token set */

:root {
  /* ========================================
     GLOBAL TOKENS (raw values)
     ======================================== */

  /* Color — Blue (Primary) */
  --blue-50:  #eff6ff;
  --blue-100: #dbeafe;
  --blue-200: #bfdbfe;
  --blue-300: #93c5fd;
  --blue-400: #60a5fa;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;
  --blue-800: #1e40af;
  --blue-900: #1e3a8a;
  --blue-950: #172554;

  /* Color — Neutral (Gray) */
  --neutral-50:  #fafafa;
  --neutral-100: #f5f5f5;
  --neutral-200: #e5e5e5;
  --neutral-300: #d4d4d4;
  --neutral-400: #a3a3a3;
  --neutral-500: #737373;
  --neutral-600: #525252;
  --neutral-700: #404040;
  --neutral-800: #262626;
  --neutral-900: #171717;
  --neutral-950: #0a0a0a;

  /* Color — Semantic status */
  --red-500:    #ef4444;
  --red-600:    #dc2626;
  --green-500:  #22c55e;
  --green-600:  #16a34a;
  --amber-500:  #f59e0b;
  --amber-600:  #d97706;

  /* Spacing — 4px base grid */
  --space-0:  0px;
  --space-px: 1px;
  --space-0-5: 2px;
  --space-1:  4px;
  --space-1-5: 6px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Typography — Font families */
  --font-sans:  'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono:  'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace;

  /* Typography — Font sizes (with matching line heights) */
  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */

  --leading-none:    1;
  --leading-tight:   1.25;
  --leading-snug:    1.375;
  --leading-normal:  1.5;
  --leading-relaxed: 1.625;

  /* Typography — Font weights */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  /* Shadows */
  --shadow-xs:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm:  0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Border radius */
  --radius-none: 0px;
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-2xl:  16px;
  --radius-full: 9999px;

  /* Transitions */
  --duration-fast:   100ms;
  --duration-normal: 200ms;
  --duration-slow:   300ms;
  --easing-default:  cubic-bezier(0.4, 0, 0.2, 1);
  --easing-in:       cubic-bezier(0.4, 0, 1, 1);
  --easing-out:      cubic-bezier(0, 0, 0.2, 1);

  /* ========================================
     SEMANTIC TOKENS (light theme — default)
     ======================================== */

  /* Surfaces */
  --color-background:     var(--neutral-50);
  --color-surface:        #ffffff;
  --color-surface-raised: #ffffff;
  --color-overlay:        rgb(0 0 0 / 0.5);

  /* Borders */
  --color-border:         var(--neutral-200);
  --color-border-strong:  var(--neutral-300);

  /* Text */
  --color-text-primary:   var(--neutral-900);
  --color-text-secondary: var(--neutral-600);
  --color-text-muted:     var(--neutral-400);
  --color-text-inverse:   #ffffff;

  /* Brand / Interactive */
  --color-primary:        var(--blue-600);
  --color-primary-hover:  var(--blue-700);
  --color-primary-active: var(--blue-800);
  --color-primary-soft:   var(--blue-50);
  --color-on-primary:     #ffffff;

  /* Status */
  --color-error:          var(--red-600);
  --color-error-soft:     #fef2f2;
  --color-success:        var(--green-600);
  --color-success-soft:   #f0fdf4;
  --color-warning:        var(--amber-600);
  --color-warning-soft:   #fffbeb;

  /* Focus ring */
  --ring-color:  var(--blue-500);
  --ring-offset: 2px;
  --ring-width:  2px;
}
```

### Example 2: Button Component with Variants and Sizes (React + Tailwind)

```tsx
// components/ui/button.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils"; // typical Tailwind merge utility

/* -----------------------------------------------
   Button variants defined with class-variance-authority.
   Maps variant + size combinations to Tailwind classes.
   ----------------------------------------------- */
const buttonVariants = cva(
  /* Base styles applied to ALL buttons */
  [
    "inline-flex items-center justify-center gap-2",
    "rounded-md font-medium whitespace-nowrap",
    "transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
        secondary:
          "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:bg-neutral-300",
        outline:
          "border border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100",
        ghost:
          "bg-transparent text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        link:
          "text-blue-600 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

/* -----------------------------------------------
   TypeScript interface.
   Extends native button attributes so consumers
   can pass onClick, disabled, aria-label, etc.
   ----------------------------------------------- */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a loading spinner and disable interaction */
  loading?: boolean;
}

/* -----------------------------------------------
   Button component with forwardRef.
   ----------------------------------------------- */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

**Usage:**

```tsx
import { Button } from "@/components/ui/button";

// Default primary, medium
<Button>Save changes</Button>

// Variants
<Button variant="secondary">Cancel</Button>
<Button variant="outline">Edit</Button>
<Button variant="ghost">More options</Button>
<Button variant="destructive">Delete account</Button>
<Button variant="link">Learn more</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon" aria-label="Settings"><GearIcon /></Button>

// Loading state
<Button loading>Saving...</Button>
```

### Example 3: Theming System with Light/Dark Token Switching

```css
/* theme-tokens.css — Semantic tokens with theme overrides */

:root,
[data-theme="light"] {
  --color-background:     #fafafa;
  --color-surface:        #ffffff;
  --color-surface-raised: #ffffff;
  --color-border:         #e5e5e5;
  --color-border-strong:  #d4d4d4;

  --color-text-primary:   #171717;
  --color-text-secondary: #525252;
  --color-text-muted:     #a3a3a3;
  --color-text-inverse:   #ffffff;

  --color-primary:        #2563eb;
  --color-primary-hover:  #1d4ed8;
  --color-primary-soft:   #eff6ff;
  --color-on-primary:     #ffffff;

  --color-error:          #dc2626;
  --color-success:        #16a34a;
  --color-warning:        #d97706;

  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

[data-theme="dark"] {
  --color-background:     #0a0a0a;
  --color-surface:        #171717;
  --color-surface-raised: #262626;
  --color-border:         #404040;
  --color-border-strong:  #525252;

  --color-text-primary:   #fafafa;
  --color-text-secondary: #a3a3a3;
  --color-text-muted:     #737373;
  --color-text-inverse:   #171717;

  --color-primary:        #3b82f6;
  --color-primary-hover:  #60a5fa;
  --color-primary-soft:   #172554;
  --color-on-primary:     #ffffff;

  --color-error:          #ef4444;
  --color-success:        #22c55e;
  --color-warning:        #f59e0b;

  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3);
}
```

```tsx
// providers/theme-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Read stored preference
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);

    // Listen for system preference changes when in "system" mode
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const next = e.matches ? "dark" : "light";
        setResolvedTheme(next);
        document.documentElement.setAttribute("data-theme", next);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem("theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
```

```tsx
// components/theme-toggle.tsx
"use client";

import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { SunIcon, MoonIcon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <SunIcon aria-hidden="true" />
      ) : (
        <MoonIcon aria-hidden="true" />
      )}
    </Button>
  );
}
```

### Example 4: Storybook Story for the Button Component

```tsx
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { MailIcon, TrashIcon, SettingsIcon } from "lucide-react";

/**
 * The Button component is the primary interactive element in the design system.
 *
 * ## Usage
 * - Use `primary` for the main call-to-action on a page.
 * - Use `secondary` for less prominent actions alongside a primary button.
 * - Use `outline` for actions that need visibility but lower emphasis.
 * - Use `ghost` for tertiary actions or toolbar buttons.
 * - Use `destructive` only for irreversible actions (delete, remove).
 * - Use `link` when the action navigates and should look like inline text.
 *
 * ## Accessibility
 * - Always provide visible text or an `aria-label` (for icon-only buttons).
 * - The `loading` prop sets `aria-busy="true"` and disables interaction.
 * - Focus ring is visible on keyboard navigation (`:focus-visible`).
 */
const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive", "link"],
      description: "Visual style of the button",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg", "icon"],
      description: "Size of the button",
    },
    loading: {
      control: "boolean",
      description: "Shows a spinner and disables the button",
    },
    disabled: {
      control: "boolean",
      description: "Prevents interaction",
    },
    children: {
      control: "text",
      description: "Button label",
    },
  },
  args: {
    children: "Button",
    variant: "primary",
    size: "md",
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

/* ---- Default (Playground) ---- */
export const Playground: Story = {};

/* ---- All variants ---- */
export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

/* ---- All sizes ---- */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Settings">
        <SettingsIcon />
      </Button>
    </div>
  ),
};

/* ---- With icons ---- */
export const WithIcons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <Button>
        <MailIcon /> Send email
      </Button>
      <Button variant="destructive">
        <TrashIcon /> Delete
      </Button>
    </div>
  ),
};

/* ---- Loading state ---- */
export const Loading: Story = {
  args: {
    loading: true,
    children: "Saving...",
  },
};

/* ---- Disabled state ---- */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
};
```

### Example 5: Input / Form Field Component (React + Tailwind)

The other critical atom component alongside Button — a reusable form field with label, error, and description support.

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, description, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const descId = description ? `${inputId}-desc` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          {label}
          {props.required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          )}
        </label>

        {description && (
          <p id={descId} className="text-xs text-neutral-500">
            {description}
          </p>
        )}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-md border px-3 py-2 text-base",
            "bg-white dark:bg-neutral-900",
            "border-neutral-300 dark:border-neutral-700",
            "text-neutral-900 dark:text-neutral-100",
            "placeholder:text-neutral-400",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-400 focus:border-red-400",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            [errorId, descId].filter(Boolean).join(" ") || undefined
          }
          {...props}
        />

        {error && (
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
```

**Key decisions:**
- Label is required (no unlabeled inputs in the design system).
- Error state uses `aria-invalid` and `aria-describedby` linking to the error message `id`.
- Description text uses `aria-describedby` so screen readers announce it when the input is focused.
- `React.useId()` generates stable, unique IDs for SSR safety.
- Focus ring matches the primary brand color. Error state overrides to red.
- Dark mode variants included via Tailwind's `dark:` prefix.

---

### Example 6: Token Generation from a Brand Color (oklch Shade Ramp)

A JavaScript function that takes a single oklch base color and generates a full 11-shade ramp.

```javascript
/**
 * Generate an oklch shade ramp from a single base color.
 *
 * @param {number} baseL - Base lightness (0 to 1), e.g., 0.55
 * @param {number} baseC - Base chroma (0 to 0.4), e.g., 0.20
 * @param {number} baseH - Base hue (0 to 360), e.g., 250
 * @returns {Record<string, string>} Shade map { "50": "oklch(...)", ..., "950": "oklch(...)" }
 */
function generateOklchRamp(baseL, baseC, baseH) {
  // Target lightness values for each shade step
  // 50 is very light (background tints), 950 is very dark
  const lightnessMap = {
    50:  0.97,
    100: 0.93,
    200: 0.86,
    300: 0.76,
    400: 0.66,
    500: 0.55,
    600: 0.48,
    700: 0.42,
    800: 0.35,
    900: 0.28,
    950: 0.20,
  };

  // Chroma curve: reduce chroma at extremes (very light and very dark)
  // to avoid oversaturated pastels and muddy darks
  function chromaForLightness(L) {
    if (L > 0.9) return baseC * 0.15;       // very light: minimal chroma
    if (L > 0.8) return baseC * 0.45;       // light: moderate chroma
    if (L > 0.6) return baseC * 0.85;       // medium-light: near full
    if (L > 0.4) return baseC;               // core range: full chroma
    if (L > 0.25) return baseC * 0.85;      // dark: slightly reduced
    return baseC * 0.5;                       // very dark: reduced
  }

  const ramp = {};
  for (const [step, L] of Object.entries(lightnessMap)) {
    const C = chromaForLightness(L);
    ramp[step] = `oklch(${L.toFixed(2)} ${C.toFixed(3)} ${baseH})`;
  }

  return ramp;
}

// Usage: Generate a full indigo palette from one color
const indigoPalette = generateOklchRamp(0.55, 0.22, 285);
// {
//   "50":  "oklch(0.97 0.033 285)",
//   "100": "oklch(0.93 0.099 285)",
//   "200": "oklch(0.86 0.099 285)",
//   "300": "oklch(0.76 0.187 285)",
//   "400": "oklch(0.66 0.187 285)",
//   "500": "oklch(0.55 0.220 285)",
//   "600": "oklch(0.48 0.220 285)",
//   "700": "oklch(0.42 0.220 285)",
//   "800": "oklch(0.35 0.187 285)",
//   "900": "oklch(0.28 0.187 285)",
//   "950": "oklch(0.20 0.110 285)",
// }

// Generate CSS custom properties from the ramp
function rampToCSS(name, ramp) {
  return Object.entries(ramp)
    .map(([step, value]) => `  --${name}-${step}: ${value};`)
    .join("\n");
}

console.log(`:root {\n${rampToCSS("primary", indigoPalette)}\n}`);
```

**Key decisions:**
- Lightness values are hand-tuned to match common design token conventions (50 = very light background, 500 = default, 950 = near-black).
- Chroma is reduced at the extremes to produce natural-looking pastels (high lightness) and deep shades (low lightness) without muddiness or neon artifacts.
- Hue is kept constant across all shades for a visually cohesive ramp.
- The function outputs CSS-ready `oklch()` strings that can be pasted directly into a stylesheet or design token file.

---

## Common Mistakes

### 1. Hardcoding color values instead of using tokens

**Wrong:** `#3b82f6` scattered across your codebase in individual components. Every instance is a future inconsistency.
**Fix:** Define `--color-primary` in your token system and reference it everywhere: `background-color: var(--color-primary);`. Use tokens. Always.

### 2. Skipping semantic tokens and referencing global tokens directly

**Wrong:** Writing `var(--blue-600)` in a component. Your dark theme has no opportunity to remap that value.
**Fix:** Use semantic tokens like `var(--color-primary)` instead of global tokens like `var(--blue-600)`. Semantic tokens allow each theme to remap values independently.

### 3. Overloading a single component with too many props

**Wrong:** A component that accepts 20+ props, trying to handle every possible use case in one monolithic API.
**Fix:** Break it into composable pieces. Use composition (children, slots, compound components) instead of configuration props.

### 4. Not forwarding refs

**Wrong:** A component that wraps a DOM element but does not expose a ref. Consumers cannot focus, measure, or scroll to it.
**Fix:** Always use `React.forwardRef` so the underlying DOM element is accessible to consumers for imperative operations.

### 5. Building a design system before you have patterns to extract

**Wrong:** Designing an abstract component library before building any real product screens. You end up with components nobody needs and missing the ones they do.
**Fix:** Build three real screens first, then extract the repeated patterns into shared components. Let real usage drive the API.

### 6. Ignoring accessibility in the design system

**Wrong:** Shipping a Button component that is not keyboard accessible. Every button in the entire product inherits that failure.
**Fix:** Build accessibility into the system layer, not the feature layer. Every interactive component must support keyboard navigation, focus management, and appropriate ARIA attributes from day one.

### 7. Documenting components only with code comments

**Wrong:** The only documentation for a component is inline comments in the source file. Other developers cannot discover usage patterns, variants, or do/don't guidance.
**Fix:** Maintain written docs and interactive Storybook examples. Undocumented components get reimplemented because nobody knows they exist.

### 8. Choosing a UI framework based on GitHub stars instead of actual needs

**Wrong:** Picking the most popular framework without evaluating whether it fits your project's requirements.
**Fix:** Evaluate bundle size, accessibility support, customizability, and community activity. A framework that fights your design is worse than no framework.

### 9. Not versioning your design system

**Wrong:** Pushing breaking changes to the design system without any versioning. Multiple consuming apps break silently in production.
**Fix:** Publish your design system as a versioned package with semantic versioning (semver) and a changelog. Breaking changes get a major version bump and a migration guide.

---

> **See also:** [Brand-Identity](../Brand-Identity/brand-identity.md) | [Accessibility](../Accessibility/accessibility.md) | [Typography-Color](../Typography-Color/typography-color.md) | [Dark-Mode](../Dark-Mode/dark-mode.md) | [Responsive-Design](../Responsive-Design/responsive-design.md) | [UX-Patterns](../UX-Patterns/ux-patterns.md)
>
> **Last reviewed:** 2026-02
