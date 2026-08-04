import { serviceClient } from './authService';
import { environment } from '../environment';

const apiPrefix = environment.API_PREFIX || '/gis/administration/';

export const GetStatesService = (payload?: any) => {
  const url = `${apiPrefix}master/state/list/`;
  return serviceClient.post(url, payload || { is_active: true });
};

export const GetDistrictsService = (payload: { state_id?: number; is_active?: boolean }) => {
  const url = `${apiPrefix}master/district/list/`;
  return serviceClient.post(url, { is_active: true, ...payload });
};

export const GetBlocksService = (payload: { state_id?: number; district_id?: number; page_size?: number; is_active?: boolean }) => {
  const url = `${apiPrefix}master/block/list/`;
  // Pass a large page_size to retrieve all blocks without UI pagination
  return serviceClient.post(url, { is_active: true, page_size: 10000, ...payload });
};
