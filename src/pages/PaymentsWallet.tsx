import { useEffect, useState } from "react";
import api from "../services/api";
import { useApp } from "../contexts/AppContext";

type Customer = { id: number; name: string };

type GuaranteeRow = {
  id: number;
  customer_id: number;
  customer_name: string;
  type: "cash" | "bank" | "account";
  account_name: string | null;
  balance: number;
  created_by_name?: string;
  branch_name?: string;
  branch_id?: number;
};

type Currency = {
  id: number;
  name_ar: string;
  exchange_rate?: number;
  is_local?: number;
};

const PaymentsWallet: React.FC = () => {
  const { state } = useApp();
  const user = state.user;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [list, setList] = useState<GuaranteeRow[]>([]);

  const [cashBoxes, setCashBoxes] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [currencyId, setCurrencyId] = useState("");
  const [rate, setRate] = useState<number>(1);
  const [isLocalCurrency, setIsLocalCurrency] = useState(true);
  const [amount, setAmount] = useState("");

  const [createType, setCreateType] =
    useState<"cash" | "bank" | "account">("cash");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);

  const [addAmountCustomerId, setAddAmountCustomerId] = useState("");
  const [addAmountType, setAddAmountType] =
    useState<"cash" | "bank">("cash");

  /* =========================
     تحميل البيانات
  ========================= */
  const loadAll = async () => {
    const config = {
      headers: { "x-branch-id": user?.branch_id },
    };

    const [c1, c2, c3, c4, c5, c6] = await Promise.all([
      
      api.get("/customers"),
      (api as any).accounts.getAccounts(),
      api.get("/customer-guarantees", config),
      api.get("/cash-boxes", config),
      api.get("/banks", config),
      api.get("/currencies"),
    ]);

    setCustomers(c1.data?.customers || []);

    setAccounts(
      (c2.list || []).filter((a: any) => a.parent_id !== null)
    );

    setList(c3.data?.list || []);

    const myBranch = user?.branch_id;

    setCashBoxes(
      (c4.data?.cashBoxes || []).filter(
        (b: any) => !b.branch_id || b.branch_id === myBranch
      )
    );

    setBanks(
      (c5.data?.banks || []).filter(
        (b: any) => !b.branch_id || b.branch_id === myBranch
      )
    );

    setCurrencies(c6.data?.currencies || []);
  };

  useEffect(() => {
    if (user?.branch_id) loadAll();
  }, [user]);

  /* =========================
     Reset
  ========================= */
  const resetForm = () => {
    setSelectedCustomerId("");
    setSelectedAccountId("");
    setCurrencyId("");
    setAmount("");
    setRate(1);
    setIsLocalCurrency(true);
    setCreateType("cash");
  };

  /* =========================
     إنشاء محفظة
  ========================= */
  const createGuarantee = async () => {
    if (!selectedCustomerId || !selectedAccountId) {
      return alert("يرجى إكمال البيانات");
    }

    await api.post("/customer-guarantees", {
      customer_id: Number(selectedCustomerId),
      type: createType,
      source_id: selectedAccountId,
      branch_id: user?.branch_id,

      currency_id: currencyId || null,
      rate: isLocalCurrency ? 1 : Number(rate),
      amount: amount ? Number(amount) : null,
    });

    setShowCreateModal(false);
    resetForm();
    loadAll();
  };

  /* =========================
     إضافة مبلغ
  ========================= */
  const addAmount = async () => {
    if (!addAmountCustomerId || !amount || !selectedAccountId) {
      return alert("أكمل البيانات");
    }

    await api.post("/customer-guarantees", {
      customer_id: Number(addAmountCustomerId),
      type: addAmountType,
      source_id: selectedAccountId,

      currency_id: currencyId || null,
      rate: isLocalCurrency ? 1 : rate,
      amount: Number(amount),
    });

    setShowAddAmountModal(false);
    resetForm();
    loadAll();
  };

  const eligibleForAdd = list.filter(
    (x) => x.type === "cash" || x.type === "bank"
  );

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border-r-4 border-indigo-600">
        <div>
          <h2 className="text-xl font-bold">محفظة التأمينات</h2>
          <p className="text-sm text-gray-500 font-bold">
            فرع: {user?.branch_name}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold"
          >
            ➕ فتح حساب
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowAddAmountModal(true);
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold"
          >
            💰 إضافة مبلغ
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden border">
        <table className="w-full text-center">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3">العميل</th>
              <th className="p-3">النوع</th>
              <th className="p-3">الحساب</th>
              <th className="p-3">الرصيد</th>
              <th className="p-3">الموظف</th>
              <th className="p-3">الفرع</th>
            </tr>
          </thead>

          <tbody>
            {list.map((g) => (
              <tr key={g.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-bold text-indigo-700">
                  {g.customer_name}
                </td>

                <td className="p-3 text-sm">
                  {g.type === "cash"
                    ? "نقدي"
                    : g.type === "bank"
                    ? "بنكي"
                    : "حساب"}
                </td>

                <td className="p-3 text-gray-600">
                  {g.account_name || "-"}
                </td>

                <td className="p-3 font-bold text-emerald-600">
                  {g.balance.toLocaleString()}
                </td>

                <td className="p-3 text-xs text-gray-400">
                  {g.created_by_name}
                </td>

                <td className="p-3 font-bold text-orange-600">
                  {g.branch_name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* =========================
          Modal: Create
      ========================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">

            <h3 className="font-bold text-center text-lg">
              إنشاء محفظة
            </h3>

            {/* Customer */}
            <select
              className="border p-3 w-full rounded"
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

            {/* Type */}
            <div className="flex justify-around bg-gray-50 p-2 rounded">
              {["cash", "bank", "account"].map((t) => (
                <label key={t}>
                  <input
                    type="radio"
                    checked={createType === t}
                    onChange={() => {
                      setCreateType(t as any);
                      setSelectedAccountId("");
                    }}
                  />{" "}
                  {t === "cash"
                    ? "نقدي"
                    : t === "bank"
                    ? "بنكي"
                    : "حساب"}
                </label>
              ))}
            </div>

            {/* Account */}
            <select
              className="border p-3 w-full rounded bg-indigo-50 font-bold"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="">اختر الحساب</option>

              {createType === "cash"
                ? cashBoxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_ar}
                    </option>
                  ))
                : createType === "bank"
                ? banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_ar}
                    </option>
                  ))
                : accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name_ar}
                    </option>
                  ))}
            </select>

            {/* Currency */}
            {createType !== "account" && (
              <>
                <select
                  className="border p-3 w-full rounded"
                  value={currencyId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCurrencyId(id);

                    const cur = currencies.find(
                      (c) => String(c.id) === id
                    );

                    if (cur) {
                      setRate(cur.exchange_rate || 1);
                      setIsLocalCurrency(!!cur.is_local);
                    }
                  }}
                >
                  <option value="">اختر العملة</option>

                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>

                {!isLocalCurrency && (
                  <input
                    type="number"
                    className="border p-3 w-full rounded"
                    placeholder="سعر الصرف"
                    value={rate}
                    onChange={(e) =>
                      setRate(Number(e.target.value))
                    }
                  />
                )}

                <input
                  type="number"
                  className="border p-3 w-full rounded"
                  placeholder="المبلغ"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />

                {currencyId &&
                  !isLocalCurrency &&
                  amount &&
                  rate && (
                    <div className="bg-gray-100 p-2 rounded text-sm text-center">
                      ما يعادله:
                      <b className="mx-2 text-indigo-700">
                        {(
                          Number(amount) * Number(rate)
                        ).toLocaleString()}
                      </b>
                      ريال
                    </div>
                  )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setShowCreateModal(false)}
              >
                إلغاء
              </button>

              <button
                onClick={createGuarantee}
                className="bg-indigo-600 text-white px-6 py-2 rounded"
              >
                حفظ
              </button>
            </div>

          </div>
        </div>
      )}

{/* =========================
    Modal: Add Amount
========================= */}
{showAddAmountModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">

      <h3 className="font-bold text-center text-lg">
        إضافة مبلغ
      </h3>

      {/* العميل */}
      <select
        className="border p-3 w-full rounded"
        value={addAmountCustomerId}
        onChange={(e) =>
          setAddAmountCustomerId(e.target.value)
        }
      >
        <option value="">اختر العميل</option>

        {eligibleForAdd.map((c) => (
          <option
            key={c.customer_id}
            value={c.customer_id}
          >
            {c.customer_name}
          </option>
        ))}
      </select>

      {/* النوع */}
      <div className="flex justify-around bg-gray-50 p-2 rounded">
        {["cash", "bank"].map((t) => (
          <label key={t}>
            <input
              type="radio"
              checked={addAmountType === t}
              onChange={() =>
                setAddAmountType(t as any)
              }
            />{" "}
            {t === "cash" ? "نقدي" : "بنكي"}
          </label>
        ))}
      </div>

      {/* الصندوق / البنك */}
      <select
        className="border p-3 w-full rounded"
        value={selectedAccountId}
        onChange={(e) =>
          setSelectedAccountId(e.target.value)
        }
      >
        <option value="">اختر الحساب</option>

        {(addAmountType === "cash"
          ? cashBoxes
          : banks
        ).map((a: any) => (
          <option key={a.id} value={a.id}>
            {a.name_ar}
          </option>
        ))}
      </select>

      {/* ====== العملة ====== */}
      <select
        className="border p-3 w-full rounded"
        value={currencyId}
        onChange={(e) => {
          const id = e.target.value;
          setCurrencyId(id);

          const cur = currencies.find(
            (c) => String(c.id) === id
          );

          if (cur) {
            setRate(cur.exchange_rate || 1);
            setIsLocalCurrency(!!cur.is_local);
          }
        }}
      >
        <option value="">اختر العملة</option>

        {currencies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name_ar}
          </option>
        ))}
      </select>

      {/* سعر الصرف */}
      {!isLocalCurrency && (
        <input
          type="number"
          className="border p-3 w-full rounded"
          placeholder="سعر الصرف"
          value={rate}
          onChange={(e) =>
            setRate(Number(e.target.value))
          }
        />
      )}

      {/* المبلغ */}
      <input
        type="number"
        className="border p-3 w-full rounded"
        placeholder="المبلغ"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* المعادل */}
      {currencyId && !isLocalCurrency && amount && rate && (
        <div className="bg-gray-100 p-2 rounded text-sm text-center">
          ما يعادله:
          <b className="mx-2 text-indigo-700">
            {(Number(amount) * Number(rate)).toLocaleString()}
          </b>
          ريال
        </div>
      )}

      {/* أزرار */}
      <div className="flex justify-end gap-2 pt-3">
        <button
          onClick={() => setShowAddAmountModal(false)}
        >
          إلغاء
        </button>

        <button
          onClick={addAmount}
          className="bg-green-600 text-white px-6 py-2 rounded"
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
