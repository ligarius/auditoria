// web/src/lib/api.ts
import axios, { AxiosHeaders } from 'axios';

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  storeTokens,
  type SessionTokens,
} from './session';

const rawApiBaseUrl =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    __retriedNoStore?: boolean;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  const headers = AxiosHeaders.from(config.headers ?? {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.delete('If-None-Match');
  headers.delete('if-none-match');
  headers.delete('If-Modified-Since');
  headers.delete('if-modified-since');
  headers.set('Cache-Control', 'no-store');
  headers.set('Pragma', 'no-cache');
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  config.headers = headers;
  return config;
});

let refreshPromise: Promise<SessionTokens> | null = null;

const performRefresh = async (): Promise<SessionTokens> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('Token de refresco no encontrado');
  }
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    {
      withCredentials: true,
      headers: {
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        Accept: 'application/json',
      },
    }
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

    if (
      status === 304 &&
      originalRequest &&
      !originalRequest.__retriedNoStore
    ) {
      originalRequest.__retriedNoStore = true;
      const resolvedBase =
        originalRequest.baseURL || api.defaults.baseURL || API_BASE_URL;
      const requestUrl = new URL(
        originalRequest.url ?? '',
        resolvedBase.endsWith('/') ? resolvedBase : `${resolvedBase}/`
      );
      requestUrl.searchParams.set('t', String(Date.now()));
      const retriedHeaders = AxiosHeaders.from(originalRequest.headers ?? {});
      retriedHeaders.delete('If-None-Match');
      retriedHeaders.delete('if-none-match');
      retriedHeaders.delete('If-Modified-Since');
      retriedHeaders.delete('if-modified-since');
      retriedHeaders.set('Cache-Control', 'no-store');
      retriedHeaders.set('Pragma', 'no-cache');
      if (!retriedHeaders.has('Accept')) {
        retriedHeaders.set('Accept', 'application/json');
      }
      return api.request({
        ...originalRequest,
        url: requestUrl.toString(),
        headers: retriedHeaders,
      });
    }

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.endsWith('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise ?? performRefresh();
        const tokens = await refreshPromise;
        refreshPromise = null;
        const retryHeaders = AxiosHeaders.from(originalRequest.headers ?? {});
        retryHeaders.set('Authorization', `Bearer ${tokens.accessToken}`);
        retryHeaders.delete('If-None-Match');
        retryHeaders.delete('if-none-match');
        retryHeaders.delete('If-Modified-Since');
        retryHeaders.delete('if-modified-since');
        retryHeaders.set('Cache-Control', 'no-store');
        retryHeaders.set('Pragma', 'no-cache');
        if (!retryHeaders.has('Accept')) {
          retryHeaders.set('Accept', 'application/json');
        }
        originalRequest.headers = retryHeaders;
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
  }
);

export default api;

const ensureAbsoluteApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

type ApiFetchInit = RequestInit;

export async function apiFetch(
  path: string,
  init: ApiFetchInit = {}
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers ?? {});
  headers.delete('if-none-match');
  headers.delete('if-modified-since');
  headers.set('Cache-Control', 'no-store');
  headers.set('Pragma', 'no-cache');
  if (!headers.has('accept')) {
    headers.set('Accept', 'application/json');
  }

  const finalInit: RequestInit = {
    ...init,
    method,
    headers,
    cache: 'no-store',
    credentials: init.credentials ?? 'include',
  };

  const initialUrl = ensureAbsoluteApiUrl(path);
  let response = await fetch(initialUrl, finalInit);

  if (response.status === 304 && method === 'GET') {
    const bustUrl = new URL(initialUrl);
    bustUrl.searchParams.set('t', String(Date.now()));
    response = await fetch(bustUrl.toString(), finalInit);
  }

  return response;
}

export async function apiFetchJson<T = unknown>(
  path: string,
  init?: ApiFetchInit
): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status} ${response.statusText} – ${text}`);
  }
  return (await response.json()) as T;
}
