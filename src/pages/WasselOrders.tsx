import React, { useEffect, useState, useRef } from "react";
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
  from_address_id?: number;
  to_address_id?: number;
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

const WasselOrders: React.FC = () => {
  const [orders, setOrders] = useState<WasselOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WasselOrder | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  
  const navigate = useNavigate();
  const location = useLocation();

  const [fromMode, setFromMode] = useState<"saved" | "map">("saved");
  const [toMode, setToMode] = useState<"saved" | "map">("saved");

  const [form, setForm] = useState<any>({
    customer_id: "",
    order_type: "",
    from_address_id: "",
    to_address_id: "",
    from_address: "",
    from_lat: null,
    from_lng: null,
    to_address: "",
    to_lat: null,
    to_lng: null,
    delivery_fee: 0,
    extra_fee: 0,
    notes: "",
  });

  /* ======================
     Logic: استرجاع البيانات عند العودة من الخريطة
  ====================== */
  useEffect(() => {
    const state = location.state as any;
    const draft = sessionStorage.getItem("wassel_form_draft");

    if (state?.from === "map") {
      let baseForm = form;
      
      // إذا توفرت مسودة محفوظة، نستخدمها كأساس
      if (draft) {
        try {
          baseForm = JSON.parse(draft);
        } catch (err) {
          console.error("Draft parse error", err);
        }
      }

      // دمج البيانات الجديدة القادمة من الخريطة
      const updatedForm = { ...baseForm };
      
      if (state.target === "from") {
        setFromMode("map");
        updatedForm.from_address = state.value || "موقع من الخريطة";
        updatedForm.from_lat = state.lat;
        updatedForm.from_lng = state.lng;
  updated.from_address_id = null;
      } else if (state.target === "to") {
        setToMode("map");
        updatedForm.to_address = state.value || "موقع من الخريطة";
        updatedForm.to_lat = state.lat;
        updatedForm.to_lng = state.lng;
  updated.to_address_id = null;
      }

      setForm(updatedForm);
      setShowModal(true);
      
      // تنظيف الـ state والـ storage بعد الدمج
      sessionStorage.removeItem("wassel_form_draft");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  /* ======================
     Load Data
  ====================== */
  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wassel-orders");
      setOrders(res.data?.orders || []);
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async (id: number) => {
    const res = await api.get(`/customer-addresses/customer/${id}`);
    setAddresses(res.data.addresses || []);
  };

  useEffect(() => {
    loadOrders();
    api.get("/customers").then((res) => setCustomers(res.data.customers || []));
  }, []);

  useEffect(() => {
    if (form.customer_id) loadAddresses(Number(form.customer_id));
  }, [form.customer_id]);

  /* ======================
     Handlers
  ====================== */
  const openAdd = () => {
    setEditingOrder(null);
    setFromMode("saved");
    setToMode("saved");
    setForm({
      customer_id: "",
      order_type: "",
      from_address_id: "",
      to_address_id: "",
      from_address: "",
      from_lat: null,
      from_lng: null,
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
      from_address_id: o.from_address_id || "",
      to_address_id: o.to_address_id || "",
      from_address: o.from_address,
      from_lat: o.from_lat || null,
      from_lng: o.from_lng || null,
      to_address: o.to_address,
      to_lat: o.to_lat || null,
      to_lng: o.to_lng || null,
      delivery_fee: o.delivery_fee || 0,
      extra_fee: o.extra_fee || 0,
      notes: o.notes || "",
    });
    setShowModal(true);
  };

  const goToMap = (target: "from" | "to") => {
    sessionStorage.setItem("wassel_form_draft", JSON.stringify(form));
    navigate("/map-picker", {
      state: { target, returnTo: "/orders/wassel" },
    });
  };

  const saveOrder = async () => {
    try {
      if (!form.customer_id || !form.order_type || !form.from_address || !form.to_address) {
        return alert("أكمل جميع البيانات");
      }

      const payload = {
        ...form,
        delivery_fee: Number(form.delivery_fee),
        extra_fee: Number(form.extra_fee),
      };

      if (editingOrder) {
        await api.put(`/wassel-orders/${editingOrder.id}`, payload);
      } else {
        await api.post("/wassel-orders", payload);
      }

      setShowModal(false);
      loadOrders();
    } catch (err) {
      alert("حصل خطأ أثناء الحفظ");
    }
  };

  const openMap = (lat?: number, lng?: number) => {
    if (!lat || !lng) return alert("لا يوجد موقع محفوظ");
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📦 طلبات وصل لي</h1>
        <button onClick={openAdd} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Plus size={18} /> إضافة طلب
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-6 text-center">⏳ جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-center">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">#</th>
                <th>العميل</th>
                <th>نوع الطلب</th>
                <th>من</th>
                <th>إلى</th>
                <th>الرسوم</th>
                <th>الحالة</th>
                <th>تحكم</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{i + 1}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.order_type}</td>
                  <td>
                    <button onClick={() => openMap(o.from_lat, o.from_lng)} className="text-blue-600 underline flex items-center gap-1 justify-center">
                      <MapPin size={14} /> الموقع
                    </button>
                  </td>
                  <td>
                    <button onClick={() => openMap(o.to_lat, o.to_lng)} className="text-blue-600 underline flex items-center gap-1 justify-center">
                      <MapPin size={14} /> الموقع
                    </button>
                  </td>
                  <td className="text-sm">
                    🚚 {o.delivery_fee} | ➕ {o.extra_fee}
                  </td>
                  <td>
                    <select
                      value={o.status}
                      onChange={async (e) => {
                        await api.put(`/wassel-orders/status/${o.id}`, { status: e.target.value });
                        loadOrders();
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="pending">قيد الانتظار</option>
                      <option value="confirmed">مؤكد</option>
                      <option value="delivering">قيد التوصيل</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => openEdit(o)} className="text-blue-600 hover:underline flex items-center gap-1 justify-center">
                      <Edit size={14} /> تعديل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">{editingOrder ? "✏️ تعديل طلب" : "➕ إضافة طلب"}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="p-2 border rounded" value={form.order_type} onChange={(e) => setForm({ ...form, order_type: e.target.value })}>
                <option value="">نوع الطلب</option>
                <option value="كيكة">كيكة</option>
                <option value="كرتون">كرتون</option>
                <option value="مشوار">مشوار</option>
              </select>

              <select className="p-2 border rounded" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">اختر العميل</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* From Section */}
            <div className="border p-3 rounded space-y-2">
              <label className="font-bold text-sm text-gray-600">من (نقطة الانطلاق):</label>
              <div className="flex gap-2">
                <button onClick={() => setFromMode("saved")} className={`flex-1 py-1 rounded ${fromMode === "saved" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>محفوظ</button>
                <button onClick={() => setFromMode("map")} className={`flex-1 py-1 rounded ${fromMode === "map" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>الخريطة</button>
              </div>
              {fromMode === "saved" ? (
                <select className="w-full p-2 border rounded" value={form.from_address_id} onChange={(e) => {
                  const opt = e.target.selectedOptions[0];
                  setForm({ ...form, from_address_id: e.target.value, from_address: opt.dataset.address, from_lat: Number(opt.dataset.lat), from_lng: Number(opt.dataset.lng) });
                }}>
                  <option value="">اختر عنواناً</option>
                  {addresses.map(a => <option key={a.id} value={a.id} data-address={a.address} data-lat={a.latitude} data-lng={a.longitude}>{a.address}</option>)}
                </select>
              ) : (
                <button onClick={() => goToMap("from")} className="w-full p-2 border rounded bg-blue-50 text-blue-700 text-sm">
                  {form.from_lat ? `📍 تم تحديد الموقع (${form.from_lat.toFixed(4)})` : "📍 حدد من الخريطة"}
                </button>
              )}
            </div>

            {/* To Section */}
            <div className="border p-3 rounded space-y-2">
              <label className="font-bold text-sm text-gray-600">إلى (نقطة الوصول):</label>
              <div className="flex gap-2">
                <button onClick={() => setToMode("saved")} className={`flex-1 py-1 rounded ${toMode === "saved" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>محفوظ</button>
                <button onClick={() => setToMode("map")} className={`flex-1 py-1 rounded ${toMode === "map" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>الخريطة</button>
              </div>
              {toMode === "saved" ? (
                <select className="w-full p-2 border rounded" value={form.to_address_id} onChange={(e) => {
                  const opt = e.target.selectedOptions[0];
                  setForm({ ...form, to_address_id: e.target.value, to_address: opt.dataset.address, to_lat: Number(opt.dataset.lat), to_lng: Number(opt.dataset.lng) });
                }}>
                  <option value="">اختر عنواناً</option>
                  {addresses.map(a => <option key={a.id} value={a.id} data-address={a.address} data-lat={a.latitude} data-lng={a.longitude}>{a.address}</option>)}
                </select>
              ) : (
                <button onClick={() => goToMap("to")} className="w-full p-2 border rounded bg-blue-50 text-blue-700 text-sm">
                  {form.to_lat ? `📍 تم تحديد الموقع (${form.to_lat.toFixed(4)})` : "📍 حدد من الخريطة"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="رسوم التوصيل" className="p-2 border rounded" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} />
              <input type="number" placeholder="رسوم إضافية" className="p-2 border rounded" value={form.extra_fee} onChange={(e) => setForm({ ...form, extra_fee: e.target.value })} />
              <textarea placeholder="ملاحظات" className="w-full p-2 border rounded col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-400 text-white rounded">إلغاء</button>
              <button onClick={saveOrder} className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-1">
                <DollarSign size={16} /> حفظ الطلب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasselOrders;
