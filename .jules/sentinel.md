## 2025-05-28 - IDOR in Organization Metrics Endpoint
**Vulnerability:** The `/org/metrics` endpoint was completely unauthenticated and allowed any user to query metrics for any organization by providing an `orgId` query parameter.
**Learning:** Some administrative or operational endpoints were added without the standard `requireAuth` middleware, likely for ease of monitoring or during early development, leading to unauthorized information exposure.
**Prevention:** Always apply a default-deny policy or ensure all new endpoints are wrapped in authentication and authorization checks that validate ownership of the requested resource.
