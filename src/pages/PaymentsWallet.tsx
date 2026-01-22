import { useEffect, useState } from "react";
import api from "../services/api";

type Customer = {
  id: number;
  name: string;
};

type Account = {
  id: number;
  name_ar: string;
  parent_id?: number | null;
};

type Guarantee = {
  id: number;
  customer_id: number;
  customer_name: string;
  account_id: number | null;
  account_name: string | null;
  amount: number | null;
  type: "cash" | "bank" | "account";
};

const PaymentsWallet: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [list, setList] = useState<Guarantee[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [form, setForm] = useState({
    customer_id: "",
    type: "cash" as "cash" | "bank" | "account",
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

    const subs = (c2.list || []).filter(
      (a: Account) => a.parent_id !== null
    );
    setAccounts(subs);

    setList(c3.data?.list || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const save = async () => {
    if (!form.customer_id) {
      alert("اختر العميل");
      return;
    }

    if (form.type !== "account" && !form.amount) {
      alert("المبلغ مطلوب");
      return;
    }

    if (form.type === "account" && !form.account_id) {
      alert("اختر الحساب المحاسبي");
      return;
    }

    const payload = {
      customer_id: Number(form.customer_id),
      type: form.type,
      account_id:
        form.type === "account"
          ? Number(form.account_id)
          : form.account_id
          ? Number(form.account_id)
          : null,
      amount: form.type === "account" ? null : Number(form.amount),
    };

    if (editId) {
      await api.put(`/customer-guarantees/${editId}`, payload);
    } else {
      await api.post("/customer-guarantees", payload);
    }

    setShowModal(false);
    setEditId(null);
    setForm({
      customer_id: "",
      type: "cash",
      account_id: "",
      amount: "",
    });
    loadAll();
  };

  const startEdit = (g: Guarantee) => {
    setEditId(g.id);
    setForm({
      customer_id: String(g.customer_id),
      type: g.type,
      account_id: g.account_id ? String(g.account_id) : "",
      amount: g.amount ? String(g.amount) : "",
    });
    setShowModal(true);
  };

  const remove = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    await api.delete(`/customer-guarantees/${id}`);
    loadAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">تأمين العملاء (الدفع من الرصيد)</h2>
        <button
          onClick={() => {
            setEditId(null);
            setForm({
              customer_id: "",
              type: "cash",
              account_id: "",
              amount: "",
            });
            setShowModal(true);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ➕ إضافة
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-center border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">العميل</th>
              <th className="border p-2">النوع</th>
              <th className="border p-2">الحساب</th>
              <th className="border p-2">المبلغ</th>
              <th className="border p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((g) => (
                <tr key={g.id}>
                  <td className="border p-2">{g.customer_name}</td>
                  <td className="border p-2">
                    {g.type === "cash"
                      ? "نقدي"
                      : g.type === "bank"
                      ? "بنكي"
                      : "حساب مباشر"}
                  </td>
                  <td className="border p-2">{g.account_name || "-"}</td>
                  <td className="border p-2">
                    {g.amount !== null ? g.amount : "-"}
                  </td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => startEdit(g)}
                      className="text-blue-600"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => remove(g.id)}
                      className="text-red-600"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-6 text-gray-400">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-[420px] space-y-3">
            <h3 className="font-bold text-center">
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

            <div className="flex gap-4 justify-center">
              <label>
                <input
                  type="radio"
                  checked={form.type === "cash"}
                  onChange={() =>
                    setForm({ ...form, type: "cash", account_id: "" })
                  }
                />{" "}
                نقدي
              </label>
              <label>
                <input
                  type="radio"
                  checked={form.type === "bank"}
                  onChange={() =>
                    setForm({ ...form, type: "bank", account_id: "" })
                  }
                />{" "}
                بنكي
              </label>
              <label>
                <input
                  type="radio"
                  checked={form.type === "account"}
                  onChange={() =>
                    setForm({ ...form, type: "account", amount: "" })
                  }
                />{" "}
                حساب مباشر
              </label>
            </div>

            {form.type === "account" && (
              <select
                className="border p-2 w-full rounded"
                value={form.account_id}
                onChange={(e) =>
                  setForm({ ...form, account_id: e.target.value })
                }
              >
                <option value="">اختر الحساب المحاسبي</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name_ar}
                  </option>
                ))}
              </select>
            )}

            {form.type !== "account" && (
              <input
                type="number"
                className="border p-2 w-full rounded"
                placeholder="المبلغ"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
              />
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setShowModal(false)}>إلغاء</button>
              <button
                onClick={save}
                className="bg-green-600 text-white px-4 py-2 rounded"
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

export default PaymentsWallet;
