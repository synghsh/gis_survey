import { UserLoginService } from '../../services/authService';
import { login } from '../index';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const userLoginAction = (
  payload: any,
  successCallback?: (data: any) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return UserLoginService(payload)
      .then(async (response: any) => {
        if (response.status === 200 && response.data && !response.data.Exception && response.data.Data) {
          const token = response.data.Token;
          const userDetails = response.data.Data.user_details || {};
          
          // Save both user details and token in AsyncStorage
          await AsyncStorage.setItem('user', JSON.stringify(response.data));
          if (token) {
            await AsyncStorage.setItem('token', token);
          }
          
          const loginPayload = {
            token: token || null,
            user_id: userDetails.id || null,
            first_name: userDetails.first_name || '',
            last_name: userDetails.last_name || '',
            username: userDetails.username || '',
            phone: userDetails.phone || '',
            email: userDetails.email || '',
            role_name: userDetails.role_name || '',
            designation_name: userDetails.designation_name || '',
          };
          
          dispatch(login(loginPayload));
          successCallback?.(loginPayload);
          console.log('[AuthAction] User Login payload saved to store & AsyncStorage:', loginPayload);
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
