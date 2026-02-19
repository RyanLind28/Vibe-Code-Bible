# Local Citations

> A local citation is any online mention of your business's Name, Address, and Phone number (NAP). Citations are a key local ranking factor — consistency and accuracy across the web directly impact your local search visibility.

---

## Principles

### 1. What Is a Local Citation?
A citation is any mention of your business NAP on external websites:
- **Structured citations:** Business directories (Yelp, Yellow Pages, BBB)
- **Unstructured citations:** Blog posts, news articles, social profiles
- **Core citations:** Major directories that Google trusts most

### 2. Why Citations Matter
- **Trust signal:** Consistent NAP across many sources validates your business
- **Discovery:** Citations on popular directories drive direct traffic
- **Local ranking factor:** #5 local ranking factor per BrightLocal surveys
- **Knowledge Graph:** Google cross-references citations to build business entities

### 3. NAP Consistency Is Everything
Your NAP must be **identical** across every citation. Even small variations confuse Google:

```
CORRECT (consistent):
  Yelp:          Downtown Coffee Roasters | 123 Main St, Portland, OR 97201 | (555) 123-4567
  Yellow Pages:  Downtown Coffee Roasters | 123 Main St, Portland, OR 97201 | (555) 123-4567
  Website:       Downtown Coffee Roasters | 123 Main St, Portland, OR 97201 | (555) 123-4567

INCORRECT (inconsistent):
  Yelp:          Downtown Coffee Roasters | 123 Main St, Portland, OR 97201 | (555) 123-4567
  Yellow Pages:  Downtown Coffee  | 123 Main Street, Portland, Oregon 97201 | 555-123-4567
  Website:       DT Coffee Roasters | 123 Main St Ste 1, Portland, OR 97201 | 1-555-123-4567
```

### 4. Core Citation Sources (US)

| Category | Sources |
|----------|---------|
| **Data aggregators** | Data Axle (Infogroup), Neustar Localeze, Foursquare |
| **Major directories** | Google Business Profile, Apple Maps, Bing Places, Yelp |
| **General directories** | Yellow Pages, BBB, Manta, Angi, Thumbtack |
| **Social platforms** | Facebook, LinkedIn, Instagram, Twitter/X |
| **Industry-specific** | TripAdvisor (hospitality), Avvo (legal), Healthgrades (medical), Houzz (home) |
| **Local directories** | Chamber of Commerce, local business associations |

### 5. Citation Building Process
1. **Audit existing citations** for accuracy and consistency
2. **Fix incorrect citations** (NAP mismatches, outdated info)
3. **Build citations on core platforms** (top 40-50 directories)
4. **Build industry-specific citations** (niche directories)
5. **Build local citations** (chamber of commerce, local blogs)
6. **Monitor ongoing** for duplicates and changes

### 6. Quality Over Quantity
Having 500 directory listings means nothing if the data is inconsistent. Focus on:
- Top 50 directories with accurate, consistent NAP
- Industry-specific directories relevant to your niche
- High-DA citation sources
- Eliminating duplicates and errors

---

## LLM Instructions

```
You are a local citation management specialist.

1. AUDIT existing citations:
   - Search for the business name across major directories
   - Document all found citations with their NAP data
   - Flag inconsistencies (name variations, old addresses, wrong phone)
   - Identify duplicates on the same platform
   - Compare against the correct/canonical NAP

2. CREATE a canonical NAP format:
   - Legal business name (exact spelling, capitalization)
   - Full address (standardized USPS format)
   - Primary phone number (consistent format)
   - Website URL (consistent with/without www)
   - Document this as the source of truth

3. BUILD a citation plan:
   - List the top 50 directories for the business's country
   - Add 10-20 industry-specific directories
   - Add 5-10 local/regional directories
   - Prioritize by: domain authority, relevance, traffic

4. FOR EACH CITATION:
   - Use exact canonical NAP
   - Complete 100% of available fields
   - Upload consistent photos (logo, storefront)
   - Write a unique description (not copy-pasted)
   - Add categories that match GBP categories
   - Include a link to the correct landing page

5. CLEAN UP issues:
   - Claim and correct inaccurate listings
   - Merge or remove duplicates
   - Update old addresses and phone numbers
   - Remove closed/outdated listings
   - Suppress citations from moved/closed locations

6. MONITOR ongoing:
   - Monthly check of top 20 citations for accuracy
   - Set alerts for new mention of the business name
   - Track citation score / health over time
   - Update all citations when NAP changes

Output: Citation audit spreadsheet, canonical NAP document,
prioritized build list, and cleanup action items.
```

---

## Examples

### Example 1: Canonical NAP Document
```
=== CANONICAL NAP — Source of Truth ===

Business Name:   Downtown Coffee Roasters
Address Line 1:  123 Main St
Address Line 2:  (leave blank — no suite/unit)
City:            Portland
State:           OR
ZIP:             97201
Country:         US
Phone:           (555) 123-4567
Website:         https://www.dtcoffee.com
Primary Category: Coffee Shop

FORMATTING RULES:
- Always use "St" not "Street"
- Always use "(555) 123-4567" format for phone
- Always use state abbreviation "OR" not "Oregon"
- Always use "Downtown Coffee Roasters" — never "DT Coffee" or abbreviations
- Always include "www" in the URL
```

### Example 2: Citation Audit Spreadsheet
```
| Directory       | Name Match? | Address Match? | Phone Match? | URL Match? | Status    | Action       |
|-----------------|-------------|----------------|--------------|------------|-----------|--------------|
| Google Business | ✅          | ✅             | ✅           | ✅         | Claimed   | None         |
| Yelp            | ✅          | ✅             | ❌ (old #)   | ✅         | Claimed   | Update phone |
| Facebook        | ✅          | ❌ (old addr)  | ❌ (old #)   | ✅         | Claimed   | Update both  |
| Yellow Pages    | ❌ (abbrev) | ✅             | ✅           | ❌ (no www)| Unclaimed | Claim + fix  |
| Bing Places     | ✅          | ✅             | ✅           | N/A        | Unclaimed | Claim        |
| Apple Maps      | ✅          | ✅             | ✅           | ✅         | Claimed   | None         |
| BBB             | —           | —              | —            | —          | Not listed| Create       |
| TripAdvisor     | ✅          | ✅             | ❌ (missing) | ✅         | Claimed   | Add phone    |
```

### Example 3: Top 50 Citation Sources (US Priority Order)
```
TIER 1 (Critical — do first):
 1. Google Business Profile
 2. Apple Maps (Apple Business Connect)
 3. Bing Places
 4. Yelp
 5. Facebook Business Page
 6. Data Axle (feeds many directories)
 7. Neustar Localeze (feeds many directories)
 8. Foursquare (feeds many apps)

TIER 2 (Important):
 9. Yellow Pages (YP.com)
10. BBB (Better Business Bureau)
11. Manta
12. Angi (formerly Angie's List)
13. Thumbtack
14. MapQuest
15. LinkedIn Company Page
17. Instagram Business Profile
18. Nextdoor Business Page

TIER 3 (Industry-Specific — choose relevant):
  Restaurants: TripAdvisor, OpenTable, Zomato
  Legal: Avvo, FindLaw, Justia
  Medical: Healthgrades, Vitals, WebMD
  Real Estate: Zillow, Realtor.com, Homes.com
  Home Services: Houzz, HomeAdvisor, Porch
  Hotels: TripAdvisor, Booking.com, Hotels.com
```

### Example 4: Website NAP Schema (JSON-LD)
```html
<!-- On your contact/location page and footer -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Downtown Coffee Roasters",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "Portland",
    "addressRegion": "OR",
    "postalCode": "97201",
    "addressCountry": "US"
  },
  "telephone": "(555) 123-4567",
  "url": "https://www.dtcoffee.com"
}
</script>
```

## Common Mistakes
- **NAP inconsistency:** The #1 citation error. Even "Street" vs "St" can be a problem. Choose one format (e.g., always "St" not "Street") and use it everywhere.
- **Ignoring data aggregators:** Data Axle and Localeze feed hundreds of directories. Fix them first and the corrections cascade.
- **Duplicate listings:** Two listings on the same platform split your reviews and signals. Merge them.
- **Outdated citations after moving:** Old addresses on 50+ directories send mixed signals. Update everything when you move.
- **Ignoring industry-specific directories:** A lawyer with no Avvo listing is missing a critical citation. Know your industry's directories.
- **Building citations for non-existent locations:** This is spam and violates Google's guidelines.

---

*Last reviewed: 2026-02*

**See also:** [Google Business Profile](../Google-Business-Profile/google-business-profile.md) | [Structured Data](../../Technical-SEO/Structured-Data/structured-data.md)
