import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem("user");

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch {
      // لو البيانات فاسدة نمسحها
      localStorage.removeItem("user");
    }
  }

  return config;
});

/* =========================
   Users API
========================= */
api.users = {
  getUsers: async () => {
    const res = await api.get("/users");
    return res.data;
  },

  addUser: async (formData: FormData) => {
    const res = await api.post("/users", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  updateUser: async (id: number, formData: FormData) => {
    const res = await api.put(`/users/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteUser: async (id: number) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },

  disableUser: async (id: number) => {
    const res = await api.put(`/users/${id}/disable`);
    return res.data;
  },

  resetPassword: async (id: number) => {
    const res = await api.post(`/users/${id}/reset-password`);
    return res.data;
  },
};

export default api;

