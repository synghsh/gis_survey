import { serviceClient } from './authService';
import { environment } from '../environment';

const apiPrefix = environment.API_PREFIX || '/gis/administration/';

export const StartErectionService = (data: any) => {
  const url = `${apiPrefix}erection/start/`;
  return serviceClient.post(url, data);
};
