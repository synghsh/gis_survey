import { serviceClient } from './authService';
import { environment } from '../environment';

const apiPrefix = environment.API_PREFIX || '/gis/administration/';

export const StartErectionService = (data: any) => {
  const url = `${apiPrefix}erection/start/`;
  return serviceClient.post(url, data);
};

export const ListErectionService = () => {
  const url = `${apiPrefix}erection/list/`;
  return serviceClient.post(url, {});
};

export const UpdateErectionService = (data: any) => {
  const url = `${apiPrefix}erection/update/`;
  return serviceClient.post(url, data);
};

export const CompleteErectionService = (data: any) => {
  const url = `${apiPrefix}erection/complete/`;
  return serviceClient.post(url, data);
};

export const SaveErectionNodeService = (data: any) => {
  const url = `${apiPrefix}erection/node/save/`;
  return serviceClient.post(url, data);
};

export const PatchErectionNodeService = (data: any) => {
  const url = `${apiPrefix}erection/node/save/`;
  return serviceClient.patch(url, data);
};

export const UpdateErectionNodeService = (data: any) => {
  const url = `${apiPrefix}erection/node/save/`;
  return serviceClient.post(url, data);
};

export const GetErectionPoleDetailsService = (data: { drawing_no?: string; erection_id?: number; pole_no?: string; node_id?: number }) => {
  const url = `${apiPrefix}erection/pole/details/`;
  return serviceClient.post(url, data);
};

export const UploadErectionImageService = (formData: FormData) => {
  const url = `${apiPrefix}s3/upload/`;
  return serviceClient.post(url, formData, {
    transformRequest: (data: any) => data,
  });
};

export const GetSignedUrlService = (docIdOrKey: string) => {
  const url = `${apiPrefix}s3/sign/`;
  return serviceClient.post(url, { doc_id: docIdOrKey });
};

export const UpdateSpanDistanceService = (data: {
  node_id?: number | string;
  name_label?: string;
  node_name?: string;
  parent_label?: string;
  parent_node?: string;
  span_distance?: string | number;
  distance?: string | number;
  drawing_no?: string;
  erection_id?: number;
  survey_id?: number | string;
}) => {
  const url = `${apiPrefix}erection/span/update/`;
  return serviceClient.post(url, data);
};
