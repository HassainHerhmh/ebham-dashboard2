import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
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
      localStorage.removeItem("user");
    }
  }
  return config;
});

/* =========================
   USERS
========================= */
(api as any).users = {
  getUsers: async () => (await api.get("/users")).data,

  addUser: async (formData: FormData) =>
    (await api.post("/users", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })).data,

  updateUser: async (id: number, formData: FormData) =>
    (await api.put(`/users/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })).data,

  deleteUser: async (id: number) =>
    (await api.delete(`/users/${id}`)).data,

  disableUser: async (id: number) =>
    (await api.put(`/users/${id}/disable`)).data,

  resetPassword: async (id: number) =>
    (await api.post(`/users/${id}/reset-password`)).data,
};

/* =========================
   CITIES & NEIGHBORHOODS
========================= */
(api as any).cities = {
  getCities: async () => (await api.get("/cities")).data,

  addCity: async (name: string, delivery_fee: number) =>
    (await api.post("/cities", { name, delivery_fee })).data,

  deleteCity: async (id: number) =>
    (await api.delete(`/cities/${id}`)).data,

  searchNeighborhoods: async (search: string) =>
    (await api.get("/neighborhoods", { params: { search } })).data,

  addNeighborhood: async (
    city_id: number,
    name: string,
    delivery_fee: number
  ) =>
    (await api.post("/neighborhoods", {
      city_id,
      name,
      delivery_fee,
    })).data,

  updateNeighborhood: async (
    id: number,
    city_id: number,
    name: string,
    delivery_fee: number
  ) =>
    (await api.put(`/neighborhoods/${id}`, {
      city_id,
      name,
      delivery_fee,
    })).data,

  deleteNeighborhood: async (id: number) =>
    (await api.delete(`/neighborhoods/${id}`)).data,
};

/* =========================
   CUSTOMERS & ADDRESSES
========================= */
(api as any).customers = {
  getCustomers: async () => (await api.get("/customers")).data,

  addCustomer: async (data: any) =>
    (await api.post("/customers", data)).data,

  updateCustomer: async (id: number, data: any) =>
    (await api.put(`/customers/${id}`, data)).data,

  deleteCustomer: async (id: number) =>
    (await api.delete(`/customers/${id}`)).data,

  resetPassword: async (id: number) =>
    (await api.put(`/customers/${id}/reset-password`)).data,

  getAddresses: async () =>
    (await api.get("/customer-addresses")).data,

  addAddress: async (data: any) =>
    (await api.post("/customer-addresses", data)).data,

  deleteAddress: async (id: number) =>
    (await api.delete(`/customer-addresses/${id}`)).data,
};

export default api;
