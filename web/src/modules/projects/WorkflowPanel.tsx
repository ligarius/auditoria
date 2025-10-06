import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import { useEffect, useRef, useState } from 'react';
import { ES } from '../../i18n/es';
import { getAccessToken } from '../../lib/session';

type Estado = keyof typeof ES.projectStatus;

const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
).replace(/\/$/, '');

type WorkflowDefinition =
  | string
  | {
      xml?: string;
    }
  | null
  | undefined;

interface WorkflowResponse {
  estadoActual?: string;
  permitidos?: Estado[];
  workflowDefinition?: WorkflowDefinition;
}

interface ProcessAsset {
  id?: string;
  url?: string | null;
  type?: string | null;
}

type BpmnModeler = {
  importXML: (xml: string) => Promise<unknown>;
  destroy?: () => void;
};

export default function WorkflowPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<WorkflowResponse | null>(null);
  const viewerRef = useRef<BpmnModeler | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [diagramError, setDiagramError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    let cancelled = false;

    const emitToast = (message: string) => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message, type: 'error' as const },
        })
      );
    };

    const loadDiagram = async () => {
      try {
        if (!cancelled) {
          setDiagramError(null);
        }
        const processAssetsResponse = await fetch(
          `${API_BASE}/process-assets/${projectId}`,
          { headers }
        );
        const workflowResponse = await fetch(
          `${API_BASE}/workflow/${projectId}`,
          {
            headers,
          }
        );

        const assets: ProcessAsset[] = processAssetsResponse.ok
          ? ((await processAssetsResponse.json()) as ProcessAsset[])
          : [];

        if (!workflowResponse.ok) {
          throw new Error('No workflow data');
        }

        const workflowJson =
          (await workflowResponse.json()) as WorkflowResponse;
        if (cancelled) return;
        setData(workflowJson);
        setDiagramError(null);

        const ensureViewer = async () => {
          if (!containerRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (!containerRef.current) {
            throw new Error('Container not ready');
          }

          if (!viewerRef.current) {
            const { default: BpmnJS } = (await import(
              'bpmn-js/dist/bpmn-modeler.development.js'
            )) as {
              default: new (options: { container: HTMLElement }) => BpmnModeler;
            };
            viewerRef.current = new BpmnJS({ container: containerRef.current });
          }

          return viewerRef.current;
        };

        const sources: Array<() => Promise<string | null>> = [];

        const firstBpmnAsset = assets.find(
          (asset) => asset.type === 'BPMN' && asset.url
        );

        if (firstBpmnAsset?.url) {
          sources.push(async () => {
            const response = await fetch(
              firstBpmnAsset.url as string,
              token
                ? {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                : undefined
            );
            if (!response.ok) {
              throw new Error('No se pudo cargar el BPMN');
            }
            return response.text();
          });
        }

        const { workflowDefinition } = workflowJson;
        if (workflowDefinition) {
          sources.push(async () =>
            typeof workflowDefinition === 'string'
              ? workflowDefinition
              : (workflowDefinition?.xml ?? null)
          );
        }

        sources.push(async () => {
          const response = await fetch('/demo/recepcion-demo.bpmn');
          if (!response.ok) {
            throw new Error('No se pudo cargar el demo');
          }
          return response.text();
        });

        for (const getSource of sources) {
          try {
            const xml = await getSource();
            if (!xml) continue;
            const viewer = await ensureViewer();
            await viewer.importXML(xml);
            if (!cancelled) {
              setDiagramError(null);
            }
            return;
          } catch {
            viewerRef.current?.destroy?.();
            viewerRef.current = null;
          }
        }

        if (!cancelled) {
          setDiagramError('No hay diagrama disponible');
          emitToast('No hay diagrama disponible');
        }
      } catch {
        if (!cancelled) {
          setDiagramError('No hay diagrama disponible');
          emitToast('No hay diagrama disponible');
        }
      }
    };

    loadDiagram();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy?.();
        viewerRef.current = null;
      }
    };
  }, [projectId]);

  const avanzar = async (next: Estado) => {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}/workflow/${projectId}/transition`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ next }),
    });
    const json = (await res.json()) as { error?: string };
    if (json.error) return alert(json.error);
    // recargar
    const fresh = await (
      await fetch(`${API_BASE}/workflow/${projectId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
    ).json();
    setData(fresh as WorkflowResponse);
  };

  if (!data) {
    if (diagramError) {
      return <div className="p-4 text-sm text-slate-500">{diagramError}</div>;
    }
    return <div className="p-4 text-sm">Cargando flujo…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border shadow-sm">
        <h3 className="font-semibold mb-2">{ES.workflow.titulo}</h3>
        <p>
          <strong>{ES.workflow.estadoActual}:</strong>{' '}
          {ES.projectStatus[data.estadoActual as Estado] ?? data.estadoActual}
        </p>
        <div className="flex gap-2 mt-3">
          {(data.permitidos ?? []).map((e: Estado) => (
            <button
              key={e}
              onClick={() => avanzar(e)}
              className="px-3 py-1 rounded-lg border hover:shadow"
            >
              Avanzar a {ES.projectStatus[e]}
            </button>
          ))}
          {(!data.permitidos || data.permitidos.length === 0) && (
            <span className="text-sm text-slate-500">
              Sin transiciones disponibles
            </span>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl border shadow-sm">
        <h4 className="font-medium mb-2">Diagrama (opcional)</h4>
        <div className="relative w-full h-[400px] rounded-lg border overflow-hidden">
          <div ref={containerRef} className="w-full h-full" />
          {diagramError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-slate-500">
              {diagramError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
