# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
ENV NODE_ENV=production
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist ./
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
