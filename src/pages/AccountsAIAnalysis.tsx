import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  Bot,
  Brain,
  Lightbulb,
  MapPin,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PeriodFilter = "day" | "week" | "month";
type PromptKey =
  | "summary"
  | "sales"
  | "orders"
  | "users"
  | "customers"
  | "marketing"
  | "neighborhoods";

type UnifiedOrder = {
  uniqueId: string;
  source: "normal" | "manual" | "wassel";
  sourceLabel: string;
  status: string;
  amount: number;
  restaurantName: string;
  userName: string;
  customerName: string;
  neighborhoodName: string;
  createdAt: string;
};

type AttendanceSession = {
  user_name: string;
  login_time: string;
  logout_time?: string | null;
  duration_seconds: number;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  title?: string;
  content: string;
};

const SOURCE_LABELS = {
  normal: "طلبات عادية",
  manual: "طلبات يدوية",
  wassel: "طلبات وصل لي",
} as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "اعتماد",
  confirmed: "مؤكد",
  processing: "معالجة",
  preparing: "تحضير",
  ready: "جاهز",
  delivering: "توصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  scheduled: "مجدول",
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getRange = (period: PeriodFilter) => {
  const now = new Date();
  const end = endOfDay(now);

  if (period === "day") {
    return { start: startOfDay(now), end };
  }

  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { start: startOfDay(start), end };
  }

  const start = new Date(now);
  start.setDate(now.getDate() - 29);
  return { start: startOfDay(start), end };
};

const parseAmount = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const formatAmount = (amount: number) =>
  `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ريال`;

const formatDuration = (seconds: number) => {
  const safeSeconds = Number(seconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}س ${minutes}د`;
};

const formatTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ar-YE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isWithinRange = (value: string, start: Date, end: Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
};

const cleanNeighborhood = (value: unknown) => {
  const text = String(value || "").trim();
  return text || "غير محدد";
};

const AccountsAIAnalysis: React.FC = () => {
  const [period, setPeriod] = useState<PeriodFilter>("day");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [normalRes, manualRes, wasselRes, attendanceRes] = await Promise.all([
        (api as any).orders.getOrders({ limit: 2000 }),
        api.get("/manual-orders/manual-list"),
        api.get("/wassel-orders"),
        api.get("/user-attendance/report", { params: { period } }),
      ]);

      const normalOrders: UnifiedOrder[] = (normalRes?.orders || []).map((order: any) => ({
        uniqueId: `normal-${order.id}`,
        source: "normal",
        sourceLabel: SOURCE_LABELS.normal,
        status: order.status || "pending",
        amount: parseAmount(order.total_amount),
        restaurantName: order.restaurant_names || `${order.stores_count || 0} مطعم`,
        userName: order.user_name || "غير محدد",
        customerName: order.customer_name || "عميل غير محدد",
        neighborhoodName: cleanNeighborhood(order.neighborhood_name),
        createdAt: order.created_at,
      }));

      const manualOrders: UnifiedOrder[] = (
        Array.isArray(manualRes.data?.orders) ? manualRes.data.orders : []
      ).map((order: any) => ({
        uniqueId: `manual-${order.id}`,
        source: "manual",
        sourceLabel: SOURCE_LABELS.manual,
        status: order.status || "pending",
        amount: parseAmount(order.total_amount),
        restaurantName: order.restaurant_name || "شراء مباشر",
        userName: order.user_name || "غير محدد",
        customerName: order.customer_name || "عميل غير محدد",
        neighborhoodName: cleanNeighborhood(order.neighborhood_name || order.to_address),
        createdAt: order.created_at,
      }));

      const wasselOrders: UnifiedOrder[] = (
        Array.isArray(wasselRes.data?.orders) ? wasselRes.data.orders : []
      ).map((order: any) => ({
        uniqueId: `wassel-${order.id}`,
        source: "wassel",
        sourceLabel: SOURCE_LABELS.wassel,
        status: order.status || "pending",
        amount: parseAmount(order.total_amount),
        restaurantName: order.restaurant_name || "وصل لي",
        userName: order.user_name || "غير محدد",
        customerName: order.customer_name || "عميل غير محدد",
        neighborhoodName: cleanNeighborhood(
          order.to_neighborhood_name || order.from_neighborhood_name || order.to_address
        ),
        createdAt: order.created_at,
      }));

      setOrders([...normalOrders, ...manualOrders, ...wasselOrders]);
      setSessions(
        Array.isArray(attendanceRes.data?.sessions) ? attendanceRes.data.sessions : []
      );
    } catch (error) {
      console.error("AI analysis load error:", error);
      setOrders([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [period]);

  const analytics = useMemo(() => {
    const { start, end } = getRange(period);
    const filteredOrders = orders.filter((order) =>
      isWithinRange(order.createdAt, start, end)
    );

    const totalSales = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
    const completedOrders = filteredOrders.filter(
      (order) => order.status === "completed"
    ).length;
    const pendingOrders = filteredOrders.filter(
      (order) => order.status === "pending"
    ).length;
    const cancelledOrders = filteredOrders.filter(
      (order) => order.status === "cancelled"
    ).length;
    const avgOrderValue = filteredOrders.length ? totalSales / filteredOrders.length : 0;

    const sourceMap = new Map<string, { name: string; value: number }>();
    const statusMap = new Map<string, { name: string; value: number }>();
    const restaurantMap = new Map<string, { name: string; orders: number; sales: number }>();
    const neighborhoodMap = new Map<string, { name: string; orders: number; sales: number }>();
    const customerMap = new Map<
      string,
      { name: string; orders: number; sales: number; firstAt?: string; lastAt?: string }
    >();
    const userMap = new Map<
      string,
      {
        name: string;
        orders: number;
        sales: number;
        completed: number;
        firstAt?: string;
        lastAt?: string;
      }
    >();

    filteredOrders.forEach((order) => {
      const sourceEntry = sourceMap.get(order.source) || {
        name: order.sourceLabel,
        value: 0,
      };
      sourceEntry.value += 1;
      sourceMap.set(order.source, sourceEntry);

      const statusEntry = statusMap.get(order.status) || {
        name: STATUS_LABELS[order.status] || order.status,
        value: 0,
      };
      statusEntry.value += 1;
      statusMap.set(order.status, statusEntry);

      const restaurantEntry = restaurantMap.get(order.restaurantName) || {
        name: order.restaurantName,
        orders: 0,
        sales: 0,
      };
      restaurantEntry.orders += 1;
      restaurantEntry.sales += order.amount;
      restaurantMap.set(order.restaurantName, restaurantEntry);

      const neighborhoodEntry = neighborhoodMap.get(order.neighborhoodName) || {
        name: order.neighborhoodName,
        orders: 0,
        sales: 0,
      };
      neighborhoodEntry.orders += 1;
      neighborhoodEntry.sales += order.amount;
      neighborhoodMap.set(order.neighborhoodName, neighborhoodEntry);

      const customerEntry = customerMap.get(order.customerName) || {
        name: order.customerName,
        orders: 0,
        sales: 0,
      };
      customerEntry.orders += 1;
      customerEntry.sales += order.amount;
      if (!customerEntry.firstAt || new Date(order.createdAt) < new Date(customerEntry.firstAt)) {
        customerEntry.firstAt = order.createdAt;
      }
      if (!customerEntry.lastAt || new Date(order.createdAt) > new Date(customerEntry.lastAt)) {
        customerEntry.lastAt = order.createdAt;
      }
      customerMap.set(order.customerName, customerEntry);

      const userEntry = userMap.get(order.userName) || {
        name: order.userName,
        orders: 0,
        sales: 0,
        completed: 0,
      };
      userEntry.orders += 1;
      userEntry.sales += order.amount;
      if (order.status === "completed") userEntry.completed += 1;
      if (!userEntry.firstAt || new Date(order.createdAt) < new Date(userEntry.firstAt)) {
        userEntry.firstAt = order.createdAt;
      }
      if (!userEntry.lastAt || new Date(order.createdAt) > new Date(userEntry.lastAt)) {
        userEntry.lastAt = order.createdAt;
      }
      userMap.set(order.userName, userEntry);
    });

    const attendanceMap = new Map<string, number>();
    sessions.forEach((session) => {
      const current = attendanceMap.get(session.user_name) || 0;
      attendanceMap.set(session.user_name, current + Number(session.duration_seconds || 0));
    });

    const usersPerformance = Array.from(userMap.values())
      .map((user) => {
        const durationSeconds = attendanceMap.get(user.name) || 0;
        return {
          ...user,
          durationSeconds,
          completionRate: user.orders ? (user.completed / user.orders) * 100 : 0,
          ordersPerHour:
            durationSeconds > 0 ? user.orders / (durationSeconds / 3600) : user.orders,
        };
      })
      .sort((a, b) => b.orders - a.orders || b.sales - a.sales);

    const topRestaurants = Array.from(restaurantMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const topNeighborhoods = Array.from(neighborhoodMap.values())
      .sort((a, b) => b.orders - a.orders || b.sales - a.sales)
      .slice(0, 7);

    const sourceData = Array.from(sourceMap.values()).sort((a, b) => b.value - a.value);
    const statusData = Array.from(statusMap.values()).sort((a, b) => b.value - a.value);
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.orders - a.orders || b.sales - a.sales)
      .slice(0, 7);
    const topUser = usersPerformance[0] || null;
    const lowestUser = usersPerformance[usersPerformance.length - 1] || null;
    const topRestaurant = topRestaurants[0] || null;
    const topNeighborhood = topNeighborhoods[0] || null;
    const topCustomer = topCustomers[0] || null;

    const pendingRatio = filteredOrders.length ? (pendingOrders / filteredOrders.length) * 100 : 0;
    const cancelledRatio = filteredOrders.length ? (cancelledOrders / filteredOrders.length) * 100 : 0;

    return {
      totalSales,
      totalOrders: filteredOrders.length,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      avgOrderValue,
      completionRate: filteredOrders.length
        ? (completedOrders / filteredOrders.length) * 100
        : 0,
      pendingRatio,
      cancelledRatio,
      sourceData,
      statusData,
      topRestaurants,
      topNeighborhoods,
      topCustomers,
      usersPerformance: usersPerformance.slice(0, 8),
      topUser,
      lowestUser,
      topRestaurant,
      topNeighborhood,
      topCustomer,
    };
  }, [orders, sessions, period]);

  const periodLabel =
    period === "day" ? "اليوم" : period === "week" ? "آخر 7 أيام" : "آخر 30 يوم";

  const buildSummaryText = () => {
    const topSource = analytics.sourceData[0];
    const strongestUser = analytics.topUser;
    const topArea = analytics.topNeighborhood;

    const priorities: string[] = [];
    if (analytics.pendingRatio >= 25) {
      priorities.push("الأولوية الأولى الآن: تخفيف الطلبات المعلقة لأن أثرها واضح على التدفق.");
    }
    if (analytics.cancelledRatio >= 10) {
      priorities.push("هناك نسبة إلغاء ملحوظة، وهذا يستحق مراجعة أسباب الإلغاء أو التأخير.");
    }
    if (analytics.avgOrderValue < 3000 && analytics.totalOrders > 0) {
      priorities.push("متوسط الطلب منخفض نسبيًا؛ يوجد مجال واضح لرفع السلة الشرائية بعروض إضافية.");
    }
    if (!priorities.length) {
      priorities.push("التشغيل مستقر نسبيًا، والفرصة الأفضل الآن في رفع عدد الطلبات أو تكرار الشراء.");
    }

    return [
      `في ${periodLabel} لدينا ${analytics.totalOrders} طلب بقيمة ${formatAmount(analytics.totalSales)} ومتوسط ${formatAmount(analytics.avgOrderValue)} للطلب الواحد.`,
      topSource
        ? `المصدر الأثقل حاليًا هو ${topSource.name} بعدد ${topSource.value} طلب.`
        : "لا يوجد مصدر طلبات كافٍ للتحليل.",
      analytics.topRestaurant
        ? `المطعم الأقوى مبيعًا: ${analytics.topRestaurant.name} بقيمة ${formatAmount(analytics.topRestaurant.sales)}.`
        : "لم يتضح بعد المطعم الأقوى مبيعًا.",
      topArea
        ? `أكثر الأحياء طلبًا حسب موقع الزبون: ${topArea.name} بعدد ${topArea.orders} طلب.`
        : "لا توجد بيانات أحياء كافية في الفترة الحالية.",
      analytics.topCustomer
        ? `العميل الأكثر نشاطًا: ${analytics.topCustomer.name} بعدد ${analytics.topCustomer.orders} طلب وإنفاق ${formatAmount(analytics.topCustomer.sales)}.`
        : "لا توجد بيانات عملاء كافية في الفترة الحالية.",
      strongestUser
        ? `الأكثر استلامًا للطلبات: ${strongestUser.name} بعدد ${strongestUser.orders} طلب من ${formatTime(strongestUser.firstAt)} إلى ${formatTime(strongestUser.lastAt)}.`
        : "لا يوجد نشاط كافٍ للمستخدمين في هذه الفترة.",
      ...priorities,
    ].join("\n");
  };

  const buildReply = (prompt: PromptKey) => {
    if (prompt === "sales") {
      return {
        title: `تحليل المبيعات - ${periodLabel}`,
        content: [
          `إجمالي المبيعات ${formatAmount(analytics.totalSales)} من ${analytics.totalOrders} طلب.`,
          `متوسط قيمة الطلب ${formatAmount(analytics.avgOrderValue)} ونسبة الإكمال ${analytics.completionRate.toFixed(1)}%.`,
          analytics.topRestaurant
            ? `أعلى مطعم مبيعًا: ${analytics.topRestaurant.name} بقيمة ${formatAmount(analytics.topRestaurant.sales)} من ${analytics.topRestaurant.orders} طلب.`
            : "لم يظهر مطعم متصدر بوضوح بعد.",
          analytics.sourceData[0]
            ? `القناة الأعلى مساهمة في الطلبات: ${analytics.sourceData[0].name}.`
            : "لا توجد قناة واضحة أعلى من غيرها.",
          analytics.avgOrderValue < 3000
            ? "توصية مباشرة: ارفع متوسط الطلب بعرض تكميلي أو حد أدنى لمكافأة إضافية."
            : "توصية مباشرة: ركّز على تكرار الشراء لأن متوسط الطلب جيد أصلًا.",
        ].join("\n"),
      };
    }

    if (prompt === "orders") {
      return {
        title: `تحليل الطلبات - ${periodLabel}`,
        content: [
          `إجمالي الطلبات ${analytics.totalOrders}، المكتمل ${analytics.completedOrders}، المعلق ${analytics.pendingOrders}، الملغي ${analytics.cancelledOrders}.`,
          `نسبة الطلبات المعلقة ${analytics.pendingRatio.toFixed(1)}% ونسبة الإلغاء ${analytics.cancelledRatio.toFixed(1)}%.`,
          analytics.pendingRatio >= 25
            ? "الوضع الحالي يشير إلى اختناق تشغيلي في مرحلة الاعتماد أو المعالجة."
            : "التدفق التشغيلي مقبول نسبيًا من ناحية الاعتماد والمعالجة.",
          analytics.topNeighborhood
            ? `الضغط الأعلى قادم من حي ${analytics.topNeighborhood.name}.`
            : "لا يوجد حي واضح يقود الطلبات حاليًا.",
        ].join("\n"),
      };
    }

    if (prompt === "users") {
      return {
        title: `أداء المستخدمين - ${periodLabel}`,
        content: [
          analytics.topUser
            ? `الأكثر استلامًا للطلبات: ${analytics.topUser.name} بعدد ${analytics.topUser.orders} طلب، من ${formatTime(analytics.topUser.firstAt)} إلى ${formatTime(analytics.topUser.lastAt)}.`
            : "لا توجد بيانات أداء كافية للمستخدمين.",
          analytics.topUser
            ? `إنتاجيته التقريبية ${analytics.topUser.ordersPerHour.toFixed(1)} طلب/ساعة ومبيعاته ${formatAmount(analytics.topUser.sales)}.`
            : "",
          analytics.lowestUser && analytics.lowestUser !== analytics.topUser
            ? `الأقل نشاطًا: ${analytics.lowestUser.name} بعدد ${analytics.lowestUser.orders} طلب فقط، من ${formatTime(analytics.lowestUser.firstAt)} إلى ${formatTime(analytics.lowestUser.lastAt)}.`
            : "",
          analytics.topUser && analytics.lowestUser && analytics.lowestUser !== analytics.topUser
            ? "التوصية: راجعوا توزيع الطلبات أو التدريب بين الأعلى والأقل نشاطًا لرفع التوازن."
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }

    if (prompt === "customers") {
      return {
        title: `تحليل العملاء - ${periodLabel}`,
        content: [
          analytics.topCustomer
            ? `أكثر عميل طلبًا: ${analytics.topCustomer.name} بعدد ${analytics.topCustomer.orders} طلب وإنفاق ${formatAmount(analytics.topCustomer.sales)}.`
            : "لا توجد بيانات عملاء كافية في الفترة الحالية.",
          `عدد العملاء النشطين في هذه الفترة: ${analytics.topCustomers.length}.`,
          analytics.topCustomers.length
            ? `أقوى 3 عملاء حاليًا: ${analytics.topCustomers
                .slice(0, 3)
                .map((item) => `${item.name} (${item.orders} طلب)`)
                .join("، ")}.`
            : "لم يظهر عملاء متكررون بوضوح بعد.",
          analytics.avgOrderValue < 3000
            ? "التوصية: ركّز على برامج إعادة الشراء أو عرض خاص للعملاء المتكررين لرفع متوسط الإنفاق."
            : "التوصية: أنشئ شريحة VIP بسيطة لأكثر العملاء إنفاقًا وامنحهم ميزة تكرار الشراء.",
        ].join("\n"),
      };
    }

    if (prompt === "marketing") {
      return {
        title: `اقتراحات تسويق - ${periodLabel}`,
        content: [
          analytics.topNeighborhood
            ? `ابدأ حملة محلية موجهة لحي ${analytics.topNeighborhood.name} لأنه الأعلى طلبًا حاليًا.`
            : "ابدأ بحملة عامة خفيفة ثم راقب أفضل حي خلال يوم واحد.",
          analytics.topRestaurant
            ? `ركّز العرض على ${analytics.topRestaurant.name} لأنه يقود المبيعات الآن.`
            : "اختر أعلى مطعمين في المبيعات وجرّب عرضًا قصيرًا بينهما.",
          analytics.avgOrderValue < 3000
            ? "أفضل فكرة تسويق الآن: رفع متوسط السلة عبر منتج إضافي أو عرض تجميعي."
            : "أفضل فكرة تسويق الآن: إعادة استهداف العملاء الحاليين بدل خصم كبير على الجميع.",
          analytics.pendingOrders > 0
            ? "لا توسّعوا الحملة بقوة قبل ضبط الطلبات المعلقة حتى لا يرتفع الضغط التشغيلي."
            : "البيئة التشغيلية تسمح بحملة أوسع لأن التراكم المعلق ليس مرتفعًا.",
        ].join("\n"),
      };
    }

    if (prompt === "neighborhoods") {
      return {
        title: `أكثر الأحياء طلبًا - ${periodLabel}`,
        content: analytics.topNeighborhoods.length
          ? analytics.topNeighborhoods
              .map(
                (item, index) =>
                  `${index + 1}. ${item.name}: ${item.orders} طلب - ${formatAmount(item.sales)}`
              )
              .join("\n")
          : "لا توجد بيانات أحياء كافية في الفترة الحالية.",
      };
    }

    return {
      title: `ملخص ذكي - ${periodLabel}`,
      content: buildSummaryText(),
    };
  };

  const inferPromptFromQuestion = (text: string): PromptKey => {
    const q = text.trim().toLowerCase();
    if (q.includes("حي") || q.includes("الاحياء") || q.includes("الأحياء") || q.includes("موقع")) {
      return "neighborhoods";
    }
    if (q.includes("تسويق") || q.includes("حملة") || q.includes("عرض")) {
      return "marketing";
    }
    if (q.includes("مستخدم") || q.includes("موظف") || q.includes("استلام") || q.includes("اداء")) {
      return "users";
    }
    if (q.includes("مبيعات") || q.includes("بيع") || q.includes("دخل") || q.includes("ايراد")) {
      return "sales";
    }
    if (q.includes("طلبات") || q.includes("اعتماد") || q.includes("معلق") || q.includes("إلغاء")) {
      return "orders";
    }
    return "summary";
  };

  useEffect(() => {
    const opening = buildReply("summary");
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        title: opening.title,
        content: opening.content,
      },
    ]);
  }, [period, analytics.totalOrders, analytics.totalSales, analytics.pendingOrders]);

  const askPrompt = (prompt: PromptKey, label: string) => {
    const reply = buildReply(prompt);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: label },
      { id: Date.now() + 1, role: "assistant", title: reply.title, content: reply.content },
    ]);
  };

  const submitCustomQuestion = () => {
    const text = customQuestion.trim();
    if (!text) return;
    const prompt = inferPromptFromQuestion(text);
    const reply = buildReply(prompt);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: text },
      { id: Date.now() + 1, role: "assistant", title: reply.title, content: reply.content },
    ]);
    setCustomQuestion("");
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">تحليل الذكاء</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            تحليل أعمق للمبيعات والطلبات وأداء المستخدمين والأحياء الأكثر طلبًا
            حسب موقع الزبون.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            {[
              { key: "day", label: "اليوم" },
              { key: "week", label: "أسبوعي" },
              { key: "month", label: "شهري" },
            ].map((item) => {
              const active = period === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setPeriod(item.key as PeriodFilter)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            تحديث
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          {
            title: "إجمالي المبيعات",
            value: formatAmount(analytics.totalSales),
            icon: TrendingUp,
            tone: "text-emerald-600 dark:text-emerald-400",
          },
          {
            title: "عدد الطلبات",
            value: analytics.totalOrders,
            icon: ShoppingBag,
            tone: "text-blue-600 dark:text-blue-400",
          },
          {
            title: "متوسط الطلب",
            value: formatAmount(analytics.avgOrderValue),
            icon: Store,
            tone: "text-amber-600 dark:text-amber-400",
          },
          {
            title: "أفضل مستخدم",
            value: analytics.topUser?.name || "—",
            icon: Users,
            tone: "text-fuchsia-600 dark:text-fuchsia-400",
          },
          {
            title: "أفضل عميل",
            value: analytics.topCustomer?.name || "—",
            icon: Brain,
            tone: "text-cyan-600 dark:text-cyan-400",
          },
          {
            title: "أعلى حي طلبًا",
            value: analytics.topNeighborhood?.name || "—",
            icon: MapPin,
            tone: "text-rose-600 dark:text-rose-400",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={`flex items-center gap-2 text-sm font-semibold ${card.tone}`}>
              <card.icon size={18} />
              <span>{card.title}</span>
            </div>
            <div className="mt-4 text-2xl font-extrabold">
              {loading ? "جاري التحميل..." : card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-lg font-extrabold">
            <Bot size={20} className="text-blue-600 dark:text-blue-400" />
            <span>محادثة التحليل</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCustomQuestion();
                }}
                placeholder="اكتب مثلًا: حلل الأحياء أو من الأكثر استلامًا للطلبات؟"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <button
              onClick={submitCustomQuestion}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              إرسال
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: "summary" as PromptKey, label: "لخص الوضع الحالي", icon: Brain },
                { key: "sales" as PromptKey, label: "حلل المبيعات", icon: TrendingUp },
                { key: "orders" as PromptKey, label: "حلل الطلبات", icon: ShoppingBag },
                { key: "users" as PromptKey, label: "أداء المستخدمين", icon: Users },
                { key: "customers" as PromptKey, label: "تحليل العملاء", icon: Brain },
                { key: "marketing" as PromptKey, label: "اقتراحات تسويق", icon: Lightbulb },
                { key: "neighborhoods" as PromptKey, label: "أكثر الأحياء طلبًا", icon: MapPin },
              ].map((prompt) => (
              <button
                key={prompt.key}
                onClick={() => askPrompt(prompt.key, prompt.label)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <prompt.icon size={15} />
                {prompt.label}
              </button>
            ))}
          </div>

          <div className="mt-5 max-h-[620px] space-y-3 overflow-y-auto pl-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-2xl border px-4 py-3 ${
                  message.role === "assistant"
                    ? "border-blue-100 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/30"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {message.role === "assistant" ? "AI" : "طلبك"}
                </div>
                {message.title && (
                  <div className="mb-2 text-base font-extrabold text-slate-900 dark:text-white">
                    {message.title}
                  </div>
                )}
                <div className="whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-extrabold">مصادر الطلبات</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.sourceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={82}
                    label
                  >
                    {analytics.sourceData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-extrabold">أفضل المستخدمين استلامًا للطلبات</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.usersPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-extrabold">أفضل العملاء طلبًا</h2>
            <div className="mt-4 space-y-3">
              {analytics.topCustomers.length ? (
                analytics.topCustomers.slice(0, 5).map((customer) => (
                  <div
                    key={customer.name}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {customer.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {customer.orders} طلب
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                      {formatAmount(customer.sales)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  لا توجد بيانات عملاء في الفترة المحددة.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-extrabold">أفضل المطاعم مبيعًا</h2>
          <div className="mt-4 space-y-3">
            {analytics.topRestaurants.length ? (
              analytics.topRestaurants.map((restaurant, index) => (
                <div
                  key={`${restaurant.name}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {restaurant.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {restaurant.orders} طلب
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatAmount(restaurant.sales)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                لا توجد بيانات مطاعم في الفترة المحددة.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-extrabold">أكثر الأحياء طلبًا حسب موقع الزبون</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-slate-100 dark:bg-slate-800/90">
                <tr className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  <th className="px-4 py-3">الحي</th>
                  <th className="px-4 py-3">عدد الطلبات</th>
                  <th className="px-4 py-3">المبيعات</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topNeighborhoods.length ? (
                  analytics.topNeighborhoods.map((item) => (
                    <tr
                      key={item.name}
                      className="border-t border-slate-200 text-sm dark:border-slate-800"
                    >
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="px-4 py-3">{item.orders}</td>
                      <td className="px-4 py-3">{formatAmount(item.sales)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      لا توجد بيانات أحياء كافية في الفترة المحددة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-extrabold">جدول أداء المستخدمين</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-slate-100 dark:bg-slate-800/90">
              <tr className="text-sm font-bold text-slate-700 dark:text-slate-200">
                <th className="px-4 py-3">المستخدم</th>
                <th className="px-4 py-3">الطلبات</th>
                <th className="px-4 py-3">من</th>
                <th className="px-4 py-3">إلى</th>
                <th className="px-4 py-3">نسبة الإكمال</th>
                <th className="px-4 py-3">طلبات/ساعة</th>
                <th className="px-4 py-3">وقت النشاط</th>
              </tr>
            </thead>
            <tbody>
              {analytics.usersPerformance.length ? (
                analytics.usersPerformance.map((user) => (
                  <tr
                    key={user.name}
                    className="border-t border-slate-200 text-sm dark:border-slate-800"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {user.name}
                    </td>
                    <td className="px-4 py-3">{user.orders}</td>
                    <td className="px-4 py-3">{formatTime(user.firstAt)}</td>
                    <td className="px-4 py-3">{formatTime(user.lastAt)}</td>
                    <td className="px-4 py-3">{user.completionRate.toFixed(1)}%</td>
                    <td className="px-4 py-3">{user.ordersPerHour.toFixed(1)}</td>
                    <td className="px-4 py-3">{formatDuration(user.durationSeconds)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    لا توجد بيانات أداء للمستخدمين في الفترة المحددة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AccountsAIAnalysis;
