import React, { useEffect, useMemo, useState } from "react";
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

const today = new Date().toLocaleDateString("en-CA");

const JournalEntry: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [notes, setNotes] = useState("");

  const [fromAccount, setFromAccount] = useState("");
  const [fromAccountName, setFromAccountName] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [toAccountName, setToAccountName] = useState("");

  const [showFromList, setShowFromList] = useState(false);
  const [showToList, setShowToList] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchCurrencies();
  }, []);

  const fetchAccounts = async () => {
    // حسابات فرعية فقط (نفس منطق التسقيف)
    const res = await api.get("/accounts/sub-for-ceiling");
    const data =
      res.data?.list ||
      res.data?.accounts ||
      res.data?.data ||
      res.data ||
      [];
    setAccounts(Array.isArray(data) ? data : []);
  };

  const fetchCurrencies = async () => {
    const res = await api.get("/currencies");
    const data =
      res.data?.currencies ||
      res.data?.list ||
      res.data?.data ||
      res.data ||
      [];
    setCurrencies(Array.isArray(data) ? data : []);
  };

  const getAccountCode = (id: string) => {
    return accounts.find((a) => a.id === Number(id))?.code || "";
  };

  const filteredFrom = useMemo(() => {
    const q = fromAccountName.toLowerCase();
    return accounts.filter((a) =>
      a.name_ar.toLowerCase().includes(q)
    );
  }, [fromAccountName, accounts]);

  const filteredTo = useMemo(() => {
    const q = toAccountName.toLowerCase();
    return accounts.filter((a) =>
      a.name_ar.toLowerCase().includes(q)
    );
  }, [toAccountName, accounts]);

  const resetForm = () => {
    setDate(today);
    setAmount("");
    setCurrencyId("");
    setNotes("");
    setFromAccount("");
    setFromAccountName("");
    setToAccount("");
    setToAccountName("");
    setShowFromList(false);
    setShowToList(false);
  };

  const saveEntry = async () => {
    if (!fromAccount || !toAccount || !amount || !currencyId) {
      alert("يرجى إدخال جميع البيانات الأساسية");
      return;
    }

    try {
      const baseData = {
        journal_type_id: 1,
        reference_type: "manual",
        reference_id: null,
        journal_date: date,
        currency_id: Number(currencyId),
        notes: notes || "قيد يومي",
        cost_center_id: null,
      };

      await api.post("/journal-entries", {
        ...baseData,
        account_id: Number(fromAccount),
        debit: Number(amount),
        credit: 0,
      });

      await api.post("/journal-entries", {
        ...baseData,
        account_id: Number(toAccount),
        debit: 0,
        credit: Number(amount),
      });

      alert("تم حفظ القيد بنجاح");
      resetForm();
    } catch (err: any) {
      alert(err.response?.data?.message || "خطأ في حفظ القيد");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-bold text-center">إضافة قيد يومي</h2>

      <div className="grid grid-cols-3 gap-4">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="input" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
          <option value="">-- العملة --</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_ar} ({c.code})
            </option>
          ))}
        </select>
        <input type="number" placeholder="المبلغ" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* مدين */}
        <div className="relative flex flex-col items-center gap-2">
          <input
            className="input w-full text-center text-lg"
            placeholder="🔍 الحساب المدين"
            value={fromAccountName}
            onFocus={() => setShowFromList(true)}
            onChange={(e) => {
              setFromAccountName(e.target.value);
              setFromAccount("");
              setShowFromList(true);
            }}
          />
          {showFromList && (
            <div className="absolute top-full z-50 w-full bg-white border rounded-lg mt-1 max-h-48 overflow-y-auto shadow">
              {filteredFrom.map((a) => (
                <div
                  key={a.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-right"
                  onClick={() => {
                    setFromAccountName(a.name_ar);
                    setFromAccount(String(a.id));
                    setShowFromList(false);
                  }}
                >
                  {a.name_ar}
                </div>
              ))}
            </div>
          )}
          <input disabled className="input bg-gray-100 text-center w-48" placeholder="رقم الحساب" value={getAccountCode(fromAccount)} />
        </div>

        {/* دائن */}
        <div className="relative flex flex-col items-center gap-2">
          <input
            className="input w-full text-center text-lg"
            placeholder="🔍 الحساب الدائن"
            value={toAccountName}
            onFocus={() => setShowToList(true)}
            onChange={(e) => {
              setToAccountName(e.target.value);
              setToAccount("");
              setShowToList(true);
            }}
          />
          {showToList && (
            <div className="absolute top-full z-50 w-full bg-white border rounded-lg mt-1 max-h-48 overflow-y-auto shadow">
              {filteredTo.map((a) => (
                <div
                  key={a.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-right"
                  onClick={() => {
                    setToAccountName(a.name_ar);
                    setToAccount(String(a.id));
                    setShowToList(false);
                  }}
                >
                  {a.name_ar}
                </div>
              ))}
            </div>
          )}
          <input disabled className="input bg-gray-100 text-center w-48" placeholder="رقم الحساب" value={getAccountCode(toAccount)} />
        </div>
      </div>

      <div className="flex justify-center">
        <textarea className="notes-box" placeholder="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 bg-[#e9efe6] p-4 rounded-lg">
        <button onClick={saveEntry} className="btn-green">➕ إضافة</button>
        <button onClick={resetForm} className="btn-gray">إلغاء</button>
      </div>

      <style>{`
        .input { padding: 12px; border-radius: 10px; border: 1px solid #ccc; }
        .btn-green { background: #2f4b75; color:#fff; padding:10px 20px; border-radius:10px; }
        .btn-gray { background:#e5e7eb; padding:10px 20px; border-radius:10px; }
        .notes-box { width:70%; height:120px; padding:12px; border-radius:12px; border:1px solid #ccc; resize:none; }
      `}</style>
    </div>
  );
};

export default JournalEntry;
