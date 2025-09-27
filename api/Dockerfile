# --- deps ---
FROM node:18-bullseye-slim AS deps
WORKDIR /usr/src/app
# utilidades que prisma suele requerir
RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl ca-certificates python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# --- build ---
FROM deps AS build
WORKDIR /usr/src/app
COPY . .
# Build del server (usando esbuild como dejaste)
RUN npm run build
# Transpila el seed TS a JS para runtime (evita ts-node en producción)
RUN npx esbuild prisma/seed.ts --platform=node --bundle --format=cjs --outfile=dist/seed.cjs

# --- runner ---
FROM node:18-bullseye-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
# Solo lo necesario para correr
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/package*.json ./
EXPOSE 4000
CMD ["node", "dist/server.cjs"]

