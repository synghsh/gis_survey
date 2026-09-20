import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store, updateToken, logout } from '../index';
import { getApiBaseUrl } from '../../config';
import { extractBackendErrorMessage } from '../../utils/errorHandler';

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

        const token = await AsyncStorage.getItem('token') || store.getState().auth.token;
        if (token && !!config.headers) {
          if (typeof config.headers.set === 'function') {
            config.headers.set('Authorization', token);
          } else {
            config.headers['Authorization'] = token;
          }
        }

        const isFormData = config.data instanceof FormData || (config.data && Array.isArray((config.data as any)?._parts));
        if (isFormData && config.headers) {
          // In React Native Axios, DO NOT manually pass 'Content-Type': 'multipart/form-data'.
          // Stripping it allows the underlying XHR polyfill to automatically set the boundary:
          // e.g. multipart/form-data; boundary=----WebKitFormBoundary...
          if (typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type');
            config.headers.delete('content-type');
          } else {
            delete config.headers['Content-Type'];
            delete (config.headers as any)['content-type'];
          }
        }

        const fullUrl = `${config.baseURL?.replace(/\/$/, '')}/${(config.url || '').replace(/^\//, '')}`;
        console.log(`🚀 [AXIOS REQ] => ${config.method?.toUpperCase()} ${fullUrl}`);

        if (isFormData) {
          const parts = (config.data as any)?._parts || [];
          const summary = parts.map(([k, v]: [string, any]) => {
            if (v && typeof v === 'object' && v.uri) {
              return `  • ${k}: [FILE] ${v.name || 'unnamed'} (${v.type || 'unknown'}), uri=${v.uri}`;
            }
            return `  • ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`;
          });
          console.log(`📋 [AXIOS REQ FORM-DATA]\n${summary.join('\n')}`);
        } else if (config.data) {
          try {
            console.log(`📦 [AXIOS REQ PAYLOAD] =>\n${JSON.stringify(config.data, null, 2)}`);
          } catch {
            console.log(`📦 [AXIOS REQ PAYLOAD] =>`, config.data);
          }
        }

        return config;
      },
      error => {
        console.error('🚨 [AXIOS REQ ERROR] =>', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      async response => {
        const config = response.config;
        const fullUrl = `${config.baseURL?.replace(/\/$/, '')}/${(config.url || '').replace(/^\//, '')}`;
        console.log(`✅ [AXIOS RES] <= Status ${response.status} | URL: ${fullUrl}`);
        if (response.data) {
          try {
            console.log(`📦 [AXIOS RES BODY] <=\n${JSON.stringify(response.data, null, 2)}`);
          } catch {
            console.log(`📦 [AXIOS RES BODY] <=`, response.data);
          }
        }
        return response;
      },
      async error => {
        const response = error.response;
        const config = error.config || {};
        const fullUrl = `${config.baseURL?.replace(/\/$/, '')}/${(config.url || '').replace(/^\//, '')}`;
        const status = response?.status || 'NETWORK_ERROR';
        const backendMessage = extractBackendErrorMessage(error);
        
        console.error(`🚨 [AXIOS ERROR RESPONSE] <= Status ${status} | URL: ${fullUrl}`);
        console.error(`💥 [AXIOS BACKEND ERROR] <= ${backendMessage}`);

        if (response?.data) {
          try {
            console.error(`📦 [AXIOS ERROR BODY] <=\n${JSON.stringify(response.data, null, 2)}`);
          } catch {
            console.error(`📦 [AXIOS ERROR BODY] <=`, response.data);
          }
        } else {
          console.error(`⚠️ [AXIOS ERROR DETAILS] <= ${error.message || error}`);
        }

        if (response) {
          // Handle Token Refresh window (Status 408)
          if (response.status === 408 && !config._retry) {
            config._retry = true;
            try {
              const body = response.data;
              const newToken = body?.Token || body?.token;
              if (newToken) {
                console.log('[Axios] JWT refresh window hit. Dispatching updated token to storage...');
                store.dispatch(updateToken(newToken));
                await AsyncStorage.setItem('token', newToken);
                if (config.headers) {
                  if (typeof config.headers.set === 'function') {
                    config.headers.set('Authorization', newToken);
                  } else {
                    config.headers['Authorization'] = newToken;
                  }
                }
                return this.client(config);
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

  post(endpoint: string, payload: any, config?: AxiosRequestConfig) {
    return this.client.post<any>(endpoint, payload, config);
  }

  patch(endpoint: string, payload: any) {
    return this.client.patch<any>(endpoint, payload);
  }

  put(endpoint: string, payload: any) {
    return this.client.put<any>(endpoint, payload);
  }

  postWithConfig(endpoint: string, payload: any, config: AxiosRequestConfig<any> | undefined) {
    return this.client.post<any>(endpoint, payload, config);
  }
}
