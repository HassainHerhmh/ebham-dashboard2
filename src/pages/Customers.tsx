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
  email?: string;
  created_at?: string;
  branch_id?: number;
  branch_name?: string;
}

interface Address {
  id: number;
  customer_id: number;
  customer_name: string;
  district: string;
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
                          className="text-blue-600 underline"
                        >
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

      {isAddCustomerOpen && (
        <AddCustomerModal onClose={() => setIsAddCustomerOpen(false)} onSaved={fetchCustomers} />
      )}
    </div>
  );
};

export default Customers;

/* ================= مودال إضافة عميل ================= */

const AddCustomerModal = ({ onClose, onSaved }: any) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const save = async () => {
    if (!name || !phone) return alert("البيانات ناقصة");
    await api.post("/customers", { name, phone });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-4 w-full max-w-md rounded">
        <h3 className="font-bold mb-3">➕ إضافة عميل</h3>
        <input className="border p-2 w-full mb-2" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border p-2 w-full mb-3" placeholder="الجوال" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button onClick={save} className="bg-green-600 text-white w-full py-2 rounded">حفظ</button>
      </div>
    </div>
  );
};

/* ================= مودال إضافة عنوان ================= */

const AddAddressModal = ({ customers, branches, onClose, onSaved }: any) => {
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
   const [locationType, setLocationType] = useState("");

  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!branchId) return setNeighborhoods([]);
    api.get(`/neighborhoods/by-branch/${branchId}`).then((res) => {
      if (res.data.success) setNeighborhoods(res.data.neighborhoods);
    });
  }, [branchId]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLat((15 + y / 10).toFixed(6));
    setLng((45 + x / 10).toFixed(6));
  };

  const gpsLink = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : "";

 const handleSave = async () => {
  if (!customerId || !district)
    return alert("❌ البيانات ناقصة");

  const res = await api.customers.addAddress({
    customer_id: Number(customerId),
    district: Number(district),
    location_type: locationType || null,
    address,
    latitude: lat,
    longitude: lng,
    gps_link: gpsLink,
  });

  if (res.success) {
    onSaved();
  }
};


  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl p-4 rounded relative">
        <button onClick={onClose} className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 text-xs rounded-full">✖</button>

        <h3 className="text-lg font-bold mb-3">➕ إضافة عنوان</h3>

        <select className="border p-2 w-full mb-2" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">اختر عميل</option>
          {customers.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select className="border p-2 w-full mb-2" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">اختر الفرع</option>
          {branches.map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select className="border p-2 w-full mb-2" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">اختر الحي</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.name}>{n.name}</option>
          ))}
        </select>
          <select
  className="border p-2 w-full"
  value={locationType}
  onChange={(e) => setLocationType(e.target.value)}
>
  <option value="">اختر نوع الموقع</option>
  <option value="شقة">شقة</option>
  <option value="منزل">منزل</option>
  <option value="محل">محل</option>
  <option value="مكتب">مكتب</option>
</select>

        <input className="border p-2 w-full mb-2" placeholder="العنوان التفصيلي" value={address} onChange={(e) => setAddress(e.target.value)} />

        <div className="flex gap-2 mb-2">
          <input className="border p-2 w-full" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <input className="border p-2 w-full" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
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
