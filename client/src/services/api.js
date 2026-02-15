import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (username, password) => api.post('/auth/login', { username, password });
export const getMe = () => api.get('/auth/me');

// Supermarkets
export const getSupermarkets = () => api.get('/supermarkets');
export const getSupermarket = (id) => api.get(`/supermarkets/${id}`);
export const createSupermarket = (data) => api.post('/supermarkets', data);
export const updateSupermarket = (id, data) => api.put(`/supermarkets/${id}`, data);
export const deleteSupermarket = (id) => api.delete(`/supermarkets/${id}`);

// Instances
export const getInstances = (supermarketId) => api.get(`/instances/supermarket/${supermarketId}`);
export const getInstance = (id) => api.get(`/instances/${id}`);
export const createInstance = (data) => api.post('/instances', data);
export const updateInstance = (id, data) => api.put(`/instances/${id}`, data);
export const deleteInstance = (id) => api.delete(`/instances/${id}`);

// Caracteristiques
export const getCaracteristique = (type, instanceId) => api.get(`/caracteristiques/${type}/${instanceId}`);
export const saveCaracteristique = (type, instanceId, data) => api.post(`/caracteristiques/${type}/${instanceId}`, { data });

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

export default api;
