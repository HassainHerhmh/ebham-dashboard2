import React, { useState, useEffect } from "react";
import api from "../services/api";

interface Branch {
  id: number;
  name: string;
}

interface City {
  id: number;
  name: string;
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
  branch_name?: string;
}

interface Address {
  id: number;
  customer_id: number;
  customer_name: string;
  province: number;
  district: number;
  address?: string;
  latitude?: string;
  longitude?: string;
  gps_link?: string;
  branch_name?: string;
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

  const [isAddressesOpen, setIsAddressesOpen] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsLink, setGpsLink] = useState("");

  const fetchBranches = async () => {
    if (!isAdmin) return;
    const res = await api.get("/branches");
    setBranches(res.data.branches || []);
  };

  const fetchCities = async () => {
    const res = await api.cities.getCities();
    if (res.success) setCities(res.cities);
  };

  const fetchCustomers = async () => {
    const res = await api.get("/customers", {
      headers:
        isAdmin && selectedBranch !== "all"
          ? { "x-branch-id": selectedBranch }
          : {},
    });
    if (res.data.success) setCustomers(res.data.customers);
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

  const handleAddAddress = async () => {
    if (!selectedCustomer || !province || !district)
      return alert("❌ البيانات مطلوبة");

    const data = await api.customers.addAddress({
      customer_id: Number(selectedCustomer),
      province: Number(province),
      district: Number(district),
      address: detailAddress,
      latitude,
      longitude,
      gps_link: gpsLink,
    });

    if (data.success) {
      setIsAddAddressOpen(false (false));
      setSelectedCustomer("");
      setProvince("");
      setDistrict("");
      setDetailAddress("");
      setLatitude("");
      setLongitude("");
      setGpsLink("");
      fetchAddresses();
    }
  };

  useEffect(() => {
    if (latitude && longitude) {
      setGpsLink(`https://www.google.com/maps?q=${latitude},${longitude}`);
    }
  }, [latitude, longitude]);

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

      <button
        onClick={() => {
          fetchAddresses();
          setIsAddressesOpen(true);
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        📍 إدارة العناوين
      </button>

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

            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th>العميل</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>GPS</th>
                  {isAdmin && <th>الفرع</th>}
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {addresses.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td>{a.customer_name}</td>
                    <td>{a.latitude}</td>
                    <td>{a.longitude}</td>
                    <td>
                      {a.gps_link ? (
                        <a
                          href={a.gps_link}
                          target="_blank"
                          className="text-blue-600 underline"
                        >
                          GPS
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    {isAdmin && <td>{a.branch_name || "-"}</td>}
                    <td>
                      <button
                        onClick={async () => {
                          if (!window.confirm("حذف العنوان؟")) return;
                          await api.delete(`/customer-addresses/${a.id}`);
                          fetchAddresses();
                        }}
                        className="text-red-600"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAddAddressOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-lg p-6 rounded">
            <h3 className="text-lg font-bold mb-3">➕ إضافة عنوان</h3>

            <select
              className="border p-2 w-full mb-2"
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
              className="border p-2 w-full mb-2"
              value={province}
              onChange={async (e) => {
                const cityId = e.target.value;
                setProvince(cityId);
                setDistrict("");
                const res = await api.neighborhoods.getByCity(Number(cityId));
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
              className="border p-2 w-full mb-2"
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
              className="border p-2 w-full mb-2"
              placeholder="العنوان التفصيلي"
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
            />

            <div className="flex gap-2 mb-2">
              <input
                className="border p-2 w-full"
                placeholder="Latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              <input
                className="border p-2 w-full"
                placeholder="Longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>

            <input
              className="border p-2 w-full mb-3"
              placeholder="GPS Link"
              value={gpsLink}
              readOnly
            />

            <iframe
              title="map"
              className="w-full h-48 border mb-3"
              src={
                latitude && longitude
                  ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude},${latitude},${longitude},${latitude}&layer=mapnik`
                  : "https://www.openstreetmap.org/export/embed.html"
              }
            />

            <div className="flex gap-2">
              <button
                onClick={handleAddAddress}
                className="bg-green-600 text-white px-4 py-2 rounded w-full"
              >
                حفظ
              </button>
              <button
                onClick={() => setIsAddAddressOpen(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded w-full"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
