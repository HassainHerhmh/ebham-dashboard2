import React, { useEffect, useState } from "react";
import api from "../services/api";

interface Unit {
  id: number;
  name: string;
  restaurant_id?: number | null;
  restaurant_ids?: number[];
  restaurant_name?: string | null;
  restaurant_names?: string | null;
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
  const [restaurantIds, setRestaurantIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUnits = units.filter((unit) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return (
      unit.name?.toLowerCase().includes(query) ||
      (unit.restaurant_names || unit.restaurant_name || "")
        .toLowerCase()
        .includes(query)
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
    setRestaurantIds([]);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const toggleRestaurant = (id: number) => {
    setRestaurantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!nameValue.trim()) {
      alert("يرجى إدخال اسم الوحدة");
      return;
    }

    if (!restaurantIds.length) {
      alert("يرجى اختيار متجر واحد على الأقل");
      return;
    }

    const payload = {
      name: nameValue.trim(),
      restaurant_ids: restaurantIds,
      restaurant_id: restaurantIds[0],
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
    const ids =
      Array.isArray(unit.restaurant_ids) && unit.restaurant_ids.length
        ? unit.restaurant_ids.map(Number)
        : unit.restaurant_id
          ? [Number(unit.restaurant_id)]
          : [];
    setRestaurantIds(ids);
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
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h2 className="text-xl font-bold">إدارة الوحدات</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالوحدة أو المتجر"
            className="w-full rounded-lg border px-3 py-2 sm:w-72"
          />
          <button
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            إضافة وحدة جديدة
          </button>
        </div>
      </div>

      <table className="w-full table-auto border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">اسم الوحدة</th>
            <th className="border p-2">المتاجر</th>
            <th className="border p-2">خيارات</th>
          </tr>
        </thead>
        <tbody>
          {filteredUnits.length ? (
            filteredUnits.map((unit, index) => (
              <tr key={unit.id}>
                <td className="border p-2">{index + 1}</td>
                <td className="border p-2">{unit.name}</td>
                <td className="border p-2">
                  {unit.restaurant_names || unit.restaurant_name || "-"}
                </td>
                <td className="border p-2">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="rounded bg-yellow-500 px-3 py-1 text-white"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="rounded bg-red-500 px-3 py-1 text-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
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
                <label className="mb-1 block">اسم الوحدة</label>
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder="مثال: حبة"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-bold">المتاجر (يمكن اختيار أكثر من واحد)</label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded border p-3">
                  {restaurants.map((restaurant) => (
                    <label
                      key={restaurant.id}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={restaurantIds.includes(restaurant.id)}
                        onChange={() => toggleRestaurant(restaurant.id)}
                      />
                      <span>{restaurant.name}</span>
                    </label>
                  ))}
                  {!restaurants.length && (
                    <div className="text-sm text-gray-500">لا توجد متاجر</div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-lg bg-gray-200 py-2 text-gray-800 hover:bg-gray-300"
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
