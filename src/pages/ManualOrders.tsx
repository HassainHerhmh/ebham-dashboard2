import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Plus, Trash2, MapPin, Wallet, Landmark, Banknote, ShoppingCart, Save, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ======================
   Types
====================== */
interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

const ManualOrders: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]); // الوكلاء/المحلات
  const [customerBalance, setCustomerBalance] = useState<any>(null);

  // مصفوفة المنتجات (الطلب اليدوي)
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemName, setNewItemName] = useState("");

  const [form, setForm] = useState({
    customer_id: "",
    agent_id: "", // الوكيل
    from_address: "",
    to_address: "",
    delivery_fee: 0,
    notes: "",
    payment_method: "cod",
  });

  /* ======================
     Initial Loads
  ====================== */
  useEffect(() => {
    api.get("/customers").then(res => setCustomers(res.data.customers || []));
    api.get("/accounts").then(res => {
        // فلترة الوكلاء أو المحلات من شجرة الحسابات
        const list = res.data?.list || [];
        setAgents(list.filter((a: any) => a.account_level === "فرعي")); 
    });
  }, []);

  useEffect(() => {
    if (form.customer_id) {
      api.get(`/customer-addresses/customer/${form.customer_id}`).then(res => setAddresses(res.data.addresses || []));
      api.get(`/customer-guarantees/${form.customer_id}/balance`).then(res => setCustomerBalance(res.data));
    }
  }, [form.customer_id]);

  /* ======================
     Items Logic
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

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const calculateTotal = () => calculateSubtotal() + Number(form.delivery_fee);

  /* ======================
     Submit
  ====================== */
  const saveOrder = async () => {
    if (!form.customer_id || items.length === 0 || !form.to_address) {
      return alert("يرجى اختيار العميل وإضافة منتج واحد على الأقل وتحديد العنوان");
    }

    try {
      setLoading(true);
      const payload = {
        ...form,
        items,
        subtotal: calculateSubtotal(),
        total_amount: calculateTotal(),
        is_manual: true
      };

      const res = await api.post("/wassel-orders/manual", payload);
      if (res.data.success) {
        alert("تم حفظ الطلب اليدوي بنجاح");
        navigate("/orders/wassel"); // العودة لجدول الطلبات العام
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "خطأ في الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-2 md:p-6 transition-colors" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border-r-4 border-orange-500 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
            ✍️ إنشاء طلب يدوي جديد
          </h1>
          <p className="text-xs text-gray-400 font-bold">تسجيل منتجات وتسعير حر</p>
        </div>
        <div className="flex gap-3">
            <div className="text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase">إجمالي الفاتورة</p>
                <p className="text-xl font-black text-orange-600">{calculateTotal().toLocaleString()} <span className="text-xs">ريال</span></p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* اليمين: بيانات العميل والوكيل */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold border-b pb-2 dark:text-white flex items-center gap-2"><Plus size={16}/> البيانات الأساسية</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">العميل</label>
              <select 
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-600 rounded-xl outline-none"
                value={form.customer_id}
                onChange={(e) => setForm({...form, customer_id: e.target.value})}
              >
                <option value="">-- اختر العميل --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">الوكيل / المحل (اختياري)</label>
              <select 
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-600 rounded-xl outline-none"
                value={form.agent_id}
                onChange={(e) => setForm({...form, agent_id: e.target.value})}
              >
                <option value="">-- بدون وكيل (رسوم توصيل فقط) --</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">عنوان الوصول</label>
              <select 
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-600 rounded-xl outline-none"
                value={form.to_address}
                onChange={(e) => setForm({...form, to_address: e.target.value})}
              >
                <option value="">-- اختر من العناوين المحفوظة --</option>
                {addresses.map(a => <option key={a.id} value={a.address}>{a.address}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">رسوم التوصيل</label>
              <input 
                type="number"
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-600 rounded-xl font-bold"
                value={form.delivery_fee}
                onChange={(e) => setForm({...form, delivery_fee: Number(e.target.value)})}
              />
            </div>
          </div>

          {/* رصيد العميل */}
          {customerBalance && (
             <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-bold text-blue-600 mb-2">حالة رصيد العميل:</p>
                <div className="flex justify-between font-black dark:text-white">
                    <span>الرصيد المتاح:</span>
                    <span>{(Number(customerBalance.balance) + Number(customerBalance.credit_limit)).toLocaleString()} ريال</span>
                </div>
             </div>
          )}
        </div>

        {/* اليسار: جدول المنتجات */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700">
            <h3 className="font-bold border-b pb-4 mb-4 dark:text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-orange-500"/> قائمة المشتريات والمنتجات
            </h3>

            {/* حقل إضافة منتج */}
            <div className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    placeholder="اكتب اسم المنتج هنا... (مثلاً: كيس دقيق 10 كيلو)"
                    className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-600 rounded-xl outline-none focus:ring-2 ring-orange-500/20"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem()}
                />
                <button 
                    onClick={addItem}
                    className="bg-orange-500 text-white px-6 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20"
                >
                    إضافة للقائمة
                </button>
            </div>

            {/* الجدول الديناميكي */}
            <div className="overflow-x-auto border dark:border-gray-700 rounded-2xl">
              <table className="w-full text-sm text-center">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-4 text-right">المنتج</th>
                    <th className="p-4 w-32">الكمية</th>
                    <th className="p-4 w-32">سعر الوحدة</th>
                    <th className="p-4 w-32">الإجمالي</th>
                    <th className="p-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-3 text-right font-bold dark:text-white">{item.name}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                           <button onClick={() => updateItem(index, 'qty', Math.max(1, item.qty - 1))} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 rounded-md shadow-sm dark:text-white">-</button>
                           <span className="w-8 font-black dark:text-white">{item.qty}</span>
                           <button onClick={() => updateItem(index, 'qty', item.qty + 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 rounded-md shadow-sm dark:text-white">+</button>
                        </div>
                      </td>
                      <td className="p-3">
                        <input 
                            type="number"
                            className="w-full p-2 bg-white dark:bg-gray-600 dark:text-white border dark:border-gray-500 rounded-lg text-center font-bold"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-3 font-black text-orange-600">
                        {(item.qty * item.price).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 transition">
                            <Trash2 size={18}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-gray-300 dark:text-gray-600 font-bold italic">
                        القائمة فارغة.. ابدأ بإضافة المنتجات من الحقل أعلاه
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ملخص الحساب السفلي */}
            <div className="mt-6 flex flex-col items-end gap-2 border-t pt-4">
                <div className="flex justify-between w-64 text-gray-500 dark:text-gray-400">
                    <span className="font-bold">إجمالي المنتجات:</span>
                    <span>{calculateSubtotal().toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between w-64 text-gray-500 dark:text-gray-400 border-b pb-2">
                    <span className="font-bold">رسوم التوصيل:</span>
                    <span>{form.delivery_fee.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between w-64 text-xl font-black text-orange-600 pt-2">
                    <span>الإجمالي النهائي:</span>
                    <span>{calculateTotal().toLocaleString()} ريال</span>
                </div>
            </div>

            {/* زر الحفظ */}
            <div className="mt-8 flex justify-end">
                <button 
                    onClick={saveOrder}
                    disabled={loading || items.length === 0}
                    className={`flex items-center gap-2 px-12 py-4 rounded-2xl font-black text-white transition-all shadow-xl ${
                        loading || items.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                    }`}
                >
                    {loading ? "جاري الحفظ.." : <><Save size={20}/> اعتماد وحفظ الطلب</>}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualOrders;
