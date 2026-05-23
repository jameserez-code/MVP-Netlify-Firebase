# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml tsconfig.json ./
RUN corepack enable && pnpm install --no-frozen-lockfile

COPY src/ ./src/
COPY public/ ./public/
COPY sdk/ ./sdk/
COPY *.html ./

RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl
RUN corepack enable

COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY public/ ./public/
COPY sdk/ ./sdk/
COPY *.html ./

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["pnpm", "start"]
