import React, { useEffect, useState } from "react";
import api from "../services/api";

interface Unit {
  id: number;
  name: string;
  restaurant_id?: number | null;
  restaurant_name?: string | null;
}

interface Restaurant {
  id: number;
  name: string;
}

const Units: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUnits = units.filter((unit) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return (
      unit.name?.toLowerCase().includes(query) ||
      unit.restaurant_name?.toLowerCase().includes(query)
    );
  });

  const fetchUnits = async () => {
    try {
      const res = await api.get("/units");
      const data = res.data;
      setUnits(Array.isArray(data) ? data : data.units || []);
    } catch (err) {
      alert("فشل في جلب الوحدات");
      console.error(err);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const res = await api.get("/restaurants");
      const data = res.data;
      setRestaurants(Array.isArray(data) ? data : data.restaurants || []);
    } catch (err) {
      alert("فشل في جلب المتاجر");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchRestaurants();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setNameValue("");
    setRestaurantId("");
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!nameValue.trim()) {
      alert("يرجى إدخال اسم الوحدة");
      return;
    }

    if (!restaurantId) {
      alert("يرجى اختيار المتجر");
      return;
    }

    const payload = {
      name: nameValue.trim(),
      restaurant_id: Number(restaurantId),
    };

    try {
      if (editId) {
        await api.put(`/units/${editId}`, payload);
        alert("تم تعديل الوحدة");
      } else {
        await api.post("/units", payload);
        alert("تم إضافة الوحدة");
      }

      setShowModal(false);
      resetForm();
      fetchUnits();
    } catch (err: any) {
      alert(err?.response?.data?.message || "حدث خطأ أثناء الحفظ");
      console.error(err);
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditId(unit.id);
    setNameValue(unit.name || "");
    setRestaurantId(unit.restaurant_id ? String(unit.restaurant_id) : "");
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل تريد حذف هذه الوحدة؟")) return;

    try {
      await api.delete(`/units/${id}`);
      alert("تم حذف الوحدة");
      fetchUnits();
    } catch (err: any) {
      alert(err?.response?.data?.message || "حدث خطأ أثناء الحذف");
      console.error(err);
    }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">إدارة الوحدات</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالوحدة أو المتجر"
            className="border rounded-lg px-3 py-2 w-full sm:w-72"
          />
          <button
            onClick={openAddModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            إضافة وحدة جديدة
          </button>
        </div>
      </div>

      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">اسم الوحدة</th>
            <th className="border p-2">المتجر</th>
            <th className="border p-2">خيارات</th>
          </tr>
        </thead>
        <tbody>
          {filteredUnits.length ? (
            filteredUnits.map((unit, index) => (
              <tr key={unit.id}>
                <td className="border p-2">{index + 1}</td>
                <td className="border p-2">{unit.name}</td>
                <td className="border p-2">{unit.restaurant_name || "-"}</td>
                <td className="border p-2">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="border p-6 text-center text-gray-500">
                لا توجد نتائج
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {editId ? "تعديل الوحدة" : "إضافة وحدة جديدة"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-1">اسم الوحدة</label>
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder="مثال: حبة"
                  className="border rounded-lg px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">المتجر</label>
                <select
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full bg-white"
                >
                  <option value="">اختر المتجر</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Units;
