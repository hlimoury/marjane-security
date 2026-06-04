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

// Supermarket-level Dispositifs
export const getSupermarketDispositifs = (supermarketId) => api.get(`/supermarket-dispositifs/${supermarketId}`);
export const saveSupermarketDispositifs = (supermarketId, data) => api.post(`/supermarket-dispositifs/${supermarketId}`, { data });

// Supermarket-level Scoring
export const getSupermarketScoring = (supermarketId) => api.get(`/supermarket-scoring/${supermarketId}`);
export const saveSupermarketScoring = (supermarketId, data) => api.post(`/supermarket-scoring/${supermarketId}`, { data });

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getDashboardCategory = (type) => api.get(`/dashboard/category/${type}`);
export const getDashboardSubCategories = (type, params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.region) searchParams.set('region', params.region);
  if (params.year) searchParams.set('year', params.year);
  if (params.month) searchParams.set('month', params.month);
  const qs = searchParams.toString();
  return api.get(`/dashboard/category/${type}/subcategories${qs ? '?' + qs : ''}`);
};
export const getDashboardSubCategoryDetail = (type, subcat, params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.region) searchParams.set('region', params.region);
  if (params.year) searchParams.set('year', params.year);
  if (params.month) searchParams.set('month', params.month);
  if (params.detail) searchParams.set('detail', params.detail);
  const qs = searchParams.toString();
  return api.get(`/dashboard/category/${type}/subcategory/${encodeURIComponent(subcat)}${qs ? '?' + qs : ''}`);
};

// Report generation (non-city users)
export const generateReport = (data) => api.post('/dashboard/report', data);

// Totals (all users)
export const getTotals = (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.year) searchParams.set('year', params.year);
  if (params.month) searchParams.set('month', params.month);
  const qs = searchParams.toString();
  return api.get(`/dashboard/totals${qs ? '?' + qs : ''}`);
};

export default api;
