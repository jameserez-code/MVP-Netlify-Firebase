# Architecture Overview

## High-level
- Frontend: Static HTML/JS served via Netlify. UI includes a chip-based Visa scope selector and a wallet issuance flow using nonce-based verification.
- Gate: Netlify Identity gates the UI; optional Netlify Access for invite-only access control.
- Memory layer: Firebase Firestore stores per-user secrets; data is isolated by Firebase Auth user UID.
- API surface: Netlify Functions implement Visa, Passport, Wallet, Health, and Waitlist endpoints.
- Data flow: User authenticates via Netlify Identity → optional Firebase Auth gate through front-end → user memory (per UID) accessed via Firestore → API endpoints are secured per-UID.

## Key data model ideas
- Firestore path: secrets/{uid}/values/{key} (per-user memory keys)
- Security rules should enforce that only authenticated users can read/write their own memory:
  - read: auth != null && auth.uid == resource.data.uid
  - write: auth != null && auth.uid == resource.data.uid

## Security posture
- Frontend should not store secrets in memory beyond the session.
- Firestore rules must be tightened to ensure per-user isolation.
- Serverless endpoints should perform input validation and rate limiting where possible.

## Development pathways
- MVP path: Netlify Identity gating + Firestore-backed memory + Netlify Functions for the API surface.
- Production path: Introduce a persistent DB (Postgres/Redis), stronger signing key storage, and a formal CI/CD workflow.
