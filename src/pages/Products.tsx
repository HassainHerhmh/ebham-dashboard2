import React, { useState, useEffect, FormEvent } from "react";
import api from "../services/api";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  notes?: string;
  category_ids?: string; // "1,2,3"
  categories?: string;   // "عشاء, فطور"
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

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [unitId, setUnitId] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // فلاتر
  const [searchName, setSearchName] = useState("");
  const [searchRestaurant, setSearchRestaurant] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  /* ================= FETCH ================= */

  const fetchProducts = async () => {
    const res = await api.get("/products");
    const data = res.data;
    setProducts(Array.isArray(data) ? data : data.products || []);
  };

  const fetchRestaurants = async () => {
    const res = await api.get("/restaurants");
    const data = res.data;
    setRestaurants(Array.isArray(data) ? data : data.restaurants || []);
  };

  const fetchCategories = async () => {
    const res = await api.get("/categories");
    const data = res.data;
    setCategories(Array.isArray(data) ? data : data.categories || []);
  };

  const fetchUnits = async () => {
    const res = await api.get("/units");
    const data = res.data;
    setUnits(Array.isArray(data) ? data : data.units || []);
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
    setCategoryIds([]);
    setUnitId("");
    setImage(null);
    setPreview(null);
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!categoryIds.length) return alert("❌ اختر فئة واحدة على الأقل");
    if (!restaurantId) return alert("❌ اختر المطعم");
    if (!unitId) return alert("❌ اختر الوحدة");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("notes", notes);
    formData.append("restaurant_id", restaurantId);
    formData.append("unit_id", unitId);
    formData.append("category_ids", JSON.stringify(categoryIds));

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
    setUnitId(p.unit_id?.toString() || "");

    const ids = p.category_ids
      ? String(p.category_ids).split(",").map((x) => x.trim())
      : [];
    setCategoryIds(ids);

    setPreview(p.image_url || null);
    setShowForm(true);
  };

  /* ================= FILTER ================= */

  const filteredProducts = products.filter((p) => {
    const matchName = p.name
      .toLowerCase()
      .includes(searchName.toLowerCase());

    const matchRestaurant = (p.restaurant_name || "")
      .toLowerCase()
      .includes(searchRestaurant.toLowerCase());

    const productCats = String(p.category_ids || p.categories || "")
      .split(",")
      .map((x) => x.trim());

    const matchCategory =
      !selectedCategory || productCats.includes(String(selectedCategory));

    return matchName && matchRestaurant && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          إضافة منتج
        </button>
      </div>

      {/* فلاتر */}
      <div className="flex gap-3">
        <input
          placeholder="بحث بالاسم"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="border rounded px-3 py-2 w-1/3"
        />
        <input
          placeholder="بحث بالمطعم"
          value={searchRestaurant}
          onChange={(e) => setSearchRestaurant(e.target.value)}
          className="border rounded px-3 py-2 w-1/3"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-3 py-2 w-1/3"
        >
          <option value="">كل الفئات</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full text-center border">
        <thead className="bg-gray-50">
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>الفئات</th>
            <th>المطعم</th>
            <th>الوحدة</th>
            <th>السعر</th>
            <th>خيارات</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((p, i) => (
            <tr key={p.id} className="border-t">
              <td>{i + 1}</td>
              <td>{p.name}</td>
              <td>{p.categories || "-"}</td>
              <td>{p.restaurant_name || "-"}</td>
              <td>{p.unit_name || "-"}</td>
              <td>{p.price}</td>
              <td className="flex gap-2 justify-center">
                <button onClick={() => handleEdit(p)} className="text-blue-600">
                  تعديل
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-600">
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* مودال الإضافة / التعديل */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded w-full max-w-md space-y-3"
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className="border w-full px-3 py-2" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر" className="border w-full px-3 py-2" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" className="border w-full px-3 py-2" />

            <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} className="border w-full px-3 py-2">
              <option value="">اختر المطعم</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

           <div className="border p-3 rounded-lg max-h-40 overflow-y-auto">
  <h4 className="font-semibold mb-2">الفئات</h4>
  {categories.map((c) => (
    <label
      key={c.id}
      className="flex items-center gap-2 mb-1 cursor-pointer"
    >
      <input
        type="checkbox"
        checked={categoryIds.includes(String(c.id))}
        onChange={() => {
          const id = String(c.id);
          setCategoryIds((prev) =>
            prev.includes(id)
              ? prev.filter((x) => x !== id)
              : [...prev, id]
          );
        }}
      />
      <span>{c.name}</span>
    </label>
  ))}
</div>


            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="border w-full px-3 py-2">
              <option value="">اختر الوحدة</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} />

            <div className="flex gap-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded w-full">حفظ</button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="bg-gray-400 text-white px-4 py-2 rounded w-full">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Products;
