import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const importXmlMock = vi.fn();
  const destroyMock = vi.fn();
  const BpmnConstructorMock = vi.fn(function () {
    return {
      importXML: importXmlMock,
      destroy: destroyMock,
    };
  });

  return { importXmlMock, destroyMock, BpmnConstructorMock };
});

vi.mock('bpmn-js/dist/bpmn-modeler.development.js', () => ({
  __esModule: true,
  default: mocks.BpmnConstructorMock,
}));

import WorkflowPanel from '../WorkflowPanel';

const { importXmlMock, BpmnConstructorMock } = mocks;

const API_BASE = 'http://localhost:4000/api';
const originalFetch = global.fetch;

const resolveUrl = (input: RequestInfo | URL) => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }
  return (input as Request).url;
};

describe('WorkflowPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
  });

  test('loads the first BPMN process asset', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      if (url === `${API_BASE}/process-assets/project-123`) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: 'asset-1', type: 'BPMN', url: 'https://example.com/asset.bpmn' },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      if (url === `${API_BASE}/workflow/project-123`) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ estadoActual: 'enRevision', workflowDefinition: null }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      if (url === 'https://example.com/asset.bpmn') {
        return Promise.resolve(new Response('<asset-diagram />', { status: 200 }));
      }
      if (url.endsWith('/demo/recepcion-demo.bpmn')) {
        return Promise.resolve(new Response('<demo-diagram />', { status: 200 }));
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(<WorkflowPanel projectId="project-123" />);

    await waitFor(() => expect(BpmnConstructorMock).toHaveBeenCalled());
    await waitFor(() => expect(importXmlMock).toHaveBeenCalledWith('<asset-diagram />'));
    expect(importXmlMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No hay diagrama disponible')).not.toBeInTheDocument();
  });

  test('falls back to demo BPMN when no asset exists', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      if (url === `${API_BASE}/process-assets/project-empty`) {
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url === `${API_BASE}/workflow/project-empty`) {
        return Promise.resolve(
          new Response(JSON.stringify({ estadoActual: 'enRevision', workflowDefinition: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url.endsWith('/demo/recepcion-demo.bpmn')) {
        return Promise.resolve(new Response('<demo-diagram />', { status: 200 }));
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(<WorkflowPanel projectId="project-empty" />);

    await waitFor(() => expect(importXmlMock).toHaveBeenCalledWith('<demo-diagram />'));
    expect(screen.queryByText('No hay diagrama disponible')).not.toBeInTheDocument();
  });

  test('shows message and emits toast when BPMN cannot be loaded', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      if (url === `${API_BASE}/process-assets/project-broken`) {
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url === `${API_BASE}/workflow/project-broken`) {
        return Promise.resolve(
          new Response(JSON.stringify({ estadoActual: 'enRevision', workflowDefinition: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url.endsWith('/demo/recepcion-demo.bpmn')) {
        return Promise.resolve(new Response('not found', { status: 404 }));
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    render(<WorkflowPanel projectId="project-broken" />);

    await waitFor(() =>
      expect(screen.getByText('No hay diagrama disponible')).toBeInTheDocument()
    );

    const toastEvent = dispatchSpy.mock.calls.find(
      ([event]) => event instanceof CustomEvent && event.type === 'toast'
    );
    expect(toastEvent).toBeTruthy();
    expect(importXmlMock).not.toHaveBeenCalled();

    dispatchSpy.mockRestore();
  });
});
