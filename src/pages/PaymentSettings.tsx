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
  is_active: number; // 1 | 0
  sort_order: number;
   account_id: number | null;
}

interface PaymentMethodLog {
  action: "activate" | "deactivate";
  user_name: string | null;
  created_at: string;
}

/* =========================
   Sortable Row (drag by icon only)
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
          title="اسحب لتغيير الترتيب"
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
const [accounts, setAccounts] = useState<any[]>([]);

useEffect(() => {
  loadMethods();

  api.accounts.getAccounts().then((res) => {
    const list = res?.list || res?.data?.list || [];
    setAccounts(list.filter((a: any) => a.parent_id));
  });
}, []);


  // الإضافة / التعديل
  const [company, setCompany] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
 const [accountId, setAccountId] = useState("");

  // سجل التغييرات
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<PaymentMethodLog[]>([]);
  const [currentMethodId, setCurrentMethodId] = useState<number | null>(null);
  const [filterDays, setFilterDays] = useState<number | null>(7);

  /* ===== Load ===== */
  const loadMethods = async () => {
    const res = await api.paymentMethods.getAll();
    const list = res?.methods || res || [];
    setMethods(
      list.map((m: any) => ({
        ...m,
        is_active: Number(m.is_active),
      }))
    );
  };

  useEffect(() => {
    loadMethods();
  }, []);


  /* ===== Save ===== */
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
  account_id: accountId ? Number(accountId) : null,
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

  /* ===== Delete ===== */
  const deleteMethod = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    const res = await api.paymentMethods.remove(id);
    setMessage(res.message);
    loadMethods();
  };

  /* ===== Edit ===== */
const startEdit = (m: PaymentMethod) => {
  setEditingId(m.id);
  setCompany(m.company);
  setAccountNumber(m.account_number);
  setOwnerName(m.owner_name);
  setAddress(m.address);
  setAccountId(String(m.account_id || ""));
  setModalOpen(true);
};

  /* ===== Toggle Active ===== */
  const toggleActive = async (m: PaymentMethod) => {
    if (m.is_active === 1) {
      const ok = window.confirm(
        "هل أنت متأكد من تعطيل طريقة الدفع؟\nلن تظهر في طرق الدفع عند إنشاء الطلبات."
      );
      if (!ok) return;
    }

    const newStatus = m.is_active === 1 ? 0 : 1;
    await api.paymentMethods.toggle(m.id, newStatus === 1);

    setMethods((prev) =>
      prev.map((x) =>
        x.id === m.id ? { ...x, is_active: newStatus } : x
      )
    );
  };

  /* ===== Drag End ===== */
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

  /* ===== Open Logs ===== */
  const openLogs = async (methodId: number) => {
    setCurrentMethodId(methodId);
    setLogsOpen(true);
    setLogsLoading(true);

    const rows = await api.paymentMethods.getLogs(
      methodId,
      filterDays ?? undefined
    );

    setLogs(rows || []);
    setLogsLoading(false);
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

      {message && <div className="text-blue-600 mb-2">{message}</div>}

      {/* Table */}
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
    <th>الحساب المحاسبي</th> {/* جديد */}
    <th>الحالة</th>
    <th>إجراءات</th>
  </tr>
</thead>

<tbody>
  {methods.map((m) => {
    const acc = accounts.find((a: any) => a.id === m.account_id);

    return (
      <SortableRow key={m.id} method={m}>
        <td>{m.company}</td>
        <td>{m.account_number}</td>
        <td>{m.owner_name}</td>
        <td>{m.address}</td>

        <td className="text-sm text-gray-700">
          {acc ? (acc.name_ar || acc.name) : "-"}
        </td>

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

          <button
            onClick={() => openLogs(m.id)}
            className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-700"
          >
            👁️
          </button>
        </td>
      </SortableRow>
    );
  })}
</tbody>

          </table>
        </SortableContext>
      </DndContext>

  {/* Modal الإضافة / التعديل */}
{modalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded w-full max-w-md space-y-3">
      <h3 className="font-bold">
        {editingId ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"}
      </h3>

      <input
        className="border p-2 w-full rounded"
        placeholder="اسم الشركة"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />

      <input
        className="border p-2 w-full rounded"
        placeholder="رقم الحساب"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
      />

      <input
        className="border p-2 w-full rounded"
        placeholder="اسم صاحب الحساب"
        value={ownerName}
        onChange={(e) => setOwnerName(e.target.value)}
      />

      <input
        className="border p-2 w-full rounded"
        placeholder="العنوان"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      {/* اختيار الحساب المحاسبي */}
      <select
        className="border p-2 w-full rounded"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
      >
        <option value="">اختر الحساب المحاسبي</option>
        {accounts.map((a: any) => (
          <option key={a.id} value={a.id}>
            {a.name_ar || a.name}
          </option>
        ))}
      </select>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => setModalOpen(false)}
          className="bg-gray-400 text-white px-4 py-2 rounded"
        >
          إلغاء
        </button>

        <button
          onClick={saveMethod}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          حفظ
        </button>
      </div>
    </div>
  </div>
)}


      {/* Modal سجل التغييرات */}
      {logsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">📜 سجل التغييرات</h3>
              <button onClick={() => setLogsOpen(false)}>✕</button>
            </div>

            <select
              className="border p-2 rounded"
              value={filterDays ?? ""}
              onChange={(e) =>
                setFilterDays(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="7">آخر 7 أيام</option>
              <option value="30">آخر 30 يوم</option>
              <option value="">الكل</option>
            </select>

            {logsLoading ? (
              <p>جاري التحميل...</p>
            ) : logs.length === 0 ? (
              <p className="text-center text-gray-500">لا يوجد سجل تغييرات</p>
            ) : (
              <table className="w-full border">
                <thead className="bg-gray-100">
                  <tr>
                    <th>الحالة</th>
                    <th>بواسطة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className="text-center border-t">
                      <td>{log.action === "activate" ? "✅ تفعيل" : "⛔ تعطيل"}</td>
                      <td>{log.user_name ?? "النظام"}</td>
                      <td>{new Date(log.created_at).toLocaleString("ar-YE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {currentMethodId && (
              <a
                href={`/api/payment-methods/${currentMethodId}/logs/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded"
              >
                📄 تصدير PDF
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSettings;
