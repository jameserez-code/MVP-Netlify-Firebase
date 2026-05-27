## 2025-05-27 - [Auth Timing & API DoS Mitigation]
**Vulnerability:** User enumeration via login timing attacks and potential CPU DoS in API key verification.
**Learning:** PBKDF2 is intentionally slow, making it a vector for timing attacks (identifying existing users) and CPU DoS (forcing the server to hash many keys).
**Prevention:** Use dummy verifications for missing users to equalize timing. For API keys, use a non-sensitive prefix to filter candidates in the database before performing expensive cryptographic verifications.
