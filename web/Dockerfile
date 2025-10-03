# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps
WORKDIR /app

ARG NPM_CONFIG_PROXY=""
ARG NPM_CONFIG_HTTPS_PROXY=""
ARG NPM_CONFIG_REGISTRY=""

COPY package*.json ./
RUN set -eux; \
  if [ -n "$NPM_CONFIG_PROXY" ]; then npm config set proxy "$NPM_CONFIG_PROXY"; fi; \
  if [ -n "$NPM_CONFIG_HTTPS_PROXY" ]; then npm config set https-proxy "$NPM_CONFIG_HTTPS_PROXY"; fi; \
  if [ -n "$NPM_CONFIG_REGISTRY" ]; then npm config set registry "$NPM_CONFIG_REGISTRY"; fi; \
  npm config set fetch-retries 5; \
  npm config set fetch-retry-mintimeout 10000; \
  npm config set fetch-retry-maxtimeout 60000

RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
