/**
 * Axios API client configuration
 * 
 * Centralized HTTP client with interceptors for auth,
 * error handling, and base URL configuration.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2min timeout for scraping requests
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('busfare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('busfare_token');
      localStorage.removeItem('busfare_user');
      // Only redirect if not already on auth page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Search API (live scraping + city search) ─
export const searchAPI = {
  searchBuses: (data) => api.post('/search', data),
  searchCities: (q) => api.get('/cities', { params: { q }, timeout: 8000 }),
};

// ─── Track API ────────────────────────────────
export const trackAPI = {
  create: (data) => api.post('/track', data),
  getAll: (params) => api.get('/tracks', { params }),
  getOne: (id) => api.get(`/tracks/${id}`),
  stop: (id) => api.patch(`/tracks/${id}/stop`),
  remove: (id) => api.delete(`/tracks/${id}`),
  getHistory: (id, limit = 50) => api.get(`/tracks/${id}/history`, { params: { limit } }),
  checkNow: (id) => api.post(`/tracks/${id}/check`),
};

export default api;
