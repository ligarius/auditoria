import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface SurveyQuestion {
  id: string;
  type: string;
  text: string;
  scaleMin?: number | null;
  scaleMax?: number | null;
  required: boolean;
}

interface Survey {
  id: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  questions: SurveyQuestion[];
}

interface SurveySummaryItem {
  questionId: string;
  average?: number;
  responses: number;
  distribution?: Record<string, number>;
  scale?: { min: number; max: number };
  topResponses?: { value: string; count: number }[];
}

interface SurveySummary {
  survey: Survey;
  summaries: SurveySummaryItem[];
}

interface SurveysTabProps {
  projectId: string;
}

const defaultSurveyForm = {
  title: '',
  description: '',
  isActive: true,
};

const defaultQuestionForm = {
  surveyId: '',
  text: '',
  type: 'Likert',
  scaleMin: 1,
  scaleMax: 5,
  required: true,
};

export default function SurveysTab({ projectId }: SurveysTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [surveyForm, setSurveyForm] = useState(defaultSurveyForm);
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadSurveys = useCallback(async () => {
    try {
      const response = await api.get<Survey[]>(
        `/projects/${projectId}/surveys`
      );
      setSurveys(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudieron cargar las encuestas'));
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadSurveys();
    }
  }, [projectId, loadSurveys]);

  const handleCreateSurvey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/projects/${projectId}/surveys`, {
        title: surveyForm.title,
        description: surveyForm.description || undefined,
        isActive: surveyForm.isActive,
      });
      setSurveyForm(defaultSurveyForm);
      await loadSurveys();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear la encuesta'));
    }
  };

  const handleCreateQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !questionForm.surveyId) return;
    try {
      await api.post(
        `/projects/${projectId}/surveys/${questionForm.surveyId}/questions`,
        {
          type: questionForm.type,
          text: questionForm.text,
          scaleMin:
            questionForm.type === 'Likert'
              ? Number(questionForm.scaleMin)
              : undefined,
          scaleMax:
            questionForm.type === 'Likert'
              ? Number(questionForm.scaleMax)
              : undefined,
          required: questionForm.required,
        }
      );
      setQuestionForm((prev) => ({
        ...defaultQuestionForm,
        surveyId: prev.surveyId,
      }));
      await loadSurveys();
      if (selectedSurveyId === questionForm.surveyId) {
        await fetchSummary(questionForm.surveyId);
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo agregar la pregunta'));
    }
  };

  const fetchSummary = async (surveyId: string) => {
    setLoadingSummary(true);
    try {
      const response = await api.get<SurveySummary>(
        `/projects/${projectId}/surveys/${surveyId}/summary`
      );
      setSummary(response.data);
      setSelectedSurveyId(surveyId);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo cargar el resumen'));
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (selectedSurveyId) {
      fetchSummary(selectedSurveyId);
    }
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Encuestas</h2>
        <p className="text-sm text-slate-500">
          Diseña cuestionarios para stakeholders e interpreta respuestas con
          resúmenes automáticos.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {canEdit && (
        <form
          onSubmit={handleCreateSurvey}
          className="grid gap-3 rounded-lg border border-slate-200 p-4"
        >
          <h3 className="text-lg font-medium text-slate-800">Nueva encuesta</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm md:col-span-2">
              Título
              <input
                className="mt-1 rounded border px-3 py-2"
                value={surveyForm.title}
                onChange={(e) =>
                  setSurveyForm((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Descripción
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={surveyForm.description}
                onChange={(e) =>
                  setSurveyForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
            </label>
            <label className="flex flex-col text-sm">
              Estado
              <select
                className="mt-1 rounded border px-3 py-2"
                value={surveyForm.isActive ? 'true' : 'false'}
                onChange={(e) =>
                  setSurveyForm((prev) => ({
                    ...prev,
                    isActive: e.target.value === 'true',
                  }))
                }
              >
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Crear encuesta
            </button>
          </div>
        </form>
      )}

      {canEdit && surveys.length > 0 && (
        <form
          onSubmit={handleCreateQuestion}
          className="grid gap-3 rounded-lg border border-slate-200 p-4"
        >
          <h3 className="text-lg font-medium text-slate-800">
            Agregar pregunta
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Encuesta
              <select
                className="mt-1 rounded border px-3 py-2"
                value={questionForm.surveyId}
                onChange={(e) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    surveyId: e.target.value,
                  }))
                }
                required
              >
                <option value="">Selecciona…</option>
                {surveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              Tipo
              <select
                className="mt-1 rounded border px-3 py-2"
                value={questionForm.type}
                onChange={(e) =>
                  setQuestionForm((prev) => ({ ...prev, type: e.target.value }))
                }
              >
                <option value="Likert">Escala Likert</option>
                <option value="Abierta">Pregunta abierta</option>
              </select>
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Texto de la pregunta
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={questionForm.text}
                onChange={(e) =>
                  setQuestionForm((prev) => ({ ...prev, text: e.target.value }))
                }
                rows={2}
                required
              />
            </label>
            {questionForm.type === 'Likert' && (
              <>
                <label className="flex flex-col text-sm">
                  Escala mínima
                  <input
                    type="number"
                    className="mt-1 rounded border px-3 py-2"
                    value={questionForm.scaleMin}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({
                        ...prev,
                        scaleMin: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </label>
                <label className="flex flex-col text-sm">
                  Escala máxima
                  <input
                    type="number"
                    className="mt-1 rounded border px-3 py-2"
                    value={questionForm.scaleMax}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({
                        ...prev,
                        scaleMax: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </label>
              </>
            )}
            <label className="flex flex-col text-sm">
              Obligatoria
              <select
                className="mt-1 rounded border px-3 py-2"
                value={questionForm.required ? 'true' : 'false'}
                onChange={(e) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    required: e.target.value === 'true',
                  }))
                }
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Agregar pregunta
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">
            Encuestas creadas
          </h3>
          <div className="space-y-2">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">
                      {survey.title}
                    </h4>
                    {survey.description && (
                      <p className="text-sm text-slate-600">
                        {survey.description}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {survey.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {survey.questions.length} preguntas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => fetchSummary(survey.id)}
                  >
                    Ver resumen
                  </button>
                </div>
              </div>
            ))}
            {surveys.length === 0 && (
              <p className="text-sm text-slate-500">
                Aún no hay encuestas creadas.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Resumen</h3>
          {loadingSummary && (
            <p className="text-sm text-slate-500">Cargando resumen…</p>
          )}
          {!loadingSummary && summary && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  {summary.survey.title}
                </h4>
                {summary.survey.description && (
                  <p className="text-sm text-slate-600">
                    {summary.survey.description}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {summary.summaries.map((item) => {
                  const question = summary.survey.questions.find(
                    (q) => q.id === item.questionId
                  );
                  if (!question) return null;
                  const totalResponses = item.responses ?? 0;
                  const values = item.scale
                    ? Array.from(
                        { length: item.scale.max - item.scale.min + 1 },
                        (_, index) => String(item.scale!.min + index)
                      )
                    : Object.keys(item.distribution ?? {}).sort(
                        (a, b) => Number(a) - Number(b)
                      );
                  return (
                    <div
                      key={item.questionId}
                      className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {question.text}
                        </p>
                        <p className="text-xs text-slate-500">
                          {totalResponses} respuestas recibidas
                        </p>
                      </div>
                      {item.distribution ? (
                        <div className="space-y-2">
                          <div className="flex h-3 overflow-hidden rounded bg-slate-200">
                            {values.map((value) => {
                              const count = item.distribution?.[value] ?? 0;
                              const percentage = totalResponses
                                ? (count / totalResponses) * 100
                                : 0;
                              return (
                                <div
                                  key={`${item.questionId}-${value}`}
                                  className="h-3"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: '#0f172a',
                                    opacity:
                                      0.3 + Math.min(percentage, 60) / 100,
                                  }}
                                />
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>
                              Promedio: {item.average?.toFixed(2) ?? '0.00'}
                            </span>
                            {item.scale && (
                              <span>
                                Escala {item.scale.min} - {item.scale.max}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {item.topResponses?.map(({ value, count }, index) => (
                            <div
                              key={`${item.questionId}-resp-${index}`}
                              className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs text-slate-600"
                            >
                              <span className="truncate pr-2">{value}</span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                {count}
                              </span>
                            </div>
                          ))}
                          {(!item.topResponses ||
                            item.topResponses.length === 0) && (
                            <p className="text-xs text-slate-500">
                              Sin respuestas aún.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!loadingSummary && !summary && (
            <p className="text-sm text-slate-500">
              Selecciona una encuesta para visualizar su resumen de respuestas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
