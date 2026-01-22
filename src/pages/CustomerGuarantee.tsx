import { useEffect, useState } from "react";
import api from "../../services/api";

type Customer = {
  id: number;
  name: string;
};

type Account = {
  id: number;
  name_ar: string;
};

type Guarantee = {
  id: number;
  customer_id: number;
  customer_name: string;
  account_id: number | null;
  account_name: string | null;
  amount: number;
};

const CustomerGuarantee = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [list, setList] = useState<Guarantee[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [form, setForm] = useState({
    customer_id: "",
    account_id: "",
    amount: "",
  });

  const loadAll = async () => {
    const [c1, c2, c3] = await Promise.all([
      api.get("/customers"),
      (api as any).accounts.getAccounts(),
      api.get("/customer-guarantees"),
    ]);

    setCustomers(c1.data?.customers || []);

    const subs = (c2.list || []).filter((a: any) => a.parent_id !== null);
    setAccounts(subs);

    setList(c3.data?.list || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const save = async () => {
    if (!form.customer_id || !form.amount) {
      alert("العميل والمبلغ مطلوبان");
      return;
    }

    const payload = {
      customer_id: Number(form.customer_id),
      account_id: form.account_id ? Number(form.account_id) : null,
      amount: Number(form.amount),
    };

    if (editId) {
      await api.put(`/customer-guarantees/${editId}`, payload);
    } else {
      await api.post("/customer-guarantees", payload);
    }

    setShowModal(false);
    setEditId(null);
    setForm({ customer_id: "", account_id: "", amount: "" });
    loadAll();
  };

  const edit = (g: Guarantee) => {
    setEditId(g.id);
    setForm({
      customer_id: String(g.customer_id),
      account_id: g.account_id ? String(g.account_id) : "",
      amount: String(g.amount),
    });
    setShowModal(true);
  };

  const remove = async (id: number) => {
    if (!window.confirm("هل أنت متأكد؟")) return;
    await api.delete(`/customer-guarantees/${id}`);
    loadAll();
  };

  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-xl font-bold text-green-700">تأمين العملاء</h2>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditId(null);
            setForm({ customer_id: "", account_id: "", amount: "" });
            setShowModal(true);
          }}
          className="bg-green-700 text-white px-4 py-2 rounded"
        >
          ➕ إضافة
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm text-center border-collapse">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="border p-2">العميل</th>
              <th className="border p-2">الحساب المحاسبي</th>
              <th className="border p-2">مبلغ التأمين</th>
              <th className="border p-2">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((g) => (
                <tr key={g.id}>
                  <td className="border p-2">{g.customer_name}</td>
                  <td className="border p-2">
                    {g.account_name || "— (حساب وسيط)"}
                  </td>
                  <td className="border p-2">{g.amount}</td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => edit(g)}
                      className="text-blue-600"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => remove(g.id)}
                      className="text-red-600"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-gray-400">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#eef4ee] p-6 rounded w-[420px] space-y-3">
            <h3 className="text-lg font-bold text-center">
              {editId ? "تعديل تأمين" : "إضافة تأمين"}
            </h3>

            <select
              className="border p-2 w-full rounded"
              value={form.customer_id}
              onChange={(e) =>
                setForm({ ...form, customer_id: e.target.value })
              }
            >
              <option value="">اختر العميل</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="border p-2 w-full rounded"
              value={form.account_id}
              onChange={(e) =>
                setForm({ ...form, account_id: e.target.value })
              }
            >
              <option value="">بدون حساب (حساب وسيط)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_ar}
                </option>
              ))}
            </select>

            <input
              type="number"
              className="border p-2 w-full rounded"
              placeholder="مبلغ التأمين"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value })
              }
            />

            <div className="flex justify-between pt-3">
              <button onClick={() => setShowModal(false)}>إلغاء</button>
              <button
                onClick={save}
                className="bg-green-700 text-white px-4 py-2 rounded"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerGuarantee;
