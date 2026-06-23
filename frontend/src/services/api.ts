import axios from 'axios';
import { queryClient } from '../lib/queryClient';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15_000,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      queryClient.clear();
      localStorage.removeItem('usuario');
      globalThis.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

export default api;
