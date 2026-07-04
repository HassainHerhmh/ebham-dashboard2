import { Outlet, NavLink, Navigate, useLocation } from "react-router-dom";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  BookOpen,
  RefreshCcw,
} from "lucide-react";

const Operations = () => {
  const location = useLocation();

  if (location.pathname.endsWith("/operations")) {
    return <Navigate to="receipt-voucher" replace />;
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition
     ${
       isActive
         ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
         : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
     }`;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded shadow px-4 py-3 flex flex-wrap gap-4">
        <NavLink to="receipt-voucher" className={linkClass}>
          <ArrowUpCircle size={18} />
          سند قبض
        </NavLink>

        <NavLink to="payment-voucher" className={linkClass}>
          <ArrowDownCircle size={18} />
          سند صرف
        </NavLink>

        <NavLink to="journal-entry" className={linkClass}>
          <BookOpen size={18} />
          قيد يومي
        </NavLink>

        <NavLink to="currency-exchange" className={linkClass}>
          <RefreshCcw size={18} />
          مصارفة عملة
        </NavLink>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 min-h-[300px]">
        <Outlet />
      </div>
    </div>
  );
};

export default Operations;
