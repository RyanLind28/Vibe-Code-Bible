# Site Structure

> How your website is organized, linked, and hierarchically arranged determines how search engines understand, crawl, and rank your content.

---

## Principles

### 1. Flat Architecture (3-Click Rule)
Every important page should be reachable within 3 clicks from the homepage. Deep nesting buries pages from both users and crawlers.

### 2. Logical Hierarchy
Structure should mirror user intent and topic relationships:
```
Homepage
├── Category (Hub)
│   ├── Subcategory
│   │   ├── Individual Page (Spoke)
│   │   └── Individual Page (Spoke)
│   └── Subcategory
└── Category (Hub)
```

### 3. URL Structure Mirrors Site Architecture
URLs should reflect the hierarchy and be human-readable:
- **Good:** `/marketing/seo/technical-seo/`
- **Bad:** `/p?id=4827&cat=12`

### 4. Siloing
Group topically related content together. This builds topical authority and helps search engines understand content relationships through information architecture, not just links.

### 5. Crawl Budget Optimization
A clean structure ensures crawl budget is spent on valuable pages, not wasted on orphaned, duplicate, or thin pages.

### 6. Navigation as Architecture
- **Primary nav:** Top-level categories
- **Breadcrumbs:** Reinforce hierarchy for both users and search engines
- **Footer nav:** Secondary pages (legal, about, sitemap)
- **Sidebar/contextual nav:** Related content within the same silo

---

## LLM Instructions

When generating or auditing site structure:

```
You are an SEO site architect. When asked to design or audit a site structure:

1. ANALYZE the content inventory — group pages by topic and user intent.
2. CREATE a maximum 3-level deep hierarchy (Homepage → Category → Page).
3. ENSURE every page has at least one internal link pointing to it (no orphans).
4. DESIGN URL slugs that are:
   - Lowercase
   - Hyphen-separated
   - Descriptive (include primary keyword)
   - Under 60 characters for the path portion
5. MAP breadcrumb trails for every page.
6. IDENTIFY hub pages that should link to all related spoke pages.
7. FLAG any pages deeper than 3 clicks from the homepage.
8. RECOMMEND consolidation for thin or duplicate content.

Output format:
- Visual tree structure
- URL list with parent-child relationships
- Breadcrumb markup (JSON-LD)
- Internal linking recommendations
```

---

## Examples

### Example 1: E-commerce Site Structure
```
https://store.com/                          (Homepage)
https://store.com/mens/                     (Category)
https://store.com/mens/shoes/               (Subcategory)
https://store.com/mens/shoes/running-shoes/ (Product listing)
https://store.com/mens/shoes/nike-air-max/  (Product page)
```

### Example 2: Breadcrumb JSON-LD
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Marketing",
      "item": "https://example.com/marketing/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "SEO Guide",
      "item": "https://example.com/marketing/seo-guide/"
    }
  ]
}
```

### Example 3: SaaS Site Structure
```
/                        → Homepage
/features/               → Features hub
/features/analytics/     → Feature detail
/features/reporting/     → Feature detail
/pricing/                → Pricing page
/blog/                   → Blog hub
/blog/seo-tips/          → Blog post
/docs/                   → Documentation hub
/docs/getting-started/   → Doc page
```

## Common Mistakes
- **Orphan pages:** Pages with no internal links pointing to them. Fix by auditing with Screaming Frog or Sitebulb.
- **Over-nesting:** `/blog/2024/01/15/category/seo/tips/title/` — flatten to `/blog/seo-tips-title/`.
- **Keyword cannibalization via structure:** Two category pages targeting the same keyword. Merge or differentiate.
- **Ignoring pagination:** Paginated pages (`/blog/page/2/`) must be crawlable with HTML `<a>` links. Note: Google deprecated `rel="next"` / `rel="prev"` in 2019 and no longer uses them. Ensure pagination is accessible through standard internal links.

---

*Last reviewed: 2026-02*

**See also:** [Crawlability](../Crawlability/crawlability.md) | [Internal Linking](../../On-Page-SEO/Internal-Linking/internal-linking.md)
