# Progress

## Done
- Netlify hosting scaffolding
  - netlify.toml added (builds/config, functions directory)
  - netlify/functions/visas.js, netlify/functions/passport.js, netlify/functions/health.js, netlify/functions/wallet.js, netlify/functions/waitlist.js added
- Gate and login surfaces
  - index.html wired for Netlify Identity gating
  - login.html created for password-protected entry
- Firebase memory integration
  - client.js added (initializes Firebase; per-user secrets in Firestore under secrets/{uid}/values/{key})
  - firebase.config.js template added
- Frontend UX improvements
  - Chip-based scope picker added (api:read, api:write, data:share, config:view, config:admin)
- Visa builder UI wired to chip selections; demo visa seeding via UI
- Accessibility/privacy
  - Frontend gating ties memory to authenticated user via Firebase identity
- Documentation scaffolding
  - Readme-like notes and deployment steps prepared

## In progress
- Replace Firebase placeholders with real config (apiKey, authDomain, projectId, etc.)
- Production-grade Visa/Passport flows in Netlify Functions (needs real persistence/validation)
- Harden Firestore security rules for per-user memory isolation
- Activation script to wire Identity invites, Firebase config, Netlify deploy, health checks
- Minimal dashboard view for per-user memory status (optional)

## Blocked
- Real Firebase project credentials (to be provided or created by you)
- Netlify Identity invites and production domain configuration
- If production-ready API is desired, needs wiring to a persistent DB (Postgres/Redis) and CI/CD
