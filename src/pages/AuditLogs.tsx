import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../services/api";

export default function AuditLogs() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async (q = search) => {
    const res = await (api as any).auditLogs.getAll(q);
    setRows(res?.list || []);
  };

  useEffect(() => {
    load("");
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">سجل التدقيق</h1>
          <p className="text-sm text-gray-500">
            من غيّر حالة الطلب، أسند كابتن، أو ألغى طلباً.
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute right-3 top-3 text-gray-400" />
          <input
            className="w-full rounded border p-2 pr-9"
            placeholder="بحث بالاسم أو الإجراء أو رقم الطلب"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">الوقت</th>
              <th className="p-3">المستخدم</th>
              <th className="p-3">الإجراء</th>
              <th className="p-3">العنصر</th>
              <th className="p-3">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  لا توجد حركات بعد
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3 whitespace-nowrap text-gray-500">
                    {row.created_at
                      ? String(row.created_at).replace("T", " ").slice(0, 19)
                      : "—"}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold">{row.actor_name || "—"}</div>
                    <div className="text-xs text-gray-400">{row.actor_type || ""}</div>
                  </td>
                  <td className="p-3 font-semibold">{row.action}</td>
                  <td className="p-3">
                    {row.entity_type || ""} #{row.entity_id || "—"}
                  </td>
                  <td className="p-3 text-gray-700">{row.details || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
