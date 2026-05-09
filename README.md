# MVP Netlify + Firebase Scaffold

This repository contains the MVP scaffolding for a password-protected, Netlify-hosted UI gated by Netlify Identity with per-user memory stored in Firebase Firestore. It also includes a serverless API surface via Netlify Functions (Visa, Passport, Wallet, Health, Waitlist).

What’s inside:
- netlify.toml and netlify/functions/* for the API surface
- Frontend config placeholders for Firebase
- Firestore per-user memory model ideas and starter rules
- Optional CMS/config for Netlify CMS (not required for MVP)
- Guidance docs for setup and deployment (04-Netlify-Setup.md, 04-Firestore-Rules.md, etc.)

How to start:
- Initialize a git repo, configure identity, wire Firebase, and deploy to Netlify per the step-by-step guide in this repo.
- Replace placeholder Firebase config with real project values and adjust Firestore rules before production.

Notes:
- Do not commit real secrets. Use Netlify environment variables or Firebase config injected at build time.
- This MVP is designed for a quick demo and can be hardened for production later.
