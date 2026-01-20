import React, { useEffect, useState } from "react";
import api from "../../services/api";

type Currency = {
  id: number;
  name_ar: string;
  code: string;
  exchange_rate: number;
  convert_mode?: "multiply" | "divide";
};

type Account = {
  id: number;
  name_ar: string;
};

type CashBox = {
  id: number;
  name_ar: string;
};

type Row = {
  id: number;
  date: string;
  debit: string;
  credit: string;
  type: "شراء" | "بيع";
  notes: string;
  rate: number;
};

const today = new Date().toLocaleDateString("en-CA");

const CurrencyExchange: React.FC = () => {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [mode, setMode] = useState<"cash" | "account">("cash");

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);

  const [currencyId, setCurrencyId] = useState("");
  const [targetCurrencyId, setTargetCurrencyId] = useState("");

  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [result, setResult] = useState(0);

  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");

  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");

  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cRes, aRes, bRes] = await Promise.all([
      api.get("/currencies"),
      api.get("/accounts"),
      api.get("/cash-boxes"),
    ]);

    setCurrencies(cRes.data?.currencies || []);
    setAccounts(aRes.data?.list || []);
    setCashBoxes(bRes.data?.list || []);
  };

  useEffect(() => {
    const a = Number(amount);
    const r = Number(rate);
    if (!a || !r) {
      setResult(0);
      return;
    }

    if (tab === "buy") {
      setResult(Number((a * r).toFixed(2)));
    } else {
      setResult(Number((a / r).toFixed(2)));
    }
  }, [amount, rate, tab]);

  const onSelectCurrency = (id: string) => {
    setCurrencyId(id);
    const cur = currencies.find((c) => c.id === Number(id));
    if (cur) setRate(String(cur.exchange_rate));
  };

  const submit = () => {
    if (!currencyId || !targetCurrencyId || !amount || !rate || !sourceId || !targetId) {
      alert("يرجى إدخال جميع البيانات");
      return;
    }

    const fromCur = currencies.find((c) => c.id === Number(currencyId));
    const toCur = currencies.find((c) => c.id === Number(targetCurrencyId));

    setRows((prev) => [
      {
        id: Date.now(),
        date,
        debit: `${fromCur?.name_ar} (${amount})`,
        credit: `${toCur?.name_ar} (${result})`,
        type: tab === "buy" ? "شراء" : "بيع",
        notes: notes || "مصارفة عملة",
        rate: Number(rate),
      },
      ...prev,
    ]);

    setAmount("");
    setNotes("");
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2">
        <button onClick={() => setTab("buy")} className={`px-4 py-2 rounded ${tab === "buy" ? "bg-green-600 text-white" : "bg-gray-200"}`}>شراء عملة</button>
        <button onClick={() => setTab("sell")} className={`px-4 py-2 rounded ${tab === "sell" ? "bg-green-600 text-white" : "bg-gray-200"}`}>بيع عملة</button>
      </div>

      <div className="bg-[#e9efe6] p-4 rounded-lg grid grid-cols-3 gap-4">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />

        <select className="input" value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="cash">نقدي</option>
          <option value="account">حساب</option>
        </select>

        <select className="input" value={currencyId} onChange={(e) => onSelectCurrency(e.target.value)}>
          <option value="">-- العملة --</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>

        <select className="input" value={targetCurrencyId} onChange={(e) => setTargetCurrencyId(e.target.value)}>
          <option value="">-- العملة المقابلة --</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>

        <input className="input" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input" placeholder="سعر الصرف" value={rate} onChange={(e) => setRate(e.target.value)} />
        <input className="input bg-gray-100" disabled value={result || ""} placeholder="المقابل" />

        {mode === "cash" ? (
          <>
            <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">-- من صندوق --</option>
              {cashBoxes.map((b) => (<option key={b.id} value={b.id}>{b.name_ar}</option>))}
            </select>
            <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">-- إلى صندوق --</option>
              {cashBoxes.map((b) => (<option key={b.id} value={b.id}>{b.name_ar}</option>))}
            </select>
          </>
        ) : (
          <>
            <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">-- من حساب --</option>
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name_ar}</option>))}
            </select>
            <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">-- إلى حساب --</option>
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name_ar}</option>))}
            </select>
          </>
        )}

        <input className="input col-span-3" placeholder="البيان" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="col-span-3 flex justify-end">
          <button onClick={submit} className="btn-green">تنفيذ العملية</button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm text-center border">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="border p-2">رقم</th>
              <th className="border p-2">التاريخ</th>
              <th className="border p-2">مدين</th>
              <th className="border p-2">دائن</th>
              <th className="border p-2">النوع</th>
              <th className="border p-2">البيان</th>
              <th className="border p-2">سعر الصرف</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map(r => (
              <tr key={r.id}>
                <td className="border p-2">{r.id}</td>
                <td className="border p-2">{r.date}</td>
                <td className="border p-2">{r.debit}</td>
                <td className="border p-2">{r.credit}</td>
                <td className="border p-2">{r.type}</td>
                <td className="border p-2">{r.notes}</td>
                <td className="border p-2">{r.rate}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="p-6 text-gray-400 border">لا توجد عمليات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .input { padding:10px; border-radius:8px; border:1px solid #ccc; }
        .btn-green { background:#14532d; color:#fff; padding:10px 20px; border-radius:8px; }
      `}</style>
    </div>
  );
};

export default CurrencyExchange;
