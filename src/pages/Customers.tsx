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
  is_active?: number;
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

  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchAddress, setSearchAddress] = useState("");

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

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      c.phone.includes(searchCustomer)
  );

  const filteredAddresses = addresses.filter(
    (a) =>
      a.customer_name.toLowerCase().includes(searchAddress.toLowerCase()) ||
      (a.address || "").toLowerCase().includes(searchAddress.toLowerCase())
  );

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
    alert(res.data?.password ? `كلمة المرور الجديدة: ${res.data.password}` : "تمت العملية");
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📋 العملاء</h1>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setIsAddCustomerOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ➕ إضافة عميل
        </button>

        <button
          onClick={() => {
            fetchAddresses();
            setIsAddressesOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          📍 إدارة العناوين
        </button>
      </div>

      <input
        className="border p-2 rounded w-full"
        placeholder="بحث عن عميل"
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
                <td className={c.is_active === 0 ? "text-gray-400 line-through" : ""}>
                  {c.name}
                </td>
                <td>{c.phone}</td>
                <td>{c.phone_alt || "-"}</td>
                <td>{c.email || "-"}</td>
                {isAdmin && <td>{c.branch_name || "-"}</td>}
                <td>{c.created_at?.slice(0, 10)}</td>
                <td className="space-x-1 space-x-reverse">
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
                        <a href={a.gps_link} target="_blank" className="text-blue-600 underline">
                          GPS
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="flex gap-2 justify-center">
                      <button className="text-blue-600">تعديل</button>
                      <button className="text-red-600">حذف</button>
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
    </div>
  );
};

export default Customers;

/* ================= مودال إضافة عميل ================= */

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

    if (password !== confirmPassword)
      return alert("كلمة المرور غير متطابقة");

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
  const [branchId, setBranchId] = useState(isAdmin ? "" : String(userBranchId || ""));
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [district, setDistrict] = useState(""); // اسم الحي
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

  const gpsLink = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : "";

  const handleSave = async () => {
    if (!customerId || !district) return alert("❌ البيانات ناقصة");

    const res = await api.customers.addAddress({
      customer_id: Number(customerId),
      district, // اسم الحي
      location_type: locationType || null,
      address,
      latitude: lat,
      longitude: lng,
      gps_link: gpsLink,
      // الفرع يُحدد في السيرفر تلقائيًا لمستخدم الفرع
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
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.name}>
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
          <a href={gpsLink} target="_blank" className="text-blue-600 underline text-sm">
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
