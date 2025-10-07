import { useEffect, useMemo, useState } from 'react';
import { Form } from '@formio/react';

import { apiFetch, apiFetchJson } from '../../lib/api';

/**
 * Componente mínimo para renderizar un formulario Form.io.
 *
 * Usos:
 * <FormRunner
 *   formJson={schemaJson}
 *   initialData={{ email: "user@demo.com" }}
 *   onSubmit={(data) => apiSubmit(data)}
 * />
 *
 * Si no pasas formJson, intentará cargarlo por token de la URL:
 *   /encuesta/:token  -> GET /api/forms/links/:token  => { formJson }
 */
type FormSchema = Record<string, unknown>;

type FormSubmission = {
  data: Record<string, unknown>;
};

type Props = {
  formJson?: FormSchema;
  initialData?: Record<string, unknown>;
  onSubmit?: (data: Record<string, unknown>) => Promise<void> | void;
};

export default function FormRunner({ formJson, initialData, onSubmit }: Props) {
  const [schema, setSchema] = useState<FormSchema | undefined>(formJson);
  const [loading, setLoading] = useState<boolean>(!formJson);
  const [error, setError] = useState<string | null>(null);

  // Si no recibimos formJson por props, intentamos cargarlo por token en la ruta: /encuesta/:token
  useEffect(() => {
    if (formJson) return;
    const token = window.location.pathname.split('/').pop();
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const payload = await apiFetchJson<{ formJson?: FormSchema }>(
          `/forms/links/${encodeURIComponent(token)}`
        );
        setSchema(payload.formJson);
        setError(null);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el formulario.';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [formJson]);

  const formOptions = useMemo(
    () => ({
      readOnly: false,
      noAlerts: false,
      // habilita borradores si luego implementas autosave:
      // saveDraft: true,
    }),
    []
  );

  if (loading) return <div className="p-4 text-sm">Cargando formulario…</div>;
  if (error)
    return <div className="p-4 text-sm text-red-600">Error: {error}</div>;
  if (!schema)
    return <div className="p-4 text-sm">Sin formulario disponible.</div>;

  return (
    <div className="p-4">
      <Form
        form={schema}
        submission={initialData ? { data: initialData } : undefined}
        options={formOptions}
        onSubmit={async (submission: FormSubmission) => {
          try {
            if (onSubmit) {
              await onSubmit(submission.data);
              return;
            }
            // Por defecto, si estamos en /encuesta/:token, lo enviamos al endpoint de submit por token
            const parts = window.location.pathname.split('/');
            const token = parts[parts.length - 1];
            if (!token) throw new Error('Token no encontrado en la URL.');
            const res = await apiFetch(
              `/forms/submit/${encodeURIComponent(token)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submission.data),
              }
            );
            if (!res.ok) throw new Error(`Error al enviar (${res.status})`);
            alert('Respuesta enviada con éxito.');
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            alert(`No se pudo enviar: ${message}`);
          }
        }}
      />
    </div>
  );
}
