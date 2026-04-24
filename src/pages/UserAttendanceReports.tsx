import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, LogIn, RefreshCw, Users } from "lucide-react";
import api from "../services/api";
import { roleOptions } from "../config/permissions";

type PeriodFilter = "day" | "week" | "month";

type AttendanceSession = {
  id: number;
  user_id: number;
  user_name: string;
  phone?: string;
  email?: string;
  role?: string;
  role_label?: string;
  branch_name?: string | null;
  login_time: string;
  logout_time?: string | null;
  duration_seconds: number;
};

type UserOption = {
  id: number;
  name: string;
  role?: string;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-YE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Number(seconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}س ${minutes}د`;
};

const UserAttendanceReports: React.FC = () => {
  const [period, setPeriod] = useState<PeriodFilter>("day");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [summary, setSummary] = useState({
    total_sessions: 0,
    active_sessions: 0,
    unique_users: 0,
    total_duration_seconds: 0,
  });

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const headers: Record<string, string> = {};
      const branchId = localStorage.getItem("branch_id");
      if (branchId) headers["x-branch-id"] = branchId;
      const res = await api.get("/users", { headers });
      setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
    } catch (error) {
      console.error("Load users filter error:", error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { period };

      if (selectedRole !== "all") params.role = selectedRole;
      if (selectedUserId !== "all") params.user_id = selectedUserId;

      const res = await api.get("/user-attendance/report", { params });
      setSessions(Array.isArray(res.data?.sessions) ? res.data.sessions : []);
      setSummary(
        res.data?.summary || {
          total_sessions: 0,
          active_sessions: 0,
          unique_users: 0,
          total_duration_seconds: 0,
        }
      );
    } catch (error) {
      console.error("Load user attendance report error:", error);
      setSessions([]);
      setSummary({
        total_sessions: 0,
        active_sessions: 0,
        unique_users: 0,
        total_duration_seconds: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    void loadReport();
  }, [period, selectedRole, selectedUserId]);

  const roleFilterOptions = useMemo(
    () => roleOptions.filter((item) => item.value !== "captain"),
    []
  );

  const filteredUsers = useMemo(() => {
    if (selectedRole === "all") return users;
    return users.filter((user) => String(user.role || "").toLowerCase() === selectedRole);
  }, [users, selectedRole]);

  useEffect(() => {
    setSelectedUserId("all");
  }, [selectedRole]);

  return (
    <div className="space-y-5 text-slate-900 dark:text-white">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">تقارير المستخدمين</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            متابعة أوقات الدخول والانصراف للمستخدمين حسب اليوم أو الأسبوع أو الشهر.
          </p>
        </div>

        <button
          onClick={() => void loadReport()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      <div className="grid gap-3 xl:grid-cols-[auto_auto_1fr_1fr]">
        <div className="flex rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          {[
            { key: "day", label: "يومي" },
            { key: "week", label: "أسبوعي" },
            { key: "month", label: "شهري" },
          ].map((item) => {
            const isActive = period === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setPeriod(item.key as PeriodFilter)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {loading ? "جاري التحميل..." : `إجمالي الدوام: ${formatDuration(summary.total_duration_seconds)}`}
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">كل الأنواع</option>
          {roleFilterOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">
            {usersLoading
              ? "جاري تحميل المستخدمين..."
              : selectedRole === "all"
                ? "كل المستخدمين"
                : "كل حسابات هذا النوع"}
          </option>
          {filteredUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CalendarDays size={18} />
            <span className="text-sm font-semibold">عدد الجلسات</span>
          </div>
          <div className="mt-3 text-3xl font-extrabold">{summary.total_sessions}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Users size={18} />
            <span className="text-sm font-semibold">مستخدمون ظاهرون</span>
          </div>
          <div className="mt-3 text-3xl font-extrabold">{summary.unique_users}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <LogIn size={18} />
            <span className="text-sm font-semibold">جلسات مفتوحة</span>
          </div>
          <div className="mt-3 text-3xl font-extrabold">{summary.active_sessions}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock3 size={18} />
            <span className="text-sm font-semibold">إجمالي الساعات</span>
          </div>
          <div className="mt-3 text-3xl font-extrabold">{formatDuration(summary.total_duration_seconds)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-slate-100 dark:bg-slate-800/90">
              <tr className="text-sm font-bold text-slate-700 dark:text-slate-200">
                <th className="px-4 py-3">المستخدم</th>
                <th className="px-4 py-3">النوع</th>
                <th className="px-4 py-3">الفرع</th>
                <th className="px-4 py-3">وقت الدخول</th>
                <th className="px-4 py-3">وقت الانصراف</th>
                <th className="px-4 py-3">مدة الدوام</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    جاري تحميل التقرير...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    لا توجد بيانات ضمن الفلاتر الحالية.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const isActive = !session.logout_time;
                  return (
                    <tr key={session.id} className="text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{session.user_name}</div>
                        {session.phone ? (
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {session.phone}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{session.role_label || session.role || "-"}</td>
                      <td className="px-4 py-3">{session.branch_name || "-"}</td>
                      <td className="px-4 py-3">{formatDateTime(session.login_time)}</td>
                      <td className="px-4 py-3">{formatDateTime(session.logout_time)}</td>
                      <td className="px-4 py-3">{formatDuration(session.duration_seconds)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {isActive ? "على رأس العمل" : "منصرف"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserAttendanceReports;
