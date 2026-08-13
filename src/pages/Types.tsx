import React, { useEffect, useState } from "react";
  // رفع صورة للسيرفر مباشرة
  
import { Plus, GripVertical } from "lucide-react";
import api, { API_ORIGIN } from "../services/api";

const BASE_URL = API_ORIGIN;

interface TypeItem {
  id: number;
  name: string;

  image_url?: string | null;

  // الصورة الخضراء بدون اختيار
  image_outline_url?: string | null;

  // الصورة الملونة عند الاختيار
  image_color_url?: string | null;

  sort_order?: number;
  created_at?: string;
}

const Types: React.FC = () => {
  const [types, setTypes] = useState<TypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageOutlineUrl, setImageOutlineUrl] = useState("");
const [imageColorUrl, setImageColorUrl] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [image, setImage] = useState<File | null>(null);

const handleTypedImageUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  type: "outline" | "color"
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", "types");

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    const url = data.url || data.path;

    if (!res.ok || !data.success || !url) {
      alert(data.message || "فشل رفع الصورة");
      return;
    }

    if (type === "outline") {
      setImageOutlineUrl(url);
    } else {
      setImageColorUrl(url);
    }
  } catch (err) {
    alert("خطأ في رفع الصورة");
  }
};
  const fetchTypes = async () => {
    setLoading(true);
    try {
      const data = await (api as any).types.getTypes();
      if (data.success && Array.isArray(data.types)) {
        setTypes(data.types);
        setError(null);
      } else {
        setError("لا توجد أنواع");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const startEditType = (t: TypeItem) => {
    setEditId(t.id);
    setName(t.name);
    setSortOrder(t.sort_order || 0);
    setImage(null);
    setImageUrl(t.image_url || "");
    setIsModalOpen(true);
    setImageOutlineUrl(t.image_outline_url || "");
setImageColorUrl(t.image_color_url || "");
  };

  const persistTypeOrder = async (items: TypeItem[]) => {
    setIsReordering(true);
    try {
      await Promise.all(
        items.map((item, index) => {
          const formData = new FormData();
          formData.append("sort_order", String(index + 1));
          return (api as any).types.updateType(item.id, formData);
        })
      );
    } catch (err) {
      console.error(err);
      alert("فشل حفظ ترتيب الأنواع");
      fetchTypes();
    } finally {
      setIsReordering(false);
    }
  };

  const handleDropType = async (targetId: number) => {
    if (draggingId === null || draggingId === targetId || isReordering) {
      setDraggingId(null);
      return;
    }

    const current = [...types];
    const fromIndex = current.findIndex((item) => item.id === draggingId);
    const toIndex = current.findIndex((item) => item.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }

    const [movedItem] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, movedItem);

    const reordered = current.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));

    setTypes(reordered);
    setDraggingId(null);
    await persistTypeOrder(reordered);
  };

  const saveType = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("sort_order", String(sortOrder));
    if (image) formData.append("image", image);
    if (imageUrl) formData.append("image_url", imageUrl);
    if (imageOutlineUrl)
  formData.append("image_outline_url", imageOutlineUrl);

if (imageColorUrl)
  formData.append("image_color_url", imageColorUrl);

    try {
      const data = editId
        ? await (api as any).types.updateType(editId, formData)
        : await (api as any).types.addType(formData);

      if (data.success) {
        alert(data.message || "تم الحفظ");
        setIsModalOpen(false);
        setEditId(null);
        setName("");
        setSortOrder(0);
        setImage(null);
        setImageUrl("");
        fetchTypes();
      } else {
        alert(data.message || "فشل الحفظ");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteType = async (id: number) => {
    if (!window.confirm("هل تريد حذف هذا النوع؟")) return;
    try {
      const data = await (api as any).types.deleteType(id);
      if (data.success) {
        alert("تم الحذف");
        fetchTypes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resolveImageSrc = (url?: string | null) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          الأنواع
        </h1>
        <button
          onClick={() => {
            setEditId(null);
            setName("");
            setSortOrder(0);
            setImage(null);
            setImageUrl("");
            setImageOutlineUrl("");
            setImageColorUrl("");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white"
        >
          <Plus className="h-4 w-4" />
          إضافة نوع جديد
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-lg">
        {loading ? (
          <div className="p-6 text-center">جارٍ التحميل...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : types.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">اسم النوع</th>
                <th className="p-3">بدون لون</th>
                <th className="p-3">ملونة</th>
                <th className="p-3">الترتيب</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => {
                const outlineSrc = resolveImageSrc(t.image_outline_url);
                const colorSrc = resolveImageSrc(t.image_color_url);

                return (
                <tr
                  key={t.id}
                  draggable={!isReordering}
                  onDragStart={() => setDraggingId(t.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropType(t.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={`${draggingId === t.id ? "bg-blue-50" : ""} ${
                    isReordering ? "opacity-70" : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="cursor-grab text-gray-400 active:cursor-grabbing"
                        title="اسحب لإعادة الترتيب"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <span>#{t.id}</span>
                    </div>
                  </td>
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 text-center">
                    {outlineSrc ? (
                      <img
                        src={outlineSrc}
                        alt={`${t.name} بدون لون`}
                        className="mx-auto h-14 w-14 rounded border bg-slate-50 object-contain"
                      />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {colorSrc ? (
                      <img
                        src={colorSrc}
                        alt={`${t.name} ملونة`}
                        className="mx-auto h-14 w-14 rounded border bg-slate-50 object-contain"
                      />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3">{t.sort_order ?? 0}</td>
                  <td className="flex justify-center gap-2 p-3">
                    <button
                      onClick={() => startEditType(t)}
                      className="rounded bg-blue-500 px-2 text-white"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => deleteType(t.id)}
                      className="rounded bg-red-500 px-2 text-white"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center">لا توجد أنواع</div>
        )}
      </div>

      {types.length > 0 && (
        <p className="text-sm text-gray-500">
          اسحب من علامة النقاط بجانب رقم النوع لإعادة ترتيب الأنواع.
          {isReordering ? " جارٍ حفظ الترتيب..." : ""}
        </p>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">
              {editId ? "تعديل النوع" : "إضافة نوع جديد"}
            </h2>
            <form onSubmit={saveType} className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم النوع"
                className="w-full border p-2"
                required
              />
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                placeholder="ترتيب العرض"
                className="w-full border p-2"
              />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
  {/* صورة بدون لون */}
  <div className="rounded border p-3">
    <label className="mb-2 block font-bold">الصورة بدون لون</label>

    <input
      type="text"
      placeholder="رابط الصورة بدون لون"
      value={imageOutlineUrl}
      onChange={(e) => setImageOutlineUrl(e.target.value)}
      className="mb-2 w-full border p-2"
    />

    <label className="block cursor-pointer rounded bg-gray-100 px-3 py-2 text-center hover:bg-gray-200">
      رفع من المعرض
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleTypedImageUpload(e, "outline")}
      />
    </label>

    {imageOutlineUrl && (
      <img
        src={imageOutlineUrl.startsWith("http") ? imageOutlineUrl : BASE_URL + imageOutlineUrl}
        alt="معاينة بدون لون"
        className="mx-auto mt-2 h-20 w-20 rounded border object-contain"
      />
    )}
  </div>

  {/* صورة ملونة */}
  <div className="rounded border p-3">
    <label className="mb-2 block font-bold">الصورة الملونة</label>

    <input
      type="text"
      placeholder="رابط الصورة الملونة"
      value={imageColorUrl}
      onChange={(e) => setImageColorUrl(e.target.value)}
      className="mb-2 w-full border p-2"
    />

    <label className="block cursor-pointer rounded bg-gray-100 px-3 py-2 text-center hover:bg-gray-200">
      رفع من المعرض
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleTypedImageUpload(e, "color")}
      />
    </label>

    {imageColorUrl && (
      <img
        src={imageColorUrl.startsWith("http") ? imageColorUrl : BASE_URL + imageColorUrl}
        alt="معاينة ملونة"
        className="mx-auto mt-2 h-20 w-20 rounded border object-contain"
      />
    )}
  </div>
</div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded bg-gray-400 px-4 py-2 text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-500 px-4 py-2 text-white"
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


 export default Types;