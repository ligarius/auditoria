FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
# Si usas variables Vite, asegúrate de tenerlas como VITE_*
# Ej: VITE_API_URL se puede pasar por --build-arg o .env.production
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
# Sirve el build de Vite (estático)
CMD ["serve", "-s", "dist", "-l", "5173"]
