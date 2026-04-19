import React, { useEffect, useState } from "react";
import api from "../services/api";
import { getRoleLabel, roleOptions } from "../config/permissions";
import { hasPermission, normalizeRole } from "../utils/permissions";

interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string | { name?: string };
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

  const isAdminBranch = Boolean(currentUser?.is_admin_branch);
  const canAddUsers = hasPermission(currentUser, "users", "add");
  const canEditUsers = hasPermission(currentUser, "users", "edit");
  const canDeleteUsers = hasPermission(currentUser, "users", "delete");

  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [role, setRole] = useState("employee");
  const [branchId, setBranchId] = useState<number | "">("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};

      if (isAdminBranch) {
        const selectedBranch = localStorage.getItem("branch_id");
        if (selectedBranch && selectedBranch !== "all") {
          headers["x-branch-id"] = selectedBranch;
        }
      }

      const res = await api.get("/users", { headers });
      setUsers(res.data.users || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!isAdminBranch) return;
    try {
      const res = await api.get("/branches");
      setBranches(res.data.branches || []);
    } catch (e) {
      console.error("فشل جلب الفروع", e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setName("");
    setIdentifier("");
    setPassword("");
    setConfirmPassword("");
    setImage(null);
    setRole("employee");
    setBranchId("");
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setIdentifier(user.email || user.phone || "");
    setRole(normalizeRole(user.role) || "employee");
    setBranchId(user.branch_id || "");
    setPassword("");
    setConfirmPassword("");
    setImage(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingUser && password !== confirmPassword) {
      alert("كلمتا المرور غير متطابقتين");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);

    if (identifier.includes("@")) {
      formData.append("email", identifier);
    } else {
      formData.append("phone", identifier);
    }

    formData.append("role", role);

    if (!editingUser && password) {
      formData.append("password", password);
    }

    if (image) formData.append("image", image);

    if (isAdminBranch && branchId) {
      formData.append("branch_id", String(branchId));
    }

    if (editingUser) {
      await (api as any).users.updateUser(editingUser.id, formData);
      alert("تم التعديل");
    } else {
      await (api as any).users.addUser(formData);
      alert("تمت الإضافة");
    }

    setIsModalOpen(false);
    fetchUsers();
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm("هل تريد حذف المستخدم؟")) return;
    await (api as any).users.deleteUser(id);
    fetchUsers();
  };

  const disableUser = async (id: number) => {
    if (!window.confirm("هل تريد تعطيل المستخدم؟")) return;
    await (api as any).users.disableUser(id);
    fetchUsers();
  };

  const resetUserPassword = async (id: number) => {
    if (!window.confirm("إنشاء كلمة مرور جديدة؟")) return;
    const res = await (api as any).users.resetPassword(id);
    if (res.success) {
      await navigator.clipboard.writeText(res.new_password);
      alert(`كلمة المرور الجديدة: ${res.new_password}\nتم نسخها`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        {canAddUsers && (
          <button
            onClick={openAddModal}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            إضافة مستخدم
          </button>
        )}
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
              {users.map((user, index) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{getRoleLabel(normalizeRole(user.role))}</td>
                  <td className="p-3">{user.branch_name || "-"}</td>
                  <td className="p-3">
                    <span
                      className={
                        user.status === "active"
                          ? "text-green-600 font-semibold"
                          : "text-red-600 font-semibold"
                      }
                    >
                      {user.status === "active" ? "نشط" : "معطل"}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    {canEditUsers && (
                      <>
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-gray-600 hover:underline"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => resetUserPassword(user.id)}
                          className="text-purple-600 hover:underline"
                        >
                          كلمة المرور
                        </button>
                        <button
                          onClick={() => disableUser(user.id)}
                          className="text-blue-600 hover:underline"
                        >
                          تعطيل
                        </button>
                      </>
                    )}
                    {canDeleteUsers && (
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600 hover:underline"
                      >
                        حذف
                      </button>
                    )}
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
              <input
                className="border p-2 w-full"
                placeholder="الاسم"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              <input
                className="border p-2 w-full"
                placeholder="البريد أو رقم الجوال"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />

              {!editingUser && (
                <>
                  <input
                    type="password"
                    className="border p-2 w-full"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <input
                    type="password"
                    className="border p-2 w-full"
                    placeholder="تأكيد كلمة المرور"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </>
              )}

              <select
                className="border p-2 w-full"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {isAdminBranch && (
                <select
                  className="border p-2 w-full"
                  value={branchId}
                  onChange={(event) =>
                    setBranchId(event.target.value ? Number(event.target.value) : "")
                  }
                >
                  <option value="">اختر الفرع</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="file"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
              />

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
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
