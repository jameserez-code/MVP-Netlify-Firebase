# AI Agent Passport — Phase 2 Sprint Plan
**Goal: Production launch readiness — users can sign up, pay, and use without bugs**

## Sprint Goal
Ship a fully functional SaaS where a stranger can:
1. Visit the landing page
2. Sign up with email verification
3. Complete onboarding
4. Create a policy and agent
5. See enforcement working
6. (Optional) Upgrade to Pro via Stripe

**Success metric: 5 strangers create accounts and complete onboarding without asking for help**

---

## Day 1-2: Production Connectivity & End-to-End Verification

**Goal: Frontend and backend actually talk to each other in production**

### Tasks
- [ ] Fix API client to use environment-based URLs (not localhost)
- [ ] Add runtime config validation on frontend startup
- [ ] Add request/response interceptors for debugging
- [ ] Test complete flow locally: register → login → policy → agent → enforce → audit
- [ ] Fix any integration bugs discovered
- [ ] Add frontend error boundaries (catch React crashes)
- [ ] Add API error fallback pages
- [ ] Verify CORS works with production domains

**Deliverable: Register → Login → Dashboard works end-to-end with zero manual config**

---

## Day 3-4: Authentication Completion

**Goal: Production-grade auth system**

### Tasks
- [ ] **Email verification**: Send verification email on signup, require before full access
- [ ] **Password reset**: "Forgot password" flow with secure token
- [ ] **Password change**: Allow logged-in users to change password
- [ ] **Session management**: Show active sessions, allow logout from other devices
- [ ] **Rate limiting auth**: Prevent brute force on login/reset endpoints
- [ ] **Account lockout**: Lock after 5 failed attempts, notify via email

**Deliverable: Auth system that would pass a basic security audit**

---

## Day 5-6: Stripe Billing Integration

**Goal: Pricing page actually works — users can pay**

### Tasks
- [ ] **Stripe setup**: Create account, products (Free, Pro $29/mo, Enterprise)
- [ ] **Checkout**: Stripe Checkout integration for Pro upgrade
- [ ] **Customer portal**: Allow users to manage subscription, cancel, update payment
- [ ] **Webhooks**: Handle `invoice.paid`, `subscription.deleted`, `payment_failed`
- [ ] **Feature gates**: Enforce limits based on plan (agent count, enforcement volume)
- [ ] **Usage tracking**: Count enforcements per org, show usage bar in dashboard
- [ ] **Upgrade prompts**: Show "Upgrade to Pro" when approaching limits

**Deliverable: User can click "Upgrade" and actually pay $29/month**

---

## Day 7-8: Production Seeding & Monitoring

**Goal: New deployment is automatically ready for users**

### Tasks
- [ ] **Database migration system**: Versioned migrations for schema changes
- [ ] **Auto-seed on first deploy**: Create default org, demo data, admin user
- [ ] **Health dashboard**: `/health` shows all service status
- [ ] **Error tracking**: Sentry integration for frontend and backend
- [ ] **Performance monitoring**: Track API latency, Firestore query times
- [ ] **Alerting**: Alert on error rate > 1% or latency > 500ms
- [ ] **Log aggregation**: Structured JSON logs, correlation IDs throughout

**Deliverable: New deployment self-configures and is monitored**

---

## Day 9-10: Launch Assets & Polish

**Goal: Looks like a real, trustworthy product**

### Tasks
- [ ] **OG image**: Generate social sharing image (1200x630, dark theme)
- [ ] **Favicon**: Multi-size favicon for all platforms
- [ ] **App icons**: For PWA/manifest
- [ ] **Demo video/GIF**: 30-second screen recording of enforcement
- [ ] **Screenshots**: Dashboard, policy builder, audit log for landing page
- [ ] **Error pages**: 404, 500, maintenance with branding
- [ ] **Loading states**: Skeleton screens for all async operations
- [ ] **Empty states**: Beautiful empty states for all lists
- [ ] **Success states**: Confirmation animations after key actions

**Deliverable: Product looks polished enough for Hacker News front page**

---

## Kill Criteria
- If Stripe integration takes > 2 days, skip it and use "Contact Sales" for Pro
- If email verification is blocked by deliverability, skip and add post-signup modal
- Any feature that doesn't directly help a user complete onboarding is cut

---

## Post-Sprint (Week 3+)
- Multi-organization support
- Team member invitations
- SAML/SSO
- Advanced analytics
- Mobile app
