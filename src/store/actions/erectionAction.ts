import { 
  StartErectionService, 
  ListErectionService, 
  UpdateErectionService, 
  CompleteErectionService 
} from '../../services/erectionService';
import { startSurvey, setErectionList, updateErectionInList } from '../index';

export const startErectionAction = (
  payload: any,
  surveyPayload: any,
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return StartErectionService(payload)
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception) {
          dispatch(startSurvey(surveyPayload));
          successCallback?.(response.data.Data);
        } else {
          const errorMsg = response.data?.Error?.System_Errors?.[0]?.Message || response.data?.Message || 'Failed to start erection execution';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Axios erection start error:', error);
        const errorMsg = error.response?.data?.Message || error.message || 'Network error or server unreachable';
        errorCallback?.(errorMsg);
      });
  };
};

export const fetchErectionListAction = (
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return ListErectionService()
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          const list = response.data.Data.Data || [];
          dispatch(setErectionList(list));
          successCallback?.(list);
        } else {
          const errorMsg = response.data?.Message || 'Failed to fetch erection listing';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Axios erection list error:', error);
        const errorMsg = error.response?.data?.Message || error.message || 'Network error or server unreachable';
        errorCallback?.(errorMsg);
      });
  };
};

export const updateErectionAction = (
  payload: any,
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return UpdateErectionService(payload)
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception) {
          dispatch(updateErectionInList(payload));
          successCallback?.(response.data.Data);
        } else {
          const errorMsg = response.data?.Message || 'Failed to update erection';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Axios erection update error:', error);
        const errorMsg = error.response?.data?.Message || error.message || 'Network error or server unreachable';
        errorCallback?.(errorMsg);
      });
  };
};

export const completeErectionAction = (
  erectionId: number,
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return CompleteErectionService({ id: erectionId })
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception) {
          dispatch(updateErectionInList({ id: erectionId, status: 2 }));
          successCallback?.(response.data.Data);
        } else {
          const errorMsg = response.data?.Message || 'Failed to complete erection';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Axios erection complete error:', error);
        const errorMsg = error.response?.data?.Message || error.message || 'Network error or server unreachable';
        errorCallback?.(errorMsg);
      });
  };
};
