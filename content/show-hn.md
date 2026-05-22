# Show HN: AI Agent Passport — OAuth for AI Agents

**What it does:**
AI agents generate tool calls. Passport Agent intercepts every call, verifies identity, checks policies, and allows/denies/modifies BEFORE execution — with full audit logging.

**Why we built it:**
We kept seeing AI agents with unrestricted API keys deleting production databases, leaking PII, and making unauthorized purchases. Existing solutions were post-hoc (log after the fact) or required complex custom code.

**How it's different:**
- Pre-execution enforcement (not post-hoc logging)
- Policy engine with tool allowlists, domain restrictions, PII detection, cost limits
- Works with any agent framework (OpenAI, Anthropic, LangChain, custom)
- Immutable audit trail with cryptographic signatures
- Stateless, horizontally scalable

**Try it:**
Interactive demo (no signup): https://your-url.com/demo
Live dashboard: https://your-url.com
GitHub: https://github.com/jameserez-code/MVP-Netlify-Firebase

**Tech stack:**
- Fastify + TypeScript backend
- Next.js 14 + Tailwind frontend
- Firebase/Firestore for persistence
- Stripe for billing
- Deployed on Render + Netlify

**Pricing:**
- Free: 3 agents, 100 enforcements/day
- Pro: $29/mo, unlimited agents, 10K enforcements/day

**What's next:**
Looking for 10 developers building AI agents to try this and give feedback. What's missing? What would make this indispensable?

---

Built by J. Rabinowitz. Questions welcome!
