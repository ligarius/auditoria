import { useMemo } from 'react';

/**
 * Builder de Form.io embebido vía iframe.
 * Requiere tener corriendo Form.io OSS (server + portal) y gestionar auth (SSO/JWT/Token).
 * Ajusta la URL base y el proyecto/route según tu instalación.
 */
export default function EmbeddedFormioBuilder({
  project = 'default',
  formPath = 'auditoria-form', // ruta del form dentro de Form.io
  baseUrl = import.meta.env.VITE_FORMIO_BASE_URL || 'http://localhost:3001',
}: {
  project?: string;
  formPath?: string;
  baseUrl?: string;
}) {
  const builderUrl = useMemo(() => {
    // Ejemplo de URL de builder en Form.io OSS; ajusta rutas según tu setup
    // p.ej.: http://localhost:3001/project/default/form/auditoria-form/edit
    const u = new URL(baseUrl);
    u.pathname = `/project/${project}/form/${formPath}/edit`;
    return u.toString();
  }, [project, formPath, baseUrl]);

  return (
    <div className="w-full h-[85vh]">
      <iframe
        src={builderUrl}
        className="w-full h-full border rounded-xl shadow-sm"
        title="Form.io Builder"
      />
    </div>
  );
}
