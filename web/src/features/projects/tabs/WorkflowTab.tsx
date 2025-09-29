import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/api';

const WORKFLOW_STATES = ['PLANNING', 'FIELDWORK', 'REPORT', 'CLOSE'] as const;
const DEFAULT_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" targetNamespace="http://bpmn.io/schema/bpmn" id="Definitions_1">
  <bpmn:process id="AuditWorkflow" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inicio"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="AuditWorkflow">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="150" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

type WorkflowState = (typeof WORKFLOW_STATES)[number];

type WorkflowResponse = {
  state: WorkflowState;
  definition: null | { xml?: unknown } | unknown;
};

interface WorkflowTabProps {
  projectId: string;
}

const getXmlFromDefinition = (definition: WorkflowResponse['definition']): string | null => {
  if (!definition || typeof definition !== 'object') {
    return null;
  }
  const maybeXml = (definition as { xml?: unknown }).xml;
  return typeof maybeXml === 'string' && maybeXml.trim().length > 0 ? maybeXml : null;
};

export const WorkflowTab = ({ projectId }: WorkflowTabProps) => {
  const { role } = useAuth();
  const isEditor = role === 'admin' || role === 'consultor';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bpmnRef = useRef<BpmnModeler | BpmnViewer | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingDiagram, setSavingDiagram] = useState(false);
  const [updatingState, setUpdatingState] = useState(false);
  const [state, setState] = useState<WorkflowState>('PLANNING');
  const [diagramXml, setDiagramXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentDiagram = useMemo(() => diagramXml ?? DEFAULT_DIAGRAM, [diagramXml]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const Engine = isEditor ? BpmnModeler : BpmnViewer;
    const instance = new Engine({
      container: containerRef.current,
    });
    bpmnRef.current = instance;

    return () => {
      instance.destroy();
      bpmnRef.current = null;
    };
  }, [isEditor]);

  const loadDiagram = async (xml: string) => {
    const instance = bpmnRef.current;
    if (!instance) {
      return;
    }
    try {
      await instance.importXML(xml);
      if (!isEditor && 'get' in instance) {
        const canvas = (instance as BpmnViewer).get('canvas');
        canvas.zoom('fit-viewport');
      }
    } catch (importError) {
      console.error('No se pudo importar el diagrama BPMN', importError);
      setError('No se pudo renderizar el diagrama BPMN.');
    }
  };

  const fetchWorkflow = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<WorkflowResponse>(`/projects/${projectId}/workflow`);
      const workflow = response.data;
      const xml = getXmlFromDefinition(workflow.definition);
      setState(workflow.state);
      setDiagramXml(xml);
      await loadDiagram(xml ?? DEFAULT_DIAGRAM);
    } catch (requestError) {
      console.error('No se pudo cargar el workflow', requestError);
      setError('No se pudo cargar el workflow del proyecto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      return;
    }
    fetchWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!bpmnRef.current) {
      return;
    }
    loadDiagram(currentDiagram).catch(() => {
      /* handled arriba */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDiagram]);

  const handleSaveDiagram = async () => {
    if (!isEditor) {
      return;
    }
    const modeler = bpmnRef.current;
    if (!modeler || typeof (modeler as BpmnModeler).saveXML !== 'function') {
      return;
    }
    try {
      setSavingDiagram(true);
      const { xml } = await (modeler as BpmnModeler).saveXML({ format: true });
      await api.put(`/projects/${projectId}/workflow/diagram`, {
        definition: { xml },
      });
      setDiagramXml(xml);
    } catch (saveError) {
      console.error('No se pudo guardar el diagrama', saveError);
      setError('No se pudo guardar el diagrama. Intenta nuevamente.');
    } finally {
      setSavingDiagram(false);
    }
  };

  const handleStateChange = async (next: WorkflowState) => {
    if (!isEditor) {
      return;
    }
    try {
      setUpdatingState(true);
      await api.post(`/projects/${projectId}/workflow/transition`, { state: next });
      setState(next);
    } catch (transitionError) {
      console.error('No se pudo cambiar el estado del workflow', transitionError);
      setError('No se pudo cambiar el estado. Revisa las transiciones permitidas.');
    } finally {
      setUpdatingState(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Cargando workflow...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Estado de auditoría</p>
          <p className="text-lg font-semibold text-slate-900">{state}</p>
        </div>
        {isEditor && (
          <div className="flex items-center gap-2">
            <label htmlFor="workflow-state" className="text-sm text-slate-600">
              Cambiar a
            </label>
            <select
              id="workflow-state"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              value={state}
              onChange={(event) => handleStateChange(event.target.value as WorkflowState)}
              disabled={updatingState}
            >
              {WORKFLOW_STATES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div ref={containerRef} className="h-[520px] w-full" />
      </div>

      {isEditor && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveDiagram}
            disabled={savingDiagram}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {savingDiagram ? 'Guardando...' : 'Guardar diagrama'}
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkflowTab;
