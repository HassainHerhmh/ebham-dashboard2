import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Repeat,
  ClipboardList,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Layers,
  Landmark,
  Building2,
  Users,
  ShieldCheck,
  Shuffle,
  Bell,
} from "lucide-react";
import api from "../services/api";

const setupTabs = [
  { label: "دليل الحسابات", path: "setup/accounts", icon: BookOpen },
  { label: "العملات", path: "setup/currencies", icon: Repeat },
  { label: "أنواع قيود اليومية", path: "setup/journal-types", icon: ClipboardList },
  { label: "أنواع سندات القبض", path: "setup/receipt-types", icon: ArrowUpCircle },
  { label: "أنواع سندات الصرف", path: "setup/payment-types", icon: ArrowDownCircle },
  { label: "الصناديق النقدية", path: "setup/cash-boxes", icon: Wallet },
  { label: "مجموعات الصناديق", path: "setup/cash-box-groups", icon: Layers },
  { label: "دليل البنوك", path: "setup/banks", icon: Landmark },
  { label: "مجموعة البنوك", path: "setup/bank-groups", icon: Building2 },
  { label: "مجموعة الحسابات", path: "setup/account-groups", icon: Users },
  { label: "تسقيف الحسابات", path: "setup/account-ceiling", icon: ShieldCheck },
  { label: "الحسابات الوسيطة", path: "setup/transit-accounts", icon: Shuffle },
];

const Accounting = () => {
  const location = useLocation();
  const [failedCount, setFailedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [latestReason, setLatestReason] = useState("");

  const isSetup = location.pathname.includes("/accounts/setup");
  const isOperations = location.pathname.includes("/accounts/operations");
  const isReports = location.pathname.includes("/accounts/reports");
  const isAlerts = location.pathname.includes("/accounts/journal-alerts");

  const loadAlerts = async () => {
    try {
      const res = await (api as any).journalPosting.getAll();
      setFailedCount(Number(res?.counts?.failed || 0));
      setPendingCount(Number(res?.counts?.pending || 0));
      const failed = (res?.list || []).find((row: any) => row.status === "failed");
      setLatestReason(failed?.error_message || "");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAlerts();
    const timer = window.setInterval(loadAlerts, 20000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الحسابات</h1>

      {(failedCount > 0 || pendingCount > 0) && (
        <Link
          to="/accounts/journal-alerts"
          className={`block rounded-lg border p-4 ${
            failedCount
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}
        >
          <div className="font-bold">
            {failedCount
              ? `${failedCount} قيد فشل ترحيله`
              : `${pendingCount} قيد بانتظار الترحيل`}
          </div>
          {latestReason ? (
            <div className="mt-1 text-sm">السبب: {latestReason}</div>
          ) : null}
          <div className="mt-1 text-sm">
            بعد حل السبب تُعالج القيود تلقائياً. اضغط لعرض التفاصيل.
          </div>
        </Link>
      )}

      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700 pb-2 text-sm font-semibold">
        <Link
          to="/accounts/setup/accounts"
          className={
            isSetup
              ? "text-green-700 dark:text-green-400 border-b-2 border-green-700 dark:border-green-400 pb-1"
              : "text-gray-400 dark:text-gray-500"
          }
        >
          التهيئة
        </Link>

        <Link
          to="/accounts/operations/receipt-voucher"
          className={
            isOperations
              ? "text-green-700 dark:text-green-400 border-b-2 border-green-700 dark:border-green-400 pb-1"
              : "text-gray-400 dark:text-gray-500"
          }
        >
          العمليات
        </Link>

        <Link
          to="/accounts/reports/account-statement"
          className={
            isReports
              ? "text-green-700 dark:text-green-400 border-b-2 border-green-700 dark:border-green-400 pb-1"
              : "text-gray-400 dark:text-gray-500"
          }
        >
          التقارير
        </Link>

        <Link
          to="/accounts/journal-alerts"
          className={
            isAlerts
              ? "text-green-700 dark:text-green-400 border-b-2 border-green-700 dark:border-green-400 pb-1"
              : "text-gray-400 dark:text-gray-500"
          }
        >
          إشعارات القيود
          {failedCount > 0 ? (
            <span className="mr-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
              {failedCount}
            </span>
          ) : null}
        </Link>
      </div>

      {isSetup && (
        <div className="bg-white dark:bg-gray-800 rounded shadow px-4 py-3 flex flex-wrap gap-4">
          {setupTabs.map((tab) => {
            const Icon = tab.icon;
            const active = location.pathname.endsWith(tab.path);

            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition
                  ${
                    active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
              >
                <Icon size={18} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}

      {isAlerts && (
        <div className="bg-white dark:bg-gray-800 rounded shadow px-4 py-3 flex items-center gap-2 text-green-700">
          <Bell size={18} />
          <span className="text-sm font-semibold">متابعة ترحيل قيود الطلبات</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 min-h-[300px]">
        <Outlet />
      </div>
    </div>
  );
};

export default Accounting;
