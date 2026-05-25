'use client'

import Link from 'next/link'
import Navbar from '@/components/navbar'
import { ArrowLeft, Clock } from 'lucide-react'

function BlogPostContent() {
  return (
    <>
      <section className="mb-10">
        <p className="text-passport-text leading-relaxed">
          We are living through the biggest shift in software since the internet. AI agents — autonomous systems that can browse the web, query databases, send emails, make purchases, and execute code — are being deployed by thousands of companies right now. From customer support bots to financial analysts to DevOps automation, these agents are handling real business logic with real consequences.
        </p>
        <p className="text-passport-muted leading-relaxed mt-4">
          But there is a blind spot that almost nobody is talking about: <strong className="text-passport-text font-semibold">how do you control what these agents actually do?</strong>
        </p>
        <p className="text-passport-muted leading-relaxed mt-4">
          Right now, most AI agents are deployed with little more than an API key. That API key grants broad permissions — often the same permissions a human developer would have. And unlike a human, an AI agent can make hundreds of decisions per minute. One misstep, one hallucinated tool call, one prompt injection — and you have a disaster on your hands.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-passport-text mb-4">The Problem: What Happens When Agents Go Rogue</h2>
        <p className="text-passport-muted leading-relaxed">
          Let me paint you a picture. A fintech company deploys an AI agent to help customers with account queries. The agent has access to their customer database, payment processor, and email system. A well-intentioned support request triggers the agent to run a query — but due to a hallucinated SQL statement, instead of reading a customer record, it executes a <span className="font-mono text-passport-coral text-sm">DROP TABLE</span> on the production database.
        </p>
        <p className="text-passport-muted leading-relaxed mt-4">
          This is not hypothetical. In the past 12 months, we have documented:
        </p>
        <ul className="mt-4 space-y-3 text-passport-muted leading-relaxed">
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-passport-red shrink-0 mt-2" />
            <span>An AI agent that racked up a <strong className="text-passport-text">$47,000 AWS bill</strong> by spawning unlimited resources during a load test gone wrong.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-passport-red shrink-0 mt-2" />
            <span>A customer service bot that <strong className="text-passport-text">leaked PII</strong> for 3,400 users by including database rows in its email responses.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-passport-red shrink-0 mt-2" />
            <span>A DevOps agent that <strong className="text-passport-text">deleted an entire production Kubernetes cluster</strong> after misinterpreting a slack message.</span>
          </li>
        </ul>
        <p className="text-passport-muted leading-relaxed mt-4">
          In every single case, the root cause was the same: <strong className="text-passport-text">the agent had unrestricted access to tools it should never have been able to invoke.</strong>
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-passport-text mb-4">Why API Keys Aren&apos;t Enough</h2>
        <p className="text-passport-muted leading-relaxed">
          API keys are the standard way to authenticate requests. They answer the question: <em>&ldquo;Who is making this request?&rdquo;</em> They do not answer: <em>&ldquo;Should this request be allowed?&rdquo;</em>
        </p>
        <p className="text-passport-muted leading-relaxed mt-4">
          For a human developer, this distinction matters less. A human writes code, reviews it, and deploys it through a CI/CD pipeline. There are guardrails: code review, staging environments, monitoring. An AI agent, by contrast, generates and executes tool calls in real-time, with no human in the loop. The guardrails that protect human-written code simply do not exist for agent-generated actions.
        </p>
        <p className="text-passport-muted leading-relaxed mt-4">
          Consider a typical API key permission model: it is usually all-or-nothing. Either the agent can query the database, or it cannot. There is no concept of &ldquo;you can query, but only read-only&rdquo;, or &ldquo;you can query, but not the users table&rdquo;, or &ldquo;you can query, but only 100 rows per session.&rdquo;
        </p>
        <blockquote className="border-l-3 border-passport-green pl-5 py-1 my-6">
          <p className="text-sm text-passport-text leading-relaxed italic">
            &ldquo;API keys grant all-or-nothing access. For AI agents that can take hundreds of actions per session, this is terrifying.&rdquo;
          </p>
        </blockquote>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-passport-text mb-4">The Three Pillars</h2>
        <p className="text-passport-muted leading-relaxed">
          AI Agent Passport was built on three architectural pillars that together form a complete security model for autonomous agents:
        </p>

        <div className="mt-6 space-y-5">
          <div className="glass-panel p-5">
            <h3 className="font-mono text-sm font-semibold text-passport-green mb-2">
              1. Pre-Execution Enforcement
            </h3>
            <p className="text-sm text-passport-muted leading-relaxed">
              Every tool call is intercepted <em>before</em> it executes. The system evaluates the intent, the agent&apos;s permissions, and the active policies — all in under 50ms. If the call violates any policy, it is denied with a detailed reason. The action never reaches the target system.
            </p>
          </div>

          <div className="glass-panel p-5">
            <h3 className="font-mono text-sm font-semibold text-passport-azure mb-2">
              2. Policy Engine
            </h3>
            <p className="text-sm text-passport-muted leading-relaxed">
              Policies are human-readable, declarative rules that define what agents can and cannot do. Policies can restrict specific tools, limit cost per session, detect PII in outputs, enforce domain allowlists, and more. They can be updated in real-time without touching agent code.
            </p>
          </div>

          <div className="glass-panel p-5">
            <h3 className="font-mono text-sm font-semibold text-passport-coral mb-2">
              3. Immutable Audit Trail
            </h3>
            <p className="text-sm text-passport-muted leading-relaxed">
              Every enforcement decision — allow, deny, or modify — is logged with cryptographic integrity. This gives security teams a complete, tamper-proof record of everything every agent has ever tried to do. Essential for compliance, debugging, and incident response.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-passport-text mb-4">Real-World Example: How a Fintech Company Prevented a Disaster</h2>
        <p className="text-passport-muted leading-relaxed">
          A fintech startup was building an AI agent to help customers analyze their spending patterns. The agent needed read access to transaction data but had no reason to write anything. They deployed Passport Agent with a simple policy:
        </p>
        <div className="relative rounded-md overflow-hidden bg-[#0d1117] border border-passport-border my-5">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-passport-border bg-passport-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f85149]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#d2991d]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#2ea043]" />
            <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-passport-dim">
              policy
            </span>
          </div>
          <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-passport-muted">
            <code>{`{
  "name": "read-only-analyst",
  "rules": [
    {
      "action": "deny",
      "tools": ["write_to_db", "delete_from_db", "send_money"]
    },
    {
      "action": "allow",
      "tools": ["query_db", "read_transactions"],
      "pii_detection": true
    }
  ]
}`}</code>
          </pre>
        </div>
        <p className="text-passport-muted leading-relaxed mt-4">
          Two weeks after deployment, their agent attempted to execute a <span className="font-mono text-passport-coral text-sm">DELETE FROM transactions</span> after misinterpreting a user message. Passport Agent blocked it instantly. The audit log showed the blocked attempt, and the team received an alert. Zero data was lost. The agent continued operating normally for all allowed queries.
        </p>
        <p className="text-passport-muted leading-relaxed mt-4">
          Without Passport Agent, that <span className="font-mono text-passport-coral text-sm">DELETE</span> would have gone through. They would have lost transaction history for thousands of customers — an existential threat for a fintech company.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-passport-text mb-4">Getting Started: 3 Lines of Code</h2>
        <p className="text-passport-muted leading-relaxed">
          Adding enforcement to an existing agent takes minutes, not days. The SDK wraps any agent framework:
        </p>
        <div className="relative rounded-md overflow-hidden bg-[#0d1117] border border-passport-border my-5">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-passport-border bg-passport-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f85149]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#d2991d]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#2ea043]" />
            <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-passport-dim">
              typescript
            </span>
          </div>
          <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-passport-muted">
            <code>{`import { AgentControlPlane } from '@passport-agent/sdk'

const agent = new AgentControlPlane({
  apiKey: 'passport_live_...',
  policies: ['read-only-db', 'max-cost-50']
})`}</code>
          </pre>
        </div>
        <p className="text-passport-muted leading-relaxed mt-4">
          That is it. Three lines. Every tool call your agent makes will now be intercepted, evaluated against your policies, and either allowed or denied in real-time. The SDK works with OpenAI, Anthropic, LangChain, CrewAI, and any custom agent framework.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-passport-text mb-4">Conclusion: The Infrastructure Layer for Autonomous AI</h2>
        <p className="text-passport-muted leading-relaxed">
          Every major technology shift creates new infrastructure needs. The web created the need for TLS certificates and CDNs. Cloud computing created the need for IAM and VPCs. APIs created the need for OAuth and API gateways.
        </p>
        <p className="text-passport-muted leading-relaxed mt-4">
          Autonomous AI agents are creating the biggest infrastructure gap yet. We are deploying agents with the permissions of a root user and hoping nothing goes wrong. That is not a strategy — it is a ticking time bomb.
        </p>
        <p className="text-passport-muted leading-relaxed mt-4">
          AI Agent Passport is the missing layer. It gives you the confidence to deploy autonomous agents knowing that every action is authorized, every decision is logged, and every violation is blocked before it can cause harm.
        </p>
        <blockquote className="border-l-3 border-passport-green pl-5 py-1 my-6">
          <p className="text-sm text-passport-text leading-relaxed italic">
            &ldquo;The web got HTTPS. APIs got OAuth. AI agents get Passport.&rdquo;
          </p>
        </blockquote>
      </section>

      <div className="flex items-center justify-between border-t border-passport-border pt-8 mt-12">
        <Link href="/register" className="btn-primary">
          Start Building Free
        </Link>
        <Link href="/blog" className="flex items-center gap-1.5 text-sm font-mono text-passport-muted hover:text-passport-text transition-colors">
          <ArrowLeft size={14} />
          Back to Blog
        </Link>
      </div>
    </>
  )
}

const posts: Record<string, {
  title: string
  date: string
  author: string
  readingTime: string
  tags: string[]
  tagColors: Record<string, string>
}> = {
  'why-every-ai-agent-needs-a-passport': {
    title: 'Why Every AI Agent Needs a Passport',
    date: 'May 25, 2026',
    author: 'J. Rabinowitz',
    readingTime: '6 min read',
    tags: ['ai-security', 'infrastructure', 'product'],
    tagColors: {
      'ai-security': 'text-passport-green border-passport-green/25 bg-passport-green/8',
      'infrastructure': 'text-passport-azure border-passport-azure/25 bg-passport-azure/8',
      'product': 'text-passport-coral border-passport-coral/25 bg-passport-coral/8',
    },
  },
}

export default function BlogPostClient({ slug }: { slug: string }) {
  const post = posts[slug]

  if (!post) {
    return (
      <div className="min-h-screen bg-passport-bg">
        <Navbar />
        <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-passport-text mb-4">Post Not Found</h1>
            <p className="text-passport-muted mb-6">This blog post does not exist yet.</p>
            <Link href="/blog" className="btn-primary">
              <ArrowLeft size={14} />
              Back to Blog
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <article className="max-w-2xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-mono text-passport-muted hover:text-passport-green transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Blog
          </Link>

          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-passport-text leading-tight mb-4">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-passport-muted mb-5">
              <span className="font-mono text-passport-dim">{post.author}</span>
              <span className="text-passport-border">|</span>
              <time className="font-mono text-passport-dim">{post.date}</time>
              <span className="text-passport-border">|</span>
              <span className="flex items-center gap-1.5 font-mono text-passport-dim">
                <Clock size={12} />
                {post.readingTime}
              </span>
            </div>
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
          </header>

          <div className="text-base leading-relaxed">
            <BlogPostContent />
          </div>
        </article>
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
