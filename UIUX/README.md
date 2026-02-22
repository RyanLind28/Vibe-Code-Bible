# UI/UX Vibe Coding Knowledge Base

> Design principles, accessibility standards, and UX patterns structured for AI-assisted development. Feed these files to your AI coding assistant to build interfaces that look great and work for everyone.

---

## How to Use

1. **Pick the file(s) that match your task** from the guide list below.
2. **Copy the full `.md` contents** into your AI coding session (Claude, Cursor, Copilot, etc.).
3. **Stack multiple files** for complex tasks — the guides cross-reference each other.
4. **Describe what you're building** and the AI now has expert-level UI/UX context.

**Example stacks:**

| Task | Files to stack |
|------|---------------|
| Building a new SaaS dashboard | `Brand-Identity` + `Design-Systems` + `Dark-Mode` |
| Making a site accessible | `Accessibility` + `Typography-Color` + `Responsive-Design` |
| Adding animations to a landing page | `Animation-Motion` + `Responsive-Design` + `Typography-Color` |
| Designing a mobile app | `Mobile-First` + `UX-Patterns` + `Accessibility` |
| Starting a brand-new product | `Brand-Identity` + `Design-Systems` + `Typography-Color` + `Dark-Mode` |

**Pro tip:** Start every new AI session with your Brand Brief (template in `Brand-Identity/brand-identity.md`). This single step eliminates generic-looking AI output and keeps every screen on-brand.

---

## Guides

```
UIUX/
├── Brand-Identity/          → Brand briefs, visual identity, voice & tone, consistency
├── Design-Systems/          → Component libraries, tokens, theming, governance
├── Accessibility/           → WCAG compliance, ARIA, screen readers, cognitive a11y
├── Responsive-Design/       → Breakpoints, fluid layouts, container queries, subgrid
├── Typography-Color/        → Type scales, color theory, contrast ratios, gradients
├── UX-Patterns/             → Forms, navigation, modals, search, onboarding, drag-and-drop
├── Animation-Motion/        → Transitions, micro-interactions, scroll-driven animations
├── Dark-Mode/               → Theme switching, color tokens, AMOLED, next-themes
└── Mobile-First/            → Touch targets, gestures, offline-first, service workers
```

### [Brand Identity & Style Guide](./Brand-Identity/brand-identity.md)
Define your brand so AI stops generating generic Bootstrap-looking UIs. Includes a fill-in-the-blank Brand Brief template, a complete fictional example (Flowline SaaS), brand-to-code implementation (CSS tokens, Tailwind config, branded components), and a consistency audit checklist. **Start here if you're building a new product.**

### [Design Systems](./Design-Systems/design-systems.md)
Component architecture, design tokens (CSS custom properties), atomic design, theming, Storybook documentation, and when to build vs. use existing systems. Includes governance/versioning strategies, multi-framework support, a Button component, an Input/Form Field component, and an oklch token generation algorithm.

### [Accessibility](./Accessibility/accessibility.md)
WCAG 2.2 compliance, semantic HTML, ARIA patterns, keyboard navigation, color contrast, screen reader testing, and forms accessibility. Includes cognitive accessibility (WCAG 2.2 focus), touch target sizes (WCAG 2.5.8), an axe-core + Playwright integration test, and an accessible Tab component.

### [Responsive Design](./Responsive-Design/responsive-design.md)
Mobile-first breakpoints, fluid typography with `clamp()`, CSS Grid and Flexbox layouts, container queries, CSS Subgrid, and dynamic viewport units (`dvh`/`svh`/`lvh`). Includes a responsive data table (card stacking on mobile), Tailwind responsive utilities, and a "make this responsive" LLM checklist.

### [Typography & Color](./Typography-Color/typography-color.md)
Modular type scales, font pairing, web font loading, line height and measure, color theory (60-30-10 rule), oklch color spaces, contrast ratios, and color accessibility. Includes oklch gradient patterns (gradient text, mesh gradients), a brand color derivation algorithm, and a full oklch palette generator in JavaScript.

### [UX Patterns](./UX-Patterns/ux-patterns.md)
Forms, navigation, modals, search, data display, feedback, pagination, progressive disclosure, and error handling. Includes onboarding flows, settings/preferences page patterns, drag-and-drop with accessible keyboard alternatives, a multi-step form wizard, a command palette (Cmd+K), a data table, a toast notification system, an onboarding checklist, and a settings page layout.

### [Animation & Motion](./Animation-Motion/animation-motion.md)
CSS transitions, keyframe animations, Motion (formerly Framer Motion), spring physics, micro-interactions, page transitions (View Transitions API), and reduced motion support. Includes scroll-driven animations (`animation-timeline: view()`), CSS `@starting-style` for animating from `display: none`, and CSS-only scroll-reveal and dialog animation examples.

### [Dark Mode](./Dark-Mode/dark-mode.md)
System preference detection, three-way toggle (system/light/dark), semantic token architecture, FOUC prevention, and image handling. Includes AMOLED/true black theme tradeoffs, high contrast mode (`forced-colors`), CSS `color-scheme` property, Tailwind dark mode setup, and a next-themes integration example for Next.js.

### [Mobile-First Design](./Mobile-First/mobile-first.md)
Touch targets, thumb zones, bottom navigation, mobile typography, mobile forms, gestures, performance optimization, safe areas, and PWA considerations. Includes offline-first patterns (service worker caching strategies), app shell architecture, a Workbox service worker example, and an offline indicator component.

---

## Status

Complete — all 9 guides are written and reviewed. Last updated: 2026-02.
