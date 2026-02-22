# Animation & Motion

> CSS transitions, micro-interactions, page transitions, and motion design principles. Animation is a functional design tool: it communicates state changes, guides attention, and reinforces spatial models. Used well, it makes interfaces feel responsive and alive. Used poorly, it makes them feel slow and distracting.

---

## Principles

### 1. Purpose of Animation

Every animation must serve at least one of three purposes:

1. **Feedback.** Confirm that the system received the user's input. A button press, a toggle switch, a form submission -- animation closes the gap between action and acknowledgment.
2. **Orientation.** Show the user where they are and where things came from. A sidebar sliding in from the left tells the user it lives on the left. A modal scaling up from a button tells the user the button triggered it.
3. **Delight.** Subtle polish that makes the interface feel crafted and alive -- a gentle bounce on a dropdown, a smooth gradient shift on hover. Delight must be restrained. If the user notices the animation more than the content, it has failed.

**Never animate for decoration alone.** If removing the animation would not reduce clarity, remove it.

### 2. Duration Guidelines

| Category | Duration | Examples |
|---|---|---|
| **Micro-interactions** | 100--200ms | Button hover/active, toggle switch, checkbox, tooltip appearance |
| **Transitions** | 200--500ms | Modal open/close, dropdown expand, tab switch, card flip |
| **Complex animations** | 500ms--1s | Page transitions, onboarding sequences, data visualization reveals |
| **Never** | >1s | Avoid for any interaction-blocking animation. If it takes more than 1 second, the user is waiting, not watching. |

Shorter is almost always better. Users perceive delays above 100ms. Delays above 400ms feel sluggish for direct-manipulation interactions. Test animations at 1.5x speed -- if they still look good, the original was probably too slow.

### 3. Easing Functions

Easing determines how an animation accelerates and decelerates. The right easing makes movement feel natural; the wrong easing makes it feel mechanical or jarring.

| Easing | CSS value | Use for |
|---|---|---|
| **Ease-out** (decelerate) | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Entrances. Elements arriving on screen should start fast and slow down, as if decelerating into position. |
| **Ease-in** (accelerate) | `cubic-bezier(0.4, 0.0, 1, 1)` | Exits. Elements leaving the screen should start slow and speed up, as if accelerating away. |
| **Ease-in-out** | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Movement within the viewport. Elements moving from one position to another should accelerate, then decelerate. |
| **Linear** | `linear` | Opacity fades, progress bars, color transitions -- properties where acceleration would look unnatural. |

Avoid the CSS default `ease` (`cubic-bezier(0.25, 0.1, 0.25, 1)`) for most UI work. It is not wrong, but custom curves feel more intentional. Define your easing values as CSS custom properties or design tokens for consistency.

### 4. CSS Transitions vs CSS Animations vs JavaScript

**CSS transitions** are the default choice. They animate between two states triggered by a class change, pseudo-class (`:hover`), or property change. They are declared in CSS, GPU-friendly, and simple.

```css
.card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

**CSS `@keyframes` animations** handle multi-step sequences, looping, and animations that play on mount. Use them for loading spinners, skeleton screen pulses, entrance animations, and anything with more than two states.

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.card-enter {
  animation: fade-in-up 300ms ease-out both;
}
```

**JavaScript animations** (Web Animations API or libraries like Framer Motion) are needed when:
- Animations depend on dynamic values (scroll position, drag distance, data changes).
- You need to orchestrate sequences, stagger children, or animate layout changes.
- You want spring physics or gesture-driven animations.
- You need to animate elements being added to or removed from the DOM (exit animations).

**Rule of thumb:** Start with CSS transitions. Upgrade to `@keyframes` if you need multi-step or auto-playing animations. Upgrade to JavaScript only when CSS cannot express the behavior.

### 5. Micro-Interactions

Micro-interactions are small, contained animations triggered by direct user input. They are the most important category of animation because they affect perceived responsiveness.

**Button hover/active:**
- Hover: subtle background color shift or elevation change (100--150ms).
- Active (pressed): scale down slightly (`scale(0.97)`) or darken the background (50--100ms).
- The active state must be faster than the hover state to feel snappy.

**Toggle switch:**
- The knob slides from one side to the other (200ms ease-in-out).
- The track color transitions simultaneously.
- Avoid bouncing -- toggles represent a binary choice and should feel decisive.

**Form validation feedback:**
- Valid: green checkmark fades in next to the field (150ms).
- Invalid: the error message slides down and the field border turns red (200ms). A subtle shake animation (2--3px horizontal oscillation, 300ms) can reinforce the error without being obnoxious.

### 6. Page/Route Transitions

Page transitions maintain spatial continuity when navigating between routes. Without them, the abrupt replacement of content can feel jarring.

**Crossfade:** The outgoing page fades out while the incoming page fades in. Simple and universally appropriate. Duration: 200--300ms.

**Slide:** The incoming page slides in from a direction that matches the navigation metaphor (forward = slide left, back = slide right). Good for sequential flows (onboarding, wizard steps). Duration: 300--400ms.

**Shared element transitions:** An element (card, image, avatar) that appears on both the source and destination pages smoothly morphs between its two positions. This is the most powerful spatial transition. The **View Transitions API** makes this achievable in modern browsers with minimal code.

### 7. Reduced Motion

Some users experience motion sickness, vestibular disorders, or simply prefer less visual movement. The `prefers-reduced-motion` media query lets you respect this preference.

**Mandatory rule:** Every animation in your application must be wrapped in a reduced-motion check or must degrade gracefully.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This is a nuclear option. For more nuance, selectively disable motion-heavy animations while keeping opacity fades, which are generally well-tolerated.

In JavaScript, check `window.matchMedia("(prefers-reduced-motion: reduce)").matches` before triggering animations. Framer Motion supports this natively with `useReducedMotion()`.

### 8. Performance

The browser can animate four properties on the GPU compositor thread without triggering layout or paint: **`transform`**, **`opacity`**, **`filter`**, and **`clip-path`**. Everything else -- `width`, `height`, `top`, `left`, `margin`, `padding`, `border`, `background-color` -- triggers layout or paint and runs on the main thread.

**Rules:**
1. Animate `transform` and `opacity` whenever possible. Use `transform: translateX()` instead of `left`. Use `transform: scale()` instead of `width`.
2. Use `will-change: transform` sparingly -- only on elements about to animate, and remove it after. Overuse wastes GPU memory.
3. Avoid animating `box-shadow` directly. Instead, animate the `opacity` of a pseudo-element that already has the target `box-shadow`.
4. Test animation performance on low-end devices. A 60fps animation on a MacBook Pro may be 15fps on a budget Android phone.
5. For lists of animating items, use `contain: layout style paint` to isolate each item's rendering.

### 9. Spring Physics

Linear and cubic-bezier easing feels mechanical. Spring physics produce natural-feeling motion by simulating mass, tension, and friction.

**Framer Motion spring config:**

```tsx
<motion.div
  animate={{ x: 0 }}
  transition={{
    type: "spring",
    stiffness: 300,  // Higher = faster, snappier
    damping: 24,     // Higher = less oscillation
    mass: 1,         // Higher = heavier, slower
  }}
/>
```

**Common presets:**

| Preset | Stiffness | Damping | Feel |
|---|---|---|---|
| Snappy | 300 | 24 | Quick, decisive, minimal overshoot |
| Gentle | 120 | 14 | Soft, slower, slight overshoot |
| Bouncy | 400 | 10 | Energetic, playful, visible bounce |
| Stiff | 600 | 30 | Very fast, minimal overshoot |

Use "snappy" for most UI interactions. Reserve "bouncy" for playful interfaces or celebratory moments. Use "stiff" when the animation should feel like a direct response to the user's finger.

### 10. Scroll-Driven Animations

CSS now supports scroll-driven animations natively via `animation-timeline`, eliminating the need for JavaScript `IntersectionObserver` or scroll event handlers for many common patterns.

**Two timeline types:**

- **`scroll()`** — Progress-based. The animation advances as the user scrolls a container. At scroll position 0%, the animation is at its start; at 100% scroll, the animation is at its end. Use for progress indicators, parallax, and scroll-linked reveals.

- **`view()`** — Visibility-based. The animation is driven by an element's intersection with its scrollport (the viewport or scroll container). When the element enters the viewport, the animation starts; as it crosses the viewport, it progresses; when it exits, it completes. Use for scroll-triggered fade-ins, scale-ups, and slide-ins.

```css
/* Progress bar that fills as the user scrolls the page */
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--color-primary);
  transform-origin: left;
  animation: grow-width linear;
  animation-timeline: scroll();
}

@keyframes grow-width {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* Element fades in as it enters the viewport */
.scroll-reveal {
  animation: fade-in-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**`animation-range`** controls which portion of the scroll/view timeline maps to the animation. `entry 0%` means the element's leading edge touches the viewport bottom. `entry 100%` means the element is fully inside the viewport. This lets you fine-tune when the animation starts and ends.

**Browser support:** Scroll-driven animations are supported in Chrome 115+, Edge 115+, and Firefox 132+. Safari support is behind a flag as of early 2026. Use progressive enhancement — the content is visible without the animation; the animation is an enhancement.

### 11. CSS `@starting-style` for `display: none` Animations

Historically, CSS could not animate elements transitioning from `display: none` to `display: block` because there is no "before" state to transition from. The `@starting-style` rule solves this by defining the initial style for an element's entry animation.

```css
/* Dialog that fades and scales in when shown */
dialog {
  opacity: 1;
  transform: scale(1);
  transition: opacity 200ms ease-out, transform 200ms ease-out,
              display 200ms ease-out allow-discrete,
              overlay 200ms ease-out allow-discrete;

  /* Starting style: where the animation begins when dialog opens */
  @starting-style {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* Closing state — where the animation ends before display: none */
dialog:not([open]) {
  opacity: 0;
  transform: scale(0.95);
}

/* Backdrop */
dialog::backdrop {
  background: oklch(0 0 0 / 0.5);
  transition: background 200ms ease-out, display 200ms allow-discrete, overlay 200ms allow-discrete;

  @starting-style {
    background: oklch(0 0 0 / 0);
  }
}

dialog:not([open])::backdrop {
  background: oklch(0 0 0 / 0);
}
```

**Key details:**
- `@starting-style` defines the "from" state for an element appearing for the first time.
- `allow-discrete` on `transition` allows `display` and `overlay` to participate in the transition (new CSS feature — these are discrete properties that normally cannot transition).
- The `:not([open])` selector defines the "to" state for the closing animation.
- This replaces JavaScript-based dialog animations entirely — no `AnimatePresence`, no manual class toggling.

**Browser support:** Chrome 117+, Safari 17.5+, Firefox 131+.

---

## LLM Instructions

When an AI assistant is asked to implement animations or motion design, follow these directives:

### Choosing Appropriate Animation Timing

1. Classify the animation by category: micro-interaction (100--200ms), transition (200--500ms), or complex (500ms+).
2. Start with the shorter end of the range. Only increase duration if the animation feels abrupt when tested.
3. Use `ease-out` for elements entering the screen, `ease-in` for elements leaving, and `ease-in-out` for elements moving within the viewport.
4. Define timing values as CSS custom properties or constants so they are consistent across the codebase. Use `--duration-fast` (150ms), `--duration-normal` (250ms), `--duration-slow` (400ms) along with easing tokens like `--ease-out`, `--ease-in`, and `--ease-in-out`.
5. Never hardcode durations or easing values inline. Always reference the tokens.

### Implementing CSS Transitions

1. Declare transitions on the base state of the element, not on the `:hover` or `.active` state. This ensures the transition plays in both directions (enter and exit).
2. Transition specific properties, never use `transition: all`. `all` is unpredictable, transitions properties you did not intend, and can cause performance issues.
3. Combine multiple properties with a single `transition` shorthand, e.g. `transition: transform var(--duration-fast) var(--ease-out), opacity var(--duration-fast) var(--ease-out);`
4. For entrance animations (element appearing in the DOM), use CSS `@keyframes` with `animation-fill-mode: both`. For animating elements from `display: none`, use `@starting-style` (see Principle 11) combined with `transition-behavior: allow-discrete`.
5. Always test that the reverse transition (e.g., mouse-leave) also looks smooth and intentional.

### Building Micro-Interactions

1. Identify every interactive element: buttons, links, toggles, checkboxes, inputs, cards.
2. Define three states for each: **default**, **hover**, **active/pressed**.
3. Hover state: apply within 100--150ms. Subtle changes only (elevation, background tint, underline).
4. Active state: apply within 50--100ms. Must be faster than hover to feel responsive. Use `transform: scale(0.97)` or a darker background.
5. Focus state: always visible for keyboard navigation. Use `:focus-visible` to avoid showing focus rings on mouse clicks. Apply `outline: 2px solid var(--color-focus)` with `outline-offset: 2px`.
6. Do not animate the focus ring itself -- it should appear instantly for accessibility.

### Using Motion (formerly Framer Motion)

1. Use `motion` components as drop-in replacements for HTML elements: `<motion.div>`, `<motion.button>`, etc.
2. For entrance animations, use the `initial` and `animate` props: `<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} />`.
3. For exit animations, wrap the component in `<AnimatePresence>` and add the `exit` prop. Every child must have a unique `key`.
4. Use the `layout` prop for automatic layout animations when elements change position or size: `<motion.div layout />`.
5. Prefer `type: "spring"` with `stiffness: 300, damping: 24` as the default transition for natural-feeling motion.
6. Use `useReducedMotion()` to disable or simplify animations for users who prefer reduced motion.
7. Stagger children with `transition={{ staggerChildren: 0.05 }}` on the parent variant for list animations.

### Handling Reduced Motion Preferences

1. Include the global reduced-motion CSS reset in every project (shown in the Principles section).
2. In JavaScript/React, check the preference before triggering animations with `window.matchMedia("(prefers-reduced-motion: reduce)").matches`.
3. In Motion (formerly Framer Motion), use the `useReducedMotion()` hook and conditionally set `transition={{ duration: 0 }}`.
4. Do not disable all visual feedback for reduced-motion users. Opacity fades and color changes are generally safe. Disable transforms, position shifts, and scale changes.
5. Test the app with "Reduce motion" enabled in the OS accessibility settings.

### Optimizing Animation Performance

1. Only animate `transform` and `opacity` for guaranteed compositor-thread performance. `filter` and `clip-path` are compositor-friendly in most modern browsers but not guaranteed — prefer them over layout-triggering properties like `width`/`height`/`margin`, but verify in the Performance tab.
2. If you must animate `background-color`, use a pseudo-element with `opacity` instead. Create a `::after` with `position: absolute; inset: 0; background: var(--color-hover); opacity: 0; transition: opacity 150ms ease-out;` and set `opacity: 1` on hover.
3. Use `will-change: transform` only immediately before an animation starts. Remove it after. Never set `will-change` on page load for all elements.
4. For animated lists, apply `contain: layout style paint` to each item to isolate layout recalculations.
5. Use the browser Performance tab to verify 60fps. Fix any frames that take longer than 16ms.
6. On mobile, reduce animation complexity. Shorter durations, simpler easing, fewer simultaneous animations.

---

## Examples

### 1. Micro-Interaction Library (Button, Toggle, Card Hover) in CSS

```css
/* --- Design tokens --- */
:root {
  --duration-micro: 150ms;
  --duration-short: 200ms;
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);

  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-active: #1e40af;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-toggle-track: #cbd5e1;
  --color-toggle-active: #2563eb;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* --- Button --- */
.button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font: inherit;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  /* Transition on the base state, never on :hover */
  transition:
    background-color var(--duration-micro) var(--ease-out),
    transform var(--duration-micro) var(--ease-out),
    box-shadow var(--duration-micro) var(--ease-out);
}

.button:hover {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-sm);
}

.button:active {
  background: var(--color-primary-active);
  transform: scale(0.97);
  /* Active is faster -- override duration */
  transition-duration: 75ms;
}

.button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Ripple effect on click (CSS-only approximation) */
.button::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 10%, transparent 10.01%);
  background-repeat: no-repeat;
  background-position: center;
  transform: scale(10);
  opacity: 0;
  transition: transform 0.5s, opacity 0.8s;
}

.button:active::after {
  transform: scale(0);
  opacity: 1;
  transition: 0s;
}

/* --- Toggle switch --- */
.toggle {
  position: relative;
  display: inline-flex;
  width: 3rem;
  height: 1.75rem;
  cursor: pointer;
}

.toggle input {
  appearance: none;
  position: absolute;
  inset: 0;
  margin: 0;
  cursor: pointer;
  border-radius: 999px;
  background: var(--color-toggle-track);
  transition: background-color var(--duration-short) var(--ease-in-out);
}

.toggle input:checked {
  background: var(--color-toggle-active);
}

/* The knob */
.toggle input::before {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.375rem;
  height: 1.375rem;
  background: white;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-short) var(--ease-in-out);
}

.toggle input:checked::before {
  transform: translateX(1.25rem);
}

.toggle input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* --- Card hover --- */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--duration-short) var(--ease-out),
    box-shadow var(--duration-short) var(--ease-out);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

/* Keyboard focus for linked cards */
.card:focus-within {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* --- Reduced motion --- */
@media (prefers-reduced-motion: reduce) {
  .button,
  .toggle input,
  .toggle input::before,
  .card {
    transition-duration: 0.01ms !important;
  }

  .button:active {
    transform: none;
  }

  .card:hover {
    transform: none;
  }
}
```

**Why this works:**
- All transitions are declared on the base state and use design tokens for duration and easing.
- Active state has a shorter transition than hover for a snappier press feel.
- Focus-visible is styled for keyboard users without appearing on mouse click.
- Reduced motion media query disables transforms while preserving color changes.
- Card hover uses `transform: translateY` (GPU-composited) and `box-shadow` (triggers paint, but acceptable here since it only changes on hover, not during continuous animation).

---

### 2. Page Transition with View Transitions API

```html
<!-- page-transition.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>View Transitions Demo</title>
  <style>
    /* Default crossfade is built into the View Transitions API.
       Customize it with these pseudo-element selectors. */

    /* Outgoing page fades out */
    ::view-transition-old(root) {
      animation: fade-out 250ms ease-in forwards;
    }

    /* Incoming page fades in */
    ::view-transition-new(root) {
      animation: fade-in 250ms ease-out forwards;
    }

    @keyframes fade-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* Shared element transition for a hero image */
    .hero-image {
      view-transition-name: hero;
    }

    ::view-transition-group(hero) {
      animation-duration: 350ms;
      animation-timing-function: cubic-bezier(0.4, 0.0, 0.2, 1);
    }

    /* Reduced motion: instant swap */
    @media (prefers-reduced-motion: reduce) {
      ::view-transition-old(root),
      ::view-transition-new(root) {
        animation-duration: 0.01ms !important;
      }
      ::view-transition-group(hero) {
        animation-duration: 0.01ms !important;
      }
    }

    /* --- Page layout styles --- */
    body {
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 2rem;
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .card-grid a {
      text-decoration: none;
      color: inherit;
    }

    .card-grid img {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      border-radius: 0.5rem;
    }

    .detail-page img {
      width: 100%;
      max-width: 600px;
      border-radius: 0.75rem;
    }
  </style>
</head>
<body>
  <div id="app">
    <!-- Content rendered here by the router -->
  </div>

  <script>
    // Simple SPA router using View Transitions API
    const app = document.getElementById("app");

    const items = [
      { id: 1, title: "Mountain Lake", img: "https://picsum.photos/id/1015/400/300" },
      { id: 2, title: "Forest Path",   img: "https://picsum.photos/id/1018/400/300" },
      { id: 3, title: "Ocean Sunset",  img: "https://picsum.photos/id/1020/400/300" },
    ];

    function renderList() {
      app.innerHTML = `
        <h1>Gallery</h1>
        <div class="card-grid">
          ${items.map(item => `
            <a href="#/item/${item.id}" data-id="${item.id}">
              <img src="${item.img}" alt="${item.title}" style="view-transition-name: hero-${item.id}" />
              <p>${item.title}</p>
            </a>
          `).join("")}
        </div>
      `;
    }

    function renderDetail(id) {
      const item = items.find(i => i.id === id);
      if (!item) { renderList(); return; }
      app.innerHTML = `
        <a href="#/">&larr; Back to gallery</a>
        <div class="detail-page">
          <h1>${item.title}</h1>
          <img
            src="${item.img}"
            alt="${item.title}"
            class="hero-image"
            style="view-transition-name: hero-${item.id}"
          />
          <p>Detailed description of ${item.title}.</p>
        </div>
      `;
    }

    function navigate() {
      const hash = location.hash || "#/";
      const match = hash.match(/^#\/item\/(\d+)$/);

      const update = () => {
        if (match) {
          renderDetail(Number(match[1]));
        } else {
          renderList();
        }
      };

      // Use View Transitions API if supported
      if (document.startViewTransition) {
        document.startViewTransition(update);
      } else {
        update();
      }
    }

    window.addEventListener("hashchange", navigate);
    navigate();
  </script>
</body>
</html>
```

**Why this works:**
- `document.startViewTransition()` captures the old state, runs the DOM update, then crossfades to the new state automatically.
- `view-transition-name` on the image creates a shared element transition: the image smoothly morphs from its grid position to the detail page position.
- Custom `::view-transition-old` and `::view-transition-new` pseudo-elements allow full control over the crossfade animation.
- Reduced motion media query collapses all transition durations to near-zero.
- Progressive enhancement: if the browser does not support the API, the DOM updates instantly without a transition.

---

### 3. Framer Motion Animated List (Add/Remove Items)

```tsx
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type Item = { id: string; text: string };

export function AnimatedList() {
  const [items, setItems] = useState<Item[]>([
    { id: "1", text: "Review pull request" },
    { id: "2", text: "Update dependencies" },
    { id: "3", text: "Write release notes" },
  ]);
  const [input, setInput] = useState("");
  const shouldReduceMotion = useReducedMotion();

  function addItem() {
    if (!input.trim()) return;
    const newItem: Item = { id: crypto.randomUUID(), text: input.trim() };
    setItems((prev) => [...prev, newItem]);
    setInput("");
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  // Motion variants -- disabled for reduced motion users
  const listVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 },
    },
  };

  const itemVariants = shouldReduceMotion
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 20, scale: 0.95 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
          },
        },
        exit: {
          opacity: 0,
          x: -20,
          scale: 0.95,
          transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
        },
      };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem" }}>
      <h2>Task List</h2>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
        style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task..."
          aria-label="New task"
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            border: "1px solid #e2e8f0",
            borderRadius: "0.375rem",
            fontSize: "1rem",
          }}
        />
        <motion.button
          type="submit"
          whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
          style={{
            padding: "0.5rem 1rem",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          Add
        </motion.button>
      </form>

      {/* Animated list */}
      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="visible"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout={!shouldReduceMotion}
              variants={itemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                marginBottom: "0.5rem",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
              }}
            >
              <span>{item.text}</span>
              <motion.button
                onClick={() => removeItem(item.id)}
                whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                aria-label={`Remove ${item.text}`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  color: "#94a3b8",
                  padding: "0.25rem",
                }}
              >
                &times;
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {/* Empty state */}
      <AnimatePresence>
        {items.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: "center", color: "#94a3b8", marginTop: "2rem" }}
          >
            No tasks yet. Add one above.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Why this works:**
- `AnimatePresence` with `mode="popLayout"` enables smooth exit animations and automatic layout shifts when items are removed.
- `layout` prop on each `motion.li` animates remaining items into their new positions when a sibling is removed.
- Spring physics (`stiffness: 300, damping: 24`) give the entrance a natural, snappy feel.
- Exit animation slides items left and fades them out (`ease-in` for exits, per the principles).
- `useReducedMotion()` checks the OS preference and disables transforms/springs for those users while keeping opacity fades.
- Staggered entrance (`staggerChildren: 0.05`) adds polish when the list first renders.
- Empty state is itself animated with a fade for a cohesive experience.

---

### 4. Reduced Motion Implementation (prefers-reduced-motion)

```css
/* ============================================================
   reduced-motion.css
   Global reduced-motion stylesheet.
   Import this in your app's entry CSS file.
   ============================================================ */

/* --- Approach 1: Global nuclear reset ---
   Removes all transitions and animations for users who
   prefer reduced motion. Simple, broad, safe. */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* --- Approach 2: Selective overrides ---
   More nuanced. Keeps opacity fades (generally safe)
   but removes transforms and position changes. */

@media (prefers-reduced-motion: reduce) {
  /* Keep opacity transitions but make them faster */
  .fade-transition {
    transition-property: opacity !important;
    transition-duration: 100ms !important;
  }

  /* Remove all transform-based animations */
  .slide-in,
  .slide-out,
  .scale-enter,
  .scale-exit,
  .card:hover,
  .button:active {
    transform: none !important;
    transition-property: opacity, background-color !important;
  }

  /* Replace animated loading spinner with a static indicator */
  .spinner {
    animation: none !important;
    /* Show a pulsing opacity instead */
    opacity: 0.6;
  }

  /* Disable parallax and scroll-linked animations */
  .parallax-layer {
    transform: none !important;
  }

  /* Disable auto-playing video backgrounds */
  .video-bg video {
    display: none;
  }
  .video-bg .static-fallback {
    display: block;
  }

  /* Collapse carousel auto-rotation */
  .carousel {
    animation: none !important;
  }
}
```

```tsx
// useReducedMotion.ts
// Custom React hook for checking reduced motion preference

import { useState, useEffect } from "react";

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    // SSR-safe: default to false on the server
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Sync on mount in case SSR default (false) differs from client
    setPrefersReduced(mql.matches);

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReduced(event.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return prefersReduced;
}
```

```tsx
// Example usage in a component

import { useReducedMotion } from "./useReducedMotion";

function AnimatedCard({ title, children }: { title: string; children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();

  const style: React.CSSProperties = prefersReduced
    ? {
        // No transform, just a subtle opacity change on hover via CSS
        transition: "opacity 100ms ease-out",
      }
    : {
        transition: "transform 200ms cubic-bezier(0, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0, 0, 0.2, 1)",
      };

  return (
    <div className="card" style={style}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

// Motion (formerly Framer Motion) integration
import { AnimatePresence, motion, useReducedMotion as useFramerReducedMotion } from "motion/react";

function AnimatedModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const shouldReduce = useFramerReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop -- opacity fade is safe for reduced motion */}
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal -- conditional animation */}
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={
              shouldReduce
                ? { duration: 0.1 }
                : { type: "spring", stiffness: 300, damping: 24 }
            }
          >
            <button onClick={onClose} aria-label="Close">
              &times;
            </button>
            <h2>Modal Title</h2>
            <p>Modal content here.</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Why this works:**
- Two CSS strategies are provided: a global nuclear reset for simplicity and a selective approach for nuance.
- The custom `useReducedMotion` React hook listens to real-time changes (the user can toggle the OS setting while the app is running).
- SSR-safe: defaults to `false` on the server to avoid hydration mismatches.
- The Framer Motion example conditionally simplifies animations to opacity-only fades, which are well-tolerated by users with vestibular disorders.
- The modal retains its opacity entrance/exit even in reduced motion mode, so the user still sees the state change -- just without spatial movement.

### 5. Scroll-Driven Fade-In (CSS-Only, No JavaScript)

A complete scroll-reveal animation using `animation-timeline: view()` — no Intersection Observer, no JavaScript.

```html
<section class="features">
  <div class="feature-card scroll-reveal">
    <h3>Lightning fast</h3>
    <p>Built for speed from the ground up.</p>
  </div>
  <div class="feature-card scroll-reveal">
    <h3>Beautifully simple</h3>
    <p>Powerful features, zero complexity.</p>
  </div>
  <div class="feature-card scroll-reveal">
    <h3>Always secure</h3>
    <p>Enterprise-grade security by default.</p>
  </div>
</section>
```

```css
/* ---- Scroll-driven reveal animation ---- */

.scroll-reveal {
  /* Animation drives from transparent+shifted to visible+in-place */
  animation: scroll-fade-in linear both;

  /* Driven by the element's visibility in the scrollport */
  animation-timeline: view();

  /* Start when the element's top edge enters the viewport (entry 0%)
     Complete when the element is 40% inside the viewport (entry 40%) */
  animation-range: entry 0% entry 40%;
}

@keyframes scroll-fade-in {
  from {
    opacity: 0;
    transform: translateY(3rem) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Stagger siblings for a cascading effect */
.scroll-reveal:nth-child(2) {
  animation-range: entry 5% entry 45%;
}
.scroll-reveal:nth-child(3) {
  animation-range: entry 10% entry 50%;
}

/* ---- Reduced motion: disable scroll animations ---- */
@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

/* ---- Fallback for unsupported browsers ---- */
@supports not (animation-timeline: view()) {
  .scroll-reveal {
    /* Content is visible without animation */
    opacity: 1;
    transform: none;
    animation: none;
  }
}

/* ---- Supporting layout ---- */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 4rem 1rem;
}

.feature-card {
  padding: 2rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.75rem;
  background: var(--color-surface, #ffffff);
}
```

**Why this works:**
- Pure CSS — no JavaScript, no Intersection Observer, no scroll event listeners.
- `animation-timeline: view()` links the animation progress to the element's visibility in the viewport.
- `animation-range: entry 0% entry 40%` means the animation completes by the time the element is 40% visible, so it feels responsive without requiring the user to scroll the element fully into view.
- Staggered `animation-range` on siblings creates a natural cascade effect.
- `prefers-reduced-motion` disables the animation entirely for users who prefer no motion.
- `@supports` fallback ensures content is visible in browsers that do not support scroll-driven animations.
- Content is always accessible — the animation is a progressive enhancement.

---

### 6. `@starting-style` Dialog Animation (CSS-Only)

Animate a `<dialog>` element opening and closing without any JavaScript animation library.

```html
<dialog id="demo-dialog">
  <h2>Confirm action</h2>
  <p>This can't be undone. Are you sure?</p>
  <form method="dialog">
    <button value="cancel" class="btn-secondary">Cancel</button>
    <button value="confirm" class="btn-primary">Confirm</button>
  </form>
</dialog>

<button onclick="document.getElementById('demo-dialog').showModal()">
  Open dialog
</button>
```

```css
/* ---- Dialog enter/exit animation via @starting-style ---- */

dialog {
  border: none;
  border-radius: 12px;
  padding: 2rem;
  max-width: 420px;
  width: 90vw;
  box-shadow: 0 20px 60px oklch(0 0 0 / 0.2);

  /* Open state */
  opacity: 1;
  transform: translateY(0) scale(1);

  /* Transition for closing */
  transition:
    opacity 200ms ease-in,
    transform 200ms ease-in,
    display 200ms allow-discrete,
    overlay 200ms allow-discrete;

  /* Entry animation: starting point when dialog opens */
  @starting-style {
    opacity: 0;
    transform: translateY(1rem) scale(0.97);
  }
}

/* Closing state */
dialog:not([open]) {
  opacity: 0;
  transform: translateY(1rem) scale(0.97);
}

/* Backdrop */
dialog::backdrop {
  background: oklch(0 0 0 / 0.4);
  transition:
    background 200ms ease-out,
    display 200ms allow-discrete,
    overlay 200ms allow-discrete;

  @starting-style {
    background: oklch(0 0 0 / 0);
  }
}

dialog:not([open])::backdrop {
  background: oklch(0 0 0 / 0);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  dialog,
  dialog::backdrop {
    transition-duration: 0.01ms !important;
  }
}
```

**Why this works:**
- `@starting-style` provides the initial state for the opening animation — no JavaScript animation library needed.
- `allow-discrete` on `display` and `overlay` transitions lets the browser keep the dialog rendered during the exit animation before setting `display: none`.
- The closing animation is handled by the `:not([open])` selector and the transition declaration.
- Native `<dialog>` provides built-in focus trapping, Escape key dismissal, and backdrop click handling.
- Zero JavaScript for the animation — only a one-line `showModal()` call to open.

---

## Common Mistakes

| Mistake | Why it is a problem | Fix |
|---|---|---|
| Animating `width`, `height`, `top`, or `left` | These trigger layout recalculation on every frame, causing jank on the main thread. | Use `transform: translate()`, `scale()`, and `opacity` instead. These are GPU-composited. |
| Using `transition: all` | Transitions every property, including ones you did not intend (color, padding, font-size). Causes unexpected visual glitches and hurts performance. | Explicitly list the properties: `transition: transform 200ms ease-out, opacity 200ms ease-out;` |
| Animations longer than 400ms for direct interactions | The UI feels sluggish. Users perceive delays above 100ms. A 600ms button press animation makes the app feel broken. | Keep micro-interactions at 100--200ms. Only exceed 400ms for page-level transitions or complex orchestrated sequences. |
| No `prefers-reduced-motion` support | Users with vestibular disorders experience nausea, dizziness, or migraines from motion. This is an accessibility failure. | Add the global reduced-motion CSS reset and check the preference in JavaScript before triggering animations. |
| Bouncy spring animations everywhere | Overshoot and oscillation feel playful once but become irritating on the 50th interaction. They also slow down task completion. | Use springs with high damping (24+) for most UI. Reserve bouncy springs for rare celebratory moments. |
| Animating on mount with no exit animation | Elements pop in smoothly but disappear instantly, creating an asymmetric, unfinished feel. | Use `AnimatePresence` (Framer Motion) or CSS `@keyframes` with a corresponding exit class to animate both entrance and exit. |
| Setting `will-change` on every element | Each `will-change` element is promoted to its own GPU layer, consuming video memory. Too many layers cause the browser to thrash. | Only apply `will-change` immediately before an animation and remove it afterward. Or let the browser decide via `transform: translateZ(0)` only where needed. |
| Using `ease` (the CSS default) for everything | The default `ease` curve is a compromise that suits nothing perfectly. Entrances should decelerate; exits should accelerate. | Define explicit easing tokens: `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for movement. |
| Decorative animations that serve no purpose | A spinning logo, a bouncing icon, or a pulsing background that conveys no information. These distract and slow the page. | Every animation must provide feedback, orientation, or (restrained) delight. If you cannot name its purpose, remove it. |
| Page transitions that block interaction | A 500ms crossfade during which the user cannot click anything. The user perceives the app as slow even if the data loaded instantly. | Keep page transitions under 300ms. Never block pointer events during a transition. Use `pointer-events: none` only on the outgoing page. |
| Ignoring animation performance on mobile | A silky 60fps animation on a MacBook drops to 15fps on a budget Android phone. Users on slower devices are penalized most. | Test on real low-end hardware or throttle CPU in DevTools. Simplify or disable animations below a performance threshold. |
| Animating layout properties during scroll | Animations tied to scroll events that trigger layout (`offsetTop`, `getBoundingClientRect`) cause layout thrashing. | Use `IntersectionObserver` for scroll-triggered animations. Use `transform` for parallax. Avoid reading layout properties in scroll handlers. |

---

> **See also:** [Design-Systems](../Design-Systems/design-systems.md) | [Accessibility](../Accessibility/accessibility.md) | [Mobile-First](../Mobile-First/mobile-first.md) | [Typography-Color](../Typography-Color/typography-color.md) | [UX-Patterns](../UX-Patterns/ux-patterns.md)
>
> **Last reviewed:** 2026-02
