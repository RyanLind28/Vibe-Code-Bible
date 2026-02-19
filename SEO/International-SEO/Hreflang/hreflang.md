# Hreflang

> Hreflang tags tell search engines which language and regional version of a page to show to users based on their location and language settings. Without hreflang, Google may show the wrong language version of your content to users — or flag your translated pages as duplicates.

---

## Principles

### 1. What Hreflang Does
```html
<link rel="alternate" hreflang="en-us" href="https://example.com/page/" />
<link rel="alternate" hreflang="en-gb" href="https://example.co.uk/page/" />
<link rel="alternate" hreflang="es" href="https://example.com/es/page/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page/" />
```

This tells Google:
- Show the `en-us` version to English speakers in the US
- Show the `en-gb` version to English speakers in the UK
- Show the `es` version to Spanish speakers everywhere
- Show `x-default` as the fallback for everyone else

### 2. When You Need Hreflang
- You have the same content in multiple languages
- You have regional variations of the same language (US English vs UK English)
- You have country-specific versions with different pricing/products
- Without hreflang, translated pages may be treated as duplicates

### 3. Hreflang Format
```
hreflang="[language]-[region]"
```

| Code | Meaning |
|------|---------|
| `en` | English (any region) |
| `en-us` | English (United States) |
| `en-gb` | English (United Kingdom) |
| `es` | Spanish (any region) |
| `es-mx` | Spanish (Mexico) |
| `fr-ca` | French (Canada) |
| `pt-br` | Portuguese (Brazil) |
| `zh-cn` | Chinese (China — Simplified) |
| `zh-tw` | Chinese (Taiwan — Traditional) |
| `x-default` | Fallback / language selector page |

- Language codes: ISO 639-1 (2-letter lowercase)
- Region codes: ISO 3166-1 Alpha-2 (2-letter)
- Hreflang values are **not case-sensitive** — `en-US`, `en-us`, and `en-Us` are all valid. The BCP 47 convention is `en-US` (lowercase language, uppercase region), but Google accepts any casing.
- `x-default`: Strongly recommended — the fallback for unmatched users. Not technically required by Google, but omitting it means users who don't match any declared language/region get no guidance.

### 4. Implementation Methods

| Method | Best For | Limitations |
|--------|----------|-------------|
| **HTML `<link>` tags** | Small sites (<50 pages per language) | Adds to page size, harder to maintain |
| **HTTP headers** | Non-HTML files (PDFs) | Requires server-side configuration |
| **XML sitemap** | Large sites (100+ pages per language) | Most scalable, easiest to maintain |

### 5. Critical Rules
1. **Bidirectional (return tags):** If page A declares hreflang to page B, page B MUST declare hreflang back to page A. Missing return tags = hreflang ignored.
2. **Self-referencing:** Every page must include an hreflang tag pointing to itself.
3. **Include x-default:** Always include a fallback page.
4. **Canonical consistency:** Canonical URLs must match hreflang URLs exactly.
5. **Absolute URLs only:** Hreflang must use full, absolute URLs.

---

## LLM Instructions

```
You are an international SEO and hreflang specialist.

1. PLAN hreflang implementation:
   - Inventory all language/region versions of the site
   - Map every page to its equivalent in each language/region
   - Identify pages that exist in some languages but not others
   - Choose x-default for each page set
   - Select implementation method (HTML, HTTP header, or sitemap)

2. GENERATE hreflang tags:
   - For every page, generate the complete set of hreflang tags
   - Include self-referencing tag
   - Include x-default
   - Use correct ISO language and region codes
   - Use absolute URLs
   - Ensure bidirectional consistency

3. VALIDATE hreflang implementation:
   - Check for missing return tags
   - Verify self-referencing tags exist
   - Confirm canonical URLs match hreflang URLs
   - Check for incorrect language/region codes
   - Ensure x-default is present
   - Verify no hreflang tags point to non-200 pages
   - Check for conflicts between hreflang and canonical tags

4. FOR XML SITEMAP implementation:
   - Generate sitemap per language OR one sitemap with all xhtml:link entries
   - Follow Google's sitemap hreflang format exactly
   - Ensure all alternate URLs are included for each <url> entry

5. HANDLE edge cases:
   - Page exists in English but not Spanish: Don't include in Spanish hreflang set
   - Same language, different regions: Use region codes (en-us, en-gb)
   - Language without region: Use language-only code (es, fr, de)
   - Country-specific domains: .com, .co.uk, .de — each needs hreflang
   - Subdirectory structure: /en/, /es/, /fr/ — each path needs tags

Output: Complete hreflang tag set per page, validation report,
and implementation instructions.
```

---

## Examples

### Example 1: HTML Implementation
```html
<!-- On https://example.com/products/ (US English) -->
<head>
  <link rel="alternate" hreflang="en-us" href="https://example.com/products/" />
  <link rel="alternate" hreflang="en-gb" href="https://example.co.uk/products/" />
  <link rel="alternate" hreflang="es" href="https://example.com/es/productos/" />
  <link rel="alternate" hreflang="fr" href="https://example.com/fr/produits/" />
  <link rel="alternate" hreflang="de" href="https://example.de/produkte/" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/products/" />
  <link rel="canonical" href="https://example.com/products/" />
</head>

<!-- On https://example.co.uk/products/ (UK English) — MUST mirror back -->
<head>
  <link rel="alternate" hreflang="en-us" href="https://example.com/products/" />
  <link rel="alternate" hreflang="en-gb" href="https://example.co.uk/products/" />
  <link rel="alternate" hreflang="es" href="https://example.com/es/productos/" />
  <link rel="alternate" hreflang="fr" href="https://example.com/fr/produits/" />
  <link rel="alternate" hreflang="de" href="https://example.de/produkte/" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/products/" />
  <link rel="canonical" href="https://example.co.uk/products/" />
</head>
```

### Example 2: XML Sitemap Implementation
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://example.com/products/</loc>
    <xhtml:link rel="alternate" hreflang="en-us" href="https://example.com/products/" />
    <xhtml:link rel="alternate" hreflang="en-gb" href="https://example.co.uk/products/" />
    <xhtml:link rel="alternate" hreflang="es" href="https://example.com/es/productos/" />
    <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/produits/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/products/" />
  </url>
  <url>
    <loc>https://example.co.uk/products/</loc>
    <xhtml:link rel="alternate" hreflang="en-us" href="https://example.com/products/" />
    <xhtml:link rel="alternate" hreflang="en-gb" href="https://example.co.uk/products/" />
    <xhtml:link rel="alternate" hreflang="es" href="https://example.com/es/productos/" />
    <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/produits/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/products/" />
  </url>
</urlset>
```

### Example 3: Next.js Hreflang Implementation
```jsx
// app/[locale]/products/page.tsx
import { Metadata } from 'next'

const locales = ['en-us', 'en-gb', 'es', 'fr', 'de']
const domains = {
  'en-us': 'https://example.com',
  'en-gb': 'https://example.co.uk',
  'es': 'https://example.com/es',
  'fr': 'https://example.com/fr',
  'de': 'https://example.de',
}

export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale } = params
  return {
    alternates: {
      canonical: `${domains[locale]}/products/`,
      languages: Object.fromEntries(
        locales.map(loc => [loc, `${domains[loc]}/products/`])
      ),
    },
  }
}
```

### Example 4: Common Hreflang Validation Errors
```
ERROR: Missing return tag
  Page A (en-us) → declares hreflang to Page B (es)
  Page B (es) → does NOT declare hreflang back to Page A (en-us)
  FIX: Add matching hreflang tag on Page B

ERROR: Self-referencing tag missing
  Page A (en-us) → declares hreflang for es, fr, de but NOT en-us
  FIX: Add <link rel="alternate" hreflang="en-us" href="[self]" />

ERROR: Canonical/hreflang conflict
  Canonical: https://example.com/products/
  Hreflang:  https://example.com/products?ref=nav  ← URL mismatch
  FIX: Hreflang URLs must match canonical URLs exactly

ERROR: Hreflang pointing to non-200 page
  hreflang="es" → https://example.com/es/productos/ (returns 301)
  FIX: Point hreflang to the final destination URL
```

## Common Mistakes
- **Missing return tags:** The #1 hreflang error. Every alternate page must point back. If any page in the set is missing its tags, the entire set may be ignored.
- **Relative URLs:** Hreflang requires absolute URLs including protocol and domain.
- **Wrong language codes:** Use ISO 639-1 (2-letter) language codes and ISO 3166-1 Alpha-2 region codes. Common errors include using 3-letter codes or invalid combinations like `en-uk` (should be `en-gb`).
- **Hreflang on noindexed pages:** If a page is noindexed, its hreflang tags will be ignored.
- **Forgetting x-default:** Always include a fallback for users who don't match any language/region.
- **Canonical conflicts:** If the canonical URL differs from the hreflang URL, Google gets confused.

---

*Last reviewed: 2026-02*

**See also:** [Geo-Targeting](../Geo-Targeting/geo-targeting.md) | [Site Structure](../../Technical-SEO/Site-Structure/site-structure.md)
