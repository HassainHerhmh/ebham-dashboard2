import axios from "axios";

const RAW_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = RAW_URL.endsWith("/api")
  ? RAW_URL
  : `${RAW_URL}/api`;


const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


/* =========================
   USERS
========================= */
getUsers: async (config?: any) =>
  (await api.get("/users", config)).data,



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

(api as any).neighborhoods = {
  getByCity: async (cityId: number) =>
    (await api.get(`/neighborhoods/by-city/${cityId}`)).data,
};

/* =========================
   TYPES
========================= */
(api as any).types = {
  getTypes: async () =>
    (await api.get("/types")).data,

  addType: async (formData: FormData) =>
    (
      await api.post("/types", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data,

  updateType: async (id: number, formData: FormData) =>
    (
      await api.put(`/types/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data,

  deleteType: async (id: number) =>
    (await api.delete(`/types/${id}`)).data,
};


/* ===============================
   🟢 جلب جميع الوحدات
================================ */
export const getUnits = async (): Promise<Unit[]> => {
  const res = await api.get<UnitsResponse>("/units");
  return res.data.units;
};

/* ===============================
   ✅ إضافة وحدة
================================ */
export const createUnit = async (name: string) => {
  const res = await api.post("/units", { name });
  return res.data;
};

/* ===============================
   ✏️ تعديل وحدة
================================ */
export const updateUnit = async (id: number, name: string) => {
  const res = await api.put(`/units/${id}`, { name });
  return res.data;
};

/* ===============================
   🗑️ حذف وحدة
================================ */
export const deleteUnit = async (id: number) => {
  const res = await api.delete(`/units/${id}`);
  return res.data;
};


/* ===============================
   🟢 جلب جميع الفئات
================================ */
export const getCategories = async (): Promise<Category[]> => {
  const res = await api.get<CategoriesResponse>("/categories");
  return res.data.categories;
};

/* ===============================
   ✅ إضافة فئة جديدة (مع صورة)
================================ */
export const createCategory = async (formData: FormData) => {
  const res = await api.post("/categories", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

/* ===============================
   ✏️ تعديل فئة
================================ */
export const updateCategory = async (id: number, formData: FormData) => {
  const res = await api.put(`/categories/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

/* ===============================
   🗑️ حذف فئة
================================ */
export const deleteCategory = async (id: number) => {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
};

/* ===============================
   🟢 جلب جميع المنتجات
================================ */
export const getProducts = async (): Promise<Product[]> => {
  const res = await api.get<ProductsResponse>("/products");
  return res.data.products;
};

/* ===============================
   ✅ إضافة منتج جديد (مع صورة)
================================ */
export const createProduct = async (formData: FormData) => {
  const res = await api.post("/products", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

/* ===============================
   ✏️ تعديل منتج
================================ */
export const updateProduct = async (id: number, formData: FormData) => {
  const res = await api.put(`/products/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

/* ===============================
   🗑️ حذف منتج
================================ */
export const deleteProduct = async (id: number) => {
  const res = await api.delete(`/products/${id}`);
  return res.data;
};

/* ===============================
   🟢 جلب جميع المطاعم
================================ */
export const getRestaurants = async (): Promise<Restaurant[]> => {
  const res = await api.get("/restaurants");
  return res.data.restaurants;
};

/* ===============================
   ✅ إضافة مطعم جديد (مع صورة + موقع)
================================ */
export const createRestaurant = async (formData: FormData) => {
  const res = await api.post("/restaurants", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

/* ===============================
   ✏️ تعديل مطعم
================================ */
export const updateRestaurant = async (id: number, formData: FormData) => {
  const res = await api.put(`/restaurants/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

/* ===============================
   🗑️ حذف مطعم
================================ */
export const deleteRestaurant = async (id: number) => {
  const res = await api.delete(`/restaurants/${id}`);
  return res.data;
};



 /* =========================
   CAPTAINS
========================= */
(api as any).captains = {
  getCaptains: async () =>
    (await api.get("/captains")).data.captains,

  addCaptain: async (data: any) =>
    (await api.post("/captains", data)).data,

  updateCaptain: async (id: number, data: any) =>
    (await api.put(`/captains/${id}`, data)).data,

  deleteCaptain: async (id: number) =>
    (await api.delete(`/captains/${id}`)).data,

  updateStatus: async (id: number, status: string) =>
    (await api.put(`/captains/${id}/status`, { status })).data,
};

/* =========================
   PAYMENT METHODS
========================= */
(api as any).paymentMethods = {
  // جلب جميع طرق الدفع (للإدارة)
  getAll: async () =>
    (await api.get("/payment-methods")).data.methods,

  // جلب الطرق المفعّلة فقط (للطلبات)
  getActive: async () =>
    (await api.get("/payment-methods/active")).data.methods,

  // إضافة طريقة دفع
  add: async (data: any) =>
    (await api.post("/payment-methods", data)).data,

  // تعديل طريقة دفع
  update: async (id: number, data: any) =>
    (await api.put(`/payment-methods/${id}`, data)).data,

  // حذف طريقة دفع
  remove: async (id: number) =>
    (await api.delete(`/payment-methods/${id}`)).data,

  // تفعيل / تعطيل
  toggle: async (id: number, is_active: boolean | number) =>
    (await api.patch(`/payment-methods/${id}/toggle`, { is_active })).data,

  // إعادة ترتيب
  reorder: async (orders: { id: number; sort_order: number }[]) =>
    (await api.post("/payment-methods/reorder", { orders })).data,

  // جلب سجل التغييرات
  getLogs: async (id: number, days?: number) =>
    (
      await api.get(`/payment-methods/${id}/logs`, {
        params: days ? { days } : {},
      })
    ).data.logs,
};

export default api;
