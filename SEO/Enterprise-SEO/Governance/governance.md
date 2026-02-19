# Enterprise SEO Governance

> SEO governance is the system of policies, processes, roles, and standards that ensure SEO best practices are consistently applied across a large organization. Without governance, enterprise SEO devolves into chaos — teams make conflicting changes, standards erode, and technical debt compounds.

---

## Principles

### 1. Why Governance Matters at Scale
In enterprise organizations:
- Multiple teams (product, engineering, marketing, content) all affect SEO
- Changes to one section can break SEO across the entire site
- Without standards, every team implements SEO differently
- Technical debt accumulates faster than it can be resolved
- Migrating or redesigning without governance destroys organic traffic

### 2. The Four Pillars of SEO Governance

| Pillar | What It Covers |
|--------|---------------|
| **Standards** | SEO requirements, templates, checklists, and documentation |
| **Processes** | Workflows for content creation, technical changes, and launches |
| **Roles** | Who owns SEO decisions, who reviews, who approves |
| **Training** | Ensuring all stakeholders understand SEO impact |

### 3. SEO Standards Document
Every enterprise should maintain a living SEO standards document covering:
- Title tag and meta description guidelines
- URL structure rules
- Heading hierarchy requirements
- Image optimization requirements
- Schema markup requirements
- Internal linking rules
- Content quality minimums
- Technical SEO requirements (canonical, robots, etc.)
- Brand and keyword guidelines

### 4. Change Management for SEO
Any change that touches URLs, templates, navigation, or site architecture should go through an SEO review:

```
CHANGE REQUEST → SEO IMPACT ASSESSMENT → REVIEW → APPROVE/MODIFY → DEPLOY → MONITOR
```

**High-risk changes requiring SEO review:**
- URL changes or redirects
- Site migrations or redesigns
- CMS or platform changes
- Navigation restructuring
- Template changes affecting meta tags or schema
- New subdomain or subdirectory launches
- Robots.txt or sitemap changes
- CDN or hosting changes

### 5. RACI Matrix for SEO
| Task | SEO Team | Engineering | Content | Product | Legal |
|------|----------|-------------|---------|---------|-------|
| SEO strategy | **R/A** | I | C | C | I |
| Technical implementation | C | **R** | I | **A** | I |
| Content creation | C | I | **R** | I | **A** |
| URL changes | **A** | **R** | I | C | I |
| Site migration | **A** | **R** | C | C | I |
| Schema markup | **R** | **R** | I | I | I |
| Performance monitoring | **R** | C | I | **A** | I |

R = Responsible, A = Accountable, C = Consulted, I = Informed

### 6. SEO SLAs and KPIs
Define service-level agreements for SEO operations:
- **Redirect implementation:** Within 24 hours of URL change
- **Crawl error resolution:** Critical within 4 hours, warning within 48 hours
- **New page indexing:** Submitted within 2 hours of publish
- **SEO review for launches:** Minimum 2 weeks before go-live
- **Content refresh cycle:** Top 100 pages reviewed quarterly

---

## LLM Instructions

```
You are an enterprise SEO governance consultant.

1. ASSESS the current governance state:
   - Does an SEO standards document exist?
   - Is there a formal SEO review process for changes?
   - Are SEO responsibilities clearly assigned (RACI)?
   - Is there SEO training for non-SEO teams?
   - Are SEO KPIs tracked and reported regularly?
   - How are cross-team SEO conflicts resolved?

2. CREATE governance documentation:
   - SEO standards document (technical + content requirements)
   - Change management workflow (when SEO review is required)
   - RACI matrix for all SEO-related activities
   - SEO checklist for new page/feature launches
   - Escalation process for SEO issues

3. DESIGN processes:
   - Pre-launch SEO review checklist
   - Content creation workflow with SEO integration
   - URL change request and redirect workflow
   - Regular audit schedule (technical, content, backlink)
   - Cross-team communication cadence

4. BUILD training materials:
   - "SEO 101 for Developers" — technical requirements and why they matter
   - "SEO for Content Creators" — keyword targeting, on-page optimization
   - "SEO for Product Managers" — how product decisions affect SEO
   - "SEO for Executives" — business impact and investment justification

5. ESTABLISH monitoring and enforcement:
   - Automated SEO checks in CI/CD pipeline
   - Regular compliance audits against standards
   - Scorecards per team/section for SEO health
   - Escalation paths for standards violations

Output: Governance framework with standards document, RACI matrix,
process workflows, training outlines, and monitoring plan.
```

---

## Examples

### Example 1: Pre-Launch SEO Checklist
```markdown
## SEO Pre-Launch Checklist

### URL Structure
- [ ] URLs follow site standards (lowercase, hyphenated, descriptive)
- [ ] No URL parameters for core content
- [ ] Redirects created for any changed URLs (301, mapped 1:1)
- [ ] Redirect testing confirms correct destinations

### Meta Tags
- [ ] Unique title tag per page (50-60 characters)
- [ ] Unique meta description per page (150-160 characters)
- [ ] Primary keyword in title tag
- [ ] No duplicate titles across the site

### Technical
- [ ] Self-referencing canonical tag on every page
- [ ] Hreflang tags (if multi-language)
- [ ] Schema markup validated via Rich Results Test
- [ ] robots.txt allows crawling of all new pages
- [ ] XML sitemap updated with new pages
- [ ] Page speed: LCP < 2.5s, INP < 200ms, CLS < 0.1

### Content
- [ ] H1 tag present and unique per page
- [ ] Heading hierarchy (H1 > H2 > H3) is logical
- [ ] Images have descriptive alt text
- [ ] Images have width/height attributes
- [ ] Internal links to/from existing relevant content
- [ ] No orphan pages (every page has ≥1 internal link)

### Post-Launch
- [ ] Submit updated sitemap to GSC
- [ ] Request indexing for key new pages
- [ ] Monitor crawl stats for 48 hours
- [ ] Verify all redirects are working
- [ ] Check for unexpected indexing issues in GSC
```

### Example 2: SEO Change Request Template
```markdown
## SEO Change Request

**Requester:** [Name / Team]
**Date:** [Date]
**Priority:** [Critical / High / Medium / Low]
**Target Launch Date:** [Date]

### Description of Change
[What is being changed and why?]

### SEO Impact Assessment
- **URLs affected:** [List or count of URLs changing]
- **Traffic at risk:** [Monthly organic sessions to affected pages]
- **Redirect plan:** [1:1 redirect mapping document link]
- **Expected impact:** [Positive / Neutral / Negative with explanation]

### Checklist
- [ ] SEO team has reviewed the change
- [ ] Redirect map is complete and approved
- [ ] Pre-launch crawl of staging completed
- [ ] Rollback plan documented
- [ ] Post-launch monitoring plan in place

### Approval
- [ ] SEO Lead: __________ Date: __________
- [ ] Engineering Lead: __________ Date: __________
- [ ] Product Owner: __________ Date: __________
```

### Example 3: SEO Scorecard for Cross-Team Reporting
```markdown
## Monthly SEO Health Scorecard — January 2025

### Organic Performance
| Metric                | This Month | Last Month | MoM Change |
|-----------------------|------------|------------|------------|
| Organic Sessions      | 1,250,000  | 1,180,000  | +5.9%      |
| Organic Revenue       | $4,200,000 | $3,900,000 | +7.7%      |
| Keywords in Top 10    | 8,420      | 7,890      | +6.7%      |
| Avg. Position (Top KW)| 12.3       | 13.1       | +0.8 pos   |

### Technical Health
| Check                  | Score  | Target | Status |
|------------------------|--------|--------|--------|
| Pages with valid title | 98.2%  | 99%    | ⚠️     |
| Pages with schema      | 92.1%  | 95%    | ⚠️     |
| Core Web Vitals pass   | 87.3%  | 90%    | ⚠️     |
| Crawl errors           | 142    | <100   | ❌     |
| Orphan pages           | 23     | 0      | ⚠️     |

### Action Items
1. [CRITICAL] Fix 142 crawl errors — 38 are 5xx errors on product pages
2. [HIGH] Add schema to 340 product pages missing structured data
3. [MEDIUM] Fix 23 orphan pages — add internal links from category pages
4. [LOW] Optimize 180 title tags exceeding 60 characters
```

### Example 4: Stakeholder Training Outlines
```
SEO 101 FOR DEVELOPERS (2-hour workshop)
├── Session 1: How Search Engines Work (30 min)
│   - Crawling, indexing, ranking
│   - How code decisions affect SEO
├── Session 2: Technical SEO Essentials (45 min)
│   - URLs, canonicals, redirects
│   - Meta tags and schema markup
│   - Page speed and Core Web Vitals
│   - JavaScript SEO pitfalls
├── Session 3: Hands-On Lab (30 min)
│   - Audit a page using DevTools
│   - Fix common technical SEO issues
└── Session 4: Our Standards & Processes (15 min)
    - SEO standards document walkthrough
    - When to involve the SEO team
    - Change request process

SEO FOR CONTENT CREATORS (1-hour workshop)
├── Keyword targeting and search intent
├── Writing SEO-friendly content (titles, headings, meta)
├── Internal linking best practices
├── Image optimization
└── Our content workflow and checklist
```

## Common Mistakes
- **No governance = no consistency:** Without standards, every team makes different SEO decisions. The result is chaos at scale.
- **SEO team as bottleneck:** Governance should empower teams with self-service tools and checklists, not require SEO approval for everything.
- **Documentation that nobody reads:** Keep standards concise, accessible, and integrated into existing workflows (not a 100-page PDF).
- **No enforcement mechanism:** Standards without automated checks are suggestions. Integrate SEO validation into CI/CD.
- **Ignoring SEO in migrations:** The #1 cause of catastrophic organic traffic loss is site migration without SEO governance.
- **Training once and done:** SEO changes constantly. Run quarterly refresher training and update standards documents.

---

*Last reviewed: 2026-02*

**See also:** [Automation](../Automation/automation.md) | [Core Web Vitals](../../Technical-SEO/Core-Web-Vitals/core-web-vitals.md)
