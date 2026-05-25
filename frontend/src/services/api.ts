import axios from 'axios';
import { queryClient } from '../lib/queryClient';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15_000,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Limpa o cache completo antes de redirecionar para evitar dados residuais de sessão
      queryClient.clear();
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      globalThis.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

export default api;
