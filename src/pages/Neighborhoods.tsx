import React, { useEffect, useState } from "react";
import api from "../services/api";

/* =========================
   Interfaces
========================= */
interface Neighborhood {
  id: number;
  name: string;
  delivery_fee: number;
  branch_id: number;
  branch_name?: string;
}

interface Branch {
  id: number;
  name: string;
}

/* =========================
   Component
========================= */
const Neighborhoods: React.FC = () => {
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdminBranch = Boolean(user?.is_admin_branch);

  const [search, setSearch] = useState("");
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [fee, setFee] = useState<number>(0);
  const [branchId, setBranchId] = useState<number>(0);

  /* =========================
     Fetch Neighborhoods
  ========================= */
  const fetchNeighborhoods = async (query: string) => {
    try {
      setLoading(true);

      const headers: any = {};

      if (isAdminBranch) {
        const selected = localStorage.getItem("branch_id");
        if (selected && selected !== "all") {
          headers["x-branch-id"] = selected;
        }
      } else if (user?.branch_id) {
        headers["x-branch-id"] = user.branch_id;
      }

      const res = await api.get("/neighborhoods", {
        params: { search: query },
        headers,
      });

      if (res?.data?.success && Array.isArray(res.data.neighborhoods)) {
        setNeighborhoods(res.data.neighborhoods);
      } else {
        setNeighborhoods([]);
      }
    } catch (err) {
      console.error("❌ خطأ جلب الأحياء:", err);
      setNeighborhoods([]);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Fetch Branches (للإدارة العامة فقط)
  ========================= */
  const fetchBranches = async () => {
    if (!isAdminBranch) return;
    try {
      const res = await api.get("/branches");
      if (res?.data?.branches) {
        setBranches(res.data.branches);
      }
    } catch (err) {
      console.error("❌ خطأ جلب الفروع:", err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchNeighborhoods("");
  }, []);

  /* =========================
     Edit
  ========================= */
  const startEdit = (n: Neighborhood) => {
    setEditId(n.id);
    setName(n.name);
    setFee(n.delivery_fee);
    setBranchId(n.branch_id);
    setIsModalOpen(true);
  };

  /* =========================
     Save
  ========================= */
  const saveNeighborhood = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const finalBranchId = isAdminBranch
        ? branchId || Number(localStorage.getItem("branch_id"))
        : user.branch_id;

      if (!finalBranchId) {
        alert("يجب اختيار الفرع");
        return;
      }

      if (editId) {
        await api.put(`/neighborhoods/${editId}`, {
          branch_id: finalBranchId,
          name,
          delivery_fee: fee,
        });
      } else {
        await api.post("/neighborhoods", {
          branch_id: finalBranchId,
          name,
          delivery_fee: fee,
        });
      }

      setIsModalOpen(false);
      setEditId(null);
      setName("");
      setFee(0);
      setBranchId(0);

      fetchNeighborhoods(search);
    } catch (err) {
      console.error("❌ خطأ حفظ الحي:", err);
    }
  };

  /* =========================
     Delete
  ========================= */
  const deleteNeighborhood = async (id: number) => {
    if (!window.confirm("⚠️ هل أنت متأكد من حذف الحي؟")) return;

    try {
      await api.delete(`/neighborhoods/${id}`);
      fetchNeighborhoods(search);
    } catch (err) {
      console.error("❌ خطأ حذف الحي:", err);
    }
  };

  /* =========================
     Render
  ========================= */
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">إدارة الأحياء</h1>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={() => {
            setEditId(null);
            setName("");
            setFee(0);

            if (isAdminBranch) {
              const selected = localStorage.getItem("branch_id");
              setBranchId(selected ? Number(selected) : 0);
            } else {
              setBranchId(user?.branch_id || 0);
            }

            setIsModalOpen(true);
          }}
        >
          ➕ إضافة حي
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchNeighborhoods(e.target.value);
        }}
        placeholder="اكتب اسم الحي..."
        className="border px-3 py-2 rounded w-1/2 mb-4"
      />

      {loading ? (
        <p>جاري التحميل...</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th>#</th>
              <th>اسم الحي</th>
              <th>سعر التوصيل</th>
              <th>الفرع</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {neighborhoods.map((n, idx) => (
              <tr key={n.id} className="border-b">
                <td>{idx + 1}</td>
                <td>{n.name}</td>
                <td>{n.delivery_fee}</td>
                <td>{n.branch_name || "-"}</td>
                <td>
                  <button
                    onClick={() => startEdit(n)}
                    className="text-blue-600 mx-1"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => deleteNeighborhood(n.id)}
                    className="text-red-600 mx-1"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
            {!neighborhoods.length && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">
              {editId ? "تعديل الحي" : "إضافة حي جديد"}
            </h2>

            <form onSubmit={saveNeighborhood} className="space-y-4">
              {isAdminBranch && (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value={0}>-- اختر الفرع --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم الحي"
                className="w-full border rounded px-3 py-2"
                required
              />

              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                placeholder="سعر التوصيل"
                className="w-full border rounded px-3 py-2"
                required
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
                  className="bg-gray-300 px-4 py-2 rounded"
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

export default Neighborhoods;
