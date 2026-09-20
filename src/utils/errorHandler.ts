/**
 * Comprehensive error extractor for enterprise Django / ASRLM and standard REST responses.
 */
export function extractBackendErrorMessage(errorOrData: any): string {
  if (!errorOrData) {
    return 'An unknown error occurred.';
  }

  // 1. If an AxiosError is passed, unpack response data or network message
  let data = errorOrData;
  let status: number | undefined = undefined;

  if (errorOrData.isAxiosError || errorOrData.response) {
    data = errorOrData.response?.data;
    status = errorOrData.response?.status;
  }

  if (typeof data === 'string') {
    // If it's an HTML error page (e.g. 502/500/404 from Nginx or Django debug page)
    if (data.includes('<html') || data.includes('<!doctype') || data.includes('<!DOCTYPE')) {
      const match = /<title>(.*?)<\/title>/i.exec(data);
      if (match && match[1]) {
        return `Server Error: ${match[1].trim()}`;
      }
      return status ? `Server returned HTTP error ${status}` : 'Server returned an HTML error page';
    }
    return data;
  }

  if (data && typeof data === 'object') {
    // 2. Check enterprise ASRLM / GIS structured errors: Errors.Business_Errors
    if (data.Errors) {
      const errors = data.Errors;
      if (Array.isArray(errors.Business_Errors) && errors.Business_Errors.length > 0) {
        const msgs = errors.Business_Errors.map((e: any) => e.Message || e.Code || JSON.stringify(e));
        return msgs.join('; ');
      }
      if (Array.isArray(errors.System_Errors) && errors.System_Errors.length > 0) {
        const msgs = errors.System_Errors.map((e: any) => e.Message || e.Code || JSON.stringify(e));
        return msgs.join('; ');
      }
      if (Array.isArray(errors.Warning_Errors) && errors.Warning_Errors.length > 0) {
        const msgs = errors.Warning_Errors.map((e: any) => e.Message || e.Code || JSON.stringify(e));
        return msgs.join('; ');
      }
      if (typeof errors === 'string') {
        return errors;
      }
    }

    // 3. Check Data.Message or Data['Status Message']
    if (data.Data && typeof data.Data === 'object') {
      if (data.Data.Message && typeof data.Data.Message === 'string') {
        return data.Data.Message;
      }
      if (data.Data['Status Message'] && typeof data.Data['Status Message'] === 'string') {
        return data.Data['Status Message'];
      }
    }

    // 4. Check top-level standard fields
    if (data.Message && typeof data.Message === 'string') return data.Message;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.detail && typeof data.detail === 'string') return data.detail;
    if (data.error) {
      return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    }
  }

  // 5. Fallback based on HTTP status codes
  if (status === 413) {
    return 'Image file too large (HTTP 413). Maximum allowed size is 5MB.';
  }
  if (status === 400) {
    return 'Bad Request (HTTP 400). Please check form parameters and attachments.';
  }
  if (status === 401 || status === 403) {
    return 'Access denied or session expired (HTTP ' + status + '). Please log in again.';
  }
  if (status === 404) {
    return 'Resource not found on server (HTTP 404).';
  }
  if (status === 500) {
    return 'Internal Server Error (HTTP 500). Please try again or check server logs.';
  }

  // 6. Network error / Axios error message fallback
  if (errorOrData.message && typeof errorOrData.message === 'string') {
    return errorOrData.message;
  }

  return 'Server returned an error without a message.';
}
