import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw } from "lucide-react";
import api from "../services/api";

type JournalJob = {
  id: number;
  source_type: string;
  source_id: number;
  order_number?: string | number;
  status: "pending" | "failed" | "posted" | string;
  error_message?: string | null;
  retry_count?: number;
  last_attempt_at?: string | null;
  posted_at?: string | null;
};

const STATUS_META: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  posted: {
    label: "تم",
    className: "bg-green-100 text-green-800",
    icon: CheckCircle2,
  },
  failed: {
    label: "فشل",
    className: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
  pending: {
    label: "بانتظار",
    className: "bg-yellow-100 text-yellow-800",
    icon: Clock3,
  },
};

export default function JournalPostingAlerts() {
  const [jobs, setJobs] = useState<JournalJob[]>([]);
  const [counts, setCounts] = useState({ failed: 0, pending: 0, posted: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "failed" | "pending" | "posted">(
    "all"
  );

  const load = async (retry = false) => {
    setLoading(true);
    try {
      const res = retry
        ? await (api as any).journalPosting.retry()
        : await (api as any).journalPosting.getAll();
      setJobs(res?.list || []);
      setCounts({
        failed: Number(res?.counts?.failed || 0),
        pending: Number(res?.counts?.pending || 0),
        posted: Number(res?.counts?.posted || 0),
      });
      if (retry && Number(res?.processed?.posted || 0) > 0) {
        alert(`تم معالجة ${res.processed.posted} قيد تلقائياً`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
  }, []);

  const filtered = jobs.filter((job) =>
    filter === "all" ? true : job.status === filter
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">إشعارات القيود</h2>
          <p className="text-sm text-gray-500">
            يظهر هنا هل قيد الطلب تم أو فشل، وسبب الفشل. بعد حل السبب تُعالج القيود تلقائياً.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-2 rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          <RefreshCcw size={16} />
          {loading ? "جاري المعالجة..." : "إعادة المعالجة"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-red-50 p-3 text-red-800">
          فشل: {counts.failed}
        </div>
        <div className="rounded-lg bg-yellow-50 p-3 text-yellow-800">
          بانتظار: {counts.pending}
        </div>
        <div className="rounded-lg bg-green-50 p-3 text-green-800">
          تم: {counts.posted}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "الكل"],
            ["failed", "فشل"],
            ["pending", "بانتظار"],
            ["posted", "تم"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded px-3 py-1 text-sm ${
              filter === key
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">الطلب</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">السبب</th>
              <th className="p-3">آخر محاولة</th>
              <th className="p-3">المحاولات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-gray-400" colSpan={5}>
                  لا توجد إشعارات قيود
                </td>
              </tr>
            ) : (
              filtered.map((job) => {
                const meta = STATUS_META[job.status] || STATUS_META.pending;
                const Icon = meta.icon;
                return (
                  <tr key={job.id} className="border-t">
                    <td className="p-3 font-semibold">
                      #{job.order_number || job.source_id}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${meta.className}`}
                      >
                        <Icon size={14} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700">
                      {job.status === "posted"
                        ? "تم ترحيل القيود بنجاح"
                        : job.error_message || "—"}
                    </td>
                    <td className="p-3 text-gray-500">
                      {job.last_attempt_at
                        ? String(job.last_attempt_at).replace("T", " ").slice(0, 19)
                        : "—"}
                    </td>
                    <td className="p-3 text-center">{job.retry_count || 0}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
