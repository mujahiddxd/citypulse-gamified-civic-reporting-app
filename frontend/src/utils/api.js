/**
 * src/utils/api.js — Centralized Axios HTTP Client
 * --------------------------------------------------
 * Instead of importing axios directly in every component,
 * all API calls go through this pre-configured axios instance.
 *
 * This gives us one place to:
 *   1. Set the base URL for all requests
 *   2. Automatically attach the correct auth token to every request
 *   3. Handle global errors (e.g. auto-logout on 401 Unauthorized)
 *
 * USAGE in any component:
 *   import api from '../utils/api';
 *   const { data } = await api.get('/complaints');
 *   const { data } = await api.post('/auth/login', { email, password });
 *
 * TOKEN SELECTION LOGIC:
 * ──────────────────────
 * The app has TWO types of auth tokens (see auth.js / admin-auth.js):
 *   1. Regular user → Supabase JWT stored as 'access_token' in localStorage
 *   2. Admin user   → Custom JWT stored as 'citypulse_admin_token' in localStorage
 *
 * For admin API routes (/admin/* or /analytics/*), the admin JWT is preferred.
 * For all other routes, the Supabase token is used (or admin token as fallback).
 */
import axios from 'axios';

// Create an axios instance with shared configuration.
// baseURL means all calls use relative paths: api.get('/complaints') → http://localhost:5000/api/complaints
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 second timeout — prevents hanging requests
});

// ── Request Interceptor ───────────────────────────────────────────────────────
// Runs BEFORE every request is sent.
// Reads the appropriate token from localStorage and adds it to the header.
api.interceptors.request.use((config) => {
  const adminJwt = localStorage.getItem('citypulse_admin_token'); // Admin JWT
  const supabaseToken = localStorage.getItem('access_token');         // User Supabase JWT

  // Detect if this request is targeting an admin-specific endpoint
  const isAdminApiCall = config.url?.startsWith('/admin') || config.url?.startsWith('/analytics');

  // For admin routes: prefer the admin JWT. For regular routes: prefer Supabase token.
  // Falls back to adminJwt if supabaseToken is absent (handles edge cases).
  const token = (isAdminApiCall && adminJwt) ? adminJwt : (supabaseToken || adminJwt);

  if (token) {
    // Attach the token as a Bearer token in the Authorization header
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config; // Must return config for the request to proceed
});

// ── Response Interceptor ──────────────────────────────────────────────────────
// Runs AFTER every response is received (or on error).
// Pass-through for successful responses; handle 401 errors globally.
api.interceptors.response.use(
  (response) => response, // Success: just pass it through unchanged

  (error) => {
    // On 401 Unauthorized: the token is invalid or expired.
    // Automatically log the user out and redirect to the appropriate login page.
    if (error.response?.status === 401) {
      const isAdminRoute = window.location.pathname.startsWith('/admin');

      if (isAdminRoute) {
        // Admin session expired → clear admin token and go to admin login
        localStorage.removeItem('citypulse_admin_token');
        window.location.href = '/admin-login';
      } else {
        // User session expired → clear user token and go to regular login
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    // Always re-throw the error so individual components can handle it too
    return Promise.reject(error);
  }
);

export default api;
