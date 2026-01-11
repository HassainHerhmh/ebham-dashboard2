import React, { useState, useEffect, FormEvent } from "react";
import api from "../services/api";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  notes?: string;
  category_id?: number;
  category_name?: string;
  unit_id?: number;
  unit_name?: string;
  restaurant_id?: number;
  restaurant_name?: string;
}

interface Restaurant { id: number; name: string }
interface Category { id: number; name: string }
interface Unit { id: number; name: string }

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
const [searchCategory, setSearchCategory] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [searchRestaurant, setSearchRestaurant] = useState("");

  /* ================= FETCH ================= */

const fetchProducts = async () => {
  const res = await api.get("/products");
  setProducts(res.data);
};

const fetchRestaurants = async () => {
  const res = await api.get("/restaurants");
  setRestaurants(res.data);
};

const fetchCategories = async () => {
  const res = await api.get("/categories");
  setCategories(res.data);
};

const fetchUnits = async () => {
  const res = await api.get("/units");
  setUnits(res.data);
};


  useEffect(() => {
    fetchProducts();
    fetchRestaurants();
    fetchCategories();
    fetchUnits();
  }, []);

  /* ================= RESET ================= */

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPrice("");
    setNotes("");
    setRestaurantId("");
    setCategoryId("");
    setUnitId("");
    setImage(null);
    setPreview(null);
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!categoryId) return alert("❌ اختر الفئة");
    if (!restaurantId) return alert("❌ اختر المطعم");
    if (!unitId) return alert("❌ اختر الوحدة");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("notes", notes);
    formData.append("restaurant_id", restaurantId);
    formData.append("category_id", categoryId);
    formData.append("unit_id", unitId);

    if (image) formData.append("image", image);

    const res = editingId
      ? await api.put(`/products/${editingId}`, formData)
      : await api.post("/products", formData);

    if (res.data?.success) {
      alert(editingId ? "تم تعديل المنتج" : "تم إضافة المنتج");
      resetForm();
      setShowForm(false);
      fetchProducts();
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id: number) => {
    if (!window.confirm("⚠️ حذف المنتج؟")) return;
    const res = await api.delete(`/products/${id}`);
    if (res.data?.success) {
      alert("🗑️ تم حذف المنتج");
      fetchProducts();
    }
  };

  /* ================= EDIT ================= */

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(String(p.price));
    setNotes(p.notes || "");
    setRestaurantId(p.restaurant_id?.toString() || "");
    setCategoryId(p.category_id?.toString() || "");
    setUnitId(p.unit_id?.toString() || "");
    setPreview(p.image_url || null);
    setShowForm(true);
  };

  /* ================= FILTER ================= */

  const filteredProducts = products
    .filter((p) =>
      p.name.toLowerCase().includes(searchName.toLowerCase())
    )
    .filter((p) =>
      p.restaurant_name?.toLowerCase().includes(searchRestaurant.toLowerCase())
    );



  // ============== UI =================

  return (
    <div className="p-6" dir="rtl">

      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">📦 المنتجات</h2>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          ➕ إضافة منتج
        </button>
      </div>

      {/* البحث */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          className="border p-2 rounded"
          placeholder="🔍 بحث بالاسم"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />

        <input
          className="border p-2 rounded"
          placeholder="🍽 بحث بالمطعم"
          value={searchRestaurant}
          onChange={(e) => setSearchRestaurant(e.target.value)}
        />

        <select
          className="border p-2 rounded"
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
        >
          <option value="">🏷 كل الفئات</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* جدول المنتجات */}
      <table className="table-auto w-full border-collapse border border-gray-300 text-right">
        <thead className="bg-gray-100">
          <tr>
            <th>#</th>
            <th>📷</th>
            <th>الاسم</th>
            <th>السعر</th>
            <th>المطعم</th>
            <th>الفئات</th>
            <th>الوحدة</th>
            <th>خيارات</th>
          </tr>
        </thead>

        <tbody>
          {filteredProducts.map((p, i) => (
            <tr
              key={p.id}
              className="border-b border-gray-300 hover:bg-gray-50"
            >
              <td>{i + 1}</td>

              <td className="text-center">
                {p.image_url ? (
                  <img
                    src={`${API_URL}${p.image_url}`}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  "-"
                )}
              </td>

              <td>{p.name}</td>
              <td>{p.price} ريال</td>
              <td>{p.restaurant_name}</td>

              <td>
                {p.category_names
                  ? p.category_names.split(",").join("، ")
                  : "—"}
              </td>

              <td>{p.unit_name}</td>

              <td className="flex gap-2 justify-center">
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={() => handleEdit(p)}
                >
                  تعديل
                </button>

                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => handleDelete(p.id)}
                >
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* نموذج الإضافة/التعديل */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl">

            <h3 className="text-lg font-bold mb-4">
              {editingId ? "✏️ تعديل المنتج" : "➕ إضافة منتج جديد"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">

              <input
                className="border p-2 rounded w-full"
                placeholder="اسم المنتج"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                type="number"
                className="border p-2 rounded w-full"
                placeholder="السعر"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />

              <textarea
                className="border p-2 rounded w-full"
                placeholder="ملاحظات"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {/* المطعم */}
              <select
                className="border p-2 rounded w-full"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                required
              >
                <option value="">اختر المطعم</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              {/* ⭐ الفئات (Tags) */}
              <label className="font-bold">الفئات:</label>
              <div className="flex flex-wrap gap-2 border p-3 rounded bg-white">
                {categories.map((c) => {
                  const selected = categoryIds.includes(c.id.toString());
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (selected) {
                          setCategoryIds(categoryIds.filter((id) => id !== c.id.toString()));
                        } else {
                          setCategoryIds([...categoryIds, c.id.toString()]);
                        }
                      }}
                      className={
                        "px-3 py-1 rounded-full cursor-pointer border " +
                        (selected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300")
                      }
                    >
                      {c.name}
                    </div>
                  );
                })}
              </div>

              {/* الوحدة */}
              <select
                className="border p-2 rounded w-full"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                required
              >
                <option value="">اختر الوحدة</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>

              {/* الصورة */}
              <input
                type="file"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0] || null;
                  setImage(file);
                  if (file) setPreview(URL.createObjectURL(file));
                }}
              />

              {preview && (
                <img
                  src={preview}
                  className="w-24 h-24 object-cover rounded border"
                />
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded w-full"
                >
                  حفظ
                </button>

                <button
                  type="button"
                  className="bg-gray-400 text-white px-4 py-2 rounded w-full"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
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

export default Products;
