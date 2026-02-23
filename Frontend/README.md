# Frontend Vibe Coding Knowledge Base

> React 19, Next.js 15 App Router, TypeScript, CSS architecture, and modern frontend patterns structured for AI-assisted development. Feed these files to your AI coding assistant to build production-quality interfaces.

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack multiple files** for complex tasks — the guides cross-reference each other.
4. **Describe what you're building** and the AI now has expert-level frontend context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| Building a new Next.js app | `React-Fundamentals` + `Nextjs-Patterns` + `TypeScript-React` |
| Adding a data dashboard | `Data-Fetching` + `State-Management` + `Performance` |
| Creating a design system | `Component-Patterns` + `CSS-Architecture` + `TypeScript-React` |
| Building a multi-step form | `Forms-Validation` + `TypeScript-React` + `React-Fundamentals` |
| Optimizing a slow page | `Performance` + `Data-Fetching` + `Nextjs-Patterns` |

**Pro tip:** Start every new React/Next.js session by pasting `Nextjs-Patterns` into your AI session. This single step ensures every component uses the right Server/Client Component split and follows App Router conventions.

---

## Guides

```
Frontend/
├── React-Fundamentals/      → React 19 hooks, state, effects, refs, Suspense, error boundaries
├── Nextjs-Patterns/         → App Router, RSC, Server Actions, caching, middleware, deployment
├── CSS-Architecture/        → Tailwind v4, CSS Modules, cn(), dark mode, responsive, animation
├── Performance/             → Web Vitals, bundle analysis, code splitting, images, fonts
├── State-Management/        → TanStack Query, Zustand, Jotai, URL state, Context, state machines
├── Component-Patterns/      → Composition, compound components, custom hooks, headless UI
├── TypeScript-React/        → Props typing, generics, discriminated unions, Zod, utility types
├── Data-Fetching/           → RSC fetching, caching layers, TanStack Query, streaming, mutations
└── Forms-Validation/        → React Hook Form + Zod, Server Actions, multi-step, file uploads
```

### [React Fundamentals](./React-Fundamentals/react-fundamentals.md)
Core React 19 patterns: hooks (useState, useEffect, useRef, useMemo, useCallback), React 19 hooks (useTransition, useOptimistic, useActionState, use), JSX patterns, refs, error boundaries with react-error-boundary, Suspense with nested boundaries, and Strict Mode. Includes a useLocalStorage hook, optimistic todo list, and useTransition filter.

### [Next.js Patterns](./Nextjs-Patterns/nextjs-patterns.md)
Next.js 15 App Router: Server Components vs Client Components, "use client" boundary strategy, file-based routing (route groups, parallel routes, intercepting routes), Server Actions with Zod validation, middleware for auth, the four caching layers, revalidation strategies, streaming with Suspense, Route Handlers, and image/font/metadata optimization. Includes a complete app structure, Server Action form, and auth middleware.

### [CSS Architecture](./CSS-Architecture/css-architecture.md)
Tailwind CSS v4 with CSS-first configuration (@theme), CSS Modules for complex selectors, the cn() utility (clsx + tailwind-merge), cva for component variants, responsive mobile-first patterns, container queries, dark mode with next-themes and semantic tokens, and animation. Includes a full theme config, Button variants with cva, and a responsive dashboard layout.

### [Performance](./Performance/performance.md)
Core Web Vitals (LCP, CLS, INP), bundle analysis with @next/bundle-analyzer, code splitting (React.lazy, next/dynamic), image optimization (next/image, responsive sizes, priority), font optimization (next/font), script loading strategies, tree shaking (barrel file anti-pattern), memoization guidelines, Server Components as a performance lever, and Lighthouse CI. Includes bundle fix examples and a Lighthouse CI workflow.

### [State Management](./State-Management/state-management.md)
The four types of frontend state (server, client, URL, form), TanStack Query for server state (queries, mutations, optimistic updates, cache invalidation), Zustand for client state (selectors, persist, devtools), Jotai for atomic state, URL state with nuqs, React Context patterns and pitfalls, and state machines with XState. Includes TanStack Query CRUD, a Zustand cart store, and nuqs filterable table.

### [Component Patterns](./Component-Patterns/component-patterns.md)
Composition over configuration, compound components (Tabs, Accordion, Select), custom hooks (useDebounce, useMediaQuery, useClickOutside, useCopyToClipboard), headless UI libraries (Radix UI, React Aria), render props, ref forwarding, provider composition utility, and the container/presentational split in the RSC era. Includes compound Tabs, Radix Dialog wrapper, and a generic List component.

### [TypeScript-React](./TypeScript-React/typescript-react.md)
Props typing (interface vs type, extending HTML attributes), generic components (Table<T>, List<T>), discriminated unions for variants, type-safe event handlers, React utility types (ComponentProps, ComponentRef), strict mode settings, as const and template literal types, Zod schema-first development, type-safe Server Actions, and avoiding `any`. Includes a generic data table, typed notification system, and Zod + RHF + Server Action form.

### [Data Fetching](./Data-Fetching/data-fetching.md)
Server-first data model, async Server Components, the four Next.js caching layers, revalidation strategies (time-based, on-demand, tag-based), TanStack Query for client components with prefetching, streaming with Suspense, error handling (error.tsx + try/catch), skeleton UI, waterfall prevention (Promise.all), and Server Actions with useOptimistic. Includes a streaming product page, infinite scroll, and a like button with optimistic UI.

### [Forms & Validation](./Forms-Validation/forms-validation.md)
React Hook Form + Zod as the form stack, Server Actions for submission, useActionState and useOptimistic, multi-step wizard pattern with per-step validation, file uploads with presigned URLs and progress, accessible form patterns (labels, aria-describedby, aria-invalid), reusable FormField components, dynamic forms with useFieldArray, and form state persistence. Includes a complete contact form, registration wizard, file upload, and invoice line items.

---

## Status

Complete — all 9 guides are written and reviewed. Last updated: 2026-02.
