import axios, { AxiosHeaders } from 'axios';
import { auth } from '../lib/firebase';
const getBaseURL = () => {
    return import.meta.env.VITE_API_URL || '/api';
};
const apiClient = axios.create({
    baseURL: getBaseURL(),
    timeout: 10000,
});
apiClient.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        try {
            const token = await user.getIdToken();
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
            console.warn('Failed to retrieve Firebase ID token for API request:', err);
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
export default apiClient;
