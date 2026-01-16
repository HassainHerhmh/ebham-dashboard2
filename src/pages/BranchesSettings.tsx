import React, { useState, useEffect } from "react";
import api from "../services/api";

interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;

  today_from?: string;
  today_to?: string;
  today_closed?: boolean;
}

interface UserInfo {
  branch_id: number;
  is_admin_branch: boolean;
}

const BranchesSettings: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [timeBranchId, setTimeBranchId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }

      const res = await api.get("/branches");
      setBranches(res.data.branches || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleSave = async () => {
    if (!name.trim()) return alert("أدخل اسم الفرع");

    const data = { name, address, phone };

    try {
      if (editMode && selectedBranchId) {
        await api.put(`/branches/${selectedBranchId}`, data);
      } else {
        const res = await api.post("/branches", data);
        const newId = res.data.id;
        setIsModalOpen(false);

        if (user?.is_admin_branch && newId) {
          setTimeBranchId(newId);
          setIsTimeModalOpen(true);
        }
      }

      fetchData();
      setIsModalOpen(false);
    } catch {
      alert("حدث خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد؟")) return;
    await api.delete(`/branches/${id}`);
    fetchData();
  };

  const openTimeModal = (id: number) => {
    setTimeBranchId(id);
    setIsTimeModalOpen(true);
  };

  return (
    <div className="p-4" style={{ direction: "rtl" }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">📍 الفروع</h2>

        {user?.is_admin_branch && (
          <button
            onClick={openAddModal}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            ➕ إضافة فرع
          </button>
        )}
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">الاسم</th>
            <th className="border p-2">العنوان</th>
            <th className="border p-2">الهاتف</th>
            <th className="border p-2">الوقت / الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id}>
              <td className="border p-2">{b.name}</td>
              <td className="border p-2">{b.address || "-"}</td>
              <td className="border p-2">{b.phone || "-"}</td>

              <td className="border p-2 text-center">
                {/* مربع الوقت الأزرق */}
                <div
                  onClick={() => openTimeModal(b.id)}
                  className="cursor-pointer bg-blue-500 text-white rounded px-3 py-2 text-sm hover:bg-blue-600 transition mb-2"
                >
                  {b.today_closed ? (
                    <span>🚫 مغلق اليوم</span>
                  ) : b.today_from && b.today_to ? (
                    <span>
                      🕒 {b.today_from} – {b.today_to}
                    </span>
                  ) : (
                    <span>⏰ غير محدد</span>
                  )}
                </div>

                {/* أزرار الإدارة العامة فقط */}
                {user?.is_admin_branch && (
                  <div className="space-x-1 space-x-reverse">
                    <button
                      onClick={() => openEditModal(b)}
                      className="bg-green-500 text-white px-2 py-1 rounded"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      حذف
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal الإضافة والتعديل */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="font-bold mb-3">
              {editMode ? "تعديل فرع" : "إضافة فرع"}
            </h3>

            <input
              className="border p-2 w-full mb-2"
              placeholder="اسم الفرع"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="border p-2 w-full mb-2"
              placeholder="العنوان"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <input
              className="border p-2 w-full mb-3"
              placeholder="الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)}>إلغاء</button>
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-4 py-1 rounded"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودل الوقت */}
      {isTimeModalOpen && timeBranchId && (
        <YourWorkTimeModal
          branchId={timeBranchId}
          onClose={() => setIsTimeModalOpen(false)}
        />
      )}
    </div>
  );
};

export default BranchesSettings;
