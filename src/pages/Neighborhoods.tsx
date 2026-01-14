import React, { useEffect, useState } from "react";
import api from "../services/api";

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

  const getHeaderBranch = () => {
    const saved = localStorage.getItem("branch_id");
    return saved ? Number(saved) : null;
  };

  const fetchNeighborhoods = async (query: string) => {
    try {
      setLoading(true);

      const headers: any = {};
      const headerBranch = getHeaderBranch();

      if (headerBranch) {
        headers["x-branch-id"] = headerBranch;
      }

      const res = await api.get("/neighborhoods", {
        params: { search: query },
        headers,
      });

      if (res?.data?.success) {
        setNeighborhoods(res.data.neighborhoods || []);
      } else {
        setNeighborhoods([]);
      }
    } catch (err) {
      console.error("خطأ جلب الأحياء:", err);
      setNeighborhoods([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!isAdminBranch) return;
    try {
      const res = await api.get("/branches");
      setBranches(res.data.branches || []);
    } catch (err) {
      console.error("خطأ جلب الفروع:", err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchNeighborhoods("");
  }, []);

  const openAdd = () => {
    setEditId(null);
    setName("");
    setFee(0);

    const headerBranch = getHeaderBranch();

    if (isAdminBranch) {
      setBranchId(headerBranch || 0);
    } else {
      setBranchId(user?.branch_id || 0);
    }

    setIsModalOpen(true);
  };

  const startEdit = (n: Neighborhood) => {
    setEditId(n.id);
    setName(n.name);
    setFee(n.delivery_fee);
    setBranchId(n.branch_id);
    setIsModalOpen(true);
  };

  const saveNeighborhood = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalBranchId = isAdminBranch
      ? branchId
      : user?.branch_id;

    if (!finalBranchId) {
      alert("يجب تحديد الفرع");
      return;
    }

    try {
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
      fetchNeighborhoods(search);
    } catch (err) {
      console.error("خطأ الحفظ:", err);
    }
  };

  const deleteNeighborhood = async (id: number) => {
    if (!window.confirm("هل تريد حذف الحي؟")) return;
    await api.delete(`/neighborhoods/${id}`);
    fetchNeighborhoods(search);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة الأحياء</h1>
        <button
          onClick={openAdd}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          إضافة حي
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchNeighborhoods(e.target.value);
        }}
        placeholder="اكتب اسم الحي..."
        className="border px-3 py-2 rounded w-full max-w-md"
      />

      {loading ? (
        <p>جاري التحميل...</p>
      ) : (
        <table className="w-full border">
          <thead className="bg-gray-200">
            <tr>
              <th>#</th>
              <th>اسم الحي</th>
              <th>سعر التوصيل</th>
              <th>الفرع</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {neighborhoods.map((n, i) => (
              <tr key={n.id}>
                <td>{i + 1}</td>
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
                <td colSpan={5} className="text-center py-4">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 rounded w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editId ? "تعديل حي" : "إضافة حي"}
            </h2>

            <form onSubmit={saveNeighborhood} className="space-y-3">
              {isAdminBranch && (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(Number(e.target.value))}
                  className="border p-2 w-full"
                >
                  <option value={0}>اختر الفرع</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              {!isAdminBranch && (
                <div className="border p-2 w-full bg-gray-50 text-gray-700">
                  {user?.branch_name}
                </div>
              )}

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border p-2 w-full"
                placeholder="اسم الحي"
                required
              />

              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="border p-2 w-full"
                placeholder="سعر التوصيل"
                required
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  حفظ
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
