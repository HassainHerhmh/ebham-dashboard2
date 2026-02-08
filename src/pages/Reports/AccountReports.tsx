import React, { useEffect, useState } from "react";
import api from "../../services/api";
import * as XLSX from 'xlsx';
import { Search, FileSpreadsheet, Printer, Calendar } from "lucide-react";

type Account = { id: number; name_ar: string; parent_id?: number | null; account_level?: string; };
type Currency = { id: number; name_ar: string; code: string; };
type Row = {
  id: number; journal_date: string; account_name: string; debit: number; credit: number;
  notes: string; balance: number; reference_type: string; reference_id: any; is_opening?: boolean;
  currency_name?: string; currency_id?: number;
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
  const [openingBalance, setOpeningBalance] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // الفلاتر الأساسية
  const [accountMode, setAccountMode] = useState<"all" | "single">("single");
  const [accountId, setAccountId] = useState("");
  const [mainAccountId, setMainAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [periodType, setPeriodType] = useState<"day" | "from_start" | "month" | "range">("day");
  const [date, setDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // خيارات العرض (التي فُقدت سابقاً)
  const [reportMode, setReportMode] = useState<"summary" | "detailed">("detailed");
  const [detailedType, setDetailedType] = useState<"full" | "no_open">("full"); // مع/بدون رصيد سابق
  const [summaryType, setSummaryType] = useState("local");

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

  const buildDates = () => {
    if (periodType === "day") return { from_date: date, to_date: date };
    if (periodType === "month") {
      const [y, m] = date.split('-');
      return { from_date: `${y}-${m}-01`, to_date: `${y}-${m}-${new Date(Number(y), Number(m), 0).getDate()}` };
    }
    return { from_date: fromDate, to_date: toDate };
  };

  const run = async () => {
    const { from_date, to_date } = buildDates();
    const payload = {
      currency_id: currencyId ? Number(currencyId) : null,
      from_date,
      to_date,
      report_mode: reportMode,
      summary_type: summaryType,
      detailed_type: detailedType,
      account_id: accountMode === "single" ? (accountId ? Number(accountId) : null) : null,
      main_account_id: accountMode === "all" ? (mainAccountId ? Number(mainAccountId) : null) : null,
    };

    try {
      const res = await (api as any).reports.accountStatement(payload);
      if (res.success) {
        setOpeningBalance(res.opening_balance || 0);
        setRows(res.list || []);
      }
    } catch (e) { setRows([]); }
  };

  // دالة البحث في الجدول
  const filteredRows = rows.filter(r => 
    r.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reference_id?.toString().includes(searchTerm)
  );

  const formatYemenDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Aden' }).format(new Date(dateStr));
  };

  const exportToExcel = () => {
    const dataToExport = filteredRows.map(r => ({
      'التاريخ': formatYemenDate(r.journal_date),
      'المستند': referenceTranslations[r.reference_type] || r.reference_type,
      'المرجع': r.reference_id || '',
      'الحساب': r.account_name,
      'مدين': r.debit,
      'دائن': r.credit,
      'الرصيد الصافي': Math.abs(r.balance),
      'الحالة': r.balance > 0 ? 'عليه' : 'له',
      'البيان': r.notes
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `كشف_حساب_${getYemenToday()}.xlsx`);
  };

  return (
    <div className="p-4 space-y-4 text-right" dir="rtl">
      {/* رأس الصفحة والأزرار */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border-r-8 border-green-600">
        <h2 className="text-2xl font-black text-gray-800">📊 كشف الحساب والتقارير الموحدة</h2>
        <div className="flex gap-2 no-print">
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition"><FileSpreadsheet size={18}/> Excel</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      {/* لوحة التحكم والبحث */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
           <select className="input-style" value={accountMode} onChange={(e) => setAccountMode(e.target.value as any)}>
             <option value="single">حساب واحد</option><option value="all">كل الحسابات</option>
           </select>
           {accountMode === "single" ? (
             <select className="input-style border-r-4 border-green-500 font-bold" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
               <option value="">اختر حساب فرعي</option>{subAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
             </select>
           ) : (
             <select className="input-style border-r-4 border-green-500 font-bold" value={mainAccountId} onChange={(e) => setMainAccountId(e.target.value)}>
               <option value="">اختر حساب رئيسي</option>{mainAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
             </select>
           )}
           <select className="input-style" value={periodType} onChange={(e) => setPeriodType(e.target.value as any)}>
             <option value="day">اليوم</option><option value="from_start">من البداية</option><option value="month">شهر</option><option value="range">فترة</option>
           </select>
           <input type="date" className="input-style" value={date} onChange={(e) => setDate(e.target.value)} />
           <select className="input-style font-bold text-blue-600" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
             <option value="">كل العملات</option>{currencies.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
           </select>
           <button onClick={run} className="bg-green-600 text-white font-bold py-2 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-100">عرض التقرير</button>
        </div>

        {/* خيارات العرض التفصيلية (تمت استعادتها وتفعيلها) */}
        <div className="flex flex-wrap items-center gap-6 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300">
           <div className="flex items-center gap-2 border-l pl-4">
              <span className="text-xs font-bold text-gray-400">نمط التقرير:</span>
              <button onClick={()=>setReportMode("detailed")} className={`px-3 py-1 rounded-lg text-xs font-bold ${reportMode==="detailed"?"bg-green-600 text-white":"bg-white text-gray-500 border"}`}>تحليلي (حركات)</button>
              <button onClick={()=>setReportMode("summary")} className={`px-3 py-1 rounded-lg text-xs font-bold ${reportMode==="summary"?"bg-green-600 text-white":"bg-white text-gray-500 border"}`}>إجمالي (أرصدة)</button>
           </div>

           {reportMode === "detailed" ? (
             <div className="flex items-center gap-4">
               <label className="flex items-center gap-1 text-xs font-bold cursor-pointer"><input type="radio" checked={detailedType === "full"} onChange={() => setDetailedType("full")} /> كشف كامل (مع رصيد سابق)</label>
               <label className="flex items-center gap-1 text-xs font-bold cursor-pointer"><input type="radio" checked={detailedType === "no_open"} onChange={() => setDetailedType("no_open")} /> كشف بدون رصيد سابق</label>
             </div>
           ) : (
             <select className="bg-transparent text-xs font-bold outline-none" value={summaryType} onChange={(e)=>setSummaryType(e.target.value)}>
                <option value="local">إجمالي العملة المحلية</option>
                <option value="with_move">الأرصدة مع الحركة</option>
                <option value="final">الأرصدة النهائية فقط</option>
             </select>
           )}

           <div className="flex-1 relative flex justify-end">
              <Search className="absolute right-3 top-2 text-gray-300" size={16} />
              <input type="text" placeholder="بحث في النتائج..." className="pr-9 pl-4 py-1.5 bg-white border rounded-full text-xs outline-none focus:ring-1 ring-green-400 w-48 transition-all" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
           </div>
        </div>
      </div>

      {/* عرض الجداول */}
      {(() => {
        const grouped = filteredRows.reduce((acc: any, r: any) => {
          const key = r.currency_name || "غير محدد";
          if (!acc[key]) acc[key] = [];
          acc[key].push(r);
          return acc;
        }, {});

        if (Object.keys(grouped).length === 0) return <div className="p-20 text-center text-gray-300 font-bold border-2 border-dashed rounded-3xl">لا توجد بيانات للعرض، يرجى تحديث البحث</div>;

        return Object.entries(grouped).map(([currencyName, list]: any) => {
          let tDebit = 0; let tCredit = 0;
          list.forEach((r: any) => {
            const isOp = r.account_name === "رصيد سابق" || r.is_opening;
            if (isOp) { r.balance > 0 ? tDebit += Math.abs(r.balance) : tCredit += Math.abs(r.balance); }
            else { tDebit += Number(r.debit || 0); tCredit += Number(r.credit || 0); }
          });

          return (
            <div key={currencyName} className="bg-white rounded-3xl border shadow-sm overflow-hidden mb-8 page-break">
              <div className="bg-gray-800 text-white p-3 px-6 flex justify-between items-center">
                <span className="font-black text-lg">عملة: {currencyName}</span>
                <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">{reportMode === "detailed" ? "تقرير تحليلي" : "تقرير إجمالي"}</span>
              </div>
              <table className="w-full text-sm text-center border-collapse">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b text-[11px]">
                  <tr>
                    <th className="p-3">التاريخ</th><th>المستند</th><th>المرجع</th><th>الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد الصافي</th><th>الحالة</th><th className="text-right">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((r: any, idx: number) => {
                    const isOp = r.account_name === "رصيد سابق" || r.is_opening;
                    return (
                      <tr key={idx} className={`hover:bg-green-50/30 transition-colors ${isOp ? "bg-blue-50/50 font-bold italic" : ""}`}>
                        <td className="p-2 text-[10px]">{formatYemenDate(r.journal_date)}</td>
                        <td className="p-2 text-xs">{isOp ? "—" : (referenceTranslations[r.reference_type] || r.reference_type)}</td>
                        <td className="p-2 font-bold text-gray-400">{isOp ? "—" : r.reference_id}</td>
                        <td className="p-2 font-bold text-gray-700">{r.account_name}</td>
                        <td className="p-2 text-red-600 font-bold">{isOp ? (r.balance > 0 ? Math.abs(r.balance).toFixed(2) : "0.00") : Number(r.debit).toFixed(2)}</td>
                        <td className="p-2 text-green-600 font-bold">{isOp ? (r.balance < 0 ? Math.abs(r.balance).toFixed(2) : "0.00") : Number(r.credit).toFixed(2)}</td>
                        <td className="p-2 font-black text-blue-800">{Math.abs(r.balance).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                        <td className="p-2">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${r.balance > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{r.balance > 0 ? "عليه" : "له"}</span>
                        </td>
                        <td className="p-2 text-right text-[10px] text-gray-400 truncate max-w-xs">{r.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-yellow-50 font-black border-t-2 border-yellow-200">
                  <tr className="text-gray-800">
                    <td colSpan={4} className="p-4 text-left">الإجمالي الصافي للعملة (شامل الرصيد السابق):</td>
                    <td className="p-4 text-red-700">{tDebit.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td className="p-4 text-green-700">{tCredit.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td className="p-4 text-blue-900 bg-yellow-100 text-lg">{Math.abs(tDebit - tCredit).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-lg text-white ${tDebit - tCredit > 0 ? "bg-red-600" : "bg-green-600"}`}>{tDebit - tCredit > 0 ? "إجمالي عليه" : "إجمالي له"}</span></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        });
      })()}

      <style>{`
        .input-style { padding: 8px 12px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 13px; outline: none; background: #fdfdfd; transition: all 0.2s; }
        .input-style:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1); }
        @media print { 
          .no-print { display: none !important; } 
          .page-break { page-break-inside: avoid; border-radius: 0 !important; border: 1px solid #eee !important; }
          body { padding: 0; margin: 0; background: #fff; }
        }
      `}</style>
    </div>
  );
};

export default AccountStatement;
