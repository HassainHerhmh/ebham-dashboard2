import React, { useEffect, useState } from "react";
import api from "../../services/api";

/* =========================
   Types
========================= */
type Bank = {
  id: number;
  name_ar: string;
  name_en: string;
  code: string;
  bank_group_name: string;
  account_name: string;
  user_name: string;
  branch_name: string;
};

type BankGroup = {
  id: number;
  name_ar: string;
};

type Account = {
  id: number;
  code: string;
  name_ar: string;
  parent_id: number | null;
};

const Banks: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankGroups, setBankGroups] = useState<BankGroup[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    code: "",
    bank_group_id: "",
    parent_account_id: "",
  });

  const loadBanks = async () => {
    const data = await api.banks.getBanks({ search });
    if (data.success) setBanks(data.banks);
  };

  const loadBankGroups = async () => {
    const data = await api.get("/bank-groups").then((res) => res.data);
    if (data.success) setBankGroups(data.groups);
  };

  const loadAccounts = async () => {
    const data = await api.get("/accounts/main-for-banks").then((res) => res.data);
    if (data.success) setAccounts(data.accounts);
  };

  useEffect(() => {
    loadBanks();
  }, [search]);

  useEffect(() => {
    loadBankGroups();
    loadAccounts();
  }, []);

  const addBank = async () => {
    if (
      !form.name_ar ||
      !form.code ||
      !form.bank_group_id ||
      !form.parent_account_id
    ) {
      alert("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const data = await api.banks.addBank({
      name_ar: form.name_ar,
      name_en: form.name_en,
      code: form.code,
      bank_group_id: Number(form.bank_group_id),
      parent_account_id: Number(form.parent_account_id),
      created_by: user.id || 1,
    });

    if (!data.success) {
      alert(data.message || "حدث خطأ");
      return;
    }

    setShowModal(false);
    setForm({
      name_ar: "",
      name_en: "",
      code: "",
      bank_group_id: "",
      parent_account_id: "",
    });

    loadBanks();
  };

  const deleteBank = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    await api.banks.deleteBank(id);
    loadBanks();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">دليل البنوك</h1>

      <div className="flex justify-between items-center">
        <input
          placeholder="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded-lg w-64"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-700 text-white px-4 py-2 rounded"
          >
            ➕ إضافة
          </button>
          <button
            onClick={loadBanks}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            🔄 تحديث
          </button>
          <button
            onClick={() => window.print()}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            🖨️ طباعة
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="border px-3 py-2">الاسم</th>
              <th className="border px-3 py-2">الاسم الأجنبي</th>
              <th className="border px-3 py-2">الرقم</th>
              <th className="border px-3 py-2">مجموعة البنوك</th>
              <th className="border px-3 py-2">الحساب الرئيسي</th>
              <th className="border px-3 py-2">الفرع</th>
              <th className="border px-3 py-2">المستخدم</th>
              <th className="border px-3 py-2">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {banks.map((b, i) => (
              <tr key={b.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-100"}>
                <td className="border px-3 py-2">{b.name_ar}</td>
                <td className="border px-3 py-2">{b.name_en || "-"}</td>
                <td className="border px-3 py-2 text-center">{b.code}</td>
                <td className="border px-3 py-2">{b.bank_group_name}</td>
                <td className="border px-3 py-2">{b.account_name}</td>
                <td className="border px-3 py-2">{b.branch_name || "—"}</td>
                <td className="border px-3 py-2">{b.user_name || "-"}</td>
                <td className="border px-3 py-2 text-center">
                  <button
                    onClick={() => deleteBank(b.id)}
                    className="text-red-600"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}

            {!banks.length && (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-500">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#eef4ee] p-6 rounded w-[420px]">
            <h2 className="text-xl font-bold text-center mb-4">إضافة بنك</h2>

            <input
              className="border p-2 w-full mb-2 rounded"
              placeholder="الاسم"
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />

            <input
              className="border p-2 w-full mb-2 rounded"
              placeholder="الاسم الأجنبي"
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
            />

            <input
              className="border p-2 w-full mb-2 rounded"
              placeholder="الرقم"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />

            <select
              className="border p-2 w-full mb-2 rounded"
              value={form.bank_group_id}
              onChange={(e) =>
                setForm({ ...form, bank_group_id: e.target.value })
              }
            >
              <option value="" disabled hidden>
                مجموعة البنوك
              </option>
              {bankGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_ar}
                </option>
              ))}
            </select>

            <select
              className="border p-2 w-full mb-4 rounded"
              value={form.parent_account_id}
              onChange={(e) =>
                setForm({ ...form, parent_account_id: e.target.value })
              }
            >
              <option value="" disabled hidden>
                الحساب الرئيسي
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name_ar}
                </option>
              ))}
            </select>

            <div className="flex justify-between">
              <button onClick={() => setShowModal(false)}>إلغاء</button>
              <button
                onClick={addBank}
                className="bg-green-700 text-white px-4 py-2 rounded"
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

export default Banks;
