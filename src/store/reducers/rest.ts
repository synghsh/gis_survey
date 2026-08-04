import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

        const token = await AsyncStorage.getItem('token') || store.getState().auth.token;
        if (token && !!config.headers) {
          if (typeof config.headers.set === 'function') {
            config.headers.set('Authorization', token);
          } else {
            config.headers['Authorization'] = token;
          }
        }

        const fullUrl = `${config.baseURL.replace(/\/$/, '')}/${(config.url || '').replace(/^\//, '')}`;
        console.log(`[AXIOS REQUEST] => ${config.method?.toUpperCase()} ${fullUrl}`);
        if (config.data) {
          console.log(`[AXIOS REQUEST PAYLOAD] =>`, config.data);
        }

        return config;
      },
      error => {
        console.error('[AXIOS REQUEST ERROR] =>', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      async response => {
        const config = response.config;
        const fullUrl = `${config.baseURL?.replace(/\/$/, '')}/${(config.url || '').replace(/^\//, '')}`;
        console.log(`[AXIOS RESPONSE] <= Status ${response.status} | URL: ${fullUrl}`);
        console.log(`[AXIOS RESPONSE BODY] <=`, response.data);
        return response;
      },
      async error => {
        const response = error.response;
        const config = error.config || {};
        const fullUrl = `${config.baseURL?.replace(/\/$/, '')}/${(config.url || '').replace(/^\//, '')}`;
        
        console.error(`[AXIOS ERROR RESPONSE] <= Status ${response?.status || 'network_error'} | URL: ${fullUrl}`);
        if (response?.data) {
          console.error(`[AXIOS ERROR RESPONSE BODY] <=`, response.data);
        } else {
          console.error(`[AXIOS ERROR MESSAGE] <=`, error.message || error);
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

  post(endpoint: string, payload: any) {
    return this.client.post<any>(endpoint, payload);
  }

  postWithConfig(endpoint: string, payload: any, config: AxiosRequestConfig<any> | undefined) {
    return this.client.post<any>(endpoint, payload, config);
  }
}
