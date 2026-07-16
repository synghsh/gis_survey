import { Platform } from 'react-native';

export const environment = {
  production: !__DEV__,
  // Fall back to standard Platform emulator IPs if environment variable is not defined
  DEFAULT_API_BASE: process.env.EXPO_PUBLIC_API_URL || Platform.select({
    android: 'http://10.0.2.2:8000',
    default: 'http://127.0.0.1:8000',
  }) || 'http://127.0.0.1:8000',

  API_PREFIX: '/gis/administration/',

  URLS: {
    login: 'admin/login/',
    // Master list data for reference
    state_list: 'master/state/list/',
    district_list: 'master/district/list/',
    block_list: 'master/block/list/',
  }
};
