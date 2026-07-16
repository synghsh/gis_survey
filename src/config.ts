import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from './environment';

const API_SERVER_KEY = 'GIS_API_SERVER_URL';

// Android emulator connects to the host machine via 10.0.2.2.
// iOS emulator or web utilizes local 127.0.0.1.
export const DEFAULT_API_BASE = environment.DEFAULT_API_BASE;

let cachedApiBaseUrl = DEFAULT_API_BASE;

/**
 * Loads the API base URL from AsyncStorage if configured, otherwise falls back to defaults.
 */
export const getApiBaseUrl = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem(API_SERVER_KEY);
    if (savedUrl) {
      cachedApiBaseUrl = savedUrl;
    } else {
      cachedApiBaseUrl = DEFAULT_API_BASE;
    }
  } catch (err) {
    console.warn('Failed to load custom API URL from storage:', err);
  }
  return cachedApiBaseUrl;
};

/**
 * Updates the custom API base URL in AsyncStorage.
 */
export const setApiBaseUrl = async (url: string): Promise<void> => {
  try {
    const trimmed = url.trim().replace(/\/$/, ''); // Remove trailing slash if present
    if (trimmed) {
      await AsyncStorage.setItem(API_SERVER_KEY, trimmed);
      cachedApiBaseUrl = trimmed;
    } else {
      await AsyncStorage.removeItem(API_SERVER_KEY);
      cachedApiBaseUrl = DEFAULT_API_BASE;
    }
  } catch (err) {
    console.warn('Failed to persist custom API URL to storage:', err);
  }
};

/**
 * Gets the currently cached API base URL in memory (synchronous).
 */
export const getCachedApiBaseUrl = () => cachedApiBaseUrl;

export const API_ENDPOINTS = {
  login: '/gis/administration/admin/login/',
};
