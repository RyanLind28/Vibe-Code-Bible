import Link from 'next/link';

const chapters = [
  { slug: 'frontend', title: 'Frontend', description: 'React 19, Next.js 15, CSS, Performance, State Management' },
  { slug: 'backend', title: 'Backend', description: 'API Design, Databases, Caching, Auth, Serverless' },
  { slug: 'security', title: 'Security', description: 'Auth, Data Protection, API Security, Supply Chain' },
  { slug: 'ai-integration', title: 'AI Integration', description: 'LLM Patterns, RAG, Agents, Prompt Engineering' },
  { slug: 'seo', title: 'SEO', description: 'Technical, On-Page, Off-Page, Local, E-commerce, AI SEO' },
  { slug: 'uiux', title: 'UI/UX', description: 'Design Systems, Accessibility, Responsive, Animation' },
  { slug: 'devops', title: 'DevOps', description: 'CI/CD, Docker, Cloud Architecture, Monitoring' },
  { slug: 'tools', title: 'Tools', description: 'BaaS, Databases, Payments, Auth, Hosting, CMS' },
  { slug: 'copywriting', title: 'Copywriting', description: 'Landing Pages, UX Writing, Email, CTAs, Brand Voice' },
  { slug: 'product-growth', title: 'Product & Growth', description: 'Analytics, A/B Testing, Onboarding, Retention' },
  { slug: 'testing', title: 'Testing', description: 'Unit, E2E, Performance, Test Strategy' },
];

export default function HomePage() {
  return (
    <main className="flex flex-col items-center flex-1 px-4 py-16 sm:py-24">
      <div className="max-w-4xl w-full text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-fd-primary/20 bg-fd-primary/5 px-4 py-1.5 text-sm text-fd-primary mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Open-source knowledge base
        </div>
        <h1 className="text-5xl font-bold mb-4 sm:text-6xl tracking-tight">
          Vibe Code Bible
        </h1>
        <p className="text-lg text-fd-muted-foreground max-w-2xl mx-auto mb-8">
          Feed these guides to your AI coding assistant to ship faster, smarter, and with best practices baked in.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-full bg-fd-primary text-fd-primary-foreground px-6 py-3 text-sm font-medium hover:bg-fd-primary/90 transition-colors"
          >
            Browse the Docs
          </Link>
          <a
            href="https://github.com/ryanlind/Vibe-Code-Bible"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-fd-border px-6 py-3 text-sm font-medium hover:bg-fd-accent transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>

      <div className="max-w-5xl w-full">
        <h2 className="text-sm font-medium text-fd-muted-foreground uppercase tracking-wider mb-4 text-center">
          11 Chapters &middot; 120 Guides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((ch) => (
            <Link
              key={ch.slug}
              href={`/docs/${ch.slug}`}
              className="group rounded-xl border border-fd-border bg-fd-card p-5 hover:border-fd-primary/40 hover:bg-fd-primary/5 transition-all"
            >
              <h3 className="font-semibold mb-1 group-hover:text-fd-primary transition-colors">{ch.title}</h3>
              <p className="text-sm text-fd-muted-foreground">{ch.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
