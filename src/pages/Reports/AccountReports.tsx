import React, { useEffect, useState } from "react";
import api from "../../services/api";

type Account = { id: number; name_ar: string; };
type Currency = { id: number; name_ar: string; code: string; };

type Row = {
  id: number;
  journal_date: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  notes: string;
  currency_name: string;
  user_name: string;
  branch_name: string;
  balance: number;
};

const today = new Date().toLocaleDateString("en-CA");

const AccountStatement: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [opening, setOpening] = useState(0);

  const [accountId, setAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [side, setSide] = useState<"all" | "debit" | "credit">("all");

  useEffect(() => {
    loadLookups();
  }, []);

  const loadLookups = async () => {
    const [a, c] = await Promise.all([
      api.get("/accounts/sub-for-ceiling"),
      api.get("/currencies"),
    ]);

    setAccounts(a.data?.list || a.data || []);
    setCurrencies(
      c.data?.currencies || c.data?.list || c.data || []
    );
  };

  const run = async () => {
    const res = await api.post("/reports/account-statement", {
      account_id: accountId ? Number(accountId) : null,
      currency_id: currencyId ? Number(currencyId) : null,
      from_date: fromDate,
      to_date: toDate,
      side,
    });

    if (res.data?.success) {
      setOpening(res.data.opening_balance || 0);
      setRows(res.data.list || []);
    }
  };

  const reset = () => {
    setAccountId("");
    setCurrencyId("");
    setFromDate(today);
    setToDate(today);
    setSide("all");
    setRows([]);
    setOpening(0);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">كشف الحساب</h2>

      <div className="bg-[#e9efe6] p-4 rounded-lg grid grid-cols-6 gap-3">
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">كل الحسابات</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
        </select>

        <select className="input" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
          <option value="">كل العملات</option>
          {currencies.map(c => <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>)}
        </select>

        <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <select className="input" value={side} onChange={(e) => setSide(e.target.value as any)}>
          <option value="all">مدين + دائن</option>
          <option value="debit">مدين فقط</option>
          <option value="credit">دائن فقط</option>
        </select>

        <div className="flex gap-2">
          <button onClick={run} className="btn-green">عرض</button>
          <button onClick={reset} className="btn-gray">إعادة</button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <div className="p-3 font-semibold">الرصيد الافتتاحي: {opening}</div>
        <table className="w-full text-sm text-center border">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="border px-2 py-1">التاريخ</th>
              <th className="border px-2 py-1">الحساب</th>
              <th className="border px-2 py-1">مدين</th>
              <th className="border px-2 py-1">دائن</th>
              <th className="border px-2 py-1">الرصيد</th>
              <th className="border px-2 py-1">البيان</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map(r => (
              <tr key={r.id}>
                <td className="border px-2 py-1">{r.journal_date}</td>
                <td className="border px-2 py-1">{r.account_name}</td>
                <td className="border px-2 py-1">{r.debit || ""}</td>
                <td className="border px-2 py-1">{r.credit || ""}</td>
                <td className="border px-2 py-1">{r.balance}</td>
                <td className="border px-2 py-1">{r.notes}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="py-6 text-gray-400 border">لا توجد بيانات</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .input { padding:10px; border-radius:8px; border:1px solid #ccc; }
        .btn-green { background:#14532d; color:#fff; padding:8px 16px; border-radius:8px; }
        .btn-gray { background:#e5e7eb; padding:8px 16px; border-radius:8px; }
      `}</style>
    </div>
  );
};

export default AccountStatement;
