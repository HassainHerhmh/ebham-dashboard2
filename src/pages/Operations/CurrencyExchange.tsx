import React, { useEffect, useState } from "react";
import api from "../../services/api";

type Currency = {
  id: number;
  name_ar: string;
  code: string;
  buy_rate?: number;   // أقل سعر
  sell_rate?: number;  // أعلى سعر
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
  const [rate, setRate] = useState("");

  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(0);

  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");

  const [date, setDate] = useState(today);

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

    alert("تم الحساب فقط حالياً، الربط مع السيرفر نضيفه بالخطوة القادمة");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">مصارفة عملة</h2>

      <div className="bg-[#e9efe6] p-4 rounded-lg grid grid-cols-3 gap-4">
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <select
          className="input"
          value={fromCurrency}
          onChange={(e) => onSelectFromCurrency(e.target.value)}
        >
          <option value="">-- العملة المصدر --</option>
          {currencies.map(c => (
            <option key={c.id} value={c.id}>
              {c.name_ar} ({c.code})
            </option>
          ))}
        </select>

        <select
          className="input"
          value={toCurrency}
          onChange={(e) => setToCurrency(e.target.value)}
        >
          <option value="">-- العملة المقابلة --</option>
          {currencies.map(c => (
            <option key={c.id} value={c.id}>
              {c.name_ar} ({c.code})
            </option>
          ))}
        </select>

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
          value={result ? result.toLocaleString() : ""}
          placeholder="الناتج"
        />

        <select
          className="input"
          value={fromAccount}
          onChange={(e) => setFromAccount(e.target.value)}
        >
          <option value="">-- من حساب --</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name_ar}</option>
          ))}
        </select>

        <select
          className="input"
          value={toAccount}
          onChange={(e) => setToAccount(e.target.value)}
        >
          <option value="">-- إلى حساب --</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name_ar}</option>
          ))}
        </select>

        <div className="col-span-3 flex justify-end">
          <button onClick={submit} className="btn-green">
            تنفيذ المصارفة
          </button>
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
