import { useMemo, useState } from 'react';

import EmbeddedFormioBuilder from './EmbeddedFormioBuilder';

import api from '../../lib/api';

export type QuestionnaireType = 'SURVEY' | 'INTERVIEW' | 'PBC';

interface BuilderProps {
  companyId: string;
  templateId?: string;
  initialName?: string;
  initialType?: QuestionnaireType;
  initialForm?: Record<string, unknown>;
  onVersionCreated?: (version: {
    id: string;
    version: number;
    status: string;
  }) => void;
}

type VersionState = { id: string; version: number; status: string } | null;

type TemplateState = {
  id: string;
  name: string;
  type: QuestionnaireType;
} | null;

const DEFAULT_FORM_SCHEMA = { display: 'form', components: [] } as const;

const SCORING_RULES_EXAMPLE =
  '{"rules":[{"id":"rule-1","questionId":"field1","operator":"eq","value":"Si","weight":10}]}';

const SCORING_PLACEHOLDER = `{
  "rules": [
    {
      "id": "impacto-alto",
      "questionId": "impacto",
      "operator": "eq",
      "value": "Alto",
      "weight": 5
    }
  ]
}`;

export function Builder({
  companyId,
  templateId: templateIdProp,
  initialName,
  initialType = 'PBC',
  initialForm,
  onVersionCreated,
}: BuilderProps) {
  const [template, setTemplate] = useState<TemplateState>(
    templateIdProp
      ? { id: templateIdProp, name: initialName ?? '', type: initialType }
      : null
  );
  const [formSchema] = useState<Record<string, unknown>>(
    initialForm ?? { ...DEFAULT_FORM_SCHEMA }
  );
  const [name, setName] = useState(initialName ?? '');
  const [type, setType] = useState<QuestionnaireType>(initialType);
  const [scoringDraft, setScoringDraft] = useState('');
  const [lastVersion, setLastVersion] = useState<VersionState>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const isPublishDisabled = useMemo(() => !lastVersion, [lastVersion]);

  const parseScoringDraft = (): unknown => {
    const trimmed = scoringDraft.trim();
    if (!trimmed) {
      return undefined;
    }
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new Error('El JSON de scoring no es válido');
    }
  };

  const handleSaveDraft = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!name.trim()) {
      setErrorMessage('Debes ingresar un nombre para la plantilla.');
      return;
    }

    setIsSaving(true);
    try {
      const scoringJson = parseScoringDraft();
      let currentTemplate = template;

      if (!currentTemplate) {
        const createdTemplate = await api
          .post('/forms/templates', {
            companyId,
            name: name.trim(),
            type,
          })
          .then(
            (res) =>
              res.data as { id: string; name: string; type: QuestionnaireType }
          );
        currentTemplate = createdTemplate;
        setTemplate(createdTemplate);
      }

      const version = await api
        .post(`/forms/templates/${currentTemplate.id}/versions`, {
          formJson: formSchema,
          scoringJson,
        })
        .then(
          (res) => res.data as { id: string; version: number; status: string }
        );

      setLastVersion(version);
      setStatusMessage(`Borrador #${version.version} guardado correctamente.`);
      onVersionCreated?.(version);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible guardar el borrador.';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!lastVersion) {
      setErrorMessage('Primero debes guardar un borrador.');
      return;
    }
    setErrorMessage(null);
    setIsPublishing(true);
    try {
      const version = await api
        .post(`/forms/versions/${lastVersion.id}/publish`)
        .then(
          (res) => res.data as { id: string; status: string; version: number }
        );
      setLastVersion(version);
      setStatusMessage(`Versión ${version.version} publicada.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible publicar la versión.';
      setErrorMessage(message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Definición de la plantilla
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Nombre
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Due diligence de ciberseguridad"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Tipo
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as QuestionnaireType)
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={Boolean(template)}
            >
              <option value="PBC">PBC / Solicitud de evidencias</option>
              <option value="SURVEY">Encuesta</option>
              <option value="INTERVIEW">Entrevista</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Constructor de formulario
          </h2>
          <div className="space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando…' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              disabled={isPublishDisabled || isPublishing}
            >
              {isPublishing ? 'Publicando…' : 'Publicar versión'}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <EmbeddedFormioBuilder />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Reglas de scoring (JSON opcional)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Puedes definir reglas declarativas para calcular el puntaje del
          formulario. El formato sigue la estructura
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">
            {SCORING_RULES_EXAMPLE}
          </code>
          .
        </p>
        <textarea
          value={scoringDraft}
          onChange={(event) => setScoringDraft(event.target.value)}
          className="mt-3 h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder={SCORING_PLACEHOLDER}
        />
      </section>

      {statusMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default Builder;
