
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api',
});

export const getStatus = async () => (await api.get('/status')).data;
export const installCA = async () => (await api.post('/install-ca')).data;
export const uninstallCA = async () => (await api.post('/uninstall-ca')).data;
export const getCertificates = async () => (await api.get('/certificates')).data;
export const createCertificate = async (domains: string[], name: string) => (await api.post('/certificates', { domains, name })).data;
export const deleteCertificate = async (id: number) => (await api.delete(`/certificates/${id}`)).data;
export const renewCertificate = async (id: number) => (await api.post(`/certificates/${id}/renew`)).data;
export const getDownloadUrl = (id: number) => `http://localhost:3001/api/certificates/${id}/download`;
export const getCADownloadUrl = () => `http://localhost:3001/api/ca-download`;

export default api;
