import React, { useEffect, useState } from "react";
import api from "../services/api";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/* =========================
   Types
========================= */
interface PaymentMethod {
  id: number;
  company: string;
  account_number: string;
  owner_name: string;
  address: string;
  is_active: number;
  sort_order: number;
}

interface PaymentMethodLog {
  action: "activate" | "deactivate";
  user_name: string | null;
  created_at: string;
}

/* =========================
   Sortable Row
========================= */
interface SortableRowProps {
  method: PaymentMethod;
  children: React.ReactNode;
}

const SortableRow: React.FC<SortableRowProps> = ({ method, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: method.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t ${
        method.is_active === 0 ? "opacity-50 bg-gray-50" : ""
      }`}
    >
      <td className="p-2 w-8 text-gray-400">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </span>
      </td>
      {children}
    </tr>
  );
};

/* =========================
   Component
========================= */
const PaymentSettings: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<PaymentMethodLog[]>([]);
  const [currentMethodId, setCurrentMethodId] = useState<number | null>(null);
  const [filterDays, setFilterDays] = useState<number | null>(7);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const rows = await api.paymentMethods.getAll();
      setMethods(
        (rows || []).map((m: any) => ({
          ...m,
          is_active: Number(m.is_active),
        }))
      );
    } catch (err) {
      console.error("❌ خطأ في جلب طرق الدفع:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const saveMethod = async () => {
    if (!company || !accountNumber || !ownerName || !address) {
      alert("❌ جميع الحقول مطلوبة");
      return;
    }

    const payload = {
      company,
      account_number: accountNumber,
      owner_name: ownerName,
      address,
    };

    const res = editingId
      ? await api.paymentMethods.update(editingId, payload)
      : await api.paymentMethods.add(payload);

    setMessage(res.message);
    resetForm();
    setModalOpen(false);
    loadMethods();
  };

  const resetForm = () => {
    setEditingId(null);
    setCompany("");
    setAccountNumber("");
    setOwnerName("");
    setAddress("");
  };

  const deleteMethod = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    const res = await api.paymentMethods.remove(id);
    setMessage(res.message);
    loadMethods();
  };

  const startEdit = (m: PaymentMethod) => {
    setEditingId(m.id);
    setCompany(m.company);
    setAccountNumber(m.account_number);
    setOwnerName(m.owner_name);
    setAddress(m.address);
    setModalOpen(true);
  };

  const toggleActive = async (m: PaymentMethod) => {
    const newStatus = m.is_active === 1 ? 0 : 1;
    await api.paymentMethods.toggle(m.id, newStatus === 1);

    setMethods((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, is_active: newStatus } : x))
    );
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = methods.findIndex((m) => m.id === active.id);
    const newIndex = methods.findIndex((m) => m.id === over.id);

    const newList = arrayMove(methods, oldIndex, newIndex);
    setMethods(newList);

    await api.paymentMethods.reorder(
      newList.map((m: PaymentMethod, i: number) => ({
        id: m.id,
        sort_order: i + 1,
      }))
    );
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">إعدادات طرق الدفع</h2>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ➕ إضافة طريقة دفع
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">جاري التحميل...</div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={methods.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="w-8"></th>
                  <th>الشركة</th>
                  <th>رقم الحساب</th>
                  <th>صاحب الحساب</th>
                  <th>العنوان</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => (
                  <SortableRow key={m.id} method={m}>
                    <td>{m.company}</td>
                    <td>{m.account_number}</td>
                    <td>{m.owner_name}</td>
                    <td>{m.address}</td>
                    <td>{m.is_active === 1 ? "مفعّلة" : "معطّلة"}</td>
                    <td className="flex gap-2 items-center">
                      <button
                        onClick={() => startEdit(m)}
                        className="text-blue-600 hover:underline"
                      >
                        تعديل
                      </button>

                      <button
                        onClick={() => deleteMethod(m.id)}
                        className="text-red-600 hover:underline"
                      >
                        حذف
                      </button>

                      <button
                        onClick={() => toggleActive(m)}
                        className={`w-8 h-8 flex items-center justify-center rounded ${
                          m.is_active
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }`}
                      >
                        {m.is_active ? "⛔" : "✅"}
                      </button>
                    </td>
                  </SortableRow>
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default PaymentSettings;
