# Auditoría Nutrial v2

Suite full-stack para gestionar auditorías multi-proyecto con módulos especializados, RBAC por proyecto y exportables ejecutivos.

## Índice

1. [Arquitectura](#arquitectura)
2. [Requisitos](#requisitos)
3. [Configuración local](#configuración-local)
4. [Docker](#docker)
5. [Variables de entorno](#variables-de-entorno)
6. [Usuarios demo](#usuarios-demo)
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
- **Infra**: Docker Compose con Postgres + API + Web.

## Requisitos

- Node.js 18+
- Docker (opcional) / Docker Compose

## Configuración local

```bash
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

En otra terminal:

```bash
cd web
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
docker-compose up --build
```

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
| admin@nustrial.com | Admin | admin123 |
| consultor@nustrial.com | Consultor | consultor123 |

## Módulos clave

- Datos Pre-Kickoff (Checklist)
- Encuestas (preguntas Likert/abiertas, respuestas públicas)
- Entrevistas (adjuntos de audio)
- Procesos (BPMN/links)
- Sistemas (Inventario, Cobertura, Integraciones, Data, Seguridad, Performance, Costos con TCO 3y)
- Recepción de camiones (dwell/unload/idle + métricas)
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

## Tests

```bash
cd api
npm run test
```

## Seeds

Ejecuta `npm run seed` en `api` para poblar la base con el escenario Nutrial 2025.

## Capturas

Incluye tabs por módulo en `/projects/:id` para navegar todo el alcance del proyecto.
