import { StartErectionService } from '../../services/erectionService';
import { startSurvey } from '../index';

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
