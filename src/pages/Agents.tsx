import React, { useEffect, useState } from "react";
import api, { API_ORIGIN } from "../services/api";
import { hasPermission } from "../utils/permissions";

interface Agent {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: number;
  branch_id?: number;
  branch_name?: string;
  image_url?: string;
}


interface Branch {
  id: number;
  name: string;
}

const Agents: React.FC = () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
      return url;
    }
    return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("اختر ملف صورة فقط");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", "agents");

    setUploadingImage(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ORIGIN}/api/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      const url = data.url || data.path;

      if (!res.ok || !data.success || !url) {
        alert(data.message || "فشل رفع الصورة");
        return;
      }

      setImageUrl(url);
    } catch {
      alert("خطأ في رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  };


  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState<number | "">("");

  const isHqUser =
    Number(user?.is_admin) === 1 ||
    Number(user?.is_admin_branch) === 1 ||
    user?.role === "admin";

  /* =========================
     Load
  ========================= */
  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await api.agents.getAgents();
      setAgents(res.agents || []);
    } catch (e) {
      console.error("Fetch agents error", e);
    } finally {
      setLoading(false);
    }
  };
useEffect(() => {
  fetchAgents();

  if (isHqUser) {
    api.get("/branches").then((res) => {
      setBranches(res.data?.list || []);
    });

    const selected = localStorage.getItem("branch_id");
    if (selected && selected !== "all") {
      setBranchId(Number(selected));
    } else if (user?.branch_id) {
      setBranchId(Number(user.branch_id));
    }
  } else if (user?.branch_id) {
    setBranchId(Number(user.branch_id));
  }
}, []);


  /* =========================
     Open Modals
  ========================= */
  const openAddModal = () => {
    setEditingAgent(null);
    resetForm();
    setIsModalOpen(true);
  };

const openEditModal = (agent: Agent) => {
  setEditingAgent(agent);
  setName(agent.name);
  setEmail(agent.email || "");
  setPhone(agent.phone || "");
  setAddress(agent.address || "");
  setBranchId(agent.branch_id || "");
  setPassword("");
  setImageUrl(agent.image_url || "");
  setIsModalOpen(true);
};


  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setPassword("");
    setBranchId("");
    setImageUrl("");

  };

  /* =========================
     Save
  ========================= */
  const saveAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      alert("❌ الاسم مطلوب");
      return;
    }

    const resolvedBranch =
      branchId ||
      user?.branch_id ||
      (localStorage.getItem("branch_id") !== "all"
        ? localStorage.getItem("branch_id")
        : "") ||
      "";

    if (!resolvedBranch) {
      alert("❌ اختر الفرع أولاً (من النموذج أو من أعلى الصفحة)");
      return;
    }

    const payload: any = {
      name,
      email,
      phone,
      address,
      branch_id: Number(resolvedBranch),
    };

    if (imageUrl) {
      payload.image_url = imageUrl;
    }

    if (!editingAgent && !password) {
      alert("❌ كلمة المرور مطلوبة عند الإضافة");
      return;
    }
    if (password) payload.password = password;

    try {
      if (editingAgent) {
        await api.agents.updateAgent(editingAgent.id, payload);
        alert("✅ تم تعديل الوكيل");
      } else {
        const res = await api.agents.addAgent(payload);
        alert(
          res?.password
            ? `✅ تم إضافة الوكيل\nكلمة المرور: ${res.password}`
            : "✅ تم إضافة الوكيل"
        );
      }

      setIsModalOpen(false);
      fetchAgents();
    } catch (err: any) {
      alert(err?.response?.data?.message || "❌ حدث خطأ");
    }
  };

const resetPassword = async (agentId: number) => {
  const res = await api.agents.resetPassword(agentId);
  alert(`كلمة المرور الجديدة: ${res.password}`);
};



  /* =========================
     Toggle Active
  ========================= */
  const toggleAgent = async (agent: Agent) => {
    const ok = window.confirm(
      agent.is_active
        ? "هل أنت متأكد من تعطيل الوكيل؟"
        : "هل تريد تفعيل الوكيل؟"
    );
    if (!ok) return;

    await api.agents.toggleAgent(agent.id, !agent.is_active);
    fetchAgents();
  };

  /* =========================
     Delete
  ========================= */
  const deleteAgent = async (id: number) => {
    if (!window.confirm("⚠️ هل تريد حذف الوكيل؟")) return;
    await api.agents.deleteAgent(id);
    fetchAgents();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الوكلاء</h1>

        {hasPermission(user, "agents", "add") && (
          <button
            onClick={openAddModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            إضافة وكيل
          </button>
        )}
      </div>

      {/* Table */}
<div className="bg-white rounded shadow overflow-hidden">
  {loading ? (
    <div className="p-6 text-center text-gray-500">جاري التحميل...</div>
  ) : agents.length === 0 ? (
    <div className="p-6 text-center text-gray-500">لا يوجد وكلاء</div>
  ) : (
    <table className="w-full text-right">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-3">#</th>
          <th className="px-4 py-3">الاسم</th>
          <th className="px-4 py-3">الجوال</th>

         {(isHqUser) && (
  <th className="px-4 py-3">الفرع</th>
)}

           <th className="px-4 py-3">الشعار</th>
          <th className="px-4 py-3">الحالة</th>
          <th className="px-4 py-3 text-center">إجراءات</th>
        </tr>
      </thead>

      <tbody className="divide-y">
        {agents.map((a, i) => (
          <tr key={a.id} className="hover:bg-gray-50">
            <td className="px-4 py-2">{i + 1}</td>
            <td className="px-4 py-2">{a.name}</td>
            <td className="px-4 py-2">{a.phone || "-"}</td>

{(isHqUser) && (
  <td className="px-4 py-2">
    {a.branch_name || "-"}
  </td>
)}

<td className="px-4 py-2">
  {a.image_url ? (
    <img
      src={resolveImageUrl(a.image_url)}
      className="w-10 h-10 rounded-full object-cover cursor-pointer"
      onClick={() => setPreviewImage(resolveImageUrl(a.image_url))}
      alt=""
    />
  ) : (
    "-"
  )}
</td>


            <td className="px-4 py-2">
              {a.is_active ? (
                <span className="text-green-600 font-semibold">مفعل</span>
              ) : (
                <span className="text-red-600 font-semibold">معطل</span>
              )}
            </td>


  <td className="px-4 py-2 flex justify-center gap-3 flex-wrap">
    {hasPermission(user, "agents", "edit") && (
      <button
        onClick={() => openEditModal(a)}
        className="text-blue-600"
      >
        تعديل
      </button>
    )}

    {hasPermission(user, "agents", "edit") && (
      <button
        onClick={() => toggleAgent(a)}
        className={a.is_active ? "text-yellow-600" : "text-green-600"}
      >
        {a.is_active ? "تعطيل" : "تفعيل"}
      </button>
    )}

    {hasPermission(user, "agents", "edit") && (
      <button
        onClick={() => resetPassword(a.id)}
        className="text-purple-600"
      >
        إعادة كلمة المرور
      </button>
    )}

    {hasPermission(user, "agents", "delete") && (
      <button
        onClick={() => deleteAgent(a.id)}
        className="text-red-600"
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


      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-xl space-y-4">
            <h2 className="text-xl font-bold">
              {editingAgent ? "تعديل وكيل" : "إضافة وكيل"}
            </h2>

         <form onSubmit={saveAgent} className="space-y-3">
  <input
    className="border p-2 rounded w-full"
    placeholder="اسم الوكيل"
    value={name}
    onChange={(e) => setName(e.target.value)}
    required
  />

  <input
    className="border p-2 rounded w-full"
    placeholder="البريد الإلكتروني"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />

  <input
    className="border p-2 rounded w-full"
    placeholder="رقم الجوال"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
  />

  {!editingAgent && (
    <input
      type="password"
      className="border p-2 rounded w-full"
      placeholder="كلمة المرور"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
    />
  )}

  {/* اختيار الفرع – يظهر لإدارة الفروع / الإدارة العامة */}
{isHqUser && (
  <select
  className="border p-2 rounded w-full"
  value={branchId}
  onChange={(e) => setBranchId(Number(e.target.value))}
>
  <option value="">اختر الفرع</option>

  {branches.map((b) => (
    <option key={b.id} value={b.id}>
      {b.name}
    </option>
  ))}
</select>

)}



  <input
    className="border p-2 rounded w-full"
    placeholder="العنوان"
    value={address}
    onChange={(e) => setAddress(e.target.value)}
  />
<div className="rounded border p-3 space-y-2">
  <label className="block font-bold text-sm text-gray-700">شعار الوكيل</label>

  <label
    className={`block cursor-pointer rounded bg-gray-100 px-3 py-2 text-center hover:bg-gray-200 ${
      uploadingImage ? "opacity-60 pointer-events-none" : ""
    }`}
  >
    {uploadingImage ? "جاري رفع الصورة..." : "رفع صورة من الملفات"}
    <input
      type="file"
      accept="image/*"
      className="hidden"
      disabled={uploadingImage}
      onChange={handleLogoUpload}
    />
  </label>

  {imageUrl && (
    <div className="flex items-center gap-3">
      <img
        src={resolveImageUrl(imageUrl)}
        alt="معاينة الشعار"
        className="w-20 h-20 object-cover rounded border"
      />
      <button
        type="button"
        onClick={() => setImageUrl("")}
        className="text-red-600 text-sm"
        disabled={uploadingImage}
      >
        إزالة
      </button>
    </div>
  )}
</div>

  <div className="flex justify-end gap-2 pt-2">
    <button
      type="submit"
      disabled={uploadingImage}
      className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
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
  
      {/* معاينة الشعار */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white p-4 rounded-lg max-w-3xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="معاينة"
              className="max-w-full max-h-[80vh] object-contain rounded"
            />

            <div className="text-center mt-3">
              <button
                onClick={() => setPreviewImage(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
