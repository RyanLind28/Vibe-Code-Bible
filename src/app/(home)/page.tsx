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
    <main className="flex flex-col items-center flex-1 px-4 py-16">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 sm:text-5xl">Vibe Code Bible</h1>
        <p className="text-lg text-fd-muted-foreground max-w-2xl mx-auto mb-8">
          The open-source knowledge base for vibe coders. Feed these guides to your AI coding assistant to ship faster, smarter, and with best practices baked in.
        </p>
        <Link
          href="/docs"
          className="inline-flex items-center justify-center rounded-full bg-fd-primary text-fd-primary-foreground px-6 py-3 text-sm font-medium hover:bg-fd-primary/90 transition-colors"
        >
          Browse the Docs
        </Link>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {chapters.map((ch) => (
          <Link
            key={ch.slug}
            href={`/docs/${ch.slug}`}
            className="group rounded-lg border border-fd-border bg-fd-card p-5 hover:bg-fd-accent transition-colors"
          >
            <h2 className="font-semibold mb-1 group-hover:text-fd-accent-foreground">{ch.title}</h2>
            <p className="text-sm text-fd-muted-foreground">{ch.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
