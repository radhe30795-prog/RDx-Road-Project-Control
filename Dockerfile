# ---- Build stage: install deps, build client (vite) + server (esbuild) ----
FROM node:22 AS build

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Install dependencies first (better layer caching).
# NOTE: pnpm-lock.yaml is intentionally not copied - it is too large to push
# via the GitHub API from this environment, so the image resolves fresh.
COPY package.json ./
COPY patches ./patches
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY . .

# Vite build-time variables (baked into the client bundle).
# Passed as --build-arg from docker compose (values come from .env).
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET

RUN pnpm build

# Bundle the one-shot DB migration runner (dist/migrate.js)
RUN pnpm exec esbuild server/migrate.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/migrate.js

# ---- Runtime stage: slim image with prod deps + dist output ----
FROM node:22-slim AS runtime

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY patches ./patches
RUN pnpm install --prod --no-frozen-lockfile

# Server bundle (dist/index.js) + migration runner (dist/migrate.js) + built client (dist/public)
COPY --from=build /app/dist ./dist
# Drizzle migration files, read at boot by dist/migrate.js
COPY drizzle ./drizzle
# Container entrypoint: writes /config.js, runs migrations, starts server
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
ENV PORT=3000
CMD ["./entrypoint.sh"]
