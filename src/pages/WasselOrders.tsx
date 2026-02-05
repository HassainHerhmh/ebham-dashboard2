import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Plus, Edit, MapPin, DollarSign } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

/* ======================
   Types
====================== */

interface WasselOrder {
  id: number;

  customer_name: string;
  customer_id?: number;

  order_type: string;

  from_address: string;
  from_lat?: number;
  from_lng?: number;

  to_address: string;
  to_lat?: number;
  to_lng?: number;

  delivery_fee: number;
  extra_fee: number;

  notes?: string;

  status: string;

  created_at: string;
}

/* ======================
   Component
====================== */

const WasselOrders: React.FC = () => {
  const [orders, setOrders] = useState<WasselOrder[]>([]);
  const [loading, setLoading] = useState(true);

  /* Modal */
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WasselOrder | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  const navigate = useNavigate();
  const location = useLocation();

  const [fromMode, setFromMode] = useState<"saved" | "map">("saved");
  const [toMode, setToMode] = useState<"saved" | "map">("saved");

  /* Form */
  const [form, setForm] = useState<any>({
    customer_id: "",
    order_type: "",

    from_address: "",
    from_lat: null,
    from_lng: null,

    to_address: "",
    to_lat: null,
    to_lng: null,

    delivery_fee: 0,
    extra_fee: 0,
    notes: "",
  });

  /* ======================
     Load Orders
  ====================== */

  const loadOrders = async () => {
    try {
      setLoading(true);

      const res = await api.get("/wassel-orders");

      setOrders(res.data?.orders || []);
    } catch (err) {
      console.error("Load Wassel Orders Error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  /* ======================
     Handlers
  ====================== */

  const openAdd = () => {
    setEditingOrder(null);

    setForm({
      customer_id: "",
      order_type: "",

      from_address: "",
      from_lat: null,
      from_lng: null,

      to_address: "",
      to_lat: null,
      to_lng: null,

      delivery_fee: 0,
      extra_fee: 0,
      notes: "",
    });

    setShowModal(true);
  };

  const openEdit = (o: WasselOrder) => {
    setEditingOrder(o);

    setForm({
      customer_id: o.customer_id || "",

      order_type: o.order_type,

      from_address: o.from_address,
      from_lat: o.from_lat || null,
      from_lng: o.from_lng || null,

      to_address: o.to_address,
      to_lat: o.to_lat || null,
      to_lng: o.to_lng || null,

      delivery_fee: o.delivery_fee || 0,
      extra_fee: o.extra_fee || 0,
      notes: o.notes || "",
    });

    setShowModal(true);
  };

  const saveOrder = async () => {
    try {
      if (
        !form.customer_id ||
        !form.order_type ||
        !form.from_address ||
        !form.to_address
      ) {
        return alert("أكمل جميع البيانات");
      }

      const payload = {
        ...form,
        delivery_fee: Number(form.delivery_fee || 0),
        extra_fee: Number(form.extra_fee || 0),
      };

      if (editingOrder) {
        await api.put(`/wassel-orders/${editingOrder.id}`, payload);
      } else {
        await api.post("/wassel-orders", payload);
      }

      setShowModal(false);
      loadOrders();
    } catch (err) {
      console.error("Save Error:", err);
      alert("حصل خطأ");
    }
  };

  const openMap = (lat?: number, lng?: number) => {
    if (lat == null || lng == null) {
      return alert("لا يوجد موقع محفوظ");
    }

    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const loadAddresses = async (id: number) => {
    const res = await api.get(`/customer-addresses/customer/${id}`);
    setAddresses(res.data.addresses || []);
  };

  useEffect(() => {
    if (showModal) {
      api.get("/customers").then((res) => {
        setCustomers(res.data.customers || []);
      });
    }
  }, [showModal]);

  useEffect(() => {
    const state = location.state as any;

    if (state?.from === "map") {
      const url = `https://www.google.com/maps?q=${state.lat},${state.lng}`;

      if (state.target === "from") {
        setForm((f: any) => ({
          ...f,
          from_address: url,
          from_lat: state.lat,
          from_lng: state.lng,
        }));
      }

      if (state.target === "to") {
        setForm((f: any) => ({
          ...f,
          to_address: url,
          to_lat: state.lat,
          to_lng: state.lng,
        }));
      }

      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  /* ======================
     JSX
  ====================== */

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📦 طلبات وصل لي</h1>

        <button
          onClick={openAdd}
          className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={18} /> إضافة طلب
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-6 text-center">⏳ جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-center">
            <thead className="bg-gray-100">
              <tr>
                <th>#</th>
                <th>العميل</th>
                <th>نوع الطلب</th>
                <th>من</th>
                <th>إلى</th>
                <th>الرسوم</th>
                <th>ملاحظات</th>
                <th>الحالة</th>
                <th>تحكم</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o, i) => (
                <tr key={o.id} className="border-t">
                  <td>{i + 1}</td>

                  <td>{o.customer_name}</td>

                  <td>{o.order_type}</td>

                  {/* From */}
                  <td>
                    <button
                      onClick={() => openMap(o.from_lat, o.from_lng)}
                      className="text-blue-600 underline flex items-center gap-1 justify-center"
                    >
                      <MapPin size={14} />
                      الموقع
                    </button>
                  </td>

                  {/* To */}
                  <td>
                    <button
                      onClick={() => openMap(o.to_lat, o.to_lng)}
                      className="text-blue-600 underline flex items-center gap-1 justify-center"
                    >
                      <MapPin size={14} />
                      الموقع
                    </button>
                  </td>

                  {/* Fees */}
                  <td className="text-sm space-y-1">
                    <div>🚚 {o.delivery_fee} ر.ي</div>
                    <div>➕ {o.extra_fee} ر.ي</div>
                  </td>

                  {/* Notes */}
                  <td className="max-w-[200px] truncate">
                    {o.notes || "-"}
                  </td>

                  {/* Status */}
                  <td>
                    <select
                      value={o.status}
                      onChange={async (e) => {
                        await api.put(
                          `/wassel-orders/status/${o.id}`,
                          { status: e.target.value }
                        );

                        loadOrders();
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="pending">قيد الانتظار</option>
                      <option value="confirmed">مؤكد</option>
                      <option value="preparing">قيد التحضير</option>
                      <option value="ready">جاهز</option>
                      <option value="delivering">قيد التوصيل</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td>
                    <button
                      onClick={() => openEdit(o)}
                      className="text-blue-600 hover:underline flex items-center gap-1 justify-center"
                    >
                      <Edit size={14} /> تعديل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!orders.length && (
            <div className="p-6 text-center text-gray-500">
              لا توجد طلبات
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-xl p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {editingOrder ? "✏️ تعديل طلب" : "➕ إضافة طلب"}
            </h2>

            {/* Order Type */}
            <select
              className="w-full p-2 border rounded"
              value={form.order_type}
              onChange={(e) =>
                setForm({ ...form, order_type: e.target.value })
              }
            >
              <option value="">اختر النوع</option>
              <option value="كيكة">كيكة</option>
              <option value="كرتون">كرتون</option>
              <option value="مشوار">مشوار</option>
              <option value="عائلي">مشوار عائلي</option>
              <option value="أخرى">أخرى</option>
            </select>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                إلغاء
              </button>

              <button
                onClick={saveOrder}
                className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-1"
              >
                <DollarSign size={16} />
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasselOrders;
