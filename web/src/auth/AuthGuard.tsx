import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { isAuthenticated } from '../lib/session';

export function AuthGuard() {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export default AuthGuard;
