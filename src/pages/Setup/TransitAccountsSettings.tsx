import { useEffect, useState } from "react";
import api from "../../services/api";

type Account = {
  id: number;
  name_ar: string;
  parent_id: number | null;
};

const TransitAccountsSettings = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [commissionIncome, setCommissionIncome] = useState<number | "">("");
  const [courierCommission, setCourierCommission] = useState<number | "">("");
  const [transferGuarantee, setTransferGuarantee] = useState<number | "">("");
  const [currencyExchange, setCurrencyExchange] = useState<number | "">("");
  const [customerGuarantee, setCustomerGuarantee] = useState<number | "">("");
const [customerCredit, setCustomerCredit] = useState<number | "">("");




useEffect(() => {
  (async () => {
    const res = await (api as any).accounts.getAccounts();

    // نأخذ الحسابات الفرعية فقط
    const subs = (res.list || []).filter(
      (a: Account) => a.parent_id !== null
    );

    setAccounts(subs);
  })();

  // جلب القيم المحفوظة
  (async () => {
    const res = await api.get("/settings/transit-accounts");
    const d = res.data?.data || {};
    setCommissionIncome(d.commission_income_account || "");
    setCourierCommission(d.courier_commission_account || "");
    setTransferGuarantee(d.transfer_guarantee_account || "");
    setCurrencyExchange(d.currency_exchange_account || "");
    setCustomerGuarantee(d.customer_guarantee_account || "");
   setCustomerCredit(d.customer_credit_account || "");

  })();
}, []);

  const save = async () => {
    const payload = {
      commission_income_account: commissionIncome || null,
      courier_commission_account: courierCommission || null,
      transfer_guarantee_account: transferGuarantee || null,
      currency_exchange_account: currencyExchange || null,
        customer_guarantee_account: customerGuarantee || null, // 🆕
        customer_credit_account: customerCredit || null, // 🆕

    };

    try {
      await api.post("/settings/transit-accounts", payload);
      alert("تم حفظ الإعدادات بنجاح");
    } catch {
      alert("فشل حفظ الإعدادات");
    }
  };

  const Field = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number | "";
    onChange: (v: number | "") => void;
  }) => (
    <div className="bg-white border rounded-xl p-4 space-y-2 shadow-sm">
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <select
        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        value={value}
        onChange={(e) =>
          e.target.value ? onChange(Number(e.target.value)) : onChange("")
        }
      >
        <option value="">اختر حساب</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name_ar}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-lg font-bold text-green-700">
        الحسابات الوسيطة (Transit)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="حساب وسيط إيرادات العمولات"
          value={commissionIncome}
          onChange={setCommissionIncome}
        />
        <Field
          label="حساب وسيط عمولات الموصلين"
          value={courierCommission}
          onChange={setCourierCommission}
        />
        <Field
          label="حساب وسيط اعتماد الحوالات"
          value={transferGuarantee}
          onChange={setTransferGuarantee}
        />
        <Field
          label="حساب وسيط مصارفة العملة"
          value={currencyExchange}
          onChange={setCurrencyExchange}
        />
        <Field
        label="حساب وسيط تأمين العملاء"
        value={customerGuarantee}
        onChange={setCustomerGuarantee}
        />

        <Field
  label="حساب وسيط اعتماد العملاء"
  value={customerCredit}
  onChange={setCustomerCredit}
/>

      </div>
       
      <div className="flex justify-end">
        <button
          onClick={save}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
        >
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
};

export default TransitAccountsSettings;
