import React, { useEffect, useState } from "react";
import api from "../../services/api";

/* =========================
   Journal Entry
========================= */

type Account = {
  id: number;
  code: string;
  name_ar: string;
};

type Currency = {
  id: number;
  name_ar: string;
  code: string;
};

type EntryRow = {
  id: number;
  journal_date: string;
  amount: number;
  currency_name: string;
  from_account: string;
  to_account: string;
  notes: string;
  user_name: string;
  branch_name: string;
};

const today = new Date().toLocaleDateString("en-CA");

const JournalEntry: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [list, setList] = useState<EntryRow[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [notes, setNotes] = useState("");

  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);

  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");

  useEffect(() => {
    fetchAccounts();
    fetchCurrencies();
    loadEntries();
  }, []);

  const fetchAccounts = async () => {
    const res = await api.get("/accounts/sub-for-ceiling");
    setAccounts(res.data?.list || []);
  };

  const fetchCurrencies = async () => {
    const res = await api.get("/currencies");
    setCurrencies(res.data?.list || res.data?.currencies || []);
  };

  const loadEntries = async () => {
    const res = await api.get("/journal-entries");
    if (res.data.success) setList(res.data.list);
  };

  const saveEntry = async () => {
    if (!fromAccount || !toAccount || !amount || !currencyId) {
      alert("أكمل البيانات");
      return;
    }

    const base = {
      journal_type_id: 1,
      reference_type: "manual",
      reference_id: null,
      journal_date: date,
      currency_id: Number(currencyId),
      notes: notes || "قيد يومي",
      cost_center_id: null,
    };

    await api.post("/journal-entries", {
      ...base,
      account_id: fromAccount.id,
      debit: Number(amount),
      credit: 0,
    });

    await api.post("/journal-entries", {
      ...base,
      account_id: toAccount.id,
      debit: 0,
      credit: Number(amount),
    });

    setShowModal(false);
    setAmount("");
    setCurrencyId("");
    setNotes("");
    setFromAccount(null);
    setToAccount(null);
    setFromQuery("");
    setToQuery("");

    loadEntries();
  };

  const renderAccountPicker = (
    query: string,
    setQuery: any,
    setAcc: any
  ) => {
    const filtered = accounts.filter(a =>
      a.name_ar.toLowerCase().includes(query.toLowerCase())
    );

    return (
      <div className="relative w-full">
        <input
          className="input w-full"
          placeholder="اكتب اسم الحساب..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <div className="absolute z-10 bg-white border w-full max-h-40 overflow-y-auto rounded shadow">
            {filtered.slice(0, 50).map(a => (
              <div
                key={a.id}
                onClick={() => {
                  setAcc(a);
                  setQuery(a.name_ar);
                }}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-right"
              >
                {a.name_ar}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-green">
          ➕ إضافة
        </button>
      </div>

      {/* ===== Table ===== */}
      <table className="w-full text-sm text-center border">
        <thead className="bg-[#2f4b75] text-white">
          <tr>
            <th>التاريخ</th>
            <th>المبلغ</th>
            <th>العملة</th>
            <th>من حساب</th>
            <th>إلى حساب</th>
            <th>ملاحظات</th>
            <th>المستخدم</th>
            <th>الفرع</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr>
              <td colSpan={8} className="py-6 text-gray-400">
                لا توجد بيانات
              </td>
            </tr>
          )}
          {list.map(r => (
            <tr key={r.id}>
              <td>{r.journal_date}</td>
              <td>{r.amount}</td>
              <td>{r.currency_name}</td>
              <td>{r.from_account}</td>
              <td>{r.to_account}</td>
              <td>{r.notes}</td>
              <td>{r.user_name}</td>
              <td>{r.branch_name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[600px] space-y-4">
            <h2 className="text-lg font-bold text-center">إضافة قيد يومي</h2>

            <div className="grid grid-cols-3 gap-3">
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              <select className="input" value={currencyId} onChange={e => setCurrencyId(e.target.value)}>
                <option value="">العملة</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
              <input className="input" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {renderAccountPicker(fromQuery, setFromQuery, setFromAccount)}
              {renderAccountPicker(toQuery, setToQuery, setToAccount)}
            </div>

            <textarea className="notes-box" placeholder="ملاحظات" value={notes} onChange={e => setNotes(e.target.value)} />

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-gray">إلغاء</button>
              <button onClick={saveEntry} className="btn-green">حفظ</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input{padding:10px;border-radius:8px;border:1px solid #ccc}
        .btn-green{background:#2f4b75;color:#fff;padding:10px 20px;border-radius:10px}
        .btn-gray{background:#e5e7eb;padding:10px 20px;border-radius:10px}
        .notes-box{width:100%;height:90px;padding:10px;border-radius:10px;border:1px solid #ccc}
      `}</style>
    </div>
  );
};

export default JournalEntry;
