import axios, { AxiosHeaders } from 'axios';
import { auth } from '../lib/firebase';

const getBaseURL = () => {
  return import.meta.env.VITE_API_URL || '/api';
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
});

// Interceptor to attach Firebase Token
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;
