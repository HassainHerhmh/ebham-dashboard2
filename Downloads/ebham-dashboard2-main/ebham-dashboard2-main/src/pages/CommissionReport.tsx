import React, { useEffect, useState } from "react";
import api from "../services/api";

interface Row {
  order_date: string;
  captain_name: string;
  restaurant_name: string;
  order_id: number;
  total_amount: number;
  restaurant_commission: number;
  captain_commission: number;
}

const CommissionReport = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

 const res = await api.get(
  `/system-reports/commissions`,
  {
    params: { from, to }
  }
);


      setRows(res?.list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFrom(today);
    setTo(today);
  }, []);

  /* ===== Totals ===== */
  const totalOrders = rows.length;

  const totalAmount = rows.reduce(
    (s, r) => s + Number(r.total_amount || 0),
    0
  );

  const totalRestaurant = rows.reduce(
    (s, r) => s + Number(r.restaurant_commission || 0),
    0
  );

  const totalCaptain = rows.reduce(
    (s, r) => s + Number(r.captain_commission || 0),
    0
  );

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">📊 تقرير العمولات</h1>

      {/* الفلاتر */}
      <div className="bg-white p-4 rounded shadow grid md:grid-cols-3 gap-4">

        <input
          type="date"
          className="border p-2 rounded"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <button
          onClick={loadData}
          className="bg-green-600 text-white rounded px-4"
        >
          عرض التقرير
        </button>

      </div>

      {/* الإحصائيات */}
      <div className="grid md:grid-cols-4 gap-4">

        <Stat title="عدد الطلبات" value={totalOrders} />

        <Stat
          title="إجمالي الطلبات"
          value={totalAmount.toLocaleString()}
        />

        <Stat
          title="عمولة المطاعم"
          value={totalRestaurant.toLocaleString()}
        />

        <Stat
          title="عمولة الكباتن"
          value={totalCaptain.toLocaleString()}
        />

      </div>

      {/* الجدول */}
      <div className="bg-white rounded shadow overflow-x-auto">

        <table className="w-full text-center">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">التاريخ</th>
              <th>الطلب</th>
              <th>الكابتن</th>
              <th>المطعم</th>
              <th>قيمة الطلب</th>
              <th>عمولة المطعم</th>
              <th>عمولة الكابتن</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">

                <td className="p-2">{r.order_date}</td>
                <td>{r.order_id}</td>
                <td>{r.captain_name || "-"}</td>
                <td>{r.restaurant_name || "-"}</td>

                <td>{r.total_amount}</td>

                <td className="text-green-700 font-bold">
                  {r.restaurant_commission || 0}
                </td>

                <td className="text-blue-700 font-bold">
                  {r.captain_commission || 0}
                </td>

              </tr>
            ))}
          </tbody>

        </table>

        {!rows.length && !loading && (
          <div className="p-6 text-center text-gray-500">
            لا توجد بيانات
          </div>
        )}

      </div>
    </div>
  );
};

/* ===== Card ===== */
const Stat = ({ title, value }: any) => (
  <div className="bg-white p-4 rounded shadow text-center">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);

export default CommissionReport;
