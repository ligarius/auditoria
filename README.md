# Auditoría

Suite full-stack para gestionar auditorías operacionales multiempresa. El proyecto combina una API Node.js con un frontend React para centralizar el ciclo completo: preparación de checklists, aplicación de encuestas y entrevistas, seguimiento de hallazgos y generación de entregables ejecutivos.

## Tabla de contenidos

1. [Visión general](#visión-general)
2. [Características principales](#características-principales)
3. [Arquitectura](#arquitectura)
4. [Stack tecnológico](#stack-tecnológico)
5. [Estructura del repositorio](#estructura-del-repositorio)
6. [Requisitos previos](#requisitos-previos)
7. [Guía rápida: primera ejecución](#guía-rápida-primera-ejecución)
8. [Configuración local con Docker](#configuración-local-con-docker)
9. [Configuración sin Docker](#configuración-sin-docker)
10. [Variables de entorno](#variables-de-entorno)
11. [Base de datos, migraciones y semillas](#base-de-datos-migraciones-y-semillas)
12. [Scripts útiles](#scripts-útiles)
13. [Testing y calidad](#testing-y-calidad)
14. [Flujo de desarrollo sugerido](#flujo-de-desarrollo-sugerido)
15. [Despliegue](#despliegue)
16. [Resolución de problemas](#resolución-de-problemas)
17. [FAQ](#faq)
18. [Contribuir](#contribuir)
19. [Licencia](#licencia)

## Visión general

Auditoría concentra información previa al kickoff, ejecución de auditorías y seguimiento posterior. Cada proyecto pertenece a una empresa, soporta múltiples módulos activables y mantiene un historial de acciones para garantizar trazabilidad.

El backend expone un API REST con autenticación JWT, permisos basados en memberships por empresa y proyecto, y generación de reportes en Excel/PDF. El frontend consume los endpoints y organiza la experiencia en tabs por módulo para facilitar el trabajo de los equipos de auditoría.

## Características principales

- Gestión simultánea de auditorías para varias empresas o unidades de negocio.
- Checklists, encuestas, entrevistas, procesos y sistemas centralizados.
- Definición de features por proyecto para habilitar módulos específicos (Recepción, Picking, etc.).
- Control de acceso mediante roles por empresa/proyecto y auditoría de eventos críticos.
- Exportables ejecutivos en PDF y Excel comprimido, con plantillas personalizables.
- Tableros de KPIs y matriz de riesgos para visualizar el estado general.
- Integración con colas de trabajo (BullMQ + Redis) para tareas largas como generación de reportes.

## Arquitectura

```
root
├── api/              Backend Express + Prisma
│   ├── src/          Casos de uso, rutas y controladores
│   ├── prisma/       Esquema y seeds (sin migraciones versionadas)
│   └── openapi.yaml  Definición del contrato REST
├── web/              Frontend React (Vite + Tailwind + shadcn/ui)
├── scripts/          Utilidades para Docker y espera de servicios
├── docker-compose.yml
└── docs/             Notas adicionales de implementación
```

- **API**: Servidor Express con Pino para logs, Prisma como ORM y PostgreSQL como base de datos. Maneja autenticación JWT, RBAC por proyecto y exportables generados con ExcelJS/PDFKit.
- **Web**: SPA en React/TypeScript. Usa React Query para datos, Tailwind CSS para estilos y componentes accesibles con shadcn/ui y Radix.
- **Infra**: Docker Compose facilita levantar Postgres, API y Web. Los scripts sincronizan el esquema (`prisma db push` o `baseline.sql`) antes de exponer la API.

## Stack tecnológico

| Capa | Tecnologías clave | Detalles |
| --- | --- | --- |
| Backend | Node.js 18, Express, Prisma, Zod, Pino | API REST, validaciones y observabilidad |
| Frontend | React 18, Vite, TypeScript, Tailwind, shadcn/ui | SPA modular con tabs por módulo de auditoría |
| Base de datos | PostgreSQL 15 | Sincronización de esquema con Prisma (db push/baseline) |
| Jobs & archivos | BullMQ, Redis, ExcelJS, PDFKit, Puppeteer | Procesamiento de reportes y exportables |
| Testing | Jest, Supertest, Vitest, Testing Library | Suites unitarias y de componentes |
| DevOps | Docker, Docker Compose, scripts bash | Orquestación local y automatización de tareas |

## Estructura del repositorio

```
/
├── api/
│   ├── prisma/
│   ├── src/
│   ├── docker-entrypoint.sh
│   └── package.json
├── web/
│   ├── src/
│   ├── public/
│   └── package.json
├── docs/
│   └── razones_fallas_encuestas.md
├── scripts/
│   ├── accept.sh
│   ├── compose.sh
│   └── wait-on.sh
├── docker-compose.yml
├── CODE_OF_CONDUCT.md
└── README.md
```

Consulta el directorio `docs/` para notas puntuales (por ejemplo, análisis de fallas de encuestas).

## Requisitos previos

- Node.js 18 o superior.
- npm 9+ (puedes usar pnpm/yarn si ajustas los comandos).
- Docker + Docker Compose (recomendado para un entorno consistente).
- PostgreSQL 15 si decides ejecutar los servicios fuera de Docker.
- Redis opcional cuando habilites colas BullMQ fuera de Docker.

## Guía rápida: primera ejecución

Sigue estos pasos para levantar toda la suite desde una máquina limpia utilizando Docker Compose.

1. **Clona el repositorio y entra al directorio del proyecto:**
   ```bash
   git clone https://github.com/tu-org/auditoria.git
   cd auditoria
   ```
2. **Configura las variables de entorno base.** Duplica el archivo de ejemplo para que los scripts encuentren un `.env` válido.
   ```bash
   cp .env.development .env
   ```
3. **Instala dependencias de backend y frontend.** Esto habilita comandos como `lint`, `test` y `build` dentro de cada paquete.
   ```bash
   npm install --prefix api
   npm install --prefix web
   ```
4. **Construye y levanta la pila completa.** El wrapper valida la existencia del archivo `.env` y reenvía los parámetros a Docker Compose.
   ```bash
   ./scripts/compose.sh up -d --build
   ```
5. **Ejecuta el flujo de aceptación.** Aplicará migraciones, cargará semillas, verificará la salud de la API y compilará el frontend.
   ```bash
   ./scripts/accept.sh
   ```
6. **Verifica los servicios:** abre `http://localhost:5173` para la SPA y `http://localhost:4000/health` para la API.

> Si necesitas reiniciar desde cero, utiliza el [reinicio limpio](#reinicio-limpio) antes de repetir los pasos anteriores.

## Configuración local con Docker

1. Duplica el archivo de variables por defecto:
   ```bash
   cp .env.development .env
   ```
2. Instala dependencias para backend y frontend (necesario para usar `lint`, `test`, etc.).
   ```bash
   npm install --prefix api
   npm install --prefix web
   ```
3. Levanta toda la pila usando el wrapper que valida la presencia del archivo `.env`:
   ```bash
   ./scripts/compose.sh up -d --build
   ```
4. Ejecuta el smoke test automatizado que espera la salud de la API, sincroniza esquema/seeds y compila el frontend:
   ```bash
   ./scripts/accept.sh
   ```
5. Accede a la web en `http://localhost:5173` y verifica la API en `http://localhost:4000/health`.

### Reinicio limpio

Cuando necesites limpiar el estado (por ejemplo, repetir seeds):

```bash
./scripts/compose.sh down -v
./scripts/compose.sh up -d db
./scripts/compose.sh up -d api
./scripts/compose.sh exec api npx prisma db push
./scripts/compose.sh exec api npm run seed
./scripts/compose.sh up -d web
```

Ajusta la variable `ENV_FILE` si trabajas con un archivo distinto de `.env`.

### Redes con proxy corporativo

Si tu red obliga a salir mediante proxy, configura estas variables antes de construir las imágenes:

```bash
export NPM_CONFIG_PROXY=http://usuario:password@proxy:8080
export NPM_CONFIG_HTTPS_PROXY=http://usuario:password@proxy:8080
# export NPM_CONFIG_REGISTRY=https://registry.empresa.com/
```

El Dockerfile propagará los valores y ejecutará `npm config set` para evitar errores `ECONNRESET` durante `npm ci`.

## Configuración sin Docker

Puedes ejecutar cada servicio directamente en tu máquina:

### Backend

```bash
cd api
cp .env.example .env
npm install
npm run dev
```

La API queda disponible en `http://localhost:4000`.

### Frontend

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

El frontend quedará en `http://localhost:5173`. Recuerda ajustar `VITE_API_URL` para apuntar a tu servidor API.

## Variables de entorno

- `.env.development` y `.env.production` contienen valores base para ejecutar Docker Compose con `--env-file`.
- Cada paquete posee su propio `.env.example` con los campos necesarios para ejecución independiente.

| Variable | Ubicación | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | API | Cadena de conexión PostgreSQL utilizada por Prisma. |
| `JWT_SECRET` | API | Llave para firmar tokens JWT. |
| `PORT` | API | Puerto expuesto por el servidor Express (por defecto 4000). |
| `REDIS_URL` | API | Endpoint para colas BullMQ (opcional en desarrollo). |
| `VITE_API_URL` | Web | URL base del backend consumido por el frontend. |
| `NPM_CONFIG_PROXY`, `NPM_CONFIG_HTTPS_PROXY` | scripts | Configuración opcional para builds detrás de proxy. |

## Base de datos y esquema (sin migraciones)

Este proyecto **no aplica Prisma Migrations en runtime**. En su lugar, usamos uno de estos enfoques:

- **Enfoque simple (DEV):** `prisma db push` al inicio (sin historial de migraciones).
- **Enfoque reproducible (PROD/CI):** `baseline.sql` con DDL inicial idempotente. El `docker-entrypoint.sh` aplica `baseline.sql` una sola vez y marca la aplicación en la tabla `__baseline_applied`.

### Primer arranque (desarrollo)

```bash
cp .env.development .env
npm install --prefix api
npm install --prefix web
./scripts/compose.sh up -d --build

# Sincroniza esquema (si no lo hace el entrypoint):
docker compose exec api npx prisma db push

# Seeds (opcionales)
docker compose exec api npm run seed
```

### Reset rápido (desarrollo)

Esto borra datos y resuelve casos como el error P3009:

```bash
./scripts/compose.sh down -v
rm -rf api/prisma/migrations    # no versionamos migraciones
./scripts/compose.sh up -d --build
docker compose exec api npx prisma db push
docker compose exec api npm run seed
```

Nota: Si optas por baseline.sql, genera el archivo una vez con `pg_dump --schema-only` desde una DB inicial creada por db push. Luego cambia el entrypoint a la Opción B (SQL baseline).

## Scripts útiles

| Comando | Ubicación | Descripción |
| --- | --- | --- |
| `npm run dev` | `api/` | Servidor Express con recarga en caliente. |
| `npm run build` | `api/` | Genera bundle CJS en `dist/main.cjs`. |
| `npm run start` | `api/` | Arranca el bundle compilado. |
| `npm run lint` | `api/`, `web/` | Ejecuta ESLint sobre el código fuente. |
| `npm run test` | `api/` | Corre Jest con cobertura. |
| `npm run test:e2e` | `api/` | Corre pruebas E2E con Jest + Supertest. |
| `npm run seed` | `api/` | Ejecuta `prisma/seed.ts`. |
| `npm run dev` | `web/` | Arranca Vite en modo desarrollo. |
| `npm run build` | `web/` | Construye assets listos para producción. |
| `npm run preview` | `web/` | Sirve el build generado por Vite. |
| `npm run test` | `web/` | Ejecuta Vitest y Testing Library. |
| `./scripts/compose.sh` | raíz | Wrapper de Docker Compose que valida variables de entorno. |
| `./scripts/accept.sh` | raíz | Sincroniza esquema (db push), ejecuta seeds opcionales, espera salud y compila frontend. |

## Testing y calidad

- **Backend**: `npm run lint --prefix api`, `npm run test --prefix api` y `npm run test:e2e --prefix api`.
- **Frontend**: `npm run lint --prefix web` y `npm run test --prefix web`.
- **Formato**: ambos paquetes incluyen `npm run format` para aplicar Prettier.

Integra estos comandos en pipelines CI/CD para garantizar calidad antes de fusionar cambios.

## Flujo de desarrollo sugerido

1. Crea una rama a partir de `main`.
2. Levanta el entorno (`./scripts/compose.sh up -d --build`).
3. Realiza cambios en API o Web según corresponda.
4. Ejecuta lint y tests de los paquetes tocados.
5. Actualiza documentación o schemas (OpenAPI en `api/openapi.yaml`) cuando cambien los endpoints.
6. Genera commits claros y abre un Pull Request describiendo impacto, pasos de prueba y capturas si aplica.

## Despliegue

1. Construye imágenes usando los Dockerfiles de `api/` y `web/` o reutiliza `docker-compose.yml` como base.
2. Sincroniza el esquema con `npm run schema:push --prefix api` (o aplica `baseline.sql`) antes de arrancar la API en producción.
3. Define variables de entorno seguras (`DATABASE_URL`, `JWT_SECRET`, `VITE_API_URL`, etc.).
4. Expón los servicios detrás de un reverse proxy (Nginx, Traefik) con HTTPS.
5. Automatiza pipelines que ejecuten lint, tests y builds antes de publicar.
6. Monitorea métricas con `prom-client` y logs con Pino.

## Resolución de problemas

| Síntoma | Causa probable | Acción sugerida |
| --- | --- | --- |
| La API no arranca | Postgres inaccesible o sin migraciones | Verifica `DATABASE_URL` y ejecuta `prisma db push`. |
| Error `JWT_SECRET missing` | Variable ausente | Define `JWT_SECRET` en `.env` o en secretos del entorno. |
| Login redirige al inicio de sesión constantemente | Token expirado o refresh inválido | Cierra sesión para limpiar tokens y vuelve a iniciar. |
| `compose.sh` reclama archivo `.env` | No se generó `.env`/`.env.local` | Duplica `.env.development` antes de levantar servicios. |
| Builds fallan con `ECONNRESET` | Proxy o conexión inestable | Configura variables de proxy o reintenta cuando la red sea estable. |
| Endpoint `/api/projects/:id/surveys` responde 404 | Esquema desactualizado | Ejecuta `prisma db push` y `npm run seed`. |
| Datos inconsistentes tras pruebas | Seeds previos dejaron registros | Ejecuta el [reinicio limpio](#reinicio-limpio). |

## FAQ

**¿Puedo usar otra base de datos?**  Actualmente solo se soporta PostgreSQL. Cambiar de proveedor implica ajustar Prisma y revisar migraciones.

**¿Existe modo de solo lectura?**  Crea roles personalizados sin permisos de escritura y asígnalos mediante memberships.

**¿Cómo personalizo los exportables?**  Duplica y ajusta los generadores en la API (ver carpeta `api/src/modules/export`). Puedes modificar plantillas de Excel/PDF o agregar nuevas salidas.

**¿Dónde encuentro documentación adicional?**  Revisa `docs/` para notas específicas y `api/openapi.yaml` para el contrato REST.

## Contribuir

1. Haz fork del repositorio y crea una rama descriptiva.
2. Sigue las convenciones de estilo existentes y actualiza tests/documentación relacionados.
3. Ejecuta lint y tests antes de abrir el PR.
4. Describe claramente el impacto, incluye capturas si afectan al frontend e indica pasos de validación.

Se aceptan issues para proponer mejoras, reportar bugs o sugerir documentación adicional.

## Licencia

El proyecto no cuenta con una licencia pública definida. Contacta a la mantención si deseas usar el código en un contexto comercial.
