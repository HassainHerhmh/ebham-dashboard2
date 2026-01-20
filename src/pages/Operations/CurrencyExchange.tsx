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

  const [fromType, setFromType] = useState<"cash" | "account">("cash");
  const [toType, setToType] = useState<"cash" | "account">("cash");
  const [reference, setReference] = useState<number>(() => Date.now());

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

  // تعبئة سعر الصرف تلقائيًا من العملة المختارة
  useEffect(() => {
    if (!fromCur) return;
    setRate(String(fromCur.exchange_rate || ""));
  }, [fromCur]);

  // حساب الناتج حسب convert_mode
  useEffect(() => {
    const a = Number(amount);
    const r = Number(rate);
    if (!a || !r || !fromCur) {
      setResult(0);
      return;
    }
    const v = fromCur.convert_mode === "divide" ? a / r : a * r;
    setResult(Number(v.toFixed(2)));
  }, [amount, rate, fromCur]);

const resetForm = () => {
  setReference(Date.now());
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
  setFromType("cash");
  setToType("cash");
};


  const submit = () => {
    if (!mode || !fromCur || !toCur || !amount || !rate) {
      alert("يرجى إدخال جميع البيانات الأساسية");
      return;
    }
    if (!fromAccount || !toAccount) {
      alert("يرجى اختيار الصندوق/الحساب للطرفين");
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
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          إضافة
        </button>
      </div>

      {/* جدول العمليات */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm text-center border">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="border px-2 py-1">رقم</th>
              <th className="border px-2 py-1">التاريخ</th>
              <th className="border px-2 py-1">مدين</th>
              <th className="border px-2 py-1">دائن</th>
              <th className="border px-2 py-1">النوع</th>
              <th className="border px-2 py-1">سعر الصرف</th>
              <th className="border px-2 py-1">البيان</th>
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
                  <td className="border px-2 py-1">{r.rate}</td>
                  <td className="border px-2 py-1">{r.notes}</td>
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


            {/* اختيار نوع العملية */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("buy")}
                className={`p-2 rounded border ${mode === "buy" ? "bg-green-600 text-white" : ""}`}
              >
                شراء
              </button>
              <button
                onClick={() => setMode("sell")}
                className={`p-2 rounded border ${mode === "sell" ? "bg-green-600 text-white" : ""}`}
              >
                بيع
              </button>
            </div>

      {/* الهيدر الموحد: رقم السند + العنوان + التاريخ */}
<div className="flex items-center justify-between bg-white p-3 rounded-lg border mb-3">
  <div className="text-sm text-gray-600">
    رقم السند: <span className="font-bold">{reference}</span>
  </div>

  <h3 className="font-bold text-lg text-green-700">
    {mode === "buy" ? "شراء عملة" : mode === "sell" ? "بيع عملة" : "عملية جديدة"}
  </h3>

  <input
    type="date"
    className="border rounded p-2"
    value={date}
    onChange={(e) => setDate(e.target.value)}
  />
</div>

{/* تفاصيل الشراء/البيع */}
<div className="bg-[#eef3ea] p-4 rounded-lg space-y-3">
  <h4 className="font-bold text-green-700 text-center">
    {mode === "buy" ? "تفاصيل الشراء" : "تفاصيل البيع"}
  </h4>

              <select
                className="input"
                value={fromType}
                onChange={(e) => {
                  setFromType(e.target.value as any);
                  setFromAccount("");
                }}
              >
                <option value="cash">صندوق</option>
                <option value="account">حساب</option>
              </select>

              <div className="grid grid-cols-2 gap-2">
                <select
                  className="input"
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(Number(e.target.value))}
                >
                  <option value="">العملة</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>

                <select
                  className="input"
                  value={fromAccount}
                  onChange={(e) => setFromAccount(Number(e.target.value))}
                >
                  <option value="">
                    {fromType === "cash" ? "اختر الصندوق" : "اختر الحساب"}
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name_ar}
                    </option>
                  ))}
                </select>
              </div>

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
                  className="input bg-gray-100"
                  disabled
                  value={result || ""}
                  placeholder="المقابل"
                />
              </div>
            </div>

          {/* تفاصيل القيمة */}
<div className="bg-[#eef3ea] p-4 rounded-lg space-y-3">
  <h4 className="font-bold text-green-700 text-center">تفاصيل القيمة</h4>

  <select
    className="input"
    value={toType}
    onChange={(e) => {
      setToType(e.target.value as any);
      setToAccount("");
    }}
  >
    <option value="cash">صندوق</option>
    <option value="account">حساب</option>
  </select>

  <div className="grid grid-cols-2 gap-2">
    <select
      className="input"
      value={toCurrency}
      onChange={(e) => setToCurrency(Number(e.target.value))}
    >
      <option value="">عملة القيمة</option>
      {currencies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name_ar}
        </option>
      ))}
    </select>

    <select
      className="input"
      value={toAccount}
      onChange={(e) => setToAccount(Number(e.target.value))}
    >
      <option value="">
        {toType === "cash" ? "اختر الصندوق" : "اختر الحساب"}
      </option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name_ar}
        </option>
      ))}
    </select>
  </div>

  <div className="grid grid-cols-3 gap-2">
    <input
      className="input bg-gray-100"
      disabled
      value={result || ""}
      placeholder="المبلغ"
    />
    <input
      className="input bg-gray-100"
      disabled
      value={rate || ""}
      placeholder="سعر الصرف"
    />
    <input
      className="input bg-gray-100"
      disabled
      value={amount || ""}
      placeholder="المقابل"
    />
  </div>
</div>

            {/* بيانات إضافية */}
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="اسم العميل"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                className="input"
                placeholder="رقم الهاتف"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <input
              className="input w-full"
              placeholder="ملاحظات"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                إلغاء
              </button>
              <button
                onClick={submit}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input { padding:10px; border-radius:8px; border:1px solid #ccc; }
      `}</style>
    </div>
  );
};

export default CurrencyExchange;
