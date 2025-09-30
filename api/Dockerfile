# --- deps ---
FROM node:18-bullseye-slim AS deps
WORKDIR /usr/src/app

ARG NPM_CONFIG_PROXY=""
ARG NPM_CONFIG_HTTPS_PROXY=""
ARG NPM_CONFIG_REGISTRY=""
# utilidades que prisma suele requerir
RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl ca-certificates python3 git build-essential \
  libcairo2-dev libpango1.0-dev \
  libjpeg-dev libgif-dev librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN set -eux; \
  if [ -n "$NPM_CONFIG_PROXY" ]; then npm config set proxy "$NPM_CONFIG_PROXY"; fi; \
  if [ -n "$NPM_CONFIG_HTTPS_PROXY" ]; then npm config set https-proxy "$NPM_CONFIG_HTTPS_PROXY"; fi; \
  if [ -n "$NPM_CONFIG_REGISTRY" ]; then npm config set registry "$NPM_CONFIG_REGISTRY"; fi; \
  npm ci

RUN npm run generate

# --- build ---
FROM node:18-bullseye-slim AS build
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner ---
FROM node:18-bullseye-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
# Solo lo necesario para correr
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY prisma ./prisma
COPY package*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
EXPOSE 4000
CMD ["./docker-entrypoint.sh"]

