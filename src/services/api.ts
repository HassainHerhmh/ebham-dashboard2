import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

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


  /* =========================
     CITIES
  ========================= */
  cities: {
    getCities: async () => {
      const res = await api.get("/cities");
      return res.data;
    },

    addCity: async (name: string, delivery_fee: number) => {
      const res = await api.post("/cities", { name, delivery_fee });
      return res.data;
    },

    deleteCity: async (id: number) => {
      const res = await api.delete(`/cities/${id}`);
      return res.data;
    },

    /* =========================
       NEIGHBORHOODS
    ========================= */
    searchNeighborhoods: async (search: string) => {
      const res = await api.get("/neighborhoods", {
        params: { search },
      });
      return res.data;
    },

    addNeighborhood: async (
      city_id: number,
      name: string,
      delivery_fee: number
    ) => {
      const res = await api.post("/neighborhoods", {
        city_id,
        name,
        delivery_fee,
      });
      return res.data;
    },

   updateNeighborhood: async (
  id: number,
  city_id: number,
  name: string,
  delivery_fee: number
) => {
  const res = await api.put(`/neighborhoods/${id}`, {
    city_id,
    name,
    delivery_fee,
  });
  return res.data;
},


    deleteNeighborhood: async (id: number) => {
      const res = await api.delete(`/neighborhoods/${id}`);
      return res.data;
    },
  },

/* =========================
   CUSTOMER ADDRESSES
========================= */
customers: {
  // الموجودين عندك (اتركهم)
  getCustomers: async () => {
    const res = await api.get("/customers");
    return res.data;
  },

  addCustomer: async (data) => {
    const res = await api.post("/customers", data);
    return res.data;
  },

  updateCustomer: async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },

  deleteCustomer: async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },

  resetPassword: async (id) => {
    const res = await api.put(`/customers/${id}/reset-password`);
    return res.data;
  },

  /* 🔴 هذا الناقص */
  getAddresses: async () => {
    const res = await api.get("/customer-addresses");
    return res.data;
  },

  addAddress: async (data) => {
    const res = await api.post("/customer-addresses", data);
    return res.data;
  },

  deleteAddress: async (id: number) => {
    const res = await api.delete(`/customer-addresses/${id}`);
    return res.data;
  },
},

};

export default api;

