import { useEffect, useMemo, useState } from 'react';
import { Form } from 'react-formio';
import 'formiojs/dist/css/formio.full.css';

import api from '../../lib/api';

interface FormRunnerProps {
  token: string;
  respondent?: {
    email?: string;
    fullName?: string;
    department?: string;
    externalId?: string;
  };
  autoSaveIntervalMs?: number;
}

interface FormMetadata {
  form: Record<string, unknown>;
  template: { id: string; name: string; type: string };
}

interface SubmissionState {
  submissionId?: string;
  scoreTotal?: number | null;
  submittedAt?: string;
}

export function FormRunner({ token, respondent, autoSaveIntervalMs }: FormRunnerProps) {
  const [metadata, setMetadata] = useState<FormMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchForm = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/forms/links/${token}`);
        if (!isMounted) return;
        setMetadata({
          form: response.data.form,
          template: response.data.template
        });
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof Error) {
          setError(err.message);
        } else if (typeof err === 'object' && err && 'response' in err) {
          const status = (err as { response?: { status?: number } }).response?.status;
          setError(status === 410 ? 'El link expiró o alcanzó el máximo de respuestas.' : 'No se pudo cargar el formulario.');
        } else {
          setError('No se pudo cargar el formulario.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void fetchForm();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const autoSave = useMemo(() => {
    if (!autoSaveIntervalMs || autoSaveIntervalMs <= 0) {
      return undefined;
    }
    return {
      dataType: 'submission' as const,
      saveDraft: true,
      interval: autoSaveIntervalMs
    };
  }, [autoSaveIntervalMs]);

  const handleSubmit = async (submissionEvent: { data: Record<string, unknown> }) => {
    setError(null);
    setSubmitting(true);
    try {
      const response = await api.post(`/forms/submit/${token}`, {
        answers: submissionEvent.data,
        respondent
      });
      setSubmission(response.data as SubmissionState);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err && 'response' in err) {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 410) {
          setError('El link expiró o alcanzó el máximo de respuestas.');
        } else if (status === 401) {
          setError('Debes iniciar sesión para completar este formulario.');
        } else {
          setError('No fue posible registrar la respuesta.');
        }
      } else {
        setError('No fue posible registrar la respuesta.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
        Cargando formulario…
      </div>
    );
  }

  if (error && !metadata) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700 shadow-sm">
        {error}
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{metadata.template.name}</h1>
        <p className="text-sm text-slate-600">{metadata.template.type}</p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Form
          form={metadata.form as unknown}
          onSubmit={handleSubmit}
          options={{
            submitMessage: '',
            noAlerts: true,
            saveDraft: Boolean(autoSave)
          }}
          submission={{ data: {} }}
          {...(autoSave ? { saveDraft: autoSave } : {})}
        />
      </section>

      {submitting && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Enviando respuesta…
        </div>
      )}

      {submission && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ¡Respuesta registrada!{typeof submission.scoreTotal === 'number' ? ` Puntaje: ${submission.scoreTotal.toFixed(2)}.` : ''}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}

export default FormRunner;
