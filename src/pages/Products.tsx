import React, { useState, useEffect, FormEvent } from "react";
import api, { API_ORIGIN } from "../services/api";
import EnglishFieldWithTranslate from "../components/EnglishFieldWithTranslate";

interface Product {
  id: number;
  name: string;
  name_en?: string | null;
  price: number;
  image_url?: string;
  notes?: string;
  notes_en?: string | null;
  category_ids?: string;
  categories?: string;
  unit_id?: number;
  unit_name?: string;
  restaurant_id?: number;
  restaurant_ids?: number[] | string;
  restaurant_name?: string;
  restaurant_names?: string;

  // 🆕 أضف هذه
  branch_name?: string;
  is_available?: boolean;
  is_parent?: boolean;
  children_count?: number;
}


interface Restaurant { id: number; name: string }
interface Category { id: number; name: string }
interface Unit { id: number; name: string }

const resolveImageUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${String(value).replace(/^\/+/, "")}`;
};

const ProductImage: React.FC<{ src?: string | null; alt: string; className?: string }> = ({
  src,
  alt,
  className = "w-16 h-16",
}) => {
  const imageSrc = resolveImageUrl(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [imageSrc]);

  return (
    <div className={`relative overflow-hidden rounded border bg-gray-100 ${className}`}>
      {!loaded && !failed && <div className="absolute inset-0 animate-pulse bg-gray-200" />}

      {!failed && imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
          className={`h-full w-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}

      {(failed || !imageSrc) && (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
          لا صورة
        </div>
      )}
    </div>
  );
};

const Products: React.FC = () => {
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdminBranch = Boolean(user?.is_admin_branch);

  const [products, setProducts] = useState<Product[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [notesEn, setNotesEn] = useState("");
  const [restaurantIds, setRestaurantIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [unitId, setUnitId] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [searchRestaurant, setSearchRestaurant] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
const [childrenModalOpen, setChildrenModalOpen] = useState(false);
const [parentProduct, setParentProduct] = useState<any>(null);
const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    try {
      const res = await api.get("/products", {
        headers: buildHeaders(),
      });
      const data = res.data;
      setProducts(Array.isArray(data) ? data : data.products || []);
    } finally {
      setLoading(false);
    }
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
    const list = Array.isArray(data) ? data : data.categories || [];
    setAllCategories(list);
    setCategories(list);
  };

  // عند اختيار المحلات: اعرض فقط الفئات المرتبطة بأي محل مختار
  useEffect(() => {
    let cancelled = false;

    const loadLinkedCategories = async () => {
      if (!restaurantIds.length) {
        setCategories(allCategories);
        return;
      }

      try {
        const results = await Promise.all(
          restaurantIds.map((id) => api.get(`/restaurants/${id}/categories`))
        );

        if (cancelled) return;

        const map = new Map<number, Category>();
        results.forEach((res) => {
          const list = res.data?.categories || [];
          list.forEach((c: Category) => {
            if (c?.id != null) map.set(Number(c.id), c);
          });
        });

        const linked = Array.from(map.values());
        setCategories(linked);

        const allowed = new Set(linked.map((c) => String(c.id)));
        setCategoryIds((prev) => prev.filter((id) => allowed.has(String(id))));
      } catch (err) {
        console.error(err);
        if (!cancelled) setCategories(allCategories);
      }
    };

    void loadLinkedCategories();
    return () => {
      cancelled = true;
    };
  }, [restaurantIds, allCategories]);

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
  setNameEn("");
  setPrice("");
  setNotes("");
  setNotesEn("");
  setRestaurantIds([]);
  setCategoryIds([]);
  setUnitId("");
  setImage(null);
  setPreview(null);
  setImageUrl("");
  setIsAvailable(true);
  setIsParent(false);
  setSelectedChildren([]);
};


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("اختر ملف صورة فقط");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setImage(file);
    setPreview(localPreview);
    setUploadingImage(true);

    try {
      const body = new FormData();
      body.append("image", file);
      body.append("folder", "products");

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ORIGIN}/api/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });

      const data = await res.json().catch(() => ({}));
      const url = data.url || data.path;

      if (!res.ok || !data.success || !url) {
        alert(data.message || "فشل رفع الصورة");
        setImage(null);
        setPreview(null);
        return;
      }

      setImageUrl(url);
      setPreview(url);
      setImage(null);
    } catch {
      alert("خطأ في رفع الصورة");
      setImage(null);
      setPreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  /* ================= SUBMIT ================= */
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  if (uploadingImage) {
    return alert("انتظر حتى ينتهي رفع الصورة");
  }

  if (!categoryIds.length) return alert("❌ اختر فئة واحدة على الأقل");
  if (!restaurantIds.length) return alert("❌ اختر مطعماً واحداً على الأقل");
  if (!unitId) return alert("❌ اختر الوحدة");

  // إذا المنتج ليس (أب) يجب إدخال سعر
  if (!isParent && !price) {
    return alert("❌ أدخل السعر أو اجعل المنتج (أب)");
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("name_en", nameEn || "");
  formData.append("price", isParent ? "" : price); // الأب بدون سعر
  formData.append("notes", notes || "");
  formData.append("notes_en", notesEn || "");
  formData.append("restaurant_id", restaurantIds[0]);
  formData.append("restaurant_ids", JSON.stringify(restaurantIds.map(Number)));
  formData.append("unit_id", unitId);
  formData.append("category_ids", JSON.stringify(categoryIds));

  // الحقول الجديدة
  formData.append("is_available", isAvailable ? "1" : "0");
  formData.append("is_parent", isParent ? "1" : "0");
  formData.append("children", JSON.stringify(selectedChildren || []));

  if (imageUrl) formData.append("image_url", imageUrl);
  if (image) formData.append("image", image);

  try {
    const res = editingId
      ? await api.put(`/products/${editingId}`, formData)
      : await api.post("/products", formData);

    if (res.data?.success) {
      resetForm();
      setShowForm(false);
      fetchProducts();
    } else {
      alert(res.data?.message || "❌ فشل الحفظ");
    }
  } catch (err: any) {
    console.error(err);
    alert(err?.response?.data?.message || "❌ حدث خطأ أثناء الحفظ");
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

 const handleEdit = async (p: Product) => {
  setEditingId(p.id);
  setName(p.name);
  setNameEn(p.name_en || "");
  setPrice(String(p.price || ""));
  setNotes(p.notes || "");
  setNotesEn(p.notes_en || "");
  setRestaurantIds(
    Array.isArray(p.restaurant_ids)
      ? p.restaurant_ids.map(String)
      : p.restaurant_ids
        ? String(p.restaurant_ids).split(",").map((x) => x.trim()).filter(Boolean)
        : p.restaurant_id
          ? [String(p.restaurant_id)]
          : []
  );
  setUnitId(p.unit_id?.toString() || "");
  setImageUrl(p.image_url || "");

  const ids = p.category_ids
    ? String(p.category_ids).split(",").map((x) => x.trim())
    : [];
  setCategoryIds(ids);

  setIsAvailable(!!p.is_available);
  setIsParent(!!p.is_parent);

  if (p.is_parent) {
    const res = await api.get(`/products/${p.id}/children`);
    const kids = res.data?.children || [];
    setSelectedChildren(kids.map((k: any) => k.id));
  } else {
    setSelectedChildren([]);
  }

  setPreview(p.image_url || null);
  setShowForm(true);
};


  /* ================= FILTER ================= */

  const filteredProducts = products.filter((p) => {
    const matchName = p.name.toLowerCase().includes(searchName.toLowerCase());

    const matchRestaurant = (
      p.restaurant_names ||
      p.restaurant_name ||
      ""
    )
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
    <th>English</th>
    <th>الفئات</th>
    <th>المطعم</th>
    <th>الفرع</th>
    <th>الوحدة</th>
    <th>السعر</th>
    <th>الحالة</th>      {/* 🆕 */}
    <th>الأب</th>        {/* 🆕 */}
    <th>الصورة</th>
    <th>خيارات</th>
     
  </tr>
</thead>

<tbody>
  {loading ? (
    <tr>
      <td colSpan={12} className="py-8 text-center text-gray-500">
        جاري تحميل المنتجات...
      </td>
    </tr>
  ) : filteredProducts.length === 0 ? (
    <tr>
      <td colSpan={12} className="py-8 text-center text-gray-500">
        لا توجد منتجات مطابقة
      </td>
    </tr>
  ) : filteredProducts.map((p, i) => (
    <tr key={p.id} className="border-t">
      <td>{i + 1}</td>
      <td>{p.name}</td>
      <td dir="ltr">{p.name_en || "-"}</td>
      <td>{p.categories || "-"}</td>
      <td>{p.restaurant_names || p.restaurant_name || "-"}</td>
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

      <td>
        <ProductImage src={p.image_url} alt={p.name} />
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
              <td>{c.restaurant_names || c.restaurant_name || "-"}</td>
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
  className="bg-white p-6 rounded w-full max-w-2xl grid grid-cols-2 gap-3"
>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="الاسم (عربي)"
        className="border w-full px-3 py-2"
      />

      <EnglishFieldWithTranslate
        arabicText={name}
        value={nameEn}
        onChange={setNameEn}
        placeholder="Name (English)"
        inputClassName="border w-full px-3 py-2"
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
        placeholder="ملاحظات (عربي)"
        className="border w-full px-3 py-2"
      />

      <EnglishFieldWithTranslate
        arabicText={notes}
        value={notesEn}
        onChange={setNotesEn}
        placeholder="Notes (English)"
        multiline
        inputClassName="border w-full px-3 py-2"
      />

      <div className="col-span-2 max-h-40 space-y-2 overflow-y-auto rounded border p-3">
        <div className="mb-1 text-sm font-bold">المطاعم (يمكن اختيار أكثر من واحد)</div>
        {restaurants.map((r) => {
          const id = String(r.id);
          return (
            <label key={r.id} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={restaurantIds.includes(id)}
                onChange={() => {
                  setRestaurantIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((x) => x !== id)
                      : [...prev, id]
                  );
                }}
              />
              <span>{r.name}</span>
            </label>
          );
        })}
      </div>

      {/* متوفر / غير متوفر */}
      <div className="flex gap-2 col-span-2">
  <button
    type="button"
    onClick={() => setIsAvailable(true)}
    className={`w-full px-3 py-2 rounded ${
      isAvailable ? "bg-green-600 text-white" : "bg-gray-200"
    }`}
  >
    متوفر
  </button>

  <button
    type="button"
    onClick={() => setIsAvailable(false)}
    className={`w-full px-3 py-2 rounded ${
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
        {!restaurantIds.length ? (
          <p className="text-sm text-gray-500">اختر المطاعم أولاً لعرض فئاتها</p>
        ) : !categories.length ? (
          <p className="text-sm text-amber-700">
            لا توجد فئات مرتبطة بالمطاعم المحددة — اربط الفئات من شاشة المطعم أولاً
          </p>
        ) : (
          categories.map((c) => {
            const id = String(c.id);

            return (
              <label key={c.id} className="mb-1 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(id)}
                  onChange={() => {
                    setCategoryIds((prev) => {
                      const clean = Array.from(new Set(prev.map(String)));

                      return clean.includes(id)
                        ? clean.filter((x) => x !== id)
                        : [...clean, id];
                    });
                  }}
                />
                <span>{c.name}</span>
              </label>
            );
          })
        )}
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

<div className="col-span-2 space-y-2 rounded border p-3">
  <label className="block text-sm font-bold text-gray-700">صورة المنتج</label>

  <label
    className={`block cursor-pointer rounded bg-gray-100 px-3 py-2 text-center hover:bg-gray-200 ${
      uploadingImage ? "pointer-events-none opacity-60" : ""
    }`}
  >
    {uploadingImage ? "جاري رفع الصورة..." : "رفع صورة من الملفات"}
    <input
      type="file"
      accept="image/*"
      className="hidden"
      disabled={uploadingImage}
      onChange={handleImageUpload}
    />
  </label>

  {(preview || imageUrl) && (
    <div className="flex items-center gap-3">
      <img
        src={resolveImageUrl(preview || imageUrl)}
        alt="معاينة"
        className="h-16 w-16 rounded border object-cover"
      />
      <button
        type="button"
        onClick={() => {
          setImage(null);
          setPreview(null);
          setImageUrl("");
        }}
        className="text-sm text-red-600"
        disabled={uploadingImage}
      >
        إزالة
      </button>
    </div>
  )}
</div>

      <div className="flex gap-2">
        <button
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          disabled={uploadingImage}
        >
          حفظ
        </button>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(false);
          }}
          className="w-full rounded bg-gray-400 px-4 py-2 text-white"
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
