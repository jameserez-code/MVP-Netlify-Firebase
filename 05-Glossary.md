# Glossary

- Netlify Identity: Password-based authentication and user management for Netlify-hosted apps.
- Netlify Functions: Serverless functions (AWS Lambda under the hood) for API endpoints.
- Firebase Firestore: NoSQL document database; per-user memory will be modeled as documents under a user’s UID.
- Visa: Reusable authority template containing scopes and constraints.
- Passport: A cryptographically-signed JWT proving agent identity and authorization.
- Wallet: Client-side/brokered issuance surface for verifiable credentials or tokens.
- Gate: Access control surface; Netlify Identity gating protects the frontend surface.
- Activation script: Script that wires Identity invites, Firebase config, and deployment steps into a single flow.
- MVP: Minimum Viable Product; the simplest version that delivers value and can be extended later.
