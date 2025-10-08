# syntax=docker/dockerfile:1.6

FROM node:20-slim AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production \
    NODE_OPTIONS=--dns-result-order=ipv4first \
    PUPPETEER_SKIP_DOWNLOAD=true

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    python3 \
    git \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
RUN npm run generate

FROM deps AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    curl \
    fonts-noto-core \
    fonts-noto-cjk \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/chromium /usr/bin/chromium-browser

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY package*.json ./

EXPOSE 4000
CMD ["node", "dist/main.js"]
