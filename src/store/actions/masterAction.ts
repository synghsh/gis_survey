import { GetStatesService, GetDistrictsService, GetBlocksService } from '../../services/masterService';
import { setStates, setDistricts, setBlocks } from '../index';

export const fetchStatesAction = (
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetStatesService()
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          const statesList = response.data.Data.states || [];
          dispatch(setStates(statesList));
          successCallback?.(statesList);
        } else {
          const errorMsg = response.data?.Message || 'Failed to retrieve states';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get states error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};

export const fetchDistrictsAction = (
  stateId: number,
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetDistrictsService({ state_id: stateId })
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          const districtsList = response.data.Data.districts || [];
          dispatch(setDistricts(districtsList));
          successCallback?.(districtsList);
        } else {
          const errorMsg = response.data?.Message || 'Failed to retrieve districts';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get districts error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};

export const fetchBlocksAction = (
  stateId: number,
  districtId: number,
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetBlocksService({ state_id: stateId, district_id: districtId })
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          const blocksList = response.data.Data.blocks || [];
          dispatch(setBlocks(blocksList));
          successCallback?.(blocksList);
        } else {
          const errorMsg = response.data?.Message || 'Failed to retrieve blocks';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get blocks error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};
