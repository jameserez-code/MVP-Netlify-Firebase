'use client'

import Link from 'next/link'
import Navbar from '@/components/navbar'
import { ChevronRight, ArrowRight } from 'lucide-react'

const posts = [
  {
    slug: 'why-every-ai-agent-needs-a-passport',
    title: 'Why Every AI Agent Needs a Passport',
    date: 'May 25, 2026',
    excerpt:
      'The missing infrastructure layer for autonomous AI. How pre-execution enforcement prevents disasters before they happen.',
    tags: ['ai-security', 'infrastructure', 'product'],
    tagColors: { 'ai-security': 'text-passport-green border-passport-green/25 bg-passport-green/8', 'infrastructure': 'text-passport-azure border-passport-azure/25 bg-passport-azure/8', 'product': 'text-passport-coral border-passport-coral/25 bg-passport-coral/8' } as Record<string, string>,
  },
  {
    slug: 'api-keys-are-not-security',
    title: 'API Keys Are Not Security — Why We Built AI Agent Passport',
    date: 'May 20, 2026',
    excerpt:
      'API keys grant all-or-nothing access. For AI agents that can take hundreds of actions per session, this is terrifying.',
    tags: ['security', 'api-keys', 'engineering'],
    tagColors: { 'security': 'text-passport-red border-passport-red/25 bg-passport-red/8', 'api-keys': 'text-passport-amber border-passport-amber/25 bg-passport-amber/8', 'engineering': 'text-passport-azure border-passport-azure/25 bg-passport-azure/8' } as Record<string, string>,
  },
  {
    slug: 'the-47000-mistake',
    title: 'The $47,000 Mistake — Real AI Agent Incidents and How to Prevent Them',
    date: 'May 18, 2026',
    excerpt:
      'From deleted databases to $50K cloud bills — real stories of AI agents going wrong, and the simple fix.',
    tags: ['case-studies', 'incidents', 'prevention'],
    tagColors: { 'case-studies': 'text-passport-coral border-passport-coral/25 bg-passport-coral/8', 'incidents': 'text-passport-red border-passport-red/25 bg-passport-red/8', 'prevention': 'text-passport-green border-passport-green/25 bg-passport-green/8' } as Record<string, string>,
  },
  {
    slug: 'from-zero-to-enforcement',
    title: 'From Zero to Enforcement in 30 Minutes — Getting Started with Passport Agent',
    date: 'May 15, 2026',
    excerpt:
      'A step-by-step guide to securing your first AI agent with policy enforcement. No PhD required.',
    tags: ['tutorial', 'getting-started', 'sdk'],
    tagColors: { 'tutorial': 'text-passport-amber border-passport-amber/25 bg-passport-amber/8', 'getting-started': 'text-passport-green border-passport-green/25 bg-passport-green/8', 'sdk': 'text-passport-azure border-passport-azure/25 bg-passport-azure/8' } as Record<string, string>,
  },
  {
    slug: 'the-oauth-moment-for-ai',
    title: 'The OAuth Moment for AI — Why 2026 Is the Year of Agent Infrastructure',
    date: 'May 12, 2026',
    excerpt:
      'Every major technology shift creates new infrastructure needs. AI agents are creating the biggest one yet.',
    tags: ['industry', 'trends', 'infrastructure'],
    tagColors: { 'industry': 'text-passport-azure border-passport-azure/25 bg-passport-azure/8', 'trends': 'text-passport-coral border-passport-coral/25 bg-passport-coral/8', 'infrastructure': 'text-passport-azure border-passport-azure/25 bg-passport-azure/8' } as Record<string, string>,
  },
]

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-14">
            <p className="label-text mb-3">Blog</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
              Blog
            </h1>
            <p className="text-passport-muted leading-relaxed max-w-lg">
              Thoughts on AI agent security, policy enforcement, and building trustworthy autonomous systems
            </p>
          </div>

          <div className="space-y-8">
            {posts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block group"
              >
                <article
                  className="glass-panel glass-panel-hover p-6 transition-all duration-300 hover:border-passport-green/20"
                  style={{
                    animation: `slideUp 0.3s ease both`,
                    animationDelay: `${0.05 * (i + 1)}s`,
                  }}
                >
                  <time className="font-mono text-xs text-passport-dim tracking-wider mb-3 block">
                    {post.date}
                  </time>
                  <h2 className="text-xl font-semibold text-passport-text mb-3 group-hover:text-passport-green transition-colors duration-200">
                    {post.title}
                  </h2>
                  <p className="text-sm text-passport-muted leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${post.tagColors[tag] || 'text-passport-muted border-passport-border/50 bg-passport-surface'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="flex items-center gap-1 text-xs font-mono text-passport-green opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Read more <ArrowRight size={12} />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-mono text-[10px] text-passport-dim tracking-wider">
            &copy; {new Date().getFullYear()} Passport Agent &middot; Built by J. Rabinowitz
          </p>
        </div>
      </footer>
    </div>
  )
}
