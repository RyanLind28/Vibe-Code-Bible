# Dark Mode

> Theme switching, color token systems, system preference detection, and building robust dark mode support.

---

## Principles

### 1. Why Dark Mode Matters

Dark mode is no longer a novelty -- it is an expectation. Users demand it, operating systems default to it, and ignoring it signals a lack of polish. Three forces drive its adoption:

1. **User preference.** A significant majority of users enable dark mode when given the option. Respecting this preference tells users you care about their experience.
2. **Battery life on OLED displays.** OLED and AMOLED screens turn off individual pixels to render true black. A well-implemented dark theme can reduce power consumption by 30-60% on these displays.
3. **Reduced eye strain in low-light environments.** Bright white screens in dark rooms cause discomfort. Dark themes lower overall luminance, reducing eye fatigue during nighttime or low-light use.

Dark mode is not a cosmetic feature. It is a functional and accessibility concern that affects usability, comfort, and device longevity.

### 2. System Preference Detection

Modern operating systems expose a user's theme preference to the browser via the `prefers-color-scheme` media query. Your application should detect and honor this preference automatically on first visit. If a user's OS is set to dark mode and your site loads in blinding white, you have already failed.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #121212;
    --color-text-primary: #e0e0e0;
  }
}
```

Detection must happen before paint. A page that loads light and then flickers to dark is worse than not supporting dark mode at all.

### 3. Three-Way Toggle: System, Light, Dark

System detection alone is not sufficient. Users must be able to override their OS preference on a per-application basis. The correct pattern is a three-way toggle:

- **System** -- follow the OS preference (default).
- **Light** -- force light theme regardless of OS.
- **Dark** -- force dark theme regardless of OS.

Do not provide only a light/dark toggle. A user who prefers light mode system-wide may want dark mode in your reading application at night, and vice versa. The three-way toggle gives full control while defaulting to the most sensible option.

### 4. Color Token Architecture

Dark mode is not "invert all the colors." Naive inversion produces an ugly, unreadable, inconsistent result. Instead, you must redesign your color system to work on dark backgrounds.

Build a two-layer token architecture:

- **Primitive tokens** define raw color values: `--blue-500: #3b82f6;`
- **Semantic tokens** define intent and resolve to different primitives per theme: `--color-bg-primary`, `--color-text-primary`, `--color-border-subtle`.

Components reference only semantic tokens. The theme layer swaps the resolution of those tokens. Components never need to know which theme is active.

### 5. Dark Mode Color Rules

Getting dark mode colors right requires understanding how human vision works differently against dark backgrounds:

1. **Reduce contrast slightly.** Pure white (`#ffffff`) on pure black (`#000000`) causes halation -- the text appears to vibrate or blur. Use off-white text (`#e0e0e0` to `#f0f0f0`) on dark gray backgrounds (`#121212` to `#1a1a1a`).
2. **Desaturate colors slightly.** Fully saturated colors that look fine on white backgrounds become overwhelming and harsh on dark backgrounds. Reduce saturation by 10-20% for dark mode variants.
3. **Elevate surfaces with lighter shades, not shadows.** In light mode, depth is conveyed by shadows. In dark mode, shadows are invisible against dark backgrounds. Instead, use progressively lighter surface colors to convey elevation. A card on a dark background should be slightly lighter than the background, not the same color with a shadow.
4. **Maintain accessible contrast ratios.** Even with reduced maximum contrast, all text must still meet WCAG AA minimums (4.5:1 for body text, 3:1 for large text) in both themes.

### 6. Semantic Tokens vs Primitive Tokens

The distinction between semantic and primitive tokens is the foundation of a maintainable theming system.

| Layer | Example Token | Purpose |
|-------|--------------|---------|
| Primitive | `--gray-900: #111827` | Raw color value, theme-agnostic |
| Semantic | `--color-bg-primary` | Intent-based, resolves per theme |
| Component | `--card-bg` | Component-specific, references semantic |

Components use semantic tokens. Semantic tokens resolve to primitives. Themes swap the resolution. This separation means adding a new theme (high contrast, sepia, AMOLED black) requires only a new mapping layer -- no component changes.

### 7. Images and Media in Dark Mode

Images and media require special handling in dark mode:

- **Photographs:** Apply a subtle brightness reduction (`filter: brightness(0.85)`) to prevent images from being blinding against dark backgrounds.
- **Transparent PNGs:** Logos and icons with transparency designed for light backgrounds may become invisible on dark backgrounds. Provide dark-mode variants or use CSS filters.
- **SVGs:** Use `currentColor` for SVG fills and strokes wherever possible so they automatically adapt to the surrounding text color in any theme.
- **Illustrations and diagrams:** Consider providing separate dark-mode variants with adjusted backgrounds and colors. The `<picture>` element with `media` attributes can swap sources based on theme.

### 8. Storing the User's Preference

When a user explicitly selects a theme, persist that choice. The storage mechanism matters:

- **`localStorage`:** Simple and effective for client-rendered applications. However, `localStorage` is not available during server-side rendering, which creates a flash-of-wrong-theme problem.
- **Cookies:** Available during SSR. The server can read the theme cookie and render the correct theme on the initial HTML response, eliminating flash. Cookies are the correct choice for SSR applications.
- **Both:** For maximum robustness, write to both. Use the cookie for SSR and `localStorage` as a fallback for static sites.

### 9. Avoiding Flash of Wrong Theme (FOUC Prevention)

The flash of unstyled content -- or more specifically, the flash of wrong theme -- is the most common dark mode implementation failure. The user sees a blinding white page for a fraction of a second before the dark theme applies. This happens when theme detection runs after the initial paint.

Prevention strategies:

1. **Blocking inline script in `<head>`.** Place a small synchronous `<script>` tag before any stylesheets that reads the stored preference and applies the correct class to `<html>` immediately. This blocks rendering (intentionally) for a few milliseconds to prevent the flash.
2. **Cookie-based SSR.** The server reads the theme cookie and injects the correct class into the `<html>` tag in the initial response. No client-side detection needed for the first paint.
3. **`color-scheme` meta tag.** The `<meta name="color-scheme" content="dark light">` tag tells the browser to use the appropriate UA stylesheet before your CSS even loads.

### 10. Testing Dark Mode

Dark mode is not "set it and forget it." Every component must be verified in both themes:

- **Visual regression testing:** Capture screenshots of every component and page in both light and dark themes. Compare against baselines.
- **Contrast ratio verification:** Run automated contrast checks (e.g., axe, Lighthouse) in both themes. Colors that pass in light mode may fail in dark mode.
- **Image and media audit:** Verify that all images, icons, and illustrations are visible and appropriate in both themes.
- **State coverage:** Check hover, focus, active, disabled, error, and success states in both themes. A focus ring visible on white may be invisible on dark gray.
- **Third-party embeds:** Maps, videos, iframes, and widgets may not respect your theme. Test and apply workarounds where possible.

### 11. AMOLED / True Black Theme

Some users prefer a "true black" theme (`#000000` background) for OLED and AMOLED screens, where black pixels are physically turned off, saving battery and producing infinite contrast.

**Tradeoffs:**
- **Pro:** Battery savings on OLED devices. Perceived "deeper" dark mode.
- **Con:** Halation — white text on pure black creates a glowing/smearing effect for users with astigmatism (~30-50% of the population). Readability decreases with pure black.
- **Con:** Adjacent UI elements lose definition. Without even subtle contrast between background and card surfaces, the layout feels flat and disorienting.

**Recommendation:** Offer true black as an *option*, not the default dark theme. The default dark theme should use near-black (e.g., `#0a0a0a`, `oklch(0.13 0.01 260)`) which avoids halation while still looking dark. The AMOLED option uses `#000000` for the body background and very dark grays for surfaces.

### 12. High Contrast Mode and `forced-colors`

Some users run their OS in a high contrast mode (Windows High Contrast Mode, macOS "Increase Contrast"). In this mode, the operating system overrides your CSS colors with a user-defined palette.

The `forced-colors` media query detects this:

```css
@media (forced-colors: active) {
  /* The OS is overriding colors. Custom colors are ignored.
     Use system color keywords instead. */
  .button {
    border: 2px solid ButtonText;
  }

  .focus-ring {
    outline: 2px solid Highlight;
  }

  /* Ensure custom icons/graphics remain visible */
  .icon {
    forced-color-adjust: auto; /* default — OS overrides */
  }

  /* Opt out for decorative elements that break in forced-colors */
  .decorative-gradient {
    forced-color-adjust: none;
  }
}
```

System color keywords available in `forced-colors`: `Canvas`, `CanvasText`, `LinkText`, `VisitedText`, `ActiveText`, `ButtonFace`, `ButtonText`, `Field`, `FieldText`, `Highlight`, `HighlightText`, `GrayText`, `Mark`, `MarkText`.

**Key rule:** Do not try to fight forced-colors mode. Instead, ensure your layout, borders, and focus indicators work correctly with system colors. Test in Windows High Contrast Mode (or Firefox's built-in simulator) periodically.

### 13. CSS `color-scheme` Property

The CSS `color-scheme` property tells the browser which color schemes your page supports. This affects native browser UI (scrollbars, form controls, button styles) before your CSS even loads.

```css
/* Declare that the page supports both schemes */
:root {
  color-scheme: light dark;
}

/* In dark mode, force the dark scheme for native controls */
[data-theme="dark"] {
  color-scheme: dark;
}

/* In light mode, force the light scheme */
[data-theme="light"] {
  color-scheme: light;
}
```

**What it affects:**
- Default background color and text color of the page (before CSS loads).
- Scrollbar styling (dark scrollbars in dark mode).
- Form controls (`<input>`, `<select>`, `<textarea>`) adopt the system's dark appearance.
- `<dialog>` and `<details>` native styling.

**Always set `color-scheme` when implementing dark mode.** Without it, native controls look jarring — light scrollbars on a dark page, white input backgrounds in a dark form.

The CSS `light-dark()` function (supported in all major browsers since 2024) simplifies theme-aware values by combining both modes in a single declaration. It works in conjunction with the `color-scheme` property:

```css
:root {
  color-scheme: light dark;
}

body {
  color: light-dark(#1a1a1a, #e5e5e5);
  background: light-dark(#ffffff, #0a0a0a);
}
```

`light-dark()` is ideal for simple token definitions where the only difference between themes is the color value. For more complex token architectures with multiple elevation levels and brand-specific palettes, the `[data-theme]` selector approach shown in the examples remains more flexible.

---

## LLM Instructions

When an AI assistant is asked to implement dark mode, follow these directives:

### Implement Dark Mode with CSS Custom Properties

Always use CSS custom properties (custom properties on `:root` or `[data-theme]` selectors) for theming. Never hard-code color values in component styles. Define a complete set of semantic tokens and provide light and dark resolutions.

Structure your token system as:

1. Primitive tokens (raw values, defined once)
2. Semantic tokens (intent-based, redefined per theme)
3. Component tokens (optional, reference semantic tokens)

Apply the dark theme using a `data-theme="dark"` attribute on the `<html>` element, or a `.dark` class. Prefer `data-theme` for semantic clarity.

### Build a Theme Toggle

Implement a three-way toggle (system / light / dark) as the default pattern. Store the user's explicit choice in `localStorage` (and cookies if using SSR). When set to "system," listen for changes to the `prefers-color-scheme` media query via `window.matchMedia` and update the theme reactively.

### Prevent Theme Flash

Always include a blocking inline script in `<head>` that:
1. Reads the stored theme preference from `localStorage` or cookies.
2. Falls back to `prefers-color-scheme` if no stored preference exists.
3. Sets `data-theme` on `document.documentElement` before the browser paints.

This script must be synchronous, inline, and placed before stylesheets. It must not reference external files.

### Handle Images in Dark Mode

When building components that display images:
- Apply a subtle `filter: brightness(0.85)` to `<img>` elements in dark mode via CSS.
- Use `<picture>` with `media="(prefers-color-scheme: dark)"` for critical images (logos, hero graphics) that have dark-mode variants.
- Use `currentColor` in all SVG icons so they inherit the correct text color automatically.
- Provide a `.dark-mode-invert` utility class for simple black-on-transparent images that just need inversion.

### Create Semantic Color Token Systems

When generating a color token system:
- Define at least these semantic categories: `bg`, `text`, `border`, `surface`, `accent`, `error`, `success`, `warning`.
- Provide at minimum three levels per category: `primary`, `secondary`, `tertiary`.
- Ensure every token has both a light and dark resolution.
- Document the contrast ratio for every text/background pair.
- Never use primitive tokens directly in component code -- always alias through semantic tokens.

---

## Examples

### 1. Complete Dark Mode Token System

A full CSS custom property system with light and dark theme tokens:

```css
/* ============================================
   Primitive Tokens — raw values, defined once
   ============================================ */
:root {
  /* Neutrals */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --gray-950: #0a0f1a;

  /* Brand */
  --blue-400: #60a5fa;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;

  /* Feedback */
  --red-400: #f87171;
  --red-500: #ef4444;
  --green-400: #4ade80;
  --green-500: #22c55e;
  --amber-400: #fbbf24;
  --amber-500: #f59e0b;
}

/* ============================================
   Light Theme — semantic token resolution
   ============================================ */
:root,
[data-theme="light"] {
  color-scheme: light;

  /* Backgrounds */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: var(--gray-50);
  --color-bg-tertiary: var(--gray-100);

  /* Surfaces (cards, modals, dropdowns) */
  --color-surface-1: #ffffff;
  --color-surface-2: var(--gray-50);
  --color-surface-3: var(--gray-100);

  /* Text */
  --color-text-primary: var(--gray-900);
  --color-text-secondary: var(--gray-600);
  --color-text-tertiary: var(--gray-400);
  --color-text-inverse: #ffffff;

  /* Borders */
  --color-border-primary: var(--gray-300);
  --color-border-secondary: var(--gray-200);
  --color-border-subtle: var(--gray-100);

  /* Accent / Interactive */
  --color-accent: var(--blue-600);
  --color-accent-hover: var(--blue-500);
  --color-accent-text: #ffffff;

  /* Feedback */
  --color-error: var(--red-500);
  --color-success: var(--green-500);
  --color-warning: var(--amber-500);

  /* Shadows (visible in light mode) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

/* ============================================
   Dark Theme — semantic token resolution
   ============================================ */
[data-theme="dark"] {
  color-scheme: dark;

  /* Backgrounds — dark gray, NOT pure black */
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #1e1e1e;

  /* Surfaces — progressively lighter for elevation */
  --color-surface-1: #1e1e1e;
  --color-surface-2: #252525;
  --color-surface-3: #2d2d2d;

  /* Text — off-white, NOT pure white */
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #6b6b6b;
  --color-text-inverse: var(--gray-900);

  /* Borders — subtle, low-contrast */
  --color-border-primary: #3a3a3a;
  --color-border-secondary: #2e2e2e;
  --color-border-subtle: #242424;

  /* Accent — slightly brighter for dark backgrounds */
  --color-accent: var(--blue-400);
  --color-accent-hover: var(--blue-500);
  --color-accent-text: var(--gray-900);

  /* Feedback — slightly desaturated */
  --color-error: var(--red-400);
  --color-success: var(--green-400);
  --color-warning: var(--amber-400);

  /* Shadows — minimal, near-invisible on dark */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}

/* ============================================
   System preference fallback (no JS needed)
   ============================================ */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;

    --color-bg-primary: #121212;
    --color-bg-secondary: #1a1a1a;
    --color-bg-tertiary: #1e1e1e;

    --color-surface-1: #1e1e1e;
    --color-surface-2: #252525;
    --color-surface-3: #2d2d2d;

    --color-text-primary: #e0e0e0;
    --color-text-secondary: #a0a0a0;
    --color-text-tertiary: #6b6b6b;
    --color-text-inverse: var(--gray-900);

    --color-border-primary: #3a3a3a;
    --color-border-secondary: #2e2e2e;
    --color-border-subtle: #242424;

    --color-accent: var(--blue-400);
    --color-accent-hover: var(--blue-500);
    --color-accent-text: var(--gray-900);

    --color-error: var(--red-400);
    --color-success: var(--green-400);
    --color-warning: var(--amber-400);

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  }
}

/* ============================================
   Usage in components
   ============================================ */
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.card {
  background-color: var(--color-surface-1);
  border: 1px solid var(--color-border-secondary);
  box-shadow: var(--shadow-md);
  border-radius: 8px;
  padding: 1.5rem;
}

.button-primary {
  background-color: var(--color-accent);
  color: var(--color-accent-text);
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.button-primary:hover {
  background-color: var(--color-accent-hover);
}
```

### 2. Theme Toggle Component (React + localStorage)

A three-way toggle supporting system, light, and dark:

```jsx
import { useState, useEffect, useCallback } from "react";

const THEME_KEY = "theme-preference";
const THEMES = ["system", "light", "dark"];

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredPreference() {
  if (typeof window === "undefined") return "system";
  return localStorage.getItem(THEME_KEY) || "system";
}

function applyTheme(preference) {
  const resolved =
    preference === "system" ? getSystemTheme() : preference;

  document.documentElement.setAttribute("data-theme", resolved);

  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      "content",
      resolved === "dark" ? "#121212" : "#ffffff"
    );
  }
}

export function useTheme() {
  const [preference, setPreference] = useState(getStoredPreference);
  const [resolved, setResolved] = useState(() => {
    const pref = getStoredPreference();
    return pref === "system" ? getSystemTheme() : pref;
  });

  // Apply theme whenever preference changes
  useEffect(() => {
    const next = preference === "system" ? getSystemTheme() : preference;
    setResolved(next);
    applyTheme(preference);
    localStorage.setItem(THEME_KEY, preference);

    // Also set a cookie for SSR flicker prevention
    document.cookie = `theme=${preference};path=/;max-age=31536000;SameSite=Lax`;
  }, [preference]);

  // Listen for system theme changes when set to "system"
  useEffect(() => {
    if (preference !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyTheme("system");
      setResolved(getSystemTheme());
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  }, []);

  return {
    preference,        // "system" | "light" | "dark"
    resolved,          // "light" | "dark" (reactive to system changes)
    setPreference,
    cycle,
  };
}

// ---------- Toggle Button Component ----------

const ICONS = {
  system: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="10" rx="1.5"
        stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 17h6" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" />
      <path d="M10 14v3" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" />
    </svg>
  ),
  light: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66
        13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  dark: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M17.09 11.05A7.5 7.5 0 018.95 2.91 7.5 7.5 0 1017.09
        11.05z" stroke="currentColor" strokeWidth="1.5"
        strokeLinejoin="round" />
    </svg>
  ),
};

const LABELS = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

export function ThemeToggle() {
  const { preference, cycle } = useTheme();

  return (
    <button
      onClick={cycle}
      aria-label={LABELS[preference]}
      title={LABELS[preference]}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 8,
        border: "1px solid var(--color-border-primary)",
        background: "var(--color-surface-1)",
        color: "var(--color-text-primary)",
        cursor: "pointer",
        transition: "background-color 150ms ease",
      }}
    >
      {ICONS[preference]}
    </button>
  );
}
```

### 3. FOUC Prevention Script

An inline blocking script placed in `<head>` before any stylesheets to prevent flash of wrong theme:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <meta name="theme-color" content="#ffffff" />

  <!--
    CRITICAL: This script MUST be inline and synchronous.
    It blocks rendering for ~1ms to prevent theme flash.
    Place it BEFORE any stylesheet <link> tags.
  -->
  <script>
    (function () {
      var THEME_KEY = "theme-preference";
      var preference;

      // 1. Try localStorage
      try {
        preference = localStorage.getItem(THEME_KEY);
      } catch (e) {
        // localStorage unavailable (private browsing, etc.)
      }

      // 2. Try cookie (for SSR scenarios)
      if (!preference) {
        var match = document.cookie.match(/(^|; ?)theme=([^;]+)/);
        if (match) preference = match[2];
      }

      // 3. Resolve the actual theme
      var resolved;
      if (preference === "light" || preference === "dark") {
        resolved = preference;
      } else {
        // "system" or no preference — detect OS setting
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }

      // 4. Apply immediately, before paint
      document.documentElement.setAttribute("data-theme", resolved);

      // 5. Update meta theme-color
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", resolved === "dark" ? "#121212" : "#ffffff");
      }
    })();
  </script>

  <!-- Stylesheets go AFTER the theme script -->
  <link rel="stylesheet" href="/styles/tokens.css" />
  <link rel="stylesheet" href="/styles/main.css" />
  <title>My App</title>
</head>
<body>
  <!-- Page renders with correct theme from the first frame -->
</body>
</html>
```

### 4. Dark Mode Image Handling

Multiple strategies for images that look correct in both themes:

```css
/* ============================================
   Strategy 1: Dim all images in dark mode
   ============================================ */
[data-theme="dark"] img:not(.no-dim) {
  filter: brightness(0.85);
  transition: filter 200ms ease;
}

/* Restore full brightness on hover/focus for detail inspection */
[data-theme="dark"] img:not(.no-dim):hover,
[data-theme="dark"] img:not(.no-dim):focus {
  filter: brightness(1);
}

/* ============================================
   Strategy 2: Invert simple black-on-white images
   ============================================ */
[data-theme="dark"] img.dark-invert {
  filter: invert(1) hue-rotate(180deg);
}

/* ============================================
   Strategy 3: Utility for transparent PNGs
   designed for light backgrounds
   ============================================ */
[data-theme="dark"] .dark-bg-pad {
  background-color: var(--color-surface-3);
  border-radius: 8px;
  padding: 0.75rem;
}
```

```html
<!-- ============================================
     Strategy 4: <picture> for theme-aware sources
     ============================================ -->
<picture>
  <!-- Dark-mode variant loaded when OS prefers dark -->
  <source
    srcset="/images/hero-dark.webp"
    media="(prefers-color-scheme: dark)"
    type="image/webp"
  />
  <!-- Light-mode default -->
  <source srcset="/images/hero-light.webp" type="image/webp" />
  <img
    src="/images/hero-light.png"
    alt="Product hero illustration"
    width="1200"
    height="630"
    loading="eager"
  />
</picture>

<!--
  Limitation: <picture> media queries detect OS preference,
  not the data-theme attribute. For JS-toggled themes, swap
  the src via JavaScript or use CSS background-image instead.
-->
```

```html
<!-- ============================================
     Strategy 5: SVG with currentColor
     ============================================ -->

<!-- Inline SVG — automatically adapts to text color -->
<svg width="24" height="24" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <path d="M12 2L2 7l10 5 10-5-10-5z" />
  <path d="M2 17l10 5 10-5" />
  <path d="M2 12l10 5 10-5" />
</svg>

<!--
  For external SVGs, reference them via <use> or
  set fill/stroke via CSS on the <svg> element.
  Avoid <img src="icon.svg"> for icons that must
  change color — img-embedded SVGs cannot be styled.
-->
```

```jsx
/**
 * Strategy 6: JS-driven image source swap
 * for applications with a three-way theme toggle
 * where <picture> media queries are insufficient.
 */
function ThemeAwareImage({ lightSrc, darkSrc, alt, ...props }) {
  const { resolved } = useTheme();
  const src = resolved === "dark" ? darkSrc : lightSrc;

  return (
    <img
      src={src}
      alt={alt}
      // Prevent layout shift with explicit dimensions
      {...props}
    />
  );
}

// Usage:
// <ThemeAwareImage
//   lightSrc="/images/diagram-light.png"
//   darkSrc="/images/diagram-dark.png"
//   alt="Architecture diagram"
//   width={800}
//   height={450}
// />
```

### 5. Tailwind CSS Dark Mode Setup (`darkMode: 'class'`)

> **Tailwind v4:** Use CSS-based configuration with `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` in your CSS file instead of `tailwind.config.js`. The config below is for Tailwind v3 projects.

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  // Use class-based dark mode for manual toggle support
  // This works with data-theme attribute via a custom selector
  darkMode: ["class", '[data-theme="dark"]'],

  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--color-surface)",
          alt: "var(--color-surface-alt)",
        },
      },
    },
  },
};
```

```html
<!-- Usage in Tailwind — prefix dark: utilities -->
<div class="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
  <h1 class="text-neutral-950 dark:text-neutral-50">Dashboard</h1>
  <p class="text-neutral-600 dark:text-neutral-400">Welcome back.</p>

  <button class="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400">
    Create project
  </button>

  <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
    <p class="text-neutral-700 dark:text-neutral-300">Card content</p>
  </div>
</div>
```

**Key decisions:**
- `darkMode: ["class", '[data-theme="dark"]']` activates dark utilities when `data-theme="dark"` is set on `<html>` — compatible with the three-way toggle pattern.
- Components use `dark:` prefix for every color-sensitive property.
- Token-based approach: semantic CSS custom properties (`var(--color-surface)`) are preferred for large projects; `dark:` prefixes work well for smaller projects or rapid prototyping.

### 6. next-themes Integration (Next.js)

```tsx
// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"       // Sets data-theme on <html>
      defaultTheme="system"        // Respect OS preference by default
      enableSystem                 // Listen to prefers-color-scheme
      disableTransitionOnChange    {/* Prevents a flash during SSR hydration. For user-initiated toggles where you want smooth transitions, omit this prop and add CSS transitions to body instead. */}
      storageKey="theme"           // localStorage key
    >
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention — next-themes injects a script automatically,
            but adding color-scheme helps native controls */}
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// components/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />; // placeholder

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const;

  return (
    <div className="flex gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-2 rounded-md transition-colors ${
            theme === value
              ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
          aria-label={`Switch to ${label} theme`}
          aria-pressed={theme === value}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
```

**Key decisions:**
- `next-themes` handles FOUC prevention, localStorage, system preference detection, and SSR automatically.
- `attribute="data-theme"` sets `data-theme` on `<html>` for CSS custom property switching.
- `disableTransitionOnChange` prevents a brief transition flash when switching themes.
- `suppressHydrationWarning` on `<html>` is required because the theme script may set attributes before React hydrates.
- `mounted` guard prevents hydration mismatch — the toggle renders a placeholder until the client has mounted and can read the actual theme.

---

## Common Mistakes

### Using Pure Black Backgrounds

**Wrong:** Setting the dark mode background to `#000000`. Pure black creates excessive contrast with text, causes halation, and looks harsh on LCD screens (which cannot display true black anyway). Only consider true black for dedicated AMOLED-optimized themes.

**Fix:** Use a dark gray like `#121212` or `#1a1a1a` as the base background. Reserve darker values for deeper levels if implementing Material Design-style elevation.

### Forgetting the System Option in the Toggle

**Wrong:** Providing only a light/dark toggle with no "system" option, or worse, defaulting to light mode and forcing users to manually switch every time their OS is already set to dark.

**Fix:** Default to "system" and allow explicit overrides. The three-way toggle (system / light / dark) respects user agency.

### Hard-Coding Colors in Components

**Wrong:** Writing `color: #333` or `background: white` directly in component styles. These values will not adapt when the theme changes.

**Fix:** Reference semantic tokens everywhere: `color: var(--color-text-primary)`. Components should be theme-agnostic.

### Ignoring Flash of Wrong Theme

**Wrong:** Applying the theme only after React hydrates or after a `DOMContentLoaded` event. The user sees a bright flash before the dark theme kicks in.

**Fix:** Use a synchronous inline script in `<head>` that runs before any rendering. Accept the 1-2ms render-blocking cost to prevent the flash.

### Inverting Colors Instead of Redesigning

**Wrong:** Using CSS `filter: invert(1)` on the entire page or naively swapping foreground and background. This breaks images, produces unintended color shifts, and creates an inconsistent, broken appearance.

**Fix:** Build a proper semantic token system with deliberate color choices for each theme. Dark mode is a redesign, not a filter.

### Not Testing Both Themes

**Wrong:** Building and testing only in light mode, then enabling dark mode and assuming it works. Contrast failures, invisible borders, unreadable text on colored backgrounds, and missing states are guaranteed.

**Fix:** Test every component, every state, and every page in both themes. Automate with visual regression tests that capture both themes.

### Ignoring Third-Party Content

**Wrong:** Assuming embedded content (maps, videos, chat widgets, third-party forms) will respect your theme. Most will not.

**Fix:** Audit all third-party embeds. Apply CSS overrides where possible (many embed providers offer a `theme` parameter). For intractable cases, add a subtle border or background to visually separate the embed from your themed content.

### Forgetting About Transitions

**Wrong:** Toggling the theme with no transition, causing an instant jarring flash between themes. Or over-transitioning with a slow fade that makes theme switching feel sluggish.

**Fix:** Apply a brief `transition` to `background-color` and `color` properties (150-200ms). Do not transition `*` -- this causes performance issues. Transition only the properties that matter.

```css
/* Smooth theme transitions — apply to body or major sections */
body {
  transition: background-color 200ms ease, color 200ms ease;
}

/* Do NOT do this — transitions on every property of every element */
/* * { transition: all 200ms ease; } */
```

---

> **See also:** [Brand-Identity](../Brand-Identity/brand-identity.md) | [Design-Systems](../Design-Systems/design-systems.md) | [Typography-Color](../Typography-Color/typography-color.md) | [Accessibility](../Accessibility/accessibility.md) | [Responsive-Design](../Responsive-Design/responsive-design.md) | [Animation-Motion](../Animation-Motion/animation-motion.md)
>
> **Last reviewed:** 2026-02
