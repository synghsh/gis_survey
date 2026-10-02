import { UserLoginService } from '../../services/authService';
import { login, logout } from '../index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../utils/api';
import { extractBackendErrorMessage } from '../../utils/errorHandler';

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

          const roleMapping: Record<number, string> = {
            1: 'Survey Administrator',
            2: 'Super Administrator',
          };
          const designationMapping: Record<number, string> = {
            1: 'Field Surveyor',
            2: 'Senior GIS Engineer',
          };
          
          const loginPayload = {
            token: token || null,
            user_id: userDetails.id || null,
            first_name: userDetails.first_name || '',
            middle_name: userDetails.middle_name || '',
            last_name: userDetails.last_name || '',
            username: userDetails.username || '',
            phone: userDetails.phone || '',
            email: userDetails.email || '',
            role_id: userDetails.role_id || null,
            role_name: userDetails.role_name || (userDetails.role_id ? roleMapping[userDetails.role_id] : '') || 'Field Surveyor',
            designation_id: userDetails.designation_id || null,
            designation_name: userDetails.designation_name || (userDetails.designation_id ? designationMapping[userDetails.designation_id] : '') || 'GIS Field Engineer',
            address: userDetails.address || '',
            district: userDetails.district || '',
            state: userDetails.state || '',
            pin: userDetails.pin || '',
            joining_date: userDetails.joining_date || null,
            user_type: userDetails.user_type || null,
            level: userDetails.level || null,
          };
          
          dispatch(login(loginPayload));
          successCallback?.(loginPayload);
          console.log('[AuthAction] User Login payload saved to store & AsyncStorage:', loginPayload);
        } else {
          const errorMsg = extractBackendErrorMessage(response.data) || 'Authentication Failed';
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        const errorMsg = extractBackendErrorMessage(error) || error.message || 'SERVER UNREACHABLE OR PORT CLOSED';
        console.error('🚨 [AuthAction] Login failed:', errorMsg);
        errorCallback?.(errorMsg);
      });
  };
};

export const userLogoutAction = () => {
  return async (dispatch: any) => {
    try {
      // Notify backend to invalidate the session
      await api.post('admin/logout/', {});
    } catch (e) {
      console.warn('[AuthAction] Backend logout failed:', e);
    }
    
    try {
      // Clear all local storage
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('[AuthAction] Failed to clear AsyncStorage:', e);
    }
    
    // Clear redux state
    dispatch(logout());
  };
};
