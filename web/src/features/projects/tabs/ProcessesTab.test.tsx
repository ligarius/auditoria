import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import ProcessesTab from './ProcessesTab';

vi.mock('../../../lib/api', () => ({
  default: {
    get: vi.fn()
  }
}));

import api from '../../../lib/api';

describe('ProcessesTab', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the Recepción sub-tab when enabled', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { enabled: ['reception', 'picking'] } });

    render(
      <MemoryRouter initialEntries={['/projects/project-a/procesos/reception']}>
        <Routes>
          <Route path="/projects/:id/procesos/:feature?" element={<ProcessesTab projectId="project-a" />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/projects/project-a/features'));
    expect(await screen.findByText('Recepción')).toBeInTheDocument();
    expect(screen.getByText('Picking')).toBeInTheDocument();
  });

  it('does not show Recepción when the feature is disabled', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { enabled: [] } });

    render(
      <MemoryRouter initialEntries={['/projects/project-b/procesos']}>
        <Routes>
          <Route path="/projects/:id/procesos/*" element={<ProcessesTab projectId="project-b" />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/projects/project-b/features'));
    expect(screen.queryByText('Recepción')).not.toBeInTheDocument();
    expect(
      screen.getByText('No hay sub-módulos de procesos habilitados para este proyecto.')
    ).toBeInTheDocument();
  });
});
