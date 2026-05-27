## 2026-05-26 - IDOR and Org Isolation in Agents API

**Vulnerability:** The Agents API endpoints (`POST /agents/register`, `GET /agents`, `PATCH /agents/:id/revoke`, `POST /agents/:id/rotate-key`) were missing proper authentication enforcement and organization-level access controls. This allowed any requester to view, revoke, or rotate keys for agents belonging to other organizations if they knew the agent ID (IDOR), and registration used a fallback organization ID.

**Learning:** Manual authentication checks (`requireAuth`) inside route handlers are prone to omission and inconsistency. Using Fastify's `preHandler` hooks or grouping routes in protected register blocks provides more reliable protection. Additionally, organization isolation must be explicitly verified in every mutation endpoint to prevent IDOR.

**Prevention:**
1. Group protected routes and apply authentication via a shared `preHandler` hook or middleware.
2. Always use `request.orgId` (derived from the authenticated token) to scope database queries.
3. For specific resource updates, always verify that the resource's `orgId` matches the requester's `orgId` before proceeding with the mutation.
