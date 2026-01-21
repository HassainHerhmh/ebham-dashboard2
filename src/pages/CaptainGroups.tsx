import React, { useEffect, useState } from "react";
import api from "../services/api";


interface Group {
  id: number;
  name: string;
  code: number;
}

const CaptainGroups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    const data = await api.captainGroups.getGroups();
    setGroups(data);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleAdd = async () => {
    if (!name || !code) {
      alert("اكمل البيانات");
      return;
    }

    setLoading(true);
    await api.captainGroups.addGroup({
      name,
      code: Number(code),
    });

    setName("");
    setCode("");
    setLoading(false);
    loadGroups();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("تأكيد الحذف؟")) return;
    await api.captainGroups.deleteGroup(id);
    loadGroups();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مجموعات الكباتن</h1>

      {/* إضافة مجموعة */}
      <div className="bg-white p-4 rounded shadow grid grid-cols-3 gap-3">
        <input
          className="border p-2 rounded"
          placeholder="اسم المجموعة"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border p-2 rounded"
          placeholder="الكود"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button
          onClick={handleAdd}
          disabled={loading}
          className="bg-green-600 text-white rounded px-4"
        >
          إضافة
        </button>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">الكود</th>
              <th className="p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-3">{g.id}</td>
                <td className="p-3">{g.name}</td>
                <td className="p-3">{g.code}</td>
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-red-600"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}

            {groups.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  لا توجد مجموعات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CaptainGroups;
