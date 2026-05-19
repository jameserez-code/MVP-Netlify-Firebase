# AI Agent Passport — 2-Week Sprint Plan
**Goal: Transform from "works locally" to "production SaaS that developers can sign up for and use in 5 minutes"**

---

## Sprint Goal

Ship a deployed, multi-tenant SaaS with:
1. Live URL anyone can visit
2. Interactive demo without signup
3. Working SDK on npm
4. Real-time dashboard
5. Compelling landing page that converts
6. Onboarding that gets users to "aha moment" in < 2 minutes

**Success metric: 10 developers create accounts and run the demo agent**

---

## Day 1: Deploy & Connect Everything

**Goal: Frontend and backend talking to each other on the internet**

### Backend
- [ ] Configure Render deployment with proper env vars
- [ ] Add CORS origins for frontend domain
- [ ] Add `GET /` redirect to frontend or serve landing page
- [ ] Verify `/health` endpoint works
- [ ] Seed production database with demo org

### Frontend
- [ ] Configure for static export or server deployment
- [ ] Connect `NEXT_PUBLIC_API_URL` to Render backend
- [ ] Add API proxy/rewrites for local dev
- [ ] Test all CRUD operations end-to-end
- [ ] Fix any CORS issues

### Integration
- [ ] Deploy frontend to Vercel or Netlify
- [ ] Verify login → dashboard → agents → policies flow works
- [ ] Fix any integration bugs

**Deliverable: Live URL where anyone can sign up and use the dashboard**

---

## Day 2: SDK as npm Package + CLI

**Goal: Developers can `npm install @passport-agent/sdk` and use it in 30 seconds**

### SDK
- [ ] Create proper `package.json` with correct exports
- [ ] Add TypeScript declarations
- [ ] Write comprehensive README with examples
- [ ] Add `createAgent()` helper for quick start
- [ ] Add error handling and retry logic
- [ ] Version as `1.0.0-beta.1`

### CLI Tool
- [ ] Create `bin/passport-agent` CLI
- [ ] Commands: `init` (scaffold config), `agent create`, `agent run`, `enforce`, `audit`
- [ ] Read config from `.passport-agent.json` or env vars
- [ ] Colorized output

### Publishing
- [ ] Create npm account / org
- [ ] `npm publish --access public`
- [ ] Add install instructions to main README

**Deliverable: `npm install @passport-agent/sdk` works, CLI tool available**

---

## Day 3: Real-Time Dashboard (WebSocket)

**Goal: Dashboard feels alive — metrics update without refresh**

### Backend
- [ ] Add `ws` library for WebSocket support
- [ ] Create `/ws` endpoint with authentication
- [ ] Broadcast events: `agent:registered`, `run:started`, `run:completed`, `policy:violation`, `audit:new`
- [ ] Add event bus (in-memory or Redis pub/sub)

### Frontend
- [ ] Create `lib/websocket.ts` hook
- [ ] Auto-reconnect on disconnect
- [ ] Update dashboard stats in real-time
- [ ] Add "live activity feed" sidebar
- [ ] Toast notifications for new events
- [ ] Agent status indicators (online/offline)

**Deliverable: Dashboard updates in real-time as agents work**

---

## Day 4: Interactive Demo Mode

**Goal: Visitors can try the product without creating an account**

### Demo Backend
- [ ] Add `POST /demo/start` — creates temporary demo org (expires in 24h)
- [ ] Add `POST /demo/agent/run` — runs a simulated agent with canned responses
- [ ] Add `GET /demo/status` — shows demo session state
- [ ] Auto-cleanup expired demo data (cron job or TTL)

### Demo Frontend
- [ ] Add `/demo` page with interactive sandbox
- [ ] Pre-loaded demo scenario: "Customer Support Agent"
- [ ] Show live enforcement decisions
- [ ] Allow visitors to modify policies and see instant effects
- [ ] CTA to "Create Your Own" at the end

### Demo Scenarios
- [ ] Scenario 1: Customer support agent (safe web search, read-only DB)
- [ ] Scenario 2: Data analysis agent (no PII, internal APIs only)
- [ ] Scenario 3: Social media agent (text generation, no external URLs)

**Deliverable: `/demo` page where visitors can play with enforcement in 30 seconds**

---

## Day 5: API Key System

**Goal: SDK and integrations use API keys, not JWT sessions**

### Backend
- [ ] Add `POST /api-keys` — create new API key (org-scoped)
- [ ] Add `GET /api-keys` — list keys
- [ ] Add `DELETE /api-keys/:id` — revoke key
- [ ] Add middleware to authenticate via `X-API-Key` header
- [ ] Hash keys in DB (only show plaintext once)
- [ ] Track usage per key (requests, last used)

### Frontend
- [ ] Add "API Keys" page in dashboard
- [ ] Generate key button with copy-to-clipboard
- [ ] Show usage stats per key
- [ ] Revoke key with confirmation

### SDK Update
- [ ] Support `apiKey` parameter in constructor
- [ ] Auto-set `X-API-Key` header

**Deliverable: Developers can create API keys and use them with the SDK**

---

## Day 6: Compelling Landing Page

**Goal: Landing page that converts visitors to signups**

### Hero Section
- [ ] Animated agent execution visualization
- [ ] "OAuth for AI Agents" headline
- [ ] "See it in action" CTA button → scrolls to demo
- [ ] Social proof: "Trusted by X developers" (fake it until you make it)

### How It Works
- [ ] 3-step visual: 1) Create Policy, 2) Register Agent, 3) Enforce Automatically
- [ ] Animated diagram showing interception flow

### Features Grid
- [ ] Pre-execution enforcement
- [ ] Policy engine (tools, domains, PII, cost)
- [ ] Immutable audit logging
- [ ] Real-time monitoring
- [ ] Crash recovery
- [ ] Multi-tenant

### Interactive Elements
- [ ] Embedded demo widget (iframe or component)
- [ ] Code snippet showing SDK usage
- [ ] Terminal animation showing enforcement output

### Pricing Section
- [ ] Free tier: 1 org, 3 agents, 100 enforcements/month
- [ ] Pro tier: $29/month, unlimited agents, 10K enforcements
- [ ] Enterprise: Custom pricing, SSO, audit trails

**Deliverable: Landing page that would pass a YC partner's "does this look real" test**

---

## Day 7: Onboarding Wizard

**Goal: New user goes from signup to "aha moment" in < 2 minutes**

### Backend
- [ ] Add `POST /onboarding/complete` — marks onboarding done
- [ ] Add `GET /onboarding/status` — checks if user completed onboarding
- [ ] Auto-create demo agents and policies during signup

### Frontend
- [ ] Add `/onboarding` route with step wizard
- [ ] Step 1: Welcome + "What is AI Agent Passport?" (30s video or animation)
- [ ] Step 2: Create first policy (guided form with presets)
- [ ] Step 3: Register first agent (one-click with defaults)
- [ ] Step 4: Run demo enforcement (interactive terminal)
- [ ] Step 5: "You're ready!" → redirect to dashboard
- [ ] Progress indicator (5 steps)
- [ ] Skip option for power users

### Email
- [ ] Welcome email with quickstart guide
- [ ] "Complete your setup" reminder if onboarding not done in 24h

**Deliverable: New user can go from signup to working enforcement in 2 minutes**

---

## Day 8: Analytics & Charts

**Goal: Dashboard shows beautiful, actionable data**

### Backend
- [ ] Add time-series metrics aggregation
- [ ] Add `GET /analytics/overview` — weekly summary
- [ ] Add `GET /analytics/trends` — enforcement decisions over time
- [ ] Add `GET /analytics/agents` — per-agent stats
- [ ] Add `GET /analytics/policies` — policy violation rates

### Frontend
- [ ] Install charting library (Recharts or Chart.js)
- [ ] Add "Overview" tab to dashboard
- [ ] Charts: enforcement decisions (pie), daily volume (line), top agents (bar), policy violations (heatmap)
- [ ] Date range picker (7d, 30d, 90d)
- [ ] Export to PNG/PDF
- [ ] All charts match dark theme design system

**Deliverable: Dashboard with production-quality analytics charts**

---

## Day 9: Webhook System

**Goal: Integrate with external tools (Slack, email, custom endpoints)**

### Backend
- [ ] Add `POST /webhooks` — register webhook URL
- [ ] Add `GET /webhooks` — list webhooks
- [ ] Add `DELETE /webhooks/:id` — remove
- [ ] Webhook events: `policy.violation`, `agent.revoked`, `run.failed`, `system.alert`
- [ ] Add retry logic with exponential backoff (3 retries)
- [ ] Sign webhooks with HMAC-SHA256 (`X-Webhook-Signature`)
- [ ] Add webhook delivery log

### Frontend
- [ ] Add "Webhooks" page in dashboard
- [ ] Form: URL, events to subscribe, secret for signature
- [ ] Test webhook button (sends ping event)
- [ ] Delivery log table (status, timestamp, response)

### Integrations
- [ ] Add Slack webhook template
- [ ] Add Discord webhook template
- [ ] Add generic HTTP endpoint template

**Deliverable: Users can receive real-time notifications via webhooks**

---

## Day 10: Final Polish & Ship

**Goal: Production-ready, no rough edges**

### Performance
- [ ] Add React Query or SWR for frontend data fetching (caching, deduping)
- [ ] Add API response compression (gzip/brotli)
- [ ] Add CDN for static assets
- [ ] Optimize images and fonts
- [ ] Add `prefers-reduced-motion` support

### Accessibility
- [ ] Run axe-core audit
- [ ] Fix all color contrast issues
- [ ] Add skip links
- [ ] Ensure keyboard navigation works everywhere
- [ ] Test with screen reader

### Mobile
- [ ] Test every page on iPhone SE (375px)
- [ ] Fix any overflow issues
- [ ] Ensure touch targets are >= 44px
- [ ] Test on actual device if possible

### Documentation
- [ ] API reference (auto-generated from OpenAPI spec)
- [ ] SDK documentation with examples
- [ ] Tutorial: "Build your first agent in 5 minutes"
- [ ] Troubleshooting guide

### Monitoring
- [ ] Add Sentry for error tracking
- [ ] Add LogRocket or similar for session replay
- [ ] Set up uptime monitoring (UptimeRobot or similar)

### Launch Checklist
- [ ] All env vars set in production
- [ ] Database seeded with demo data
- [ ] SSL certificate valid
- [ ] DNS propagated
- [ ] Email sending configured (SendGrid/Resend)
- [ ] Analytics tracking (Plausible or Google Analytics)
- [ ] Privacy policy and Terms of Service pages
- [ ] Favicon and OG images for social sharing

**Deliverable: Production SaaS ready for public launch**

---

## Daily Execution Pattern

Each day:
1. **Morning**: Start 3-4 parallel subagent workstreams
2. **Mid-day**: Integrate changes, run builds and tests
3. **Afternoon**: Commit, push, verify on staging
4. **Evening**: Update this doc with what shipped

**Kill criteria**: If any day falls > 50% behind plan, cut scope for that day and move unfinished items to backlog.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| WebSocket complexity | Fallback to polling if WebSocket fails |
| npm publishing delays | Use GitHub Packages as backup |
| Chart library bundle size | Use lightweight SVG charts if needed |
| Email deliverability | Use Resend (free tier, great deliverability) |
| Demo data cleanup | Use Firestore TTL, run cleanup job nightly |

---

## Post-Sprint

**Week 3+ (Post-Sprint Backlog)**:
- Stripe billing integration
- Team/organization member invitations
- SAML/SSO authentication
- Advanced policy templates marketplace
- Agent marketplace (pre-built agents)
- Mobile app (React Native)
- GraphQL API
- Terraform provider / Kubernetes operator

---

*Last updated: 2024-05-19*
