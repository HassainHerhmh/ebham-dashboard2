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

  // 🔹 ربط الفرع المختار من الهيدر
  const branchId = localStorage.getItem("branch_id");
  if (branchId) {
    config.headers["x-branch-id"] = branchId;
  }

  return config;
});

/* =========================
   USERS
========================= */
(api as any).users = {
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

/* ===============================
   🟢 جلب الأحياء
================================ */
export const getNeighborhoods = async (search = "") => {
  const headers: any = {};
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdminBranch = Boolean(user?.is_admin_branch);
  const selected = localStorage.getItem("branch_id");

  if (isAdminBranch) {
    // لا نرسل فرع الإدارة نفسه
    if (selected && Number(selected) !== Number(user?.branch_id)) {
      headers["x-branch-id"] = selected;
    }
  } else if (user?.branch_id) {
    headers["x-branch-id"] = user.branch_id;
  }

  const res = await api.get("/neighborhoods", {
    params: { search },
    headers,
  });

  return res.data;
};

/* ===============================
   ✅ إضافة حي
================================ */
export const createNeighborhood = async (data: NeighborhoodPayload) => {
  const res = await api.post("/neighborhoods", data);
  return res.data;
};

/* ===============================
   ✏️ تعديل حي
================================ */
export const updateNeighborhood = async (id: number, data: NeighborhoodPayload) => {
  const res = await api.put(`/neighborhoods/${id}`, data);
  return res.data;
};

/* ===============================
   🗑️ حذف حي
================================ */
export const deleteNeighborhood = async (id: number) => {
  const res = await api.delete(`/neighborhoods/${id}`);
  return res.data;
};

/* =========================
   API – Accounts
========================= */
export const accountsApi = {
  getAccounts: async (): Promise<{ tree: Account[]; list: Account[] }> => {
    const res = await api.get<AccountsResponse>("/accounts");
    return {
      tree: res.data.tree || [],
      list: res.data.list || [],
    };
  },

  createAccount: async (data: {
    name_ar: string;
    name_en?: string;
    parent_id?: number | null;
    account_level?: "رئيسي" | "فرعي";
  }) => {
    const res = await api.post("/accounts", data);
    return res.data;
  },

  updateAccount: async (
    id: number,
    data: {
      name_ar?: string;
      name_en?: string;
      parent_id?: number | null;
      account_level?: "رئيسي" | "فرعي";
    }
  ) => {
    const res = await api.put(`/accounts/${id}`, data);
    return res.data;
  },

  deleteAccount: async (id: number) => {
    const res = await api.delete(`/accounts/${id}`);
    return res.data;
  },
};

// 🔴 هذا السطر كان ناقص
(api as any).accounts = accountsApi;


/* =========================
   ACCOUNT GROUPS
========================= */
(api as any).accountGroups = {
  getAll: async (search = "") =>
    (
      await api.get("/account-groups", {
        params: { search },
      })
    ).data,

  getOne: async (id: number) =>
    (await api.get(`/account-groups/${id}`)).data,

  create: async (data: {
    name_ar: string;
    name_en?: string;
    code: string;
  }) =>
    (await api.post("/account-groups", data)).data,

  update: async (
    id: number,
    data: {
      name_ar: string;
      name_en?: string;
      code: string;
    }
  ) =>
    (await api.put(`/account-groups/${id}`, data)).data,

  delete: async (id: number) =>
    (await api.delete(`/account-groups/${id}`)).data,
};

/* =========================
   CURRENCIES
========================= */
(api as any).currencies = {
  getAll: async () => {
    const res = await api.get("/currencies");
    return res.data;
  },

  create: async (data: {
    name_ar: string;
    code: string;
    symbol?: string;
    exchange_rate: number;
    min_rate?: number | null;
    max_rate?: number | null;
    is_local: boolean;
  }) => {
    const res = await api.post("/currencies", data);
    return res.data;
  },

  update: async (
    id: number,
    data: {
      name_ar: string;
      code?: string;
      symbol?: string;
      exchange_rate: number;
      min_rate?: number | null;
      max_rate?: number | null;
      is_local: boolean;
    }
  ) => {
    const res = await api.put(`/currencies/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    const res = await api.delete(`/currencies/${id}`);
    return res.data;
  },
};

/* =========================
   BANK GROUPS
========================= */
(api as any).bankGroups = {
  getAll: (search = "") =>
    api.get(`/bank-groups`, { params: { search } }).then((r) => r.data),

  getOne: (id: number) =>
    api.get(`/bank-groups/${id}`).then((r) => r.data),

  create: (payload: {
    name_ar: string;
    name_en?: string | null;
    code: string;
  }) =>
    api.post(`/bank-groups`, payload).then((r) => r.data),

  update: (
    id: number,
    payload: {
      name_ar: string;
      name_en?: string | null;
      code: string;
    }
  ) =>
    api.put(`/bank-groups/${id}`, payload).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/bank-groups/${id}`).then((r) => r.data),
};

/* =========================
   BANKS
========================= */
(api as any).banks = {
  getBanks: async (params?: { search?: string }) =>
    (await api.get("/banks", { params })).data,

  addBank: async (data: any) =>
    (await api.post("/banks", data)).data,

  deleteBank: async (id: number) =>
    (await api.delete(`/banks/${id}`)).data,
};

/*===========================
مجموعة الصناديق
=========================*/
(api as any).cashboxGroups = {
  getAll: (search = "") =>
    api.get("/cashbox-groups", { params: { search } }).then((r) => r.data),

  create: (data: {
    name_ar: string;
    name_en?: string | null;
    code: number;
  }) => api.post("/cashbox-groups", data).then((r) => r.data),

  update: (
    id: number,
    data: { name_ar: string; name_en?: string | null }
  ) => api.put(`/cashbox-groups/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/cashbox-groups/${id}`).then((r) => r.data),
};

/* =========================
   CASH BOXES & GROUPS
========================= */

// الحسابات الرئيسية للصناديق
(api as any).accounts = {
  ...(api as any).accounts,

  getMainForCashboxes: async () =>
    (await api.get("/accounts/main-for-cashboxes")).data,
};

// مجموعات الصناديق
(api as any).cashboxGroups = {
  getAll: async (search = "") =>
    (await api.get("/cashbox-groups", { params: { search } })).data,

  create: async (data: {
    name_ar: string;
    name_en?: string | null;
    code: number;
  }) => (await api.post("/cashbox-groups", data)).data,

  update: async (
    id: number,
    data: { name_ar: string; name_en?: string | null }
  ) => (await api.put(`/cashbox-groups/${id}`, data)).data,

  delete: async (id: number) =>
    (await api.delete(`/cashbox-groups/${id}`)).data,
};

// الصناديق
(api as any).cashBoxes = {
  getAll: async (search = "") =>
    (await api.get("/cash-boxes", { params: { search } })).data,

  create: async (data: {
    name_ar: string;
    name_en?: string | null;
    code: string;
    cash_box_group_id: number;
    parent_account_id: number;
  }) => (await api.post("/cash-boxes", data)).data,

  update: async (
    id: number,
    data: {
      name_ar: string;
      name_en?: string | null;
      cash_box_group_id: number;
    }
  ) => (await api.put(`/cash-boxes/${id}`, data)).data,

  delete: async (id: number) =>
    (await api.delete(`/cash-boxes/${id}`)).data,
};


/* =========================
   PAYMENT TYPES
========================= */
(api as any).paymentTypes = {
  getAll: async (search = "") =>
    (await api.get("/payment-types", { params: { search } })).data,

  create: async (data: {
    code: number;
    name_ar: string;
    name_en?: string | null;
    sort_order: number;
  }) =>
    (await api.post("/payment-types", data)).data,

  update: async (
    id: number,
    data: {
      name_ar: string;
      name_en?: string | null;
      sort_order: number;
    }
  ) =>
    (await api.put(`/payment-types/${id}`, data)).data,

  delete: async (id: number) =>
    (await api.delete(`/payment-types/${id}`)).data,
};
/* =========================
   RECEIPT TYPES
========================= */
(api as any).receiptTypes = {
  getAll: async (search = "") =>
    (await api.get("/receipt-types", { params: { search } })).data,

  create: async (data: {
    code: number;
    name_ar: string;
    name_en?: string | null;
    sort_order: number;
  }) =>
    (await api.post("/receipt-types", data)).data,

  update: async (
    id: number,
    data: {
      name_ar: string;
      name_en?: string | null;
      sort_order: number;
    }
  ) =>
    (await api.put(`/receipt-types/${id}`, data)).data,

  delete: async (id: number) =>
    (await api.delete(`/receipt-types/${id}`)).data,
};

/* =========================
   JOURNAL TYPES
========================= */
(api as any).journalTypes = {
  getAll: async (search = "") =>
    (await api.get("/journal-types", { params: { search } })).data,

  create: async (data: {
    code: number;
    name_ar: string;
    name_en?: string | null;
    sort_order: number;
  }) =>
    (await api.post("/journal-types", data)).data,

  update: async (
    id: number,
    data: {
      name_ar: string;
      name_en?: string | null;
      sort_order: number;
    }
  ) =>
    (await api.put(`/journal-types/${id}`, data)).data,

  delete: async (id: number) =>
    (await api.delete(`/journal-types/${id}`)).data,
};
/* =========================
   ACCOUNT CEILINGS
========================= */
(api as any).accountCeilings = {
  getAll: async () =>
    (await api.get("/account-ceilings")).data,

  create: async (data: {
    scope: "account" | "group";
    account_id?: number | null;
    account_group_id?: number | null;
    currency_id: number;
    ceiling_amount: number;
    account_nature: "debit" | "credit";
    exceed_action: "block" | "allow" | "warn";
  }) =>
    (await api.post("/account-ceilings", data)).data,

  update: async (
    id: number,
    data: {
      currency_id: number;
      ceiling_amount: number;
      account_nature: "debit" | "credit";
      exceed_action: "block" | "allow" | "warn";
    }
  ) =>
    (await api.put(`/account-ceilings/${id}`, data)).data,

  delete: async (id: number) =>
    (await api.delete(`/account-ceilings/${id}`)).data,
};
/* =========================
   RECEIPT VOUCHERS
========================= */
(api as any).receiptVouchers = {
  getAll: async () =>
    (await api.get("/receipt-vouchers")).data,

  create: async (data: any) =>
    (await api.post("/receipt-vouchers", data)).data,

  update: async (id: number, data: any) =>
    (await api.put(`/receipt-vouchers/${id}`, data)).data,

  remove: async (id: number) =>
    (await api.delete(`/receipt-vouchers/${id}`)).data,
};

/* =========================
   PAYMENT VOUCHERS
========================= */
(api as any).paymentVouchers = {
  getAll: async () =>
    (await api.get("/payment-vouchers")).data,

  create: async (data: any) =>
    (await api.post("/payment-vouchers", data)).data,

  update: async (id: number, data: any) =>
    (await api.put(`/payment-vouchers/${id}`, data)).data,

  remove: async (id: number) =>
    (await api.delete(`/payment-vouchers/${id}`)).data,
};

// =========================
// Journal Entries API
// =========================

// جلب القيود اليومية
export const getJournalEntries = () => {
  return api.get("/journal-entries");
};

// إضافة قيد (سطر واحد: مدين أو دائن)
export const createJournalEntry = (data: {
  journal_type_id: number;
  reference_type: string;
  reference_id?: number | null;
  journal_date: string;
  currency_id: number;
  account_id: number;
  debit: number;
  credit: number;
  notes?: string | null;
  cost_center_id?: number | null;
}) => {
  return api.post("/journal-entries", data);
};

// تعديل قيد واحد بالسطر
export const updateJournalEntry = (
  id: number,
  data: {
    journal_date?: string;
    currency_id?: number;
    account_id?: number;
    debit?: number;
    credit?: number;
    notes?: string | null;
  }
) => {
  return api.put(`/journal-entries/${id}`, data);
};

// حذف سطر واحد فقط
export const deleteJournalEntry = (id: number) => {
  return api.delete(`/journal-entries/${id}`);
};

// حذف قيد كامل (مدين + دائن) بواسطة reference_id
export const deleteJournalEntryByRef = (ref: number | string) => {
  return api.delete(`/journal-entries/by-ref/${ref}`);
};

/* =========================
   REPORTS – ACCOUNT STATEMENT
========================= */
(api as any).reports = {
  // كشف الحساب
  accountStatement: async (payload: {
    account_id?: number | null;
    main_account_id?: number | null;
    currency_id?: number | null;
    from_date?: string | null;
    to_date?: string | null;
    report_mode: "detailed" | "summary";
    summary_type?: string;   // حسب خياراتك (إجمالي محلي، مع الحركة... إلخ)
    detailed_type?: string;  // كشف كامل / بدون رصيد سابق
  }) => {
    const res = await api.post("/reports/account-statement", payload);
    return res.data;
  },

  // مستقبلاً يمكن إضافة تقارير أخرى هنا
};

// ===============================
// Delivery Fees (رسوم التوصيل)
// ===============================

export const getDeliverySettings = () =>
  api.get("/delivery-settings");

export const saveDeliverySettings = (data: any) =>
  api.post("/delivery-settings", data);
/* =========================
   ORDERS
========================= */
(api as any).orders = {
  // جلب الطلبات
  getOrders: async (params?: any) =>
    (await api.get("/orders", { params })).data,

  // تفاصيل طلب واحد
  getOrderDetails: async (id: number) =>
    (await api.get(`/orders/${id}`)).data,

  // تحديث حالة الطلب
  updateStatus: async (id: number, status: string) =>
    (await api.put(`/orders/${id}/status`, { status })).data,

  // تعيين كابتن للطلب
  assignCaptain: async (orderId: number, captainId: number) =>
    (
      await api.post(`/orders/${orderId}/assign`, {
        captain_id: captainId,
      })
    ).data,

  // إضافة طلب جديد
  create: async (data: any) =>
    (await api.post("/orders", data)).data,
};

/* =========================
   CAPTAINS – AVAILABLE
========================= */
(api as any).captains = {
  ...(api as any).captains,

  // جلب الكباتن المتاحين للتعيين
  getAvailableCaptains: async () =>
    (await api.get("/captains")).data,
};

/* =========================
   CURRENCY EXCHANGE (مصارفة العملة)
========================= */

// جلب بيانات النموذج (عملات + حسابات حسب النوع)
export const getExchangeFormData = async (type: "cash" | "account") => {
  const res = await api.get(`/currency-exchange/form-data?type=${type}`);
  return res.data;
};

// تنفيذ عملية المصارفة
export const executeExchange = async (data: {
  from_currency_id: number;
  to_currency_id: number;
  amount: number;
  rate: number;
  from_account_id: number;
  to_account_id: number;
  journal_date: string;
  notes?: string;
}) => {
  const res = await api.post("/currency-exchange", data);
  return res.data;
};

// نمط موحد مثل بقية الأقسام
(api as any).currencyExchange = {
  formData: async (type: "cash" | "account") =>
    (await api.get(`/currency-exchange/form-data?type=${type}`)).data,

  execute: async (payload: {
    from_currency_id: number;
    to_currency_id: number;
    amount: number;
    rate: number;
    from_account_id: number;
    to_account_id: number;
    journal_date: string;
    notes?: string;
  }) =>
    (await api.post("/currency-exchange", payload)).data,
};
/* =========================
   TRANSIT ACCOUNTS SETTINGS
   (الحسابات الوسيطة)
========================= */

(api as any).transitAccounts = {
  // جلب الإعدادات الحالية
  get: async () =>
    (await api.get("/settings/transit-accounts")).data,

  // حفظ الإعدادات
  save: async (data: {
    commission_income_account?: number | null;     // حساب وسيط إيرادات العمولات
    courier_commission_account?: number | null;    // حساب وسيط عمولات الموصلين
    transfer_guarantee_account?: number | null;    // حساب وسيط اعتماد الحوالات
    currency_exchange_account?: number | null;     // حساب وسيط مصارفة العملة
  }) =>
    (await api.post("/settings/transit-accounts", data)).data,
};

/*===========================
مجموعة الوكلاء
=========================*/

(api as any).agentGroups = {
  getGroups: async () =>
    (await api.get("/agent-groups")).data,

  addGroup: async (data: { name: string; code: number }) =>
    (await api.post("/agent-groups", data)).data,

  deleteGroup: async (id: number) =>
    (await api.delete(`/agent-groups/${id}`)).data,
};

/* =========================
   AGENTS
========================= */
(api as any).agents = {
  // لوحة التحكم
  getAgents: async () =>
    (await api.get("/agents")).data,

  addAgent: async (data: any) =>
    (await api.post("/agents", data)).data,

  updateAgent: async (id: number, data: any) =>
    (await api.put(`/agents/${id}`, data)).data,

  deleteAgent: async (id: number) =>
    (await api.delete(`/agents/${id}`)).data,

  toggleAgent: async (id: number, is_active: boolean) =>
    (await api.patch(`/agents/${id}/toggle`, { is_active })).data,

  // تطبيق الوكلاء
  login: async (phone: string, password: string) =>
    (await api.post("/agents/login", { phone, password })).data,
};

export default api;
