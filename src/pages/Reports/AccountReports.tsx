
import React, { useEffect, useState } from "react";
import api from "../../services/api";

type Account = {
  id: number;
  name_ar: string;
  parent_id?: number | null;
  account_level?: string;
};

type Currency = {
  id: number;
  name_ar: string;
  code: string;
};

type Row = {
  id: number;
  journal_date: string;
  account_name: string;
  debit: number;
  credit: number;
  notes: string;
  balance: number;
};

const today = new Date().toLocaleDateString("en-CA");

type PeriodType = "day" | "from_start" | "month" | "range";
type ReportMode = "summary" | "detailed";
type AccountMode = "all" | "single";

const AccountStatement: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mainAccounts, setMainAccounts] = useState<Account[]>([]);
  const [subAccounts, setSubAccounts] = useState<Account[]>([]);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [opening, setOpening] = useState(0);

  const [accountMode, setAccountMode] = useState<AccountMode>("single");
  const [accountId, setAccountId] = useState("");
  const [mainAccountId, setMainAccountId] = useState("");

  const [currencyId, setCurrencyId] = useState("");

  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [date, setDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [reportMode, setReportMode] = useState<ReportMode>("detailed");

  const [summaryType, setSummaryType] = useState("local");
const referenceTranslations: { [key: string]: string } = {
  'order': 'طلب توصيل',
  'journal': 'قيد يومي',
  'payment': 'سند صرف',
  'receipt': 'سند قبض',
  'opening': 'رصيد افتتاحي'
};

const totalDebit = rows.reduce(
  (s, r) => s + (Number(r.debit) || 0),
  0
);

const totalCredit = rows.reduce(
  (s, r) => s + (Number(r.credit) || 0),
  0
);

const finalBalance = Number(
  ((Number(opening) || 0) + totalDebit - totalCredit).toFixed(2)
);

  
  const [detailedType, setDetailedType] = useState("full");

  useEffect(() => {
    loadLookups();
  }, []);

  const loadLookups = async () => {
    const [a, c] = await Promise.all([
      api.get("/accounts"),
      api.get("/currencies"),
    ]);

    const list = a.data?.list || [];
    setAccounts(list);

    setMainAccounts(list.filter((a: Account) => a.account_level === "رئيسي"));
    setSubAccounts(list.filter((a: Account) => a.account_level === "فرعي"));

    setCurrencies(c.data?.currencies || c.data?.list || c.data || []);
  };

  const buildDates = () => {
    if (periodType === "day") return { from_date: date, to_date: date };
    if (periodType === "from_start") return { from_date: null, to_date: date };
    if (periodType === "month") {
      const d = new Date(date);
      const first = new Date(d.getFullYear(), d.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      return { from_date: first, to_date: last };
    }
    return { from_date: fromDate, to_date: toDate };
  };

  const run = async () => {
    const { from_date, to_date } = buildDates();

    const payload: any = {
      currency_id: currencyId ? Number(currencyId) : null,
      from_date,
      to_date,
      report_mode: reportMode,
      summary_type: reportMode === "summary" ? summaryType : null,
      detailed_type: reportMode === "detailed" ? detailedType : null,
    };

    if (accountMode === "single") {
      payload.account_id = accountId ? Number(accountId) : null;
    } else {
      payload.main_account_id = mainAccountId
        ? Number(mainAccountId)
        : null;
    }

    try {
    const res = await (api as any).reports.accountStatement(payload);

if (res.success) {
  setOpening(res.opening_balance || 0);
  setRows(res.list || []);
} else {
  setOpening(0);
  setRows([]);
}
      
    } catch (e) {
      console.error(e);
      setOpening(0);
      setRows([]);
    }
  };

  const reset = () => {
    setAccountMode("single");
    setAccountId("");
    setMainAccountId("");
    setCurrencyId("");
    setPeriodType("day");
    setDate(today);
    setFromDate(today);
    setToDate(today);
    setReportMode("detailed");
    setSummaryType("local");
    setDetailedType("full");
    setRows([]);
    setOpening(0);
  };
    return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">كشف الحساب</h2>

      <div className="bg-[#e9efe6] p-4 rounded-lg grid grid-cols-6 gap-3">
        <select
          className="input"
          value={accountMode}
          onChange={(e) => setAccountMode(e.target.value as any)}
        >
          <option value="single">حساب واحد</option>
          <option value="all">كل الحسابات</option>
        </select>

        {accountMode === "single" ? (
          <select
            className="input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">اختر حساب فرعي</option>
            {subAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name_ar}
              </option>
            ))}
          </select>
        ) : (
          <select
            className="input"
            value={mainAccountId}
            onChange={(e) => setMainAccountId(e.target.value)}
          >
            <option value="">اختر حساب رئيسي</option>
            {mainAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name_ar}
              </option>
            ))}
          </select>
        )}

        <select
          className="input"
          value={reportMode}
          onChange={(e) => setReportMode(e.target.value as any)}
        >
          <option value="detailed">تحليلي</option>
          <option value="summary">إجمالي</option>
        </select>

        <select
          className="input"
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as any)}
        >
          <option value="day">خلال يوم</option>
          <option value="from_start">من البداية إلى تاريخ</option>
          <option value="month">خلال شهر</option>
          <option value="range">خلال فترة</option>
        </select>

        {(periodType === "day" ||
          periodType === "from_start" ||
          periodType === "month") && (
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}

        {periodType === "range" && (
          <>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <input
              type="date"
              className="input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </>
        )}

        <select
          className="input"
          value={currencyId}
          onChange={(e) => setCurrencyId(e.target.value)}
        >
          <option value="">كل العملات</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_ar} ({c.code})
            </option>
          ))}
        </select>

        <div className="flex gap-2 col-span-2">
          <button onClick={run} className="btn-green">
            عرض
          </button>
          <button onClick={reset} className="btn-gray">
            إعادة
          </button>
        </div>
      </div>

      {/* خيارات التقرير */}
      <div className="bg-[#eef3ec] p-3 rounded-lg space-y-2">
        {reportMode === "summary" && (
          <>
            <div className="font-semibold">نوع التقرير الإجمالي</div>
            <div className="flex flex-wrap gap-6">
              <label>
                <input
                  type="radio"
                  checked={summaryType === "local"}
                  onChange={() => setSummaryType("local")}
                />{" "}
                إجمالي عملة محلية
              </label>
              <label>
                <input
                  type="radio"
                  checked={summaryType === "with_move"}
                  onChange={() => setSummaryType("with_move")}
                />{" "}
                الأرصدة مع الحركة
              </label>
              <label>
                <input
                  type="radio"
                  checked={summaryType === "with_pair"}
                  onChange={() => setSummaryType("with_pair")}
                />{" "}
                الأرصدة بالعملة والمقابل
              </label>
              <label>
                <input
                  type="radio"
                  checked={summaryType === "with_pair_move"}
                  onChange={() => setSummaryType("with_pair_move")}
                />{" "}
                الأرصدة بالعملة والمقابل مع الحركة
              </label>
              <label>
                <input
                  type="radio"
                  checked={summaryType === "final"}
                  onChange={() => setSummaryType("final")}
                />{" "}
                أرصدة نهائية
              </label>
            </div>
          </>
        )}

        {reportMode === "detailed" && (
          <>
            <div className="font-semibold">نوع التقرير التحليلي</div>
            <div className="flex gap-6">
              <label>
                <input
                  type="radio"
                  checked={detailedType === "full"}
                  onChange={() => setDetailedType("full")}
                />{" "}
                كشف كامل
              </label>
              <label>
                <input
                  type="radio"
                  checked={detailedType === "no_open"}
                  onChange={() => setDetailedType("no_open")}
                />{" "}
                كشف بدون رصيد سابق
              </label>
            </div>
          </>
        )}
      </div>

{(() => {
  // 1. تقسيم العمليات حسب العملة
  const grouped = rows.reduce((acc: any, r: any) => {
    const key = r.currency_name || "غير محدد";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return Object.entries(grouped).map(([currencyName, list]: any) => {
    
    // --- الحسابات البرمجية لضبط الإجماليات شاملة الرصيد السابق ---
    let totalDebitSum = 0;
    let totalCreditSum = 0;

    list.forEach((r: any) => {
      const isOpening = r.account_name === "رصيد سابق" || r.is_opening;
      
      if (isOpening) {
        // إذا كان رصيد سابق: نوزعه حسب الحالة (موجب = مدين، سالب = دائن)
        if (r.balance > 0) totalDebitSum += Math.abs(r.balance);
        else if (r.balance < 0) totalCreditSum += Math.abs(r.balance);
      } else {
        // حركة عادية: نجمع المدين والدائن بشكل طبيعي
        totalDebitSum += Number(r.debit || 0);
        totalCreditSum += Number(r.credit || 0);
      }
    });

    const finalBalanceSum = totalDebitSum - totalCreditSum;

    return (
      <div key={currencyName} className="mb-8">
        <div className="text-center font-bold text-lg my-3">{currencyName}</div>

        <table className="w-full text-sm text-center border dark:border-gray-700">
          <thead className="bg-green-600 dark:bg-green-700 text-white">
            <tr>
              <th className="border px-2 py-2">التاريخ</th>
              <th className="border px-2 py-2">المستند</th>
              <th className="border px-2 py-2">رقم المرجع</th>
              <th className="border px-2 py-2">الحساب</th>
              <th className="border px-2 py-2">مدين</th>
              <th className="border px-2 py-2">دائن</th>
              <th className="border px-2 py-2">الرصيد</th>
              <th className="border px-2 py-2">الحالة</th>
              <th className="border px-2 py-2">البيان</th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800">
            {list.map((r: any, index: number) => {
              const isOpening = r.account_name === "رصيد سابق" || r.is_opening;
              
              // تحديد القيم للعرض في الجدول
              const displayDebit = isOpening ? (r.balance > 0 ? Math.abs(r.balance) : 0) : Number(r.debit || 0);
              const displayCredit = isOpening ? (r.balance < 0 ? Math.abs(r.balance) : 0) : Number(r.credit || 0);

              return (
                <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isOpening ? "bg-blue-50 dark:bg-blue-900/20 font-bold" : ""}`}>
                  <td className="border px-2 py-1 text-xs">{r.journal_date?.slice(0, 10)}</td>
                  <td className="border px-2 py-1">{isOpening ? "-" : (referenceTranslations[r.reference_type] || r.reference_type)}</td>
                  <td className="border px-2 py-1">{isOpening ? "-" : (r.reference_id || "-")}</td>
                  <td className="border px-2 py-1">{r.account_name}</td>
                  
                  {/* عرض المبالغ في الخانات الصحيحة حتى للرصيد السابق */}
                  <td className="border px-2 py-1 text-red-600">
                    {displayDebit > 0 ? displayDebit.toFixed(2) : "0.00"}
                  </td>
                  <td className="border px-2 py-1 text-green-600">
                    {displayCredit > 0 ? displayCredit.toFixed(2) : "0.00"}
                  </td>

                  <td className="border px-2 py-1 font-medium text-blue-700">
                    {Math.abs(r.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                  <td className={`border px-2 py-1 font-bold ${r.balance > 0 ? "text-red-500" : "text-green-500"}`}>
                    {r.balance > 0 ? "عليه" : "له"}
                  </td>
                  <td className="border px-2 py-1 text-right text-xs">{r.notes}</td>
                </tr>
              );
            })}

            {/* الإجمالي النهائي - الآن يجمع كل شيء بشكل صحيح */}
            <tr className="bg-yellow-100 dark:bg-yellow-900/30 font-bold">
              <td colSpan={4} className="border px-2 py-2 text-left text-blue-900 dark:text-blue-200">الإجمالي النهائي (شامل الرصيد السابق)</td>
              <td className="border px-2 py-2 text-red-600">{totalDebitSum.toFixed(2)}</td>
              <td className="border px-2 py-2 text-green-600">{totalCreditSum.toFixed(2)}</td>
              <td className="border px-2 py-2 text-blue-700">{Math.abs(finalBalanceSum).toFixed(2)}</td>
              <td className={`border px-2 py-2 ${finalBalanceSum > 0 ? "text-red-600" : "text-green-600"}`}>
                {finalBalanceSum > 0 ? "إجمالي عليه" : "إجمالي له"}
              </td>
              <td className="border px-2 py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  });
})()}

      <style>{`
        .input { padding:10px; border-radius:8px; border:1px solid #ccc; }
        .btn-green { background:#14532d; color:#fff; padding:8px 16px; border-radius:8px; }
        .btn-gray { background:#e5e7eb; padding:8px 16px; border-radius:8px; }
      `}</style>
    </div>
  );
};

export default AccountStatement;
