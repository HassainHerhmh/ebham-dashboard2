import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Plus, Edit, MapPin, DollarSign, UserCheck, Truck, CreditCard, Wallet, Landmark, Banknote } from "lucide-react";
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
  payment_method: string;
  created_at: string;
  captain_name?: string;
  creator_name?: string; 
  updater_name?: string; 
scheduled_at?: string | null;
  processing_at?: string | null;
ready_at?: string | null;
delivering_at?: string | null;
completed_at?: string | null;
cancelled_at?: string | null;


}

interface Captain {
  id: number;
  name: string;
  pending_orders: number;
  completed_today: number;
}

type OrderTab = "pending"   | "scheduled" | "processing" | "delivering" | "completed" | "cancelled";
type DateFilter = "all" | "today" | "week";

const WasselOrders: React.FC = () => {
  const [orders, setOrders] = useState<WasselOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WasselOrder | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [customerBalance, setCustomerBalance] = useState<{current_balance: number, credit_limit: number} | null>(null);
  const [scheduleMode, setScheduleMode] =
  useState<"now" | "today" | "tomorrow">("now");

  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

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
    payment_method: "cod",
    bank_id: ""
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
  const getFilteredByDateList = (list: WasselOrder[]) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');

    return list.filter((o) => {
      const orderDate = new Date(o.created_at);
      const orderDateStr = orderDate.toLocaleDateString('en-CA');

      if (dateFilter === "today") return orderDateStr === todayStr;
      if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        return orderDate >= weekAgo;
      }
      return true;
    });
  };

  const dateFilteredOrders = getFilteredByDateList(orders);

  const counts = {
    pending: dateFilteredOrders.filter(o => o.status === "pending").length,
    processing: dateFilteredOrders.filter(o => ["confirmed", "preparing", "ready"].includes(o.status)).length,
    delivering: dateFilteredOrders.filter(o => o.status === "delivering").length,
    completed: dateFilteredOrders.filter(o => o.status === "completed").length,
    cancelled: dateFilteredOrders.filter(o => o.status === "cancelled").length,
 scheduled: dateFilteredOrders.filter(o => o.status === "scheduled").length,
 // ✅ مجدولة


};

  const visibleOrders = dateFilteredOrders.filter(o => {
    switch (activeTab) {
      case "pending": return o.status === "pending";
      case "processing": return ["confirmed", "preparing", "ready"].includes(o.status);
      case "delivering": return o.status === "delivering";
      case "completed": return o.status === "completed";
      case "cancelled": return o.status === "cancelled";
      case "scheduled":return o.status === "scheduled";}
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wassel-orders");
      setOrders(res.data?.orders || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchCustomerWallet = async (customerId: number) => {
    try {
      // ✅ تم تعديل المسار ليتوافق مع الـ Backend الجديد الذي يدعم الأرصدة المحاسبية
      const res = await api.get(`/customer-guarantees/${customerId}/balance`);
      setCustomerBalance({
        current_balance: Number(res.data?.balance || 0),
        credit_limit: Number(res.data?.credit_limit || 0)
      });
    } catch (e) { 
      console.error("Error fetching wallet", e); 
      setCustomerBalance(null);
    }
  };

  useEffect(() => {
    loadOrders();
    api.get("/customers").then(res => setCustomers(res.data.customers || []));
    api.get("/wassel-orders/banks").then(res => setBanks(res.data.banks || []));
  }, []);

  useEffect(() => {
    if (form.customer_id) {
      setAddresses([]);
      api.get(`/customer-addresses/customer/${form.customer_id}`).then(res => setAddresses(res.data.addresses || []));
      fetchCustomerWallet(Number(form.customer_id));
    } else {
      setCustomerBalance(null);
    }
  }, [form.customer_id]);

  /* ======================
      Handlers
  ====================== */
  const openCaptainModal = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsCaptainModalOpen(true);
    setCaptainsLoading(true);
    api.get("/captains").then(res => {
      setCaptains(res.data.captains || []);
      setCaptainsLoading(false);
    });
  };

  const assignCaptain = async (captainId: number) => {
    if (!selectedOrderId) return;
    try {
      const res = await api.post("/wassel-orders/assign", { orderId: selectedOrderId, captainId });
      if (res.data.success) {
        setIsCaptainModalOpen(false);
        loadOrders();
      }
    } catch (e) { alert("حدث خطأ في الإسناد"); }
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
      payment_method: "cod",
      bank_id: ""
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
      payment_method: o.payment_method || "cod",
     
  bank_id: "",        // ✅ هنا فاصلة
  scheduled_at: "" // ✅ حقل الجدولة
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
      
      const totalAmount = Number(form.delivery_fee) + Number(form.extra_fee);

      if (form.payment_method === 'wallet') {
        if (!customerBalance) return alert("جاري التحقق من رصيد العميل...");
        const available = Number(customerBalance.current_balance) + Number(customerBalance.credit_limit);
        if (totalAmount > available) {
          return alert(`عذراً، الرصيد غير كافٍ. المتاح (مع السقف): ${available.toLocaleString()} ريال. العجز: ${(totalAmount - available).toLocaleString()} ريال`);
        }
      }

      if (form.payment_method === 'bank' && !form.bank_id) {
        return alert("يرجى اختيار البنك المحول إليه");
      }

   // تحديد الحالة حسب الجدولة
let status = "pending"; // افتراضي: الآن

if (scheduleMode !== "now" && form.scheduled_at) {
  status = "scheduled"; // مجدول
}

const payload = { 
  ...form,
  status, // 👈 مهم جدًا
  delivery_fee: Number(form.delivery_fee),
  extra_fee: Number(form.extra_fee),
  from_address_id: fromMode === "map" ? null : form.from_address_id,
  to_address_id: toMode === "map" ? null : form.to_address_id,
};


      if (editingOrder) await api.put(`/wassel-orders/${editingOrder.id}`, payload);
      else await api.post("/wassel-orders", payload);
      setShowModal(false); loadOrders();
    } catch (e: any) {
      alert(e.response?.data?.message || "حدث خطأ أثناء الحفظ");
    }
  };

  const renderActions = (o: WasselOrder) => {

  // لو الطلب مجدول
  if (o.status === "scheduled") {
    return (
      <button
        onClick={() => confirmScheduleApprove(o)}
        className="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700"
      >
        اعتماد
      </button>
    );
  }

  // طلب عادي
  if (o.status === "pending") {
    return (
      <button
        onClick={() => updateOrderStatus(o.id, "confirmed")}
        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
      >
        اعتماد
      </button>
    ); 
  }

  if (activeTab === "processing") {
    return (
      <div className="flex gap-1 justify-center">
        <button
          onClick={() => openCaptainModal(o.id)}
          className="bg-indigo-600 text-white px-2 py-1 rounded text-xs"
        >
          كابتن
        </button>

        <button
          onClick={() => updateOrderStatus(o.id, "delivering")}
          className="bg-orange-600 text-white px-2 py-1 rounded text-xs"
        >
          توصيل
        </button>
      </div>
    );
  }

  return "—";
};


  const renderPaymentIcon = (method: string) => {
    switch(method) {
      case 'cod': return <div className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100"><Banknote size={10}/> استلام</div>;
      case 'wallet': return <div className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100"><Wallet size={10}/> رصيد</div>;
      case 'bank': return <div className="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"><Landmark size={10}/> بنكي</div>;
      case 'online': return <div className="flex items-center gap-1 text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100"><CreditCard size={10}/> إلكتروني</div>;
      default: return '—';
    }
  };
/* ================= Scheduling (موحد) ================= */

// جلب الساعات
const [slots, setSlots] = useState<any[]>([]);

// اليوم / غدًا
const [dayTab, setDayTab] = useState<"today" | "tomorrow">("today");


useEffect(() => {
  api.get("/wassel-orders/manual/available-slots")
    .then(res => setSlots(res.data.slots || []))
    .catch(err => console.error("Slots Error:", err));
}, []);


/* فلترة الساعات حسب اليوم */
const filteredSlots = slots.filter((s) => {

  const date = new Date(s.start);

  const today = new Date();
  today.setHours(0,0,0,0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate()+1);

  const slotDay = new Date(date);
  slotDay.setHours(0,0,0,0);

  if (dayTab === "today") {
    return slotDay.getTime() === today.getTime();
  }

  if (dayTab === "tomorrow") {
    return slotDay.getTime() === tomorrow.getTime();
  }

  return false;
});


/* جلب الساعات */
useEffect(() => {

  api.get("/wassel-orders/manual/available-slots")
    .then(res => setSlots(res.data.slots || []))
    .catch(err => console.error("Slots Error:", err));

}, []);


// ================= Format schedule =================

/* ======================
   أدوات الوقت
====================== */

const formatTime = (t?: string | null) => {
  if (!t) return null;

  return new Date(t).toLocaleTimeString("ar-YE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSchedule = (dateStr?: string | null) => {
  if (!dateStr) return "—";

  const d = new Date(dateStr);

  const today = new Date();
  today.setHours(0,0,0,0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate()+1);

  const day = new Date(d);
  day.setHours(0,0,0,0);

  let label = "—";

  if (day.getTime() === today.getTime()) {
    label = "اليوم";
  } 
  else if (day.getTime() === tomorrow.getTime()) {
    label = "غدًا";
  }

  const time = d.toLocaleTimeString("ar-YE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${label} ${time}`;
};


const confirmScheduleApprove = (order: WasselOrder) => {

  const timeText = formatSchedule(order.scheduled_at);

  const ok = window.confirm(
    `⚠️ هذا الطلب مجدول\n\nموعده: ${timeText}\n\nهل تريد اعتماده الآن؟`
  );

  if (!ok) return;

  updateOrderStatus(order.id, "confirmed");
};



  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📦 طلبات وصل لي</h1>
        <button onClick={openAdd} className="bg-green-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100 font-bold">
          <Plus size={18} /> إضافة طلب
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
        <div className="flex gap-2 justify-center border-b pb-3">
          {[{k:"all",l:"الكل"}, {k:"today",l:"اليوم"}, {k:"week",l:"الأسبوع"}].map(t=>(
            <button key={t.k} onClick={()=>setDateFilter(t.k as any)} className={`px-4 py-1 rounded-full text-sm font-medium transition ${dateFilter===t.k?"bg-indigo-600 text-white shadow-sm":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{t.l}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            {k:"pending",l:"🟡 اعتماد"}, 
            {k:"processing",l:"🔵 معالجة"},
            {k:"delivering",l:"🚚 توصيل"}, 
            {k:"completed",l:"✅ مكتمل"}, 
            {k:"cancelled",l:"❌ ملغي"},
            {k:"scheduled",l:"📅 مجدولة"} // ✅ جديد

          ].map(t=>(
            <button key={t.k} onClick={()=>setActiveTab(t.k as any)} className={`px-4 py-2 rounded-lg border-b-4 transition-all ${activeTab===t.k?"bg-blue-50 border-blue-600 text-blue-700":"bg-white border-transparent text-gray-500 hover:bg-gray-50"}`}>{t.l} <span className="text-[10px] bg-white/50 px-1.5 rounded-full ml-1">({counts[t.k as keyof typeof counts]})</span></button>
          ))}
        </div>
      </div>

      {loading ? <div className="text-center py-20 bg-white rounded-2xl shadow-sm text-gray-400 animate-pulse">⏳ جاري تحميل الطلبات...</div> : (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto border border-gray-100">
          <table className="w-full text-center border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr className="border-b text-[11px] font-black">
                <th className="p-4"># المرجع</th>
                <th>اسم العميل</th>
                <th>كابتن التوصيل</th>
                <th>المواقع</th>
                <th>وسيلة الدفع</th>
                <th>إجمالي الرسوم</th>
                <th>حالة الطلب</th>
                <th>الإجراء</th>
                <th>المستخدم</th>
                <th className="p-4">تحكم</th>
                <th>وقت الحركة</th>


              </tr>
            </thead>
            <tbody className="divide-y text-gray-600">
              {visibleOrders.map((o) => (
                <tr key={o.id} className="hover:bg-blue-50/30 text-sm transition-colors">
                  <td className="p-4 font-black text-gray-400">#{o.id}</td>
                  <td className="font-bold text-gray-800">{o.customer_name}</td>
                  <td className="text-indigo-600 font-bold">{o.captain_name || <span className="text-gray-300 font-normal">لم يسند</span>}</td>
                  <td>
                    <div className="flex gap-2 justify-center">
                      <button onClick={()=>o.from_lat && window.open(`https://www.google.com/maps?q=${o.from_lat},${o.from_lng}`, "_blank")} className="text-blue-500 hover:scale-125 transition" title="نقطة الانطلاق"><MapPin size={14} /></button>
                      <button onClick={()=>o.to_lat && window.open(`https://www.google.com/maps?q=${o.to_lat},${o.to_lng}`, "_blank")} className="text-red-500 hover:scale-125 transition" title="نقطة الوصول"><MapPin size={14} /></button>
                    </div>
                  </td>
                  <td>{renderPaymentIcon(o.payment_method)}</td>
                  <td className="text-xs font-bold text-gray-800 bg-gray-50/50">{Number(o.delivery_fee) + Number(o.extra_fee)} ريال</td>
                  
                  <td className="px-2">
                    {o.status === "completed" || o.status === "cancelled" ? (
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        o.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {o.status === "completed" ? "مكتمل" : "ملغي"}
                      </span>
                    ) : (
                      <select 
                        value={o.status} 
                        onChange={(e) => updateOrderStatus(o.id, e.target.value)} 
                        className="border rounded-lg px-2 py-1 text-[11px] bg-white shadow-sm outline-none focus:ring-1 focus:ring-blue-300"
                      >
                        <option value="pending">اعتماد</option>
                        <option value="confirmed">مؤكد</option>
                        <option value="preparing">تحضير</option>
                        <option value="ready">جاهز</option>
                        <option value="delivering">توصيل</option>
                        <option value="cancelled">إلغاء</option>
                      </select>
                    )}
                  </td>
                  
                  <td>{renderActions(o)}</td>

                  <td className="px-2 text-[10px]">
                    {o.updater_name ? (
                      <div className="flex flex-col text-blue-600">
                        <span className="font-bold">📝 {o.updater_name}</span>
                        <span className="text-[8px] text-gray-400 italic">مُعدل</span>
                      </div>
                    ) : (
                      <div className="flex flex-col text-gray-500">
                        <span className="font-medium">👤 {o.creator_name || "نظام"}</span>
                        <span className="text-[8px] text-gray-300 italic">مُنشئ</span>
                      </div>
                    )}
                  </td>

    {/* عمود التحكم */}
<td className="p-2 text-center">
  <button
    onClick={()=>openEdit(o)}
    className="text-blue-600 p-2 hover:bg-blue-100 rounded-xl"
  >
    <Edit size={16}/>
  </button>
</td>

{/* عمود وقت الحركة */}
<td className="p-2 text-[10px] text-right space-y-1 font-bold text-indigo-600">

  {/* قبل التنفيذ */}
  {o.status === "scheduled" && o.scheduled_at&& (
    <div>📅 {formatSchedule(o.scheduled_at)}</div>
  )}

  {/* بعد التنفيذ */}
  {o.processing_at && (
    <div>⚙️ معالجة: {formatTime(o.processing_at)}</div>
  )}

  {o.ready_at && (
    <div>✅ جاهز: {formatTime(o.ready_at)}</div>
  )}

  {o.delivering_at && (
    <div>🚚 توصيل: {formatTime(o.delivering_at)}</div>
  )}

  {o.completed_at && (
    <div className="text-green-600">
      ✔️ مكتمل: {formatTime(o.completed_at)}
    </div>
  )}

  {o.cancelled_at && (
    <div className="text-red-600">
      ❌ ملغي: {formatTime(o.cancelled_at)}
    </div>
  )}

</td>

                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length===0 && <div className="p-20 text-center text-gray-400 font-medium">✨ لا توجد طلبات في هذا القسم حالياً</div>}
        </div>
      )}

      {isCaptainModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold">🚗 إسناد كابتن</h2>
              <button onClick={()=>setIsCaptainModalOpen(false)} className="text-gray-400 hover:text-black">✖</button>
            </div>
            {captainsLoading ? <div className="text-center py-6">⏳ جاري التحميل...</div> : captains.length===0 ? <div className="text-center py-6 text-red-500">لا يوجد كباتن متاحين</div> : (
              <ul className="divide-y max-h-60 overflow-y-auto pr-2">
                {captains.map(c=>(
                  <li key={c.id} className="flex justify-between items-center py-3 hover:bg-gray-50 px-2 transition-colors">
                    <div><p className="font-bold text-gray-800">{c.name}</p><p className="text-xs text-gray-400">معلقة: {c.pending_orders} | اليوم: {c.completed_today}</p></div>
                    <button onClick={()=>assignCaptain(c.id)} className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition shadow-sm">إسناد</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold">{editingOrder ? "✏️ تعديل طلب" : "➕ إضافة طلب"}</h2>
              <button onClick={()=>setShowModal(false)} className="text-gray-400">✖</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select className="p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" value={form.order_type} onChange={(e)=>setForm({...form, order_type: e.target.value})}>
                <option value="">نوع الطلب</option><option value="كيكة">كيكة</option><option value="كرتون">كرتون</option><option value="مشوار">مشوار</option>
              </select>
              <select className="p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}>
                <option value="">العميل</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
              <p className="font-bold text-sm text-gray-600">من (نقطة الانطلاق):</p>
              <div className="flex gap-2">
                <button onClick={()=>setFromMode("saved")} className={`flex-1 py-2 rounded-lg text-sm transition-colors ${fromMode==="saved"?"bg-blue-600 text-white shadow-sm":"bg-white border text-gray-500 hover:bg-gray-100"}`}>محفوظ</button>
                <button onClick={()=>setFromMode("map")} className={`flex-1 py-2 rounded-lg text-sm transition-colors ${fromMode==="map"?"bg-blue-600 text-white shadow-sm":"bg-white border text-gray-500 hover:bg-gray-100"}`}>الخريطة</button>
              </div>
              {fromMode==="saved" ? (
                <select className="w-full p-2 border rounded-lg text-sm bg-white" value={form.from_address_id} onChange={(e)=>{
                  const opt = e.target.selectedOptions[0];
                  setForm({...form, from_address_id: e.target.value, from_address: opt.dataset.address, from_lat: opt.dataset.lat, from_lng: opt.dataset.lng});
                }}>
                  <option value="">اختر عنواناً</option>
                  {addresses.map(a => <option key={a.id} value={a.id} data-address={a.address} data-lat={a.latitude} data-lng={a.longitude}>{a.address}</option>)}
                </select>
              ) : (
                <button onClick={()=>goToMap("from")} className="w-full p-2 border rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
                  {(form.from_lat && !isNaN(Number(form.from_lat))) ? `📍 تم التحديد (${Number(form.from_lat).toFixed(4)})` : "📍 حدد من الخريطة"}
                </button>
              )}
            </div>

            <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
              <p className="font-bold text-sm text-gray-600">إلى (نقطة الوصول):</p>
              <div className="flex gap-2">
                <button onClick={()=>setToMode("saved")} className={`flex-1 py-2 rounded-lg text-sm transition-colors ${toMode==="saved"?"bg-blue-600 text-white shadow-sm":"bg-white border text-gray-500 hover:bg-gray-100"}`}>محفوظ</button>
                <button onClick={()=>setToMode("map")} className={`flex-1 py-2 rounded-lg text-sm transition-colors ${toMode==="map"?"bg-blue-600 text-white shadow-sm":"bg-white border text-gray-500 hover:bg-gray-100"}`}>الخريطة</button>
              </div>
              {toMode==="saved" ? (
                <select className="w-full p-2 border rounded-lg text-sm bg-white" value={form.to_address_id} onChange={(e)=>{
                  const opt = e.target.selectedOptions[0];
                  setForm({...form, to_address_id: e.target.value, to_address: opt.dataset.address, to_lat: opt.dataset.lat, to_lng: opt.dataset.lng});
                }}>
                  <option value="">اختر عنواناً</option>
                  {addresses.map(a => <option key={a.id} value={a.id} data-address={a.address} data-lat={a.latitude} data-lng={a.longitude}>{a.address}</option>)}
                </select>
              ) : (
                <button onClick={()=>goToMap("to")} className="w-full p-2 border rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
                  {(form.to_lat && !isNaN(Number(form.to_lat))) ? `📍 تم التحديد (${Number(form.to_lat).toFixed(4)})` : "📍 حدد من الخريطة"}
                </button>
              )}
            </div>
{/* ================= الجدولة ================= */}
<div className="border p-4 rounded-2xl bg-gray-50 space-y-3">

  <p className="font-bold text-sm text-gray-600">
    ⏰ وقت التوصيل
  </p>

{/* الآن */}
<button
  onClick={() => {
    setScheduleMode("now");
    setForm({ ...form, scheduled_at: "" });
  }}

  className={`w-full py-3 rounded-xl font-bold text-sm transition

    ${
      scheduleMode === "now"
        ? "bg-lime-500 text-white"
        : "bg-gray-200 hover:bg-gray-300"
    }
  `}
>
  🚀 الآن
</button>




  {/* اليوم / غدًا */}
  <div className="grid grid-cols-2 gap-2">

<button
  onClick={() => setScheduleMode("today")}

  className={`py-2 rounded-lg font-bold text-sm transition

    ${
      scheduleMode === "today"
        ? "bg-lime-500 text-white"
        : "bg-gray-200 hover:bg-gray-300"
    }
  `}
>
  اليوم
</button>


<button
  onClick={() => setScheduleMode("tomorrow")}

  className={`py-2 rounded-lg font-bold text-sm transition

    ${
      scheduleMode === "tomorrow"
        ? "bg-lime-500 text-white"
        : "bg-gray-200 hover:bg-gray-300"
    }
  `}
>
  غدًا
</button>


  </div>


  {/* الساعات */}
  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">

    {filteredSlots.map((s, i) => {

      const startISO = new Date(s.start).toISOString();

      const start = new Date(s.start);
      const end   = new Date(s.end);

      const label =
        start.toLocaleTimeString("ar-YE", {
          hour:"2-digit",
          minute:"2-digit"
        }) +
        " - " +
        end.toLocaleTimeString("ar-YE", {
          hour:"2-digit",
          minute:"2-digit"
        });

      return (

        <button
          key={i}
          type="button"

          onClick={() =>
            setForm({
              ...form,
              scheduled_at: startISO
            })
          }

          className={`p-2 rounded-xl border text-[11px] font-bold transition
            ${
              form.scheduled_at === startISO
                ? "bg-lime-500 text-white border-lime-500"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }
          `}
        >

          <div>
            {dayTab === "today" ? "اليوم" : "غدًا"}
          </div>

          <div>{label}</div>

        </button>

      );
    })}

    {filteredSlots.length === 0 && (
      <div className="col-span-2 text-center text-gray-400 text-xs">
        لا توجد أوقات متاحة
      </div>
    )}

  </div>

</div>

            <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
              <p className="font-bold text-sm text-gray-600 flex items-center gap-2">💳 وسيلة الدفع:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: "cod", label: "عند الاستلام", icon: <Banknote size={14}/> },
                  { id: "wallet", label: "من الرصيد", icon: <Wallet size={14}/> },
                  { id: "bank", label: "إيداع بنكي", icon: <Landmark size={14}/> },
                  { id: "online", label: "دفع إلكتروني", icon: <CreditCard size={14}/> }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setForm({ ...form, payment_method: method.id })}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                      form.payment_method === method.id 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100" 
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {method.icon}
                    {method.label}
                  </button>
                ))}
              </div>

              {/* ✅ تحسين عرض الرصيد بشكل احترافي وملون */}
              {form.payment_method === 'wallet' && customerBalance && (
                <div className={`mt-3 p-3 rounded-2xl border-2 animate-in fade-in slide-in-from-top-2 ${
                  (Number(form.delivery_fee) + Number(form.extra_fee)) > (customerBalance.current_balance + customerBalance.credit_limit)
                  ? "bg-red-50 border-red-200"
                  : "bg-emerald-50 border-emerald-200"
                }`}>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-600 font-bold">الرصيد الفعلي:</span>
                      <span className={`font-black ${customerBalance.current_balance < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {customerBalance.current_balance.toLocaleString()} ريال
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-300 text-[11px]">
                      <span className="text-blue-700 font-black">المتاح (مع السقف):</span>
                      <span className="text-blue-800 font-black">
                        {(customerBalance.current_balance + customerBalance.credit_limit).toLocaleString()} ريال
                      </span>
                    </div>
                    {/* تنبيه العجز */}
                    {(Number(form.delivery_fee) + Number(form.extra_fee)) > (customerBalance.current_balance + customerBalance.credit_limit) && (
                      <div className="text-[10px] text-red-600 font-bold text-center mt-1 animate-pulse">
                        ⚠️ تنبيه: إجمالي الرسوم يتجاوز الرصيد المتاح!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ✅ اختيار البنك عند اختيار "إيداع بنكي" */}
              {form.payment_method === 'bank' && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                  <label className="text-[10px] font-bold text-gray-400 px-1">🏦 البنك المحول إليه:</label>
                  <select 
                    className="w-full p-2 border rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-indigo-300"
                    value={form.bank_id}
                    onChange={(e) => setForm({ ...form, bank_id: e.target.value })}
                  >
                    <option value="">-- اختر البنك --</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">رسوم التوصيل</label>
                <input type="number" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500" value={form.delivery_fee} onChange={(e)=>setForm({...form, delivery_fee: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">إضافي</label>
                <input type="number" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500" value={form.extra_fee} onChange={(e)=>setForm({...form, extra_fee: e.target.value})} />
              </div>
              <textarea placeholder="ملاحظات العميل..." className="w-full p-2 border rounded-xl col-span-2 min-h-[80px] outline-none focus:border-blue-500" value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={()=>setShowModal(false)} className="px-5 py-2 text-gray-500 hover:text-gray-700">إلغاء</button>
              <button onClick={saveOrder} className="px-8 py-2 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-all font-bold">حفظ الطلب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasselOrders;
