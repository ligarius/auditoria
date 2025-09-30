import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import { useEffect, useRef, useState } from 'react';
import { ES } from '../../i18n/es';
import { getAccessToken } from '../../lib/session';

type Estado = keyof typeof ES.projectStatus;

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

export default function WorkflowPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    (async () => {
      const res = await fetch(`${API_BASE}/workflow/${projectId}`, { headers });
      const json = await res.json();
      setData(json);

      // Si hay workflowDefinition (BPMN XML/JSON) intenta mostrarlo
      if (json.workflowDefinition && containerRef.current) {
        const { default: BpmnJS } = await import('bpmn-js/dist/bpmn-modeler.development.js');
        viewerRef.current = new BpmnJS({ container: containerRef.current });
        try {
          await viewerRef.current.importXML(json.workflowDefinition.xml || json.workflowDefinition);
        } catch { /* fallback silencioso */ }
      }
    })();

    return () => {
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
      body: JSON.stringify({ next })
    });
    const json = await res.json();
    if (json.error) return alert(json.error);
    // recargar
    const fresh = await (await fetch(`${API_BASE}/workflow/${projectId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })).json();
    setData(fresh);
  };

  if (!data) return <div className="p-4 text-sm">Cargando flujo…</div>;

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
            <button key={e}
              onClick={() => avanzar(e)}
              className="px-3 py-1 rounded-lg border hover:shadow">
              Avanzar a {ES.projectStatus[e]}
            </button>
          ))}
          {(!data.permitidos || data.permitidos.length === 0) && (
            <span className="text-sm text-slate-500">Sin transiciones disponibles</span>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl border shadow-sm">
        <h4 className="font-medium mb-2">Diagrama (opcional)</h4>
        <div ref={containerRef} className="w-full h-[400px] rounded-lg border" />
      </div>
    </div>
  );
}
