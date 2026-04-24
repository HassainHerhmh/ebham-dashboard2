import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Eye, Pencil, Upload, X } from "lucide-react";
import api, { API_ORIGIN } from "../services/api";
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeImageMenuUserId, setActiveImageMenuUserId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [role, setRole] = useState("employee");
  const [branchId, setBranchId] = useState<number | "">("");

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const syncCurrentUserSession = (updatedUser: User) => {
    if (!currentUser || Number(currentUser.id) !== Number(updatedUser.id)) return;

    const nextUser = {
      ...currentUser,
      name: updatedUser.name ?? currentUser.name,
      phone: updatedUser.phone ?? currentUser.phone,
      email: updatedUser.email ?? currentUser.email,
      role: updatedUser.role ?? currentUser.role,
      branch_id: updatedUser.branch_id ?? currentUser.branch_id,
      branch_name: updatedUser.branch_name ?? currentUser.branch_name,
      image_url: updatedUser.image_url ?? currentUser.image_url ?? null,
    };

    localStorage.setItem("user", JSON.stringify(nextUser));
    window.dispatchEvent(new Event("user-session-updated"));
  };

  const resolveImageUrl = (value?: string) => {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
  };

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
      const nextUsers = res.data.users || [];
      setUsers(nextUsers);

      const latestCurrentUser = nextUsers.find(
        (item: User) => Number(item.id) === Number(currentUser?.id)
      );

      if (latestCurrentUser) {
        syncCurrentUserSession(latestCurrentUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!isAdminBranch) return;
    try {
      const res = await api.get("/branches");
      setBranches(res.data.branches || []);
    } catch (error) {
      console.error("فشل جلب الفروع", error);
    }
  };

  useEffect(() => {
    void fetchUsers();
    void fetchBranches();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveImageMenuUserId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
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
    await fetchUsers();
  };

  const handleImageChange = async (user: User, file: File | null) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("name", user.name);

    if (user.email) {
      formData.append("email", user.email);
    }

    if (user.phone) {
      formData.append("phone", user.phone);
    }

    formData.append("role", normalizeRole(user.role) || "employee");

    if (user.branch_id) {
      formData.append("branch_id", String(user.branch_id));
    }

    formData.append("image", file);

    await (api as any).users.updateUser(user.id, formData);
    setActiveImageMenuUserId(null);
    await fetchUsers();
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm("هل تريد حذف المستخدم؟")) return;
    await (api as any).users.deleteUser(id);
    await fetchUsers();
  };

  const disableUser = async (id: number) => {
    if (!window.confirm("هل تريد تعطيل المستخدم؟")) return;
    await (api as any).users.disableUser(id);
    await fetchUsers();
  };

  const resetUserPassword = async (id: number) => {
    if (!window.confirm("إنشاء كلمة مرور جديدة؟")) return;
    const res = await (api as any).users.resetPassword(id);
    if (res.success) {
      await navigator.clipboard.writeText(res.new_password);
      alert(`كلمة المرور الجديدة: ${res.new_password}\nتم نسخها`);
    }
  };

  const avatarFallback = (user: User) =>
    String(user.name || "?")
      .trim()
      .charAt(0)
      .toUpperCase() || "?";

  const sortedUsers = useMemo(() => users, [users]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        {canAddUsers && (
          <button
            onClick={openAddModal}
            className="rounded-lg bg-green-600 px-4 py-2 text-white"
          >
            إضافة مستخدم
          </button>
        )}
      </div>

      <div className="overflow-visible rounded-xl bg-white shadow dark:bg-slate-900">
        {loading ? (
          <div className="p-6 text-center">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-right">
            <thead className="bg-gray-100 dark:bg-slate-800">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">الصورة</th>
                <th className="p-3">الاسم</th>
                <th className="p-3">الدور</th>
                <th className="p-3">الفرع</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user, index) => {
                const imageUrl = resolveImageUrl(user.image_url);
                const isMenuOpen = activeImageMenuUserId === user.id;

                return (
                  <tr key={user.id} className="border-t dark:border-slate-800">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveImageMenuUserId((prev) => (prev === user.id ? null : user.id));
                          }}
                          className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {imageUrl ? (
                            <img src={imageUrl} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{avatarFallback(user)}</span>
                          )}
                          <span className="absolute inset-0 hidden items-center justify-center bg-black/45 text-white group-hover:flex">
                            <Camera size={16} />
                          </span>
                        </button>

                        <input
                          ref={(element) => {
                            fileInputRefs.current[user.id] = element;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) =>
                            void handleImageChange(user, event.target.files?.[0] || null)
                          }
                        />

                        {isMenuOpen && (
                          <div
                            className="absolute right-full top-1/2 z-20 mr-3 w-40 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveImageMenuUserId(null);
                                if (imageUrl) setPreviewImage(imageUrl);
                              }}
                              disabled={!imageUrl}
                              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100 dark:hover:bg-slate-800"
                            >
                              <Eye size={16} />
                              <span>معاينة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveImageMenuUserId(null);
                                fileInputRefs.current[user.id]?.click();
                              }}
                              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                            >
                              <Upload size={16} />
                              <span>تغيير الصورة</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-semibold">{user.name}</td>
                    <td className="p-3">{getRoleLabel(normalizeRole(user.role))}</td>
                    <td className="p-3">{user.branch_name || "-"}</td>
                    <td className="p-3">
                      <span
                        className={
                          user.status === "active"
                            ? "font-semibold text-green-600"
                            : "font-semibold text-red-600"
                        }
                      >
                        {user.status === "active" ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {canEditUsers && (
                          <>
                            <button
                              onClick={() => openEditModal(user)}
                              className="inline-flex items-center gap-1 text-gray-600 hover:underline dark:text-slate-300"
                            >
                              <Pencil size={14} />
                              <span>تعديل</span>
                            </button>
                            <button
                              onClick={() => void resetUserPassword(user.id)}
                              className="text-purple-600 hover:underline"
                            >
                              كلمة المرور
                            </button>
                            <button
                              onClick={() => void disableUser(user.id)}
                              className="text-blue-600 hover:underline"
                            >
                              تعطيل
                            </button>
                          </>
                        )}
                        {canDeleteUsers && (
                          <button
                            onClick={() => void deleteUser(user.id)}
                            className="text-red-600 hover:underline"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-white p-3 shadow-2xl dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="معاينة صورة المستخدم"
              className="max-h-[82vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold">
              {editingUser ? "تعديل مستخدم" : "إضافة مستخدم"}
            </h2>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <input
                className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800"
                placeholder="الاسم"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              <input
                className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800"
                placeholder="البريد أو رقم الجوال"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />

              {!editingUser && (
                <>
                  <input
                    type="password"
                    className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <input
                    type="password"
                    className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="تأكيد كلمة المرور"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </>
              )}

              <select
                className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800"
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
                  className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800"
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
                accept="image/*"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
              />

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="rounded bg-green-600 px-4 py-2 text-white"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded bg-gray-400 px-4 py-2 text-white"
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
