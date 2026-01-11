import React, { useState, useEffect } from "react";
import { Store, Plus, X, Trash2, Edit3 } from "lucide-react";
import api from "../services/api";

interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone: string;
  image_url: string;
  categories?: string;
  category_ids?: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  schedule?: ScheduleItem[];
}

interface Category {
  id: number;
  name: string;
}

interface ScheduleItem {
  day: string;
  start?: string;
  end?: string;
  start_time?: string;
  end_time?: string;
  closed: boolean;
}

const API_URL = "http://localhost:5000";
const daysOfWeek = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];

const Restaurants: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [storeSchedule, setStoreSchedule] = useState<ScheduleItem[]>(
    daysOfWeek.map((day) => ({ day, start: "", end: "", closed: false }))
  );

  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    address: "",
    phone: "",
    image_url: "",
  });

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const fetchRestaurants = async () => {
    const res = await api.get(`/restaurants`);
    const data = res.data;
    setRestaurants(Array.isArray(data) ? data : data.restaurants || []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const res = await api.get(`/categories`);
    const data = res.data;
    setCategories(Array.isArray(data) ? data : data.categories || []);
  };

  useEffect(() => {
    fetchRestaurants();
    fetchCategories();
  }, []);

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const img = e.target.files?.[0];
    if (img) {
      setFile(img);
      setPreview(URL.createObjectURL(img));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", formData.name);
    data.append("address", formData.address);
    data.append("phone", formData.phone);
    data.append("category_ids", JSON.stringify(selectedCategories));
    data.append("schedule", JSON.stringify(storeSchedule));
    if (latitude) data.append("latitude", latitude);
    if (longitude) data.append("longitude", longitude);
    if (file) data.append("image", file);

    if (editMode) {
      await api.put(`/restaurants/${formData.id}`, data);
      alert("✅ تم تعديل المطعم");
    } else {
      await api.post(`/restaurants`, data);
      alert("✅ تم إضافة المطعم");
    }
    resetForm();
    fetchRestaurants();
  };

  const handleEdit = (r: Restaurant) => {
    setFormData({
      id: r.id,
      name: r.name,
      address: r.address,
      phone: r.phone,
      image_url: r.image_url || "",
    });

    const categoryIds = r.category_ids
      ? String(r.category_ids).split(",").map((id) => Number(id))
      : [];

    setSelectedCategories(categoryIds);
    setPreview(r.image_url ? `${API_URL}${r.image_url}` : null);
    setLatitude(r.latitude ? String(r.latitude) : "");
    setLongitude(r.longitude ? String(r.longitude) : "");
    setStoreSchedule(
      r.schedule
        ? r.schedule.map((s) => ({
            day: s.day,
            start: s.start_time || s.start || "",
            end: s.end_time || s.end || "",
            closed: s.closed,
          }))
        : daysOfWeek.map((day) => ({ day, start: "", end: "", closed: false }))
    );
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("تأكيد حذف المطعم؟")) return;
    await api.delete(`/restaurants/${id}`);
    fetchRestaurants();
  };

  const resetForm = () => {
    setFormData({ id: 0, name: "", address: "", phone: "", image_url: "" });
    setSelectedCategories([]);
    setLatitude("");
    setLongitude("");
    setStoreSchedule(daysOfWeek.map((day) => ({ day, start: "", end: "", closed: false })));
    setFile(null);
    setPreview(null);
    setEditMode(false);
    setShowModal(false);
  };

  // ======= السحب والترتيب =======
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;

    const updated = [...restaurants];
    const moved = updated.splice(dragIndex, 1)[0];
    updated.splice(dropIndex, 0, moved);

    setRestaurants(updated);
    setDragIndex(null);

    const order = updated.map((r, i) => ({
      id: r.id,
      sort_order: i + 1,
    }));

    try {
      await api.post("/restaurants/reorder", { order });
    } catch (e) {
      console.error("خطأ في حفظ الترتيب", e);
    }
  };
  // ===============================

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-7 h-7" /> المطاعم / المحلات
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> إضافة جديد
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">⏳ جاري التحميل...</div>
        ) : (
          <table className="w-full text-center">
            <thead className="bg-gray-50">
              <tr>
                <th></th>
                <th>#</th>
                <th>الاسم</th>
                <th>العنوان</th>
                <th>الهاتف</th>
                <th>الفئات</th>
                <th>الموقع</th>
                <th>الصورة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r, index) => (
                <tr
                  key={r.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  className="cursor-move"
                >
                  <td className="text-gray-400">⋮⋮</td>
                  <td>#{index + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.address}</td>
                  <td>{r.phone}</td>
                  <td>{r.categories || "-"}</td>
                  <td>
                    {r.latitude && r.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        عرض الموقع
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {r.image_url && (
                      <img
                        src={`${API_URL}${r.image_url}`}
                        alt={r.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </td>
                  <td className="flex gap-2 justify-center">
                    <button onClick={() => handleEdit(r)} className="text-blue-600">
                      <Edit3 />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-600">
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg overflow-y-auto max-h-screen">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">{editMode ? "تعديل" : "إضافة"}</h2>
              <button onClick={resetForm}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* نفس نموذجك السابق بدون تغيير */}
              {/* ... */}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Restaurants;
