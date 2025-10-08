import axios, { AxiosHeaders } from 'axios';

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  storeTokens,
  type SessionTokens,
} from './session';

const resolveApiOrigin = (): string => {
  const envBase =
    import.meta.env.VITE_API_BASE ??
    import.meta.env.VITE_API_URL ??
    'http://localhost:4000';
  const trimmed = envBase.replace(/\/$/, '');
  if (trimmed.toLowerCase().endsWith('/api')) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

const API_ORIGIN = resolveApiOrigin();
export const API_BASE_URL = `${API_ORIGIN}/api`;

const ensureApiPath = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath === '/api' || normalizedPath.startsWith('/api/')) {
    return normalizedPath;
  }
  return `/api${normalizedPath}`;
};

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    __retriedNoStore?: boolean;
  }
}

const api = axios.create({
  baseURL: API_ORIGIN,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = ensureApiPath(config.url);
  }
  const headers = AxiosHeaders.from(config.headers ?? {});
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }
  headers.delete('If-None-Match');
  headers.delete('if-none-match');
  headers.delete('If-Modified-Since');
  headers.delete('if-modified-since');
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
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
  const response = await api.post('/api/auth/refresh', { refreshToken });
  const tokens = response.data as Partial<SessionTokens>;
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error('Respuesta de refresh incompleta');
  }
  storeTokens(tokens as SessionTokens);
  api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
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
        originalRequest.baseURL || api.defaults.baseURL || API_ORIGIN;
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
      if (!retriedHeaders.has('Content-Type')) {
        retriedHeaders.set('Content-Type', 'application/json');
      }
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
      !originalRequest.url?.includes('/auth/refresh')
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
        if (!retryHeaders.has('Content-Type')) {
          retryHeaders.set('Content-Type', 'application/json');
        }
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

export async function login(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password });
  if (data?.accessToken || data?.token) {
    const accessToken = data.accessToken ?? data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }
  return data;
}

const ensureAbsoluteApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath =
    normalizedPath === '/api' || normalizedPath.startsWith('/api/')
      ? normalizedPath
      : `/api${normalizedPath}`;
  return `${API_ORIGIN}${apiPath}`;
};

type ApiFetchInit = RequestInit;

export async function apiFetch(
  path: string,
  init: ApiFetchInit = {}
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers ?? {});
  const token = getAccessToken();
  if (token && !headers.has('authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.delete('if-none-match');
  headers.delete('if-modified-since');
  if (!headers.has('accept')) {
    headers.set('Accept', 'application/json');
  }
  if (!headers.has('content-type') && method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const finalInit: RequestInit = {
    ...init,
    method,
    headers,
    cache: 'no-store',
    credentials: init.credentials ?? 'omit',
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
  init: ApiFetchInit = {}
): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
