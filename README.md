# Passport Agent MVP

YC-ready passport and visa issuance platform. Serverless backend on Netlify Functions with Firebase Firestore for per-user data isolation.

## Architecture

```
index.html          → Gate UI + Visa/Passport forms (client-side)
admin-portal.html   → Admin dashboard with live stats
netlify/functions/
  api/
    health.js       → Health check endpoint
    apply-visa.js   → Visa application processing
    apply-passport.js → Passport issuance with JWT signing
    list-pending.js → List applications with pagination
src/
  config/
    firebase.config.js  → Firebase initialization config
  lib/firebase/
    client.js           → Firebase client wrapper
  models/
    Application.js      → Application data model
  services/
    passport-service.js → JWT signing and verification
  utils/
    validation.js       → Input validation and sanitization
  middleware/
    auth-middleware.js  → Auth, rate limiting, CORS
firestore.rules     → Per-user security rules
netlify.toml        → Netlify deploy configuration
```

## Quick Start

### Prerequisites
- Netlify account with CLI: `npm install -g netlify-cli`
- Firebase project with Firestore and Authentication (email/password) enabled
- Node.js 18+

### 1. Set up Firebase
```bash
# Create a Firebase project at https://console.firebase.google.com
# Enable Authentication → Email/Password
# Enable Cloud Firestore

# Get your config values from Project Settings → Web App
# Set these as Netlify environment variables:
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
JWT_SECRET=your_strong_random_secret
```

### 2. Deploy
```bash
git clone https://github.com/jameserez-code/MVP-Netlify-Firebase.git
cd MVP-Netlify-Firebase
netlify login
netlify init
# Set environment variables in Netlify UI or via CLI:
# netlify env:set FIREBASE_API_KEY your_value
netlify deploy --prod
```

### 3. Verify
```bash
curl https://your-site.netlify.app/api/health
# → {"status":"ok","timestamp":"...","version":"1.0.0"}
```

### 4. Deploy Firestore rules
```bash
# Copy firestore.rules content into Firebase Console → Firestore → Rules
# Or use Firebase CLI:
firebase deploy --only firestore:rules
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check and service status |
| `/api/apply-visa` | POST | Submit visa application |
| `/api/apply-passport` | POST | Issue passport with JWT |
| `/api/list-pending` | GET | List applications (with pagination) |

### POST /api/apply-visa
```json
{
  "scopes": ["api:read", "api:write"],
  "uid": "user_id"
}
```

### POST /api/apply-passport
```json
{
  "fullName": "James Sterling",
  "passportNumber": "PS789012",
  "uid": "user_id"
}
```

### GET /api/list-pending?uid=user_id&status=pending&page=1&limit=20

## Security

- **Firestore rules**: Enforce per-user isolation — users can only read/write their own documents
- **Input validation**: Both client-side (validation.js) and server-side (API functions)
- **Rate limiting**: Configurable per-endpoint rate limiting via auth-middleware
- **Security headers**: X-Frame-Options, Content-Type-Options, Referrer-Policy set in netlify.toml
- **JWT signing**: Passports signed with HS256 using environment-managed secrets

## Testing

```bash
# Run API tests (from functions directory)
cd netlify/functions
npm test

# Manual endpoint testing
curl -X POST https://your-site.netlify.app/api/apply-visa \
  -H "Content-Type: application/json" \
  -d '{"scopes":["api:read"],"uid":"test123"}'

curl -X POST https://your-site.netlify.app/api/apply-passport \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","passportNumber":"TS000001","uid":"test123"}'
```

## YC Demo Flow

1. Open site → Gate screen (enter "Thegreatwave")
2. Sign in with Firebase Auth (email/password)
3. Apply for Visa: select scope chips → Submit
4. Issue Passport: enter name + passport number → Issue
5. View pending applications in real-time list
6. Admin portal: see aggregate stats and all applications

## Production Roadmap

- [ ] Replace mock data in list-pending with real Firestore queries
- [ ] Add Firebase Admin SDK to functions for server-side auth verification
- [ ] Migrate secrets to a secure vault (not env vars) for JWT signing
- [ ] Add Playwright/Cypress end-to-end tests
- [ ] Implement proper logging (structured JSON, correlation IDs)
- [ ] Add monitoring and alerting
- [ ] Scale Firestore with composite indexes for query patterns
- [ ] Add multi-tenancy support for organizational passport management