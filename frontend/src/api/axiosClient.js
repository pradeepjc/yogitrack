import axios from 'axios';

const axiosClient = axios.create({
  // In production (single Heroku app), frontend and API share an origin, so a
  // relative path works with no env var needed. Local dev overrides this via
  // VITE_API_URL since Vite (5173) and the API (5050) run on different ports.
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('yogitrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('yogitrack_token');
      localStorage.removeItem('yogitrack_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
