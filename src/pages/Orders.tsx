import React, { useState, useEffect, useRef, useMemo } from "react";
import { Plus } from "lucide-react";
import api from "../services/api";
import { io } from "socket.io-client";

/* =====================
   Interfaces
===================== */

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  stores_count: number;
  captain_name?: string;
  status: string;
  order_type?: string;
  is_manual?: number;
  total_amount?: number | string | null;
  delivery_fee?: number | string | null;
  extra_store_fee?: number | string | null;
  created_at: string;
  payment_method_label?: string;
  user_name?: string; 
  // ✅ الحقول الجديدة لآلية المستخدم
  creator_name?: string; 
  updater_name?: string;
  branch_name?: string;

  // ⏱️ أوقات الحركة
  scheduled_at?: string | null;
  processing_at?: string | null;
  ready_at?: string | null;
  delivering_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

interface Captain {
  id: number;
  name: string;
  pending_orders: number;
  completed_today: number;
}

interface OrderDetails {
  id: number;
  restaurants: any[];
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  neighborhood_name?: string;
  latitude?: string;
  longitude?: string;
  map_url?: string;
  delivery_fee: number | string | null;
  extra_store_fee?: number | string | null;
  payment_method?: string;
  depositor_name?: string;
  reference_no?: string;
  attachments?: any[];
  notes?: string;
  status: string;
  user_name?: string;
  updated_at?: string;
}

type DateFilter = "all" | "today" | "week";

/* =====================
   Component & Socket
===================== */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim();
const socket = io(SOCKET_URL);

function ToastNotifications() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    console.log("🔌 Trying socket connection to:", SOCKET_URL);

    const handler = (data: any) => {
      console.log("🔥 Notification Arrived:", data); 
      const id = Date.now();
      setToasts((prev) => [...prev, { ...data, id }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    socket.on("connect", () => {
      console.log("🟢 Socket connected with id:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("🔴 Socket connection error:", err.message);
    });

    socket.on("admin_notification", handler);

    return () => {
      socket.off("admin_notification", handler);
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-[420px] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-white border shadow-lg rounded px-4 py-3 text-sm flex flex-col items-start pointer-events-auto transform transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <div className="font-bold text-gray-800">تنبيه جديد</div>
          </div>
          <div className="mt-1 text-gray-600 font-medium">{t.message}</div>
        </div>
      ))}
    </div>
  );
}

const Orders: React.FC = () => {
  // ========= الطلبات =========
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdminBranch = !!currentUser?.is_admin_branch;

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  // ========= الكباتن =========
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainsLoading, setCaptainsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);

  // ========= تفاصيل الطلب =========
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderDetails | null>(null);

  const depositorName = (selectedOrderDetails as any)?.depositor_name;
  const referenceNo = (selectedOrderDetails as any)?.reference_no;
  const attachments = (selectedOrderDetails as any)?.attachments || [];

  const paymentMethodLabelMap: any = {
    cod: "الدفع عند الاستلام",
    bank: "إيداع بنكي",
    wallet: "الدفع من الرصيد",
    electronic: "دفع إلكتروني",
  };
  const paymentMethod = (selectedOrderDetails as any)?.payment_method;
  const paymentMethodLabel = paymentMethodLabelMap[paymentMethod] || "غير محدد";

  // ========= إضافة طلب =========
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  
  // ⏰ الجدولة
  const [scheduleMode, setScheduleMode] = useState<"now" | "today" | "tomorrow">("now");
  const [slots, setSlots] = useState<any[]>([]);
  const [dayTab, setDayTab] = useState<"today" | "tomorrow">("today");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [gpsLink, setGpsLink] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [currentRestaurant, setCurrentRestaurant] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState<
    "cod" | "bank" | "electronic" | "wallet" | null
  >(null);

  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletAllowed, setWalletAllowed] = useState<boolean>(true);
  const [banks, setBanks] = useState<any[]>([]);

  // عند اختيار عميل، نقوم بجلب عناوينه فقط
  useEffect(() => {
    if (selectedCustomer) {
      setSelectedAddress(null);
      setGpsLink("");
      fetchCustomerAddresses(selectedCustomer.id);
    } else {
      setAddresses([]);
    }
  }, [selectedCustomer]);

  // جلب أوقات الجدولة
  useEffect(() => {
    if (!showAddOrderModal) return;
    api.get("/wassel-orders/manual/available-slots")
      .then(res => {
        if (res.data.success) {
          setSlots(res.data.slots || []);
        } else {
          setSlots([]);
        }
      })
      .catch(err => {
        console.error("Slots Error:", err);
        setSlots([]);
      });
  }, [showAddOrderModal]);

  const fetchCustomerAddresses = async (customerId: number) => {
    try {
      const res = await api.get(`/customer-addresses/customer/${customerId}`);
      if (res.data.success) {
        setAddresses(res.data.addresses);
      }
    } catch (err) {
      console.error("خطأ في جلب عناوين العميل:", err);
    }
  };

  /* =====================
       جلب البيانات
  ===================== */
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // نطلب 1000 طلب لنضمن وجود داتا كافية للفلترة في الفرونت
      const res = await api.orders.getOrders({ limit: 1000 });
      const list = Array.isArray(res.orders || res) ? res.orders || res : [];
      setOrders(list);
    } catch (error) {
      console.error("❌ خطأ في جلب الطلبات:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaptains = async () => {
    setCaptainsLoading(true);
    try {
      const res = await api.captains.getAvailableCaptains();
      setCaptains(res.captains || res);
    } catch (error) {
      console.error("❌ خطأ في جلب الكباتن:", error);
    } finally {
      setCaptainsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    api.get("/customers").then((res) => {
      const list = Array.isArray(res.data.customers) ? res.data.customers : [];
      setCustomers(list);
    });

    api.get("/restaurants").then((res) => {
      const list = Array.isArray(res.data.restaurants) ? res.data.restaurants : [];
      setRestaurants(list);
    });
  }, []);

  useEffect(() => {
    if (!showAddOrderModal) return;

    api.get("/payments/banks/active").then((res) => {
      setBanks(res.data?.methods || []);
    });

    if (selectedCustomer) {
      api.get(`/customer-guarantees/${selectedCustomer.id}/balance`).then((res) => {
        setWalletBalance(res.data?.balance || 0);
        setWalletAllowed(res.data?.exists !== false);
      });
    }
  }, [showAddOrderModal, selectedCustomer]);

  /* =====================
       أوامر الطلب
  ===================== */
  const openCaptainModal = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsCaptainModalOpen(true);
    fetchCaptains();
  };

  const assignCaptain = async (captainId: number) => {
    if (!selectedOrderId) return;
    try {
      await api.orders.assignCaptain(selectedOrderId, captainId);
      alert("✅ تم تعيين الكابتن بنجاح");
      setIsCaptainModalOpen(false);
      setSelectedOrderId(null);
      fetchOrders();
    } catch (error) {
      console.error("❌ خطأ في إسناد الكابتن:", error);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await api.orders.updateStatus(orderId, newStatus);
      fetchOrders();
    } catch (error) {
      console.error("❌ خطأ في تحديث الحالة:", error);
    }
  };

  const openDetailsModal = async (orderId: number) => {
    try {
      const existingOrder = orders.find((o) => o.id === orderId);
      const res = await api.orders.getOrderDetails(orderId);
      let details = res.order || res;

      if (existingOrder) {
        details = {
          ...details,
          user_name: details.user_name || existingOrder.user_name,
          status: details.status || existingOrder.status,
        };
      }

      setSelectedOrderDetails(details);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error("❌ خطأ في جلب تفاصيل الطلب:", error);
    }
  };

  const formatAmount = (amount: any): string => {
    const num = Number(amount);
    return isNaN(num) ? "-" : num.toFixed(2) + " ريال";
  };

  const openCancelModal = (orderId: number) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!cancelOrderId) return;
    if (!cancelReason.trim()) {
      return alert("اكتب سبب الإلغاء");
    }
    try {
      await api.orders.updateStatus(cancelOrderId, "cancelled", {
        reason: cancelReason,
      });
      setCancelModalOpen(false);
      setCancelOrderId(null);
      setCancelReason("");
      fetchOrders();
    } catch (err) {
      console.error("خطأ في إلغاء الطلب:", err);
    }
  };

  // ================= فلترة أوقات الجدولة =================
  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      const date = new Date(s.start);
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate()+1);
      const slotDay = new Date(date);
      slotDay.setHours(0,0,0,0);

      if (dayTab === "today") {
        return slotDay.getTime() === today.getTime();
      }
      if (dayTab === "tomorrow") {
        return slotDay.getTime() === tomorrow.getTime();
      }
      return false;
    });
  }, [slots, dayTab]);

  // ====================================
  //          إضافة طلب جديد (متعدد المطاعم)
  // ====================================
  type CartGroup = {
    restaurant: any;
    items: any[];
  };

  const [groups, setGroups] = useState<CartGroup[]>([]);
  const [restaurantCategories, setRestaurantCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [showProductsModal, setShowProductsModal] = useState(false);

  const selectCustomer = async (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer);
    setAddresses([]);
    setSelectedAddress(null);
    if (!customer) return;
  };

  const selectRestaurant = async (restaurantId: number) => {
    const rest = restaurants.find((r) => r.id === restaurantId);
    if (!rest) return;
    setCurrentRestaurant(rest);
    try {
      const catRes = await api.get(`/restaurants/${restaurantId}/categories`);
      const cats = Array.isArray(catRes.data?.categories) ? catRes.data.categories : [];
      setRestaurantCategories(cats);
      setSelectedCategory(cats.length ? cats[0].id : null);
    } catch (err) {
      console.error("خطأ في جلب الفئات:", err);
      setRestaurantCategories([]);
      setSelectedCategory(null);
    }
  };

  const openProductsModal = async () => {
    if (!currentRestaurant) return alert("اختر مطعم أولا");
    try {
      const prodRes = await api.get(`/restaurants/${currentRestaurant.id}/products`);
      const prods = Array.isArray(prodRes.data?.products) ? prodRes.data.products : [];
      setProducts(prods);
      setShowProductsModal(true);
    } catch (err) {
      console.error("خطأ في جلب المنتجات:", err);
      setProducts([]);
      setShowProductsModal(true);
    }
  };

  const addToCart = (product: any) => {
    if (!currentRestaurant) return;
    setGroups((prev) => {
      const idx = prev.findIndex((g) => g.restaurant.id === currentRestaurant.id);
      if (idx === -1) {
        return [
          ...prev,
          {
            restaurant: currentRestaurant,
            items: [{ ...product, quantity: 1 }],
          },
        ];
      }
      return prev.map((g) => {
        if (g.restaurant.id !== currentRestaurant.id) return g;
        const exists = g.items.find((p) => p.id === product.id);
        if (exists) {
          return {
            ...g,
            items: g.items.map((p) =>
              p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
            ),
          };
        }
        return {
          ...g,
          items: [...g.items, { ...product, quantity: 1 }],
        };
      });
    });
  };

  const updateItemQty = (restaurantId: number, productId: number, qty: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.restaurant.id !== restaurantId) return g;
        return {
          ...g,
          items: g.items
            .map((i) => (i.id === productId ? { ...i, quantity: qty } : i))
            .filter((i) => i.quantity > 0),
        };
      })
    );
  };

  const removeRestaurantGroup = (restaurantId: number) => {
    setGroups((prev) => prev.filter((g) => g.restaurant.id !== restaurantId));
  };

  const saveOrder = async () => {
    if (!selectedCustomer || !selectedAddress || groups.length === 0) {
      return alert("اكمل البيانات المطلوبة");
    }
    if (!newOrderPaymentMethod) {
      return alert("اختر طريقة الدفع");
    }
    if (newOrderPaymentMethod === "bank" && !selectedBankId) {
      return alert("اختر البنك");
    }

    const payload = {
      customer_id: selectedCustomer.id,
      address_id: selectedAddress.id,
      gps_link: gpsLink,
      scheduled_at: scheduleMode === "now" ? null : scheduledAt,
      payment_method: newOrderPaymentMethod,
      bank_id: newOrderPaymentMethod === "bank" ? selectedBankId : null,
      restaurants: groups.map((g) => ({
        restaurant_id: g.restaurant.id,
        products: g.items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
        })),
      })),
    };

    await api.post("/orders", payload);
    alert("✅ تم إضافة الطلب");
    setShowAddOrderModal(false);
    setGroups([]);
    setCurrentRestaurant(null);
    setNewOrderPaymentMethod(null);
    setSelectedBankId(null);
    fetchOrders();
  };

  // ========= تبويبات الحالات والفلترة =========
  type OrderTab =
    | "pending"
    | "processing"
    | "ready"
    | "delivering"
    | "completed"
    | "cancelled"
    | "scheduled";

  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [searchTerm, setSearchTerm] = useState("");

  /* ============================================================
     🔥 (تصحيح هام): فصل الفلترة الزمنية لتستخدم في العدادات والجدول
  ============================================================ */
  
  // 1️⃣ أولاً: فلترة البيانات حسب التاريخ (اليوم / أسبوع / الكل)
  const filteredByDateOrders = useMemo(() => {
    const now = new Date();
    
    // دالة مساعدة لمقارنة التواريخ (بدون الوقت)
    const isSameDay = (d1: Date, d2: Date) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    if (dateFilter === "today") {
      return orders.filter((o) => {
        const d = new Date(o.created_at);
        return isSameDay(d, now);
      });
    }

    if (dateFilter === "week") {
      return orders.filter((o) => {
        const d = new Date(o.created_at);
        const diff = now.getTime() - d.getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
      });
    }

    return orders; // all
  }, [orders, dateFilter]);

  // 2️⃣ ثانياً: حساب العدادات بناءً على القائمة المفلترة زمنياً
  const counts = useMemo(() => {
    const list = filteredByDateOrders; // ✅ نستخدم القائمة المفلترة هنا
    return {
      scheduled: list.filter(o => o.status === "scheduled").length,
      pending: list.filter(o => o.status === "pending").length,
      processing: list.filter(o => o.status === "confirmed" || o.status === "preparing").length,
      ready: list.filter(o => o.status === "ready").length,
      delivering: list.filter(o => o.status === "delivering").length,
      completed: list.filter(o => o.status === "completed").length,
      cancelled: list.filter(o => o.status === "cancelled").length,
    };
  }, [filteredByDateOrders]);

  // 3️⃣ ثالثاً: فلترة الجدول (تعتمد أيضاً على القائمة المفلترة زمنياً + التبويب + البحث)
  const visibleOrders = useMemo(() => {
    let filtered = filteredByDateOrders; // ✅ نبدأ من القائمة المفلترة زمنياً

    // أ. فلترة البحث
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.customer_name?.toLowerCase().includes(t) ||
        o.id.toString().includes(t) ||
        o.customer_phone?.includes(t)
      );
    }

    // ب. فلترة التبويب
    switch (activeTab) {
      case "scheduled": return filtered.filter(o => o.status === "scheduled");
      case "pending": return filtered.filter(o => o.status === "pending");
      case "processing": return filtered.filter(o => o.status === "confirmed" || o.status === "preparing");
      case "ready": return filtered.filter(o => o.status === "ready");
      case "delivering": return filtered.filter(o => o.status === "delivering");
      case "completed": return filtered.filter(o => o.status === "completed");
      case "cancelled": return filtered.filter(o => o.status === "cancelled");
      default: return filtered;
    }
  }, [filteredByDateOrders, activeTab, searchTerm]);

  const formatScheduleTime = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const clean = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const today = clean(now);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const target = clean(d);
    let dayLabel = "";
    if (target.getTime() === today.getTime()) dayLabel = "اليوم";
    else if (target.getTime() === tomorrow.getTime()) dayLabel = "غدًا";
    else dayLabel = d.toLocaleDateString("ar-YE");
    const time = d.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" });
    return `${dayLabel} / ${time}`;
  };

  // ====================================
  //                JSX
  // ====================================
  const renderActions = (o: Order) => {
    switch (activeTab) {
      case "pending":
        return (
          <div className="flex gap-2 justify-center">
            <button onClick={() => updateOrderStatus(o.id, "confirmed")} className="bg-green-600 text-white px-2 py-1 rounded text-xs">اعتماد</button>
            <button onClick={() => openCancelModal(o.id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs">إلغاء</button>
          </div>
        );
      case "processing":
        return (
          <div className="flex gap-2 justify-center">
            <button onClick={() => updateOrderStatus(o.id, "ready")} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">جاهز</button>
            <button onClick={() => openCaptainModal(o.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">كابتن</button>
            <button onClick={() => updateOrderStatus(o.id, "cancelled")} className="bg-red-600 text-white px-2 py-1 rounded text-xs">إلغاء</button>
          </div>
        );
      case "ready":
        return (
          <div className="flex gap-2 justify-center">
            <button onClick={() => openCaptainModal(o.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">تعيين كابتن</button>
            <button onClick={() => updateOrderStatus(o.id, "preparing")} className="bg-gray-600 text-white px-2 py-1 rounded text-xs">رجوع للمعالجة</button>
          </div>
        );
      case "delivering":
        return (
          <div className="flex gap-2 justify-center">
            <button onClick={() => updateOrderStatus(o.id, "completed")} className="bg-green-600 text-white px-2 py-1 rounded text-xs">تم التسليم</button>
            <button onClick={() => updateOrderStatus(o.id, "cancelled")} className="bg-red-600 text-white px-2 py-1 rounded text-xs">إلغاء</button>
          </div>
        );
      default:
        return <span className="text-gray-400">—</span>;
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>فاتورة الطلب</title>
          <style>body { font-family: sans-serif; padding: 20px; direction: rtl; }</style>
        </head>
        <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <>
      <ToastNotifications /> 

      {/* ===== رأس الصفحة ===== */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">الطلبات</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddOrderModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> إضافة طلب
            </button>
            <button
              onClick={fetchOrders}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              🔄 تحديث
            </button>
          </div>
        </div>
        
        <div className="flex justify-center my-3">
          <input
            type="text"
            placeholder="🔍 بحث بالاسم / الهاتف / رقم الطلب"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80 px-4 py-2 rounded-full text-sm border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none text-center"
          />
        </div>

        {/* تبويبات الحالات */}
        <div className="flex gap-2 flex-wrap justify-center my-4">
          {[
            { key: "pending", label: "🟡 اعتماد" },
            { key: "processing", label: "🔵 قيد المعالجة" },
            { key: "ready", label: "🟢 جاهز" },
            { key: "delivering", label: "🚚 قيد التوصيل" },
            { key: "completed", label: "✅ مكتمل" },
            { key: "cancelled", label: "❌ ملغي" },
            { key: "scheduled", label: "📅 مجدولة" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as OrderTab)}
              className={`px-4 py-2 rounded ${
                activeTab === t.key ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {t.label}{" "}
              <span className="text-sm font-bold">
                ({counts[t.key as keyof typeof counts] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* فلترة زمنية */}
        <div className="flex gap-2 justify-center w-full">
          {[
            { key: "all", label: "كل الطلبات" },
            { key: "today", label: "اليوم" },
            { key: "week", label: "هذا الأسبوع" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setDateFilter(t.key as DateFilter)}
              className={`px-3 py-1 rounded text-sm ${
                dateFilter === t.key ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== جدول الطلبات ===== */}
      {loading ? (
        <div className="p-6 text-center">⏳ جاري التحميل...</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr className="text-center">
                <th className="px-2">رقم</th>
                <th className="px-2">العميل</th>
                <th className="px-2">المطعم</th>
                <th className="px-2">الكابتن</th>
                <th className="px-2">المبلغ</th>
                <th className="px-2">نوع الدفع</th>
                <th className="px-2">الحالة</th>
                <th className="px-2">تفاصيل</th>
                <th className="px-2">تعيين كابتن</th>
                <th className="px-2">وقت الحركة</th>
                <th className="px-2">المستخدم</th>
                {isAdminBranch && <th className="px-2">الفرع</th>}
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-gray-50 text-center">
                  <td className="px-2">#{o.id}</td>
                  <td className="px-2">{o.customer_name}</td>
                  <td className="px-2">{o.stores_count} مطعم</td>
                  <td className="px-2">{o.captain_name || "لم يُعيّن"}</td>
                  <td className="px-2">{formatAmount(o.total_amount)}</td>
                  <td className="px-2">{o.payment_method_label || "-"}</td>
                  <td className="px-2">
                    {o.status === "completed" || o.status === "cancelled" ? (
                      <span className={`px-2 py-1 rounded text-sm font-semibold ${
                        o.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {o.status === "completed" ? "مكتمل" : "ملغي"}
                      </span>
                    ) : (
                      <select
                        value={o.status}
                        onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="pending">قيد الانتظار</option>
                        <option value="confirmed">مؤكد</option>
                        <option value="preparing">قيد التحضير</option>
                        <option value="ready">جاهز</option>
                        <option value="delivering">قيد التوصيل</option>
                      </select>
                    )}
                  </td>
                  <td className="px-2">
                    <button onClick={() => openDetailsModal(o.id)} className="text-blue-600 hover:underline">عرض</button>
                  </td>
                  <td className="px-2">{renderActions(o)}</td>
                  <td className="px-2 text-[11px] text-right space-y-1 font-bold text-indigo-600">
                    {o.scheduled_at && <div>📅 {formatScheduleTime(o.scheduled_at)}</div>}
                    {o.processing_at && <div>⚙️ {new Date(o.processing_at).toLocaleTimeString("ar-YE")}</div>}
                    {o.ready_at && <div>✅ {new Date(o.ready_at).toLocaleTimeString("ar-YE")}</div>}
                    {o.delivering_at && <div>🚚 {new Date(o.delivering_at).toLocaleTimeString("ar-YE")}</div>}
                    {o.completed_at && <div className="text-green-600">✔️ {new Date(o.completed_at).toLocaleTimeString("ar-YE")}</div>}
                    {o.cancelled_at && <div className="text-red-600">❌ {new Date(o.cancelled_at).toLocaleTimeString("ar-YE")}</div>}
                  </td>
                  <td className="px-2 text-sm text-gray-700 font-medium">
                    {o.updater_name ? (
                      <div className="flex flex-col items-center">
                        <span className="text-blue-600">📝 {o.updater_name}</span>
                        <small className="text-[10px] text-gray-400">آخر تحديث</small>
                      </div>
                    ) : o.creator_name ? (
                      <div className="flex flex-col items-center">
                        <span className="text-gray-800">👤 {o.creator_name}</span>
                        <small className="text-[10px] text-gray-400">لوحة التحكم</small>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">📱 طلب تطبيق</span>
                    )}
                  </td>
                  {isAdminBranch && <td className="px-2 text-sm text-gray-700">{o.branch_name || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== مودال تعيين الكابتن ===== */}
      {isCaptainModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold">🚗 اختر الكابتن</h2>
              <button onClick={() => setIsCaptainModalOpen(false)}>✖</button>
            </div>
            {captainsLoading ? (
              <div className="py-6 text-center">⏳ جاري التحميل...</div>
            ) : captains.length === 0 ? (
              <div className="py-6 text-center">❌ لا يوجد كباتن متاحين</div>
            ) : (
              <ul className="divide-y mt-4">
                {captains.map((c) => (
                  <li key={c.id} className="flex justify-between items-center py-3">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-sm text-gray-600">🕓 معلقة: {c.pending_orders} | ✅ مكتملة اليوم: {c.completed_today}</p>
                    </div>
                    <button onClick={() => assignCaptain(c.id)} className="bg-green-600 text-white px-3 py-1 rounded">تعيين</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 text-right">
              <button onClick={() => setIsCaptainModalOpen(false)} className="bg-gray-400 text-white px-4 py-2 rounded">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال تفاصيل الطلب ===== */}
      {isDetailsModalOpen && selectedOrderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div ref={printRef} className="p-6 overflow-y-auto">
              <h2 className="text-lg font-bold mb-4 text-center">🧾 فاتورة الطلب #{selectedOrderDetails.id}</h2>
              {(() => {
                const restaurants = selectedOrderDetails.restaurants || [];
                const allRestaurantsTotal = restaurants.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
                const delivery = Number(selectedOrderDetails.delivery_fee || 0);
                const extraStore = Number(selectedOrderDetails.extra_store_fee || 0);
                const grandTotal = allRestaurantsTotal + delivery + extraStore;

                return (
                  <>
                    {restaurants.map((r: any, idx: number) => (
                      <div key={idx} className="mb-6 border rounded p-3">
                        <h3 className="font-bold text-lg mb-2">🏪 {r.name}</h3>
                        <table className="w-full mb-2 border">
                          <thead className="bg-gray-100">
                            <tr><th>المنتج</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th></tr>
                          </thead>
                          <tbody>
                            {r.items.map((p: any, i: number) => (
                              <tr key={i}>
                                <td className="border px-2 py-1">{p.name}</td>
                                <td className="border">{p.price} ر.س</td>
                                <td className="border">{p.quantity}</td>
                                <td className="border font-semibold text-green-600">{p.subtotal} ر.س</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="text-right font-bold">إجمالي المطعم: {Number(r.total || 0).toFixed(2)} ريال</div>
                      </div>
                    ))}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="border p-3 rounded bg-gray-50">
                        <p>🧮 إجمالي المطاعم: {allRestaurantsTotal.toFixed(2)} ريال</p>
                        <p>📦 رسوم التوصيل: {delivery.toFixed(2)} ريال</p>
                        {extraStore > 0 && <p>🏪 رسوم المحل الإضافي: {extraStore.toFixed(2)} ريال</p>}
                        <p className="text-lg font-bold text-blue-600">💰 الإجمالي الكلي: {grandTotal.toFixed(2)} ريال</p>
                      </div>
                      <div className="border p-3 rounded bg-white">
                        <h4 className="font-bold mb-2">💳 تفاصيل الدفع</h4>
                        <p>طريقة الدفع: <strong>{paymentMethodLabel}</strong></p>
                        {(paymentMethod === "bank" || paymentMethod === "wallet") && (
                          <>
                            {depositorName && <p>اسم المودع: {depositorName}</p>}
                            {referenceNo && <p>رقم الحوالة: {referenceNo}</p>}
                            {attachments?.length > 0 && (
                              <div className="mt-2">
                                <p className="font-semibold">المرفقات:</p>
                                <div className="flex gap-2 mt-1">
                                  {attachments.map((f: any, i: number) => (
                                    <a key={i} href={f.url} target="_blank">
                                      <img src={f.thumb} className="w-16 h-16 rounded border" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="border p-3 rounded">
                        <h3 className="font-bold mb-2">🏪 المطاعم المشاركة</h3>
                        {restaurants.map((r: any, i: number) => (
                          <div key={i} className="mb-2 text-sm">
                            <p>الاسم: {r.name}</p>
                            <p>الهاتف: {r.phone}</p>
                            {r.map_url && <a href={r.map_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">عرض على الخريطة 🌍</a>}
                            <hr className="my-2" />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="border p-3 rounded">
                          <h3 className="font-bold mb-1">👤 بيانات العميل</h3>
                          <p>الاسم: {selectedOrderDetails.customer_name}</p>
                          <p>الهاتف: {selectedOrderDetails.customer_phone}</p>
                          <p>📍 العنوان: <strong>{selectedOrderDetails.neighborhood_name ? `${selectedOrderDetails.neighborhood_name} - ` : ""}{selectedOrderDetails.customer_address || "-"}</strong></p>
                          {selectedOrderDetails.map_url && <p><a href={selectedOrderDetails.map_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">عرض على الخريطة 🌍</a></p>}
                        </div>
                        <div className="border p-3 rounded bg-yellow-50">
                          <h3 className="font-bold mb-1">📝 ملاحظات الطلب</h3>
                          <p className="text-gray-700">{selectedOrderDetails.notes || "لا توجد ملاحظات"}</p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between items-center p-4 border-t bg-gray-100">
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-700">الحالة:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${selectedOrderDetails.status === 'completed' ? 'bg-green-100 text-green-700' : selectedOrderDetails.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {{ pending: "قيد الانتظار", confirmed: "مؤكد", preparing: "قيد التحضير", ready: "جاهز", delivering: "قيد التوصيل", completed: "مكتمل", cancelled: "ملغي" }[selectedOrderDetails.status as string] || selectedOrderDetails.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600"><span className="font-bold">المستخدم: </span><span className="font-medium text-black">{(selectedOrderDetails as any).user_name || "—"}</span></div>
                <div className="text-xs text-gray-500 dir-ltr">🕒 {new Date((selectedOrderDetails as any).updated_at || new Date()).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, day: 'numeric', month: 'numeric' })}</div>
              </div>
              <div className="flex gap-3">
                <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">🧾 طباعة الفاتورة</button>
                <button onClick={() => setIsDetailsModalOpen(false)} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition">إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال إضافة الطلب ===== */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">➕ إضافة طلب جديد</h2>
            <label className="block font-semibold mb-1">👤 اختر العميل:</label>
            <select onChange={(e) => selectCustomer(Number(e.target.value))} className="border w-full p-2 rounded mb-3 focus:ring-2 focus:ring-blue-500">
              <option value="">-- اختر العميل من القائمة --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
            <select value={selectedAddress?.id || ""} onChange={(e) => {
              const addr = addresses.find((a) => a.id == Number(e.target.value));
              setSelectedAddress(addr || null);
              if (addr?.gps_link) setGpsLink(addr.gps_link);
              else if (addr?.latitude && addr?.longitude) setGpsLink(`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`);
              else setGpsLink("");
            }} className="border w-full p-2 rounded focus:ring-2 focus:ring-blue-500" disabled={!selectedCustomer}>
              <option value="">{selectedCustomer ? "-- اختر عنوان العميل --" : "⚠️ يرجى اختيار عميل أولاً"}</option>
              {addresses.map((a) => <option key={a.id} value={a.id}>{`${a.neighborhood_name || "بدون حي"} - ${a.address || ""}`}</option>)}
            </select>

            <div className="border p-3 rounded bg-gray-50 mt-4 space-y-3">
              <h3 className="font-bold text-sm text-gray-700">⏰ وقت التوصيل</h3>
              <button type="button" onClick={() => { setScheduleMode("now"); setScheduledAt(null); }} className={`w-full py-2 rounded font-bold text-sm ${scheduleMode === "now" ? "bg-lime-500 text-white" : "bg-gray-200"}`}>🚀 الآن</button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setScheduleMode("today"); setDayTab("today"); }} className={`py-2 rounded text-sm font-bold ${scheduleMode === "today" ? "bg-lime-500 text-white" : "bg-gray-200"}`}>اليوم</button>
                <button type="button" onClick={() => { setScheduleMode("tomorrow"); setDayTab("tomorrow"); }} className={`py-2 rounded text-sm font-bold ${scheduleMode === "tomorrow" ? "bg-lime-500 text-white" : "bg-gray-200"}`}>غدًا</button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {filteredSlots.map((s, i) => {
                  const startISO = new Date(s.start).toISOString();
                  const start = new Date(s.start);
                  const end = new Date(s.end);
                  const label = start.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" }) + " - " + end.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <button key={i} type="button" onClick={() => setScheduledAt(startISO)} className={`p-2 rounded border text-[11px] font-bold ${scheduledAt === startISO ? "bg-lime-500 text-white border-lime-500" : "bg-white"}`}>
                      <div>{dayTab === "today" ? "اليوم" : "غدًا"}</div><div>{label}</div>
                    </button>
                  );
                })}
                {filteredSlots.length === 0 && <div className="col-span-2 text-center text-gray-400 text-xs">لا توجد أوقات متاحة</div>}
              </div>
            </div>

            <h3 className="font-bold mb-2 mt-4">💳 طريقة الدفع</h3>
            <div className="flex gap-3 flex-wrap mb-3">
              {[ { key: "cod", label: "الدفع عند الاستلام" }, { key: "bank", label: "إيداع بنكي" }, { key: "electronic", label: "دفع إلكتروني" }, { key: "wallet", label: "الدفع من رصيدي" } ].map((m) => (
                <button key={m.key} onClick={() => setNewOrderPaymentMethod(m.key as any)} className={`flex items-center gap-2 px-4 py-2 rounded border ${newOrderPaymentMethod === m.key ? "border-blue-600 bg-blue-50" : "border-gray-300"}`}>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${newOrderPaymentMethod === m.key ? "border-blue-600" : "border-gray-400"}`}>{newOrderPaymentMethod === m.key && <span className="w-2 h-2 rounded-full bg-blue-600" />}</span>
                  {m.label}
                </button>
              ))}
            </div>
            {newOrderPaymentMethod === "bank" && (
              <div className="border p-3 rounded bg-gray-50 mb-3">
                <h4 className="font-semibold mb-2">🏦 اختر البنك</h4>
                <select value={selectedBankId || ""} onChange={(e) => setSelectedBankId(Number(e.target.value))} className="border w-full p-2 rounded">
                  <option value="">-- اختر البنك --</option>
                  {banks.map((b: any) => <option key={b.id} value={b.id}>{b.company} - {b.account_number}</option>)}
                </select>
              </div>
            )}
            {newOrderPaymentMethod === "electronic" && <div className="border p-3 rounded bg-gray-50 mb-3"><h4 className="font-semibold mb-2">🌐 اختر بوابة الدفع</h4><select className="border w-full p-2 rounded"><option value="">-- اختر --</option></select></div>}
            {newOrderPaymentMethod === "wallet" && (
              <div className="border p-3 rounded bg-gray-50 mb-3">
                <h4 className="font-semibold mb-2">👛 رصيدك</h4>
                <p>الرصيد الحالي: <strong className={walletBalance < 0 ? "text-red-600" : "text-green-600"}>{walletBalance.toFixed(2)} ريال</strong></p>
                {!walletAllowed && <p className="text-red-600 mt-2">❌ لا يسمح بالسحب من هذا الحساب (تجاوز السقف)</p>}
                {walletAllowed && walletBalance < 0 && <p className="text-orange-600 mt-2">⚠️ الرصيد سالب لكن مسموح حسب إعدادات الحساب</p>}
              </div>
            )}

            <label className="mt-3 block">🏪 اختر المطعم:</label>
            <select value={currentRestaurant?.id || ""} onChange={(e) => selectRestaurant(Number(e.target.value))} className="border w-full p-2 rounded">
              <option value="">-- اختر --</option>
              {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={openProductsModal} className="bg-blue-600 text-white px-3 py-1 mt-3 rounded" disabled={!currentRestaurant}>📦 تحديد المنتجات</button>

            <h3 className="font-bold mt-4">🛒 السلال:</h3>
            {groups.length === 0 && <div className="text-sm text-gray-500">لم يتم إضافة أي مطعم بعد</div>}
            {groups.map((g) => (
              <div key={g.restaurant.id} className="border rounded p-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">🏪 {g.restaurant.name}</h4>
                  <button onClick={() => removeRestaurantGroup(g.restaurant.id)} className="text-red-600 text-sm">حذف المطعم ✖</button>
                </div>
                {g.items.length === 0 ? <p className="text-sm text-gray-500">لا توجد منتجات</p> : g.items.map((item) => {
                  const total = item.price * item.quantity;
                  return (
                    <div key={item.id} className="flex justify-between items-center border-b py-1">
                      <div className="flex-1">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm text-gray-600">{item.price} ريال × {item.quantity} = <span className="text-green-600 font-bold">{total} ريال</span></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateItemQty(g.restaurant.id, item.id, item.quantity - 1)} className="px-2 py-1 bg-gray-200 rounded">➖</button>
                        <span className="min-w-[24px] text-center">{item.quantity}</span>
                        <button onClick={() => updateItemQty(g.restaurant.id, item.id, item.quantity + 1)} className="px-2 py-1 bg-gray-200 rounded">➕</button>
                        <button onClick={() => updateItemQty(g.restaurant.id, item.id, 0)} className="text-red-600 ml-2">🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <button onClick={() => { setCurrentRestaurant(null); setRestaurantCategories([]); setProducts([]); setSelectedCategory(null); }} className="mt-3 bg-indigo-600 text-white px-3 py-2 rounded">➕ إضافة مطعم آخر</button>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={saveOrder} className="bg-green-600 text-white px-4 py-2 rounded">💾 حفظ</button>
              <button onClick={() => setShowAddOrderModal(false)} className="bg-gray-400 text-white px-4 py-2 rounded">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال اختيار المنتجات ===== */}
      {showProductsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">📦 قائمة المنتجات</h2>
            <div className="flex gap-3 overflow-x-auto border-b pb-2">
              {restaurantCategories.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded ${selectedCategory === cat.id ? "bg-blue-600 text-white" : "bg-gray-200"}`}>{cat.name}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {products.filter((p) => {
                if (!selectedCategory) return true;
                const ids = String(p.category_ids || "").split(",");
                return ids.includes(String(selectedCategory));
              }).map((p) => (
                <div key={p.id} className="border p-2 rounded flex flex-col justify-between">
                  <span className="font-bold">{p.name}</span>
                  <span>{p.price} ريال</span>
                  <button onClick={() => addToCart(p)} className="bg-green-600 text-white mt-2 px-3 py-1 rounded">➕ إضافة</button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowProductsModal(false)} className="bg-gray-400 text-white px-4 py-2 rounded">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال إلغاء الطلب ===== */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-3">تأكيد إلغاء الطلب</h2>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="border w-full p-2 rounded mb-4" placeholder="اكتب سبب الإلغاء..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => setCancelModalOpen(false)} className="bg-gray-400 text-white px-4 py-2 rounded">إغلاق</button>
              <button onClick={confirmCancelOrder} className="bg-red-600 text-white px-4 py-2 rounded">تأكيد الإلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
