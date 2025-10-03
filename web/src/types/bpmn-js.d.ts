type ImportResult = { warnings: unknown[] };

interface BpmnBase {
  importXML(xml: string): Promise<ImportResult>;
  destroy(): void;
  get<T = unknown>(name: string): T;
}

declare module 'bpmn-js/lib/Modeler' {
  export default class BpmnModeler implements BpmnBase {
    constructor(options: { container: HTMLElement });
    importXML(xml: string): Promise<ImportResult>;
    destroy(): void;
    get<T = unknown>(name: string): T;
    saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
  }
}

declare module 'bpmn-js/lib/NavigatedViewer' {
  export default class BpmnNavigatedViewer implements BpmnBase {
    constructor(options: { container: HTMLElement });
    importXML(xml: string): Promise<ImportResult>;
    destroy(): void;
    get<T = unknown>(name: string): T;
  }
}

declare module 'bpmn-js/dist/bpmn-modeler.development.js' {
  import type BpmnModeler from 'bpmn-js/lib/Modeler';
  const Modeler: typeof BpmnModeler;
  export default Modeler;
}
