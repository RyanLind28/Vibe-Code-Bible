# Keyword Research

> Keyword research is the process of discovering the words and phrases your target audience uses to find solutions, products, or information — and mapping those terms to pages on your site.

---

## Principles

### 1. Search Volume vs. Intent vs. Difficulty
The three pillars of keyword evaluation:

| Factor | What It Tells You | Priority |
|--------|-------------------|----------|
| **Search Volume** | How many people search for this monthly | Medium |
| **Search Intent** | What the searcher actually wants | Highest |
| **Keyword Difficulty** | How hard it is to rank | High |

**A low-volume, high-intent keyword often outperforms a high-volume, low-intent one.**

### 2. Keyword Types by Intent

| Type | Intent | Example | Conversion Potential |
|------|--------|---------|---------------------|
| **Informational** | Learn | "what is SEO" | Low (top of funnel) |
| **Navigational** | Find a specific site | "ahrefs login" | N/A (brand) |
| **Commercial** | Compare/evaluate | "best SEO tools 2025" | Medium-High |
| **Transactional** | Buy/act | "buy ahrefs subscription" | Highest |

### 3. Long-Tail vs. Head Terms
- **Head terms:** 1-2 words, high volume, high competition ("SEO")
- **Long-tail:** 3+ words, lower volume, lower competition, higher conversion ("technical SEO audit checklist for SaaS")
- **Strategy:** Target long-tail first, build authority, then compete for head terms

### 4. Keyword Clustering
Group related keywords by topic and intent. One page should target a **cluster**, not a single keyword.

Example cluster for a single page:
```
Primary:    "technical SEO audit"
Secondary:  "technical SEO checklist"
Related:    "how to do a technical SEO audit"
            "technical SEO audit template"
            "site audit for SEO"
```

### 5. SERP Analysis
Before targeting a keyword, analyze page 1:
- What content types rank? (blogs, tools, videos, product pages)
- What domain authorities are ranking?
- Are there featured snippets, PAA boxes, or rich results?
- Can you realistically compete?

### 6. Keyword Mapping
Every keyword cluster should be assigned to exactly one page. No two pages should target the same primary keyword (cannibalization).

---

## LLM Instructions

```
You are an SEO keyword research specialist. When conducting keyword research:

1. GATHER seed keywords from the user:
   - Business/product description
   - Target audience
   - Competitors
   - Existing content inventory

2. EXPAND seeds into keyword lists using these methods:
   - Modifier patterns: "best [keyword]", "[keyword] for [audience]",
     "how to [keyword]", "[keyword] vs [alternative]"
   - Question patterns: who, what, when, where, why, how
   - Intent modifiers: buy, review, compare, free, cheap, near me
   - Topical expansion: related subtopics and entities

3. CLUSTER keywords by:
   - Semantic similarity (same page can rank for all)
   - Search intent (must be identical within a cluster)
   - Topic/entity (supports topical authority)

4. EVALUATE each cluster:
   - Estimated search volume range (low/med/high)
   - Intent classification (informational/commercial/transactional)
   - Competition assessment (look at who currently ranks)
   - Business relevance score (1-5)

5. PRIORITIZE using this matrix:
   - Quick wins: Low difficulty + high relevance + decent volume
   - Strategic targets: High volume + high relevance (long-term)
   - Low priority: Low relevance or extremely high difficulty

6. MAP keywords to content:
   - Assign one primary keyword per page
   - List 3-5 secondary keywords per page
   - Identify content gaps (keywords with no matching page)
   - Flag cannibalization (multiple pages targeting same keyword)

Output format:
- Keyword cluster table with columns: Cluster Name | Primary KW | Secondary KWs | Intent | Volume | Difficulty | Assigned URL | Priority
```

---

## Examples

### Example 1: Keyword Research for a SaaS Product
```
Seed: "project management software"

CLUSTER 1: Product/Transactional
Primary:    "project management software"
Secondary:  "project management tool"
            "best project management app"
            "project management platform"
Intent:     Transactional
Volume:     High
Target:     /product/ (homepage or product page)

CLUSTER 2: Comparison/Commercial
Primary:    "best project management software 2025"
Secondary:  "top project management tools"
            "project management software comparison"
            "asana vs monday vs clickup"
Intent:     Commercial Investigation
Volume:     High
Target:     /blog/best-project-management-software/

CLUSTER 3: Feature-Specific/Commercial
Primary:    "project management software with gantt charts"
Secondary:  "gantt chart project management"
            "best gantt chart software"
Intent:     Commercial
Volume:     Medium
Target:     /features/gantt-charts/

CLUSTER 4: Educational/Informational
Primary:    "what is project management"
Secondary:  "project management basics"
            "project management for beginners"
Intent:     Informational
Volume:     High
Target:     /blog/what-is-project-management/
```

### Example 2: Keyword Modifier Expansion Framework
```
Base keyword: "email marketing"

HOW-TO modifiers:
  how to start email marketing
  how to build an email list
  how to write marketing emails
  how to improve email open rates

BEST/TOP modifiers:
  best email marketing software
  best email marketing strategies
  top email marketing platforms

VS modifiers:
  email marketing vs social media marketing
  mailchimp vs convertkit
  email marketing vs SMS marketing

FOR modifiers:
  email marketing for small business
  email marketing for ecommerce
  email marketing for beginners
  email marketing for nonprofits

YEAR modifiers:
  email marketing trends 2025
  email marketing benchmarks 2025
  email marketing statistics 2025
```

### Example 3: Keyword-to-Page Mapping Table
```markdown
| Primary Keyword              | Volume | KD  | Intent       | Mapped URL                    | Status   |
|------------------------------|--------|-----|--------------|-------------------------------|----------|
| email marketing software     | 12,000 | 78  | Transactional| /                             | Exists   |
| best email marketing tools   | 8,100  | 65  | Commercial   | /blog/best-email-tools/       | Exists   |
| email marketing for beginners| 3,600  | 32  | Informational| /blog/email-marketing-guide/  | Gap      |
| email drip campaign examples | 1,900  | 28  | Informational| /blog/drip-campaign-examples/ | Gap      |
| mailchimp alternative        | 2,400  | 55  | Commercial   | /vs/mailchimp-alternative/    | Exists   |
```

## Common Mistakes
- **Targeting keywords by volume alone:** A 50K-volume keyword means nothing if the intent doesn't match your page.
- **One keyword per page thinking:** Pages rank for dozens to hundreds of keywords. Think in clusters.
- **Ignoring SERP reality:** If page 1 is all enterprise domains (DR 80+), a new site won't rank. Pick battles you can win.
- **Keyword stuffing:** Target keywords naturally. Google understands synonyms and related terms — you don't need exact match everywhere.
- **Not re-evaluating:** Keywords shift. Quarterly reviews keep your strategy current.
- **Ignoring zero-volume keywords:** Keywords with 0 volume in tools can still drive traffic. If the intent is strong and competition is low, they're worth targeting.

---

*Last reviewed: 2026-02*

**See also:** [Search Intent](../Search-Intent/search-intent.md) | [Title Tags](../Title-Tags/title-tags.md) | [Content Clusters](../../Content-SEO/Content-Clusters/content-clusters.md)
