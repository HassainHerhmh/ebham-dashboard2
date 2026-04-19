import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  ShoppingBag,
  Store,
  Filter,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

type OrderSource = "all" | "normal" | "manual" | "wassel";
type PeriodType = "day" | "week" | "month" | "custom";

interface UnifiedOrder {
  uniqueId: string;
  orderId: number;
  source: Exclude<OrderSource, "all">;
  sourceLabel: string;
  orderType: string;
  customerName: string;
  restaurantName: string;
  captainName: string;
  paymentMethod: string;
  status: string;
  amount: number;
  foodSales: number;
  deliveryIncome: number;
  createdAt: string;
  restaurantSales: Array<{
    name: string;
    total: number;
  }>;
}

const SOURCE_LABELS: Record<Exclude<OrderSource, "all">, string> = {
  normal: "طلبات عادية",
  manual: "طلبات يدوية",
  wassel: "طلبات وصل لي",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "تم التأكيد",
  processing: "قيد المعالجة",
  preparing: "قيد التحضير",
  ready: "جاهز",
  delivering: "قيد التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  scheduled: "مجدول",
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const formatAmount = (amount: number) =>
  `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ريال`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("ar-YE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const parseAmount = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const splitRestaurantNames = (value: unknown) =>
  String(value || "")
    .split("||")
    .map((name) => name.trim())
    .filter(Boolean);

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const Reports: React.FC = () => {
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<OrderSource>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("day");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalPeriodFilter, setModalPeriodFilter] = useState<PeriodType>("month");
  const [modalStatusFilter, setModalStatusFilter] = useState("all");
  const [modalStartDate, setModalStartDate] = useState("");
  const [modalEndDate, setModalEndDate] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);

      const [normalRes, manualRes, wasselRes] = await Promise.all([
        (api as any).orders.getOrders({ limit: 2000 }),
        api.get("/manual-orders/manual-list"),
        api.get("/wassel-orders"),
      ]);

      const normalBaseOrders = normalRes?.orders || [];
      const manualBaseOrders = manualRes.data?.orders || [];

      const normalDetails = await Promise.all(
        normalBaseOrders.map(async (order: any) => {
          try {
            const detail = await (api as any).orders.getOrderDetails(order.id);
            return { id: order.id, restaurants: detail?.order?.restaurants || detail?.restaurants || [] };
          } catch (error) {
            console.error("Normal report details error:", order.id, error);
            return { id: order.id, restaurants: [] };
          }
        })
      );

      const manualDetails = await Promise.all(
        manualBaseOrders.map(async (order: any) => {
          try {
            const detail = await (api as any).orders.getOrderDetails(order.id);
            return { id: order.id, restaurants: detail?.order?.restaurants || detail?.restaurants || [] };
          } catch (error) {
            console.error("Manual report details error:", order.id, error);
            return { id: order.id, restaurants: [] };
          }
        })
      );

      const normalDetailsMap = new Map(
        normalDetails.map((detail) => [detail.id, detail.restaurants])
      );
      const manualDetailsMap = new Map(
        manualDetails.map((detail) => [detail.id, detail.restaurants])
      );

      const normalOrders: UnifiedOrder[] = normalBaseOrders.map((order: any) => {
        const detailsRestaurants = normalDetailsMap.get(order.id) || [];
        const fallbackFoodSales = Math.max(
          parseAmount(order.total_amount) -
            parseAmount(order.delivery_fee) -
            parseAmount(order.extra_store_fee),
          0
        );
        const restaurantSales =
          detailsRestaurants.length > 0
            ? detailsRestaurants.map((restaurant: any) => ({
                name: restaurant.name || "غير محدد",
                total: parseAmount(restaurant.total),
              }))
            : splitRestaurantNames(order.restaurant_names).map((name) => ({
                name,
                total: 0,
              }));
        const foodSales =
          detailsRestaurants.length > 0
            ? restaurantSales.reduce((sum, restaurant) => sum + restaurant.total, 0)
            : fallbackFoodSales;

        return {
        uniqueId: `normal-${order.id}`,
        orderId: Number(order.id),
        source: "normal",
        sourceLabel: SOURCE_LABELS.normal,
        orderType: order.order_type || "عادي",
        customerName: order.customer_name || "غير محدد",
        restaurantName:
          restaurantSales.map((restaurant) => restaurant.name).join(" + ") ||
          `${order.stores_count || 0} مطعم`,
        captainName: order.captain_name || "غير معين",
        paymentMethod: order.payment_method_label || order.payment_method || "غير محدد",
        status: order.status || "pending",
        amount: parseAmount(order.total_amount),
        foodSales,
        deliveryIncome:
          parseAmount(order.delivery_fee) + parseAmount(order.extra_store_fee),
        createdAt: order.created_at,
        restaurantSales,
      };
      });

      const manualOrders: UnifiedOrder[] = manualBaseOrders.map((order: any) => {
        const detailsRestaurants = manualDetailsMap.get(order.id) || [];
        const restaurantSales =
          detailsRestaurants.length > 0
            ? detailsRestaurants.map((restaurant: any) => ({
                name: restaurant.name || order.restaurant_name || "شراء مباشر",
                total: parseAmount(restaurant.total),
              }))
            : [
                {
                  name: order.restaurant_name || "شراء مباشر",
                  total: Math.max(
                    parseAmount(order.total_amount) - parseAmount(order.delivery_fee),
                    0
                  ),
                },
              ];
        const foodSales = restaurantSales.reduce(
          (sum, restaurant) => sum + restaurant.total,
          0
        );

        return {
        uniqueId: `manual-${order.id}`,
        orderId: Number(order.id),
        source: "manual",
        sourceLabel: SOURCE_LABELS.manual,
        orderType: "يدوي",
        customerName: order.customer_name || "غير محدد",
        restaurantName: restaurantSales.map((restaurant) => restaurant.name).join(" + "),
        captainName: order.captain_name || "غير معين",
        paymentMethod: order.payment_method || "غير محدد",
        status: order.status || "pending",
        amount: parseAmount(order.total_amount),
        foodSales,
        deliveryIncome: parseAmount(order.delivery_fee),
        createdAt: order.created_at,
        restaurantSales,
      };
      });

      const wasselOrders: UnifiedOrder[] = (wasselRes.data?.orders || []).map((order: any) => ({
        uniqueId: `wassel-${order.id}`,
        orderId: Number(order.id),
        source: "wassel",
        sourceLabel: SOURCE_LABELS.wassel,
        orderType: order.order_type_name || order.order_type || "غير محدد",
        customerName: order.customer_name || "غير محدد",
        restaurantName: order.transport_method_name || "وصل لي",
        captainName: order.captain_name || "غير معين",
        paymentMethod: order.payment_method || "غير محدد",
        status: order.status || "pending",
        amount: parseAmount(order.delivery_fee) + parseAmount(order.extra_fee),
        foodSales: 0,
        deliveryIncome: parseAmount(order.delivery_fee) + parseAmount(order.extra_fee),
        createdAt: order.created_at,
        restaurantSales: [],
      }));

      const merged = [...normalOrders, ...manualOrders, ...wasselOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOrders(merged);
    } catch (error) {
      console.error("Load reports error:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredOrders = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const weekStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const customStart = startDate ? startOfDay(new Date(startDate)) : null;
    const customEnd = endDate ? endOfDay(new Date(endDate)) : null;
    const term = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (sourceFilter !== "all" && order.source !== sourceFilter) return false;

      const orderDate = new Date(order.createdAt);
      const inRange =
        periodFilter === "day"
          ? orderDate >= todayStart
          : periodFilter === "week"
          ? orderDate >= weekStart
          : periodFilter === "month"
          ? orderDate >= monthStart
          : customStart && customEnd
          ? orderDate >= customStart && orderDate <= customEnd
          : true;

      if (!inRange) return false;

      if (!term) return true;

      return [
        order.orderId,
        order.customerName,
        order.restaurantName,
        order.captainName,
        order.orderType,
        order.sourceLabel,
        order.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [orders, periodFilter, searchTerm, sourceFilter, startDate, endDate]);

  const modalOrders = useMemo(() => {
    const sourceScopedOrders =
      sourceFilter === "all"
        ? orders
        : orders.filter((order) => order.source === sourceFilter);

    const today = new Date();
    const todayStart = startOfDay(today);
    const weekStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const customStart = modalStartDate ? startOfDay(new Date(modalStartDate)) : null;
    const customEnd = modalEndDate ? endOfDay(new Date(modalEndDate)) : null;
    const term = modalSearchTerm.trim().toLowerCase();

    return sourceScopedOrders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const inRange =
        modalPeriodFilter === "day"
          ? orderDate >= todayStart
          : modalPeriodFilter === "week"
          ? orderDate >= weekStart
          : modalPeriodFilter === "month"
          ? orderDate >= monthStart
          : customStart && customEnd
          ? orderDate >= customStart && orderDate <= customEnd
          : true;

      if (!inRange) return false;
      if (modalStatusFilter !== "all" && order.status !== modalStatusFilter) return false;

      if (!term) return true;

      return [
        order.orderId,
        order.customerName,
        order.restaurantName,
        order.captainName,
        order.orderType,
        order.sourceLabel,
        STATUS_LABELS[order.status] || order.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [
    modalEndDate,
    modalPeriodFilter,
    modalSearchTerm,
    modalStartDate,
    modalStatusFilter,
    orders,
    sourceFilter,
  ]);

  const latestOrders = useMemo(() => filteredOrders.slice(0, 20), [filteredOrders]);

  const summary = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalFoodSales = filteredOrders.reduce((sum, order) => sum + order.foodSales, 0);
    const totalDeliveryIncome = filteredOrders.reduce(
      (sum, order) => sum + order.deliveryIncome,
      0
    );
    const completedOrders = filteredOrders.filter((order) => order.status === "completed").length;
    const cancelledOrders = filteredOrders.filter((order) => order.status === "cancelled").length;
    const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      totalFoodSales,
      totalDeliveryIncome,
      completedOrders,
      cancelledOrders,
      averageOrderValue,
    };
  }, [filteredOrders]);

  const sourceCards = useMemo(() => {
    const counters = {
      normal: 0,
      manual: 0,
      wassel: 0,
    };

    filteredOrders.forEach((order) => {
      counters[order.source] += 1;
    });

    return counters;
  }, [filteredOrders]);

  const statusChartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach((order) => {
      const label = STATUS_LABELS[order.status] || order.status;
      map.set(label, (map.get(label) || 0) + 1);
    });

    return Array.from(map.entries()).map(([name, value], index) => ({
      name,
      value,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [filteredOrders]);

  const movementData = useMemo(() => {
    const map = new Map<string, { label: string; orders: number; revenue: number }>();

    filteredOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const label = date.toLocaleDateString("ar-YE", {
        month: "short",
        day: "numeric",
      });

      if (!map.has(key)) {
        map.set(key, { label, orders: 0, revenue: 0 });
      }

      const current = map.get(key)!;
      current.orders += 1;
      current.revenue += order.amount;
    });

    return Array.from(map.values());
  }, [filteredOrders]);

  const restaurantData = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; revenue: number }>();

    filteredOrders.forEach((order) => {
      order.restaurantSales.forEach((restaurant) => {
        if (!restaurant.name || restaurant.name === "وصل لي" || restaurant.total <= 0) return;

        if (!map.has(restaurant.name)) {
          map.set(restaurant.name, {
            name: restaurant.name,
            orders: 0,
            revenue: 0,
          });
        }

        const current = map.get(restaurant.name)!;
        current.orders += 1;
        current.revenue += restaurant.total;
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const exportReport = () => {
    const rows = [
      [
        "رقم الطلب",
        "المصدر",
        "نوع الطلب",
        "العميل",
        "المطعم/الجهة",
        "الكابتن",
        "الحالة",
        "طريقة الدفع",
        "إجمالي الطلب",
        "مبيعات المحل",
        "رسوم التوصيل",
        "تاريخ الإنشاء",
      ],
      ...filteredOrders.map((order) => [
        order.orderId,
        order.sourceLabel,
        order.orderType,
        order.customerName,
        order.restaurantName,
        order.captainName,
        STATUS_LABELS[order.status] || order.status,
        order.paymentMethod,
        order.amount.toFixed(2),
        order.foodSales.toFixed(2),
        order.deliveryIncome.toFixed(2),
        formatDateTime(order.createdAt),
      ]),
    ];

    const csv = `\ufeff${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "operations-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const filterButtons = [
    { key: "all", label: "كل الطلبات" },
    { key: "normal", label: "طلبات عادية" },
    { key: "manual", label: "طلبات يدوية" },
    { key: "wassel", label: "طلبات وصل لي" },
  ] as const;

  const periodButtons = [
    { key: "day", label: "يومي" },
    { key: "week", label: "أسبوعي" },
    { key: "month", label: "شهري" },
    { key: "custom", label: "خلال فترة" },
  ] as const;

  const statusButtons = [
    { key: "all", label: "كل الحالات" },
    { key: "pending", label: "قيد الانتظار" },
    { key: "confirmed", label: "تم التأكيد" },
    { key: "processing", label: "قيد المعالجة" },
    { key: "preparing", label: "قيد التحضير" },
    { key: "ready", label: "جاهز" },
    { key: "delivering", label: "قيد التوصيل" },
    { key: "completed", label: "مكتمل" },
    { key: "cancelled", label: "ملغي" },
    { key: "scheduled", label: "مجدول" },
  ] as const;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-indigo-600" />
              تقرير العمليات
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              تقرير شامل للطلبات العادية واليدوية وطلبات وصل لي مع مؤشرات البيع وحركة
              التشغيل.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadReports}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
            <button
              onClick={exportReport}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              تصدير الكشف
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Filter className="h-4 w-4" />
              نوع الطلبات
            </div>
            <div className="flex flex-wrap gap-2">
              {filterButtons.map((button) => (
                <button
                  key={button.key}
                  onClick={() => setSourceFilter(button.key)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    sourceFilter === button.key
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Calendar className="h-4 w-4" />
              الفترة
            </div>
            <div className="flex flex-wrap gap-2">
              {periodButtons.map((button) => (
                <button
                  key={button.key}
                  onClick={() => setPeriodFilter(button.key)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    periodFilter === button.key
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالعميل / المطعم / الكابتن / رقم الطلب"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={periodFilter !== "custom"}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={periodFilter !== "custom"}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">إجمالي الطلبات</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{summary.totalOrders}</p>
            </div>
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">إجمالي المبيعات</p>
              <p className="mt-1 text-3xl font-black text-slate-900">
                {formatAmount(summary.totalRevenue)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">مبيعات المحلات</p>
              <p className="mt-1 text-3xl font-black text-slate-900">
                {formatAmount(summary.totalFoodSales)}
              </p>
            </div>
            <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-600">
              <Store className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">رسوم التوصيل</p>
              <p className="mt-1 text-3xl font-black text-slate-900">
                {formatAmount(summary.totalDeliveryIncome)}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">متوسط قيمة الطلب</p>
              <p className="mt-1 text-3xl font-black text-slate-900">
                {formatAmount(summary.averageOrderValue)}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">مكتمل / ملغي</p>
              <p className="mt-1 text-3xl font-black text-slate-900">
                {summary.completedOrders} / {summary.cancelledOrders}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">طلبات عادية</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{sourceCards.normal}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">طلبات يدوية</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{sourceCards.manual}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">طلبات وصل لي</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{sourceCards.wassel}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-lg font-black text-slate-900">حركة الطلبات باليوم</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={movementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" name="عدد الطلبات" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-lg font-black text-slate-900">المبيعات اليومية</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={movementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                name="المبيعات"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr,1.3fr]">
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-lg font-black text-slate-900">توزيع الحالات</h2>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={105}
                label={(entry) => `${entry.name} (${entry.value})`}
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-lg font-black text-slate-900">مبيعات المطاعم</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={restaurantData.slice(0, 8)} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" name="إجمالي المبيعات" fill="#f59e0b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,1fr]">
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900">كشف مبيعات المحلات</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 text-right">المطعم</th>
                  <th className="px-3 py-3 text-center">عدد الطلبات</th>
                  <th className="px-3 py-3 text-center">إجمالي المبيعات</th>
                </tr>
              </thead>
              <tbody>
                {restaurantData.slice(0, 10).map((restaurant) => (
                  <tr key={restaurant.name} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-bold text-slate-800">{restaurant.name}</td>
                    <td className="px-3 py-3 text-center">{restaurant.orders}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-700">
                      {formatAmount(restaurant.revenue)}
                    </td>
                  </tr>
                ))}
                {restaurantData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                      لا توجد بيانات مطاعم ضمن الفلاتر الحالية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-black text-slate-900">أكثر المطاعم طلبًا</h2>
          </div>

          <div className="space-y-3">
            {restaurantData.slice(0, 6).map((restaurant, index) => (
              <div
                key={restaurant.name}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{restaurant.name}</p>
                    <p className="text-xs text-slate-500">{restaurant.orders} طلب</p>
                  </div>
                </div>
                <div className="text-left font-black text-emerald-700">
                  {formatAmount(restaurant.revenue)}
                </div>
              </div>
            ))}

            {restaurantData.length === 0 && (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-400">
                لا توجد بيانات كافية لعرض المطاعم الأعلى
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">كشف الطلبات</h2>
          <button
            onClick={() => {
              setModalSearchTerm(searchTerm);
              setModalPeriodFilter(periodFilter);
              setModalStartDate(startDate);
              setModalEndDate(endDate);
              setModalStatusFilter("all");
              setIsOrdersModalOpen(true);
            }}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
          >
            عرض الكل
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">جاري تحميل التقرير...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 text-right">رقم الطلب</th>
                  <th className="px-3 py-3 text-right">المصدر</th>
                  <th className="px-3 py-3 text-right">نوع الطلب</th>
                  <th className="px-3 py-3 text-right">العميل</th>
                  <th className="px-3 py-3 text-right">المطعم/الجهة</th>
                  <th className="px-3 py-3 text-right">الكابتن</th>
                  <th className="px-3 py-3 text-center">الحالة</th>
                  <th className="px-3 py-3 text-center">إجمالي الطلب</th>
                  <th className="px-3 py-3 text-center">مبيعات المحل</th>
                  <th className="px-3 py-3 text-center">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {latestOrders.map((order) => (
                  <tr key={order.uniqueId} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-bold text-slate-900">#{order.orderId}</td>
                    <td className="px-3 py-3">{order.sourceLabel}</td>
                    <td className="px-3 py-3">{order.orderType}</td>
                    <td className="px-3 py-3 font-bold text-slate-800">{order.customerName}</td>
                    <td className="px-3 py-3">{order.restaurantName}</td>
                    <td className="px-3 py-3">{order.captainName}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-700">
                      {formatAmount(order.amount)}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-cyan-700">
                      {formatAmount(order.foodSales)}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}

                {latestOrders.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                      لا توجد بيانات مطابقة للفلاتر الحالية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isOrdersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">كل الطلبات</h2>
                <p className="text-sm text-slate-500">
                  كشف كامل مع البحث والفلاتر الزمنية والحالة
                </p>
              </div>
              <button
                onClick={() => setIsOrdersModalOpen(false)}
                className="rounded-2xl bg-slate-100 p-3 text-slate-600 transition hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 border-b border-slate-200 px-6 py-4">
              <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr,1fr]">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    placeholder="بحث بالعميل / المطعم / الكابتن / رقم الطلب"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <input
                  type="date"
                  value={modalStartDate}
                  onChange={(e) => setModalStartDate(e.target.value)}
                  disabled={modalPeriodFilter !== "custom"}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />

                <input
                  type="date"
                  value={modalEndDate}
                  onChange={(e) => setModalEndDate(e.target.value)}
                  disabled={modalPeriodFilter !== "custom"}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {periodButtons.map((button) => (
                  <button
                    key={button.key}
                    onClick={() => setModalPeriodFilter(button.key)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      modalPeriodFilter === button.key
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {statusButtons.map((button) => (
                  <button
                    key={button.key}
                    onClick={() => setModalStatusFilter(button.key)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      modalStatusFilter === button.key
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-3 text-right">رقم الطلب</th>
                      <th className="px-3 py-3 text-right">المصدر</th>
                      <th className="px-3 py-3 text-right">نوع الطلب</th>
                      <th className="px-3 py-3 text-right">العميل</th>
                      <th className="px-3 py-3 text-right">المطعم/الجهة</th>
                      <th className="px-3 py-3 text-right">الكابتن</th>
                      <th className="px-3 py-3 text-center">الحالة</th>
                      <th className="px-3 py-3 text-center">إجمالي الطلب</th>
                      <th className="px-3 py-3 text-center">مبيعات المحل</th>
                      <th className="px-3 py-3 text-center">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalOrders.map((order) => (
                      <tr key={`modal-${order.uniqueId}`} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-bold text-slate-900">#{order.orderId}</td>
                        <td className="px-3 py-3">{order.sourceLabel}</td>
                        <td className="px-3 py-3">{order.orderType}</td>
                        <td className="px-3 py-3 font-bold text-slate-800">{order.customerName}</td>
                        <td className="px-3 py-3">{order.restaurantName}</td>
                        <td className="px-3 py-3">{order.captainName}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-emerald-700">
                          {formatAmount(order.amount)}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-cyan-700">
                          {formatAmount(order.foodSales)}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-500">
                          {formatDateTime(order.createdAt)}
                        </td>
                      </tr>
                    ))}

                    {modalOrders.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                          لا توجد بيانات مطابقة للفلاتر الحالية
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
