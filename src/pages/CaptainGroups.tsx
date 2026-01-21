import React, { useEffect, useState } from "react";
import api from "../services/api";

interface Group {
  id: number;
  name: string;
}

const CaptainGroups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadGroups = async () => {
    const data = await api.captainGroups.getGroups();
    setGroups(data);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleAdd = async () => {
    if (!name) {
      alert("اكتب اسم المجموعة");
      return;
    }

    setLoading(true);
    await api.captainGroups.addGroup({ name });
    setName("");
    setLoading(false);
    setShowModal(false);
    loadGroups();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("تأكيد الحذف؟")) return;
    await api.captainGroups.deleteGroup(id);
    loadGroups();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">مجموعات الكباتن</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded"
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
              <th className="p-3">اسم المجموعة</th>
              <th className="p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-3">{g.id}</td>
                <td className="p-3">{g.name}</td>
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
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  لا توجد مجموعات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* مودل الإضافة */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-[#e9efe6] rounded-xl w-[400px] p-6 space-y-4">
            <h2 className="text-xl font-bold text-right">
              إضافة مجموعة كباتن
            </h2>

            <input
              className="w-full p-3 rounded"
              placeholder="اسم المجموعة"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="flex justify-between items-center">
              <button
                onClick={handleAdd}
                disabled={loading}
                className="bg-green-700 text-white px-6 py-2 rounded"
              >
                إضافة
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="text-green-700"
              >
                إلغاء الأمر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainGroups;
