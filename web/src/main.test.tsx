import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { LegacyReceptionRedirect } from './main';

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

describe('LegacyReceptionRedirect', () => {
  it('redirects old reception route to procesos', () => {
    render(
      <MemoryRouter initialEntries={['/projects/123/reception']}>
        <Routes>
          <Route path="/projects/:id" element={<Outlet />}>
            <Route path="reception" element={<LegacyReceptionRedirect />} />
            <Route path="procesos/reception" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/projects/123/procesos/reception');
  });
});
