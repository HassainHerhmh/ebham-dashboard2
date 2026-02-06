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

type OrderTab = "pending" | "processing" | "ready" | "delivering" | "completed" | "cancelled";
type DateFilter = "all" | "today" | "week";

const WasselOrders: React.FC = () => {
  const [orders, setOrders] = useState<WasselOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WasselOrder | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  
  const navigate = useNavigate();
  const location = useLocation();

  // الفلاتر والتبويبات
  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

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
      let baseForm = { ...form };
      if (draft) {
        try { baseForm = JSON.parse(draft); } catch (err) { console.error(err); }
      }

      const updatedForm = { ...baseForm };
      if (state.target === "from") {
        setFromMode("map");
        updatedForm.from_address = state.value || "موقع من الخريطة";
        updatedForm.from_lat = state.lat;
        updatedForm.from_lng = state.lng;
        updatedForm.from_address_id = null;
      } else if (state.target === "to") {
        setToMode("map");
        updatedForm.to_address = state.value || "موقع من الخريطة";
        updatedForm.to_lat = state.lat;
        updatedForm.to_lng = state.lng;
        updatedForm.to_address_id = null;
      }

      setForm(updatedForm);
      setShowModal(true);
      sessionStorage.removeItem("wassel_form_draft");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  /* ======================
     الفلترة والحسابات
  ====================== */
  const filterByDate = (list: WasselOrder[]) => {
    const today = new Date().toISOString().split("T")[0];
    return list.filter((o) => {
      const oDate = new Date(o.created_at).toISOString().split("T")[0];
      if (dateFilter === "today") return oDate === today;
      if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(o.created_at) >= weekAgo;
      }
      return true;
    });
  };

  const filterByTab = (list: WasselOrder[]) => {
    switch (activeTab) {
      case "pending": return list.filter((o) => o.status === "pending");
      case "processing": return list.filter((o) => o.status === "confirmed" || o.status === "preparing");
      case "ready": return list.filter((o) => o.status === "ready");
      case "delivering": return list.filter((o) => o.status === "delivering");
      case "completed": return list.filter((o) => o.status === "completed");
      case "cancelled": return list.filter((o) => o.status === "cancelled");
      default: return list;
    }
  };

  const counts = {
    pending: filterByDate(orders).filter(o => o.status === "pending").length,
    processing: filterByDate(orders).filter(o => o.status === "confirmed" || o.status === "preparing").length,
    ready: filterByDate(orders).filter(o => o.status === "ready").length,
    delivering: filterByDate(orders).filter(o => o.status === "delivering").length,
    completed: filterByDate(orders).filter(o => o.status === "completed").length,
    cancelled: filterByDate(orders).filter(o => o.status === "cancelled").length,
  };

  const visibleOrders = filterByTab(filterByDate(orders));

  /* ======================
     Load Data
  ====================== */
  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wassel-orders");
      setOrders(res.data?.orders || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadOrders();
    api.get("/customers").then((res) => setCustomers(res.data.customers || []));
  }, []);

  useEffect(() => {
    if (form.customer_id) {
      api.get(`/customer-addresses/customer/${form.customer_id}`).then(res => setAddresses(res.data.addresses || []));
    }
  }, [form.customer_id]);

  /* ======================
     Handlers
  ====================== */
  const openAdd = () => {
    setEditingOrder(null);
    setFromMode("saved");
    setToMode("saved");
    setForm({
      customer_id: "", order_type: "", from_address_id: "", to_address_id: "",
      from_address: "", from_lat: null, from_lng: null,
      to_address: "", to_lat: null, to_lng: null,
      delivery_fee: 0, extra_fee: 0, notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (o: WasselOrder) => {
    setEditingOrder(o);
    setFromMode(o.from_address_id ? "saved" : "map");
    setToMode(o.to_address_id ? "saved" : "map");
    setForm({
      customer_id: o.customer_id || "",
      order_type: o.order_type,
      from_address_id: o.from_address_id || "",
      to_address_id: o.to_address_id || "",
      from_address: o.from_address,
      from_lat: o.from_lat, from_lng: o.from_lng,
      to_address: o.to_address,
      to_lat: o.to_lat, to_lng: o.to_lng,
      delivery_fee: o.delivery_fee || 0,
      extra_fee: o.extra_fee || 0,
      notes: o.notes || "",
    });
    setShowModal(true);
  };

  const goToMap = (target: "from" | "to") => {
    sessionStorage.setItem("wassel_form_draft", JSON.stringify(form));
    navigate("/map-picker", { state: { target, returnTo: "/orders/wassel" } });
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
        from_address_id: fromMode === "map" ? null : form.from_address_id,
        to_address_id: toMode === "map" ? null : form.to_address_id,
      };

      if (editingOrder) await api.put(`/wassel-orders/${editingOrder.id}`, payload);
      else await api.post("/wassel-orders", payload);

      setShowModal(false);
      loadOrders();
    } catch (err) { alert("خطأ في الحفظ"); }
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

      {/* الفلاتر */}
      <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
        <div className="flex gap-2 justify-center border-b pb-3">
          {[{ key: "all", label: "كل الطلبات" }, { key: "today", label: "اليوم" }, { key: "week", label: "الأسبوع" }].map((t) => (
            <button key={t.key} onClick={() => setDateFilter(t.key as DateFilter)}
              className={`px-4 py-1 rounded-full text-sm font-medium ${dateFilter === t.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          {[
            { key: "pending", label: "🟡 اعتماد" }, { key: "processing", label: "🔵 معالجة" },
            { key: "ready", label: "🟢 جاهز" }, { key: "delivering", label: "🚚 توصيل" },
            { key: "completed", label: "✅ مكتمل" }, { key: "cancelled", label: "❌ ملغي" },
          ].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key as OrderTab)}
              className={`px-4 py-2 rounded-lg border-b-4 transition-all ${activeTab === t.key ? "bg-blue-50 border-blue-600 text-blue-700" : "bg-white border-transparent text-gray-500"}`}>
              {t.label} ({counts[t.key as keyof typeof counts] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? <div className="p-6 text-center">⏳ جاري التحميل...</div> : (
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
              {visibleOrders.map((o, i) => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{i + 1}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.order_type}</td>
                  <td><button onClick={() => o.from_lat && window.open(`http://maps.google.com/?q=${o.from_lat},${o.from_lng}`)} className="text-blue-600 underline"><MapPin size={14} /></button></td>
                  <td><button onClick={() => o.to_lat && window.open(`http://maps.google.com/?q=${o.to_lat},${o.to_lng}`)} className="text-blue-600 underline"><MapPin size={14} /></button></td>
                  <td className="text-sm">🚚 {o.delivery_fee} | ➕ {o.extra_fee}</td>
                  <td>
                    <select value={o.status} onChange={async (e) => { await api.put(`/wassel-orders/status/${o.id}`, { status: e.target.value }); loadOrders(); }}
                      className="border rounded px-2 py-1 text-sm">
                      <option value="pending">إعتماد</option>
                      <option value="confirmed">مؤكد</option>
                      <option value="preparing">تجهيز</option>
                      <option value="ready">جاهز</option>
                      <option value="delivering">توصيل</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </td>
                  <td><button onClick={() => openEdit(o)} className="text-blue-600"><Edit size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length === 0 && <div className="p-10 text-center text-gray-500">لا توجد طلبات</div>}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">{editingOrder ? "✏️ تعديل طلب" : "➕ إضافة طلب"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <select className="p-2 border rounded" value={form.order_type} onChange={(e) => setForm({ ...form, order_type: e.target.value })}>
                <option value="">نوع الطلب</option><option value="كيكة">كيكة</option><option value="كرتون">كرتون</option><option value="مشوار">مشوار</option>
              </select>
              <select className="p-2 border rounded" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">العميل</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* From */}
            <div className="border p-3 rounded space-y-2">
              <div className="flex gap-2 text-sm font-bold">من (نقطة الانطلاق):</div>
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
                  {typeof form.from_lat === 'number' ? `📍 تم التحديد (${Number(form.from_lat).toFixed(4)})` : "📍 حدد من الخريطة"}
                </button>
              )}
            </div>

            {/* To */}
            <div className="border p-3 rounded space-y-2">
              <div className="flex gap-2 text-sm font-bold">إلى (نقطة الوصول):</div>
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
                  {typeof form.to_lat === 'number' ? `📍 تم التحديد (${Number(form.to_lat).toFixed(4)})` : "📍 حدد من الخريطة"}
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
              <button onClick={saveOrder} className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-1"><DollarSign size={16} /> حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasselOrders;
