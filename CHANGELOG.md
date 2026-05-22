# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2024-05-21

### Added
- **Demo Scenarios**: Pre-built realistic demo data for Customer Support, Data Analyst, and E-commerce use cases (`demo/scenarios/`)
- **Example Integrations**: Runnable example scripts for OpenAI, Anthropic, LangChain, and custom Node.js agents (`examples/`)
- **Quickstart Templates**: `.passport-agent.json` config template, `docker-compose.quickstart.yml`, and `env.quickstart` for instant local setup (`templates/`)
- **Seed Script Enhancements** (`scripts/seed-demo.ts`):
  - `--scenario=customer-support|data-analyst|ecommerce` for pre-built scenarios
  - `--days=30` for generating backdated audit data
  - `--orgs=5` for multi-organization seeding
  - `--volume=high` for generating 10K+ enforcement logs (load testing)
  - `--output=file.json` for exporting generated data
  - Colorized progress bar for long-running seeds
- **API Playground** (`frontend/app/playground/page.tsx`): In-dashboard API testing console with method dropdown, URL input, headers editor, JSON body editor with syntax validation, response viewer with syntax highlighting, request history (last 10), and save-as-snippet functionality
- **Integration Guides** (`content/docs/integrations/`):
  - `openai.md` — Step-by-step OpenAI integration with function calling
  - `anthropic.md` — Claude tool-use integration
  - `langchain.md` — LangChain agent wrapping
  - `crewai.md` — Multi-agent crew enforcement
  - `custom.md` — Generic REST API integration for any language (Node, Python, Go, Rust examples)

### Changed
- Improved CONTRIBUTING.md with architecture overview, local dev setup, testing guide, PR guidelines, and code style guide
- Upgraded seed script to support multi-org, multi-day, and high-volume scenarios

## [2.1.0] - 2024-05-19

### Added
- Interactive demo mode (/demo) — try enforcement without signup
- Onboarding wizard — 5-step guided setup for new users
- Webhook system — Slack/Discord/generic HTTP notifications
- API key management — separate from JWT for SDK auth
- Analytics dashboard — Recharts visualizations with trends
- Real-time activity feed — live audit events with SWR
- SWR data fetching — caching, deduping, background refetching
- Sentry error tracking — production error monitoring
- Accessibility improvements — WCAG AA focus management, ARIA labels
- Mobile polish — touch targets, swipe gestures, viewport fixes
- Enhanced landing page — testimonials, pricing, FAQ, code snippets
- SDK npm package (@passport-agent/sdk v1.0.0-beta.1)
- CLI tool (passport-agent) with init, create, enforce, audit commands
- Zod input validation for all endpoints
- Pagination for all list endpoints
- Request/response logging with correlation IDs
- API response caching (30s/60s/120s TTL)
- Enhanced health check with Firebase connectivity
- Redis-based distributed rate limiting
- Comprehensive test suite (unit, integration, e2e, load)
- GitHub Actions CI/CD (test, build, deploy)
- ESLint, Prettier, Husky pre-commit hooks
- Dependabot configuration
- Issue and PR templates

### Security
- Removed all hardcoded passwords ('admin' defaults)
- Replaced custom timingSafeEqual with native crypto.timingSafeEqual
- Removed JWT_SECRET and ENGINE_SECRET fallbacks
- Added startup env validation
- API keys use PBKDF2 hashing
- Webhook secrets encrypted with AES-256-GCM
- Production CORS with ALLOWED_ORIGINS
- Content Security Policy headers

### Changed
- Upgraded to Node.js 20
- Multi-stage Docker build
- Static export for frontend deployment
- Comprehensive README rewrite

### Fixed
- Server binding from localhost to 0.0.0.0 for Render deployment
- 30 unit tests (crypto + evaluator)

## [2.0.0] - 2024-05-18

### Added
- Fastify backend with 18 endpoints
- Firebase/Firestore persistence
- Policy engine with tool/domain/PII/cost enforcement
- Agent registration and revocation
- Task/run execution system
- Immutable audit logging
- JWT authentication
- SDK for OpenAI integration
- HTML admin pages (operator, agents, dev dashboard)
