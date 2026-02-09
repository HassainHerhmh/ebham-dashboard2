import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { 
  Plus, Trash2, Save, ShoppingCart, 
  X, Search, Eye, UserCheck, FileText, 
  LayoutList, CreditCard, Banknote, Wallet, Building2, Globe,
  CheckCircle, Clock, Truck, AlertCircle, Printer, Edit
} from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from "react-router-dom";

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
  
  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]); 
  const [customerBalance, setCustomerBalance] = useState<any>(null);
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemName, setNewItemName] = useState("");

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
      Data Loading
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
      Filters Logic
  ====================== */
  const getFilteredByDate = (list: any[]) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return list.filter(o => {
      const orderDateStr = new Date(o.created_at).toLocaleDateString('en-CA');
      if (dateFilter === "today") return orderDateStr === todayStr;
      if (dateFilter === "week") {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(o.created_at) >= weekAgo;
      }
      return true;
    });
  };

  const dateFiltered = getFilteredByDate(orders);

  const counts = {
    pending: dateFiltered.filter(o => o.status === "pending").length,
    processing: dateFiltered.filter(o => ["confirmed", "ready", "processing"].includes(o.status)).length,
    delivering: dateFiltered.filter(o => o.status === "shipping" || o.status === "delivering").length,
    completed: dateFiltered.filter(o => o.status === "completed").length,
    cancelled: dateFiltered.filter(o => o.status === "cancelled").length,
  };

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

  /* ======================
      Actions
  ====================== */
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

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await api.put(`/wassel-orders/status/${orderId}`, { status: newStatus });
      loadInitialData();
    } catch (e) { alert("خطأ في التحديث"); }
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

  const renderActions = (o: any) => {
    if (activeTab === "pending") return <button onClick={() => updateOrderStatus(o.id, "confirmed")} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">إعتماد</button>;
    if (activeTab === "processing") return (
      <div className="flex gap-1 justify-center">
        <button onClick={() => openCaptainModal(o.id)} className="bg-indigo-600 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1"><UserCheck size={12}/> كابتن</button>
        <button onClick={() => updateOrderStatus(o.id, "shipping")} className="bg-orange-600 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1"><Truck size={12}/> توصيل</button>
      </div>
    );
    if (activeTab === "delivering") return <button onClick={() => updateOrderStatus(o.id, "completed")} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">تم التسليم</button>;
    return <span className="text-gray-300">—</span>;
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-4 transition-all" dir="rtl">
      
      {/* 🟢 الهيدر والفلترة (نفس ستايل وصل لي) */}
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
              <button key={t.k} onClick={()=>setActiveTab(t.k as any)} className={`px-4 py-2 rounded-xl border-b-4 transition-all flex items-center gap-2 ${activeTab===t.k?`bg-${t.c}-50 dark:bg-${t.c}-900/20 border-${t.c}-600 text-${t.c}-700` : "bg-white dark:bg-gray-800 border-transparent text-gray-400"}`}>
                {t.l} <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">({counts[t.k as keyof typeof counts]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🟢 جدول الطلبات (تنسيق وصل لي) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <table className="w-full text-[13px] text-center">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-bold border-b dark:border-gray-700">
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
              <tr key={o.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
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
        {visibleOrders.length === 0 && <div className="p-20 text-center text-gray-400 font-bold">لا توجد طلبات هنا</div>}
      </div>

      {/* 🚗 مودال إسناد الكابتن (نفس ستايل وصل لي) */}
      {isCaptainModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[110] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4 mb-4">
              <h2 className="text-xl font-bold dark:text-white">🚗 إسناد كابتن للطلب اليدوي</h2>
              <button onClick={()=>setIsCaptainModalOpen(false)} className="text-gray-400 hover:text-black">✖</button>
            </div>
            <ul className="divide-y dark:divide-gray-700 max-h-60 overflow-y-auto">
              {captains.map(c=>(
                <li key={c.id} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <div><p className="font-bold dark:text-white">{c.name}</p><p className="text-[10px] text-gray-400">الطلبات المعلقة: {c.pending_orders}</p></div>
                  <button onClick={()=>assignCaptain(c.id)} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm">إسناد</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ➕ مودال الإضافة والتعديل (نفس ستايل وصل لي) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border dark:border-gray-700 animate-in fade-in zoom-in">
            
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg"><Plus size={24}/></div>
                <div>
                  <h2 className="text-xl font-black dark:text-white uppercase">{editingOrder ? "✏️ تعديل طلب يدوي" : "➕ تسجيل طلب يدوي جديد"}</h2>
                  <p className="text-[10px] text-gray-400 font-bold italic">رقم المرجع: {editingOrder ? `#${editingOrder.id}` : "جديد"}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all dark:text-gray-400"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Sidebar Info */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-3xl space-y-5 border dark:border-gray-700">
                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">العميل</label>
                    <select className="custom-select border-r-4 border-blue-500 font-bold" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}>
                      <option value="">-- اختر العميل --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">المحل المورد</label>
                    <select className="custom-select border-r-4 border-orange-500 font-bold" value={form.restaurant_id} onChange={(e)=>setForm({...form, restaurant_id: e.target.value})}>
                      <option value="">-- شراء مباشر --</option>
                      {agents.map(r => <option key={r.id} value={r.id}>🏪 {r.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">عنوان التوصيل</label>
                    <select className="custom-select font-bold" value={form.to_address} onChange={(e)=>setForm({...form, to_address: e.target.value})}>
                      <option value="">-- اختر العنوان --</option>
                      {addresses.map(a => <option key={a.id} value={a.address}>{a.address}</option>)}
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase">وسيلة الدفع</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                          {id: 'cod', label: 'كاش', icon: Banknote},
                          {id: 'wallet', label: 'رصيد', icon: Wallet},
                        ].map(method => (
                          <button key={method.id} type="button" onClick={() => setForm({...form, payment_method: method.id})} className={`flex items-center justify-center gap-2 py-3 px-1 rounded-2xl border-2 font-black transition-all text-[11px] ${form.payment_method === method.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 border-gray-200 text-gray-500'}`}>
                            <method.icon size={16}/> {method.label}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase">رسوم التوصيل</label>
                    <input type="number" className="custom-select font-black text-green-600" value={form.delivery_fee} onChange={(e)=>setForm({...form, delivery_fee: Number(e.target.value)})} />
                  </div>
                </div>

                {customerBalance && (
                  <div className="p-5 bg-blue-600 rounded-3xl shadow-xl text-white text-center">
                    <p className="text-[10px] font-bold opacity-80 mb-1">الرصيد المتاح (مع السقف)</p>
                    <p className="text-2xl font-black">{(Number(customerBalance.balance) + Number(customerBalance.credit_limit)).toLocaleString()} ريال</p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
                  <input type="text" placeholder="أضف منتج جديد للقائمة..." className="flex-1 p-4 bg-transparent dark:text-white outline-none font-bold text-sm" value={newItemName} onChange={(e)=>setNewItemName(e.target.value)} onKeyPress={(e)=>e.key==='Enter' && addItem()} />
                  <button onClick={addItem} className="bg-orange-500 text-white px-8 rounded-xl font-black hover:bg-orange-600 transition-all">إضافة</button>
                </div>

                <div className="flex-1 border-2 border-dashed dark:border-gray-700 rounded-3xl overflow-hidden flex flex-col bg-white dark:bg-gray-900/20">
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] font-black uppercase sticky top-0 z-10 border-b">
                        <tr><th className="p-4 text-right">المنتج</th><th className="p-4 w-32 text-center">العدد</th><th className="p-4 w-32 text-center">السعر</th><th className="p-4 w-32 text-center">الإجمالي</th><th className="p-4 w-16"></th></tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {items.map((item, index) => (
                          <tr key={index} className="group hover:bg-orange-50/20 transition-colors">
                            <td className="p-4 font-black text-gray-700 dark:text-white">{item.name}</td>
                            <td className="p-4">
                                <div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mx-auto w-fit">
                                    <button onClick={()=>updateItem(index, 'qty', Math.max(1, item.qty-1))} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black">-</button>
                                    <span className="w-6 text-center font-black dark:text-white text-xs">{item.qty}</span>
                                    <button onClick={()=>updateItem(index, 'qty', item.qty+1)} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black">+</button>
                                </div>
                            </td>
                            <td className="p-4 text-center"><input type="number" className="w-24 p-2 bg-white dark:bg-gray-700 border rounded-xl text-center font-black text-green-600" value={item.price} onChange={(e)=>updateItem(index, 'price', Number(e.target.value))} /></td>
                            <td className="p-4 font-black text-orange-600 text-center">{(item.qty * item.price).toLocaleString()}</td>
                            <td className="p-4 text-center"><button onClick={()=>removeItem(index)} className="text-gray-300 hover:text-red-500 transition-all"><Trash2 size={18}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 bg-white dark:bg-gray-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-8">
                 <div className="text-right"><p className="text-[10px] text-gray-400 font-black mb-1 uppercase">إجمالي المشتريات</p><p className="text-xl font-bold dark:text-white">{items.reduce((s,i)=>s+(i.qty*i.price),0).toLocaleString()} ريال</p></div>
                 <div className="text-right"><p className="text-[10px] text-gray-400 font-black mb-1 uppercase text-orange-500">الإجمالي النهائي</p><p className="text-3xl font-black text-orange-500">{ (items.reduce((s,i)=>s+(i.qty*i.price),0) + Number(form.delivery_fee)).toLocaleString()} ريال</p></div>
              </div>
              <div className="flex gap-3"><button onClick={()=>setShowModal(false)} className="px-8 py-3 text-gray-400 font-black hover:text-red-500 transition-all">إلغاء</button><button onClick={saveOrder} disabled={items.length===0} className="bg-green-600 text-white px-12 py-4 rounded-3xl font-black hover:bg-green-700 transition-all shadow-xl flex items-center gap-3"><Save size={20}/> {editingOrder ? "تحديث وحفظ" : "اعتماد وحفظ"}</button></div>
            </div>

          </div>
        </div>
      )}

      {/* Styles (Same as original) */}
      <style>{`
        .custom-select { width: 100%; padding: 12px; border-radius: 15px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; outline: none; background: #ffffff; appearance: none; }
        .dark .custom-select { background: #1f2937; border-color: #374151; color: #fff; }
        .custom-select:focus { border-color: #f97316; }
        @media print { .no-print { display: none !important; } }
        .animate-in { animation: fadeIn 0.25s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default ManualOrders;
