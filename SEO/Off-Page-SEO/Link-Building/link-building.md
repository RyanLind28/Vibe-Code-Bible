# Link Building

> Backlinks (links from external websites to yours) remain an important Google ranking signal. While their relative weight has decreased as Google's content quality understanding improves, link building remains a core SEO discipline for increasing your site's authority and rankings.

---

## Principles

### 1. Why Backlinks Matter
Every backlink is a "vote of confidence" from one website to another. Google uses these signals to determine:
- **Authority:** More quality backlinks = higher domain authority
- **Relevance:** Links from topically related sites carry more weight
- **Trust:** Links from trusted domains (edu, gov, established brands) pass more trust
- **Discovery:** Backlinks help Googlebot discover and recrawl your pages

### 2. Quality > Quantity
One link from the New York Times is worth more than 10,000 links from random directories.

**Quality signals:**
- High Domain Rating (DR) / Domain Authority (DA) of the linking site
- Topical relevance (a cooking site linking to another cooking site)
- Editorial placement (naturally placed within content, not sidebar/footer)
- Followed link (not `rel="nofollow"` or `rel="sponsored"`)
- Traffic to the linking page (active, real page — not a dead blog)

### 3. Link Building Methods (White Hat)

| Method | Difficulty | Scalability | Link Quality |
|--------|-----------|-------------|-------------|
| **Original Research / Data** | High | Low | Highest |
| **Digital PR** | High | Medium | Highest |
| **Guest Posting** | Medium | High | Medium-High |
| **Resource Page Links** | Low | Medium | Medium |
| **Broken Link Building** | Medium | Medium | Medium |
| **Journalist Queries (Qwoted, Featured, Help a B2B Writer)** | Low | Medium | High |
| **Skyscraper Technique** | High | Low | High |
| **Unlinked Brand Mentions** | Low | Low | High |
| **Competitor Backlink Replication** | Medium | High | Varies |

### 4. Anchor Text Distribution
Your backlink anchor text profile should look natural. There are no exact "ideal" percentages (these vary by niche and site), but directionally:
- **Branded** should be the largest category ("Acme", "Acme.com")
- **Naked URL** appears naturally ("https://acme.com/guide")
- **Generic** occurs in natural link profiles ("this article", "read more", "here")
- **Partial match keyword** carries SEO value without over-optimization ("guide to technical SEO")
- **Exact match keyword** should be a small minority ("technical SEO audit")

Over-optimization of exact-match anchors is detected by Google's Penguin algorithm (now part of the core algorithm since 2016) and results in ranking suppression.

### 5. Links to Avoid
- **PBN (Private Blog Networks):** Google detects and penalizes these
- **Paid links without rel="sponsored":** Violates Google's guidelines
- **Link farms / directories:** Mass link directories are worthless
- **Comment spam:** Nofollow and ignored by Google
- **Reciprocal link schemes:** "I'll link to you if you link to me" at scale

### 6. Link Velocity
The rate at which you acquire links should appear natural. A new site getting 500 backlinks overnight looks suspicious. Build links steadily over time.

---

## LLM Instructions

```
You are a link building strategist. When building a link acquisition plan:

1. AUDIT the current backlink profile:
   - Total referring domains
   - DR/DA distribution of linking sites
   - Anchor text distribution
   - Top linked pages (what content attracts links?)
   - Toxic/spammy links to disavow
   - Compare against top 3 competitors

2. IDENTIFY link building opportunities:
   - Competitor backlink gap analysis (who links to them but not you?)
   - Broken link opportunities in your niche
   - Unlinked brand mentions
   - Resource pages in your industry
   - Journalist query platforms (Qwoted, Featured, Help a B2B Writer, Source of Sources)
   - Guest posting targets (relevant, high-DR sites accepting contributors)

3. CREATE linkable assets:
   - Original research / studies with data
   - Free tools or calculators
   - Comprehensive ultimate guides
   - Infographics with embed codes
   - Industry statistics pages (updated annually)
   - Templates and frameworks

4. WRITE outreach emails that:
   - Are personalized (reference their specific content)
   - Lead with value (what's in it for them?)
   - Are concise (under 150 words)
   - Have a clear, specific ask
   - Don't beg or sound desperate

5. TRACK link building KPIs:
   - New referring domains per month
   - Average DR of acquired links
   - Link acquisition cost
   - Rankings improvement for target keywords
   - Organic traffic growth

Output: Prioritized link building plan with targets, methods,
outreach templates, and monthly goals.
```

---

## Examples

### Example 1: Skyscraper Technique Workflow
```
STEP 1: Find top-linked content in your niche
  Tool: Ahrefs Content Explorer → "technical SEO" → Sort by referring domains
  Result: "Technical SEO Checklist" by competitor has 340 referring domains

STEP 2: Create something significantly better
  - More comprehensive (50 items vs their 20)
  - Better designed (custom graphics, interactive checklist)
  - More current (2025 data and tools)
  - Unique data (original research or expert quotes)

STEP 3: Find everyone who linked to the original
  Tool: Ahrefs → Backlinks to competitor's page → Export

STEP 4: Outreach to those linkers
  "Hey [Name], I noticed you linked to [competitor's checklist] in your
  article about [topic]. We just published an updated, more comprehensive
  version with [unique angle]. Thought it might be a useful resource
  for your readers: [URL]"
```

### Example 2: Outreach Email Templates
```
GUEST POST PITCH:
Subject: Content idea for [their site name]

Hi [Name],

I've been reading [their site] for a while — your article on
[specific article] was especially useful.

I'd love to contribute a guest post on "[proposed topic]". Here's
a quick outline:
- [Point 1]
- [Point 2]
- [Point 3]

I've written for [credibility sites]. Happy to share samples.

Would this be a fit?

[Your name]

---

BROKEN LINK OUTREACH:
Subject: Broken link on your [page topic] page

Hi [Name],

I was reading your article on [topic] and noticed the link to
[broken resource] appears to be broken (returns a 404).

We recently published a similar resource that covers [topic]:
[your URL]

Might be a good replacement. Either way, wanted to flag the
broken link for you.

Cheers,
[Your name]

---

UNLINKED MENTION:
Subject: Thanks for the mention!

Hi [Name],

Thanks for mentioning [your brand] in your article on [topic].
Would you mind adding a link to [URL] so readers can find us
easily?

Happy to share it with our audience too.

Thanks!
[Your name]
```

### Example 3: Competitor Backlink Gap Analysis
```
YOUR SITE:    500 referring domains
COMPETITOR A: 1,200 referring domains
COMPETITOR B: 800 referring domains

GAP ANALYSIS (sites linking to competitors but NOT to you):
┌──────────────────────────────────┬────┬────┬─────┐
│ Linking Domain                   │ DR │ A  │  B  │
├──────────────────────────────────┼────┼────┼─────┤
│ techcrunch.com                   │ 93 │ ✓  │  ✓  │ → Digital PR target
│ searchenginejournal.com          │ 91 │ ✓  │  ✗  │ → Guest post target
│ hubspot.com/blog                 │ 93 │ ✗  │  ✓  │ → Resource mention
│ neilpatel.com                    │ 92 │ ✓  │  ✓  │ → Outreach target
│ university-blog.edu              │ 85 │ ✓  │  ✗  │ → Resource page link
└──────────────────────────────────┴────┴────┴─────┘

PRIORITY: Target domains that link to BOTH competitors first
(they're clearly willing to link in your space).
```

## Common Mistakes
- **Buying links:** Google's Penguin algorithm specifically targets paid links. If caught, manual action tanks your rankings.
- **Exact-match anchor text obsession:** Over-optimized anchor profiles look unnatural and trigger penalties.
- **Ignoring relevance:** 100 links from random niches < 10 links from highly relevant sites.
- **Not building linkable assets:** You can't build links to thin, unremarkable content. Create something worth linking to first.
- **Spray-and-pray outreach:** Mass, impersonalized emails have <1% response rates. Quality outreach to 50 targets > template emails to 5,000.
- **Neglecting internal links:** External link equity is wasted if it doesn't flow to your important pages via internal links.

---

*Last reviewed: 2026-02*

**See also:** [Digital PR](../Digital-PR/digital-pr.md) | [Brand Mentions](../Brand-Mentions/brand-mentions.md) | [Internal Linking](../../On-Page-SEO/Internal-Linking/internal-linking.md)
