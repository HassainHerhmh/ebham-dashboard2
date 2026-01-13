import React, { useState, useEffect } from "react";
import api from "../services/api";

declare global {
  interface Window {
    google: any;
  }
}

interface Branch {
  id: number;
  name: string;
}

interface City {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  created_at?: string;
  branch_id?: number;
  branch_name?: string;
}

interface Address {
  id: number;
  customer_id: number;
  customer_name: string;
  province: number;
  district: number;
  address?: string;
  branch_name?: string;
}

interface Neighborhood {
  id: number;
  name: string;
  city_id: number;
}

const Customers: React.FC = () => {
  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdmin = Boolean(currentUser?.is_admin_branch);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchAddress, setSearchAddress] = useState("");

  const [isAddressesOpen, setIsAddressesOpen] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [detailAddress, setDetailAddress] = useState("");

  const fetchBranches = async () => {
    if (!isAdmin) return;
    const res = await api.get("/branches");
    setBranches(res.data.branches || []);
  };

  const fetchCities = async () => {
    const data = await api.cities.getCities();
    if (data.success) setCities(data.cities);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await api.get("/customers", {
      headers:
        isAdmin && selectedBranch !== "all"
          ? { "x-branch-id": selectedBranch }
          : {},
    });
    if (res.data.success) setCustomers(res.data.customers);
    setLoading(false);
  };

  const fetchAddresses = async () => {
    const res = await api.get("/customer-addresses", {
      headers:
        isAdmin && selectedBranch !== "all"
          ? { "x-branch-id": selectedBranch }
          : {},
    });
    if (res.data.success) setAddresses(res.data.addresses);
  };

  useEffect(() => {
    fetchBranches();
    fetchCities();
    fetchCustomers();
  }, [selectedBranch]);

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

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📋 العملاء</h1>

        {isAdmin && (
          <select
            className="border p-2 rounded"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">الإدارة العامة</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex justify-between">
        <button className="bg-green-600 text-white px-4 py-2 rounded">
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
        {loading ? (
          <div className="p-6 text-center">جاري التحميل...</div>
        ) : (
          <table className="w-full text-center">
            <thead className="bg-gray-100">
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>الجوال</th>
                <th>البريد</th>
                {isAdmin && <th>الفرع</th>}
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="border-b">
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email || "-"}</td>
                  {isAdmin && <td>{c.branch_name || "-"}</td>}
                  <td>{c.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
                  <th>المدينة</th>
                  <th>الحي</th>
                  {isAdmin && <th>الفرع</th>}
                  <th>العنوان</th>
                </tr>
              </thead>
              <tbody>
                {filteredAddresses.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td>{a.customer_name}</td>
                    <td>{a.province}</td>
                    <td>{a.district}</td>
                    {isAdmin && <td>{a.branch_name || "-"}</td>}
                    <td>{a.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAddAddressOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md space-y-3">
            <h3 className="text-lg font-bold">➕ إضافة عنوان</h3>

            <select
              className="border p-2 w-full"
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
              className="border p-2 w-full"
              value={province}
              onChange={async (e) => {
                setProvince(e.target.value);
                const res = await api.neighborhoods.getByCity(
                  Number(e.target.value)
                );
                if (res.success) setNeighborhoods(res.neighborhoods);
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
              className="border p-2 w-full"
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

            <input
              className="border p-2 w-full"
              placeholder="العنوان التفصيلي"
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setIsAddAddressOpen(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded w-full"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!selectedCustomer || !province || !district)
                    return alert("البيانات مطلوبة");

                  const res = await api.customers.addAddress({
                    customer_id: Number(selectedCustomer),
                    province: Number(province),
                    district: Number(district),
                    address: detailAddress,
                  });

                  if (res.success) {
                    setIsAddAddressOpen(false);
                    fetchAddresses();
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded w-full"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
