import React, { useEffect, useState } from "react";
import api from "../../services/api";

type Currency = {
  id: number;
  name_ar: string;
  code: string;
  buy_rate?: number;
  sell_rate?: number;
};

type Account = {
  id: number;
  name_ar: string;
};

type ExchangeRow = {
  ref: number;
  date: string;
  fromCur: string;
  toCur: string;
  amount: number;
  result: number;
  rate: number;
  notes: string;
};

const today = new Date().toLocaleDateString("en-CA");

const CurrencyExchange: React.FC = () => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [fromCurrency, setFromCurrency] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [rate, setRate] = useState("");

  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(0);

  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");

  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today);

  const [rows, setRows] = useState<ExchangeRow[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cRes, aRes] = await Promise.all([
      api.get("/currencies"),
      api.get("/accounts"),
    ]);

    const clist = cRes.data?.currencies || cRes.data?.list || [];
    const alist = aRes.data?.list || [];

    setCurrencies(clist);
    setAccounts(alist);
  };

  useEffect(() => {
    const a = Number(amount);
    const r = Number(rate);
    if (!a || !r) setResult(0);
    else setResult(Number((a * r).toFixed(2)));
  }, [amount, rate]);

  const onSelectFromCurrency = (id: string) => {
    setFromCurrency(id);
    const cur = currencies.find(c => c.id === Number(id));
    if (cur?.sell_rate) {
      setRate(String(cur.sell_rate));
    }
  };

  const submit = async () => {
    if (!fromCurrency || !toCurrency || !amount || !rate || !fromAccount || !toAccount) {
      alert("يرجى إدخال جميع البيانات");
      return;
    }

    const ref = Date.now();

    const fromCur = currencies.find(c => c.id === Number(fromCurrency));
    const toCur = currencies.find(c => c.id === Number(toCurrency));

    setRows(prev => [
      {
        ref,
        date,
        fromCur: `${fromCur?.name_ar} (${amount})`,
        toCur: `${toCur?.name_ar} (${result})`,
        amount: Number(amount),
        result,
        rate: Number(rate),
        notes: notes || "مصارفة عملة",
      },
      ...prev,
    ]);

    setAmount("");
    setNotes("");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">مصارفة عملة</h2>

      <div className="bg-[#e9efe6] p-4 rounded-lg grid grid-cols-3 gap-4">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />

        <select className="input" value={fromCurrency} onChange={(e) => onSelectFromCurrency(e.target.value)}>
          <option value="">-- العملة المصدر --</option>
          {currencies.map(c => (
            <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>
          ))}
        </select>

        <select className="input" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
          <option value="">-- العملة المقابلة --</option>
          {currencies.map(c => (
            <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>
          ))}
        </select>

        <input className="input" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input" placeholder="سعر الصرف" value={rate} onChange={(e) => setRate(e.target.value)} />
        <input className="input bg-gray-100" disabled value={result ? result.toLocaleString() : ""} placeholder="الناتج" />

        <select className="input" value={fromAccount} onChange={(e) => setFromAccount(e.target.value)}>
          <option value="">-- من حساب --</option>
          {accounts.map(a => (<option key={a.id} value={a.id}>{a.name_ar}</option>))}
        </select>

        <select className="input" value={toAccount} onChange={(e) => setToAccount(e.target.value)}>
          <option value="">-- إلى حساب --</option>
          {accounts.map(a => (<option key={a.id} value={a.id}>{a.name_ar}</option>))}
        </select>

        <input className="input col-span-3" placeholder="البيان" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="col-span-3 flex justify-end">
          <button onClick={submit} className="btn-green">تنفيذ المصارفة</button>
        </div>
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
              <th className="border px-2 py-1">نوع السند</th>
              <th className="border px-2 py-1">البيان</th>
              <th className="border px-2 py-1">سعر الصرف</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map(r => (
              <tr key={r.ref}>
                <td className="border px-2 py-1">{r.ref}</td>
                <td className="border px-2 py-1">{r.date}</td>
                <td className="border px-2 py-1">{r.fromCur}</td>
                <td className="border px-2 py-1">{r.toCur}</td>
                <td className="border px-2 py-1">مصارفة</td>
                <td className="border px-2 py-1">{r.notes}</td>
                <td className="border px-2 py-1">{r.rate}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="py-6 text-gray-400 border">لا توجد عمليات</td>
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
