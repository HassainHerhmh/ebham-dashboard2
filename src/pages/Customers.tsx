import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";

interface Branch {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  phone_alt?: string;
  email?: string;
  created_at?: string;
  branch_id?: number;
  branch_name?: string;
  is_active?: number; // 1: نشط, 0: محظور
  last_login?: string; // تاريخ ووقت
  is_online?: number; // 1: متصل, 0: غير متصل
}

interface Address {
  id: number;
  customer_id: number;
  customer_name: string;
  district_name?: string;
  address?: string;
  gps_link?: string;
  latitude?: string;
  longitude?: string;
  branch_id?: number;
  branch_name?: string;
}

const Customers: React.FC = () => {
  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdmin = Boolean(currentUser?.is_admin_branch);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== Main Search States =====
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchAddress, setSearchAddress] = useState("");

  // ===== Modal States =====
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddressesOpen, setIsAddressesOpen] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);

  // ===== Edit Modal States =====
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPhoneAlt, setEditPhoneAlt] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [editAddress, setEditAddress] = useState<Address | null>(null);

  // ===== Customer Status Page States (NEW & IMPROVED) =====
  const [isStatusPageOpen, setIsStatusPageOpen] = useState(false);
  const [statusSearchName, setStatusSearchName] = useState("");
  
  // 1. فلتر حالة الحساب (نشط / محظور)
  const [filterAccountStatus, setFilterAccountStatus] = useState("all"); 
  // 2. فلتر الاتصال (متصل / غير متصل)
  const [filterConnection, setFilterConnection] = useState("all"); 
  
  const [statusFilterDate, setStatusFilterDate] = useState("");

  const fetchBranches = async () => {
    if (!isAdmin) return;
    const res = await api.get("/branches");
    setBranches(res.data.branches || []);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await api.get("/customers");
    if (res.data.success) setCustomers(res.data.customers);
    setLoading(false);
  };

  const fetchAddresses = async () => {
    const res = await api.get("/customer-addresses");
    if (res.data.success) setAddresses(res.data.addresses);
  };

  useEffect(() => {
    fetchBranches();
    fetchCustomers();
  }, []);

  // فلتر الصفحة الرئيسية
  const filteredCustomers = customers.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(searchCustomer.toLowerCase()) ||
      (c.phone || "").includes(searchCustomer)
  );

  // فلتر صفحة العناوين
  const filteredAddresses = addresses.filter(
    (a) =>
      (a.customer_name || "")
        .toLowerCase()
        .includes(searchAddress.toLowerCase()) ||
      (a.address || "").toLowerCase().includes(searchAddress.toLowerCase())
  );

  // ===== حساب الإحصائيات (Statistics Calculation) =====
  const stats = {
    total: customers.length,
    online: customers.filter((c) => c.is_online === 1).length,
    activeToday: customers.filter((c) => {
        // نفترض أن التاريخ يأتي بصيغة YYYY-MM-DD...
        const today = new Date().toISOString().slice(0, 10);
        return c.last_login && c.last_login.startsWith(today);
    }).length
  };

  // ===== فلتر صفحة حالة العملاء المطور =====
  const filteredStatusCustomers = customers.filter((c) => {
    // 1. بحث بالاسم
    const matchName = (c.name || "")
      .toLowerCase()
      .includes(statusSearchName.toLowerCase());

    // 2. فلتر حالة الحساب (نشط/محظور)
    let matchAccount = true;
    if (filterAccountStatus === "active") matchAccount = c.is_active === 1;
    if (filterAccountStatus === "blocked") matchAccount = c.is_active === 0;

    // 3. فلتر الاتصال (متصل/غير متصل)
    let matchConnection = true;
    if (filterConnection === "online") matchConnection = c.is_online === 1;
    if (filterConnection === "offline") matchConnection = c.is_online === 0;

    // 4. فلتر التاريخ
    let matchDate = true;
    if (statusFilterDate) {
      const dateToCheck = c.last_login || c.created_at;
      matchDate = dateToCheck ? dateToCheck.startsWith(statusFilterDate) : false;
    }

    return matchName && matchAccount && matchConnection && matchDate;
  });

  // ===== Actions =====
  const openEditCustomer = (c: Customer) => {
    setEditCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditPhoneAlt(c.phone_alt || "");
    setEditEmail(c.email || "");
    setIsEditOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editCustomer) return;

    await api.put(`/customers/${editCustomer.id}`, {
      name: editName,
      phone: editPhone,
      phone_alt: editPhoneAlt || null,
      email: editEmail || null,
    });

    setIsEditOpen(false);
    setEditCustomer(null);
    fetchCustomers();
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف العميل؟")) return;
    await api.delete(`/customers/${id}`);
    fetchCustomers();
  };

  const handleToggleCustomer = async (id: number) => {
    await api.post(`/customers/${id}/toggle`);
    fetchCustomers();
  };

  const handleResetPassword = async (id: number) => {
    if (!confirm("إعادة تعيين كلمة المرور؟")) return;
    const res = await api.post(`/customers/${id}/reset-password`);
    alert(
      res.data?.password
        ? `كلمة المرور الجديدة: ${res.data.password}`
        : "تمت العملية"
    );
  };

  // =========================================================
  // عرض صفحة حالة العملاء (Status Page)
  // =========================================================
  if (isStatusPageOpen) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen" dir="rtl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">📊 حالة العملاء والاتصال</h1>
          <button
            onClick={() => setIsStatusPageOpen(false)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
          >
            <span>↩️</span> رجوع للقائمة
          </button>
        </div>

        {/* --- شريط الإحصائيات (Statistics Cards) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-r-4 border-blue-500 flex justify-between items-center">
                <div>
                    <p className="text-gray-500 text-sm">إجمالي العملاء</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="text-3xl">👥</div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-r-4 border-green-500 flex justify-between items-center">
                <div>
                    <p className="text-gray-500 text-sm">المتصلين الآن</p>
                    <p className="text-2xl font-bold text-green-600">{stats.online}</p>
                </div>
                <div className="text-3xl relative">
                    🟢
                    <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500 animate-ping"></span>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-r-4 border-purple-500 flex justify-between items-center">
                <div>
                    <p className="text-gray-500 text-sm">سجلوا دخول اليوم</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.activeToday}</p>
                </div>
                <div className="text-3xl">📅</div>
            </div>
        </div>

        {/* --- شريط الفلاتر والبحث --- */}
        <div className="bg-white p-5 rounded shadow-lg grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* بحث بالاسم */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              بحث بالاسم
            </label>
            <input
              className="border p-2 rounded w-full bg-gray-50 focus:bg-white transition"
              placeholder="اكتب اسم العميل..."
              value={statusSearchName}
              onChange={(e) => setStatusSearchName(e.target.value)}
            />
          </div>

          {/* فلتر حالة الاتصال (جديد) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              حالة الاتصال (Online)
            </label>
            <select
              className="border p-2 rounded w-full bg-gray-50"
              value={filterConnection}
              onChange={(e) => setFilterConnection(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="online">🟢 متصل الآن فقط</option>
              <option value="offline">⚪ غير متصل</option>
            </select>
          </div>

          {/* فلتر حالة الحساب (نشط/محظور) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              حالة الحساب
            </label>
            <select
              className="border p-2 rounded w-full bg-gray-50"
              value={filterAccountStatus}
              onChange={(e) => setFilterAccountStatus(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="active">✅ الحسابات النشطة</option>
              <option value="blocked">🚫 الحسابات المحظورة</option>
            </select>
          </div>

          {/* فلتر التاريخ */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              تاريخ آخر دخول
            </label>
            <input
              type="date"
              className="border p-2 rounded w-full bg-gray-50"
              value={statusFilterDate}
              onChange={(e) => setStatusFilterDate(e.target.value)}
            />
          </div>
        </div>

        {/* --- الجدول --- */}
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-center">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-600">الاسم</th>
                <th className="p-4 text-sm font-semibold text-gray-600">حالة الاتصال</th>
                <th className="p-4 text-sm font-semibold text-gray-600">وقت آخر دخول</th>
                <th className="p-4 text-sm font-semibold text-gray-600">حالة الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStatusCustomers.length > 0 ? (
                filteredStatusCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50 transition">
                    <td className="p-3 font-medium text-gray-800">{c.name}</td>
                    
                    {/* عمود حالة الاتصال */}
                    <td className="p-3">
                      {c.is_online === 1 ? (
                        <div className="flex items-center justify-center gap-2 bg-green-50 w-fit mx-auto px-3 py-1 rounded-full border border-green-200">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-green-700 font-bold text-xs">متصل</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-medium">غير متصل</span>
                      )}
                    </td>

                    <td className="p-3 text-gray-600 text-sm" dir="ltr">
                      {c.last_login ? c.last_login : "-"}
                    </td>

                    {/* عمود حالة الحساب */}
                    <td className="p-3">
                        {c.is_active === 1 ? (
                             <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">نشط</span>
                        ) : (
                             <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">محظور</span>
                        )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    🔍 لا توجد نتائج مطابقة للفلاتر الحالية
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================
  // العرض الرئيسي (Main Render)
  // =========================================================
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📋 العملاء</h1>
      </div>

      <div className="flex justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition"
          >
            ➕ إضافة عميل
          </button>

          <button
            onClick={() => setIsStatusPageOpen(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 transition flex items-center gap-2"
          >
            <span>📊</span> حالة واتصال العملاء
          </button>
        </div>

        <button
          onClick={() => {
            fetchAddresses();
            setIsAddressesOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          📍 إدارة العناوين
        </button>
      </div>

      <input
        className="border p-2 rounded w-full"
        placeholder="بحث عن عميل..."
        value={searchCustomer}
        onChange={(e) => setSearchCustomer(e.target.value)}
      />

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-center">
          <thead className="bg-gray-100">
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>الجوال</th>
              <th>جوال احتياطي</th>
              <th>البريد</th>
              {isAdmin && <th>الفرع</th>}
              <th>التاريخ</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr key={c.id} className="border-b">
                <td>{c.id}</td>
                <td
                  className={
                    c.is_active === 0 ? "text-gray-400 line-through" : ""
                  }
                >
                  {c.name}
                </td>
                <td>{c.phone}</td>
                <td>{c.phone_alt || "-"}</td>
                <td>{c.email || "-"}</td>
                {isAdmin && <td>{c.branch_name || "-"}</td>}
                <td>{c.created_at?.slice(0, 10)}</td>
                <td className="space-x-1 space-x-reverse py-2">
                  <button
                    onClick={() => openEditCustomer(c)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(c.id)}
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    حذف
                  </button>
                  <button
                    onClick={() => handleToggleCustomer(c.id)}
                    className="bg-gray-700 text-white px-2 py-1 rounded text-xs"
                  >
                    تعطيل / تفعيل
                  </button>
                  <button
                    onClick={() => handleResetPassword(c.id)}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                  >
                    إعادة كلمة المرور
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddressesOpen && (
        <div className="fixed inset-0 bg-black/40 z-50">
          <div className="absolute inset-0 bg-white p-4 overflow-auto">
            <button
              onClick={() => setIsAddressesOpen(false)}
              className="fixed top-2 right-2 bg-red-600 text-white w-6 h-6 text-xs rounded-full"
            >
              ✖
            </button>

            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">📍 إدارة العناوين</h2>
              <button
                onClick={() => setIsAddAddressOpen(true)}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                ➕ إضافة عنوان
              </button>
            </div>

            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="🔍 بحث في العناوين"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
            />

            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th>العميل</th>
                  <th>الحي</th>
                  {isAdmin && <th>الفرع</th>}
                  <th>العنوان التفصيلي</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>GPS</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAddresses.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td>{a.customer_name}</td>
                    <td>{a.district_name || "-"}</td>
                    {isAdmin && <td>{a.branch_name || "-"}</td>}
                    <td>{a.address || "-"}</td>
                    <td>{a.latitude || "-"}</td>
                    <td>{a.longitude || "-"}</td>
                    <td>
                      {a.gps_link ? (
                        <a
                          href={a.gps_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          GPS
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="flex gap-2 justify-center py-2">
                      <button
                        onClick={() => {
                          setEditAddress(a);
                          setIsEditAddressOpen(true);
                        }}
                        className="text-blue-600"
                      >
                        تعديل
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm("حذف العنوان؟")) return;
                          await api.delete(`/customer-addresses/${a.id}`);
                          fetchAddresses();
                        }}
                        className="text-red-600"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAddCustomerOpen && (
        <AddCustomerModal
          branches={branches}
          isAdmin={isAdmin}
          onClose={() => setIsAddCustomerOpen(false)}
          onSaved={fetchCustomers}
        />
      )}

      {/* ===== Edit Modal ===== */}
      {isEditOpen && editCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-4 w-full max-w-md rounded relative">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 text-xs rounded-full"
            >
              ✖
            </button>

            <h3 className="font-bold mb-3">✏️ تعديل العميل</h3>

            <input
              className="border p-2 w-full mb-2"
              placeholder="الاسم"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <input
              className="border p-2 w-full mb-2"
              placeholder="رقم الجوال"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />

            <input
              className="border p-2 w-full mb-2"
              placeholder="رقم احتياطي (اختياري)"
              value={editPhoneAlt}
              onChange={(e) => setEditPhoneAlt(e.target.value)}
            />

            <input
              className="border p-2 w-full mb-3"
              placeholder="البريد الإلكتروني"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />

            <div className="flex justify-between">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-3 py-1 rounded bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateCustomer}
                className="px-3 py-1 rounded bg-green-600 text-white"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddAddressOpen && (
        <AddAddressModal
          customers={customers}
          branches={branches}
          onClose={() => setIsAddAddressOpen(false)}
          onSaved={() => {
            setIsAddAddressOpen(false);
            fetchAddresses();
          }}
        />
      )}
      {isEditAddressOpen && editAddress && (
        <EditAddressModal
          address={editAddress}
          onClose={() => {
            setIsEditAddressOpen(false);
            setEditAddress(null);
          }}
          onSaved={() => {
            setIsEditAddressOpen(false);
            setEditAddress(null);
            fetchAddresses();
          }}
        />
      )}
    </div>
  );
};

export default Customers;

// ... (المودالات الأخرى تبقى كما هي: AddCustomerModal, AddAddressModal, EditAddressModal)
const AddCustomerModal = ({ branches, isAdmin, onClose, onSaved }: any) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneAlt, setPhoneAlt] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [branchId, setBranchId] = useState("");

  const handleSave = async () => {
    if (!name || !phone || !password || !confirmPassword)
      return alert("البيانات ناقصة");

    if (password !== confirmPassword) return alert("كلمة المرور غير متطابقة");

    const payload: any = {
      name,
      phone,
      phone_alt: phoneAlt || null,
      email: email || null,
      password,
    };

    if (isAdmin && branchId) {
      payload.branch_id = Number(branchId);
    }

    const res = await api.post("/customers", payload);

    if (res.data?.success) {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-4 w-full max-w-md rounded relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 text-xs rounded-full"
        >
          ✖
        </button>

        <h3 className="font-bold mb-3">➕ إضافة عميل</h3>

        <input
          className="border p-2 w-full mb-2"
          placeholder="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-2"
          placeholder="رقم الجوال"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-2"
          placeholder="رقم احتياطي (اختياري)"
          value={phoneAlt}
          onChange={(e) => setPhoneAlt(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-2"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="border p-2 w-full mb-2"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          className="border p-2 w-full mb-2"
          placeholder="تأكيد كلمة المرور"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {isAdmin && (
          <select
            className="border p-2 w-full mb-2"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">اختر الفرع</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handleSave}
          className="bg-green-600 text-white w-full py-2 rounded"
        >
          حفظ
        </button>
      </div>
    </div>
  );
};

/* ================= مودال إضافة عنوان (كما هو) ================= */

const AddAddressModal = ({
  customers,
  branches,
  onClose,
  onSaved,
}: any) => {
  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdmin = Boolean(currentUser?.is_admin_branch);
  const userBranchId = currentUser?.branch_id;

  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState(
    isAdmin ? "" : String(userBranchId || "")
  );
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationType, setLocationType] = useState("");

  const mapRef = useRef<HTMLDivElement | null>(null);

  // جلب الأحياء حسب الفرع
  useEffect(() => {
    const bid = isAdmin ? branchId : userBranchId;
    if (!bid) return setNeighborhoods([]);

    api.get(`/neighborhoods/by-branch/${bid}`).then((res) => {
      if (res.data.success) setNeighborhoods(res.data.neighborhoods);
    });
  }, [branchId, userBranchId]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLat((15 + y / 10).toFixed(6));
    setLng((45 + x / 10).toFixed(6));
  };

  const gpsLink =
    lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : "";

  const handleSave = async () => {
    if (!customerId || !district) return alert("❌ البيانات ناقصة");

    const res = await api.customers.addAddress({
      customer_id: Number(customerId),
      district,
      location_type: locationType || null,
      address,
      latitude: lat || null,
      longitude: lng || null,
      gps_link: gpsLink || null,
    });

    if (res.success) onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl p-4 rounded relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 text-xs rounded-full"
        >
          ✖
        </button>

        <h3 className="text-lg font-bold mb-3">➕ إضافة عنوان</h3>

        <select
          className="border p-2 w-full mb-2"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">اختر عميل</option>
          {customers.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {isAdmin && (
          <select
            className="border p-2 w-full mb-2"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">اختر الفرع</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <select
          className="border p-2 w-full mb-2"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        >
          <option value="">اختر الحي</option>
          {neighborhoods.map((n: any) => (
            <option key={n.id} value={n.id}>
              {" "}
              {/* التأكد من إرسال الـ ID */}
              {n.name}
            </option>
          ))}
        </select>

        <select
          className="border p-2 w-full mb-2"
          value={locationType}
          onChange={(e) => setLocationType(e.target.value)}
        >
          <option value="">اختر نوع الموقع</option>
          <option value="شقة">شقة</option>
          <option value="منزل">منزل</option>
          <option value="محل">محل</option>
          <option value="مكتب">مكتب</option>
        </select>

        <input
          className="border p-2 w-full mb-2"
          placeholder="العنوان التفصيلي"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className="flex gap-2 mb-2">
          <input
            className="border p-2 w-full"
            placeholder="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <input
            className="border p-2 w-full"
            placeholder="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>

        <div
          ref={mapRef}
          onClick={handleMapClick}
          className="w-full h-40 border rounded flex items-center justify-center text-gray-500 cursor-crosshair bg-gray-100 mb-2"
        >
          اضغط هنا لاختيار الموقع من الخريطة
        </div>

        {gpsLink && (
          <a
            href={gpsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm"
          >
            فتح الموقع على الخريطة
          </a>
        )}

        <button
          onClick={handleSave}
          className="bg-green-600 text-white w-full py-2 rounded mt-3"
        >
          حفظ العنوان
        </button>
      </div>
    </div>
  );
};

/* ================= مودال تعديل عنوان (كما هو) ================= */

const EditAddressModal = ({
  address,
  onClose,
  onSaved,
}: {
  address: any;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [district, setDistrict] = useState(address.district_name || "");
  const [addr, setAddr] = useState(address.address || "");
  const [lat, setLat] = useState(address.latitude || "");
  const [lng, setLng] = useState(address.longitude || "");

  const gpsLink =
    lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : "";

  const handleSave = async () => {
    await api.put(`/customer-addresses/${address.id}`, {
      district,
      address: addr,
      latitude: lat,
      longitude: lng,
      gps_link: gpsLink,
    });

    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-lg p-4 rounded relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 text-xs rounded-full"
        >
          ✖
        </button>

        <h3 className="text-lg font-bold mb-3">✏️ تعديل العنوان</h3>

        <input
          className="border p-2 w-full mb-2"
          placeholder="الحي"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-2"
          placeholder="العنوان التفصيلي"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
        />

        <div className="flex gap-2 mb-2">
          <input
            className="border p-2 w-full"
            placeholder="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <input
            className="border p-2 w-full"
            placeholder="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>

        {gpsLink && (
          <a
            href={gpsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm"
          >
            فتح الموقع على الخريطة
          </a>
        )}

        <button
          onClick={handleSave}
          className="bg-green-600 text-white w-full py-2 rounded mt-3"
        >
          حفظ التعديل
        </button>
      </div>
    </div>
  );
};
