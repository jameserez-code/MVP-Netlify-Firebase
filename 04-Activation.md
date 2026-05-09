# Activation Quick-Start

## Prereqs
- Netlify account and site
- Firebase project with Firestore + Google Sign-In
- Netlify CLI installed
- Node environment for edits

## Steps
1) Netlify Identity gating
- netlify login
- netlify init (connect repo)
- Enable Identity (and optional Access)

2) Firebase memory
- Create Firebase project; enable Firestore and Google Sign-In
- Copy real Firebase config values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
- Replace placeholders in frontend:
  - client.js
  - src/config/firebase.config.js
- Set Firestore security rules for per-user memory (basic example)
  - toRead: auth != null && auth.uid == resource.data.uid
  - toWrite: auth != null && auth.uid == resource.data.uid

3) Deploy frontend
- netlify deploy --prod

4) End-to-end verification
- Open Netlify URL
- Sign in with Netlify Identity
- Sign in to Firebase (if needed for per-user memory)
- Use Visa chip UI, issue Passport, store/read a secret

5) Test gating
- Verify that unauthenticated users cannot access gated content

6) Optional
- Configure Netlify Access for explicit invites
- Add a quick Playwright/Cypress test to cover login → visa → passport → memory

If you want a fully automated patch-set (site creation, Firebase bootstrap, and deployment), say so and I’ll add a one-shot activation script and full file diffs.
