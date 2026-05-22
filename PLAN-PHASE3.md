# AI Agent Passport — Phase 3 Sprint Plan
**Goal: Multi-tenancy, performance, and real-user readiness**

## Sprint Goal
Ship a system where multiple organizations can coexist securely, queries are fast, and users can export data.

**Success metric: 2 orgs can use the system simultaneously without seeing each other's data**

---

## Day 1-2: Multi-Tenancy & Org Isolation

**Goal: Organizations are properly isolated**

### Tasks
- [ ] Add `orgId` to ALL database queries (verify no query leaks data across orgs)
- [ ] Add `orgId` validation middleware
- [ ] Add team member invites (POST /org/invite, accept/revoke)
- [ ] Add role-based access (org_admin, org_member, readonly)
- [ ] Add org switching in frontend header
- [ ] Add org settings page (name, billing, members)
- [ ] Audit all endpoints for org isolation leaks

**Deliverable: Two test orgs can't see each other's agents, policies, or audit logs**

---

## Day 3-4: Performance & Query Optimization

**Goal: Pages load in < 1s, API responds in < 200ms**

### Tasks
- [ ] Add Firestore composite indexes for common queries
- [ ] Add query result caching (5-minute TTL for metrics)
- [ ] Add database query timing logging
- [ ] Optimize audit log queries (date range filtering)
- [ ] Add pagination to all list endpoints properly
- [ ] Bundle analysis: reduce frontend bundle size
- [ ] Add lazy loading for heavy dashboard sections
- [ ] Add request debouncing for search inputs

**Deliverable: Lighthouse score > 90 on all dashboard pages**

---

## Day 5-6: Data Exports & Compliance

**Goal: Users can export their data for compliance/backup**

### Tasks
- [ ] Add CSV export for audit logs (with date range)
- [ ] Add JSON export for policies
- [ ] Add PDF report generation (weekly summary)
- [ ] Add data deletion (GDPR right to erasure)
- [ ] Add audit log retention settings
- [ ] Add backup/restore for org data

**Deliverable: User can download their complete audit history as CSV**

---

## Day 7-8: Policy Templates & Marketplace

**Goal: Users don't start from scratch**

### Tasks
- [ ] Add 10 pre-built policy templates (e.g., "Safe Customer Support", "Read-Only Analyst")
- [ ] Add template gallery in policy builder
- [ ] Add "Import from Template" button
- [ ] Add custom template creation (save current policy as template)
- [ ] Add template sharing (public/private)
- [ ] Add recommended templates based on agent type

**Deliverable: New user can deploy a working policy in 30 seconds using a template**

---

## Day 9-10: Final Polish & Launch Content

**Goal: Ready for Hacker News launch**

### Tasks
- [ ] Write "Show HN" post
- [ ] Create demo GIF/screen recording
- [ ] Write launch blog post (problem, solution, how it works)
- [ ] Create Twitter/X thread about the product
- [ ] Add "Star on GitHub" badge to landing page
- [ ] Add feedback widget (GitHub issues or Discord)
- [ ] Final bug bash: test every endpoint, every page, every flow
- [ ] Performance audit: fix any remaining slow queries
- [ ] Security audit: check for any remaining vulnerabilities

**Deliverable: "Show HN" post is written and ready to submit**

---

## Kill Criteria
- If multi-tenancy leaks are found, fix them before adding any new features
- If performance is still bad after optimization, add caching layers
- Any feature that doesn't help a user get to "aha" in < 2 minutes is cut
