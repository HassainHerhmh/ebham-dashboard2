import React, { useEffect, useState } from "react";
import api from "../../services/api";

type Account = {
  id: number;
  name_ar: string;
};

type TransitSettings = {
  transit_commission_income?: string;
  transit_courier_commission?: string;
  transit_transfer_approval?: string;
  transit_currency_exchange?: string;
};

const TransitAccountsSettings: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<TransitSettings>({
    transit_commission_income: "",
    transit_courier_commission: "",
    transit_transfer_approval: "",
    transit_currency_exchange: "",
  });

  useEffect(() => {
    (async () => {
      const [aRes, sRes] = await Promise.all([
        api.get("/accounts?only_sub=1"),
        api.get("/settings/transit"),
      ]);

      setAccounts(aRes.data?.list || []);
      setSettings(prev => ({ ...prev, ...(sRes.data?.data || {}) }));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    await api.post("/settings/transit", settings);
    alert("تم حفظ الإعدادات بنجاح");
  };

  if (loading) return <div>جاري التحميل...</div>;

  const Select = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value?: string;
    onChange: (v: string) => void;
  }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <select
        className="input w-full"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— اختر الحساب —</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name_ar}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-xl font-bold">إعدادات الحسابات الوسيطة (Transit)</h2>

      <div className="bg-[#eef3ea] p-4 rounded-lg space-y-3">
        <Select
          label="حساب وسيط إيرادات العمولات"
          value={settings.transit_commission_income}
          onChange={(v) =>
            setSettings((p) => ({ ...p, transit_commission_income: v }))
          }
        />

        <Select
          label="حساب وسيط عمولات الموصلين"
          value={settings.transit_courier_commission}
          onChange={(v) =>
            setSettings((p) => ({ ...p, transit_courier_commission: v }))
          }
        />

        <Select
          label="حساب وسيط اعتماد الحوالات"
          value={settings.transit_transfer_approval}
          onChange={(v) =>
            setSettings((p) => ({ ...p, transit_transfer_approval: v }))
          }
        />

        <Select
          label="حساب وسيط مصارفة العملة"
          value={settings.transit_currency_exchange}
          onChange={(v) =>
            setSettings((p) => ({ ...p, transit_currency_exchange: v }))
          }
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className="px-6 py-2 bg-green-700 text-white rounded"
        >
          حفظ الإعدادات
        </button>
      </div>

      <style>{`
        .input {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ccc;
        }
      `}</style>
    </div>
  );
};

export default TransitAccountsSettings;
