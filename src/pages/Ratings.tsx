import { useEffect, useState } from "react";
import { Search, Star } from "lucide-react";
import api from "../services/api";

function Stars({ value }: { value?: number | null }) {
  const n = Number(value || 0);
  return (
    <span className="inline-flex gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={i <= n ? "fill-amber-400" : "text-gray-300"}
        />
      ))}
    </span>
  );
}

export default function Ratings() {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, avg_restaurant: 0, avg_captain: 0 });
  const [search, setSearch] = useState("");

  const load = async (q = search) => {
    const res = await (api as any).ratings.getAll(q);
    setRows(res?.list || []);
    setStats({
      total: Number(res?.stats?.total || 0),
      avg_restaurant: Number(res?.stats?.avg_restaurant || 0),
      avg_captain: Number(res?.stats?.avg_captain || 0),
    });
  };

  useEffect(() => {
    load("");
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">تقييمات العملاء</h1>
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute right-3 top-3 text-gray-400" />
          <input
            className="w-full rounded border p-2 pr-9"
            placeholder="بحث بالعميل أو المحل أو الكابتن أو الملاحظة"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">عدد التقييمات</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">متوسط تقييم المحل</div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            {stats.avg_restaurant || "—"}
            <Stars value={stats.avg_restaurant} />
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">متوسط تقييم الكابتن</div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            {stats.avg_captain || "—"}
            <Stars value={stats.avg_captain} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">الطلب</th>
              <th className="p-3">العميل</th>
              <th className="p-3">المحل</th>
              <th className="p-3">الكابتن</th>
              <th className="p-3">الملاحظات</th>
              <th className="p-3">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  لا توجد تقييمات بعد
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="p-3 font-semibold">#{row.order_number}</td>
                  <td className="p-3">
                    <div>{row.customer_name || "—"}</div>
                    <div className="text-xs text-gray-400">{row.customer_phone || ""}</div>
                  </td>
                  <td className="p-3">
                    <div>{row.restaurant_name || "—"}</div>
                    <Stars value={row.restaurant_rating} />
                  </td>
                  <td className="p-3">
                    <div>{row.captain_name || "—"}</div>
                    <Stars value={row.captain_rating} />
                  </td>
                  <td className="p-3 text-gray-700">{row.notes || "—"}</td>
                  <td className="p-3 text-gray-500">
                    {row.created_at
                      ? String(row.created_at).replace("T", " ").slice(0, 16)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
