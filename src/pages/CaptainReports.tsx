import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bike,
  Calendar,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  Search,
  Store,
  TrendingUp,
  UserRoundX,
  Users,
} from "lucide-react";
import api from "../services/api";

interface CaptainReportRow {
  id: number;
  name: string;
  phone?: string;
  status: string;
  vehicle_type?: string;
  vehicle_number?: string;
  branch_name?: string | null;
}

interface CaptainAssignmentRow {
  account_type?: "agent" | "captain";
  account_id?: number | null;
  group_id?: number | null;
  group_name?: string | null;
}

interface CaptainCommissionRow {
  order_date: string;
  captain_name: string;
  order_id: number;
  total_amount: number;
  captain_commission: number;
}

interface CaptainOrderMetric {
  uniqueId: string;
  captainName: string;
  amount: number;
  deliveryIncome: number;
  createdAt: string;
}

interface CaptainSummaryRow {
  captainId: number;
  captainName: string;
  phone: string;
  status: string;
  vehicleType: string;
  vehicleNumber: string;
  branchName: string;
  groupName: string;
  ordersCount: number;
  totalSales: number;
  deliveryIncome: number;
  captainIncome: number;
  companyIncome: number;
}

type PeriodFilter = "day" | "week" | "month" | "custom";

const STATUS_LABELS: Record<string, string> = {
  available: "متاح",
  busy: "مشغول",
  offline: "غير متصل",
  inactive: "غير نشط",
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const parseAmount = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

const formatCurrency = (value: number) =>
  `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ريال`;

const CaptainReports: React.FC = () => {
  const [captains, setCaptains] = useState<CaptainReportRow[]>([]);
  const [assignments, setAssignments] = useState<CaptainAssignmentRow[]>([]);
  const [commissionRows, setCommissionRows] = useState<CaptainCommissionRow[]>([]);
  const [orders, setOrders] = useState<CaptainOrderMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadCaptainReport = async () => {
    try {
      setLoading(true);

      const headers: Record<string, string> = {};
      const branchId = localStorage.getItem("branch_id");

      if (branchId) {
        headers["x-branch-id"] = branchId;
      }

      const [captainsRes, assignmentsRes, commissionsRes, normalRes, manualRes, wasselRes] = await Promise.all([
        api.get("/captains", { headers }),
        (api as any).agentInfo.getAll(),
        api.get("/system-reports/commissions"),
        (api as any).orders.getOrders({ limit: 2000 }),
        api.get("/manual-orders/manual-list"),
        api.get("/wassel-orders"),
      ]);

      const captainsData = captainsRes.data?.captains || [];
      const assignmentsData = assignmentsRes?.list || [];
      const commissionsData = commissionsRes?.list || commissionsRes?.data?.list || [];
      const normalBaseOrders = normalRes?.orders || [];
      const manualBaseOrders = manualRes.data?.orders || [];
      const wasselBaseOrders = wasselRes.data?.orders || [];

      const mergedOrders: CaptainOrderMetric[] = [
        ...normalBaseOrders.map((order: any) => ({
          uniqueId: `normal-${order.id}`,
          captainName: order.captain_name || "",
          amount: parseAmount(order.total_amount),
          deliveryIncome:
            parseAmount(order.delivery_fee) + parseAmount(order.extra_store_fee),
          createdAt: order.created_at,
        })),
        ...manualBaseOrders.map((order: any) => ({
          uniqueId: `manual-${order.id}`,
          captainName: order.captain_name || "",
          amount: parseAmount(order.total_amount),
          deliveryIncome: parseAmount(order.delivery_fee),
          createdAt: order.created_at,
        })),
        ...wasselBaseOrders.map((order: any) => ({
          uniqueId: `wassel-${order.id}`,
          captainName: order.captain_name || "",
          amount: parseAmount(order.delivery_fee) + parseAmount(order.extra_fee),
          deliveryIncome: parseAmount(order.delivery_fee) + parseAmount(order.extra_fee),
          createdAt: order.created_at,
        })),
      ];

      setCaptains(captainsData);
      setAssignments(assignmentsData);
      setCommissionRows(commissionsData);
      setOrders(mergedOrders);
    } catch (error) {
      console.error("Load captain reports error:", error);
      setCaptains([]);
      setAssignments([]);
      setCommissionRows([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaptainReport();
  }, []);

  const filteredSummaryRows = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const weekStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const customStart = startDate ? startOfDay(new Date(startDate)) : null;
    const customEnd = endDate ? endOfDay(new Date(endDate)) : null;
    const term = normalizeText(searchTerm);

    const inSelectedPeriod = (value: string) => {
      const date = new Date(value);

      return periodFilter === "day"
        ? date >= todayStart
        : periodFilter === "week"
        ? date >= weekStart
        : periodFilter === "month"
        ? date >= monthStart
        : customStart && customEnd
        ? date >= customStart && date <= customEnd
        : true;
    };

    const captainGroupMap = new Map<number, string>();
    assignments.forEach((assignment) => {
      if (assignment.account_type === "captain" && assignment.account_id) {
        captainGroupMap.set(assignment.account_id, assignment.group_name || "بدون مجموعة");
      }
    });

    const rowsMap = new Map<string, CaptainSummaryRow>();

    captains.forEach((captain) => {
      const normalizedName = normalizeText(captain.name);
      if (!normalizedName) {
        return;
      }

      rowsMap.set(normalizedName, {
        captainId: captain.id,
        captainName: captain.name,
        phone: captain.phone || "-",
        status: captain.status || "inactive",
        vehicleType: captain.vehicle_type || "-",
        vehicleNumber: captain.vehicle_number || "-",
        branchName: captain.branch_name || "-",
        groupName: captainGroupMap.get(captain.id) || "بدون مجموعة",
        ordersCount: 0,
        totalSales: 0,
        deliveryIncome: 0,
        captainIncome: 0,
        companyIncome: 0,
      });
    });

    orders.forEach((order) => {
      if (!inSelectedPeriod(order.createdAt)) {
        return;
      }

      const normalizedName = normalizeText(order.captainName);
      if (!normalizedName || normalizedName === normalizeText("غير معين")) {
        return;
      }

      if (!rowsMap.has(normalizedName)) {
        rowsMap.set(normalizedName, {
          captainId: 0,
          captainName: order.captainName,
          phone: "-",
          status: "inactive",
          vehicleType: "-",
          vehicleNumber: "-",
          branchName: "-",
          groupName: "بدون مجموعة",
          ordersCount: 0,
          totalSales: 0,
          deliveryIncome: 0,
          captainIncome: 0,
          companyIncome: 0,
        });
      }

      const row = rowsMap.get(normalizedName)!;
      row.ordersCount += 1;
      row.totalSales += order.amount;
      row.deliveryIncome += order.deliveryIncome;
    });

    commissionRows.forEach((commission) => {
      if (!inSelectedPeriod(commission.order_date)) {
        return;
      }

      const normalizedName = normalizeText(commission.captain_name);
      if (!normalizedName || normalizedName === normalizeText("غير معين")) {
        return;
      }

      if (!rowsMap.has(normalizedName)) {
        rowsMap.set(normalizedName, {
          captainId: 0,
          captainName: commission.captain_name,
          phone: "-",
          status: "inactive",
          vehicleType: "-",
          vehicleNumber: "-",
          branchName: "-",
          groupName: "بدون مجموعة",
          ordersCount: 0,
          totalSales: 0,
          deliveryIncome: 0,
          captainIncome: 0,
          companyIncome: 0,
        });
      }

      const row = rowsMap.get(normalizedName)!;
      row.companyIncome += parseAmount(commission.captain_commission);
    });

    return Array.from(rowsMap.values())
      .map((row) => ({
        ...row,
        captainIncome: Math.max(row.deliveryIncome - row.companyIncome, 0),
      }))
      .filter((row) => {
        if (!term) {
          return true;
        }

        return [
          row.captainName,
          row.phone,
          row.branchName,
          row.groupName,
          row.vehicleType,
          row.vehicleNumber,
          STATUS_LABELS[row.status] || row.status,
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));
      })
      .sort((first, second) => second.totalSales - first.totalSales);
  }, [assignments, captains, commissionRows, orders, periodFilter, searchTerm, startDate, endDate]);

  const totalCaptains = filteredSummaryRows.length;
  const availableCaptains = filteredSummaryRows.filter((captain) => captain.status === "available").length;
  const busyCaptains = filteredSummaryRows.filter((captain) => captain.status === "busy").length;
  const totalBranches = new Set(filteredSummaryRows.map((captain) => captain.branchName).filter((value) => value && value !== "-")).size;

  const summary = useMemo(() => {
    const totalSales = filteredSummaryRows.reduce((sum, row) => sum + row.totalSales, 0);
    const totalOrders = filteredSummaryRows.reduce((sum, row) => sum + row.ordersCount, 0);
    const totalCaptainIncome = filteredSummaryRows.reduce((sum, row) => sum + row.captainIncome, 0);
    const totalCompanyIncome = filteredSummaryRows.reduce((sum, row) => sum + row.companyIncome, 0);

    return {
      totalSales,
      totalOrders,
      totalCaptainIncome,
      totalCompanyIncome,
    };
  }, [filteredSummaryRows]);

  const topCaptainsChartData = useMemo(
    () =>
      filteredSummaryRows
        .filter((row) => row.totalSales > 0 || row.captainIncome > 0)
        .slice(0, 8)
        .map((row) => ({
          name: row.captainName,
          shortName:
            row.captainName.length > 18 ? `${row.captainName.slice(0, 18)}...` : row.captainName,
          sales: Number(row.totalSales.toFixed(2)),
          captainIncome: Number(row.captainIncome.toFixed(2)),
          companyIncome: Number(row.companyIncome.toFixed(2)),
          orders: row.ordersCount,
        })),
    [filteredSummaryRows]
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تقارير الكباتن</h1>
          <p className="text-sm text-gray-500">أعلى المبيعات، دخل الكابتن، دخل الشركة، وعدد الطلبات من نفس مصادر الاستعلام المستخدمة في التقارير.</p>
        </div>

        <button
          type="button"
          onClick={loadCaptainReport}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          تحديث البيانات
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="إجمالي الكباتن" value={totalCaptains} icon={<Users size={18} />} color="blue" />
        <StatCard title="الكباتن المتاحون" value={availableCaptains} icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard title="الكباتن المشغولون" value={busyCaptains} icon={<UserRoundX size={18} />} color="amber" />
        <StatCard title="الفروع المغطاة" value={totalBranches} icon={<Store size={18} />} color="slate" />
      </div>

      <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <SalesStatCard title="إجمالي المبيعات" value={formatCurrency(summary.totalSales)} icon={<TrendingUp size={18} />} />
          <SalesStatCard title="عدد الطلبات" value={summary.totalOrders.toLocaleString()} icon={<Calendar size={18} />} />
          <SalesStatCard title="دخل الكباتن" value={formatCurrency(summary.totalCaptainIncome)} icon={<DollarSign size={18} />} />
          <SalesStatCard title="دخل الشركة" value={formatCurrency(summary.totalCompanyIncome)} icon={<Bike size={18} />} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
          >
            <option value="day">اليوم</option>
            <option value="week">الأسبوع</option>
            <option value="month">الشهر</option>
            <option value="custom">خلال فترة</option>
          </select>

          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="بحث باسم الكابتن أو الجوال أو الفرع أو المجموعة"
              className="w-full rounded-xl border border-gray-200 py-2.5 pr-10 pl-4 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setPeriodFilter("day");
              setStartDate("");
              setEndDate("");
            }}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-gray-700 transition hover:bg-gray-50"
          >
            تصفير الفلاتر
          </button>
        </div>

        {periodFilter === "custom" && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">الرسم البياني لأعلى الكباتن</h3>
              <p className="text-sm text-gray-500">مقارنة أعلى الكباتن حسب المبيعات مع دخل الكابتن ودخل الشركة.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-[340px] items-center justify-center text-gray-500">جاري تجهيز الرسم البياني...</div>
          ) : topCaptainsChartData.length === 0 ? (
            <div className="flex h-[340px] items-center justify-center text-gray-500">لا توجد بيانات كافية لعرض الرسم البياني.</div>
          ) : (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCaptainsChartData} margin={{ top: 12, right: 12, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="shortName" tick={{ fontSize: 12 }} interval={0} angle={-8} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "orders" ? value : formatCurrency(Number(value)),
                      name === "sales"
                        ? "إجمالي المبيعات"
                        : name === "captainIncome"
                        ? "دخل الكابتن"
                        : name === "companyIncome"
                        ? "دخل الشركة"
                        : "عدد الطلبات",
                    ]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `الكابتن: ${item.name}` : "";
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="sales" radius={[8, 8, 0, 0]} fill="#2563eb" />
                  <Bar dataKey="captainIncome" name="captainIncome" radius={[8, 8, 0, 0]} fill="#10b981" />
                  <Bar dataKey="companyIncome" name="companyIncome" radius={[8, 8, 0, 0]} fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-500">جاري تحميل تقرير الكباتن...</div>
          ) : filteredSummaryRows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد بيانات كباتن مطابقة للفلاتر الحالية.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-sm text-gray-600">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">اسم الكابتن</th>
                    <th className="px-4 py-3">الجوال</th>
                    <th className="px-4 py-3">الفرع</th>
                    <th className="px-4 py-3">المجموعة</th>
                    <th className="px-4 py-3">عدد الطلبات</th>
                    <th className="px-4 py-3">إجمالي المبيعات</th>
                    <th className="px-4 py-3">دخل التوصيل</th>
                    <th className="px-4 py-3">دخل الكابتن</th>
                    <th className="px-4 py-3">دخل الشركة</th>
                    <th className="px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {filteredSummaryRows.map((captain, index) => (
                    <tr key={`${captain.captainId}-${captain.captainName}`} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{captain.captainName}</td>
                      <td className="px-4 py-3">{captain.phone}</td>
                      <td className="px-4 py-3">{captain.branchName}</td>
                      <td className="px-4 py-3">{captain.groupName}</td>
                      <td className="px-4 py-3">{captain.ordersCount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-blue-700">{formatCurrency(captain.totalSales)}</td>
                      <td className="px-4 py-3">{formatCurrency(captain.deliveryIncome)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatCurrency(captain.captainIncome)}</td>
                      <td className="px-4 py-3 font-bold text-amber-700">{formatCurrency(captain.companyIncome)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {STATUS_LABELS[captain.status] || captain.status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: "blue" | "green" | "amber" | "slate";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

const SalesStatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="rounded-xl bg-blue-100 p-3 text-blue-700">{icon}</div>
    </div>
  </div>
);

export default CaptainReports;