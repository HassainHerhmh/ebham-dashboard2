import React, { useState, useEffect, FormEvent } from "react";
import api from "../services/api";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  notes?: string;
  category_ids?: string;
  categories?: string;
  unit_id?: number;
  unit_name?: string;
  restaurant_id?: number;
  restaurant_name?: string;

  // 🆕 أضف هذه
  branch_name?: string;
  is_available?: boolean;
  is_parent?: boolean;
  children_count?: number;
}


interface Restaurant { id: number; name: string }
interface Category { id: number; name: string }
interface Unit { id: number; name: string }

const Products: React.FC = () => {
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdminBranch = Boolean(user?.is_admin_branch);

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

  const [searchName, setSearchName] = useState("");
  const [searchRestaurant, setSearchRestaurant] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
const [childrenModalOpen, setChildrenModalOpen] = useState(false);
const [parentProduct, setParentProduct] = useState<any>(null);
const [children, setChildren] = useState<any[]>([]);

  const [isAvailable, setIsAvailable] = useState(true);
const [isParent, setIsParent] = useState(false);
const [selectedChildren, setSelectedChildren] = useState<number[]>([]);


  /* ================= FETCH ================= */

  const buildHeaders = () => {
    const headers: any = {};
    const selected = localStorage.getItem("branch_id");

    if (isAdminBranch) {
      if (selected && selected !== "all") {
        headers["x-branch-id"] = selected;
      }
    } else if (user?.branch_id) {
      headers["x-branch-id"] = user.branch_id;
    }

    return headers;
  };

  const fetchProducts = async () => {
    const res = await api.get("/products", {
      headers: buildHeaders(),
    });
    const data = res.data;
    setProducts(Array.isArray(data) ? data : data.products || []);
  };

  const fetchRestaurants = async () => {
    const res = await api.get("/restaurants", {
      headers: buildHeaders(),
    });
    const data = res.data;
    setRestaurants(Array.isArray(data) ? data : data.restaurants || []);
  };

  const fetchCategories = async () => {
    const res = await api.get("/categories");
    const data = res.data;
    setCategories(Array.isArray(data) ? data : data.categories || []);
  };

  const openChildrenModal = async (parent: any) => {
  setParentProduct(parent);
  const res = await api.get(`/products/${parent.id}/children`);
  setChildren(res.data?.children || []);
  setChildrenModalOpen(true);
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

  // 👇 الاستماع لتغيير الفرع من الهيدر
  useEffect(() => {
    const handler = () => {
      fetchProducts();
      fetchRestaurants();
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
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
  setIsAvailable(true);
  setIsParent(false);
  setSelectedChildren([]);
};


  /* ================= SUBMIT ================= */
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  if (!categoryIds.length) return alert("❌ اختر فئة واحدة على الأقل");
  if (!restaurantId) return alert("❌ اختر المطعم");
  if (!unitId) return alert("❌ اختر الوحدة");

  // إذا المنتج ليس (أب) يجب إدخال سعر
  if (!isParent && !price) {
    return alert("❌ أدخل السعر أو اجعل المنتج (أب)");
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("price", isParent ? "" : price); // الأب بدون سعر
  formData.append("notes", notes || "");
  formData.append("restaurant_id", restaurantId);
  formData.append("unit_id", unitId);
  formData.append("category_ids", JSON.stringify(categoryIds));

  // الحقول الجديدة
  formData.append("is_available", isAvailable ? "1" : "0");
  formData.append("is_parent", isParent ? "1" : "0");
  formData.append("children", JSON.stringify(selectedChildren || []));

  if (image) formData.append("image", image);

  try {
    const res = editingId
      ? await api.put(`/products/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      : await api.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

    if (res.data?.success) {
      resetForm();
      setShowForm(false);
      fetchProducts();
    }
  } catch (err) {
    console.error(err);
    alert("❌ حدث خطأ أثناء الحفظ");
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
  setPrice(String(p.price || ""));
  setNotes(p.notes || "");
  setRestaurantId(p.restaurant_id?.toString() || "");
  setUnitId(p.unit_id?.toString() || "");

  const ids = p.category_ids
    ? String(p.category_ids).split(",").map((x) => x.trim())
    : [];
  setCategoryIds(ids);

  setIsAvailable(!!p.is_available);
  setIsParent(!!p.is_parent);
  setSelectedChildren([]); // سيتم جلبهم من السيرفر إذا كان أب

  setPreview(p.image_url || null);
  setShowForm(true);
};


  /* ================= FILTER ================= */

  const filteredProducts = products.filter((p) => {
    const matchName = p.name.toLowerCase().includes(searchName.toLowerCase());

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
    <th>الفرع</th>
    <th>الوحدة</th>
    <th>السعر</th>
    <th>الحالة</th>      {/* 🆕 */}
    <th>الأب</th>        {/* 🆕 */}
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
      <td>{p.branch_name || "-"}</td>
      <td>{p.unit_name || "-"}</td>
      <td>{p.is_parent ? "—" : p.price}</td>

      {/* الحالة */}
      <td>
        <span
          className={`px-2 py-1 rounded text-xs ${
            p.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {p.is_available ? "متوفر" : "غير متوفر"}
        </span>
      </td>

      {/* الأب */}
      <td>
        {p.is_parent && p.children_count > 0 ? (
          <button
            onClick={() => openChildrenModal(p)}
            className="text-indigo-600 underline text-sm"
          >
            عرض الأبناء ({p.children_count})
          </button>
        ) : (
          "—"
        )}
      </td>

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


{childrenModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded w-full max-w-4xl">
      <h3 className="text-lg font-bold mb-3">
        أبناء المنتج: {parentProduct?.name}
      </h3>

      <table className="w-full text-center border">
        <thead className="bg-gray-50">
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>السعر</th>
            <th>المطعم</th>
            <th>الفئة</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {children.map((c: any, i: number) => (
            <tr key={c.id} className="border-t">
              <td>{i + 1}</td>
              <td>{c.name}</td>
              <td>{c.price}</td>
              <td>{c.restaurant_name}</td>
              <td>{c.categories}</td>
              <td>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    c.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {c.is_available ? "متوفر" : "غير متوفر"}
                </span>
              </td>
              <td className="flex gap-2 justify-center">
                <button onClick={() => handleEdit(c)} className="text-blue-600">
                  تعديل
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-red-600">
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-right">
        <button
          onClick={() => setChildrenModalOpen(false)}
          className="bg-gray-400 text-white px-4 py-2 rounded"
        >
          إغلاق
        </button>
      </div>
    </div>
  </div>
)}

      
  {showForm && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded w-full max-w-md space-y-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="الاسم"
        className="border w-full px-3 py-2"
      />

      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="السعر"
        className="border w-full px-3 py-2"
        disabled={isParent}   // الأب بدون سعر
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="ملاحظات"
        className="border w-full px-3 py-2"
      />

      <select
        value={restaurantId}
        onChange={(e) => setRestaurantId(e.target.value)}
        className="border w-full px-3 py-2"
      >
        <option value="">اختر المطعم</option>
        {restaurants.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>

      {/* متوفر / غير متوفر */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsAvailable(true)}
          className={`px-3 py-1 rounded w-full ${
            isAvailable ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
        >
          متوفر
        </button>

        <button
          type="button"
          onClick={() => setIsAvailable(false)}
          className={`px-3 py-1 rounded w-full ${
            !isAvailable ? "bg-red-600 text-white" : "bg-gray-200"
          }`}
        >
          غير متوفر
        </button>
      </div>

      {/* هل المنتج أب */}
      <label className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={isParent}
          onChange={(e) => {
            setIsParent(e.target.checked);
            if (!e.target.checked) setSelectedChildren([]);
          }}
        />
        هذا المنتج أب
      </label>

      {/* اختيار الأبناء */}
      {isParent && (
        <div className="border p-3 rounded-lg max-h-40 overflow-y-auto">
          <h4 className="font-semibold mb-2">اختر المنتجات التابعة لهذا الأب</h4>
          {products.map((p: any) => (
            <label key={p.id} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={selectedChildren.includes(p.id)}
                onChange={() => {
                  setSelectedChildren((prev) =>
                    prev.includes(p.id)
                      ? prev.filter((x) => x !== p.id)
                      : [...prev, p.id]
                  );
                }}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      )}

      {/* الفئات */}
      <div className="border p-3 rounded-lg max-h-40 overflow-y-auto">
        <h4 className="font-semibold mb-2">الفئات</h4>
        {categories.map((c) => (
          <label key={c.id} className="flex items-center gap-2 mb-1 cursor-pointer">
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

      <select
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        className="border w-full px-3 py-2"
      >
        <option value="">اختر الوحدة</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} />

      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded w-full">
          حفظ
        </button>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(false);
          }}
          className="bg-gray-400 text-white px-4 py-2 rounded w-full"
        >
          إلغاء
        </button>
      </div>
    </form>
  </div>
)}

    </div>
  );
};

export default Products;
