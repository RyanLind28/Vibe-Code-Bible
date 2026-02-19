# Core Web Vitals

> Google's Core Web Vitals are measurable, user-centric metrics that quantify the experience of your site. They are a confirmed ranking signal, though Google has indicated they serve as a lightweight/tiebreaker factor — content relevance and authority still matter far more.

---

## Principles

### 1. The Three Core Web Vitals

| Metric | What It Measures | Good | Needs Improvement | Poor |
|--------|-----------------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | Loading performance — when the largest visible element renders | ≤ 2.5s | 2.5s–4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | Responsiveness — delay between user interaction and visual response | ≤ 200ms | 200ms–500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Visual stability — how much the layout shifts unexpectedly | ≤ 0.1 | 0.1–0.25 | > 0.25 |

### 2. LCP Optimization
The largest element is usually a hero image, heading, or video. Optimize by:
- Preloading the LCP resource
- Using modern image formats (WebP, AVIF)
- Implementing proper image sizing (`width`/`height` attributes)
- Reducing server response time (TTFB < 800ms)
- Eliminating render-blocking resources

### 3. INP Optimization
INP replaced FID (First Input Delay) in March 2024. It measures ALL interactions (the worst latency, ignoring the top 1 per 50 interactions):
- Break up long tasks (> 50ms) into smaller chunks
- Use `scheduler.yield()` (modern, preferred) or `setTimeout(resolve, 0)` (fallback) to yield to the main thread
- Use `requestIdleCallback` for non-critical, deferrable work
- Minimize main thread blocking
- Defer non-essential JavaScript with `async`/`defer` attributes
- Use web workers for heavy computation

### 4. CLS Optimization
Layout shifts frustrate users and hurt rankings:
- Always set `width` and `height` on images and videos
- Reserve space for ads and embeds
- Avoid inserting content above existing content
- Use `font-display: optional` (best for CLS — no layout shift) or `font-display: swap` with `<link rel="preload" as="font">` (compromise — visible text immediately, but may cause minor flash)
- Use CSS `contain` property for dynamic content areas

### 5. Field Data vs. Lab Data
- **Field data** (CrUX / Real User Monitoring): What Google uses for ranking. Based on real user visits.
- **Lab data** (Lighthouse, WebPageTest): Useful for debugging but not used directly for rankings.

---

## LLM Instructions

```
You are a Core Web Vitals performance engineer. When optimizing CWV:

1. DIAGNOSE issues using this priority order:
   a. Check CrUX data (field) via PageSpeed Insights API or Search Console
   b. Run Lighthouse audit for lab data
   c. Identify which metric(s) are failing: LCP, INP, or CLS

2. FOR LCP ISSUES:
   - Identify the LCP element (run Lighthouse → Performance → LCP Element)
   - If image: add <link rel="preload">, use srcset, convert to WebP/AVIF
   - If text: preload the font, ensure no render-blocking CSS
   - If server-slow: recommend CDN, edge caching, or SSG
   - Generate the specific preload tag:
     <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

3. FOR INP ISSUES:
   - Identify long tasks using Performance tab in DevTools
   - Break tasks > 50ms using yield patterns:
     Preferred: await scheduler.yield()
     Fallback: await new Promise(resolve => setTimeout(resolve, 0))
   - Recommend moving heavy logic to Web Workers
   - Defer third-party scripts with async/defer attributes

4. FOR CLS ISSUES:
   - Identify shifting elements (Lighthouse → CLS audit)
   - Add explicit width/height or aspect-ratio to all media
   - Reserve space for dynamic content with min-height
   - Use font-display: optional or swap + preload

5. OUTPUT a prioritized action plan with expected impact per fix.
```

---

## Examples

### Example 1: Preload LCP Image
```html
<head>
  <!-- Preload the hero image that is the LCP element -->
  <link rel="preload" as="image" href="/images/hero.webp"
        type="image/webp" fetchpriority="high">
</head>
<body>
  <img src="/images/hero.webp" alt="Hero banner"
       width="1200" height="600" fetchpriority="high"
       decoding="async">
</body>
```

### Example 2: Responsive Images for LCP
```html
<img
  srcset="
    /images/hero-400.webp 400w,
    /images/hero-800.webp 800w,
    /images/hero-1200.webp 1200w"
  sizes="(max-width: 600px) 400px,
         (max-width: 1000px) 800px,
         1200px"
  src="/images/hero-1200.webp"
  alt="Product showcase"
  width="1200"
  height="600"
  fetchpriority="high"
/>
```

### Example 3: Yield to Main Thread (INP Fix)
```javascript
// BAD: Long blocking task
function processLargeList(items) {
  items.forEach(item => heavyOperation(item));
}

// GOOD (modern): Use scheduler.yield() — preferred approach
async function processLargeList(items) {
  const CHUNK_SIZE = 50;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    chunk.forEach(item => heavyOperation(item));
    // Yield to the main thread (scheduler.yield available since Chrome 115)
    if ('scheduler' in globalThis && 'yield' in scheduler) {
      await scheduler.yield();
    } else {
      // Fallback for older browsers
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

### Example 4: Prevent CLS with Aspect Ratio
```css
/* Reserve space for images before they load */
.hero-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
  object-fit: cover;
}

/* Reserve space for ads */
.ad-slot {
  min-height: 250px;
  min-width: 300px;
  background: #f0f0f0;
}

/* Prevent font swap layout shift */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: optional; /* no layout shift — falls back if slow */
}
```

### Example 5: Next.js Image Optimization
```jsx
import Image from 'next/image'

export default function Hero() {
  return (
    <Image
      src="/hero.webp"
      alt="Hero image"
      width={1200}
      height={600}
      priority          // Preloads the image (for LCP)
      sizes="100vw"
      quality={85}
    />
  )
}
```

## Common Mistakes
- **Lazy-loading the LCP image:** Never use `loading="lazy"` on above-the-fold content. Use `fetchpriority="high"` instead.
- **Too many third-party scripts:** Each script adds to INP. Audit with Chrome DevTools Performance tab or the Coverage tab.
- **Forgetting mobile:** CWV are measured per device type. Mobile is usually worse and more important.
- **Optimizing lab data only:** Your Lighthouse score can be 100 while field data fails. Always check CrUX.
- **Font display: swap without preload:** Causes visible text swap (CLS). Pair with `<link rel="preload" as="font">`.

---

*Last reviewed: 2026-02*

**See also:** [Crawlability](../Crawlability/crawlability.md) | [Structured Data](../Structured-Data/structured-data.md)
