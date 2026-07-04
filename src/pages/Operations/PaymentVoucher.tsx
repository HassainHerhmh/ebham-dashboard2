import React, { useEffect, useState } from "react";
import api from "../../services/api";
import {
  OPERATIONS_CSS,
  opsActionBar,
  opsEmptyCell,
  opsFilterLabel,
  opsModalShell,
  opsRowBase,
  opsRowSelected,
  opsTableHead,
  opsTableWrap,
  opsTd,
  opsTh,
} from "./operationsTheme";

type PaymentType = "cash" | "bank" | "";

type Voucher = {
  id: number;
  voucherNo: string;
  date: string;
  paymentType: PaymentType;
  paymentTypeName?: string;
  cashBox?: string;
  bankAccount?: string;
  transferNo?: string;
  currency: string;
  amount: string;
  account: string;
  analyticAccount?: string;
  costCenter?: string;
  notes?: string;
  handling?: string;
  createdAt: string;
  user: string;
  branch: string;
};

type CashBox = {
  id: number;
  name_ar: string;
};

type Bank = {
  id: number;
  name_ar: string;
};

type Account = {
  id: number;
  name_ar: string;
};

type Currency = {
  id: number;
  name_ar: string;
  code: string;
  symbol: string;
  is_local?: number;
};

const today = new Date().toLocaleDateString("en-CA");

const formatLocalDateTime = (dateString: string) => {
  const d = new Date(dateString);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("ar-YE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const getPaymentTypeName = (voucher: Voucher) => {
  if (voucher.paymentTypeName) return voucher.paymentTypeName;
  if (voucher.paymentType === "cash") return "نقد";
  if (voucher.paymentType === "bank") return "بنوك";
  return "-";
};

const PaymentVoucher: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [date, setDate] = useState(today);
  const [allDates, setAllDates] = useState(false);

  const [list, setList] = useState<Voucher[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [journalTypes, setJournalTypes] = useState<any[]>([]);

  const [form, setForm] = useState({
    voucherNo: "",
    date: today,
    paymentType: "" as PaymentType,
    cashBox: "",
    bankAccount: "",
    transferNo: "",
    currency_id: "",
    currency: "",
    amount: "",
    account: "",
    analyticAccount: "",
    costCenter: "",
    handling: "",
    notes: "",
    journalTypeId: "",
  });

  const loadVouchers = async () => {
    const res = await api.get("/payment-vouchers");

    if (!res.data.success) return;

    setList(
      res.data.list.map((v: any) => {
        const cashBoxName = v.cash_box_account_id
          ? cashBoxes.find((c) => c.id === v.cash_box_account_id)?.name_ar ||
            v.cash_box_name ||
            ""
          : "";

        const bankAccountName = v.bank_account_id
          ? bankAccounts.find((b) => b.id === v.bank_account_id)?.name_ar ||
            v.bank_name ||
            ""
          : "";

        return {
          id: v.id,
          voucherNo: String(v.voucher_no),
          date: v.voucher_date?.split("T")[0] || "",
          paymentType: v.payment_type,
          paymentTypeName: v.payment_type_name,
          cashBox: cashBoxName,
          bankAccount: bankAccountName,
          transferNo: v.transfer_no,
          currency: v.currency_name || "",
          amount: String(v.amount ?? ""),
          account: v.account_name || "",
          analyticAccount: v.analytic_account_id,
          costCenter: v.cost_center_id,
          notes: v.notes,
          handling: v.handling,
          createdAt: v.created_at,
          user: v.user_name || "—",
          branch: v.branch_name || "—",
        };
      })
    );
  };

  const fetchCashBoxes = async () => {
    const res = await api.get("/cash-boxes");
    const data =
      res.data?.list ||
      res.data?.cashBoxes ||
      res.data?.data ||
      res.data ||
      [];
    setCashBoxes(Array.isArray(data) ? data : []);
  };

  const fetchBanks = async () => {
    const res = await api.get("/banks");
    setBankAccounts(res.data.success ? res.data.banks : []);
  };

  const fetchAccounts = async () => {
    const res = await api.get("/accounts/sub-for-ceiling");
    const data =
      res.data?.list ||
      res.data?.accounts ||
      res.data?.data ||
      res.data ||
      [];
    setAccounts(Array.isArray(data) ? data : []);
  };

  const fetchCurrencies = async () => {
    const res = await api.get("/currencies");
    const data =
      res.data?.currencies ||
      res.data?.list ||
      res.data?.data ||
      res.data ||
      [];
    setCurrencies(Array.isArray(data) ? data : []);
  };

  const fetchJournalTypes = async () => {
    const res = await api.get("/journal-types");
    const data =
      res.data?.list ||
      res.data?.journalTypes ||
      res.data?.data ||
      res.data ||
      [];
    setJournalTypes(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchCashBoxes();
    fetchBanks();
    fetchAccounts();
    fetchCurrencies();
    fetchJournalTypes();
    loadVouchers();
  }, []);

  useEffect(() => {
    if (cashBoxes.length || bankAccounts.length) {
      loadVouchers();
    }
  }, [cashBoxes, bankAccounts]);

  useEffect(() => {
    if (!form.currency_id && currencies.length > 0) {
      const defaultCurrency = currencies.find((c) => c.is_local === 1) || currencies[0];

      setForm((prev) => ({
        ...prev,
        currency_id: String(defaultCurrency.id),
        currency: defaultCurrency.name_ar,
      }));
    }
  }, [currencies, form.currency_id]);

  const resetForm = () => {
    const defaultCurrency = currencies.find((c) => c.is_local === 1) || currencies[0];

    setForm({
      voucherNo: "",
      date: today,
      paymentType: "",
      cashBox: "",
      bankAccount: "",
      transferNo: "",
      currency_id: defaultCurrency ? String(defaultCurrency.id) : "",
      currency: defaultCurrency?.name_ar || "",
      amount: "",
      account: "",
      analyticAccount: "",
      costCenter: "",
      handling: "",
      notes: "",
      journalTypeId: "",
    });
  };

  const openAdd = () => {
    setSelectedId(null);
    resetForm();
    setShowModal(true);
  };

  const getValidatedPayload = () => {
    if (!form.paymentType) {
      alert("اختر نوع السند");
      return null;
    }

    if (form.paymentType === "cash" && !form.cashBox) {
      alert("اختر الصندوق");
      return null;
    }

    if (form.paymentType === "bank" && !form.bankAccount) {
      alert("اختر حساب البنك");
      return null;
    }

    if (!form.account) {
      alert("اختر الحساب");
      return null;
    }

    if (!form.currency_id) {
      alert("اختر العملة");
      return null;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert("أدخل مبلغ صحيح");
      return null;
    }

    return {
      voucher_no: form.voucherNo,
      voucher_date: form.date,
      payment_type: form.paymentType,
      cash_box_account_id:
        form.paymentType === "cash" ? Number(form.cashBox) : null,
      bank_account_id:
        form.paymentType === "bank" ? Number(form.bankAccount) : null,
      transfer_no: form.transferNo || null,
      currency_id: Number(form.currency_id),
      amount: Number(form.amount),
      account_id: Number(form.account),
      analytic_account_id: form.analyticAccount || null,
      cost_center_id: form.costCenter || null,
      journal_type_id: form.journalTypeId ? Number(form.journalTypeId) : 1,
      notes: form.notes || null,
      handling: form.handling || null,
      created_by: 1,
      branch_id: 1,
    };
  };

  const addVoucher = async () => {
    try {
      const payload = getValidatedPayload();
      if (!payload) return;

      const res = await api.post("/payment-vouchers", payload);
      if (!res.data.success) return alert("فشل حفظ السند");

      await loadVouchers();
      setShowModal(false);
      setSelectedId(null);
      resetForm();
    } catch (err: any) {
      alert(err.response?.data?.message || "خطأ في حفظ سند الصرف");
    }
  };

  const updateVoucher = async () => {
    if (!selectedId) return;

    try {
      const payload = getValidatedPayload();
      if (!payload) return;

      const res = await api.put(`/payment-vouchers/${selectedId}`, payload);
      if (!res.data.success) return alert("فشل التعديل");

      await loadVouchers();
      setShowModal(false);
      setSelectedId(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "خطأ في التعديل");
    }
  };

  const remove = async () => {
    if (!selectedId) return alert("حدد سند أولًا");
    if (!window.confirm("هل أنت متأكد من حذف السند؟")) return;

    try {
      const res = await api.delete(`/payment-vouchers/${selectedId}`);
      if (!res.data.success) return alert("فشل حذف السند");

      await loadVouchers();
      setSelectedId(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "خطأ في حذف السند");
    }
  };

  const openEdit = () => {
    if (!selectedId) return;

    const v = list.find((x) => x.id === selectedId);
    if (!v) return;

    setForm({
      voucherNo: v.voucherNo,
      date: v.date,
      paymentType: v.paymentType,
      cashBox: v.cashBox
        ? String(cashBoxes.find((c) => c.name_ar === v.cashBox)?.id || "")
        : "",
      bankAccount: v.bankAccount
        ? String(bankAccounts.find((b) => b.name_ar === v.bankAccount)?.id || "")
        : "",
      transferNo: v.transferNo || "",
      currency_id:
        currencies.find((c) => c.name_ar === v.currency)?.id?.toString() ||
        form.currency_id,
      currency: v.currency || form.currency,
      amount: v.amount,
      account: accounts.find((a) => a.name_ar === v.account)?.id?.toString() || "",
      analyticAccount: v.analyticAccount || "",
      costCenter: v.costCenter || "",
      handling: v.handling || "",
      notes: v.notes || "",
      journalTypeId: "",
    });

    setShowModal(true);
  };

  const filtered = list.filter((x) => {
    const matchSearch =
      String(x.voucherNo || "").includes(search) ||
      String(x.account || "").includes(search) ||
      String(x.notes || "").includes(search) ||
      String(x.transferNo || "").includes(search) ||
      String(x.amount || "").includes(search);

    const matchDate = allDates || (x.date && x.date.slice(0, 10) === date);
    return matchSearch && matchDate;
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className={opsActionBar}>
        <div className="flex gap-2">
          <button onClick={openAdd} className="btn-green">
            إضافة
          </button>
          <button
            onClick={openEdit}
            disabled={!selectedId}
            className={`btn-gray ${!selectedId ? "cursor-not-allowed opacity-50" : ""}`}
          >
            تعديل
          </button>
          <button
            onClick={remove}
            disabled={!selectedId}
            className={`btn-red ${!selectedId ? "cursor-not-allowed opacity-50" : ""}`}
          >
            حذف
          </button>
          <button className="btn-gray">طباعة</button>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <input
          placeholder="بحث..."
          className="input w-56 text-right"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <input
            type="date"
            className="input w-40"
            disabled={allDates}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <label className={opsFilterLabel}>
            <input
              type="checkbox"
              checked={allDates}
              onChange={(e) => setAllDates(e.target.checked)}
            />
            كل التواريخ
          </label>
        </div>
      </div>

      <div className={opsTableWrap}>
        <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 text-center text-sm">
          <thead className={opsTableHead}>
            <tr>
              <th className={opsTh}>رقم السند</th>
              <th className={opsTh}>التاريخ</th>
              <th className={opsTh}>نوع الصرف</th>
              <th className={opsTh}>الصندوق / البنك</th>
              <th className={opsTh}>رقم الحوالة</th>
              <th className={opsTh}>العملة</th>
              <th className={opsTh}>المبلغ</th>
              <th className={opsTh}>الحساب</th>
              <th className={opsTh}>ملاحظات</th>
              <th className={opsTh}>وقت الإنشاء</th>
              <th className={opsTh}>المستخدم</th>
              <th className={opsTh}>الفرع</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`${opsRowBase} ${
                    selectedId === v.id ? opsRowSelected : ""
                  }`}
                >
                  <td className={opsTd}>{v.voucherNo}</td>
                  <td className={opsTd}>{v.date}</td>
                  <td className={opsTd}>
                    {getPaymentTypeName(v)}
                  </td>
                  <td className={opsTd}>
                    {v.cashBox || v.bankAccount || "-"}
                  </td>
                  <td className={opsTd}>
                    {v.transferNo || "-"}
                  </td>
                  <td className={opsTd}>{v.currency}</td>
                  <td className={opsTd}>{v.amount}</td>
                  <td className={opsTd}>{v.account}</td>
                  <td className={opsTd}>
                    {v.notes || "-"}
                  </td>
                  <td className={opsTd}>
                    {formatLocalDateTime(v.createdAt)}
                  </td>
                  <td className={opsTd}>{v.user}</td>
                  <td className={opsTd}>{v.branch}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12} className={opsEmptyCell}>
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={opsModalShell}>
            <h3 className="text-center text-lg font-bold">
              {selectedId ? "تعديل سند صرف" : "إضافة سند صرف"}
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <input disabled className="input bg-gray-100" value={form.voucherNo} />
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <select
                className="input"
                value={form.paymentType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    paymentType: e.target.value as PaymentType,
                    cashBox: "",
                    bankAccount: "",
                    transferNo: "",
                  })
                }
              >
                <option value="">-- نوع الصرف --</option>
                <option value="cash">نقد</option>
                <option value="bank">بنوك</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {form.paymentType === "cash" && (
                <select
                  className="input"
                  value={form.cashBox}
                  onChange={(e) => setForm({ ...form, cashBox: e.target.value })}
                >
                  <option value="">-- اختر الصندوق --</option>
                  {cashBoxes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>
              )}

              {form.paymentType === "bank" && (
                <>
                  <select
                    className="input"
                    value={form.bankAccount}
                    onChange={(e) =>
                      setForm({ ...form, bankAccount: e.target.value })
                    }
                  >
                    <option value="">-- اختر حساب البنك --</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name_ar}
                      </option>
                    ))}
                  </select>

                  <input
                    placeholder="رقم الحوالة (اختياري)"
                    className="input"
                    value={form.transferNo}
                    onChange={(e) =>
                      setForm({ ...form, transferNo: e.target.value })
                    }
                  />
                </>
              )}

              <select
                className="input"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              >
                <option value="">-- الحساب --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <select
                className="input"
                value={form.currency_id}
                onChange={(e) => setForm({ ...form, currency_id: e.target.value })}
              >
                <option value="">-- العملة --</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} ({c.code})
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="المبلغ"
                className="input"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <input
                placeholder="مناولة"
                className="input"
                value={form.handling}
                onChange={(e) => setForm({ ...form, handling: e.target.value })}
              />
            </div>

            <textarea
              className="input w-full"
              placeholder="البيان"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="border-t pt-3">
              <button
                onClick={() => setShowExtra(!showExtra)}
                className="flex w-full items-center justify-between font-semibold text-green-700 dark:text-green-400"
              >
                <span>الخيارات الإضافية</span>
                <span>{showExtra ? "▾" : "▸"}</span>
              </button>

              {showExtra && (
                <div className="mt-3 grid grid-cols-3 gap-4">
                  <select
                    className="input"
                    value={form.journalTypeId}
                    onChange={(e) =>
                      setForm({ ...form, journalTypeId: e.target.value })
                    }
                  >
                    <option value="">-- نوع السند --</option>
                    {journalTypes.map((jt: any) => (
                      <option key={jt.id} value={jt.id}>
                        {jt.name_ar} {jt.code ? `(${jt.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="الحساب التحليلي"
                    className="input"
                    value={form.analyticAccount}
                    onChange={(e) =>
                      setForm({ ...form, analyticAccount: e.target.value })
                    }
                  />
                  <input
                    placeholder="مركز التكلفة"
                    className="input"
                    value={form.costCenter}
                    onChange={(e) =>
                      setForm({ ...form, costCenter: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setShowModal(false)} className="btn-gray">
                إلغاء
              </button>
              <button
                onClick={selectedId ? updateVoucher : addVoucher}
                className="btn-green"
              >
                {selectedId ? "حفظ التعديل" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{OPERATIONS_CSS}</style>
    </div>
  );
};

export default PaymentVoucher;
