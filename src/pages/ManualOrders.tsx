import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import {  
  Plus, Trash2, Save, ShoppingCart,  
  X, Search, Eye, FileText,  
  LayoutList, CreditCard, Banknote, Wallet, Building2, Globe,
  CheckCircle, Clock, Truck, AlertCircle, Printer, Edit, UserCheck
} from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { Calendar } from "lucide-react";

/* ======================
    الأنواع (Types)
====================== */
interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

type OrderTab =
  | "pending"
  | "scheduled"
  | "processing"
  | "ready"
  | "delivering"
  | "completed"
  | "cancelled";
type DateFilter = "all" | "today" | "week";

const ManualOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [banks, setBanks] = useState<any[]>([]);
const [editingId, setEditingId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [editingOrder, setEditingOrder] = useState<any>(null);
const [slots,setSlots] = useState<any[]>([]);
const [dayTab,setDayTab] = useState("today");

  // Captain Assign
  const [captains, setCaptains] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [captainsLoading, setCaptainsLoading] = useState(false);
const [notifications, setNotifications] = useState([]);
const [showNotifications, setShowNotifications] = useState(false);

  // بيانات المودال
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]); 
  const [customerBalance, setCustomerBalance] = useState<any>(null);
  
  // المنتجات داخل المودال
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemName, setNewItemName] = useState("");

  const printRef = useRef<HTMLDivElement>(null);
const notifiedRef = useRef({
  delayed: new Set(),
  near: new Set()
});
  const [form, setForm] = useState({
    customer_id: "",
    restaurant_id: "",
    to_address: "",
    delivery_fee: 0,
    notes: "",
    payment_method: "cod",
      bank_id: "", // ✅ مهم
  scheduled_time: "", // ⭐ مهم جداً

  });



  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

const notifyUser = (title, body) => {

  const newNotification = {
    id: Date.now() + Math.random(),
    title,
    body,
    time: new Date(),
    read: false
  };

  // حفظ في القائمة
setNotifications(prev => 
  [newNotification, ...prev].slice(0, 50)
);

  // إشعار المتصفح
  if ("Notification" in window) {

    if (Notification.permission === "granted") {

      new Notification(title, { body });

    } else if (Notification.permission !== "denied") {

      Notification.requestPermission();

    }

  }
};

const resetForm = () => {

  setForm({
    customer_id: "",
    restaurant_id: "",
    to_address: "",
    delivery_fee: 0,
    notes: "",
    payment_method: "cod",
    bank_id: "",
    scheduled_time: ""
  });

  setItems([]);

  setEditingOrder(null);
  setEditingId(null); // 👈 مهم
};


  
  /* ======================
      تحميل البيانات (API)
  ====================== */
const loadInitialData = async () => {
  try {
    setLoading(true);

    const [
      ordersRes,
      custRes,
      restRes,
      banksRes // ✅ استقبل البنوك
    ] = await Promise.all([

     api.get("/manual-orders/manual-list"),
      api.get("/customers"),
      api.get("/restaurants"),
api.get("/banks")
    ]);

    setOrders(ordersRes.data?.orders || []);
    setCustomers(custRes.data.customers || []);
notifiedRef.current.delayed.clear();
notifiedRef.current.near.clear();

    const slotsRes =
  await api.get("/manual-orders/available-slots");

setSlots(slotsRes.data.slots || []);

    const manualRestaurants =
      (restRes.data?.restaurants || [])
        .filter((r: any) => r.display_type === "manual");

    setAgents(manualRestaurants);

    // ✅ أهم سطر
    setBanks(banksRes.data?.banks || []);

  } catch (e) {
    console.error("❌ Error loading data", e);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => { loadInitialData(); }, []);

  

  useEffect(() => {
    if (form.customer_id) {
      api.get(`/customer-addresses/customer/${form.customer_id}`).then(res => setAddresses(res.data.addresses || []));
      api.get(`/customer-guarantees/${form.customer_id}/balance`).then(res => setCustomerBalance(res.data));
    }
  }, [form.customer_id]);

 /* ======================
   الفلترة والتاريخ
====================== */

// فلترة حسب اليوم / الأسبوع
const getFilteredByDateList = (list: any[]) => {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA");

  return list.filter((o) => {
    if (!o.created_at) return true;

    const orderDate = new Date(o.created_at);
    const orderDateStr =
      orderDate.toLocaleDateString("en-CA");

    if (dateFilter === "today") {
      return orderDateStr === todayStr;
    }

    if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);

      return orderDate >= weekAgo;
    }

    return true;
  });
};


// البيانات بعد فلترة التاريخ
const dateFilteredOrders =
  getFilteredByDateList(orders);


// خريطة الحالات
const statusMap: Record<string, string[]> = {
  pending: ["pending"],
  scheduled: ["pending"], // المجدولة = pending + وقت
  processing: ["processing", "confirmed"],
  ready: ["ready"],
  delivering: ["delivering"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};


// الطلبات المعروضة
const filteredOrders = dateFilteredOrders

  // فلترة
  .filter((o) => {

    const matchSearch =
      o.customer_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      o.id.toString().includes(searchTerm);

    let tabMatch =
      statusMap[activeTab]?.includes(o.status);


    // تبويب المجدولة فقط
    if (activeTab === "scheduled") {
      tabMatch =
        o.status === "pending" &&
        !!o.scheduled_time;
    }

    return matchSearch && tabMatch;
  })

  // ترتيب حسب وقت الجدولة
  .sort((a, b) => {

    if (!a.scheduled_time && !b.scheduled_time) return 0;
    if (!a.scheduled_time) return 1;
    if (!b.scheduled_time) return -1;

    return (
      new Date(a.scheduled_time).getTime() -
      new Date(b.scheduled_time).getTime()
    );
  });


// عدّاد التبويبات
const getStatusCounts = (status: OrderTab) => {

  return dateFilteredOrders.filter((o) => {

    // المجدولة
    if (status === "scheduled") {
      return (
        o.status === "pending" &&
        !!o.scheduled_time
      );
    }

    return statusMap[status]?.includes(o.status);

  }).length;
};


  /* ======================
      العمليات (Actions)
  ====================== */
  const openOrderDetails = async (order: any) => {
    try {
      const res = await api.get(`/orders/${order.id}`);
      setSelectedOrderDetails(res.data);
    } catch (e) {
      setSelectedOrderDetails(order);
    }
    setIsDetailsModalOpen(true);
  };

const updateOrderStatus = async (orderId: number, newStatus: string) => {
  try {

const res = await api.put(`/manual-orders/status/${orderId}`, {
  status: newStatus
});



    if (res.data.success) {
      loadInitialData();
    } else {
      alert(res.data.error || "فشل التحديث");
    }

  } catch (e: any) {

    console.error("Status Error:", e.response?.data || e);

    alert(
      e.response?.data?.error ||
      "خطأ أثناء تحديث الحالة"
    );
  }
};


  const openEdit = (order: any) => {

  resetForm();

  setTimeout(() => {

    setEditingId(order.id); // 👈 مهم

    setEditingOrder(order);

    setForm({
      customer_id: order.customer_id || "",
      restaurant_id: order.restaurant_id || "",
      to_address: order.to_address || "",
      delivery_fee: Number(order.delivery_fee || 0),
      notes: order.notes || "",
      payment_method: order.payment_method || "cod",
      bank_id: order.bank_id || "",
      scheduled_time: order.scheduled_time || ""
    });

    setItems(order.items || []);

    setShowModal(true);

  }, 0);
};



  const openCaptainModal = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowCaptainModal(true);
    setCaptainsLoading(true);
    api.get("/captains").then((res) => {
      setCaptains(res.data.captains || []);
      setCaptainsLoading(false);
    });
  };

  const assignCaptain = async (captainId: number) => {
    if (!selectedOrderId) return;
    try {
      await api.post("/wassel-orders/assign", { orderId: selectedOrderId, captainId });
      setShowCaptainModal(false);
      loadInitialData();
    } catch (e) { alert("خطأ في إسناد الكابتن"); }
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    setItems([...items, { name: newItemName, qty: 1, price: 0 }]);
    setNewItemName("");
  };

  const updateItem = (index: number, key: keyof OrderItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[key] = value;
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const calculateTotal = () => items.reduce((sum, item) => sum + (item.qty * item.price), 0) + Number(form.delivery_fee);

const saveOrder = async () => {

  if (!form.customer_id || items.length === 0)
    return alert("يرجى اختيار عميل وإضافة منتجات");

  try {

    const payload = {
      ...form,
      items,
      total_amount: calculateTotal(),
    };

    console.log("🚀 Saving:", editingId, payload); // للتأكد

    if (editingId) {

      // ✅ تحديث
    await (api as any).manualOrders.update(
  editingOrder.id,
  payload
);
 

    } else {

      // ✅ إضافة
   await api.post(
  "/manual-orders",
  payload
);
    }

    setShowModal(false);

    resetForm();

    await loadInitialData();

  } catch (e: any) {

    console.error(e);

    alert(
      e.response?.data?.message ||
      "خطأ أثناء الحفظ"
    );
  }
};


const todayStr =
  new Date().toISOString().split("T")[0];

const filteredSlots = slots.filter((s) => {

  const date = new Date(s.start);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const slotDay = new Date(date);
  slotDay.setHours(0, 0, 0, 0);


  if (dayTab === "today") {
    return slotDay.getTime() === today.getTime();
  }

  if (dayTab === "tomorrow") {
    return slotDay.getTime() === tomorrow.getTime();
  }

  return false;
});



// فحص التأخير + التنبيهات
const checkDelaysAndSchedules = () => {

  const now = Date.now();

  orders.forEach((o) => {

    /* =========================
       ⏰ قرب موعد الجدولة
    ========================= */
    if (o.scheduled_time && o.status === "pending") {

      const scheduled = new Date(o.scheduled_time).getTime();
      const diff = scheduled - now;

      // قبل 30 دقيقة
      if (
        diff > 0 &&
        diff <= 30 * 60 * 1000 &&
        !notifiedRef.current.near.has(o.id)
      ) {

        notifyUser(
          `⏰ قرب موعد الطلب #${o.id}`,
          `${o.customer_name} بعد ${Math.ceil(diff / 60000)} دقيقة`
        );

        notifiedRef.current.near.add(o.id);
      }
    }


    /* =========================
       ⚠️ تأخير التنفيذ
    ========================= */
    let baseTime = null;

    if (o.status === "processing") {
      baseTime = o.processing_at;
    }

    if (o.status === "ready") {
      baseTime = o.ready_at;
    }

if (!baseTime) {
  return;
}

    const start = new Date(baseTime).getTime();
    const diff = now - start;

    // أكثر من 30 دقيقة
    if (
      diff >= 30 * 60 * 1000 &&
      !notifiedRef.current.delayed.has(o.id)
    ) {

      notifyUser(
        `⚠️ طلب متأخر #${o.id}`,
        `العميل: ${o.customer_name}
الكابتن: ${o.captain_name || "غير معين"}
تأخر ${Math.floor(diff / 60000)} دقيقة`
      );

      notifiedRef.current.delayed.add(o.id);
    }

  });
};


  const renderPaymentIcon = (method: string) => {
  switch (method) {
    case "cod":
      return (
        <div className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100 text-[10px]">
          <Banknote size={10} /> الدقع عند الاستلام
        </div>
      );

    case "wallet":
      return (
        <div className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 text-[10px]">
          <Wallet size={10} /> من رصيدي
        </div>
      );

    case "bank":
      return (
        <div className="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 text-[10px]">
          <Building2 size={10} /> إيداع بنكي
        </div>
      );

    case "online":
      return (
        <div className="flex items-center gap-1 text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 text-[10px]">
          <CreditCard size={10} /> إلكتروني
        </div>
      );

    default:
      return (
        <span className="text-gray-400 text-xs font-bold">—</span>
      );
  }
};
/* ======================
   أدوات الجدولة
====================== */

// تنسيق (اليوم / غدًا + وقت)
const formatSchedule = (dateStr: string) => {
  if (!dateStr) return "—";

  const d = new Date(dateStr);

  const today = new Date();
  today.setHours(0,0,0,0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

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
    minute: "2-digit"
  });

  return `${label} ${time}`;
};


// هل وقت الطلب جاء؟
const canProcessNow = (scheduled: string) => {
  if (!scheduled) return true;

  return new Date() >= new Date(scheduled);
};


// تنبيه قبل الموعد بـ 30 دقيقة
const isNearSchedule = (scheduled: string) => {
  if (!scheduled) return false;

  const now = new Date().getTime();
  const time = new Date(scheduled).getTime();

  const diff = time - now;

  return diff > 0 && diff <= 30 * 60 * 1000;
};


const formatTime = (t) => {
  if (!t) return null;

  return new Date(t).toLocaleTimeString("ar-YE", {
    hour: "2-digit",
    minute: "2-digit"
  });
};




useEffect(() => {

  if (orders.length) {
    checkDelaysAndSchedules();
  }

  const timer = setInterval(() => {

    if (orders.length) {
      checkDelaysAndSchedules();
    }

  }, 60000);

  return () => clearInterval(timer);

}, [orders]);



  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-4 transition-all" dir="rtl">
      
      {/* 🟢 الهيدر وشريط الفلترة */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border dark:border-gray-700 mb-6 space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl text-orange-600"><ShoppingCart size={24} /></div>
            <div>
              <h1 className="text-xl font-black text-gray-800 dark:text-white uppercase">✍️ الطلبات اليدوية</h1>
              <p className="text-[10px] text-gray-400 font-bold italic">إدارة الطلبات المباشرة والعملاء</p>
            </div>
          </div>

<div className="flex items-center gap-2">

  {/* زر الإشعارات */}
  <button
    onClick={() => setShowNotifications(true)}
    className="relative p-2 rounded-xl bg-gray-100 hover:bg-gray-200"
  >
    🔔

    {notifications.filter(n => !n.read).length > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 rounded-full">
        {notifications.filter(n => !n.read).length}
      </span>
    )}
  </button>

             <div className="relative no-print">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                <input type="text" placeholder="بحث سريع..." className="pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 ring-orange-500/20 dark:text-white w-64 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
            <button onClick={() => { setEditingOrder(null); setItems([]); setShowModal(true); }} className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg flex items-center gap-2">
              <Plus size={18}/> إضافة طلب
            </button>
          </div>
        </div>

        <div className="flex gap-2 justify-center border-b pb-3">
          {[{ k: "all", l: "الكل" }, { k: "today", l: "اليوم" }, { k: "week", l: "الأسبوع" }].map((t) => (
            <button key={t.k} onClick={() => setDateFilter(t.k as any)} className={`px-4 py-1 rounded-full text-sm font-medium transition ${dateFilter === t.k ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{t.l}</button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap justify-center mt-3">
          {[
            { k: "pending", l: "اعتماد", icon: <Clock size={14}/> },
            { k: "processing", l: "معالجة", icon: <AlertCircle size={14}/> },
            { k: "ready", l: "جاهز", icon: <CheckCircle size={14}/> },
            { k: "delivering", l: "توصيل", icon: <Truck size={14}/> },
            { k: "completed", l: "مكتمل", icon: <CheckCircle size={14}/> },
            { k: "cancelled", l: "ملغي", icon: <X size={14}/> },
             { k: "scheduled", l: "مجدولة", icon: <Calendar size={14}/> },
          ].map((t) => (
            <button key={t.k} onClick={() => setActiveTab(t.k as any)} className={`px-4 py-2 rounded-lg border-b-4 transition-all flex items-center gap-2 ${activeTab === t.k ? "bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-sm" : "bg-white border-transparent text-gray-500 hover:bg-gray-50"}`}>
              {t.icon} {t.l}
              <span className="text-[10px] bg-white/50 px-1.5 rounded-full ml-1 font-bold">({getStatusCounts(t.k as any)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🟢 جدول الطلبات */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-center table-auto">
            <thead className="bg-[#f1f5f9] dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold border-b dark:border-gray-700">
              <tr>
                <th className="p-4">رقم</th>
                <th className="text-right">العميل</th>
                <th className="text-right">كابتن التوصيل</th>
                <th className="text-right">المحل</th>
                <th className="font-black italic text-green-600">المبلغ</th>
                <th>نوع الدفع</th>
                <th>الحالة والإجراء</th>
                <th>عرض</th>
                <th>المستخدم</th>
                <th>وقت الحركة</th>

              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="p-4 font-bold text-gray-400">#{o.id}</td>
                  <td className="p-4 text-right font-black text-gray-800 dark:text-white">{o.customer_name}</td>
                  <td className="p-4 text-right font-bold text-indigo-600">
                    {o.captain_name || <span className="text-gray-300 font-normal">لم يسند</span>}
                  </td>
                  <td className="p-4 text-right font-bold text-orange-600">{o.restaurant_name || "شراء مباشر"}</td>
                  <td className="p-4 font-black text-gray-900 dark:text-white">{Number(o.total_amount).toLocaleString()} ريال</td>
            <td className="p-4 flex justify-center">
  {renderPaymentIcon(o.payment_method)}
</td>

                  <td className="p-3">
                    <div className="flex flex-col gap-2 items-center">
                      <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className="border rounded-lg px-2 py-1 text-[10px] bg-white shadow-sm outline-none w-full max-w-[120px] font-bold">
                        <option value="pending">اعتماد</option>
                        <option value="processing">قيد المعالجة</option>
                        <option value="ready">جاهز</option>
                        <option value="delivering">توصيل</option>
                        <option value="completed">مكتمل</option>
                        <option value="cancelled">إلغاء</option>
                      </select>
                      
                      <div className="flex gap-1">
{o.status === "pending" && (

  <button

   disabled={false}

onClick={async () => {

  // لو الطلب مجدول ولسه وقته ما جاء
  if (
    o.scheduled_time &&
    new Date() < new Date(o.scheduled_time)
  ) {

    const time = new Date(o.scheduled_time)
      .toLocaleTimeString("ar-YE", {
        hour: "2-digit",
        minute: "2-digit"
      });

    const ok = window.confirm(
      `⏰ هذا الطلب مجدول للساعة ${time}\n\nهل أنت متأكد من اعتماده الآن؟`
    );

    if (!ok) return;
  }

  await updateOrderStatus(o.id, "processing");

  setActiveTab("processing");
}}


    className={`px-2 py-1 rounded text-[10px] font-bold

    ${
      o.scheduled_time &&
      !canProcessNow(o.scheduled_time)

        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        : "bg-green-600 text-white hover:bg-green-700"
    }`}
  >

    اعتماد

  </button>
)}
                        {["processing", "ready"].includes(o.status) && <button onClick={() => openCaptainModal(o.id)} className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><UserCheck size={10}/> كابتن</button>}
                        {o.status === "ready" && <button onClick={() => updateOrderStatus(o.id, "delivering")} className="bg-orange-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><Truck size={10}/> توصيل</button>}
                        {o.status === "delivering" && <button onClick={() => updateOrderStatus(o.id, "completed")} className="bg-green-700 text-white px-2 py-1 rounded text-[10px] font-bold">تم التسليم</button>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <button onClick={() => openOrderDetails(o)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition" title="عرض التفاصيل">
                      <Eye size={16}/>
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-xs text-gray-400 font-bold">{o.user_name || "Admin"}</span>
                      <button onClick={() => openEdit(o)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition" title="تعديل">
                        <Edit size={14}/>
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-bold text-indigo-600">

<div className="text-[10px] text-right space-y-1">

  {/* قبل التنفيذ */}
  {o.status === "pending" && o.scheduled_time && (
    <div className="text-indigo-600">
      📅 {formatSchedule(o.scheduled_time)}
    </div>
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

</div>


  {isNearSchedule(o.scheduled_time) && (
    <div className="text-[10px] text-orange-600">
      ⏰ قريب الموعد
    </div>
  )}

</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال إسناد الكابتن */}
      {showCaptainModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[200] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-lg font-black dark:text-white">🚗 إسناد كابتن التوصيل</h2>
              <button onClick={() => setShowCaptainModal(false)} className="text-gray-400 hover:text-black">✖</button>
            </div>
            {captainsLoading ? <div className="text-center py-6">⏳ جاري تحميل الكباتن...</div> : (
              <ul className="divide-y dark:divide-gray-700 max-h-60 overflow-y-auto">
                {captains.map((c) => (
                  <li key={c.id} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                    <div><p className="font-bold dark:text-white">{c.name}</p><p className="text-[10px] text-gray-400">الطلبات: {c.pending_orders} | اليوم: {c.completed_today}</p></div>
                    <button onClick={() => assignCaptain(c.id)} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm">إسناد</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* مودال الإضافة والتعديل */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border dark:border-gray-700">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg"><ShoppingCart size={24}/></div>
                <div><h2 className="text-xl font-black dark:text-white uppercase">{editingOrder ? "✏️ تعديل الطلب" : "➕ تسجيل طلب يدوي"}</h2><p className="text-[10px] text-gray-400 font-bold italic">أكمل بيانات الطلب والمنتجات</p></div>
              </div>
<button
  onClick={() => {
    setShowModal(false);
    resetForm();   // 👈 مهم جدًا
  }}
  className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all dark:text-gray-400"
>
  <X size={24}/>
</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-3xl space-y-5 border dark:border-gray-700 shadow-inner">
                  <h3 className="text-sm font-black border-b dark:border-gray-700 pb-3 flex items-center gap-2 dark:text-white"><FileText size={18} className="text-orange-500"/> بيانات الفاتورة</h3>
                  <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">العميل</label><select className="custom-select border-r-4 border-blue-500 font-bold" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}><option value="">-- اختر العميل --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">المحل المورد</label><select className="custom-select border-r-4 border-orange-500 font-bold" value={form.restaurant_id} onChange={(e)=>setForm({...form, restaurant_id: e.target.value})}><option value="">-- شراء مباشر --</option>{agents.map(r => <option key={r.id} value={r.id}>🏪 {r.name}</option>)}</select></div>
                  <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">عنوان التوصيل</label><select className="custom-select font-bold" value={form.to_address} onChange={(e)=>setForm({...form, to_address: e.target.value})}><option value="">-- اختر العنوان --</option>{addresses.map(a => <option key={a.id} value={a.address}>{a.address}</option>)}</select></div>
                {/* 💳 وسيلة الدفع */}
<div className="border p-4 rounded-2xl bg-gray-50 space-y-3">

  <p className="font-bold text-sm text-gray-600 flex items-center gap-2">
    💳 وسيلة الدفع:
  </p>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

    {[
      { id: "cod", label: "عند الاستلام", icon: <Banknote size={14}/> },
      { id: "wallet", label: "من الرصيد", icon: <Wallet size={14}/> },
      { id: "bank", label: "إيداع بنكي", icon: <Building2 size={14}/> },
      { id: "online", label: "دفع إلكتروني", icon: <CreditCard size={14}/> }
    ].map((method) => (

      <button
        key={method.id}
        type="button"
        onClick={() =>
          setForm({ ...form, payment_method: method.id })
        }

        className={`flex items-center justify-center gap-1 py-2 px-1
        rounded-xl text-[10px] font-bold border transition-all

        ${
          form.payment_method === method.id
            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
        }`}
      >

        {method.icon}
        {method.label}

      </button>

    ))}

  </div>


  {/* 🏦 اختيار البنك */}
  {form.payment_method === "bank" && (

    <div className="mt-3 animate-in fade-in">

      <label className="text-[10px] font-bold text-gray-400">
        🏦 البنك المحول إليه
      </label>

      <select
        className="w-full p-2 border rounded-lg text-xs bg-white outline-none
        focus:ring-1 focus:ring-indigo-300"

        value={form.bank_id || ""}

        onChange={(e) =>
          setForm({ ...form, bank_id: e.target.value })
        }
      >

        <option value="">-- اختر البنك --</option>

        {banks.map((b: any) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}

      </select>

    </div>
  )}



  {/* 💰 عرض الرصيد */}
  {form.payment_method === "wallet" && customerBalance && (

    <div
      className={`mt-3 p-3 rounded-2xl border-2 text-[11px]

      ${
        calculateTotal() >
        (customerBalance.balance + customerBalance.credit_limit)

          ? "bg-red-50 border-red-200"
          : "bg-emerald-50 border-emerald-200"
      }`}
    >

      <div className="flex justify-between mb-1">

        <span className="font-bold text-gray-600">
          الرصيد:
        </span>

        <span className="font-black text-emerald-600">
          {Number(customerBalance.balance).toLocaleString()} ريال
        </span>

      </div>


      <div className="flex justify-between border-t pt-1">

        <span className="font-bold text-blue-700">
          المتاح:
        </span>

        <span className="font-black text-blue-800">
          {(
            Number(customerBalance.balance) +
            Number(customerBalance.credit_limit)
          ).toLocaleString()} ريال
        </span>

      </div>

    </div>
  )}

</div>


{/* ⏰ الجدولة */}
<div className="border p-4 rounded-2xl bg-gray-50 space-y-3">

  {/* زر الآن */}
  <button
    onClick={() => {
      setForm({
        ...form,
        scheduled_time: ""
      });
      setDayTab("today");
    }}

    className={`w-full py-3 rounded-xl font-bold text-sm transition shadow

      ${
        !form.scheduled_time
          ? "bg-blue-600 text-white"
          : "bg-gray-200 hover:bg-gray-300"
      }
    `}
  >
    🚀 الآن
  </button>


  {/* اليوم / غدًا */}
  <div className="grid grid-cols-2 gap-2">

    {/* اليوم */}
    <button
      onClick={()=>setDayTab("today")}

      className={`py-2 rounded-lg font-bold text-sm transition

        ${
          dayTab==="today"
            ? "bg-lime-500 text-white shadow"
            : "bg-gray-200 hover:bg-gray-300"
        }
      `}
    >
      اليوم
    </button>


    {/* غدًا */}
    <button
      onClick={()=>setDayTab("tomorrow")}

      className={`py-2 rounded-lg font-bold text-sm transition

        ${
          dayTab==="tomorrow"
            ? "bg-lime-500 text-white shadow"
            : "bg-gray-200 hover:bg-gray-300"
        }
      `}
    >
      غدًا
    </button>

  </div>


  {/* الأوقات */}
  <div className="grid grid-cols-2 gap-3">

    {filteredSlots.map((s,i)=>{

      const startISO = new Date(s.start).toISOString();

      const start = new Date(s.start);
      const end   = new Date(s.end);

      const label =
        start.toLocaleTimeString("ar-YE",{
          hour:"2-digit",
          minute:"2-digit"
        })+
        " - "+
        end.toLocaleTimeString("ar-YE",{
          hour:"2-digit",
          minute:"2-digit"
        });

      return (

        <button
          key={i}

          onClick={() =>
            setForm({
              ...form,
              scheduled_time: startISO
            })
          }

          className={`p-3 rounded-xl border text-xs font-bold transition

            ${
              form.scheduled_time === startISO
                ? "bg-lime-500 text-white border-lime-500 shadow"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }
          `}
        >

          <div>
            {dayTab==="today" ? "اليوم" : "غدًا"}
          </div>

          <div>{label}</div>

        </button>

      );
    })}

  </div>

</div>


                  <div><label className="text-[11px] font-black text-gray-400 mb-2 block italic tracking-tighter">رسوم التوصيل</label><input type="number" className="custom-select font-black text-green-600" value={form.delivery_fee} onChange={(e)=>setForm({...form, delivery_fee: Number(e.target.value)})} /></div>
                </div>
                {customerBalance && (<div className="p-5 bg-blue-600 rounded-3xl shadow-xl text-white text-center"><p className="text-[10px] font-bold opacity-80 mb-1">الرصيد الفعلي المتاح</p><p className="text-2xl font-black">{(Number(customerBalance.balance) + Number(customerBalance.credit_limit)).toLocaleString()} <span className="text-xs">ريال</span></p></div>)}
              </div>

              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm"><input type="text" placeholder="اسم المنتج..." className="flex-1 p-4 bg-transparent dark:text-white outline-none font-bold text-sm" value={newItemName} onChange={(e)=>setNewItemName(e.target.value)} onKeyPress={(e)=>e.key==='Enter' && addItem()} /><button onClick={addItem} className="bg-orange-500 text-white px-8 rounded-xl font-black hover:bg-orange-600 transition active:scale-95 shadow-lg shadow-orange-500/20">إضافة</button></div>
                <div className="flex-1 border-2 border-dashed dark:border-gray-700 rounded-[2rem] overflow-hidden flex flex-col bg-white dark:bg-gray-900/20 shadow-inner">
                  <div className="flex-1 overflow-y-auto"><table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] font-black uppercase sticky top-0 z-10 border-b"><tr><th className="p-4 text-right">المنتج</th><th className="p-4 w-32 text-center">العدد</th><th className="p-4 w-32 text-center">السعر</th><th className="p-4 w-32 text-center">الإجمالي</th><th className="p-4 w-16"></th></tr></thead>
                      <tbody className="divide-y dark:divide-gray-700">{items.map((item, index) => (<tr key={index} className="group hover:bg-orange-50/20 transition-colors"><td className="p-4 font-black text-gray-700 dark:text-white">{item.name}</td><td className="p-4 flex justify-center"><div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit border dark:border-gray-600"><button type="button" onClick={()=>updateItem(index, 'qty', Math.max(1, item.qty-1))} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black dark:text-white">-</button><span className="w-6 text-center font-black dark:text-white text-xs">{item.qty}</span><button type="button" onClick={()=>updateItem(index, 'qty', item.qty+1)} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black dark:text-white">+</button></div></td><td className="p-4 text-center"><input type="number" className="w-24 p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-center font-black text-green-600" value={item.price} onChange={(e)=>updateItem(index, 'price', Number(e.target.value))} /></td><td className="p-4 font-black text-orange-600 text-center">{(item.qty * item.price).toLocaleString()}</td><td className="p-4 text-center"><button onClick={()=>removeItem(index)} className="text-gray-300 hover:text-red-500 transition-all transform group-hover:scale-110"><Trash2 size={18}/></button></td></tr>))}</tbody>
                  </table></div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 bg-white dark:bg-gray-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-8"><div className="text-right"><p className="text-[10px] text-gray-400 font-black mb-1 uppercase">إجمالي الأصناف</p><p className="text-xl font-bold dark:text-white">{items.reduce((s,i)=>s+(i.qty*i.price),0).toLocaleString()} ريال</p></div><div className="text-right"><p className="text-[10px] text-gray-400 font-black mb-1 uppercase text-orange-500 tracking-tighter italic">الإجمالي النهائي</p><p className="text-3xl font-black text-orange-500 leading-none">{calculateTotal().toLocaleString()} ريال</p></div></div>
              <div className="flex gap-3">
                <button
  onClick={() => {
    setShowModal(false);
    resetForm();   // 👈 تنظيف البيانات
  }}
  className="px-8 py-3 text-gray-400 font-black hover:text-red-500 transition-all"
>
  إلغاء
</button>

              <button onClick={saveOrder} disabled={items.length===0} className="bg-green-600 text-white px-12 py-4 rounded-3xl font-black hover:bg-green-700 transition active:scale-95 shadow-xl flex items-center gap-3"><Save size={20}/> {editingOrder ? "تحديث التعديلات" : "اعتماد الطلب"}</button></div>
            </div>
          </div>
        </div>
      )}

    {/* ===== مودال تفاصيل الطلب (تصميم مطور) ===== */}
{isDetailsModalOpen && selectedOrderDetails && (

<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[120] p-4">

  <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border">

    {/* Header */}
    <div className="p-5 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-900">

      <h2 className="text-xl font-black text-indigo-600">
        🧾 فاتورة الطلب #{selectedOrderDetails.id}
      </h2>

      <button
        onClick={() => setIsDetailsModalOpen(false)}
        className="p-2 hover:bg-red-100 rounded-full"
      >
        <X size={22}/>
      </button>

    </div>

    {/* Body */}
    <div ref={printRef} className="flex-1 overflow-y-auto p-6 space-y-6">

{/* معلومات العميل + المحل */}
<div className="grid md:grid-cols-2 gap-4">

  {/* بيانات العميل */}
  <div className="border rounded-2xl p-4 bg-gray-50">

    <h3 className="font-black mb-3 flex items-center gap-2">
      👤 بيانات العميل
    </h3>

    <p className="mb-1">
      <b>الاسم:</b> {selectedOrderDetails.customer_name || "—"}
    </p>

    <p className="mb-1">
      <b>الهاتف:</b> {selectedOrderDetails.customer_phone || "—"}
    </p>

    <p className="mb-1">
      <b>الحي:</b>{" "}
      {selectedOrderDetails.neighborhood_name || "غير محدد"}
    </p>

    <p className="mb-2 text-sm text-gray-600 leading-relaxed">
      <b>العنوان:</b>{" "}
      {selectedOrderDetails.customer_address ||
        selectedOrderDetails.to_address ||
        "—"}
    </p>

    {/* زر GPS */}
    {(selectedOrderDetails.latitude &&
      selectedOrderDetails.longitude) ? (

      <a
        href={`https://www.google.com/maps?q=${selectedOrderDetails.latitude},${selectedOrderDetails.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-2 text-blue-600 font-bold text-sm hover:underline"
      >
        📍 فتح الموقع على الخريطة
      </a>

    ) : selectedOrderDetails.map_url ? (

      <a
        href={selectedOrderDetails.map_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-2 text-blue-600 font-bold text-sm hover:underline"
      >
        📍 فتح الموقع على الخريطة
      </a>

    ) : null}

  </div>


  {/* بيانات المحل */}
  <div className="border rounded-2xl p-4 bg-white">

    <h3 className="font-black mb-3 flex items-center gap-2">
      🏪 بيانات المحل
    </h3>

    <p className="mb-1">
      <b>الاسم:</b>{" "}
      {selectedOrderDetails.restaurant_name || "شراء مباشر"}
    </p>

    <p className="mb-1">
      <b>الهاتف:</b>{" "}
      {selectedOrderDetails.restaurant_phone || "—"}
    </p>

    {selectedOrderDetails.restaurant_address && (
      <p className="text-sm text-gray-600 leading-relaxed">
        <b>العنوان:</b> {selectedOrderDetails.restaurant_address}
      </p>
    )}

  </div>

</div>


{/* المنتجات */}
<div className="border rounded-2xl overflow-hidden">

  <div className="bg-gray-100 p-3 font-black text-gray-600">
    📦 تفاصيل الطلب
  </div>

  <table className="w-full text-sm text-center">

    <thead className="bg-gray-50 font-bold">
      <tr>
        <th className="p-3 text-right">المنتج</th>
        <th>الكمية</th>
        <th>السعر</th>
        <th className="text-left">الإجمالي</th>
      </tr>
    </thead>

    <tbody className="divide-y">

      {(selectedOrderDetails.items || []).map((p,i)=>(
        <tr key={i} className="hover:bg-gray-50">

          <td className="p-3 text-right font-bold">
            {p.name || p.product_name}
          </td>

          <td>{p.qty || p.quantity}</td>

          <td>{Number(p.price).toLocaleString()}</td>

          <td className="text-left font-black text-green-600">
            {(Number(p.qty||p.quantity)*Number(p.price)).toLocaleString()} ريال
          </td>

        </tr>
      ))}

    </tbody>

  </table>

</div>


{/* الإجماليات + الملاحظات */}
<div className="grid md:grid-cols-2 gap-4">

  {/* الإجماليات */}
  <div className="border rounded-2xl p-4 bg-indigo-50">

    <div className="flex justify-between text-sm">
      <span>المشتريات</span>
      <span className="font-bold">
        {(Number(selectedOrderDetails.total_amount) -
         Number(selectedOrderDetails.delivery_fee)).toLocaleString()}
      </span>
    </div>

    <div className="flex justify-between text-sm">
      <span>التوصيل</span>
      <span className="font-bold">
        {Number(selectedOrderDetails.delivery_fee).toLocaleString()}
      </span>
    </div>

    <div className="flex justify-between text-xl font-black text-indigo-600 border-t mt-2 pt-2">
      <span>الإجمالي</span>
      <span>
        {Number(selectedOrderDetails.total_amount).toLocaleString()} ريال
      </span>
    </div>

  </div>


  {/* الملاحظات */}
  <div className="border rounded-2xl p-4 bg-yellow-50">

    <h3 className="font-black mb-2">📝 ملاحظات</h3>

    <p className="text-sm leading-relaxed">
{selectedOrderDetails.notes || "لا توجد ملاحظات"}
    </p>

  </div>

</div>
</div>


    {/* Footer */}
    <div className="p-5 border-t bg-gray-50 flex justify-between items-center">

      <div className="text-sm text-gray-600">

        <p>
          الحالة:
          <span className="ml-1 font-bold text-blue-600">
            {selectedOrderDetails.status}
          </span>
        </p>

        <p>
          المستخدم: {(selectedOrderDetails as any).user_name || "—"}
        </p>

      </div>

      <div className="flex gap-3">

        <button
          onClick={handlePrint}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700"
        >
          <Printer size={16}/> طباعة
        </button>

        <button
          onClick={()=>setIsDetailsModalOpen(false)}
          className="bg-gray-400 text-white px-5 py-2 rounded-xl font-bold"
        >
          إغلاق
        </button>

      </div>

    </div>

  </div>
  


</div>
)}


      {/* الستايلات */}
      <style>{`
        .custom-select { width: 100%; padding: 12px; border-radius: 15px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; outline: none; background: #ffffff; appearance: none; transition: border-color 0.2s; }
        .dark .custom-select { background: #1f2937; border-color: #374151; color: #fff; }
        .custom-select:focus { border-color: #f97316; }
        @media print { .no-print { display: none !important; } }
        .animate-in { animation: fadeIn 0.25s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      {/* 🔔 مودال الإشعارات */}
{showNotifications && (

  <div className="fixed inset-0 bg-black/30 z-[9999] flex justify-end">

    {/* خلفية للإغلاق */}
    <div
      className="flex-1"
onClick={() => setShowNotifications(prev => !prev)}
    />

    {/* القائمة */}
    <div className="w-80 h-full bg-white shadow-xl p-4">

      <div className="flex justify-between items-center border-b pb-2 mb-3">
        <h3 className="font-black text-lg">🔔 الإشعارات</h3>

        <button
          onClick={() => setShowNotifications(false)}
          className="text-gray-400 hover:text-black"
        >
          ✖
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto h-[90%]">

        {notifications.length === 0 && (
          <p className="text-center text-gray-400 text-sm">
            لا توجد إشعارات
          </p>
        )}

        {notifications.map((n) => (

          <div
            key={n.id}
            onClick={() =>
              setNotifications(prev =>
                prev.map(x =>
                  x.id === n.id
                    ? { ...x, read: true }
                    : x
                )
              )
            }

            className={`p-3 rounded-xl border cursor-pointer text-xs
              ${
                n.read
                  ? "bg-gray-50"
                  : "bg-yellow-50 border-yellow-300"
              }
            `}
          >
            <p className="font-bold">{n.title}</p>

            <p className="text-gray-600 mt-1 whitespace-pre-line">
              {n.body}
            </p>

<p className="text-[10px] text-gray-400 mt-1">
              {new Date(n.time).toLocaleTimeString("ar-YE")}
            </p>

          </div>

        ))}

      </div>

    </div>

  </div>
)}

    </div>
  );
};

export default ManualOrders;
