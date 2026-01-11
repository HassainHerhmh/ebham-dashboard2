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
  const [searchCategory, setSearchCategory] = useState("");

  /* ================= FETCH ================= */

  const fetchProducts = async () => {
    const res = await api.get("/products");
    const data = res.data;
    if (Array.isArray(data)) setProducts(data);
    else if (Array.isArray(data.products)) setProducts(data.products);
    else setProducts([]);
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
    .filter((p) => p.name.toLowerCase().includes(searchName.toLowerCase()))
    .filter((p) =>
      p.restaurant_name?.toLowerCase().includes(searchRestaurant.toLowerCase())
    )
    .filter((p) =>
      searchCategory ? String(p.category_id) === searchCategory : true
    );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          placeholder="بحث بالاسم"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          placeholder="بحث بالمطعم"
          value={searchRestaurant}
          onChange={(e) => setSearchRestaurant(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <select
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">كل الفئات</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          إضافة منتج
        </button>
      </div>

      {/* الجدول */}
      <table className="w-full border">
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>السعر</th>
            <th>المطعم</th>
            <th>الفئة</th>
            <th>الوحدة</th>
            <th>خيارات</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((p, i) => (
            <tr key={p.id}>
              <td>{i + 1}</td>
              <td>{p.name}</td>
              <td>{p.price}</td>
              <td>{p.restaurant_name || "-"}</td>
              <td>{p.category_name || "-"}</td>
              <td>{p.unit_name || "-"}</td>
              <td className="flex gap-2">
                <button onClick={() => handleEdit(p)}>تعديل</button>
                <button onClick={() => handleDelete(p.id)}>حذف</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* النموذج */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border p-4 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className="border p-2 w-full" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر" className="border p-2 w-full" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" className="border p-2 w-full" />

          <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} className="border p-2 w-full">
            <option value="">اختر المطعم</option>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="border p-2 w-full">
            <option value="">اختر الفئة</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="border p-2 w-full">
            <option value="">اختر الوحدة</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} />

          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">حفظ</button>
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="bg-gray-400 px-4 py-2 rounded">إلغاء</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Products;
