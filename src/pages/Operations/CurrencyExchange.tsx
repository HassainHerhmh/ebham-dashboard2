import React, { useEffect, useState } from "react";
import api from "../../services/api";

type Currency = {
  id: number;
  name_ar: string;
  code: string;
  rate_buy: number;  // أقل سعر
  rate_sell: number; // أعلى سعر
};

type Account = {
  id: number;
  name_ar: string;
};

const today = new Date().toLocaleDateString("en-CA");

const CurrencyExchange: React.FC = () => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [fromCurrency, setFromCurrency] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [priceType, setPriceType] = useState<"buy" | "sell">("sell");

  const [fromAmount, setFromAmount] = useState("");
  const [resultAmount, setResultAmount] = useState("0.00");

  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");

  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("مصارفة عملة");

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    calculate();
  }, [fromAmount, fromCurrency, toCurrency, priceType]);

  const loadLookups = async () => {
    const [c, a] = await Promise.all([
      api.get("/currencies"),
      api.get("/accounts/sub-for-ceiling"),
    ]);

    setCurrencies(c.data?.currencies || c.data?.list || c.data || []);
    setAccounts(a.data?.list || a.data || []);
  };

  const calculate = () => {
    const amt = Number(fromAmount);
    if (!amt || !fromCurrency || !toCurrency) {
      setResultAmount("0.00");
      return;
    }

    const cur = currencies.find(c => c.id === Number(fromCurrency));
    if (!cur) return;

    const rate =
      priceType === "buy"
        ? Number(cur.rate_buy)
        : Number(cur.rate_sell);

    const res = amt * rate;
    setResultAmount(res.toFixed(2));
  };

  const save = async () => {
    if (!fromCurrency || !toCurrency || !fromAccount || !toAccount || !fromAmount) {
      alert("يرجى إدخال جميع البيانات");
      return;
    }

    const refId = Date.now();
    const base = {
      journal_type_id: 3,
      reference_type: "exchange",
      reference_id: refId,
      journal_date: date,
      notes,
      cost_center_id: null,
    };

    // خروج العملة الأولى
    await api.post("/journal-entries", {
      ...base,
      currency_id: Number(fromCurrency),
      account_id: Number(fromAccount),
      debit: 0,
      credit: Number(fromAmount),
    });

    // دخول العملة الثانية
    await api.post("/journal-entries", {
      ...base,
      currency_id: Number(toCurrency),
      account_id: Number(toAccount),
      debit: Number(resultAmount),
      credit: 0,
    });

    alert("تم تنفيذ المصارفة بنجاح");
    setFromAmount("");
    setResultAmount("0.00");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">مصارفة عملة</h2>

      <div className="bg-[#e9efe6] p-4 rounded-lg grid grid-cols-3 gap-3">
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />

        <select className="input" value={fromCurrency} onChange={e => setFromCurrency(e.target.value)}>
          <option value="">من عملة</option>
          {currencies.map(c => (
            <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>
          ))}
        </select>

        <select className="input" value={toCurrency} onChange={e => setToCurrency(e.target.value)}>
          <option value="">إلى عملة</option>
          {currencies.map(c => (
            <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>
          ))}
        </select>

        <select className="input" value={priceType} onChange={e => setPriceType(e.target.value as any)}>
          <option value="sell">سعر بيع (أعلى)</option>
          <option value="buy">سعر شراء (أقل)</option>
        </select>

        <input
          className="input"
          placeholder="المبلغ المُسلَّم"
          value={fromAmount}
          onChange={e => setFromAmount(e.target.value)}
        />

        <input
          className="input bg-gray-100"
          disabled
          placeholder="المبلغ المستلم"
          value={resultAmount}
        />

        <select className="input" value={fromAccount} onChange={e => setFromAccount(e.target.value)}>
          <option value="">من حساب</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name_ar}</option>
          ))}
        </select>

        <select className="input" value={toAccount} onChange={e => setToAccount(e.target.value)}>
          <option value="">إلى حساب</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name_ar}</option>
          ))}
        </select>

        <textarea className="input col-span-3" placeholder="ملاحظات" value={notes} onChange={e => setNotes(e.target.value)} />

        <div className="col-span-3 flex justify-end">
          <button onClick={save} className="btn-green">تنفيذ المصارفة</button>
        </div>
      </div>

      <style>{`
        .input { padding:10px; border-radius:8px; border:1px solid #ccc; }
        .btn-green { background:#14532d; color:#fff; padding:10px 20px; border-radius:8px; }
      `}</style>
    </div>
  );
};

export default CurrencyExchange;
