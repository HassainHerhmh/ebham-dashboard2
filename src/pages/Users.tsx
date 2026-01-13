import React, { useEffect, useState } from "react";
import api from "../services/api";

interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  image_url?: string;
  branch_id?: number | null;
  branch_name?: string | null;
}

interface Branch {
  id: number;
  name: string;
}

const Users: React.FC = () => {
  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdminBranch = !!currentUser?.branch_is_admin;

  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [role, setRole] = useState("admin");
  const [branchId, setBranchId] = useState<number | "">("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!isAdminBranch) return;
    const res = await api.branches.getAll();
    setBranches(res || []);
  };

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setImage(null);
    setRole("admin");
    setBranchId("");
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.email || u.phone || "");
    setRole(u.role);
    setBranchId(u.branch_id || "");
    setPassword("");
    setConfirmPassword("");
    setImage(null);
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
    formData.append("role", role);

    if (password) formData.append("password", password);
    if (image) formData.append("image", image);

    if (isAdminBranch) {
      formData.append("branch_id", branchId ? String(branchId) : "");
    }

    if (editingUser) {
      await api.users.updateUser(editingUser.id, formData);
      alert("✔ تم التعديل");
    } else {
      await api.users.addUser(formData);
      alert("✔ تم الإضافة");
    }

    setIsModalOpen(false);
    fetchUsers();
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm("هل تريد حذف المستخدم؟")) return;
    await api.users.deleteUser(id);
    fetchUsers();
  };

  const disableUser = async (id: number) => {
    if (!window.confirm("هل تريد تعطيل المستخدم؟")) return;
    await api.users.disableUser(id);
    fetchUsers();
  };

  const resetUserPassword = async (id: number) => {
    if (!window.confirm("إنشاء كلمة مرور جديدة؟")) return;
    const res = await api.users.resetPassword(id);
    if (res.success) {
      navigator.clipboard.writeText(res.new_password);
      alert(`كلمة المرور الجديدة: ${res.new_password}\nتم نسخها`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <button
          onClick={openAddModal}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          إضافة مستخدم
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">جاري التحميل...</div>
        ) : (
          <table className="w-full text-right">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">الاسم</th>
                <th className="p-3">الدور</th>
                <th className="p-3">الفرع</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{u.branch_name || "-"}</td>
                  <td className="p-3">
                    {u.status === "active" ? "نشط" : "معطل"}
                  </td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => openEditModal(u)}>تعديل</button>
                    <button onClick={() => resetUserPassword(u.id)}>كلمة مرور</button>
                    <button onClick={() => disableUser(u.id)}>تعطيل</button>
                    <button onClick={() => deleteUser(u.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? "تعديل مستخدم" : "إضافة مستخدم"}
            </h2>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <input className="border p-2 w-full" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
              <input className="border p-2 w-full" placeholder="البريد أو الجوال" value={username} onChange={(e) => setUsername(e.target.value)} required />

              {!editingUser && (
                <>
                  <input type="password" className="border p-2 w-full" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <input type="password" className="border p-2 w-full" placeholder="تأكيد كلمة المرور" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </>
              )}

              <select className="border p-2 w-full" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">أدمن</option>
                <option value="service">موظف خدمة</option>
                <option value="accountant">محاسب</option>
                <option value="marketer">مسوق</option>
                <option value="captain">كابتن</option>
                <option value="agent">وكيل</option>
              </select>

              {isAdminBranch && (
                <select className="border p-2 w-full" value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}

              <input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} />

              <div className="flex justify-end gap-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">حفظ</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-400 text-white px-4 py-2 rounded">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
