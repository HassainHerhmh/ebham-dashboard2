import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  Settings,
  Store,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  Users,
  UserCircle,
  ClipboardList,
  Megaphone,
  BarChart3,
  Wallet
} from "lucide-react";
import { hasPermission } from "../utils/permissions";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type MenuItem = {
  key: string;
  label: string;
  path: string;
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [areasOpen, setAreasOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
const [reportsOpen, setReportsOpen] = useState(false);
const [ordersOpen, setOrdersOpen] = useState(false);

  const areasGroup: MenuItem[] = [
    { key: "settings", label: "رسوم التوصيل", path: "/settings/delivery-fees" },
    { key: "neighborhoods", label: "الأحياء", path: "/neighborhoods" },
  ];

  const deliveryGroup: MenuItem[] = [
    { key: "restaurants", label: "المحلات", path: "/restaurants" },
    { key: "products", label: "المنتجات", path: "/products" },
    { key: "categories", label: "الفئات", path: "/categories" },
    { key: "units", label: "الوحدات", path: "/units" },
    { key: "types", label: "الأنواع", path: "/types" },
  ];

  const agentsGroup: MenuItem[] = [
    { key: "agents", label: "الوكلاء", path: "/agents" },
    { key: "agent_groups", label: "مجموعة الوكلاء", path: "/agents/groups" },
    { key: "captains", label: "الكباتن", path: "/captains" },
    { key: "Captain_Groups", label: "مجموعة الكباتن", path: "/CaptainGroups" },
    { key: "agent_info", label: "عمولات", path: "/agents/info" },
  ];

  const settingsGroup: MenuItem[] = [
    { key: "stores", label: "المتاجر", path: "/settings/stores" },
    { key: "payment", label: "الدفع", path: "/settings/payment" },
    { key: "currency", label: "العملات", path: "/settings/currency" },
    { key: "branches", label: "الفروع", path: "/settings/branches" },
  ];

  const canShow = (key: string) => isAdmin || hasPermission(user, key, "view");

  const isPathActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(path + "/");

  // تحسين كلاسات الروابط لدعم الوضع الليلي
  const linkBase =
    "flex items-center gap-3 rounded-lg px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200";
  const linkBaseSmall =
  "flex items-center gap-2 rounded-md px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all";

  const activeClass = "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold shadow-sm";

  return (
    <aside
      className={`fixed inset-y-0 right-0 transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } md:translate-x-0 md:static md:w-64 bg-white dark:bg-gray-800 border-l dark:border-gray-700 shadow-xl z-50 transition-all duration-300`}
    >
      <div className="h-full flex flex-col">
        {/* الهيدر الخاص بالسايدبار */}
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">لوحة الإدارة</h2>
          <button className="md:hidden text-gray-500" onClick={onClose}>✕</button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          
          {/* لوحة التحكم */}
          {canShow("dashboard") && (
            <Link to="/" onClick={onClose}
              className={`${linkBase} ${isPathActive("/") ? activeClass : ""}`}>
              <LayoutDashboard size={18} />
              <span>لوحة التحكم</span>
            </Link>
          )}

          {/* المستخدمين */}
          {canShow("users") && (
            <Link to="/users" onClick={onClose}
              className={`${linkBase} ${isPathActive("/users") ? activeClass : ""}`}>
              <Users size={18} />
              <span>المستخدمين</span>
            </Link>
          )}

          {/* العملاء */}
          {canShow("customers") && (
            <Link to="/customers" onClick={onClose}
              className={`${linkBase} ${isPathActive("/customers") ? activeClass : ""}`}>
              <UserCircle size={18} />
              <span>العملاء</span>
            </Link>
          )}
{/* الطلبات */}
{canShow("orders") && (
  <div className="space-y-1">

    {/* العنوان الرئيسي */}
    <div
      onClick={() => setOrdersOpen(!ordersOpen)}
      className={`${linkBase} cursor-pointer flex items-center justify-between`}
    >
      <div className="flex items-center gap-2">
        <ClipboardList size={18} />
        <span>الطلبات</span>
      </div>

      {/* السهم */}
      {ordersOpen ? (
        <ChevronUp size={18} />
      ) : (
        <ChevronDown size={18} />
      )}
    </div>

    {/* العناصر الفرعية */}
    {ordersOpen && (
      <div className="ml-6 space-y-1">

        {/* كل الطلبات */}
        <Link
          to="/orders"
          onClick={onClose}
          className={`${linkBaseSmall} ${
            isPathActive("/orders") ? activeClass : ""
          }`}
        >
          📋 كل الطلبات
        </Link>

        {/* طلبات وصل لي */}
        <Link
          to="/orders/wassel"
          onClick={onClose}
          className={`${linkBaseSmall} ${
            isPathActive("/orders/wassel") ? activeClass : ""
          }`}
        >
          📦 طلبات وصل لي
        </Link>

        {/* طلبات يدوية */}
        <Link
          to="/orders/manual"
          onClick={onClose}
          className={`${linkBaseSmall} ${
            isPathActive("/orders/manual") ? activeClass : ""
          }`}
        >
          ✍️ طلبات يدوية
        </Link>

      </div>
    )}

  </div>
)}



          {/* التسويق */}
          {canShow("marketing") && (
            <Link to="/marketing" onClick={onClose}
              className={`${linkBase} ${isPathActive("/marketing") ? activeClass : ""}`}>
              <Megaphone size={18} />
              <span>التسويق</span>
            </Link>
          )}

         {/* التقارير */}
{canShow("reports") && (
  <div className="space-y-1">

    {/* العنوان الرئيسي */}
    <div
      className={`${linkBase} cursor-pointer flex items-center justify-between`}
    >
      <div className="flex items-center gap-2">
        <BarChart3 size={18} />
        <span>التقارير</span>
      </div>
    </div>

    {/* العناصر الفرعية */}
    <div className="ml-6 space-y-1">

      {/* تقرير العمولات */}
      <Link
        to="/reports/commissions"
        onClick={onClose}
        className={`${linkBaseSmall} ${
          isPathActive("/reports/commissions") ? activeClass : ""
        }`}
      >
        📊 تقرير العمولات
      </Link>

      {/* لاحقًا تضيف هنا تقارير ثانية */}
      {/* 
      <Link to="/reports/sales">تقرير المبيعات</Link> 
      */}

    </div>
  </div>
)}


          {/* القوائم المنسدلة */}
          
          {/* إعدادات التوصيل */}
          {(isAdmin || areasGroup.some(i => canShow(i.key))) && (
            <div className="py-1">
              <div
                className="rounded-lg px-4 py-2.5 cursor-pointer flex justify-between items-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setAreasOpen(!areasOpen)}
              >
                <span className="font-semibold">إعدادات التوصيل</span>
                {areasOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              </div>
              {areasOpen && (
                <div className="mr-4 mt-1 border-r-2 border-gray-100 dark:border-gray-700 space-y-1">
                  {areasGroup.map(i => canShow(i.key) && (
                    <Link key={i.key} to={i.path} onClick={onClose}
                      className={`${linkBase} mr-2 py-2 text-sm ${isPathActive(i.path) ? activeClass : ""}`}>
                      {i.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* تهيئة المحلات */}
          {(isAdmin || deliveryGroup.some(i => canShow(i.key))) && (
            <div className="py-1">
              <div
                className="rounded-lg px-4 py-2.5 cursor-pointer flex justify-between items-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setDeliveryOpen(!deliveryOpen)}
              >
                <span className="font-semibold">تهيئة المحلات</span>
                {deliveryOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              </div>
              {deliveryOpen && (
                <div className="mr-4 mt-1 border-r-2 border-gray-100 dark:border-gray-700 space-y-1">
                  {deliveryGroup.map(i => canShow(i.key) && (
                    <Link key={i.key} to={i.path} onClick={onClose}
                      className={`${linkBase} mr-2 py-2 text-sm ${isPathActive(i.path) ? activeClass : ""}`}>
                      {i.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* الوكلاء */}
          {(isAdmin || agentsGroup.some(i => canShow(i.key))) && (
            <div className="py-1">
              <div
                className="rounded-lg px-4 py-2.5 cursor-pointer flex justify-between items-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setAgentsOpen(!agentsOpen)}
              >
                <span className="font-semibold">تهيئة الوكلاء/الكباتن</span>
                {agentsOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              </div>
              {agentsOpen && (
                <div className="mr-4 mt-1 border-r-2 border-gray-100 dark:border-gray-700 space-y-1">
                  {agentsGroup.map(i => canShow(i.key) && (
                    <Link key={i.key} to={i.path} onClick={onClose}
                      className={`${linkBase} mr-2 py-2 text-sm ${isPathActive(i.path) ? activeClass : ""}`}>
                      {i.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* الإعدادات */}
          {(isAdmin || settingsGroup.some(i => canShow(i.key))) && (
            <div className="py-1">
              <div
                className="rounded-lg px-4 py-2.5 cursor-pointer flex justify-between items-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Settings size={18} /> الإعدادات
                </span>
                {settingsOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              </div>
              {settingsOpen && (
                <div className="mr-4 mt-1 border-r-2 border-gray-100 dark:border-gray-700 space-y-1">
                  {settingsGroup.map(i => canShow(i.key) && (
                    <Link key={i.key} to={i.path} onClick={onClose}
                      className={`${linkBase} mr-2 py-2 text-sm ${isPathActive(i.path) ? activeClass : ""}`}>
                      {i.key === "stores" && <Store size={14} />}
                      {i.key === "payment" && <CreditCard size={14} />}
                      {i.key === "currency" && <DollarSign size={14} />}
                      <span>{i.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* الحسابات */}
          {canShow("accounts") && (
            <Link to="/accounts" onClick={onClose}
              className={`${linkBase} ${isPathActive("/accounts") ? activeClass : ""}`}>
              <Wallet size={18} />
              <span>الحسابات</span>
            </Link>
          )}

        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
