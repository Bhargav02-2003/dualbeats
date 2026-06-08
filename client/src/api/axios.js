import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Public routes that should NEVER trigger token refresh or redirect
const PUBLIC_URLS = ['/auth/me', '/auth/refresh', '/auth/login', '/auth/register', '/auth/verify-otp', '/auth/forgot-password', '/auth/reset-password'];
const PUBLIC_PATHS = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Include httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Response interceptor — handle 401 (token expired) by attempting a refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if request URL is a public/auth endpoint — skip refresh entirely
    const isPublicEndpoint = PUBLIC_URLS.some((u) => originalRequest.url?.includes(u));
    const isOnPublicPage = PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p));

    // Only attempt refresh for 401s on protected endpoints, and not already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/api/auth/refresh');
        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        // Only redirect to login if NOT already on a public page
        if (!isOnPublicPage) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
