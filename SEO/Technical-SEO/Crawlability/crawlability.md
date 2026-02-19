# Crawlability

> If search engines can't crawl your pages, they can't index them. If they can't index them, they can't rank them. Crawlability is the foundation of all SEO.

---

## Principles

### 1. Robots.txt Controls Access
The `robots.txt` file at your domain root tells crawlers which paths they can and cannot access. It does NOT prevent indexing — it prevents crawling.

```
# Example robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /tmp/

Sitemap: https://example.com/sitemap.xml
```

### 2. XML Sitemaps Guide Discovery
Sitemaps tell search engines what pages exist and their relative priority. They supplement crawling but don't replace internal linking.

### 3. Crawl Budget is Finite
Google allocates a crawl budget based on your site's size, authority, and server capacity. Wasting it on low-value pages hurts discovery of important content.

**Note:** Crawl budget is primarily a concern for large sites (10,000+ pages). Smaller sites are typically crawled fully without optimization.

**Crawl budget killers:**
- Infinite URL spaces (faceted navigation, calendars, session IDs)
- Soft 404s (pages that return 200 but show "not found" content)
- Redirect chains (A → B → C → D)
- Duplicate content without canonicals

### 4. HTTP Status Codes Matter
| Code | Meaning | SEO Impact |
|------|---------|------------|
| 200  | OK | Page is crawlable and indexable |
| 301  | Permanent redirect | Passes full link equity (Google confirmed) |
| 302  | Temporary redirect | Also passes link equity when persistent; signals temporary intent |
| 404  | Not found | Page removed from index over time |
| 410  | Gone | Faster removal from index than 404 |
| 500  | Server error | Crawling paused; prolonged errors lead to reduced crawling and eventual deindexing |
| 503  | Temporarily unavailable | Tells bots to come back later |

### 5. Render Budget
JavaScript-rendered content requires additional resources. Googlebot renders JS, but with delays (sometimes days). Server-side rendering (SSR) or static generation is always preferred for critical SEO content.

### 6. Canonical Tags Consolidate Signals
When duplicate or near-duplicate pages exist, the `rel="canonical"` tag tells search engines which version to index.

```html
<link rel="canonical" href="https://example.com/preferred-page/" />
```

---

## LLM Instructions

```
You are a technical SEO crawlability specialist. When auditing or configuring crawlability:

1. GENERATE a robots.txt file that:
   - Allows all important content paths
   - Blocks admin, API, staging, and utility paths
   - Blocks URL paths that create duplicate content (note: robots.txt blocks crawling, not indexing — use noindex for URLs you want deindexed)
   - References the XML sitemap
   - Does NOT block CSS/JS files (Googlebot needs them to render)

2. CREATE XML sitemaps that:
   - Include only 200-status, indexable, canonical pages
   - Are under 50MB / 50,000 URLs per file
   - Use a sitemap index if multiple sitemaps are needed
   - Include <lastmod> dates (only when accurate)
   - Exclude noindex pages, redirects, and paginated pages

3. AUDIT for crawlability issues:
   - Identify redirect chains (flatten to single 301s)
   - Find orphan pages (no internal links pointing to them)
   - Detect soft 404s
   - Check for noindex + follow vs noindex + nofollow usage
   - Verify canonical tag consistency (self-referencing canonicals)
   - Test JavaScript rendering with Google's URL Inspection Tool

4. IMPLEMENT meta robots tags correctly:
   - <meta name="robots" content="index, follow"> (default, not needed)
   - <meta name="robots" content="noindex, follow"> (don't index, but follow links)
   - <meta name="robots" content="noindex, nofollow"> (don't index, don't follow)

Output: Issue list with severity (critical/warning/info) and fix instructions.
```

---

## Examples

### Example 1: XML Sitemap
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-01-15</lastmod>
  </url>
  <url>
    <loc>https://example.com/blog/seo-guide/</loc>
    <lastmod>2026-01-10</lastmod>
  </url>
</urlset>
```

> **Note:** Google ignores `<changefreq>` and `<priority>` tags — do not include them. The only tag Google uses (besides `<loc>`) is `<lastmod>`, and only when the date is accurate.

### Example 2: Sitemap Index
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2025-01-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-blog.xml</loc>
    <lastmod>2025-01-14</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2025-01-13</lastmod>
  </sitemap>
</sitemapindex>
```

### Example 3: Next.js Robots.txt + Sitemap Config
```javascript
// app/robots.ts — generate robots.txt via Next.js App Router
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/_next/'],
    },
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

### Example 4: Common Redirect Chain Fix
```
BEFORE (chain):
/old-page → /renamed-page → /final-page (3 hops)

AFTER (flattened):
/old-page → /final-page (1 hop)
/renamed-page → /final-page (1 hop)
```

## Common Mistakes
- **Blocking CSS/JS in robots.txt:** Googlebot can't render your page, leading to incorrect indexing.
- **Using robots.txt to "hide" pages:** It prevents crawling, not indexing. Use `noindex` instead.
- **Stale sitemaps:** Including 404'd or redirected URLs wastes crawl budget.
- **Missing self-referencing canonicals:** Every indexable page should canonical to itself.
- **302 instead of 301 for permanent moves:** While both pass link equity, use 301 for permanent URL changes to clearly signal intent. Use 302 only for genuinely temporary situations.

---

> **See also:** [Site Structure](../Site-Structure/site-structure.md) | [Core Web Vitals](../Core-Web-Vitals/core-web-vitals.md) | [Structured Data](../Structured-Data/structured-data.md)
>
> **Last reviewed:** 2026-02
