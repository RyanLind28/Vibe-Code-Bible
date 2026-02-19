# Internal Linking

> Internal links are hyperlinks that point from one page on your domain to another page on the same domain. They distribute authority, establish hierarchy, and help search engines discover and understand your content.

---

## Principles

### 1. Why Internal Links Matter
- **Crawlability:** Internal links are how Googlebot discovers new pages
- **PageRank distribution:** Internal links pass authority (link equity) between pages
- **Contextual relevance:** Anchor text tells Google what the linked page is about
- **User experience:** Guides users to related, deeper content
- **Indexing priority:** Pages with more internal links signal higher importance

### 2. Link Equity Distribution
Link equity flows from pages with authority to pages they link to. Your homepage typically has the most authority — pages linked from it receive the most equity.

```
Homepage (most authority)
├── Category A (high authority — linked from homepage)
│   ├── Post 1 (medium authority)
│   ├── Post 2 (medium authority)
│   └── Post 3 (medium authority)
└── Category B (high authority — linked from homepage)
    └── Deep Post (low authority — 3 clicks deep)
```

**Rule of thumb:** Pages you want to rank should have the most internal links pointing to them.

### 3. Anchor Text Best Practices
The clickable text of a link tells Google what the target page is about.

| Anchor Type | Example | SEO Value |
|-------------|---------|-----------|
| **Exact match** | "technical SEO audit" | High (use sparingly) |
| **Partial match** | "learn about technical SEO" | High |
| **Descriptive** | "our complete audit guide" | Medium |
| **Branded** | "SiteHub's guide" | Low (but natural) |
| **Generic** | "click here", "read more" | Zero |
| **Naked URL** | "https://example.com/page" | Low |

**Best practice:** Use a natural mix. Your profile should be predominantly descriptive/partial match anchors, with branded anchors appearing naturally, and exact-match keyword anchors as a small minority. The ideal ratio varies by niche — analyze top-ranking competitors in your space for benchmarks.

### 4. Hub and Spoke Model
Create hub pages (pillar content) that link to all related spoke pages (cluster content), and have each spoke link back to the hub.

```
[Hub: "Complete Guide to SEO"]
    ↕ links to/from ↕
[Spoke: "Technical SEO"]
[Spoke: "On-Page SEO"]
[Spoke: "Link Building"]
[Spoke: "Local SEO"]
```

### 5. Contextual Links > Navigation Links
Links embedded within body content carry more weight than links in headers, footers, or sidebars. Google distinguishes between navigational and contextual links.

### 6. Strategic Link Placement
- Links higher on the page carry slightly more weight
- Links surrounded by relevant text carry more contextual weight
- There is a debated theory that Google may weigh the first link's anchor text more heavily. While not confirmed by Google, it's a reasonable practice to make the first mention of a topic your best linking opportunity.

---

## LLM Instructions

```
You are an internal linking strategist. When building or auditing internal links:

1. AUDIT the current internal link structure:
   - Identify orphan pages (0 internal links pointing to them)
   - Find pages with excessive outgoing links (hundreds+) that dilute user experience
   - Detect broken internal links (404s)
   - Map the link depth of every important page
   - Count internal links to each page (link equity distribution)

2. BUILD an internal linking strategy:
   - Identify hub (pillar) pages for each major topic
   - Map spoke (cluster) pages to their respective hubs
   - Ensure every spoke links to its hub and vice versa
   - Cross-link related spokes where natural
   - Add contextual links in body content (not just nav)

3. OPTIMIZE anchor text:
   - Use descriptive, keyword-rich anchor text
   - Vary anchor text naturally (don't use the same exact text every time)
   - Avoid generic anchors like "click here" or "read more"
   - First mention of a related topic = opportunity to link

4. PRIORITIZE link equity to:
   - Money pages (product, pricing, service pages)
   - Pages targeting high-competition keywords
   - New content that needs discovery
   - Pages stuck on page 2 of Google (link equity boost can push to page 1)

5. IMPLEMENT with these rules:
   - Every new piece of content must link to 3-5 existing relevant pages
   - Every new piece of content must receive links from 2-3 existing relevant pages
   - Use follow links (default) — do NOT nofollow internal links
   - Open internal links in the same tab (no target="_blank")

Output: Internal linking map with source URL, target URL, anchor text,
and placement recommendation.
```

---

## Examples

### Example 1: Blog Post Internal Linking
```markdown
# How to Improve Your Site's SEO

Search engine optimization starts with understanding
[technical SEO fundamentals](/blog/technical-seo-guide/) before
moving to content optimization.

## On-Page Optimization

The most critical on-page element is your
[title tag](/blog/title-tag-best-practices/). Pair this with
proper [keyword research](/blog/keyword-research-guide/) to
ensure you're targeting terms your audience actually searches for.

## Building Authority

Once your on-page SEO is solid, focus on
[link building strategies](/blog/link-building-guide/) to build
domain authority. For local businesses,
[local SEO](/blog/local-seo-guide/) is equally important.

## Measuring Results

Track your progress using
[Google Search Console](/blog/search-console-guide/) and
[Google Analytics](/blog/ga4-setup-guide/).
```

### Example 2: Internal Linking Audit Table
```markdown
| Page                          | Internal Links IN | Internal Links OUT | Orphan? | Priority |
|-------------------------------|-------------------|--------------------|---------|----------|
| /blog/seo-guide/              | 23                | 8                  | No      | Hub      |
| /blog/technical-seo/          | 12                | 5                  | No      | Spoke    |
| /blog/local-seo-tips/         | 2                 | 3                  | No      | Low      |
| /blog/schema-markup-guide/    | 0                 | 4                  | YES     | Fix!     |
| /pricing/                     | 5                 | 2                  | No      | Money    |
| /blog/old-post-2019/          | 1                 | 0                  | No      | Update   |
```

### Example 3: Hub and Spoke Implementation
```
HUB PAGE: /blog/complete-seo-guide/
Contains links to all spokes:
  → /blog/technical-seo/        (anchor: "technical SEO")
  → /blog/on-page-seo/          (anchor: "on-page optimization")
  → /blog/link-building/        (anchor: "link building strategies")
  → /blog/local-seo/            (anchor: "local SEO")
  → /blog/content-seo/          (anchor: "content strategy for SEO")

EACH SPOKE links back:
  /blog/technical-seo/
    → /blog/complete-seo-guide/  (anchor: "comprehensive SEO guide")
    → /blog/on-page-seo/         (anchor: "on-page SEO")  [related spoke]
    → /blog/core-web-vitals/     (anchor: "Core Web Vitals")  [sub-spoke]
```

### Example 4: Programmatic Internal Linking (React/Next.js)
```jsx
// components/RelatedPosts.jsx
// Automatically suggest related posts based on tags/category

export default function RelatedPosts({ currentSlug, category, posts }) {
  const related = posts
    .filter(post => post.category === category && post.slug !== currentSlug)
    .slice(0, 3);

  return (
    <section>
      <h2>Related Articles</h2>
      <ul>
        {related.map(post => (
          <li key={post.slug}>
            <a href={`/blog/${post.slug}/`}>{post.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

## Common Mistakes
- **Orphan pages:** If a page has zero internal links, Google may never find it.
- **Nofollow on internal links:** Almost never appropriate. Let equity flow freely within your site.
- **Generic anchor text:** "Click here" wastes an anchor text signal. Use descriptive text.
- **Linking to low-value pages:** Don't waste link equity on login pages, privacy policies, or thin content.
- **Not updating old content:** When you publish new content, go back and add links from relevant existing pages.
- **Over-optimization:** If every internal link uses the exact same anchor text, it looks unnatural.

---

*Last reviewed: 2026-02*

**See also:** [Site Structure](../../Site-Structure/) | [Content Clusters](../../Content-Clusters/)
