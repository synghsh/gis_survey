import { serviceClient } from './authService';
import { environment } from '../environment';

const apiPrefix = environment.API_PREFIX || '/gis/administration/';

export interface DashboardApiResponse {
  kpi: {
    poles_erected_today: number;
    total_poles_erected: number;
    dtrs_installed_today: number;
    total_dtrs_installed: number;
    cable_strung_km_today: number;
    total_cable_strung_km: number;
    survey_route_km_today: number;
    total_survey_route_km: number;
  };
  erection_mix_graph: Array<{
    day: string;
    date: string;
    poles: number;
    dtr: number;
    cableMeters: number;
  }>;
  survey_progress_graph: Array<{
    day: string;
    date: string;
    km: number;
    meters: number;
  }>;
  recent_surveys: Array<{
    id: string;
    location: string;
    subLocation: string;
    voltageClass: '33KV HT' | '11KV HT' | 'LT 440V';
    polesCount: number;
    dtrCount: number;
    distanceMeters: number;
    timeAgo: string;
    status: 'SYNCED' | 'PENDING';
  }>;
  recent_erections: Array<{
    id: string;
    drawingNo: string;
    location: string;
    subLocation: string;
    voltageType: string;
    contractor: string;
    erectedPoles: number;
    totalPoles: number;
    status: 'IN PROGRESS' | 'COMPLETED';
    updated_on: string;
  }>;
}

export const GetDashboardMetricsService = (data: any = {}) => {
  const url = `${apiPrefix}dashboard/metrics/`;
  return serviceClient.post(url, data);
};
