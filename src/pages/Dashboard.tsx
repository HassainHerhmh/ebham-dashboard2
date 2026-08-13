import React from "react";
import { io, Socket } from "socket.io-client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, ShoppingBag, Truck, Users } from "lucide-react";

import StatCard from "../components/StatCard";
import { useApp } from "../contexts/AppContext";
import { useApi } from "../hooks/useApi";
import api, { SOCKET_URL } from "../services/api";

const getOrderDisplayNumber = (order: {
  id: number;
  order_number?: number | string;
}) => order.order_number || order.id;

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "قيد المعالجة",
  processing: "قيد التحضير",
  preparing: "قيد التحضير",
  ready: "جاهز",
  delivering: "قيد التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const Dashboard: React.FC = () => {
  const { state, actions } = useApp();
  const stats = state.stats;
  const socketRef = React.useRef<Socket | null>(null);

  React.useEffect(() => {
    actions.loadStats();
  }, []);

  React.useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("admin_notification", (data: any) => {
      if (data?.message) {
        alert(data.message);
      }

      actions.loadStats();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const { data: recentOrders } = useApi(
    () => (api as any).orders.getOrders({ limit: 200, sort: "desc" }),
    []
  );

  const { data: salesData } = useApi(
    () => (api as any).reports.getSalesReport(),
    []
  );

  const ordersList = React.useMemo(() => {
    if (Array.isArray((recentOrders as any)?.orders)) {
      return (recentOrders as any).orders;
    }

    return Array.isArray(recentOrders) ? recentOrders : [];
  }, [recentOrders]);

  const orderStatusData = React.useMemo(() => {
    const statusMap = new Map<
      string,
      { name: string; value: number; color: string }
    >([
      ["completed", { name: "مكتمل", value: 0, color: "#10b981" }],
      ["delivering", { name: "قيد التوصيل", value: 0, color: "#3b82f6" }],
      ["cancelled", { name: "ملغي", value: 0, color: "#ef4444" }],
      ["pending", { name: "قيد الانتظار", value: 0, color: "#f59e0b" }],
      ["confirmed", { name: "قيد المعالجة", value: 0, color: "#6366f1" }],
      ["processing", { name: "قيد التحضير", value: 0, color: "#8b5cf6" }],
      ["preparing", { name: "قيد التحضير", value: 0, color: "#8b5cf6" }],
      ["ready", { name: "جاهز", value: 0, color: "#06b6d4" }],
    ]);

    ordersList.forEach((order: any) => {
      const key = String(order?.status || "pending").toLowerCase();
      const current = statusMap.get(key);

      if (current) {
        current.value += 1;
        return;
      }

      statusMap.set(key, {
        name: STATUS_LABELS[key] || order?.status || "غير معروف",
        value: 1,
        color: "#6b7280",
      });
    });

    const values = Array.from(statusMap.entries())
      .filter(([, item]) => item.value > 0)
      .map(([, item]) => item);

    return values.length
      ? values
      : [{ name: "لا توجد بيانات", value: 1, color: "#cbd5e1" }];
  }, [ordersList]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "مكتمل":
        return "bg-green-100 text-green-800";

      case "delivering":
      case "قيد التوصيل":
        return "bg-blue-100 text-blue-800";

      case "pending":
      case "قيد الانتظار":
        return "bg-yellow-100 text-yellow-800";

      case "confirmed":
      case "قيد المعالجة":
        return "bg-indigo-100 text-indigo-800";

      case "processing":
      case "preparing":
      case "قيد التحضير":
        return "bg-purple-100 text-purple-800";

      case "ready":
      case "جاهز":
        return "bg-cyan-100 text-cyan-800";

      case "cancelled":
      case "ملغي":
        return "bg-red-100 text-red-800";

      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <div className="text-sm text-gray-500">متصل realtime</div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الطلبات اليوم"
          value={stats?.totalOrders?.toString() || "0"}
          change="Live"
          changeType="increase"
          icon={ShoppingBag}
          color="primary"
        />

        <StatCard
          title="العملاء النشطون"
          value={stats?.activeCustomers?.toString() || "0"}
          change="Live"
          changeType="increase"
          icon={Users}
          color="secondary"
        />

        <StatCard
          title="الكباتن المتاحون"
          value={stats?.availableCaptains?.toString() || "0"}
          change="Live"
          changeType="increase"
          icon={Truck}
          color="warning"
        />

        <StatCard
          title="إجمالي المبيعات اليوم"
          value={`${stats?.totalSales?.toLocaleString() || "0"} ريال`}
          change="Live"
          changeType="increase"
          icon={DollarSign}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">المبيعات الأسبوعية</h2>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={Array.isArray(salesData) ? salesData : []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">حالة الطلبات</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
              >
                {orderStatusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-lg">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">الطلبات الأخيرة</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right">رقم</th>
                <th className="px-6 py-3 text-right">الحالة</th>
              </tr>
            </thead>

            <tbody>
              {ordersList.slice(0, 5).map((order: any) => {
                const statusKey = String(order.status || "").toLowerCase();
                const statusLabel =
                  STATUS_LABELS[statusKey] || order.status || "غير معروف";

                return (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3">
                      #{getOrderDisplayNumber(order)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${getStatusColor(statusKey)}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {!ordersList.length && (
                <tr>
                  <td colSpan={2} className="px-6 py-6 text-center text-gray-500">
                    لا توجد بيانات متاحة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
