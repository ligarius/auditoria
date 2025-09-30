# Auditoría

Suite full-stack para gestionar auditorías multi-proyecto con módulos especializados, RBAC por proyecto y exportables ejecutivos.

## Índice

1. [Visión general](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Stack tecnológico](#stack-tecnológico)
4. [Estructura del repositorio](#estructura-del-repositorio)
5. [Requisitos](#requisitos)
6. [Primeros pasos](#primeros-pasos)
7. [Configuración sin Docker](#configuración-sin-docker)
8. [Variables de entorno](#variables-de-entorno)
9. [Módulos clave](#módulos-clave)
10. [Gestión de proyectos y empresas](#gestión-de-proyectos-y-empresas)
11. [Scripts útiles](#scripts-útiles)
12. [Semilla de datos](#semilla-de-datos)
13. [OpenAPI y clientes](#openapi-y-clientes)
14. [Tests y calidad](#tests-y-calidad)
15. [Despliegue](#despliegue)
16. [Resolución de problemas](#resolución-de-problemas)
17. [FAQ](#faq)
18. [Contribuir](#contribuir)
19. [Licencia](#licencia)

## Visión general

Auditoría centraliza el proceso completo de auditorías operacionales, desde la recopilación de información previa al kickoff hasta el seguimiento de hallazgos y planes de acción. La plataforma permite operar múltiples proyectos en paralelo, con permisos granulares por rol y por empresa, además de generar reportes ejecutivos en Excel y PDF.

### Casos de uso destacados

- Levantar auditorías simultáneas para distintas empresas o unidades de negocio.
- Gestionar checklists, encuestas, entrevistas, procesos y KPIs desde un único lugar.
- Controlar accesos por proyecto mediante RBAC y auditoría de eventos críticos.
- Exportar información resumida o detalle para compartir con stakeholders externos.

## Arquitectura

```
/api (Node.js + Express + Prisma)
/web (React + Vite + Tailwind)
/docker-compose.yml (orquestación de servicios)
```

- **API**: Servidor Express con Prisma apuntando a PostgreSQL. Implementa autenticación JWT, control de acceso por memberships, eventos de auditoría y exportaciones en Excel/PDF.
- **Web**: Cliente React (Vite + TypeScript + Tailwind/shadcn) que consume la API y organiza la navegación en tabs por módulo.
- **Infra**: Docker Compose levanta Postgres, API y Web, encargándose de correr `prisma migrate deploy` al iniciar.

## Stack tecnológico

| Capa | Tecnología | Descripción |
| --- | --- | --- |
| Backend | Node.js 18, Express, Prisma, Zod | API REST, capa de persistencia y validaciones |
| Base de datos | PostgreSQL 15 | Almacenamiento relacional con migraciones gestionadas por Prisma |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui | SPA modular enfocada en productividad |
| DevOps | Docker, Docker Compose | Orquestación local y base para despliegues |
| Testing | Jest/Vitest, Testing Library | Pruebas unitarias y de componentes |

## Estructura del repositorio

```
/
├── api/               # Código fuente del backend
│   ├── prisma/        # Esquema, migraciones y seeds
│   ├── src/           # Aplicación Express y casos de uso
│   └── package.json   # Scripts y dependencias
├── web/               # Aplicación React
│   ├── src/           # Componentes, páginas y hooks
│   ├── public/        # Activos estáticos
│   └── package.json
├── docker-compose.yml # Servicios y redes locales
└── README.md
```

## Requisitos

- Node.js 18+
- npm 9+ (o pnpm/yarn equivalentes)
- Docker y Docker Compose (opcional pero recomendado)
- PostgreSQL local (solo si decides no usar Docker)

## Primeros pasos

1. Clona el repositorio.
2. Copia el archivo de variables de entorno:
   ```bash
   cp .env.development .env.local
   ```
3. Levanta los servicios con Docker:
   ```bash
   docker compose --env-file .env.local up -d --build
   ```
4. (Opcional) Carga la semilla de datos inicial:
   ```bash
   docker compose exec api npm run seed
   ```
5. Accede a la web en `http://localhost:5173` y valida la salud de la API con:
   ```bash
   curl http://localhost:4000/api/health
   ```

La API esperará a que la base de datos esté disponible y aplicará `prisma migrate deploy` automáticamente en cada arranque del contenedor.

## Configuración sin Docker

Si prefieres correr los servicios de manera independiente:

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

- API: `http://localhost:4000/api`
- Frontend: `http://localhost:5173`

## Variables de entorno

El repositorio incluye `.env.development` y `.env.production` para ejecutar `docker compose --env-file`. Personaliza los valores antes de desplegar en un entorno real. Además, cada paquete mantiene su propio `.env.example` para ejecución fuera de Docker.

| Variable | Descripción | Paquete |
| --- | --- | --- |
| `DATABASE_URL` | Cadena de conexión PostgreSQL utilizada por Prisma. | `api` |
| `JWT_SECRET` | Clave de firma para tokens JWT. | `api` |
| `PORT` | Puerto expuesto por la API. | `api` |
| `VITE_API_URL` | URL base que consume el front-end. | `web` |

## Módulos clave

- Datos Pre-Kickoff (checklists y adjuntos)
- Encuestas (Likert/preguntas abiertas, respuestas públicas)
- Entrevistas (adjuntos de audio y notas)
- Procesos (BPMN/links + sub-módulos dinámicos como Recepción/Picking/Despacho)
- Sistemas (Inventario, Cobertura, Integraciones, Data, Seguridad, Performance, Costos con TCO 3y)
- Riesgos (matriz RAG por severidad)
- Hallazgos & Acciones (RACI, Kanban y seguimiento)
- POC / Pilotos
- Decision Log
- KPIs y dashboard
- Exportables (Excel ZIP + PDF ejecutivo)
- Audit trail

## Gestión de proyectos y empresas

- Cada proyecto incluye `settings.enabledFeatures` (JSON) para decidir qué sub-tabs de **Procesos** se renderizan.
- Endpoint dedicado: `GET /api/projects/:id/features` → `{ enabled: string[] }`.
- La ruta histórica `/projects/:id/reception` redirige a `/projects/:id/procesos/reception`.
- Plantillas sugeridas al crear proyectos desde la UI:
  - **Distribución** → `['reception', 'picking', 'dispatch']`
  - **Simple** → `[]`

### Endpoints de empresas

> Requieren autenticación con rol `admin`.

- `POST /api/companies` crea nueva empresa (`name`, `taxId`).
- `GET /api/companies` lista empresas con conteo de proyectos.
- `PUT /api/companies/:id` actualiza nombre/RUT.
- `DELETE /api/companies/:id` elimina si no tiene proyectos asociados.

Cada nuevo proyecto requiere `companyId` y asigna automáticamente al creador como propietario (`ownerId`).

## Scripts útiles

En cada paquete puedes apoyarte en los siguientes comandos:

```bash
# API
npm run dev        # Levanta el servidor en modo desarrollo
npm run lint       # Linting del backend
npm run test       # Suite de tests de la API
npm run seed       # Inserta datos demo (requiere DB activa)

# Web
npm run dev        # Dev server (Vite)
npm run lint       # ESLint sobre el front
npm run test       # Vitest + Testing Library
```

Los nombres de scripts se mantienen consistentes entre paquetes para simplificar la experiencia.

## Semilla de datos

La semilla `npm run seed` (o `docker compose exec api npm run seed`) crea:

- Empresas demo **Nutrial** y **DemoCorp**.
- Usuarios demo de ejemplo (consulta `prisma/seed.ts` y reemplaza credenciales en entornos reales).
- Proyecto **Nutrial – Auditoría 2025** con `settings.enabledFeatures = ['reception', 'picking', 'dispatch']` y memberships según roles.

## OpenAPI y clientes

- El contrato REST está disponible en `api/openapi.yaml`.
- Puedes generar clientes con herramientas como `openapi-generator-cli` o `orval`.
- Para visualizarlo rápidamente:
  ```bash
  npx @redocly/cli preview-docs api/openapi.yaml
  ```

## Tests y calidad

- **Unitarias**: `npm run test` en cada paquete.
- **Lint**: `npm run lint` para asegurar estilos de código consistentes.
- **Formato**: aplica Prettier según la configuración de cada proyecto (`npm run format` si está disponible).
- **Integración** (propuesto): configurar `docker compose run api npm run test:e2e` para validar flujos completos.

### Smoke test con Docker Compose

Para validar una instalación fresca con Docker Compose:

```bash
docker compose down -v
cp .env.example .env
docker compose up -d --build

curl -i http://localhost:4000/api/health
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@demo.com","password":"demo123"}' | jq -r '.accessToken')
echo "TOKEN:${TOKEN:0:25}..."
curl -i http://localhost:4000/api/projects -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:4000/api/surveys/does-not-exist -H "Authorization: Bearer $TOKEN"
```

Revisa los logs para confirmar que los encabezados sensibles aparecen como `Bearer <redacted>` y que no hay errores de compilación (`esbuild`) ni de generación de Prisma.

Se recomienda integrar estos comandos en pipelines CI/CD (GitHub Actions, GitLab CI, etc.).

## Despliegue

1. Crea imágenes con los Dockerfiles presentes en cada paquete (o usa Docker Compose como base).
2. Ejecuta migraciones con `prisma migrate deploy` antes de iniciar la API.
3. Configura variables de entorno de producción (`JWT_SECRET`, `DATABASE_URL`, `VITE_API_URL`).
4. Expone los servicios tras un reverse proxy (Nginx, Traefik) y habilita HTTPS.
5. Automatiza despliegues con pipelines que ejecuten tests, lint y build antes de publicar.

## Resolución de problemas

| Síntoma | Posible causa | Solución |
| --- | --- | --- |
| API no arranca | Base de datos inaccesible | Verifica credenciales y que Postgres esté escuchando |
| Error `JWT_SECRET missing` | Variable no configurada | Define `JWT_SECRET` en `.env` o secretos del entorno |
| Front no puede autenticar | URLs inconsistentes | Revisa `VITE_API_URL` y CORS en la API |
| Migraciones fallan | Esquema fuera de sync | Ejecuta `npx prisma migrate resolve --rolled-back "<migration>"` y reintenta |

## FAQ

**¿Puedo usar otra base de datos?**
Actualmente solo se soporta PostgreSQL. Cambiarla implicaría ajustar el proveedor de Prisma y revisar migraciones.

**¿Existe modo de solo lectura?**
Puedes crear roles personalizados sin permisos de escritura y asignarlos mediante memberships.

**¿Cómo personalizo los exportables?**
Los templates se encuentran en la capa API; puedes duplicar y ajustar los generadores de Excel/PDF según tus necesidades.

## Contribuir

1. Haz un fork y crea una rama descriptiva.
2. Realiza tus cambios siguiendo los lineamientos de estilo.
3. Ejecuta lint y tests antes de abrir un PR.
4. Describe claramente el impacto, screenshots (si aplica) y pasos de prueba.

Se aceptan issues con propuestas de mejora, bugs o solicitudes de documentación adicional.

## Licencia

Actualmente el proyecto no define una licencia pública. Si deseas utilizar el código en entornos comerciales, contacta al mantenedor para acordar los términos.
