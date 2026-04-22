import React, { useEffect, useState } from "react";
import api from "../../services/api";
import * as XLSX from 'xlsx';
import { Search, FileSpreadsheet, Printer, Calendar, LayoutList, FileText } from "lucide-react";

type Account = { id: number; name_ar: string; parent_id?: number | null; account_level?: string; };
type Currency = { id: number; name_ar: string; code: string; };
type Row = {
  id: number; journal_date: string; account_name: string; debit: number; credit: number;
  notes: string; balance: number; reference_type: string; reference_id: any; is_opening?: boolean;
  currency_name?: string; currency_id?: number;
};

// توقيت اليمن Asia/Aden
const getYemenToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Aden', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const today = getYemenToday();

const getBalanceStatus = (balance: number) => balance >= 0 ? "له" : "عليه";
const getBalanceStatusClass = (balance: number) =>
  balance >= 0
    ? "bg-green-100 text-green-700 dark:bg-green-900/40"
    : "bg-red-100 text-red-700 dark:bg-red-900/40";
const isOpeningRow = (row: Row | any) => row.account_name === "رصيد سابق" || row.is_opening;
const getDisplayDebit = (row: Row | any) =>
  isOpeningRow(row) ? (row.balance < 0 ? Math.abs(Number(row.balance || 0)) : 0) : Number(row.debit || 0);
const getDisplayCredit = (row: Row | any) =>
  isOpeningRow(row) ? (row.balance >= 0 ? Math.abs(Number(row.balance || 0)) : 0) : Number(row.credit || 0);

const AccountStatement: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mainAccounts, setMainAccounts] = useState<Account[]>([]);
  const [subAccounts, setSubAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [accountMode, setAccountMode] = useState<"all" | "single">("single");
  const [accountId, setAccountId] = useState("");
  const [mainAccountId, setMainAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [periodType, setPeriodType] = useState<"day" | "from_start" | "month" | "range">("day");
  const [date, setDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [reportMode, setReportMode] = useState<"summary" | "detailed">("detailed");
  const [detailedType, setDetailedType] = useState<"full" | "no_open">("full");
  const [summaryType, setSummaryType] = useState("local");

  // ✅ إضافة ترجمة سند التسقيف لضمان ظهوره
  const referenceTranslations: { [key: string]: string } = {
    'order': 'طلب توصيل',
    'journal': 'قيد يومي',
    'payment': 'سند صرف',
    'receipt': 'سند قبض',
    'opening': 'رصيد افتتاحي',
    'wassel_order': 'طلب وصل لي',
    'manual_order': 'طلب يدوي',
    'ceiling': 'سند تسقيف حساب' // تم الحل هنا
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
    const { from_date, to_date } = {
      day: { from_date: date, to_date: date },
      month: { from_date: `${date.split('-')[0]}-${date.split('-')[1]}-01`, to_date: `${date.split('-')[0]}-${date.split('-')[1]}-${new Date(Number(date.split('-')[0]), Number(date.split('-')[1]), 0).getDate()}` },
      from_start: { from_date: null, to_date: date },
      range: { from_date: fromDate, to_date: toDate }
    }[periodType];

    try {
      const res = await (api as any).reports.accountStatement({
        currency_id: currencyId ? Number(currencyId) : null,
        from_date, to_date, report_mode: reportMode, summary_type: summaryType, detailed_type: detailedType,
        account_id: accountMode === "single" ? (accountId ? Number(accountId) : null) : null,
        main_account_id: accountMode === "all" ? (mainAccountId ? Number(mainAccountId) : null) : null,
      });
      if (res.success) setRows(res.list || []);
    } catch (e) { setRows([]); }
  };

  const filteredRows = rows.filter(r => 
    r.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reference_id?.toString().includes(searchTerm)
  );

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredRows.map(r => ({
      'التاريخ': r.journal_date?.slice(0,10),
      'المستند': referenceTranslations[r.reference_type] || r.reference_type,
      'المرجع': r.reference_id || '',
      'الحساب': r.account_name,
      'مدين': getDisplayDebit(r), 'دائن': getDisplayCredit(r), 'الرصيد': Math.abs(r.balance),
      'الحالة': getBalanceStatus(r.balance), 'البيان': r.notes
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `كشف_حساب_${getYemenToday()}.xlsx`);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-right p-2 md:p-4 transition-colors duration-300" dir="rtl">
      
      {/* 🟢 رأس الصفحة (Full Width) */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-r-4 border-green-600 mb-4 no-print gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">كشف الحساب التحليلي</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold">إدارة التقارير والتدقيق المالي</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="بحث سريع..." 
              className="pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 ring-green-500/20 dark:text-white w-48 md:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={exportToExcel} title="تصدير Excel" className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 dark:border-emerald-800">
            <FileSpreadsheet size={20}/>
          </button>
          <button onClick={() => window.print()} title="طباعة PDF" className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100 dark:border-blue-800">
            <Printer size={20}/>
          </button>
        </div>
      </div>

      {/* 🟢 لوحة الفلاتر (Full Width) */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700 no-print space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <select className="dark-input" value={accountMode} onChange={(e) => setAccountMode(e.target.value as any)}>
            <option value="single">حساب واحد</option><option value="all">كل الحسابات</option>
          </select>
          {accountMode === "single" ? (
            <select className="dark-input border-r-2 border-green-600 font-bold" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">اختر حساب فرعي...</option>{subAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
            </select>
          ) : (
            <select className="dark-input border-r-2 border-green-600 font-bold" value={mainAccountId} onChange={(e) => setMainAccountId(e.target.value)}>
              <option value="">اختر حساب رئيسي...</option>{mainAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
            </select>
          )}
          <select className="dark-input" value={periodType} onChange={(e) => setPeriodType(e.target.value as any)}>
            <option value="day">اليوم</option><option value="month">شهر</option><option value="from_start">من البداية</option><option value="range">فترة</option>
          </select>
          <input type="date" className="dark-input" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="dark-input font-bold text-blue-600 dark:text-blue-400" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
            <option value="">كل العملات</option>{currencies.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <button onClick={run} className="bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition active:scale-95 h-[42px] shadow-lg shadow-green-900/10">عرض البيانات</button>
        </div>

        {/* خيارات أنماط التقرير */}
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
           <div className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-600">
              <button onClick={()=>setReportMode("detailed")} className={`tab-btn ${reportMode==="detailed"?'active':''}`}>تحليلي</button>
              <button onClick={()=>setReportMode("summary")} className={`tab-btn ${reportMode==="summary"?'active':''}`}>تجميعي</button>
           </div>
           {reportMode === "detailed" ? (
             <div className="flex gap-4 text-xs font-bold text-gray-500 dark:text-gray-400">
               <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={detailedType === "full"} onChange={() => setDetailedType("full")} /> مع الرصيد السابق</label>
               <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={detailedType === "no_open"} onChange={() => setDetailedType("no_open")} /> بدون رصيد سابق</label>
             </div>
           ) : (
             <select className="bg-transparent text-xs font-black text-green-700 dark:text-green-400 outline-none" value={summaryType} onChange={(e)=>setSummaryType(e.target.value)}>
                <option value="local">إجمالي بالعملة المحلية</option><option value="with_move">مع الحركة</option><option value="final">الرصيد النهائي</option>
             </select>
           )}
        </div>
      </div>

      {/* 🟢 الجداول (Full Width) */}
      <div className="w-full mt-6 space-y-8">
        {(() => {
          const grouped = filteredRows.reduce((acc: any, r: any) => {
            const key = r.currency_name || "غير محدد";
            if (!acc[key]) acc[key] = [];
            acc[key].push(r);
            return acc;
          }, {});

          return Object.entries(grouped).map(([currencyName, list]: any) => {
            let tDeb = 0; let tCre = 0;
            list.forEach((r: any) => {
              tDeb += getDisplayDebit(r);
              tCre += getDisplayCredit(r);
            });

            return (
              <div key={currencyName} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden page-break">
                <div className="bg-gray-800 dark:bg-black text-white p-3 px-6 flex justify-between items-center border-b dark:border-gray-700">
                  <h3 className="font-black text-lg">العملة: {currencyName}</h3>
                  <span className="text-[10px] bg-green-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                    {reportMode === "detailed" ? 'Analytical' : 'Summary'}
                  </span>
                </div>
                <table className="w-full text-[13px] text-center border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-black border-b dark:border-gray-700">
                      <th className="p-4 border-l dark:border-gray-700">التاريخ</th>
                      <th className="p-4 border-l dark:border-gray-700">المستند</th>
                      <th className="p-4 border-l dark:border-gray-700">المرجع</th>
                      <th className="p-4 border-l dark:border-gray-700 text-right">الحساب</th>
                      <th className="p-4 border-l dark:border-gray-700">مدين</th>
                      <th className="p-4 border-l dark:border-gray-700">دائن</th>
                      <th className="p-4 border-l dark:border-gray-700">الرصيد الصافي</th>
                      <th className="p-4 border-l dark:border-gray-700">الحالة</th>
                      <th className="p-4 text-right">البيان / ملاحظات التدقيق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {list.map((r: any, idx: number) => {
                      const isOp = isOpeningRow(r);
                      return (
                        <tr key={idx} className={`hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors ${isOp ? "bg-blue-50/50 dark:bg-blue-900/20 font-bold" : "dark:text-gray-300"}`}>
                          <td className="p-3 border-l dark:border-gray-700 text-xs font-mono">{isOp ? "—" : r.journal_date?.slice(0,10)}</td>
                          <td className="p-3 border-l dark:border-gray-700 font-bold">{isOp ? "رصيد سابق" : (referenceTranslations[r.reference_type] || r.reference_type)}</td>
                          <td className="p-3 border-l dark:border-gray-700 text-gray-400">{isOp ? "—" : r.reference_id}</td>
                          <td className="p-3 border-l dark:border-gray-700 text-right font-black text-gray-800 dark:text-white">{r.account_name}</td>
                          <td className="p-3 border-l dark:border-gray-700 text-red-600 font-bold">{getDisplayDebit(r).toLocaleString()}</td>
                          <td className="p-3 border-l dark:border-gray-700 text-green-600 font-bold">{getDisplayCredit(r).toLocaleString()}</td>
                          <td className="p-3 border-l dark:border-gray-700 font-black text-blue-900 dark:text-blue-400 bg-blue-50/10">{Math.abs(r.balance).toLocaleString()}</td>
                          <td className="p-3 border-l dark:border-gray-700">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${getBalanceStatusClass(r.balance)}`}>{getBalanceStatus(r.balance)}</span>
                          </td>
                          <td className="p-3 text-right text-gray-600 dark:text-gray-400 font-medium leading-relaxed max-w-[400px] break-words">
                            {r.notes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-yellow-50/80 dark:bg-yellow-900/20 font-black border-t-2 border-yellow-200 dark:border-yellow-900 text-gray-800 dark:text-white">
                    <tr className="text-sm">
                      <td colSpan={4} className="p-4 text-left font-black uppercase">إجمالي الرصيد الختامي للعملة:</td>
                      <td className="p-4 text-red-700 dark:text-red-500">{tDeb.toLocaleString()}</td>
                      <td className="p-4 text-green-700 dark:text-green-500">{tCre.toLocaleString()}</td>
                      <td className="p-4 text-blue-900 dark:text-blue-400 text-xl bg-yellow-100/50">{Math.abs(tDeb - tCre).toLocaleString()}</td>
                      <td className="p-4"><span className={`px-4 py-1 rounded-lg text-white ${tDeb - tCre > 0 ? "bg-red-600" : "bg-green-600"}`}>{tDeb - tCre > 0 ? "إجمالي عليه" : "إجمالي له"}</span></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          });
        })()}
      </div>

      <style>{`
        .dark-input { width:100%; padding:9px 12px; border-radius:10px; border:1px solid #d1d5db; font-size:13px; outline:none; background:#fff; transition:all 0.2s; }
        .dark-input:focus { border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,0.1); }
        .dark .dark-input { background:#374151; border-color:#4b5563; color:#fff; }
        
        .tab-btn { flex:1; padding:5px 20px; font-size:12px; font-weight:bold; border-radius:6px; color:#6b7280; transition:all 0.2s; }
        .tab-btn.active { background:#16a34a; color:#fff; shadow-sm; }
        
        @media print { 
          .no-print { display:none !important; } 
          .page-break { page-break-inside:avoid; border:1px solid #000 !important; border-radius:0 !important; }
          body { background:#fff; padding:0; margin:0; }
          .w-full { width:100% !important; }
        }
      `}</style>
    </div>
  );
};

export default AccountStatement;
