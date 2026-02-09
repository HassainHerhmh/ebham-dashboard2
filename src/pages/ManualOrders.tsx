import React, { useEffect, useState } from "react";
import api from "../services/api";
import { 
  Plus, Trash2, Save, ShoppingCart, 
  X, Search, Eye, UserPlus, FileText, 
  LayoutList, CreditCard, Banknote, Wallet, Building2, Globe,
  CheckCircle, Clock, Truck, AlertCircle
} from "lucide-react";

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

const ManualOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 🟢 حالات الفلترة
  const [filterPeriod, setFilterPeriod] = useState("all"); // all, today, week
  const [filterStatus, setFilterStatus] = useState("all");

  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]); 
  const [customerBalance, setCustomerBalance] = useState<any>(null);
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemName, setNewItemName] = useState("");

  const [form, setForm] = useState({
    customer_id: "",
    restaurant_id: "",
    to_address: "",
    delivery_fee: 0,
    notes: "",
    payment_method: "cod",
  });

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

  // 🟢 دالة تحديث الحالة من الجدول مباشرة
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await api.put(`/wassel-orders/status/${orderId}`, { status: newStatus });
      if (res.data.success) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } catch (e) { alert("خطأ في تحديث الحالة"); }
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
      const res = await api.post("/wassel-orders/manual", payload);
      if (res.data.success) {
        setShowModal(false);
        loadInitialData();
        setItems([]);
        setForm({ customer_id: "", restaurant_id: "", to_address: "", delivery_fee: 0, notes: "", payment_method: "cod" });
      }
    } catch (e: any) { alert(e.response?.data?.message || "خطأ أثناء الحفظ"); }
  };

  // 🟢 منطق الفلترة المتقدمة
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.customer_name?.includes(searchTerm) || o.id.toString().includes(searchTerm);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusCounts = (status: string) => orders.filter(o => o.status === status).length;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-4 transition-all" dir="rtl">
      
      {/* 🟢 الهيدر المطور مع الفلترة */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border dark:border-gray-700 mb-6 space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl text-orange-600"><ShoppingCart size={24} /></div>
            <div>
              <h1 className="text-xl font-black text-gray-800 dark:text-white uppercase">✍️ الطلبات اليدوية</h1>
              <p className="text-[10px] text-gray-400 font-bold italic">إدارة وتتبع المشتريات المباشرة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <div className="relative no-print">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                <input type="text" placeholder="بحث سريع..." className="pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 ring-orange-500/20 dark:text-white w-64 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
             <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 flex items-center gap-2"><Plus size={18}/> إضافة طلب</button>
          </div>
        </div>

        {/* 🟢 شريط الفلترة العلوي (نفس ستايل وصل لي) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t dark:border-gray-700">
           <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
              {['all', 'today', 'week'].map((p) => (
                <button 
                  key={p} 
                  onClick={() => setFilterPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterPeriod === p ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  {p === 'all' ? 'الكل' : p === 'today' ? 'اليوم' : 'هذا الأسبوع'}
                </button>
              ))}
           </div>

           <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setFilterStatus('pending')} className={`status-filter-btn border-orange-200 text-orange-600 ${filterStatus === 'pending' ? 'bg-orange-600 text-white' : 'bg-orange-50'}`}>
                <span className="text-[10px]">اعتماد ({getStatusCounts('pending')})</span>
                <Clock size={12}/>
              </button>
              <button onClick={() => setFilterStatus('ready')} className={`status-filter-btn border-green-200 text-green-600 ${filterStatus === 'ready' ? 'bg-green-600 text-white' : 'bg-green-50'}`}>
                <span className="text-[10px]">جاهز ({getStatusCounts('ready')})</span>
                <CheckCircle size={12}/>
              </button>
              <button onClick={() => setFilterStatus('shipping')} className={`status-filter-btn border-blue-200 text-blue-600 ${filterStatus === 'shipping' ? 'bg-blue-600 text-white' : 'bg-blue-50'}`}>
                <span className="text-[10px]">توصيل ({getStatusCounts('shipping')})</span>
                <Truck size={12}/>
              </button>
              <button onClick={() => setFilterStatus('completed')} className={`status-filter-btn border-emerald-200 text-emerald-600 ${filterStatus === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50'}`}>
                <span className="text-[10px]">مكتمل ({getStatusCounts('completed')})</span>
                <CheckCircle size={12}/>
              </button>
              <button onClick={() => setFilterStatus('cancelled')} className={`status-filter-btn border-red-200 text-red-600 ${filterStatus === 'cancelled' ? 'bg-red-600 text-white' : 'bg-red-50'}`}>
                <span className="text-[10px]">ملغي ({getStatusCounts('cancelled')})</span>
                <AlertCircle size={12}/>
              </button>
           </div>
        </div>
      </div>

      {/* 🟢 جدول الطلبات المطور */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-center table-auto">
            <thead className="bg-[#f1f5f9] dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold border-b dark:border-gray-700">
              <tr>
                <th className="p-4 border-l dark:border-gray-700">رقم</th>
                <th className="p-4 border-l dark:border-gray-700 text-right">العميل</th>
                <th className="p-4 border-l dark:border-gray-700 text-right">المطعم/المحل</th>
                <th className="p-4 border-l dark:border-gray-700 text-green-600 font-black italic">المبلغ</th>
                <th className="p-4 border-l dark:border-gray-700">نوع الدفع</th>
                <th className="p-4 border-l dark:border-gray-700">الحالة</th>
                <th className="p-4 border-l dark:border-gray-700">تفاصيل</th>
                <th className="p-4">المستخدم</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="p-4 font-bold text-gray-400">#{o.id}</td>
                  <td className="p-4 text-right font-black text-gray-800 dark:text-white">{o.customer_name}</td>
                  <td className="p-4 text-right font-bold text-orange-600 italic">{o.restaurant_name || "شراء مباشر"}</td>
                  <td className="p-4 font-black text-gray-900 dark:text-white">{Number(o.total_amount).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${o.payment_method === 'wallet' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {o.payment_method === 'wallet' ? 'محفظة' : 'نقداً'}
                    </span>
                  </td>
                  <td className="p-3 border-l dark:border-gray-700">
                    {/* 🟢 القائمة المنسدلة لتغيير الحالة */}
                    <select 
                      value={o.status} 
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                      className={`status-dropdown text-[10px] font-black px-2 py-1 rounded-full outline-none border-none cursor-pointer transition-all ${
                        o.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                        o.status === 'ready' ? 'bg-green-100 text-green-700' : 
                        o.status === 'shipping' ? 'bg-blue-100 text-blue-700' : 
                        o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <option value="pending">اعتماد</option>
                      <option value="ready">جاهز</option>
                      <option value="shipping">توصيل</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </td>
                  <td className="p-4"><button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 transition-all"><Eye size={16}/></button></td>
                  <td className="p-4 text-xs text-gray-400 font-bold">{o.user_name || "Admin"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 مودال الإضافة (نفس التصميم السابق) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border dark:border-gray-700">
            
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg"><ShoppingCart size={24}/></div>
                <div><h2 className="text-xl font-black dark:text-white uppercase tracking-tight">تسجيل طلب يدوي جديد</h2><p className="text-[10px] text-gray-400 font-bold italic">يتم اختيار العميل المسجل وتحديد بيانات الطلب</p></div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all dark:text-gray-400"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-3xl space-y-5 border dark:border-gray-700">
                  <h3 className="text-sm font-black border-b dark:border-gray-700 pb-3 flex items-center gap-2"><FileText size={18} className="text-orange-500"/> بيانات الفاتورة</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">العميل</label>
                      <select className="custom-select border-r-4 border-blue-500 font-bold" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}>
                        <option value="">-- اختر العميل --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">المحل اليدوي</label>
                      <select className="custom-select border-r-4 border-orange-500 font-bold" value={form.restaurant_id} onChange={(e)=>setForm({...form, restaurant_id: e.target.value})}>
                        <option value="">-- شراء مباشر --</option>
                        {agents.map(r => <option key={r.id} value={r.id}>🏪 {r.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">وسيلة الدفع:</label>
                      <div className="flex flex-row-reverse gap-2 overflow-hidden">
                        {[
                          {id: 'cod', label: 'عند الاستلام', icon: Banknote},
                          {id: 'wallet', label: 'من الرصيد', icon: Wallet},
                          {id: 'bank', label: 'إيداع بنكي', icon: Building2},
                          {id: 'electronic', label: 'دفع إلكتروني', icon: Globe}
                        ].map(method => (
                          <button key={method.id} onClick={() => setForm({...form, payment_method: method.id})} className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-2xl border-2 font-black transition-all text-[10px] ${form.payment_method === method.id ? 'bg-[#5b51ef] border-[#5b51ef] text-white shadow-lg' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                            <span className="order-2 text-center leading-tight">{method.label}</span>
                            <method.icon size={16} className="order-1"/>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase italic">رسوم التوصيل (ريال)</label>
                      <input type="number" className="custom-select font-black text-green-600" value={form.delivery_fee} onChange={(e)=>setForm({...form, delivery_fee: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                {customerBalance && (
                  <div className="p-5 bg-blue-600 rounded-3xl shadow-xl text-white transition-all animate-pulse-slow">
                    <p className="text-[10px] font-bold opacity-80 mb-1 uppercase tracking-widest italic text-center">الرصيد الفعلي المتاح</p>
                    <p className="text-2xl font-black text-center">{(Number(customerBalance.balance) + Number(customerBalance.credit_limit)).toLocaleString()} <span className="text-xs">ريال</span></p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm focus-within:ring-2 ring-orange-500/20 transition-all">
                  <input type="text" placeholder="اكتب اسم المنتج وتفاصيله..." className="flex-1 p-4 bg-transparent dark:text-white outline-none font-bold text-sm" value={newItemName} onChange={(e)=>setNewItemName(e.target.value)} onKeyPress={(e)=>e.key==='Enter' && addItem()} />
                  <button onClick={addItem} className="bg-orange-500 text-white px-8 rounded-xl font-black hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all">إضافة للقائمة</button>
                </div>

                <div className="flex-1 border-2 border-dashed dark:border-gray-700 rounded-[2rem] overflow-hidden flex flex-col bg-white dark:bg-gray-900/20 shadow-inner">
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] font-black uppercase sticky top-0 z-10 border-b dark:border-gray-700">
                        <tr><th className="p-4 text-right font-black">المنتج</th><th className="p-4 w-32 font-black text-center">العدد</th><th className="p-4 w-32 font-black text-center">السعر</th><th className="p-4 w-32 font-black text-orange-500">الإجمالي</th><th className="p-4 w-16"></th></tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {items.map((item, index) => (
                          <tr key={index} className="group hover:bg-orange-50/20 transition-colors">
                            <td className="p-4 font-black text-gray-700 dark:text-white">{item.name}</td>
                            <td className="p-4"><div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit mx-auto border dark:border-gray-600"><button type="button" onClick={()=>updateItem(index, 'qty', Math.max(1, item.qty-1))} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black dark:text-white">-</button><span className="w-6 text-center font-black dark:text-white text-xs">{item.qty}</span><button type="button" onClick={()=>updateItem(index, 'qty', item.qty+1)} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black dark:text-white">+</button></div></td>
                            <td className="p-4 text-center"><input type="number" className="w-24 p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-center font-black text-green-600 outline-none" value={item.price} onChange={(e)=>updateItem(index, 'price', Number(e.target.value))} /></td>
                            <td className="p-4 font-black text-orange-600 text-center">{(item.qty * item.price).toLocaleString()}</td>
                            <td className="p-4 text-center"><button onClick={()=>removeItem(index)} className="text-gray-300 hover:text-red-500 transition-all transform group-hover:scale-110"><Trash2 size={18}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 bg-white dark:bg-gray-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-8"><div className="text-right"><p className="text-[10px] text-gray-400 font-black uppercase mb-1">صافي قيمة المشتريات</p><p className="text-xl font-bold dark:text-white">{items.reduce((s,i)=>s+(i.qty*i.price),0).toLocaleString()} <span className="text-[10px]">ريال</span></p></div><div className="h-10 w-[1px] bg-gray-200 dark:bg-gray-700"></div><div className="text-right"><p className="text-[10px] text-gray-400 font-black uppercase mb-1 italic">المبلغ الإجمالي النهائي</p><p className="text-3xl font-black text-orange-500 leading-none">{calculateTotal().toLocaleString()} <span className="text-xs">ريال</span></p></div></div>
              <div className="flex gap-3"><button onClick={()=>setShowModal(false)} className="px-8 py-3 text-gray-400 font-black hover:text-red-500 transition-all text-xs uppercase tracking-widest">إلغاء</button><button onClick={saveOrder} disabled={items.length===0} className="bg-green-600 text-white px-12 py-4 rounded-3xl font-black hover:bg-green-700 transition-all shadow-2xl shadow-green-600/30 flex items-center gap-3"><Save size={20}/> اعتماد وحفظ الطلب</button></div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-select { width: 100%; padding: 12px; border-radius: 15px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; outline: none; background: #ffffff; transition: all 0.2s; appearance: none; }
        .dark .custom-select { background: #1f2937; border-color: #374151; color: #fff; }
        .status-filter-btn { display: flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1px solid; border-radius: 12px; font-weight: 800; transition: all 0.2s; }
        .status-dropdown { appearance: none; text-align: center; border: 1px solid transparent; }
        .status-dropdown:hover { transform: scale(1.05); }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-in { animation: fadeIn 0.25s ease-out; }
        .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

export default ManualOrders;
