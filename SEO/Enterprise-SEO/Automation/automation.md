# Enterprise SEO Automation

> At enterprise scale (10,000+ pages), manual SEO is impossible. Automation is the only way to maintain quality, consistency, and speed across a massive site. Enterprise SEO automation spans monitoring, content optimization, technical health, and reporting.

---

## Principles

### 1. What to Automate in Enterprise SEO

| Area | What to Automate | Tools/Methods |
|------|-----------------|---------------|
| **Monitoring** | Rank tracking, crawl errors, indexing issues | GSC API, Ahrefs API, custom dashboards |
| **Technical audits** | Broken links, redirect chains, missing tags | Screaming Frog CLI, custom crawlers |
| **Content** | Meta tag generation, schema markup, content briefs | Templates, CMS plugins, AI/LLM pipelines |
| **Reporting** | Weekly/monthly SEO performance reports | Looker Studio, custom scripts |
| **Alerts** | Traffic drops, indexing issues, ranking changes | GSC API + alerting (Slack, email) |
| **Internal linking** | Link suggestions, orphan page detection | Custom scripts, CMS integrations |
| **Log analysis** | Crawl behavior, bot frequency, crawl budget waste | Log file processors, BigQuery |

### 2. The Automation Pyramid
```
         ┌──────────────┐
         │   AI/LLM     │  ← Content generation, analysis
         │  Automation   │
         ├──────────────┤
         │   Workflow    │  ← Approval processes, task routing
         │  Automation   │
         ├──────────────┤
         │  Monitoring   │  ← Alerts, dashboards, anomaly detection
         │  Automation   │
         ├──────────────┤
         │  Technical    │  ← Crawl health, redirects, sitemaps
         │  Automation   │
         └──────────────┘
```

Start at the bottom (technical) and work up.

### 3. APIs for Enterprise SEO
- **Google Search Console API:** Performance data, URL inspection, sitemap submission
- **Google Analytics Data API:** Traffic, engagement, conversion data
- **Ahrefs/SEMrush API:** Backlinks, keyword data, competitor analysis
- **Screaming Frog CLI:** Headless crawling at scale
- **ContentKing / Lumar API:** Real-time site monitoring
- **Custom crawlers:** Scrapy, Puppeteer for specific checks

### 4. Build vs. Buy
| Approach | When to Use |
|----------|-------------|
| **Build custom** | Unique workflows, competitive advantage, full control |
| **Buy platform** | Standard needs, limited dev resources, quick deployment |
| **Hybrid** | Platform for basics + custom scripts for differentiation |

Enterprise SEO platforms: Conductor, BrightEdge, seoClarity, Botify, Lumar

### 5. Key Automation Principles
- **Don't automate bad processes:** Fix the process first, then automate it
- **Human review for content:** AI can draft, but humans must approve (E-E-A-T)
- **Test before scaling:** Run automation on 100 pages before deploying to 100,000
- **Monitor the monitors:** Automated systems can fail silently. Build health checks.
- **Version control everything:** Treat SEO configurations as code (infrastructure as code)

---

## LLM Instructions

```
You are an enterprise SEO automation architect.

1. ASSESS automation needs:
   - How many pages does the site have?
   - What CMS/tech stack is in use?
   - What SEO tasks are currently manual?
   - What are the biggest bottlenecks?
   - What dev/engineering resources are available?

2. DESIGN automation workflows:
   - Monitoring: What metrics to track, alert thresholds, dashboards
   - Technical: Automated crawls, health checks, redirect management
   - Content: Template-based meta tag generation, schema automation
   - Reporting: Automated weekly/monthly reports with key metrics
   - Alerting: Traffic anomaly detection, ranking drops, indexing issues

3. BUILD with these patterns:
   - GSC API for indexing and performance data
   - Cron jobs for scheduled crawls and checks
   - GitHub Actions for CI/CD SEO validation
   - Webhooks for real-time alerts
   - Database for historical tracking and trend analysis

4. IMPLEMENT CI/CD SEO checks:
   - Pre-deploy: Validate meta tags, canonical tags, schema markup
   - Post-deploy: Crawl changed URLs, verify no broken links
   - Alerts: Notify team if SEO regressions detected

5. CREATE an alert system:
   Severity levels:
   - CRITICAL: >20% traffic drop, site deindexed, 5xx errors sitewide
   - WARNING: >10% traffic drop, new crawl errors, ranking drops
   - INFO: Minor changes, new pages indexed, performance trends

Output: Automation architecture diagram, tool recommendations,
implementation plan, and monitoring setup.
```

---

## Examples

### Example 1: GSC API — Automated Performance Monitoring
```python
# Fetch GSC performance data and alert on traffic drops
from google.oauth2 import service_account
from googleapiclient.discovery import build
import datetime

SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
SERVICE_ACCOUNT_FILE = 'credentials.json'
SITE_URL = 'https://example.com/'

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)
service = build('searchconsole', 'v1', credentials=credentials)

def get_performance(start_date, end_date):
    request = {
        'startDate': start_date,
        'endDate': end_date,
        'dimensions': ['date'],
        'rowLimit': 1000
    }
    response = service.searchanalytics().query(
        siteUrl=SITE_URL, body=request).execute()
    return response.get('rows', [])

# Compare last 7 days vs previous 7 days
today = datetime.date.today()
current = get_performance(
    (today - datetime.timedelta(days=7)).isoformat(),
    (today - datetime.timedelta(days=1)).isoformat()
)
previous = get_performance(
    (today - datetime.timedelta(days=14)).isoformat(),
    (today - datetime.timedelta(days=8)).isoformat()
)

current_clicks = sum(row['clicks'] for row in current)
previous_clicks = sum(row['clicks'] for row in previous)
change_pct = ((current_clicks - previous_clicks) / previous_clicks) * 100

if change_pct < -10:
    send_alert(f"WARNING: Organic traffic dropped {change_pct:.1f}% week-over-week")
if change_pct < -20:
    send_alert(f"CRITICAL: Organic traffic dropped {change_pct:.1f}% week-over-week")
```

### Example 2: CI/CD SEO Validation (GitHub Actions)
```yaml
# .github/workflows/seo-checks.yml
name: SEO Pre-Deploy Checks

on:
  pull_request:
    branches: [main]

jobs:
  seo-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build site
        run: npm run build

      - name: Check meta tags
        run: |
          node scripts/validate-meta-tags.js
          # Validates:
          # - Every page has a unique <title> (50-60 chars)
          # - Every page has a meta description (150-160 chars)
          # - Every page has a canonical tag
          # - No duplicate titles across pages

      - name: Check schema markup
        run: |
          node scripts/validate-schema.js
          # Validates:
          # - JSON-LD is valid JSON
          # - Required properties are present
          # - URLs are absolute

      - name: Check internal links
        run: |
          node scripts/check-internal-links.js
          # Validates:
          # - No broken internal links
          # - No orphan pages
          # - All links use correct protocol

      - name: Check images
        run: |
          node scripts/check-images.js
          # Validates:
          # - All images have alt text
          # - No images over 500KB
          # - Width/height attributes present

      - name: Report results
        if: failure()
        run: |
          echo "SEO validation failed. Check the logs above."
          exit 1
```

### Example 3: Automated Redirect Management
```python
# Automated redirect monitoring and cleanup
import csv
import requests

def audit_redirects(redirect_file):
    """Check all redirects for chains, loops, and broken destinations."""
    issues = []

    with open(redirect_file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            source = row['source']
            target = row['target']

            # Follow the redirect chain
            response = requests.head(source, allow_redirects=False, timeout=10)

            # Check for chains
            hops = 0
            current_url = source
            while response.is_redirect and hops < 10:
                current_url = response.headers.get('Location')
                response = requests.head(current_url, allow_redirects=False, timeout=10)
                hops += 1

            if hops > 1:
                issues.append({
                    'type': 'CHAIN',
                    'source': source,
                    'target': target,
                    'hops': hops,
                    'final': current_url,
                    'fix': f'Redirect {source} directly to {current_url}'
                })

            if hops >= 10:
                issues.append({
                    'type': 'LOOP',
                    'source': source,
                    'fix': 'Redirect loop detected — remove or fix'
                })

            if response.status_code >= 400:
                issues.append({
                    'type': 'BROKEN',
                    'source': source,
                    'target': current_url,
                    'status': response.status_code,
                    'fix': f'Update redirect target — returns {response.status_code}'
                })

    return issues
```

### Example 4: Automated Meta Tag Generation Template
```python
# Template-based meta tag generation for pSEO pages
META_TEMPLATES = {
    'product': {
        'title': '{product_name} — {key_benefit} | {brand}',
        'description': 'Shop {product_name} by {brand_name}. {key_feature}. '
                       'Starting at ${price}. Free shipping over $75.',
    },
    'category': {
        'title': '{category_name} — Shop {count}+ {product_type} | {brand}',
        'description': 'Browse {count}+ {category_name} from top brands. '
                       '{value_prop}. Free shipping & easy returns.',
    },
    'comparison': {
        'title': '{tool_a} vs {tool_b}: Comparison ({year}) | {brand}',
        'description': 'Compare {tool_a} vs {tool_b} on features, pricing, '
                       'and ease of use. See which is best for {use_case}.',
    },
}

def generate_meta(page_type, data):
    template = META_TEMPLATES[page_type]
    title = template['title'].format(**data)
    description = template['description'].format(**data)

    # Enforce character limits
    if len(title) > 60:
        title = title[:57] + '...'
    if len(description) > 160:
        description = description[:157] + '...'

    return {'title': title, 'description': description}
```

## Common Mistakes
- **Automating without understanding:** Automating a broken process at scale creates problems at scale.
- **No human review on content:** Fully automated content without human oversight violates Google's quality guidelines.
- **No monitoring of the automation:** Automated systems fail silently. Build health checks and alerts for your automation.
- **Over-engineering:** Start with the highest-impact, simplest automation (monitoring + alerts) before building complex systems.
- **Ignoring edge cases:** Enterprise sites have thousands of edge cases. Test automation on diverse page samples.

---

*Last reviewed: 2026-02*

**See also:** [Governance](../Governance/governance.md) | [Search Console](../../Analytics/Search-Console/search-console.md)
