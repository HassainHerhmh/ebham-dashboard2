import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Plus, Edit, MapPin, DollarSign, UserCheck, Truck } from "lucide-react";
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
  from_lat?: number | string;
  from_lng?: number | string;
  to_address: string;
  to_lat?: number | string;
  to_lng?: number | string;
  delivery_fee: number;
  extra_fee: number;
  notes?: string;
  status: string;
  created_at: string;
  captain_name?: string;
}

interface Captain {
  id: number;
  name: string;
  pending_orders: number;
  completed_today: number;
}

type OrderTab = "pending" | "processing" | "delivering" | "completed" | "cancelled";
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

  // الفلاتر
  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  // الكباتن
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainsLoading, setCaptainsLoading] = useState(false);
  const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const [fromMode, setFromMode] = useState<"saved" | "map">("saved");
  const [toMode, setToMode] = useState<"saved" | "map">("saved");

  const [form, setForm] = useState<any>({
    customer_id: "", order_type: "", from_address_id: "", to_address_id: "",
    from_address: "", from_lat: null, from_lng: null,
    to_address: "", to_lat: null, to_lng: null,
    delivery_fee: 0, extra_fee: 0, notes: "",
  });

  /* ======================
     الخريطة والمسودة
  ====================== */
  useEffect(() => {
    const state = location.state as any;
    const draft = sessionStorage.getItem("wassel_form_draft");

    if (state?.from === "map") {
      let baseForm = { ...form };
      if (draft) { try { baseForm = JSON.parse(draft); } catch (e) {} }

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
     الفلترة والبيانات
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
      case "pending": return list.filter(o => o.status === "pending");
      case "processing": return list.filter(o => o.status === "confirmed" || o.status === "preparing" || o.status === "ready");
      case "delivering": return list.filter(o => o.status === "delivering");
      case "completed": return list.filter(o => o.status === "completed");
      case "cancelled": return list.filter(o => o.status === "cancelled");
      default: return list;
    }
  };

  const counts = {
    pending: filterByDate(orders).filter(o => o.status === "pending").length,
    processing: filterByDate(orders).filter(o => o.status === "confirmed" || o.status === "preparing" || o.status === "ready").length,
    delivering: filterByDate(orders).filter(o => o.status === "delivering").length,
    completed: filterByDate(orders).filter(o => o.status === "completed").length,
    cancelled: filterByDate(orders).filter(o => o.status === "cancelled").length,
  };

  const visibleOrders = filterByTab(filterByDate(orders));

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wassel-orders");
      setOrders(res.data?.orders || []);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => {
    loadOrders();
    api.get("/customers").then(res => setCustomers(res.data.customers || []));
  }, []);

  useEffect(() => {
    if (form.customer_id) {
      api.get(`/customer-addresses/customer/${form.customer_id}`).then(res => setAddresses(res.data.addresses || []));
    }
  }, [form.customer_id]);

  /* ======================
     Handlers
  ====================== */
  const openCaptainModal = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsCaptainModalOpen(true);
    setCaptainsLoading(true);
    api.captains.getAvailableCaptains().then(res => {
      setCaptains(res.captains || res);
      setCaptainsLoading(false);
    });
  };

  const assignCaptain = async (captainId: number) => {
    if (!selectedOrderId) return;
    try {
      await api.orders.assignCaptain(selectedOrderId, captainId);
      // ملاحظة: تم إزالة تحديث الحالة التلقائي بناءً على طلبك
      setIsCaptainModalOpen(false);
      loadOrders();
      alert("✅ تم إسناد الكابتن للطلب");
    } catch (e) { alert("حدث خطأ، تأكد من وجود عمود captain_id"); }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await api.put(`/wassel-orders/status/${orderId}`, { status: newStatus });
      loadOrders();
    } catch (e) {}
  };

  const openAdd = () => {
    setEditingOrder(null);
    setFromMode("saved"); setToMode("saved");
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
      customer_id: o.customer_id || "", order_type: o.order_type,
      from_address_id: o.from_address_id || "", to_address_id: o.to_address_id || "",
      from_address: o.from_address, from_lat: o.from_lat, from_lng: o.from_lng,
      to_address: o.to_address, to_lat: o.to_lat, to_lng: o.to_lng,
      delivery_fee: o.delivery_fee || 0, extra_fee: o.extra_fee || 0, notes: o.notes || "",
    });
    setShowModal(true);
  };

  const goToMap = (target: "from" | "to") => {
    sessionStorage.setItem("wassel_form_draft", JSON.stringify(form));
    navigate("/map-picker", { state: { target, returnTo: "/orders/wassel" } });
  };

  const saveOrder = async () => {
    try {
      if (!form.customer_id || !form.order_type || !form.from_address || !form.to_address) return alert("أكمل البيانات");
      const payload = { 
        ...form, 
        delivery_fee: Number(form.delivery_fee), extra_fee: Number(form.extra_fee),
        from_address_id: fromMode === "map" ? null : form.from_address_id,
        to_address_id: toMode === "map" ? null : form.to_address_id,
      };
      if (editingOrder) await api.put(`/wassel-orders/${editingOrder.id}`, payload);
      else await api.post("/wassel-orders", payload);
      setShowModal(false); loadOrders();
    } catch (e) {}
  };

  const renderActions = (o: WasselOrder) => {
    if (activeTab === "pending") return <button onClick={() => updateOrderStatus(o.id, "confirmed")} className="bg-green-600 text-white px-2 py-1 rounded text-xs">إعتماد</button>;
    
    // التعديل هنا: إضافة زر قيد التوصيل بجانب الكابتن في مرحلة المعالجة
    if (activeTab === "processing") return (
      <div className="flex gap-1 justify-center">
         <button onClick={() => openCaptainModal(o.id)} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"><UserCheck size={12}/> كابتن</button>
         <button onClick={() => updateOrderStatus(o.id, "delivering")} className="bg-orange-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"><Truck size={12}/> توصيل</button>
      </div>
    );

    if (activeTab === "delivering") return <button onClick={() => updateOrderStatus(o.id, "completed")} className="bg-green-600 text-white px-2 py-1 rounded text-xs">تم التسليم</button>;
    return "—";
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">📦 طلبات وصل لي</h1>
        <button onClick={openAdd} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 transition">
          <Plus size={18} /> إضافة طلب
        </button>
      </div>

      {/* الفلاتر */}
      <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
        <div className="flex gap-2 justify-center border-b pb-3">
          {[{k:"all",l:"الكل"}, {k:"today",l:"اليوم"}, {k:"week",l:"الأسبوع"}].map(t=>(
            <button key={t.k} onClick={()=>setDateFilter(t.k as any)} className={`px-4 py-1 rounded-full text-sm font-medium ${dateFilter===t.k?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600"}`}>{t.l}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            {k:"pending",l:"🟡 اعتماد"}, {k:"processing",l:"🔵 معالجة"},
            {k:"delivering",l:"🚚 توصيل"}, {k:"completed",l:"✅ مكتمل"}, {k:"cancelled",l:"❌ ملغي"}
          ].map(t=>(
            <button key={t.k} onClick={()=>setActiveTab(t.k as any)} className={`px-4 py-2 rounded-lg border-b-4 transition-all ${activeTab===t.k?"bg-blue-50 border-blue-600 text-blue-700":"bg-white border-transparent text-gray-500"}`}>{t.l} ({counts[t.k as keyof typeof counts]})</button>
          ))}
        </div>
      </div>

      {/* الجدول */}
      {loading ? <div className="text-center py-10 text-gray-500 font-bold">⏳ جاري التحميل...</div> : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead className="bg-gray-50 text-gray-700">
              <tr className="border-b">
                <th className="p-3">#</th>
                <th>العميل</th>
                <th>الكابتن</th>
                <th>من</th>
                <th>إلى</th>
                <th>الرسوم</th>
                <th>الحالة</th>
                <th>إسناد</th>
                <th>تحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-600">
              {visibleOrders.map((o, i) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="p-3 font-bold">#{o.id}</td>
                  <td>{o.customer_name}</td>
                  <td className="text-indigo-600 font-bold">{o.captain_name || "—"}</td>
                  <td><button onClick={()=>o.from_lat && window.open(`https://www.google.com/maps?q=${o.from_lat},${o.from_lng}`)} className="text-blue-500"><MapPin size={16} /></button></td>
                  <td><button onClick={()=>o.to_lat && window.open(`https://www.google.com/maps?q=${o.to_lat},${o.to_lng}`)} className="text-blue-500"><MapPin size={16} /></button></td>
                  <td className="text-sm">🚚 {o.delivery_fee} | ➕ {o.extra_fee}</td>
                  <td>
                    <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                      <option value="pending">اعتماد</option><option value="confirmed">مؤكد</option><option value="delivering">توصيل</option><option value="completed">مكتمل</option>
                    </select>
                  </td>
                  <td>{renderActions(o)}</td>
                  <td><button onClick={()=>openEdit(o)} className="text-blue-600 p-1 hover:bg-blue-50 rounded"><Edit size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length===0 && <div className="p-10 text-center text-gray-400">لا توجد طلبات في هذا القسم</div>}
        </div>
      )}

      {/* مودال الكباتن */}
      {isCaptainModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold">🚗 إسناد كابتن</h2>
              <button onClick={()=>setIsCaptainModalOpen(false)} className="text-gray-400 hover:text-black">✖</button>
            </div>
            {captainsLoading ? <div className="text-center py-6">⏳ جاري التحميل...</div> : captains.length===0 ? <div className="text-center py-6 text-red-500">لا يوجد كباتن متاحين</div> : (
              <ul className="divide-y max-h-60 overflow-y-auto pr-2">
                {captains.map(c=>(
                  <li key={c.id} className="flex justify-between items-center py-3">
                    <div><p className="font-bold">{c.name}</p><p className="text-xs text-gray-400">معلقة: {c.pending_orders} | اليوم: {c.completed_today}</p></div>
                    <button onClick={()=>assignCaptain(c.id)} className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700">إسناد</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* مودال الإضافة/التعديل */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold">{editingOrder ? "✏️ تعديل طلب" : "➕ إضافة طلب"}</h2>
              <button onClick={()=>setShowModal(false)} className="text-gray-400">✖</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select className="p-3 border rounded-xl" value={form.order_type} onChange={(e)=>setForm({...form, order_type: e.target.value})}>
                <option value="">نوع الطلب</option><option value="كيكة">كيكة</option><option value="كرتون">كرتون</option><option value="مشوار">مشوار</option>
              </select>
              <select className="p-3 border rounded-xl" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}>
                <option value="">العميل</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* From */}
            <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
              <p className="font-bold text-sm text-gray-600">من (نقطة الانطلاق):</p>
              <div className="flex gap-2">
                <button onClick={()=>setFromMode("saved")} className={`flex-1 py-2 rounded-lg text-sm ${fromMode==="saved"?"bg-blue-600 text-white":"bg-white border"}`}>محفوظ</button>
                <button onClick={()=>setFromMode("map")} className={`flex-1 py-2 rounded-lg text-sm ${fromMode==="map"?"bg-blue-600 text-white":"bg-white border"}`}>الخريطة</button>
              </div>
              {fromMode==="saved" ? (
                <select className="w-full p-2 border rounded-lg text-sm" value={form.from_address_id} onChange={(e)=>{
                  const opt = e.target.selectedOptions[0];
                  setForm({...form, from_address_id: e.target.value, from_address: opt.dataset.address, from_lat: opt.dataset.lat, from_lng: opt.dataset.lng});
                }}>
                  <option value="">اختر عنواناً</option>
                  {addresses.map(a => <option key={a.id} value={a.id} data-address={a.address} data-lat={a.latitude} data-lng={a.longitude}>{a.address}</option>)}
                </select>
              ) : (
                <button onClick={()=>goToMap("from")} className="w-full p-2 border rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                  {(form.from_lat && !isNaN(Number(form.from_lat))) ? `📍 تم التحديد (${Number(form.from_lat).toFixed(4)})` : "📍 حدد من الخريطة"}
                </button>
              )}
            </div>

            {/* To */}
            <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
              <p className="font-bold text-sm text-gray-600">إلى (نقطة الوصول):</p>
              <div className="flex gap-2">
                <button onClick={()=>setToMode("saved")} className={`flex-1 py-2 rounded-lg text-sm ${toMode==="saved"?"bg-blue-600 text-white":"bg-white border"}`}>محفوظ</button>
                <button onClick={()=>setToMode("map")} className={`flex-1 py-2 rounded-lg text-sm ${toMode==="map"?"bg-blue-600 text-white":"bg-white border"}`}>الخريطة</button>
              </div>
              {toMode==="saved" ? (
                <select className="w-full p-2 border rounded-lg text-sm" value={form.to_address_id} onChange={(e)=>{
                  const opt = e.target.selectedOptions[0];
                  setForm({...form, to_address_id: e.target.value, to_address: opt.dataset.address, to_lat: opt.dataset.lat, to_lng: opt.dataset.lng});
                }}>
                  <option value="">اختر عنواناً</option>
                  {addresses.map(a => <option key={a.id} value={a.id} data-address={a.address} data-lat={a.latitude} data-lng={a.longitude}>{a.address}</option>)}
                </select>
              ) : (
                <button onClick={()=>goToMap("to")} className="w-full p-2 border rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                  {(form.to_lat && !isNaN(Number(form.to_lat))) ? `📍 تم التحديد (${Number(form.to_lat).toFixed(4)})` : "📍 حدد من الخريطة"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-xs text-gray-400">رسوم التوصيل</label><input type="number" className="w-full p-2 border rounded-lg" value={form.delivery_fee} onChange={(e)=>setForm({...form, delivery_fee: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-xs text-gray-400">إضافي</label><input type="number" className="w-full p-2 border rounded-lg" value={form.extra_fee} onChange={(e)=>setForm({...form, extra_fee: e.target.value})} /></div>
              <textarea placeholder="ملاحظات العميل..." className="w-full p-2 border rounded-xl col-span-2 min-h-[80px]" value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={()=>setShowModal(false)} className="px-5 py-2 text-gray-500">إلغاء</button>
              <button onClick={saveOrder} className="px-8 py-2 bg-green-600 text-white rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 transition font-bold">حفظ الطلب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasselOrders;
