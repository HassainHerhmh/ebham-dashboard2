import { useEffect, useState } from "react";
import api from "../services/api";

type Customer = {
  id: number;
  name: string;
};

type GuaranteeRow = {
  id: number;
  customer_id: number;
  customer_name: string;
  type: "cash" | "bank" | "account";
  account_name: string | null;
  balance: number;
};

const PaymentsWallet: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [list, setList] = useState<GuaranteeRow[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [createType, setCreateType] = useState<"cash" | "bank" | "account">(
    "cash"
  );

  const [addAmountCustomerId, setAddAmountCustomerId] = useState("");
  const [addAmountType, setAddAmountType] = useState<"cash" | "bank">("cash");
  const [amount, setAmount] = useState("");

  const loadAll = async () => {
    const [c1, c2] = await Promise.all([
      api.get("/customers"),
      api.get("/customer-guarantees"),
    ]);

    setCustomers(c1.data?.customers || []);
    setList(c2.data?.list || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createGuarantee = async () => {
    if (!selectedCustomerId) {
      alert("اختر العميل");
      return;
    }

    await api.post("/customer-guarantees", {
      customer_id: Number(selectedCustomerId),
      type: createType,
    });

    setShowCreateModal(false);
    setSelectedCustomerId("");
    setCreateType("cash");
    loadAll();
  };

  const addAmount = async () => {
    if (!addAmountCustomerId || !amount) {
      alert("اختر العميل والمبلغ");
      return;
    }

    await api.post("/customer-guarantees/add-amount", {
      customer_id: Number(addAmountCustomerId),
      type: addAmountType,
      amount: Number(amount),
    });

    setShowAddAmountModal(false);
    setAddAmountCustomerId("");
    setAmount("");
    setAddAmountType("cash");
    loadAll();
  };

  const eligibleForAdd = list.filter(
    (x) => x.type === "cash" || x.type === "bank"
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">محفظة العملاء (التأمين)</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            ➕ إضافة حساب تأمين
          </button>
          <button
            onClick={() => setShowAddAmountModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            💰 إضافة تأمين
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-center border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">العميل</th>
              <th className="border p-2">النوع</th>
              <th className="border p-2">الحساب</th>
              <th className="border p-2">الرصيد الحالي</th>
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
                  <td className="border p-2">{g.balance}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-gray-400">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* إنشاء حساب تأمين */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-[420px] space-y-3">
            <h3 className="font-bold text-center">إضافة حساب تأمين</h3>

            <select
              className="border p-2 w-full rounded"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
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
                  checked={createType === "cash"}
                  onChange={() => setCreateType("cash")}
                />{" "}
                نقدي
              </label>
              <label>
                <input
                  type="radio"
                  checked={createType === "bank"}
                  onChange={() => setCreateType("bank")}
                />{" "}
                بنكي
              </label>
              <label>
                <input
                  type="radio"
                  checked={createType === "account"}
                  onChange={() => setCreateType("account")}
                />{" "}
                حساب مباشر
              </label>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setShowCreateModal(false)}>إلغاء</button>
              <button
                onClick={createGuarantee}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* إضافة مبلغ */}
      {showAddAmountModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-[420px] space-y-3">
            <h3 className="font-bold text-center">إضافة تأمين</h3>

            <select
              className="border p-2 w-full rounded"
              value={addAmountCustomerId}
              onChange={(e) => setAddAmountCustomerId(e.target.value)}
            >
              <option value="">اختر العميل</option>
              {eligibleForAdd.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.customer_name}
                </option>
              ))}
            </select>

            <div className="flex gap-4 justify-center">
              <label>
                <input
                  type="radio"
                  checked={addAmountType === "cash"}
                  onChange={() => setAddAmountType("cash")}
                />{" "}
                نقدي
              </label>
              <label>
                <input
                  type="radio"
                  checked={addAmountType === "bank"}
                  onChange={() => setAddAmountType("bank")}
                />{" "}
                بنكي
              </label>
            </div>

            <input
              type="number"
              className="border p-2 w-full rounded"
              placeholder="المبلغ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <div className="flex justify-between pt-2">
              <button onClick={() => setShowAddAmountModal(false)}>إلغاء</button>
              <button
                onClick={addAmount}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsWallet;
