import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import {  
  Plus, Trash2, Save, ShoppingCart,  
  X, Search, Eye, FileText,  
  LayoutList, CreditCard, Banknote, Wallet, Building2, Globe,
  CheckCircle, Clock, Truck, AlertCircle, Printer, Edit, UserCheck
} from "lucide-react";
import { useReactToPrint } from 'react-to-print';

/* ======================
    الأنواع (Types)
====================== */
interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

type OrderTab = "pending" | "processing" | "ready" | "shipping" | "completed" | "cancelled";
type DateFilter = "all" | "today" | "week";

const ManualOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // Captain Assign
  const [captains, setCaptains] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [captainsLoading, setCaptainsLoading] = useState(false);

  // بيانات المودال
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]); 
  const [customerBalance, setCustomerBalance] = useState<any>(null);
  
  // المنتجات داخل المودال
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemName, setNewItemName] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    customer_id: "",
    restaurant_id: "",
    to_address: "",
    delivery_fee: 0,
    notes: "",
    payment_method: "cod",
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  /* ======================
      تحميل البيانات (API)
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
      const manualRestaurants = (restRes.data?.restaurants || []).filter((r: any) => r.display_type === "manual");
      setAgents(manualRestaurants);
    } catch (e) { console.error("❌ Error loading data", e); } finally { setLoading(false); }
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
  const getFilteredByDateList = (list: any[]) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");

    return list.filter((o) => {
      if (!o.created_at) return true;
      const orderDate = new Date(o.created_at);
      const orderDateStr = orderDate.toLocaleDateString("en-CA");
      if (dateFilter === "today") return orderDateStr === todayStr;
      if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return orderDate >= weekAgo;
      }
      return true;
    });
  };

  const dateFilteredOrders = getFilteredByDateList(orders);

  const filteredOrders = dateFilteredOrders.filter((o) => {
    const matchSearch = o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.toString().includes(searchTerm);
    const tabMatch = activeTab === "processing" ? ["confirmed", "processing"].includes(o.status) : o.status === activeTab;
    return matchSearch && tabMatch;
  });

  const getStatusCounts = (status: OrderTab) =>
    dateFilteredOrders.filter((o) => status === "processing" ? ["confirmed", "processing"].includes(o.status) : o.status === status).length;

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
      const res = await api.put(`/wassel-orders/status/${orderId}`, { status: newStatus });
      if (res.data.success) { loadInitialData(); }
    } catch (e) { alert("خطأ في تحديث الحالة"); }
  };

  const openEdit = (order: any) => {
    setEditingOrder(order);
    setForm({
      customer_id: order.customer_id || "",
      restaurant_id: order.restaurant_id || "",
      to_address: order.to_address || "",
      delivery_fee: Number(order.delivery_fee || 0),
      notes: order.notes || "",
      payment_method: order.payment_method || "cod",
    });
    setItems(order.items || []);
    setShowModal(true);
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
    if (!form.customer_id || items.length === 0) return alert("يرجى اختيار عميل وإضافة منتجات");
    try {
      const payload = { ...form, items, total_amount: calculateTotal() };
      if (editingOrder) { await api.put(`/wassel-orders/manual/${editingOrder.id}`, payload); } 
      else { await api.post("/wassel-orders/manual", payload); }
      setShowModal(false);
      setEditingOrder(null);
      loadInitialData();
    } catch (e: any) { alert(e.response?.data?.message || "خطأ أثناء الحفظ"); }
  };

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
            { k: "shipping", l: "توصيل", icon: <Truck size={14}/> },
            { k: "completed", l: "مكتمل", icon: <CheckCircle size={14}/> },
            { k: "cancelled", l: "ملغي", icon: <X size={14}/> },
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
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${o.payment_method === 'wallet' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {o.payment_method === 'wallet' ? 'محفظة' : 'نقداً'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2 items-center">
                      <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className="border rounded-lg px-2 py-1 text-[10px] bg-white shadow-sm outline-none w-full max-w-[120px] font-bold">
                        <option value="pending">اعتماد</option>
                        <option value="processing">قيد المعالجة</option>
                        <option value="ready">جاهز</option>
                        <option value="shipping">توصيل</option>
                        <option value="completed">مكتمل</option>
                        <option value="cancelled">إلغاء</option>
                      </select>
                      
                      <div className="flex gap-1">
                        {o.status === "pending" && <button onClick={() => updateOrderStatus(o.id, "processing")} className="bg-green-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-green-700">اعتماد</button>}
                        {["processing", "ready"].includes(o.status) && <button onClick={() => openCaptainModal(o.id)} className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><UserCheck size={10}/> كابتن</button>}
                        {o.status === "ready" && <button onClick={() => updateOrderStatus(o.id, "shipping")} className="bg-orange-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><Truck size={10}/> توصيل</button>}
                        {o.status === "shipping" && <button onClick={() => updateOrderStatus(o.id, "completed")} className="bg-green-700 text-white px-2 py-1 rounded text-[10px] font-bold">تم التسليم</button>}
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
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all dark:text-gray-400"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-3xl space-y-5 border dark:border-gray-700 shadow-inner">
                  <h3 className="text-sm font-black border-b dark:border-gray-700 pb-3 flex items-center gap-2 dark:text-white"><FileText size={18} className="text-orange-500"/> بيانات الفاتورة</h3>
                  <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">العميل</label><select className="custom-select border-r-4 border-blue-500 font-bold" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}><option value="">-- اختر العميل --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">المحل المورد</label><select className="custom-select border-r-4 border-orange-500 font-bold" value={form.restaurant_id} onChange={(e)=>setForm({...form, restaurant_id: e.target.value})}><option value="">-- شراء مباشر --</option>{agents.map(r => <option key={r.id} value={r.id}>🏪 {r.name}</option>)}</select></div>
                  <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">عنوان التوصيل</label><select className="custom-select font-bold" value={form.to_address} onChange={(e)=>setForm({...form, to_address: e.target.value})}><option value="">-- اختر العنوان --</option>{addresses.map(a => <option key={a.id} value={a.address}>{a.address}</option>)}</select></div>
                  <div className="pt-2">
                    <label className="text-[13px] font-black text-[#58647a] dark:text-gray-300 mb-3 block tracking-wider">وسيلة الدفع:</label>
                    <div className="flex gap-2">{[{id: 'cod', label: 'كاش', icon: Banknote}, {id: 'wallet', label: 'رصيد', icon: Wallet}].map(method => (<button key={method.id} type="button" onClick={() => setForm({...form, payment_method: method.id})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-black transition-all text-[11px] ${form.payment_method === method.id ? 'bg-[#5b51ef] border-[#5b51ef] text-white shadow-lg' : 'bg-white dark:bg-gray-800 border-gray-200 text-gray-500'}`}><method.icon size={16}/> {method.label}</button>))}</div>
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
              <div className="flex gap-3"><button onClick={()=>setShowModal(false)} className="px-8 py-3 text-gray-400 font-black hover:text-red-500 transition-all">إلغاء</button><button onClick={saveOrder} disabled={items.length===0} className="bg-green-600 text-white px-12 py-4 rounded-3xl font-black hover:bg-green-700 transition active:scale-95 shadow-xl flex items-center gap-3"><Save size={20}/> {editingOrder ? "تحديث التعديلات" : "اعتماد الطلب"}</button></div>
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
      {selectedOrderDetails.note || "لا توجد ملاحظات"}
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
    </div>
  );
};

export default ManualOrders;
