# Auditoría Nutrial v2

Suite full-stack para gestionar auditorías multi-proyecto con módulos especializados, RBAC por proyecto y exportables ejecutivos.

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

### Docker

```bash
docker-compose up --build
```

## Usuarios demo

| Email | Rol | Contraseña |
| --- | --- | --- |
| admin@nustrial.com | Admin | admin123 |
| consultor@nustrial.com | Consultor Líder | consultor123 |

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
