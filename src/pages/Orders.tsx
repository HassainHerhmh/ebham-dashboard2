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


      {/* ===== مودال تفاصيل الطلب ===== */}
      {isDetailsModalOpen && selectedOrderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div ref={printRef} className="p-6 overflow-y-auto">
              <h2 className="text-lg font-bold mb-4 text-center">
                🧾 فاتورة الطلب #{selectedOrderDetails.id}
              </h2>
              {(() => {
                const restaurants = selectedOrderDetails.restaurants || [];
                const allRestaurantsTotal = restaurants.reduce(
                  (sum: number, r: any) => sum + (r.total || 0),
                  0
                );
                const delivery = Number(selectedOrderDetails.delivery_fee || 0);
                const extraStore = Number(selectedOrderDetails.extra_store_fee || 0);
                const grandTotal = allRestaurantsTotal + delivery + extraStore;

                return (
                  <>
                    {restaurants.map((r: any, idx: number) => (
                      <div key={idx} className="mb-6 border rounded p-3">
                        <h3 className="font-bold text-lg mb-2">🏪 {r.name}</h3>
                        <table className="w-full mb-2 border">
                          <thead className="bg-gray-100">
                            <tr>
                              <th>المنتج</th>
                              <th>السعر</th>
                              <th>الكمية</th>
                              <th>الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.items.map((p: any, i: number) => (
                              <tr key={i}>
                                <td className="border px-2 py-1">{p.name}</td>
                                <td className="border">{p.price} ر.س</td>
                                <td className="border">{p.quantity}</td>
                                <td className="border font-semibold text-green-600">
                                  {p.subtotal} ر.س
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="text-right font-bold">
                          إجمالي المطعم: {Number(r.total || 0).toFixed(2)} ريال
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="border p-3 rounded bg-gray-50">
                        <p>🧮 إجمالي المطاعم: {allRestaurantsTotal.toFixed(2)} ريال</p>
                        <p>📦 رسوم التوصيل: {delivery.toFixed(2)} ريال</p>
                        {extraStore > 0 && (
                          <p>🏪 رسوم المحل الإضافي: {extraStore.toFixed(2)} ريال</p>
                        )}
                        <p className="text-lg font-bold text-blue-600">
                          💰 الإجمالي الكلي: {grandTotal.toFixed(2)} ريال
                        </p>
                      </div>
                      <div className="border p-3 rounded bg-white">
                        <h4 className="font-bold mb-2">💳 تفاصيل الدفع</h4>
                        <p>
                          طريقة الدفع: <strong>{paymentMethodLabel}</strong>
                        </p>
                        {(paymentMethod === "bank" || paymentMethod === "wallet") && (
                          <>
                            {depositorName && <p>اسم المودع: {depositorName}</p>}
                            {referenceNo && <p>رقم الحوالة: {referenceNo}</p>}
                            {attachments?.length > 0 && (
                              <div className="mt-2">
                                <p className="font-semibold">المرفقات:</p>
                                <div className="flex gap-2 mt-1">
                                  {attachments.map((f: any, i: number) => (
                                    <a key={i} href={f.url} target="_blank">
                                      <img
                                        src={f.thumb}
                                        className="w-16 h-16 rounded border"
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="border p-3 rounded">
                        <h3 className="font-bold mb-2">🏪 المطاعم المشاركة</h3>
                        {restaurants.map((r: any, i: number) => (
                          <div key={i} className="mb-2 text-sm">
                            <p>الاسم: {r.name}</p>
                            <p>الهاتف: {r.phone}</p>
                            {r.map_url && (
                              <a
                                href={r.map_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                              >
                                عرض على الخريطة 🌍
                              </a>
                            )}
                            <hr className="my-2" />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="border p-3 rounded">
                          <h3 className="font-bold mb-1">👤 بيانات العميل</h3>
                          <p>الاسم: {selectedOrderDetails.customer_name}</p>
                          <p>الهاتف: {selectedOrderDetails.customer_phone}</p>
                          <p>
                            📍 العنوان:{" "}
                            <strong>
                              {selectedOrderDetails.neighborhood_name
                                ? `${selectedOrderDetails.neighborhood_name} - `
                                : ""}
                              {selectedOrderDetails.customer_address || "-"}
                            </strong>
                          </p>
                          {selectedOrderDetails.map_url && (
                            <p>
                              <a
                                href={selectedOrderDetails.map_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                              >
                                عرض على الخريطة 🌍
                              </a>
                            </p>
                          )}
                        </div>
                   <div className="border p-3 rounded bg-yellow-50">
  <h3 className="font-bold mb-1">📝 ملاحظات الطلب</h3>
  <p className="text-gray-700">
    {selectedOrderDetails.note || "لا توجد ملاحظات"}
  </p>
</div>

                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
      {/* ✅ تعديل التذييل (Footer) */}
      <div className="flex justify-between items-center p-4 border-t bg-gray-100">
        
        {/* 1. القسم الأيمن: معلومات الحالة والمستخدم */}
        <div className="text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-700">الحالة:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              selectedOrderDetails.status === 'completed' ? 'bg-green-100 text-green-700' :
              selectedOrderDetails.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {
                {
                  pending: "قيد الانتظار",
                  confirmed: "مؤكد",
                  preparing: "قيد التحضير",
                  ready: "جاهز",
                  delivering: "قيد التوصيل",
                  completed: "مكتمل",
                  cancelled: "ملغي"
                }[selectedOrderDetails.status as string] || selectedOrderDetails.status
              }
            </span>
          </div>

    
           {/* المستخدم (الذي قام بآخر تحديث) */}
          <div className="text-sm text-gray-600">
            <span className="font-bold">المستخدم: </span>
            <span className="font-medium text-black">
              {/* سيظهر الآن لأننا مررناه يدوياً من القائمة */}
              {(selectedOrderDetails as any).user_name || "—"}
            </span>
          </div>

          <div className="text-xs text-gray-500 dir-ltr">
            🕒 {new Date((selectedOrderDetails as any).updated_at || new Date()).toLocaleString('en-US', {
              hour: 'numeric', minute: 'numeric', hour12: true,
              day: 'numeric', month: 'numeric' 
            })}
          </div>
        </div>

        {/* 2. القسم الأيسر: أزرار التحكم */}
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            🧾 طباعة الفاتورة
          </button>
          <button
            onClick={() => setIsDetailsModalOpen(false)}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
          >
            إغلاق
          </button>
             </div>

      </div>
    </div>
  </div>
)}
      {/* ===== مودال إضافة الطلب ===== */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">➕ إضافة طلب جديد</h2>

            <label className="block font-semibold mb-1">👤 اختر العميل:</label>
            <select
              onChange={(e) => selectCustomer(Number(e.target.value))}
              className="border w-full p-2 rounded mb-3 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- اختر العميل من القائمة --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>

            <select
              value={selectedAddress?.id || ""}
              onChange={(e) => {
                const addr = addresses.find((a) => a.id == Number(e.target.value));
                setSelectedAddress(addr || null);

                if (addr?.gps_link) {
                  setGpsLink(addr.gps_link);
                } else if (addr?.latitude && addr?.longitude) {
                  // ✅ تصحيح رابط خرائط جوجل
                  setGpsLink(
                    `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`
                  );
                } else {
                  setGpsLink("");
                }
              }}
              className="border w-full p-2 rounded focus:ring-2 focus:ring-blue-500"
              disabled={!selectedCustomer}
            >
              <option value="">
                {selectedCustomer
                  ? "-- اختر عنوان العميل --"
                  : "⚠️ يرجى اختيار عميل أولاً"}
              </option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {`${a.neighborhood_name || "بدون حي"} - ${a.address || ""}`}
                </option>
              ))}
            </select>

            <h3 className="font-bold mb-2">💳 طريقة الدفع</h3>
            <div className="flex gap-3 flex-wrap mb-3">
              {[
                { key: "cod", label: "الدفع عند الاستلام" },
                { key: "bank", label: "إيداع بنكي" },
                { key: "electronic", label: "دفع إلكتروني" },
                { key: "wallet", label: "الدفع من رصيدي" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setNewOrderPaymentMethod(m.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded border ${
                    newOrderPaymentMethod === m.key
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      newOrderPaymentMethod === m.key
                        ? "border-blue-600"
                        : "border-gray-400"
                    }`}
                  >
                    {newOrderPaymentMethod === m.key && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </span>
                  {m.label}
                </button>
              ))}
            </div>

            {newOrderPaymentMethod === "bank" && (
              <div className="border p-3 rounded bg-gray-50 mb-3">
                <h4 className="font-semibold mb-2">🏦 اختر البنك</h4>
                <select
                  value={selectedBankId || ""}
                  onChange={(e) => setSelectedBankId(Number(e.target.value))}
                  className="border w-full p-2 rounded"
                >
                  <option value="">-- اختر البنك --</option>
                  {banks.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.company} - {b.account_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {newOrderPaymentMethod === "electronic" && (
              <div className="border p-3 rounded bg-gray-50 mb-3">
                <h4 className="font-semibold mb-2">🌐 اختر بوابة الدفع</h4>
                <select className="border w-full p-2 rounded">
                  <option value="">-- اختر --</option>
                </select>
              </div>
            )}

            {newOrderPaymentMethod === "wallet" && (
              <div className="border p-3 rounded bg-gray-50 mb-3">
                <h4 className="font-semibold mb-2">👛 رصيدك</h4>
                <p>
                  الرصيد الحالي:{" "}
                  <strong
                    className={
                      walletBalance < 0 ? "text-red-600" : "text-green-600"
                    }
                  >
                    {walletBalance.toFixed(2)} ريال
                  </strong>
                </p>
                {!walletAllowed && (
                  <p className="text-red-600 mt-2">
                    ❌ لا يسمح بالسحب من هذا الحساب (تجاوز السقف)
                  </p>
                )}
                {walletAllowed && walletBalance < 0 && (
                  <p className="text-orange-600 mt-2">
                    ⚠️ الرصيد سالب لكن مسموح حسب إعدادات الحساب
                  </p>
                )}
              </div>
            )}

            <label className="mt-3 block">🏪 اختر المطعم:</label>
            <select
              value={currentRestaurant?.id || ""}
              onChange={(e) => selectRestaurant(Number(e.target.value))}
              className="border w-full p-2 rounded"
            >
              <option value="">-- اختر --</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <button
              onClick={openProductsModal}
              className="bg-blue-600 text-white px-3 py-1 mt-3 rounded"
              disabled={!currentRestaurant}
            >
              📦 تحديد المنتجات
            </button>

            <h3 className="font-bold mt-4">🛒 السلال:</h3>
            {groups.length === 0 && (
              <div className="text-sm text-gray-500">لم يتم إضافة أي مطعم بعد</div>
            )}

            {groups.map((g) => (
              <div key={g.restaurant.id} className="border rounded p-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">🏪 {g.restaurant.name}</h4>
                  <button
                    onClick={() => removeRestaurantGroup(g.restaurant.id)}
                    className="text-red-600 text-sm"
                  >
                    حذف المطعم ✖
                  </button>
                </div>
                {g.items.length === 0 ? (
                  <p className="text-sm text-gray-500">لا توجد منتجات</p>
                ) : (
                  g.items.map((item) => {
                    const total = item.price * item.quantity;
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center border-b py-1"
                      >
                        <div className="flex-1">
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.price} ريال × {item.quantity} ={" "}
                            <span className="text-green-600 font-bold">
                              {total} ريال
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateItemQty(
                                g.restaurant.id,
                                item.id,
                                item.quantity - 1
                              )
                            }
                            className="px-2 py-1 bg-gray-200 rounded"
                          >
                            ➖
                          </button>
                          <span className="min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateItemQty(
                                g.restaurant.id,
                                item.id,
                                item.quantity + 1
                              )
                            }
                            className="px-2 py-1 bg-gray-200 rounded"
                          >
                            ➕
                          </button>
                          <button
                            onClick={() => updateItemQty(g.restaurant.id, item.id, 0)}
                            className="text-red-600 ml-2"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ))}

            <button
              onClick={() => {
                setCurrentRestaurant(null);
                setRestaurantCategories([]);
                setProducts([]);
                setSelectedCategory(null);
              }}
              className="mt-3 bg-indigo-600 text-white px-3 py-2 rounded"
            >
              ➕ إضافة مطعم آخر
            </button>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={saveOrder}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                💾 حفظ
              </button>
              <button
                onClick={() => setShowAddOrderModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال اختيار المنتجات ===== */}
      {showProductsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">📦 قائمة المنتجات</h2>
            <div className="flex gap-3 overflow-x-auto border-b pb-2">
              {restaurantCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {products
                .filter((p) => {
                  if (!selectedCategory) return true;
                  const ids = String(p.category_ids || "").split(",");
                  return ids.includes(String(selectedCategory));
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className="border p-2 rounded flex flex-col justify-between"
                  >
                    <span className="font-bold">{p.name}</span>
                    <span>{p.price} ريال</span>
                    <button
                      onClick={() => addToCart(p)}
                      className="bg-green-600 text-white mt-2 px-3 py-1 rounded"
                    >
                      ➕ إضافة
                    </button>
                  </div>
                ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowProductsModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال إلغاء الطلب ===== */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-3">تأكيد إلغاء الطلب</h2>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="border w-full p-2 rounded mb-4"
              placeholder="اكتب سبب الإلغاء..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                إغلاق
              </button>
              <button
                onClick={confirmCancelOrder}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
