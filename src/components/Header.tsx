import React, { useEffect, useState } from "react";
import { Menu, Bell, User, LogOut, Sun, Moon } from "lucide-react";
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

  // --- منطق الوضع الليلي ---
  const [darkMode, setDarkMode] = useState<boolean>(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);
  // -----------------------

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
        setBranches([]);
        return;
      }

      const res = await api.get("/branches");
      const list = Array.isArray(res.data?.branches) ? res.data.branches : [];
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
      setBranches([]);
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
    <header className="bg-white dark:bg-gray-800 shadow-md px-6 py-4 flex items-center justify-between relative transition-colors duration-300">
      <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
        <Menu size={24} className="text-gray-600 dark:text-gray-300" />
      </button>

      <div className="flex items-center gap-4">
        {/* زر التبديل بين الوضع الليلي والمضيء */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          title={darkMode ? "الوضع المضيء" : "الوضع الليلي"}
        >
          {darkMode ? (
            <Sun size={20} className="text-yellow-500" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </button>

        {/* اختيار الفرع أو عرضه */}
        {isAdminGeneral ? (
          branches.length > 0 && (
            <select
              value={currentBranch ?? ""}
              onChange={(e) => handleChangeBranch(Number(e.target.value))}
              className="border rounded px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )
        ) : (
          user?.branch_name && (
            <div className="px-3 py-1 text-sm border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
              {user.branch_name}
            </div>
          )
        )}

        <Bell size={20} className="text-gray-600 dark:text-gray-300 cursor-pointer" />

        <div className="relative">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.name || "مستخدم"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isAdminGeneral ? "مدير النظام" : "موظف"}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
              <User size={16} className="text-white" />
            </div>
          </div>

          {menuOpen && (
            <div className="absolute left-0 mt-3 w-44 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-50 text-right overflow-hidden">
              <button
                onClick={handleLogout}
                className="flex items-center justify-between w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
