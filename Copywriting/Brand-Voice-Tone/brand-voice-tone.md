# Brand Voice & Tone

> Building a consistent brand voice, adapting tone to context, creating style guides, and maintaining voice through AI workflows — the system that makes all your copy sound like it comes from the same brain.

---

## Principles

### 1. Voice vs. Tone: The Foundational Distinction

Voice and tone are used interchangeably by most people. They are not the same thing, and confusing them is the root cause of most brand inconsistency problems.

**Voice** is your brand's personality. It is constant. If your brand were a person, voice is who that person is — their core character traits, their worldview, their communication style. Voice does not change based on context. A brand that is "direct, confident, and playful" remains direct, confident, and playful whether it is writing a homepage, an error message, or a tweet.

**Tone** is the emotional variation applied to your voice based on context. It changes. A direct, confident, playful brand might be:
- **Celebratory** in a product launch announcement
- **Empathetic** in a service outage notification
- **Casual** in a social media reply
- **Professional** in a legal disclaimer

The voice stays the same. The tone adapts. Think of it like a person: your friend has a consistent personality (voice), but they speak differently at a funeral than at a birthday party (tone). You would still recognize them in both contexts.

**Why this distinction matters for copywriters and developers:**

If you only document voice ("we're friendly and professional"), every piece of copy becomes the same: friendly and professional in every context, including error messages, 404 pages, and security warnings. The result is either tone-deaf copy (playful during a data breach notification) or bland copy (everything sounds the same regardless of context).

If you document both voice and tone, you create a system. The voice is the constant; the tone is the variable. The system tells any writer — human or AI — how to adjust communication for the situation while maintaining brand coherence.

### 2. Building a Voice Chart (Attribute, Do, Don't, Example)

A voice chart is the most practical tool for documenting brand voice. It takes abstract attributes ("friendly") and makes them concrete with specific guidance that any writer can follow.

**Voice chart structure:**

| Voice Attribute | What This Means (Do) | What This Doesn't Mean (Don't) | Example |
|---|---|---|---|
| **Direct** | Get to the point. Lead with the answer. Use active voice. Short sentences. | Don't be blunt, cold, or dismissive. Don't skip context that the reader needs. | "Your trial ends in 3 days. Upgrade to keep your data." NOT "Please be advised that your complimentary trial period is approaching its conclusion." |
| **Confident** | State recommendations clearly. Use "we recommend" not "you might consider." Own your expertise. | Don't be arrogant or dismissive of alternatives. Don't ignore trade-offs. | "Use Zod for validation — it catches errors at the boundary." NOT "Zod is maybe one possible option you could potentially consider for validation." |
| **Playful** | Use occasional wit. Surprise the reader with unexpected phrasing. Make technical content enjoyable. | Don't force humor. Don't be playful in serious contexts (errors, security, billing). Don't use inside jokes. | "Your API key is ready. Go build something wild." NOT "WOOHOO! 🎉🎉🎉 Your API key is HERE baby!!!" |
| **Helpful** | Anticipate what the reader needs next. Provide context. Link to related resources. | Don't over-explain or patronize. Don't assume the reader is clueless. | "Rate limited. Retry after 30 seconds, or see our rate limiting guide." NOT "Oopsie! Looks like you sent too many requests! Maybe try slowing down a bit?" |

**How to build a voice chart:**

1. **Start with 3–4 attributes.** More than 4 becomes difficult to maintain consistently. Choose attributes that genuinely differentiate your brand. "Professional" and "trustworthy" are not differentiators — every brand claims them.
2. **Define the boundaries.** The "Don't" column is more important than the "Do" column. Telling writers to be "confident" is vague. Telling them "confident does NOT mean dismissing alternatives or ignoring trade-offs" is actionable.
3. **Write real examples.** Abstract rules are ignored. Concrete examples are followed. For every attribute, write a "this, not that" pair showing exactly what the attribute looks like in practice.
4. **Test against edge cases.** Does the voice chart produce good copy for an error message? A billing email? A 404 page? A Terms of Service update? If the chart does not work in difficult contexts, refine it.

### 3. Tone Scales: Adapting Voice to Context

A tone scale maps specific communication contexts to tone adjustments. It tells writers how to modulate the brand voice without losing it.

**Tone dimensions:**

| Dimension | Scale | Example Low End | Example High End |
|---|---|---|---|
| Formality | Casual ←→ Formal | Social media reply | Legal notice |
| Humor | Serious ←→ Playful | Security alert | Empty state illustration |
| Enthusiasm | Restrained ←→ Excited | Bug fix release note | Major feature launch |
| Detail | Concise ←→ Thorough | Tooltip | Documentation |
| Empathy | Neutral ←→ Compassionate | Settings toggle label | Service outage notification |

**Tone by communication context:**

| Context | Formality | Humor | Enthusiasm | Detail | Empathy |
|---|---|---|---|---|---|
| Marketing homepage | Medium | Medium | High | Medium | Low |
| Blog post | Low-Medium | Medium | Medium | High | Low |
| Error message | Medium | None-Low | None | Concise | High |
| Onboarding flow | Low | Medium | High | Medium | Medium |
| Billing email | Medium-High | None | Low | High | Medium |
| Security notification | High | None | None | High | High |
| Social media | Low | High | High | Concise | Medium |
| Changelog | Medium | Low | Medium | High | Low |
| 404 page | Low | High | Low | Concise | Low |
| Customer support | Medium | Low | Low | High | High |

**Using tone scales in practice:**

When a writer encounters a new context (say, writing a GDPR consent banner), they consult the tone scale. The brand voice is still "direct, confident, playful, helpful" — but the tone scale tells them: formality is high (legal context), humor is none (privacy is not funny), enthusiasm is none (this is a compliance requirement, not a feature), detail is high (the user needs to understand what they are consenting to), empathy is medium (respect their privacy concern).

The result: a GDPR banner that is direct and helpful (voice) but formal and detailed (tone). It sounds like the brand, but adjusted for the context.

### 4. Creating a Copywriting Style Guide

A style guide extends beyond voice and tone to cover the mechanical rules of your copy: grammar preferences, formatting conventions, terminology, and patterns that ensure consistency at the word level.

**Essential style guide sections:**

**Grammar and mechanics:**
- Oxford comma: yes or no? (Pick one, enforce it.)
- Contractions: always, sometimes, or never? (Most modern brands use contractions in marketing copy but not in legal or compliance copy.)
- Capitalization: sentence case for headings or title case? (Sentence case is the modern standard for web copy.)
- Numbers: spell out one through nine, use numerals for 10+? Or always numerals? (Be consistent.)
- Exclamation points: maximum one per page? Per email? Never? (Define the limit.)

**Terminology and word choices:**
- Preferred terms: "sign up" not "register," "dashboard" not "control panel," "team members" not "users"
- Banned terms: "leverage" (use "use"), "utilize" (use "use"), "synergy" (use anything else)
- Product names: exact capitalization and formatting (e.g., "GitHub" not "Github," "JavaScript" not "Javascript")
- Feature names: how to reference specific product features consistently

**Formatting conventions:**
- Button text: sentence case or title case? With or without periods?
- Date formats: "February 24, 2026" or "24 Feb 2026" or "2026-02-24"?
- Time formats: "3:00 PM" or "3pm" or "15:00"?
- Currency: "$10" or "$10.00" or "10 USD"?
- Lists: periods at the end of list items? Only for full sentences?

**Inclusive language guidelines:**
- Gender-neutral defaults: "they" as singular pronoun, "team members" not "manpower"
- Accessible language: avoid "simply," "just," "obviously" (these words make struggling users feel excluded)
- Cultural awareness: avoid idioms that do not translate across cultures if your audience is global

**The style guide as a living document:**

A style guide that sits in a Notion page nobody reads is useless. The style guide must be:
- Referenced in every content brief
- Included in AI prompts for content generation
- Updated when new patterns emerge (new product features, new terminology)
- Short enough to actually read (aim for 2–5 pages, not 50)

### 5. Voice Across Channels

Your brand voice must flex across wildly different channels without breaking. The voice is constant, but the expression varies based on channel constraints, audience expectations, and format limitations.

**Website copy:**
- Most controlled channel. Full creative control over formatting, length, and presentation.
- Voice can be fully expressed. Long-form content allows nuance.
- Primary concern: consistency across pages written by different people at different times.

**Email:**
- More intimate channel. Emails feel personal, even marketing emails.
- Voice should be slightly warmer and more conversational than website copy.
- Subject lines, preview text, and body copy each have different constraint profiles.
- Transactional emails (receipts, password resets) still need brand voice — they are brand touchpoints, not just functional messages.

**Social media:**
- Most constrained and informal channel. Character limits, fast scrolling, casual norms.
- Voice should feel like a person, not a company. First-person pronouns ("we," "us") work better than third-person ("the company").
- Humor and personality can be dialed up (if the brand voice supports it).
- Responses and replies should match the tone of the conversation (empathetic for complaints, enthusiastic for praise).

**In-app / product UI:**
- Most functional channel. Copy serves the interface, not the brand.
- Clarity and brevity override personality. A witty button label that confuses the user is a failure.
- Error messages, tooltips, and microcopy should be helpful first, on-brand second.
- Consistency is critical — button labels, navigation, and terminology must be identical across the product.

**Ads (paid search, social, display):**
- Most constrained by character limits and format.
- Voice must be compressed into 30–90 characters per element.
- Benefit-focused messaging takes priority over voice expression.
- Match the landing page voice to the ad voice — tonal disconnect between ad and landing page increases bounce rate.

**Customer support:**
- Most empathetic channel. The user has a problem.
- Voice should be warm, patient, and solution-focused.
- Scripts and templates should sound human, not robotic.
- The brand voice must survive being used in stressful, emotional contexts.

### 6. AI Prompt Engineering for Brand Voice Consistency

AI writing assistants (Claude, GPT, Gemini) are now core tools in content production. But without voice guidance in prompts, AI-generated copy defaults to a generic, corporate tone — technically correct but personality-free. The difference between mediocre and excellent AI-generated copy is the prompt's voice instructions.

**Structuring AI prompts for voice:**

```text
Bad prompt:
"Write a landing page for our project management tool."

Good prompt:
"Write a landing page for Acme, a project management tool for dev teams.

Brand voice: direct, confident, technical-but-approachable.
- Use short sentences. Lead with benefits, not features.
- Contractions are fine. No buzzwords (leverage, synergy, empower).
- Humor is OK in headlines and subheads, never in CTAs or trust sections.
- Reference real developer pain points: context switching, meeting overload,
  unclear requirements.

Tone for this page: enthusiastic (new product launch), medium formality,
high specificity (include concrete numbers and comparisons).

Audience: engineering managers and senior developers at 50-500 person
companies who currently use Jira or Linear.

Do NOT: use generic SaaS phrases like 'all-in-one solution' or 'seamless
integration' or 'take your team to the next level.'"
```

**Key elements for voice-consistent AI prompts:**

- **Voice attributes with examples.** Do not just say "confident." Say "confident — state recommendations clearly, own your expertise, but acknowledge trade-offs."
- **Banned words and phrases.** AI models default to buzzwords. Explicitly ban the ones your brand avoids.
- **Tone adjustments for the specific context.** Specify formality, humor, enthusiasm levels.
- **Audience description.** The AI needs to know who it is writing for to calibrate vocabulary and depth.
- **Anti-examples.** "Do NOT write like [competitor]" or "Do NOT use phrases like [list]" is as important as positive instructions.
- **Reference copy.** If you have existing copy that nails your voice, include a sample: "Here is an example of our voice in a blog post intro: [paste example]. Match this style."

**Building a reusable voice prompt block:**

Create a standardized voice instruction block that gets prepended to every content generation prompt. Store it in your content brief template, your project management tool, or a simple text file that every team member can access. This ensures every AI interaction starts with the same voice foundation.

### 7. E-E-A-T and Brand Voice: How Consistency Builds Search Trust

Google's quality raters evaluate trustworthiness partly through consistency. A website that sounds like five different people wrote it — because five different people did, with no shared style guide — erodes the perceived expertise and authoritativeness signals that contribute to E-E-A-T.

**How voice consistency supports E-E-A-T:**

- **Experience signals** — A consistent voice suggests a consistent author or team with sustained experience in the topic. Erratic voice changes suggest content farms or low-investment content production.
- **Expertise signals** — Consistent use of correct terminology, appropriate technical depth, and confident-but-nuanced recommendations builds perceived expertise over time. Readers (and quality raters) learn to trust a voice that demonstrates knowledge article after article.
- **Authoritativeness** — Brands that maintain a recognizable voice become associated with their niche. When readers can identify content as "this sounds like [brand]," the brand has achieved a level of authority that influences sharing, linking, and citation behavior — all of which are SEO signals.
- **Trustworthiness** — Inconsistent voice feels untrustworthy. If your blog posts are casual and conversational but your product pages are stiff and corporate, readers sense a disconnect. That disconnect creates a subconscious doubt: "Is this the same company? Can I trust them?"

**Practical implication:** Voice consistency is not just a branding exercise. It is an SEO investment. Every piece of content that sounds authentically "you" reinforces the trust signals that Google's algorithms increasingly weight. Invest in the voice chart and style guide not because they are nice-to-have — but because they directly support search visibility over time.

### 8. Measuring and Auditing Voice Consistency

Voice consistency cannot be measured with a single metric. It requires periodic auditing — a structured review of your copy across channels and page types to identify drift, inconsistency, and degradation.

**Voice audit process:**

1. **Collect samples.** Pull 10–15 pieces of copy across channels: homepage, 2–3 blog posts, 2–3 emails, social posts, error messages, onboarding screens, product descriptions, support responses.
2. **Score each against the voice chart.** For each voice attribute, rate the sample 1–5 on how well it embodies the attribute. A homepage rated 5/5 for "direct" and 2/5 for "playful" reveals where the voice drifts.
3. **Identify patterns.** Where is the voice strongest? (Usually marketing pages.) Where does it break? (Usually product UI, transactional emails, and support responses.) These weak spots are priority targets.
4. **Check terminology.** Is the style guide's terminology used consistently? Is the product referred to by different names in different places?
5. **Review AI-generated content.** If AI tools are used for content, do AI-generated pieces match the voice quality of human-written pieces? If not, the AI prompts need refinement.
6. **Document findings.** Create a simple report: what is working, what is drifting, and 3–5 specific action items.

**Audit frequency:**

- Quarterly for growing teams or brands in flux.
- Bi-annually for stable brands with established voice.
- After every major team change (new head of marketing, new content lead, new agency partnership).
- After any major AI tool adoption (new models, new workflows).

**Quantitative proxies for voice consistency:**

While voice itself is qualitative, certain quantitative metrics serve as proxies:

- **Engagement consistency across pages** — If blog posts in your voice get 3x more engagement than blog posts that drift off-voice, voice quality correlates with engagement.
- **NPS or CSAT in support** — If support responses that follow the voice guide score higher in satisfaction, voice consistency is contributing to customer experience.
- **Content performance variance** — High variance in performance across similar content types may indicate voice inconsistency rather than topic-level differences.

---

## LLM Instructions

### 1. Establishing Brand Voice from a Brief

When asked to define or create a brand voice, follow this process:

Ask for: the brand name, what it does, who the audience is, 3–5 adjectives the brand identifies with, and any existing copy samples that feel "right." If the user provides a website URL, review it for existing voice patterns.

Create a voice chart with 3–4 attributes. For each attribute:
- Define what it means (Do).
- Define what it does not mean (Don't).
- Write 2 concrete examples (one Do, one Don't) in realistic copy contexts (not abstract sentences).

Then create a tone scale showing how the voice adapts across 5–6 contexts (marketing homepage, blog, error messages, emails, social media, customer support).

Deliver the voice chart and tone scale in a format that can be directly pasted into a style guide or AI prompt.

### 2. Adapting Tone to Context

When asked to write copy and a brand voice is defined (in the conversation, in a style guide, or in a voice chart), always:

- Identify the communication context (marketing page, error message, email, social post, etc.).
- Consult the tone scale (or create an appropriate tone adjustment if no scale is provided).
- Write copy that maintains all voice attributes while adjusting formality, humor, enthusiasm, detail, and empathy for the context.
- If the context calls for zero humor (security notification, billing issue), respect that even if the brand voice is "playful." Voice is constant; tone adapts.

Never generate copy that ignores context — a playful error message about a failed payment is worse than a boring one.

### 3. Writing a Style Guide

When asked to create a style guide, produce a document with these sections:

1. **Voice Chart** — 3–4 attributes with Do/Don't/Example.
2. **Tone Scale** — Contexts mapped to tone dimensions.
3. **Grammar and Mechanics** — Oxford comma, contractions, capitalization, numbers.
4. **Terminology** — Preferred terms, banned terms, product name formatting.
5. **Formatting** — Button text, dates, times, currency, list punctuation.
6. **Inclusive Language** — Gender-neutral defaults, accessible language rules.
7. **AI Prompt Template** — A reusable voice instruction block for AI content generation.

Keep it under 5 pages. A style guide too long to read is a style guide that will not be used.

### 4. Maintaining Voice in AI Workflows

When generating content with AI tools, always prepend the voice instruction block. If no voice instruction block exists, ask the user to provide their voice chart or style guide. If they do not have one, offer to create one before generating content.

When reviewing or editing AI-generated content:
- Check each paragraph against the voice chart attributes.
- Flag sections where the AI defaulted to generic corporate language.
- Rewrite flagged sections to match the brand voice.
- Note recurring AI drift patterns so the prompt can be improved for future generations.

### 5. Auditing Existing Copy for Voice Consistency

When asked to audit copy or a website for voice consistency:

1. Read all provided copy samples.
2. Score each against the brand's voice attributes (if defined) or identify the implicit voice attributes (if not defined).
3. Identify inconsistencies: where does the voice drift? Which channels are strongest/weakest?
4. Provide specific examples of inconsistent copy with rewritten alternatives.
5. Summarize findings as: "Voice is strongest in [X], weakest in [Y], with the most common drift being [specific pattern]."
6. Recommend 3–5 specific actions to improve consistency.

---

## Examples

### 1. Complete Voice Chart

A voice chart for a developer tools company.

```markdown
# Velo — Brand Voice Chart

## Voice Attributes

### 1. Direct
| | Guidance |
|---|---|
| **Do** | Get to the point. Lead with the answer or recommendation. Use active voice and short sentences. Prefer "Use X" over "You might want to consider using X." |
| **Don't** | Be terse, cold, or dismissive. Don't skip necessary context — being direct means efficient, not incomplete. Don't confuse directness with rudeness. |
| **Example** | ✅ "Your deployment failed. The build step timed out after 120 seconds. Check your build command and increase the timeout if needed." |
| | ❌ "Unfortunately, it appears that there may have been an issue with the deployment process. We are looking into what might have potentially caused the problem." |

### 2. Technical-but-Approachable
| | Guidance |
|---|---|
| **Do** | Use correct technical terminology. Assume the reader is a developer. Include code examples when they clarify. Explain non-obvious concepts without over-explaining obvious ones. |
| **Don't** | Talk down. Don't define "API" or "database." Don't over-simplify to the point of inaccuracy. Don't use jargon that even experienced developers would need to look up. |
| **Example** | ✅ "Velo uses edge functions to run your API routes in the region closest to the user. Cold starts average 8ms." |
| | ❌ "Velo uses advanced cloud computing technology to make your website really fast! It's like magic! ✨" |

### 3. Opinionated
| | Guidance |
|---|---|
| **Do** | Recommend the best approach, not every approach. Say "Use X" not "You could use X, Y, or Z." Have a point of view on tools, patterns, and practices. Acknowledge trade-offs, then still recommend. |
| **Don't** | Be dogmatic or dismissive of valid alternatives. Don't ignore trade-offs. Don't present opinions as absolute truths without context. |
| **Example** | ✅ "We recommend TypeScript for all new projects. The upfront investment pays for itself in fewer runtime errors and better IDE support. If you're migrating a large JS codebase, start with strict mode on new files." |
| | ❌ "You can use TypeScript or JavaScript. Both are fine. It depends on your preferences and team experience. There are pros and cons to each approach." |

### 4. Dry Wit
| | Guidance |
|---|---|
| **Do** | Use understated humor. One-liners in unexpected places (changelog entries, 404 pages, empty states). Let the humor emerge from honesty, not from trying to be funny. |
| **Don't** | Force jokes. Don't use humor in error messages about data loss, security, or billing. Don't use puns. Don't use emojis as humor substitutes. No "LOL" or "haha." |
| **Example** | ✅ 404 page: "This page doesn't exist. But your other 847 pages do. Search for what you need." |
| | ❌ 404 page: "OOPSIE WOOPSIE!! 🙈 We made a fucky wucky!! 💀💀 The page you're looking for has gone on VACATION! 🏖️😂" |
```

### 2. Tone Scale Matrix

A tone adjustment matrix showing how voice adapts across communication contexts.

```markdown
# Velo — Tone Scale by Context

Dimensions rated 1-5:
- Formality (1=casual, 5=formal)
- Humor (1=none, 5=frequent)
- Enthusiasm (1=restrained, 5=excited)
- Detail (1=minimal, 5=comprehensive)
- Empathy (1=neutral, 5=compassionate)

| Context | Formality | Humor | Enthusiasm | Detail | Empathy | Notes |
|---|---|---|---|---|---|---|
| Marketing homepage | 2 | 3 | 4 | 3 | 2 | Lead with benefits. Confident, not salesy. |
| Product pages | 2 | 2 | 3 | 4 | 2 | Technical accuracy first. Show, don't tell. |
| Blog posts | 2 | 3 | 3 | 5 | 2 | Deep, thorough, opinionated. Dry wit OK. |
| Changelog | 2 | 2 | 3 | 4 | 1 | Factual. Brief dry humor in intro OK. |
| Documentation | 3 | 1 | 1 | 5 | 2 | Precision matters. No personality padding. |
| Error messages | 3 | 1 | 1 | 3 | 4 | Help first. Say what happened, what to do. |
| Onboarding | 2 | 2 | 4 | 3 | 3 | Encouraging but not patronizing. |
| Email: marketing | 2 | 3 | 3 | 3 | 2 | Conversational. One CTA per email. |
| Email: transactional | 3 | 1 | 1 | 4 | 3 | Clear, complete, no personality fluff. |
| Email: outage/incident | 4 | 0 | 0 | 5 | 5 | Zero humor. Full transparency. Empathy. |
| Social: Twitter/X | 1 | 4 | 3 | 1 | 2 | Personality dialed up. Brevity required. |
| Social: LinkedIn | 2 | 2 | 3 | 3 | 2 | Professional but still sounds like us. |
| 404 / empty states | 2 | 4 | 1 | 2 | 2 | Humor welcome. Still helpful. |
| Pricing page | 3 | 1 | 2 | 5 | 2 | Clarity and transparency. No tricks. |
| Legal / compliance | 5 | 0 | 0 | 5 | 3 | Plain language where possible, formal where required. |

## How to Use This Matrix

1. Identify your context from the left column.
2. Check the tone dimensions.
3. Write with all four voice attributes (Direct, Technical-but-Approachable,
   Opinionated, Dry Wit) but adjusted to the tone levels in the row.
4. When humor is 0-1, suppress the "Dry Wit" attribute entirely.
5. When empathy is 4-5, lead with acknowledgment before solutions.
```

### 3. Brand Voice AI Prompt Template

A reusable prompt block that gets prepended to AI content generation requests.

```text
# Velo Voice Prompt Block
# Copy this into every AI content generation prompt.
# ================================================

You are writing for Velo, a developer platform for deploying web applications.

## Brand Voice (always maintain these):

DIRECT: Get to the point. Lead with the answer. Active voice. Short
sentences (under 20 words where possible). Prefer "Use X" over "You
might want to consider using X."

TECHNICAL-BUT-APPROACHABLE: Use correct terminology. Assume the reader
is a developer. Include code when it clarifies. Do NOT talk down, define
basic terms like "API" or "deployment," or over-simplify.

OPINIONATED: Recommend the best approach, not every approach. Own your
recommendations. Acknowledge trade-offs briefly, then still recommend.

DRY WIT: Understated humor only. One-liners in unexpected places. Let
humor come from honesty, not from trying to be funny. NEVER force jokes.

## Banned Words and Phrases:
- "leverage" (use "use")
- "utilize" (use "use")
- "empower" (say what the product actually does)
- "seamless" (be specific about what works well)
- "cutting-edge" or "next-generation" (buzzwords)
- "simply" or "just" (dismissive of complexity)
- "all-in-one solution" (vague)
- "take your ___ to the next level" (cliché)
- Excessive exclamation points (max one per page)
- Emoji in body copy (OK in social media only)

## Audience:
Full-stack developers and engineering managers at startups and mid-size
companies (10-500 employees). They are technical, time-poor, and skeptical
of marketing language. They respect directness and substance.

## Grammar and Style:
- Contractions: yes (we're, don't, can't)
- Oxford comma: yes
- Headings: sentence case
- Numbers: use numerals (7, not "seven")
- Dates: "February 24, 2026" format
- Code: use backticks for inline, fenced blocks for multi-line

## IMPORTANT:
The tone for THIS specific piece will be specified separately. The voice
attributes above are ALWAYS active. The tone adjustments vary by context.

# ================================================
# [ADD CONTEXT-SPECIFIC TONE AND TASK BELOW]
```

### 4. Voice Audit Checklist

A structured checklist for auditing copy across a website or product.

```markdown
# Brand Voice Audit Checklist

## Instructions
Pull 2-3 samples from each category below. Score each sample 1-5 on each
voice attribute. A score of 3 is "acceptable." Below 3 means the voice
is drifting. Above 3 means the voice is strong. Record scores and notes.

## Samples to Collect

### Marketing
- [ ] Homepage hero section + first fold
- [ ] One product/feature page
- [ ] One case study or testimonial page
- [ ] Pricing page copy

### Content
- [ ] Most recent blog post
- [ ] Oldest (still live) blog post
- [ ] One documentation page
- [ ] Changelog (last 3 entries)

### Email
- [ ] Most recent marketing email
- [ ] Welcome email (signup flow)
- [ ] One transactional email (receipt, notification)

### Product / UI
- [ ] Onboarding first 3 screens
- [ ] One error message
- [ ] One empty state
- [ ] Settings page labels and descriptions

### Social
- [ ] Last 5 Twitter/X posts
- [ ] Last 3 LinkedIn posts

## Scoring Matrix

| Sample | Attribute 1 | Attribute 2 | Attribute 3 | Attribute 4 | Notes |
|--------|-------------|-------------|-------------|-------------|-------|
| Homepage hero | /5 | /5 | /5 | /5 | |
| Blog (recent) | /5 | /5 | /5 | /5 | |
| Error message | /5 | /5 | /5 | /5 | |
| ... | | | | | |

## Analysis Questions

1. Which channel has the strongest voice consistency? Why?
2. Which channel has the weakest? What pattern of drift do you see?
3. Are AI-generated pieces distinguishable from human-written ones?
4. Is the terminology consistent across all samples?
5. Does the voice break in any specific context (errors, billing, legal)?

## Output
- 3-5 specific findings with example quotes
- 3-5 action items ranked by impact
- Updated voice chart or style guide if attributes need refinement
```

---

## Common Mistakes

### 1. Documenting Voice but Not Tone

**Wrong:** The brand has a voice guide that says "we're friendly, helpful, and professional" — but no guidance on how to adapt that voice to an error message vs. a product launch vs. a billing dispute. Every piece of copy sounds the same regardless of context, and some contexts (playful error messages about failed payments) feel tone-deaf.

**Fix:** Create a tone scale that maps voice adjustments to specific contexts. The voice chart defines who you are. The tone scale defines how you adapt. Both are required for consistent, context-appropriate copy.

### 2. Vague Voice Attributes

**Wrong:** Voice attributes like "friendly," "professional," "innovative," and "trustworthy." Every brand on earth claims these attributes. They provide zero guidance to a writer trying to decide between two sentence options.

**Fix:** Choose attributes that are specific enough to differentiate and actionable enough to guide decisions. "Direct" (vs. "friendly") tells you to lead with the answer. "Opinionated" (vs. "innovative") tells you to recommend one approach. "Dry wit" (vs. "fun") tells you to use understated humor. Add Do/Don't/Example for each to make them concrete.

### 3. Different Voice Per Channel

**Wrong:** The website sounds corporate and polished, the social media sounds like an intern trying to be cool, the emails sound like a different company entirely, and the product UI sounds like a technical manual. Each channel was written by a different person with no shared voice guide.

**Fix:** The voice must be the same everywhere. Only the tone adapts. Create one voice chart that applies across all channels, and a tone scale that shows how each channel adjusts formality, humor, enthusiasm, detail, and empathy. Have every writer (human or AI) reference both.

### 4. Being Playful in Serious Contexts

**Wrong:** An error message that says "Oops! Something went wrong! 😅 Try again later!" when the user just lost their work, their payment failed, or their data was compromised. Playfulness in serious moments feels dismissive and erodes trust.

**Fix:** Use the tone scale. Humor drops to zero in error messages, security alerts, billing issues, and data loss scenarios. These contexts call for empathy, clarity, and directness. "Your payment failed. Your card was not charged. Update your payment method to continue." — no emojis, no "oops," no false casualness.

### 5. No Voice Documentation at All

**Wrong:** The brand "has a voice" in the founder's head but it has never been written down. New writers, contractors, and AI tools have no reference. The result is inconsistency that compounds with every new hire and every AI-generated piece.

**Fix:** Document the voice in a voice chart with 3–4 attributes, Do/Don't/Example for each. This takes one focused session. It does not need to be perfect — a good-enough voice chart that exists is infinitely more useful than a perfect one that never gets written.

### 6. No Voice Instructions in AI Prompts

**Wrong:** Using AI to generate copy with prompts like "Write a landing page for our product." The AI produces generic, buzzword-heavy copy that sounds like every other SaaS company because it has no voice context.

**Fix:** Always include voice instructions in AI prompts. Include the voice chart, banned words, audience description, and tone adjustment for the specific context. Create a reusable voice prompt block that gets prepended to every content generation request.

### 7. Confusing Brand Voice with the CEO's Personality

**Wrong:** The brand voice is whatever mood the CEO is in during the review process. One week the copy is casual and fun; the next week everything gets rewritten to be "more professional" because the CEO had a meeting with enterprise clients. The voice fluctuates with one person's preferences rather than being a documented system.

**Fix:** The voice chart exists to decouple brand voice from individual personalities. Once the voice is documented and approved, it should be referenced as the source of truth — not overridden by anyone's daily mood. If the CEO wants to change the voice, that is a strategic conversation, not a copy edit.

### 8. Inconsistent Voice Undermining E-E-A-T

**Wrong:** A website where the blog posts sound authoritative and knowledgeable, but the product pages sound like they were written by a marketing intern using a different template, and the about page sounds like it was copied from a competitor. Google's quality raters (and human readers) perceive this inconsistency as a signal of low editorial quality, which undermines E-E-A-T.

**Fix:** Voice consistency is an SEO investment. Every piece of content that sounds authentically "you" reinforces the trust and authority signals that Google values. Use the voice chart and tone scale across every page type, every channel, and every content generation workflow — including AI.

---

> **See also:** [SEO Copywriting](../SEO-Copywriting/seo-copywriting.md) | [Headlines & Hooks](../Headlines-Hooks/headlines-hooks.md) | [UX Writing](../UX-Writing/ux-writing.md) | [CTAs & Conversion](../CTAs-Conversion/ctas-conversion.md) | [Content Writing](../Content-Writing/content-writing.md) | [Topical Authority](../../SEO/Content-SEO/Topical-Authority/topical-authority.md) | [Brand Mentions](../../SEO/Off-Page-SEO/Brand-Mentions/brand-mentions.md) | [Generative Engine Optimization](../../SEO/AI-SEO/Generative-Engine-Optimization/generative-engine-optimization.md) | [Brand Identity](../../UIUX/Brand-Identity/brand-identity.md) | [Design Systems](../../UIUX/Design-Systems/design-systems.md)
>
> **Last reviewed:** 2026-02
