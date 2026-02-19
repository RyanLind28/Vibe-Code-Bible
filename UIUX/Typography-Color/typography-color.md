# Typography & Color

> Type scales, font pairing, color theory, contrast ratios, and building cohesive visual systems.

---

## Principles

### 1. Type Scale (Modular Scale)

A type scale is a defined set of font sizes that follow a mathematical ratio, creating visual rhythm and hierarchy. Instead of picking arbitrary sizes, multiply the base size by a consistent ratio at each step.

Common modular scale ratios:

| Ratio | Name           | Character                                      |
|-------|----------------|-------------------------------------------------|
| 1.125 | Major second   | Tight, subtle — good for dense UI / dashboards  |
| 1.200 | Minor third    | Gentle — good for body-heavy content             |
| 1.250 | Major third    | Balanced — the most versatile starting point     |
| 1.333 | Perfect fourth | Clear hierarchy — good for marketing pages       |
| 1.500 | Perfect fifth  | Dramatic — good for editorial / magazine layouts  |
| 1.618 | Golden ratio   | Very dramatic — use sparingly, headings get large fast |

**How it works:** Start with a base size (typically `1rem` / 16px). Multiply up for headings, divide down for small text.

With a 1.250 ratio and 1rem base:
- Step -2: 0.64rem (10.24px)
- Step -1: 0.8rem (12.8px)
- Step 0 (base): 1rem (16px)
- Step 1: 1.25rem (20px)
- Step 2: 1.563rem (25px)
- Step 3: 1.953rem (31.25px)
- Step 4: 2.441rem (39.06px)
- Step 5: 3.052rem (48.83px)

Define these as design tokens (CSS custom properties) and use them consistently. Never invent a font size that does not exist on the scale.

### 2. Font Pairing Rules

Good font pairing follows two rules: **contrast in style, harmony in proportion.**

**Contrast in style** means pairing fonts that look visibly different — a serif with a sans-serif, a geometric sans with a humanist sans, a monospace with a proportional face. If two fonts look too similar, the pairing feels accidental rather than intentional.

**Harmony in proportion** means the fonts share similar x-height, cap-height, and overall weight, so they feel like they belong together even though they differ in style.

Practical pairing strategies:
- **One family, two weights:** The safest approach. Use a single variable font with distinct weights for headings (700) and body (400). No pairing risk.
- **Serif headings + sans body:** Classic editorial look. Example: Playfair Display + Source Sans 3.
- **Sans headings + serif body:** Modern but readable. Example: Inter + Lora.
- **Two sans-serifs:** Pair a geometric (Futura, Poppins) with a humanist (Source Sans, Noto Sans) for subtle contrast.

**Limit to two typefaces maximum.** Three is the absolute ceiling for complex projects. Every additional font adds HTTP requests, render cost, and visual noise.

### 3. Web Font Loading

Web fonts introduce a performance and user experience challenge. The browser must download font files before it can render text, creating two failure modes:

- **FOIT (Flash of Invisible Text):** Text is invisible until the font loads. Users see a blank page. This is the default behavior in most browsers.
- **FOUT (Flash of Unstyled Text):** Text renders in a fallback font, then swaps to the web font. There is a visible reflow.

**FOUT is better than FOIT.** Users can read content immediately. Control this with `font-display`:

| Value     | Behavior                                                    |
|-----------|-------------------------------------------------------------|
| `swap`    | Immediate fallback, swap when loaded. Best for body text.    |
| `optional`| Immediate fallback, swap only if font loads very quickly. Best for non-critical fonts. |
| `fallback`| Short invisible period (~100ms), then fallback, then swap.   |
| `block`   | Invisible for up to 3 seconds, then fallback. Avoid this.   |

**Optimal loading strategy:**

1. **Preload** the most critical font file (usually the body text regular weight):
   ```html
   <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
   ```

2. **Use `font-display: swap`** for primary fonts, `font-display: optional` for secondary or decorative fonts.

3. **Subset fonts** to include only the character sets you need (Latin, for example). Tools like `glyphhanger` or Google Fonts' `&text=` parameter can generate minimal subsets.

4. **Use variable fonts** when available. A single variable font file replaces multiple weight/style files, reducing HTTP requests and total download size.

5. **Self-host** for maximum control over caching, loading, and privacy (no third-party requests to Google Fonts).

### 4. Line Height, Letter Spacing, and Readability

Typography is not just font selection — spacing determines whether text is actually readable.

**Line height (`line-height`):**
- Body text: 1.5 to 1.75 (unitless). This provides enough vertical space for the eye to track lines without losing its place.
- Headings: 1.1 to 1.3 (unitless). Headings are short, so tight leading looks more intentional and visually cohesive.
- As font size increases, line height should decrease (proportionally). A 48px heading at 1.75 line height has absurdly large gaps.

**Letter spacing (`letter-spacing`):**
- Body text: 0 (normal). Most well-designed body fonts have optimal built-in spacing.
- Headings: -0.01em to -0.02em (slight tightening). Large text looks better slightly tightened.
- All-caps text: +0.05em to +0.1em (looser tracking). Uppercase letters need more spacing to remain legible.
- Small text: +0.01em to +0.02em. Small sizes benefit from slightly more space.

**Word spacing:** Almost never needs adjustment. Leave it at the default.

### 5. Measure / Line Length

Measure is the width of a line of text, typically expressed in characters per line. Research on reading comprehension consistently shows:

- **Optimal range:** 45 to 75 characters per line.
- **Ideal target:** ~66 characters per line.
- **Minimum readable:** 30 characters (narrow columns, mobile).
- **Maximum comfortable:** 90 characters (beyond this, eye tracking breaks down).

Control measure with `max-width` on the text container using the `ch` unit:

```css
.prose {
  max-width: 65ch;
}
```

The `ch` unit is relative to the width of the "0" glyph in the current font, making it a reliable proxy for character count.

**Do not set measure on the outer page container.** Set it on the text content element so that images, tables, and other non-text elements can still go full-width.

### 6. Color Theory Basics

The **60-30-10 rule** provides a reliable formula for color distribution:

- **60% — Dominant color:** Background and large surfaces. Usually a neutral (white, off-white, dark gray). This is the canvas.
- **30% — Secondary color:** Cards, sections, navigation, secondary surfaces. Provides visual structure and grouping.
- **10% — Accent color:** Buttons, links, active states, highlights. Draws the eye to interactive elements and key information.

**Color relationships (on the color wheel):**
- **Complementary** (opposite): High contrast, energetic. Use for emphasis, not large areas.
- **Analogous** (adjacent): Harmonious, calming. Good for gradient-like palettes.
- **Triadic** (120 degrees apart): Balanced variety. Use one as dominant, the other two as accents.
- **Split-complementary:** One base color plus the two colors adjacent to its complement. Versatile and less harsh than pure complementary.

### 7. Color Palette Construction

A production color palette is not just "pick a blue." It is a structured system:

**Primary color:** The brand color. Used for primary buttons, links, and key interactive elements. Generate 9-11 shades from very light (50) to very dark (950).

**Secondary color:** A supporting brand color. Same shade range. Used for secondary actions and visual variety.

**Neutral color:** Gray scale from near-white to near-black. This is the workhorse — used for text, borders, backgrounds, dividers, and disabled states. Generate at least 11 shades (50, 100, 200, ... 900, 950).

**Semantic colors:**
- **Success / Green:** Confirmations, completed states, positive metrics.
- **Warning / Yellow-Orange:** Caution states, non-critical alerts.
- **Error / Red:** Errors, destructive actions, validation failures.
- **Info / Blue:** Informational messages, neutral alerts.

Each semantic color needs its own shade range (at minimum: light background, default, dark/hover, and foreground text color).

**Design tokens structure:**

```
color.primary.50   → lightest tint (backgrounds)
color.primary.500  → default (buttons, links)
color.primary.700  → hover state
color.primary.900  → darkest shade (text on light bg)

color.neutral.0    → white
color.neutral.50   → lightest gray (page background)
color.neutral.900  → near-black (body text)
color.neutral.950  → darkest (headings)
```

### 8. Contrast Ratios (WCAG)

Contrast ratio measures the luminance difference between foreground and background colors. WCAG defines two conformance levels:

| Level   | Normal text (< 18pt / < 14pt bold) | Large text (>= 18pt / >= 14pt bold) |
|---------|-------------------------------------|--------------------------------------|
| **AA**  | 4.5 : 1                             | 3 : 1                                |
| **AAA** | 7 : 1                               | 4.5 : 1                              |

- **Target AA as the minimum.** All text must pass AA. This is a legal requirement in many jurisdictions.
- **Target AAA for body text** where possible. Body text is read for extended periods, so higher contrast reduces eye strain.
- **Non-text elements** (icons, borders, focus indicators) need at least 3:1 against adjacent colors (WCAG 1.4.11).
- **Interactive states** (hover, focus, active) must also meet contrast requirements against their backgrounds.

Test contrast with tools like WebAIM Contrast Checker, Stark (Figma plugin), or programmatically with the relative luminance formula.

### 9. Color Spaces (oklch, oklab)

Traditional CSS color spaces (`rgb`, `hsl`) are not perceptually uniform — a 10-degree hue shift in HSL produces wildly different perceived changes depending on where you are on the wheel. Blues and greens behave completely differently from yellows and reds.

**`oklch` and `oklab`** are perceptually uniform color spaces available in modern CSS:

- **`oklch(L C H)`:** Lightness (0-1), Chroma (0-0.4+), Hue (0-360). The most intuitive for building palettes because you can hold lightness constant and rotate hue, producing colors that genuinely look equally bright.
- **`oklab(L a b)`:** Lightness (0-1), green-red axis (a), blue-yellow axis (b). Better for blending and interpolation.

**Why this matters for palettes:**
- You can generate shade ramps by adjusting only the `L` (lightness) value in `oklch`, keeping chroma and hue constant. The resulting shades feel naturally related.
- Color interpolation in `oklch` (e.g., CSS gradients) avoids the muddy midpoints that `hsl` produces.

```css
:root {
  --blue-500: oklch(0.55 0.2 250);
  --blue-600: oklch(0.48 0.2 250);   /* darker, same chroma and hue */
  --blue-400: oklch(0.62 0.2 250);   /* lighter, same chroma and hue */
}
```

Browser support for `oklch` is excellent in 2026. Use it as the primary color space for new projects.

### 10. Color Accessibility

Contrast ratios are necessary but not sufficient. Accessible color use requires additional considerations:

- **Never rely on color alone** to convey information. A red/green status indicator is invisible to ~8% of males with color vision deficiency. Always pair color with a secondary cue: an icon, a text label, a pattern, or a shape change.
- **Colorblind-safe palettes:** Avoid red/green combinations as the sole differentiator. Blue/orange is a safer high-contrast pair. Tools like Coblis or Sim Daltonism can simulate color vision deficiencies.
- **Sufficient contrast in all states:** Hover, focus, active, disabled, selected. Each state must meet contrast minimums independently.
- **Link differentiation:** Links within body text must be distinguishable from surrounding text by more than just color. Add an underline (default) or ensure 3:1 contrast between link color and body text color plus an additional non-color indicator on hover/focus.
- **Dark mode:** Do not simply invert colors. Rebuild the palette for dark backgrounds — reduce chroma to avoid neon-like vibration, and verify all contrast ratios again.
- **High contrast mode:** Test with Windows High Contrast Mode and `forced-colors` media query. Ensure the interface remains usable when the OS overrides your colors.

---

## LLM Instructions

When an AI assistant is asked to work with typography and color, it should follow these directives:

### Creating Type Scales

1. **Ask for or determine the modular scale ratio.** If the user does not specify, default to 1.250 (major third) for general-purpose projects or 1.200 (minor third) for data-dense UIs.

2. **Generate the scale as CSS custom properties.** Use semantic names (`--text-xs` through `--text-4xl` or `--text-sm` through `--text-6xl`) and include the computed pixel value in a comment for reference.

3. **Make the scale fluid.** Use `clamp()` so each step smoothly transitions between a mobile min and a desktop max. The min and max should both be values from the scale — the mobile version uses one step lower, the desktop version uses the intended step.

4. **Include corresponding line-height values.** Pair each font-size token with an appropriate line-height: tighter for large sizes (1.1-1.3), looser for body sizes (1.5-1.75).

5. **Set the body line-height to at least 1.5.** This is a readability best practice. WCAG 1.4.12 (Text Spacing) requires that the page must not lose content or functionality when users override line-height to at least 1.5 times the font size.

6. **Constrain measure.** Always include a `.prose` or `.content` class with `max-width: 65ch` for long-form text containers.

### Building Color Palettes

1. **Generate a full shade range** for every palette color: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950. Use `oklch` as the color space, adjusting lightness linearly while keeping chroma and hue stable.

2. **Include semantic color tokens** mapped to the palette shades: `--color-success`, `--color-warning`, `--color-error`, `--color-info`. Each semantic token should also have `-light` (background), `-default`, `-dark` (hover/active), and `-text` (foreground on the colored background) variants.

3. **Test and annotate contrast ratios.** When generating a palette, include a comment or note for each shade indicating whether it passes AA or AAA contrast against white and against the darkest neutral. At minimum, verify that `color.primary.500` on white passes 4.5:1.

4. **Design for dark mode simultaneously.** When building a color system, generate both light and dark mode mappings from the start. Dark mode is not an afterthought — the shade assignments are different (e.g., `--color-bg` maps to `neutral.50` in light mode and `neutral.900` in dark mode).

5. **Use the 60-30-10 rule** when advising on color distribution. Suggest specific tokens for dominant, secondary, and accent usage.

### Checking Contrast Ratios

1. **Use the WCAG relative luminance formula.** When asked to check contrast, calculate relative luminance for both colors and apply the contrast ratio formula:
   ```
   L1 = lighter luminance, L2 = darker luminance
   ratio = (L1 + 0.05) / (L2 + 0.05)
   ```

2. **Report results against both AA and AAA** for both normal and large text thresholds.

3. **Suggest adjustments when contrast fails.** If a color pair does not meet the required ratio, suggest the closest shade from the palette that does pass, adjusting lightness in the failing direction.

### Implementing Web Font Loading

1. **Always recommend `font-display: swap`** for the primary text font. Use `font-display: optional` for decorative or secondary fonts.

2. **Include a `<link rel="preload">`** for the most critical font file (body text, regular weight).

3. **Recommend WOFF2 format only.** WOFF2 has universal browser support and the best compression. There is no need for WOFF, TTF, or EOT fallbacks in 2026.

4. **Suggest variable fonts** when the project uses multiple weights or styles of the same family.

5. **Include a system font fallback stack** that closely matches the web font's metrics to minimize layout shift during FOUT. Use `size-adjust`, `ascent-override`, and `descent-override` in the `@font-face` rule when possible.

### Designing Accessible Color Systems

1. **Pair every color indicator with a non-color cue.** When generating UI that uses color for status (success, error, warning), always include an icon, text label, or pattern as a redundant signal.

2. **Avoid red/green as the only differentiator.** Suggest blue/orange, blue/red, or shape-based differentiation as alternatives.

3. **Verify contrast for all interactive states.** When generating button styles, check contrast for default, hover, focus, active, and disabled states — not just the default.

4. **Test against color vision deficiency.** Recommend tools (Sim Daltonism, Chrome DevTools vision emulation) and note when a color combination may be problematic for deuteranopia (the most common type).

---

## Examples

### 1. Complete Type Scale as CSS Custom Properties

A production-ready type scale using the 1.250 (major third) ratio with fluid sizing.

```css
/* ================================================================
   TYPE SCALE — Major Third (1.250)
   Base: 1rem (16px) — Fluid between 320px and 1536px viewports
   ================================================================ */

:root {
  /* ---- Font Families ---- */
  --font-sans:  'Inter', 'Inter Fallback', system-ui, -apple-system, sans-serif;
  --font-serif: 'Lora', 'Lora Fallback', Georgia, 'Times New Roman', serif;
  --font-mono:  'JetBrains Mono', 'JetBrains Mono Fallback', ui-monospace,
                'Cascadia Code', 'Fira Code', monospace;

  /* ---- Font Sizes (fluid) ---- */
  --text-xs:   clamp(0.64rem,  0.61rem + 0.14vw, 0.75rem);   /* ~10px → 12px  */
  --text-sm:   clamp(0.8rem,   0.76rem + 0.18vw, 0.9rem);    /* ~13px → 14.4px */
  --text-base: clamp(1rem,     0.95rem + 0.22vw, 1.125rem);   /* 16px  → 18px   */
  --text-lg:   clamp(1.125rem, 1.04rem + 0.38vw, 1.35rem);   /* 18px  → 21.6px */
  --text-xl:   clamp(1.25rem,  1.11rem + 0.65vw, 1.625rem);  /* 20px  → 26px   */
  --text-2xl:  clamp(1.563rem, 1.32rem + 1.12vw, 2.25rem);   /* 25px  → 36px   */
  --text-3xl:  clamp(1.953rem, 1.56rem + 1.81vw, 3.052rem);  /* 31px  → 48.8px */
  --text-4xl:  clamp(2.441rem, 1.81rem + 2.92vw, 4.0rem);    /* 39px  → 64px   */

  /* ---- Line Heights ---- */
  --leading-none:    1;
  --leading-tight:   1.15;
  --leading-snug:    1.3;
  --leading-normal:  1.5;
  --leading-relaxed: 1.625;
  --leading-loose:   1.75;

  /* ---- Letter Spacing ---- */
  --tracking-tight:   -0.02em;
  --tracking-normal:   0;
  --tracking-wide:     0.025em;
  --tracking-wider:    0.05em;
  --tracking-widest:   0.1em;

  /* ---- Measure ---- */
  --measure-narrow:  45ch;
  --measure-normal:  65ch;
  --measure-wide:    80ch;

  /* ---- Font Weights ---- */
  --weight-normal:   400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;
  --weight-black:    900;
}

/* ---- Base Typography ---- */
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  letter-spacing: var(--tracking-normal);
  color: var(--color-neutral-900, #111827);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
}

h1 {
  font-size: var(--text-4xl);
  line-height: var(--leading-tight);
}

h2 {
  font-size: var(--text-3xl);
  line-height: var(--leading-tight);
}

h3 {
  font-size: var(--text-2xl);
  line-height: var(--leading-snug);
}

h4 {
  font-size: var(--text-xl);
  line-height: var(--leading-snug);
}

p, li, dd, blockquote {
  max-width: var(--measure-normal);
}

small, .text-sm {
  font-size: var(--text-sm);
}

.text-xs {
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
}

.text-caps {
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
}

code, kbd, samp, pre {
  font-family: var(--font-mono);
  font-size: 0.9em; /* slightly smaller than surrounding text */
}
```

**Key decisions:**
- Fluid `clamp()` values so no media-query jumps between sizes.
- Line heights tighten as font size increases — headings at 1.15, body at 1.5.
- Letter spacing loosens for small/uppercase text, tightens for headings.
- Measure set on text elements (`p`, `li`) rather than the page container.
- Monospace font uses `em` sizing so it scales relative to context.

### 2. Color Palette System with Semantic Tokens

A structured color system using `oklch` with semantic mappings for light and dark modes.

```css
/* ================================================================
   COLOR SYSTEM — oklch-based palette with semantic tokens
   ================================================================ */

:root {
  /* ---- Primary (Blue) ---- */
  --primary-50:  oklch(0.97 0.02 250);   /* Very light blue bg   */
  --primary-100: oklch(0.93 0.04 250);
  --primary-200: oklch(0.86 0.08 250);
  --primary-300: oklch(0.76 0.13 250);
  --primary-400: oklch(0.66 0.17 250);
  --primary-500: oklch(0.55 0.20 250);   /* Default — buttons     */
  --primary-600: oklch(0.48 0.19 250);   /* Hover                 */
  --primary-700: oklch(0.42 0.17 250);   /* Active / pressed      */
  --primary-800: oklch(0.35 0.14 250);
  --primary-900: oklch(0.28 0.11 250);
  --primary-950: oklch(0.20 0.08 250);   /* Darkest               */

  /* ---- Neutral (Slate) ---- */
  --neutral-0:   oklch(1.00 0 0);         /* White                */
  --neutral-50:  oklch(0.97 0.005 260);   /* Page background      */
  --neutral-100: oklch(0.93 0.005 260);
  --neutral-200: oklch(0.87 0.005 260);   /* Borders              */
  --neutral-300: oklch(0.79 0.005 260);
  --neutral-400: oklch(0.65 0.005 260);   /* Placeholder text     */
  --neutral-500: oklch(0.55 0.005 260);   /* Muted text           */
  --neutral-600: oklch(0.45 0.005 260);   /* Secondary text       */
  --neutral-700: oklch(0.37 0.01 260);
  --neutral-800: oklch(0.28 0.01 260);
  --neutral-900: oklch(0.20 0.01 260);    /* Body text            */
  --neutral-950: oklch(0.13 0.01 260);    /* Headings             */

  /* ---- Success (Green) ---- */
  --success-50:  oklch(0.96 0.04 150);
  --success-100: oklch(0.90 0.08 150);
  --success-500: oklch(0.55 0.18 150);
  --success-700: oklch(0.40 0.14 150);
  --success-950: oklch(0.20 0.06 150);

  /* ---- Warning (Amber) ---- */
  --warning-50:  oklch(0.97 0.04 85);
  --warning-100: oklch(0.92 0.08 85);
  --warning-500: oklch(0.65 0.18 85);
  --warning-700: oklch(0.50 0.15 85);
  --warning-950: oklch(0.25 0.06 85);

  /* ---- Error (Red) ---- */
  --error-50:  oklch(0.97 0.02 25);
  --error-100: oklch(0.91 0.06 25);
  --error-500: oklch(0.55 0.20 25);
  --error-700: oklch(0.40 0.17 25);
  --error-950: oklch(0.22 0.06 25);

  /* ---- Info (Cyan) ---- */
  --info-50:  oklch(0.96 0.03 210);
  --info-100: oklch(0.90 0.06 210);
  --info-500: oklch(0.55 0.15 210);
  --info-700: oklch(0.42 0.12 210);
  --info-950: oklch(0.22 0.05 210);
}

/* ================================================================
   SEMANTIC TOKENS — Light Mode (default)
   ================================================================ */
:root {
  /* Surfaces */
  --color-bg:          var(--neutral-0);
  --color-bg-subtle:   var(--neutral-50);
  --color-bg-muted:    var(--neutral-100);
  --color-surface:     var(--neutral-0);
  --color-surface-alt: var(--neutral-50);

  /* Text */
  --color-text:        var(--neutral-950);
  --color-text-body:   var(--neutral-900);
  --color-text-muted:  var(--neutral-600);
  --color-text-faint:  var(--neutral-400);

  /* Borders */
  --color-border:       var(--neutral-200);
  --color-border-strong: var(--neutral-300);

  /* Interactive */
  --color-link:         var(--primary-500);
  --color-link-hover:   var(--primary-700);
  --color-focus-ring:   var(--primary-400);

  /* Primary action */
  --color-primary:       var(--primary-500);
  --color-primary-hover: var(--primary-600);
  --color-primary-text:  var(--neutral-0);       /* White text on primary bg */

  /* Semantic feedback */
  --color-success-bg:    var(--success-50);
  --color-success:       var(--success-500);
  --color-success-text:  var(--success-700);

  --color-warning-bg:    var(--warning-50);
  --color-warning:       var(--warning-500);
  --color-warning-text:  var(--warning-700);

  --color-error-bg:      var(--error-50);
  --color-error:         var(--error-500);
  --color-error-text:    var(--error-700);

  --color-info-bg:       var(--info-50);
  --color-info:          var(--info-500);
  --color-info-text:     var(--info-700);
}

/* ================================================================
   SEMANTIC TOKENS — Dark Mode
   ================================================================ */
@media (prefers-color-scheme: dark) {
  :root {
    /* Surfaces */
    --color-bg:          var(--neutral-950);
    --color-bg-subtle:   var(--neutral-900);
    --color-bg-muted:    var(--neutral-800);
    --color-surface:     var(--neutral-900);
    --color-surface-alt: var(--neutral-800);

    /* Text */
    --color-text:        var(--neutral-50);
    --color-text-body:   var(--neutral-100);
    --color-text-muted:  var(--neutral-400);
    --color-text-faint:  var(--neutral-500);

    /* Borders */
    --color-border:       var(--neutral-700);
    --color-border-strong: var(--neutral-600);

    /* Interactive */
    --color-link:         var(--primary-300);
    --color-link-hover:   var(--primary-200);
    --color-focus-ring:   var(--primary-400);

    /* Primary action */
    --color-primary:       var(--primary-400);
    --color-primary-hover: var(--primary-300);
    --color-primary-text:  var(--neutral-950);

    /* Semantic — use lighter shades for backgrounds on dark */
    --color-success-bg:    var(--success-950);
    --color-success:       var(--success-500);
    --color-success-text:  var(--success-100);

    --color-warning-bg:    var(--warning-950);
    --color-warning:       var(--warning-500);
    --color-warning-text:  var(--warning-100);

    --color-error-bg:      var(--error-950);
    --color-error:         var(--error-500);
    --color-error-text:    var(--error-100);

    --color-info-bg:       var(--info-950);
    --color-info:          var(--info-500);
    --color-info-text:     var(--info-100);
  }
}
```

**Key decisions:**
- All raw colors defined in `oklch` for perceptual uniformity — adjusting lightness produces naturally consistent shades.
- Semantic tokens (`--color-bg`, `--color-text`) abstract away the raw palette, so components never reference `--neutral-900` directly.
- Dark mode remaps semantic tokens, not individual components. Components stay unchanged.
- Semantic feedback colors include background, default, and text variants for alerts, badges, and status indicators.

### 3. Web Font Loading Strategy

Optimal font loading with preload, `font-display`, fallback metrics, and a variable font.

```html
<head>
  <!-- 1. Preload the critical font file -->
  <link
    rel="preload"
    href="/fonts/inter-variable-latin.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />

  <!-- 2. Inline critical @font-face rules -->
  <style>
    /* ---- Primary font: Inter (variable, self-hosted) ---- */
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/inter-variable-latin.woff2') format('woff2');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC,
                     U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
                     U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212,
                     U+2215, U+FEFF, U+FFFD;
    }

    @font-face {
      font-family: 'Inter';
      src: url('/fonts/inter-italic-variable-latin.woff2') format('woff2');
      font-weight: 100 900;
      font-style: italic;
      font-display: swap;
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC,
                     U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
                     U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212,
                     U+2215, U+FEFF, U+FFFD;
    }

    /* ---- Fallback font with metric overrides ---- */
    /* Minimizes layout shift (CLS) during FOUT     */
    @font-face {
      font-family: 'Inter Fallback';
      src: local('Arial');
      size-adjust: 107.64%;
      ascent-override: 90%;
      descent-override: 22.43%;
      line-gap-override: 0%;
    }

    /* ---- Secondary font: Lora (optional, deferred) ---- */
    @font-face {
      font-family: 'Lora';
      src: url('/fonts/lora-variable-latin.woff2') format('woff2');
      font-weight: 400 700;
      font-style: normal;
      font-display: optional;  /* Only swap if loaded very fast */
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC,
                     U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
                     U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212,
                     U+2215, U+FEFF, U+FFFD;
    }

    /* ---- Font stacks ---- */
    :root {
      --font-sans:  'Inter', 'Inter Fallback', system-ui, -apple-system,
                    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      --font-serif: 'Lora', Georgia, 'Times New Roman', Times, serif;
    }
  </style>
</head>
```

**Key decisions:**
- **Preload** only the single most critical font file (Inter, the body text font). Preloading everything defeats the purpose.
- **Variable font** replaces separate files for Regular, Medium, Semibold, and Bold. One HTTP request for all weights.
- **`font-display: swap`** for Inter — body text must render immediately, even in the fallback font.
- **`font-display: optional`** for Lora — this is a secondary/decorative font. If it does not load in time, the fallback is acceptable.
- **Fallback metric overrides** (`size-adjust`, `ascent-override`, etc.) on `'Inter Fallback'` minimize the visual shift when Inter loads and replaces Arial.
- **`unicode-range`** ensures the browser only downloads the font file when Latin characters are present on the page.
- **Self-hosted** fonts for full control over caching headers and no third-party network dependency.

### 4. Contrast Ratio Checker Logic

A JavaScript utility to calculate WCAG contrast ratios and evaluate compliance.

```javascript
/**
 * WCAG 2.x Contrast Ratio Checker
 *
 * Calculates the contrast ratio between two colors and evaluates
 * compliance against AA and AAA thresholds for normal and large text.
 */

/**
 * Parse a hex color string to an { r, g, b } object (0-255).
 * Supports #RGB, #RRGGBB, #RGBA, and #RRGGBBAA formats.
 */
function parseHex(hex) {
  let h = hex.replace('#', '');

  // Expand shorthand (#RGB → #RRGGBB)
  if (h.length === 3 || h.length === 4) {
    h = h.split('').map(c => c + c).join('');
  }

  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Calculate the relative luminance of a color per WCAG 2.x.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * @param {{ r: number, g: number, b: number }} color — sRGB values 0-255
 * @returns {number} Relative luminance (0 to 1)
 */
function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const srgb = c / 255;
    return srgb <= 0.04045
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate the WCAG contrast ratio between two colors.
 *
 * @param {string} foreground — hex color (e.g. "#1a1a2e")
 * @param {string} background — hex color (e.g. "#ffffff")
 * @returns {number} Contrast ratio (1 to 21)
 */
function contrastRatio(foreground, background) {
  const lumFg = relativeLuminance(parseHex(foreground));
  const lumBg = relativeLuminance(parseHex(background));

  const lighter = Math.max(lumFg, lumBg);
  const darker  = Math.min(lumFg, lumBg);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluate WCAG compliance for a contrast ratio.
 *
 * @param {number} ratio — contrast ratio
 * @returns {object} Compliance results
 */
function evaluateCompliance(ratio) {
  return {
    ratio: Math.round(ratio * 100) / 100,

    normalText: {
      aa:  ratio >= 4.5,   // WCAG AA: 4.5:1 for normal text
      aaa: ratio >= 7.0,   // WCAG AAA: 7:1 for normal text
    },

    largeText: {
      aa:  ratio >= 3.0,   // WCAG AA: 3:1 for large text (>=18pt or >=14pt bold)
      aaa: ratio >= 4.5,   // WCAG AAA: 4.5:1 for large text
    },

    nonText: {
      aa:  ratio >= 3.0,   // WCAG 1.4.11: 3:1 for UI components and graphics
    },
  };
}

/**
 * Full contrast check with human-readable output.
 *
 * @param {string} fg — foreground hex color
 * @param {string} bg — background hex color
 * @returns {object} Complete contrast report
 */
function checkContrast(fg, bg) {
  const ratio = contrastRatio(fg, bg);
  const compliance = evaluateCompliance(ratio);

  return {
    foreground: fg,
    background: bg,
    ...compliance,

    summary: [
      `Contrast ratio: ${compliance.ratio}:1`,
      `Normal text — AA: ${compliance.normalText.aa ? 'PASS' : 'FAIL'}, AAA: ${compliance.normalText.aaa ? 'PASS' : 'FAIL'}`,
      `Large text  — AA: ${compliance.largeText.aa ? 'PASS' : 'FAIL'}, AAA: ${compliance.largeText.aaa ? 'PASS' : 'FAIL'}`,
      `Non-text    — AA: ${compliance.nonText.aa ? 'PASS' : 'FAIL'}`,
    ].join('\n'),
  };
}

// ---- Usage Examples ----

// Check dark text on white background
console.log(checkContrast('#1a1a2e', '#ffffff').summary);
// Contrast ratio: 16.95:1
// Normal text — AA: PASS, AAA: PASS
// Large text  — AA: PASS, AAA: PASS
// Non-text    — AA: PASS

// Check a blue button with white text
console.log(checkContrast('#ffffff', '#2563eb').summary);
// Contrast ratio: 4.56:1
// Normal text — AA: PASS, AAA: FAIL
// Large text  — AA: PASS, AAA: PASS
// Non-text    — AA: PASS

// Check a light gray that fails
console.log(checkContrast('#9ca3af', '#ffffff').summary);
// Contrast ratio: 2.85:1
// Normal text — AA: FAIL, AAA: FAIL
// Large text  — AA: FAIL, AAA: FAIL
// Non-text    — AA: FAIL

// ---- Batch palette checker ----
function checkPalette(palette, backgrounds = ['#ffffff', '#000000']) {
  const results = [];

  for (const [name, hex] of Object.entries(palette)) {
    for (const bg of backgrounds) {
      const ratio = contrastRatio(hex, bg);
      const comp = evaluateCompliance(ratio);
      results.push({
        color: name,
        hex,
        background: bg,
        ratio: comp.ratio,
        aa_normal: comp.normalText.aa,
        aaa_normal: comp.normalText.aaa,
      });
    }
  }

  return results;
}

// Check an entire palette at once
const palette = {
  'primary-400': '#60a5fa',
  'primary-500': '#3b82f6',
  'primary-600': '#2563eb',
  'primary-700': '#1d4ed8',
  'neutral-500': '#6b7280',
  'neutral-600': '#4b5563',
  'neutral-700': '#374151',
};

console.table(checkPalette(palette));
```

**Key decisions:**
- Implements the exact WCAG 2.x relative luminance algorithm (sRGB linearization + weighted sum).
- Evaluates against all four thresholds: AA/AAA for both normal and large text.
- Includes a batch checker (`checkPalette`) for validating an entire design system at once.
- Reports both pass/fail booleans and a human-readable summary string.
- Accepts standard hex input — the most common format in design tools and CSS.

---

## Common Mistakes

### 1. No Type Scale — Arbitrary Font Sizes
**Wrong:** Picking font sizes ad hoc: 13px here, 17px there, 22px somewhere else. No mathematical relationship, no visual rhythm.

**Fix:** Choose a modular scale ratio, generate the full scale, define it as CSS custom properties, and use only those values. If a size is not on the scale, it should not exist in your CSS.

### 2. Too Many Typefaces
**Wrong:** Using three or four different font families — one for headings, one for body, one for navigation, one for code. Every font adds HTTP requests, loading complexity, and visual noise.

**Fix:** Limit to two typefaces maximum. Use weight, size, and spacing to create hierarchy within a single family.

### 3. Body Line Height Below 1.5
**Wrong:** Setting `line-height: 1.2` on body text. Lines are too close together, making it difficult to track from the end of one line to the beginning of the next. This is also a WCAG violation (1.4.12).

**Fix:** Use `line-height: 1.5` as the minimum for body text. For long-form reading, 1.625 to 1.75 is more comfortable.

### 4. Lines Longer Than 80 Characters
**Wrong:** A `<p>` element stretching across the full width of a 1440px viewport. At 100+ characters per line, readers lose their place when tracking back to the next line.

**Fix:** Set `max-width: 65ch` on text containers. Use the `ch` unit for a font-relative measure.

### 5. Relying on Color Alone for Meaning
**Wrong:** A form with red borders on invalid fields and green borders on valid fields, with no other indicator. Users with red-green color vision deficiency cannot distinguish them.

**Fix:** Pair every color indicator with a secondary cue: an icon (checkmark / exclamation), a text label ("Error: field is required"), or a pattern (dashed border vs. solid).

### 6. Insufficient Contrast Ratios
**Wrong:** Light gray (#9ca3af) text on a white (#ffffff) background. The contrast ratio is ~2.85:1, far below the 4.5:1 AA minimum.

**Fix:** Use a contrast checker during development. For light backgrounds, body text should be at least `neutral-700` or darker. For dark backgrounds, body text should be at least `neutral-200` or lighter.

### 7. Using `font-display: block`
**Wrong:** Setting `font-display: block` (or relying on the browser default, which is effectively `block` in many browsers). Text is invisible for up to 3 seconds while the font loads — users stare at a blank page.

**Fix:** Use `font-display: swap` for primary text fonts. Use `font-display: optional` for decorative fonts you can live without.

### 8. Not Preloading the Critical Font
**Wrong:** Declaring fonts only in CSS. The browser discovers the font file only after it parses the stylesheet, which happens after the HTML downloads. This delays the font request.

**Fix:** Add `<link rel="preload" href="/fonts/your-font.woff2" as="font" type="font/woff2" crossorigin>` in the `<head>` for the primary body font. Do not preload every font — only the most critical one.

### 9. Building Colors in HSL and Expecting Perceptual Uniformity
**Wrong:** Generating a shade ramp in HSL by decrementing lightness by 10% per step. The resulting shades look uneven — some steps are dramatic, others barely noticeable — because HSL is not perceptually uniform.

**Fix:** Use `oklch` for palette generation. Decrementing the `L` (lightness) value in `oklch` produces steps that look evenly spaced to the human eye.

### 10. No Dark Mode Consideration in the Color System
**Wrong:** Building a color palette with only light mode tokens, then bolting on dark mode later by crudely inverting colors. The result is neon-bright primary colors vibrating on dark backgrounds, inverted semantic colors that lose their meaning, and widespread contrast failures.

**Fix:** Design the color token system for both modes from the start. Use a semantic token layer (`--color-bg`, `--color-text`) that remaps to different palette shades per mode. Reduce chroma slightly in dark mode to avoid visual vibration.

---

> **See also:** [Design-Systems](../Design-Systems/design-systems.md) | [Accessibility](../Accessibility/accessibility.md) | [Dark-Mode](../Dark-Mode/dark-mode.md)
>
> **Last reviewed:** 2026-02
