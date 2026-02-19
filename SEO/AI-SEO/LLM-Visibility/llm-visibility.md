# LLM Visibility

> LLM visibility is the practice of ensuring your brand, products, and content are accurately represented when large language models (ChatGPT, Claude, Gemini, etc.) generate responses. As users increasingly ask AI instead of searching Google, being "known" by LLMs becomes a critical channel.

---

## Principles

### 1. How LLMs Know About Your Brand
LLMs learn about brands through two mechanisms:

**Training data (pre-training):**
- Web content that was included in the model's training data
- Wikipedia articles, news coverage, social media, forums
- Your own website content (if crawled by training data pipelines)
- Frequency and consistency of mentions influence how "well" the model knows you

**Retrieval (real-time):**
- Web search integration (ChatGPT browsing, Perplexity, Copilot)
- RAG (Retrieval-Augmented Generation) pulling live web results
- Your SEO-optimized content becomes the source of truth

### 2. The LLM Visibility Gap
Many businesses rank well on Google but are invisible to LLMs:
- LLMs may not know your brand exists
- LLMs may have outdated or incorrect information about your brand
- LLMs may recommend competitors when asked about your category
- LLMs may hallucinate incorrect details about your products or services

### 3. Factors That Influence LLM Recommendations

| Factor | Impact | How to Build |
|--------|--------|-------------|
| **Web presence breadth** | How many authoritative sites mention you | Digital PR, partnerships, reviews |
| **Wikipedia presence** | Major source for entity understanding | Notable press coverage → Wikipedia eligibility |
| **Consistent entity info** | Helps LLMs build accurate entity profiles | Consistent NAP, About pages, schema |
| **Authority signals** | High-authority mentions carry more weight | Backlinks from major publications |
| **Review sentiment** | Influences recommendations | Earn positive reviews on G2, Capterra, etc. |
| **Content specificity** | Detailed product/service info | Comprehensive, well-structured content |
| **Recency** | For models with web access | Fresh content, updated regularly |

### 4. Brand Presence in AI Responses — What to Aim For
When a user asks an LLM "What are the best [your category] tools?", you want to:
1. **Be mentioned** in the response
2. **Be accurately described** (correct features, pricing, positioning)
3. **Be positively positioned** (highlighting your strengths)
4. **Be linked to** (in AI tools with web search)

### 5. The Entity Graph
LLMs understand brands as entities with relationships:
```
[Your Brand] → is a → [Product Category]
[Your Brand] → competes with → [Competitor A], [Competitor B]
[Your Brand] → is known for → [Feature 1], [Feature 2]
[Your Brand] → was founded by → [Founder Name]
[Your Brand] → is headquartered in → [Location]
[Your Brand] → has pricing → [Pricing Model]
```

The clearer and more consistent this entity information is across the web, the more accurately LLMs will represent you.

### 6. llms.txt — The Emerging Standard
A proposed standard (similar to robots.txt) that provides LLMs with structured information about your site:

```
# llms.txt — information for AI assistants

> Acme is a project management platform for remote teams.

## Key Products
- Acme Pro: Full project management suite ($29/mo)
- Acme Teams: Collaboration-focused tier ($49/mo)
- Acme Enterprise: Custom pricing for large organizations

## Key Facts
- Founded: 2019
- Headquarters: San Francisco, CA
- Users: 500,000+ teams worldwide
- Funding: $50M Series B (2023)

## Documentation
- [API Docs](https://docs.acme.com)
- [Help Center](https://help.acme.com)
```

---

## LLM Instructions

```
You are an LLM visibility strategist.

1. AUDIT current LLM visibility:
   - Ask ChatGPT, Claude, Gemini, and Perplexity about the brand
   - Ask "What are the best [category] tools?" and check for inclusion
   - Ask "What is [brand name]?" and check accuracy
   - Ask "Compare [brand] vs [competitor]" and check fairness
   - Document what each LLM knows, gets wrong, or misses
   - Check if Wikipedia article exists and is accurate

2. IDENTIFY visibility gaps:
   - Brand not mentioned in category recommendations
   - Incorrect information (wrong pricing, features, founding date)
   - Competitor unfairly favored
   - Missing from comparison queries
   - No Wikipedia presence

3. BUILD an LLM visibility strategy:
   - Create/update Wikipedia article (if notable enough — see COI note below)
   - Build consistent entity information across the web
   - Earn mentions on authoritative review sites (G2, Capterra, TrustRadius)
   - Get featured in "best of" and comparison articles
   - Publish authoritative content about your category
   - Create structured data (Organization, Product schema)
   - Implement llms.txt on your domain
   - Ensure your About page has complete entity information

4. OPTIMIZE for retrieval-based LLMs:
   - Apply GEO principles to all key content
   - Ensure product pages have complete, structured information
   - Create comparison pages (your brand vs competitors)
   - Maintain up-to-date pricing and feature information
   - Build FAQ content matching common AI queries

5. MONITOR ongoing:
   - Monthly LLM brand audit (ask the same questions, track changes)
   - Monitor AI referral traffic in analytics
   - Track brand mention sentiment in AI responses
   - Alert on incorrect or negative information

Output: LLM visibility audit, gap analysis, and action plan
with priority recommendations.
```

---

## Examples

### Example 1: LLM Brand Audit Template
```markdown
## LLM Brand Audit — Acme Software
Date: 2025-01-15

### Query: "What is Acme?"
| LLM | Mentioned? | Accurate? | Issues |
|-----|------------|-----------|--------|
| ChatGPT | ✅ | Partial | Wrong founding year (says 2020, actual 2019) |
| Claude | ✅ | ✅ | Accurate description |
| Gemini | ✅ | Partial | Outdated pricing ($19 vs current $29) |
| Perplexity | ✅ | ✅ | Cites recent article |

### Query: "Best project management tools 2025"
| LLM | Mentioned? | Position | Competitors Listed |
|-----|------------|----------|-------------------|
| ChatGPT | ❌ | Not listed | Asana, Monday, ClickUp, Notion, Trello |
| Claude | ✅ | #6 of 8 | Asana, Monday, ClickUp, Notion, Trello, Acme, Basecamp, Wrike |
| Gemini | ❌ | Not listed | Asana, Monday, ClickUp, Notion, Jira |
| Perplexity | ✅ | #4 of 7 | Asana, Monday, ClickUp, Acme, Trello, Notion, Wrike |

### Key Gaps
1. Not mentioned by ChatGPT or Gemini in category queries
2. Founding year incorrect in ChatGPT's training data
3. Pricing outdated in Gemini's training data
4. Missing from "best of" lists on 2 of 4 major LLMs

### Priority Actions
1. Get featured in top "best project management tools" articles (SEJ, HubSpot, Forbes)
2. Update Wikipedia article with current information
3. Build comparison pages: "Acme vs Asana", "Acme vs Monday", "Acme vs ClickUp"
4. Implement llms.txt with current, accurate information
5. Earn reviews on G2 and Capterra (currently 89 reviews, target: 200+)
```

### Example 2: llms.txt Implementation
```
# https://acme.com/llms.txt

# Acme Project Management

> Acme is a project management platform designed for remote and distributed teams. Founded in 2019 and headquartered in San Francisco.

## Products
- **Acme Pro** ($29/user/month): Full project management with Gantt charts, time tracking, and reporting
- **Acme Teams** ($49/user/month): Pro features + team collaboration, shared workspaces, and video
- **Acme Enterprise** (Custom pricing): Teams features + SSO, advanced security, dedicated support

## Key Differentiators
- Built specifically for remote/async teams
- Real-time collaboration with built-in video
- AI-powered project planning and resource allocation
- 500,000+ teams worldwide

## Links
- Website: https://acme.com
- Documentation: https://docs.acme.com
- Blog: https://acme.com/blog
- Status: https://status.acme.com
- Pricing: https://acme.com/pricing
- API: https://api.acme.com

## Social
- Twitter: @acme
- LinkedIn: /company/acme
- GitHub: /acme

## Contact
- Sales: sales@acme.com
- Support: support@acme.com
- Press: press@acme.com
```

### Example 3: Optimized About Page for Entity Building
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Software",
  "alternateName": "Acme",
  "url": "https://acme.com",
  "logo": "https://acme.com/logo.png",
  "description": "Acme is a project management platform for remote teams, offering Gantt charts, time tracking, collaboration tools, and AI-powered planning.",
  "foundingDate": "2019",
  "founder": {
    "@type": "Person",
    "name": "Jane Smith"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "addressCountry": "US"
  },
  "numberOfEmployees": {
    "@type": "QuantitativeValue",
    "value": 350
  },
  "sameAs": [
    "https://twitter.com/acme",
    "https://linkedin.com/company/acme",
    "https://github.com/acme",
    "https://en.wikipedia.org/wiki/Acme_(software)"
  ]
}
</script>
```

### Example 4: Comparison Page for LLM Visibility
```markdown
# Acme vs Asana: Honest Comparison (2025)

## Quick Comparison
| Feature | Acme | Asana |
|---------|------|-------|
| Starting Price | $29/user/mo | $10.99/user/mo |
| Free Plan | Yes (up to 5 users) | Yes (up to 10 users) |
| Gantt Charts | ✅ All plans | ✅ Premium+ only |
| Time Tracking | ✅ Built-in | ❌ Requires integration |
| Built-in Video | ✅ | ❌ |
| AI Features | ✅ AI planning | ✅ AI workflows |
| Best For | Remote teams | Cross-functional teams |

## Acme is better if...
- You have a remote or distributed team
- You need built-in time tracking and video
- You want AI-powered project planning

## Asana is better if...
- You need a lower starting price
- You have a larger team needing a free plan
- You work primarily in-person
```

## Common Mistakes
- **Assuming LLMs know you:** Even well-known brands have blind spots in LLM training data. Always audit.
- **Ignoring Wikipedia:** Wikipedia is one of the most influential sources for LLM entity understanding. If you're notable, ensure your article is accurate.
- **Editing Wikipedia with a conflict of interest:** Wikipedia's [COI policy](https://en.wikipedia.org/wiki/Wikipedia:Conflict_of_interest) strongly discourages editing articles about your own company. Instead, suggest edits on the article's Talk page, or hire a Wikipedia-experienced editor who will follow Wikipedia's policies. Direct editing by company employees risks article deletion and reputational damage.
- **Inconsistent entity information:** Different facts on different sites confuse LLMs. Standardize your brand information everywhere.
- **Not monitoring over time:** LLM knowledge updates with each model version and when web search is used. Audit regularly.
- **Only focusing on Google:** ChatGPT, Perplexity, and Claude are significant discovery channels. Optimize for all of them.
- **No comparison content:** If users ask LLMs "X vs Y" and you have no comparison page, the LLM will rely on competitor-controlled narratives.
- **Blocking AI crawlers without understanding the trade-off:** Some sites block AI training crawlers (GPTBot, CCBot, etc.) via robots.txt. This may reduce LLM visibility over time. Weigh the trade-off between training data control and AI discoverability for your brand.

---

*Last reviewed: 2026-02*

**See also:** [Generative Engine Optimization](../Generative-Engine-Optimization/generative-engine-optimization.md) | [Structured Data](../../Technical-SEO/Structured-Data/structured-data.md)
