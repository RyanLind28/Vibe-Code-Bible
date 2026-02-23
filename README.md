# Vibe Code Bible

> The open-source knowledge base for vibe coders. Feed these `.md` files to your AI coding assistant to ship faster, smarter, and with best practices baked in.

---

## What Is This?

Vibe coding is building software with AI as your copilot. The bottleneck isn't writing code anymore — it's giving your AI the right context. That's what this repo solves.

Each `.md` file is a self-contained knowledge module covering **principles, LLM-ready instructions, and real-world examples**. Copy any file into your AI session and your assistant instantly becomes a domain expert.

## How to Use

```
1. Find the topic you need       → Browse the folders below
2. Copy the .md file contents    → Paste into your AI coding session
3. Stack multiple files           → Combine topics for complex tasks
4. Build with confidence         → Your AI now has expert-level context
```

**Example workflow:**
- Building an e-commerce site? Feed your AI `Product-Page-SEO/product-page-seo.md` + `Structured-Data/structured-data.md` + `Accessibility/accessibility.md`
- Designing a dashboard? Feed it `Design-Systems/design-systems.md` + `Responsive-Design/responsive-design.md` + `Data-Visualization/data-visualization.md`

## Chapters

| Chapter | Topics | Status |
|---------|--------|--------|
| [SEO](./SEO/) | Technical SEO, On-Page, Off-Page, Content, Local, E-commerce, International, Enterprise, AI SEO, Analytics | Complete |
| [UI/UX](./UIUX/) | Brand Identity, Design Systems, Accessibility, Responsive Design, Typography, UX Patterns, Animation, Dark Mode, Mobile-First | Complete |
| [Frontend](./Frontend/) | React/Next.js, CSS Architecture, Performance, State Management, Component Patterns | Planned |
| [Backend](./Backend/) | API Design, Auth, Database Design, Caching, Error Handling, Serverless | Planned |
| [DevOps](./DevOps/) | CI/CD, Docker, Cloud Architecture, Monitoring, Infrastructure as Code | Planned |
| [Security](./Security/) | Secrets Management, Authentication, Frontend Security, Backend Security, API Security, Data Protection, Security Headers, Supply Chain, Security Testing | Complete |
| [AI Integration](./AI-Integration/) | LLM Patterns, Prompt Engineering, RAG, AI Agents, Embeddings | Planned |
| [Testing](./Testing/) | Unit Testing, E2E Testing, Performance Testing, Test Strategy | Planned |
| [Product & Growth](./Product-Growth/) | Analytics, A/B Testing, Conversion Optimization, Onboarding | Planned |
| [Copywriting](./Copywriting/) | UX Writing, Landing Pages, Email Copy, Microcopy, CTAs | Planned |

## File Format

Every file follows the same structure so your AI knows what to expect:

```
# Topic Name
> One-line summary

## Principles        → The "why" and core knowledge
## LLM Instructions  → Direct instructions your AI can follow
## Examples          → Real code, configs, and templates
## Common Mistakes   → What NOT to do
```

## Principles

- **Self-contained** — Every file works on its own. No dependencies.
- **LLM-optimized** — Structured for AI consumption with clear, direct instructions.
- **Actionable** — Real examples, real code, real configs. Not theory essays.
- **Opinionated** — Best practices, not every possible option. We pick what works.
- **Current** — Every file has a "Last reviewed" date. Outdated advice is worse than no advice.

## Contributing

1. Follow the `Principles → LLM Instructions → Examples → Common Mistakes` format
2. Include code snippets where applicable (HTML, CSS, JS, config files, etc.)
3. Be opinionated — recommend the best approach, not all approaches
4. Add a `Last reviewed: YYYY-MM` date at the bottom
5. Add `See also:` cross-references to related files
6. Keep it practical — if a vibe coder can't use it in a session, it doesn't belong

## License

MIT — Use it, fork it, build with it.
