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
  // جلب جميع المستخدمين
  getUsers: async () => {
    const res = await api.get("/users");
    return res.data;
  },

  // إضافة مستخدم
  addUser: async (formData: FormData) => {
    const res = await api.post("/users", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  // تعديل مستخدم
  updateUser: async (id: number, formData: FormData) => {
    const res = await api.put(`/users/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  // حذف مستخدم
  deleteUser: async (id: number) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },

  // تعطيل مستخدم
  disableUser: async (id: number) => {
    const res = await api.put(`/users/${id}/disable`);
    return res.data;
  },

  // إعادة تعيين كلمة المرور
  resetPassword: async (id: number) => {
    const res = await api.post(`/users/${id}/reset-password`);
    return res.data;
  },
};


export default api;

