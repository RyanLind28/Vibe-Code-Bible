# Geo-Targeting

> Geo-targeting is the practice of optimizing your website to target users in specific countries, regions, or locations. It involves URL structure decisions, server configuration, content localization, and search engine settings that signal which audiences each version of your site serves.

---

## Principles

### 1. URL Structure Options for International Sites

| Structure | Example | Pros | Cons |
|-----------|---------|------|------|
| **ccTLD** (country-code top-level domain) | `example.de`, `example.co.uk` | Strongest geo signal, brand trust | Expensive, separate domain authority per site |
| **Subdirectory** | `example.com/de/`, `example.com/uk/` | Single domain authority, easy to manage | Weaker geo signal than ccTLD |
| **Subdomain** | `de.example.com`, `uk.example.com` | Separate hosting possible | Treated as separate sites, splits authority |
| **URL parameter** | `example.com?lang=de` | N/A | **Never use this** — Google doesn't recommend |

**Recommendation:** Subdirectory (`/de/`, `/fr/`, `/es/`) for most businesses. ccTLD if you have the resources and strong country-specific branding needs.

### 2. How Google Determines Geo-Targeting
Google no longer offers a manual geo-targeting setting in Search Console (the International Targeting report was removed in 2022). Instead, Google determines your target country/region through:
- **ccTLDs:** `.de` automatically targets Germany, `.co.uk` targets UK, etc.
- **Hreflang tags:** The primary signal for gTLD domains (.com, .net, .org) — see the [Hreflang guide](../Hreflang/hreflang.md)
- **On-page signals:** Language of content, local addresses, phone numbers, currency
- **Google Business Profile:** For local businesses, GBP location data is a strong signal
- **Server location / CDN:** A very minor signal, largely irrelevant with modern CDNs
- **Backlink profile:** Links from country-specific domains signal regional relevance

For gTLD domains with subdirectory structure, add each subdirectory as a separate property in GSC to monitor per-region performance.

### 3. Content Localization vs. Translation
**Translation** = Converting words from one language to another
**Localization** = Adapting content for a specific market's culture, preferences, and norms

Localization includes:
- Currency and pricing formats ($100 vs €92 vs £80)
- Date formats (MM/DD/YYYY vs DD/MM/YYYY)
- Units of measurement (miles vs kilometers)
- Cultural references and idioms
- Local phone numbers and addresses
- Local regulations and legal requirements
- Payment methods (credit card vs iDEAL vs Alipay)
- Local testimonials and case studies

### 4. Server Location and CDN
- Server location is **not a ranking signal** according to Google's John Mueller, but Google may use server IP for geo-targeting gTLDs when no other signal is present
- Use a CDN (Cloudflare, Fastly, AWS CloudFront) to serve content from edge locations worldwide
- CDN makes server location entirely irrelevant for geo-targeting
- Ensure the CDN doesn't block Googlebot from any region

### 5. IP-Based Redirects: Avoid Them
**Don't automatically redirect users based on IP location.**
- Googlebot crawls from multiple locations globally, but IP-based redirects can still interfere with crawling and indexing of regional pages
- Users may want to view a different region's site (expats, travelers, researchers)
- Instead: Show a **banner** suggesting the local version, let the user choose
- Alternatively, detect the browser's `Accept-Language` header to suggest (not force) a locale

### 6. International Keyword Research
Keywords don't translate 1:1 between languages:
- "Laptop" in English = "portátil" in Spanish (Spain) but "laptop" in Latin America
- Search volume and competition vary dramatically by market
- Local competitors are completely different
- Always do keyword research per market, not just translate your English keywords

---

## LLM Instructions

```
You are an international SEO and geo-targeting specialist.

1. RECOMMEND a URL structure:
   - Assess the business's international scope (how many countries/languages?)
   - Evaluate existing domain authority and resources
   - Recommend ccTLD, subdirectory, or subdomain with justification
   - Plan the URL hierarchy for each market

2. PLAN content localization:
   - Identify all elements that need localization (not just translation)
   - Currency, dates, units, cultural references
   - Local phone numbers, addresses, payment methods
   - Recommend professional translation vs. AI translation + human review
   - Plan for locale-specific imagery and social proof

3. CONFIGURE technical geo-targeting:
   - Set up hreflang tags for all language/region combinations
   - Rely on hreflang, ccTLDs, and on-page signals for geo-targeting (GSC no longer has a manual geo-targeting setting)
   - Implement proper canonical tags per region
   - Set up CDN for global performance
   - Plan a language/region selector UX

4. HANDLE regional content differences:
   - Different products/services per market
   - Different pricing per market
   - Different legal/compliance requirements
   - Different competitor landscapes

5. OPTIMIZE per-market SEO:
   - Conduct keyword research per language/region
   - Analyze local SERPs (who ranks in each market?)
   - Build local backlinks in each target market
   - Create locally relevant content
   - Submit to local search engines (Yandex for Russia, Baidu for China, Naver for Korea)

6. AVOID common pitfalls:
   - Don't auto-redirect based on IP
   - Don't serve mixed languages on one page
   - Don't use flags for language selection (flags = countries, not languages)
   - Don't assume translation = localization

Output: International SEO strategy with URL structure, hreflang plan,
localization checklist, and per-market SEO roadmap.
```

---

## Examples

### Example 1: Subdirectory Structure Plan
```
https://example.com/           → US English (default / x-default)
https://example.com/uk/        → UK English
https://example.com/es/        → Spanish (Spain)
https://example.com/es-mx/     → Spanish (Mexico)
https://example.com/fr/        → French (France)
https://example.com/fr-ca/     → French (Canada)
https://example.com/de/        → German
https://example.com/ja/        → Japanese
https://example.com/pt-br/     → Portuguese (Brazil)

URL PATTERN:
  https://example.com/{locale}/category/page/

EXAMPLE:
  https://example.com/products/crm-software/        (en-us)
  https://example.com/de/produkte/crm-software/     (de)
  https://example.com/ja/products/crm-software/     (ja)
```

### Example 2: Language/Region Selector
```html
<!-- DON'T use flags for languages (Swiss users speak 4 languages) -->
<!-- DO use language names in their native script -->

<nav aria-label="Language selector">
  <ul>
    <li><a href="/" lang="en">English (US)</a></li>
    <li><a href="/uk/" lang="en-GB">English (UK)</a></li>
    <li><a href="/es/" lang="es">Español</a></li>
    <li><a href="/fr/" lang="fr">Français</a></li>
    <li><a href="/de/" lang="de">Deutsch</a></li>
    <li><a href="/ja/" lang="ja">日本語</a></li>
    <li><a href="/pt-br/" lang="pt-BR">Português (Brasil)</a></li>
  </ul>
</nav>

<!-- Show a non-intrusive banner when user's browser language doesn't match -->
<div class="locale-suggestion" role="alert">
  It looks like you're browsing from Germany.
  <a href="/de/">Switch to our German site?</a>
  <button aria-label="Dismiss">✕</button>
</div>
```

### Example 3: Localization Checklist
```markdown
## Localization Checklist for German Market (/de/)

### Content
- [ ] Professional translation (not Google Translate)
- [ ] German keyword research (Keyword-Recherche)
- [ ] Local competitor analysis (German SERPs)
- [ ] German case studies and testimonials
- [ ] Cultural adaptation of examples and references

### Technical
- [ ] Currency: EUR (€) format: 1.299,99 €
- [ ] Date format: DD.MM.YYYY
- [ ] Number format: 1.000,00 (dot for thousands, comma for decimal)
- [ ] Phone format: +49 XXX XXXXXXX
- [ ] Address format: Straße Nr., PLZ Stadt
- [ ] VAT display (Mehrwertsteuer / MwSt.)

### Legal / Compliance
- [ ] Impressum (required by German law)
- [ ] GDPR/DSGVO-compliant cookie consent
- [ ] Widerrufsbelehrung (cancellation policy)
- [ ] AGB (terms and conditions in German)
- [ ] Datenschutzerklärung (privacy policy in German)

### SEO
- [ ] Hreflang tags configured
- [ ] German meta titles and descriptions
- [ ] German alt text on images
- [ ] German URL slugs where appropriate
- [ ] Submit to German business directories
- [ ] Build German backlinks
```

### Example 4: Per-Market Keyword Differences
```
English (US):   "apartment for rent"      (110,000/mo)
English (UK):   "flat to rent"            (60,000/mo)
Spanish:        "piso en alquiler"        (40,000/mo)
German:         "Wohnung mieten"          (33,000/mo)
French:         "appartement à louer"     (27,000/mo)
Japanese:       "賃貸マンション"            (90,000/mo)

NOTE: Direct translation of "apartment for rent" into German would be
"Wohnung zu vermieten" — but that's what LANDLORDS search.
Renters search "Wohnung mieten." Always research per market.
```

## Common Mistakes
- **Auto-redirecting by IP:** Blocks Googlebot from crawling non-US pages and frustrates users who want a different region.
- **Using flags for languages:** A Spanish flag doesn't represent Latin American Spanish speakers. Use language names in native script.
- **Translating keywords literally:** Keywords don't translate 1:1. Always do local keyword research.
- **Single currency/format:** Showing USD prices on your German site breaks trust. Localize everything.
- **Ignoring local search engines:** Google dominates most markets, but Yandex (Russia), Baidu (China), and Naver (Korea) require separate optimization.
- **Mixing languages on a page:** A German page with English navigation confuses both users and search engines.

---

*Last reviewed: 2026-02*

**See also:** [Hreflang](../Hreflang/hreflang.md) | [Site Structure](../../Technical-SEO/Site-Structure/site-structure.md)
