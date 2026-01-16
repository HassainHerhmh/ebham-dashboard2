import React, { useEffect, useState } from "react";
import api from "../services/api";

type Method = "neighborhood" | "distance";

interface Settings {
  method: Method;
  km_price_single: string;
  km_price_multi: string;
}

const DeliveryFeesSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    method: "neighborhood",
    km_price_single: "",
    km_price_multi: "",
  });

  useEffect(() => {
    api.get("/delivery-settings").then((res) => {
      if (res.data) {
        setSettings({
          method: res.data.method || "neighborhood",
          km_price_single: res.data.km_price_single || "",
          km_price_multi: res.data.km_price_multi || "",
        });
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    await api.post("/delivery-settings", settings);
    alert("تم حفظ الإعدادات");
  };

  if (loading) return <div className="p-4">جارٍ التحميل...</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto" style={{ direction: "rtl" }}>
      <h2 className="text-2xl font-bold mb-6">🚚 رسوم التوصيل</h2>

      <div className="bg-white border rounded p-4 mb-6">
        <h3 className="font-bold mb-3">طريقة الحساب</h3>

        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="radio"
            name="method"
            checked={settings.method === "neighborhood"}
            onChange={() =>
              setSettings({ ...settings, method: "neighborhood" })
            }
          />
          <span>حسب الحي (من صفحة الأحياء)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="method"
            checked={settings.method === "distance"}
            onChange={() =>
              setSettings({ ...settings, method: "distance" })
            }
          />
          <span>حسب المسافة (بالكيلومتر)</span>
        </label>
      </div>

      {settings.method === "distance" && (
        <div className="bg-white border rounded p-4 mb-6">
          <h3 className="font-bold mb-4">إعدادات المسافة</h3>

          <div className="mb-3">
            <label className="block mb-1 text-sm">
              الطلب من محل واحد – قيمة 1 كم
            </label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              placeholder="مثال: 300"
              value={settings.km_price_single}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  km_price_single: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="block mb-1 text-sm">
              الطلب من أكثر من محل – كل 1 كم إضافي
            </label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              placeholder="مثال: 150"
              value={settings.km_price_multi}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  km_price_multi: e.target.value,
                })
              }
            />
          </div>
        </div>
      )}

      <div className="text-left">
        <button
          onClick={save}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
};

export default DeliveryFeesSettings;
