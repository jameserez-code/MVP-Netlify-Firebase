## 2025-05-25 - CPU DoS in API Key Verification
**Vulnerability:** Linear PBKDF2 hashing of all active API keys during authentication.
**Learning:** Performing computationally expensive hashing (PBKDF2) in a loop over user-provided input without pre-filtering creates a trivial Denial-of-Service vector.
**Prevention:** Always use a non-sensitive indexed field (like a key prefix or hash of the key) to narrow down candidates in the database before performing expensive cryptographic verifications.
