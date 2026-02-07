import { useEffect, useState } from "react";
import api from "../services/api";
// ✅ استيراد useApp لجلب بيانات الفرع
import { useApp } from "../contexts/AppContext"; 

type Customer = { id: number; name: string; };

type GuaranteeRow = {
  id: number;
  customer_id: number;
  customer_name: string;
  type: "cash" | "bank" | "account";
  account_name: string | null;
  balance: number;
  created_by_name?: string;
  branch_name?: string;
  branch_id?: number; // أضفنا هذا الحقل للتأكد
};

const PaymentsWallet: React.FC = () => {
  // ✅ الحصول على بيانات المستخدم والفرع
  const { state } = useApp();
  const user = state.user;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [list, setList] = useState<GuaranteeRow[]>([]);
  const [cashBoxes, setCashBoxes] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [rate, setRate] = useState<any>(1);
  const [isLocalCurrency, setIsLocalCurrency] = useState(true);
  const [amount, setAmount] = useState("");
  const [createType, setCreateType] = useState<"cash" | "bank" | "account">("cash");
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [addAmountCustomerId, setAddAmountCustomerId] = useState("");
  const [addAmountType, setAddAmountType] = useState<"cash" | "bank">("cash");

  const loadAll = async () => {
    // ✅ إرسال رقم الفرع في الهيدر لضمان جلب بيانات الفرع فقط من السيرفر
    const config = { headers: { "x-branch-id": user?.branch_id } };

    const [c1, c2, c3, c4, c5, c6] = await Promise.all([
      api.get("/customers"),
      (api as any).accounts.getAccounts(),
      api.get("/customer-guarantees", config), // تأمينات الفرع فقط
      api.get("/cash-boxes", config),          // صناديق الفرع فقط
      api.get("/banks", config),               // بنوك الفرع فقط
      api.get("/currencies"),
    ]);

    setCustomers(c1.data?.customers || []);
    setAccounts((c2.list || []).filter((a: any) => a.parent_id !== null));
    setList(c3.data?.list || []);
    
    // ✅ تصفية إضافية في الفرونت إند لزيادة الأمان
    const myBranchId = user?.branch_id;
    setCashBoxes((c4.data?.cashBoxes || []).filter((b: any) => !b.branch_id || b.branch_id === myBranchId));
    setBanks((c5.data?.banks || []).filter((b: any) => !b.branch_id || b.branch_id === myBranchId));
    setCurrencies(c6.data?.currencies || []);
  };

  useEffect(() => {
    if (user?.branch_id) loadAll();
  }, [user]);

  // دالة الحفظ مع إرسال بيانات الفرع
  const createGuarantee = async () => {
    if (!selectedCustomerId || !selectedAccountId) return alert("يرجى إكمال البيانات");

    await api.post("/customer-guarantees", {
      customer_id: Number(selectedCustomerId),
      type: createType,
      source_id: selectedAccountId,
      branch_id: user?.branch_id, // ✅ ربط العملية بالفرع
      currency_id: currencyId || null,
      rate: isLocalCurrency ? 1 : Number(rate),
      amount: amount ? Number(amount) : null,
    });

    setShowCreateModal(false);
    loadAll();
  };

  const eligibleForAdd = list.filter((x) => x.type === "cash" || x.type === "bank");

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border-r-4 border-indigo-600">
        <div>
          <h2 className="text-xl font-bold text-gray-800">محفظة التأمينات</h2>
          <p className="text-sm text-gray-500 font-bold">فرع: {user?.branch_name || "عتق"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition">➕ فتح حساب تأمين</button>
          <button onClick={() => setShowAddAmountModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition">💰 إضافة مبلغ</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
        <table className="w-full text-center">
          <thead className="bg-gray-50 text-gray-600 border-b">
            <tr>
              <th className="p-3">العميل</th>
              <th className="p-3">نوع الحساب</th>
              <th className="p-3">الصندوق / البنك</th>
              <th className="p-3">الرصيد الحالي</th>
              <th className="p-3">الموظف</th>
              <th className="p-3">الفرع</th>
            </tr>
          </thead>
          <tbody>
            {list.map((g) => (
              <tr key={g.id} className="border-b hover:bg-gray-50 transition">
                <td className="p-3 font-bold text-indigo-700">{g.customer_name}</td>
                <td className="p-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{g.type === "cash" ? "نقدي" : g.type === "bank" ? "بنكي" : "حساب"}</span></td>
                <td className="p-3 text-gray-600">{g.account_name || "-"}</td>
                <td className="p-3 font-bold text-emerald-600">{g.balance.toLocaleString()}</td>
                <td className="p-3 text-xs text-gray-400">{g.created_by_name}</td>
                <td className="p-3 font-bold text-orange-600">{g.branch_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* المودال المحدث (إضافة تأمين) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-center border-b pb-2">إضافة حساب تأمين للفرع</h3>
            
            <select className="border p-3 w-full rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
              <option value="">اختر العميل</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex gap-4 p-2 bg-gray-50 rounded-xl justify-around">
              {["cash", "bank", "account"].map((t) => (
                <label key={t} className="cursor-pointer flex items-center gap-2 font-bold text-sm">
                  <input type="radio" checked={createType === t} onChange={() => { setCreateType(t as any); setSelectedAccountId(""); }} />
                  {t === "cash" ? "نقدي" : t === "bank" ? "بنكي" : "حساب"}
                </label>
              ))}
            </div>

            {/* عرض الصناديق/البنوك الخاصة بالفرع فقط */}
            <select className="border p-3 w-full rounded-xl bg-indigo-50 font-bold" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
              <option value="">اختر {createType === "cash" ? "الصندوق" : createType === "bank" ? "البنك" : "الحساب"}</option>
              {createType === "cash" ? cashBoxes.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>) :
               createType === "bank" ? banks.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>) :
               accounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
            </select>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowCreateModal(false)} className="px-6 py-2 text-gray-500 font-bold">إلغاء</button>
              <button onClick={createGuarantee} className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-700">حفظ التأمين</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsWallet;
