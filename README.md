# Auditoría

Suite full-stack para gestionar auditorías multi-proyecto con módulos especializados, RBAC por proyecto y exportables ejecutivos.

## Índice

1. [Arquitectura](#arquitectura)
2. [Requisitos](#requisitos)
3. [Configuración local](#configuración-local)
4. [Docker](#docker)
5. [Semilla de datos (Dev)](#semilla-de-datos-dev)
6. [Variables de entorno](#variables-de-entorno)
7. [Usuarios demo](#usuarios-demo)
8. [Módulos clave](#módulos-clave)
9. [Scripts útiles](#scripts-útiles)
10. [OpenAPI](#openapi)
11. [Tests](#tests)
12. [Seeds](#seeds)
13. [Capturas](#capturas)

## Arquitectura

```
/api (Node.js + Express + Prisma)
/web (React + Vite + Tailwind)
```

- **API**: Express + Prisma (PostgreSQL), JWT auth, RBAC por Membership, exportaciones Excel/PDF, audit trail.
- **Web**: React + Vite + Tailwind/shadcn ready para tabs funcionales por módulo.
- **Infra**: Docker Compose con Postgres + API + Web.

## Requisitos

- Node.js 18+
- Docker (opcional) / Docker Compose

## Configuración local

```bash
docker compose up -d --build
docker compose exec api npm run migrate:deploy
docker compose exec api npm run seed
```

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
docker compose up -d --build
```

## Semilla de datos (Dev)

1. Levanta servicios:
   ```bash
   docker compose up -d --build
   ```
2. Aplica migraciones:
   ```bash
   docker compose exec api npm run migrate:deploy
   ```
3. Ejecuta seed:
   ```bash
   docker compose exec api npm run seed
   ```

Usuarios por defecto:

admin@demo.com / Cambiar123!
consultor@demo.com / Cambiar123!
cliente@demo.com / Cambiar123!

## Variables de entorno

Cada paquete incluye un archivo `.env.example` con los valores mínimos para iniciar el proyecto. Los más relevantes son:

| Variable | Descripción | Paquete |
| --- | --- | --- |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL utilizada por Prisma. | `api` |
| `JWT_SECRET` | Clave de firma para los tokens JWT. | `api` |
| `VITE_API_URL` | URL base de la API consumida por el front-end. | `web` |

Recuerda copiar cada archivo `*.env.example` a `.env` y personalizarlo según tu entorno antes de iniciar los servicios.

## Usuarios demo

| Email | Rol | Contraseña |
| --- | --- | --- |
| admin@demo.com | Admin | Cambiar123! |
| consultor@demo.com | Consultor | Cambiar123! |
| cliente@demo.com | Cliente | Cambiar123! |

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
- Usuarios `admin@demo.com`, `consultor@demo.com` y `cliente@demo.com` con contraseña `Cambiar123!`.
- Proyecto **Nutrial – Auditoría 2025** con `settings.enabledFeatures = ['reception', 'picking', 'dispatch']` y memberships según roles.

## Capturas

Incluye tabs por módulo en `/projects/:id` para navegar todo el alcance del proyecto.
