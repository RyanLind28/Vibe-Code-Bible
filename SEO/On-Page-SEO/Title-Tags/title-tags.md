# Title Tags

> The title tag is the single most impactful on-page SEO element. It appears in search results, browser tabs, and social shares. It directly influences both rankings and click-through rate.

---

## Principles

### 1. Anatomy of a Perfect Title Tag
```html
<title>Primary Keyword — Secondary Keyword | Brand Name</title>
```

**Rules:**
- **Length:** 50-60 characters (Google truncates based on pixel width (approximately 600px on desktop, 500px on mobile))
- **Primary keyword first:** Front-load your most important keyword
- **Unique per page:** No two pages should share the same title tag
- **Compelling:** Must entice the click, not just contain keywords
- **Accurate:** Must reflect the page content (mismatch = high bounce = lower rankings)

### 2. Title Tag vs. H1
| Element | Purpose | Where It Shows |
|---------|---------|---------------|
| `<title>` | For search engines and browser tabs | SERPs, browser tab, social shares |
| `<h1>` | For users on the page | On the page itself |

They can be different. The title tag should be optimized for CTR in search. The H1 should be optimized for readability on the page.

### 3. Google Rewrites Titles
Google rewrites approximately 60-76% of title tags (per Zyppy's research, with the percentage increasing over time). Common triggers:
- Title is too long (truncation)
- Title is too short (Google adds brand)
- Title doesn't match the page content
- Title is keyword-stuffed
- Title uses boilerplate patterns across pages

**How to prevent rewrites:**
- Keep titles 50-60 characters
- Make them descriptive and accurate
- Include the brand name (so Google doesn't add it)
- Don't use all caps or excessive punctuation

### 4. CTR Optimization
Title tags are your ad copy in organic search. Maximize CTR with:
- **Numbers:** "7 Proven SEO Strategies" > "SEO Strategies"
- **Power words:** Ultimate, Complete, Proven, Free, Essential
- **Year/freshness:** "Best SEO Tools (2025)" signals current content
- **Parenthetical modifiers:** (Free Template), (Step-by-Step), (With Examples)
- **Questions:** "What Is Technical SEO?" matches question queries

### 5. Template by Page Type

| Page Type | Title Template |
|-----------|---------------|
| Homepage | Brand — Primary Value Proposition |
| Blog post | Primary Keyword: Compelling Hook (Year) \| Brand |
| Product | Product Name — Key Benefit \| Brand |
| Category | Category Name — Browse [X] Products \| Brand |
| Service | Service Name in Location \| Brand |
| Comparison | X vs Y: Honest Comparison (Year) \| Brand |

---

## LLM Instructions

```
You are an SEO title tag specialist. When writing or optimizing title tags:

1. INPUTS needed:
   - Primary keyword (and secondary if applicable)
   - Page type (blog, product, category, homepage, landing page)
   - Brand name
   - Target audience
   - Key differentiator or angle

2. GENERATE 3-5 title tag options that:
   - Are 50-60 characters (count carefully, this is critical)
   - Front-load the primary keyword
   - Include a CTR hook (number, power word, year, or question)
   - End with the brand name after a separator (| or —)
   - Are unique and don't duplicate other pages on the site

3. EVALUATE each option by:
   - Character count (must be ≤ 60)
   - Keyword placement (primary keyword in first 30 chars)
   - CTR appeal (would you click this?)
   - Intent match (does it match what the searcher wants?)
   - Rewrite risk (will Google likely keep or rewrite it?)

4. FORMAT output as:
   Title: "[the title tag]"
   Chars: [count]
   Primary KW: [keyword]
   CTR Hook: [what makes it clickable]
   Notes: [any concerns]

5. ALSO provide the corresponding H1 tag recommendation
   (can be different from the title tag).

NEVER:
- Exceed 60 characters
- Keyword stuff (max 1-2 keyword mentions)
- Use all caps
- Use clickbait that doesn't match content
- Duplicate titles across pages
```

---

## Examples

### Example 1: Blog Post Title Tags
```
Keyword: "technical SEO audit"

Option 1:
  Title: "Technical SEO Audit: 15-Point Checklist (2025) | SiteHub"
  Chars: 56
  CTR Hook: Number + Year + Checklist format
  H1: "The Complete Technical SEO Audit Checklist"

Option 2:
  Title: "How to Do a Technical SEO Audit (Step-by-Step) | SiteHub"
  Chars: 57
  CTR Hook: How-to + Parenthetical modifier
  H1: "How to Run a Technical SEO Audit in 30 Minutes"

Option 3:
  Title: "Technical SEO Audit Guide — Free Template | SiteHub"
  Chars: 53
  CTR Hook: Free + Template
  H1: "Technical SEO Audit: Your Complete Guide with Free Template"
```

### Example 2: E-commerce Title Tags
```
Product Page:
  Title: "Nike Air Max 270 — Lightweight Running Shoe | ShoeStore"
  Chars: 56
  H1: "Nike Air Max 270"

Category Page:
  Title: "Men's Running Shoes — Shop 200+ Styles | ShoeStore"
  Chars: 52
  H1: "Men's Running Shoes"

Sale Page:
  Title: "Running Shoe Sale — Up to 50% Off Top Brands | ShoeStore"
  Chars: 57
  H1: "Running Shoe Sale"
```

### Example 3: SaaS / Service Title Tags
```
Homepage:
  Title: "Acme — Project Management for Remote Teams"
  Chars: 46
  H1: "Manage Projects Effortlessly, From Anywhere"

Feature Page:
  Title: "Gantt Charts — Visual Project Planning | Acme"
  Chars: 48
  H1: "Plan Projects Visually with Gantt Charts"

Pricing:
  Title: "Acme Pricing — Free Plan + Pro from $9/mo"
  Chars: 43
  H1: "Simple, Transparent Pricing"

Comparison:
  Title: "Acme vs Monday.com: Honest Comparison (2025) | Acme"
  Chars: 53
  H1: "Acme vs Monday.com: Which Is Right for You?"
```

### Example 4: HTML Implementation
```html
<head>
  <title>Technical SEO Audit: 15-Point Checklist (2025) | SiteHub</title>
  <meta name="description" content="Run a complete technical SEO audit with our 15-point checklist. Covers crawlability, Core Web Vitals, indexing, and more. Free template included.">
</head>
<body>
  <h1>The Complete Technical SEO Audit Checklist</h1>
</body>
```

## Common Mistakes
- **Too long:** "The Ultimate Complete Comprehensive Guide to Technical SEO Auditing for Beginners and Experts Alike" — Google will rewrite this.
- **No keyword:** "Welcome to Our Blog | Brand" — wasted opportunity.
- **Duplicate titles:** Multiple pages with "Blog | Brand" — each page needs a unique title.
- **Keyword first, always:** Sometimes brand-first works for navigational queries: "Acme — Login" not "Login to Your Account | Acme".
- **Ignoring CTR:** "Technical SEO" is technically correct but "Technical SEO Audit: 15-Point Checklist (2025)" will get far more clicks.

---

*Last reviewed: 2026-02*

**See also:** [Keyword Research](../../Keyword-Research/) | [Search Intent](../../Search-Intent/)
