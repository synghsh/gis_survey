import RestService from '../store/reducers/rest';
import { environment } from '../environment';

const apiPrefix = environment.API_PREFIX || '/gis/administration/';

export const serviceClient = new RestService({
  baseURL: '',
});

export const UserLoginService = (data: any) => {
  // Normalize path format
  const separator = apiPrefix.endsWith('/') || environment.URLS.login.startsWith('/') ? '' : '/';
  const url = `${apiPrefix}${separator}${environment.URLS.login}`;
  return serviceClient.post(url, data);
};
