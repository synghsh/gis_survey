import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import { store, updateToken, logout } from '../index';
import { getApiBaseUrl } from '../../config';

export default class RestService {
  client: AxiosInstance;
  constructor(config: AxiosRequestConfig) {
    this.client = axios.create(config);
    
    this.client.interceptors.request.use(
      async config => {
        const base = await getApiBaseUrl();
        let url = base.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'http://' + url;
        }
        config.baseURL = url;

        const token = store.getState().auth.token;
        if (token && !!config.headers) {
          config.headers['Authorization'] = token;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      async response => {
        return response;
      },
      async error => {
        const response = error.response;
        const originalRequest = error.config;

        if (response) {
          // Handle Token Refresh window (Status 408)
          if (response.status === 408 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
              const body = response.data;
              const newToken = body?.Token || body?.token;
              if (newToken) {
                console.log('[Axios] JWT refresh window hit. Dispatching updated token to storage...');
                store.dispatch(updateToken(newToken));
                if (originalRequest.headers) {
                  originalRequest.headers['Authorization'] = newToken;
                }
                return this.client(originalRequest);
              }
            } catch (err) {
              console.warn('[Axios] Failed to handle 408 token refresh:', err);
            }
          }

          // Handle Token Expiry / Invalidation (Status 403 or 401)
          if (response.status === 403 || response.status === 401) {
            try {
              const body = response.data;
              const errorMsg = (body?.Message || body?.message || '').toLowerCase();
              if (
                errorMsg.includes('token') ||
                errorMsg.includes('expired') ||
                errorMsg.includes('invalid') ||
                errorMsg.includes('session') ||
                errorMsg.includes('time out')
              ) {
                console.warn('[Axios] Token expired or invalid. Terminating active session...');
                store.dispatch(logout());
              }
            } catch (err) {}
          }
        }
        return Promise.reject(error);
      }
    );
  }

  get(endpoint: string) {
    return this.client.get<any>(endpoint);
  }

  post(endpoint: string, payload: any) {
    return this.client.post<any>(endpoint, payload);
  }

  postWithConfig(endpoint: string, payload: any, config: AxiosRequestConfig<any> | undefined) {
    return this.client.post<any>(endpoint, payload, config);
  }
}
