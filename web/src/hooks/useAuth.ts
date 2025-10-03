import { useCallback, useMemo } from 'react';

import { clearSession, getAccessToken, ROLE_KEY } from '../lib/session';

export function useAuth() {
  const token = getAccessToken();
  const role = localStorage.getItem(ROLE_KEY) || 'viewer';

  const logout = useCallback(() => {
    clearSession();
    window.location.replace('/login');
  }, []);

  return useMemo(
    () => ({ isAuth: !!token, role, logout }),
    [logout, role, token]
  );
}
