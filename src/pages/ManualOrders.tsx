import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { 
  Plus, Trash2, Save, ShoppingCart, 
  X, Search, Eye, UserCheck, FileText, 
  LayoutList, CreditCard, Banknote, Wallet, Building2, Globe,
  CheckCircle, Clock, Truck, AlertCircle, Printer, Edit
} from "lucide-react";
import { useReactToPrint } from 'react-to-print';

/* ======================
    Types
====================== */
interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

type OrderTab = "pending" | "processing" | "delivering" | "completed" | "cancelled";
type DateFilter = "all" | "today" | "week";

const ManualOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // الفلاتر (التنسيق الجديد)
  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  // بيانات المودال
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]); 
  const [customerBalance, setCustomerBalance] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemName, setNewItemName] = useState("");

  // الكباتن
  const [captains, setCaptains] = useState<any[]>([]);
  const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    customer_id: "",
    restaurant_id: "",
    to_address: "",
    delivery_fee: 0,
    notes: "",
    payment_method: "cod",
  });

  const handlePrint = useReactToPrint({ content: () => printRef.current });

  /* ======================
      API & Data
  ====================== */
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [ordersRes, custRes, restRes] = await Promise.all([
        api.get("/wassel-orders/manual/manual-list"),
        api.get("/customers"),
        api.get("/restaurants")
      ]);
      setOrders(ordersRes.data?.orders || []);
      setCustomers(custRes.data.customers || []);
      setAgents((restRes.data?.restaurants || []).filter((r: any) => r.display_type === "manual"));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    if (form.customer_id) {
      api.get(`/customer-addresses/customer/${form.customer_id}`).then(res => setAddresses(res.data.addresses || []));
      api.get(`/customer-guarantees/${form.customer_id}/balance`).then(res => setCustomerBalance(res.data));
    }
  }, [form.customer_id]);

  /* ======================
      Functions (Fixing ReferenceErrors)
  ====================== */
  const openOrderDetails = async (order: any) => {
    try {
      const res = await api.get(`/orders/${order.id}`);
      setSelectedOrderDetails(res.data);
    } catch (e) { setSelectedOrderDetails(order); }
    setIsDetailsModalOpen(true);
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

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await api.put(`/wassel-orders/status/${orderId}`, { status: newStatus });
      loadInitialData();
    } catch (e) { alert("خطأ في التحديث"); }
  };

  const openCaptainModal = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsCaptainModalOpen(true);
    api.get("/captains").then(res => setCaptains(res.data.captains || []));
  };

  const assignCaptain = async (captainId: number) => {
    try {
      await api.post("/wassel-orders/assign", { orderId: selectedOrderId, captainId });
      setIsCaptainModalOpen(false);
      loadInitialData();
    } catch (e) { alert("خطأ في الإسناد"); }
  };

  const openEdit = (order: any) => {
    setEditingOrder(order);
    setForm({
      customer_id: order.customer_id,
      restaurant_id: order.restaurant_id || "",
      to_address: order.to_address,
      delivery_fee: order.delivery_fee,
      notes: order.notes || "",
      payment_method: order.payment_method || "cod",
    });
    setItems(order.items || []);
    setShowModal(true);
  };

  const saveOrder = async () => {
    if (!form.customer_id || items.length === 0) return alert("أكمل البيانات");
    try {
      const payload = { ...form, items, total_amount: items.reduce((s,i)=>s+(i.qty*i.price),0) + Number(form.delivery_fee) };
      if (editingOrder) await api.put(`/wassel-orders/manual/${editingOrder.id}`, payload);
      else await api.post("/wassel-orders/manual", payload);
      setShowModal(false); loadInitialData();
    } catch (e: any) { alert(e.response?.data?.message || "خطأ في الحفظ"); }
  };

  /* ======================
      Filters Logic
  ====================== */
  const dateFiltered = orders.filter(o => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const orderDateStr = new Date(o.created_at).toLocaleDateString('en-CA');
    if (dateFilter === "today") return orderDateStr === todayStr;
    if (dateFilter === "week") {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(o.created_at) >= weekAgo;
    }
    return true;
  });

  const visibleOrders = dateFiltered.filter(o => {
    const matchesSearch = o.customer_name?.includes(searchTerm) || o.id.toString().includes(searchTerm);
    if (!matchesSearch) return false;
    switch (activeTab) {
      case "pending": return o.status === "pending";
      case "processing": return ["confirmed", "ready", "processing"].includes(o.status);
      case "delivering": return o.status === "shipping" || o.status === "delivering";
      case "completed": return o.status === "completed";
      case "cancelled": return o.status === "cancelled";
      default: return true;
    }
  });

  const counts = {
    pending: dateFiltered.filter(o => o.status === "pending").length,
    processing: dateFiltered.filter(o => ["confirmed", "ready", "processing"].includes(o.status)).length,
    delivering: dateFiltered.filter(o => o.status === "shipping" || o.status === "delivering").length,
    completed: dateFiltered.filter(o => o.status === "completed").length,
    cancelled: dateFiltered.filter(o => o.status === "cancelled").length,
  };

  const renderActions = (o: any) => {
    if (activeTab === "pending") return <button onClick={() => updateOrderStatus(o.id, "confirmed")} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold">إعتماد</button>;
    if (activeTab === "processing") return (
      <div className="flex gap-1 justify-center">
        <button onClick={() => openCaptainModal(o.id)} className="bg-indigo-600 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1"><UserCheck size={12}/> كابتن</button>
        <button onClick={() => updateOrderStatus(o.id, "shipping")} className="bg-orange-600 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1"><Truck size={12}/> توصيل</button>
      </div>
    );
    if (activeTab === "delivering") return <button onClick={() => updateOrderStatus(o.id, "completed")} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">تم التسليم</button>;
    return "—";
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-4 transition-all" dir="rtl">
      
      {/* 🟢 التبويبات وفلترة الأيام (نفس وصل لي) */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border dark:border-gray-700 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl text-orange-600"><ShoppingCart size={24} /></div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">✍️ الطلبات اليدوية</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
              <input type="text" placeholder="بحث..." className="pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm outline-none w-64 dark:text-white" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => { setEditingOrder(null); setItems([]); setShowModal(true); }} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition shadow-lg flex items-center gap-2"><Plus size={18}/> إضافة طلب</button>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4 dark:border-gray-700">
          <div className="flex gap-2 justify-center">
            {[{k:"all",l:"الكل"}, {k:"today",l:"اليوم"}, {k:"week",l:"الأسبوع"}].map(t=>(
              <button key={t.k} onClick={()=>setDateFilter(t.k as any)} className={`px-5 py-1.5 rounded-full text-sm font-bold transition ${dateFilter===t.k?"bg-indigo-600 text-white shadow-md":"bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>{t.l}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {[
              {k:"pending",l:"🟡 اعتماد", c:"orange"}, {k:"processing",l:"🔵 معالجة", c:"blue"},
              {k:"delivering",l:"🚚 توصيل", c:"indigo"}, {k:"completed",l:"✅ مكتمل", c:"emerald"}, {k:"cancelled",l:"❌ ملغي", c:"red"}
            ].map(t=>(
              <button key={t.k} onClick={()=>setActiveTab(t.k as any)} className={`px-4 py-2 rounded-xl border-b-4 transition-all flex items-center gap-2 ${activeTab===t.k?`bg-${t.c}-50 dark:bg-${t.c}-900/20 border-${t.c}-600 text-${t.c}-700` : "bg-white dark:bg-gray-800 border-transparent text-gray-500"}`}>
                {t.l} <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">({counts[t.k as keyof typeof counts]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🟢 الجدول مع زر التعديل واسناد الكباتن */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <table className="w-full text-[13px] text-center">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-bold border-b">
            <tr>
              <th className="p-4">المرجع</th>
              <th className="text-right">العميل</th>
              <th className="text-right">المورد</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th>الإجراء</th>
              <th>المستخدم</th>
              <th className="p-4">تحكم</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {visibleOrders.map((o) => (
              <tr key={o.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30">
                <td className="p-4 font-bold text-gray-400">#{o.id}</td>
                <td className="text-right font-black text-gray-800 dark:text-white">{o.customer_name}</td>
                <td className="text-right font-bold text-orange-600">{o.restaurant_name || "شراء مباشر"}</td>
                <td className="font-black text-gray-900 dark:text-white">{Number(o.total_amount).toLocaleString()} ريال</td>
                <td>
                  <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className="bg-gray-50 dark:bg-gray-700 border rounded-lg px-2 py-1 text-[10px] font-bold">
                    <option value="pending">بانتظار الاعتماد</option>
                    <option value="confirmed">مؤكد</option>
                    <option value="processing">قيد المعالجة</option>
                    <option value="ready">جاهز</option>
                    <option value="shipping">توصيل</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغي</option>
                  </select>
                </td>
                <td>{renderActions(o)}</td>
                <td className="text-xs text-gray-400">{o.user_name || "Admin"}</td>
                <td className="p-4 flex justify-center gap-2">
                   <button onClick={() => openOrderDetails(o)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={16}/></button>
                   <button onClick={() => openEdit(o)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"><Edit size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ➕ مودال الإضافة (نفس ستايلك السابق بدون لخبطة) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-xl font-black dark:text-white">{editingOrder ? "✏️ تعديل طلب" : "➕ إضافة طلب يدوي"}</h2>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-3xl space-y-4">
                  <select className="custom-select" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}>
                    <option value="">العميل</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="custom-select" value={form.restaurant_id} onChange={(e)=>setForm({...form, restaurant_id: e.target.value})}>
                    <option value="">المحل المورد</option>{agents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <select className="custom-select" value={form.to_address} onChange={(e)=>setForm({...form, to_address: e.target.value})}>
                    <option value="">عنوان التوصيل</option>{addresses.map(a => <option key={a.id} value={a.address}>{a.address}</option>)}
                  </select>
                  <div className="flex gap-2">
                    {['cod', 'wallet'].map(m => (
                      <button key={m} onClick={()=>setForm({...form, payment_method: m})} className={`flex-1 py-3 rounded-2xl border-2 font-black ${form.payment_method === m ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-gray-500'}`}>
                        {m === 'cod' ? 'كاش' : 'رصيد'}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder="رسوم التوصيل" className="custom-select" value={form.delivery_fee} onChange={(e)=>setForm({...form, delivery_fee: Number(e.target.value)})} />
                </div>
              </div>

              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-2xl border">
                  <input type="text" placeholder="اسم المنتج..." className="flex-1 p-4 bg-transparent outline-none font-bold text-sm" value={newItemName} onChange={(e)=>setNewItemName(e.target.value)} onKeyPress={(e)=>e.key==='Enter' && addItem()} />
                  <button onClick={addItem} className="bg-orange-500 text-white px-8 rounded-xl font-black">إضافة</button>
                </div>
                <div className="flex-1 border-2 border-dashed rounded-3xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-[10px] font-black uppercase">
                      <tr><th className="p-4 text-right">المنتج</th><th className="p-4 text-center">العدد</th><th className="p-4 text-center">السعر</th><th className="p-4 text-center">الإجمالي</th><th className="p-4 w-16"></th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td className="p-4 font-black">{item.name}</td>
                          <td className="p-4 flex justify-center gap-2">
                            <button onClick={()=>updateItem(index, 'qty', Math.max(1, item.qty-1))} className="w-7 h-7 bg-gray-100 rounded-lg">-</button>
                            <span className="font-bold">{item.qty}</span>
                            <button onClick={()=>updateItem(index, 'qty', item.qty+1)} className="w-7 h-7 bg-gray-100 rounded-lg">+</button>
                          </td>
                          <td className="p-4"><input type="number" className="w-20 p-2 border rounded-xl text-center" value={item.price} onChange={(e)=>updateItem(index, 'price', Number(e.target.value))} /></td>
                          <td className="p-4 font-black text-orange-600 text-center">{(item.qty * item.price).toLocaleString()}</td>
                          <td className="p-4"><button onClick={()=>removeItem(index)} className="text-red-400"><Trash2 size={18}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50/50 flex justify-between items-center">
              <div className="text-2xl font-black text-orange-500">{(items.reduce((s,i)=>s+(i.qty*i.price),0) + Number(form.delivery_fee)).toLocaleString()} ريال</div>
              <div className="flex gap-3"><button onClick={()=>setShowModal(false)} className="px-6 py-2 text-gray-400">إلغاء</button><button onClick={saveOrder} className="bg-green-600 text-white px-10 py-3 rounded-2xl font-black shadow-lg shadow-green-600/20">{editingOrder ? "تعديل" : "حفظ"}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* مودال إسناد الكابتن ومودال الفاتورة يبقيان كما هما */}
      {/* ... (بقية المودالات) */}

      <style>{`
        .custom-select { width: 100%; padding: 12px; border-radius: 15px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; outline: none; background: #ffffff; appearance: none; }
        .dark .custom-select { background: #1f2937; border-color: #374151; color: #fff; }
      `}</style>
    </div>
  );
};

export default ManualOrders;
