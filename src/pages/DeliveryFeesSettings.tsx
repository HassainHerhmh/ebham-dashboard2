import React, { useEffect, useState } from "react";
import api from "../services/api";

type BranchRow = {
  branch_id: number;
  branch_name: string;
  method: "distance" | "neighborhood";
  km_price_single: number;
  km_price_multi: number;
};

const DeliveryFeesSettings: React.FC = () => {
  const [mode, setMode] = useState<"admin" | "branch">("branch");
  const [loading, setLoading] = useState(true);

  // فرع عادي
  const [method, setMethod] = useState<"distance" | "neighborhood">("distance");
  const [single, setSingle] = useState<number>(0);
  const [multi, setMulti] = useState<number>(0);
  const [extraStoreFee, setExtraStoreFee] = useState<number>(0);

  // إدارة عامة
  const [rows, setRows] = useState<BranchRow[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.get("/delivery-settings");
    if (res.data.mode === "admin") {
      setMode("admin");
      setRows(res.data.rows);
    } else {
      setMode("branch");
      const d = res.data.data;
      if (d) {
        setMethod(d.method);
        setSingle(Number(d.km_price_single || 0));
        setMulti(Number(d.km_price_multi || 0));
      }
    }
    setLoading(false);
  };

  const save = async () => {
    await api.post("/delivery-settings", {
      method,
      km_price_single: single,
      km_price_multi: multi,
    });
    alert("تم الحفظ");
  };

    await api.post("/delivery-settings", {
  method,
  km_price_single: single,
  km_price_multi: multi,
  extra_store_fee: extraStoreFee,
});

  if (d) {
  setMethod(d.method);
  setSingle(Number(d.km_price_single || 0));
  setMulti(Number(d.km_price_multi || 0));
  setExtraStoreFee(Number(d.extra_store_fee || 0));
}

  
  if (loading) return <div>جارِ التحميل...</div>;

  // ================== الإدارة العامة ==================
  if (mode === "admin") {
    return (
      <div className="bg-white rounded p-6 shadow">
        <h2 className="text-xl font-bold mb-4">رسوم التوصيل - الفروع</h2>

        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">الفرع</th>
              <th className="p-2 border">طريقة الحساب</th>
              <th className="p-2 border">سعر 1 كم</th>
              <th className="p-2 border">سعر كل كم إضافي</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.branch_id}>
                <td className="p-2 border">{r.branch_name}</td>
                <td className="p-2 border">
                  {r.method === "distance" ? "حسب المسافة" : "حسب الحي"}
                </td>
                <td className="p-2 border">{r.km_price_single}</td>
                <td className="p-2 border">{r.km_price_multi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ================== فرع عادي ==================
  return (
    <div className="bg-white rounded p-6 shadow max-w-2xl">
      <h2 className="text-xl font-bold mb-4">رسوم التوصيل</h2>

      <div className="mb-6">
        <div className="font-semibold mb-2">طريقة الحساب</div>
        <label className="block mb-2">
          <input
            type="radio"
            checked={method === "neighborhood"}
            onChange={() => setMethod("neighborhood")}
          />{" "}
          حسب الحي (من صفحة الأحياء)
        </label>

        <label className="block">
          <input
            type="radio"
            checked={method === "distance"}
            onChange={() => setMethod("distance")}
          />{" "}
          حسب المسافة (بالكيلومتر)
        </label>
      </div>

      {method === "neighborhood" && (
  <div className="space-y-4">
    <div>
      <div className="mb-1">
        الطلب من أكثر من محل – رسوم إضافية
      </div>
      <input
        type="number"
        className="border p-2 w-full"
        value={multi}
        onChange={(e) => setMulti(Number(e.target.value))}
      />
      <p className="text-sm text-gray-500 mt-1">
        ملاحظة: سعر الطلب من محل واحد يتم أخذه تلقائيًا من رسوم الحي.
      </p>
    </div>
  </div>
)}

      {method === "distance" && (
        <div className="space-y-4">
          <div>
            <div className="mb-1">الطلب من محل واحد – قيمة 1 كم</div>
            <input
              type="number"
              className="border p-2 w-full"
              value={single}
              onChange={(e) => setSingle(Number(e.target.value))}
            />
          </div>

          <div>
            <div className="mb-1">
              الطلب من أكثر من محل – كل 1 كم إضافي
            </div>
            <input
              type="number"
              className="border p-2 w-full"
              value={multi}
              onChange={(e) => setMulti(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <button
        onClick={save}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded"
      >
        حفظ الإعدادات
      </button>
    </div>
  );
};

export default DeliveryFeesSettings;
