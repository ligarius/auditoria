# syntax=docker/dockerfile:1.6

FROM node:20-slim AS base
WORKDIR /usr/src/app

ARG NPM_CONFIG_PROXY=""
ARG NPM_CONFIG_HTTPS_PROXY=""
ARG NPM_CONFIG_REGISTRY=""
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY=""

ENV PUPPETEER_SKIP_DOWNLOAD=true \
  NODE_OPTIONS=--dns-result-order=ipv4first \
  NPM_CONFIG_FETCH_RETRIES=5 \
  NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=10000 \
  NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=60000

# --- deps ---
FROM base AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl ca-certificates python3 git build-essential \
  libcairo2-dev libpango1.0-dev \
  libjpeg-dev libgif-dev librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

RUN set -eux; \
  if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi; \
  if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi; \
  if [ -n "$NO_PROXY" ]; then npm config set noproxy "$NO_PROXY"; fi; \
  if [ -n "$NPM_CONFIG_PROXY" ]; then npm config set proxy "$NPM_CONFIG_PROXY"; fi; \
  if [ -n "$NPM_CONFIG_HTTPS_PROXY" ]; then npm config set https-proxy "$NPM_CONFIG_HTTPS_PROXY"; fi; \
  if [ -n "$NPM_CONFIG_REGISTRY" ]; then npm config set registry "$NPM_CONFIG_REGISTRY"; fi; \
  npm config set fetch-retries "$NPM_CONFIG_FETCH_RETRIES"; \
  npm config set fetch-retry-mintimeout "$NPM_CONFIG_FETCH_RETRY_MINTIMEOUT"; \
  npm config set fetch-retry-maxtimeout "$NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT"

RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

RUN npm run generate

# --- build ---
FROM deps AS build

COPY . .
RUN npm run build
RUN mkdir -p dist/templates && cp -R src/templates/*.hbs dist/templates/
RUN npm prune --omit=dev

# --- runner ---
FROM base AS runner

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=deps /usr/src/app/prisma ./prisma
# Crear alias para templates en ruta estable usada por el runtime
RUN mkdir -p /usr/src/dist && \
    ln -s /usr/src/app/dist/templates /usr/src/dist/templates
COPY package*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
CMD ["./docker-entrypoint.sh"]

