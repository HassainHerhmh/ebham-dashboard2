import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useApp } from "../contexts/AppContext"; 
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";


interface BankMethod {
  id: number;
  company: string;
  account_number: string;
  owner_name: string;
  address: string;
  is_active: number;
  sort_order: number;

  account_id: number | null;

  account_name?: string;
  account_code?: string;

  branch_id: number | null;
  branch_name?: string;
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
      className={`border-t hover:bg-gray-50 transition-colors ${
        method.is_active === 0 ? "bg-red-50 text-gray-400" : ""
      }`}
    >
      <td className="p-2 w-8 text-gray-400">
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical size={18} />
        </span>
      </td>
      {children}
    </tr>
  );
};


const BankDeposits: React.FC = () => {

  const { state } = useApp();
  const user = state.user;

  const [methods, setMethods] = useState<BankMethod[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const [company, setCompany] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [accountId, setAccountId] = useState("");
  const [branchId, setBranchId] = useState("");


  const isMainAdminBranch =
    user?.branch_id === 3 || user?.is_admin === 1;



  const loadMethods = async () => {
    try {
      const res = await api.get("/payment-methods");
      setMethods(res.data.methods || []);
    } catch (e) {
      console.error("Load error", e);
    }
  };


  useEffect(() => {

    loadMethods();

    api.get("/accounts").then((res) => {
      const list = res.data?.list || res.data?.data?.list || [];
      setAccounts(list.filter((a: any) => a.parent_id));
    });

    if (isMainAdminBranch) {
      api.get("/branches").then((res) => {
        setBranches(res.data.branches || []);
      });
    }

  }, [isMainAdminBranch, user]);


const saveMethod = async () => {

  if (!company || !accountNumber || !accountId) {
    return alert("يرجى إكمال البيانات الأساسية");
  }

  try {

    let methodId = editingId;

    /* 1️⃣ حفظ / تحديث البنك */
    if (editingId) {

      await api.put(`/payment-methods/${editingId}`, {
        company,
        account_number: accountNumber,
        owner_name: ownerName,
        address
      });

    } else {

      const res = await api.post("/payment-methods", {
        company,
        account_number: accountNumber,
        owner_name: ownerName,
        address
      });

      methodId = res.data.id;
    }


    /* 2️⃣ حفظ الربط مع الفرع */
    await api.post("/payment-methods/assign-branch-account", {
      payment_method_id: methodId,
      branch_id: user.branch_id,
      account_id: Number(accountId)
    });


    resetForm();
    setModalOpen(false);
    loadMethods();

  } catch (e) {

    console.error(e);
    alert("حدث خطأ أثناء الحفظ");
  }
};



  const toggleStatus = async (method: BankMethod) => {
    try {

      const newStatus = method.is_active === 1 ? 0 : 1;

      await api.put(`/payment-methods/${method.id}/toggle`, {
        is_active: newStatus
      });

      loadMethods();

    } catch (e) {

      alert("فشل في تغيير الحالة");
    }
  };



  const deleteMethod = async (id: number) => {

    if (!window.confirm("هل أنت متأكد من حذف وسيلة الدفع هذه؟")) return;

    try {

      await api.delete(`/payment-methods/${id}`);
      loadMethods();

    } catch (e) {

      alert("فشل في الحذف");
    }
  };



  const openEdit = (m: BankMethod) => {

    setEditingId(m.id);

    setCompany(m.company);
    setAccountNumber(m.account_number);
    setOwnerName(m.owner_name);
    setAddress(m.address);

    setAccountId(m.account_id?.toString() || "");
    setBranchId(m.branch_id?.toString() || "");

    setModalOpen(true);
  };



  const resetForm = () => {

    setEditingId(null);

    setCompany("");
    setAccountNumber("");
    setOwnerName("");
    setAddress("");

    setAccountId("");
    setBranchId("");
  };



  const handleDragEnd = async (event: any) => {

    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = methods.findIndex((m) => m.id === active.id);
    const newIndex = methods.findIndex((m) => m.id === over.id);

    const newList = arrayMove(methods, oldIndex, newIndex);

    setMethods(newList);

    await api.post("/payment-methods/reorder", {
      orders: newList.map((m, i) => ({
        id: m.id,
        sort_order: i + 1
      })),
    });
  };



  return (
    <div className="bg-white p-6 rounded-xl shadow-lg space-y-6" dir="rtl">

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          🏦 إدارة الحسابات البنكية والإيداعات
        </h2>

        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition"
        >
          ➕ إضافة بنك جديد
        </button>
      </div>



      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >

        <SortableContext
          items={methods.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >

          <div className="overflow-x-auto border rounded-xl">

            <table className="w-full text-sm text-center">

              <thead className="bg-gray-50 text-gray-600 font-bold border-b">

                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3 text-right">البنك</th>
                  <th className="p-3">رقم الحساب</th>
                  <th className="p-3">صاحب الحساب</th>
                  <th className="p-3">الحساب المحاسبي</th>

                  {isMainAdminBranch && (
                    <th className="p-3">الفرع</th>
                  )}

                  <th className="p-3">الحالة</th>
                  <th className="p-3">الإجراءات</th>
                </tr>

              </thead>


              <tbody>

                {methods.map((m) => (

                  <SortableRow key={m.id} method={m}>

                    <td className="p-3 text-right font-bold text-indigo-700">
                      {m.company}
                    </td>

                    <td className="p-3 font-mono">
                      {m.account_number}
                    </td>

                    <td className="p-3">
                      {m.owner_name}
                    </td>


                    {/* ⭐ التعديل هنا فقط */}
                    <td className="p-3">

                      {m.account_id ? (

                        <div className="flex flex-col items-center">

                          <span className="text-indigo-600 font-bold">
                            {m.account_name}
                          </span>

                          <span className="text-[9px] text-gray-400 font-mono">
                            {m.account_code}
                          </span>

                        </div>

                      ) : (

                        <span className="text-red-400 text-xs italic">
                          غير مرتبط
                        </span>

                      )}

                    </td>



                    {isMainAdminBranch && (

                      <td className="p-3">

                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            m.branch_id
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {m.branch_name || "موحد (كل الفروع)"}
                        </span>

                      </td>
                    )}



                    <td className="p-3">

                      <button onClick={() => toggleStatus(m)}>

                        {m.is_active ? (

                          <div className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                            <CheckCircle size={14} /> نشط
                          </div>

                        ) : (

                          <div className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
                            <XCircle size={14} /> معطل
                          </div>

                        )}

                      </button>

                    </td>



                    <td className="p-3">

                      <div className="flex justify-center gap-2">

                        <button
                          onClick={() => openEdit(m)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => deleteMethod(m.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </td>

                  </SortableRow>

                ))}

              </tbody>

            </table>

          </div>

        </SortableContext>

      </DndContext>



      {modalOpen && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm p-4">

          <div className="bg-white p-8 rounded-2xl w-full max-w-lg space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">

            <h3 className="text-xl font-bold border-b pb-4 text-gray-800">

              {editingId ? "✏️ تعديل بيانات البنك" : "➕ إضافة بنك جديد"}

            </h3>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">
                  اسم البنك / الشركة
                </label>

                <input
                  className="border p-3 w-full rounded-xl outline-none focus:border-indigo-500 transition"
                  placeholder="بنك الكريمي"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>


              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">
                  رقم الحساب
                </label>

                <input
                  className="border p-3 w-full rounded-xl outline-none focus:border-indigo-500 transition"
                  placeholder="123456"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

            </div>



            <div className="space-y-1">

              <label className="text-xs font-bold text-gray-500 italic text-indigo-600">
                الحساب المحاسبي (دليل الحسابات)
              </label>

              <select
                className="border p-3 w-full rounded-xl outline-none focus:border-indigo-500 bg-indigo-50/30 font-bold text-right"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">اختر الحساب</option>

                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name_ar || a.name}
                  </option>
                ))}

              </select>

            </div>



            {isMainAdminBranch && (

              <div className="space-y-1 animate-in slide-in-from-right duration-300">

                <label className="text-xs font-bold text-orange-600">
                  تبعية الفرع (للمدراء فقط)
                </label>

                <select
                  className="border p-3 w-full rounded-xl outline-none focus:border-orange-500 bg-orange-50/30 font-bold"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">موحد (يظهر لجميع الفروع)</option>

                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}

                </select>

              </div>
            )}



            <div className="flex justify-end gap-3 pt-6">

              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2 rounded-xl text-gray-500 hover:bg-gray-100 transition font-bold"
              >
                إلغاء
              </button>


              <button
                onClick={saveMethod}
                className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:shadow-indigo-200 transition active:scale-95"
              >
                {editingId ? "تحديث البيانات" : "إضافة الحساب"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default BankDeposits;
