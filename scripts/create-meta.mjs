/**
 * Creates meta.json files for Fumadocs sidebar navigation.
 */
import fs from 'node:fs';
import path from 'node:path';

const CONTENT = path.resolve(import.meta.dirname, '..', 'content', 'docs');

function writeMeta(dir, data) {
  const filePath = path.join(dir, 'meta.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ${path.relative(CONTENT, filePath)}`);
}

// Root meta — chapter ordering
writeMeta(CONTENT, {
  title: 'Docs',
  pages: [
    'index',
    'frontend',
    'backend',
    'security',
    'ai-integration',
    'seo',
    'uiux',
    'devops',
    'tools',
    'copywriting',
    'product-growth',
    'testing',
  ],
});

// Frontend
writeMeta(path.join(CONTENT, 'frontend'), {
  title: 'Frontend',
  pages: [
    'index',
    'react-fundamentals',
    'nextjs-patterns',
    'typescript-react',
    'component-patterns',
    'state-management',
    'data-fetching',
    'forms-validation',
    'css-architecture',
    'performance',
  ],
});

// Backend
writeMeta(path.join(CONTENT, 'backend'), {
  title: 'Backend',
  pages: [
    'index',
    'api-design',
    'database-design',
    'auth-sessions',
    'caching-strategies',
    'error-handling-logging',
    'serverless-edge',
    'background-jobs',
    'webhooks-integrations',
    'real-time',
  ],
});

// Security
writeMeta(path.join(CONTENT, 'security'), {
  title: 'Security',
  pages: [
    'index',
    'authentication-identity',
    'secrets-environment',
    'frontend-security',
    'backend-security',
    'api-security',
    'data-protection',
    'security-headers-infrastructure',
    'dependencies-supply-chain',
    'security-testing-monitoring',
  ],
});

// AI Integration
writeMeta(path.join(CONTENT, 'ai-integration'), {
  title: 'AI Integration',
  pages: [
    'index',
    'llm-patterns',
    'prompt-engineering',
    'rag',
    'embeddings',
    'ai-agents',
    'ai-workflows',
    'ai-ux-patterns',
    'multimodal-ai',
    'ai-observability',
  ],
});

// SEO (has subcategories)
writeMeta(path.join(CONTENT, 'seo'), {
  title: 'SEO',
  pages: [
    'index',
    'technical-seo',
    'on-page-seo',
    'off-page-seo',
    'content-seo',
    'local-seo',
    'e-commerce-seo',
    'international-seo',
    'enterprise-seo',
    'ai-seo',
    'analytics',
  ],
});

// SEO subcategories
writeMeta(path.join(CONTENT, 'seo', 'technical-seo'), {
  title: 'Technical SEO',
  pages: ['core-web-vitals', 'crawlability', 'site-structure', 'structured-data'],
});

writeMeta(path.join(CONTENT, 'seo', 'on-page-seo'), {
  title: 'On-Page SEO',
  pages: ['keyword-research', 'search-intent', 'title-tags', 'internal-linking'],
});

writeMeta(path.join(CONTENT, 'seo', 'off-page-seo'), {
  title: 'Off-Page SEO',
  pages: ['link-building', 'digital-pr', 'brand-mentions'],
});

writeMeta(path.join(CONTENT, 'seo', 'content-seo'), {
  title: 'Content SEO',
  pages: ['topical-authority', 'content-clusters', 'programmatic-seo'],
});

writeMeta(path.join(CONTENT, 'seo', 'local-seo'), {
  title: 'Local SEO',
  pages: ['google-business-profile', 'local-citations'],
});

writeMeta(path.join(CONTENT, 'seo', 'e-commerce-seo'), {
  title: 'E-commerce SEO',
  pages: ['product-page-seo', 'category-page-seo'],
});

writeMeta(path.join(CONTENT, 'seo', 'international-seo'), {
  title: 'International SEO',
  pages: ['hreflang', 'geo-targeting'],
});

writeMeta(path.join(CONTENT, 'seo', 'enterprise-seo'), {
  title: 'Enterprise SEO',
  pages: ['governance', 'automation'],
});

writeMeta(path.join(CONTENT, 'seo', 'ai-seo'), {
  title: 'AI SEO',
  pages: ['generative-engine-optimization', 'llm-visibility'],
});

writeMeta(path.join(CONTENT, 'seo', 'analytics'), {
  title: 'Analytics',
  pages: ['google-analytics', 'search-console'],
});

// UI/UX
writeMeta(path.join(CONTENT, 'uiux'), {
  title: 'UI/UX',
  pages: [
    'index',
    'design-systems',
    'brand-identity',
    'accessibility',
    'responsive-design',
    'mobile-first',
    'typography-color',
    'ux-patterns',
    'animation-motion',
    'dark-mode',
  ],
});

// DevOps
writeMeta(path.join(CONTENT, 'devops'), {
  title: 'DevOps',
  pages: [
    'index',
    'cicd',
    'docker-containers',
    'cloud-architecture',
    'infrastructure-as-code',
    'monitoring-logging',
  ],
});

// Tools
writeMeta(path.join(CONTENT, 'tools'), {
  title: 'Tools',
  pages: [
    'index',
    'baas-platforms',
    'authentication',
    'databases',
    'hosting-deployment',
    'payments',
    'email-services',
    'analytics-monitoring',
    'cms',
    'file-storage',
    'background-jobs',
    'search',
    'communication',
    'live-chat-support',
  ],
});

// Copywriting
writeMeta(path.join(CONTENT, 'copywriting'), {
  title: 'Copywriting',
  pages: [
    'index',
    'headlines-hooks',
    'landing-pages',
    'ctas-conversion',
    'seo-copywriting',
    'ux-writing',
    'email-copy',
    'product-copy',
    'brand-voice-tone',
    'content-writing',
  ],
});

// Product Growth
writeMeta(path.join(CONTENT, 'product-growth'), {
  title: 'Product & Growth',
  pages: [
    'index',
    'product-led-growth',
    'user-onboarding',
    'retention-engagement',
    'conversion-optimization',
    'experimentation',
    'analytics-instrumentation',
    'email-notification-systems',
    'referral-viral-loops',
    'billing-monetization',
    'growth-marketing-channels',
  ],
});

// Testing
writeMeta(path.join(CONTENT, 'testing'), {
  title: 'Testing',
  pages: ['index'],
});

console.log('\nDone! All meta.json files created.');
