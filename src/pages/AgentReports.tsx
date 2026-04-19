import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Store,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../services/api";

interface AgentReportRow {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  branch_name?: string;
  is_active: number;
}

interface RestaurantAssignment {
  id: number;
  name: string;
  agent_id?: number | null;
  agent_name?: string | null;
}

interface AgentInfoAssignment {
  id?: number;
  account_type?: "agent" | "captain";
  account_id?: number;
  group_id?: number | null;
  group_name?: string | null;
}

interface OrderRestaurantSale {
  restaurantId: number | null;
  restaurantName: string;
  total: number;
}

interface OrderProductSale {
  productName: string;
  quantity: number;
  total: number;
  restaurantId: number | null;
  restaurantName: string;
}

interface UnifiedOrder {
  uniqueId: string;
  orderId: number;
  createdAt: string;
  restaurantSales: OrderRestaurantSale[];
  productSales: OrderProductSale[];
}

interface SalesRow {
  restaurantId: number;
  restaurantName: string;
  agentId: number | null;
  agentName: string;
  groupId: number | null;
  groupName: string;
  ordersCount: number;
  sales: number;
}

interface ProductSalesRow {
  key: string;
  productName: string;
  restaurantId: number;
  restaurantName: string;
  agentName: string;
  groupName: string;
  quantity: number;
  sales: number;
}

type PeriodFilter = "day" | "week" | "month" | "custom";

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const parseAmount = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const splitRestaurantNames = (value: unknown) =>
  String(value || "")
    .split("||")
    .map((name) => name.trim())
    .filter(Boolean);

const buildRestaurantSalesFromDetails = (
  detailsRestaurants: any[],
  fallbackNames: string[],
  fallbackAmount: number,
  fallbackSingleName?: string | null,
  fallbackRestaurantId?: number | null
): OrderRestaurantSale[] => {
  if (detailsRestaurants.length > 0) {
    return detailsRestaurants.map((restaurant: any) => ({
      restaurantId: restaurant.id ?? null,
      restaurantName: restaurant.name || fallbackSingleName || "غير محدد",
      total: parseAmount(restaurant.total),
    }));
  }

  if (fallbackSingleName) {
    return [
      {
        restaurantId: fallbackRestaurantId ?? null,
        restaurantName: fallbackSingleName,
        total: fallbackAmount,
      },
    ];
  }

  return fallbackNames.map((name, index) => ({
    restaurantId: null,
    restaurantName: name,
    total: index === 0 ? fallbackAmount : 0,
  }));
};

const buildProductSalesFromRestaurantDetails = (detailsRestaurants: any[]) =>
  detailsRestaurants.flatMap((restaurant: any) =>
    Array.isArray(restaurant.items)
      ? restaurant.items.map((item: any) => ({
          productName: item.name || item.product_name || "غير محدد",
          quantity: Number(item.quantity ?? item.qty ?? 0),
          total: parseAmount(item.subtotal ?? Number(item.price ?? 0) * Number(item.quantity ?? item.qty ?? 0)),
          restaurantId: restaurant.id ?? null,
          restaurantName: restaurant.name || "غير محدد",
        }))
      : []
  );

const buildManualProductSales = (detail: any, order: any): OrderProductSale[] => {
  if (Array.isArray(detail?.items) && detail.items.length > 0) {
    return detail.items.map((item: any) => ({
      productName: item.name || item.product_name || "غير محدد",
      quantity: Number(item.quantity ?? item.qty ?? 0),
      total: parseAmount(item.subtotal ?? Number(item.price ?? 0) * Number(item.quantity ?? item.qty ?? 0)),
      restaurantId: order.restaurant_id ?? null,
      restaurantName: order.restaurant_name || "شراء مباشر",
    }));
  }

  return buildProductSalesFromRestaurantDetails(detail?.order?.restaurants || detail?.restaurants || []);
};

const AgentReports: React.FC = () => {
  const [agents, setAgents] = useState<AgentReportRow[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantAssignment[]>([]);
  const [assignments, setAssignments] = useState<AgentInfoAssignment[]>([]);
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("day");
  const [salesSearchTerm, setSalesSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadAgents = async () => {
    try {
      setLoading(true);
      const res = await (api as any).agents.getAgents();
      setAgents(res?.agents || []);
    } catch (error) {
      console.error("Load agent reports error:", error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async () => {
    try {
      setSalesLoading(true);

      const [restaurantsRes, assignmentRes, normalRes, manualRes, wasselRes] = await Promise.all([
        api.get("/restaurants"),
        (api as any).agentInfo.getAll(),
        (api as any).orders.getOrders({ limit: 2000 }),
        api.get("/manual-orders/manual-list"),
        api.get("/wassel-orders"),
      ]);

      const restaurantsData = Array.isArray(restaurantsRes.data)
        ? restaurantsRes.data
        : restaurantsRes.data?.restaurants || [];
      const assignmentData = assignmentRes?.list || [];
      const normalBaseOrders = normalRes?.orders || [];
      const manualBaseOrders = manualRes.data?.orders || [];
      const wasselBaseOrders = wasselRes.data?.orders || [];

      const [normalDetailed, manualDetailed] = await Promise.all([
        Promise.all(
          normalBaseOrders.map(async (order: any) => {
            try {
              const detail = await (api as any).orders.getOrderDetails(order.id);
              const detailRestaurants = detail?.order?.restaurants || detail?.restaurants || [];

              const fallbackAmount = Math.max(
                parseAmount(order.total_amount) -
                  parseAmount(order.delivery_fee) -
                  parseAmount(order.extra_store_fee),
                0
              );
              const fallbackNames = splitRestaurantNames(order.restaurant_names);

              return {
                uniqueId: `normal-${order.id}`,
                orderId: Number(order.id),
                createdAt: order.created_at,
                restaurantSales: buildRestaurantSalesFromDetails(
                  detailRestaurants,
                  fallbackNames,
                  fallbackAmount
                ),
                productSales: buildProductSalesFromRestaurantDetails(detailRestaurants),
              };
            } catch (error) {
              console.error("Agent sales normal details error:", order.id, error);
              return {
                uniqueId: `normal-${order.id}`,
                orderId: Number(order.id),
                createdAt: order.created_at,
                restaurantSales: buildRestaurantSalesFromDetails(
                  [],
                  splitRestaurantNames(order.restaurant_names),
                  Math.max(
                    parseAmount(order.total_amount) -
                      parseAmount(order.delivery_fee) -
                      parseAmount(order.extra_store_fee),
                    0
                  )
                ),
                productSales: [],
              };
            }
          })
        ),
        Promise.all(
          manualBaseOrders.map(async (order: any) => {
            try {
              const detail = await (api as any).orders.getOrderDetails(order.id);
              const detailRestaurants = detail?.order?.restaurants || detail?.restaurants || [];

              return {
                uniqueId: `manual-${order.id}`,
                orderId: Number(order.id),
                createdAt: order.created_at,
                restaurantSales: buildRestaurantSalesFromDetails(
                  detailRestaurants,
                  [],
                  Math.max(
                    parseAmount(order.total_amount) - parseAmount(order.delivery_fee),
                    0
                  ),
                  order.restaurant_name || "شراء مباشر",
                  order.restaurant_id ?? null
                ),
                productSales: buildManualProductSales(detail, order),
              };
            } catch (error) {
              console.error("Agent sales manual details error:", order.id, error);
              return {
                uniqueId: `manual-${order.id}`,
                orderId: Number(order.id),
                createdAt: order.created_at,
                restaurantSales: buildRestaurantSalesFromDetails(
                  [],
                  [],
                  Math.max(
                    parseAmount(order.total_amount) - parseAmount(order.delivery_fee),
                    0
                  ),
                  order.restaurant_name || "شراء مباشر",
                  order.restaurant_id ?? null
                ),
                productSales: [],
              };
            }
          })
        ),
      ]);

      const wasselDetailed: UnifiedOrder[] = wasselBaseOrders.map((order: any) => ({
        uniqueId: `wassel-${order.id}`,
        orderId: Number(order.id),
        createdAt: order.created_at,
        restaurantSales: [],
        productSales: [],
      }));

      setRestaurants(restaurantsData);
      setAssignments(assignmentData);
      setOrders([...normalDetailed, ...manualDetailed, ...wasselDetailed]);
    } catch (error) {
      console.error("Load agent sales report error:", error);
      setRestaurants([]);
      setAssignments([]);
      setOrders([]);
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    loadSalesReport();
  }, []);

  const filteredAgents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return agents.filter((agent) => {
      if (!term) {
        return true;
      }

      return [agent.name, agent.phone, agent.address, agent.branch_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [agents, searchTerm]);

  const totalAgents = filteredAgents.length;
  const activeAgents = filteredAgents.filter((agent) => Number(agent.is_active) === 1).length;
  const inactiveAgents = totalAgents - activeAgents;
  const totalBranches = new Set(filteredAgents.map((agent) => agent.branch_name).filter(Boolean)).size;

  const groupOptions = useMemo(() => {
    const uniqueGroups = new Map<number, string>();

    assignments.forEach((assignment) => {
      if (
        assignment.account_type === "agent" &&
        assignment.group_id &&
        assignment.group_name &&
        !uniqueGroups.has(assignment.group_id)
      ) {
        uniqueGroups.set(assignment.group_id, assignment.group_name);
      }
    });

    return Array.from(uniqueGroups, ([id, name]) => ({ id, name }));
  }, [assignments]);

  const agentGroupMap = useMemo(() => {
    const result = new Map<number, { groupId: number | null; groupName: string }>();

    assignments.forEach((assignment) => {
      if (assignment.account_type === "agent" && assignment.account_id) {
        result.set(assignment.account_id, {
          groupId: assignment.group_id ?? null,
          groupName: assignment.group_name || "بدون مجموعة",
        });
      }
    });

    return result;
  }, [assignments]);

  const salesRows = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const weekStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const customStart = startDate ? startOfDay(new Date(startDate)) : null;
    const customEnd = endDate ? endOfDay(new Date(endDate)) : null;
    const term = salesSearchTerm.trim().toLowerCase();

    const nameToRestaurantId = new Map<string, number>();
    const rowsMap = new Map<number, SalesRow>();

    restaurants.forEach((restaurant) => {
      const restaurantId = Number(restaurant.id);
      const agentId = restaurant.agent_id ? Number(restaurant.agent_id) : null;
      const groupInfo = agentId ? agentGroupMap.get(agentId) : null;

      nameToRestaurantId.set(String(restaurant.name || "").trim().toLowerCase(), restaurantId);
      rowsMap.set(restaurantId, {
        restaurantId,
        restaurantName: restaurant.name,
        agentId,
        agentName:
          restaurant.agent_name ||
          agents.find((agent) => agent.id === agentId)?.name ||
          "غير معين",
        groupId: groupInfo?.groupId ?? null,
        groupName: groupInfo?.groupName || "بدون مجموعة",
        ordersCount: 0,
        sales: 0,
      });
    });

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const inPeriod =
        periodFilter === "day"
          ? orderDate >= todayStart
          : periodFilter === "week"
          ? orderDate >= weekStart
          : periodFilter === "month"
          ? orderDate >= monthStart
          : customStart && customEnd
          ? orderDate >= customStart && orderDate <= customEnd
          : true;

      if (!inPeriod) {
        return;
      }

      order.restaurantSales.forEach((restaurantSale) => {
        const resolvedRestaurantId =
          restaurantSale.restaurantId ??
          nameToRestaurantId.get(String(restaurantSale.restaurantName || "").trim().toLowerCase());

        if (!resolvedRestaurantId || !rowsMap.has(resolvedRestaurantId)) {
          return;
        }

        const row = rowsMap.get(resolvedRestaurantId)!;
        row.sales += parseAmount(restaurantSale.total);
        row.ordersCount += 1;
      });
    });

    return Array.from(rowsMap.values())
      .filter((row) => row.agentId)
      .filter((row) => (groupFilter === "all" ? true : String(row.groupId || "") === groupFilter))
      .filter((row) => (agentFilter === "all" ? true : String(row.agentId || "") === agentFilter))
      .filter((row) => {
        if (!term) {
          return true;
        }

        return [row.restaurantName, row.agentName, row.groupName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((first, second) => second.sales - first.sales);
  }, [
    agentFilter,
    agentGroupMap,
    agents,
    endDate,
    groupFilter,
    orders,
    periodFilter,
    restaurants,
    salesSearchTerm,
    startDate,
  ]);

  const salesSummary = useMemo(() => {
    const totalSales = salesRows.reduce((sum, row) => sum + row.sales, 0);
    const totalOrders = salesRows.reduce((sum, row) => sum + row.ordersCount, 0);
    const activeRestaurants = salesRows.filter((row) => row.sales > 0).length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales,
      totalOrders,
      activeRestaurants,
      averageTicket,
    };
  }, [salesRows]);

  const storeOptions = useMemo(
    () => salesRows.map((row) => ({ id: row.restaurantId, name: row.restaurantName })),
    [salesRows]
  );

  const topStoresChartData = useMemo(
    () =>
      salesRows.slice(0, 8).map((row) => ({
        name:
          row.restaurantName.length > 18
            ? `${row.restaurantName.slice(0, 18)}...`
            : row.restaurantName,
        sales: Number(row.sales.toFixed(2)),
        orders: row.ordersCount,
      })),
    [salesRows]
  );

  const productRows = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const weekStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const customStart = startDate ? startOfDay(new Date(startDate)) : null;
    const customEnd = endDate ? endOfDay(new Date(endDate)) : null;
    const rowsMap = new Map<string, ProductSalesRow>();
    const allowedStores = new Map(
      salesRows.map((row) => [
        row.restaurantId,
        { restaurantName: row.restaurantName, agentName: row.agentName, groupName: row.groupName },
      ])
    );

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const inPeriod =
        periodFilter === "day"
          ? orderDate >= todayStart
          : periodFilter === "week"
          ? orderDate >= weekStart
          : periodFilter === "month"
          ? orderDate >= monthStart
          : customStart && customEnd
          ? orderDate >= customStart && orderDate <= customEnd
          : true;

      if (!inPeriod) {
        return;
      }

      order.productSales.forEach((product) => {
        if (!product.restaurantId || !allowedStores.has(product.restaurantId)) {
          return;
        }

        if (storeFilter !== "all" && String(product.restaurantId) !== storeFilter) {
          return;
        }

        const storeInfo = allowedStores.get(product.restaurantId)!;
        const key = `${product.productName}::${product.restaurantId}`;

        if (!rowsMap.has(key)) {
          rowsMap.set(key, {
            key,
            productName: product.productName,
            restaurantId: product.restaurantId,
            restaurantName: storeInfo.restaurantName,
            agentName: storeInfo.agentName,
            groupName: storeInfo.groupName,
            sales: 0,
            quantity: 0,
          });
        }

        const row = rowsMap.get(key)!;
        row.sales += product.total;
        row.quantity += product.quantity;
      });
    });

    return Array.from(rowsMap.values())
      .sort((first, second) => second.sales - first.sales);
  }, [endDate, orders, periodFilter, salesRows, startDate, storeFilter]);

  const topProductsChartData = useMemo(
    () =>
      productRows.slice(0, 8).map((row) => ({
        name: `${row.productName} - ${row.restaurantName}`,
        shortName:
          `${row.productName} - ${row.restaurantName}`.length > 24
            ? `${`${row.productName} - ${row.restaurantName}`.slice(0, 24)}...`
            : `${row.productName} - ${row.restaurantName}`,
        sales: Number(row.sales.toFixed(2)),
        quantity: row.quantity,
      })),
    [productRows]
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تقارير الوكلاء</h1>
          <p className="text-sm text-gray-500">متابعة حالة الوكلاء ومبيعات المتاجر التابعة لهم بدقة.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadAgents}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            <RefreshCw size={16} />
            تحديث الوكلاء
          </button>
          <button
            type="button"
            onClick={loadSalesReport}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-700"
          >
            <RefreshCw size={16} />
            تحديث المبيعات
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="إجمالي الوكلاء" value={totalAgents} icon={<Users size={18} />} color="blue" />
        <StatCard title="الوكلاء النشطون" value={activeAgents} icon={<UserCheck size={18} />} color="green" />
        <StatCard title="الوكلاء غير النشطين" value={inactiveAgents} icon={<UserX size={18} />} color="red" />
        <StatCard title="الفروع المغطاة" value={totalBranches} icon={<Store size={18} />} color="amber" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث باسم الوكيل أو الجوال أو الفرع"
            className="w-full rounded-xl border border-gray-200 py-2.5 pr-10 pl-4 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري تحميل بيانات الوكلاء...</div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد بيانات وكلاء مطابقة.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">اسم الوكيل</th>
                  <th className="px-4 py-3">الجوال</th>
                  <th className="px-4 py-3">العنوان</th>
                  <th className="px-4 py-3">الفرع</th>
                  <th className="px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredAgents.map((agent, index) => (
                  <tr key={agent.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{agent.name}</td>
                    <td className="px-4 py-3">{agent.phone || "-"}</td>
                    <td className="px-4 py-3">{agent.address || "-"}</td>
                    <td className="px-4 py-3">{agent.branch_name || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          Number(agent.is_active) === 1
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {Number(agent.is_active) === 1 ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">تقرير مبيعات المتاجر حسب الوكيل</h2>
          <p className="mt-1 text-sm text-gray-500">
            فلترة حسب المجموعة والوكيل واليوم والأسبوع والشهر أو خلال فترة، مع إحصائيات دقيقة لكل متجر.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SalesStatCard title="إجمالي المبيعات" value={`${salesSummary.totalSales.toLocaleString()} ريال`} icon={<TrendingUp size={18} />} />
          <SalesStatCard title="عدد الطلبات" value={salesSummary.totalOrders.toLocaleString()} icon={<Calendar size={18} />} />
          <SalesStatCard title="متاجر لها مبيعات" value={salesSummary.activeRestaurants.toLocaleString()} icon={<Store size={18} />} />
          <SalesStatCard title="متوسط الطلب" value={`${salesSummary.averageTicket.toFixed(2)} ريال`} icon={<Filter size={18} />} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select
            className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            value={groupFilter}
            onChange={(event) => {
              setGroupFilter(event.target.value);
              setAgentFilter("all");
              setStoreFilter("all");
            }}
          >
            <option value="all">كل المجموعات</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            value={agentFilter}
            onChange={(event) => {
              setAgentFilter(event.target.value);
              setStoreFilter("all");
            }}
          >
            <option value="all">كل الوكلاء</option>
            {agents
              .filter((agent) => {
                if (groupFilter === "all") {
                  return true;
                }

                const groupInfo = agentGroupMap.get(agent.id);
                return String(groupInfo?.groupId || "") === groupFilter;
              })
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
          </select>

          <select
            className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            value={storeFilter}
            onChange={(event) => setStoreFilter(event.target.value)}
          >
            <option value="all">كل المتاجر</option>
            {storeOptions.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>

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
              value={salesSearchTerm}
              onChange={(event) => setSalesSearchTerm(event.target.value)}
              placeholder="بحث باسم المتجر أو الوكيل أو المجموعة"
              className="w-full rounded-xl border border-gray-200 py-2.5 pr-10 pl-4 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
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

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setGroupFilter("all");
              setAgentFilter("all");
              setStoreFilter("all");
              setPeriodFilter("day");
              setSalesSearchTerm("");
              setStartDate("");
              setEndDate("");
            }}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-gray-700 transition hover:bg-gray-50"
          >
            تصفير فلاتر التقرير
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">الرسم البياني للمبيعات</h3>
              <p className="text-sm text-gray-500">أعلى 8 متاجر حسب إجمالي المبيعات ضمن الفلاتر الحالية.</p>
            </div>
          </div>

          {salesLoading ? (
            <div className="flex h-[320px] items-center justify-center text-gray-500">جاري تجهيز الرسم البياني...</div>
          ) : topStoresChartData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-gray-500">لا توجد بيانات كافية لعرض الرسم البياني.</div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStoresChartData} margin={{ top: 12, right: 12, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-8} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "sales" ? `${Number(value).toLocaleString()} ريال` : value,
                      name === "sales" ? "المبيعات" : "الطلبات",
                    ]}
                    labelFormatter={(label) => `المتجر: ${label}`}
                  />
                  <Bar dataKey="sales" name="sales" radius={[8, 8, 0, 0]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">الرسم البياني للمنتجات</h3>
              <p className="text-sm text-gray-500">أعلى 8 منتجات مبيعًا ضمن نفس الفلاتر الحالية.</p>
            </div>
          </div>

          {salesLoading ? (
            <div className="flex h-[320px] items-center justify-center text-gray-500">جاري تجهيز رسم المنتجات...</div>
          ) : topProductsChartData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-gray-500">لا توجد بيانات كافية لعرض رسم المنتجات.</div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChartData} margin={{ top: 12, right: 12, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="shortName" tick={{ fontSize: 12 }} interval={0} angle={-8} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "sales" ? `${Number(value).toLocaleString()} ريال` : value,
                      name === "sales" ? "مبيعات المنتج" : "الكمية",
                    ]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `المنتج والمتجر: ${item.name}` : "";
                    }}
                  />
                  <Bar dataKey="sales" name="sales" radius={[8, 8, 0, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100">
          {salesLoading ? (
            <div className="p-8 text-center text-gray-500">جاري تحميل جدول المنتجات...</div>
          ) : productRows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد بيانات منتجات مطابقة للفلاتر الحالية.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-sm text-gray-600">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">المنتج</th>
                    <th className="px-4 py-3">المتجر</th>
                    <th className="px-4 py-3">الوكيل</th>
                    <th className="px-4 py-3">المجموعة</th>
                    <th className="px-4 py-3">الكمية</th>
                    <th className="px-4 py-3">إجمالي المبيعات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {productRows.map((row, index) => (
                    <tr key={row.key} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{row.productName}</td>
                      <td className="px-4 py-3">{row.restaurantName}</td>
                      <td className="px-4 py-3">{row.agentName}</td>
                      <td className="px-4 py-3">{row.groupName}</td>
                      <td className="px-4 py-3">{row.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{row.sales.toLocaleString()} ريال</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100">
          {salesLoading ? (
            <div className="p-8 text-center text-gray-500">جاري تحميل تقرير المبيعات...</div>
          ) : salesRows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد بيانات مبيعات مطابقة للفلاتر الحالية.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-sm text-gray-600">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">المتجر</th>
                    <th className="px-4 py-3">الوكيل</th>
                    <th className="px-4 py-3">المجموعة</th>
                    <th className="px-4 py-3">عدد الطلبات</th>
                    <th className="px-4 py-3">إجمالي المبيعات</th>
                    <th className="px-4 py-3">متوسط الطلب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {salesRows.map((row, index) => (
                    <tr key={row.restaurantId} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{row.restaurantName}</td>
                      <td className="px-4 py-3">{row.agentName}</td>
                      <td className="px-4 py-3">{row.groupName}</td>
                      <td className="px-4 py-3">{row.ordersCount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-green-700">{row.sales.toLocaleString()} ريال</td>
                      <td className="px-4 py-3">
                        {row.ordersCount > 0 ? (row.sales / row.ordersCount).toFixed(2) : "0.00"} ريال
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
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "amber";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
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

export default AgentReports;
