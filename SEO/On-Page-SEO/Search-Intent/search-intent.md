# Search Intent

> Search intent is the *why* behind a query. Matching your content to user intent is the single most important on-page SEO factor. Google's entire algorithm is built around satisfying intent.

---

## Principles

### 1. The Four Types of Search Intent

| Intent | User Wants To... | SERP Signals | Content Format |
|--------|-------------------|--------------|----------------|
| **Informational** | Learn or understand something | Featured snippets, PAA, knowledge panels, blog posts | Guides, how-tos, definitions, tutorials |
| **Navigational** | Find a specific website or page | Brand results, sitelinks, official site | Homepage, login page, specific product page |
| **Commercial** | Research before a purchase decision | Comparison articles, reviews, "best of" lists | Listicles, comparison tables, reviews |
| **Transactional** | Complete an action (buy, sign up, download) | Product pages, pricing pages, ads, shopping results | Product pages, landing pages, pricing pages |

### 2. Intent Is Determined by the SERP, Not by You
Your opinion of what a keyword means doesn't matter. What Google already ranks for that keyword IS the intent. Always analyze the SERP before creating content.

### 3. The 3 C's of Search Intent
Analyze page 1 results for:
- **Content Type:** Blog posts, product pages, category pages, landing pages, videos
- **Content Format:** How-to, listicle, guide, comparison, review, tool
- **Content Angle:** Fresh ("2025"), beginner-friendly, expert, budget-focused

### 4. Mixed Intent
Some queries have mixed intent. Google may show a mix of content types:
- "python" → language docs + snake info + IDE downloads
- "apple" → brand + fruit + stock price

When intent is mixed, you need to choose which intent you're serving and commit fully.

### 5. Intent Mismatch = Ranking Failure
If your page doesn't match intent, it will NEVER rank well, regardless of:
- Domain authority
- Backlink count
- Content quality
- Technical SEO perfection

A product page will not rank for an informational query. A blog post will not rank for a transactional query.

---

## LLM Instructions

```
You are a search intent analysis specialist. When analyzing or matching search intent:

1. CLASSIFY the intent of any given keyword:
   - Search the keyword mentally and predict what type of content ranks
   - Map to: Informational / Navigational / Commercial / Transactional
   - Note if intent is mixed or ambiguous

2. ANALYZE the 3 C's for any keyword:
   - Content Type: What format dominates page 1?
   - Content Format: Listicle? Guide? Comparison? Tool?
   - Content Angle: What positioning do top results use?

3. RECOMMEND the correct content format:
   - If informational → long-form guide, how-to, or definition post
   - If commercial → comparison, "best of" list, or detailed review
   - If transactional → product page, pricing page, or landing page
   - If navigational → ensure your brand page is optimized

4. FLAG intent mismatches:
   - Alert when existing content doesn't match the keyword's intent
   - Suggest content reformatting or new page creation
   - Identify when a keyword needs a different page type entirely

5. MAP intent to funnel stage:
   Informational → Awareness (top of funnel)
   Commercial → Consideration (middle of funnel)
   Transactional → Decision (bottom of funnel)
   Navigational → Loyalty/Return (existing customers)

Output: Intent analysis with recommended content type, format, angle,
and specific structural recommendations.
```

---

## Examples

### Example 1: Intent Analysis of Keywords
```
"how to learn python"
├── Intent: Informational
├── Content Type: Blog post / Guide
├── Content Format: Step-by-step guide or resource list
├── Content Angle: Beginner-friendly, comprehensive
├── Recommendation: Create a long-form guide with sections,
│   embedded code examples, and learning path

"best python IDE"
├── Intent: Commercial Investigation
├── Content Type: Blog post
├── Content Format: Listicle / Comparison
├── Content Angle: Current year, tested/reviewed
├── Recommendation: "10 Best Python IDEs in 2025 (Tested & Compared)"
│   with comparison table, pros/cons, pricing

"download pycharm"
├── Intent: Transactional (+ Navigational)
├── Content Type: Product/download page
├── Content Format: Landing page with CTA
├── Content Angle: Direct, fast access
├── Recommendation: Cannot compete — this is PyCharm's keyword

"pycharm vs vscode"
├── Intent: Commercial Investigation
├── Content Type: Blog post
├── Content Format: Head-to-head comparison
├── Content Angle: Objective, feature-by-feature
├── Recommendation: Detailed comparison with tables, use cases,
│   and verdict per scenario
```

### Example 2: Intent Mismatch Diagnosis
```
PROBLEM: Blog post targeting "buy running shoes online" is not ranking.

DIAGNOSIS:
- Keyword intent: Transactional
- Current content: 2,000-word blog post about choosing running shoes
- SERP reality: Page 1 is ALL e-commerce category pages (Nike, Amazon, Zappos)

VERDICT: Intent mismatch. A blog post cannot rank for a transactional keyword.

FIX OPTIONS:
1. Re-target the blog to "how to choose running shoes" (informational)
2. Create a product category page for "buy running shoes online"
3. Target "best running shoes 2025" with the blog (commercial intent)
```

### Example 3: Content Template by Intent
```
INFORMATIONAL TEMPLATE:
├── H1: "What is [Topic]? A Complete Guide"
├── TL;DR / Key Takeaways box
├── Definition section
├── How it works
├── Step-by-step process
├── Examples
├── FAQ section (targets PAA)
└── Related resources / next steps

COMMERCIAL TEMPLATE:
├── H1: "X Best [Products] in [Year] (Tested & Reviewed)"
├── Quick comparison table (feature matrix)
├── #1 Pick — detailed review
├── #2 Pick — detailed review
├── ...
├── How we tested / methodology
├── Buyer's guide section
└── FAQ

TRANSACTIONAL TEMPLATE:
├── H1: "[Product Name] — [Key Benefit]"
├── Hero section with CTA
├── Key features (benefit-focused)
├── Social proof (reviews, logos, stats)
├── Pricing
├── FAQ (objection handling)
└── Final CTA
```

## Common Mistakes
- **Writing a blog post for a transactional keyword:** Google wants product pages. Your guide won't rank.
- **Creating a product page for an informational keyword:** Google wants educational content. Your pricing page won't rank.
- **Ignoring the SERP:** Always check what currently ranks before creating content. The SERP tells you the intent.
- **Forcing intent:** You can't change what Google considers the intent. Match it or pick a different keyword.
- **One-size-fits-all content:** Different keywords in the same topic may have completely different intents. "CRM software" (transactional) vs. "what is a CRM" (informational) need different pages.

---

*Last reviewed: 2026-02*

**See also:** [Keyword Research](../Keyword-Research/keyword-research.md) | [Title Tags](../Title-Tags/title-tags.md)
