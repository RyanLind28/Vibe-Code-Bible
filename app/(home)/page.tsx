import Link from 'next/link';
import {
  BookOpen,
  Cpu,
  Shield,
  Brain,
  Search,
  Palette,
  Server,
  Wrench,
  PenTool,
  TrendingUp,
  TestTube,
} from 'lucide-react';

const sections = [
  { href: '/docs/frontend', icon: BookOpen, title: 'Frontend', desc: 'React, Next.js, state management, performance, and CSS architecture' },
  { href: '/docs/backend', icon: Server, title: 'Backend', desc: 'API design, auth, databases, caching, real-time, and serverless' },
  { href: '/docs/security', icon: Shield, title: 'Security', desc: 'Authentication, data protection, API security, and monitoring' },
  { href: '/docs/ai-integration', icon: Brain, title: 'AI Integration', desc: 'LLM patterns, RAG, embeddings, agents, and prompt engineering' },
  { href: '/docs/seo', icon: Search, title: 'SEO', desc: 'Technical, content, local, international, and AI-era SEO' },
  { href: '/docs/uiux', icon: Palette, title: 'UI/UX', desc: 'Design systems, accessibility, animation, and responsive design' },
  { href: '/docs/devops', icon: Cpu, title: 'DevOps', desc: 'CI/CD, Docker, cloud architecture, IaC, and monitoring' },
  { href: '/docs/tools', icon: Wrench, title: 'Tools & Services', desc: 'Databases, auth, payments, CMS, hosting, and integrations' },
  { href: '/docs/copywriting', icon: PenTool, title: 'Copywriting', desc: 'Headlines, landing pages, CTAs, email copy, and brand voice' },
  { href: '/docs/product-growth', icon: TrendingUp, title: 'Product & Growth', desc: 'Onboarding, PLG, experimentation, retention, and monetization' },
  { href: '/docs/testing', icon: TestTube, title: 'Testing', desc: 'Unit, integration, E2E, and testing strategy' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center px-6 py-16 flex-1">
      <div className="max-w-3xl w-full">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
          Vibe Code Bible
        </h1>

        {/* Overview */}
        <p className="text-fd-muted-foreground text-center text-base sm:text-lg leading-relaxed mb-4 max-w-2xl mx-auto">
          The ultimate full-stack developer reference. 100+ chapters covering
          frontend, backend, security, AI, SEO, DevOps, and more, with every
          page optimized for AI-assisted workflows.
        </p>

        <div className="flex justify-center mb-12">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-fd-primary text-fd-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            View Docs
          </Link>
        </div>

        {/* Sections */}
        <h2 className="text-lg font-semibold mb-4">Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-start gap-3 p-4 rounded-lg border border-fd-border hover:bg-fd-accent/50 transition-colors"
            >
              <s.icon size={18} className="text-fd-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-sm">{s.title}</div>
                <div className="text-fd-muted-foreground text-xs leading-relaxed mt-0.5">
                  {s.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
