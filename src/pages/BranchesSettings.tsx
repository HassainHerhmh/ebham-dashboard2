import React, { useState, useEffect } from "react";
import api from "../services/api";

interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  created_at?: string;
}

const BranchesSettings: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  /* ===== Load ===== */
  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      setBranches(res.data.branches || []);
    } catch (err) {
      console.error("خطأ في جلب الفروع:", err);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  /* ===== Open Modals ===== */
  const openAddModal = () => {
    setEditMode(false);
    setSelectedBranchId(null);
    setName("");
    setAddress("");
    setPhone("");
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditMode(true);
    setSelectedBranchId(branch.id);
    setName(branch.name);
    setAddress(branch.address || "");
    setPhone(branch.phone || "");
    setIsModalOpen(true);
  };

  /* ===== Save ===== */
  const handleSave = async () => {
    if (!name.trim()) {
      alert("❌ يرجى إدخال اسم الفرع");
      return;
    }

    const branchData = { name, address, phone };

    try {
      if (editMode && selectedBranchId) {
        const res = await api.put(
          `/branches/${selectedBranchId}`,
          branchData
        );
        alert(res.data.message || "تم التعديل");
      } else {
        const res = await api.post("/branches", branchData);
        alert(res.data.message || "تمت الإضافة");
      }

      fetchBranches();
      setIsModalOpen(false);
    } catch (err) {
      console.error("خطأ:", err);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  /* ===== Delete ===== */
  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;

    try {
      const res = await api.delete(`/branches/${id}`);
      alert(res.data.message || "تم الحذف");
      fetchBranches();
    } catch (err) {
      console.error("خطأ في الحذف:", err);
      alert("فشل الحذف");
    }
  };

  return (
    <div className="p-4" style={{ direction: "rtl" }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">📍 إدارة الفروع</h2>
        <button
          onClick={openAddModal}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          ➕ إضافة فرع
        </button>
      </div>

      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">الاسم</th>
            <th className="border p-2">العنوان</th>
            <th className="border p-2">الهاتف</th>
            <th className="border p-2">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id}>
              <td className="border p-2">{branch.name}</td>
              <td className="border p-2">{branch.address || "-"}</td>
              <td className="border p-2">{branch.phone || "-"}</td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => openEditModal(branch)}
                  className="bg-green-500 text-white px-3 py-1 rounded mr-2 hover:bg-green-600"
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(branch.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  حذف
                </button>
              </td>
            </tr>
          ))}
          {branches.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500">
                لا توجد فروع
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">
              {editMode ? "✏️ تعديل الفرع" : "➕ إضافة فرع جديد"}
            </h3>

            <input
              type="text"
              placeholder="اسم الفرع"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 p-2 w-full mb-3"
            />

            <input
              type="text"
              placeholder="العنوان"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="border border-gray-300 p-2 w-full mb-3"
            />

            <input
              type="text"
              placeholder="الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border border-gray-300 p-2 w-full mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesSettings;
