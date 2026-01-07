import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";

declare global {
  interface Window {
    google: any;
  }
}

/* =========================
   Interfaces
========================= */
interface City {
  id: number;
  name: string;
  delivery_fee: number;
}

interface Neighborhood {
  id: number;
  name: string;
  city_id: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  created_at?: string;
}

interface Address {
  id: number;
  customer_id: number;
  customer_name: string;
  province: number;
  district: number;
  location_type?: string;
  address?: string;
  gps_link?: string;
  latitude?: string;
  longitude?: string;
}

/* =========================
   Component
========================= */
const Customers: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchAddress, setSearchAddress] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddressesOpen, setIsAddressesOpen] = useState(false);

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isEditMapOpen, setIsEditMapOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [locationType, setLocationType] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [gpsLink, setGpsLink] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [editAddress, setEditAddress] = useState<Address | null>(null);

  const mapAddRef = useRef<HTMLDivElement | null>(null);
  const mapEditRef = useRef<HTMLDivElement | null>(null);

  /* =========================
     Fetch Data
  ========================= */
  const fetchCities = async () => {
    const data = await api.cities.getCities();
    if (data.success) setCities(data.cities);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const data = await api.customers.getCustomers();
    if (data.success) setCustomers(data.customers);
    setLoading(false);
  };

  const fetchAddresses = async () => {
    const data = await api.customers.getAddresses();
    if (data.success) setAddresses(data.addresses);
  };

  const fetchNeighborhoodsByCity = async (cityId: string) => {
    if (!cityId) {
      setNeighborhoods([]);
      return;
    }

    const data = await api.cities.searchNeighborhoods("");
    if (data.success) {
      setNeighborhoods(
        data.neighborhoods.filter(
          (n: Neighborhood) => String(n.city_id) === cityId
        )
      );
    }
  };

  useEffect(() => {
    fetchCities();
    fetchCustomers();
  }, []);

  /* =========================
     Customers Logic
  ========================= */
  const handleAddCustomer = async () => {
    if (!newName || !newPhone || !newPassword)
      return alert("❌ جميع الحقول مطلوبة");

    if (newPassword !== confirmPassword)
      return alert("❌ كلمة المرور غير متطابقة");

    const data = await api.customers.addCustomer({
      name: newName,
      phone: newPhone,
      email: newEmail,
      password: newPassword,
    });

    if (data.success) {
      setIsAddOpen(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
      fetchCustomers();
    }
  };

  const handleEditCustomer = async () => {
    if (!editCustomer) return;

    await api.customers.updateCustomer(editCustomer.id, {
      name: editName,
      phone: editPhone,
      email: editEmail,
    });

    setIsEditOpen(false);
    fetchCustomers();
  };

  const handleResetPassword = async (id: number) => {
    const data = await api.customers.resetPassword(id);
    if (data.success) {
      navigator.clipboard.writeText(data.new_password);
      alert(`كلمة المرور الجديدة: ${data.new_password}`);
    }
  };

  const deleteCustomer = async (id: number) => {
    if (!window.confirm("تأكيد الحذف؟")) return;
    await api.customers.deleteCustomer(id);
    fetchCustomers();
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      c.phone.includes(searchCustomer)
  );

  /* =========================
     JSX
  ========================= */
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">📋 العملاء</h1>

      <div className="flex justify-between">
        <button
          onClick={() => setIsAddOpen(true)}
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
              <th>البريد</th>
              <th>التاريخ</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr key={c.id} className="border-b">
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.email || "-"}</td>
                <td>{c.created_at?.slice(0, 10)}</td>
                <td className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      setEditCustomer(c);
                      setEditName(c.name);
                      setEditPhone(c.phone);
                      setEditEmail(c.email || "");
                      setIsEditOpen(true);
                    }}
                    className="text-blue-600"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleResetPassword(c.id)}
                    className="text-purple-600"
                  >
                    كلمة مرور
                  </button>
                  <button
                    onClick={() => deleteCustomer(c.id)}
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

      {/* إدارة العناوين */}
      {isAddressesOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-4xl h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-3">📍 إدارة العناوين</h2>

            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedCustomer || !province || !district)
                  return alert("❌ البيانات مطلوبة");

                const data = await api.customers.addAddress({
                  customer_id: Number(selectedCustomer),
                  city_id: Number(province),
                  neighborhood_id: Number(district),
                  location_type: locationType,
                  address: detailAddress,
                  gps_link: gpsLink,
                  latitude,
                  longitude,
                });

                if (data.success) {
                  alert("✔ تم إضافة العنوان");
                  setProvince("");
                  setDistrict("");
                  setNeighborhoods([]);
                  fetchAddresses();
                }
              }}
            >
              <select
                className="border p-2 rounded w-full"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="">اختر عميل</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="border p-2 rounded w-full"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setDistrict("");
                  fetchNeighborhoodsByCity(e.target.value);
                }}
              >
                <option value="">اختر المدينة</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="border p-2 rounded w-full"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                <option value="">اختر الحي</option>
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>

              <button className="bg-green-600 text-white p-2 rounded w-full">
                حفظ العنوان
              </button>
            </form>

            <button
              onClick={() => setIsAddressesOpen(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded w-full mt-4"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
