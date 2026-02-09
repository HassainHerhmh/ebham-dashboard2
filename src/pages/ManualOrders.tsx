import React, { useEffect, useState } from "react";
import api from "../services/api";
import { 
  Plus, Trash2, Save, ShoppingCart, 
  X, Search, Eye, UserPlus, FileText, 
  LayoutList, CreditCard, Banknote, Wallet, Building2, Globe
} from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");

  // بيانات المودال (النموذج)
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]); 
  const [customerBalance, setCustomerBalance] = useState<any>(null);
  
  // المنتجات داخل المودال
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemName, setNewItemName] = useState("");

  const [form, setForm] = useState({
    customer_id: "",
    agent_id: "",
    to_address: "",
    delivery_fee: 0,
    notes: "",
    payment_method: "cod", // القيمة الافتراضية
  });

  /* ======================
     تحميل البيانات (API)
  ====================== */
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [ordersRes, custRes, accRes] = await Promise.all([
        api.get("/wassel-orders/manual/manual-list"),
        api.get("/customers"),
        api.get("/accounts")
      ]);
      
      setOrders(ordersRes.data?.orders || []);
      setCustomers(custRes.data.customers || []);
      
      // فلترة المحلات المرتبطة باليدوي
    const manualStores = [
  { id: null, name_ar: "شراء مباشر (توصيل فقط)" },
  ...(accRes.data?.list || []).filter(
    (a:any)=>a.display_type==="manual"
  )
];

      setAgents(manualStores);
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // جلب العناوين والرصيد عند اختيار العميل
  useEffect(() => {
    if (form.customer_id) {
      api.get(`/customer-addresses/customer/${form.customer_id}`).then(res => setAddresses(res.data.addresses || []));
      api.get(`/customer-guarantees/${form.customer_id}/balance`).then(res => setCustomerBalance(res.data));
    } else {
      setAddresses([]);
      setCustomerBalance(null);
    }
  }, [form.customer_id]);

  /* ======================
     منطق إضافة المنتجات
  ====================== */
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
      const payload = { ...form, items, total_amount: calculateTotal(), is_manual: true };
      const res = await api.post("/wassel-orders/manual", payload);
      if (res.data.success) {
        setShowModal(false);
        loadInitialData();
        setItems([]);
        setForm({ customer_id: "", agent_id: "", to_address: "", delivery_fee: 0, notes: "", payment_method: "cod" });
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "خطأ أثناء الحفظ");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-4 transition-all" dir="rtl">
      
      {/* 🟢 الهيدر (Header) */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border-b-4 border-orange-500 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl text-orange-600">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800 dark:text-white uppercase">✍️ الطلبات اليدوية</h1>
            <p className="text-[10px] text-gray-400 font-bold">إضافة وتتبع المشتريات المباشرة للعملاء</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="relative no-print">
              <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="بحث في الطلبات..." 
                className="pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 ring-orange-500/20 dark:text-white w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <button 
             onClick={() => setShowModal(true)}
             className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 flex items-center gap-2"
           >
             <Plus size={18}/> إضافة طلب يدوي
           </button>
        </div>
      </div>

      {/* 🟢 جدول الطلبات الرئيسي */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-center table-auto">
            <thead className="bg-[#f1f5f9] dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold border-b dark:border-gray-700">
              <tr>
                <th className="p-4 border-l dark:border-gray-700">رقم</th>
                <th className="p-4 border-l dark:border-gray-700 text-right">العميل</th>
                <th className="p-4 border-l dark:border-gray-700 text-right">المطعم/المحل</th>
                <th className="p-4 border-l dark:border-gray-700">الكابتن</th>
                <th className="p-4 border-l dark:border-gray-700">المبلغ</th>
                <th className="p-4 border-l dark:border-gray-700">نوع الدفع</th>
                <th className="p-4 border-l dark:border-gray-700">الحالة</th>
                <th className="p-4 border-l dark:border-gray-700">تفاصيل</th>
                <th className="p-4 border-l dark:border-gray-700">تعيين كابتن</th>
                <th className="p-4">المستخدم</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {orders.filter(o => o.customer_name?.includes(searchTerm)).map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="p-4 font-bold text-gray-400">#{o.id}</td>
                  <td className="p-4 text-right font-black text-gray-800 dark:text-white">{o.customer_name}</td>
                  <td className="p-4 text-right font-bold text-orange-600">{o.agent_name || "شراء مباشر"}</td>
                  <td className="p-4 text-blue-600 font-bold">{o.captain_name || "—"}</td>
                  <td className="p-4 font-black text-gray-900 dark:text-white">{Number(o.total_amount).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${o.payment_method === 'wallet' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {o.payment_method === 'wallet' ? 'محفظة' : o.payment_method === 'cod' ? 'عند الاستلام' : 'أخرى'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black">
                      {o.status || 'جاهز'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Eye size={16}/></button>
                  </td>
                  <td className="p-4">
                    <button className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all"><UserPlus size={16}/></button>
                  </td>
                  <td className="p-4 text-xs text-gray-400 font-bold">{o.user_name || "Admin"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && !loading && (
            <div className="p-20 text-center text-gray-300 dark:text-gray-600 font-bold italic">لا توجد طلبات يدوية مسجلة</div>
          )}
        </div>
      </div>

      {/* 🟢 مودال الإضافة (Modal) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border dark:border-gray-700">
            
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                  <ShoppingCart size={24}/>
                </div>
                <div>
                  <h2 className="text-xl font-black dark:text-white">تسجيل طلب يدوي (منتجات متعددة)</h2>
                  <p className="text-[10px] text-gray-400 font-bold italic tracking-tighter">يتم اختيار العميل المسجل وتحديد بيانات الطلب</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-2xl transition-all dark:text-gray-400"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* القسم الأيمن: البيانات */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-3xl space-y-5 border dark:border-gray-700">
                  <h3 className="text-sm font-black border-b dark:border-gray-700 pb-3 flex items-center gap-2"><FileText size={18} className="text-orange-500"/> بيانات الفاتورة</h3>
                  
                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">العميل (من قاعدة البيانات)</label>
                    <select className="custom-select border-r-4 border-blue-500 font-bold" value={form.customer_id} onChange={(e)=>setForm({...form, customer_id: e.target.value})}>
                      <option value="">-- اختر العميل --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block flex items-center gap-1 uppercase tracking-wider"><LayoutList size={14}/> المحل / الوكيل اليدوي</label>
                    <select className="custom-select border-r-4 border-orange-500 font-bold" value={form.agent_id} onChange={(e)=>setForm({...form, agent_id: e.target.value})}>
                      <option value="">-- شراء مباشر (توصيل فقط) --</option>
                      {agents.map(a => <option key={a.id} value={a.id}>🛒 {a.name_ar}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-wider">العنوان المحفوظ للعميل</label>
                    <select className="custom-select font-bold" value={form.to_address} onChange={(e)=>setForm({...form, to_address: e.target.value})}>
                      <option value="">-- اختر العنوان --</option>
                      {addresses.map(a => <option key={a.id} value={a.address}>{a.address}</option>)}
                    </select>
                    {form.customer_id && addresses.length === 0 && <p className="text-[9px] text-red-500 mt-1 font-black italic">* لا يوجد عناوين مسجلة للعميل</p>}
                  </div>

                  {/* 🟢 قسم وسيلة الدفع (المعدل كما طلبت) */}
                  <div className="pt-2">
                    <label className="text-[13px] font-black text-[#58647a] dark:text-gray-300 mb-3 block flex items-center gap-2 tracking-wider">
                        <CreditCard size={18} className="text-blue-500"/> وسيلة الدفع:
                    </label>
                    <div className="flex flex-row-reverse gap-2 overflow-hidden">
                        {/* عند الاستلام */}
                        <button 
                            type="button"
                            onClick={() => setForm({...form, payment_method: 'cod'})}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-2xl border-2 font-black transition-all text-[10px] ${form.payment_method === 'cod' ? 'bg-[#5b51ef] border-[#5b51ef] text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                        >
                            <span className="order-2 text-center leading-tight">عند الاستلام</span>
                            <Banknote size={16} className="order-1"/>
                        </button>

                        {/* من الرصيد */}
                        <button 
                            type="button"
                            onClick={() => setForm({...form, payment_method: 'wallet'})}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-2xl border-2 font-black transition-all text-[10px] ${form.payment_method === 'wallet' ? 'bg-[#5b51ef] border-[#5b51ef] text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                        >
                            <span className="order-2 text-center leading-tight">من الرصيد</span>
                            <Wallet size={16} className="order-1"/>
                        </button>

                        {/* إيداع بنكي */}
                        <button 
                            type="button"
                            onClick={() => setForm({...form, payment_method: 'bank'})}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-2xl border-2 font-black transition-all text-[10px] ${form.payment_method === 'bank' ? 'bg-[#5b51ef] border-[#5b51ef] text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                        >
                            <span className="order-2 text-center leading-tight">إيداع بنكي</span>
                            <Building2 size={16} className="order-1"/>
                        </button>

                        {/* دفع إلكتروني */}
                        <button 
                            type="button"
                            onClick={() => setForm({...form, payment_method: 'electronic'})}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded-2xl border-2 font-black transition-all text-[10px] ${form.payment_method === 'electronic' ? 'bg-[#5b51ef] border-[#5b51ef] text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                        >
                            <span className="order-2 text-center leading-tight">دفع إلكتروني</span>
                            <Globe size={16} className="order-1"/>
                        </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase italic">رسوم التوصيل (ريال)</label>
                    <input type="number" className="custom-select font-black text-green-600" value={form.delivery_fee} onChange={(e)=>setForm({...form, delivery_fee: Number(e.target.value)})} />
                  </div>
                </div>

                {customerBalance && (
                  <div className="p-5 bg-blue-600 rounded-3xl shadow-xl shadow-blue-600/20 text-white transition-all animate-pulse-slow">
                    <p className="text-[10px] font-bold opacity-80 mb-1 uppercase tracking-widest italic text-center">الرصيد الفعلي المتاح للعميل</p>
                    <p className="text-2xl font-black text-center">{(Number(customerBalance.balance) + Number(customerBalance.credit_limit)).toLocaleString()} <span className="text-xs">ريال</span></p>
                  </div>
                )}
              </div>

              {/* القسم الأيسر: إضافة المنتجات */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm focus-within:ring-2 ring-orange-500/20 transition-all">
                  <input 
                    type="text" 
                    placeholder="اكتب اسم المنتج وتفاصيله (مثلاً: دقيق هائل 10ك)..." 
                    className="flex-1 p-4 bg-transparent dark:text-white outline-none font-bold text-sm"
                    value={newItemName}
                    onChange={(e)=>setNewItemName(e.target.value)}
                    onKeyPress={(e)=>e.key==='Enter' && addItem()}
                  />
                  <button onClick={addItem} className="bg-orange-500 text-white px-8 rounded-xl font-black hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-500/20">إضافة للقائمة</button>
                </div>

                <div className="flex-1 border-2 border-dashed dark:border-gray-700 rounded-[2rem] overflow-hidden flex flex-col bg-white dark:bg-gray-900/20 shadow-inner">
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] font-black uppercase sticky top-0 z-10 border-b dark:border-gray-700">
                        <tr>
                          <th className="p-4 text-right font-black">المنتج</th>
                          <th className="p-4 w-32 font-black text-center">العدد</th>
                          <th className="p-4 w-32 font-black text-center">السعر</th>
                          <th className="p-4 w-32 font-black text-center text-orange-500">الإجمالي</th>
                          <th className="p-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {items.map((item, index) => (
                          <tr key={index} className="group hover:bg-orange-50/20 transition-colors">
                            <td className="p-4 font-black text-gray-700 dark:text-white">{item.name}</td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit mx-auto border dark:border-gray-600">
                                <button type="button" onClick={()=>updateItem(index, 'qty', Math.max(1, item.qty-1))} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black dark:text-white">-</button>
                                <span className="w-6 text-center font-black dark:text-white text-xs">{item.qty}</span>
                                <button type="button" onClick={()=>updateItem(index, 'qty', item.qty+1)} className="w-7 h-7 bg-white dark:bg-gray-600 rounded-lg shadow-sm font-black dark:text-white">+</button>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <input 
                                type="number" 
                                className="w-24 p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-center font-black text-green-600 outline-none focus:ring-1 ring-green-500 shadow-sm" 
                                value={item.price} 
                                onChange={(e)=>updateItem(index, 'price', Number(e.target.value))} 
                              />
                            </td>
                            <td className="p-4 font-black text-orange-600 text-center">{(item.qty * item.price).toLocaleString()}</td>
                            <td className="p-4 text-center"><button onClick={()=>removeItem(index)} className="text-gray-300 hover:text-red-500 transition-all transform group-hover:scale-110"><Trash2 size={18}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {items.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-gray-300 py-20 italic">
                        <ShoppingCart size={40} className="mb-2 opacity-20" />
                        <p className="font-bold tracking-tighter">قائمة المشتريات فارغة</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t dark:border-gray-700 bg-white dark:bg-gray-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-black mb-1 uppercase tracking-tighter">صافي قيمة المشتريات</p>
                  <p className="text-xl font-bold dark:text-white">{items.reduce((s,i)=>s+(i.qty*i.price),0).toLocaleString()} <span className="text-[10px]">ريال</span></p>
                </div>
                <div className="h-10 w-[1px] bg-gray-200 dark:bg-gray-700"></div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-black mb-1 uppercase tracking-tighter italic">المبلغ الإجمالي النهائي</p>
                  <p className="text-3xl font-black text-orange-500 leading-none">{calculateTotal().toLocaleString()} <span className="text-xs">ريال</span></p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setShowModal(false)} className="px-8 py-3 text-gray-400 font-black hover:text-red-500 transition-all text-xs uppercase tracking-widest">إلغاء</button>
                <button 
                  onClick={saveOrder} 
                  disabled={items.length===0} 
                  className="bg-green-600 text-white px-12 py-4 rounded-3xl font-black hover:bg-green-700 transition-all shadow-2xl shadow-green-600/30 disabled:bg-gray-200 disabled:shadow-none flex items-center gap-3"
                >
                  <Save size={20}/> اعتماد وحفظ الطلب
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🟢 الستايلات المخصصة */}
      <style>{`
        .custom-select {
          width: 100%;
          padding: 12px;
          border-radius: 15px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          background: #ffffff;
          transition: all 0.2s;
          appearance: none;
        }
        .dark .custom-select {
          background: #1f2937;
          border-color: #374151;
          color: #fff;
        }
        .custom-select:focus {
          border-color: #f97316;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in { animation: fadeIn 0.25s ease-out; }
        .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

export default ManualOrders;
