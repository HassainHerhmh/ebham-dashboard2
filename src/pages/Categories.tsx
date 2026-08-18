import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Edit3, GripVertical, PlusCircle, Trash2, X } from "lucide-react";
import api, { API_ORIGIN } from "../services/api";

const BASE_URL = API_ORIGIN;

interface Category {
  id: number;
  name: string;
  name_en?: string | null;
  description?: string;
  description_en?: string | null;
  icon_url?: string;
  image_url?: string;
  sort_order?: number;
}

const resolveMediaUrl = (url?: string | null) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const uploadCategoryImage = async (file: File) => {
  const body = new FormData();
  body.append("image", file);
  body.append("folder", "categories");

  const token = localStorage.getItem("token");
  const res = await fetch(`${API_ORIGIN}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });

  const data = await res.json().catch(() => ({}));
  const url = data.url || data.path;

  if (!res.ok || !data.success || !url) {
    throw new Error(data.message || "فشل رفع الصورة");
  }

  return url as string;
};

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDescriptionEn, setEditDescriptionEn] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [editSortOrder, setEditSortOrder] = useState(0);

  const [isAddSidebarOpen, setIsAddSidebarOpen] = useState(false);
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const persistCategoryOrder = async (items: Category[]) => {
    setIsReordering(true);
    try {
      await Promise.all(
        items.map((item, index) => {
          const formData = new FormData();
          formData.append("sort_order", String(index + 1));
          return api.put(`/categories/${item.id}`, formData);
        })
      );
    } catch (err) {
      console.error(err);
      alert("فشل حفظ ترتيب الفئات");
      fetchCategories();
    } finally {
      setIsReordering(false);
    }
  };

  const handleDropCategory = async (targetId: number) => {
    if (draggingId === null || draggingId === targetId || isReordering) {
      setDraggingId(null);
      return;
    }

    const current = [...categories];
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

    setCategories(reordered);
    setDraggingId(null);
    await persistCategoryOrder(reordered);
  };

  const handleAddImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("اختر ملف صورة فقط");
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadCategoryImage(file);
      setImageUrl(url);
    } catch (err: any) {
      alert(err?.message || "فشل رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("اختر ملف صورة فقط");
      return;
    }

    setEditUploadingImage(true);
    try {
      const url = await uploadCategoryImage(file);
      setEditImageUrl(url);
    } catch (err: any) {
      alert(err?.message || "فشل رفع الصورة");
    } finally {
      setEditUploadingImage(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();

    if (uploadingImage) {
      alert("انتظر حتى ينتهي رفع الصورة");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("name_en", nameEn || "");
    formData.append("description", description);
    formData.append("description_en", descriptionEn || "");
    formData.append("icon_url", iconUrl);
    formData.append("sort_order", String(sortOrder));
    if (imageUrl) formData.append("image_url", imageUrl);

    try {
      const res = await api.post("/categories", formData);

      if (res.data?.success) {
        alert("تمت إضافة الفئة بنجاح");
        setName("");
        setNameEn("");
        setDescription("");
        setDescriptionEn("");
        setIconUrl("");
        setImageUrl("");
        setSortOrder(0);
        setIsAddSidebarOpen(false);
        fetchCategories();
      } else {
        alert(res.data?.message || "فشل إضافة الفئة");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل إضافة الفئة");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;

    const res = await api.delete(`/categories/${id}`);

    if (res.data?.success) {
      alert("تم حذف الفئة");
      fetchCategories();
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    if (editUploadingImage) {
      alert("انتظر حتى ينتهي رفع الصورة");
      return;
    }

    const formData = new FormData();
    formData.append("name", editName);
    formData.append("name_en", editNameEn || "");
    formData.append("description", editDescription);
    formData.append("description_en", editDescriptionEn || "");
    formData.append("icon_url", editIcon);
    formData.append("sort_order", String(editSortOrder));
    if (editImageUrl) formData.append("image_url", editImageUrl);

    try {
      const res = await api.put(`/categories/${editId}`, formData);

      if (res.data?.success) {
        alert("تم تعديل الفئة");
        setEditId(null);
        setEditName("");
        setEditNameEn("");
        setEditDescription("");
        setEditDescriptionEn("");
        setEditIcon("");
        setEditImageUrl("");
        setEditSortOrder(0);
        setIsEditSidebarOpen(false);
        fetchCategories();
      } else {
        alert(res.data?.message || "فشل تعديل الفئة");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل تعديل الفئة");
    }
  };

  return (
    <div className="relative p-6" dir="rtl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">قائمة الفئات</h2>
        <button
          onClick={() => setIsAddSidebarOpen(true)}
          className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
        >
          <PlusCircle size={20} />
          إضافة فئة
        </button>
      </div>

      <table className="w-full border-collapse border border-gray-300 text-right">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">الاسم</th>
            <th className="border p-2">الاسم (EN)</th>
            <th className="border p-2">الوصف</th>
            <th className="border p-2">الأيقونة</th>
            <th className="border p-2">الصورة</th>
            <th className="border p-2">الترتيب</th>
            <th className="border p-2">خيارات</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, i) => {
            const imageSrc = resolveMediaUrl(cat.image_url);
            const brokenPath =
              !imageSrc ||
              imageSrc.includes("/uploads/undefined") ||
              imageSrc.endsWith("/undefined");

            return (
              <tr
                key={cat.id}
                draggable={!isReordering}
                onDragStart={() => setDraggingId(cat.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropCategory(cat.id)}
                onDragEnd={() => setDraggingId(null)}
                className={`${draggingId === cat.id ? "bg-blue-50" : ""} ${
                  isReordering ? "opacity-70" : ""
                }`}
              >
                <td className="border p-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="cursor-grab text-gray-400 active:cursor-grabbing"
                      title="اسحب لإعادة الترتيب"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <span>{i + 1}</span>
                  </div>
                </td>
                <td className="border p-2">{cat.name}</td>
                <td className="border p-2" dir="ltr">{cat.name_en || "-"}</td>
                <td className="border p-2">{cat.description || "-"}</td>
                <td className="border p-2">
                  {cat.icon_url ? (
                    <img
                      src={resolveMediaUrl(cat.icon_url)}
                      alt="Icon"
                      className="h-8 w-8"
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="border p-2 text-center">
                  {!brokenPath ? (
                    <img
                      src={imageSrc}
                      alt={cat.name}
                      width={60}
                      height={60}
                      className="mx-auto rounded object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : (
                    "بدون صورة"
                  )}
                </td>
                <td className="border p-2">{cat.sort_order ?? 0}</td>
                <td className="border p-2 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditId(cat.id);
                        setEditName(cat.name);
                        setEditNameEn(cat.name_en || "");
                        setEditDescription(cat.description || "");
                        setEditDescriptionEn(cat.description_en || "");
                        setEditIcon(cat.icon_url || "");
                        setEditImageUrl(
                          brokenPath ? "" : cat.image_url || ""
                        );
                        setEditSortOrder(cat.sort_order || 0);
                        setIsEditSidebarOpen(true);
                      }}
                      className="flex items-center gap-1 rounded bg-blue-500 px-3 py-1 text-white transition hover:bg-blue-600"
                    >
                      <Edit3 size={16} />
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="flex items-center gap-1 rounded bg-red-500 px-3 py-1 text-white transition hover:bg-red-600"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {categories.length > 0 && (
        <p className="mt-3 text-sm text-gray-500">
          اسحب من علامة النقاط بجانب رقم الفئة لإعادة ترتيب الفئات.
          {isReordering ? " جارٍ حفظ الترتيب..." : ""}
        </p>
      )}

      {isAddSidebarOpen && (
        <SidebarForm
          title="إضافة فئة جديدة"
          onClose={() => setIsAddSidebarOpen(false)}
          onSubmit={handleAdd}
          name={name}
          setName={setName}
          nameEn={nameEn}
          setNameEn={setNameEn}
          description={description}
          setDescription={setDescription}
          descriptionEn={descriptionEn}
          setDescriptionEn={setDescriptionEn}
          iconUrl={iconUrl}
          setIconUrl={setIconUrl}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          uploadingImage={uploadingImage}
          onImageUpload={handleAddImageUpload}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />
      )}

      {isEditSidebarOpen && (
        <SidebarForm
          title="تعديل الفئة"
          onClose={() => setIsEditSidebarOpen(false)}
          onSubmit={handleUpdate}
          name={editName}
          setName={setEditName}
          nameEn={editNameEn}
          setNameEn={setEditNameEn}
          description={editDescription}
          setDescription={setEditDescription}
          descriptionEn={editDescriptionEn}
          setDescriptionEn={setEditDescriptionEn}
          iconUrl={editIcon}
          setIconUrl={setEditIcon}
          imageUrl={editImageUrl}
          setImageUrl={setEditImageUrl}
          uploadingImage={editUploadingImage}
          onImageUpload={handleEditImageUpload}
          sortOrder={editSortOrder}
          setSortOrder={setEditSortOrder}
        />
      )}
    </div>
  );
};

interface SidebarProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  name: string;
  setName: (val: string) => void;
  nameEn: string;
  setNameEn: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  descriptionEn: string;
  setDescriptionEn: (val: string) => void;
  iconUrl: string;
  setIconUrl: (val: string) => void;
  imageUrl: string;
  setImageUrl: (val: string) => void;
  uploadingImage: boolean;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  sortOrder: number;
  setSortOrder: (val: number) => void;
}

const SidebarForm: React.FC<SidebarProps> = ({
  title,
  onClose,
  onSubmit,
  name,
  setName,
  nameEn,
  setNameEn,
  description,
  setDescription,
  descriptionEn,
  setDescriptionEn,
  iconUrl,
  setIconUrl,
  imageUrl,
  setImageUrl,
  uploadingImage,
  onImageUpload,
  sortOrder,
  setSortOrder,
}) => {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black bg-opacity-40" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-96 translate-x-0 bg-white shadow-lg transition-transform duration-300">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="اسم الفئة (عربي)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border p-2"
              required
            />
            <input
              type="text"
              placeholder="Category name (English)"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full rounded border p-2"
              dir="ltr"
            />
            <textarea
              placeholder="وصف الفئة (عربي)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border p-2"
              rows={3}
            />
            <textarea
              placeholder="Category description (English)"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              className="w-full rounded border p-2"
              rows={3}
              dir="ltr"
            />
            <input
              type="number"
              placeholder="ترتيب العرض"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full rounded border p-2"
            />

            <div className="space-y-2 rounded border p-3">
              <label className="block text-sm font-bold text-gray-700">
                صورة الفئة
              </label>
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
                  onChange={onImageUpload}
                />
              </label>

              {imageUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={resolveMediaUrl(imageUrl)}
                    alt="معاينة"
                    className="h-20 w-20 rounded border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-sm text-red-600"
                    disabled={uploadingImage}
                  >
                    إزالة
                  </button>
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="رابط الأيقونة (اختياري)"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              className="w-full rounded border p-2"
            />

            <button
              type="submit"
              disabled={uploadingImage}
              className="w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
            >
              حفظ
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Categories;
