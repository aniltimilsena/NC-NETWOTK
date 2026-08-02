import axios, { AxiosHeaders } from 'axios';
import { AuthService } from '../services/AuthService';
const getBaseURL = () => {
    return import.meta.env.VITE_API_URL || '/api';
};
const apiClient = axios.create({
    baseURL: getBaseURL(),
    timeout: 10000,
});
apiClient.interceptors.request.use(async (config) => {
    if (AuthService.isSignedIn()) {
        try {
            const token = await AuthService.getIdToken();
            if (token) {
                if (!config.headers) {
                    config.headers = new AxiosHeaders();
                }
                if (config.headers instanceof AxiosHeaders) {
                    config.headers.set('Authorization', `Bearer ${token}`);
                }
                else {
                    (config.headers as any).Authorization = `Bearer ${token}`;
                }
            }
        } catch (err) {
            console.warn('Failed to retrieve ID token for API request:', err);
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
export default apiClient;
