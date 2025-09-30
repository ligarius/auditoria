export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const ROLE_KEY = 'role';
export const LAST_PROJECT_KEY = 'lastProjectId';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

const clearBrowserCookies = () => {
  if (typeof document === 'undefined') {
    return;
  }
  const cookies = document.cookie?.split(';') ?? [];
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
    if (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`; // Expira cookie
    }
  }
};

export const storeTokens = ({ accessToken, refreshToken }: SessionTokens) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(LAST_PROJECT_KEY);
  clearBrowserCookies();
};

export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};
