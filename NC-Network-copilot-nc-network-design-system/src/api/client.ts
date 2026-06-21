import axios, { AxiosHeaders } from 'axios';
import { auth } from '../lib/firebase';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Only default to localhost if we are running locally (on localhost or 127.0.0.1)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  // In production, use relative API URL to avoid triggering Private Network Access
  // permission prompts ("wants to access other apps and services on this device").
  return '/api';
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
