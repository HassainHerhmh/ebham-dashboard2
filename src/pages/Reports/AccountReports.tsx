import React, { useEffect, useState } from "react";
import api from "../../services/api";

type Account = {
  id: number;
  name_ar: string;
  parent_id?: number | null;
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

type DetailedStyle = "with_opening" | "without_opening";
type SummaryStyle = "with_moves" | "final_only" | "with_currency_pair";

const AccountStatement: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mainAccounts, setMainAccounts] = useState<Account[]>([]);
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
  const [detailedStyle, setDetailedStyle] =
    useState<DetailedStyle>("with_opening");
  const [summaryStyle, setSummaryStyle] =
    useState<SummaryStyle>("with_moves");

  useEffect(() => {
    loadLookups();
  }, []);

  const loadLookups = async () => {
    const [a, c] = await Promise.all([
      api.get("/accounts/sub-for-ceiling"),
      api.get("/currencies"),
    ]);

    const accs = a.data?.list || a.data || [];
    setAccounts(accs);
    setMainAccounts(accs.filter((x: any) => !x.parent_id));

    setCurrencies(c.data?.currencies || c.data?.list || c.data || []);
  };

  const buildDates = () => {
    if (periodType === "day") {
      return { from_date: date, to_date: date };
    }
    if (periodType === "from_start") {
      return { from_date: null, to_date: date };
    }
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
      detailed_style: detailedStyle,
      summary_style: summaryStyle,
    };

    if (accountMode === "single") {
      payload.account_id = accountId ? Number(accountId) : null;
    } else {
      payload.main_account_id = mainAccountId
        ? Number(mainAccountId)
        : null;
    }

    const res = await api.post("/reports/account-statement", payload);

    if (res.data?.success) {
      setOpening(res.data.opening_balance || 0);
      setRows(res.data.list || []);
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
    setDetailedStyle("with_opening");
    setSummaryStyle("with_moves");
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
            <option value="">اختر الحساب</option>
            {accounts.map((a) => (
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

      {/* خيارات إضافية حسب نوع التقرير */}
      <div className="bg-[#f2f5f0] p-4 rounded-lg flex gap-8">
        {reportMode === "detailed" && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={detailedStyle === "with_opening"}
                onChange={() => setDetailedStyle("with_opening")}
              />
              الرصيد بعد كل عملية
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={detailedStyle === "without_opening"}
                onChange={() => setDetailedStyle("without_opening")}
              />
              أرصدة بعد كل عملية بدون افتتاحي
            </label>
          </>
        )}

        {reportMode === "summary" && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={summaryStyle === "with_moves"}
                onChange={() => setSummaryStyle("with_moves")}
              />
              الأرصدة مع الحركة
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={summaryStyle === "final_only"}
                onChange={() => setSummaryStyle("final_only")}
              />
              أرصدة نهائية
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={summaryStyle === "with_currency_pair"}
                onChange={() => setSummaryStyle("with_currency_pair")}
              />
              الأرصدة بالعملة والمقابل
            </label>
          </>
        )}
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <div className="p-3 font-semibold">
          الرصيد الافتتاحي: {opening}
        </div>

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
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="border px-2 py-1">{r.journal_date}</td>
                  <td className="border px-2 py-1">{r.account_name}</td>
                  <td className="border px-2 py-1">{r.debit || ""}</td>
                  <td className="border px-2 py-1">{r.credit || ""}</td>
                  <td className="border px-2 py-1">{r.balance}</td>
                  <td className="border px-2 py-1">{r.notes}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-gray-400 border">
                  لا توجد بيانات
                </td>
              </tr>
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
