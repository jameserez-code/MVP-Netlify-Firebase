# Deployment Guide

## One-Shot Deploy

```bash
# 1. Clone and enter repo
git clone https://github.com/jameserez-code/MVP-Netlify-Firebase.git
cd MVP-Netlify-Firebase

# 2. Set Firebase env vars (replace with real values)
export FIREBASE_API_KEY="your_key"
export FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
export FIREBASE_PROJECT_ID="your_project"
export FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
export FIREBASE_MESSAGING_SENDER_ID="your_sender"
export FIREBASE_APP_ID="your_app_id"
export JWT_SECRET="$(openssl rand -hex 32)"

# 3. Deploy to Netlify
npx netlify-cli deploy --prod --build --dir=.

# 4. Verify
curl https://passportagent.netlify.app/api/health
```

## Environment Variables

Set these in Netlify UI: Site settings → Build & deploy → Environment

| Variable | Description |
|---|---|
| `FIREBASE_API_KEY` | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `FIREBASE_APP_ID` | Firebase app ID |
| `JWT_SECRET` | Secret key for passport JWT signing (64+ chars, use `openssl rand -hex 32`) |
| `NODE_ENV` | Set to `production` |

## Firebase Setup Checklist

- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable Authentication → Sign-in method → Email/Password
- [ ] Enable Cloud Firestore in production mode
- [ ] Deploy `firestore.rules` via Firebase Console or CLI
- [ ] Create a test user in Authentication → Users → Add user
- [ ] Add test user email to `ALLOW_LIST` in `index.html` if using client-side allowlist

## Post-Deploy Verification

```bash
# Health check
curl https://passportagent.netlify.app/api/health

# Submit a visa
curl -X POST https://passportagent.netlify.app/api/apply-visa \
  -H "Content-Type: application/json" \
  -d '{"scopes":["api:read","api:write"],"uid":"test123"}'

# Issue a passport
curl -X POST https://passportagent.netlify.app/api/apply-passport \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Demo User","passportNumber":"DEMO001","uid":"test123"}'

# List applications
curl "https://passportagent.netlify.app/api/list-pending?uid=test123"

# Open browser: https://passportagent.netlify.app
# Enter gate code: Thegreatwave
# Sign in with Firebase: your-test-user@email.com
```

## Rollback

```bash
# Netlify keeps deploy history. Go to Netlify UI → Deploys → choose previous deploy → "Publish deploy"
```

## Troubleshooting

| Problem | Solution |
|---|---|
| 404 on /api/* | Check `netlify.toml` redirect rules; functions directory path |
| CORS errors | Ensure API functions include `Access-Control-Allow-Origin: *` headers |
| Firebase auth fails | Verify Firebase config values in Netlify env vars |
| JWT verification fails | Confirm `JWT_SECRET` is set and matches between issue/verify |
| Build fails - "public" not found | Publish dir is `.` (root); ensure `index.html` exists at root |