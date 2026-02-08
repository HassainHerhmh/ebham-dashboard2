import React, { useEffect, useState } from "react";
import api from "../../services/api";
import * as XLSX from 'xlsx';
import { Search, FileSpreadsheet, Printer, ArrowLeftRight } from "lucide-react";

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
    'receipt': 'سند قبض', 'opening': 'رصيد افتتاحي', 'wassel_order': 'طلب وصل لي',
    'ceiling': 'سند تسقيف حساب'
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

  const formatYemenDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Aden' }).format(new Date(dateStr));
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0f172a] text-right p-4 transition-colors duration-300" dir="rtl">
      
      {/* 🟢 رأس الصفحة والأدوات */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-[#1e293b] p-4 rounded-2xl shadow-sm border-r-4 border-green-600 mb-6 no-print gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">كشف الحساب المرن</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase">الفرع الرئيسي - اليمن</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="بحث في الحسابات أو الملاحظات..." 
              className="pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 ring-green-500/20 dark:text-white w-64 md:w-80 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => window.print()} title="طباعة" className="icon-btn text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <Printer size={20}/>
          </button>
          <button onClick={run} className="px-6 py-2 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-900/20">تحديث البيانات</button>
        </div>
      </div>

      {/* 🟢 منطقة الفلاتر والخيارات */}
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl shadow-sm border dark:border-gray-800 no-print grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <select className="smart-select" value={accountMode} onChange={(e) => setAccountMode(e.target.value as any)}>
            <option value="single">حساب منفرد</option><option value="all">كافة الحسابات</option>
          </select>
          
          <div className="md:col-span-2">
            {accountMode === "single" ? (
              <select className="smart-select border-r-4 border-green-600 font-bold" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">-- اختر الحساب الفرعي --</option>{subAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>
            ) : (
              <select className="smart-select border-r-4 border-green-600 font-bold" value={mainAccountId} onChange={(e) => setMainAccountId(e.target.value)}>
                <option value="">-- اختر الحساب الرئيسي --</option>{mainAccounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>
            )}
          </div>

          <select className="smart-select" value={periodType} onChange={(e) => setPeriodType(e.target.value as any)}>
            <option value="day">خلال اليوم</option><option value="month">خلال الشهر</option><option value="from_start">من البداية</option><option value="range">فترة مخصصة</option>
          </select>
          
          <input type="date" className="smart-select" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {/* 🟢 عرض الجداول الممتدة */}
      <div className="w-full space-y-8">
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
              else { tDeb += Number(r.debit || 0); tCredit: tCre += Number(r.credit || 0); }
            });

            return (
              <div key={currencyName} className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border dark:border-gray-800 overflow-hidden">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center border-b dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <span className="bg-green-600 px-3 py-1 rounded-md text-xs font-black uppercase">العملة</span>
                    <h3 className="font-black text-xl tracking-wide">{currencyName}</h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="bg-slate-700 px-3 py-1 rounded-md text-[10px] font-bold">عدد الحركات: {list.length}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center table-fixed border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-black border-b dark:border-gray-700 text-[11px] uppercase tracking-wider">
                        <th className="p-4 w-[110px] border-l dark:border-gray-800">التاريخ</th>
                        <th className="p-4 w-[130px] border-l dark:border-gray-800">نوع المستند</th>
                        <th className="p-4 w-[90px] border-l dark:border-gray-800 text-center">المرجع</th>
                        <th className="p-4 w-[180px] border-l dark:border-gray-800 text-right">الحساب</th>
                        <th className="p-4 w-[120px] border-l dark:border-gray-800">مدين</th>
                        <th className="p-4 w-[120px] border-l dark:border-gray-800">دائن</th>
                        <th className="p-4 w-[130px] border-l dark:border-gray-800">الرصيد</th>
                        <th className="p-4 w-[100px] border-l dark:border-gray-800">الحالة</th>
                        <th className="p-4 text-right">البيان (تفاصيل العملية)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                      {list.map((r: any, idx: number) => {
                        const isOp = r.account_name === "رصيد سابق" || r.is_opening;
                        return (
                          <tr key={idx} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${isOp ? "bg-blue-50/30 dark:bg-blue-900/10 font-bold" : ""}`}>
                            <td className="p-3 border-l dark:border-gray-800 text-slate-400 font-mono text-[10px]">{isOp ? "—" : r.journal_date?.slice(0,10)}</td>
                            <td className="p-3 border-l dark:border-gray-800 font-bold text-slate-600 dark:text-slate-400">{isOp ? "رصيد افتتاحي" : (referenceTranslations[r.reference_type] || r.reference_type)}</td>
                            <td className="p-3 border-l dark:border-gray-800 text-slate-400 font-black">{isOp ? "—" : r.reference_id}</td>
                            <td className="p-3 border-l dark:border-gray-800 text-right font-black text-slate-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis">{r.account_name}</td>
                            <td className="p-3 border-l dark:border-gray-800 text-rose-600 font-black bg-rose-50/20 dark:bg-rose-900/10">{isOp ? (r.balance > 0 ? Math.abs(r.balance).toLocaleString() : "0.00") : Number(r.debit).toLocaleString()}</td>
                            <td className="p-3 border-l dark:border-gray-800 text-emerald-600 font-black bg-emerald-50/20 dark:bg-emerald-900/10">{isOp ? (r.balance < 0 ? Math.abs(r.balance).toLocaleString() : "0.00") : Number(r.credit).toLocaleString()}</td>
                            <td className="p-3 border-l dark:border-gray-800 font-black text-slate-900 dark:text-blue-400 bg-slate-50/50 dark:bg-slate-900/50">{Math.abs(r.balance).toLocaleString()}</td>
                            <td className="p-3 border-l dark:border-gray-800 text-[10px]">
                              <span className={`px-3 py-1 rounded-md font-black shadow-sm ${r.balance > 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40"}`}>{r.balance > 0 ? "عليه" : "له"}</span>
                            </td>
                            {/* عمود البيان: مرن يمتد تلقائياً */}
                            <td className="p-3 text-right text-slate-600 dark:text-slate-400 font-medium leading-relaxed break-words min-w-[250px]">
                              {r.notes || <span className="opacity-20 italic">لا توجد تفاصيل إضافية</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-black border-t-4 border-green-600">
                      <tr>
                        <td colSpan={4} className="p-4 text-left text-xs uppercase tracking-widest text-slate-400">إجمالي الرصيد الصافي للعملة الحالية</td>
                        <td className="p-4 text-rose-400 text-md">{tDeb.toLocaleString()}</td>
                        <td className="p-4 text-emerald-400 text-md">{tCre.toLocaleString()}</td>
                        <td className="p-4 text-blue-400 text-xl bg-slate-800 shadow-inner">{Math.abs(tDeb - tCre).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-4 py-1 rounded-md text-[10px] ${tDeb - tCre > 0 ? "bg-rose-600" : "bg-emerald-600"}`}>{tDeb - tCre > 0 ? "مدين نهائي" : "دائن نهائي"}</span>
                        </td>
                        <td className="p-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          });
        })()}
      </div>

      <style>{`
        .smart-select { width:100%; padding:10px 14px; border-radius:12px; border:1px solid #e2e8f0; font-size:13px; font-weight:600; outline:none; background:#fff; transition:all 0.2s ease; color:#1e293b; }
        .smart-select:focus { border-color:#16a34a; box-shadow:0 0 0 4px rgba(22, 163, 74, 0.1); }
        .dark .smart-select { background:#1e293b; border-color:#334155; color:#f8fafc; }
        
        .icon-btn { p:2.5; border-radius:12px; border:1px solid transparent; transition:all 0.2s; display:flex; align-items:center; justify-content:center; }
        .icon-btn:hover { transform:translateY(-2px); box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); }

        @media print { 
          .no-print { display:none !important; } 
          body { background:#fff !important; }
          .shadow-xl, .shadow-sm { box-shadow:none !important; }
          .rounded-2xl { border-radius:0 !important; }
          table { width:100% !important; page-break-inside:auto; }
          tr { page-break-inside:avoid; page-break-after:auto; }
        }
      `}</style>
    </div>
  );
};

export default AccountStatement;
