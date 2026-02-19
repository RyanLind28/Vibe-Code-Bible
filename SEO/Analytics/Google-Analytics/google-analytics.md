# Google Analytics (GA4) for SEO

> Google Analytics 4 is the measurement platform for understanding how organic search traffic interacts with your site. For SEO, GA4 answers: "What happens AFTER users click from search results?" — engagement, conversion, and revenue attribution.

---

## Principles

### 1. GA4 vs. Universal Analytics
GA4 is event-based (not session-based like UA):
- Every interaction is an **event** (page_view, scroll, click, purchase)
- **Engagement rate** replaces bounce rate
- **Key events** (formerly conversions) track goal completions
- **Predictive audiences** use machine learning
- **Cross-platform** tracking (web + app)

### 2. Key GA4 Metrics for SEO

| Metric | What It Tells You | Why It Matters for SEO |
|--------|-------------------|----------------------|
| **Organic sessions** | Traffic from search engines | Core SEO KPI |
| **Engaged sessions** | Sessions > 10s, 2+ page views, or key event | Quality of organic traffic |
| **Engagement rate** | % of engaged sessions | Replaced bounce rate — signals content quality |
| **Key events** | Goal completions from organic | SEO's revenue contribution |
| **Revenue** | Revenue attributed to organic | SEO ROI proof |
| **Landing pages** | Where organic users enter | Which pages drive SEO traffic |
| **New vs returning** | Audience growth vs retention | Organic audience health |
| **Average engagement time** | Time spent actively viewing | Content engagement quality |

### 3. GA4 + Search Console Integration
Connect GA4 and Google Search Console for the complete picture:
- **Search Console:** Impressions, clicks, CTR, position (pre-click)
- **GA4:** Engagement, conversions, revenue (post-click)
- **Together:** Full funnel from SERP impression → site visit → conversion

To connect: GA4 → Admin → Product Links → Search Console Linking

### 4. Custom SEO Reports in GA4
GA4's Explore reports let you build custom SEO dashboards:
- **Landing page performance:** Organic sessions, engagement, conversions by page
- **Content group analysis:** Performance by topic/category
- **Conversion path analysis:** Organic's role in multi-touch attribution
- **Page-level engagement:** Which pages keep users engaged longest

### 5. Event Tracking for SEO
Track events that indicate content quality and engagement:
- **scroll** (built-in): % of users scrolling to 90%
- **file_download:** PDF/resource downloads from organic traffic
- **form_submit:** Lead gen form submissions
- **outbound_click:** Links to external sites
- **video_play/complete:** Video engagement on content pages
- **search:** Internal site search (what users couldn't find)

### 6. Attribution for SEO
GA4 supports data-driven attribution — organic search often gets credit beyond last-click:
- **First touch:** Organic introduced the user
- **Assisted conversions:** Organic appeared in the conversion path
- **Last touch:** Organic was the final interaction before conversion

Use the Attribution Paths report (under Advertising > Attribution) to see organic's true impact.

---

## LLM Instructions

```
You are a GA4 analytics specialist for SEO.

1. SET UP GA4 for SEO tracking:
   - Configure the GA4 tag (gtag.js or GTM)
   - Enable enhanced measurement events
   - Link Google Search Console
   - Set up key events (conversions) relevant to the business
   - Create custom channel groupings if needed
   - Set up content groupings for SEO topics

2. BUILD SEO dashboards:
   - Organic traffic overview: sessions, users, engagement rate, key events
   - Landing page report: top organic landing pages with engagement + conversion metrics
   - Content performance: by topic cluster / category
   - Conversion attribution: organic's role in the conversion path
   - Year-over-year comparison: this year vs last year organic metrics

3. ANALYZE SEO performance:
   - Which organic landing pages drive the most conversions?
   - What is the engagement rate for organic vs other channels?
   - Which content clusters have the highest revenue per session?
   - Where is organic traffic growing vs declining?
   - What is organic's contribution to multi-touch conversions?

4. DIAGNOSE traffic issues:
   - If organic sessions drop: check GSC for ranking changes first
   - If engagement rate drops: check for content changes or technical issues
   - If conversions drop but traffic is stable: check conversion funnel / UX
   - If new user % drops: check branded vs non-branded traffic split

5. REPORT to stakeholders:
   - Monthly SEO report template:
     → Organic sessions (MoM and YoY)
     → Revenue from organic (with attribution model noted)
     → Top performing pages (by sessions and conversions)
     → New content performance
     → Key events and conversion rate
     → Action items for next month

Output: GA4 configuration checklist, custom report specifications,
and monthly reporting template.
```

---

## Examples

### Example 1: GA4 Tag Implementation (gtag.js)
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-XXXXXXXXXX', {
    // Enhanced measurement auto-tracks: page_view, scroll, outbound_click,
    // site_search, video_engagement, file_download
  });
</script>
```

### Example 2: Custom SEO Key Event Tracking
```javascript
// Track newsletter signup (key event for content SEO)
document.querySelector('#newsletter-form').addEventListener('submit', function() {
  gtag('event', 'newsletter_signup', {
    'page_path': window.location.pathname,
    'page_title': document.title
  });
});

// Track CTA clicks on blog posts
document.querySelectorAll('.blog-cta').forEach(function(cta) {
  cta.addEventListener('click', function() {
    gtag('event', 'cta_click', {
      'cta_text': cta.textContent,
      'page_location': window.location.href
    });
  });
});

// Track content engagement (read depth)
let maxScroll = 0;
window.addEventListener('scroll', function() {
  const scrollPercent = Math.round(
    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
  );
  if (scrollPercent > maxScroll) {
    maxScroll = scrollPercent;
    if ([25, 50, 75, 100].includes(scrollPercent)) {
      gtag('event', 'content_read_depth', {
        'read_depth': scrollPercent + '%',
        'page_location': window.location.href
      });
    }
  }
});
```

### Example 3: GA4 API — Automated SEO Report
```python
# Pull organic traffic data via GA4 Data API
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest, DateRange, Metric, Dimension, FilterExpression,
    Filter
)

client = BetaAnalyticsDataClient()
property_id = "properties/XXXXXXXXX"

request = RunReportRequest(
    property=property_id,
    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
    dimensions=[
        Dimension(name="landingPage"),
        Dimension(name="sessionDefaultChannelGroup"),
    ],
    metrics=[
        Metric(name="sessions"),
        Metric(name="engagedSessions"),
        Metric(name="engagementRate"),
        Metric(name="keyEvents"),
        Metric(name="totalRevenue"),
    ],
    dimension_filter=FilterExpression(
        filter=Filter(
            field_name="sessionDefaultChannelGroup",
            string_filter=Filter.StringFilter(
                value="Organic Search",
                match_type=Filter.StringFilter.MatchType.EXACT,
            ),
        ),
    ),
    order_bys=[{"metric": {"metric_name": "sessions"}, "desc": True}],
    limit=50,
)

response = client.run_report(request)

print("Top 50 Organic Landing Pages (Last 30 Days)")
print("-" * 80)
for row in response.rows:
    landing_page = row.dimension_values[0].value
    sessions = row.metric_values[0].value
    engagement_rate = float(row.metric_values[2].value) * 100
    key_events = row.metric_values[3].value
    revenue = row.metric_values[4].value

    print(f"{landing_page}")
    print(f"  Sessions: {sessions} | Engagement: {engagement_rate:.1f}% | "
          f"Key Events: {key_events} | Revenue: ${revenue}")
```

### Example 4: Monthly SEO Report Template
```markdown
## Monthly SEO Report — January 2025

### Executive Summary
Organic traffic grew 8.2% MoM and 23.4% YoY. Organic revenue
increased 12.1% MoM to $428,000, representing 34% of total revenue.

### Traffic Overview
| Metric              | This Month | Last Month | MoM    | Last Year | YoY    |
|---------------------|------------|------------|--------|-----------|--------|
| Organic Sessions    | 485,000    | 448,000    | +8.2%  | 393,000   | +23.4% |
| Organic Users       | 392,000    | 361,000    | +8.6%  | 312,000   | +25.6% |
| Engagement Rate     | 62.3%      | 60.1%      | +2.2pp | 55.8%     | +6.5pp |
| Avg Engagement Time | 2m 14s     | 2m 08s     | +4.7%  | 1m 52s    | +19.6% |

### Conversion Performance
| Metric              | This Month | Last Month | MoM    |
|---------------------|------------|------------|--------|
| Organic Key Events  | 3,420      | 3,180      | +7.5%  |
| Organic Revenue     | $428,000   | $382,000   | +12.1% |
| Conv. Rate (Organic)| 0.71%      | 0.71%      | Flat   |
| Revenue per Session | $0.88      | $0.85      | +3.5%  |

### Top Performing Pages (by organic sessions)
1. /blog/complete-seo-guide/ — 23,400 sessions (+15%)
2. /tools/keyword-generator/ — 18,200 sessions (+32%)
3. /blog/technical-seo-checklist/ — 12,800 sessions (+8%)

### Action Items for February
1. Publish 8 planned cluster pages for the "content marketing" topic
2. Update 5 declining pages (flagged in GSC)
3. Submit new product schema for 120 recently added products
```

## Common Mistakes
- **Not linking GSC to GA4:** You lose the pre-click data (impressions, position, CTR) that completes the SEO picture.
- **Using bounce rate instead of engagement rate:** GA4's engagement rate is more meaningful. An "engaged session" means the user spent 10+ seconds, viewed 2+ pages, or completed a key event.
- **Ignoring assisted conversions:** Last-click attribution massively undervalues organic for discovery-stage keywords. Check the Attribution Paths report (under Advertising > Attribution).
- **Not filtering by channel:** Always segment by "Organic Search" when reporting SEO metrics. Blended data obscures organic's true performance.
- **Vanity metrics:** Sessions alone don't prove SEO value. Tie organic traffic to engagement, key events, and revenue.
- **No YoY comparison:** SEO is seasonal. MoM comparison alone can be misleading. Always include YoY context.

---

Last reviewed: 2026-02

See also: [Search Console](../Search-Console/)
