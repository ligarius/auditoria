// web/src/lib/api.ts
import axios from 'axios';

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  storeTokens,
  type SessionTokens,
} from './session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<SessionTokens> | null = null;

const performRefresh = async (): Promise<SessionTokens> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('Token de refresco no encontrado');
  }
  const response = await axios.post(
    `${api.defaults.baseURL?.replace(/\/$/, '')}/auth/refresh`,
    { refreshToken },
    { withCredentials: true },
  );
  const tokens = response.data as Partial<SessionTokens>;
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error('Respuesta de refresh incompleta');
  }
  storeTokens(tokens as SessionTokens);
  return tokens as SessionTokens;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    if (status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.endsWith('/auth/refresh')) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise ?? performRefresh();
        const tokens = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearSession();
        window.location.replace('/login');
        return Promise.reject(refreshError);
      }
    }

    if (status === 401) {
      clearSession();
      window.location.replace('/login');
    }

    return Promise.reject(error);
  },
);

export default api;
