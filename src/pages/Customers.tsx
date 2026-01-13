import React, { useState, useEffect, useRef } from "react";
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
  delivery_fee: number;
  neighborhoods: { id: number; name: string }[];
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
  location_type?: string;
  address?: string;
  gps_link?: string;
  latitude?: string;
  longitude?: string;
  branch_id?: number;
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
  const [selectedBranch, setSelectedBranch] = useState<string>("");

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

  const mapAddRef = useRef<HTMLDivElement | null>(null);

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
        isAdmin && selectedBranch
          ? { "x-branch-id": selectedBranch }
          : {},
    });

    if (res.data.success) setCustomers(res.data.customers);
    setLoading(false);
  };

  const fetchAddresses = async () => {
    const res = await api.get("/customer-addresses", {
      headers:
        isAdmin && selectedBranch
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
      a.customer_name
        .toLowerCase()
        .includes(searchAddress.toLowerCase()) ||
      (a.address || "")
        .toLowerCase()
        .includes(searchAddress.toLowerCase())
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
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

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
              {isAdmin && <th>الفرع</th>}
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
                {isAdmin && <td>{c.branch_name || "-"}</td>}
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

            <h2 className="text-xl font-bold mb-3">📍 إدارة العناوين</h2>

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
                    {isAdmin && <td>{a.branch_name}</td>}
                    <td>{a.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
