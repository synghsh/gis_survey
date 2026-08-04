import { UserLoginService } from '../../services/authService';
import { login } from '../index';

export const userLoginAction = (
  payload: any,
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return UserLoginService(payload)
      .then((response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          dispatch(login(response.data.Data));
          successCallback?.(response.data.Data);
        } else {
          const errorMsg = response.data?.Errors || response.data?.Data?.Message || 'Authentication Failed';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('Axios login connection error:', error);
        const errorMsg = error.response?.data?.Message || error.message || 'SERVER UNREACHABLE OR PORT CLOSED';
        errorCallback?.(errorMsg);
      });
  };
};
