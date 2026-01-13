import React, { useEffect, useState } from "react";
import api from "../services/api";

interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  permissions?: any;
  status: string;
  image_url?: string;
  branch_id?: number | null;
}

interface Section {
  key: string;
  label: string;
}

interface Branch {
  id: number;
  name: string;
  is_admin?: number;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // بيانات الإدخال
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [role, setRole] = useState("section");
  const [branchId, setBranchId] = useState<number | "">("");

  // 🔥 الصلاحيات
  const [permissions, setPermissions] = useState<any>({});

  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdminBranch =
    currentUser?.branch?.is_admin === 1 ||
    currentUser?.is_admin === 1 ||
    currentUser?.role === "admin";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      if (!api.sections || !api.sections.getSections) {
        setSections([]);
        return;
      }
      const data = await api.sections.getSections();
      setSections(data || []);
    } catch {
      setSections([]);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      if (res.data?.success) {
        setBranches(res.data.branches || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchUsers();
    fetchSections();
    fetchBranches();
  }, []);

  const togglePermission = (sectionKey: string, action: string) => {
    setPermissions((prev: any) => {
      const updated = { ...prev };
      if (!updated[sectionKey]) updated[sectionKey] = {};
      updated[sectionKey][action] = !updated[sectionKey][action];
      return updated;
    });
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.email || user.phone || "");
    setRole(user.role);
    setPermissions(user.permissions || {});
    setBranchId(user.branch_id || "");
    setPassword("");
    setConfirmPassword("");
    setImage(null);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setImage(null);
    setRole("section");
    setPermissions({});
    setBranchId("");
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser && password !== confirmPassword) {
      alert("❌ كلمتا المرور غير متطابقتين");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", username);
    if (password) formData.append("password", password);
    if (image) formData.append("image", image);
    formData.append("role", role);
    formData.append("permissions", JSON.stringify(permissions));
    formData.append("branch_id", branchId ? String(branchId) : "");

    if (editingUser) {
      await api.users.updateUser(editingUser.id, formData);
    } else {
      await api.users.addUser(formData);
    }

    setIsModalOpen(false);
    fetchUsers();
  };

  const getDisplayName = (user: User) =>
    user.name || user.email || user.phone || "غير محدد";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <button
          onClick={openAddModal}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          إضافة مستخدم
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">جاري التحميل...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-gray-600">لا يوجد مستخدمون</div>
        ) : (
          <table className="w-full text-right">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">الدور</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u, index) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2">{getDisplayName(u)}</td>
                  <td className="px-4 py-2">
                    {u.role === "admin" ? "أدمن" : "صلاحيات"}
                  </td>
                  <td className="px-4 py-2">
                    {u.status === "active" ? (
                      <span className="text-green-600 font-semibold">نشط</span>
                    ) : (
                      <span className="text-red-600 font-semibold">معطل</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => openEditModal(u)}
                      className="text-blue-600 hover:underline"
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? "تعديل مستخدم" : "إضافة مستخدم"}
            </h2>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <input
                type="text"
                className="border p-2 rounded w-full"
                placeholder="الاسم الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                type="text"
                className="border p-2 rounded w-full"
                placeholder="البريد أو رقم الجوال"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              {!editingUser && (
                <>
                  <input
                    type="password"
                    className="border p-2 rounded w-full"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    className="border p-2 rounded w-full"
                    placeholder="تأكيد كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />

              <select
                className="border p-2 rounded w-full"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="admin">أدمن</option>
                <option value="section">صلاحيات محددة</option>
              </select>

              {isAdminBranch && (
                <select
                  className="border p-2 rounded w-full"
                  value={branchId}
                  onChange={(e) =>
                    setBranchId(e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
