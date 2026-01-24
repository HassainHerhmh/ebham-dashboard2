import React, { useEffect, useState } from "react";
import { Menu, Bell, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

interface HeaderProps {
  onMenuClick: () => void;
}

interface Branch {
  id: number;
  name: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<number | null>(null);

  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdminGeneral = Boolean(user?.is_admin_branch);


  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("branch_id");
    window.dispatchEvent(new Event("storage"));
    navigate("/login", { replace: true });
  };

 const fetchBranches = async () => {
  try {
    if (!isAdminGeneral) {
      if (user?.branch_id) {
        setCurrentBranch(user.branch_id);
        localStorage.setItem("branch_id", String(user.branch_id));
      }
      setBranches([]); // تأكيد أنها مصفوفة
      return;
    }

    const res = await api.get("/branches");

    const list = Array.isArray(res.data?.branches)
      ? res.data.branches
      : [];

    setBranches(list);

    const saved = localStorage.getItem("branch_id");

    if (saved) {
      setCurrentBranch(Number(saved));
    } else if (user?.branch_id) {
      setCurrentBranch(user.branch_id);
      localStorage.setItem("branch_id", String(user.branch_id));
    }
  } catch (err) {
    console.error("خطأ في جلب الفروع:", err);
    setBranches([]); // أمان إضافي
  }
};


  useEffect(() => {
    fetchBranches();
  }, []);

  const handleChangeBranch = (id: number) => {
    setCurrentBranch(id);
    localStorage.setItem("branch_id", String(id));
    window.location.reload();
  };

  return (
    <header className="bg-white shadow-md px-6 py-4 flex items-center justify-between relative">
      <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-gray-100">
        <Menu size={24} className="text-gray-600" />
      </button>

      <div className="flex items-center gap-4">
        {/* الفرع */}
        {isAdminGeneral ? (
          branches.length > 0 && (
            <select
              value={currentBranch ?? ""}
              onChange={(e) => handleChangeBranch(Number(e.target.value))}
              className="border rounded px-3 py-1 text-sm bg-white"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {/* زر تشغيل/إيقاف الوضع الليلي */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={darkMode ? "تفعيل الوضع المضيء" : "تفعيل الوضع الليلي"}
        >
          {darkMode ? (
            <SunIcon className="h-6 w-6 text-yellow-500" />
          ) : (
            <MoonIcon className="h-6 w-6 text-gray-600" />
          )}
        </button>
          )
        ) : (
          user?.branch_name && (
            <div className="px-3 py-1 text-sm border rounded bg-gray-50 text-gray-700">
              {user.branch_name}
            </div>
          )
        )}

        <Bell size={20} className="text-gray-600" />

        <div className="relative">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || "مستخدم"}
              </p>
              <p className="text-xs text-gray-500">
                {isAdminGeneral ? "مدير النظام" : "موظف"}
              </p>
            </div>
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          </div>

          {menuOpen && (
            <div className="absolute left-0 mt-3 w-40 bg-white border rounded-lg shadow-lg z-50 text-right">
              <button
                onClick={handleLogout}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <span>تسجيل خروج</span>
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
