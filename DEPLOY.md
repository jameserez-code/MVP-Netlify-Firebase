# Deployment Guide

## Local Development

```bash
npm install
# Place service-account.json in project root
npm run healthcheck    # Verify Firestore
npm run schema:seed    # Seed collections
npm run dev            # Start Fastify API on :3000
```

**Pages available locally:**
- `http://localhost:3000` — API server (14+ endpoints)
- `index.html` — Main app (open directly in browser)
- `admin-portal.html` — Admin dashboard
- `agents.html` — Agent management
- `sdk-demo.html` — SDK browser demo
- `verify-demo.html` — Third-party credential verification

## Netlify Deploy

The repo is configured for Netlify with `.netlify.toml`.

### 1. Connect Git repo to Netlify

Netlify auto-detects the netlify.toml and deploys on push.

### 2. Set environment variables in Netlify UI

```
FIREBASE_PROJECT_ID    = your-project-id
FIREBASE_CLIENT_EMAIL  = firebase-adminsdk-xxxx@...
FIREBASE_PRIVATE_KEY   = -----BEGIN PRIVATE KEY-----\n...
ENGINE_SECRET          = your-secret-here
JWT_SECRET             = your-jwt-secret-here
```

### 3. Deploy

Push to main. Netlify builds with `npm install` and serves the functions directory.

### 4. Verify

```
curl https://your-site.netlify.app/.netlify/functions/api/health
```

## Firestore Indexes

For production, create these composite indexes if querying by multiple fields:

```
policies: orgId ASC, status ASC, priority ASC
actionIntents: orgId ASC, createdAt DESC
```

Without indexes, single-field queries work. Composite indexes are needed for `where().where().orderBy()`.

## Architecture Notes

- **SSR/Fastify:** Local dev server on `:3000`. Not deployed to Netlify.
- **Netlify Functions:** Serverless API layer. Each file in `netlify/functions/api/` is an endpoint.
- **Shared Firestore:** Both the Fastify server and Netlify Functions write to the same Firestore.
- **Static frontend:** HTML pages are served directly. No build step.
