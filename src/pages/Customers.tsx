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
  district_id?: number | string;
  district_name?: string;
  location_type?: string;
  address?: string;
  gps_link?: string;
  latitude?: string;
  longitude?: string;
  branch_id?: number;
  branch_name?: string;
}

const GOOGLE_MAPS_KEY = "AIzaSyD1Cg7YKXlWGMhVLjRKy0GmlL149_W08SQ";
const DEFAULT_MAP_CENTER = { lat: 15.369445, lng: 44.191006 };

const BRANCH_MAP_CENTERS: Record<string, { lat: number; lng: number }> = {
  "صنعاء": { lat: 15.369445, lng: 44.191006 },
  "عدن": { lat: 12.785497, lng: 45.018654 },
  "شيخ عثمان": { lat: 12.886905, lng: 44.987622 },
  "المنصورة": { lat: 12.85184, lng: 44.9818 },
  "عتق": { lat: 14.53767, lng: 46.83187 },
  "شبوة": { lat: 14.53767, lng: 46.83187 },
  "المكلا": { lat: 14.54248, lng: 49.12424 },
  "سيئون": { lat: 15.94194, lng: 48.78708 },
  "تعز": { lat: 13.57952, lng: 44.02091 },
  "إب": { lat: 13.96667, lng: 44.18333 },
  "ذمار": { lat: 14.54274, lng: 44.40514 },
  "الحديدة": { lat: 14.79781, lng: 42.95452 },
};

const getBranchMapCenter = (branchName?: string) => {
  const normalized = String(branchName || "").trim();
  if (!normalized) return DEFAULT_MAP_CENTER;

  const direct = BRANCH_MAP_CENTERS[normalized];
  if (direct) return direct;

  const partialKey = Object.keys(BRANCH_MAP_CENTERS).find((key) =>
    normalized.includes(key) || key.includes(normalized)
  );

  return partialKey ? BRANCH_MAP_CENTERS[partialKey] : DEFAULT_MAP_CENTER;
};

const AddressPickerMap = ({
  lat,
  lng,
  branchName,
  onPick,
}: {
  lat: string;
  lng: string;
  branchName?: string;
  onPick: (lat: string, lng: string) => void;
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);

  useEffect(() => {
    if ((window as any).google?.maps) {
      setGoogleMapsReady(true);
      return;
    }

    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => setGoogleMapsReady(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleMapsReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleMapsReady || !mapRef.current || !(window as any).google?.maps) return;

    const maps = (window as any).google.maps;
    const hasCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
    const center = hasCoords
      ? { lat: Number(lat), lng: Number(lng) }
      : getBranchMapCenter(branchName);

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new maps.Map(mapRef.current, {
        zoom: hasCoords ? 16 : 12,
        center,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
      if (hasCoords) {
        mapInstanceRef.current.setZoom(16);
      }
    }

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (hasCoords) {
      markerRef.current = new maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        draggable: false,
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
        title: "الموقع المحدد",
      });
    }

    maps.event.clearListeners(mapInstanceRef.current, "click");
    mapInstanceRef.current.addListener("click", (event: any) => {
      const pickedLat = event.latLng.lat().toFixed(6);
      const pickedLng = event.latLng.lng().toFixed(6);
      onPick(pickedLat, pickedLng);
    });
  }, [googleMapsReady, lat, lng, branchName, onPick]);

  return (
    <div className="mb-2">
      <div
        ref={mapRef}
        className="w-full h-64 border rounded overflow-hidden bg-gray-100"
      />
      <p className="text-xs text-gray-500 mt-2">
        اضغط على الخريطة لتحديد الموقع بدقة
      </p>
    </div>
  );
};

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

  // ===== Customer Status Page States =====
  const [isStatusPageOpen, setIsStatusPageOpen] = useState(false);
  const [statusSearchName, setStatusSearchName] = useState("");
  
  // 1. فلتر حالة الحساب
  const [filterAccountStatus, setFilterAccountStatus] = useState("all"); 
  // 2. فلتر الاتصال
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

  // ===== الإحصائيات =====
  const stats = {
    total: customers.length,
    online: customers.filter((c) => c.is_online === 1).length,
    activeToday: customers.filter((c) => {
        const today = new Date().toISOString().slice(0, 10);
        return c.last_login && c.last_login.startsWith(today);
    }).length
  };

  // ===== فلتر صفحة حالة العملاء =====
  const filteredStatusCustomers = customers.filter((c) => {
    // 1. بحث بالاسم
    const matchName = (c.name || "")
      .toLowerCase()
      .includes(statusSearchName.toLowerCase());

    // 2. فلتر حالة الحساب
    let matchAccount = true;
    if (filterAccountStatus === "active") matchAccount = c.is_active === 1;
    if (filterAccountStatus === "blocked") matchAccount = c.is_active === 0;

    // 3. فلتر الاتصال
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
  // صفحة حالة العملاء
  // =========================================================
  if (isStatusPageOpen) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen" dir="rtl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">حالة العملاء والاتصال</h1>
          
          <div className="flex gap-2">
            {/* زر تحديث البيانات */}
            <button
                onClick={fetchCustomers}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2 shadow"
                disabled={loading}
            >
                <span className={loading ? "animate-spin" : ""}>↻</span>
                {loading ? "جارٍ التحديث..." : "تحديث البيانات"}
            </button>

            {/* زر الرجوع */}
            <button
                onClick={() => setIsStatusPageOpen(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2 shadow"
            >
                <span>↩</span> رجوع للقائمة
            </button>
          </div>
        </div>

        {/* --- الإحصائيات --- */}
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

        {/* --- ط´ط±ظٹط· ط§ظ„ظپظ„ط§طھط± --- */}
        <div className="bg-white p-5 rounded shadow-lg grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              حالة الاتصال
            </label>
            <select
              className="border p-2 rounded w-full bg-gray-50"
              value={filterConnection}
              onChange={(e) => setFilterConnection(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="online">متصل الآن فقط</option>
              <option value="offline">غير متصل</option>
            </select>
          </div>

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
              <option value="active">الحسابات النشطة</option>
              <option value="blocked">الحسابات المحظورة</option>
            </select>
          </div>

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

        {/* --- ط§ظ„ط¬ط¯ظˆظ„ --- */}
  {/* --- ط§ظ„ط¬ط¯ظˆظ„ --- */}
<div className="bg-white rounded shadow overflow-hidden">
  <table className="w-full text-center">
    <thead className="bg-gray-100 border-b">
      <tr>
        <th className="p-4 text-sm font-semibold text-gray-600">الاسم</th>

        <th className="p-4 text-sm font-semibold text-gray-600">
          حالة الاتصال
        </th>

        <th className="p-4 text-sm font-semibold text-gray-600">
          وقت آخر دخول
        </th>

        {/* âœ… ط¹ط¯ط¯ ط§ظ„ط·ظ„ط¨ط§طھ */}
        <th className="p-4 text-sm font-semibold text-gray-600">
          عدد الطلبات
        </th>

        {/* âœ… ط¢ط®ط± ط·ظ„ط¨ */}
        <th className="p-4 text-sm font-semibold text-gray-600">
          آخر طلب
        </th>

        {/* âœ… طھط§ط±ظٹط® ط§ظ„طھط³ط¬ظٹظ„ */}
        <th className="p-4 text-sm font-semibold text-gray-600">
          تاريخ التسجيل
        </th>

        <th className="p-4 text-sm font-semibold text-gray-600">
          حالة الحساب
        </th>
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-100">
      {filteredStatusCustomers.length > 0 ? (
        filteredStatusCustomers.map((c) => (
          <tr key={c.id} className="hover:bg-blue-50 transition">

            {/* ط§ظ„ط§ط³ظ… */}
            <td className="p-3 font-medium text-gray-800">
              {c.name}
            </td>

            {/* ط­ط§ظ„ط© ط§ظ„ط§طھطµط§ظ„ */}
            <td className="p-3">
              {c.is_online_calculated === 1 ? (
                <div className="flex items-center justify-center gap-2 bg-green-50 w-fit mx-auto px-3 py-1 rounded-full border border-green-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-green-700 font-bold text-xs">
                    متصل
                  </span>
                </div>
              ) : (
                <span className="text-gray-400 text-xs font-medium">
                  غير متصل
                </span>
              )}
            </td>

            {/* ط¢ط®ط± ط¯ط®ظˆظ„ */}
            <td className="p-3 text-gray-600 text-sm" dir="ltr">
              {c.last_login || "-"}
            </td>

            {/* ط¹ط¯ط¯ ط§ظ„ط·ظ„ط¨ط§طھ */}
            <td className="p-3 font-bold text-orange-600">
              {c.orders_count || 0}
            </td>

            {/* ط¢ط®ط± ط·ظ„ط¨ */}
            <td className="p-3 text-gray-600 text-sm" dir="ltr">
              {c.last_order_date
                ? new Date(c.last_order_date).toLocaleDateString("en-GB")
                : "-"}
            </td>

            {/* طھط§ط±ظٹط® ط§ظ„طھط³ط¬ظٹظ„ */}
            <td className="p-3 text-gray-600 text-sm" dir="ltr">
              {c.register_date
                ? new Date(c.register_date).toLocaleDateString("en-GB")
                : "-"}
            </td>

            {/* ط­ط§ظ„ط© ط§ظ„ط­ط³ط§ط¨ */}
            <td className="p-3">
              {c.is_active === 0 ? (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold border border-red-200">
                  معطل
                </span>
              ) : (c as any).is_logged_in === 1 ? (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold border border-blue-200">
                  نشط
                </span>
              ) : (
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded font-bold border border-gray-300">
                  غير نشط
                </span>
              )}
            </td>

          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={7} className="p-8 text-center text-gray-500">
            لا توجد نتائج مطابقة للفلاتر الحالية
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
  // ط§ظ„ط¹ط±ط¶ ط§ظ„ط±ط¦ظٹط³ظٹ (Main Render)
  // =========================================================
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">العملاء</h1>
      </div>

      <div className="flex justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition"
          >
            إضافة عميل
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
          إدارة العناوين
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
              ×
            </button>

            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">إدارة العناوين</h2>
              <button
                onClick={() => setIsAddAddressOpen(true)}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                إضافة عنوان
              </button>
            </div>

            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="بحث في العناوين"
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
                  <th>نوع الموقع</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>GPS</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAddresses.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td>{a.customer_name}</td>
                    <td>{a.district_name || "-"}</td>
                    {isAdmin && <td>{a.branch_name || "-"}</td>}
                    <td>{a.address || "-"}</td>
                    <td>{a.location_type || "-"}</td>
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
              ×
            </button>

            <h3 className="font-bold mb-3">تعديل العميل</h3>

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
          customers={customers}
          branches={branches}
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

// المودالات
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
          ×
        </button>

        <h3 className="font-bold mb-3">إضافة عميل</h3>

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

/* ================= مودال إضافة عنوان ================= */

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
  const activeBranchName =
    branches.find((b: any) => String(b.id) === String(branchId))?.name ||
    currentUser?.branch_name ||
    "";

  // جلب الأحياء حسب الفرع
  useEffect(() => {
    const bid = isAdmin ? branchId : userBranchId;
    if (!bid) return setNeighborhoods([]);

    api.get(`/neighborhoods/by-branch/${bid}`).then((res) => {
      if (res.data.success) setNeighborhoods(res.data.neighborhoods);
    });
  }, [branchId, userBranchId]);

  const gpsLink =
    lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : "";

  const handleSave = async () => {
    if (!customerId || !district) return alert("البيانات ناقصة");

    const res = await api.customers.addAddress({
      customer_id: Number(customerId),
      branch_id: branchId ? Number(branchId) : null,
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
          ×
        </button>

        <h3 className="text-lg font-bold mb-3">إضافة عنوان</h3>

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

        <AddressPickerMap
          lat={lat}
          lng={lng}
          branchName={activeBranchName}
          onPick={(pickedLat, pickedLng) => {
            setLat(pickedLat);
            setLng(pickedLng);
          }}
        />

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

/* ================= مودال تعديل عنوان ================= */

const EditAddressModal = ({
  address,
  customers,
  branches,
  onClose,
  onSaved,
}: {
  address: any;
  customers: any[];
  branches: any[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdmin = Boolean(currentUser?.is_admin_branch);
  const userBranchId = currentUser?.branch_id;

  const [customerId, setCustomerId] = useState(String(address.customer_id || ""));
  const [branchId, setBranchId] = useState(
    String(address.branch_id || (isAdmin ? "" : userBranchId || ""))
  );
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [district, setDistrict] = useState(String(address.district_id || ""));
  const [locationType, setLocationType] = useState(address.location_type || "");
  const [addr, setAddr] = useState(address.address || "");
  const [lat, setLat] = useState(address.latitude || "");
  const [lng, setLng] = useState(address.longitude || "");
  const activeBranchName =
    branches.find((b: any) => String(b.id) === String(branchId))?.name ||
    address.branch_name ||
    currentUser?.branch_name ||
    "";

  useEffect(() => {
    const bid = isAdmin ? branchId : userBranchId;
    if (!bid) {
      setNeighborhoods([]);
      return;
    }

    api.get(`/neighborhoods/by-branch/${bid}`).then((res) => {
      if (res.data.success) {
        const list = res.data.neighborhoods || [];
        setNeighborhoods(list);

        if (!district && address.district_name) {
          const matched = list.find(
            (n: any) => String(n.name).trim() === String(address.district_name).trim()
          );
          if (matched) {
            setDistrict(String(matched.id));
          }
        }
      }
    });
  }, [branchId, userBranchId, isAdmin, district, address.district_name]);

  const gpsLink =
    lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : "";

  const handleSave = async () => {
    await api.put(`/customer-addresses/${address.id}`, {
      customer_id: Number(customerId),
      branch_id: branchId ? Number(branchId) : null,
      district,
      location_type: locationType || null,
      address: addr,
      latitude: lat,
      longitude: lng,
      gps_link: gpsLink,
    });

    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl p-4 rounded relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 text-xs rounded-full"
        >
          ×
        </button>

        <h3 className="text-lg font-bold mb-3">تعديل العنوان</h3>

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

        <AddressPickerMap
          lat={lat}
          lng={lng}
          branchName={activeBranchName}
          onPick={(pickedLat, pickedLng) => {
            setLat(pickedLat);
            setLng(pickedLng);
          }}
        />

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
