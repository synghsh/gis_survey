import { GetDashboardMetricsService, DashboardApiResponse } from '../../services/dashboardService';

export const fetchDashboardMetricsAction = (
  payload?: any,
  successCallback?: (data: DashboardApiResponse) => void,
  errorCallback?: (error: any) => void
) => {
  return (dispatch: any) => {
    return GetDashboardMetricsService(payload || {})
      .then((response: any) => {
        if (response && (response.status === 200 || response.data?.status_code === 200) && response.data && !response.data.Exception) {
          let metricsData = response.data?.Data?.Data || response.data?.Data?.data || response.data?.Data || response.data?.data || response.data;
          if (metricsData && (metricsData.Data || metricsData.data) && (metricsData.Data?.kpi || metricsData.data?.kpi)) {
            metricsData = metricsData.Data || metricsData.data;
          }
          console.log('📊 [DASHBOARD METRICS API SUCCESS] =>', {
            hasKpi: !!metricsData?.kpi,
            totalPoles: metricsData?.kpi?.total_poles_erected,
            totalSurveys: metricsData?.recent_surveys?.length,
            totalErections: metricsData?.recent_erections?.length,
          });
          successCallback?.(metricsData);
          return metricsData;
        } else {
          const errorMsg =
            response.data?.Error?.System_Errors?.[0]?.Message ||
            response.data?.Message ||
            'Failed to fetch dashboard metrics';
          console.warn('📊 [DASHBOARD METRICS API BUSINESS ERROR] =>', errorMsg);
          errorCallback?.(errorMsg);
        }
      })
      .catch((error: any) => {
        console.warn('📊 [DASHBOARD METRICS API NETWORK ERROR] =>', error);
        const errorMsg =
          error.response?.data?.Message || error.message || 'Network error or server unreachable';
        errorCallback?.(errorMsg);
      });
  };
};
