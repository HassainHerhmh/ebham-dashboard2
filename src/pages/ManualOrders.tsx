import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { 
  Plus, Trash2, Save, ShoppingCart, 
  X, Search, Eye, UserPlus, FileText, 
  LayoutList, CreditCard, Banknote, Wallet, Building2, Globe,
  CheckCircle, Clock, Truck, AlertCircle, Printer
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

const ManualOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // الفلاتر
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

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
     العمليات (Actions)
  ====================== */
  const openOrderDetails = async (order: any) => {
    try {
      // محاولة جلب تفاصيل إضافية للسجلات اليدوية
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

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.customer_name?.includes(searchTerm) || o.id.toString().includes(searchTerm);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusCounts = (status: string) => orders.filter(o => o.status === status).length;

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
             <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg flex items-center gap-2"><Plus size={18}/> إضافة طلب</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t dark:border-gray-700">
           <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
              {['all', 'today', 'week'].map((p) => (
                <button key={p} onClick={() => setFilterPeriod(p)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterPeriod === p ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>
                  {p === 'all' ? 'الكل' : p === 'today' ? 'اليوم' : 'الأسبوع'}
                </button>
              ))}
           </div>

           <div className="flex flex-wrap items-center gap-2">
              {[
                { s: 'pending', l: 'اعتماد', c: 'orange', icon: Clock },
                { s: 'ready', l: 'جاهز', c: 'green', icon: CheckCircle },
                { s: 'shipping', l: 'توصيل', c: 'blue', icon: Truck },
                { s: 'completed', l: 'مكتمل', c: 'emerald', icon: CheckCircle },
                { s: 'cancelled', l: 'ملغي', c: 'red', icon: AlertCircle }
              ].map(status => (
                <button key={status.s} onClick={() => setFilterStatus(status.s)} className={`status-filter-btn border-${status.c}-200 text-${status.c}-600 ${filterStatus === status.s ? `bg-${status.c}-600 text-white shadow-sm` : `bg-${status.c}-50`}`}>
                  <span className="text-[10px] font-black">{status.l} ({getStatusCounts(status.s)})</span>
                  <status.icon size={12}/>
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* 🟢 جدول الطلبات */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-center table-auto">
            <thead className="bg-[#f1f5f9] dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold border-b dark:border-gray-700">
              <tr>
                <th className="p-4 border-l dark:border-gray-700">رقم</th>
                <th className="p-4 border-l dark:border-gray-700 text-right">العميل</th>
                <th className="p-4 border-l dark:border-gray-700 text-right">المطعم/المحل</th>
                <th className="p-4 border-l dark:border-gray-700 font-black italic text-green-600">المبلغ</th>
                <th className="p-4 border-l dark:border-gray-700">نوع الدفع</th>
                <th className="p-4 border-l dark:border-gray-700">الحالة</th>
                <th className="p-4 border-l dark:border-gray-700 text-center">تفاصيل</th>
                <th className="p-4">المستخدم</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="p-4 font-bold text-gray-400">#{o.id}</td>
                  <td className="p-4 text-right font-black text-gray-800 dark:text-white">{o.customer_name}</td>
                  <td className="p-4 text-right font-bold text-orange-600">{o.restaurant_name || "شراء مباشر"}</td>
                  <td className="p-4 font-black text-gray-900 dark:text-white">{Number(o.total_amount).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${o.payment_method === 'wallet' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {o.payment_method === 'wallet' ? 'محفظة' : 'نقداً'}
                    </span>
                  </td>
                  <td className="p-3 border-l dark:border-gray-700">
                    <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className={`status-dropdown text-[10px] font-black px-2 py-1 rounded-full outline-none transition-all ${o.status === 'pending' ? 'bg-orange-100 text-orange-700' : o.status === 'ready' ? 'bg-green-100 text-green-700' : o.status === 'shipping' ? 'bg-blue-100 text-blue-700' : o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      <option value="pending">اعتماد</option>
                      <option value="confirmed">مؤكد</option>
                      <option value="ready">جاهز</option>
                      <option value="shipping">توصيل</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </td>
                  <td className="p-4 text-center"><button onClick={() => openOrderDetails(o)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Eye size={16}/></button></td>
                  <td className="p-4 text-xs text-gray-400 font-bold">{o.user_name || "Admin"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟡 مودال الفاتورة (Details) */}
      {isDetailsModalOpen && selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden border dark:border-gray-700 transition-all">
            
            <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-lg font-black dark:text-white flex items-center gap-2">🧾 فاتورة الطلب اليدوي #{selectedOrderDetails.id}</h2>
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
            </div>

            <div ref={printRef} className="p-6 overflow-y-auto space-y-6 dark:text-white">
              <div className="text-center space-y-1 mb-8 border-b pb-4 no-print">
                <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">فاتورة مبيعات مباشرة</h1>
              </div>

              {(() => {
                // معالجة بيانات المطاعم للعرض الموحد
                const restaurants = selectedOrderDetails.restaurants || [{
                    name: selectedOrderDetails.restaurant_name || "شراء مباشر",
                    total: Number(selectedOrderDetails.total_amount) - Number(selectedOrderDetails.delivery_fee || 0),
                    items: selectedOrderDetails.items || []
                }];
                const delivery = Number(selectedOrderDetails.delivery_fee || 0);
                const grandTotal = Number(selectedOrderDetails.total_amount || 0);

                return (
                  <>
                    {restaurants.map((r: any, idx: number) => (
                      <div key={idx} className="mb-6 border dark:border-gray-700 rounded-2xl p-4 bg-gray-50/30 dark:bg-gray-900/20">
                        <h3 className="font-black text-md mb-3 text-indigo-600 flex items-center gap-2">🏪 المورد: {r.name}</h3>
                        <table className="w-full text-sm">
                          <thead className="bg-white dark:bg-gray-800 text-gray-400 text-[10px] font-black uppercase">
                            <tr>
                              <th className="p-3 text-right">المنتج</th>
                              <th className="p-3">السعر</th>
                              <th className="p-3">الكمية</th>
                              <th className="p-3 text-left">الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-700">
                            {(r.items || []).map((p: any, i: number) => (
                              <tr key={i} className="hover:bg-white dark:hover:bg-gray-800/50">
                                <td className="py-3 px-3 text-right font-black">{p.product_name || p.name}</td>
                                <td className="py-3 px-3 font-bold">{Number(p.price).toLocaleString()}</td>
                                <td className="py-3 px-3 font-bold">{p.qty || p.quantity}</td>
                                <td className="py-3 px-3 text-left font-black text-green-600">{Number(p.total || p.subtotal).toLocaleString()} ريال</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-3 text-left font-black text-xs text-gray-500 border-t pt-2">
                           إجمالي الصنف: {Number(r.total).toLocaleString()} ريال
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border dark:border-gray-700 p-4 rounded-3xl bg-indigo-50/20 dark:bg-indigo-900/10 space-y-2 shadow-inner">
                        <div className="flex justify-between text-sm"><span>📦 إجمالي المشتريات:</span><span className="font-bold">{(grandTotal - delivery).toLocaleString()} ريال</span></div>
                        <div className="flex justify-between text-sm"><span>🚚 رسوم التوصيل:</span><span className="font-bold">{delivery.toLocaleString()} ريال</span></div>
                        <div className="flex justify-between text-xl font-black text-indigo-600 border-t pt-2 mt-2"><span>💰 المجموع الكلي:</span><span>{grandTotal.toLocaleString()} ريال</span></div>
                      </div>
                      <div className="border dark:border-gray-700 p-4 rounded-3xl space-y-2 text-sm">
                        <h4 className="font-black mb-1 flex items-center gap-2 border-b pb-2"><CreditCard size={16}/> تفاصيل الدفع</h4>
                        <p>وسيلة السداد: <span className="font-black text-indigo-600">{selectedOrderDetails.payment_method === 'wallet' ? 'من الرصيد' : 'عند الاستلام'}</span></p>
                        <p className="text-gray-400">الحالة المالية: <span className="text-green-600 font-black">مكتملة</span></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="border dark:border-gray-700 p-4 rounded-3xl space-y-2">

  <h3 className="text-xs font-black uppercase text-gray-400 mb-2">
    👤 بيانات العميل
  </h3>

  <p className="font-black">
    {selectedOrderDetails.customer_name}
  </p>

  {/* العنوان */}
  <p className="text-xs text-gray-600 italic leading-relaxed">
    📍 {selectedOrderDetails.area || ""} <br />
    {selectedOrderDetails.to_address}
  </p>

  {/* رابط الخريطة */}
  {selectedOrderDetails.latitude && selectedOrderDetails.longitude && (
    <a
      href={`https://www.google.com/maps?q=${selectedOrderDetails.latitude},${selectedOrderDetails.longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800 text-xs font-black underline"
    >
      📌 فتح الموقع على الخريطة
    </a>
  )}

</div>

                      <div className="border dark:border-gray-700 p-4 rounded-3xl bg-yellow-50/30 dark:bg-yellow-900/10">
                        <h3 className="text-xs font-black uppercase text-yellow-600 mb-1">📝 ملاحظات إضافية</h3>
                        <p className="text-xs italic leading-relaxed">{selectedOrderDetails.notes || selectedOrderDetails.note || "لا توجد ملاحظات"}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* ✅ تذييل المودال (Footer) */}
            <div className="flex flex-col md:flex-row justify-between items-center p-5 border-t dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 gap-4">
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-700 dark:text-gray-400">الحالة:</span>
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedOrderDetails.status === 'completed' ? 'bg-green-100 text-green-700' :
                    selectedOrderDetails.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>{selectedOrderDetails.status}</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-bold">المستخدم: </span>
                  <span className="font-medium text-black dark:text-white">{selectedOrderDetails.user_name || "—"}</span>
                </div>
                <div className="text-[10px] text-gray-400 dir-ltr mt-1">
                  🕒 {new Date(selectedOrderDetails.updated_at || selectedOrderDetails.created_at || new Date()).toLocaleString('ar-YE')}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handlePrint} className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"><Printer size={18}/> طباعة الفاتورة</button>
                <button onClick={() => setIsDetailsModalOpen(false)} className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-6 py-2.5 rounded-2xl font-black hover:bg-gray-300 transition-all">إغلاق النافذة</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🟢 مودال الإضافة (الطلب اليدوي) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border dark:border-gray-700">
            
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg"><ShoppingCart size={24}/></div>
                <div>
                  <h2 className="text-xl font-black dark:text-white uppercase tracking-tight">تسجيل طلب يدوي (منتجات متعددة)</h2>
                  <p className="text-[10px] text-gray-400 font-bold italic tracking-tighter">يتم اختيار العميل المسجل وتحديد بيانات الطلب</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-2xl transition-all dark:text-gray-400"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* قسم البيانات */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-3xl space-y-5 border dark:border-gray-700 shadow-inner">
                  <h3 className="text-sm font-black border-b dark:border-gray-700 pb-3 flex items-center gap-2 dark:text-white"><FileText size={18} className="text-orange-500"/> بيانات الفاتورة</h3>
                  
                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">العميل</label>
                    <select className="custom-select border-r-4 border-blue-500 font-bold" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}>
                      <option value="">-- اختر العميل --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block flex items-center gap-1 uppercase tracking-wider"><LayoutList size={14}/> المحل اليدوي</label>
                    <select className="custom-select border-r-4 border-orange-500 font-bold" value={form.restaurant_id} onChange={(e)=>setForm({...form, restaurant_id: e.target.value})}>
                      <option value="">-- شراء مباشر --</option>
                      {agents.map(r => <option key={r.id} value={r.id}>🏪 {r.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">العنوان المحفوظ</label>
                    <select className="custom-select font-bold" value={form.to_address} onChange={(e)=>setForm({...form, to_address: e.target.value})}>
                      <option value="">-- اختر العنوان --</option>
                      {addresses.map(a => <option key={a.id} value={a.address}>{a.address}</option>)}
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="text-[13px] font-black text-[#58647a] dark:text-gray-300 mb-3 block flex items-center gap-2 tracking-wider">وسيلة الدفع:</label>
                    <div className="flex flex-row-reverse gap-2 overflow-hidden">
                        {[
                          {id: 'cod', label: 'عند الاستلام', icon: Banknote},
                          {id: 'wallet', label: 'من الرصيد', icon: Wallet},
                          {id: 'bank', label: 'إيداع بنكي', icon: Building2},
                          {id: 'electronic', label: 'دفع إلكتروني', icon: Globe}
                        ].map(method => (
                          <button key={method.id} type="button" onClick={() => setForm({...form, payment_method: method.id})} className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-2xl border-2 font-black transition-all text-[10px] ${form.payment_method === method.id ? 'bg-[#5b51ef] border-[#5b51ef] text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                            <span className="order-2 text-center leading-tight">{method.label}</span>
                            <method.icon size={16} className="order-1"/>
                          </button>
                        ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase italic">رسوم التوصيل</label>
                    <input type="number" className="custom-select font-black text-green-600 shadow-sm" value={form.delivery_fee} onChange={(e)=>setForm({...form, delivery_fee: Number(e.target.value)})} />
                  </div>
                </div>

                {customerBalance && (
                  <div className="p-5 bg-blue-600 rounded-3xl shadow-xl text-white transition-all animate-pulse-slow">
                    <p className="text-[10px] font-bold opacity-80 mb-1 uppercase tracking-widest italic text-center">الرصيد الفعلي المتاح</p>
                    <p className="text-2xl font-black text-center">{(Number(customerBalance.balance) + Number(customerBalance.credit_limit)).toLocaleString()} <span className="text-xs">ريال</span></p>
                  </div>
                )}
              </div>

              {/* قسم إضافة المنتجات */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm focus-within:ring-2 ring-orange-500/20 transition-all">
                  <input type="text" placeholder="اسم المنتج (مثلاً: دقيق هائل 10ك)..." className="flex-1 p-4 bg-transparent dark:text-white outline-none font-bold text-sm" value={newItemName} onChange={(e)=>setNewItemName(e.target.value)} onKeyPress={(e)=>e.key==='Enter' && addItem()} />
                  <button onClick={addItem} className="bg-orange-500 text-white px-8 rounded-xl font-black hover:bg-orange-600 transition-all active:scale-95 shadow-lg">إضافة للقائمة</button>
                </div>

                <div className="flex-1 border-2 border-dashed dark:border-gray-700 rounded-[2rem] overflow-hidden flex flex-col bg-white dark:bg-gray-900/20 shadow-inner">
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] font-black uppercase sticky top-0 z-10 border-b dark:border-gray-700">
                        <tr><th className="p-4 text-right">المنتج</th><th className="p-4 w-32 font-black text-center">العدد</th><th className="p-4 w-32 font-black text-center">السعر</th><th className="p-4 w-32 text-orange-500 text-center">الإجمالي</th><th className="p-4 w-16"></th></tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {items.map((item, index) => (
                          <tr key={index} className="group hover:bg-orange-50/20 transition-colors">
                            <td className="p-4 font-black text-gray-700 dark:text-white">{item.name}</td>
                            <td className="p-4"><div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit mx-auto border dark:border-gray-600"><button type="button" onClick={()=>updateItem(index, 'qty', Math.max(1, item.qty-1))} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black dark:text-white">-</button><span className="w-6 text-center font-black dark:text-white text-xs">{item.qty}</span><button type="button" onClick={()=>updateItem(index, 'qty', item.qty+1)} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black dark:text-white">+</button></div></td>
                            <td className="p-4 text-center"><input type="number" className="w-24 p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-center font-black text-green-600 outline-none focus:ring-1 ring-green-500" value={item.price} onChange={(e)=>updateItem(index, 'price', Number(e.target.value))} /></td>
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
              <div className="flex items-center gap-8"><div className="text-right"><p className="text-[10px] text-gray-400 font-black uppercase mb-1">صافي قيمة المشتريات</p><p className="text-xl font-bold dark:text-white">{items.reduce((s,i)=>s+(i.qty*i.price),0).toLocaleString()} <span className="text-[10px]">ريال</span></p></div><div className="h-10 w-[1px] bg-gray-200 dark:bg-gray-700"></div><div className="text-right"><p className="text-[10px] text-gray-400 font-black uppercase mb-1 italic tracking-tighter">المبلغ الإجمالي النهائي</p><p className="text-3xl font-black text-orange-500 leading-none">{calculateTotal().toLocaleString()} <span className="text-xs">ريال</span></p></div></div>
              <div className="flex gap-3"><button onClick={()=>setShowModal(false)} className="px-8 py-3 text-gray-400 font-black hover:text-red-500 transition-all text-xs uppercase tracking-widest">إلغاء</button><button onClick={saveOrder} disabled={items.length===0} className="bg-green-600 text-white px-12 py-4 rounded-3xl font-black hover:bg-green-700 transition-all shadow-2xl shadow-green-600/30 flex items-center gap-3"><Save size={20}/> اعتماد وحفظ الطلب</button></div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        .custom-select { width: 100%; padding: 12px; border-radius: 15px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; outline: none; background: #ffffff; transition: all 0.2s; appearance: none; }
        .dark .custom-select { background: #1f2937; border-color: #374151; color: #fff; }
        .custom-select:focus { border-color: #f97316; }
        .status-filter-btn { display: flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1px solid; border-radius: 12px; font-weight: 800; transition: all 0.2s; cursor: pointer; }
        .status-dropdown { appearance: none; text-align: center; border: 1px solid transparent; cursor: pointer; }
        @media print { .no-print { display: none !important; } }
        .animate-in { animation: fadeIn 0.25s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

export default ManualOrders;
ابغاك تنسق التبيوبات وفلترة الايام نفس صفحة ول لي وكمان تضيف قيد المعالجة بعد الاعتماد وكمان زر تعديل بعد المستخدم يفتح نفس مودل اضافه طلب اقدر اعدل بيانات الطلب وكمان اسناد الكباتن وتغيير لحالة في جدول نفس صفحة وصل لي مرتب
