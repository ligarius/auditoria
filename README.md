# Auditoría

Monorepo full-stack para gestionar auditorías operacionales con una API Node.js + Prisma y un frontend React con Vite. Este documento resume cómo trabajar en desarrollo, cómo ejecutar la pila en producción con Docker y qué validaciones se automatizan en CI.

## Requisitos clave

- **Node.js 20** (usa `.nvmrc` o tu gestor favorito para fijar la versión).
- **npm 9+**.
- **Docker y Docker Compose** para los entornos reproducibles.
- **PostgreSQL 15** cuando trabajes fuera de Docker (el `DATABASE_URL` debe apuntar a esta instancia).

## Arquitectura y puertos

| Servicio | Puerto | Descripción |
| --- | --- | --- |
| PostgreSQL | `5432` | Base de datos principal. |
| API | `4000` | NestJS + Prisma. Ejecuta migraciones versionadas con `prisma migrate deploy` al iniciar en contenedores. |
| Web | `8080` (producción) / `5173` (dev) | SPA construida con Vite. En desarrollo usa `VITE_API_URL=http://localhost:4000`. |

Las migraciones de Prisma viven en `api/prisma/migrations/`. No borres esta carpeta: versiona cualquier cambio de esquema con `prisma migrate dev` y ejecútalo contra tu base de datos local.

## Variables de entorno

Duplica los archivos `.env.example` ubicados en la raíz, `api/` y `web/` para generar tus archivos reales (`.env`, `.env.local`, etc.). Todos los valores incluidos son dummy y seguros para versionar.

Variables imprescindibles en desarrollo:

- `DATABASE_URL`: cadena completa hacia PostgreSQL.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: secretos para la API.
- `VITE_API_URL`: URL absoluta desde la SPA hacia la API (por defecto `http://localhost:4000`).

## Desarrollo local

```bash
# Instala dependencias
npm ci --prefix api
npm ci --prefix web

# Inicia la base de datos y la API (aplica migraciones al arrancar)
docker compose up -d --build db api

# Levanta el frontend en modo desarrollo (http://localhost:5173)
cd web
VITE_API_URL=http://localhost:4000 npm run dev
```

### Comandos útiles de la API

```bash
npm run lint --prefix api          # ESLint
npm run typecheck --prefix api     # TypeScript sin emitir
npm run build --prefix api         # Compilación + bundle
npm run db:dev --prefix api        # Nueva migración y aplicación en dev
npm run db:deploy --prefix api     # Aplica migraciones existentes
npm run db:reset --prefix api      # Resetea la base con migraciones (sin db push)
```

### Comandos útiles de la web

```bash
npm run lint --prefix web
npm run build --prefix web
npm run preview --prefix web
```

## Entorno de producción local

```bash
# Construye e inicia toda la pila (db + api + web estático con Nginx)
docker compose up -d --build

# Logs en vivo
docker compose logs -f api
```

La imagen de la API ejecuta `prisma migrate deploy && node dist/main.js` al iniciarse. La imagen de la web sirve archivos estáticos con Nginx escuchando en `8080`.

## Integración continua

El workflow de GitHub Actions ejecuta en Node.js 20 con una base de datos PostgreSQL efímera. Las validaciones incluyen:

1. `npm ci` en `api/` y `web/`.
2. `npx prisma validate`, `npx prisma generate` y `npx prisma migrate deploy` contra la base efímera.
3. `npm run lint --prefix api`, `npm run typecheck --prefix api`, `npm run build --prefix api`.
4. `npm run lint --prefix web`, `npm run build --prefix web` (con `VITE_API_URL=http://localhost:4000`).

## Troubleshooting

| Problema | Causa probable | Solución |
| --- | --- | --- |
| `prisma migrate deploy` falla en contenedores | Base de datos inaccesible o variable `DATABASE_URL` incorrecta | Revisa credenciales/host y que el servicio `db` esté healthy. |
| La SPA no puede autenticarse | `VITE_API_URL` apunta a otro host/puerto | Ajusta la variable y recompila (o reinicia `npm run dev`). |
| `npm run db:dev` solicita nombre de migración constantemente | Hay cambios de esquema pendientes | Usa `npm run db:dev -- --name <descripcion>` o crea la migración desde Prisma Studio. |
| Assets 404 en producción | Build sin variables correctas o `docker compose` sin reconstruir | Ejecuta `docker compose build web --no-cache` y reinicia el servicio. |
| Seeds no se ejecutan en contenedor | Variable `SEED=0` o script falló | Verifica logs y ejecuta `npm run db:seed --prefix api` manualmente si lo necesitas. |

## Buenas prácticas

- Nunca uses `prisma db push` en este repositorio. Versiona los cambios con migraciones.
- Ejecuta los linters y typechecks antes de abrir un PR.
- Para generar una nueva migración: `npm run db:dev --prefix api -- --name <cambio>`.
- Sincroniza tu versión de Node con `.nvmrc` para evitar inconsistencias.
