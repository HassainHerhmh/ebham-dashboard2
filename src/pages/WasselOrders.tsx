import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import {
  Plus,
  Edit,
  MapPin,
  CreditCard,
  Wallet,
  Landmark,
  Banknote,
  Trash2,
  Shapes,
  Truck,
  Search,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { useApp } from "../contexts/AppContext";
import { useResizableColumns } from "../hooks/useResizableColumns";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim();

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

/* ======================
    Types
====================== */
interface WasselOrder {
  id: number;
  order_number?: number | string;
  customer_name: string;
  customer_id?: number;
  order_type: string | number;
  order_type_id?: string | number | null;
  order_type_name?: string | null;
  transport_method_id?: number | null;
  transport_method_name?: string | null;
  distance_km?: number | string | null;
  from_address_id?: number | null;
  to_address_id?: number | null;
  from_address: string;
  from_lat?: number | string | null;
  from_lng?: number | string | null;
  to_address: string;
  to_lat?: number | string | null;
  to_lng?: number | string | null;
  delivery_fee: number;
  extra_fee: number;
  notes?: string;
  status: string;
  payment_method: string;
  created_at: string;
  captain_name?: string;
  creator_name?: string;
  updater_name?: string;
  scheduled_at?: string | null;
  processing_at?: string | null;
  ready_at?: string | null;
  delivering_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

const getOrderDisplayNumber = (order: { id: number; order_number?: number | string }) =>
  order.order_number || order.id;

interface Captain {
  id: number;
  name: string;
  pending_orders: number;
  completed_today: number;
}

interface OrderTypeItem {
  id: number;
  name: string;
}

interface TransportMethodItem {
  id: number;
  name: string;
  price_per_km: number;
}

function ToastNotifications() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const handler = (data: any) => {
      if (
        data.type !== "wassel_order_created" &&
        data.type !== "wassel_assigned" &&
        data.type !== "wassel_status"
      )
        return;

      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...data, id }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    socket.on("admin_notification", handler);

    return () => {
      socket.off("admin_notification", handler);
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-[420px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-white border shadow-lg rounded px-4 py-3 text-sm"
        >
          🔔 {t.message}
        </div>
      ))}
    </div>
  );
}

type OrderTab =
  | "pending"
  | "scheduled"
  | "processing"
  | "delivering"
  | "completed"
  | "cancelled";

type DateFilter = "today" | "week";

const WasselOrders: React.FC = () => {
  const { actions } = useApp();
  const resizeDirection =
    typeof document !== "undefined" && document.documentElement.dir === "ltr"
      ? "ltr"
      : "rtl";
  const [orders, setOrders] = useState<WasselOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const delayedOrdersRef = useRef<Set<number>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WasselOrder | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);

  const [customerBalance, setCustomerBalance] = useState<{
    current_balance: number;
    credit_limit: number;
  } | null>(null);

  const [scheduleMode, setScheduleMode] = useState<"now" | "today" | "tomorrow">(
    "now"
  );

  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [searchTerm, setSearchTerm] = useState("");
  const wasselTableColumns = useMemo(
    () => [
      { key: "id", label: "# المرجع" },
      { key: "customer", label: "اسم العميل" },
      { key: "orderType", label: "نوع الطلب" },
      { key: "transport", label: "وسيلة النقل" },
      { key: "captain", label: "كابتن التوصيل" },
      { key: "locations", label: "العناوين" },
      { key: "payment", label: "وسيلة الدفع" },
      { key: "fees", label: "إجمالي الرسوم" },
      { key: "status", label: "حالة الطلب" },
      { key: "action", label: "الإجراء" },
      { key: "user", label: "المستخدم" },
      { key: "control", label: "تحكم" },
      { key: "movement", label: "وقت الحركة" },
    ],
    []
  );
  const initialWasselColumnWidths = useMemo(
    () => [100, 180, 150, 140, 160, 110, 110, 130, 170, 140, 180, 90, 220],
    []
  );
  const { columnWidths: wasselColumnWidths, startResize: startWasselColumnResize } =
    useResizableColumns(initialWasselColumnWidths, {
      minWidths: initialWasselColumnWidths.map((width) =>
        Math.max(80, Math.floor(width * 0.55))
      ),
      storageKey: "wassel-orders-table-widths",
      direction: resizeDirection,
    });
  const getWasselResizeConfig = (index: number, side: "left" | "right") => {
    if (wasselTableColumns.length < 2) {
      return { index: -1, invertDelta: false, mode: "pair" as const, edge: side };
    }

    const isOuterLeftEdge =
      (resizeDirection === "rtl" && index === wasselTableColumns.length - 1 && side === "left") ||
      (resizeDirection === "ltr" && index === 0 && side === "left");
    const isOuterRightEdge =
      (resizeDirection === "rtl" && index === 0 && side === "right") ||
      (resizeDirection === "ltr" && index === wasselTableColumns.length - 1 && side === "right");

    if (isOuterLeftEdge || isOuterRightEdge) {
      return { index, invertDelta: false, mode: "single" as const, edge: side };
    }

    if (resizeDirection === "rtl") {
      if (side === "left") {
        return index < wasselTableColumns.length - 1
          ? { index, invertDelta: false, mode: "pair" as const, edge: side }
          : { index: index - 1, invertDelta: true, mode: "pair" as const, edge: side };
      }

      return index > 0
        ? { index: index - 1, invertDelta: false, mode: "pair" as const, edge: side }
        : { index, invertDelta: true, mode: "pair" as const, edge: side };
    }

    if (side === "left") {
      return index > 0
        ? { index: index - 1, invertDelta: false, mode: "pair" as const, edge: side }
        : { index, invertDelta: true, mode: "pair" as const, edge: side };
    }

    return index < wasselTableColumns.length - 1
      ? { index, invertDelta: false, mode: "pair" as const, edge: side }
      : { index: index - 1, invertDelta: true, mode: "pair" as const, edge: side };
  };
  const wasselTableWidth = wasselColumnWidths.reduce(
    (totalWidth, width) => totalWidth + width,
    0
  );

  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainsLoading, setCaptainsLoading] = useState(false);
  const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [fromMode, setFromMode] = useState<"saved" | "map">("saved");
  const [toMode, setToMode] = useState<"saved" | "map">("saved");

  const [form, setForm] = useState<any>({
    customer_id: "",
    order_type: "",
    transport_method_id: "",
    from_address_id: "",
    to_address_id: "",
    from_address: "",
    from_lat: null,
    from_lng: null,
    to_address: "",
    to_lat: null,
    to_lng: null,
    distance_km: 0,
    delivery_fee: 0,
    extra_fee: 0,
    notes: "",
    payment_method: "cod",
    bank_id: "",
    scheduled_at: "",
  });

  /* ======================
      إدارة أنواع الطلبات
  ====================== */
  const [orderTypes, setOrderTypes] = useState<OrderTypeItem[]>([]);
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [typeLoading, setTypeLoading] = useState(false);
  const [typeSaving, setTypeSaving] = useState(false);
  const [editingType, setEditingType] = useState<OrderTypeItem | null>(null);
  const [typeForm, setTypeForm] = useState({ name: "" });

  const [transportMethods, setTransportMethods] = useState<
    TransportMethodItem[]
  >([]);
  const [showTransportsModal, setShowTransportsModal] = useState(false);
  const [showTransportFormModal, setShowTransportFormModal] = useState(false);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportSaving, setTransportSaving] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [editingTransport, setEditingTransport] =
    useState<TransportMethodItem | null>(null);
  const [transportForm, setTransportForm] = useState({
    name: "",
    price_per_km: "",
  });

  const loadOrderTypes = async () => {
    try {
      setTypeLoading(true);
      const res = await api.get("/wassel-orders/types");
      setOrderTypes(res.data?.types || res.data?.data || []);
    } catch (error) {
      console.error("Load order types error:", error);
      setOrderTypes([]);
    } finally {
      setTypeLoading(false);
    }
  };

  const openTypesModal = () => {
    setEditingType(null);
    setTypeForm({ name: "" });
    setShowTypesModal(true);
  };

  const startEditType = (type: OrderTypeItem) => {
    setEditingType(type);
    setTypeForm({ name: type.name });
  };

  const resetTypeForm = () => {
    setEditingType(null);
    setTypeForm({ name: "" });
  };

  const saveType = async () => {
    try {
      if (!typeForm.name.trim()) {
        alert("اكتب اسم النوع");
        return;
      }

      setTypeSaving(true);

      if (editingType) {
        await api.put(`/wassel-orders/types/${editingType.id}`, {
          name: typeForm.name.trim(),
        });
      } else {
        await api.post("/wassel-orders/types", {
          name: typeForm.name.trim(),
        });
      }

      await loadOrderTypes();

      if (!editingType) {
        setForm((prev: any) => ({
          ...prev,
          order_type: typeForm.name.trim(),
        }));
      }

      resetTypeForm();
    } catch (error: any) {
      alert(error?.response?.data?.message || "حدث خطأ أثناء حفظ النوع");
    } finally {
      setTypeSaving(false);
    }
  };

  const deleteType = async (type: OrderTypeItem) => {
    const ok = window.confirm(`هل تريد حذف النوع: ${type.name} ؟`);
    if (!ok) return;

    try {
      await api.delete(`/wassel-orders/types/${type.id}`);
      await loadOrderTypes();

      if (form.order_type === type.name) {
        setForm((prev: any) => ({ ...prev, order_type: "" }));
      }

      if (editingType?.id === type.id) {
        resetTypeForm();
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || "حدث خطأ أثناء حذف النوع");
    }
  };

const loadTransportMethods = async () => {
  try {
    setTransportLoading(true);
      const res = await api.get("/wassel-orders/transport-methods");
    setTransportMethods(res.data?.methods || res.data?.data || []);
  } catch (error) {
    console.error("Load transport methods error:", error);
    setTransportMethods([]);
  } finally {
    setTransportLoading(false);
  }
};

  const openTransportsModal = () => {
    resetTransportForm();
    setShowTransportsModal(true);
  };

  const openTransportForm = (method?: TransportMethodItem) => {
    if (method) {
      setEditingTransport(method);
      setTransportForm({
        name: method.name || "",
        price_per_km: String(method.price_per_km ?? ""),
      });
    } else {
      setEditingTransport(null);
      setTransportForm({
        name: "",
        price_per_km: "",
      });
    }

    setShowTransportFormModal(true);
  };

  const resetTransportForm = () => {
    setEditingTransport(null);
    setTransportForm({
      name: "",
      price_per_km: "",
    });
    setShowTransportFormModal(false);
  };

  const saveTransportMethod = async () => {
    try {
      if (!transportForm.name.trim()) {
        alert("اكتب اسم وسيلة النقل");
        return;
      }

      if (transportForm.price_per_km === "") {
        alert("اكتب سعر الكيلو");
        return;
      }

      setTransportSaving(true);

      const payload = {
        name: transportForm.name.trim(),
        base_fee: 0,
        price_per_km: Number(transportForm.price_per_km),
        included_km: 0,
      };

   if (editingTransport) {
        await api.put(
          `/wassel-orders/transport-methods/${editingTransport.id}`,
          payload
        );
      } else {
        await api.post("/wassel-orders/transport-methods", payload);
      }

      await loadTransportMethods();
      resetTransportForm();
    } catch (error: any) {
      alert(
        error?.response?.data?.message || "حدث خطأ أثناء حفظ تسعيرة وسيلة النقل"
      );
    } finally {
      setTransportSaving(false);
    }
  };

  const deleteTransportMethod = async (method: TransportMethodItem) => {
    const ok = window.confirm(`هل تريد حذف وسيلة النقل: ${method.name} ؟`);
    if (!ok) return;

    try {
      await api.delete(`/wassel-orders/transport-methods/${method.id}`);
      await loadTransportMethods();

      if (editingTransport?.id === method.id) {
        resetTransportForm();
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || "حدث خطأ أثناء حذف وسيلة النقل"
      );
    }
  };

  const selectedTransportMethod = transportMethods.find(
    (method) => String(method.id) === String(form.transport_method_id)
  );

  /* ======================
      الخريطة والمسودة
  ====================== */
  useEffect(() => {
    const state = location.state as any;
    const draft = sessionStorage.getItem("wassel_form_draft");

    if (state?.from === "map") {
      let baseForm = { ...form };

      if (draft) {
        try {
          baseForm = JSON.parse(draft);
        } catch {
          // ignore
        }
      }

      const updatedForm = { ...baseForm };

      if (state.target === "from") {
        setFromMode("map");
        updatedForm.from_address = state.value || "موقع من الخريطة";
        updatedForm.from_lat = state.lat;
        updatedForm.from_lng = state.lng;
        updatedForm.from_address_id = null;
      } else if (state.target === "to") {
        setToMode("map");
        updatedForm.to_address = state.value || "موقع من الخريطة";
        updatedForm.to_lat = state.lat;
        updatedForm.to_lng = state.lng;
        updatedForm.to_address_id = null;
      }

      setForm(updatedForm);
      setShowModal(true);
      sessionStorage.removeItem("wassel_form_draft");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    const handler = (data: any) => {
      if (
        data.type === "wassel_order_created" ||
        data.type === "wassel_assigned" ||
        data.type === "wassel_status"
      ) {
        loadOrders({ silent: true });
      }
    };

    socket.on("admin_notification", handler);

    return () => {
      socket.off("admin_notification", handler);
    };
  }, []);

  /* ======================
      الفلترة والبيانات
  ====================== */
  const getFilteredByDateList = (list: WasselOrder[]) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");

    return list.filter((o) => {
      const orderDate = new Date(o.created_at);
      const orderDateStr = orderDate.toLocaleDateString("en-CA");

      if (dateFilter === "today") return orderDateStr === todayStr;

      if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        return orderDate >= weekAgo;
      }

      return false;
    });
  };

  const dateFilteredOrders = getFilteredByDateList(orders);

  const counts = {
    pending: dateFilteredOrders.filter((o) => o.status === "pending").length,
    processing: dateFilteredOrders.filter((o) =>
      ["confirmed", "preparing", "ready"].includes(o.status)
    ).length,
    delivering: dateFilteredOrders.filter((o) => o.status === "delivering").length,
    completed: dateFilteredOrders.filter((o) => o.status === "completed").length,
    cancelled: dateFilteredOrders.filter((o) => o.status === "cancelled").length,
    scheduled: dateFilteredOrders.filter((o) => o.status === "scheduled").length,
  };

  const visibleOrders = dateFilteredOrders.filter((o) => {
    const t = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !t ||
      o.customer_name?.toLowerCase().includes(t) ||
      o.captain_name?.toLowerCase().includes(t) ||
      String(o.id).includes(t) ||
      String(o.order_number || "").includes(t) ||
      String(o.order_type_name || o.order_type || "")
        .toLowerCase()
        .includes(t);

    if (!matchesSearch) return false;

    switch (activeTab) {
      case "pending":
        return o.status === "pending";
      case "processing":
        return ["confirmed", "preparing", "ready"].includes(o.status);
      case "delivering":
        return o.status === "delivering";
      case "completed":
        return o.status === "completed";
      case "cancelled":
        return o.status === "cancelled";
      case "scheduled":
        return o.status === "scheduled";
      default:
        return false;
    }
  });

  const loadOrders = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await api.get("/wassel-orders");
      const rawOrders = res.data?.orders || [];
      setOrders(
        rawOrders.map((order: any) => ({
          ...order,
          order_type_id: order.order_type,
          order_type: order.order_type_name || order.order_type,
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchCustomerWallet = async (customerId: number) => {
    try {
      const res = await api.get(`/customer-guarantees/${customerId}/balance`);
      setCustomerBalance({
        current_balance: Number(res.data?.balance || 0),
        credit_limit: Number(res.data?.credit_limit || 0),
      });
    } catch (e) {
      console.error("Error fetching wallet", e);
      setCustomerBalance(null);
    }
  };

  useEffect(() => {
    loadOrders();
    loadOrderTypes();
    loadTransportMethods();

    api.get("/customers").then((res) => setCustomers(res.data.customers || []));
    api.get("/wassel-orders/banks").then((res) => setBanks(res.data.banks || []));
  }, []);

  useEffect(() => {
    if (form.customer_id) {
      setAddresses([]);
      api
        .get(`/customer-addresses/customer/${form.customer_id}`)
        .then((res) => setAddresses(res.data.addresses || []));
      fetchCustomerWallet(Number(form.customer_id));
    } else {
      setCustomerBalance(null);
    }
  }, [form.customer_id]);

  useEffect(() => {
    const canCalculate =
      form.transport_method_id &&
      form.from_lat &&
      form.from_lng &&
      form.to_lat &&
      form.to_lng;

    if (!canCalculate) {
      setFeeLoading(false);
      return;
    }

    let cancelled = false;

    const calculateFee = async () => {
      try {
        setFeeLoading(true);

        const res = await api.post("/wassel-orders/calculate-fee", {
          transport_method_id: form.transport_method_id,
          from_lat: form.from_lat,
          from_lng: form.from_lng,
          to_lat: form.to_lat,
          to_lng: form.to_lng,
        });

        if (cancelled) return;

        setForm((prev: any) => ({
          ...prev,
          distance_km: Number(res.data?.distance_km || 0),
          delivery_fee: Number(res.data?.delivery_fee || 0),
          extra_fee: Number(res.data?.extra_fee || 0),
        }));
      } catch (error) {
        if (!cancelled) {
          console.error("Calculate fee error:", error);
        }
      } finally {
        if (!cancelled) {
          setFeeLoading(false);
        }
      }
    };

    calculateFee();

    return () => {
      cancelled = true;
    };
  }, [
    form.transport_method_id,
    form.from_lat,
    form.from_lng,
    form.to_lat,
    form.to_lng,
  ]);

  /* ======================
      Handlers
  ====================== */
  const openCaptainModal = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsCaptainModalOpen(true);
    setCaptainsLoading(true);

    api.get("/captains").then((res) => {
      setCaptains(res.data.captains || []);
      setCaptainsLoading(false);
    });
  };

  const assignCaptain = async (captainId: number) => {
    if (!selectedOrderId) return;

    try {
      const res = await api.post("/wassel-orders/assign", {
        orderId: selectedOrderId,
        captainId,
      });

      if (res.data.success) {
        setIsCaptainModalOpen(false);
        loadOrders({ silent: true });
      }
    } catch {
      alert("حدث خطأ في الإسناد");
    }
  };

  const openCancelModal = (orderId: number) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setCancelOrderId(null);
    setCancelReason("");
  };

  const confirmCancelOrder = async () => {
    if (!cancelOrderId) return;
    if (!cancelReason.trim()) {
      alert("اكتب سبب الإلغاء");
      return;
    }

    try {
      await (api as any).wasselOrders.cancelOrder(
        cancelOrderId,
        cancelReason.trim()
      );
      closeCancelModal();
      loadOrders({ silent: true });
    } catch (e: any) {
      alert(e?.response?.data?.message || "حدث خطأ أثناء إلغاء الطلب");
      console.error(e);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    if (newStatus === "cancelled") {
      openCancelModal(orderId);
      return;
    }

    try {
      await (api as any).wasselOrders.updateStatus(orderId, newStatus);
      loadOrders({ silent: true });
    } catch (e: any) {
      alert(e?.response?.data?.message || "حدث خطأ أثناء تحديث الحالة");
      console.error(e);
    }
  };

  const openAdd = () => {
    setEditingOrder(null);
    setFromMode("saved");
    setToMode("saved");
    setScheduleMode("now");

    setForm({
      customer_id: "",
      order_type: "",
      transport_method_id: "",
      from_address_id: "",
      to_address_id: "",
      from_address: "",
      from_lat: null,
      from_lng: null,
      to_address: "",
      to_lat: null,
      to_lng: null,
      distance_km: 0,
      delivery_fee: 0,
      extra_fee: 0,
      notes: "",
      payment_method: "cod",
      bank_id: "",
      scheduled_at: "",
    });

    setShowModal(true);
  };

  const openEdit = (o: WasselOrder) => {
    setEditingOrder(o);
    setFromMode(o.from_address_id ? "saved" : "map");
    setToMode(o.to_address_id ? "saved" : "map");
    setScheduleMode(o.status === "scheduled" ? "today" : "now");

    setForm({
      customer_id: o.customer_id || "",
      order_type: o.order_type_id || o.order_type || "",
      transport_method_id: o.transport_method_id || "",
      from_address_id: o.from_address_id || "",
      to_address_id: o.to_address_id || "",
      from_address: o.from_address,
      from_lat: o.from_lat,
      from_lng: o.from_lng,
      to_address: o.to_address,
      to_lat: o.to_lat,
      to_lng: o.to_lng,
      distance_km: o.distance_km || 0,
      delivery_fee: o.delivery_fee || 0,
      extra_fee: o.extra_fee || 0,
      notes: o.notes || "",
      payment_method: o.payment_method || "cod",
      bank_id: "",
      scheduled_at: o.scheduled_at || "",
    });

    setShowModal(true);
  };

  const goToMap = (target: "from" | "to") => {
    sessionStorage.setItem("wassel_form_draft", JSON.stringify(form));
    navigate("/map-picker", { state: { target, returnTo: "/orders/wassel" } });
  };

  const saveOrder = async () => {
    try {
      if (
        !form.customer_id ||
        !form.order_type ||
        !form.from_address ||
        !form.to_address
      ) {
        return alert("أكمل البيانات");
      }

      const totalAmount = Number(form.delivery_fee) + Number(form.extra_fee);

      if (form.payment_method === "wallet") {
        if (!customerBalance) return alert("جاري التحقق من رصيد العميل...");

        const available =
          Number(customerBalance.current_balance) +
          Number(customerBalance.credit_limit);

        if (totalAmount > available) {
          return alert(
            `عذراً، الرصيد غير كافٍ. المتاح (مع السقف): ${available.toLocaleString()} ريال. العجز: ${(
              totalAmount - available
            ).toLocaleString()} ريال`
          );
        }
      }

      if (form.payment_method === "bank" && !form.bank_id) {
        return alert("يرجى اختيار البنك المحول إليه");
      }

      let status = "pending";

      if (scheduleMode !== "now" && form.scheduled_at) {
        status = "scheduled";
      }

      const payload = {
        ...form,
        status,
        delivery_fee: Number(form.delivery_fee),
        extra_fee: Number(form.extra_fee),
        from_address_id: fromMode === "map" ? null : form.from_address_id,
        to_address_id: toMode === "map" ? null : form.to_address_id,
      };

      if (editingOrder) {
        await api.put(`/wassel-orders/${editingOrder.id}`, payload);
      } else {
        await api.post("/wassel-orders", payload);
      }

      setShowModal(false);
      loadOrders({ silent: true });
    } catch (e: any) {
      alert(e.response?.data?.message || "حدث خطأ أثناء الحفظ");
    }
  };

  const renderActions = (o: WasselOrder) => {
    if (o.status === "scheduled") {
      return (
        <button
          onClick={() => confirmScheduleApprove(o)}
          className="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700"
        >
          اعتماد
        </button>
      );
    }

    if (o.status === "pending") {
      return (
        <button
          onClick={() => updateOrderStatus(o.id, "confirmed")}
          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
        >
          اعتماد
        </button>
      );
    }

    if (activeTab === "processing") {
      return (
        <div className="flex gap-1 justify-center">
          <button
            onClick={() => openCaptainModal(o.id)}
            className="bg-indigo-600 text-white px-2 py-1 rounded text-xs"
          >
            كابتن
          </button>

          <button
            onClick={() => updateOrderStatus(o.id, "delivering")}
            className="bg-orange-600 text-white px-2 py-1 rounded text-xs"
          >
            توصيل
          </button>
        </div>
      );
    }

    return "—";
  };

  const renderPaymentIcon = (method: string) => {
    switch (method) {
      case "cod":
        return (
          <div className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
            <Banknote size={10} /> استلام
          </div>
        );
      case "wallet":
        return (
          <div className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            <Wallet size={10} /> رصيد
          </div>
        );
      case "bank":
        return (
          <div className="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            <Landmark size={10} /> بنكي
          </div>
        );
      case "online":
        return (
          <div className="flex items-center gap-1 text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
            <CreditCard size={10} /> إلكتروني
          </div>
        );
      default:
        return "—";
    }
  };

  /* ================= Scheduling ================= */
  const [slots, setSlots] = useState<any[]>([]);
  const [dayTab, setDayTab] = useState<"today" | "tomorrow">("today");

  useEffect(() => {
    api
      .get("/wassel-orders/manual/available-slots")
      .then((res) => setSlots(res.data.slots || []))
      .catch((err) => console.error("Slots Error:", err));
  }, []);

  const filteredSlots = slots.filter((s) => {
    const date = new Date(s.start);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const slotDay = new Date(date);
    slotDay.setHours(0, 0, 0, 0);

    if (dayTab === "today") {
      return slotDay.getTime() === today.getTime();
    }

    if (dayTab === "tomorrow") {
      return slotDay.getTime() === tomorrow.getTime();
    }

    return false;
  });

  const formatTime = (t?: string | null) => {
    if (!t) return null;

    return new Date(t).toLocaleTimeString("ar-YE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSchedule = (dateStr?: string | null) => {
    if (!dateStr) return "—";

    const d = new Date(dateStr);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const day = new Date(d);
    day.setHours(0, 0, 0, 0);

    let label = "—";

    if (day.getTime() === today.getTime()) {
      label = "اليوم";
    } else if (day.getTime() === tomorrow.getTime()) {
      label = "غدًا";
    }

    const time = d.toLocaleTimeString("ar-YE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${label} ${time}`;
  };

  const confirmScheduleApprove = (order: WasselOrder) => {
    const timeText = formatSchedule(order.scheduled_at);

    const ok = window.confirm(
      `⚠️ هذا الطلب مجدول\n\nموعده: ${timeText}\n\nهل تريد اعتماده الآن؟`
    );

    if (!ok) return;

    updateOrderStatus(order.id, "confirmed");
  };

  useEffect(() => {
    const pushDelayToast = (order: WasselOrder, minutes: number) => {
      if (delayedOrdersRef.current.has(order.id)) return;

      delayedOrdersRef.current.add(order.id);
      const orderTypeText =
        order.order_type_name || String(order.order_type || "غير محدد");

      actions.addNotification(
        `تأخر طلب وصل لي #${getOrderDisplayNumber(order)}\nنوع الطلب: ${orderTypeText}\nالكابتن: ${
          order.captain_name || "غير معين"
        }\nمدة التأخير: ${minutes} دقيقة`,
        "warning"
      );
      return;

      actions.addNotification(
        `تأخر طلب وصل لي #${getOrderDisplayNumber(order)}\nالكابتن: ${
          order.captain_name || "غير معين"
        }\nمدة التأخير: ${minutes} دقيقة`,
        "warning"
      );
    };

    const checkDelayedOrders = () => {
      const now = Date.now();

      orders.forEach((order) => {
        if (order.status === "completed" || order.status === "cancelled") return;

        let baseTime: string | null | undefined = null;

        if (order.status === "confirmed" || order.status === "preparing") {
          baseTime = order.processing_at;
        } else if (order.status === "ready") {
          baseTime = order.ready_at;
        } else if (order.status === "delivering") {
          baseTime = order.delivering_at;
        }

        if (!baseTime) return;

        const diffMinutes = Math.floor((now - new Date(baseTime).getTime()) / 60000);

        if (diffMinutes >= 30) {
          pushDelayToast(order, diffMinutes);
        }
      });
    };

    if (orders.length) {
      checkDelayedOrders();
    }

    const timer = setInterval(checkDelayedOrders, 60000);
    return () => clearInterval(timer);
  }, [orders, actions]);

  return (
    <>
      <ToastNotifications />

      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📦 طلبات وصل لي
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={openTypesModal}
              className="bg-indigo-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 font-bold"
            >
              <Shapes size={18} />
              إضافة نوع
            </button>

            <button
              onClick={openTransportsModal}
              className="bg-amber-500 text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-amber-600 transition shadow-lg shadow-amber-100 font-bold"
            >
              <Truck size={18} />
              وسيلة النقل
            </button>

            <button
              onClick={openAdd}
              className="bg-green-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100 font-bold"
            >
              <Plus size={18} />
              إضافة طلب
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              <Search
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالعميل / الكابتن / رقم الطلب / نوع الطلب"
                className="w-full rounded-full border border-gray-300 py-2 pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-center border-b pb-3">
            {[
              { k: "all", l: "الكل" },
              { k: "today", l: "اليوم" },
              { k: "week", l: "الأسبوع" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setDateFilter(t.k as DateFilter)}
                className={`${t.k === "all" ? "hidden " : ""}px-4 py-1 rounded-full text-sm font-medium transition ${
                  dateFilter === t.k
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {[
              { k: "pending", l: "🟡 اعتماد" },
              { k: "processing", l: "🔵 معالجة" },
              { k: "delivering", l: "🚚 توصيل" },
              { k: "completed", l: "✅ مكتمل" },
              { k: "cancelled", l: "❌ ملغي" },
              { k: "scheduled", l: "📅 مجدولة" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k as OrderTab)}
                className={`px-4 py-2 rounded-lg border-b-4 transition-all ${
                  activeTab === t.k
                    ? "bg-blue-50 dark:bg-blue-600 border-blue-600 text-blue-700 dark:text-white font-bold shadow-sm"
                    : "bg-white dark:bg-gray-800 border-transparent text-gray-500 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {t.l}{" "}
                <span className={`text-sm px-1.5 rounded-full ml-1 font-black ${
                  activeTab === t.k
                    ? "bg-white/70 dark:bg-white/20 text-blue-700 dark:text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                }`}>
                  ({counts[t.k as keyof typeof counts]})
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm text-gray-400 animate-pulse">
            ⏳ جاري تحميل الطلبات...
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto border border-gray-100">
            <table
              className="text-center border-collapse table-fixed"
              style={{ width: `${wasselTableWidth}px`, minWidth: `${wasselTableWidth}px` }}
            >
              <colgroup>
                {wasselColumnWidths.map((width, index) => (
                  <col key={wasselTableColumns[index].key} style={{ width: `${width}px` }} />
                ))}
              </colgroup>
              <thead className="bg-gray-50 text-gray-500 uppercase">
                <tr className="border-b text-[11px] font-black">
                  {wasselTableColumns.map((column, index) => (
                    (() => {
                      const leftResize = getWasselResizeConfig(index, "left");
                      const rightResize = getWasselResizeConfig(index, "right");

                      return (
                    <th
                      key={column.key}
                      className={`group relative whitespace-nowrap overflow-visible ${
                        index === 0 || index === 11 ? "p-4" : "px-2 py-4"
                      }`}
                    >
                      <span className="block truncate">{column.label}</span>
                      {leftResize.index >= 0 && (
                        <button
                          type="button"
                          onPointerDown={(event) =>
                            startWasselColumnResize(
                              leftResize.index,
                              event,
                              {
                                invertDelta: leftResize.invertDelta,
                                mode: leftResize.mode,
                                edge: leftResize.edge,
                              }
                            )
                          }
                          className="absolute left-0 top-0 z-10 h-full w-4 cursor-col-resize touch-none"
                          aria-label={`تغيير عرض العمود من الجهة اليسرى ${column.label}`}
                          title="اسحب من اليسار لتغيير العرض"
                        >
                          <span className="absolute left-0 top-1/2 block h-[58%] w-px -translate-y-1/2 rounded-full bg-slate-300/80 transition-all group-hover:h-[72%] group-hover:bg-blue-400 hover:bg-blue-500" />
                        </button>
                      )}
                      {rightResize.index >= 0 && (
                        <button
                          type="button"
                          onPointerDown={(event) =>
                            startWasselColumnResize(
                              rightResize.index,
                              event,
                              {
                                invertDelta: rightResize.invertDelta,
                                mode: rightResize.mode,
                                edge: rightResize.edge,
                              }
                            )
                          }
                          className="absolute right-0 top-0 z-10 h-full w-4 cursor-col-resize touch-none"
                          aria-label={`تغيير عرض عمود ${column.label}`}
                          title="اسحب لتغيير عرض العمود"
                        >
                          <span className="absolute right-0 top-1/2 block h-[58%] w-px -translate-y-1/2 rounded-full bg-slate-300/80 transition-all group-hover:h-[72%] group-hover:bg-blue-400 hover:bg-blue-500" />
                        </button>
                      )}
                    </th>
                      );
                    })()
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y text-gray-600">
                {visibleOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-blue-50/30 text-sm transition-colors"
                  >
                    <td className="p-4 font-black text-gray-400">#{getOrderDisplayNumber(o)}</td>

                    <td className="font-bold text-gray-800">{o.customer_name}</td>

                    <td>
                      <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {o.order_type || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        {o.transport_method_name || "—"}
                      </span>
                    </td>

                    <td className="text-indigo-600 font-bold">
                      {o.captain_name || (
                        <span className="text-gray-300 font-normal">لم يسند</span>
                      )}
                    </td>

                    <td>
                      <div className="flex flex-col gap-1 text-xs text-right">
                        <div>
                          <span className="font-bold text-gray-700">من:</span>{" "}
                          {o.from_neighborhood_name ? (
                            <span className="text-blue-700 font-bold">{o.from_neighborhood_name} - </span>
                          ) : null}
                          {o.from_address_detail || o.from_address || o.from_full_address || "—"}
                          {o.from_lat && (
                            <button
                              onClick={() =>
                                window.open(
                                  `https://www.google.com/maps?q=${o.from_lat},${o.from_lng}`,
                                  "_blank"
                                )
                              }
                              className="ml-1 text-blue-500 hover:scale-125 transition"
                              title="نقطة الانطلاق"
                            >
                              <MapPin size={12} />
                            </button>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">إلى:</span>{" "}
                          {o.to_neighborhood_name ? (
                            <span className="text-red-700 font-bold">{o.to_neighborhood_name} - </span>
                          ) : null}
                          {o.to_address_detail || o.to_address || o.to_full_address || "—"}
                          {o.to_lat && (
                            <button
                              onClick={() =>
                                window.open(
                                  `https://www.google.com/maps?q=${o.to_lat},${o.to_lng}`,
                                  "_blank"
                                )
                              }
                              className="ml-1 text-red-500 hover:scale-125 transition"
                              title="نقطة الوصول"
                            >
                              <MapPin size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>{renderPaymentIcon(o.payment_method)}</td>

                    <td className="text-xs font-bold text-gray-800 bg-gray-50/50">
                      {Number(o.delivery_fee) + Number(o.extra_fee)} ريال
                    </td>

                    <td className="px-2">
                      {o.status === "completed" || o.status === "cancelled" ? (
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                            o.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {o.status === "completed" ? "مكتمل" : "ملغي"}
                        </span>
                      ) : (
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="border rounded-lg px-2 py-1 text-[11px] bg-white shadow-sm outline-none focus:ring-1 focus:ring-blue-300"
                        >
                          <option value="pending">اعتماد</option>
                          <option value="confirmed">مؤكد</option>
                          <option value="preparing">تحضير</option>
                          <option value="delivering">توصيل</option>
                          <option value="completed">مكتمل</option>
                          <option value="cancelled">إلغاء</option>
                        </select>
                      )}
                    </td>

                    <td>{renderActions(o)}</td>

                    <td className="px-2 text-[10px]">
                      {o.updater_name ? (
                        <div className="flex flex-col text-blue-600">
                          <span className="font-bold">📝 {o.updater_name}</span>
                          <span className="text-[8px] text-gray-400 italic">
                            مُعدل
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col text-gray-500">
                          <span className="font-medium">
                            👤 {o.creator_name || "نظام"}
                          </span>
                          <span className="text-[8px] text-gray-300 italic">
                            مُنشئ
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      <button
                        onClick={() => openEdit(o)}
                        className="text-blue-600 p-2 hover:bg-blue-100 rounded-xl"
                      >
                        <Edit size={16} />
                      </button>
                    </td>

                    <td className="p-2 text-[10px] text-right space-y-1 font-bold text-indigo-600">
                      {o.status === "scheduled" && o.scheduled_at && (
                        <div>📅 {formatSchedule(o.scheduled_at)}</div>
                      )}

                      {o.processing_at && (
                        <div>⚙️ معالجة: {formatTime(o.processing_at)}</div>
                      )}

                      {o.ready_at && <div>✅ جاهز: {formatTime(o.ready_at)}</div>}

                      {o.delivering_at && (
                        <div>🚚 توصيل: {formatTime(o.delivering_at)}</div>
                      )}

                      {o.completed_at && (
                        <div className="text-green-600">
                          ✔️ مكتمل: {formatTime(o.completed_at)}
                        </div>
                      )}

                      {o.cancelled_at && (
                        <div className="text-red-600">
                          ❌ ملغي: {formatTime(o.cancelled_at)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visibleOrders.length === 0 && (
              <div className="p-20 text-center text-gray-400 font-medium">
                ✨ لا توجد طلبات في هذا القسم حالياً
              </div>
            )}
          </div>
        )}

        {isCaptainModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold">🚗 إسناد كابتن</h2>
                <button
                  onClick={() => setIsCaptainModalOpen(false)}
                  className="text-gray-400 hover:text-black"
                >
                  ✖
                </button>
              </div>

              {captainsLoading ? (
                <div className="text-center py-6">⏳ جاري التحميل...</div>
              ) : captains.length === 0 ? (
                <div className="text-center py-6 text-red-500">
                  لا يوجد كباتن متاحين
                </div>
              ) : (
                <ul className="divide-y max-h-60 overflow-y-auto pr-2">
                  {captains.map((c) => (
                    <li
                      key={c.id}
                      className="flex justify-between items-center py-3 hover:bg-gray-50 px-2 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">
                          معلقة: {c.pending_orders} | اليوم: {c.completed_today}
                        </p>
                      </div>

                      <button
                        onClick={() => assignCaptain(c.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition shadow-sm"
                      >
                        إسناد
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-xl font-bold">
                  {editingOrder ? "✏️ تعديل طلب" : "➕ إضافة طلب"}
                </h2>

                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400"
                >
                  ✖
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <select
                    className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                    value={form.order_type}
                    onChange={(e) =>
                      setForm({ ...form, order_type: e.target.value })
                    }
                  >
                    <option value="">نوع الطلب</option>
                    {orderTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={openTypesModal}
                    className="w-full py-2 rounded-xl border border-dashed border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-sm font-bold transition"
                  >
                    + إدارة الأنواع
                  </button>
                </div>

                <select
                  className="p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                  value={form.customer_id}
                  onChange={(e) =>
                    setForm({ ...form, customer_id: e.target.value })
                  }
                >
                  <option value="">العميل</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="space-y-2">
                  <select
                    className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                    value={form.transport_method_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        transport_method_id: e.target.value,
                      })
                    }
                  >
                    <option value="">وسيلة النقل</option>
                    {transportMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={openTransportsModal}
                    className="w-full py-2 rounded-xl border border-dashed border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-bold transition"
                  >
                    + إدارة وسائل النقل
                  </button>
                </div>
              </div>

              <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
                <p className="font-bold text-sm text-gray-600">
                  من (نقطة الانطلاق):
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setFromMode("saved")}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      fromMode === "saved"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white border text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    محفوظ
                  </button>

                  <button
                    onClick={() => setFromMode("map")}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      fromMode === "map"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white border text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    الخريطة
                  </button>
                </div>

                {fromMode === "saved" ? (
                  <select
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                    value={form.from_address_id}
                    onChange={(e) => {
                      const opt = e.target.selectedOptions[0];
                      setForm({
                        ...form,
                        from_address_id: e.target.value,
                        from_address: opt.dataset.address,
                        from_lat: opt.dataset.lat,
                        from_lng: opt.dataset.lng,
                      });
                    }}
                  >
                    <option value="">اختر عنواناً</option>
                    {addresses.map((a) => (
                      <option
                        key={a.id}
                        value={a.id}
                        data-address={a.address}
                        data-lat={a.latitude}
                        data-lng={a.longitude}
                      >
                        {a.neighborhood_name ? `${a.neighborhood_name} - ${a.address}` : a.address}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => goToMap("from")}
                    className="w-full p-2 border rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                  >
                    {form.from_lat && !isNaN(Number(form.from_lat))
                      ? `📍 تم التحديد (${Number(form.from_lat).toFixed(4)})`
                      : "📍 حدد من الخريطة"}
                  </button>
                )}
              </div>

              <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
                <p className="font-bold text-sm text-gray-600">
                  إلى (نقطة الوصول):
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setToMode("saved")}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      toMode === "saved"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white border text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    محفوظ
                  </button>

                  <button
                    onClick={() => setToMode("map")}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      toMode === "map"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white border text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    الخريطة
                  </button>
                </div>

                {toMode === "saved" ? (
                  <select
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                    value={form.to_address_id}
                    onChange={(e) => {
                      const opt = e.target.selectedOptions[0];
                      setForm({
                        ...form,
                        to_address_id: e.target.value,
                        to_address: opt.dataset.address,
                        to_lat: opt.dataset.lat,
                        to_lng: opt.dataset.lng,
                      });
                    }}
                  >
                    <option value="">اختر عنواناً</option>
                    {addresses.map((a) => (
                      <option
                        key={a.id}
                        value={a.id}
                        data-address={a.address}
                        data-lat={a.latitude}
                        data-lng={a.longitude}
                      >
                        {a.neighborhood_name ? `${a.neighborhood_name} - ${a.address}` : a.address}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => goToMap("to")}
                    className="w-full p-2 border rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                  >
                    {form.to_lat && !isNaN(Number(form.to_lat))
                      ? `📍 تم التحديد (${Number(form.to_lat).toFixed(4)})`
                      : "📍 حدد من الخريطة"}
                  </button>
                )}
              </div>

              <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
                <p className="font-bold text-sm text-gray-600">⏰ وقت التوصيل</p>

                <button
                  onClick={() => {
                    setScheduleMode("now");
                    setForm({ ...form, scheduled_at: "" });
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                    scheduleMode === "now"
                      ? "bg-lime-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  🚀 الآن
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setScheduleMode("today");
                      setDayTab("today");
                    }}
                    className={`py-2 rounded-lg font-bold text-sm transition ${
                      scheduleMode === "today"
                        ? "bg-lime-500 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    اليوم
                  </button>

                  <button
                    onClick={() => {
                      setScheduleMode("tomorrow");
                      setDayTab("tomorrow");
                    }}
                    className={`py-2 rounded-lg font-bold text-sm transition ${
                      scheduleMode === "tomorrow"
                        ? "bg-lime-500 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    غدًا
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                  {filteredSlots.map((s, i) => {
                    const startISO = new Date(s.start).toISOString();

                    const start = new Date(s.start);
                    const end = new Date(s.end);

                    const label =
                      start.toLocaleTimeString("ar-YE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }) +
                      " - " +
                      end.toLocaleTimeString("ar-YE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            scheduled_at: startISO,
                          })
                        }
                        className={`p-2 rounded-xl border text-[11px] font-bold transition ${
                          form.scheduled_at === startISO
                            ? "bg-lime-500 text-white border-lime-500"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div>{dayTab === "today" ? "اليوم" : "غدًا"}</div>
                        <div>{label}</div>
                      </button>
                    );
                  })}

                  {filteredSlots.length === 0 && (
                    <div className="col-span-2 text-center text-gray-400 text-xs">
                      لا توجد أوقات متاحة
                    </div>
                  )}
                </div>
              </div>

              <div className="border p-4 rounded-2xl bg-gray-50 space-y-3">
                <p className="font-bold text-sm text-gray-600 flex items-center gap-2">
                  💳 وسيلة الدفع:
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    {
                      id: "cod",
                      label: "عند الاستلام",
                      icon: <Banknote size={14} />,
                    },
                    {
                      id: "wallet",
                      label: "من الرصيد",
                      icon: <Wallet size={14} />,
                    },
                    {
                      id: "bank",
                      label: "إيداع بنكي",
                      icon: <Landmark size={14} />,
                    },
                    {
                      id: "online",
                      label: "دفع إلكتروني",
                      icon: <CreditCard size={14} />,
                    },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() =>
                        setForm({ ...form, payment_method: method.id })
                      }
                      className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                        form.payment_method === method.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {method.icon}
                      {method.label}
                    </button>
                  ))}
                </div>

                {form.payment_method === "wallet" && customerBalance && (
                  <div
                    className={`mt-3 p-3 rounded-2xl border-2 animate-in fade-in slide-in-from-top-2 ${
                      Number(form.delivery_fee) + Number(form.extra_fee) >
                      customerBalance.current_balance + customerBalance.credit_limit
                        ? "bg-red-50 border-red-200"
                        : "bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-600 font-bold">
                          الرصيد الفعلي:
                        </span>
                        <span
                          className={`font-black ${
                            customerBalance.current_balance < 0
                              ? "text-red-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {customerBalance.current_balance.toLocaleString()} ريال
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-300 text-[11px]">
                        <span className="text-blue-700 font-black">
                          المتاح (مع السقف):
                        </span>
                        <span className="text-blue-800 font-black">
                          {(
                            customerBalance.current_balance +
                            customerBalance.credit_limit
                          ).toLocaleString()}{" "}
                          ريال
                        </span>
                      </div>

                      {Number(form.delivery_fee) + Number(form.extra_fee) >
                        customerBalance.current_balance +
                          customerBalance.credit_limit && (
                        <div className="text-[10px] text-red-600 font-bold text-center mt-1 animate-pulse">
                          ⚠️ تنبيه: إجمالي الرسوم يتجاوز الرصيد المتاح!
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {form.payment_method === "bank" && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                    <label className="text-[10px] font-bold text-gray-400 px-1">
                      🏦 البنك المحول إليه:
                    </label>

                    <select
                      className="w-full p-2 border rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-indigo-300"
                      value={form.bank_id}
                      onChange={(e) =>
                        setForm({ ...form, bank_id: e.target.value })
                      }
                    >
                      <option value="">-- اختر البنك --</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold">
                    رسوم التوصيل
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                    value={form.delivery_fee}
                    onChange={(e) =>
                      setForm({ ...form, delivery_fee: e.target.value })
                    }
                  />
                  {feeLoading && (
                    <p className="text-[11px] text-blue-600 font-semibold">
                      جاري حساب الرسوم...
                    </p>
                  )}
                  {selectedTransportMethod && Number(form.distance_km) > 0 && !feeLoading && (
                    <p className="text-[11px] text-amber-700 font-semibold">
                      المسافة: {Number(form.distance_km || 0)} كم
                      {" | "}سعر الكيلو: {Number(selectedTransportMethod.price_per_km || 0)} ريال
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold">
                    إضافي
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                    value={form.extra_fee}
                    onChange={(e) =>
                      setForm({ ...form, extra_fee: e.target.value })
                    }
                  />
                </div>

                <textarea
                  placeholder="ملاحظات العميل..."
                  className="w-full p-2 border rounded-xl col-span-2 min-h-[80px] outline-none focus:border-blue-500"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-gray-500 hover:text-gray-700"
                >
                  إلغاء
                </button>

                <button
                  onClick={saveOrder}
                  className="px-8 py-2 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-all font-bold"
                >
                  حفظ الطلب
                </button>
              </div>
            </div>
          </div>
        )}

        {showTypesModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shapes size={20} />
                  إدارة أنواع الطلبات
                </h2>

                <button
                  onClick={() => {
                    setShowTypesModal(false);
                    resetTypeForm();
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✖
                </button>
              </div>

              <div className="bg-gray-50 border rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-gray-700 text-sm">
                  {editingType ? "تعديل النوع" : "إضافة نوع جديد"}
                </h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-3 border rounded-xl outline-none focus:border-indigo-500"
                    placeholder="اكتب اسم النوع"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ name: e.target.value })}
                  />

                  <button
                    onClick={saveType}
                    disabled={typeSaving}
                    className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold disabled:opacity-60"
                  >
                    {typeSaving
                      ? "جاري..."
                      : editingType
                      ? "حفظ التعديل"
                      : "إضافة"}
                  </button>

                  {editingType && (
                    <button
                      onClick={resetTypeForm}
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-bold"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-gray-700 text-sm">
                  الأنواع الحالية
                </h3>

                {typeLoading ? (
                  <div className="text-center text-gray-400 py-8">
                    ⏳ جاري تحميل الأنواع...
                  </div>
                ) : orderTypes.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-2xl border">
                    لا توجد أنواع مضافة حتى الآن
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orderTypes.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center justify-between bg-white border rounded-2xl p-4 hover:shadow-sm transition"
                      >
                        <div className="font-bold text-gray-800">
                          {type.name}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setForm((prev: any) => ({
                                ...prev,
                                order_type: String(type.id),
                              }));
                              setShowTypesModal(false);
                            }}
                            className="px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-sm font-bold"
                          >
                            اختيار
                          </button>

                          <button
                            onClick={() => startEditType(type)}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => deleteType(type)}
                            className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showTransportsModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Truck size={20} />
                  إدارة وسائل النقل
                </h2>

                <button
                  onClick={() => {
                    setShowTransportsModal(false);
                    resetTransportForm();
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✖
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => openTransportForm()}
                  className="px-5 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-bold flex items-center gap-2"
                >
                  <Plus size={18} />
                  إضافة وسيلة نقل
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-gray-700 text-sm">
                  وسائل النقل الحالية
                </h3>

                {transportLoading ? (
                  <div className="text-center text-gray-400 py-8">
                    ⏳ جاري تحميل وسائل النقل...
                  </div>
                ) : transportMethods.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-2xl border">
                    لا توجد وسائل نقل مضافة حتى الآن
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transportMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between bg-white border rounded-2xl p-4 hover:shadow-sm transition"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-gray-800">
                            {method.name}
                          </div>
                          <div className="text-sm text-amber-700 font-semibold">
                            كل 1 كم = {Number(method.price_per_km || 0)} ريال
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openTransportForm(method)}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => deleteTransportMethod(method)}
                            className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showTransportFormModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Truck size={18} />
                  {editingTransport ? "تعديل وسيلة النقل" : "إضافة وسيلة نقل"}
                </h3>

                <button
                  onClick={resetTransportForm}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✖
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-600">
                    اسم الوسيلة
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border rounded-xl outline-none focus:border-amber-500"
                    placeholder="اكتب اسم وسيلة النقل"
                    value={transportForm.name}
                    onChange={(e) =>
                      setTransportForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-600">
                    سعر كل 1 كم
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 border rounded-xl outline-none focus:border-amber-500"
                    placeholder="اكتب سعر الكيلو"
                    value={transportForm.price_per_km}
                    onChange={(e) =>
                      setTransportForm((prev) => ({
                        ...prev,
                        price_per_km: e.target.value,
                      }))
                    }
                  />
                </div>

                <p className="text-xs text-gray-400">
                  الرسوم ستُحسب من السيرفر حسب المسافة × سعر الكيلو.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={resetTransportForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-bold"
                >
                  إلغاء
                </button>

                <button
                  onClick={saveTransportMethod}
                  disabled={transportSaving}
                  className="px-5 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-bold disabled:opacity-60"
                >
                  {transportSaving
                    ? "جاري..."
                    : editingTransport
                    ? "حفظ التعديل"
                    : "إضافة"}
                </button>
              </div>
            </div>
          </div>
        )}
        {cancelModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-bold mb-3 text-gray-800">تأكيد إلغاء الطلب</h2>
              <label className="block text-sm font-bold text-gray-700 mb-2">سبب الإلغاء</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="border w-full p-3 rounded-lg mb-4 min-h-[120px] outline-none focus:ring-2 focus:ring-red-300"
                placeholder="اكتب سبب الإلغاء..."
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeCancelModal} className="bg-gray-400 text-white px-4 py-2 rounded">
                  إغلاق
                </button>
                <button type="button" onClick={confirmCancelOrder} className="bg-red-600 text-white px-4 py-2 rounded">
                  تأكيد الإلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WasselOrders;
