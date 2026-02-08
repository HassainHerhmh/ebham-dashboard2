import React, { useEffect, useState } from "react";
import api from "../../services/api";
import * as XLSX from 'xlsx';
import { Search, FileSpreadsheet, Printer, Calendar, Info } from "lucide-react";

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
      'مدين': r.debit, 'دائن': r.credit, 'الرصيد': Math.abs(r.balance),
      'الحالة': r.balance > 0 ? 'عليه' : 'له', 'البيان': r.notes
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `Account_Statement_${getYemenToday()}.xlsx`);
  };

  return (
    <div className="w-full px-2 py-4 space-y-4 text-right bg-gray-50 min-h-screen" dir="rtl">
      
      {/* الفلاتر العلوية - مدمجة لتوفير مساحة */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 no-print">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-gray-400 mb-1">نطاق الحساب</label>
            <select className="minimal-input" value={accountMode} onChange={(e) => setAccountMode(e.target.value as any)}>
              <option value="single">حساب واحد</option><option value="all">كل الحسابات</option>
            </select>
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-400 mb-1">اختيار الحساب</label>
            {accountMode === "single" ? (
              <select className="minimal-input border-r-2 border-green-600 font-bold" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">اختر حساب فرعي...</option>{subAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>
            ) : (
              <select className="minimal-input border-r-2 border-green-600 font-bold" value={mainAccountId} onChange={(e) => setMainAccountId(e.target.value)}>
                <option value="">اختر حساب رئيسي...</option>{mainAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>
            )}
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-bold text-gray-400 mb-1">الفترة</label>
            <select className="minimal-input" value={periodType} onChange={(e) => setPeriodType(e.target.value as any)}>
              <option value="day">اليوم</option><option value="month">شهر</option><option value="from_start">من البداية</option><option value="range">فترة</option>
            </select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-[10px] font-bold text-gray-400 mb-1">التاريخ</label>
            <input type="date" className="minimal-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button onClick={run} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-md h-[38px]">عرض</button>
        </div>

        {/* سطر الخيارات والبحث والتصدير */}
        <div className="mt-4 pt-3 border-t flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <button onClick={()=>setReportMode("detailed")} className={`toggle-btn ${reportMode==="detailed"?'active':''}`}>تحليلي</button>
             <button onClick={()=>setReportMode("summary")} className={`toggle-btn ${reportMode==="summary"?'active':''}`}>تجميعي</button>
             <div className="h-4 w-[1px] bg-gray-300 mx-2"></div>
             {reportMode === "detailed" ? (
               <div className="flex gap-4 items-center text-xs font-bold text-gray-500">
                 <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={detailedType === "full"} onChange={() => setDetailedType("full")} /> كشف كامل</label>
                 <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={detailedType === "no_open"} onChange={() => setDetailedType("no_open")} /> بدون رصيد سابق</label>
               </div>
             ) : (
               <select className="text-xs font-bold bg-transparent outline-none text-green-700" value={summaryType} onChange={(e)=>setSummaryType(e.target.value)}>
                  <option value="local">إجمالي العملة المحلية</option><option value="with_move">مع الحركة</option><option value="final">الأرصدة النهائية</option>
               </select>
             )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute right-2.5 top-2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="بحث..." 
                className="pr-8 pl-4 py-1.5 bg-gray-50 border rounded-lg text-xs outline-none focus:ring-1 ring-green-500 w-48 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={exportToExcel} title="تصدير إكسل" className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-100">
              <FileSpreadsheet size={18}/>
            </button>
            <button onClick={() => window.print()} title="طباعة / PDF" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-blue-100">
              <Printer size={18}/>
            </button>
          </div>
        </div>
      </div>

      {/* الجداول - تملأ العرض بالكامل */}
      <div className="w-full space-y-6">
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
              const isOp = r.account_name === "رصيد سابق" || r.is_opening;
              if (isOp) { r.balance > 0 ? tDeb += Math.abs(r.balance) : tCre += Math.abs(r.balance); }
              else { tDeb += Number(r.debit || 0); tCre += Number(r.credit || 0); }
            });

            return (
              <div key={currencyName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden page-break">
                <div className="bg-gray-800 text-white px-5 py-2 flex justify-between items-center">
                  <h3 className="font-black text-md">العملة: {currencyName}</h3>
                  <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">{reportMode === "detailed" ? 'كشف تحليلي مفصل' : 'تقرير تجميعي'}</span>
                </div>
                <table className="w-full text-[12px] text-center border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-black border-b uppercase">
                      <th className="p-3 border-l w-24">التاريخ</th>
                      <th className="p-3 border-l w-28">المستند</th>
                      <th className="p-3 border-l w-20">المرجع</th>
                      <th className="p-3 border-l text-right min-w-[150px]">الحساب</th>
                      <th className="p-3 border-l w-24">مدين</th>
                      <th className="p-3 border-l w-24">دائن</th>
                      <th className="p-3 border-l w-24">الرصيد الصافي</th>
                      <th className="p-3 border-l w-20">الحالة</th>
                      <th className="p-3 text-right">البيان والتفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.map((r: any, idx: number) => {
                      const isOp = r.account_name === "رصيد سابق" || r.is_opening;
                      return (
                        <tr key={idx} className={`hover:bg-green-50/30 transition-colors ${isOp ? "bg-blue-50/50 font-bold italic" : ""}`}>
                          <td className="p-2 border-l text-gray-400 font-mono">{isOp ? "—" : r.journal_date?.slice(0,10)}</td>
                          <td className="p-2 border-l font-bold text-gray-700">{isOp ? "رصيد افتتاحي" : (referenceTranslations[r.reference_type] || r.reference_type)}</td>
                          <td className="p-2 border-l text-gray-400">{isOp ? "—" : r.reference_id}</td>
                          <td className="p-2 border-l text-right font-black text-gray-800">{r.account_name}</td>
                          <td className="p-2 border-l text-red-600 font-bold bg-red-50/20">{isOp ? (r.balance > 0 ? Math.abs(r.balance).toLocaleString() : "0.00") : Number(r.debit).toLocaleString()}</td>
                          <td className="p-2 border-l text-green-600 font-bold bg-green-50/20">{isOp ? (r.balance < 0 ? Math.abs(r.balance).toLocaleString() : "0.00") : Number(r.credit).toLocaleString()}</td>
                          <td className="p-2 border-l font-black text-blue-900 bg-blue-50/10">{Math.abs(r.balance).toLocaleString()}</td>
                          <td className="p-2 border-l">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${r.balance > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{r.balance > 0 ? "عليه" : "له"}</span>
                          </td>
                          <td className="p-2 text-right text-gray-600 font-medium leading-relaxed max-w-[300px] break-words">
                            {r.notes || <span className="text-gray-200">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-yellow-50/80 font-black border-t-2 border-yellow-200 text-gray-800">
                    <tr>
                      <td colSpan={4} className="p-3 text-left text-sm uppercase">إجمالي الحساب (صافي):</td>
                      <td className="p-3 text-red-700 text-sm">{tDeb.toLocaleString()}</td>
                      <td className="p-3 text-green-700 text-sm">{tCre.toLocaleString()}</td>
                      <td className="p-3 text-blue-900 text-lg bg-yellow-100">{Math.abs(tDeb - tCre).toLocaleString()}</td>
                      <td className="p-3"><span className={`px-3 py-1 rounded-lg text-white text-[11px] ${tDeb - tCre > 0 ? "bg-red-600" : "bg-green-600"}`}>{tDeb - tCre > 0 ? "إجمالي عليه" : "إجمالي له"}</span></td>
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
        .minimal-input { width:100%; padding:7px 10px; border-radius:8px; border:1px solid #d1d5db; font-size:12px; outline:none; background:#fff; transition:all 0.2s; }
        .minimal-input:focus { border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,0.1); }
        .toggle-btn { padding:5px 15px; font-size:11px; font-bold; border:1px solid #e5e7eb; background:#fff; color:#6b7280; border-radius:8px; transition:all 0.2s; }
        .toggle-btn.active { background:#16a34a; color:#fff; border-color:#16a34a; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
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
