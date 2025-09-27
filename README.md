# Auditoría MVP

Aplicación web minimalista para gestionar auditorías internas y externas. Construida con FastAPI, SQLite y Bootstrap.

## Características

- Gestión de usuarios y roles (Administrador, Auditor, Cliente/Área auditada).
- Creación y seguimiento de auditorías con checklist, actividades y responsables.
- Registro de hallazgos con criticidad, evidencia adjunta y estados.
- Planes de acción con responsables, fechas compromiso y seguimiento de cumplimiento.
- Reportes básicos: dashboard, auditorías por estado, exportación de hallazgos a CSV y PDF.

## Requisitos

- Python 3.10+

Instala las dependencias:

```bash
pip install -r requirements.txt
```

## Ejecución

Inicia el servidor de desarrollo:

```bash
uvicorn app.main:app --reload
```

Visita `http://localhost:8000`. Usuario administrador por defecto:

- **Usuario:** `admin`
- **Contraseña:** `admin`

## Estructura de la base de datos

La aplicación utiliza SQLite por defecto y crea el archivo `auditoria.db` automáticamente. Se generan las tablas necesarias para usuarios, auditorías, checklist, actividades, hallazgos y planes de acción.

## Notas

- Los archivos de evidencia se almacenan en `app/static/evidence`.
- Las exportaciones se generan en `app/static` para ser descargadas.
