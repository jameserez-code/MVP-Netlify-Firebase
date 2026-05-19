# Contributing to Passport Agent

Thank you for your interest in contributing! This document outlines the process for contributing to this project.

## Development Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- Git

### Backend Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure variables
4. Run tests: `npm test`
5. Start development server: `npm run dev`

### Frontend Setup

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run type check: `npm run type-check`
4. Run lint: `npm run lint`
5. Start development server: `npm run dev`

## Branch Naming Conventions

Use the following prefixes for branch names:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `style/` - Code style changes (formatting, no logic change)
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

Examples:

```
feat/oauth-login
fix/firebase-connection-timeout
docs/api-authentication
```

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding or correcting tests
- `chore:` Changes to the build process or auxiliary tools

### Examples

```
feat(auth): add JWT token refresh
fix(api): handle null response from Firebase
docs(readme): update installation instructions
```

## Code Review Process

1. Create a feature branch from `main`
2. Make your changes following our style guidelines
3. Ensure all tests pass locally
4. Run linting and formatting: `npm run lint:fix && npm run format`
5. Commit your changes using conventional commits
6. Push your branch and open a Pull Request
7. Fill out the Pull Request template completely
8. Request review from at least one maintainer
9. Address review feedback promptly
10. Once approved, your PR will be merged by a maintainer

## Testing Requirements

### Unit Tests

- All new utilities and business logic must have unit tests
- Run with: `npm test`

### Integration Tests

- Integration tests require Firebase credentials
- Run with: `npm run test:integration`
- Tests are skipped in CI if Firebase credentials are not available

### Frontend Tests

- Ensure type safety: `cd frontend && npm run type-check`
- Ensure lint passes: `cd frontend && npm run lint`
- Ensure build succeeds: `cd frontend && npm run build`

### Security Tests

- Run with: `npm run test:security`

## Code Style

We use ESLint and Prettier to enforce code style. Pre-commit hooks will automatically format and lint your code.

- Lint backend: `npm run lint`
- Lint frontend: `cd frontend && npm run lint`
- Format all: `npm run format`

## Questions?

If you have questions, feel free to open an issue or reach out to the maintainers.
