import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Edit3, GripVertical, PlusCircle, Trash2, X } from "lucide-react";
import api, { API_ORIGIN } from "../services/api";

const BASE_URL = API_ORIGIN;

interface Category {
  id: number;
  name: string;
  description?: string;
  icon_url?: string;
  image_url?: string;
  sort_order?: number;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
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
          return api.put(`/categories/${item.id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
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

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("icon_url", iconUrl);
    formData.append("sort_order", String(sortOrder));
    if (image) formData.append("image", image);
    if (imageUrl) formData.append("image_url", imageUrl);

    const res = await api.post("/categories", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data?.success) {
      alert("تمت إضافة الفئة بنجاح");
      setName("");
      setDescription("");
      setIconUrl("");
      setImage(null);
      setImageUrl("");
      setSortOrder(0);
      setIsAddSidebarOpen(false);
      fetchCategories();
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

    const formData = new FormData();
    formData.append("name", editName);
    formData.append("description", editDescription);
    formData.append("icon_url", editIcon);
    formData.append("sort_order", String(editSortOrder));
    if (editImage) formData.append("image", editImage);
    if (editImageUrl) formData.append("image_url", editImageUrl);

    const res = await api.put(`/categories/${editId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data?.success) {
      alert("تم تعديل الفئة");
      setEditId(null);
      setEditName("");
      setEditDescription("");
      setEditIcon("");
      setEditImage(null);
      setEditImageUrl("");
      setEditSortOrder(0);
      setIsEditSidebarOpen(false);
      fetchCategories();
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
            <th className="border p-2">الوصف</th>
            <th className="border p-2">الأيقونة</th>
            <th className="border p-2">الصورة</th>
            <th className="border p-2">الترتيب</th>
            <th className="border p-2">خيارات</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, i) => (
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
              <td className="border p-2">{cat.description || "-"}</td>
              <td className="border p-2">
                {cat.icon_url ? (
                  <img src={cat.icon_url} alt="Icon" className="h-8 w-8" />
                ) : (
                  "-"
                )}
              </td>
              <td className="border p-2 text-center">
                {cat.image_url ? (
                  <img
                    src={
                      cat.image_url.startsWith("http")
                        ? cat.image_url
                        : `${BASE_URL}${cat.image_url}`
                    }
                    alt={cat.name}
                    width={60}
                    height={60}
                    className="rounded object-cover"
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
                      setEditDescription(cat.description || "");
                      setEditIcon(cat.icon_url || "");
                      setEditImageUrl(cat.image_url || "");
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
          ))}
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
          description={description}
          setDescription={setDescription}
          iconUrl={iconUrl}
          setIconUrl={setIconUrl}
          image={image}
          setImage={setImage}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
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
          description={editDescription}
          setDescription={setEditDescription}
          iconUrl={editIcon}
          setIconUrl={setEditIcon}
          image={editImage}
          setImage={setEditImage}
          imageUrl={editImageUrl}
          setImageUrl={setEditImageUrl}
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
  description: string;
  setDescription: (val: string) => void;
  iconUrl: string;
  setIconUrl: (val: string) => void;
  image: File | null;
  setImage: (val: File | null) => void;
  imageUrl: string;
  setImageUrl: (val: string) => void;
  sortOrder: number;
  setSortOrder: (val: number) => void;
}

const SidebarForm: React.FC<SidebarProps> = ({
  title,
  onClose,
  onSubmit,
  name,
  setName,
  description,
  setDescription,
  iconUrl,
  setIconUrl,
  image,
  setImage,
  imageUrl,
  setImageUrl,
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
              placeholder="اسم الفئة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border p-2"
              required
            />
            <textarea
              placeholder="وصف الفئة"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border p-2"
              rows={3}
            />
            <input
              type="number"
              placeholder="ترتيب العرض"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full rounded border p-2"
            />
            <input
              type="text"
              placeholder="رابط صورة الفئة"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded border p-2"
            />

            {imageUrl && (
              <img
                src={imageUrl}
                alt="معاينة"
                className="h-20 w-20 rounded border object-cover"
              />
            )}

            <input
              type="file"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setImage(e.target.files ? e.target.files[0] : null)
              }
            />

            <input
              type="text"
              placeholder="رابط الأيقونة"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              className="w-full rounded border p-2"
            />

            <button
              type="submit"
              className="w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
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
