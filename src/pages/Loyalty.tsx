import React, { useEffect, useMemo, useState } from "react";
import { Settings, X } from "lucide-react";
import api from "../services/api";

type LoyaltyLog = {
  id?: number;
  name?: string;
  phone?: string;
  amount?: number | string;
  points?: number;
  type?: "earn" | "redeem" | string;
  created_at: string;
};

type LoyaltySettings = {
  amount_per_point: number;
  point_value: number;
};

const BRAND = "#16a34a";

export default function Loyalty() {
  const [data, setData] = useState<LoyaltyLog[]>([]);
  const [filter, setFilter] = useState<"all" | "today">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings>({
    amount_per_point: 100,
    point_value: 1,
  });

  useEffect(() => {
    void loadData();
    void loadSettings();
  }, []);

  const loadData = async () => {
    const res = await api.get("/loyalty/admin/loyalty-logs");
    if (res.data.success) setData(res.data.data || []);
  };

  const loadSettings = async () => {
    const res = await api.get("/loyalty/settings");
    if (res.data) {
      setSettings({
        amount_per_point: Number(res.data.amount_per_point ?? 100),
        point_value: Number(res.data.point_value ?? 1),
      });
    }
  };

  const saveSettings = async () => {
    await api.put("/loyalty/settings", settings);
    setIsModalOpen(false);
  };

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (filter !== "today") return true;
      return new Date(item.created_at).toDateString() === new Date().toDateString();
    });
  }, [data, filter]);

  const totalPoints = filtered.reduce((sum, item) => sum + Number(item.points || 0), 0);
  const totalAmount = filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="min-h-full space-y-5 bg-transparent text-slate-900 dark:text-white" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-normal text-slate-900 dark:text-white">
            نقاط الولاء
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            متابعة السجل وإعدادات احتساب النقاط.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
          style={{ backgroundColor: BRAND }}
        >
          <Settings size={18} />
          إعدادات الولاء
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
            filter === "all"
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          الكل
        </button>
        <button
          onClick={() => setFilter("today")}
          className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
            filter === "today"
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          اليوم
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">مجموع النقاط</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {totalPoints}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">مجموع الصرف</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalAmount.toLocaleString()} ريال
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
              <tr>
                <th className="px-4 py-3 text-sm font-bold">العميل</th>
                <th className="px-4 py-3 text-sm font-bold">الجوال</th>
                <th className="px-4 py-3 text-sm font-bold">المبلغ</th>
                <th className="px-4 py-3 text-sm font-bold">النقاط</th>
                <th className="px-4 py-3 text-sm font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400"
                  >
                    لا توجد بيانات لعرضها.
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => {
                  const isEarn = item.type === "earn";
                  return (
                    <tr
                      key={item.id ?? `${item.phone}-${index}`}
                      className="text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                        {item.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm">{Number(item.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-extrabold">
                        <span
                          className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-3 py-1 ${
                            isEarn
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                          }`}
                        >
                          {isEarn ? "+" : "-"}
                          {Number(item.points || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(item.created_at).toLocaleDateString("ar-YE")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">إعدادات الولاء</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  كل كم ريال = نقطة
                </label>
                <input
                  type="number"
                  value={settings.amount_per_point}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      amount_per_point: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  قيمة النقطة بالريال
                </label>
                <input
                  type="number"
                  value={settings.point_value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      point_value: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <button
                onClick={saveSettings}
                className="w-full rounded-xl px-4 py-3 text-sm font-extrabold text-white transition hover:brightness-110"
                style={{ backgroundColor: BRAND }}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
