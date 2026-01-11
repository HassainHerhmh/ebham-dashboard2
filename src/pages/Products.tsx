import React, { useState, useEffect, FormEvent } from "react";
import api from "../services/api";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  notes?: string;
  category_ids?: string; // "1,2"
  category_names?: string;
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

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const [image, setImage] = useState<File | null>(null);

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

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPrice("");
    setNotes("");
    setRestaurantId("");
    setUnitId("");
    setCategoryIds([]);
    setImage(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!restaurantId) return alert("اختر المطعم");
    if (!unitId) return alert("اختر الوحدة");
    if (!categoryIds.length) return alert("اختر فئة واحدة على الأقل");

    const form = new FormData();
    form.append("name", name);
    form.append("price", price);
    form.append("notes", notes);
    form.append("restaurant_id", restaurantId);
    form.append("unit_id", unitId);
    form.append("category_ids", JSON.stringify(categoryIds));
    if (image) form.append("image", image);

    const res = editingId
      ? await api.put(`/products/${editingId}`, form)
      : await api.post("/products", form);

    if (res.data?.success) {
      resetForm();
      fetchProducts();
    }
  };

  const handleEdit = (p: Product) => {
    setShowForm(true);
    setTimeout(() => {
      setEditingId(p.id);
      setName(p.name);
      setPrice(String(p.price));
      setNotes(p.notes || "");
      setRestaurantId(p.restaurant_id?.toString() || "");
      setUnitId(p.unit_id?.toString() || "");
      setCategoryIds(p.category_ids ? p.category_ids.split(",") : []);
    }, 0);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("حذف المنتج؟")) return;
    const res = await api.delete(`/products/${id}`);
    if (res.data?.success) fetchProducts();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">المنتجات</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          إضافة منتج
        </button>
      </div>

      <table className="w-full border text-center">
        <thead className="bg-gray-100">
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
          {products.map((p, i) => (
            <tr key={p.id} className="border-t">
              <td>{i + 1}</td>
              <td>{p.name}</td>
              <td>{p.category_names || "-"}</td>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl w-full max-w-md space-y-3"
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج" className="border w-full px-3 py-2 rounded" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر" className="border w-full px-3 py-2 rounded" />

            <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} className="border w-full px-3 py-2 rounded">
              <option value="">اختر المطعم</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="border w-full px-3 py-2 rounded">
              <option value="">اختر الوحدة</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>

            <div className="border p-3 rounded max-h-40 overflow-y-auto">
              {categories.map(c => (
                <label key={c.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(String(c.id))}
                    onChange={() => {
                      const id = String(c.id);
                      setCategoryIds(prev =>
                        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                      );
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" className="border w-full px-3 py-2 rounded" />

            <input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} />

            <div className="flex gap-2">
              <button className="bg-blue-600 text-white py-2 rounded w-full">حفظ</button>
              <button type="button" onClick={resetForm} className="bg-gray-400 text-white py-2 rounded w-full">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Products;
