import { useEffect, useState } from "react";
import api from "../../services/api";

type Account = {
  id: number;
  name_ar: string;
  parent_id?: number | null;
};

const TransitAccountsSettings = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [commissionIncome, setCommissionIncome] = useState<number | "">("");
  const [courierCommission, setCourierCommission] = useState<number | "">("");
  const [transferGuarantee, setTransferGuarantee] = useState<number | "">("");
  const [currencyExchange, setCurrencyExchange] = useState<number | "">("");

  useEffect(() => {
    (async () => {
      const res = await (api as any).accounts.getAccounts();

      // نأخذ الحسابات الفرعية فقط
      const subs = (res.list || []).filter(
        (a: Account) => a.parent_id !== null
      );

      setAccounts(subs);

      // جلب الإعدادات المحفوظة
      const s = await api.get("/settings/transit-accounts");
      const data = s.data?.data || {};

      setCommissionIncome(data.commission_income_account || "");
      setCourierCommission(data.courier_commission_account || "");
      setTransferGuarantee(data.transfer_guarantee_account || "");
      setCurrencyExchange(data.currency_exchange_account || "");
    })();
  }, []);

  const save = async () => {
    const payload = {
      commission_income_account: commissionIncome || null,
      courier_commission_account: courierCommission || null,
      transfer_guarantee_account: transferGuarantee || null,
      currency_exchange_account: currencyExchange || null,
    };

    try {
      await api.post("/settings/transit-accounts", payload);
      alert("تم حفظ الإعدادات بنجاح");
    } catch {
      alert("فشل حفظ الإعدادات");
    }
  };

  const renderSelect = (
    label: string,
    value: number | "",
    setValue: (v: any) => void
  ) => (
    <div className="space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      <select
        className="input w-full"
        value={value}
        onChange={(e) =>
          setValue(e.target.value ? Number(e.target.value) : "")
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

      <div className="grid grid-cols-2 gap-4">
        {renderSelect("حساب وسيط إيرادات العمولات", commissionIncome, setCommissionIncome)}
        {renderSelect("حساب وسيط عمولات الموصلين", courierCommission, setCourierCommission)}
        {renderSelect("حساب وسيط اعتماد الحوالات", transferGuarantee, setTransferGuarantee)}
        {renderSelect("حساب وسيط مصارفة العملة", currencyExchange, setCurrencyExchange)}
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
};

export default TransitAccountsSettings;
