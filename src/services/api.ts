import axios from "axios";

/* =========================
   Base API URL
========================= */
const API_URL = import.meta.env.VITE_API_URL;

/* =========================
   Axios Instance
========================= */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =========================
   Request Interceptor
========================= */
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch {}
  }
  return config;
});

/* =========================
   Export
========================= */
export default api;
