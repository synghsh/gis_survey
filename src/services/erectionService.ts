import { serviceClient } from './authService';
import { environment } from '../environment';

const apiPrefix = environment.API_PREFIX || '/gis/administration/';

export const StartErectionService = (data: any) => {
  const url = `${apiPrefix}erection/start/`;
  return serviceClient.post(url, data);
};

export const ListErectionService = () => {
  const url = `${apiPrefix}erection/list/`;
  return serviceClient.post(url, {});
};

export const UpdateErectionService = (data: any) => {
  const url = `${apiPrefix}erection/update/`;
  return serviceClient.post(url, data);
};

export const CompleteErectionService = (data: any) => {
  const url = `${apiPrefix}erection/complete/`;
  return serviceClient.post(url, data);
};
