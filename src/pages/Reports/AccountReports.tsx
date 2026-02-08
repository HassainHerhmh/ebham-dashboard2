import React, { useEffect, useState } from "react";
import api from "../../services/api";
import * as XLSX from 'xlsx'; // استيراد مكتبة الإكسل
import { Search, FileSpreadsheet, Printer, RefreshCcw } from "lucide-react"; // أيقونات اختيارية

type Account = { id: number; name_ar: string; parent_id?: number | null; account_level?: string; };
type Currency = { id: number; name_ar: string; code: string; };
type Row = {
  id: number; journal_date: string; account_name: string; debit: number; credit: number;
  notes: string; balance: number; reference_type: string; reference_id: any; is_opening?: boolean;
  currency_name?: string;
};

const getYemenToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Aden', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const today = getYemenToday();

const AccountStatement: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mainAccounts, setMainAccounts] = useState<Account[]>([]);
  const [subAccounts, setSubAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [searchTerm, setSearchTerm] = useState(""); // حالة البحث
  const [opening, setOpening] = useState(0);

  // الفلاتر
  const [accountMode, setAccountMode] = useState<"all" | "single">("single");
  const [accountId, setAccountId] = useState("");
  const [mainAccountId, setMainAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [periodType, setPeriodType] = useState<"day" | "from_start" | "month" | "range">("day");
  const [date, setDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reportMode, setReportMode] = useState<"summary" | "detailed">("detailed");
  const [summaryType, setSummaryType] = useState("local");
  const [detailedType, setDetailedType] = useState("full");

  const referenceTranslations: { [key: string]: string } = {
    'order': 'طلب توصيل', 'journal': 'قيد يومي', 'payment': 'سند صرف',
    'receipt': 'سند قبض', 'opening': 'رصيد افتتاحي', 'wassel_order': 'طلب وصل لي'
  };

  useEffect(() => { loadLookups(); }, []);

  const loadLookups = async () => {
    try {
      const [a, c] = await Promise.all([api.get("/accounts"), api.get("/currencies")]);
      const list = a.data?.list || [];
      setAccounts(list);
      setMainAccounts(list.filter((x: Account) => x.account_level === "رئيسي"));
      setSubAccounts(list.filter((x: Account) => x.account_level === "فرعي"));
      setCurrencies(c.data?.currencies || c.data?.list || []);
    } catch (e) { console.error(e); }
  };

  const run = async () => {
    const { from_date, to_date } = buildDates();
    const payload = {
      currency_id: currencyId ? Number(currencyId) : null, from_date, to_date, report_mode: reportMode,
      summary_type: reportMode === "summary" ? summaryType : null,
      detailed_type: reportMode === "detailed" ? detailedType : null,
      account_id: accountMode === "single" ? (accountId ? Number(accountId) : null) : null,
      main_account_id: accountMode === "all" ? (mainAccountId ? Number(mainAccountId) : null) : null,
    };
    try {
      const res = await (api as any).reports.accountStatement(payload);
      if (res.success) { setOpening(res.opening_balance || 0); setRows(res.list || []); }
    } catch (e) { setRows([]); }
  };

  const buildDates = () => {
    if (periodType === "day") return { from_date: date, to_date: date };
    if (periodType === "month") {
      const [y, m] = date.split('-');
      return { from_date: `${y}-${m}-01`, to_date: `${y}-${m}-${new Date(Number(y), Number(m), 0).getDate()}` };
    }
    return { from_date: fromDate, to_date: toDate };
  };

  // ✅ وظيفة البحث المتقدم في الجدول
  const filteredRows = rows.filter(r => 
    r.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reference_id?.toString().includes(searchTerm)
  );

  // ✅ وظيفة التصدير إلى Excel
  const exportToExcel = () => {
    const dataToExport = filteredRows.map(r => ({
      'التاريخ': formatYemenDate(r.journal_date),
      'المستند': referenceTranslations[r.reference_type] || r.reference_type,
      'المرجع': r.reference_id || '',
      'الحساب': r.account_name,
      'مدين': r.debit,
      'دائن': r.credit,
      'الرصيد': Math.abs(r.balance),
      'الحالة': r.balance > 0 ? 'عليه' : 'له',
      'البيان': r.notes
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `كشف_حساب_${getYemenToday()}.xlsx`);
  };

  const formatYemenDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Aden' }).format(new Date(dateStr));
  };

  return (
    <div className="p-4 space-y-4 font-sans text-right" dir="rtl">
      {/* Header & Export Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border-b-4 border-green-600 gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800">كشف الحساب الموحد</h2>
          <p className="text-xs text-gray-400 font-bold">إدارة التقارير المالية - فرع عتق</p>
        </div>
        
        <div className="flex gap-2 no-print">
          <div className="relative group">
            <Search className="absolute right-3 top-2.5 text-gray-400 group-focus-within:text-green-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="بحث سريع في النتائج..." 
              className="pr-10 pl-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 ring-green-100 w-64 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold hover:bg-emerald-100 transition shadow-sm">
            <FileSpreadsheet size={18}/> Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition shadow-sm">
            <Printer size={18}/> PDF / طباعة
          </button>
        </div>
      </div>

      {/* لوحة الفلاتر (نفس التصميم السابق مع تحسينات طفيفة) */}
      <div className="bg-white border p-4 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-6 gap-3 no-print">
        <select className="input-field" value={accountMode} onChange={(e) => setAccountMode(e.target.value as any)}>
          <option value="single">حساب واحد</option><option value="all">كل الحسابات</option>
        </select>
        {accountMode === "single" ? (
          <select className="input-field border-r-4 border-green-600 font-bold" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">اختر حساب فرعي</option>{subAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
          </select>
        ) : (
          <select className="input-field border-r-4 border-green-600 font-bold" value={mainAccountId} onChange={(e) => setMainAccountId(e.target.value)}>
            <option value="">اختر حساب رئيسي</option>{mainAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
          </select>
        )}
        <select className="input-field" value={periodType} onChange={(e) => setPeriodType(e.target.value as any)}>
          <option value="day">اليوم</option><option value="from_start">من البداية</option><option value="month">خلال شهر</option><option value="range">فترة</option>
        </select>
        <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="input-field" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
          <option value="">كل العملات</option>{currencies.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
        </select>
        <button onClick={run} className="bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition active:scale-95">تحديث البيانات</button>
      </div>

      {/* عرض الجداول المفلترة */}
      {(() => {
        const grouped = filteredRows.reduce((acc: any, r: any) => {
          const key = r.currency_name || "غير محدد";
          if (!acc[key]) acc[key] = [];
          acc[key].push(r);
          return acc;
        }, {});

        return Object.entries(grouped).map(([currencyName, list]: any) => {
          let totalDebit = 0; let totalCredit = 0;
          list.forEach((r: any) => {
            const isOp = r.account_name === "رصيد سابق" || r.is_opening;
            if (isOp) { r.balance > 0 ? totalDebit += Math.abs(r.balance) : totalCredit += Math.abs(r.balance); }
            else { totalDebit += Number(r.debit || 0); totalCredit += Number(r.credit || 0); }
          });

          return (
            <div key={currencyName} className="bg-white rounded-3xl border shadow-sm overflow-hidden mb-6">
              <div className="bg-gray-800 text-white p-3 px-6 flex justify-between items-center">
                <span className="font-black text-lg">العملة: {currencyName}</span>
                <span className="text-xs opacity-70">عدد الحركات المكتشفة: {list.length}</span>
              </div>
              <table className="w-full text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b text-[11px]">
                    <th className="p-3 border-l">التاريخ</th><th className="p-3 border-l">المستند</th>
                    <th className="p-3 border-l">المرجع</th><th className="p-3 border-l">الحساب</th>
                    <th className="p-3 border-l">مدين</th><th className="p-3 border-l">دائن</th>
                    <th className="p-3 border-l">الرصيد</th><th className="p-3 border-l">الحالة</th>
                    <th className="p-3 text-right">الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r: any, idx: number) => {
                    const isOp = r.account_name === "رصيد سابق" || r.is_opening;
                    return (
                      <tr key={idx} className={`border-b hover:bg-green-50/50 transition-colors ${isOp ? "bg-blue-50/40 font-bold italic" : ""}`}>
                        <td className="p-2 border-l text-[10px]">{formatYemenDate(r.journal_date)}</td>
                        <td className="p-2 border-l text-xs">{isOp ? "—" : (referenceTranslations[r.reference_type] || r.reference_type)}</td>
                        <td className="p-2 border-l text-gray-400">{isOp ? "—" : r.reference_id}</td>
                        <td className="p-2 border-l text-right font-bold text-gray-700">{r.account_name}</td>
                        <td className="p-2 border-l text-red-600 font-bold">{isOp ? (r.balance > 0 ? Math.abs(r.balance).toFixed(2) : "0.00") : Number(r.debit).toFixed(2)}</td>
                        <td className="p-2 border-l text-green-600 font-bold">{isOp ? (r.balance < 0 ? Math.abs(r.balance).toFixed(2) : "0.00") : Number(r.credit).toFixed(2)}</td>
                        <td className="p-2 border-l font-black text-blue-800">{Math.abs(r.balance).toLocaleString()}</td>
                        <td className="p-2 border-l">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.balance > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {r.balance > 0 ? "عليه" : "له"}
                          </span>
                        </td>
                        <td className="p-2 text-right text-[10px] text-gray-400 truncate max-w-xs">{r.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-yellow-50/50 font-black text-gray-800">
                  <tr>
                    <td colSpan={4} className="p-3 text-left">إجمالي الحركة الحالية مع الرصيد السابق:</td>
                    <td className="p-3 text-red-700">{totalDebit.toLocaleString()}</td>
                    <td className="p-3 text-green-700">{totalCredit.toLocaleString()}</td>
                    <td className="p-3 text-blue-900 bg-yellow-100">{Math.abs(totalDebit - totalCredit).toLocaleString()}</td>
                    <td className="p-3">{totalDebit - totalCredit > 0 ? "إجمالي عليه" : "إجمالي له"}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        });
      })()}

      <style>{`
        .input-field { width: 100%; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 12px; background: #fdfdfd; }
        .input-field:focus { border-color: #16a34a; box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.1); }
        @media print { .no-print { display: none !important; } .rounded-3xl { border-radius: 0 !important; } }
      `}</style>
    </div>
  );
};

export default AccountStatement;
