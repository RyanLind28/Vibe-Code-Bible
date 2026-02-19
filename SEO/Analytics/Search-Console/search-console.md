# Google Search Console (GSC)

> Google Search Console is the most important free tool for SEO. It's the only tool that provides data directly from Google about how your site performs in search: what queries you appear for, how often you're clicked, what issues Google found, and how your pages are indexed.

---

## Principles

### 1. What GSC Provides That No Other Tool Can
- **Search performance data** directly from Google (not estimated)
- **Index coverage** — which pages are indexed and why others aren't
- **Crawl stats** — how Googlebot interacts with your site
- **Manual actions** — penalties applied by Google's team
- **Security issues** — malware, hacked content alerts
- **Core Web Vitals** — field data (real user metrics)
- **Links report** — who links to you and your top linked pages

### 2. Key GSC Metrics

| Metric | Definition | What to Watch |
|--------|-----------|---------------|
| **Impressions** | Times your URL appeared in search results | Visibility — are you being shown? |
| **Clicks** | Times a user clicked your result | Traffic — are you being chosen? |
| **CTR** | Clicks ÷ Impressions | Effectiveness — how compelling is your listing? |
| **Position** | Average ranking position in search results | Rankings — where do you appear? |

### 3. How to Use the Performance Report
The Performance report is the core of GSC. Analyze it by:
- **Queries:** What people search to find you
- **Pages:** Which pages get the most impressions/clicks
- **Countries:** Where your audience is
- **Devices:** Mobile vs desktop vs tablet
- **Dates:** Trends over time (compare periods)
- **Search appearance:** How results look (rich results, video, etc.)

### 4. Index Coverage Report
Tells you the indexing status of every URL:
- **Indexed:** Pages in Google's index (good)
- **Not indexed — crawled but not indexed:** Google found it but chose not to index it (content quality concern)
- **Not indexed — discovered, not crawled:** Google knows it exists but hasn't crawled it (crawl budget concern)
- **Excluded by robots.txt:** You're blocking Google from crawling
- **Excluded — noindex tag:** You told Google not to index
- **Redirect:** The URL redirects to another page
- **Duplicate — canonical selected by Google:** Google chose a different canonical

### 5. URL Inspection Tool
Inspect any URL on your site to see:
- Is it indexed?
- When was it last crawled?
- What canonical did Google select?
- Is the page mobile-friendly?
- Any schema markup errors?
- Request indexing for new or updated pages

### 6. Using GSC Data for SEO Decisions
- **Low position + high impressions** = Ranking page 2-3 but getting seen. Optimize to push to page 1.
- **High position + low CTR** = Ranking well but nobody clicks. Improve title tag and meta description.
- **Declining impressions** = Losing rankings. Investigate keyword-level changes.
- **Crawled but not indexed** = Google doesn't find the content valuable enough. Improve content quality.

---

## LLM Instructions

```
You are a Google Search Console analysis specialist.

1. ANALYZE search performance:
   - Pull top queries by clicks, impressions, CTR, and position
   - Identify high-impression/low-click queries (CTR optimization opportunities)
   - Find low-position/high-impression queries (ranking improvement opportunities)
   - Compare performance across time periods (MoM, YoY)
   - Segment by device (mobile vs desktop)
   - Segment by country for international sites

2. AUDIT indexing health:
   - What % of submitted URLs are indexed?
   - What are the top "not indexed" reasons?
   - Are important pages in the "crawled but not indexed" category?
   - Are there unexpected pages being indexed (thin, duplicate)?
   - Is the sitemap up to date and correctly processed?

3. IDENTIFY optimization opportunities:
   - Queries ranking position 5-20 (push to top 3)
   - Pages with high impressions but low CTR (improve title/meta)
   - Pages losing rankings (content refresh needed)
   - New queries appearing (emerging trends to target)
   - Pages not indexed that should be (content quality improvement)

4. MONITOR for issues:
   - Sudden impression drops (algorithm update or technical issue?)
   - Spike in "not indexed" pages
   - Manual actions or security issues
   - Core Web Vitals regressions
   - Crawl errors (5xx, 404, soft 404)

5. CREATE an action plan from GSC data:
   Priority 1: Fix technical issues (crawl errors, indexing problems)
   Priority 2: CTR optimization for high-impression pages
   Priority 3: Content improvement for "almost ranking" keywords (pos 5-15)
   Priority 4: New content for emerging query opportunities
   Priority 5: Ongoing monitoring and trend analysis

Output: GSC analysis report with performance trends, indexing health,
optimization opportunities, and prioritized action items.
```

---

## Examples

### Example 1: GSC Performance Analysis
```markdown
## Top Opportunities from GSC Data

### CTR Optimization Opportunities (High Impressions, Low CTR)
| Query                        | Impressions | Clicks | CTR  | Position | Action                    |
|------------------------------|-------------|--------|------|----------|---------------------------|
| project management software  | 45,000      | 900    | 2.0% | 8.3      | Improve title tag + meta   |
| best project management tool | 28,000      | 420    | 1.5% | 11.2     | Optimize for page 1        |
| free project management app  | 18,000      | 540    | 3.0% | 6.7      | A/B test title tag         |

### Ranking Improvement Opportunities (Position 5-15)
| Query                         | Position | Impressions | Clicks | Action                |
|-------------------------------|----------|-------------|--------|-----------------------|
| project management comparison | 7.2      | 12,000      | 480    | Add more comparisons  |
| gantt chart software          | 9.8      | 8,500       | 170    | Expand feature content |
| team collaboration tools      | 12.1     | 22,000      | 220    | Build internal links   |

### Declining Queries (Last 28 days vs Previous 28 days)
| Query                      | Position (Now) | Position (Before) | Change | Action           |
|----------------------------|----------------|-------------------|--------|------------------|
| remote team management     | 14.5           | 8.2               | -6.3   | Content refresh  |
| agile project management   | 18.3           | 12.1              | -6.2   | Update + expand  |
| sprint planning tool       | 22.7           | 15.4              | -7.3   | New content needed|
```

### Example 2: GSC API — Automated Data Pull
```python
# Pull GSC search performance data via API
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
credentials = service_account.Credentials.from_service_account_file(
    'credentials.json', scopes=SCOPES)
service = build('searchconsole', 'v1', credentials=credentials)

def get_top_queries(site_url, start_date, end_date, row_limit=100):
    """Get top queries with performance metrics."""
    request = {
        'startDate': start_date,
        'endDate': end_date,
        'dimensions': ['query'],
        'rowLimit': row_limit,
        'dimensionFilterGroups': [{
            'filters': [{
                'dimension': 'country',
                'operator': 'equals',
                'expression': 'usa'
            }]
        }]
    }

    response = service.searchanalytics().query(
        siteUrl=site_url, body=request).execute()

    for row in response.get('rows', []):
        query = row['keys'][0]
        clicks = row['clicks']
        impressions = row['impressions']
        ctr = row['ctr']
        position = row['position']
        print(f"{query}: {clicks} clicks, {impressions} imp, "
              f"{ctr:.1%} CTR, pos {position:.1f}")

def get_indexing_status(site_url):
    """Check index coverage via URL Inspection API."""
    # Note: URL Inspection API has per-URL limits
    request = {
        'inspectionUrl': 'https://example.com/some-page/',
        'siteUrl': site_url
    }
    response = service.urlInspection().index().inspect(body=request).execute()
    result = response['inspectionResult']['indexStatusResult']
    print(f"Coverage: {result['coverageState']}")
    print(f"Indexing: {result['indexingState']}")
    print(f"Last crawl: {result.get('lastCrawlTime', 'Never')}")

# Usage
get_top_queries('https://example.com/', '2025-01-01', '2025-01-31')
```

### Example 3: Index Coverage Action Plan
```markdown
## Index Coverage Audit

### Summary
| Status                             | Count  | % of Total |
|------------------------------------|--------|------------|
| Indexed                            | 12,400 | 72%        |
| Crawled — not indexed              | 2,100  | 12%        |
| Discovered — not yet crawled       | 1,800  | 10%        |
| Excluded by noindex                | 500    | 3%         |
| Duplicate — Google chose canonical | 350    | 2%         |
| Redirect                           | 150    | 1%         |

### Action Items

CRITICAL — "Crawled but not indexed" (2,100 pages):
  Analysis: 1,400 are thin blog posts (<300 words) from 2018-2020
  Action:
  1. Identify 200 with ranking potential → expand to 1,500+ words
  2. Identify 500 that can be merged into comprehensive guides
  3. 301 redirect 700 to relevant existing pages
  4. Noindex remaining 100 (truly low value)

HIGH — "Discovered, not yet crawled" (1,800 pages):
  Analysis: Mostly new product pages added in last 30 days
  Action:
  1. Submit updated sitemap
  2. Add internal links from category pages to new products
  3. Request indexing for high-priority pages via URL Inspection
  4. Monitor crawl stats for improvement

MEDIUM — "Duplicate — Google chose canonical" (350 pages):
  Analysis: Faceted navigation creating duplicate URLs
  Action:
  1. Add canonical tags to all faceted URLs pointing to the base category page
  2. Add `noindex, follow` meta robots to faceted pages as a secondary signal
  3. Implement AJAX-based filtering (no URL changes) as the long-term fix
  Note: Do NOT block faceted URLs in robots.txt — this prevents Google
  from seeing the canonical/noindex tags, potentially making the problem worse.
```

### Example 4: GSC + GA4 Combined Analysis
```markdown
## Combined Search Console + GA4 Analysis

### Top Content by Full Funnel

| Page                      | GSC Imp. | GSC Clicks | GSC CTR | GA4 Eng. Rate | GA4 Conversions | Revenue  |
|---------------------------|----------|------------|---------|---------------|-----------------|----------|
| /blog/seo-guide/          | 120,000  | 8,400      | 7.0%    | 71%           | 234             | $18,200  |
| /tools/keyword-generator/ | 85,000   | 6,200      | 7.3%    | 65%           | 412             | $32,100  |
| /blog/link-building/      | 65,000   | 3,250      | 5.0%    | 58%           | 87              | $6,800   |
| /pricing/                 | 45,000   | 4,950      | 11.0%   | 82%           | 890             | $89,000  |
| /features/analytics/      | 32,000   | 2,880      | 9.0%    | 73%           | 156             | $15,600  |

### Insights
1. /tools/keyword-generator/ has the highest conversion count —
   invest in more free tools
2. /blog/link-building/ has low CTR (5%) — optimize title tag
3. /pricing/ has highest engagement and revenue per click —
   increase internal links to pricing from blog content
4. /blog/seo-guide/ drives most top-of-funnel traffic —
   add stronger CTAs for email capture
```

## Common Mistakes
- **Not connecting to GA4:** GSC shows pre-click data. GA4 shows post-click data. You need both.
- **Ignoring "crawled but not indexed":** This is Google telling you your content isn't good enough. Fix it or consolidate.
- **Position averages are deceiving:** A "position 10" average could mean positions 1 and 20 across different queries. Segment by query.
- **Not comparing time periods:** Absolute numbers mean little without trend context. Always compare MoM and YoY.
- **Only looking at top queries:** The long tail (position 10-50 queries) often has the biggest optimization opportunities.
- **Not requesting indexing:** When you update important content, use the URL Inspection tool to request re-indexing. Don't wait for the next crawl.

---

*Last reviewed: 2026-02*

**See also:** [Google Analytics](../Google-Analytics/google-analytics.md) | [Crawlability](../../Technical-SEO/Crawlability/crawlability.md)
