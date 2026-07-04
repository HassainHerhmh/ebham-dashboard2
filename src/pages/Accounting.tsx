import { Link, Outlet, useLocation } from "react-router-dom";
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
} from "lucide-react";

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

  // ⭐ الجديد
  { label: "الحسابات الوسيطة", path: "setup/transit-accounts", icon: Shuffle },
];

const Accounting = () => {
  const location = useLocation();

  const isSetup = location.pathname.includes("/accounts/setup");
  const isOperations = location.pathname.includes("/accounts/operations");
  const isReports = location.pathname.includes("/accounts/reports");

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الحسابات</h1>

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

        <span className="text-gray-400 dark:text-gray-500">إدارة الترحيلات</span>
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

      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 min-h-[300px]">
        <Outlet />
      </div>
    </div>
  );
};

export default Accounting;
