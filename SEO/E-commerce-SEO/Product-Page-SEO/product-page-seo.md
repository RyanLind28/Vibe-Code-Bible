# Product Page SEO

> Product pages are where SEO meets revenue. They're the transactional heart of e-commerce SEO — optimizing them directly impacts organic traffic, click-through rate, and conversion. Every element must serve both search engines and buyers.

---

## Principles

### 1. Product Page SEO Anatomy
```
┌─────────────────────────────────────────────┐
│ <title> Keyword-Rich Product Title | Brand  │ ← Title tag (SERP)
│ <meta description> Benefit-driven desc      │ ← Meta description (SERP)
├─────────────────────────────────────────────┤
│ Breadcrumb: Home > Category > Subcategory   │ ← Navigation + schema
├─────────────────────────────────────────────┤
│ <h1> Product Name                           │ ← Primary heading
│ High-quality images (alt text optimized)    │ ← Image SEO
│ Price, availability, ratings                │ ← Rich snippet data
├─────────────────────────────────────────────┤
│ Unique product description (300+ words)     │ ← On-page content
│ Key features / specs                        │ ← Structured content
│ Size guide / compatibility                  │ ← Supporting content
├─────────────────────────────────────────────┤
│ Customer reviews                            │ ← UGC + freshness
│ FAQ section                                 │ ← Long-tail keywords
│ Related / recommended products              │ ← Internal linking
└─────────────────────────────────────────────┘
```

### 2. Unique Product Descriptions
**Never use manufacturer descriptions.** If 500 retailers copy the same description, Google has no reason to rank yours.

- Write unique descriptions for every product (or at least top sellers)
- Focus on benefits, not just features
- Include natural keyword variations
- Minimum 300 words for important products
- Use bullet points for scannability

### 3. Product Schema Markup
Product schema enables rich results with price, availability, and ratings directly in search results — dramatically increasing CTR.

Required properties:
- `name`, `image`, `description`
- `offers` (with `price`, `priceCurrency`, `availability`)
- `aggregateRating` (if reviews exist)
- `brand`, `sku`, `gtin` (when applicable)

### 4. Image Optimization
Product images drive both SEO traffic (Google Images) and conversions:
- **Multiple angles:** 5-8 images minimum
- **High quality:** Zoomable, detailed
- **Optimized format:** WebP with JPEG fallback
- **Descriptive alt text:** "Nike Air Max 270 men's running shoe in black — side view"
- **Descriptive file names:** `nike-air-max-270-black-side.webp` (not `IMG_4827.jpg`)
- **Image sitemap:** Include all product images

### 5. URL Structure
```
GOOD:   /mens-running-shoes/nike-air-max-270/
GOOD:   /products/nike-air-max-270/
BAD:    /p/12847/
BAD:    /products?id=12847&color=black&size=10
```

### 6. Handling Variants (Color, Size)
Product variants (colors, sizes) create duplicate content risks:
- **Same URL + variant selectors:** Best for most products. Use JavaScript to swap images/details without new URLs.
- **Separate URLs with canonicals:** Only when variants have distinct search demand (e.g., "red Nike Air Max" vs "blue Nike Air Max").
- **Never:** Create separate indexable URLs for every size/color combination without canonicals.

---

## LLM Instructions

```
You are an e-commerce product page SEO specialist.

1. OPTIMIZE product page elements:
   - Title tag: "[Product Name] — [Key Benefit] | [Brand]" (50-60 chars)
   - Meta description: Benefit + price + CTA (150-160 chars)
   - H1: Product name (can differ slightly from title tag)
   - URL: /category/product-name/ (short, keyword-rich)
   - Image alt text: Descriptive, includes product name + variant details

2. WRITE unique product descriptions that:
   - Lead with the primary benefit (not the feature)
   - Include the primary keyword in the first 100 words
   - Use natural secondary keywords throughout
   - Format with bullet points for key features/specs
   - Minimum 300 words for SEO-critical products
   - Answer common buyer questions within the description
   - Include a clear CTA

3. GENERATE product schema markup:
   - Use Product type with all required properties
   - Include Offer with price, currency, availability
   - Add AggregateRating if reviews exist
   - Include brand, SKU, GTIN/MPN when available
   - Validate against Google's Rich Results Test

4. OPTIMIZE for conversion (SEO + UX):
   - Above the fold: Product name, price, main image, add to cart
   - Trust signals: Reviews, ratings, shipping info, return policy
   - Social proof: "X people bought this today", review count
   - Urgency (when genuine): Stock levels, sale end dates
   - Related products: Cross-sell and upsell links

5. HANDLE technical challenges:
   - Variant canonicalization strategy
   - Out-of-stock pages: Keep live with "notify me" (don't 404)
   - Seasonal products: Keep URLs permanent, update content seasonally
   - Faceted navigation: Canonical to base product page
   - Pagination on reviews: Use rel="canonical" to the product page

Output: Optimized product page copy (title, meta, H1, description),
schema markup, image optimization specs, and technical recommendations.
```

---

## Examples

### Example 1: Optimized Product Page Copy
```
TITLE TAG:
  "Nike Air Max 270 Men's Running Shoe — Lightweight & Breathable | ShoeStore"
  (68 chars — slightly over, trim to:)
  "Nike Air Max 270 Men's Running Shoe | ShoeStore"
  (49 chars ✓)

META DESCRIPTION:
  "Shop the Nike Air Max 270 men's running shoe. Features lightweight
  mesh upper, Max Air cushioning, and all-day comfort. Free shipping
  on orders over $75."
  (157 chars ✓)

H1:
  "Nike Air Max 270 Men's Running Shoe"

URL:
  /mens-running-shoes/nike-air-max-270/

PRODUCT DESCRIPTION:
  "The Nike Air Max 270 delivers all-day comfort whether you're
  hitting the pavement or running errands. Built with Nike's
  largest-ever Max Air unit in the heel, this men's running shoe
  provides exceptional cushioning that absorbs impact with every step.

  The lightweight mesh upper keeps your feet cool and breathable,
  while the durable rubber outsole provides reliable traction on
  any surface.

  Key Features:
  • Max Air 270 unit — Nike's tallest heel Air unit for maximum cushioning
  • Breathable mesh upper — keeps feet cool during long runs
  • Foam midsole — responsive energy return with every stride
  • Rubber outsole — durable grip on wet and dry surfaces
  • Pull tab — easy on and off
  • Weight: 10.2 oz (men's size 10)

  Available in 12 colors. True to size — order your usual Nike size.
  Free returns within 60 days."
```

### Example 2: Product Schema Markup
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Nike Air Max 270 Men's Running Shoe",
  "image": [
    "https://shoestore.com/images/nike-air-max-270-side.webp",
    "https://shoestore.com/images/nike-air-max-270-top.webp",
    "https://shoestore.com/images/nike-air-max-270-sole.webp"
  ],
  "description": "Lightweight men's running shoe with Nike's largest Max Air 270 unit for all-day cushioning and comfort.",
  "sku": "AH8050-002",
  "gtin13": "0091206484756",
  "brand": {
    "@type": "Brand",
    "name": "Nike"
  },
  "color": "Black/White",
  "material": "Mesh, Rubber",
  "offers": {
    "@type": "Offer",
    "url": "https://shoestore.com/mens-running-shoes/nike-air-max-270/",
    "priceCurrency": "USD",
    "price": "150.00",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "ShoeStore"
    },
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": "0",
        "currency": "USD"
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 0,
          "maxValue": 1,
          "unitCode": "DAY"
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 3,
          "maxValue": 5,
          "unitCode": "DAY"
        }
      }
    },
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": 60,
      "returnMethod": "https://schema.org/ReturnByMail",
      "returnFees": "https://schema.org/FreeReturn"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "1823"
  }
}
</script>
```

### Example 3: Image Alt Text for Product Images
```html
<img src="nike-air-max-270-black-side.webp"
     alt="Nike Air Max 270 men's running shoe in black — side profile view showing the Max Air 270 unit"
     width="800" height="600" loading="lazy">

<img src="nike-air-max-270-black-top.webp"
     alt="Nike Air Max 270 top-down view showing breathable mesh upper"
     width="800" height="600" loading="lazy">

<img src="nike-air-max-270-black-sole.webp"
     alt="Nike Air Max 270 rubber outsole with traction pattern"
     width="800" height="600" loading="lazy">

<img src="nike-air-max-270-on-foot.webp"
     alt="Nike Air Max 270 worn on foot during outdoor run"
     width="800" height="600" loading="lazy">
```

### Example 4: Out-of-Stock Product Page Strategy
```html
<!-- DON'T: 404 or remove the page -->
<!-- DO: Keep the page live with alternatives -->

<h1>Nike Air Max 270 Men's Running Shoe</h1>
<p class="stock-status">Currently out of stock</p>

<form class="notify-form">
  <label>Get notified when back in stock:</label>
  <input type="email" placeholder="Your email">
  <button type="submit">Notify Me</button>
</form>

<section class="alternatives">
  <h2>Similar Running Shoes You Might Like</h2>
  <!-- Show 4-6 in-stock alternatives from the same category -->
  <a href="/mens-running-shoes/nike-air-max-90/">Nike Air Max 90</a>
  <a href="/mens-running-shoes/nike-pegasus-41/">Nike Pegasus 41</a>
</section>

<!-- Keep the schema but update availability -->
"availability": "https://schema.org/OutOfStock"
```

## Common Mistakes
- **Manufacturer copy-paste:** Using the same description as every other retailer guarantees you won't rank.
- **Missing schema:** Without Product schema, you miss rich results (price, rating, availability in SERPs).
- **Thin product pages:** A product image + price + "Buy now" is not enough. Add description, specs, reviews, FAQ.
- **404ing out-of-stock products:** You lose all accumulated SEO value. Keep the page, offer alternatives.
- **Ignoring image SEO:** "IMG_4827.jpg" with `alt=""` is wasted opportunity. Every image is a ranking opportunity.
- **URL parameters for variants:** `/product?color=black&size=10` creates thousands of duplicate URLs without proper canonicalization.

---

*Last reviewed: 2026-02*

**See also:** [Category Page SEO](../Category-Page-SEO/category-page-seo.md) | [Structured Data](../../Technical-SEO/Structured-Data/structured-data.md)
