import { GetStatesService, GetDistrictsService, GetBlocksService, GetVillagesService, GetContractorsService, GetDomainsService, GetTransformersService, GetConductorsService, GetPolesService } from '../../services/masterService';
import { setStates, setDistricts, setBlocks, setVillages, setContractors, setDomains, setTransformers, setConductors, setPoles } from '../index';

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

export const fetchVillagesAction = (
  stateId?: number,
  districtId?: number,
  blockId?: number,
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetVillagesService({ state_id: stateId, district_id: districtId, block_id: blockId })
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          const villagesList = response.data.Data.villages || response.data.Data || [];
          dispatch(setVillages(villagesList));
          successCallback?.(villagesList);
        } else {
          const errorMsg = response.data?.Message || 'Failed to retrieve villages';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get villages error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};

export const fetchContractorsAction = (
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetContractorsService()
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          const contractorsList = response.data.Data.contractors || response.data.Data || [];
          dispatch(setContractors(contractorsList));
          successCallback?.(contractorsList);
        } else {
          const errorMsg = response.data?.Message || 'Failed to retrieve contractors';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get contractors error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};

export const fetchDomainsAction = (
  domainTypes: string[],
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetDomainsService(domainTypes)
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          const domainsData = response.data.Data.Data || response.data.Data;
          dispatch(setDomains(domainsData));
          successCallback?.(domainsData);
        } else {
          const errorMsg = response.data?.Message || 'Failed to retrieve domains';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get domains error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};

export const fetchTransformersAction = (
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetTransformersService()
      .then((response: any) => {
        const payload = response.data?.Data || response.data;
        if (response.status === 200 && response.data && !response.data.Exception && payload && payload.transformers) {
          const transformersList = payload.transformers || [];
          dispatch(setTransformers(transformersList));
          successCallback?.(transformersList);
        } else {
          const errorMsg = response.data?.Message || payload?.Message || 'Failed to retrieve transformers';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get transformers error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};

export const fetchConductorsAction = (
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetConductorsService()
      .then((response: any) => {
        const payload = response.data?.Data || response.data;
        if (response.status === 200 && response.data && !response.data.Exception && payload && payload.conductors) {
          const conductorsList = payload.conductors || [];
          dispatch(setConductors(conductorsList));
          successCallback?.(conductorsList);
        } else {
          const errorMsg = response.data?.Message || payload?.Message || 'Failed to retrieve conductors';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get conductors error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};

export const fetchPolesAction = (
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetPolesService()
      .then((response: any) => {
        const payload = response.data?.Data || response.data;
        if (response.status === 200 && response.data && !response.data.Exception && payload && payload.poles) {
          const polesList = payload.poles || [];
          dispatch(setPoles(polesList));
          successCallback?.(polesList);
        } else {
          const errorMsg = response.data?.Message || payload?.Message || 'Failed to retrieve poles';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Get poles error:', error);
        errorCallback?.(error.message || 'Server connection error');
      });
  };
};



