import { serviceClient } from './authService';

export const GetStatesService = (payload?: any) => {
  return serviceClient.post('master/state/list/', payload || { is_active: true });
};

export const GetDistrictsService = (payload: { state_id?: number; is_active?: boolean }) => {
  return serviceClient.post('master/district/list/', { is_active: true, ...payload });
};

export const GetBlocksService = (payload: { state_id?: number; district_id?: number; page_size?: number; is_active?: boolean }) => {
  // Pass a large page_size to retrieve all blocks without UI pagination
  return serviceClient.post('master/block/list/', { is_active: true, page_size: 10000, ...payload });
};
