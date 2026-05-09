# Open Questions

- Do you want to proceed with Netlify Access (invites) for production gating, or keep Identity-only?
- Should the initial memory model use plain Firestore documents under secrets/{uid}/values/{key}, or would you prefer a slightly richer schema (versioning, timestamps, metadata)?
- Are there production-grade signing keys that should be stored in a vault/HSM? If yes, which provider?
- Do you want an automated activation script that creates Netlify site, Identity config, Firebase project bootstrap, and a one-shot deploy?
- Is there a preferred testing framework (Playwright vs Cypress) for end-to-end tests?
- Do you want a small dashboard UX now, or defer to a future milestone?
