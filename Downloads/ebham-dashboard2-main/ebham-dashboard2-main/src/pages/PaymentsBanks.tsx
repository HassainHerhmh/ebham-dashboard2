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

interface BankMethod {
  id: number;
  company: string;
  account_number: string;
  owner_name: string;
  address: string;
  is_active: number;
  sort_order: number;
  account_id: number | null;
}

interface SortableRowProps {
  method: BankMethod;
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
        <span {...attributes} {...listeners} className="cursor-grab">
          <GripVertical size={18} />
        </span>
      </td>
      {children}
    </tr>
  );
};

const BankDeposits: React.FC = () => {
  const [methods, setMethods] = useState<BankMethod[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [company, setCompany] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [accountId, setAccountId] = useState("");

  const loadMethods = async () => {
    const res = await api.payments.banks.getAll(); // API خاص بالبنوك
    const list = res?.methods || res || [];
    setMethods(list.map((m: any) => ({ ...m, is_active: Number(m.is_active) })));
  };

  useEffect(() => {
    loadMethods();
    api.accounts.getAccounts().then((res) => {
      const list = res?.list || res?.data?.list || [];
      setAccounts(list.filter((a: any) => a.parent_id));
    });
  }, []);

  const saveMethod = async () => {
    const payload = {
      company,
      account_number: accountNumber,
      owner_name: ownerName,
      address,
      account_id: accountId ? Number(accountId) : null,
    };

    if (editingId) {
      await api.payments.banks.update(editingId, payload);
    } else {
      await api.payments.banks.add(payload);
    }

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
    setAccountId("");
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = methods.findIndex((m) => m.id === active.id);
    const newIndex = methods.findIndex((m) => m.id === over.id);

    const newList = arrayMove(methods, oldIndex, newIndex);
    setMethods(newList);

    await api.banks.reorder(
      newList.map((m: BankMethod, i: number) => ({
        id: m.id,
        sort_order: i + 1,
      }))
    );
  };

  return (
    <div className="bg-white p-6 rounded shadow space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">الإيداعات البنكية</h2>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ➕ إضافة بنك
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={methods.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-8"></th>
                <th>البنك</th>
                <th>رقم الحساب</th>
                <th>صاحب الحساب</th>
                <th>العنوان</th>
                <th>الحساب المحاسبي</th>
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
                    <td>{acc ? acc.name_ar || acc.name : "-"}</td>
                  </SortableRow>
                );
              })}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md space-y-3">
            <h3 className="font-bold">
              {editingId ? "تعديل بنك" : "إضافة بنك"}
            </h3>

            <input className="border p-2 w-full rounded" placeholder="اسم البنك" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="border p-2 w-full rounded" placeholder="رقم الحساب" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            <input className="border p-2 w-full rounded" placeholder="اسم صاحب الحساب" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            <input className="border p-2 w-full rounded" placeholder="العنوان" value={address} onChange={(e) => setAddress(e.target.value)} />

            <select className="border p-2 w-full rounded" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">اختر الحساب المحاسبي</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name_ar || a.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="bg-gray-400 text-white px-4 py-2 rounded">
                إلغاء
              </button>
              <button onClick={saveMethod} className="bg-green-600 text-white px-4 py-2 rounded">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankDeposits;
