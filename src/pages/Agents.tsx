import React, { useEffect, useState } from "react";
import api from "../services/api";
import { hasPermission } from "../utils/permissions";

interface Agent {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: number;
}

interface Branch {
  id: number;
  name: string;
}

const Agents: React.FC = () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");

  const [loading, setLoading] = useState(true);

  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");

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

    // الإداري فقط يجلب كل الفروع
    if (user?.is_admin === 1) {
      (async () => {
        try {
          const res = await api.branches.getAll();
          setBranches(res.branches || []);
        } catch (e) {
          console.error("Fetch branches error", e);
        }
      })();
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
    setPassword("");
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setPassword("");
    setBranchId("");
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

    const payload: any = { name, email, phone, address };

    // تحديد الفرع
    if (user?.is_admin === 1) {
      if (!branchId) {
        alert("❌ اختر الفرع");
        return;
      }
      payload.branch_id = branchId;
    } else {
      payload.branch_id = user?.branch_id;
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
        await api.agents.addAgent(payload);
        alert("✅ تم إضافة الوكيل");
      }

      setIsModalOpen(false);
      fetchAgents();
    } catch {
      alert("❌ حدث خطأ");
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الوكلاء</h1>

        {hasPermission(user, "agents", "add") && (
          <button
            onClick={openAddModal}
            className="bg-green-600 text-white px-4 py-2 rounded"
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
                  <td className="px-4 py-2">
                    {a.is_active ? (
                      <span className="text-green-600 font-semibold">مفعل</span>
                    ) : (
                      <span className="text-red-600 font-semibold">معطل</span>
                    )}
                  </td>

                  <td className="px-4 py-2 flex justify-center gap-3">
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
                        className={
                          a.is_active ? "text-yellow-600" : "text-green-600"
                        }
                      >
                        {a.is_active ? "تعطيل" : "تفعيل"}
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
          <div className="bg-white w-full max-w-lg p-6 rounded-xl space-y-4 shadow-lg">
            <h2 className="text-xl font-bold border-b pb-2">
              {editingAgent ? "تعديل وكيل" : "إضافة وكيل"}
            </h2>

            <form onSubmit={saveAgent} className="grid grid-cols-2 gap-3">
              <input
                className="border p-2 rounded col-span-2"
                placeholder="اسم الوكيل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                className="border p-2 rounded"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="border p-2 rounded"
                placeholder="رقم الجوال"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                className="border p-2 rounded col-span-2"
                placeholder="العنوان"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              {user?.is_admin === 1 && (
                <select
                  className="border p-2 rounded col-span-2"
                  value={branchId}
                  onChange={(e) =>
                    e.target.value
                      ? setBranchId(Number(e.target.value))
                      : setBranchId("")
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

              {!editingAgent && (
                <input
                  type="password"
                  className="border p-2 rounded col-span-2"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}

              <div className="col-span-2 flex justify-end gap-2 pt-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-5 py-2 rounded"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-400 text-white px-5 py-2 rounded"
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

export default Agents;
