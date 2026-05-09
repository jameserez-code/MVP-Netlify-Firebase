# Netlify Setup Plan (MVP)

Prereqs
- Netlify account and access to deploy sites
- A connected Git repo or local patch for deployment
- Optional: Netlify Identity configured for password-based gating

Steps
- log in: netlify login
- netlify init (connect repo)
- configure Identity if you want password-based gating

- Ensure netlify.toml points to functions path (netlify/functions)
- Add environment variables if you plan to connect to Firebase (api keys, etc.) via Netlify UI or CLI

- netlify deploy --prod

- Open Netlify URL behind Identity gate (if enabled)
- Call the endpoints: /api/visas, /api/passport, /api/wallet, /api/health to verify responses

5) Next steps
- Wire real Firebase config in frontend (firebase.config.js)
- Implement per-user memory rules in Firestore and front-end gating
- Add a quick Playwright/Cypress test
