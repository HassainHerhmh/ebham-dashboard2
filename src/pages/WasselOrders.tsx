import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Plus, Edit, MapPin, DollarSign } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

/* ======================
   Types
====================== */

interface WasselOrder {
  id: number;

  customer_name: string;
  customer_id?: number;

  order_type: string;

  from_address: string;
  from_lat?: number;
  from_lng?: number;

  to_address: string;
  to_lat?: number;
  to_lng?: number;

  delivery_fee: number;
  extra_fee: number;

  notes?: string;

  status: string;

  created_at: string;
}

/* ======================
   Component
====================== */

const WasselOrders: React.FC = () => {
  const [orders, setOrders] = useState<WasselOrder[]>([]);
  const [loading, setLoading] = useState(true);

  /* Modal */
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WasselOrder | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  const navigate = useNavigate();
  const location = useLocation();

  const [fromMode, setFromMode] = useState<"saved" | "map">("saved");
  const [toMode, setToMode] = useState<"saved" | "map">("saved");

  /* Form */
  const [form, setForm] = useState<any>({
    customer_id: "",
    order_type: "",

    from_address_id: "",
    from_address: "",
    from_lat: null,
    from_lng: null,

    to_address_id: "",
    to_address: "",
    to_lat: null,
    to_lng: null,

    delivery_fee: 0,
    extra_fee: 0,
    notes: "",
  });

  /* ======================
     Load Orders
  ====================== */

  const loadOrders = async () => {
    try {
      setLoading(true);

      const res = await api.get("/wassel-orders");

      setOrders(res.data?.orders || []);
    } catch (err) {
      console.error("Load Wassel Orders Error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  /* ======================
     Handlers
  ====================== */

  const openAdd = () => {
    setEditingOrder(null);

    setForm({
      customer_id: "",
      order_type: "",

      from_address_id: "",
      from_address: "",
      from_lat: null,
      from_lng: null,

      to_address_id: "",
      to_address: "",
      to_lat: null,
      to_lng: null,

      delivery_fee: 0,
      extra_fee: 0,
      notes: "",
    });

    setShowModal(true);
  };

  const openEdit = (o: WasselOrder) => {
    setEditingOrder(o);

    setForm({
      customer_id: o.customer_id || "",

      order_type: o.order_type,

      from_address_id: "",
      from_address: o.from_address,
      from_lat: o.from_lat || null,
      from_lng: o.from_lng || null,

      to_address_id: "",
      to_address: o.to_address,
      to_lat: o.to_lat || null,
      to_lng: o.to_lng || null,

      delivery_fee: o.delivery_fee || 0,
      extra_fee: o.extra_fee || 0,
      notes: o.notes || "",
    });

    setShowModal(true);
  };

  const saveOrder = async () => {
    try {
      if (
        !form.customer_id ||
        !form.order_type ||
        !form.from_address ||
        !form.to_address
      ) {
        return alert("أكمل جميع البيانات");
      }

      const payload = {
        ...form,
        delivery_fee: Number(form.delivery_fee || 0),
        extra_fee: Number(form.extra_fee || 0),
      };

      if (editingOrder) {
        await api.put(`/wassel-orders/${editingOrder.id}`, payload);
      } else {
        await api.post("/wassel-orders", payload);
      }

      setShowModal(false);
      loadOrders();
    } catch (err) {
      console.error("Save Error:", err);
      alert("حصل خطأ");
    }
  };

  const openMap = (lat?: number, lng?: number) => {
    if (lat == null || lng == null) {
      return alert("لا يوجد موقع محفوظ");
    }

    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const loadAddresses = async (id: number) => {
    const res = await api.get(`/customer-addresses/customer/${id}`);
    setAddresses(res.data.addresses || []);
  };

  useEffect(() => {
    if (showModal) {
      api.get("/customers").then((res) => {
        setCustomers(res.data.customers || []);
      });
    }
  }, [showModal]);

  /* ======================
     JSX
  ====================== */

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📦 طلبات وصل لي</h1>

        <button
          onClick={openAdd}
          className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={18} /> إضافة طلب
        </button>
      </div>

{/* ================= MODAL ================= */}
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

    <div className="bg-white rounded-xl w-full max-w-xl p-6 space-y-4">

      <h2 className="text-xl font-bold">
        {editingOrder ? "✏️ تعديل طلب" : "➕ إضافة طلب"}
      </h2>

{/* Customer */}
<select
  className="w-full p-2 border rounded"
  value={form.customer_id}
  onChange={(e) => {
    const id = e.target.value;
    setForm({ ...form, customer_id: id });
    loadAddresses(id);
  }}
>
  <option value="">اختر العميل</option>

  {customers.map((c) => (
    <option key={c.id} value={c.id}>
      {c.name} - {c.phone}
    </option>
  ))}
</select>

{/* From */}
<select
  className="w-full p-2 border rounded"
  value={form.from_address_id}
  onChange={(e) => {
    const opt = e.target.selectedOptions[0];

    setForm({
      ...form,
      from_address_id: e.target.value,
      from_address: opt.dataset.address,
      from_lat: Number(opt.dataset.lat),
      from_lng: Number(opt.dataset.lng),
    });
  }}
>
  <option value="">اختر عنوان البداية</option>

  {addresses.map((a) => (
    <option
      key={a.id}
      value={a.id}
      data-address={a.address}
      data-lat={a.latitude}
      data-lng={a.longitude}
    >
      {a.neighborhood_name} - {a.address}
    </option>
  ))}
</select>

{/* To */}
<select
  className="w-full p-2 border rounded"
  value={form.to_address_id}
  onChange={(e) => {
    const opt = e.target.selectedOptions[0];

    setForm({
      ...form,
      to_address_id: e.target.value,
      to_address: opt.dataset.address,
      to_lat: Number(opt.dataset.lat),
      to_lng: Number(opt.dataset.lng),
    });
  }}
>
  <option value="">اختر عنوان النهاية</option>

  {addresses.map((a) => (
    <option
      key={a.id}
      value={a.id}
      data-address={a.address}
      data-lat={a.latitude}
      data-lng={a.longitude}
    >
      {a.neighborhood_name} - {a.address}
    </option>
  ))}
</select>

{/* Fees */}
<div className="grid grid-cols-2 gap-3">

  <input
    type="number"
    placeholder="رسوم التوصيل"
    className="p-2 border rounded"
    value={form.delivery_fee}
    onChange={(e) =>
      setForm({ ...form, delivery_fee: e.target.value })
    }
  />

  <input
    type="number"
    placeholder="رسوم إضافية"
    className="p-2 border rounded"
    value={form.extra_fee}
    onChange={(e) =>
      setForm({ ...form, extra_fee: e.target.value })
    }
  />

  <textarea
    placeholder="ملاحظات"
    className="w-full p-2 border rounded col-span-2"
    value={form.notes}
    onChange={(e) =>
      setForm({ ...form, notes: e.target.value })
    }
  />

</div>

{/* Buttons */}
<div className="flex justify-end gap-3">

  <button
    onClick={() => setShowModal(false)}
    className="px-4 py-2 bg-gray-400 text-white rounded"
  >
    إلغاء
  </button>

  <button
    onClick={saveOrder}
    className="px-4 py-2 bg-green-600 text-white rounded"
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

export default WasselOrders;
