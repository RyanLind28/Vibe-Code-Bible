# Responsive Design

> Breakpoints, fluid layouts, container queries, and building interfaces that work on every screen.

---

## Principles

### 1. Mobile-First Approach

Design and code for the smallest screen first, then layer on complexity as the viewport grows. Mobile-first means using `min-width` breakpoints exclusively and treating the mobile layout as the default — no media query required. This is progressive enhancement applied to layout: the baseline experience works everywhere, and wider screens get additional columns, larger type, and richer interactions.

Mobile-first is not just a CSS technique. It forces you to prioritize content, strip away the non-essential, and think about touch targets, thumb zones, and constrained bandwidth before you ever consider a desktop layout.

### 2. Common Breakpoint Strategy

Use a consistent, well-documented set of breakpoints across the project. The Tailwind CSS defaults are a sensible industry standard:

| Token | Min-width | Typical targets                     |
|-------|-----------|-------------------------------------|
| `sm`  | 640px     | Large phones in landscape            |
| `md`  | 768px     | Tablets in portrait                  |
| `lg`  | 1024px    | Tablets in landscape, small laptops  |
| `xl`  | 1280px    | Standard desktops                    |
| `2xl` | 1536px    | Large desktops, ultrawide monitors   |

**Do not create breakpoints for specific devices.** Device-specific breakpoints are a maintenance trap. Instead, let the content dictate where the layout breaks — add a breakpoint when the design starts to look wrong, not when a new phone launches.

Store breakpoints as design tokens (CSS custom properties or Tailwind config) so they are defined in exactly one place and consumed everywhere.

### 3. Fluid Typography and Spacing

Hard jumps between breakpoints create jarring transitions. Fluid typography and spacing smooth them out by scaling values continuously between a minimum and maximum viewport width.

The `clamp()` function is the modern tool for this:

```
font-size: clamp(min, preferred, max);
```

Where `preferred` is typically a viewport-relative expression (e.g., `2vw + 1rem`). The result is text that scales smoothly between `min` and `max` without any media queries.

Apply the same fluid approach to spacing — margins, padding, and gaps — using `clamp()` or the `min()` / `max()` functions. This reduces the number of breakpoints you need and produces layouts that feel natural at every width, not just the five you tested.

**Always use `rem` for the min and max values** so fluid type respects the user's browser font-size preference.

### 4. CSS Grid vs Flexbox

Both are layout tools. They solve different problems:

| Use CSS Grid when...                           | Use Flexbox when...                           |
|------------------------------------------------|-----------------------------------------------|
| You need two-dimensional control (rows + cols) | You need one-dimensional flow (row or column)  |
| The layout is defined by the container         | The layout is defined by the content           |
| You want explicit track sizing                 | You want items to grow/shrink naturally        |
| You need overlap or layering (`grid-area`)     | You need simple alignment and distribution     |
| You are building a page-level layout           | You are building a component-level layout      |

They are not mutually exclusive. A page layout might use CSS Grid for the overall structure and Flexbox for the navigation bar inside the header. Choose the tool that matches the problem at hand.

### 5. Container Queries

Media queries respond to the **viewport**. Container queries respond to the **container** — the parent element the component lives in. This is component-level responsiveness, and it is transformative for reusable design systems.

A card component inside a narrow sidebar should look different from the same card in a wide content area. With media queries, you would need to know the page layout context. With container queries, the card adapts to its own container width regardless of where it is placed.

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card { /* horizontal layout */ }
}
```

**Use container queries for components. Use media queries for page-level layout.** This separation of concerns makes components truly portable.

### 6. Responsive Images

Images are often the heaviest assets on a page. Responsive images ensure the browser downloads only the size it needs:

- **`srcset` + `sizes`**: Provide multiple resolutions of the same image. The browser picks the best one based on viewport width and device pixel ratio.
- **`<picture>` element**: Serve entirely different images at different breakpoints (art direction). Use this when the composition of the image changes — cropping, aspect ratio, or subject emphasis.
- **Aspect ratio**: Use the `aspect-ratio` CSS property to prevent layout shift while images load.
- **Lazy loading**: Add `loading="lazy"` to images below the fold. Keep `loading="eager"` (default) for above-the-fold hero images.
- **Modern formats**: Serve WebP or AVIF with `<picture>` fallback to JPEG/PNG.

### 7. Responsive Patterns

Learn and apply these recurring layout patterns:

- **Stack**: Single column, items stacked vertically. The default mobile layout for nearly everything.
- **Sidebar**: Content area with a fixed or collapsible sidebar. Sidebar stacks above or below on mobile, sits alongside on desktop.
- **Holy Grail**: Header, footer, main content, left sidebar, right sidebar. Classic three-column layout using CSS Grid.
- **Card Grid**: `auto-fill` / `auto-fit` with `minmax()` to create a grid that adds or removes columns automatically.
- **Responsive Tables**: On small screens, tables are unreadable. Strategies include horizontal scroll, card-based stacking, or hiding non-essential columns.

### 8. CSS Subgrid

CSS Subgrid allows a grid child to inherit track definitions (rows, columns, or both) from its parent grid. This solves the long-standing problem of aligning nested content across siblings.

Without subgrid, each card in a grid manages its own internal layout independently. If one card's title wraps to two lines, its body text shifts down while sibling cards remain unaffected — the row of cards looks misaligned.

With subgrid, the card's internal elements participate in the parent grid's track sizing. The title row across all cards is sized to the tallest title. All body text aligns. All footers align.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.card {
  display: grid;
  /* Inherit row tracks from the parent grid — NOT possible
     without subgrid. Instead, define internal rows and let
     subgrid align them across siblings. */
  grid-row: span 3; /* title, body, footer */
  grid-template-rows: subgrid;
  gap: 0.75rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.75rem;
}
```

**Use subgrid when** you need content inside grid children to align across siblings — cards with titles, descriptions, and CTAs; pricing tables with feature rows; any repeating layout where internal sections must line up.

**Browser support:** Subgrid is supported in all modern browsers (Chrome 117+, Firefox 71+, Safari 16+). It is production-ready.

### 9. Dynamic Viewport Units (`dvh`, `svh`, `lvh`)

The classic `vh` unit is broken on mobile. `100vh` on iOS Safari includes the area behind the browser's collapsible URL bar. The result: a "full-screen" hero section has its bottom content hidden behind the URL bar when it is visible, and the layout jumps when it collapses on scroll.

CSS now provides three dynamic viewport units that solve this:

| Unit | Meaning | Value |
|------|---------|-------|
| `svh` | **Small** viewport height | Viewport with all dynamic UI (URL bar, toolbar) **visible** — the shortest possible viewport. |
| `lvh` | **Large** viewport height | Viewport with all dynamic UI **hidden** — the tallest possible viewport. |
| `dvh` | **Dynamic** viewport height | The *current* viewport height, updating in real-time as the URL bar collapses/expands. |

**When to use each:**

- **`100dvh` for full-screen sections.** The hero section adapts as the mobile browser chrome collapses. This is the correct replacement for `100vh` on mobile.
- **`100svh` for elements that must never be obscured.** Guaranteed to fit within the smallest viewport state. Good for critical CTAs or sticky footers where content must always be visible.
- **`100lvh` rarely.** Only use for decorative backgrounds or elements where overflowing behind the URL bar is acceptable.

```css
.hero {
  min-height: 100dvh; /* adapts to mobile browser chrome */
}

/* Fallback for older browsers */
@supports not (min-height: 100dvh) {
  .hero {
    min-height: 100vh;
  }
}
```

### 10. Responsive Utilities in Tailwind CSS

Tailwind CSS provides a responsive utility system through breakpoint prefixes that align with the mobile-first approach. Every utility class can be prefixed with a breakpoint to apply it conditionally.

```html
<!-- Single column on mobile, 2 columns on tablet, 3 on desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  ...
</div>

<!-- Stack vertically on mobile, horizontal on desktop -->
<div class="flex flex-col lg:flex-row gap-4">
  ...
</div>

<!-- Text size scales up at breakpoints -->
<h1 class="text-2xl md:text-4xl lg:text-5xl">
  Responsive heading
</h1>

<!-- Hide on mobile, show on desktop -->
<aside class="hidden lg:block">
  Sidebar content
</aside>

<!-- Show on mobile only -->
<nav class="block lg:hidden">
  Bottom navigation
</nav>
```

The breakpoint prefixes follow Tailwind's mobile-first convention:
- No prefix = base (mobile)
- `sm:` = 640px+
- `md:` = 768px+
- `lg:` = 1024px+
- `xl:` = 1280px+
- `2xl:` = 1536px+

**Container queries in Tailwind:** As of Tailwind v3.4+, use the `@container` plugin for component-level responsiveness:

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row gap-4">
    <!-- Switches to row layout when container is >= 448px -->
  </div>
</div>
```

### 11. CSS Logical Properties

Physical CSS properties (`margin-left`, `padding-right`, `border-top`, `text-align: left`) assume a left-to-right (LTR), top-to-bottom writing direction. They break in right-to-left (RTL) languages (Arabic, Hebrew, Farsi) where "start" is the right side.

CSS logical properties replace physical directions with flow-relative ones:

| Physical property | Logical replacement |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `margin-top` / `margin-bottom` | `margin-block-start` / `margin-block-end` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |
| `left` / `right` (positioning) | `inset-inline-start` / `inset-inline-end` |
| `width` / `height` | `inline-size` / `block-size` |
| `margin: 0 auto` | `margin-inline: auto` |

**Shorthand properties** also have logical equivalents:

```css
/* Physical — breaks in RTL */
.card {
  margin-left: 1rem;
  padding-left: 1.5rem;
  border-left: 3px solid var(--color-primary);
  text-align: left;
}

/* Logical — works in LTR and RTL automatically */
.card {
  margin-inline-start: 1rem;
  padding-inline-start: 1.5rem;
  border-inline-start: 3px solid var(--color-primary);
  text-align: start;
}
```

**When physical properties are correct:** `env(safe-area-inset-left)` and `env(safe-area-inset-right)` are inherently physical — the notch is on a physical side of the hardware, not a language-direction side. `top`/`bottom` for fixed/sticky positioning are also physical when tied to viewport edges rather than reading flow.

**Rule of thumb:** Default to logical properties for all layout and spacing. Only use physical properties when referring to hardware edges (safe areas) or viewport-fixed positioning.

### 12. Testing Responsive Design

Responsive design must be tested, not assumed:

- **Browser DevTools**: Use responsive mode to resize the viewport and simulate devices. Test at arbitrary widths, not just preset device sizes.
- **Real devices**: Emulators miss touch behavior, scroll physics, and actual rendering quirks. Test on at least one real iOS device and one real Android device.
- **BrowserStack / Sauce Labs**: For broader device coverage when you cannot maintain a physical device lab.
- **Slow network simulation**: Throttle to 3G in DevTools and verify that the layout does not depend on JavaScript loading quickly.
- **Orientation changes**: Test portrait and landscape. Layouts that work in portrait often break in landscape (and vice versa).
- **Zoom testing**: Zoom to 200% and verify that nothing overflows or becomes unusable. This is also a WCAG requirement.

---

## LLM Instructions

When an AI assistant is asked to build responsive layouts or work on responsive design, it should follow these directives:

### Building Responsive Layouts

1. **Always start mobile-first.** Write the base CSS for the smallest screen with no media query. Add `min-width` media queries to progressively enhance for larger screens. Never use `max-width` breakpoints unless overriding a third-party library or implementing progressive disclosure patterns where the base state must be the enhanced view (such as data tables that collapse to cards on small screens).

2. **Use the project's existing breakpoint tokens.** Check the Tailwind config, CSS custom properties, or SCSS variables for defined breakpoints before introducing new ones. If no system exists, default to the Tailwind breakpoint scale (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`).

3. **Choose CSS Grid for page layouts, Flexbox for component internals.** When building a page-level structure (header, sidebar, main, footer), use CSS Grid with named grid areas. When aligning items inside a nav bar, button group, or card, use Flexbox.

4. **Implement fluid typography by default.** Use `clamp()` for `font-size`, `line-height` adjustments, and major spacing values. Calculate the preferred value so that the font smoothly transitions between the min and max across the typical viewport range (320px to 1536px).

   ```css
   /* Formula: clamp(min, preferred, max) */
   /* preferred = min + (max - min) * ((100vw - 320px) / (1536 - 320)) */
   font-size: clamp(1rem, 0.875rem + 0.5vw, 1.25rem);
   ```

5. **Use container queries for reusable components.** When building components that may live in different layout contexts (sidebar vs. main content vs. modal), wrap them in a container query context and use `@container` rules instead of `@media` rules. This makes the component self-contained and portable.

6. **Handle responsive images properly.** Always include `srcset` and `sizes` attributes on `<img>` elements. Use the `<picture>` element when art direction is needed. Set explicit `width` and `height` attributes (or `aspect-ratio` in CSS) to prevent Cumulative Layout Shift (CLS).

7. **Test every layout at five widths minimum.** When generating responsive code, mentally verify or comment how the layout behaves at: 320px (small phone), 640px (large phone), 768px (tablet), 1024px (laptop), and 1440px (desktop).

8. **Never use fixed pixel widths on containers.** Use `max-width` with percentage or viewport-relative fallbacks. Containers should be fluid by default and only constrained at their maximum.

9. **Prefer intrinsic sizing.** Use `auto-fill` / `auto-fit` with `minmax()` in CSS Grid to let the browser decide how many columns fit. This eliminates the need for many breakpoints.

10. **Always include a viewport meta tag.** If generating an HTML document, include `<meta name="viewport" content="width=device-width, initial-scale=1">`. Without it, mobile browsers render at a desktop width and scale down.

### Use CSS Logical Properties

Default to CSS logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`, `inset-inline-start`) instead of physical properties (`margin-left`, `padding-right`, `text-align: left`, `left`). Logical properties automatically support RTL languages without additional CSS. The only exceptions are safe area insets (`env(safe-area-inset-left)`) which are physically directional by nature, and viewport-fixed positioning (`top`, `bottom`) when anchored to hardware edges.

### "Make This Responsive" Checklist

When a user says "make this responsive" or "make this work on mobile," run through this checklist:

1. **Is the layout mobile-first?** Rewrite to mobile-first if it uses `max-width` breakpoints.
2. **Are font sizes fluid?** Replace fixed `px` font sizes with `clamp()` values.
3. **Are images responsive?** Add `srcset`, `sizes`, `max-width: 100%`, and `aspect-ratio`.
4. **Do containers use `max-width` instead of fixed `width`?** Replace `width: 1200px` with `width: 100%; max-width: 1200px`.
5. **Are grid layouts using `auto-fill`/`auto-fit`?** Replace fixed column counts with `repeat(auto-fill, minmax(280px, 1fr))`.
6. **Do reusable components use container queries?** Convert viewport media queries inside components to `@container` queries.
7. **Are touch targets 48px minimum?** Check all buttons, links, and interactive elements.
8. **Is `gap` used instead of margins for spacing?** Replace sibling margins with `gap` on the flex/grid parent.
9. **Are viewport units correct?** Replace `100vh` with `100dvh` for full-screen sections.
10. **Is the viewport meta tag present?** Verify `<meta name="viewport" content="width=device-width, initial-scale=1">`.

### When the User Asks for a Specific Layout

- If the user says "responsive dashboard," build a CSS Grid layout with a collapsible sidebar, header, and main content area. The sidebar should collapse to a bottom nav or hamburger on mobile.
- If the user says "card grid," use `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` as the starting point.
- If the user says "responsive table," offer both a horizontal scroll wrapper and a card-based stacking approach, and let the user choose.

---

## Examples

### 1. Responsive Dashboard Layout with CSS Grid

A sidebar that collapses on mobile, built entirely with CSS Grid and no JavaScript.

```html
<div class="dashboard">
  <header class="dashboard__header">Header / Toolbar</header>
  <nav class="dashboard__sidebar">
    <ul>
      <li><a href="#">Dashboard</a></li>
      <li><a href="#">Analytics</a></li>
      <li><a href="#">Settings</a></li>
    </ul>
  </nav>
  <main class="dashboard__main">
    <h1>Welcome back</h1>
    <div class="card-grid">
      <div class="card">Metric A</div>
      <div class="card">Metric B</div>
      <div class="card">Metric C</div>
      <div class="card">Metric D</div>
    </div>
  </main>
</div>
```

```css
/* ---- Mobile-first base (single column stack) ---- */
.dashboard {
  display: grid;
  grid-template-areas:
    "header"
    "main"
    "sidebar";
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
}

.dashboard__header  { grid-area: header; }
.dashboard__sidebar { grid-area: sidebar; }
.dashboard__main    { grid-area: main; padding: 1rem; }

/* Sidebar is a bottom nav on mobile */
.dashboard__sidebar ul {
  display: flex;
  justify-content: space-around;
  list-style: none;
  padding: 0.5rem 0;
  margin: 0;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

/* ---- Tablet and up: sidebar on the left ---- */
@media (min-width: 768px) {
  .dashboard {
    grid-template-areas:
      "sidebar header"
      "sidebar main";
    grid-template-columns: 240px 1fr;
    grid-template-rows: auto 1fr;
  }

  .dashboard__sidebar ul {
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.25rem;
    padding: 1rem;
    border-top: none;
    border-inline-end: 1px solid var(--color-border, #e2e8f0);
  }

  .dashboard__sidebar {
    min-height: 100dvh;
  }
}

/* ---- Card grid inside main content ---- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.card {
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
}
```

**Key decisions:**
- Mobile: sidebar becomes a bottom navigation bar (common mobile pattern).
- Tablet+: sidebar sits on the left with a fixed 240px width.
- Card grid uses `auto-fill` + `minmax()` so columns adjust automatically.
- No JavaScript needed for the layout shift.

### 2. Fluid Typography Using `clamp()`

A complete fluid type scale that smoothly transitions between 320px and 1536px viewports.

```css
:root {
  /* ---- Fluid Type Scale ---- */
  /* Each step uses clamp(min, preferred, max)                        */
  /* preferred is calculated so the value equals min at 320px         */
  /* and max at 1536px, scaling linearly between them.                */

  --text-xs:   clamp(0.75rem,  0.72rem + 0.16vw,  0.875rem);  /* 12px → 14px  */
  --text-sm:   clamp(0.875rem, 0.84rem + 0.16vw,  1rem);      /* 14px → 16px  */
  --text-base: clamp(1rem,     0.97rem + 0.16vw,  1.125rem);  /* 16px → 18px  */
  --text-lg:   clamp(1.125rem, 1.06rem + 0.33vw,  1.375rem);  /* 18px → 22px  */
  --text-xl:   clamp(1.25rem,  1.12rem + 0.66vw,  1.75rem);   /* 20px → 28px  */
  --text-2xl:  clamp(1.5rem,   1.30rem + 0.99vw,  2.25rem);   /* 24px → 36px  */
  --text-3xl:  clamp(1.875rem, 1.58rem + 1.48vw,  3rem);      /* 30px → 48px  */
  --text-4xl:  clamp(2.25rem,  1.79rem + 2.30vw,  4rem);      /* 36px → 64px  */

  /* ---- Fluid Spacing Scale ---- */
  --space-xs:  clamp(0.25rem,  0.18rem + 0.33vw,  0.5rem);
  --space-sm:  clamp(0.5rem,   0.37rem + 0.66vw,  1rem);
  --space-md:  clamp(1rem,     0.80rem + 0.99vw,  1.75rem);
  --space-lg:  clamp(1.5rem,   1.24rem + 1.32vw,  2.5rem);
  --space-xl:  clamp(2rem,     1.47rem + 2.63vw,  4rem);
}

/* Usage */
h1 { font-size: var(--text-4xl); }
h2 { font-size: var(--text-3xl); }
h3 { font-size: var(--text-2xl); }
h4 { font-size: var(--text-xl); }
p  { font-size: var(--text-base); }

.section {
  padding-block: var(--space-lg);
  padding-inline: var(--space-md);
}
```

**Key decisions:**
- All values use `rem` for min/max so they respect user font-size preferences.
- The `preferred` value blends a `rem` base with a `vw` growth factor.
- Spacing uses the same fluid approach for visual consistency.
- No media queries needed — everything scales smoothly.

### 3. Container Query Component

A card that switches from vertical to horizontal layout based on its **container's** width, not the viewport.

```html
<div class="card-container">
  <article class="product-card">
    <img class="product-card__image" src="/img/product.webp"
         alt="Product photo" width="400" height="300" />
    <div class="product-card__body">
      <h3 class="product-card__title">Wireless Headphones</h3>
      <p class="product-card__description">
        Premium noise-cancelling headphones with 30-hour battery life.
      </p>
      <span class="product-card__price">$299</span>
      <button class="product-card__cta">Add to Cart</button>
    </div>
  </article>
</div>
```

```css
/* ---- Define the container ---- */
.card-container {
  container-type: inline-size;
  container-name: product;
}

/* ---- Base: vertical card (narrow container) ---- */
.product-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--color-surface, #ffffff);
}

.product-card__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.product-card__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.product-card__title {
  font-size: var(--text-lg, 1.125rem);
  margin: 0;
}

.product-card__price {
  font-size: var(--text-xl, 1.25rem);
  font-weight: 700;
}

/* ---- Wide container: horizontal card ---- */
@container product (min-width: 480px) {
  .product-card {
    flex-direction: row;
  }

  .product-card__image {
    width: 40%;
    min-width: 200px;
    aspect-ratio: 1 / 1;
  }

  .product-card__body {
    padding: 1.5rem;
    justify-content: center;
  }

  .product-card__title {
    font-size: var(--text-xl, 1.25rem);
  }
}

/* ---- Extra-wide container: enhanced layout ---- */
@container product (min-width: 700px) {
  .product-card__body {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }

  .product-card__title {
    width: 100%;
    font-size: var(--text-2xl, 1.5rem);
  }

  .product-card__price {
    margin-inline-end: auto;
  }
}
```

**Key decisions:**
- The same `<article>` component works in a narrow sidebar, a medium grid cell, or a wide feature area.
- `container-type: inline-size` on the wrapper makes it a size container for width queries.
- Three layout modes (vertical, horizontal, enhanced horizontal) driven entirely by container width.
- No viewport media queries are used — the component is fully self-contained.

### 4. Responsive Image with `srcset` and `sizes`

A hero image that serves the correct resolution for every device and screen density.

```html
<!-- Art direction: different crops for mobile vs desktop -->
<picture>
  <!-- Mobile: tightly cropped portrait version -->
  <source
    media="(max-width: 639px)"
    srcset="
      /img/hero-mobile-400w.avif   400w,
      /img/hero-mobile-800w.avif   800w
    "
    sizes="100vw"
    type="image/avif"
  />
  <source
    media="(max-width: 639px)"
    srcset="
      /img/hero-mobile-400w.webp   400w,
      /img/hero-mobile-800w.webp   800w
    "
    sizes="100vw"
    type="image/webp"
  />

  <!-- Desktop: wide landscape version -->
  <source
    srcset="
      /img/hero-desktop-800w.avif   800w,
      /img/hero-desktop-1200w.avif 1200w,
      /img/hero-desktop-1800w.avif 1800w,
      /img/hero-desktop-2400w.avif 2400w
    "
    sizes="100vw"
    type="image/avif"
  />
  <source
    srcset="
      /img/hero-desktop-800w.webp   800w,
      /img/hero-desktop-1200w.webp 1200w,
      /img/hero-desktop-1800w.webp 1800w,
      /img/hero-desktop-2400w.webp 2400w
    "
    sizes="100vw"
    type="image/webp"
  />

  <!-- Fallback -->
  <img
    src="/img/hero-desktop-1200w.jpg"
    srcset="
      /img/hero-desktop-800w.jpg   800w,
      /img/hero-desktop-1200w.jpg 1200w,
      /img/hero-desktop-1800w.jpg 1800w
    "
    sizes="100vw"
    alt="Mountain landscape at sunrise with golden light on the peaks"
    width="1800"
    height="900"
    loading="eager"
    fetchpriority="high"
    decoding="async"
    style="width: 100%; height: auto; aspect-ratio: 2 / 1; object-fit: cover;"
  />
</picture>
```

```css
/* Responsive image utility classes */

/* Full-bleed hero */
.img-hero {
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 1;
  object-fit: cover;
}

/* Constrained within a content column */
.img-content {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

/* Thumbnail in a grid */
.img-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 0.375rem;
}
```

**Key decisions:**
- Art direction with `<picture>`: mobile gets a portrait crop, desktop gets a landscape crop.
- Format negotiation: AVIF first, WebP fallback, JPEG last resort.
- `loading="eager"` and `fetchpriority="high"` on the hero because it is above the fold.
- Explicit `width` and `height` attributes prevent layout shift (CLS).
- `sizes="100vw"` tells the browser the image spans the full viewport width.
- For images in a constrained column, `sizes` would be something like `(min-width: 1024px) 66vw, 100vw`.

### 5. Responsive Data Table (Card Stacking on Mobile)

Tables are inherently wide. On mobile, horizontal scrolling is a poor experience. This pattern transforms table rows into stacked cards on narrow screens.

```html
<div class="table-responsive">
  <table class="data-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Name">Jane Smith</td>
        <td data-label="Email">jane@example.com</td>
        <td data-label="Role">Designer</td>
        <td data-label="Status"><span class="badge badge--active">Active</span></td>
      </tr>
      <tr>
        <td data-label="Name">Alex Johnson</td>
        <td data-label="Email">alex@example.com</td>
        <td data-label="Role">Developer</td>
        <td data-label="Status"><span class="badge badge--inactive">Inactive</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

```css
/* ---- Base: standard table for wide screens ---- */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: start;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.data-table th {
  font-weight: 600;
  color: var(--color-text-muted, #6b7280);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ---- Mobile: stack rows as cards ---- */
@media (max-width: 639px) {
  .data-table thead {
    /* Visually hide the header row, keep accessible */
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    border: 0;
  }

  .data-table tr {
    display: block;
    padding: 1rem;
    margin-bottom: 0.75rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--color-surface, #ffffff);
  }

  .data-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0;
    border-bottom: none;
  }

  .data-table td::before {
    content: attr(data-label);
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--color-text-muted, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-inline-end: 1rem;
  }

  .data-table td:first-child {
    font-weight: 600;
    font-size: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
    margin-bottom: 0.25rem;
  }

  /* Override the label for the name since it's the card "title" */
  .data-table td:first-child::before {
    display: none;
  }
}
```

**Key decisions:**
- On desktop, a standard table with sortable column headers.
- On mobile (below `sm` breakpoint), each row becomes a card. The `data-label` attributes render as inline labels so users know what each value means without the header row.
- The first cell (`Name`) becomes the card title, visually larger and without a label.
- This is one of the rare valid uses of `max-width` — it is a targeted override for a specific mobile treatment, not the base layout approach.

### 6. CSS Subgrid Alignment Example

Cards with aligned internal sections using subgrid:

```css
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  /* Each card spans 3 implicit row tracks */
  grid-auto-rows: auto;
  gap: 1.5rem;
}

.feature-card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.75rem;
}

/* Row 1: icon + title */
.feature-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 1.125rem;
}

/* Row 2: description (stretches to fill available space) */
.feature-card__body {
  color: var(--color-text-muted, #6b7280);
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Row 3: CTA — aligned across all cards */
.feature-card__footer {
  align-self: end;
}
```

**Key decisions:**
- `grid-row: span 3` reserves three row tracks per card.
- `grid-template-rows: subgrid` inherits sizing from the parent, so all cards' headers, descriptions, and footers align across the row.
- No JavaScript needed — pure CSS alignment.

---

## Common Mistakes

### 1. Using `max-width` (Desktop-First) Breakpoints
**Wrong:** Writing the desktop layout first and using `max-width` queries to override for mobile. This produces more CSS, more overrides, and a heavier baseline for the most constrained devices.

**Fix:** Start with no media query (mobile), add `min-width` queries for progressively wider screens.

### 2. Breakpoints Based on Specific Devices
**Wrong:** `@media (min-width: 375px)` because "that's the iPhone width." Device dimensions change yearly. You end up with dozens of fragile breakpoints.

**Fix:** Let content dictate breakpoints. Resize the browser and add a breakpoint where the layout actually breaks. Use the standardized token scale for consistency.

### 3. Fixed-Width Containers
**Wrong:** `.container { width: 1200px; }` — this creates horizontal scroll on anything smaller than 1200px.

**Fix:** `.container { width: 100%; max-width: 1200px; margin-inline: auto; padding-inline: 1rem; }`.

### 4. Using Only Viewport Units for Font Size
**Wrong:** `font-size: 3vw;` — at 320px this is 9.6px (unreadably small), and at 2560px this is 76.8px (absurdly large). It also ignores the user's font-size preference entirely.

**Fix:** Use `clamp()` with `rem` boundaries: `font-size: clamp(1rem, 0.5rem + 2vw, 3rem);`.

### 5. Forgetting the Viewport Meta Tag
**Wrong:** Omitting `<meta name="viewport" content="width=device-width, initial-scale=1">`. Mobile browsers default to a ~980px virtual viewport and zoom out, making all your responsive CSS useless.

**Fix:** Always include the viewport meta tag in the `<head>`.

### 6. Images Without `srcset` and `sizes`
**Wrong:** A single `<img src="hero-2400w.jpg">` served to all devices. A phone on a cellular connection downloads a 2MB image and displays it at 400px wide.

**Fix:** Provide multiple resolutions with `srcset` and tell the browser how wide the image will render with `sizes`.

### 7. Using Media Queries Inside Reusable Components
**Wrong:** A `<Card>` component with `@media (min-width: 768px)` baked in. The card always switches to horizontal layout at 768px viewport width, even when placed in a 300px sidebar.

**Fix:** Use `@container` queries so the component responds to its container width, not the viewport.

### 8. Not Testing at Arbitrary Widths
**Wrong:** Testing only at iPhone 14 (393px) and MacBook (1440px). The layout breaks at 500px, 900px, or any width you did not check.

**Fix:** Slowly drag the browser width from 320px to 1600px and watch for anything that overflows, collapses, or overlaps. Test at arbitrary widths, not just device presets.

### 9. Hiding Content with `display: none` on Mobile
**Wrong:** Placing important content or navigation behind `display: none` on small screens without providing an alternative access path.

**Fix:** Reorganize the layout so content is accessible in a mobile-appropriate format (collapsed accordion, tabbed interface, off-canvas drawer). Only hide truly non-essential decorative elements.

### 10. Ignoring Landscape Orientation
**Wrong:** Assuming mobile is always portrait. A phone in landscape mode has a very wide, very short viewport — layouts that rely on vertical space can break dramatically.

**Fix:** Test both orientations. Use `min-height` queries or `dvh` units when vertical space matters (e.g., fullscreen heroes, sticky headers).

### 11. Using `100vh` on Mobile
**Wrong:** Setting a hero section to `height: 100vh` and testing only on desktop. On iOS Safari and most mobile browsers, `100vh` includes the area behind the collapsible address bar. The bottom of the hero is hidden until the user scrolls and the bar collapses, then the layout jumps.

**Fix:** Use `100dvh` (dynamic viewport height) which adapts as the mobile browser chrome collapses. Include a fallback for older browsers:
```css
.hero {
  min-height: 100vh; /* fallback */
  min-height: 100dvh; /* modern browsers */
}
```

### 12. Not Using `gap` for Sibling Spacing
**Wrong:** Using `margin-bottom` on every child in a flex or grid container, then removing the margin from the last child with `:last-child { margin-bottom: 0 }`. This breaks when items reorder, wrap, or are conditionally rendered.

**Fix:** Use `gap` on the flex or grid parent. It applies spacing only *between* children, never on the outside edges. No last-child overrides needed.
```css
/* Right — gap on the parent */
.stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

---

> **See also:** [Mobile-First](../Mobile-First/mobile-first.md) | [Design-Systems](../Design-Systems/design-systems.md) | [Typography-Color](../Typography-Color/typography-color.md) | [Accessibility](../Accessibility/accessibility.md) | [Animation-Motion](../Animation-Motion/animation-motion.md)
>
> **Last reviewed:** 2026-02
