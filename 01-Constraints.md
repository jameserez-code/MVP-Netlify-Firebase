# Constraints & Preferences
- Identity/gating: Netlify Identity for password-protected entry; optional Netlify Access for invited-only gating.
- Memory store: Firebase Firestore; per-user isolation via Firebase Auth identity.
- API surface: Netlify Functions; ready for production with a path to PostgreSQL/Redis later.
- Frontend: plain HTML/JS (no Next.js); lightweight and quick to deploy.
- Activation: One-click activation path via Netlify + Firebase setup.
- Privacy: YC-friendly demo surface; do not bake public backend state into the frontend.
- Security: Avoid hard-coded secrets in the frontend; move sensitive keys off the client to secure sources at build/deploy time.
- Scope UI: Chip-based selection for Visa scopes; wallet issuance via nonce flow supported.
- Roadmap: MVP now, production upgrades later (DB integration, hardened auth, CI/CD).
