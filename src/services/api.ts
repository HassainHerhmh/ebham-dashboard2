import axios from "axios";

/* =========================
   🔗 Base URL
========================= */
const API_URL = import.meta.env.VITE_API_URL;

/* =========================
   🟢 Axios Instance
========================= */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =========================
   🔐 Interceptor (JWT)
========================= */
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem("user");

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch {
      localStorage.removeItem("user");
    }
  }

  return config;
});

/* ======================================================
   👤 USERS API
====================================================== */
const users = {
  getUsers: async () => {
    const res = await api.get("/users");
    return res.data;
  },

  addUser: async (data: any) => {
    const res = await api.post("/users", data);
    return res.data;
  },

  updateUser: async (id: number, data: any) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: number) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },

  disableUser: async (id: number) => {
    const res = await api.post(`/users/${id}/disable`);
    return res.data;
  },

  resetPassword: async (id: number) => {
    const res = await api.post(`/users/${id}/reset-password`);
    return res.data;
  },
};

/* ======================================================
   🧩 SECTIONS API (اختياري – لا يكسر الصفحة)
====================================================== */
const sections = {
  getSections: async () => {
    try {
      const res = await api.get("/sections");
      return res.data;
    } catch {
      return [];
    }
  },
};

/* ======================================================
   📦 Export
====================================================== */
export default {
  users,
  sections,
};
