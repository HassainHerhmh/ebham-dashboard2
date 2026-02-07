import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit, MapPin, DollarSign, UserCheck, Truck, RotateCcw } from "lucide-react";
import api from "../services/api";
import { io } from "socket.io-client";

/* =====================
   Interfaces
===================== */
interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  stores_count: number;
  captain_name?: string;
  status: string;
  order_type?: string;
  is_manual?: number;
  total_amount?: number | string | null;
  delivery_fee?: number | string | null;
  extra_store_fee?: number | string | null;
  created_at: string;
  payment_method_label?: string;
  user_name?: string; // هذا الحقل القديم، سنستخدم creator/updater أدناه
  creator_name?: string; // اسم من أضاف الطلب
  updater_name?: string; // اسم من حدث الحالة
  branch_name?: string;
}

interface Captain {
  id: number;
  name: string;
  pending_orders: number;
  completed_today: number;
}

interface OrderDetails {
  id: number;
  restaurants: any[];
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  neighborhood_name?: string;
  latitude?: string;
  longitude?: string;
  map_url?: string;
  delivery_fee: number | string | null;
  extra_store_fee?: number | string | null;
  payment_method?: string;
  depositor_name?: string;
  reference_no?: string;
  attachments?: any[];
  notes?: string;
  status: string;
  user_name?: string;
  updated_at?: string;
}

type OrderTab = "pending" | "processing" | "delivering" | "completed" | "cancelled";
type DateFilter = "all" | "today" | "week";

/* =====================
   Socket Configuration
===================== */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";
const socket = io(SOCKET_URL);

function ToastNotifications() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const handler = (data: any) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { ...data, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-[420px] pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="bg-white border shadow-lg rounded-xl px-4 py-3 text-sm flex flex-col pointer-events-auto animate-in slide-in-from-top-2">
          <div className="font-semibold text-gray-800">{t.message}</div>
          {t.user && <div className="text-gray-500 text-xs mt-1">بواسطة: {t.user}</div>}
        </div>
      ))}
    </div>
  );
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdminBranch = !!currentUser?.is_admin_branch;

  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainsLoading, setCaptainsLoading] = useState(false);
  const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderDetails | null>(null);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  /* =====================
     Fetch & Filters Logic
  ===================== */
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getOrders({ limit: 100 });
      setOrders(Array.isArray(res.orders || res) ? res.orders || res : []);
    } catch (e) { setOrders([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filterByDate = (list: Order[]) => {
    const today = new Date().toISOString().split("T")[0];
    return list.filter((o) => {
      const oDate = new Date(o.created_at).toISOString().split("T")[0];
      if (dateFilter === "today") return oDate === today;
      if (dateFilter === "week") {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(o.created_at) >= weekAgo;
      }
      return true;
    });
  };

  const filterByTab = (list: Order[]) => {
    switch (activeTab) {
      case "pending": return list.filter(o => o.status === "pending");
      case "processing": return list.filter(o => ["confirmed", "preparing", "ready"].includes(o.status));
      case "delivering": return list.filter(o => o.status === "delivering");
      case "completed": return list.filter(o => o.status === "completed");
      case "cancelled": return list.filter(o => o.status === "cancelled");
      default: return list;
    }
  };

  const counts = {
    pending: filterByDate(orders).filter(o => o.status === "pending").length,
    processing: filterByDate(orders).filter(o => ["confirmed", "preparing", "ready"].includes(o.status)).length,
    delivering: filterByDate(orders).filter(o => o.status === "delivering").length,
    completed: filterByDate(orders).filter(o => o.status === "completed").length,
    cancelled: filterByDate(orders).filter(o => o.status === "cancelled").length,
  };

  const visibleOrders = filterByTab(filterByDate(orders));

  /* =====================
     Handlers
  ===================== */
  const updateOrderStatus = async (orderId: number, status: string) => {
    try { await api.orders.updateStatus(orderId, status); fetchOrders(); } catch (e) {}
  };

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
      setIsCaptainModalOpen(false);
      fetchOrders();
      alert("✅ تم إسناد الكابتن بنجاح");
    } catch (e) { alert("حدث خطأ في الإسناد"); }
  };

  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return isNaN(num) ? "-" : num.toFixed(2) + " ريال";
  };

  const renderActions = (o: Order) => {
    if (activeTab === "pending") return <button onClick={() => updateOrderStatus(o.id, "confirmed")} className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition">اعتماد</button>;
    
    if (activeTab === "processing") return (
      <div className="flex gap-1 justify-center">
         <button onClick={() => openCaptainModal(o.id)} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-indigo-700 transition"><UserCheck size={12}/> كابتن</button>
         <button onClick={() => updateOrderStatus(o.id, "delivering")} className="bg-orange-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-orange-700 transition"><Truck size={12}/> توصيل</button>
      </div>
    );

    if (activeTab === "delivering") return <button onClick={() => updateOrderStatus(o.id, "completed")} className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition">تم التسليم</button>;
    return "—";
  };

  return (
    <div className="space-y-6" dir="rtl">
      <ToastNotifications />

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">📋 إدارة الطلبات</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAddOrderModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100">
            <Plus size={18} /> إضافة طلب
          </button>
          <button onClick={fetchOrders} className="bg-white border text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Filters (Style matched with Wassel) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4 border border-gray-100">
        <div className="flex gap-2 justify-center border-b border-gray-50 pb-3">
          {[{k:"all",l:"الكل"}, {k:"today",l:"اليوم"}, {k:"week",l:"الأسبوع"}].map(t=>(
            <button key={t.k} onClick={()=>setDateFilter(t.k as any)} 
              className={`px-6 py-1.5 rounded-full text-sm font-medium transition-all ${dateFilter===t.k?"bg-indigo-600 text-white shadow-md shadow-indigo-100":"bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            {k:"pending",l:"🟡 اعتماد"}, {k:"processing",l:"🔵 معالجة"},
            {k:"delivering",l:"🚚 توصيل"}, {k:"completed",l:"✅ مكتمل"}, {k:"cancelled",l:"❌ ملغي"}
          ].map(t=>(
            <button key={t.k} onClick={()=>setActiveTab(t.k as any)} 
              className={`px-4 py-2 rounded-xl border-b-4 transition-all font-bold ${activeTab===t.k?"bg-blue-50 border-blue-600 text-blue-700":"bg-white border-transparent text-gray-400 hover:bg-gray-50"}`}>
              {t.l} <span className="text-xs mr-1 bg-white/50 px-1.5 py-0.5 rounded-md">({counts[t.k as keyof typeof counts]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? <div className="text-center py-20 text-gray-400 font-medium">⏳ جاري تحميل الطلبات...</div> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[1000px]">
            <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
              <tr className="border-b">
                <th className="p-4">رقم</th>
                <th>العميل</th>
                <th>المطاعم</th>
                <th>الكابتن</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>إسناد</th>
                <th>المستخدم</th>
                {isAdminBranch && <th>الفرع</th>}
                <th className="p-4">تحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {visibleOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 font-bold text-gray-900 text-sm">#{o.id}</td>
                  <td className="text-sm">
                    <div className="font-medium text-gray-800">{o.customer_name}</div>
                    <div className="text-[10px] text-gray-400">{o.customer_phone}</div>
                  </td>
                  <td className="text-xs font-medium px-2"><span className="bg-gray-100 px-2 py-1 rounded-lg">{o.stores_count} مطعم</span></td>
                  <td className="text-indigo-600 font-bold text-xs">{o.captain_name || "—"}</td>
                  <td className="text-xs font-bold text-gray-700">{formatAmount(o.total_amount)}</td>
                  
                  {/* Status Cell */}
                  <td className="px-2">
                    {o.status === "completed" || o.status === "cancelled" ? (
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${o.status === "completed" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                        {o.status === "completed" ? "مكتمل" : "ملغي"}
                      </span>
                    ) : (
                      <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} 
                        className="border rounded-lg px-2 py-1 text-[10px] bg-white outline-none focus:ring-1 focus:ring-blue-400">
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

                  {/* ✅ عمود المستخدم المتطور (المنطق المطلوب) */}
                  <td className="px-2 text-[10px]">
                    {o.updater_name ? (
                      <div className="flex flex-col text-blue-600">
                        <span className="font-bold">📝 {o.updater_name}</span>
                        <span className="text-[8px] text-gray-400 italic">آخر تحديث</span>
                      </div>
                    ) : o.creator_name ? (
                      <div className="flex flex-col text-gray-700">
                        <span className="font-medium">👤 {o.creator_name}</span>
                        <span className="text-[8px] text-gray-400 italic">المُنشئ</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic font-medium">📱 طلب تطبيق</span>
                    )}
                  </td>

                  {isAdminBranch && <td className="text-xs text-gray-500">{o.branch_name}</td>}
                  
                  <td className="p-4 flex gap-2 justify-center">
                    <button onClick={() => api.orders.getOrderDetails(o.id).then(res => { setSelectedOrderDetails(res.order || res); setIsDetailsModalOpen(true); })} 
                      className="text-blue-500 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"><MapPin size={16} /></button>
                    <button className="text-gray-400 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Edit size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length === 0 && <div className="p-20 text-center text-gray-400">لا توجد طلبات في هذا القسم</div>}
        </div>
      )}

      {/* Captain Selection Modal */}
      {isCaptainModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-xl font-bold text-gray-800">🚗 إسناد كابتن للطلب</h2>
              <button onClick={()=>setIsCaptainModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">✖</button>
            </div>
            {captainsLoading ? <div className="text-center py-10">⏳ جاري البحث عن كباتن...</div> : captains.length === 0 ? <div className="text-center py-10 text-red-500">لا يوجد كباتن متاحين حالياً</div> : (
              <ul className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {captains.map(c=>(
                  <li key={c.id} className="flex justify-between items-center py-4 px-2 hover:bg-gray-50 rounded-2xl transition-colors">
                    <div>
                      <p className="font-bold text-gray-900">{c.name}</p>
                      <p className="text-[10px] text-gray-400">الطلبات النشطة: {c.pending_orders} | مكتمل اليوم: {c.completed_today}</p>
                    </div>
                    <button onClick={()=>assignCaptain(c.id)} className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100">إسناد</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Details & Add Order Modals should be here as per your original file structure... */}
    </div>
  );
};

export default Orders;
