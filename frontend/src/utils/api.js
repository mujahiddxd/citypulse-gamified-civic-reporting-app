import axios from 'axios';

let rawBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
rawBase = rawBase.trim().replace(/\/$/, '');
if (!rawBase.endsWith('/api')) {
  rawBase = rawBase + '/api';
}

const api = axios.create({
  baseURL: rawBase,
  timeout: 30000,
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
