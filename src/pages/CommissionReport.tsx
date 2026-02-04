import React, { useEffect, useState } from "react";
import api from "../services/api";

const CommissionReport = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [captains, setCaptains] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);

  const loadReport = async () => {
    if (!from || !to) return alert("حدد الفترة");

    const [s, o, c, r] = await Promise.all([
      api.get(`/api/reports/commissions/summary?from=${from}&to=${to}`),
      api.get(`/api/reports/commissions?from=${from}&to=${to}`),
      api.get(`/api/reports/commissions/captains?from=${from}&to=${to}`),
      api.get(`/api/reports/commissions/restaurants?from=${from}&to=${to}`),
    ]);

    setSummary(s.data.summary);
    setOrders(o.data.data);
    setCaptains(c.data.data);
    setRestaurants(r.data.data);
  };

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">📊 تقرير العمولات</h1>

      {/* فلترة */}
      <div className="bg-white p-4 rounded shadow grid grid-cols-3 gap-4">

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={loadReport}
          className="bg-green-600 text-white rounded px-4"
        >
          عرض التقرير
        </button>

      </div>

      {/* الملخص */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">

          <div className="bg-white p-4 rounded shadow">
            <p>عدد الطلبات</p>
            <h2 className="text-xl font-bold">{summary.total_orders}</h2>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p>إجمالي المبيعات</p>
            <h2 className="text-xl font-bold">
              {Number(summary.total_sales).toLocaleString()}
            </h2>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p>إجمالي العمولات</p>
            <h2 className="text-xl font-bold text-green-600">
              {Number(summary.total_commissions).toLocaleString()}
            </h2>
          </div>

        </div>
      )}

      {/* حسب الطلبات */}
      <ReportTable title="حسب الطلبات" data={orders} />

      {/* حسب الكباتن */}
      <ReportTable title="حسب الكباتن" data={captains} />

      {/* حسب المطاعم */}
      <ReportTable title="حسب المطاعم" data={restaurants} />

    </div>
  );
};

export default CommissionReport;


/* جدول عام */
const ReportTable = ({ title, data }: any) => {
  if (!data?.length) return null;

  return (
    <div className="bg-white rounded shadow overflow-hidden">

      <h2 className="p-3 font-bold bg-gray-100">{title}</h2>

      <table className="w-full text-center">

        <thead className="bg-gray-50 border-b">
          <tr>
            {Object.keys(data[0]).map((k) => (
              <th key={k} className="p-2 text-sm">{k}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((r: any, i: number) => (
            <tr key={i} className="border-t">

              {Object.values(r).map((v: any, j) => (
                <td key={j} className="p-2 text-sm">
                  {v ?? "-"}
                </td>
              ))}

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
};
