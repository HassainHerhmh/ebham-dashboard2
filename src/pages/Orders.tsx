import React, { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import api from "../services/api";

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
  total_amount?: number | string | null;
  delivery_fee?: number | string | null;
  extra_store_fee?: number | string | null;
  created_at: string;
}

interface Captain {
  id: number;
  name: string;
  pending_orders: number;
  completed_today: number;
}

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
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
}

/* =====================
   Component
===================== */

const Orders: React.FC = () => {
  // ========= الطلبات =========
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);


const [cancelModalOpen, setCancelModalOpen] = useState(false);
const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
const [cancelReason, setCancelReason] = useState("");

  // ========= الكباتن =========
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainsLoading, setCaptainsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);

  // ========= تفاصيل الطلب =========
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] =
    useState<OrderDetails | null>(null);

  // ========= إضافة طلب =========
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [gpsLink, setGpsLink] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [currentRestaurant, setCurrentRestaurant] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);

  /* =====================
     جلب البيانات
  ===================== */

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getOrders({ limit: 100 });
      const list = Array.isArray(res.orders || res)
        ? res.orders || res
        : [];
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
      const list = Array.isArray(res.data.customers)
        ? res.data.customers
        : [];
      setCustomers(list);
    });

    api.get("/restaurants").then((res) => {
      const list = Array.isArray(res.data.restaurants)
        ? res.data.restaurants
        : [];
      setRestaurants(list);
    });
  }, []);

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
      const res = await api.orders.getOrderDetails(orderId);
      setSelectedOrderDetails(res.order || res);
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

  // ⬅️ هنا يتوقف الجزء الأول
  // ====================================
  //        إضافة طلب جديد (متعدد المطاعم)
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

    try {
      const res = await api.get(`/customer-addresses?customer_id=${customer.id}`);
      const list = Array.isArray(res.data?.addresses)
        ? res.data.addresses
        : [];
      setAddresses(list);
    } catch (err) {
      console.error("خطأ في جلب عناوين العميل:", err);
      setAddresses([]);
    }
  };

  const selectRestaurant = async (restaurantId: number) => {
    const rest = restaurants.find((r) => r.id === restaurantId);
    if (!rest) return;

    setCurrentRestaurant(rest);

    try {
      const catRes = await api.get(`/restaurants/${restaurantId}/categories`);
      const cats = Array.isArray(catRes.data?.categories)
        ? catRes.data.categories
        : [];

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
      const prodRes = await api.get(
        `/restaurants/${currentRestaurant.id}/products`
      );

      const prods = Array.isArray(prodRes.data?.products)
        ? prodRes.data.products
        : [];

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
      const idx = prev.findIndex(
        (g) => g.restaurant.id === currentRestaurant.id
      );

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
              p.id === product.id
                ? { ...p, quantity: p.quantity + 1 }
                : p
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

  const updateItemQty = (
    restaurantId: number,
    productId: number,
    qty: number
  ) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.restaurant.id !== restaurantId) return g;
        return {
          ...g,
          items: g.items
            .map((i) =>
              i.id === productId ? { ...i, quantity: qty } : i
            )
            .filter((i) => i.quantity > 0),
        };
      })
    );
  };

  const removeRestaurantGroup = (restaurantId: number) => {
    setGroups((prev) =>
      prev.filter((g) => g.restaurant.id !== restaurantId)
    );
  };

  const saveOrder = async () => {
    if (!selectedCustomer || !selectedAddress || groups.length === 0) {
      return alert("اكمل البيانات المطلوبة");
    }

    const payload = {
      customer_id: selectedCustomer.id,
      address_id: selectedAddress.id,
      gps_link: gpsLink,
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
    fetchOrders();
  };
// ========= تبويبات الحالات =========
type OrderTab =
  | "pending"      // اعتماد
  | "processing"   // قيد المعالجة
  | "ready"        // جاهز
  | "delivering"   // قيد التوصيل
  | "completed"    // مكتمل
  | "cancelled";   // ملغي

const [activeTab, setActiveTab] = useState<OrderTab>("pending");

const filterByTab = (list: Order[]) => {
  switch (activeTab) {
    case "pending":
      return list.filter((o) => o.status === "pending");
    case "processing":
      return list.filter(
        (o) => o.status === "confirmed" || o.status === "preparing"
      );
    case "ready":
      return list.filter((o) => o.status === "ready");
    case "delivering":
      return list.filter((o) => o.status === "delivering");
    case "completed":
      return list.filter((o) => o.status === "completed");
    case "cancelled":
      return list.filter((o) => o.status === "cancelled");
    default:
      return list;
  }
};

const visibleOrders = filterByTab(orders);



  // ====================================
  //                JSX
  // ====================================
 const renderActions = (o: Order) => {
  switch (activeTab) {
    case "pending":
      return (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => updateOrderStatus(o.id, "confirmed")}
            className="bg-green-600 text-white px-2 py-1 rounded text-xs"
          >
            اعتماد
          </button>
        <button
  onClick={() => openCancelModal(o.id)}
  className="bg-red-600 text-white px-2 py-1 rounded text-xs"
>
  إلغاء
</button>

        </div>
      );

    case "processing":
      return (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => updateOrderStatus(o.id, "ready")}
            className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
          >
            جاهز
          </button>
          <button
            onClick={() => openCaptainModal(o.id)}
            className="bg-green-600 text-white px-2 py-1 rounded text-xs"
          >
            كابتن
          </button>
          <button
            onClick={() => updateOrderStatus(o.id, "cancelled")}
            className="bg-red-600 text-white px-2 py-1 rounded text-xs"
          >
            إلغاء
          </button>
        </div>
      );

    case "ready":
      return (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => openCaptainModal(o.id)}
            className="bg-green-600 text-white px-2 py-1 rounded text-xs"
          >
            تعيين كابتن
          </button>
          <button
            onClick={() => updateOrderStatus(o.id, "preparing")}
            className="bg-gray-600 text-white px-2 py-1 rounded text-xs"
          >
            رجوع للمعالجة
          </button>
        </div>
      );

    case "delivering":
      return (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => updateOrderStatus(o.id, "completed")}
            className="bg-green-600 text-white px-2 py-1 rounded text-xs"
          >
            تم التسليم
          </button>
          <button
            onClick={() => updateOrderStatus(o.id, "cancelled")}
            className="bg-red-600 text-white px-2 py-1 rounded text-xs"
          >
            إلغاء
          </button>
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
        <style>
          body { font-family: sans-serif; padding: 20px; direction: rtl; }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
    </html>
  `);

  win.document.close();
  win.print();
};


  return (
    <>
      <div className="space-y-6">
        {/* ===== رأس الصفحة ===== */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">الطلبات</h1>
           <div className="flex gap-2 mb-4 flex-wrap">
  {[
    { key: "pending", label: "🟡 اعتماد" },
    { key: "processing", label: "🔵 قيد المعالجة" },
    { key: "ready", label: "🟢 جاهز" },
    { key: "delivering", label: "🚚 قيد التوصيل" },
    { key: "completed", label: "✅ مكتمل" },
    { key: "cancelled", label: "❌ ملغي" },
  ].map((t) => (
    <button
      key={t.key}
      onClick={() => setActiveTab(t.key as OrderTab)}
      className={`px-4 py-2 rounded ${
        activeTab === t.key
          ? "bg-blue-600 text-white"
          : "bg-gray-200 text-gray-700"
      }`}
    >
      {t.label}
    </button>
  ))}
</div>
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
          <th className="px-2">الحالة</th>
          <th className="px-2">تفاصيل</th>
          <th className="px-2">تعيين كابتن</th>
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

            <td className="px-2">
              {o.status === "completed" || o.status === "cancelled" ? (
                <span
                  className={`px-2 py-1 rounded text-sm font-semibold ${
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
              <button
                onClick={() => openDetailsModal(o.id)}
                className="text-blue-600 hover:underline"
              >
                عرض
              </button>
            </td>

            <td className="px-2">{renderActions(o)}</td>
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
                        <p className="text-sm text-gray-600">
                          🕓 معلقة: {c.pending_orders} | ✅ مكتملة اليوم: {c.completed_today}
                        </p>
                      </div>
                      <button
                        onClick={() => assignCaptain(c.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded"
                      >
                        تعيين
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 text-right">
                <button
                  onClick={() => setIsCaptainModalOpen(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>



 {/* ===== مودال تفاصيل الطلب ===== */}
{isDetailsModalOpen && selectedOrderDetails && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]">
      {/* محتوى الطباعة */}
      <div ref={printRef} className="p-6 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 text-center">
          🧾 فاتورة الطلب #{selectedOrderDetails.id}
        </h2>

        {(() => {
          const restaurants = selectedOrderDetails.restaurants || [];
          const allRestaurantsTotal = restaurants.reduce(
            (sum: number, r: any) => sum + (r.total || 0),
            0
          );

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
                      <tr>
                        <th>المنتج</th>
                        <th>السعر</th>
                        <th>الكمية</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.items.map((p: any, i: number) => (
                        <tr key={i}>
                          <td className="border px-2 py-1">{p.name}</td>
                          <td className="border">{p.price} ر.س</td>
                          <td className="border">{p.quantity}</td>
                          <td className="border font-semibold text-green-600">
                            {p.subtotal} ر.س
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="text-right font-bold">
                    إجمالي المطعم: {Number(r.total || 0).toFixed(2)} ريال
                  </div>
                </div>
              ))}

               
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
  {/* صندوق الإجماليات */}
  <div className="border p-3 rounded bg-gray-50">
    <p>🧮 إجمالي المطاعم: {allRestaurantsTotal.toFixed(2)} ريال</p>
    <p>📦 رسوم التوصيل: {delivery.toFixed(2)} ريال</p>

    {extraStore > 0 && (
      <p>🏪 رسوم المحل الإضافي: {extraStore.toFixed(2)} ريال</p>
    )}

    <p className="text-lg font-bold text-blue-600">
      💰 الإجمالي الكلي: {grandTotal.toFixed(2)} ريال
    </p>
  </div>

  {/* صندوق تفاصيل الدفع */}
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


              {/* المطاعم المشاركة + بيانات العميل */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="border p-3 rounded">
                  <h3 className="font-bold mb-2">🏪 المطاعم المشاركة</h3>
                  {restaurants.map((r: any, i: number) => (
                    <div key={i} className="mb-2 text-sm">
                      <p>الاسم: {r.name}</p>
                      <p>الهاتف: {r.phone}</p>

                   {r.map_url && (
                     <a
                 href={r.map_url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-blue-600 underline"
                   >
                 عرض على الخريطة 🌍
               </a>
                  )}


                      <hr className="my-2" />
                    </div>
                  ))}
                </div>

            <div className="border p-3 rounded">
  <h3 className="font-bold mb-1">👤 بيانات العميل</h3>
  <p>الاسم: {selectedOrderDetails.customer_name}</p>
  <p>الهاتف: {selectedOrderDetails.customer_phone}</p>

  <p>
    📍 العنوان:{" "}
    <strong>
      {selectedOrderDetails.neighborhood_name
        ? `${selectedOrderDetails.neighborhood_name} - `
        : ""}
      {selectedOrderDetails.customer_address || "-"}
    </strong>
  </p>

  {selectedOrderDetails.map_url && (
    <p>
      <a
        href={selectedOrderDetails.map_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        عرض على الخريطة 🌍
      </a>
    </p>
  )}
</div>

              </div>
            </>
          );
        })()}
      </div>

      <div className="flex justify-end gap-3 p-4 border-t bg-gray-100">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          🧾 طباعة الفاتورة
        </button>
        <button
          onClick={() => setIsDetailsModalOpen(false)}
          className="bg-gray-400 text-white px-4 py-2 rounded"
        >
          إغلاق
        </button>
      </div>
    </div>
  </div>
)}

{/* ===== مودال إضافة الطلب ===== */}
{showAddOrderModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">➕ إضافة طلب جديد</h2>

      <label>👤 اختر العميل:</label>
      <select
        onChange={(e) => selectCustomer(Number(e.target.value))}
        className="border w-full p-2 rounded"
      >
        <option value="">-- اختر --</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {selectedCustomer && <div className="mt-1">📞 {selectedCustomer.phone}</div>}

      <label className="mt-3 block">📍 اختر العنوان:</label>
      <select
        value={selectedAddress?.id || ""}
        onChange={(e) => {
          const addr = addresses.find((a) => a.id == e.target.value);
          setSelectedAddress(addr || null);
          if (addr?.gps_link) setGpsLink(addr.gps_link);
          else if (addr?.latitude && addr?.longitude)
            setGpsLink(`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`);
          else setGpsLink("");
        }}
        className="border w-full p-2 mt-1 rounded"
      >
        <option value="">-- اختر --</option>
        {addresses.map((a) => (
          <option key={a.id} value={a.id}>
            {`${a.district_name || a.neighborhood_name || "بدون حي"} - ${a.address || ""}`}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="🌍 رابط GPS"
        value={gpsLink}
        readOnly
        className="border w-full p-2 mt-2 mb-2 rounded bg-gray-50"
      />

      <label className="mt-3 block">🏪 اختر المطعم:</label>
     <select
  value={currentRestaurant?.id || ""}
  onChange={(e) => selectRestaurant(Number(e.target.value))}
  className="border w-full p-2 rounded"
>

        <option value="">-- اختر --</option>
        {restaurants.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      <button
        onClick={openProductsModal}
        className="bg-blue-600 text-white px-3 py-1 mt-3 rounded"
        disabled={!currentRestaurant}
      >
        📦 تحديد المنتجات
      </button>

      <h3 className="font-bold mt-4">🛒 السلال:</h3>
      {groups.length === 0 && (
        <div className="text-sm text-gray-500">لم يتم إضافة أي مطعم بعد</div>
      )}

   {groups.map((g) => (
  <div key={g.restaurant.id} className="border rounded p-3 mt-3">
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-semibold">🏪 {g.restaurant.name}</h4>
      <button
        onClick={() => removeRestaurantGroup(g.restaurant.id)}
        className="text-red-600 text-sm"
      >
        حذف المطعم ✖
      </button>
    </div>

    {g.items.length === 0 ? (
      <p className="text-sm text-gray-500">لا توجد منتجات</p>
    ) : (
      g.items.map((item) => {
        const total = item.price * item.quantity;

        return (
          <div
            key={item.id}
            className="flex justify-between items-center border-b py-1"
          >
            <div className="flex-1">
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-gray-600">
                {item.price} ريال × {item.quantity} ={" "}
                <span className="text-green-600 font-bold">
                  {total} ريال
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateItemQty(g.restaurant.id, item.id, item.quantity - 1)
                }
                className="px-2 py-1 bg-gray-200 rounded"
              >
                ➖
              </button>

              <span className="min-w-[24px] text-center">
                {item.quantity}
              </span>

              <button
                onClick={() =>
                  updateItemQty(g.restaurant.id, item.id, item.quantity + 1)
                }
                className="px-2 py-1 bg-gray-200 rounded"
              >
                ➕
              </button>

              <button
                onClick={() => updateItemQty(g.restaurant.id, item.id, 0)}
                className="text-red-600 ml-2"
              >
                🗑
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
))}



  <button
  onClick={() => {
    setCurrentRestaurant(null);   // نوقف المطعم الحالي فقط
    setRestaurantCategories([]);  // نفضي الفئات
    setProducts([]);              // نفضي المنتجات
    setSelectedCategory(null);    // نرجع التصنيف للوضع الافتراضي
  }}
  className="mt-3 bg-indigo-600 text-white px-3 py-2 rounded"
>
  ➕ إضافة مطعم آخر
</button>



      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={saveOrder}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          💾 حفظ
        </button>
        <button
          onClick={() => setShowAddOrderModal(false)}
          className="bg-gray-400 text-white px-4 py-2 rounded"
        >
          إلغاء
        </button>
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
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {products
                .filter((p) => {
                  if (!selectedCategory) return true;
                  const ids = String(p.category_ids || "").split(",");
                  return ids.includes(String(selectedCategory));
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className="border p-2 rounded flex flex-col justify-between"
                  >
                    <span className="font-bold">{p.name}</span>
                    <span>{p.price} ريال</span>
                    <button
                      onClick={() => addToCart(p)}
                      className="bg-green-600 text-white mt-2 px-3 py-1 rounded"
                    >
                      ➕ إضافة
                    </button>
                  </div>
                ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowProductsModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال إلغاء الطلب ===== */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-3">تأكيد إلغاء الطلب</h2>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="border w-full p-2 rounded mb-4"
              placeholder="اكتب سبب الإلغاء..."
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                إغلاق
              </button>

              <button
                onClick={confirmCancelOrder}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
