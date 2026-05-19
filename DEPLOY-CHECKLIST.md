# Deployment Checklist

## Pre-Deploy

- [ ] Run all tests: `npm test`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Run build: `npm run build`
- [ ] Verify all environment variables are set:
  - [ ] `JWT_SECRET` (min 32 chars)
  - [ ] `ENGINE_SECRET`
  - [ ] `DEFAULT_ORG_ID`
  - [ ] `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
  - [ ] `ADMIN_PASSWORD` (or auto-generated)
  - [ ] `RESEND_API_KEY` (optional, for email alerts)
  - [ ] `STRIPE_SECRET_KEY` (optional, for billing)
- [ ] Review `CHANGELOG.md` for breaking changes
- [ ] Update version in `package.json` if needed

## Deploy

- [ ] Run database migrations: `npm run migrate`
- [ ] Run production seeding: `npm run setup:prod`
- [ ] Start server: `npm start`
- [ ] Verify health check: `curl http://localhost:3000/health`
- [ ] Verify diagnostics: `curl http://localhost:3000/diagnostics`
- [ ] Verify WebSocket connections are accepting clients
- [ ] Check logs for startup errors

## Post-Deploy

- [ ] Run smoke tests: `npm run test:smoke`
- [ ] Verify key endpoints respond correctly:
  - [ ] `GET /health`
  - [ ] `GET /metrics`
  - [ ] `GET /diagnostics`
  - [ ] `POST /auth/login`
- [ ] Check monitoring dashboard for anomalies
- [ ] Verify alerts are configured and firing correctly
- [ ] Confirm email notifications are being sent (if configured)
- [ ] Review error logs for any 500s

## Rollback Plan

1. **Stop current deployment**: `kill -SIGTERM <pid>` or stop container
2. **Revert code**: checkout previous git tag or rollback container image
3. **Check database compatibility**: verify migrations are backward-compatible
4. **Restart previous version**: `npm start`
5. **Verify health**: `curl http://localhost:3000/health`
6. **Monitor for 5 minutes**: watch logs and metrics

## Emergency Contacts

- Primary on-call: (configured in PagerDuty/Opsgenie)
- Slack: `#passport-agent-alerts`
- Runbook: `docs/runbook.md`
