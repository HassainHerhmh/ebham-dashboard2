import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
ChevronDown,
ChevronLeft,
ChevronUp,
Settings,
CreditCard,
DollarSign,
GitBranch,
LayoutDashboard,
Users,
UserCircle,
ShieldCheck,
ClipboardList,
Megaphone,
BarChart3,
Wallet,
MapPin,
Truck,
Briefcase
} from "lucide-react";
import { hasPermission, normalizeRole } from "../utils/permissions";

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

const isAdmin =
normalizeRole(user?.role) === "admin" ||
user?.is_admin === true ||
user?.is_admin === 1 ||
user?.is_admin_branch === true ||
user?.is_admin_branch === 1;

const [collapsed,setCollapsed] = useState(false);

const [areasOpen,setAreasOpen] = useState(false);
const [deliveryOpen,setDeliveryOpen] = useState(false);
const [agentsOpen,setAgentsOpen] = useState(false);
const [settingsOpen,setSettingsOpen] = useState(false);
const [reportsOpen,setReportsOpen] = useState(false);
const [ordersOpen,setOrdersOpen] = useState(false);
const [marketingOpen, setMarketingOpen] = useState(false);

const areasGroup: MenuItem[] = [
{ key:"settings", label:"رسوم التوصيل", path:"/settings/delivery-fees" },
{ key:"neighborhoods", label:"الأحياء", path:"/neighborhoods" },
];

const deliveryGroup: MenuItem[] = [
{ key:"restaurants", label:"المحلات", path:"/restaurants" },
{ key:"products", label:"المنتجات", path:"/products" },
{ key:"categories", label:"الفئات", path:"/categories" },
{ key:"units", label:"الوحدات", path:"/units" },
{ key:"types", label:"الأنواع", path:"/types" },
];

const agentsGroup: MenuItem[] = [
{ key:"agents", label:"الوكلاء", path:"/agents" },
{ key:"agent_groups", label:"مجموعة الوكلاء", path:"/agents/groups" },
{ key:"captains", label:"الكباتن", path:"/captains" },
{ key:"Captain_Groups", label:"مجموعة الكباتن", path:"/CaptainGroups" },
{ key:"agent_info", label:"عمولات", path:"/agents/info" },
];

const settingsGroup: MenuItem[] = [
{ key:"payment", label:"الدفع", path:"/settings/payment" },
{ key:"currency", label:"العملات", path:"/settings/currency" },
{ key:"branches", label:"الفروع", path:"/settings/branches" },
];

const canShow = (key:string)=> isAdmin || hasPermission(user,key,"view");

const isPathActive = (path:string)=>{
return location.pathname === path;
};

const linkBase =
`flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all`;

const linkBaseSmall =
`flex items-center ${collapsed ? "justify-center" : "gap-2"} rounded-md px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all`;

const activeClass =
"bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold shadow-sm";

return (

<aside
className={`fixed inset-y-0 right-0 transform ${
isOpen ? "translate-x-0" : "translate-x-full"
} md:translate-x-0 md:sticky md:top-0 ${
collapsed ? "w-20 md:w-20" : "w-64 md:w-64"
} h-screen max-h-screen overflow-hidden bg-white dark:bg-gray-800 border-l dark:border-gray-700 shadow-xl z-50 transition-all duration-300`}
>

<div className="h-full flex flex-col">

{/* header */}

<div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">

{!collapsed && (

<h2 className="text-xl font-bold text-gray-800 dark:text-white">
لوحة الإدارة
</h2>
)}

<button
onClick={()=>setCollapsed(!collapsed)}
className="text-gray-500 hover:text-gray-700"

>

☰</button>

</div>

<nav className="flex-1 overflow-y-auto p-4 pb-8 space-y-1 custom-scrollbar overscroll-contain">

{/* dashboard */}

{canShow("dashboard") && (

<Link
to="/"
onClick={onClose}
className={`${linkBase} ${isPathActive("/") ? activeClass : ""}`}
>
<LayoutDashboard size={18}/>
{!collapsed && <span>لوحة التحكم</span>}
</Link>
)}

{/* users */}

{canShow("users") && (

<div className="space-y-1">
<Link
to="/users"
onClick={onClose}
className={`${linkBase} ${isPathActive("/users") ? activeClass : ""}`}
>
<Users size={18}/>
{!collapsed && <span>المستخدمين</span>}
</Link>

{!collapsed && (
<Link
to="/users/permissions"
onClick={onClose}
className={`${linkBaseSmall} mr-4 ${isPathActive("/users/permissions") ? activeClass : ""}`}
>
<ShieldCheck size={16}/>
<span>الصلاحيات</span>
</Link>
)}
</div>
)}

{/* customers */}

{canShow("customers") && (

<Link
to="/customers"
onClick={onClose}
className={`${linkBase} ${isPathActive("/customers") ? activeClass : ""}`}
>
<UserCircle size={18}/>
{!collapsed && <span>العملاء</span>}
</Link>
)}

{/* orders */}

{(canShow("orders") || canShow("wassel_orders") || canShow("manual_orders")) && (

<div className="space-y-1">

<div
onClick={()=>setOrdersOpen(!ordersOpen)}
className={`${linkBase} cursor-pointer flex items-center justify-between`}
>

<div className="flex items-center gap-2">
<ClipboardList size={18}/>
{!collapsed && <span>الطلبات</span>}
</div>

{!collapsed &&
(ordersOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>)
}

</div>

{ordersOpen && !collapsed && (

<div className="ml-6 space-y-1">

{canShow("orders") && (
<Link
to="/orders"
onClick={onClose}
className={`${linkBaseSmall} ${isPathActive("/orders") ? activeClass : ""}`}
>
📋 كل الطلبات
</Link>
)}

{canShow("wassel_orders") && (
<Link
to="/orders/wassel"
onClick={onClose}
className={`${linkBaseSmall} ${isPathActive("/orders/wassel") ? activeClass : ""}`}
>
📦 طلبات وصل لي
</Link>
)}

{canShow("manual_orders") && (
<Link
to="/orders/manual"
onClick={onClose}
className={`${linkBaseSmall} ${isPathActive("/orders/manual") ? activeClass : ""}`}
>
✍️ طلبات يدوية
</Link>
)}

</div>
)}

</div>
)}

{/* marketing */}

{(canShow("marketing") || canShow("loyalty")) && (

<div className="space-y-1">

  <div
    onClick={() => setMarketingOpen(!marketingOpen)}
    className={`${linkBase} cursor-pointer flex items-center justify-between`}
  >

    <div className="flex items-center gap-2">
      <Megaphone size={18}/>
      {!collapsed && <span>التسويق</span>}
    </div>

    {!collapsed &&
      (marketingOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>)
    }

  </div>

  {marketingOpen && !collapsed && (

    <div className="ml-6 space-y-1">

      <Link
        to="/marketing"
        onClick={onClose}
        className={`${linkBaseSmall} ${isPathActive("/marketing") ? activeClass : ""}`}
      >
        📢 إعلانات وعروض
      </Link>

      {canShow("loyalty") && (
      <Link
        to="/loyalty"
        onClick={onClose}
        className={`${linkBaseSmall} ${isPathActive("/loyalty") ? activeClass : ""}`}
      >
        ⭐ نقاط الولاء
      </Link>
      )}

    </div>

  )}

</div>

)}

{/* reports */}

{(canShow("reports") || canShow("commission_reports") || canShow("agent_reports") || canShow("captain_reports")) && (

<div className="space-y-1">

<div
className={`${linkBase} cursor-pointer flex items-center justify-between`}
onClick={()=>setReportsOpen(!reportsOpen)}
>

<div className="flex items-center gap-2">
<BarChart3 size={18}/>
{!collapsed && <span>التقارير</span>}
</div>

{!collapsed &&
(reportsOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>)
}

</div>

{reportsOpen && !collapsed && (

<div className="ml-6 space-y-1">

{canShow("reports") && (
<Link
to="/reports"
onClick={onClose}
className={`${linkBaseSmall} ${isPathActive("/reports") && !isPathActive("/reports/commissions") ? activeClass : ""}`}
>
📊 تقرير العمليات
</Link>
)}

{canShow("commission_reports") && (
<Link
to="/reports/commissions"
onClick={onClose}
className={`${linkBaseSmall} ${isPathActive("/reports/commissions") ? activeClass : ""}`}
>
📑 تقرير العمولات
</Link>
)}

{canShow("agent_reports") && (
<Link
to="/reports/agents"
onClick={onClose}
className={`${linkBaseSmall} ${isPathActive("/reports/agents") ? activeClass : ""}`}
>
🧾 تقارير الوكلاء
</Link>
)}

{canShow("captain_reports") && (
<Link
to="/reports/captains"
onClick={onClose}
className={`${linkBaseSmall} ${isPathActive("/reports/captains") ? activeClass : ""}`}
>
🛵 تقارير الكباتن
</Link>
)}

</div>
)}

</div>
)}

{/* ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„طھظˆطµظٹظ„ */}

{(isAdmin || areasGroup.some(i=>canShow(i.key))) && (

<div className="py-1">

<div
className={`${linkBase} cursor-pointer flex justify-between`}
onClick={()=>setAreasOpen(!areasOpen)}
>

<span className="flex items-center gap-2"><MapPin size={18}/>{!collapsed && "إعدادات التوصيل"}</span>

{!collapsed &&
(areasOpen ? <ChevronDown size={16}/> : <ChevronLeft size={16}/>)
}

</div>

{areasOpen && !collapsed && (

<div className="mr-4 mt-1 border-r-2 border-gray-100 dark:border-gray-700 space-y-1">

{areasGroup.map(i=>canShow(i.key) && (

<Link
key={i.key}
to={i.path}
onClick={onClose}
className={`${linkBase} mr-2 py-2 text-sm ${isPathActive(i.path) ? activeClass : ""}`}
>
{i.label}
</Link>
))}

</div>
)}

</div>
)}

{/* طھظ‡ظٹط¦ط© ط§ظ„ظ…ط­ظ„ط§طھ */}

{(isAdmin || deliveryGroup.some(i=>canShow(i.key))) && (

<div className="py-1">

<div
className={`${linkBase} cursor-pointer flex justify-between`}
onClick={()=>setDeliveryOpen(!deliveryOpen)}
>

<span className="flex items-center gap-2"><Truck size={18}/>{!collapsed && "تهيئة المحلات"}</span>

{!collapsed &&
(deliveryOpen ? <ChevronDown size={16}/> : <ChevronLeft size={16}/>)
}

</div>

{deliveryOpen && !collapsed && (

<div className="mr-4 mt-1 border-r-2 border-gray-100 dark:border-gray-700 space-y-1">

{deliveryGroup.map(i=>canShow(i.key) && (

<Link
key={i.key}
to={i.path}
onClick={onClose}
className={`${linkBase} mr-2 py-2 text-sm ${isPathActive(i.path) ? activeClass : ""}`}
>
{i.label}
</Link>
))}

</div>
)}

</div>
)}

{/* ط§ظ„ظˆظƒظ„ط§ط، */}

{(isAdmin || agentsGroup.some(i=>canShow(i.key))) && (

<div className="py-1">

<div
className={`${linkBase} cursor-pointer flex justify-between`}
onClick={()=>setAgentsOpen(!agentsOpen)}
>

<span className="flex items-center gap-2"><Briefcase size={18}/>{!collapsed && "تهيئة الوكلاء/الكباتن"}</span>

{!collapsed &&
(agentsOpen ? <ChevronDown size={16}/> : <ChevronLeft size={16}/>)
}

</div>

{agentsOpen && !collapsed && (

<div className="mr-4 mt-1 border-r-2 border-gray-100 dark:border-gray-700 space-y-1">

{agentsGroup.map(i=>canShow(i.key) && (

<Link
key={i.key}
to={i.path}
onClick={onClose}
className={`${linkBase} mr-2 py-2 text-sm ${isPathActive(i.path) ? activeClass : ""}`}
>
{i.label}
</Link>
))}

</div>
)}

</div>
)}

{/* ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ */}

{(isAdmin || settingsGroup.some(i=>canShow(i.key))) && (

<div className="py-1">

<div
className={`${linkBase} cursor-pointer flex justify-between`}
onClick={()=>setSettingsOpen(!settingsOpen)}
>

<span className="flex items-center gap-2">
<Settings size={18}/>
{!collapsed && "الإعدادات"}
</span>

{!collapsed &&
(settingsOpen ? <ChevronDown size={16}/> : <ChevronLeft size={16}/>)
}

</div>

{settingsOpen && !collapsed && (

<div className="mr-4 mt-1 border-r-2 border-gray-100 dark:border-gray-700 space-y-1">

{settingsGroup.map(i=>canShow(i.key) && (

<Link
key={i.key}
to={i.path}
onClick={onClose}
className={`${linkBase} mr-2 py-2 text-sm ${isPathActive(i.path) ? activeClass : ""}`}
>
{i.key==="payment" && <CreditCard size={14}/>}
{i.key==="currency" && <DollarSign size={14}/>}
{i.key==="branches" && <GitBranch size={14}/>}
<span>{i.label}</span>
</Link>
))}

</div>
)}

</div>
)}

{/* ط§ظ„ط­ط³ط§ط¨ط§طھ */}

{canShow("accounts") && (

<Link
to="/accounts"
onClick={onClose}
className={`${linkBase} ${isPathActive("/accounts") ? activeClass : ""}`}
>
<Wallet size={18}/>
{!collapsed && <span>الحسابات</span>}
</Link>
)}

</nav>

</div>

</aside>

);

};

export default Sidebar;

