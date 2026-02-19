# Mobile-First Design

> Touch targets, gestures, mobile performance, and designing for small screens first.

---

## Principles

### 1. Mobile-First Philosophy

Design for the smallest screen first, then progressively enhance for larger ones. This is not merely a responsive design technique -- it is a constraint-driven design philosophy. When you start with a 320px-wide viewport, you are forced to prioritize. You must decide what matters most, what the core user journey is, and what can be deferred. Starting with desktop and then squeezing content into mobile produces cluttered, compromised small-screen experiences.

Mobile-first means:

1. **Content hierarchy is decided first.** On a small screen, there is no room for "nice to have" elements. The most important content and actions surface naturally.
2. **CSS is written min-width up.** Base styles target mobile. `@media (min-width: 768px)` adds tablet enhancements. `@media (min-width: 1024px)` adds desktop enhancements. Never write `max-width` media queries as the primary approach.
3. **Performance is addressed at the foundation.** Mobile devices have slower processors, less memory, and unreliable networks. If it performs well on mobile, it will perform well everywhere.

### 2. Touch Target Sizes

Fingers are not mouse cursors. A mouse click is precise to a single pixel. A finger tap covers a roughly 7mm circular area, and users frequently miss small targets. Undersized touch targets are the single most common mobile usability failure.

**Minimum sizes:**

| Standard | Minimum Size | Recommendation |
|----------|-------------|----------------|
| WCAG 2.2 (Level AA) | 24x24px | Minimum for accessibility compliance |
| Apple HIG | 44x44pt | Recommended minimum for iOS |
| Google Material | 48x48dp | Recommended minimum for Android |
| Comfortable tapping | 48x48px | Use this as your default |

**Spacing:** Maintain at least 8px of space between adjacent touch targets. Targets that are large enough individually but packed together with no gap still cause mis-taps.

The visual size of an element can be smaller than the touch target. Use padding to expand the tappable area beyond the visible bounds:

```css
.icon-button {
  /* Visual size: 24px icon */
  width: 24px;
  height: 24px;
  /* Touch target: 48px via padding */
  padding: 12px;
  /* Ensure padding is part of the tap area */
  box-sizing: content-box;
}
```

### 3. Thumb Zones

Users hold phones in one hand and operate with their thumb. Research consistently shows that the bottom-center of the screen is the easiest area to reach, while the top corners are the hardest. Design accordingly:

- **Easy reach (bottom third):** Place primary actions, navigation, and frequently-used controls here.
- **Moderate reach (middle):** Content, secondary actions.
- **Hard reach (top corners):** Non-critical actions, settings, profile. Avoid placing anything here that users need to tap frequently.

This is why bottom navigation bars have become the dominant mobile pattern. They place top-level navigation in the easiest-to-reach zone.

### 4. Bottom Navigation vs Hamburger Menu

The hamburger menu (three horizontal lines) hides navigation behind a tap. Out of sight, out of mind -- hidden navigation reduces discoverability and engagement. Bottom navigation keeps top-level destinations visible and accessible at all times.

**Use bottom navigation when:**
- You have 3-5 top-level destinations.
- Users switch between these destinations frequently.
- Each destination is equally important.

**Use a hamburger menu (or drawer) when:**
- You have more than 5 top-level destinations.
- Some destinations are secondary or rarely accessed.
- Screen space for the primary content is critical (e.g., immersive media, maps).

**Never:** Use both a hamburger menu and bottom navigation simultaneously. This fragments navigation and confuses users about where to find things.

### 5. Mobile Typography

Typography on mobile requires specific adjustments:

- **Minimum 16px body text.** On iOS Safari, input fields with font sizes below 16px trigger an automatic page zoom on focus. This disrupts the user experience. Set the base font size to at least 16px to prevent this behavior.
- **Line length.** On mobile, lines of text should not exceed roughly 35-40 characters for comfortable reading. This usually happens naturally due to screen width, but watch for landscape mode.
- **Line height.** Use 1.5 to 1.6 line-height for body text. Small screens benefit from slightly more generous line spacing for readability.
- **Tap target text.** Links and buttons in body text should have generous padding or be presented as block-level elements to ensure the full touch target area is achieved.

### 6. Mobile Forms

Forms are where mobile experiences most often break down. Every unnecessary field, every wrong input type, every missing autocomplete attribute adds friction and increases abandonment.

**Input types:** Use the correct HTML input type so the device shows the appropriate keyboard:

| Field | Type | Attribute | Keyboard shown |
|-------|------|-----------|----------------|
| Phone | `type="tel"` | `autocomplete="tel"` | Numeric keypad |
| Email | `type="email"` | `autocomplete="email"` | @ and .com keys |
| URL | `type="url"` | `autocomplete="url"` | / and .com keys |
| Number | `type="text"` | `inputmode="numeric"` | Number pad |
| Search | `type="search"` | | Search/Enter key |
| Password | `type="password"` | `autocomplete="current-password"` | Standard + manager |
| New password | `type="password"` | `autocomplete="new-password"` | Standard + generator |

**Note:** Prefer `inputmode="numeric"` over `type="number"` for fields like credit cards, PINs, and zip codes. `type="number"` adds spinner arrows, allows scientific notation (e.g., `1e3`), and strips leading zeros.

**Autocomplete:** Always provide `autocomplete` attributes. They enable password managers, autofill, and drastically reduce typing on mobile. Common values: `name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number`, `cc-exp`.

### 7. Gestures

Touch interfaces support gestures beyond tapping: swipe, pull-to-refresh, long press, pinch-to-zoom, and more. Use them to enhance usability, but follow one strict rule:

**Every gesture must have a visible, tappable alternative.** Gestures are invisible affordances. Users cannot discover them without being taught, and users with motor impairments may not be able to perform them. A swipe-to-delete action must also have a delete button (revealed or always visible). A pull-to-refresh must also have a refresh button or automatic refresh.

Gesture guidelines:
- **Swipe:** Natural for dismissing, navigating between items (carousels, cards), and revealing actions. Keep consistent direction semantics: swipe left/right for navigation, swipe up for dismiss on bottom sheets.
- **Pull-to-refresh:** Used for refreshing list/feed content. Only use on scrollable lists where the content is expected to change.
- **Long press:** Used for context menus and selection modes. Always provide the same options via a visible menu or action bar. Long press is the least discoverable gesture.

### 8. Mobile Performance

Mobile performance is not desktop performance on a slower connection. Mobile devices have constrained CPU, memory, and bandwidth. Optimization is not optional.

Key performance strategies:

1. **Critical rendering path.** Inline critical CSS in `<head>`. Defer non-critical CSS and JavaScript. The first contentful paint should happen within 1.8 seconds on a 4G connection.
2. **Above-the-fold content.** Prioritize rendering what is visible without scrolling. Lazy-load everything below the fold.
3. **Lazy loading.** Use `loading="lazy"` on images and iframes below the fold. Use `Intersection Observer` for lazy-loading components or heavy widgets.
4. **Image optimization.** Serve responsive images with `srcset` and `sizes`. Use modern formats (WebP, AVIF). Compress aggressively. A hero image should not be a 2MB PNG.
5. **Bundle size.** On a mid-range phone, every kilobyte of JavaScript takes roughly 2-3x longer to parse and execute than on a desktop. Tree-shake, code-split, and audit your dependencies.
6. **Font loading.** Use `font-display: swap` or `font-display: optional`. Subset fonts to include only the characters you need. A full Google Font download can be 100KB+; a subset can be 15KB.

### 9. Viewport Meta Tag and Safe Areas

The viewport meta tag is the foundation of mobile rendering. Without it, mobile browsers render the page at a virtual desktop width (typically 980px) and then scale it down to fit.

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Safe areas:** Modern phones have notches, dynamic islands, rounded corners, and home indicator bars that overlay content. CSS `env()` functions provide insets for these hardware intrusions:

```css
.fixed-bottom-bar {
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

For these to work, you must also opt in via the viewport meta tag:

```html
<meta name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

The `viewport-fit=cover` value tells the browser to extend the layout into the safe area regions, giving you control over how content interacts with hardware features.

### 10. PWA Considerations

Progressive Web Apps bridge the gap between web and native mobile experiences. For mobile-first applications, consider:

- **Service workers** for offline support and caching strategies. At minimum, cache the app shell and critical assets so the application loads without a network connection.
- **Web app manifest** (`manifest.json`) defining the app name, icons, theme color, and display mode (`standalone` for a native-like experience).
- **Offline support.** Display a meaningful offline page rather than the browser's default error. Cache recently viewed content for offline access.
- **Install prompts.** The browser's default install prompt is often ignored. Use the `beforeinstallprompt` event to present a custom, contextual install suggestion at the right moment (after repeated visits, not on first load).

PWA is not all-or-nothing. Even implementing just a service worker for caching and a manifest for "Add to Home Screen" significantly improves the mobile experience.

---

## LLM Instructions

When an AI assistant is asked to design or implement mobile-first interfaces, follow these directives:

### Design Mobile-First Layouts

Always write CSS starting from the mobile layout as the default. Use `min-width` media queries to enhance for larger screens. Never write `max-width` queries as the base approach. Structure layouts with CSS Grid or Flexbox. Default to a single-column layout on mobile, expanding to multi-column on tablet and desktop.

```
Default styles → mobile (single column, stacked)
@media (min-width: 768px) → tablet (two columns, side-by-side)
@media (min-width: 1024px) → desktop (three columns, sidebar)
```

### Implement Proper Touch Targets

Ensure all interactive elements (buttons, links, toggles, checkboxes) have a minimum tappable area of 48x48px. Use padding to expand the tappable area if the visual element is smaller. Maintain at least 8px spacing between adjacent targets. Audit every interactive element in the design.

### Build Mobile Navigation Patterns

For applications with 3-5 top-level destinations, implement a bottom navigation bar on mobile that converts to a sidebar or top navigation on desktop. Ensure the active state is clearly indicated. Use icons with labels (not icons alone) for navigation items.

### Optimize Mobile Forms

Always set the correct `type` and `inputmode` attributes on inputs. Always provide `autocomplete` attributes. Use `type="text"` with `inputmode="numeric"` for numeric fields that are not true numbers (credit cards, OTPs). Group related fields logically. Use a single-column layout for forms on mobile. Place primary submit actions in the thumb zone.

### Handle Safe Areas

When building fixed or sticky elements (bottom bars, floating action buttons, modals), always account for safe area insets using `env(safe-area-inset-*)`. Include `viewport-fit=cover` in the viewport meta tag. Test on devices with notches and home indicators.

### Optimize Mobile Performance

Lazy-load all images below the fold with `loading="lazy"`. Serve responsive images with `srcset`. Inline critical CSS. Defer non-critical JavaScript with `async` or `defer`. Code-split routes so users only download the JavaScript needed for the current page. Set performance budgets: under 200KB of JavaScript for the initial load on critical pages.

---

## Examples

### 1. Mobile-First Responsive Navigation

A bottom navigation bar on mobile that transitions to a sidebar on desktop:

```css
/* ============================================
   Base styles: Mobile (bottom navigation)
   ============================================ */
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* Reserve space for the fixed bottom nav */
  padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
}

.app-content {
  flex: 1;
  overflow-y: auto;

}

.nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  height: 56px;
  background-color: var(--color-surface-1);
  border-top: 1px solid var(--color-border-subtle);
  /* Safe area padding for notch/home-indicator devices */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  /* Touch target: full height, distributed width */
  min-height: 48px;
  padding: 4px 0;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 150ms ease;
}

.nav-item[aria-current="page"],
.nav-item.active {
  color: var(--color-accent);
}

.nav-item:hover {
  color: var(--color-text-primary);
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-label {
  line-height: 1;
}

/* ============================================
   Tablet: Still bottom nav, wider spacing
   ============================================ */
@media (min-width: 768px) {
  .nav-bar {
    justify-content: center;
    gap: 2rem;
  }

  .nav-item {
    flex: none;
    padding: 4px 1rem;
  }
}

/* ============================================
   Desktop: Side navigation
   ============================================ */
@media (min-width: 1024px) {
  .app-layout {
    flex-direction: row;
    padding-bottom: 0;
  }

  .nav-bar {
    position: sticky;
    top: 0;
    bottom: auto;
    left: auto;
    right: auto;
    flex-direction: column;
    justify-content: flex-start;
    width: 240px;
    height: 100vh;
    border-top: none;
    border-right: 1px solid var(--color-border-subtle);
    padding: 1.5rem 0.75rem;
    padding-bottom: 0;
    gap: 0.25rem;
  }

  .nav-item {
    flex-direction: row;
    justify-content: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 14px;
    min-height: 44px;
  }

  .nav-item[aria-current="page"],
  .nav-item.active {
    background-color: var(--color-bg-tertiary);
    color: var(--color-accent);
  }

  .nav-item:hover {
    background-color: var(--color-bg-secondary);
  }
}
```

```jsx
function AppNavigation({ items, currentPath }) {
  return (
    <nav className="nav-bar" aria-label="Main navigation">
      {items.map((item) => (
        <a
          key={item.path}
          href={item.path}
          className="nav-item"
          aria-current={currentPath === item.path ? "page" : undefined}
        >
          <span className="nav-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="nav-label">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

// Usage:
// <AppNavigation
//   currentPath="/home"
//   items={[
//     { path: "/home", label: "Home", icon: <HomeIcon /> },
//     { path: "/search", label: "Search", icon: <SearchIcon /> },
//     { path: "/create", label: "Create", icon: <PlusIcon /> },
//     { path: "/inbox", label: "Inbox", icon: <InboxIcon /> },
//     { path: "/profile", label: "Profile", icon: <UserIcon /> },
//   ]}
// />
```

### 2. Mobile-Optimized Form

A form with correct input types, autocomplete, and mobile-friendly layout:

```html
<form class="mobile-form" action="/checkout" method="post" novalidate>
  <h2 class="form-title">Shipping Information</h2>

  <div class="form-group">
    <label for="full-name" class="form-label">Full name</label>
    <input
      id="full-name"
      type="text"
      name="name"
      autocomplete="name"
      autocapitalize="words"
      spellcheck="false"
      required
      class="form-input"
      placeholder="Jane Smith"
    />
  </div>

  <div class="form-group">
    <label for="email" class="form-label">Email</label>
    <input
      id="email"
      type="email"
      name="email"
      autocomplete="email"
      inputmode="email"
      required
      class="form-input"
      placeholder="jane@example.com"
    />
  </div>

  <div class="form-group">
    <label for="phone" class="form-label">Phone</label>
    <input
      id="phone"
      type="tel"
      name="phone"
      autocomplete="tel"
      inputmode="tel"
      class="form-input"
      placeholder="+1 (555) 000-0000"
    />
  </div>

  <div class="form-group">
    <label for="address" class="form-label">Street address</label>
    <input
      id="address"
      type="text"
      name="address"
      autocomplete="street-address"
      required
      class="form-input"
      placeholder="123 Main St"
    />
  </div>

  <div class="form-row">
    <div class="form-group form-group--half">
      <label for="city" class="form-label">City</label>
      <input
        id="city"
        type="text"
        name="city"
        autocomplete="address-level2"
        required
        class="form-input"
      />
    </div>
    <div class="form-group form-group--half">
      <label for="zip" class="form-label">ZIP code</label>
      <!-- inputmode="numeric" instead of type="number"
           to avoid spinner and allow leading zeros -->
      <input
        id="zip"
        type="text"
        name="zip"
        autocomplete="postal-code"
        inputmode="numeric"
        pattern="[0-9]{5}(-[0-9]{4})?"
        maxlength="10"
        required
        class="form-input"
        placeholder="10001"
      />
    </div>
  </div>

  <div class="form-group">
    <label for="card-number" class="form-label">Card number</label>
    <input
      id="card-number"
      type="text"
      name="card-number"
      autocomplete="cc-number"
      inputmode="numeric"
      pattern="[0-9\s]{13,19}"
      maxlength="19"
      required
      class="form-input"
      placeholder="4242 4242 4242 4242"
    />
  </div>

  <div class="form-row">
    <div class="form-group form-group--half">
      <label for="card-exp" class="form-label">Expiration</label>
      <input
        id="card-exp"
        type="text"
        name="card-exp"
        autocomplete="cc-exp"
        inputmode="numeric"
        placeholder="MM / YY"
        maxlength="7"
        required
        class="form-input"
      />
    </div>
    <div class="form-group form-group--half">
      <label for="card-cvc" class="form-label">CVC</label>
      <input
        id="card-cvc"
        type="text"
        name="card-cvc"
        autocomplete="cc-csc"
        inputmode="numeric"
        pattern="[0-9]{3,4}"
        maxlength="4"
        required
        class="form-input"
        placeholder="123"
      />
    </div>
  </div>

  <button type="submit" class="form-submit">
    Place Order
  </button>
</form>
```

```css
/* ============================================
   Mobile-optimized form styles
   ============================================ */
.mobile-form {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.form-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 0.375rem;
}

.form-input {
  display: block;
  width: 100%;
  /* 16px prevents iOS zoom on focus */
  font-size: 16px;
  line-height: 1.5;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-input::placeholder {
  color: var(--color-text-tertiary);
}

/* Side-by-side fields on wider mobile screens */
.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-group--half {
  flex: 1;
}

.form-submit {
  display: block;
  width: 100%;
  padding: 1rem;
  margin-top: 1.5rem;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-accent-text);
  background-color: var(--color-accent);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  /* Minimum touch target height */
  min-height: 48px;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 150ms ease;
}

.form-submit:hover {
  background-color: var(--color-accent-hover);
}

.form-submit:active {
  transform: scale(0.98);
}
```

### 3. Safe Area Handling for Notch Devices

CSS setup for devices with notches, dynamic islands, and home indicators:

```html
<!-- viewport-fit=cover is REQUIRED for env() to work -->
<meta name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

```css
/* ============================================
   Safe area utilities
   ============================================ */

/* Base body padding to prevent content from being
   obscured by notch or rounded corners */
body {
  /* Top: status bar / dynamic island area */
  padding-top: env(safe-area-inset-top, 0px);
  /* Bottom: home indicator */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Fixed header — accounts for top safe area */
.header-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  /* Base height + safe area */
  padding-top: env(safe-area-inset-top, 0px);
  background-color: var(--color-surface-1);
  border-bottom: 1px solid var(--color-border-subtle);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 max(1rem, env(safe-area-inset-left, 0px));
}

/* Fixed bottom bar — accounts for home indicator */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: var(--color-surface-1);
  border-top: 1px solid var(--color-border-subtle);
  /* Padding inside the bar for the home indicator */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

.bottom-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
}

/* Floating action button — avoids home indicator */
.fab {
  position: fixed;
  /* Position above the home indicator safe area */
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  right: calc(1rem + env(safe-area-inset-right, 0px));
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background-color: var(--color-accent);
  color: var(--color-accent-text);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  z-index: 100;
}

/* Full-screen modal — respects all safe areas */
.modal-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 200;
  background-color: var(--color-bg-primary);
  overflow-y: auto;

  /* Pad all edges for safe areas */
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

/* Landscape mode — critical for left/right safe areas
   (notch can be on either side in landscape) */
@media (orientation: landscape) {
  .app-content {
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }
}
```

### 4. Touch-Friendly Card Component

A card with properly sized touch targets and appropriate spacing:

```css
/* ============================================
   Touch-friendly card component
   ============================================ */
.card {
  background-color: var(--color-surface-1);
  border: 1px solid var(--color-border-secondary);
  border-radius: 12px;
  overflow: hidden;
  /* Subtle elevation */
  box-shadow: var(--shadow-sm);
  transition: box-shadow 200ms ease, transform 200ms ease;
}

/* If the entire card is clickable */
.card--interactive {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.card--interactive:hover {
  box-shadow: var(--shadow-md);
}

.card--interactive:active {
  transform: scale(0.98);
}

.card-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.card-body {
  padding: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem;
  /* Limit lines and truncate */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Card actions — proper touch targets with spacing */
.card-actions {
  display: flex;
  align-items: center;
  gap: 8px; /* Minimum 8px between touch targets */
  padding: 0.5rem 1rem 1rem;
}

.card-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  /* Min 48px touch target height */
  min-height: 48px;
  padding: 0 1rem;
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  background: none;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 150ms ease;
}

.card-action-btn:hover {
  background-color: var(--color-bg-secondary);
}

.card-action-btn:active {
  background-color: var(--color-bg-tertiary);
}

.card-action-btn--primary {
  background-color: var(--color-accent);
  color: var(--color-accent-text);
  border-color: var(--color-accent);
}

.card-action-btn--primary:hover {
  background-color: var(--color-accent-hover);
}

/* Icon-only action button — needs explicit size */
.card-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 48x48px touch target */
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 150ms ease, color 150ms ease;
}

.card-action-icon:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.card-action-icon svg {
  width: 20px;
  height: 20px;
}
```

```jsx
function TouchCard({ image, title, description, onSave, onShare, href }) {
  return (
    <article className="card card--interactive">
      <a href={href} style={{ textDecoration: "none", color: "inherit" }}>
        <img
          className="card-image"
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
        />
        <div className="card-body">
          <h3 className="card-title">{title}</h3>
          <p className="card-description">{description}</p>
        </div>
      </a>

      <div className="card-actions">
        <button
          className="card-action-btn card-action-btn--primary"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          aria-label={`Save "${title}"`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16"
            fill="none" stroke="currentColor" strokeWidth="1.5"
            aria-hidden="true">
            <path d="M3 2.5h10a.5.5 0 01.5.5v10.5l-5.5-3-5.5
              3V3a.5.5 0 01.5-.5z" />
          </svg>
          Save
        </button>

        <button
          className="card-action-icon"
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          aria-label={`Share "${title}"`}
        >
          <svg viewBox="0 0 20 20" fill="none"
            stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <path d="M15 7l-5-5-5 5" />
            <path d="M10 2v11" />
            <path d="M3 13v3a1 1 0 001 1h12a1 1 0 001-1v-3" />
          </svg>
        </button>
      </div>
    </article>
  );
}

// Card grid with proper spacing
function CardGrid({ items }) {
  return (
    <div
      style={{
        display: "grid",
        // Single column on mobile, 2 on tablet, 3 on desktop
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      {items.map((item) => (
        <TouchCard key={item.id} {...item} />
      ))}
    </div>
  );
}
```

---

## Common Mistakes

### 1. Designing Desktop-First and Shrinking

**Wrong:** Building the full desktop layout with all features, then trying to hide, collapse, or rearrange elements for mobile. This produces bloated, overloaded mobile experiences with hidden functionality and excessive download sizes.

**Fix:** Start with mobile. Decide what the core experience is. Build that. Then add complexity and supplementary content for larger screens using `min-width` media queries.

### 2. Ignoring Touch Target Size

**Wrong:** Using 32px or smaller buttons, relying on text links with no padding, or placing small icons as the only interactive element. Users will mis-tap, become frustrated, and leave.

**Fix:** Every interactive element must have a minimum 48x48px tappable area. If the visual element is smaller (a 24px icon), expand the tappable area with padding. Maintain 8px minimum spacing between targets.

### 3. Using `type="number"` for Non-Numeric Inputs

**Wrong:** Using `<input type="number">` for credit card numbers, phone numbers, ZIP codes, and OTPs. This adds spinner buttons, allows `e` (scientific notation), strips leading zeros, and may reject valid input patterns.

**Fix:** Use `<input type="text" inputmode="numeric" pattern="[0-9]*">` for fields that contain digits but are not mathematical numbers. Use `type="tel"` for phone numbers.

### 4. Forgetting iOS Input Zoom

**Wrong:** Setting form input font size to 14px or smaller. On iOS Safari, inputs with `font-size` below 16px cause the browser to zoom in when the input is focused, disrupting the layout.

**Fix:** Set all form input font sizes to at least 16px. This is non-negotiable for mobile web.

### 5. Hamburger Menu for Primary Navigation

**Wrong:** Hiding the three or four most important destinations behind a hamburger menu on mobile. Engagement with hidden navigation drops significantly compared to visible navigation.

**Fix:** Use a bottom navigation bar for 3-5 primary destinations. Use a hamburger menu only for secondary or overflow navigation items.

### 6. Not Accounting for Safe Areas

**Wrong:** Placing fixed bottom bars, floating action buttons, or critical content at the edges of the viewport without safe area insets. On devices with notches or home indicators, this content will be obscured or overlapped.

**Fix:** Use `env(safe-area-inset-*)` CSS functions for all fixed/sticky elements near screen edges. Include `viewport-fit=cover` in the viewport meta tag. Test on actual devices with notches.

### 7. Gestures Without Tap Fallbacks

**Wrong:** Implementing swipe-to-delete, pull-to-refresh, or long-press menus as the only way to access those actions. Users with motor impairments, users unfamiliar with gesture conventions, and users on assistive devices cannot discover or perform these gestures.

**Fix:** Every gesture-triggered action must have a visible, tappable alternative. Swipe-to-delete must also have a delete button. Pull-to-refresh must also have a visible refresh mechanism. Long-press context menus must also be available via a "more options" button.

### 8. Ignoring Mobile Performance

**Wrong:** Shipping a 2MB JavaScript bundle, unoptimized 4000px-wide hero images, six custom font files, and dozens of third-party scripts, then wondering why mobile users bounce.

**Fix:** Set and enforce performance budgets. Under 200KB of JavaScript for the initial load. Use responsive images with `srcset`. Lazy-load below-the-fold content. Audit with Lighthouse on a throttled mobile connection (Slow 4G preset). Aim for a Largest Contentful Paint under 2.5 seconds.

### 9. Fixed Elements Without Scroll Consideration

**Wrong:** Using `position: fixed` for headers and footers without accounting for the vertical space they consume. On a small mobile screen, a 60px fixed header and a 56px fixed bottom bar leave very little room for scrollable content.

**Fix:** Minimize the height of fixed elements on mobile. Consider auto-hiding the header on scroll-down and showing it on scroll-up (a common pattern in native apps). Always test scrollable content to ensure sufficient visible area between fixed elements.

---

> **See also:** [Responsive-Design](../Responsive-Design/responsive-design.md) | [UX-Patterns](../UX-Patterns/ux-patterns.md) | [Animation-Motion](../Animation-Motion/animation-motion.md)
>
> **Last reviewed:** 2026-02
