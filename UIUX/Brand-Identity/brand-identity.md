# Brand Identity & Style Guide

> Your brand is not a logo and a hex code. It is a system of visual and verbal decisions that make every screen feel like it belongs to the same product. This guide teaches you how to define that system so an AI assistant can generate on-brand UI from the first prompt.

---

## Principles

### 1. What Brand Identity Means in Code

Brand identity is the gap between "an AI built this" and "this feels like *our* product." Without brand context, every AI-generated interface converges on the same generic output: a blue primary button, Inter or system-ui font, 8px border radius, white background, and copy that sounds like a template. It is competent but forgettable.

When you provide brand context -- your colors, typography personality, component aesthetic, voice, and values -- the AI generates code that feels intentional. The button is not just blue; it is your specific shade of indigo with your rounded corners and your label that says "Let's go" instead of "Submit." The card does not just have a shadow; it has *your* shadow, at *your* elevation, with *your* spacing that says "premium" or "dense" or "playful."

Brand identity in code means:

- **Color tokens** derived from your brand palette, not a generic Tailwind default.
- **Typography choices** that carry your personality -- a geometric sans for a tech product, a serif for an editorial brand, a rounded sans for a friendly consumer app.
- **Component aesthetics** -- border radius, shadows, border treatment, spacing -- that consistently reinforce the brand's visual language.
- **Voice and tone** applied to every piece of UI copy: buttons, errors, empty states, loading messages, tooltips, and confirmation dialogs.
- **Consistency** across every screen, every file, every developer, every AI session.

The single most effective thing a vibe coder can do to improve AI output quality is to define their brand and paste it into every session.

### 2. Visual Identity System

A visual identity system is the collection of design decisions that make your product recognizable. Each decision should be deliberate and documented.

#### Brand Colors

Every brand needs a structured color system, not just "our blue is #2563EB."

**Primary color:** The single most recognizable brand color. It appears on primary buttons, active states, links, and key interactive elements. Generate a full shade ramp (50--950) so you have light tints for backgrounds and dark shades for hover/active states and dark mode.

**Secondary color:** A supporting color that provides visual variety without competing with the primary. Used for secondary buttons, tags, category indicators, and accent surfaces. If your brand does not have a distinct secondary color, a complementary or analogous hue works.

**Neutral color:** The workhorse. Your grays (or warm grays, or cool grays, or slate) are used for text, borders, backgrounds, dividers, and disabled states. The neutral palette should have at least 11 shades (50 through 950). Warm neutrals feel approachable; cool neutrals feel professional; pure grays feel technical.

**Semantic colors:** Success (green), warning (amber/yellow), error (red), info (blue/cyan). These are functional, not brand-specific, but your brand influences their exact hue. A playful brand might use warmer reds and greens; a corporate brand might use muted, desaturated variants.

**Color psychology basics:**

| Hue family | Common associations | Brand fit |
|---|---|---|
| Blue | Trust, stability, professionalism | Finance, enterprise, healthcare |
| Green | Growth, nature, success, money | Sustainability, fintech, health |
| Purple | Creativity, luxury, wisdom | Creative tools, premium products |
| Red/Orange | Energy, urgency, passion | Food, entertainment, sales |
| Yellow | Optimism, warmth, attention | Consumer apps, education |
| Pink | Playfulness, care, warmth | Social, beauty, wellness |
| Black/Dark | Sophistication, power, luxury | Fashion, luxury, premium |
| Neutral/Minimal | Simplicity, content-first | Productivity, developer tools |

#### Typography Personality

Fonts carry personality before a single word is read.

| Font category | Personality | Brand fit |
|---|---|---|
| Geometric sans (Futura, Poppins, Outfit) | Modern, clean, confident | Tech, startups, consumer apps |
| Humanist sans (Source Sans, Noto Sans, Open Sans) | Friendly, approachable, readable | Healthcare, education, government |
| Neo-grotesque (Inter, Helvetica, SF Pro) | Neutral, professional, versatile | Enterprise, SaaS, dashboards |
| Rounded sans (Nunito, Varela Round, Comfortaa) | Playful, warm, approachable | Kids, consumer, social |
| Serif (Lora, Playfair, Merriweather) | Traditional, authoritative, editorial | Publishing, legal, luxury |
| Monospace (JetBrains Mono, Fira Code) | Technical, precise, developer-first | Dev tools, code editors, tech docs |
| Slab serif (Roboto Slab, Zilla Slab) | Bold, impactful, grounded | Marketing, headlines, statements |

Choose one primary font (for headings and body) or a pair (heading font + body font). Never use more than two. Your font choice communicates brand personality more than any other single decision.

#### Logo Treatment

Document how your logo behaves across contexts:

- **Minimum size:** The smallest pixel dimension at which the logo remains legible.
- **Clear space:** The minimum padding around the logo (usually defined as a fraction of the logo's height, e.g., "0.5x logo height on all sides").
- **Color variants:** Full color, single color (for dark/light backgrounds), monochrome, reversed.
- **Favicon:** A simplified version for 16x16 and 32x32 icons. Often just the logomark without the wordmark.
- **Dark mode:** Which logo variant to use on dark backgrounds.

#### Spacing Personality

Spacing communicates brand personality as powerfully as color or type:

- **Generous spacing** (large padding, wide gaps, ample white space) = premium, luxury, calm, editorial.
- **Moderate spacing** (standard 16px/24px rhythm) = professional, balanced, SaaS.
- **Tight spacing** (compact padding, narrow gaps, dense layouts) = productive, data-rich, power-user tools.

Define your spacing scale (e.g., 4px base grid: 4, 8, 12, 16, 24, 32, 48, 64, 96) and document whether your brand tends toward the generous or tight end.

#### Imagery Style

What do images look like in your product?

- **Photography style:** Bright and airy? Moody and contrasty? Candid or staged? Overhead flat-lay or eye-level?
- **Illustration style:** Flat vector? Isometric? Hand-drawn? 3D rendered? Line art?
- **Icon style:** Outlined (Lucide, Heroicons outline)? Filled (Heroicons solid)? Duotone? Rounded? Sharp?
- **Patterns/textures:** Gradients? Noise textures? Geometric patterns? Clean solid colors?

#### Component Aesthetic

These low-level design decisions define how every component in your system looks:

| Decision | Options | Impact |
|---|---|---|
| **Border radius** | 0 (sharp) / 4-6px (subtle) / 8-12px (rounded) / 16-24px (pill-like) / full (circular) | Sharp = serious, minimal. Rounded = friendly, modern. Pill = playful, consumer. |
| **Shadows** | None / subtle (0 1px 2px) / medium (0 4px 12px) / dramatic (0 20px 40px) | No shadows = flat, modern. Subtle = refined. Dramatic = layered, premium. |
| **Borders** | None / hairline (1px) / medium (2px) / thick (3px+) | No borders + shadows = Material/Apple style. Borders + no shadows = GitHub/Linear style. |
| **Button style** | Filled / outlined / ghost / gradient | Filled = primary default. Outlined = secondary. Ghost = tertiary. Gradient = marketing/consumer. |
| **Input style** | Bordered box / underline only / filled background | Bordered = standard. Underline = Material Design. Filled = modern (shadcn/ui style). |
| **Card style** | Bordered / elevated (shadow) / flat with subtle bg / glass (backdrop-blur) | Matches overall shadow and border philosophy. |

### 3. Voice & Tone

Voice is *who you are*. It stays constant. Tone is *how you adapt* to the situation. Your voice might be "friendly and clear" but your tone when displaying a payment error is more serious than when celebrating a milestone.

#### Voice Attributes Table

Define your brand voice with "This / Not That" pairs:

| We are... | We are NOT... |
|---|---|
| Friendly | Overly casual or slangy |
| Clear | Verbose or jargon-heavy |
| Confident | Arrogant or dismissive |
| Helpful | Patronizing or hand-holdy |
| Professional | Stiff or corporate |
| Concise | Terse or abrupt |

#### Formality Spectrum

Where does your brand fall?

```
Very casual  ←————————————————————→  Very formal
  "Yep!"     "Got it!"  "Done."  "Your changes have been saved."  "Transaction completed successfully."
```

Most modern SaaS products sit in the center: clear, human, professional without being stiff.

#### How UI Copy Should Sound

Every piece of UI copy carries your voice:

| UI element | Generic | Friendly brand | Professional brand | Playful brand |
|---|---|---|---|---|
| **Primary button** | Submit | Save changes | Confirm | Let's go! |
| **Empty state** | No data | Nothing here yet. Create your first project to get started. | No records found. Use the button above to create an entry. | It's pretty empty in here. Time to make something awesome! |
| **Error message** | Error occurred | Something went wrong. Please try again. | An unexpected error occurred. If this persists, contact support. | Oops, that didn't work. Give it another shot? |
| **Loading** | Loading... | Hang tight... | Loading your data... | Almost there... |
| **Success** | Success | All set! | Changes saved successfully. | Nailed it! |
| **Destructive confirm** | Are you sure? | This can't be undone. Delete this project? | Permanently delete this project? This action is irreversible. | Whoa, this is permanent. Delete this project for real? |
| **404 page** | Not found | This page doesn't exist. Let's get you back home. | The requested page could not be found. Return to dashboard. | You've wandered off the map. Let's head back! |

### 4. Brand Strategy Foundations

Before picking colors and fonts, you need clarity on what your brand *is*. These foundational decisions inform every visual and verbal choice:

**Brand positioning:** What category are you in, and what makes you different? "We are [category] for [audience] that [differentiator]." Example: "We are project management for design teams that prioritizes visual workflows over text-heavy Gantt charts."

**Target audience:** Who are you building for? Demographics, psychographics, technical proficiency, and context of use. A developer tool has a different aesthetic than a consumer wellness app, even if both are "modern and clean."

**Brand values (3-5):** The non-negotiable principles that guide every decision. Examples: Simplicity, Transparency, Craft, Speed, Delight. These values should be visible in the product -- "craft" means polished animations and pixel-perfect alignment; "speed" means minimal UI and fast interactions.

**Brand promise:** The one thing users can always expect from your product. "It will always be fast." "It will never feel complicated." "It will respect your privacy." The brand promise constrains design decisions -- a brand that promises simplicity cannot ship a settings page with 47 toggles.

**Competitive differentiation:** How does your visual identity distinguish you from competitors? If every competitor uses blue, maybe your brand uses purple or green. If competitors feel corporate, maybe you feel warm and approachable.

### 5. Brand Consistency in AI-Generated Code

AI coding assistants produce generic output by default. Without brand context, an AI will:

- Use Tailwind's default blue-600 for primary actions.
- Default to `rounded-md` (6px) border radius.
- Use Inter or system-ui as the font stack.
- Write copy that sounds like documentation: "Successfully created," "Error: invalid input," "No items found."
- Apply standard 16px padding everywhere.
- Use neutral gray shadows and borders.

This is not wrong -- it is just not *your* brand. The gap between "generic competent UI" and "this feels like our product" is closed by providing the AI with a Brand Brief.

**Why consistency degrades across sessions:** Each AI conversation starts with no memory of previous sessions. Without a persistent brand brief, every new feature, every new page, every new developer will produce slightly different interpretations. Button radius drifts. Color usage becomes inconsistent. Copy tone varies between screens. Over time, the product feels assembled rather than designed.

**The fix:** A Brand Brief -- a single, copy-pasteable document that you include at the start of every AI coding session. It contains all the decisions from this guide in a format the AI can act on immediately.

### 6. The Brand Brief Concept

A Brand Brief is a fill-in-the-blank document that captures every brand decision in a structured, LLM-consumable format. It is:

- **Self-contained.** Everything the AI needs in one file.
- **Copy-pasteable.** Designed to be pasted directly into an AI session.
- **Actionable.** Not vague strategy ("we value innovation") but concrete decisions ("primary color: oklch(0.55 0.2 260), border radius: 12px, button text: sentence case, voice: friendly and clear").
- **Living.** Updated as the brand evolves.

The Brief replaces the need for the AI to guess or ask questions about brand preferences. Every session starts with the same foundation, producing consistent output across developers, sessions, and time.

---

## LLM Instructions

When an AI assistant receives a Brand Brief or is asked to work with brand identity, follow these directives:

### Applying Brand Colors

1. **Map brand colors to design tokens.** When a Brand Brief specifies a primary color, generate the full shade ramp (50--950) using oklch lightness scaling. Map shades to semantic tokens: `--color-primary` (500 for light mode, 400 for dark mode), `--color-primary-hover` (600/300), `--color-primary-soft` (50/950), `--color-on-primary` (white or dark depending on contrast).

2. **Apply the 60-30-10 rule.** Use the neutral palette for 60% of the interface (backgrounds, text, borders). Use secondary/surface colors for 30% (cards, sections, navigation). Use the primary/accent color for 10% (buttons, active states, links, badges).

3. **Generate dark mode variants automatically.** When creating tokens from brand colors, always produce both light and dark mode mappings. In dark mode: use lighter shades (300--400) for primary interactive elements, use the 950 shade for soft backgrounds, reduce chroma slightly to avoid vibrating neon on dark surfaces.

4. **Test contrast ratios.** Verify that the brand's primary color on white (and on dark mode surface) meets WCAG AA (4.5:1 for text, 3:1 for UI elements). If it does not, suggest the nearest passing shade and note the adjustment.

### Applying Brand Typography

1. **Use the exact font specified in the Brief.** If the Brief says "Outfit for headings, Inter for body," use those fonts. Include proper `@font-face` declarations with `font-display: swap`, preload hints for the primary font, and a system font fallback stack.

2. **Match the type scale to the brand personality.** Generous/editorial brands use larger scale ratios (1.333+). Dense/productive brands use tighter ratios (1.125--1.200). Default to 1.250 (major third) if not specified.

3. **Apply letter spacing and weight conventions.** For headings: use the brand's specified weight (often 600--700) with slight negative tracking (-0.01em to -0.02em). For body: use 400 weight with normal tracking. For labels/caps: use wider tracking (+0.05em).

### Applying Component Aesthetic

1. **Use the brand's border radius consistently.** If the Brief says "12px radius," apply it to buttons, cards, inputs, modals, dropdowns, and tooltips. Use smaller radii (half) for small elements (badges, tags) and larger radii for large containers (modal, page sections) -- but maintain proportional consistency.

2. **Use the brand's shadow style.** If the brand uses shadows, apply the specified elevation levels. If the brand uses borders instead of shadows, do not add shadows to components. Match the Brief's component aesthetic philosophy.

3. **Use the brand's spacing scale.** If the Brief specifies "generous spacing," use the larger end of the spacing scale for padding and gaps. If "compact," use the tighter end. Maintain the 4px or 8px grid.

### Applying Voice and Tone

1. **Write all UI copy in the brand's voice.** Reference the voice attributes table. If the brand is "friendly and clear," write "Something went wrong. Please try again." not "Error: unexpected server response (code 500)."

2. **Adapt tone to context.** Celebratory moments (success, milestones) can be warmer and more expressive. Error states should be clear and empathetic. Destructive actions should be direct and serious regardless of overall brand playfulness.

3. **Use the formality level specified.** If the brand sits at "professional but human," avoid both corporate stiffness ("Transaction processed successfully") and excessive casualness ("Yay! You did it!").

4. **Apply copy conventions consistently.** If the Brief specifies sentence case for buttons, do not use UPPERCASE or Title Case. If the Brief specifies "we" voice in UI copy, maintain that across all screens.

### Maintaining Consistency Across Files

1. **Reference the same token names everywhere.** Use `var(--color-primary)` not `#2563eb`. Use `var(--radius-md)` not `8px`. Tokens are the consistency mechanism.

2. **When creating new components,** review the Brief's component aesthetic before writing code. New components should match existing ones in radius, shadow, border treatment, padding, and copy tone.

3. **When generating multi-page flows,** ensure that navigation, headers, buttons, and typography are identical across all pages. Do not subtly drift in spacing or color usage between screens.

### When No Brand Brief Is Provided

1. **Ask.** Before generating UI, ask the user about their brand: "Do you have brand colors, a preferred font, or a style reference? Even a website URL or screenshot helps me match your brand."

2. **If the user cannot provide brand context,** default to a clean, neutral system: neutral gray palette, Inter or system-ui font, 8px border radius, subtle shadows, professional-but-friendly copy tone. This is the safest generic output.

3. **Never invent a brand.** Do not randomly choose a purple primary color or a playful tone unless the user explicitly requests it. Generic and neutral is better than an arbitrary brand the user did not choose.

---

## Examples

### 1. Complete Brand Brief Template

Copy this template, fill in the blanks, and paste it at the start of every AI coding session.

~~~markdown
# Brand Brief — [Your Product Name]

## Brand Strategy
- **Positioning:** We are [category] for [target audience] that [key differentiator].
- **Target audience:** [Who they are, what they need, their technical level]
- **Values:** [3-5 core values, e.g., Simplicity, Speed, Craft]
- **Brand promise:** [The one thing users can always expect]
- **Competitors:** [2-3 competitors and how you differ visually/tonally]

## Colors
- **Primary:** [hex or oklch value, e.g., #6366f1 / oklch(0.55 0.2 285)]
- **Secondary:** [hex or oklch value, or "derive from primary" / "none"]
- **Neutral base:** [warm gray / cool gray / pure gray / slate]
- **Accent (if different from primary):** [hex or "same as primary"]
- **Dark mode approach:** [Auto-generate from primary / custom values below]
  - Dark primary: [if custom]
  - Dark surface: [if custom, e.g., #1a1a2e]

## Typography
- **Heading font:** [Font name, e.g., "Outfit"]
- **Body font:** [Font name, e.g., "Inter"]
- **Mono font:** [Font name, e.g., "JetBrains Mono"]
- **Type scale ratio:** [e.g., 1.250 major third / 1.200 minor third / "default"]
- **Heading weight:** [e.g., 700 / 600]
- **Body weight:** [e.g., 400]

## Component Aesthetic
- **Border radius:** [e.g., 8px / 12px / 16px / "fully rounded"]
- **Shadows:** [none / subtle / medium / dramatic]
- **Borders:** [hairline (1px) / none / medium (2px)]
- **Button style:** [filled / outlined / gradient]
- **Input style:** [bordered / underline / filled background]
- **Card style:** [bordered / elevated / flat / glass]
- **Spacing personality:** [generous / moderate / compact]
- **Spacing base grid:** [4px / 8px]

## Imagery & Icons
- **Icon set:** [Lucide / Heroicons / Phosphor / Tabler / custom]
- **Icon style:** [outline / solid / duotone]
- **Illustration style:** [flat / isometric / hand-drawn / 3D / none]
- **Photography style:** [bright / moody / candid / N/A]

## Voice & Tone
- **Voice attributes:** [e.g., "Friendly, clear, confident — not slangy, not corporate"]
- **Formality level:** [casual / professional-human / formal]
- **Button label convention:** [sentence case / Title Case / UPPERCASE]
- **Pronoun preference:** ["we" / "you" / neutral/impersonal]
- **Error tone:** [empathetic / direct / minimal]
- **Copy examples:**
  - Primary button: [e.g., "Save changes"]
  - Empty state: [e.g., "Nothing here yet. Create your first project."]
  - Success message: [e.g., "All set!"]
  - Error message: [e.g., "Something went wrong. Please try again."]
  - Loading: [e.g., "Loading..."]
  - Destructive confirm: [e.g., "This can't be undone. Delete this project?"]

### Motion & Animation

**Animation personality:** [e.g., snappy and decisive / gentle and flowing / bouncy and playful]
**Default easing:** [e.g., ease-out for entrances, ease-in for exits]
**Duration range:** [e.g., 150-300ms for micro-interactions, 300-500ms for transitions]
**Micro-interactions:** [e.g., button scale on press, card hover lift, input focus glow]
**Loading style:** [e.g., skeleton screens / spinner / progress bar / pulsing dots]
**Reduced motion approach:** [e.g., fade-only / instant / simplified]

## Additional Notes
[Anything else: specific patterns, layout preferences, reference URLs, screenshots]
~~~

### 2. Filled Brand Brief — "Flowline" (Fictional SaaS Project Management Tool)

~~~markdown
# Brand Brief — Flowline

## Brand Strategy
- **Positioning:** We are project management for small creative teams that replaces rigid Gantt charts with visual, flexible workflows.
- **Target audience:** Designers, marketers, and small agency teams (3-20 people). Non-technical but digitally fluent. They value aesthetics and simplicity.
- **Values:** Clarity, Speed, Craft, Delight
- **Brand promise:** It will always feel simple, even as your projects get complex.
- **Competitors:** Asana (feels corporate), Monday.com (feels busy), Linear (feels developer-focused). We feel warmer, more visual, and less overwhelming.

## Colors
- **Primary:** oklch(0.55 0.22 285) — a vibrant indigo
- **Secondary:** oklch(0.70 0.15 160) — a soft teal for accents and tags
- **Neutral base:** warm gray (slight warm undertone, not pure gray)
- **Accent:** same as primary
- **Dark mode approach:** Auto-generate. Dark surface should feel warm, not cold-blue.
  - Dark surface: #1c1917 (stone-950 equivalent)

## Typography
- **Heading font:** "Outfit" (geometric sans — modern, friendly, confident)
- **Body font:** "Inter" (neutral, highly readable at all sizes)
- **Mono font:** "JetBrains Mono"
- **Type scale ratio:** 1.250 (major third)
- **Heading weight:** 600 (semibold — confident but not heavy)
- **Body weight:** 400

## Component Aesthetic
- **Border radius:** 12px (rounded, friendly feel)
- **Shadows:** subtle (0 1px 3px for cards, 0 4px 12px for elevated elements)
- **Borders:** hairline (1px) in light mode, subtle in dark mode
- **Button style:** filled primary, outlined secondary, ghost tertiary
- **Input style:** bordered box with 12px radius
- **Card style:** bordered + subtle shadow (both)
- **Spacing personality:** generous (premium, breathing room)
- **Spacing base grid:** 4px

## Imagery & Icons
- **Icon set:** Lucide
- **Icon style:** outline (1.5px stroke, matching Lucide defaults)
- **Illustration style:** flat vector with brand indigo and teal accents
- **Photography style:** N/A (product is illustration-driven)

## Voice & Tone
- **Voice attributes:** Friendly, clear, encouraging — not slangy, not corporate, not robotic
- **Formality level:** professional-human (center of the spectrum)
- **Button label convention:** sentence case ("Save changes" not "Save Changes")
- **Pronoun preference:** "you" for user-facing, "we" for company communications
- **Error tone:** empathetic and helpful
- **Copy examples:**
  - Primary button: "Save changes"
  - Empty state: "No projects yet. Create your first one — it only takes a sec."
  - Success message: "All set! Your changes are saved."
  - Error message: "Something went wrong. Give it another try, or reach out to us if it keeps happening."
  - Loading: "Loading your workspace..."
  - Destructive confirm: "This can't be undone. Are you sure you want to delete this project?"
~~~

### 3. Brand Brief to Code Implementation

Given the Flowline brief above, here is how it translates to actual code:

#### CSS Design Tokens

```css
/* tokens.css — Flowline brand tokens */

:root {
  /* ========================================
     BRAND COLORS — Indigo primary, Teal secondary
     Shades generated in oklch by adjusting lightness
     ======================================== */

  /* Primary — Indigo */
  --brand-primary-50:  oklch(0.97 0.02 285);
  --brand-primary-100: oklch(0.93 0.05 285);
  --brand-primary-200: oklch(0.86 0.10 285);
  --brand-primary-300: oklch(0.76 0.15 285);
  --brand-primary-400: oklch(0.66 0.19 285);
  --brand-primary-500: oklch(0.55 0.22 285);   /* brand primary */
  --brand-primary-600: oklch(0.48 0.20 285);
  --brand-primary-700: oklch(0.42 0.18 285);
  --brand-primary-800: oklch(0.35 0.15 285);
  --brand-primary-900: oklch(0.28 0.12 285);
  --brand-primary-950: oklch(0.20 0.08 285);

  /* Secondary — Teal */
  --brand-secondary-50:  oklch(0.97 0.02 160);
  --brand-secondary-100: oklch(0.93 0.04 160);
  --brand-secondary-200: oklch(0.86 0.08 160);
  --brand-secondary-300: oklch(0.78 0.12 160);
  --brand-secondary-400: oklch(0.70 0.15 160);  /* brand secondary — base sits at 400 due to higher lightness */
  --brand-secondary-500: oklch(0.60 0.14 160);
  --brand-secondary-600: oklch(0.50 0.12 160);
  --brand-secondary-700: oklch(0.42 0.10 160);

  /* Neutral — Warm Gray (stone) */
  --brand-neutral-0:   #ffffff;
  --brand-neutral-50:  #fafaf9;
  --brand-neutral-100: #f5f5f4;
  --brand-neutral-200: #e7e5e4;
  --brand-neutral-300: #d6d3d1;
  --brand-neutral-400: #a8a29e;
  --brand-neutral-500: #78716c;
  --brand-neutral-600: #57534e;
  --brand-neutral-700: #44403c;
  --brand-neutral-800: #292524;
  --brand-neutral-900: #1c1917;
  --brand-neutral-950: #0c0a09;

  /* ========================================
     SEMANTIC TOKENS — Light Mode
     ======================================== */

  /* Surfaces */
  --color-bg:             var(--brand-neutral-0);
  --color-bg-subtle:      var(--brand-neutral-50);
  --color-bg-muted:       var(--brand-neutral-100);
  --color-surface:        var(--brand-neutral-0);
  --color-surface-raised: var(--brand-neutral-0);

  /* Text */
  --color-text:           var(--brand-neutral-950);
  --color-text-body:      var(--brand-neutral-800);
  --color-text-muted:     var(--brand-neutral-500);
  --color-text-faint:     var(--brand-neutral-400);

  /* Borders */
  --color-border:         var(--brand-neutral-200);
  --color-border-strong:  var(--brand-neutral-300);

  /* Primary */
  --color-primary:        var(--brand-primary-500);
  --color-primary-hover:  var(--brand-primary-600);
  --color-primary-active: var(--brand-primary-700);
  --color-primary-soft:   var(--brand-primary-50);
  --color-on-primary:     #ffffff;

  /* Secondary */
  --color-secondary:      var(--brand-secondary-400);
  --color-secondary-soft: var(--brand-secondary-50);

  /* Focus */
  --color-focus-ring:     var(--brand-primary-400);

  /* ========================================
     COMPONENT TOKENS — Flowline aesthetic
     ======================================== */

  /* Border radius — 12px (friendly, rounded) */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* Shadows — subtle, warm */
  --shadow-xs:  0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-sm:  0 1px 3px oklch(0 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-md:  0 4px 12px oklch(0 0 0 / 0.06), 0 2px 4px oklch(0 0 0 / 0.04);
  --shadow-lg:  0 12px 24px oklch(0 0 0 / 0.08), 0 4px 8px oklch(0 0 0 / 0.04);

  /* Spacing — generous (premium breathing room) */
  --space-1:  4px;
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

  /* Typography */
  --font-heading: 'Outfit', system-ui, -apple-system, sans-serif;
  --font-body:    'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, monospace;
}

/* ========================================
   DARK MODE — Auto-generated from brand
   ======================================== */
[data-theme="dark"] {
  /* Surfaces — warm dark (stone-based, not cold blue) */
  --color-bg:             var(--brand-neutral-950);
  --color-bg-subtle:      var(--brand-neutral-900);
  --color-bg-muted:       var(--brand-neutral-800);
  --color-surface:        var(--brand-neutral-900);
  --color-surface-raised: var(--brand-neutral-800);

  /* Text */
  --color-text:           var(--brand-neutral-50);
  --color-text-body:      var(--brand-neutral-200);
  --color-text-muted:     var(--brand-neutral-400);
  --color-text-faint:     var(--brand-neutral-600);

  /* Borders */
  --color-border:         var(--brand-neutral-700);
  --color-border-strong:  var(--brand-neutral-600);

  /* Primary — use lighter shade on dark backgrounds */
  --color-primary:        var(--brand-primary-400);
  --color-primary-hover:  var(--brand-primary-300);
  --color-primary-active: var(--brand-primary-200);
  --color-primary-soft:   var(--brand-primary-950);
  --color-on-primary:     var(--brand-neutral-950);

  /* Secondary */
  --color-secondary:      var(--brand-secondary-300);
  --color-secondary-soft: var(--brand-secondary-700);

  /* Shadows — darker on dark mode */
  --shadow-xs:  0 1px 2px oklch(0 0 0 / 0.15);
  --shadow-sm:  0 1px 3px oklch(0 0 0 / 0.20), 0 1px 2px oklch(0 0 0 / 0.15);
  --shadow-md:  0 4px 12px oklch(0 0 0 / 0.25), 0 2px 4px oklch(0 0 0 / 0.15);
  --shadow-lg:  0 12px 24px oklch(0 0 0 / 0.30), 0 4px 8px oklch(0 0 0 / 0.15);
}
```

#### Tailwind Config

**Tailwind v4** (CSS-first configuration — current as of 2025+):

```css
/* app.css — Flowline brand theme */
@import "tailwindcss";

@theme {
  /* Border radius */
  --radius-none: 0px;
  --radius-sm: 6px;
  --radius: 12px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Primary (indigo) */
  --color-primary-50:  oklch(0.97 0.02 285);
  --color-primary-100: oklch(0.93 0.05 285);
  --color-primary-200: oklch(0.86 0.10 285);
  --color-primary-300: oklch(0.76 0.15 285);
  --color-primary-400: oklch(0.66 0.19 285);
  --color-primary-500: oklch(0.55 0.22 285);
  --color-primary-600: oklch(0.48 0.20 285);
  --color-primary-700: oklch(0.42 0.18 285);
  --color-primary-800: oklch(0.35 0.15 285);
  --color-primary-900: oklch(0.28 0.12 285);
  --color-primary-950: oklch(0.20 0.08 285);

  /* Secondary (teal) */
  --color-secondary-50:  oklch(0.97 0.02 160);
  --color-secondary-100: oklch(0.93 0.04 160);
  --color-secondary-200: oklch(0.86 0.08 160);
  --color-secondary-300: oklch(0.78 0.12 160);
  --color-secondary-400: oklch(0.70 0.15 160);
  --color-secondary-500: oklch(0.60 0.14 160);
  --color-secondary-600: oklch(0.50 0.12 160);
  --color-secondary-700: oklch(0.42 0.10 160);

  /* Warm neutral (stone-based) */
  --color-neutral-50:  #fafaf9;
  --color-neutral-100: #f5f5f4;
  --color-neutral-200: #e7e5e4;
  --color-neutral-300: #d6d3d1;
  --color-neutral-400: #a8a29e;
  --color-neutral-500: #78716c;
  --color-neutral-600: #57534e;
  --color-neutral-700: #44403c;
  --color-neutral-800: #292524;
  --color-neutral-900: #1c1917;
  --color-neutral-950: #0c0a09;

  /* Font families */
  --font-heading: "Outfit", system-ui, -apple-system, sans-serif;
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Shadows */
  --shadow-xs: 0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-sm: 0 1px 3px oklch(0 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-md: 0 4px 12px oklch(0 0 0 / 0.06), 0 2px 4px oklch(0 0 0 / 0.04);
  --shadow-lg: 0 12px 24px oklch(0 0 0 / 0.08), 0 4px 8px oklch(0 0 0 / 0.04);

  /* Generous spacing emphasis */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;
}

/* Dark mode via data attribute */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

> **Tailwind v3 legacy:** If your project still uses Tailwind v3, use `tailwind.config.js` with `darkMode: ["selector", '[data-theme="dark"]']` and a `content` array pointing to your component files. See the [Tailwind v4 migration guide](https://tailwindcss.com/docs/upgrade-guide) for details.

#### Branded Button Component

```tsx
// components/ui/button.tsx — Flowline branded
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-primary-400 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // Flowline brand: 12px radius, Outfit for headings but Inter for buttons
    "rounded-md font-sans",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700",
        secondary:
          "border border-neutral-300 bg-transparent text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100",
        ghost:
          "bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
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
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
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
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

#### Branded Empty State Component

```tsx
// components/empty-state.tsx — Flowline voice and tone
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon — uses brand secondary color for warmth */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
        {icon}
      </div>

      {/* Title — Outfit heading font */}
      <h3 className="font-heading text-lg font-semibold text-neutral-900">
        {title}
      </h3>

      {/* Description — friendly, encouraging Flowline voice */}
      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        {description}
      </p>

      {/* CTA — primary button with sentence case */}
      <Button className="mt-6" onClick={onAction}>
        <PlusIcon aria-hidden="true" />
        {actionLabel}
      </Button>
    </div>
  );
}

// Usage with Flowline voice:
// <EmptyState
//   icon={<FolderIcon className="h-8 w-8" />}
//   title="No projects yet"
//   description="Create your first project — it only takes a sec."
//   actionLabel="New project"
//   onAction={() => openNewProjectModal()}
// />
```

### 4. Brand Consistency Audit Checklist

Use this checklist to verify that AI-generated output matches your brand. Run it after generating any new page or component.

```markdown
## Brand Consistency Audit

### Colors
- [ ] Primary color matches the brand Brief (check hex/oklch value)
- [ ] No hardcoded color values — all colors reference design tokens
- [ ] 60-30-10 distribution: mostly neutral, accent used sparingly
- [ ] Dark mode tokens are defined and tested
- [ ] All text/background pairs meet WCAG AA contrast (4.5:1 text, 3:1 UI)
- [ ] Semantic colors (success/error/warning) are present and branded
- [ ] No default Tailwind blue-500 or other framework defaults leaking through

### Typography
- [ ] Heading font matches the Brief (correct font-family declaration)
- [ ] Body font matches the Brief
- [ ] Font weights match the Brief (heading weight, body weight)
- [ ] Type scale is consistent (all sizes from the defined scale, no arbitrary values)
- [ ] Line heights are appropriate (body: 1.5+, headings: 1.1-1.3)
- [ ] Fonts are loaded correctly (preload, font-display: swap, fallback stack)

### Component Aesthetic
- [ ] Border radius is consistent with the Brief across all components
- [ ] Shadow usage matches the Brief (present where expected, absent where not)
- [ ] Border treatment matches (hairline/none/medium as specified)
- [ ] Spacing feels consistent with the brand personality (generous/moderate/compact)
- [ ] Buttons use the correct variant styles (filled/outlined/ghost)
- [ ] Inputs match the specified style (bordered/underline/filled)
- [ ] Cards match the specified style (bordered/elevated/flat/glass)

### Voice & Tone
- [ ] Button labels use the correct casing convention (sentence case, etc.)
- [ ] Empty states have branded copy (not generic "No data found")
- [ ] Error messages use the brand's error tone (empathetic/direct/minimal)
- [ ] Success messages match brand voice examples
- [ ] Loading text matches brand voice
- [ ] Destructive confirmations are appropriately serious
- [ ] No placeholder text left from templates ("Lorem ipsum", "Click here")

### Consistency Across Pages
- [ ] Navigation looks identical across all pages
- [ ] Header/footer are consistent
- [ ] Typography hierarchy is the same across pages
- [ ] Spacing and padding feel uniform
- [ ] Color usage is consistent (same elements get same colors)
- [ ] Dark mode works consistently across all pages

### Icons & Imagery
- [ ] Icon set matches the Brief (Lucide/Heroicons/etc.)
- [ ] Icon style is consistent (outline/solid/duotone — not mixed)
- [ ] Icon sizes are consistent across similar contexts
- [ ] Illustrations (if used) match the specified style
```

---

## Common Mistakes

### 1. No Brand Brief at All

**Wrong:** Starting an AI coding session with "build me a dashboard" and expecting it to match your brand. The AI has no context about your brand, so it generates generic output: blue buttons, system fonts, standard 6px radius.

**Fix:** Fill out the Brand Brief template and paste it at the start of every AI session. Even a partial brief (just colors and font) dramatically improves output consistency.

### 2. Brand = Just a Logo and a Color

**Wrong:** Telling the AI "our brand color is #6366f1" and thinking that is enough. A single hex code does not define a color system. It does not tell the AI what shades to use for hover states, backgrounds, dark mode, or text-on-color.

**Fix:** Provide the full shade ramp (50--950) or let the AI generate it from your base color. Include dark mode mappings. Specify the neutral palette temperature (warm/cool/pure). Define the component aesthetic, typography, and voice alongside the color.

### 3. Inconsistent Voice Across UI Copy

**Wrong:** The signup page says "Let's get started!" (playful), the error page says "An error has occurred" (formal), and the settings page says "Configure your preferences" (technical). The product sounds like three different people wrote it.

**Fix:** Define voice attributes (This / Not That) in the Brief and include copy examples for every common UI element. Review all generated copy against the voice attributes before shipping.

### 4. Too Many Brand Colors

**Wrong:** Defining primary, secondary, tertiary, quaternary, and quinary brand colors. The resulting UI looks like a paint store. Users cannot tell which color means "interactive" and which is decorative.

**Fix:** One primary color. Optionally one secondary color. One neutral palette. Semantic colors for status (success, warning, error, info). That is the complete palette. Every additional color adds cognitive load and reduces the signaling power of your primary.

### 5. Not Adapting Brand Colors for Dark Mode

**Wrong:** Using the exact same brand-primary-500 on both light and dark backgrounds. On light backgrounds, a medium-saturation color looks fine. On dark backgrounds, the same color may appear too dark, too saturated, or fail contrast checks.

**Fix:** In dark mode, shift primary interactive elements to a lighter shade (400 or 300) and reduce chroma slightly. Generate dark mode tokens alongside light mode tokens in the Brief.

### 6. Ignoring Accessibility in Brand Color Choices

**Wrong:** Choosing a beautiful brand color (e.g., a light yellow or pastel lavender) that fails WCAG AA contrast when used as button text on white, or when used as a background with white text.

**Fix:** Test your brand color against both white and dark backgrounds using a contrast ratio checker *before* finalizing it. If your brand color does not pass 4.5:1 for text usage, identify which shades (darker for light mode, lighter for dark mode) do pass, and use those for text and interactive elements. Reserve the failing shade for decorative use (backgrounds, illustrations) only.

### 7. Not Including Dark Mode Variants in the Brief

**Wrong:** Filling out the Brand Brief with only light mode values. When the AI generates dark mode, it guesses -- and it guesses wrong. The dark surface might be cold blue-gray when your brand is warm. The primary might stay at the 500 shade and fail contrast on dark.

**Fix:** Explicitly include dark mode surface colors and primary shade preferences in the Brief. Even "auto-generate from primary, warm dark surface" gives the AI enough to produce correct dark mode tokens.

### 8. Brand Brief Is Too Vague

**Wrong:** Writing "Voice: friendly" in the Brief. Friendly how? Friendly like a children's app or friendly like a bank that tries to sound human? Vague attributes get vague output.

**Fix:** Use the "This / Not That" format. "Friendly and clear — not slangy or cutesy, not corporate or stiff." Include concrete copy examples for common UI elements so the AI has calibration points.

---

> **See also:** [Design-Systems](../Design-Systems/design-systems.md) | [Typography-Color](../Typography-Color/typography-color.md) | [Dark-Mode](../Dark-Mode/dark-mode.md) | [Accessibility](../Accessibility/accessibility.md) | [Animation-Motion](../Animation-Motion/animation-motion.md) | [Responsive-Design](../Responsive-Design/responsive-design.md) | [UX-Patterns](../UX-Patterns/ux-patterns.md) | [Mobile-First](../Mobile-First/mobile-first.md)
>
> **Last reviewed:** 2026-02
