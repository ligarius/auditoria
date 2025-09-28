# Auditoría

Suite full-stack para gestionar auditorías multi-proyecto con módulos especializados, RBAC por proyecto y exportables ejecutivos.

## Índice

1. [Arquitectura](#arquitectura)
2. [Requisitos](#requisitos)
3. [Configuración local](#configuración-local)
4. [Docker](#docker)
5. [Semilla de datos (Dev)](#semilla-de-datos-dev)
6. [Variables de entorno](#variables-de-entorno)
7. [Módulos clave](#módulos-clave)
8. [Scripts útiles](#scripts-útiles)
9. [OpenAPI](#openapi)
10. [Tests](#tests)
11. [Seeds](#seeds)
12. [Capturas](#capturas)

## Arquitectura

```
/api (Node.js + Express + Prisma)
/web (React + Vite + Tailwind)
```

- **API**: Express + Prisma (PostgreSQL), JWT auth, RBAC por Membership, exportaciones Excel/PDF, audit trail.
- **Web**: React + Vite + Tailwind/shadcn ready para tabs funcionales por módulo.
- **Infra**: Docker Compose con Postgres + API + Web + Superset para BI embebido.

## Requisitos

- Node.js 18+
- Docker (opcional) / Docker Compose

## Configuración local

```bash
docker compose --env-file .env.development up -d --build
# Opcional (solo en entornos de desarrollo):
docker compose exec api npm run seed
```

La API espera a que la base de datos esté disponible y aplica automáticamente `prisma migrate deploy` en cada arranque del contenedor.

Una vez que la base de datos está lista, puedes iniciar los servicios de desarrollo individuales si prefieres trabajar fuera de Docker:

```bash
# API
cd api
cp .env.example .env
npm install
npm run dev

# Web
cd ../web
cp .env.example .env
npm install
npm run dev
```

La API corre en `http://localhost:4000/api` y el front en `http://localhost:5173`.

Para verificar el estado de la API una vez levantada, ejecuta:

```bash
curl http://localhost:4000/api/health
```

## Docker

```bash
docker compose --env-file .env.development up -d --build
```

Superset quedará disponible en `http://localhost:8088` para la administración de dashboards (ejecuta los comandos de bootstrap del contenedor según la documentación oficial antes de crear el dashboard embebido).

## Semilla de datos (Dev)

1. Levanta servicios (usa el archivo `.env.development` o el que definas):
   ```bash
   docker compose --env-file .env.development up -d --build
   ```
2. Ejecuta seed:
   ```bash
   docker compose exec api npm run seed
   ```

Las credenciales que genera el seed están pensadas solo para entornos locales y pueden revisarse en `prisma/seed.ts`. Ajusta o
reemplaza esos datos antes de compartir entornos compartidos.

## Variables de entorno

El repositorio incluye `.env.development` y `.env.production` como punto de partida para ejecutar `docker compose --env-file`. Personaliza los valores antes de desplegar en cualquier entorno real. Además, cada paquete mantiene su propio `.env.example` con los mínimos para entornos fuera de Docker. Los valores más relevantes son:

| Variable | Descripción | Paquete |
| --- | --- | --- |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL utilizada por Prisma. | `api` |
| `JWT_SECRET` | Clave de firma para los tokens JWT. | `api` |
| `SUPERSET_BASE_URL` | URL del servicio Superset accesible desde la API. | `api` |
| `SUPERSET_USERNAME` / `SUPERSET_PASSWORD` | Credenciales de servicio para solicitar guest tokens a Superset. | `api` |
| `SUPERSET_GUEST_USERNAME` | Alias utilizado en Superset para las sesiones embebidas. | `api` |
| `SUPERSET_PORT` | Puerto expuesto del contenedor de Superset (por defecto 8088). | `docker-compose` |
| `VITE_API_URL` | URL base de la API consumida por el front-end. | `web` |
| `VITE_SUPERSET_DASHBOARD_ID` | ID del dashboard en Superset que se mostrará embebido. | `web` |
| `VITE_SUPERSET_DATASET_IDS` | Lista separada por comas de dataset IDs para aplicar filtros RLS automáticos. | `web` |

Cuando trabajes fuera de Docker, copia cada archivo `*.env.example` a `.env` y personalízalo según tu entorno antes de iniciar los servicios.

## Módulos clave

- Datos Pre-Kickoff (Checklist)
- Encuestas (preguntas Likert/abiertas, respuestas públicas)
- Entrevistas (adjuntos de audio)
- Procesos (BPMN/links + sub-módulos dinámicos como Recepción/Picking/Despacho)
- Sistemas (Inventario, Cobertura, Integraciones, Data, Seguridad, Performance, Costos con TCO 3y)
- Riesgos (RAG por severidad)
- Hallazgos & Acciones (RACI, Kanban)
- POC / Pilotos
- Decision Log
- KPIs y dashboard
- Exportables Excel ZIP + PDF ejecutivo
- Audit trail

## Analítica y dashboards

- Se creó el esquema `analytics` con vistas materializadas para acelerar KPIs internos:
  - `analytics.responses_daily`
  - `analytics.findings_by_severity`
  - `analytics.progress_daily`
- Puedes refrescar los datos cuando lo necesites desde PostgreSQL:

  ```sql
  REFRESH MATERIALIZED VIEW analytics.responses_daily;
  REFRESH MATERIALIZED VIEW analytics.findings_by_severity;
  REFRESH MATERIALIZED VIEW analytics.progress_daily;
  ```

- La API expone `POST /api/analytics/superset/guest-token` para generar tokens embebidos filtrados por `companyId` y `projectId`.
- En el front (`/projects/:id` → pestaña **KPIs**) se muestran tarjetas Recharts con avance, aging PBC y severidad de hallazgos más un iframe Superset con guest token. Configura `VITE_SUPERSET_DASHBOARD_ID` y `VITE_SUPERSET_DATASET_IDS` para apuntar al dashboard/datasets que necesites.

## Scripts útiles

En cada paquete puedes apoyar el flujo de desarrollo con los siguientes comandos:

```bash
# API
npm run lint       # Linting de la capa backend
npm run test       # Ejecuta la suite de tests de la API

# Web
npm run lint       # Analiza el front-end con ESLint
npm run test       # Ejecuta pruebas unitarias con Vitest
```

Los scripts comparten nombres entre paquetes para simplificar la experiencia de desarrollo.

## OpenAPI

Consulta `api/openapi.yaml` para la especificación detallada de endpoints.

## Features por proyecto

- Cada proyecto incluye `settings.enabledFeatures` (JSON) para decidir qué sub-tabs de **Procesos** se renderizan.
- Endpoint dedicado: `GET /api/projects/:id/features` → `{ enabled: string[] }`.
- La ruta histórica `/projects/:id/reception` redirige automáticamente a `/projects/:id/procesos/reception`.
- Plantillas sugeridas al crear proyectos desde la UI:
  - **Distribución** → `['reception', 'picking', 'dispatch']`
  - **Simple** → `[]`

## Gestión de empresas

- Endpoints REST autenticados con rol `admin`:
  - `POST /api/companies` crear nueva empresa (name, taxId).
  - `GET /api/companies` listar empresas con conteo de proyectos.
  - `PUT /api/companies/:id` actualizar nombre/RUT.
  - `DELETE /api/companies/:id` elimina si no tiene proyectos asociados.
- Cada proyecto nuevo requiere `companyId` y asigna automáticamente al creador como propietario (`ownerId`).

## Tests

```bash
# API
cd api
npm run test

# Web
cd web
npm run test
```

## Seeds

El seed `npm run seed` (o `docker compose exec api npm run seed`) crea:

- Empresas demo **Nutrial** y **DemoCorp**.
- Usuarios demo de ejemplo (consulta `prisma/seed.ts` para los detalles y reemplaza las credenciales en tus propios entornos).
- Proyecto **Nutrial – Auditoría 2025** con `settings.enabledFeatures = ['reception', 'picking', 'dispatch']` y memberships según roles.

## Capturas

Incluye tabs por módulo en `/projects/:id` para navegar todo el alcance del proyecto.
