# Structured Data (Schema Markup)

> Structured data helps search engines understand your content explicitly, enabling rich results (snippets, carousels, knowledge panels) that increase click-through rates.

---

## Principles

### 1. What Is Structured Data?
Structured data is code (JSON-LD, Microdata, or RDFa) added to your pages that explicitly describes the content to search engines using the [Schema.org](https://schema.org) vocabulary.

**Always use JSON-LD.** Google recommends it, it's easiest to implement, and it doesn't interleave with your HTML.

### 2. Why It Matters for SEO
- **Rich results:** Star ratings, FAQs, how-tos, product prices, events — all powered by structured data
- **Knowledge Graph:** Helps Google understand entities (your brand, people, products)
- **Voice search:** Structured data feeds AI assistants and voice results
- **CTR boost:** Rich results (especially star ratings and pricing) can meaningfully increase CTR, though the impact varies by rich result type, industry, and SERP composition

### 3. Key Schema Types for SEO

| Schema Type | Rich Result | Status | Best For |
|-------------|-------------|--------|----------|
| `Article` | Article snippet | Active | Blog posts, news |
| `Product` | Price, availability, reviews | Active | E-commerce |
| `LocalBusiness` | Local panel, map | Active | Local businesses |
| `Organization` | Knowledge panel | Active | Brand homepages |
| `BreadcrumbList` | Breadcrumb trail | Active | All pages |
| `VideoObject` | Video carousel | Active | Video content |
| `Review` / `AggregateRating` | Star ratings | Active | Products, services |
| `Event` | Event listing | Active | Events, webinars |
| `JobPosting` | Job listing | Active | Career pages |
| `Recipe` | Recipe card | Active | Food/cooking content |
| `SoftwareApplication` | App info | Active | SaaS, apps |
| `ProfilePage` | Author/profile info | Active | Author pages, profiles |
| `FAQPage` | Expandable FAQ | **Restricted** | Gov/health sites only (restricted Aug 2023) |
| `HowTo` | ~~Step-by-step~~ | **Removed** | Rich result removed Sept 2023 |

**Important:** Google periodically changes which schema types generate rich results. Always check [Google's search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) for current status. In 2023, Google removed HowTo rich results entirely and restricted FAQ rich results to well-known government and health websites. Even when a schema type no longer generates a visible rich result, the markup still helps Google understand your content and may influence AI Overviews.

### 4. Validation
Always validate your structured data:
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)

### 5. Rules
- Only mark up content **visible on the page** (no hidden content)
- Don't duplicate the same `@type` for the same entity on a page (multiple types on one entity are fine, e.g., `"@type": ["Restaurant", "LocalBusiness"]`)
- Use `@id` for entity linking across pages
- Keep structured data **accurate** — misleading markup = manual action

---

## LLM Instructions

```
You are a structured data / schema markup specialist. When generating schema:

1. IDENTIFY the page type and match to the appropriate Schema.org type(s).

2. GENERATE valid JSON-LD that:
   - Uses @context: "https://schema.org"
   - Includes ALL required properties for the chosen type
   - Includes recommended properties for richer results
   - Nests related entities (e.g., author inside Article)
   - Uses @id for cross-referencing entities across the site

3. ALWAYS include these baseline schemas on every page:
   - Organization (on homepage, referenced via @id elsewhere)
   - BreadcrumbList
   - WebSite (on homepage, with SearchAction for sitelinks search)

4. VALIDATE that:
   - All required properties are present (check Google's docs)
   - URLs are absolute (not relative)
   - Dates use ISO 8601 format
   - Images meet minimum size requirements (1200x630 recommended)
   - No properties reference invisible/hidden content

5. OUTPUT: Complete JSON-LD script tag, ready to paste into <head>.

6. WARN about:
   - Schema types that no longer generate rich results
   - Properties that are required vs recommended
   - Common validation errors
```

---

## Examples

### Example 1: Article Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Complete Guide to Technical SEO in 2025",
  "description": "Learn everything about technical SEO including crawlability, site structure, and Core Web Vitals.",
  "image": "https://example.com/images/technical-seo-guide.webp",
  "author": {
    "@type": "Person",
    "name": "Jane Smith",
    "url": "https://example.com/authors/jane-smith/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "SEO Hub",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "2025-01-15",
  "dateModified": "2025-03-20",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/technical-seo-guide/"
  }
}
</script>
```

### Example 2: FAQ Schema (Restricted — Gov/Health Only)

> **Warning:** As of August 2023, Google only shows FAQ rich results for well-known government and health websites. The markup still helps search engines understand Q&A content, but most sites will not see a visible rich result from it.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is technical SEO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Technical SEO refers to optimizing your website's infrastructure so search engines can crawl, index, and render your pages effectively. This includes site speed, mobile-friendliness, structured data, and crawlability."
      }
    },
    {
      "@type": "Question",
      "name": "How often should I audit my site's technical SEO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You should perform a comprehensive technical SEO audit quarterly, with continuous monitoring of Core Web Vitals and crawl errors via Google Search Console."
      }
    }
  ]
}
</script>
```

### Example 3: Product Schema (E-commerce)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Noise-Canceling Headphones",
  "image": [
    "https://store.com/images/headphones-1.webp",
    "https://store.com/images/headphones-2.webp"
  ],
  "description": "Premium wireless headphones with active noise cancellation and 30-hour battery life.",
  "sku": "HP-NC-2025",
  "brand": {
    "@type": "Brand",
    "name": "AudioMax"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://store.com/headphones/wireless-nc/",
    "priceCurrency": "USD",
    "price": "299.99",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "TechStore"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "2341"
  }
}
</script>
```

### Example 4: LocalBusiness Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Downtown Coffee Roasters",
  "image": "https://coffeeshop.com/storefront.webp",
  "@id": "https://coffeeshop.com/#business",
  "url": "https://coffeeshop.com/",
  "telephone": "+1-555-123-4567",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "Portland",
    "addressRegion": "OR",
    "postalCode": "97201",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 45.5152,
    "longitude": -122.6784
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "06:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday","Sunday"],
      "opens": "07:00",
      "closes": "16:00"
    }
  ],
  "priceRange": "$$"
}
</script>
```

### Example 5: WebSite + Sitelinks Search Box (Homepage)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Example",
  "url": "https://example.com/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://example.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
</script>
```

## Common Mistakes
- **Marking up invisible content:** Schema must describe what's visible on the page.
- **Self-serving reviews:** Don't add `Review` schema for reviews about your own business on your own site.
- **Using deprecated rich result types:** FAQ rich results are restricted to government/health sites since Aug 2023. HowTo rich results were removed entirely in Sept 2023. Check Google's current documentation before implementing.
- **Missing required fields:** Always check [Google's structured data docs](https://developers.google.com/search/docs/appearance/structured-data) for required fields.
- **Duplicate schemas:** Don't add the same schema type twice on a page unless representing distinct entities.
- **Ignoring AI Overviews:** Structured data helps AI systems understand and cite your content, even when it doesn't produce a traditional rich result.

---

> **See also:** [Core Web Vitals](../../Technical-SEO/Core-Web-Vitals/core-web-vitals.md) | [Product Page SEO](../../E-commerce-SEO/Product-Page-SEO/product-page-seo.md) | [Google Business Profile](../../Local-SEO/Google-Business-Profile/google-business-profile.md)
>
> **Last reviewed:** 2026-02
