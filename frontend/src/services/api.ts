
import axios from 'axios';

const isProd = import.meta.env.PROD;
const apiBaseUrl = isProd ? '/api' : 'http://localhost:3001/api';
const downloadBaseUrl = apiBaseUrl.replace(/\/?api$/, '');
const buildDownloadUrl = (path: string) => `${downloadBaseUrl}${path}`;

const api = axios.create({
    baseURL: apiBaseUrl,
});

export const getStatus = async () => (await api.get('/status')).data;
export const installCA = async () => (await api.post('/install-ca')).data;
export const uninstallCA = async () => (await api.post('/uninstall-ca')).data;
export const getCertificates = async () => (await api.get('/certificates')).data;
export const createCertificate = async (domains: string[], name: string) => (await api.post('/certificates', { domains, name })).data;
export const deleteCertificate = async (id: number) => (await api.delete(`/certificates/${id}`)).data;
export const renewCertificate = async (id: number) => (await api.post(`/certificates/${id}/renew`)).data;
export const getDownloadUrl = (id: number) => {
    return buildDownloadUrl(`/api/certificates/${id}/download`);
};
export const getAllCertificatesDownloadUrl = () => {
    return buildDownloadUrl('/api/exportall');
};
export const exportAllCertificates = async () =>
    api.get('/exportall', { responseType: 'blob' });
export const getCADownloadUrl = () => {
    return buildDownloadUrl('/api/ca-download');
};

export default api;
