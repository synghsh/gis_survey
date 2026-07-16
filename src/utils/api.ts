import { store, updateToken, logout } from '../store';
import { getApiBaseUrl } from '../config';

/**
 * Executes a network fetch request, handles JWT header injection,
 * token automatic refresh (intercepting status 408), and invalid token logout (status 403).
 */
async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const base = await getApiBaseUrl();
  
  // Slashes and protocols normalization
  let url = base.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  
  // Format target URL
  const separator = url.endsWith('/') || path.startsWith('/') ? '' : '/';
  const fullUrl = `${url}${separator}${path}`;

  // Get active session token from Redux Store
  const token = store.getState().auth.token;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': token } : {}), // Pass raw token (No "Bearer " prefix based on Django middleware)
    ...(options.headers as Record<string, string> || {}),
  };

  // LOG REQUEST DETAILS
  const method = options.method || 'GET';
  console.log(`[API REQUEST] => ${method} ${fullUrl}`);
  if (options.body) {
    try {
      console.log(`[API REQUEST PAYLOAD] =>`, JSON.parse(options.body as string));
    } catch (e) {
      console.log(`[API REQUEST PAYLOAD] =>`, options.body);
    }
  }

  let response: Response;
  try {
    // Perform request
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (err: any) {
    // LOG NETWORK CONNECTION ERROR
    console.error(`[API NETWORK ERROR] => Failed connecting to ${fullUrl} | Message:`, err.message || err);
    throw err;
  }

  // LOG RESPONSE DETAILS
  console.log(`[API RESPONSE] <= Status ${response.status} | URL: ${fullUrl}`);
  try {
    const logClone = response.clone();
    const responseText = await logClone.text();
    try {
      console.log(`[API RESPONSE BODY] <=`, JSON.parse(responseText));
    } catch (e) {
      console.log(`[API RESPONSE BODY] <=`, responseText);
    }
  } catch (err: any) {
    console.error(`[API RESPONSE LOG ERROR] => Failed reading response payload:`, err.message || err);
  }

  // Handle Token Refresh window (Status 408)
  if (response.status === 408) {
    try {
      // Clone response to avoid consuming the original stream
      const refreshResponseClone = response.clone();
      const body = await refreshResponseClone.json();
      const newToken = body.Token || body.token;
      
      if (newToken) {
        console.log('[API] JWT refresh window hit. Dispatching updated token to storage...');
        
        // Save fresh token in Redux (autosaved to AsyncStorage via subscribe)
        store.dispatch(updateToken(newToken));

        // Re-attempt original request with the fresh token
        const retryHeaders = {
          ...headers,
          'Authorization': newToken,
        };
        
        console.log('[API] Retrying original request with new token...');
        response = await fetch(fullUrl, {
          ...options,
          headers: retryHeaders,
        });

        // LOG RETRIED RESPONSE DETAILS
        console.log(`[API RETRY RESPONSE] <= Status ${response.status} | URL: ${fullUrl}`);
        try {
          const logClone = response.clone();
          const responseText = await logClone.text();
          try {
            console.log(`[API RETRY RESPONSE BODY] <=`, JSON.parse(responseText));
          } catch (e) {
            console.log(`[API RETRY RESPONSE BODY] <=`, responseText);
          }
        } catch (err: any) {
          console.error(`[API RETRY RESPONSE LOG ERROR] => Failed reading response payload:`, err.message || err);
        }
      }
    } catch (err) {
      console.warn('[API] Failed to parse 408 response or retry request:', err);
    }
  }

  // Handle Token Expiry / Invalidation (Status 403 or 401)
  if (response.status === 403 || response.status === 401) {
    try {
      const authResponseClone = response.clone();
      const body = await authResponseClone.json();
      const errorMsg = (body.Message || body.message || '').toLowerCase();

      // Check if the 403 is due to token timeout/invalidity
      if (
        errorMsg.includes('token') ||
        errorMsg.includes('expired') ||
        errorMsg.includes('invalid') ||
        errorMsg.includes('session') ||
        errorMsg.includes('time out')
      ) {
        console.warn('[API] Token expired or invalid. Terminating active session...');
        store.dispatch(logout());
      }
    } catch (err) {
      // Not a JSON response or doesn't match token errors: ignore and let screen handle the 403
    }
  }

  return response;
}

export const api = {
  get: (path: string, headers?: Record<string, string>) =>
    request(path, { method: 'GET', headers }),

  post: (path: string, body: any, headers?: Record<string, string>) =>
    request(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  put: (path: string, body: any, headers?: Record<string, string>) =>
    request(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: (path: string, headers?: Record<string, string>) =>
    request(path, { method: 'DELETE', headers }),
};
