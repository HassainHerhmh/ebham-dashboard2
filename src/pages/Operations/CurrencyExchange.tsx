import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

type Currency = {
  id: number;
  name_ar: string;
  code: string;
  exchange_rate: number;
  min_rate?: number | null;
  max_rate?: number | null;
  convert_mode?: "multiply" | "divide";
};

type Account = {
  id: number;
  name_ar: string;
};

type Row = {
  id: number;
  date: string;
  type: "buy" | "sell";
  from_text: string;
  to_text: string;
  rate: number;
  notes: string;
};

const today = new Date().toLocaleDateString("en-CA");

const CurrencyExchange: React.FC = () => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"buy" | "sell" | "">("");

  const [date, setDate] = useState(today);

  const [fromCurrency, setFromCurrency] = useState<number | "">("");
  const [toCurrency, setToCurrency] = useState<number | "">("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(0);

  const [fromAccount, setFromAccount] = useState<number | "">("");
  const [toAccount, setToAccount] = useState<number | "">("");
  const [fromType, setFromType] = useState<"cash" | "account" | "">("");
const [toType, setToType] = useState<"cash" | "account" | "">("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const [cRes, aRes] = await Promise.all([
        api.get("/currencies"),
        api.get("/accounts"),
      ]);
      setCurrencies(cRes.data?.currencies || []);
      setAccounts(aRes.data?.list || []);
    })();
  }, []);

  const fromCur = useMemo(
    () => currencies.find((c) => c.id === Number(fromCurrency)),
    [fromCurrency, currencies]
  );
  const toCur = useMemo(
    () => currencies.find((c) => c.id === Number(toCurrency)),
    [toCurrency, currencies]
  );

  useEffect(() => {
    if (!fromCur) return;
    setRate(String(fromCur.exchange_rate || ""));
  }, [fromCur]);

  useEffect(() => {
    const a = Number(amount);
    const r = Number(rate);
    if (!a || !r || !fromCur) {
      setResult(0);
      return;
    }
    const v =
      fromCur.convert_mode === "divide" ? a / r : a * r;
    setResult(Number(v.toFixed(2)));
  }, [amount, rate, fromCur]);

  const resetForm = () => {
    setMode("");
    setFromCurrency("");
    setToCurrency("");
    setRate("");
    setAmount("");
    setResult(0);
    setFromAccount("");
    setToAccount("");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setDate(today);
  };

  const submit = () => {
    if (!mode || !fromCur || !toCur || !amount || !rate) {
      alert("يرجى إدخال جميع البيانات الأساسية");
      return;
    }

    const id = Date.now();
    const fromText =
      mode === "buy"
        ? `${fromCur.name_ar} (${amount})`
        : `${toCur.name_ar} (${result})`;
    const toText =
      mode === "buy"
        ? `${toCur.name_ar} (${result})`
        : `${fromCur.name_ar} (${amount})`;

    setRows((p) => [
      {
        id,
        date,
        type: mode,
        from_text: fromText,
        to_text: toText,
        rate: Number(rate),
        notes: notes || (mode === "buy" ? "شراء عملة" : "بيع عملة"),
      },
      ...p,
    ]);

    setShowModal(false);
    resetForm();
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">مصارفة عملة</h2>
        <button
          onClick={() => setShowModal(true)}
          className="btn-green"
        >
          + إضافة عملية
        </button>
      </div>

      {/* جدول العمليات */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm text-center border">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="border px-2 py-1">رقم السند</th>
              <th className="border px-2 py-1">التاريخ</th>
              <th className="border px-2 py-1">مدين</th>
              <th className="border px-2 py-1">دائن</th>
              <th className="border px-2 py-1">النوع</th>
              <th className="border px-2 py-1">البيان</th>
              <th className="border px-2 py-1">سعر الصرف</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="border px-2 py-1">{r.id}</td>
                  <td className="border px-2 py-1">{r.date}</td>
                  <td className="border px-2 py-1">{r.from_text}</td>
                  <td className="border px-2 py-1">{r.to_text}</td>
                  <td className="border px-2 py-1">
                    {r.type === "buy" ? "شراء" : "بيع"}
                  </td>
                  <td className="border px-2 py-1">{r.notes}</td>
                  <td className="border px-2 py-1">{r.rate}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-6 text-gray-400 border">
                  لا توجد عمليات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[900px] max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {mode ? (mode === "buy" ? "شراء عملة" : "بيع عملة") : "إضافة عملية"}
              </h3>
              <button onClick={() => setShowModal(false)}>✖</button>
            </div>

            {!mode && (
              <div className="flex gap-4">
                <button
                  onClick={() => setMode("buy")}
                  className="btn-green"
                >
                  شراء عملة
                </button>
                <button
                  onClick={() => setMode("sell")}
                  className="btn-green"
                >
                  بيع عملة
                </button>
              </div>
            )}

           {mode && (
  <>
   <div className="grid grid-cols-2 gap-4">

  {/* تفاصيل الشراء / البيع */}
  <div className="bg-[#eef3ea] p-4 rounded-lg space-y-3">
    <h4 className="font-bold text-green-700 text-center">
      {mode === "buy" ? "تفاصيل الشراء" : "تفاصيل البيع"}
    </h4>

    {/* نوع العملية – صف مستقل */}
    <div className="grid grid-cols-1">
      <select className="input">
        <option value="">نوع العملية</option>
        <option value="cash">صندوق</option>
        <option value="account">حساب</option>
      </select>
    </div>

    {/* العملة + الصندوق/الحساب */}
    <div className="grid grid-cols-2 gap-2">
      <select
        className="input"
        value={fromCurrency}
        onChange={(e) => onSelectFromCurrency(e.target.value)}
      >
        <option value="">العملة</option>
        {currencies.map(c => (
          <option key={c.id} value={c.id}>{c.name_ar}</option>
        ))}
      </select>

      <select
        className="input"
        value={fromAccount}
        onChange={(e) => setFromAccount(e.target.value)}
      >
        <option value="">الصندوق / الحساب</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name_ar}</option>
        ))}
      </select>
    </div>

    {/* المبلغ – سعر الصرف – المقابل */}
    <div className="grid grid-cols-3 gap-2">
      <input
        className="input"
        placeholder="المبلغ"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        className="input"
        placeholder="سعر الصرف"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />
      <input
        className="input bg-gray-50"
        value={result || ""}
        placeholder="المقابل"
        readOnly
      />
    </div>
  </div>

  {/* تفاصيل القيمة */}
  <div className="bg-[#eef3ea] p-4 rounded-lg space-y-3">
    <h4 className="font-bold text-green-700 text-center">تفاصيل القيمة</h4>

    {/* نوع القيمة – صف مستقل */}
    <div className="grid grid-cols-1">
      <select className="input">
        <option value="">نوع القيمة</option>
        <option value="cash">نقدي</option>
        <option value="account">حساب</option>
      </select>
    </div>

    {/* عملة القيمة + الصندوق/الحساب */}
    <div className="grid grid-cols-2 gap-2">
      <select
        className="input"
        value={toCurrency}
        onChange={(e) => setToCurrency(e.target.value)}
      >
        <option value="">عملة القيمة</option>
        {currencies.map(c => (
          <option key={c.id} value={c.id}>{c.name_ar}</option>
        ))}
      </select>

      <select
        className="input"
        value={toAccount}
        onChange={(e) => setToAccount(e.target.value)}
      >
        <option value="">الصندوق / الحساب</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name_ar}</option>
        ))}
      </select>
    </div>

    {/* المبلغ – سعر الصرف – المقابل */}
    <div className="grid grid-cols-3 gap-2">
      <input
        className="input"
        value={result || ""}
        placeholder="المبلغ"
        readOnly
      />
      <input
        className="input"
        value={rate || ""}
        placeholder="سعر الصرف"
        readOnly
      />
      <input
        className="input"
        value={amount || ""}
        placeholder="المقابل"
        readOnly
      />
    </div>
  </div>

</div>


    {/* بيانات العميل والملاحظات */}
    <div className="grid grid-cols-2 gap-3 mt-4">
      <input className="input" placeholder="اسم العميل" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      <input className="input" placeholder="رقم الهاتف" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
      <input className="input col-span-2" placeholder="البيان" value={notes} onChange={(e) => setNotes(e.target.value)} />
    </div>

    <div className="flex justify-end gap-2 mt-4">
      <button
        onClick={() => { setShowModal(false); resetForm(); }}
        className="px-4 py-2 bg-gray-200 rounded"
      >
        إلغاء
      </button>
      <button onClick={submit} className="btn-green">
        إضافة
      </button>
    </div>
  </>
)}

          </div>
        </div>
      )}

      <style>{`
        .input { padding:10px; border-radius:8px; border:1px solid #ccc; }
        .btn-green { background:#14532d; color:#fff; padding:10px 20px; border-radius:8px; }
      `}</style>
    </div>
  );
};

export default CurrencyExchange;
