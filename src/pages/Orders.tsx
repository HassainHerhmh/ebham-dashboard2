import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit, MapPin, DollarSign, UserCheck, Truck, RotateCcw, X, Printer, Trash2, Minus } from "lucide-react";
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
  creator_name?: string; 
  updater_name?: string; 
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
   Socket & Notifications
===================== */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";
const socket = io(SOCKET_URL);

function ToastNotifications() {
  const [toasts, setToasts] = useState<any[]>([]);
  useEffect(() => {
    const handler = (data: any) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { ...data, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    };
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, []);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-[400px] pointer-events-none" dir="rtl">
      {toasts.map((t) => (
        <div key={t.id} className="bg-white border-r-4 border-blue-600 shadow-2xl rounded-xl px-4 py-3 text-sm flex flex-col pointer-events-auto animate-in slide-in-from-top-2">
          <div className="font-bold text-gray-800">{t.message}</div>
          {t.user && <div className="text-gray-500 text-[10px] mt-1 italic">بواسطة: {t.user}</div>}
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

  // Modals States
  const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderDetails | null>(null);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainsLoading, setCaptainsLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Add Order Form States
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [currentRestaurant, setCurrentRestaurant] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");

  const printRef = useRef<HTMLDivElement>(null);

  /* =====================
     Data Loading
  ===================== */
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getOrders({ limit: 100 });
      setOrders(Array.isArray(res.orders || res) ? res.orders || res : []);
    } catch (e) { setOrders([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchOrders();
    api.get("/customers").then(res => setCustomers(res.data.customers || []));
    api.get("/restaurants").then(res => setRestaurants(res.data.restaurants || []));
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      api.get(`/customer-addresses/customer/${selectedCustomer.id}`).then(res => setAddresses(res.data.addresses || []));
    }
  }, [selectedCustomer]);

  /* =====================
     Filter Logic
  ===================== */
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
  const updateStatus = async (id: number, s: string) => {
    await api.orders.updateStatus(id, s); fetchOrders();
  };

  const openCaptainModal = (id: number) => {
    setSelectedOrderId(id); setIsCaptainModalOpen(true); setCaptainsLoading(true);
    api.captains.getAvailableCaptains().then(res => { setCaptains(res.captains || res); setCaptainsLoading(false); });
  };

  const assignCaptain = async (captainId: number) => {
    if (!selectedOrderId) return;
    await api.orders.assignCaptain(selectedOrderId, captainId);
    setIsCaptainModalOpen(false); fetchOrders();
  };

  const addToCart = (product: any) => {
    if (!currentRestaurant) return;
    setGroups(prev => {
      const existingGroup = prev.find(g => g.restaurant.id === currentRestaurant.id);
      if (existingGroup) {
        const item = existingGroup.items.find((i: any) => i.id === product.id);
        if (item) {
          item.quantity += 1;
          return [...prev];
        }
        existingGroup.items.push({ ...product, quantity: 1 });
        return [...prev];
      }
      return [...prev, { restaurant: currentRestaurant, items: [{ ...product, quantity: 1 }] }];
    });
  };

  const saveOrder = async () => {
    if (!selectedCustomer || !selectedAddress || groups.length === 0) return alert("أكمل البيانات");
    const payload = {
      customer_id: selectedCustomer.id,
      address_id: selectedAddress.id,
      payment_method: paymentMethod,
      restaurants: groups.map(g => ({
        restaurant_id: g.restaurant.id,
        products: g.items.map((i: any) => ({ product_id: i.id, quantity: i.quantity }))
      }))
    };
    await api.post("/orders", payload);
    setShowAddOrderModal(false); setGroups([]); fetchOrders();
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open("", "_blank");
    win?.document.write(`<html><body dir="rtl" style="font-family:sans-serif;padding:20px;">${printRef.current.innerHTML}</body></html>`);
    win?.document.close(); win?.print();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <ToastNotifications />

      {/* Header */}
      <div className="flex justify-between items-center px-4">
        <h1 className="text-2xl font-bold text-gray-800">📋 إدارة الطلبات</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAddOrderModal(true)} className="bg-green-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100 font-bold">
            <Plus size={20} /> إضافة طلب جديد
          </button>
          <button onClick={fetchOrders} className="bg-white border border-gray-200 text-gray-500 p-2.5 rounded-2xl hover:bg-gray-50 transition shadow-sm">
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* Modern Filter Section */}
      <div className="bg-white p-4 rounded-3xl shadow-sm space-y-4 border border-gray-100 mx-4">
        <div className="flex gap-2 justify-center border-b border-gray-50 pb-4">
          {[{k:"all",l:"الكل"}, {k:"today",l:"اليوم"}, {k:"week",l:"الأسبوع"}].map(t=>(
            <button key={t.k} onClick={()=>setDateFilter(t.k as any)} 
              className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${dateFilter===t.k?"bg-indigo-600 text-white shadow-xl shadow-indigo-100":"bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap justify-center pt-2">
          {[
            {k:"pending",l:"🟡 اعتماد"}, {k:"processing",l:"🔵 معالجة"},
            {k:"delivering",l:"🚚 توصيل"}, {k:"completed",l:"✅ مكتمل"}, {k:"cancelled",l:"❌ ملغي"}
          ].map(t=>(
            <button key={t.k} onClick={()=>setActiveTab(t.k as any)} 
              className={`px-5 py-3 rounded-2xl border-b-4 transition-all font-bold text-sm ${activeTab===t.k?"bg-blue-50 border-blue-600 text-blue-700 shadow-sm":"bg-white border-transparent text-gray-400 hover:bg-gray-50"}`}>
              {t.l} <span className={`text-[10px] mr-1.5 px-2 py-0.5 rounded-lg ${activeTab === t.k ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>{counts[t.k as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mx-4">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[1100px]">
            <thead className="bg-gray-50/50 text-gray-500 text-[11px] font-bold uppercase tracking-widest">
              <tr className="border-b border-gray-100">
                <th className="p-5">رقم</th>
                <th>العميل</th>
                <th>المطاعم</th>
                <th>الكابتن</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>إسناد</th>
                <th>المستخدم</th>
                <th className="p-5 text-left">تحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {visibleOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/80 transition-all group">
                  <td className="p-5 font-black text-gray-900 text-sm">#{o.id}</td>
                  <td className="text-right px-4">
                    <div className="font-bold text-gray-800 text-sm">{o.customer_name}</div>
                    <div className="text-[10px] text-gray-400 tracking-tighter">{o.customer_phone}</div>
                  </td>
                  <td className="px-2"><span className="bg-gray-100 text-gray-500 text-[10px] px-2.5 py-1 rounded-full font-bold">{o.stores_count} مطعم</span></td>
                  <td className="text-indigo-600 font-black text-xs">{o.captain_name || "—"}</td>
                  <td className="text-xs font-black text-gray-700">{o.total_amount} ريال</td>
                  
                  {/* Modern Status Switcher */}
                  <td className="px-2">
                    {o.status === "completed" || o.status === "cancelled" ? (
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase ${o.status === "completed" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                        {o.status === "completed" ? "مكتمل" : "ملغي"}
                      </span>
                    ) : (
                      <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} 
                        className="border border-gray-200 rounded-xl px-3 py-1.5 text-[10px] bg-white outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer font-bold">
                        <option value="pending">اعتماد</option>
                        <option value="confirmed">مؤكد</option>
                        <option value="preparing">تحضير</option>
                        <option value="ready">جاهز</option>
                        <option value="delivering">توصيل</option>
                        <option value="cancelled">إلغاء</option>
                      </select>
                    )}
                  </td>
                  
                  {/* Actions Column */}
                  <td className="px-2">
                    {activeTab === "pending" && <button onClick={()=>updateStatus(o.id,"confirmed")} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md shadow-green-50">اعتماد</button>}
                    {activeTab === "processing" && (
                      <div className="flex gap-1.5 justify-center">
                        <button onClick={()=>openCaptainModal(o.id)} className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700"><UserCheck size={14}/></button>
                        <button onClick={()=>updateStatus(o.id,"delivering")} className="bg-orange-500 text-white p-1.5 rounded-lg hover:bg-orange-600"><Truck size={14}/></button>
                      </div>
                    )}
                    {activeTab === "delivering" && <button onClick={()=>updateStatus(o.id,"completed")} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">تسليم ✅</button>}
                  </td>

                  {/* Smart User Tracking */}
                  <td className="px-2 text-[10px]">
                    {o.updater_name ? (
                      <div className="flex flex-col"><span className="font-bold text-blue-600">📝 {o.updater_name}</span><span className="text-[8px] text-gray-300 italic">تحديث</span></div>
                    ) : o.creator_name ? (
                      <div className="flex flex-col"><span className="font-bold text-gray-700">👤 {o.creator_name}</span><span className="text-[8px] text-gray-300 italic">منشئ</span></div>
                    ) : (
                      <span className="text-gray-300 italic">📱 تطبيق</span>
                    )}
                  </td>

                  <td className="p-5">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => api.orders.getOrderDetails(o.id).then(res => { setSelectedOrderDetails(res.order || res); setIsDetailsModalOpen(true); })} 
                        className="text-blue-600 p-2 bg-blue-50 rounded-xl hover:bg-blue-100"><MapPin size={16} /></button>
                      <button className="text-gray-400 p-2 bg-gray-50 rounded-xl hover:bg-gray-100"><Edit size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================
          1. مودال تعيين الكابتن
      ===================== */}
      {isCaptainModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800">🚗 اختر كابتن متاح</h2>
              <button onClick={()=>setIsCaptainModalOpen(false)} className="text-gray-400 bg-gray-50 p-2 rounded-full"><X size={20}/></button>
            </div>
            {captainsLoading ? <div className="text-center py-10 text-gray-400 font-bold animate-pulse">جاري البحث...</div> : (
              <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {captains.map(c=>(
                  <li key={c.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                    <div>
                      <p className="font-black text-gray-800 text-sm">{c.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">نشط: {c.pending_orders} | اليوم: {c.completed_today}</p>
                    </div>
                    <button onClick={()=>assignCaptain(c.id)} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100">إسناد</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* =====================
          2. مودال تفاصيل الطلب والفاتورة
      ===================== */}
      {isDetailsModalOpen && selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 font-black">#{selectedOrderDetails.id}</div>
                <h2 className="text-xl font-black text-gray-800 tracking-tighter">تفاصيل الفاتورة والطلب</h2>
              </div>
              <button onClick={()=>setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-black"><X/></button>
            </div>
            
            <div className="p-8 overflow-y-auto" ref={printRef}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100">
                    <h3 className="font-black text-blue-800 mb-3 flex items-center gap-2"><MapPin size={18}/> بيانات التوصيل</h3>
                    <p className="text-sm font-bold text-gray-700">العميل: {selectedOrderDetails.customer_name}</p>
                    <p className="text-sm text-gray-500 font-medium">العنوان: {selectedOrderDetails.customer_address}</p>
                    {selectedOrderDetails.map_url && <a href={selectedOrderDetails.map_url} target="_blank" className="text-blue-600 text-xs font-black underline mt-2 block">فتح الموقع على الخريطة 🌍</a>}
                  </div>
                </div>
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                  <h3 className="font-black text-gray-800 mb-3 flex items-center gap-2"><DollarSign size={18}/> ملخص المبالغ</h3>
                  <div className="space-y-2 text-sm font-bold">
                    <div className="flex justify-between"><span>رسوم التوصيل:</span><span>{selectedOrderDetails.delivery_fee} ريال</span></div>
                    {Number(selectedOrderDetails.extra_store_fee) > 0 && <div className="flex justify-between text-orange-600"><span>رسوم إضافية:</span><span>{selectedOrderDetails.extra_store_fee} ريال</span></div>}
                    <div className="pt-2 border-t flex justify-between text-lg text-blue-600"><span>الإجمالي:</span><span>{Number(selectedOrderDetails.delivery_fee) + Number(selectedOrderDetails.extra_store_fee)} ريال</span></div>
                  </div>
                </div>
              </div>

              <h3 className="font-black text-lg mb-4 text-gray-800 px-2">🏪 المنتجات حسب المطعم</h3>
              {selectedOrderDetails.restaurants?.map((rest: any, idx: number) => (
                <div key={idx} className="mb-6 rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="bg-gray-50 p-4 font-black text-gray-700 flex justify-between items-center">
                    <span>مطعم: {rest.name}</span>
                    <span className="text-xs text-blue-600">{rest.phone}</span>
                  </div>
                  <table className="w-full text-right text-sm">
                    <thead className="bg-white text-gray-400 text-[10px] font-black uppercase">
                      <tr><th className="p-4">المنتج</th><th className="p-4 text-center">الكمية</th><th className="p-4 text-left">السعر</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rest.items?.map((item: any, i: number) => (
                        <tr key={i}><td className="p-4 font-bold text-gray-800">{item.name}</td><td className="p-4 text-center font-black">x{item.quantity}</td><td className="p-4 text-left font-black text-green-600">{item.price} ريال</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
              <button onClick={handlePrint} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-xl shadow-blue-100">
                <Printer size={20}/> طباعة الفاتورة
              </button>
              <div className="text-right">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">آخر تحديث بواسطة</div>
                <div className="text-sm font-black text-gray-800">{selectedOrderDetails.user_name || "النظام"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================
          3. مودال إضافة طلب (متعدد المطاعم)
      ===================== */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b bg-gray-50/80 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800 tracking-tighter">➕ إنشاء طلب جديد متعدد المطاعم</h2>
              <button onClick={()=>setShowAddOrderModal(false)} className="text-gray-400 bg-white p-3 rounded-full shadow-sm"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Right: Data Entry */}
                <div className="lg:col-span-2 space-y-8">
                  <section className="space-y-4">
                    <label className="text-sm font-black text-gray-800 flex items-center gap-2 px-1">👤 العميل والموقع</label>
                    <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      onChange={(e) => setSelectedCustomer(customers.find(c => c.id === Number(e.target.value)))}>
                      <option>اختر العميل...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                    </select>
                    <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      disabled={!selectedCustomer} onChange={(e)=>setSelectedAddress(addresses.find(a=>a.id === Number(e.target.value)))}>
                      <option>حدد عنوان العميل...</option>
                      {addresses.map(a => <option key={a.id} value={a.id}>{a.address} - {a.neighborhood_name}</option>)}
                    </select>
                  </section>

                  <section className="space-y-4">
                    <label className="text-sm font-black text-gray-800 flex items-center gap-2 px-1">🏪 إضافة مطاعم ومنتجات</label>
                    <div className="flex gap-3">
                      <select className="flex-1 p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none"
                        onChange={(e)=>setCurrentRestaurant(restaurants.find(r=>r.id === Number(e.target.value)))}>
                        <option>اختر مطعم للبدء...</option>
                        {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <button onClick={() => {
                        if(!currentRestaurant) return alert("اختر مطعم");
                        api.get(`/restaurants/${currentRestaurant.id}/products`).then(res => { setProducts(res.data.products || []); setShowProductsModal(true); });
                      }} className="bg-blue-600 text-white px-6 rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100">فتح المنيو 🍔</button>
                    </div>
                  </section>

                  <section className="space-y-4 pt-4 border-t border-gray-100">
                    <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-widest">السلال النشطة</h4>
                    {groups.length === 0 ? <div className="p-10 bg-gray-50 rounded-[2rem] text-center text-gray-300 font-bold italic tracking-tighter">لم يتم إضافة أي منتجات بعد</div> : (
                      <div className="space-y-4">
                        {groups.map((g, idx) => (
                          <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                              <span className="font-black text-gray-800">🏪 {g.restaurant.name}</span>
                              <button onClick={()=>setGroups(groups.filter((_,i)=>i!==idx))} className="text-red-400 p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                            {g.items.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-sm mb-2">
                                <span className="font-bold text-gray-600">{item.name} <span className="text-[10px] text-gray-300">x{item.quantity}</span></span>
                                <span className="font-black text-green-600">{item.price * item.quantity} ريال</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {/* Left: Summary Panel */}
                <div className="bg-gray-900 rounded-[3rem] p-8 text-white flex flex-col justify-between shadow-2xl">
                  <div>
                    <h3 className="text-xl font-black mb-8 border-b border-gray-800 pb-4">💳 ملخص الطلب</h3>
                    <div className="space-y-4 opacity-70">
                      <div className="flex justify-between"><span>إجمالي المنتجات:</span><span className="font-black">{groups.reduce((sum, g) => sum + g.items.reduce((s:any, i:any)=> s + (i.price*i.quantity),0),0)} ريال</span></div>
                      <div className="flex justify-between"><span>رسوم التوصيل:</span><span className="font-black">مجاني (تجريبي)</span></div>
                    </div>
                  </div>
                  <div className="pt-10">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">المبلغ الإجمالي المستحق</div>
                    <div className="text-5xl font-black tracking-tighter mb-8">{groups.reduce((sum, g) => sum + g.items.reduce((s:any, i:any)=> s + (i.price*i.quantity),0),0)} <small className="text-lg">ريال</small></div>
                    <button onClick={saveOrder} className="w-full bg-blue-500 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-blue-400 transition-all shadow-2xl shadow-blue-500/20 active:scale-95">تأكيد وإرسال الطلب ✨</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================
          4. مودال المنتجات (داخل إضافة طلب)
      ===================== */}
      {showProductsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end z-[110] p-4">
          <div className="bg-white rounded-t-[3rem] w-full max-w-4xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-10 shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800">📦 قائمة أصناف {currentRestaurant?.name}</h2>
              <button onClick={()=>setShowProductsModal(false)} className="text-gray-400 bg-gray-50 p-2 rounded-full"><X/></button>
            </div>
            <div className="p-8 overflow-y-auto max-h-[60vh] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="p-5 border border-gray-100 rounded-3xl hover:border-blue-200 transition-all group flex flex-col justify-between">
                  <div>
                    <div className="font-black text-gray-800 text-sm mb-1">{p.name}</div>
                    <div className="text-green-600 font-black text-xs">{p.price} ريال</div>
                  </div>
                  <button onClick={() => { addToCart(p); setShowProductsModal(false); }} className="mt-4 w-full bg-blue-50 text-blue-600 py-2 rounded-xl font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">+ إضافة للسلة</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
