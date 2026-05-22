# Security Checklist

## Authentication
- [x] Passwords hashed with PBKDF2 (100k iterations)
- [x] JWT tokens expire (1 hour)
- [ ] Refresh tokens implemented
- [x] Account lockout after 5 failed attempts
- [x] Rate limiting on auth endpoints
- [x] Email verification required

## Authorization
- [x] All endpoints check orgId
- [x] Role-based access control enforced
- [x] No admin bypasses
- [x] API keys scoped to org

## Input Validation
- [x] All inputs validated with Zod
- [x] SQL/NoSQL injection prevented
- [x] XSS prevented
- [x] File upload disabled or heavily restricted

## Output Encoding
- [x] JSON responses properly escaped
- [x] No sensitive data in error messages
- [x] Stack traces hidden in production

## Infrastructure
- [x] HTTPS only (HSTS enabled)
- [x] CORS properly configured
- [x] Security headers (CSP, X-Frame-Options, etc.)
- [x] DDoS protection enabled
- [x] WAF rules active

## Data Protection
- [x] Encryption at rest (Firestore handles this)
- [x] Encryption in transit (TLS 1.3)
- [x] Secrets not in code
- [x] Logs don't contain passwords/tokens
- [ ] Backup encryption
